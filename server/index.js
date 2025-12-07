import { Blob } from 'buffer';
import { generateSwissPairings } from './utils/swissSystem.js';
import { generateBracketPairings } from './utils/bracketSystem.js'; // [新增]
// --- 1. 环境 Polyfill ---
if (typeof global.File === 'undefined') {
  global.File = class File extends Blob {
    constructor(fileBits, fileName, options) {
      super(fileBits, options);
      this.name = fileName;
      this.lastModified = options?.lastModified || Date.now();
    }
  };
}

import express from 'express';
import cors from 'cors';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { INITIAL_DATA } from './initialData.js';
import axios from 'axios';
import * as cheerio from 'cheerio';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

// --- 2. 基础配置 ---
const PORT = 3001;
const prisma = new PrismaClient();
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_FILE = path.join(__dirname, 'db.json');

// ==========================================
// 🔑 阿里云百炼 API 配置区域
const DASHSCOPE_API_KEY = "sk-e0247e35350f42eb9cc00423f3ebfc44"; 
// ==========================================

const app = express();
app.use(cors());
app.use(express.json({ limit: '50mb' }));

// --- [修改] 密码强度校验 (3/4 规则) ---
function checkPasswordStrength(pwd) {
  if (!pwd || pwd.length < 8) return false;
  let types = 0;
  if (/[a-z]/.test(pwd)) types++; // 小写
  if (/[A-Z]/.test(pwd)) types++; // 大写
  if (/[0-9]/.test(pwd)) types++; // 数字
  if (/[^a-zA-Z0-9]/.test(pwd)) types++; // 符号
  // 要求：至少满足 3 种类型
  return types >= 3;
}


// --- [新增] 检查昵称是否可用接口 ---
app.post('/api/check-name', async (req, res) => {
  const { name, excludeUserId } = req.body;
  if (!name) return res.json({ available: false });

  try {
    // 查询是否存在该名字的用户
    // 如果是在“修改个人信息”，需要排除掉自己 (excludeUserId)
    const user = await prisma.user.findFirst({
      where: {
        name: name,
        id: excludeUserId ? { not: excludeUserId } : undefined
      }
    });

    if (user) {
      return res.json({ available: false, message: '该昵称已被使用' });
    } else {
      return res.json({ available: true });
    }
  } catch (e) {
    res.status(500).json({ error: '检测失败' });
  }
});

// --- 3. 核心 API：获取全量数据 (Read) ---
app.get('/api/db', async (req, res) => {
  try {
    const [
      matches, tournaments, players, announcements, historyTournaments, users, feedbacks, siteConfigList
    ] = await Promise.all([
      prisma.match.findMany({ orderBy: { id: 'desc' } }), 
      prisma.tournament.findMany({ include: { stages: true } }),
      prisma.playerStat.findMany({ orderBy: { rating: 'desc' } }),
      prisma.announcement.findMany({ orderBy: { date: 'desc' } }),
      prisma.historyTournament.findMany({ orderBy: { year: 'desc' } }),
      prisma.user.findMany(),
      prisma.feedback.findMany({ orderBy: { id: 'desc' } }),
      prisma.siteConfig.findMany()
    ]);

    const siteConfig = siteConfigList[0] || {};

    const formattedPlayers = players.map(p => ({ ...p, stageId: p.stageId || 'all' }));
    const formattedMatches = matches.map(m => ({ ...m, stageId: m.stageId || 'all' }));

    res.json({
      siteConfig,
      matches: formattedMatches,
      tournaments,
      playerStats: formattedPlayers,
      announcements,
      historyTournaments,
      usersDB: users,
      feedbacks,
      teams: [], 
      freeAgents: [] 
    });
  } catch (e) {
    console.error("DB Error:", e);
    res.status(500).json({ error: "数据库连接失败" });
  }
});

// --- 4. 核心 API：同步数据 (Write) ---
app.post('/api/sync', async (req, res) => {
  const { collection, data } = req.body;
  if (!collection || !data) return res.status(400).json({ error: 'Missing args' });

  try {
    await prisma.$transaction(async (tx) => {
      await tx.$executeRawUnsafe('SET FOREIGN_KEY_CHECKS=0;');

      switch (collection) {
        case 'matches':
          await tx.match.deleteMany();
          if (data.length > 0) await tx.match.createMany({ data });
          break;
        case 'playerStats':
          await tx.playerStat.deleteMany();
          if (data.length > 0) await tx.playerStat.createMany({ data });
          break;
        case 'tournaments':
          // 1. 先清空旧数据
          await tx.stage.deleteMany();
          await tx.tournament.deleteMany();
          
          // 2. 循环插入新数据
          for (const t of data) {
            const { stages, ...rest } = t;
            
            // 【核心修复】: 必须清洗 stage 对象，移除 tournamentId 字段
            // Prisma 嵌套创建时会自动关联父ID，如果显式传入 tournamentId 会报错导致事务回滚
            const cleanStages = stages ? stages.map(s => {
                const { tournamentId, ...stageData } = s; 
                return stageData;
            }) : [];

            await tx.tournament.create({ 
                data: { 
                    ...rest, 
                    stages: { create: cleanStages } 
                } 
            });
          }
          break;
        // =======================
        case 'announcements':
          await tx.announcement.deleteMany();
          if (data.length > 0) await tx.announcement.createMany({ data });
          break;
        case 'historyTournaments':
          await tx.historyTournament.deleteMany();
          if (data.length > 0) await tx.historyTournament.createMany({ data });
          break;
        case 'feedbacks':
          await tx.feedback.deleteMany();
          if (data.length > 0) await tx.feedback.createMany({ data });
          break;
        case 'siteConfig':
          await tx.siteConfig.upsert({ where: { id: 1 }, update: data, create: { ...data, id: 1 } });
          break;
      }
      await tx.$executeRawUnsafe('SET FOREIGN_KEY_CHECKS=1;');
    });
    res.json({ success: true });
  } catch (e) {
    console.error(`Sync Error [${collection}]:`, e);
    res.status(500).json({ error: e.message });
  }
});

// --- 5. 用户系统 API (优化版) ---

// [登录]
app.post('/api/login', async (req, res) => {
  const { username, password } = req.body; // 这里的 username 是登录账号
  try {
    const user = await prisma.user.findUnique({ where: { username } });
    if (!user) return res.json({ success: false, message: '账号不存在' });

    let isValid = await bcrypt.compare(password, user.password);
    let isLegacy = false;
    // 兼容旧明文密码
    if (!isValid && password === user.password) { isValid = true; isLegacy = true; }

    if (!isValid) return res.json({ success: false, message: '密码错误' });

    // 安全检查：弱密码 或 旧密码
    const isWeak = !checkPasswordStrength(password);

    res.json({
      success: true,
      user: { 
        id: user.id, 
        username: user.username, // 账号
        name: user.name,         // 昵称
        role: user.role, 
        email: user.email, 
        needUpdate: isLegacy || isWeak 
      }
    });
  } catch (e) { res.status(500).json({ error: '登录服务异常' }); }
});

