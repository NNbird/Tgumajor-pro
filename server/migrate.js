// server/migrate.js

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_FILE = path.join(__dirname, 'db.json');

async function main() {
  console.log('🚀 开始迁移数据...');

  try {
    const rawData = await fs.readFile(DB_FILE, 'utf-8');
    const db = JSON.parse(rawData);
    console.log('✅ 已读取 db.json');

    // 1. 提取所有合法的 ID (用于清洗脏数据)
    const validTourIds = new Set();
    const validStageIds = new Set();

    if (db.tournaments) {
        db.tournaments.forEach(t => {
            validTourIds.add(t.id);
            if (t.stages) {
                t.stages.forEach(s => validStageIds.add(s.id));
            }
        });
    }
    console.log(`ℹ️ 合法赛事ID: ${validTourIds.size} 个, 合法阶段ID: ${validStageIds.size} 个`);

    // 2. 清空旧数据 (事务模式)
    await prisma.$transaction(async (tx) => {
      // 临时禁用外键检查，防止删除顺序导致的报错
      await tx.$executeRawUnsafe('SET FOREIGN_KEY_CHECKS=0;');
      
      console.log('🧹 正在清空旧表...');
      await tx.match.deleteMany();
      await tx.playerStat.deleteMany();
      await tx.stage.deleteMany();
      await tx.tournament.deleteMany();
      await tx.announcement.deleteMany();
      await tx.historyTournament.deleteMany();
      await tx.siteConfig.deleteMany();
      await tx.user.deleteMany();
      await tx.feedback.deleteMany();

      await tx.$executeRawUnsafe('SET FOREIGN_KEY_CHECKS=1;');
    });

    console.log('✅ 数据库已清空，开始写入...');

    // 3. 开始迁移

    // --- SiteConfig ---
    if (db.siteConfig) {
      const { howToText, ...validConfig } = db.siteConfig;
      await prisma.siteConfig.create({ data: { ...validConfig, id: 1 } });
      console.log('📦 SiteConfig OK');
    }

    // --- Users ---
    if (db.usersDB?.length) {
      await prisma.user.createMany({ data: db.usersDB });
      console.log('📦 Users OK');
    }

    // --- Announcements ---
    if (db.announcements?.length) {
      const valid = db.announcements.map(a => ({
        id: a.id, date: a.date, content: a.content, style: a.style || {}
      }));
      await prisma.announcement.createMany({ data: valid });
      console.log('📦 Announcements OK');
    }

    // --- History ---
    if (db.historyTournaments?.length) {
      await prisma.historyTournament.createMany({ data: db.historyTournaments });
      console.log('📦 HistoryTournaments OK');
    }

    // --- Feedbacks ---
    if (db.feedbacks?.length) {
      await prisma.feedback.createMany({ data: db.feedbacks });
      console.log('📦 Feedbacks OK');
    }

    // --- Tournaments & Stages (必须先插这个，才有合法的 StageID) ---
    if (db.tournaments?.length) {
      for (const t of db.tournaments) {
        const { stages, ...rest } = t;
        await prisma.tournament.create({
          data: { ...rest, stages: { create: stages || [] } }
        });
      }
      console.log('📦 Tournaments & Stages OK');
    }

    // --- Matches (需清洗 FK) ---
    if (db.matches?.length) {
      const valid = db.matches.map(m => {
        // 清洗：如果 ID 不在合法列表中，设为 null
        const cleanTourId = validTourIds.has(m.tournamentId) ? m.tournamentId : null;
        const cleanStageId = validStageIds.has(m.stageId) ? m.stageId : null;

        return {
            id: String(m.id),
            teamA: m.teamA, teamB: m.teamB,
            scoreA: parseInt(m.scoreA) || 0, scoreB: parseInt(m.scoreB) || 0,
            status: m.status || 'Finished',
            bo: parseInt(m.bo) || 1,
            streamUrl: m.streamUrl || '',
            currentMap: m.currentMap || '',
            maps: m.maps || [],
            // 使用清洗后的 ID
            tournamentId: cleanTourId,
            stageId: cleanStageId 
        };
      });
      await prisma.match.createMany({ data: valid });
      console.log('📦 Matches OK (已清洗外键)');
    }

    // --- PlayerStats (核心修复点：清洗 "all" 和无效 ID) ---
    if (db.playerStats?.length) {
      const valid = db.playerStats.map(p => {
        // [核心修复] 检查外键有效性
        const cleanTourId = validTourIds.has(p.tournamentId) ? p.tournamentId : null;
        
        // 如果 stageId 是 "all" 或者不存在于 Stages 表中，强制设为 null
        // 这样就不会触发 Foreign Key Constraint Violated 错误
        let cleanStageId = null;
        if (validStageIds.has(p.stageId)) {
            cleanStageId = p.stageId;
        }
        // 注意：这里把 "all" 变成了 null。
        // 前端展示时需要知道：null 等同于 "未分配阶段" 或 "全程"

        return {
            id: String(p.id),
            steamId: p.steamId || null,
            name: p.name,
            team: p.team,
            rating: String(p.rating || 0),
            adr: String(p.adr || 0),
            kd: String(p.kd || 0),
            hs: String(p.hs || 0),
            rws: String(p.rws || 0),
            fk: String(p.fk || 0),
            hsVal: parseFloat(p.hsVal) || 0,
            maps: parseInt(p.maps) || 0,
            originalId: p.originalId || null,
            // 使用清洗后的 ID
            tournamentId: cleanTourId,
            stageId: cleanStageId
        };
      });
      
      await prisma.playerStat.createMany({ data: valid });
      console.log(`📦 PlayerStats OK (已清洗外键，"all" 已转为 null)`);
    }

    console.log('🎉🎉🎉 完美！所有数据迁移成功！');

  } catch (e) {
    console.error('❌ 迁移失败:', e);
  } finally {
    await prisma.$disconnect();
  }
}

main();