// [注册] 接收 name (昵称) 和 username (账号)
app.post('/api/register', async (req, res) => {
  const { username, name, password } = req.body;

  // 1. 后端再次校验必填项
  if (!username || !name || !password) {
      return res.json({ success: false, message: '请填写完整信息' });
  }

  // 2. 后端校验密码强度 (双重保险)
  if (!checkPasswordStrength(password)) {
      return res.json({ success: false, message: '密码强度不足：需8位以上，且包含大写、小写、数字、符号中的3种' });
  }

  try {
    const exists = await prisma.user.findUnique({ where: { username } });
    if (exists) return res.json({ success: false, message: '该登录账号已被注册' });

    const hashedPassword = await bcrypt.hash(password, 10);
    
    const newUser = await prisma.user.create({
      data: { 
          username: username, // 登录账号
          name: name,         // 显示昵称
          password: hashedPassword, 
          role: 'user', 
          forceUpdate: false 
      }
    });
    res.json({ success: true, user: newUser });
  } catch (e) {
    // P2002 是 Prisma 的唯一约束冲突错误代码
    if (e.code === 'P2002') {
        const field = e.meta?.target;
        if (field?.includes('username')) return res.json({ success: false, message: '账号已存在' });
        if (field?.includes('name')) return res.json({ success: false, message: '该昵称已被抢占，请换一个' });
        if (field?.includes('email')) return res.json({ success: false, message: '该邮箱已被绑定' });
    }
    res.status(500).json({ error: e.message || '操作失败' });
  }
});

// [修改个人信息] 只允许改昵称和密码，不允许改登录账号
app.post('/api/user/update', async (req, res) => {
  const { userId, name, currentPassword, newPassword } = req.body;

  try {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return res.json({ success: false, message: '用户不存在' });

    const updateData = {
      name, // 更新昵称
      forceUpdate: false 
    };

    // 如果涉及密码修改
    if (newPassword) {
      if (!currentPassword) return res.json({ success: false, message: '修改密码需输入旧密码验证身份' });

      let isOldValid = await bcrypt.compare(currentPassword, user.password);
      if (!isOldValid && currentPassword === user.password) isOldValid = true;

      if (!isOldValid) return res.json({ success: false, message: '旧密码错误，无法修改' });

      if (!checkPasswordStrength(newPassword)) {
        return res.json({ success: false, message: '新密码强度不足：需8位以上，且包含大写、小写、数字、符号中的3种' });
      }

      updateData.password = await bcrypt.hash(newPassword, 10);
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: updateData
    });

    res.json({ 
      success: true, 
      user: {
        id: updatedUser.id,
        username: updatedUser.username,
        name: updatedUser.name,
        role: updatedUser.role,
        email: updatedUser.email,
        needUpdate: false
      }
    });

  } catch (e) {
    // P2002 是 Prisma 的唯一约束冲突错误代码
    if (e.code === 'P2002') {
        const field = e.meta?.target;
        if (field?.includes('username')) return res.json({ success: false, message: '账号已存在' });
        if (field?.includes('name')) return res.json({ success: false, message: '该昵称已被抢占，请换一个' });
        if (field?.includes('email')) return res.json({ success: false, message: '该邮箱已被绑定' });
    }
    res.status(500).json({ error: e.message || '操作失败' });
  }
});

// --- 6. AI 智能助手接口 ---
app.post('/api/chat', async (req, res) => {
  const { message } = req.body;
  if (!message) return res.status(400).json({ error: 'Message is required' });

  try {
    const [matches, tournaments, players, history] = await Promise.all([
      prisma.match.findMany({ take: 20, orderBy: { createdAt: 'desc' } }),
      prisma.tournament.findMany({ include: { stages: true } }),
      prisma.playerStat.findMany({ take: 30, orderBy: { rating: 'desc' } }),
      prisma.historyTournament.findMany()
    ]);

    const contextData = {
      tournaments: tournaments.map(t => ({ name: t.name, date: t.dateRange, stages: t.stages.map(s=>s.name) })),
      history: history.map(h => ({ year: h.year, event: h.name, champion: h.champion?.team, runner_up: h.finalist })),
      recentMatches: matches.map(m => {
        const tName = tournaments.find(t=>t.id===m.tournamentId)?.name || '未知赛事';
        return { event: tName, match: `${m.teamA} vs ${m.teamB}`, score: `${m.scoreA}:${m.scoreB}`, winner: m.scoreA > m.scoreB ? m.teamA : m.teamB };
      }),
      topPlayers: players.map(p => ({ name: p.name, team: p.team, rating: p.rating }))
    };

    const response = await axios.post(
      'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions',
      {
        model: 'qwen-plus',
        messages: [
          { role: 'system', content: `你是一个CS2赛事助手。数据：${JSON.stringify(contextData)}` },
          { role: 'user', content: message }
        ],
        temperature: 0.7
      },
      { headers: { 'Authorization': `Bearer ${DASHSCOPE_API_KEY}`, 'Content-Type': 'application/json' } }
    );
    res.json({ reply: response.data.choices[0].message.content });
  } catch (error) { res.status(500).json({ error: 'AI 服务暂时不可用' }); }
});


// --- [新增] 领奖专用接口 (写入本地文件 + 数据库备份) ---
const WINNERS_FILE = path.join(__dirname, 'winners.json');

app.post('/api/claim-reward', async (req, res) => {
  const { name, qq } = req.body;
  if (!name || !qq) return res.status(400).json({ error: '信息不完整' });

  const now = new Date();
  // 构造获奖记录
  const record = {
    rank_id: Date.now(), // 简易ID
    name: name,
    qq: qq,
    timestamp: now.getTime(), // 毫秒级时间戳（核心凭证，越小越早）
    timeStr: now.toLocaleString('zh-CN', { hour12: false }) // 易读时间
  };

  try {
    // 1. 读取或初始化本地 winners.json 文件
    let winners = [];
    try {
      const fileData = await fs.readFile(WINNERS_FILE, 'utf-8');
      winners = JSON.parse(fileData);
    } catch (err) {
      // 文件不存在也没关系，初始化为空数组
      winners = [];
    }

    // 2. 追加新记录
    winners.push(record);

    // 3. 按时间戳升序排序（确保第一个就是第一名）
    winners.sort((a, b) => a.timestamp - b.timestamp);

    // 4. 写回文件
    await fs.writeFile(WINNERS_FILE, JSON.stringify(winners, null, 2));

    // 5. (双重保险) 写入数据库留言板
    // 这样你在后台的“留言管理”里也能看到，不用进服务器也能通过 web 确认
    await prisma.feedback.create({
      data: {
        user: `【🏆 拆弹成功】${name}`,
        content: `获奖申报！QQ: ${qq} \n精确时间戳: ${record.timestamp}\n(请核对 winners.json 确认排名)`,
        qq: qq,
        date: record.timeStr
      }
    });

    res.json({ success: true });

  } catch (e) {
    console.error("Claim Reward Error:", e);
    res.status(500).json({ error: '记录失败' });
  }
});

// --- 7. 完美平台爬虫接口 ---
app.post('/api/import-wmpvp', async (req, res) => {
  const { url, acw_tc, match_id_cookie } = req.body;
  if (!url || !acw_tc || !match_id_cookie) return res.status(400).json({ error: '缺少参数' });

  try {
    console.log(`Fetching URL: ${url}`);
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36',
        'Cookie': `acw_tc=${acw_tc}; NEWPVPMATCHID=${match_id_cookie}`,
        'Referer': 'https://match.wmpvp.com/csgo/list'
      }
    });

    const $ = cheerio.load(response.data);
    const rawMatches = [];

    $('.m-list .team dd').each((i, el) => {
      const spans = $(el).find('span');
      const roomId = $(spans.eq(0)).text().trim(); 
      const teamA = $(spans.eq(2)).text().trim(); 
      const scoreText = $(spans.eq(3)).text().trim(); 
      const teamB = $(spans.eq(4)).text().trim();
      const mapName = $(spans.eq(5)).text().trim();
      const stateText = $(spans.eq(7)).text(); 
      const dateMatch = stateText.match(/(\d{4}\.\d{2}\.\d{2}\s\d{2}:\d{2})/);
      
      let timestamp = 0;
      let dateKeyStr = ''; 
      if (dateMatch) {
          const rawDate = dateMatch[1]; 
          const stdDate = rawDate.replace(/\./g, '-').replace(' ', 'T');
          timestamp = new Date(stdDate).getTime();
          dateKeyStr = rawDate.split(' ')[0]; 
      }

      if (roomId && teamA && teamB) {
        const [scoreA, scoreB] = scoreText.split(':').map(s => parseInt(s) || 0);
        rawMatches.push({ roomId: parseInt(roomId), teamA, teamB, scoreA, scoreB, mapName, timestamp, dateKeyStr });
      }
    });

    rawMatches.sort((a, b) => a.roomId - b.roomId);

    const groupedMatches = new Map();
    rawMatches.forEach(m => {
      const teamsKey = [m.teamA, m.teamB].sort().join('_');
      const seriesKey = `${m.dateKeyStr}_${teamsKey}`;

      if (!groupedMatches.has(seriesKey)) {
        groupedMatches.set(seriesKey, {
          id: m.roomId.toString(),
          teamA: m.teamA, teamB: m.teamB,
          scoreA: 0, scoreB: 0, status: 'Finished', bo: 1, maps: [], allMapsData: [], lastTimestamp: 0
        });
      }
      const match = groupedMatches.get(seriesKey);
      if (m.timestamp > match.lastTimestamp) match.lastTimestamp = m.timestamp;
      match.allMapsData.push(m);
    });

    const finalMatches = [];
    for (const match of groupedMatches.values()) {
        const mapCount = match.allMapsData.length;
        match.maps = match.allMapsData.map(m => {
            let winner = m.scoreA > m.scoreB ? m.teamA : m.teamB;
            let displayScore = m.teamA === match.teamA ? `${m.scoreA}-${m.scoreB}` : `${m.scoreB}-${m.scoreA}`;
            return {
                name: m.mapName, score: displayScore, winner: winner,
                rawA: m.teamA === match.teamA ? m.scoreA : m.scoreB,
                rawB: m.teamA === match.teamA ? m.scoreB : m.scoreA,
            };
        });

        if (mapCount >= 2) {
            match.bo = mapCount >= 4 ? 5 : 3;
            let winsA = 0, winsB = 0;
            match.maps.forEach(map => { if (map.winner === match.teamA) winsA++; else winsB++; });
            match.scoreA = winsA; match.scoreB = winsB;
        } else {
            match.bo = 1;
            if (match.maps.length > 0) { match.scoreA = match.maps[0].rawA; match.scoreB = match.maps[0].rawB; }
        }
        delete match.allMapsData; delete match.lastTimestamp;
        match.maps.forEach(m => { delete m.rawA; delete m.rawB; }); 
        finalMatches.push(match);
    }

    finalMatches.sort((a, b) => b.id - a.id); 
    res.json({ success: true, count: finalMatches.length, matches: finalMatches });

  } catch (err) {
    console.error("Crawl Error:", err);
    res.status(500).json({ error: '爬取失败' });
  }
});

// ==========================================
// 🏆 竞猜系统 API (Pick'Em)
// ==========================================

// 1. 初始化竞猜活动 (管理员)
// Body: { tournamentId, stageId, type: 'SWISS', teams: ['TeamA', 'TeamB'...] (按种子1-16排序) }
app.post('/api/pickem/init', async (req, res) => {
    const { tournamentId, stageId, type, teams, deadline } = req.body; // type: 'SWISS' | 'SINGLE_ELIM'
    
    try {
        // 创建 Event
        const event = await prisma.pickemEvent.create({
            data: { 
                tournamentId, stageId, type, 
                status: 'OPEN', 
                deadline: deadline ? new Date(deadline) : null,
                isVisible: true
            }
        });

        // 创建 Teams (带种子)
        const teamData = teams.map((name, index) => ({
            eventId: event.id, name, seed: index + 1, status: 'ALIVE'
        }));
        await prisma.pickemTeam.createMany({ data: teamData });
        
        // 获取带 ID 的 teams
        const createdTeams = await prisma.pickemTeam.findMany({ 
            where: { eventId: event.id }, orderBy: { seed: 'asc' }
        });

        // --- 自动生成第一轮对阵 ---
        let initialMatches = [];

        if (type === 'SWISS') {
            // 瑞士轮第一轮: Split (1-9, 2-10...)
            const half = createdTeams.length / 2;
            for (let i = 0; i < half; i++) {
                initialMatches.push({
                    eventId: event.id, round: 1, matchGroup: '0-0',
                    teamAId: createdTeams[i].id, teamBId: createdTeams[i + half].id,
                    isBo3: false, isFinished: false
                });
            }
        } else if (type === 'SINGLE_ELIM') {
            // 单败第一轮 (8强): 使用 bracketSystem 生成
            const { newMatches } = generateBracketPairings(createdTeams, [], 1); // Round 1
            initialMatches = newMatches.map(m => ({ ...m, eventId: event.id }));
        }

        if (initialMatches.length > 0) {
            await prisma.pickemMatch.createMany({ data: initialMatches });
        }

        res.json({ success: true, eventId: event.id });
    } catch (e) { 
        console.error(e); 
        res.status(500).json({ error: 'Init failed' }); 
    }
});


// [新增] 获取所有竞猜阶段列表 (用于前端 Tab 切换)
app.get('/api/pickem/stages', async (req, res) => {
    try {
        const events = await prisma.pickemEvent.findMany({
            orderBy: { createdAt: 'asc' } // 按创建时间正序
        });
        
        // 补充赛事和阶段名称 (为了前端显示方便)
        // 这里需要查 Tournament 和 Stage 表
        // 为了性能，建议在 PickemEvent 创建时就冗余存 name，或者这里做个聚合查询
        // 这里采用简单查询补充：
        const enrichedEvents = [];
        for (const evt of events) {
            const tour = await prisma.tournament.findUnique({ where: { id: evt.tournamentId } });
            const stage = await prisma.stage.findUnique({ where: { id: evt.stageId } });
            enrichedEvents.push({
                ...evt,
                tournamentName: tour?.name || 'Unknown Tour',
                stageName: stage?.name || 'Unknown Stage'
            });
        }

        res.json({ success: true, stages: enrichedEvents });
    } catch (e) {
        res.status(500).json({ error: '获取列表失败' });
    }
});

// [修改] 获取指定竞猜详情 (增强版：支持 userId 查询作业)
// 替换原来的 app.get('/api/pickem/event/:eventId')
app.get('/api/pickem/event/:eventId', async (req, res) => {
    const { eventId } = req.params;
    const { userId } = req.query; // [新增] 支持查询参数

    try {
        const event = await prisma.pickemEvent.findUnique({ where: { id: eventId } });
        if (!event) return res.status(404).json({ error: 'Event not found' });

        const teams = await prisma.pickemTeam.findMany({ where: { eventId } });
        const matches = await prisma.pickemMatch.findMany({ 
            where: { eventId },
            orderBy: [{ round: 'desc' }, { matchGroup: 'asc' }]
        });

        // [新增] 如果传了 userId，顺便查该用户的 pick
        let userPicks = null;
        if (userId) {
            userPicks = await prisma.userPick.findFirst({
                where: { userId, eventId }
            });
        }

        res.json({ event, teams, matches, userPicks });
    } catch (e) {
        res.status(500).json({ error: 'Fetch failed' });
    }
});

// [新增] 修改截止时间 (管理员)
app.post('/api/pickem/event/update-deadline', async (req, res) => {
    const { eventId, deadline } = req.body;
    try {
        await prisma.pickemEvent.update({ where: { id: eventId }, data: { deadline: new Date(deadline) } });
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: 'Error' }); }
});

// [重写] 3. 录入/修改比分并更新战绩 (管理员)
// 支持对已结束比赛的修改 (自动回滚旧战绩)
app.post('/api/pickem/match/update', async (req, res) => {
    const { matchId, scoreA, scoreB } = req.body;
    try {
        await prisma.$transaction(async (tx) => {
            const match = await tx.pickemMatch.findUnique({ where: { id: matchId } });
            
            // 判断下一轮是否存在 (防止修改已晋级的历史)
            const nextRoundExists = await tx.pickemMatch.findFirst({
                where: { eventId: match.eventId, round: { gt: match.round } }
            });
            if (nextRoundExists) throw new Error('下一轮已生成，本轮无法修改');

            // 自动回滚逻辑 (如果已结算过)
            if (match.isFinished && match.winnerId) {
                const oldWinner = match.winnerId;
                const oldLoser = match.winnerId === match.teamAId ? match.teamBId : match.teamAId;
                await tx.pickemTeam.update({ where: { id: oldWinner }, data: { wins: { decrement: 1 }, status: 'ALIVE' } });
                await tx.pickemTeam.update({ where: { id: oldLoser }, data: { losses: { decrement: 1 }, status: 'ALIVE' } });
            }

            // 判新胜者
            let winnerId = null;
            if (scoreA > scoreB) winnerId = match.teamAId;
            else if (scoreB > scoreA) winnerId = match.teamBId;

            // 更新比赛
            await tx.pickemMatch.update({
                where: { id: matchId },
                data: { scoreA, scoreB, winnerId, isFinished: true }
            });

            // 更新队伍
            const w = await tx.pickemTeam.update({ where: { id: winnerId }, data: { wins: { increment: 1 } } });
            const l = await tx.pickemTeam.update({ where: { id: winnerId===match.teamAId?match.teamBId:match.teamAId }, data: { losses: { increment: 1 } } });

            // 瑞士轮状态判断 (3胜/3负)
            // 单败不需要在这里判断状态，下一轮生成时自动从 match winner 取
            if (w.wins === 3) await tx.pickemTeam.update({ where: { id: w.id }, data: { status: 'ADVANCED' } });
            if (l.losses === 3) await tx.pickemTeam.update({ where: { id: l.id }, data: { status: 'ELIMINATED' } });
        });
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// [修改] 4. 生成下一轮对阵 OR 结算最终成绩 (管理员)
app.post('/api/pickem/generate-round', async (req, res) => {
    const { eventId, nextRound } = req.body; 

    try {
        const event = await prisma.pickemEvent.findUnique({ where: { id: eventId } });
        const teams = await prisma.pickemTeam.findMany({ where: { eventId } });
        // 获取所有已结束的比赛用于计算
        const matches = await prisma.pickemMatch.findMany({ where: { eventId, isFinished: true } });

        // 检查上一轮是否结束
        // (略去检查逻辑，假设管理员操作正确，或前端已检查)

        // --- 结算逻辑 ---
        const isSwissEnd = event.type === 'SWISS' && nextRound > 5;
        const isBracketEnd = event.type === 'SINGLE_ELIM' && nextRound > 3; // Round 3 是决赛，>3 结算

        if (isSwissEnd || isBracketEnd) {
            // ... (这里可以加入结算算分逻辑，同之前的代码) ...
            await prisma.pickemEvent.update({ where: { id: eventId }, data: { status: 'FINISHED' } });
            return res.json({ success: true, message: '赛事已结算' });
        }

        // --- 生成对阵 ---
        let newMatches = [];
        let updatedStats = {};

        if (event.type === 'SWISS') {
            const result = generateSwissPairings(teams, matches, nextRound);
            newMatches = result.newMatches;
            updatedStats = result.updatedStats;

            // 更新 BU 分
            for (const tid in updatedStats) {
                await prisma.pickemTeam.update({
                    where: { id: tid },
                    data: { buchholz: updatedStats[tid].buchholz }
                });
            }
        } else if (event.type === 'SINGLE_ELIM') {
            const result = generateBracketPairings(teams, matches, nextRound);
            newMatches = result.newMatches.map(m => ({ ...m, eventId }));
        }

        if (newMatches.length === 0) return res.status(200).json({ message: '没有新对阵生成' });

        await prisma.pickemMatch.createMany({ data: newMatches });
        res.json({ success: true, matchesGenerated: newMatches.length });

    } catch (e) {
        console.error(e);
        res.status(500).json({ error: e.message });
    }
});

// [重写] 5. 用户提交竞猜 (核心修复：防止重复，支持修改)
app.post('/api/pickem/pick', async (req, res) => {
    const { userId, eventId, picks } = req.body; // picks: { pick30, pick03, pickAdvance }
    
    try {
        // 1. 检查活动状态
        const event = await prisma.pickemEvent.findUnique({ where: { id: eventId } });
        if (!event) return res.status(404).json({ error: '活动不存在' });
        
        // 如果已锁定或结束，禁止修改
        if (event.status === 'LOCKED' || event.status === 'FINISHED') {
            return res.status(403).json({ error: '本阶段竞猜已锁定，无法更改！' });
        }
        
        // 2. 时间校验
        if (event.deadline && new Date() > new Date(event.deadline)) {
            // 如果超时，顺便把状态锁了
            await prisma.pickemEvent.update({ where: { id: eventId }, data: { status: 'LOCKED' } });
            return res.status(403).json({ error: '竞猜已截止！' });
        }
        
        // [新增] 获取当前比赛数据来计算正确数
        const teams = await prisma.pickemTeam.findMany({ where: { eventId } });
        const matches = await prisma.pickemMatch.findMany({ where: { eventId } });
        
        // [新增] 计算正确数
        let correctCount = 0;
        
        if (event.type === 'SWISS') {
            // 计算瑞士轮正确数
            const checkTeamStatus = (teamId, type) => {
                const team = teams.find(t => t.id === teamId);
                if (!team) return false;
                if (type === '3-0') return team.wins === 3 && team.losses === 0;
                if (type === '0-3') return team.wins === 0 && team.losses === 3;
                if (type === 'adv') return team.status === 'ADVANCED';
                return false;
            };
            
            if (picks.pick30) {
                picks.pick30.forEach(id => { if(checkTeamStatus(id, '3-0')) correctCount++; });
            }
            if (picks.pick03) {
                picks.pick03.forEach(id => { if(checkTeamStatus(id, '0-3')) correctCount++; });
            }
            if (picks.pickAdvance) {
                picks.pickAdvance.forEach(id => { if(checkTeamStatus(id, 'adv')) correctCount++; });
            }
        } else {
            // 计算单败淘汰赛正确数
            const checkBracketWin = (slotId, matchGroup) => {
                const match = matches.find(m => m.matchGroup === matchGroup);
                const pickId = picks.bracketPicks?.[slotId];
                return match?.isFinished && match.winnerId && pickId && String(match.winnerId) === String(pickId);
            };
            
            const slotMapping = {
                'S1_Top': 'Q1', 'S1_Bot': 'Q2',
                'S2_Top': 'Q3', 'S2_Bot': 'Q4',
                'F1_Top': 'S1', 'F1_Bot': 'S2',
                'Champion': 'F1'
            };
            
            Object.entries(slotMapping).forEach(([slotId, matchGroup]) => {
                if (checkBracketWin(slotId, matchGroup)) correctCount++;
            });
        }

        // 3. 查找该用户在此活动下是否已有记录
        const existingPick = await prisma.userPick.findFirst({
            where: { userId, eventId }
        });

        // 在 /api/pickem/pick 接口中添加正确数计算
const pickData = {
    ...picks,
    correctCount: correctCount
};

        if (existingPick) {
            // A. 如果有，执行更新 (修改作业)
            await prisma.userPick.update({
                where: { id: existingPick.id },
                data: pickData
            });
        } else {
            // B. 如果没有，创建新记录
            await prisma.userPick.create({
                data: { userId, eventId, ...pickData }
            });
        }
        
        res.json({ success: true, correctCount });
    } catch (e) {
        console.error("Pick Error:", e);
        res.status(500).json({ error: '提交失败，请重试' });
    }
});
// [新增] 6. 获取所有竞猜活动列表 (用于管理员后台回显数据)
app.get('/api/pickem/list', async (req, res) => {
    try {
        const events = await prisma.pickemEvent.findMany({ orderBy: { createdAt: 'asc' } });
        res.json({ success: true, events });
    } catch (e) { res.status(500).json({ error: 'Error' }); }
});

// [修改] 7. 获取当前激活的竞猜活动 (带用户预测回显)
// 前端调用时请带上 ?userId=xxx
app.get('/api/pickem/active', async (req, res) => {
    const { userId } = req.query; // 获取当前登录用户ID
    try {
        const event = await prisma.pickemEvent.findFirst({
            where: { status: { in: ['OPEN', 'LOCKED'] } },
            orderBy: { createdAt: 'desc' }
        });

        if (!event) return res.json({ found: false });

        const teams = await prisma.pickemTeam.findMany({ where: { eventId: event.id } });
        const matches = await prisma.pickemMatch.findMany({ 
            where: { eventId: event.id },
            orderBy: [{ round: 'desc' }, { matchGroup: 'asc' }]
        });

        // 查找该用户的预测记录
        let userPicks = null;
        if (userId) {
            // 这里的 ID 查询逻辑需要根据您的 Schema 调整，通常我们查 unique 组合
            // 如果没有 compound unique，用 findFirst
            userPicks = await prisma.userPick.findFirst({
                where: { userId, eventId: event.id }
            });
        }

        res.json({ found: true, event, teams, matches, userPicks });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: '获取活动失败' });
    }
});
// [新增] 8. 删除竞猜活动 (管理员)
app.delete('/api/pickem/event/:id', async (req, res) => {
    const { id } = req.params;
    try {
        // 由于设置了 onDelete: Cascade，删除 Event 会自动删除下面的 Teams, Matches, UserPicks
        await prisma.pickemEvent.delete({ where: { id } });
        res.json({ success: true });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: '删除失败' });
    }
});

// [新增] 9. 管理员查看所有用户预测
app.get('/api/pickem/admin/user-picks/:eventId', async (req, res) => {
    try {
        const picks = await prisma.userPick.findMany({
            where: { eventId: req.params.eventId },
            // 关联查询用户信息 (假设 User 表存在且关联名为 user)
            // 如果 prisma schema 没写 relation，可能需要手动查 user 表
            // 这里假设 prisma.userPick 还没关联 User 表，我们只返回 picks
        });
        
        // 手动补全用户名 (如果 UserPick 只有 userId)
        const userIds = picks.map(p => p.userId);
        const users = await prisma.user.findMany({ where: { id: { in: userIds } } });
        
        const result = picks.map(p => ({
            ...p,
            userName: users.find(u => u.id === p.userId)?.name || 'Unknown'
        }));

        res.json({ success: true, picks: result });
    } catch (e) {
        res.status(500).json({ error: '查询失败' });
    }
});

// [新增] 10. 修改竞猜活动状态 (锁定/开启)
app.post('/api/pickem/event/status', async (req, res) => {
    const { eventId, status } = req.body;
    try {
        await prisma.pickemEvent.update({ where: { id: eventId }, data: { status } });
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: 'Error' }); }
});

// [新增] 11. 切换竞猜阶段可见性
app.post('/api/pickem/event/visibility', async (req, res) => {
    const { eventId, isVisible } = req.body;
    try {
        await prisma.pickemEvent.update({ where: { id: eventId }, data: { isVisible } });
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: 'Error' }); }
});

// [新增] 12. 获取某赛事下的所有竞猜数据 (用户端全景视图)
// 用于：生成 Tab 栏、计算左侧任务进度
app.get('/api/pickem/tournament-view', async (req, res) => {
    const { tournamentId, userId } = req.query;
    try {
        // 1. 查该赛事下所有 PickemEvents
        const events = await prisma.pickemEvent.findMany({
            where: { tournamentId },
            orderBy: { createdAt: 'asc' }, // 按创建顺序（即阶段顺序）
            include: {
                userPicks: userId ? { where: { userId } } : false, // 查当前用户的 Pick
                matches: true, // <--- [新增] 必须加上这一行，前端才能算对了几场
                teams: true // <--- 🟢 [核心修改] 加上这一行！
            }
        });

        // 2. 补充阶段名称
        const stages = await prisma.stage.findMany({ where: { tournamentId } });
        
        const result = events.map(evt => {
            const stage = stages.find(s => s.id === evt.stageId);
            return {
                ...evt,
                stageName: stage?.name || 'Unknown Stage',
                userPick: evt.userPicks?.[0] || null // 取出用户的 pick
            };
        });

        res.json({ success: true, events: result });
    } catch (e) { res.status(500).json({ error: '获取视图失败' }); }
});

// 辅助函数：安全解析JSON数组 (如果代码中已有可忽略)
function parseJsonArray(data) {
  if (!data) return [];
  if (Array.isArray(data)) return data;
  try {
    return JSON.parse(data);
  } catch (e) {
    return [];
  }
}


// server/index.js

// ... (保持前面的代码)

// 辅助函数：深度安全解析 JSON (处理双重序列化问题)
const safeParseJSON = (data) => {
    if (!data) return null;
    if (typeof data === 'object') return data;
    try {
        const parsed = JSON.parse(data);
        // 如果解析出来还是字符串，尝试再解析一次 (应对某些双重转义的情况)
        if (typeof parsed === 'string') {
            try { return JSON.parse(parsed); } catch(e) { return parsed; }
        }
        return parsed;
    } catch (e) {
        return null;
    }
};

// [修复版] 排行榜接口：Score = 累计完成的任务数
app.get('/api/pickem/stage-picks/:eventId', async (req, res) => {
  const { eventId } = req.params;
  
  try {
    // 1. 确定赛事范围
    const targetEvent = await prisma.pickemEvent.findUnique({
      where: { id: eventId },
      select: { tournamentId: true }
    });
    
    if (!targetEvent) return res.json({ success: false, error: 'Event not found' });
    const tournamentId = targetEvent.tournamentId;

    // 2. 获取该赛事下 *所有* 阶段 (包含比赛和战队数据)
    const allEvents = await prisma.pickemEvent.findMany({
      where: { tournamentId },
      include: { matches: true, teams: true } 
    });
    
    // 3. 获取所有用户的预测
    const allUserPicks = await prisma.userPick.findMany({
      where: { eventId: { in: allEvents.map(e => e.id) } }
    });

    // 4. 用户信息
    const userIds = [...new Set(allUserPicks.map(p => p.userId))];
    const users = await prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, name: true }
    });
    const userMap = {}; 
    users.forEach(u => userMap[u.id] = u.name);

    // 5. 初始化统计
    const userStats = {};
    userIds.forEach(uid => {
        userStats[uid] = {
            userId: uid,
            name: userMap[uid] || 'Unknown',
            score: 0, // 任务总分
            // 详情数据
            pick30: [], pick03: [], pickAdvance: [], bracketPicks: {}
        };
    });

    // 6. 核心计算循环
    for (const pick of allUserPicks) {
        const userId = pick.userId;
        const event = allEvents.find(e => e.id === pick.eventId);
        if (!event) continue;

        // --- A. 数据填充 (解决数据消失) ---
        // 逻辑：如果当前查看的是这个阶段，或者我们需要把单淘数据强行带上
        if (pick.eventId === eventId) {
            userStats[userId].pick30 = safeParseJSON(pick.pick30) || [];
            userStats[userId].pick03 = safeParseJSON(pick.pick03) || [];
            userStats[userId].pickAdvance = safeParseJSON(pick.pickAdvance) || [];
            
            const bp = safeParseJSON(pick.bracketPicks);
            // 确保是对象，否则前端会挂
            userStats[userId].bracketPicks = (bp && typeof bp === 'object' && !Array.isArray(bp)) ? bp : {};
        }

        // --- B. 任务分计算 (与前端左侧栏保持 100% 一致) ---
        let tasksEarned = 0;

        // === 瑞士轮 (2个任务) ===
        if (event.type === 'SWISS') {
            const p30 = safeParseJSON(pick.pick30) || [];
            const p03 = safeParseJSON(pick.pick03) || [];
            const pAdv = safeParseJSON(pick.pickAdvance) || [];
            
            // 任务 1: 填满10个
            if ((p30.length + p03.length + pAdv.length) === 10) tasksEarned++;

            // 任务 2: 猜对5个 (实时比对)
            let swissCorrect = 0;
            const checkTeam = (tid, type) => {
                const t = event.teams.find(team => String(team.id) === String(tid));
                if (!t) return false;
                if (type === '3-0') return t.wins === 3 && t.losses === 0;
                if (type === '0-3') return t.wins === 0 && t.losses === 3;
                if (type === 'adv') return t.status === 'ADVANCED';
                return false;
            };
            p30.forEach(id => { if(checkTeam(id, '3-0')) swissCorrect++; });
            p03.forEach(id => { if(checkTeam(id, '0-3')) swissCorrect++; });
            pAdv.forEach(id => { if(checkTeam(id, 'adv')) swissCorrect++; });

            if (swissCorrect >= 5) tasksEarned++;
        } 
        
        // === 淘汰赛 (4个任务) ===
        else if (event.type === 'SINGLE_ELIM') {
            const matches = event.matches || [];
            let bp = safeParseJSON(pick.bracketPicks);
            if (!bp || Array.isArray(bp)) bp = {}; 
            
            const checkWin = (slotId, matchGroup) => {
                const pickId = bp[slotId];
                if (!pickId) return false;
                const m = matches.find(x => x.matchGroup === matchGroup);
                return m?.isFinished && String(m.winnerId) === String(pickId);
            };

            // 任务 1: 填满7个
            if (Object.keys(bp).length >= 7) tasksEarned++;

            // 任务 2: 8进4 对2个
            let qCorrect = 0;
            if(checkWin('S1_Top', 'Q1')) qCorrect++;
            if(checkWin('S1_Bot', 'Q2')) qCorrect++;
            if(checkWin('S2_Top', 'Q3')) qCorrect++;
            if(checkWin('S2_Bot', 'Q4')) qCorrect++;
            if (qCorrect >= 2) tasksEarned++;

            // 任务 3: 半决赛 对1个
            let sCorrect = 0;
            if(checkWin('F1_Top', 'S1')) sCorrect++;
            if(checkWin('F1_Bot', 'S2')) sCorrect++;
            if (sCorrect >= 1) tasksEarned++;

            // 任务 4: 冠军 对1个
            if(checkWin('Champion', 'F1')) tasksEarned++;
        }

        userStats[userId].score += tasksEarned;
    }

    // 7. 排序
    const result = Object.values(userStats).sort((a, b) => b.score - a.score);
    res.json({ success: true, picks: result });

  } catch (e) {
    console.error("Leaderboard Error:", e);
    res.status(500).json({ error: e.message });
  }
});
// [新增] 计算用户总任务完成数的辅助函数
async function calculateUserTotalTasksCompleted(userId, tournamentId) {
  try {
    // 1. 获取该赛事所有阶段
    const events = await prisma.pickemEvent.findMany({
      where: { tournamentId },
      include: {
        teams: true,
        matches: true
      }
    });
    
    // 2. 获取该用户在所有阶段的预测
    const userPicks = await prisma.userPick.findMany({
      where: { 
        userId,
        eventId: { in: events.map(e => e.id) }
      }
    });
    
    // 创建事件ID到事件数据的映射
    const eventMap = {};
    events.forEach(event => {
      eventMap[event.id] = event;
    });
    
    // 创建预测ID到预测数据的映射
    const pickMap = {};
    userPicks.forEach(pick => {
      pickMap[pick.eventId] = pick;
    });
    
    let totalCompletedTasks = 0;
    
    // 3. 计算每个阶段的任务完成情况
    for (const event of events) {
      const pick = pickMap[event.id];
      if (!pick) continue; // 用户没有参与该阶段
      
      if (event.type === 'SWISS') {
        // 瑞士轮阶段：2个任务
        const correctCount = pick.correctCount || 0;
        
        // 任务1：完成全部10次预测
        const pick30 = parseJsonArray(pick.pick30);
        const pick03 = parseJsonArray(pick.pick03);
        const pickAdvance = parseJsonArray(pick.pickAdvance);
        const totalPicks = pick30.length + pick03.length + pickAdvance.length;
        const task1Completed = totalPicks === 10;
        
        // 任务2：做出5次正确的竞猜预测
        const task2Completed = correctCount >= 5;
        
        if (task1Completed) totalCompletedTasks++;
        if (task2Completed) totalCompletedTasks++;
        
      } else if (event.type === 'SINGLE_ELIM') {
        // 淘汰赛阶段：4个任务
        const correctCount = pick.correctCount || 0;
        const bracketPicks = pick.bracketPicks || {};
        const picksCount = Object.keys(bracketPicks).length;
        
        // 任务1：在决胜阶段做出7次竞猜预测
        const task1Completed = picksCount >= 7;
        
        // 任务2：为四分之一决赛做出2次正确的竞猜预测
        // 这里需要根据实际比赛结果判断，暂时用correctCount >= 2
        const task2Completed = correctCount >= 2;
        
        // 任务3：为半决赛做出1次正确的竞猜预测
        const task3Completed = correctCount >= 3;
        
        // 任务4：为总决赛做出正确的竞猜预测
        const task4Completed = correctCount >= 4;
        
        if (task1Completed) totalCompletedTasks++;
        if (task2Completed) totalCompletedTasks++;
        if (task3Completed) totalCompletedTasks++;
        if (task4Completed) totalCompletedTasks++;
      }
    }
    
    return totalCompletedTasks;
    
  } catch (e) {
    console.error(`计算用户 ${userId} 总任务完成数失败:`, e);
    return 0;
  }
}

// [新增] 获取用户任务统计（缓存版）
app.get('/api/pickem/user-tasks/:userId/:tournamentId', async (req, res) => {
  const { userId, tournamentId } = req.params;
  
  try {
    const totalTasksCompleted = await calculateUserTotalTasksCompleted(userId, tournamentId);
    
    res.json({
      success: true,
      userId,
      tournamentId,
      totalTasksCompleted,
      updatedAt: new Date().toISOString()
    });
  } catch (e) {
    console.error(`获取用户 ${userId} 任务统计失败:`, e);
    res.status(500).json({ success: false, error: '获取任务统计失败' });
  }
});

// 2. 计算正确数API - 修复单淘汰赛正确数
app.post('/api/pickem/calculate-scores/:eventId', async (req, res) => {
  const { eventId } = req.params;
  console.log(`[API] 计算阶段 ${eventId} 的正确数`);
  
  try {
    // 1. 获取事件及相关数据
    const event = await prisma.pickemEvent.findUnique({
      where: { id: eventId },
      include: {
        teams: true,
        matches: true
      }
    });
    
    if (!event) {
      return res.status(404).json({ 
        success: false, 
        error: '竞猜活动不存在' 
      });
    }
    
    console.log(`[API] 事件类型: ${event.type}, 战队数: ${event.teams.length}, 比赛数: ${event.matches.length}`);
    
    // 2. 获取所有用户预测
    const userPicks = await prisma.userPick.findMany({
      where: { eventId }
    });
    
    console.log(`[API] 找到 ${userPicks.length} 条用户预测记录`);
    
    if (userPicks.length === 0) {
      return res.json({ 
        success: true, 
        message: '没有用户预测需要计算',
        details: { eventId, eventType: event.type }
      });
    }
    
    let updatedCount = 0;
    const errors = [];
    
    // 3. 为每个用户计算正确数
    for (const pick of userPicks) {
      try {
        let correctCount = 0;
        
        if (event.type === 'SWISS') {
          // 瑞士轮正确数计算
          const checkTeamStatus = (teamId, type) => {
            const team = event.teams.find(t => t.id === teamId);
            if (!team) return false;
            if (type === '3-0') return team.wins === 3 && team.losses === 0;
            if (type === '0-3') return team.wins === 0 && team.losses === 3;
            if (type === 'adv') return team.status === 'ADVANCED';
            return false;
          };
          
          const pick30 = parseJsonArray(pick.pick30);
          const pick03 = parseJsonArray(pick.pick03);
          const pickAdvance = parseJsonArray(pick.pickAdvance);
          
          pick30.forEach(id => { if(checkTeamStatus(id, '3-0')) correctCount++; });
          pick03.forEach(id => { if(checkTeamStatus(id, '0-3')) correctCount++; });
          pickAdvance.forEach(id => { if(checkTeamStatus(id, 'adv')) correctCount++; });
          
        } else if (event.type === 'SINGLE_ELIM') {
          // 单淘汰赛正确数计算 - 修复版
          const bracketPicks = pick.bracketPicks || {};
          
          // 定义槽位到比赛组的映射
          const slotToMatchGroup = {
            'S1_Top': 'Q1', 'S1_Bot': 'Q2',
            'S2_Top': 'Q3', 'S2_Bot': 'Q4',
            'F1_Top': 'S1', 'F1_Bot': 'S2',
            'Champion': 'F1'
          };
          
          // 检查每个槽位的预测是否正确
          Object.entries(slotToMatchGroup).forEach(([slotId, matchGroup]) => {
            const pickId = bracketPicks[slotId];
            if (!pickId) return;
            
            const match = event.matches.find(m => m.matchGroup === matchGroup);
            if (!match || !match.isFinished || !match.winnerId) return;
            
            if (String(match.winnerId) === String(pickId)) {
              correctCount++;
            }
          });
        }
        
        // 4. 更新数据库中的正确数
        await prisma.userPick.update({
          where: { id: pick.id },
          data: { correctCount }
        });
        
        console.log(`[API] 更新用户 ${pick.userId}: 正确数 = ${correctCount}`);
        updatedCount++;
        
      } catch (pickError) {
        console.error(`[API] 处理用户预测失败 (用户ID: ${pick.userId}):`, pickError);
        errors.push(`用户 ${pick.userId}: ${pickError.message}`);
      }
    }
    
    // 5. 如果计算完成，更新事件状态
    if (updatedCount > 0) {
      await prisma.pickemEvent.update({
        where: { id: eventId },
        data: { status: 'FINISHED' }
      });
      console.log(`[API] 事件 ${eventId} 已标记为 FINISHED`);
    }
    
    res.json({ 
      success: true, 
      message: `成功计算 ${updatedCount} 位用户的正确数`,
      details: {
        eventId,
        eventType: event.type,
        totalPicks: userPicks.length,
        updatedCount,
        errors: errors.length > 0 ? errors : undefined
      }
    });
    
  } catch (e) {
    console.error("[API] 计算正确数失败:", e);
    res.status(500).json({ 
      success: false, 
      error: '计算正确数失败',
      details: e.message 
    });
  }
});

// [修复] 管理员批量计算所有赛事正确数
app.post('/api/pickem/admin/calculate-all-scores', async (req, res) => {
  const { tournamentId } = req.body;
  console.log(`[API] 管理员批量计算赛事 ${tournamentId} 的所有正确数`);
  
  try {
    // 1. 获取该赛事的所有竞猜阶段
    const events = await prisma.pickemEvent.findMany({
      where: { tournamentId },
      include: {
        teams: true,
        matches: true
      }
    });
    
    if (events.length === 0) {
      return res.json({ 
        success: false, 
        error: '该赛事没有竞猜阶段' 
      });
    }
    
    console.log(`[API] 找到 ${events.length} 个竞猜阶段`);
    
    let totalEvents = 0;
    let totalUsers = 0;
    let totalErrors = [];
    
    // 2. 遍历所有阶段
    for (const event of events) {
      try {
        console.log(`[API] 处理阶段: ${event.id} (${event.type})`);
        
        // 获取用户预测（不包含关系）
        const userPicks = await prisma.userPick.findMany({
          where: { eventId: event.id }
        });
        
        console.log(`[API] 阶段 ${event.id} 有 ${userPicks.length} 条预测记录`);
        
        // 3. 计算每个用户的正确数
        for (const pick of userPicks) {
          try {
            let correctCount = 0;
            
            if (event.type === 'SWISS') {
              // 瑞士轮计算逻辑
              const checkTeamStatus = (teamId, type) => {
                const team = event.teams.find(t => t.id === teamId);
                if (!team) return false;
                if (type === '3-0') return team.wins === 3 && team.losses === 0;
                if (type === '0-3') return team.wins === 0 && team.losses === 3;
                if (type === 'adv') return team.status === 'ADVANCED';
                return false;
              };
              
              const pick30 = parseJsonArray(pick.pick30);
              const pick03 = parseJsonArray(pick.pick03);
              const pickAdvance = parseJsonArray(pick.pickAdvance);
              
              pick30.forEach(id => { if(checkTeamStatus(id, '3-0')) correctCount++; });
              pick03.forEach(id => { if(checkTeamStatus(id, '0-3')) correctCount++; });
              pickAdvance.forEach(id => { if(checkTeamStatus(id, 'adv')) correctCount++; });
              
            } else if (event.type === 'SINGLE_ELIM') {
              // 淘汰赛计算逻辑
              const bracketPicks = pick.bracketPicks || {};
              const checkBracketWin = (slotId, matchGroup) => {
                const match = event.matches.find(m => m.matchGroup === matchGroup);
                const pickId = bracketPicks[slotId];
                return match?.isFinished && match.winnerId && pickId && String(match.winnerId) === String(pickId);
              };
              
              const slotMapping = {
                'S1_Top': 'Q1', 'S1_Bot': 'Q2',
                'S2_Top': 'Q3', 'S2_Bot': 'Q4',
                'F1_Top': 'S1', 'F1_Bot': 'S2',
                'Champion': 'F1'
              };
              
              Object.entries(slotMapping).forEach(([slotId, matchGroup]) => {
                if (checkBracketWin(slotId, matchGroup)) correctCount++;
              });
            }
            
            // 4. 更新数据库
            await prisma.userPick.update({
              where: { id: pick.id },
              data: { correctCount }
            });
            
            totalUsers++;
            
          } catch (pickError) {
            console.error(`处理用户 ${pick.userId} 预测出错:`, pickError);
            totalErrors.push(`阶段 ${event.id} - 用户 ${pick.userId}: ${pickError.message}`);
          }
        }
        
        // 5. 更新阶段状态
        await prisma.pickemEvent.update({
          where: { id: event.id },
          data: { status: 'FINISHED' }
        });
        
        totalEvents++;
        
      } catch (eventError) {
        console.error(`处理阶段 ${event.id} 出错:`, eventError);
        totalErrors.push(`阶段 ${event.id}: ${eventError.message}`);
      }
    }
    
    res.json({ 
      success: true, 
      message: `批量计算完成! 处理了 ${totalEvents} 个阶段, ${totalUsers} 条用户记录`,
      summary: {
        totalEvents,
        totalUsers,
        totalErrors: totalErrors.length
      },
      errors: totalErrors.length > 0 ? totalErrors : undefined
    });
    
  } catch (e) {
    console.error("[API] 批量计算失败:", e);
    res.status(500).json({ 
      success: false, 
      error: '批量计算失败',
      details: e.message 
    });
  }
});


// [新增] 13. 更新所有用户在本阶段的正确数（管理员结算用）
app.post('/api/pickem/update-scores', async (req, res) => {
    const { eventId } = req.body;
    
    try {
        const event = await prisma.pickemEvent.findUnique({ where: { id: eventId } });
        const teams = await prisma.pickemTeam.findMany({ where: { eventId } });
        const matches = await prisma.pickemMatch.findMany({ where: { eventId } });
        const userPicks = await prisma.userPick.findMany({ where: { eventId } });
        
        // 批量更新所有用户的正确数
        for (const pick of userPicks) {
            let correctCount = 0;
            
            if (event.type === 'SWISS') {
                const checkTeamStatus = (teamId, type) => {
                    const team = teams.find(t => t.id === teamId);
                    if (!team) return false;
                    if (type === '3-0') return team.wins === 3 && team.losses === 0;
                    if (type === '0-3') return team.wins === 0 && team.losses === 3;
                    if (type === 'adv') return team.status === 'ADVANCED';
                    return false;
                };
                
                if (pick.pick30) {
                    pick.pick30.forEach(id => { if(checkTeamStatus(id, '3-0')) correctCount++; });
                }
                if (pick.pick03) {
                    pick.pick03.forEach(id => { if(checkTeamStatus(id, '0-3')) correctCount++; });
                }
                if (pick.pickAdvance) {
                    pick.pickAdvance.forEach(id => { if(checkTeamStatus(id, 'adv')) correctCount++; });
                }
            } else {
                // 单败淘汰赛正确数计算
                const checkBracketWin = (slotId, matchGroup) => {
                    const match = matches.find(m => m.matchGroup === matchGroup);
                    const pickId = pick.bracketPicks?.[slotId];
                    return match?.isFinished && match.winnerId && pickId && String(match.winnerId) === String(pickId);
                };
                
                const slotMapping = {
                    'S1_Top': 'Q1', 'S1_Bot': 'Q2',
                    'S2_Top': 'Q3', 'S2_Bot': 'Q4',
                    'F1_Top': 'S1', 'F1_Bot': 'S2',
                    'Champion': 'F1'
                };
                
                Object.entries(slotMapping).forEach(([slotId, matchGroup]) => {
                    if (checkBracketWin(slotId, matchGroup)) correctCount++;
                });
            }
            
            // 更新正确数
            await prisma.userPick.update({
                where: { id: pick.id },
                data: { correctCount }
            });
        }
        
        // 标记活动为已结束
        await prisma.pickemEvent.update({
            where: { id: eventId },
            data: { status: 'FINISHED' }
        });
        
        res.json({ success: true, message: `已更新 ${userPicks.length} 位用户的正确数` });
    } catch (e) {
        console.error("Update scores error:", e);
        res.status(500).json({ error: '更新正确数失败' });
    }
});

// [新增] 重新录入/更新竞猜阶段的战队 (用于预创建阶段后的后期填充)
app.post('/api/pickem/update-teams', async (req, res) => {
    const { eventId, teams, type } = req.body; // type: 'SWISS' | 'SINGLE_ELIM'
    
    if (!eventId || !teams || teams.length === 0) {
        return res.status(400).json({ error: '参数不完整' });
    }

    try {
        await prisma.$transaction(async (tx) => {
            // 1. 清理旧数据 (级联删除会删掉 matches 和 userPicks，但为了保险我们手动删 match)
            // 注意：这样做会清空用户已有的预测！仅限比赛开始前操作。
            await tx.pickemMatch.deleteMany({ where: { eventId } });
            await tx.pickemTeam.deleteMany({ where: { eventId } });
            // 如果你希望保留用户的“占位”预测记录，这里需要更复杂的逻辑，
            // 但通常填充战队时意味着比赛还没开始，所以清空是安全的。

            // 2. 创建新战队
            const teamData = teams.map((name, index) => ({
                eventId, name, seed: index + 1, status: 'ALIVE'
            }));
            await tx.pickemTeam.createMany({ data: teamData });
            
            // 3. 重新获取带 ID 的 teams
            const createdTeams = await tx.pickemTeam.findMany({ 
                where: { eventId }, orderBy: { seed: 'asc' }
            });

            // 4. 自动生成第一轮对阵 (逻辑同 init)
            let initialMatches = [];

            if (type === 'SWISS') {
                const half = createdTeams.length / 2;
                for (let i = 0; i < half; i++) {
                    initialMatches.push({
                        eventId, round: 1, matchGroup: '0-0',
                        teamAId: createdTeams[i].id, teamBId: createdTeams[i + half].id,
                        isBo3: false, isFinished: false
                    });
                }
            } else if (type === 'SINGLE_ELIM') {
                const { newMatches } = generateBracketPairings(createdTeams, [], 1);
                initialMatches = newMatches.map(m => ({ ...m, eventId }));
            }

            if (initialMatches.length > 0) {
                await tx.pickemMatch.createMany({ data: initialMatches });
            }
            
            // 5. 确保活动状态是 OPEN
            await tx.pickemEvent.update({
                where: { id: eventId },
                data: { status: 'OPEN', type: type } // 顺便更新一下 type，防止创建时选错
            });
        });

        res.json({ success: true });
    } catch (e) {
        console.error("Update Teams Error:", e);
        res.status(500).json({ error: '更新失败: ' + e.message });
    }
});

// --- 8. 启动 ---
prisma.$connect()
  .then(() => {
    console.log('✅ Connected to MySQL database via Prisma');
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`🚀 Server running on http://0.0.0.0:${PORT}`);
    });
  })
  .catch((e) => {
    console.error('❌ Database Connection Failed:', e);
    process.exit(1);
  });