import { Blob } from 'buffer';
import { generateSwissPairings } from './utils/swissSystem.js';
import { generateBracketPairings } from './utils/bracketSystem.js'; 
import { generateDoubleElim16Pairings } from './utils/doubleElim16.js'; // [新增]
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
// [修改] 同时引入异步 fs (默认) 和同步方法 (解构)
import fs from 'fs/promises'; 
import { createWriteStream, existsSync, mkdirSync } from 'fs'; // 引入标准fs方法
import path from 'path';
import { fileURLToPath } from 'url';
import { INITIAL_DATA } from './initialData.js';
import axios from 'axios';
import * as cheerio from 'cheerio';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import multer from 'multer'; // [新增]
import { pipeline } from 'stream';
import { promisify } from 'util';

const streamPipeline = promisify(pipeline);




// --- 2. 基础配置 ---
const PORT = 3001;
const prisma = new PrismaClient();
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_FILE = path.join(__dirname, 'db.json');


// ==========================================
// 🔑 Google Gemini API 配置区域
const GEMINI_API_KEY = "*************************"; 
// ==========================================

const app = express();
app.use(cors());
app.use(express.static('public')); // 👈 这一步至关重要！否则生成的图片 Meshy 读不到
app.use(express.json({ limit: '50mb' }));

// [新增] 1. 配置静态文件服务 (用于访问上传的图片)
// 图片将可以通过 http://localhost:3001/uploads/xxx.jpg 访问
// [修改] 这里的 fs.existsSync 改为 existsSync
const UPLOADS_DIR = path.join(__dirname, 'uploads');
if (!existsSync(UPLOADS_DIR)) {
    mkdirSync(UPLOADS_DIR, { recursive: true });
}
app.use('/uploads', express.static(UPLOADS_DIR));

// [新增] 2. 配置 Multer 存储策略
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, UPLOADS_DIR);
  },
  filename: function (req, file, cb) {
    // 生成唯一文件名: 时间戳-随机数.扩展名
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});
const upload = multer({ storage: storage });

// --- [新增] 规则书文件处理 ---
// 需要安装 pdf-parse: npm install pdf-parse
import pdf from 'pdf-parse';

app.post('/api/upload-rulebook', upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

  try {
    const dataBuffer = await fs.readFile(req.file.path);
    let content = '';

    if (req.file.mimetype === 'application/pdf') {
      const data = await pdf(dataBuffer);
      content = data.text;
    } else if (req.file.mimetype.startsWith('text/')) {
      content = dataBuffer.toString();
    } else {
      return res.status(400).json({ error: 'Unsupported file type' });
    }

    // [注意] 这里的“图文”提取比较复杂，目前先提取文字
    // 如果需要提取图片，建议使用专门的服务或更复杂的库
    
    res.json({ success: true, content });
  } catch (e) {
    console.error("Upload Rulebook Error:", e);
    res.status(500).json({ error: '文件解析失败' });
  }
});

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

// [新增] 获取比赛列表 (带吉祥物数据增强版)
// 用于赛程页面单独调用，减轻 /api/db 负担并注入 3D 模型链接
app.get('/api/matches', async (req, res) => {
  try {
    // 1. 获取所有比赛 (按时间倒序)
    const matches = await prisma.match.findMany({
      orderBy: { createdAt: 'desc' }
    });

    // 2. 获取所有已拥有吉祥物的战队信息
    // 只查 COMPLETED 状态且有 URL 的
    const teamsWithMascot = await prisma.esportsTeam.findMany({
      where: { 
        mascotStatus: 'COMPLETED',
        mascot3DUrl: { not: null }
      },
      select: { name: true, mascot3DUrl: true }
    });

    // 3. 将吉祥物 URL 注入到比赛数据中
    const enrichedMatches = matches.map(match => {
      // 尝试匹配 Team A
      const teamAInfo = teamsWithMascot.find(t => t.name === match.teamA);
      // 尝试匹配 Team B
      const teamBInfo = teamsWithMascot.find(t => t.name === match.teamB);

      return {
        ...match,
        // 如果战队库里有这个名字且有模型，就返回 URL
        teamAMascotUrl: teamAInfo ? teamAInfo.mascot3DUrl : null,
        teamBMascotUrl: teamBInfo ? teamBInfo.mascot3DUrl : null,
      };
    });

    res.json({ success: true, matches: enrichedMatches });
  } catch (e) {
    console.error("Fetch Matches Error:", e);
    res.status(500).json({ error: '获取比赛列表失败' });
  }
});

// --- 3. 核心 API：获取全量数据 (Read) ---
app.get('/api/db', async (req, res) => {
  try {
    const [
      // [修改] 移除 orderBy: { id: 'desc' }，改为不指定排序 (默认按存储顺序/插入顺序)
      // 这样就能保留您在前端自定义拖拽后的顺序了
      matches, 
      tournaments, 
      players, 
      announcements, 
      historyTournaments, 
      users, 
      feedbacks, 
      siteConfigList,
      teams, 
      freeAgents 
    ] = await Promise.all([
      // 🔴 关键修改：去掉 orderBy，尊重 Sync 时的顺序
      prisma.match.findMany({ orderBy: { createdAt: 'desc' } }),
      
      prisma.tournament.findMany({ include: { stages: true } }),
      prisma.playerStat.findMany({ orderBy: { rating: 'desc' } }),
      prisma.announcement.findMany({ orderBy: { date: 'desc' } }),
      prisma.historyTournament.findMany({ orderBy: { id: 'asc' } }),
      prisma.user.findMany(),
      prisma.feedback.findMany({ orderBy: { id: 'desc' } }),
      prisma.siteConfig.findMany(),
      prisma.team.findMany(),      
      prisma.freeAgent.findMany()  
    ]);

    // ==========================================
    // ⚡️ [优化] 赛程排序逻辑
    // 规则：1. 赛事越新越靠前; 2. 同一赛事内，比赛越新越靠前
    // ==========================================
    
    // 1. 构建赛事速查表 (Map)，为了能通过 tournamentId 快速拿到赛事信息
    const tourMap = new Map(tournaments.map(t => [t.id, t]));

    // 2. 辅助函数：解析日期 (兼容 "2025.01.01" 或 "2025-01-01" 等格式)
    const getTourStartTime = (dateRange) => {
        if (!dateRange) return 0;
        // 尝试提取第一段日期
        const match = dateRange.match(/(\d{4}[.\-/]\d{1,2}[.\-/]\d{1,2})/);
        if (match) {
            // 将 . 替换为 - 以便 Date 解析
            return new Date(match[0].replace(/\./g, '-')).getTime();
        }
        return 0; // 无法解析则排最后
    };

    

    // ==========================================

    const siteConfig = siteConfigList[0] || {};

    const formattedPlayers = players.map(p => ({ ...p, stageId: p.stageId || 'all' }));
    // 注意：这里使用的是排序后的 matches
    const formattedMatches = matches.map(m => ({ ...m, stageId: m.stageId || 'all' }));

    res.json({
      siteConfig,
      matches: formattedMatches, // 返回排序好的数据
      tournaments,
      playerStats: formattedPlayers,
      announcements,
      historyTournaments,
      usersDB: users,
      feedbacks,
      teams: teams || [],           // [修改] 返回真实数据
      freeAgents: freeAgents || []  // [修改] 返回真实数据
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
          if (data.length > 0) {
            const baseTime = Date.now();

            const validData = data.map((item, index) => ({
              // 1. ID 必须是 String
              id: String(item.id), 
              
              teamA: item.teamA,
              teamB: item.teamB,
              scoreA: parseInt(item.scoreA) || 0,
              scoreB: parseInt(item.scoreB) || 0,
              status: item.status,
              bo: parseInt(item.bo) || 1,
              streamUrl: item.streamUrl || '',
              currentMap: item.currentMap || '',
              
              // 2. ⚠️ 关键修复：关联 ID 必须保持 String，不要 parseInt！
              // 如果是 null/undefined/""，则设为 null
              tournamentId: item.tournamentId ? String(item.tournamentId) : null,
              stageId: item.stageId ? String(item.stageId) : null,
              
              // 3. 地图小分 (Schema 中是 Json?)
              // 如果你的 Schema 定义了 maps Json?，这里需要确保它是一个对象或数组，不是字符串
              // 如果前端传的是 JSON 字符串，需要 JSON.parse；如果是对象，直接存
              maps: typeof item.maps === 'string' ? JSON.parse(item.maps) : (item.maps || []),

              createdAt: new Date(baseTime - index * 1000) 
            }));
            
            await tx.match.createMany({ data: validData });
          }
          break;
        case 'playerStats':
          await tx.playerStat.deleteMany();
          if (data.length > 0) {
             const validStats = data.map(p => ({ ...p, id: String(p.id) }));
             await tx.playerStat.createMany({ data: validStats });
          }
          break;
        // ✅ [修复] 使用 Upsert 逻辑，防止外键冲突和关联丢失
        case 'tournaments':
          for (const t of data) {
            const { stages, id, ...rest } = t;

            // 1. 安全更新或创建赛事 (保留 registrationStatus, rulebook)
            await tx.tournament.upsert({
              where: { id: id },
              update: { ...rest }, 
              create: { id, ...rest }
            });

            // 2. 同步阶段 (Stage)
            await tx.stage.deleteMany({ where: { tournamentId: id } });
            
            if (stages && stages.length > 0) {
                await tx.stage.createMany({
                    data: stages.map(s => ({
                        id: s.id,
                        name: s.name,
                        tournamentId: id
                    }))
                });
            }
          }
          break;

          
          // [新增] 战队同步逻辑
        case 'teams':
          await tx.team.deleteMany();
          if (data.length > 0) {
             // 确保 cleaning data，防止 id 冲突或脏数据
             const cleanData = data.map(d => ({
                 ...d,
                 // 确保关联的 tournamentId 是存在的，如果不存在设为 null，防止报错
                 tournamentId: d.tournamentId || null 
             }));
             await tx.team.createMany({ data: cleanData });
          }
          break;

        // [新增] 散人同步逻辑
        case 'freeAgents':
          await tx.freeAgent.deleteMany();
          if (data.length > 0) {
             const cleanData = data.map(d => ({
                 ...d,
                 tournamentId: d.tournamentId || null 
             }));
             await tx.freeAgent.createMany({ data: cleanData });
          }
          break;
        // =======================
        case 'announcements':
          await tx.announcement.deleteMany();
          if (data.length > 0) await tx.announcement.createMany({ data });
          break;
        case 'historyTournaments':
          await tx.historyTournament.deleteMany();
          if (data.length > 0) {
             // 🟢 [绝招]：重写 ID。根据前端传来的顺序，生成可排序的 ID。
             // 第一条数据 ID 为 "h_00000"，第二条 "h_00001"...
             // 这样数据库里物理存储就是有序的，且 ID 本身也是有序的。
             const orderedData = data.map((item, index) => ({
                 ...item,
                 id: `h_${String(index).padStart(5, '0')}` 
             }));
             await tx.historyTournament.createMany({ data: orderedData });
          }
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
        personalityTest: user.personalityTest, // [新增] 返回人格测试结果
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

// [修改个人信息] 只允许改昵称和密码，以及更新人格测试结果
app.post('/api/user/update', async (req, res) => {
  const { userId, name, currentPassword, newPassword, personalityTest } = req.body;

  try {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return res.json({ success: false, message: '用户不存在' });

    const updateData = {
      forceUpdate: false 
    };

    // 只有传了 name 才更新昵称
    if (name) updateData.name = name;
    
    // 如果传了人格测试结果，则更新
    if (personalityTest) updateData.personalityTest = personalityTest;

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
        personalityTest: updatedUser.personalityTest, // [新增]
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
      'https://generativelanguage.googleapis.com/v1beta/openai/v1/chat/completions',
      {
        model: 'gemini-1.5-flash',
        messages: [
          { role: 'system', content: `你是一个CS2赛事助手。数据：${JSON.stringify(contextData)}` },
          { role: 'user', content: message }
        ],
        temperature: 0.7
      },
      { headers: { 'Authorization': `Bearer ${GEMINI_API_KEY}`, 'Content-Type': 'application/json' } }
    );
    res.json({ reply: response.data.choices[0].message.content });
  } catch (error) { 
    console.error("Gemini Error:", error.response?.data || error.message);
    res.status(500).json({ error: 'AI 服务暂时不可用' }); 
  }
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
        } else if (type === 'DOUBLE_ELIM_16') {
            // 16队双败第一轮: 逻辑同瑞士轮 R1 (1-9, 2-10...)
            const half = createdTeams.length / 2;
            for (let i = 0; i < half; i++) {
                initialMatches.push({
                    eventId: event.id, round: 1, matchGroup: '0-0',
                    teamAId: createdTeams[i].id, teamBId: createdTeams[i + half].id,
                    isBo3: false, isFinished: false
                });
            }
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

// [修复] 获取指定赛事的竞猜视图 (包含阶段信息、战队、比赛及用户作业)
app.get('/api/pickem/tournament-view', async (req, res) => {
    const { tournamentId, userId } = req.query;
    if (!tournamentId) return res.json({ success: false, error: '缺少赛事ID' });

    try {
        // 1. 查询该赛事下的所有竞猜 Event
        // 必须 include teams 和 matches，因为前端 Sidebar 的任务进度计算依赖这些数据
        const events = await prisma.pickemEvent.findMany({
            where: { tournamentId: tournamentId },
            orderBy: { createdAt: 'asc' }, // 或者按 stageId 排序
            include: {
                teams: true,
                matches: true
            }
        });

        // 2. 数据组装：补充 Stage 名称 + 当前用户的 Pick 状态
        const enrichedEvents = await Promise.all(events.map(async (evt) => {
            // 获取阶段名称
            let stageName = 'Unknown Stage';
            if (evt.stageId) {
                const stage = await prisma.stage.findUnique({ where: { id: evt.stageId } });
                if (stage) stageName = stage.name;
            }

            // 获取当前用户的预测 (用于前端计算 "完成度" 和 "正确数" 任务)
            let userPick = null;
            if (userId) {
                userPick = await prisma.userPick.findFirst({
                    where: { userId: userId, eventId: evt.id }
                });
            }

            return {
                ...evt,
                stageName,
                userPick
            };
        }));

        res.json({ success: true, events: enrichedEvents });
    } catch (e) {
        console.error("Tournament View Error:", e);
        res.status(500).json({ error: '获取数据失败' });
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
            if (event.type === 'SWISS') {
                if (w.wins === 3) await tx.pickemTeam.update({ where: { id: w.id }, data: { status: 'ADVANCED' } });
                if (l.losses === 3) await tx.pickemTeam.update({ where: { id: l.id }, data: { status: 'ELIMINATED' } });
            } else if (event.type === 'DOUBLE_ELIM_16') {
                // 16队双败状态判断 (2胜/2负)
                if (w.wins === 2) await tx.pickemTeam.update({ where: { id: w.id }, data: { status: 'ADVANCED' } });
                if (l.losses === 2) await tx.pickemTeam.update({ where: { id: l.id }, data: { status: 'ELIMINATED' } });
            }
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
        const isBracketEnd = event.type === 'SINGLE_ELIM' && nextRound > 3; 
        const isDoubleElimEnd = event.type === 'DOUBLE_ELIM_16' && nextRound > 3; // 3轮结算

        if (isSwissEnd || isBracketEnd || isDoubleElimEnd) {
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
        } else if (event.type === 'DOUBLE_ELIM_16') {
            const result = generateDoubleElim16Pairings(teams, matches, nextRound);
            newMatches = result.newMatches.map(m => ({ ...m, eventId }));
            updatedStats = result.updatedStats;

            // 更新 BU 分
            for (const tid in updatedStats) {
                await prisma.pickemTeam.update({
                    where: { id: tid },
                    data: { buchholz: updatedStats[tid].buchholz }
                });
            }
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
        } else if (event.type === 'DOUBLE_ELIM_16') {
            // 计算 16 队双败正确数
            const checkTeamStatus = (teamId, type) => {
                const team = teams.find(t => t.id === teamId);
                if (!team) return false;
                if (type === '2-0') return team.wins === 2 && team.losses === 0;
                if (type === '0-2') return team.wins === 0 && team.losses === 2;
                if (type === 'adv') return team.status === 'ADVANCED';
                return false;
            };
            
            if (picks.pick30) { // 这里复用字段名，实际上是 2-0
                picks.pick30.forEach(id => { if(checkTeamStatus(id, '2-0')) correctCount++; });
            }
            if (picks.pick03) { // 这里复用字段名，实际上是 0-2
                picks.pick03.forEach(id => { if(checkTeamStatus(id, '0-2')) correctCount++; });
            }
            if (picks.pickAdvance) { // 这里是 2-1
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
            const team = teams.find(t => t.id === teamId);
            if (!team) return false;
            if (type === '3-0') return team.wins === 3 && team.losses === 0;
            if (type === '0-3') return team.wins === 0 && team.losses === 3;
            if (type === 'adv') return team.status === 'ADVANCED';
            return false;
          };
          
          if (pick.pick30) {
            picks.pick30.forEach(id => { if(checkTeamStatus(id, '3-0')) correctCount++; });
          }
          if (pick.pick03) {
            picks.pick03.forEach(id => { if(checkTeamStatus(id, '0-3')) correctCount++; });
          }
          if (pick.pickAdvance) {
            picks.pickAdvance.forEach(id => { if(checkTeamStatus(id, 'adv')) correctCount++; });
          }
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
                const team = teams.find(t => t.id === teamId);
                if (!team) return false;
                if (type === '3-0') return team.wins === 3 && team.losses === 0;
                if (type === '0-3') return team.wins === 0 && team.losses === 3;
                if (type === 'adv') return team.status === 'ADVANCED';
                return false;
              };
              
              if (pick.pick30) {
                picks.pick30.forEach(id => { if(checkTeamStatus(id, '3-0')) correctCount++; });
              }
              if (pick.pick03) {
                picks.pick03.forEach(id => { if(checkTeamStatus(id, '0-3')) correctCount++; });
              }
              if (pick.pickAdvance) {
                picks.pickAdvance.forEach(id => { if(checkTeamStatus(id, 'adv')) correctCount++; });
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
            
            // 4. 更新正确数
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
                    picks.pick30.forEach(id => { if(checkTeamStatus(id, '3-0')) correctCount++; });
                }
                if (pick.pick03) {
                    picks.pick03.forEach(id => { if(checkTeamStatus(id, '0-3')) correctCount++; });
                }
                if (pick.pickAdvance) {
                    picks.pickAdvance.forEach(id => { if(checkTeamStatus(id, 'adv')) correctCount++; });
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
            } else if (type === 'DOUBLE_ELIM_16') {
                const half = createdTeams.length / 2;
                for (let i = 0; i < half; i++) {
                    initialMatches.push({
                        eventId, round: 1, matchGroup: '0-0',
                        teamAId: createdTeams[i].id, teamBId: createdTeams[i + half].id,
                        isBo3: false, isFinished: false
                    });
                }
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


// ==========================================
// 🏢 战队管理系统 API (Team Management) - 修正版
// 操作模型: EsportsTeam (主战队库)
// ==========================================

// 1. [核心修复] 扫描并同步历史战队数据 -> 写入 EsportsTeam
app.post('/api/admin/teams/sync', async (req, res) => {
  try {
    // 🔍 只查询 Team 表中 status = 'approved' 的战队
    const approvedTeams = await prisma.team.findMany({
      where: { status: 'approved' },
      select: { name: true } 
    });

    let count = 0;
    for (const t of approvedTeams) {
      const name = t.name.trim();
      if (!name) continue;

      // 检查库里是否已有该队，避免重复
      const exists = await prisma.esportsTeam.findUnique({ where: { name } });
      if (!exists) {
        await prisma.esportsTeam.create({
          data: { 
            name, 
            isVerified: true,
            description: '自动同步自报名数据' // 加个备注方便区分
          }
        });
        count++;
      }
    }

    res.json({ 
      success: true, 
      message: `同步完成！共发现 ${approvedTeams.length} 支过审战队，新入库 ${count} 支。`, 
      totalProcessed: approvedTeams.length 
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: '同步失败' });
  }
});

// 2. [新增] 批量删除接口
app.post('/api/admin/teams/batch-delete', async (req, res) => {
  const { ids } = req.body; // ids 是一个数字数组，例如 [1, 2, 5]
  
  if (!ids || !Array.isArray(ids) || ids.length === 0) {
    return res.status(400).json({ error: '未选择任何战队' });
  }

  try {
    await prisma.esportsTeam.deleteMany({
      where: {
        id: { in: ids }
      }
    });
    res.json({ success: true, count: ids.length });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: '批量删除失败' });
  }
});

// 2. 获取全局战队列表 (管理后台列表使用)
app.get('/api/teams/list', async (req, res) => {
  try {
    const teams = await prisma.esportsTeam.findMany({
      orderBy: { name: 'asc' }
    });
    res.json({ success: true, teams });
  } catch (e) {
    res.status(500).json({ error: '获取失败' });
  }
});

// 3. [核心接口] 获取下拉框可选战队 (个人中心使用)
// 逻辑：只读取 EsportsTeam 中已审核通过的战队
app.get('/api/teams/unique', async (req, res) => {
  try {
    const teams = await prisma.esportsTeam.findMany({
      where: { isVerified: true },
      select: { name: true },
      orderBy: { name: 'asc' }
    });
    // 返回纯字符串数组，兼容前端逻辑
    res.json({ success: true, teams: teams.map(t => t.name) });
  } catch (e) {
    res.status(500).json({ error: '获取失败' });
  }
});

// 4. 管理员 CRUD (操作 EsportsTeam)
app.post('/api/admin/teams', async (req, res) => {
  const { name, description, logo } = req.body;
  try {
    const exists = await prisma.esportsTeam.findUnique({ where: { name } });
    if (exists) return res.status(400).json({ error: '战队名已存在' });

    const team = await prisma.esportsTeam.create({
      data: { name, description, logo, isVerified: true }
    });
    res.json({ success: true, team });
  } catch (e) {
    res.status(500).json({ error: '创建失败' });
  }
});

app.delete('/api/admin/teams/:id', async (req, res) => {
  try {
    await prisma.esportsTeam.delete({ where: { id: parseInt(req.params.id) } });
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: '删除失败' });
  }
});

app.put('/api/admin/teams/:id', async (req, res) => {
  const { name, description, logo } = req.body;
  try {
    const team = await prisma.esportsTeam.update({
      where: { id: parseInt(req.params.id) },
      data: { name, description, logo }
    });
    res.json({ success: true, team });
  } catch (e) {
    res.status(500).json({ error: '更新失败' });
  }
});

// ==========================================
// 🛡️ 战队绑定系统 API (User-Team Binding)
// 操作模型: TeamMembership (用户-战队关系)
// ==========================================

// ⚠️ 注意：这里删除了重复的 /api/teams/unique 接口，复用上面的接口

// 1. 获取我的战队状态
app.get('/api/user/my-team', async (req, res) => {
  const { userId } = req.query;
  if (!userId) return res.status(400).json({ error: 'Missing userId' });

  try {
    const membership = await prisma.teamMembership.findUnique({
      where: { userId }
    });
    res.json({ success: true, membership });
  } catch (e) {
    res.status(500).json({ error: '查询失败' });
  }
});

// 2. 申请绑定战队
app.post('/api/user/bind-team', async (req, res) => {
  const { userId, teamName, role } = req.body;
  
  try {
    // 检查是否已有绑定
    const exists = await prisma.teamMembership.findUnique({ where: { userId } });
    if (exists) {
      return res.json({ success: false, message: '你已经加入或申请了一个战队，请先解绑或等待审核' });
    }
    
    // [可选建议] 这里可以加一个校验：确认 teamName 在 EsportsTeam 表里存在
    // const validTeam = await prisma.esportsTeam.findUnique({ where: { name: teamName } });
    // if (!validTeam) return res.json({ success: false, message: '该战队不存在' });

    // 创建申请 (默认 PENDING)
    await prisma.teamMembership.create({
      data: { userId, teamName, role, status: 'PENDING' }
    });

    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// 3. 解绑/退出战队
app.post('/api/user/unbind-team', async (req, res) => {
  const { userId } = req.body;
  try {
    await prisma.teamMembership.delete({ where: { userId } });
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: '解绑失败' });
  }
});

// 4. 获取某战队的所有成员 (用于详情页)
app.get('/api/team/members', async (req, res) => {
  const { teamName } = req.query;
  try {
    const members = await prisma.teamMembership.findMany({
      where: { teamName },
      include: { user: { select: { name: true, username: true } } } // 关联查询用户昵称
    });
    res.json({ success: true, members });
  } catch (e) {
    res.status(500).json({ error: '获取成员失败' });
  }
});

// 5. 审批成员 (队长/管理员权限)
app.post('/api/team/member/approve', async (req, res) => {
  const { currentUserId, targetMembershipId, action } = req.body; // action: 'APPROVED' | 'REJECTED'
  
  try {
    // A. 权限检查
    const currentUser = await prisma.user.findUnique({ where: { id: currentUserId } });
    const operatorMem = await prisma.teamMembership.findUnique({ where: { userId: currentUserId } });
    
    // 目标记录
    const target = await prisma.teamMembership.findUnique({ where: { id: targetMembershipId } });
    if (!target) return res.status(404).json({ error: '申请记录不存在' });

    let canApprove = false;

    // 1. 系统管理员直接通过
    if (currentUser && currentUser.role === 'admin') canApprove = true;

    // 2. 本队队长可以通过
    // 条件：操作者是该队队长，且状态是 APPROVED，且操作的是本队成员
    if (operatorMem && 
        operatorMem.teamName === target.teamName && 
        operatorMem.role === 'CAPTAIN' && 
        operatorMem.status === 'APPROVED') {
      canApprove = true;
    }

    if (!canApprove) return res.status(403).json({ success: false, message: '无权操作' });

    // B. 执行操作
    if (action === 'REJECTED') {
      // 拒绝直接删除记录，方便用户重新申请
      await prisma.teamMembership.delete({ where: { id: targetMembershipId } });
    } else {
      await prisma.teamMembership.update({
        where: { id: targetMembershipId },
        data: { status: 'APPROVED' }
      });
    }

    res.json({ success: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: '操作失败' });
  }
});

// ==========================================
// 📰 新闻系统 API
// ==========================================

// 1. 获取所有新闻
app.get('/api/news', async (req, res) => {
  try {
    const news = await prisma.news.findMany({
      orderBy: [
        { isPinned: 'desc' }, // 先按是否置顶排序
        { pinTime: 'desc' },  // 置顶的按置顶时间倒序
        { date: 'desc' }      // 非置顶的按日期倒序
      ]
    });
    res.json({ success: true, news });
  } catch (e) {
    res.status(500).json({ error: '获取新闻失败' });
  }
});

// [修改] 2. 保存新闻接口 (支持文件上传)
// 使用 upload.single('coverImage') 中间件处理名为 coverImage 的文件字段
app.post('/api/news/save', upload.single('coverImage'), async (req, res) => {
  try {
    // req.body 中包含普通文本字段
    const { id, title, description, date, link, isPinned } = req.body;
    let cover = req.body.cover; // 如果没有新文件，沿用旧的路径

    // 如果有新文件上传，更新 cover 路径
    if (req.file) {
        cover = `/uploads/${req.file.filename}`;
    }

    const dataToSave = {
        title,
        description,
        cover: cover || '', // 确保不为 null
        date,
        link,
        isPinned: isPinned === 'true' || isPinned === true // FormData 传过来可能是字符串
    };

    if (id && id !== 'null' && id !== '') {
      // 更新
      const updated = await prisma.news.update({
        where: { id },
        data: dataToSave
      });
      res.json({ success: true, news: updated });
    } else {
      // 新建
      const created = await prisma.news.create({
        data: dataToSave
      });
      res.json({ success: true, news: created });
    }
  } catch (e) {
    console.error("Save news error:", e);
    res.status(500).json({ error: '保存新闻失败' });
  }
});

// 3. 删除新闻
app.delete('/api/news/:id', async (req, res) => {
  try {
    await prisma.news.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: '删除失败' });
  }
});

// 4. 切换置顶状态
app.post('/api/news/pin', async (req, res) => {
  const { id, isPinned } = req.body;
  try {
    await prisma.news.update({
      where: { id },
      data: { 
        isPinned,
        pinTime: isPinned ? new Date() : null // 置顶时更新时间戳，确保最新置顶的在最前
      }
    });
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: '操作失败' });
  }
});

// 🚑 数据救援接口：修复竞猜活动不显示的问题
app.get('/api/debug/fix-pickem', async (req, res) => {
  try {
    // 1. 获取所有赛事
    const tournaments = await prisma.tournament.findMany({ include: { stages: true } });
    if (tournaments.length === 0) return res.json({ msg: "没有赛事" });

    // 默认把孤儿数据绑定到第一个赛事
    const targetTour = tournaments[0];
    const targetStage = targetTour.stages[0]; // 默认绑定到第一个阶段

    if (!targetStage) return res.json({ msg: "赛事没有阶段，无法绑定" });

    // 2. 查找所有“孤儿”竞猜 (关联的 tournamentId 不存在的)
    const allEvents = await prisma.pickemEvent.findMany();
    let fixedCount = 0;

    for (const evt of allEvents) {
      const parent = tournaments.find(t => t.id === evt.tournamentId);
      if (!parent) {
        // 发现孤儿！强行通过“阶段 ID”来认亲，或者强制指派给第一个赛事
        // 策略：直接指派给当前最新的赛事
        await prisma.pickemEvent.update({
          where: { id: evt.id },
          data: {
            tournamentId: targetTour.id,
            stageId: targetStage.id 
          }
        });
        fixedCount++;
      }
    }
    
    res.json({ success: true, fixed: fixedCount, targetTour: targetTour.name });
  } catch (e) {
    res.json({ error: e.message });
  }
});

// ==========================================
// 🧸 吉祥物工坊 API (Mascot Workshop)
// ==========================================

// 🔧 工具函数：下载并保存文件到本地 public 目录
const downloadAndSave = async (url, teamName, ext) => {
  try {
    const safeName = teamName.replace(/[^a-z0-9]/gi, '_').toLowerCase();
    const fileName = `${safeName}_${Date.now()}.${ext}`;
    
    // 确保目录存在
    const folderPath = path.join(__dirname, 'public', '3Dmodels', safeName);
    
    // ✅ 修改点：直接使用 existsSync 和 mkdirSync，去掉 fs.
    if (!existsSync(folderPath)) {
      mkdirSync(folderPath, { recursive: true });
    }

    const filePath = path.join(folderPath, fileName);
    const response = await axios({
      url,
      method: 'GET',
      responseType: 'stream'
    });

    // ✅ 修改点：直接使用 createWriteStream，去掉 fs.
    await streamPipeline(response.data, createWriteStream(filePath));
    
    return `/3Dmodels/${safeName}/${fileName}`;
  } catch (err) {
    console.error('文件下载失败:', err);
    throw new Error('文件保存失败');
  }
};
// 1. 生成 2D 设计图 (Gemini 优化 -> Meshy 文生图)
app.post('/api/mascot/gen-2d', async (req, res) => {
  const { teamId, userPrompt } = req.body;
  
  // 🔒 [强制风格约束]
  const MANDATORY_STYLE = "(3d art, blind box toy style, pop mart style:1.2), chibi humanoid character, anthropomorphic, full body view, standing upright pose, big head small body, cute proportions, distinct head and torso, defined arms and legs, vinyl toy texture, clay material, smooth edges, matte finish, soft studio lighting, octane render, c4d, high definition, clean background, 4k";

  try {
    // 1. 检查额度
    const team = await prisma.esportsTeam.findUnique({ where: { id: parseInt(teamId) } });
    if (team.creditsTextToImage <= 0) return res.json({ success: false, message: '设计次数已用完，请联系管理员充值' });

    // 2. 调用 Google Gemini 优化提示词
    // 注意：如果 Gemini 调用失败，我们使用兜底策略
    let refinedPrompt = userPrompt;
    try {
        const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${process.env.GOOGLE_API_KEY}`;
        const geminiPrompt = `
          You are a professional 3D character prompter.
          Task: Extract the core subject from the user's idea: "${userPrompt}".
          Then, merge it seamlessly with this MANDATORY STYLE: "${MANDATORY_STYLE}".
          Output ONLY the final prompt string in English. No explanations.
        `;
        const geminiRes = await axios.post(geminiUrl, { contents: [{ parts: [{ text: geminiPrompt }] }] });
        if (geminiRes.data.candidates && geminiRes.data.candidates[0].content) {
            refinedPrompt = geminiRes.data.candidates[0].content.parts[0].text;
        }
    } catch (gErr) {
        console.error("Gemini 调用失败，使用原始提示词+风格后缀");
        refinedPrompt = `${userPrompt}, ${MANDATORY_STYLE}`;
    }

    console.log(`[Mascot] Generating 2D with Prompt: ${refinedPrompt}`);

    // 3. 调用 Meshy (Text-to-Image -> Nano Banana)
    // 📝 文档修正：使用 /openapi/v1, 参数 ai_model
    const t2iInit = await axios.post(
      'https://api.meshy.ai/openapi/v1/text-to-image',
      {
        ai_model: "nano-banana", // 修正参数名
        prompt: refinedPrompt,
        aspect_ratio: "1:1"
        // 移除 negative_prompt，因为文档未列出
      },
      { headers: { Authorization: `Bearer ${process.env.MESHY_API_KEY}` } }
    );

    const t2iTaskId = t2iInit.data.result; // 获取任务ID
    console.log(`[Mascot] Meshy Task ID: ${t2iTaskId}`);
    
    let imageUrl = null;

    // ⚡️ 后端内部轮询 (Nano Banana 通常很快)
    // 最多尝试 20 次，每次间隔 1.5 秒
    for (let i = 0; i < 20; i++) {
        await new Promise(r => setTimeout(r, 1500));
        
        // 📝 文档修正：轮询 URL 也需要 /openapi
        const check = await axios.get(`https://api.meshy.ai/openapi/v1/text-to-image/${t2iTaskId}`, {
            headers: { Authorization: `Bearer ${process.env.MESHY_API_KEY}` }
        });
        
        const status = check.data.status;
        
        if (status === 'SUCCEEDED') {
            // 📝 文档修正：返回的是 image_urls 数组
            if (check.data.image_urls && check.data.image_urls.length > 0) {
                imageUrl = check.data.image_urls[0];
            }
            break;
        } else if (status === 'FAILED') {
            throw new Error(`Meshy 生成失败: ${check.data.task_error?.message || '未知错误'}`);
        }
    }

    if (!imageUrl) throw new Error("生成超时或未返回图片URL");

    console.log(`[Mascot] Image Generated: ${imageUrl}`);

    // 4. 下载图片到本地服务器
    const local2DUrl = await downloadAndSave(imageUrl, team.name, 'png');

    // 5. 更新数据库 & 扣除 1 点设计额度
    await prisma.esportsTeam.update({
      where: { id: team.id },
      data: {
        mascotPrompt: userPrompt, // 存原始输入
        mascot2DUrl: local2DUrl,
        mascotStatus: 'WAITING_CONFIRM',
        creditsTextToImage: { decrement: 1 }
      }
    });

    res.json({ success: true, url: local2DUrl, prompt: refinedPrompt });

  } catch (e) {
    console.error("[Mascot Gen2D Error]", e.response?.data || e.message);
    res.status(500).json({ error: e.response?.data?.message || e.message || '生成失败' });
  }
});

// 2. 开启 3D 建模 (Meshy Image-to-3D) - [最终修正版]
app.post('/api/mascot/start-3d', async (req, res) => {
  const { teamId } = req.body;
  
  // 🌍 你的公网 IP (Meshy 需要能访问到这张图)
  // 请确保 http://139.224.33.193/3Dmodels/ 能直接访问到图片
  const PUBLIC_HOST = "http://139.224.33.193"; 

  try {
    const team = await prisma.esportsTeam.findUnique({ where: { id: parseInt(teamId) } });
    
    if (team.creditsImageTo3D <= 0) return res.json({ success: false, message: '建模次数已用完' });
    if (!team.mascot2DUrl) return res.json({ success: false, message: '未找到设计图' });

    // 拼接完整的公网 URL
    const publicImageUrl = `${PUBLIC_HOST}${team.mascot2DUrl}`;
    console.log(`[Mascot 3D] Requesting Meshy with: ${publicImageUrl}`);
    
    // 调用 Meshy Image-to-3D
    const meshyRes = await axios.post(
      'https://api.meshy.ai/openapi/v1/image-to-3d',
      {
        image_url: publicImageUrl, 
        enable_pbr: true,      // 开启 PBR 材质
        ai_model: "latest",    // 使用 Meshy 6 (Latest) [文档推荐]
        topology: "quad",      // 四边面拓扑 (质量更好)
        should_remesh: true,   // 启用重构网格
        target_polycount: 50000 // 设置面数，保证细节
      },
      { headers: { Authorization: `Bearer ${process.env.MESHY_API_KEY}` } }
    );

    // 文档确认：返回值包含 result 字段作为任务 ID
    const taskId = meshyRes.data.result;
    console.log(`[Mascot 3D] Task Started. ID: ${taskId}`);

    // 更新数据库
    await prisma.esportsTeam.update({
      where: { id: team.id },
      data: {
        mascotTaskId: taskId,
        mascotStatus: 'GEN_3D',
        creditsImageTo3D: { decrement: 1 }
      }
    });

    res.json({ success: true, taskId });

  } catch (e) {
    console.error('[Mascot 3D Error]', e.response?.data || e.message);
    res.status(500).json({ error: e.response?.data?.message || '建模任务启动失败，请检查图片公网可访问性' });
  }
});

// 3. 轮询 3D 状态 & 下载模型 - [最终修正版]
app.get('/api/mascot/status/:teamId', async (req, res) => {
  try {
    const team = await prisma.esportsTeam.findUnique({ where: { id: parseInt(req.params.teamId) } });
    if (!team.mascotTaskId) return res.json({ status: 'NONE', progress: 0 });

    // 调用 Meshy 查询接口
    const checkRes = await axios.get(
      `https://api.meshy.ai/openapi/v1/image-to-3d/${team.mascotTaskId}`,
      { headers: { Authorization: `Bearer ${process.env.MESHY_API_KEY}` } }
    );

    const data = checkRes.data;
    const status = data.status; // PENDING, IN_PROGRESS, SUCCEEDED, FAILED
    const progress = data.progress || 0; // 文档确认有 progress 字段 (0-100)

    // 如果任务成功，且数据库状态还未更新 -> 下载 GLB
    if (status === 'SUCCEEDED' && team.mascotStatus !== 'COMPLETED') {
        const glbUrl = data.model_urls?.glb;
        if (!glbUrl) throw new Error("API未返回GLB下载地址");

        console.log(`[Mascot 3D] Success! Downloading GLB: ${glbUrl}`);
        const localGlbPath = await downloadAndSave(glbUrl, team.name, 'glb');

        await prisma.esportsTeam.update({
            where: { id: team.id },
            data: { 
                mascotStatus: 'COMPLETED',
                mascot3DUrl: localGlbPath
            }
        });
        
        return res.json({ status: 'COMPLETED', progress: 100, url: localGlbPath });
    }

    // 状态映射给前端
    let uiStatus = status;
    if (status === 'PENDING' || status === 'IN_PROGRESS') uiStatus = 'GEN_3D';
    if (status === 'FAILED' || status === 'CANCELED' || status === 'EXPIRED') uiStatus = 'FAILED';

    res.json({ status: uiStatus, progress });

  } catch (e) {
    console.error("[Mascot Status Error]", e.response?.data || e.message);
    // 不返回 500，防止前端轮询中断，返回上一次状态或错误标记
    res.json({ status: 'GEN_3D', progress: 0, error: '查询超时，重试中...' }); 
  }
});

// ==========================================
// 💎 虚拟资产管理后台 API (Asset Admin System)
// ==========================================

// 1. 创建官方资产模板 (SKU) - [支持文件上传 或 AI生成路径]
app.post('/api/admin/asset-templates', upload.fields([{ name: 'model', maxCount: 1 }, { name: 'image', maxCount: 1 }]), async (req, res) => {
  try {
    const { id, name, description, type, rarity, isTradable, aiModelPath, aiImagePath } = req.body;
    
    let modelPath = '';
    let imagePath = '';

    // 逻辑分支 1: 如果有 AI 生成的路径，优先使用
    if (aiModelPath && aiImagePath) {
        console.log(`[Asset] Using AI Generated Paths: ${aiModelPath}`);
        modelPath = aiModelPath;
        imagePath = aiImagePath;
    } 
    // 逻辑分支 2: 否则检查是否有文件上传
    else if (req.files && req.files['model'] && req.files['image']) {
        modelPath = `/uploads/${req.files['model'][0].filename}`;
        imagePath = `/uploads/${req.files['image'][0].filename}`;
        console.log(`[Asset] Using Uploaded Files: ${modelPath}`);
    } else {
        return res.status(400).json({ error: '必须上传模型文件(.glb)和缩略图，或者使用 AI 生成' });
    }

    // 写入数据库
    const template = await prisma.assetTemplate.create({
      data: {
        id: parseInt(id),
        name,
        description,
        type,
        rarity,
        isTradable: isTradable === 'true',
        modelPath,
        imagePath
      }
    });

    res.json({ success: true, template });
  } catch (e) {
    console.error("Create Template Error:", e);
    if (e.code === 'P2002') return res.status(400).json({ error: '模板 ID 已存在，请换一个' });
    res.status(500).json({ error: '创建失败: ' + e.message });
  }
});
// 2. 获取所有资产模板
app.get('/api/admin/asset-templates', async (req, res) => {
  try {
    const templates = await prisma.assetTemplate.findMany({
      orderBy: { id: 'desc' }
    });
    res.json({ success: true, templates });
  } catch (e) {
    res.status(500).json({ error: '获取失败' });
  }
});

// 3. 👑 上帝之手：批量发放资产
app.post('/api/admin/assets/distribute', async (req, res) => {
  const { templateId, targetType, targetIds } = req.body; 
  
  if (!templateId || !targetIds || targetIds.length === 0) {
    return res.status(400).json({ error: '参数不完整' });
  }

  try {
    let recipientUserIds = [];
    
    if (targetType === 'TEAM') {
      const memberships = await prisma.teamMembership.findMany({
        where: { teamName: { in: targetIds }, status: 'APPROVED' }
      });
      recipientUserIds = memberships.map(m => m.userId);
    } else {
      recipientUserIds = targetIds;
    }

    if (recipientUserIds.length === 0) {
      return res.json({ success: false, message: '未找到符合条件的用户' });
    }

    const operations = recipientUserIds.map(uid => {
      const randomSuffix = Math.floor(100000 + Math.random() * 900000); 
      const assetUid = `${templateId}${randomSuffix}`;

      return prisma.userAsset.create({
        data: {
          uid: assetUid,
          isOfficial: true,
          templateId: parseInt(templateId),
          ownerId: uid,
          creatorId: 'SYSTEM',
          status: 'NORMAL',
          history: {
            create: { type: 'ISSUE', toUserId: uid, fromUserId: 'SYSTEM_ADMIN' }
          }
        }
      });
    });

    await prisma.$transaction(operations);
    res.json({ success: true, count: operations.length, message: `成功发放给 ${operations.length} 人` });

  } catch (e) {
    console.error("Distribute Error:", e);
    res.status(500).json({ error: '发放失败: ' + e.message });
  }
});

// 4. 全局资产监控
app.get('/api/admin/assets/list', async (req, res) => {
  const { filter } = req.query;
  try {
    const where = {};
    if (filter) {
      where.OR = [
        { uid: { contains: filter } },
        { owner: { name: { contains: filter } } },
        { template: { name: { contains: filter } } },
        { customName: { contains: filter } }
      ];
    }
    const assets = await prisma.userAsset.findMany({
      where,
      include: {
        owner: { select: { id: true, name: true, username: true } },
        template: true
      },
      orderBy: { createdAt: 'desc' },
      take: 100
    });
    res.json({ success: true, assets });
  } catch (e) {
    res.status(500).json({ error: '查询失败' });
  }
});

// 5. 资产回收
app.post('/api/admin/assets/revoke', async (req, res) => {
  const { assetUid } = req.body;
  try {
    const asset = await prisma.userAsset.findUnique({
      where: { uid: assetUid },
      include: { history: { orderBy: { timestamp: 'desc' } } }
    });

    if (!asset) return res.status(404).json({ error: '资产不存在' });

    const logs = asset.history;
    if (logs.length <= 1) {
      await prisma.userAsset.delete({ where: { uid: assetUid } });
      return res.json({ success: true, message: '资产已销毁' });
    } else {
      const prevOwnerId = logs[1].toUserId; 
      if (!prevOwnerId || prevOwnerId === 'SYSTEM_ADMIN') {
         await prisma.userAsset.delete({ where: { uid: assetUid } });
         return res.json({ success: true, message: '资产已销毁 (上一任为系统)' });
      }
      await prisma.$transaction([
        prisma.userAsset.update({
          where: { uid: assetUid },
          data: { ownerId: prevOwnerId }
        }),
        prisma.assetTransferLog.create({
          data: {
            assetUid: assetUid,
            type: 'REVOKE',
            fromUserId: asset.ownerId,
            toUserId: prevOwnerId
          }
        })
      ]);
      return res.json({ success: true, message: '资产已回退给上一任主人' });
    }
  } catch (e) {
    console.error("Revoke Error:", e);
    res.status(500).json({ error: '操作失败' });
  }
});

// 6. 简单的用户列表
app.get('/api/admin/users/simple', async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      select: { id: true, name: true, username: true, role: true, teamMemberships: true }
    });
    const formatted = users.map(u => ({
        id: u.id,
        name: u.name,
        username: u.username,
        team: u.teamMemberships.length > 0 ? u.teamMemberships[0].teamName : '无战队'
    }));
    res.json({ success: true, users: formatted });
  } catch (e) {
    res.status(500).json({ error: '获取用户失败' });
  }
});

// [新增] 检查昵称是否可用接口
app.post('/api/check-name', async (req, res) => {
  const { name, excludeUserId } = req.body;
  if (!name) return res.json({ available: false });
  try {
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

// ==========================================
// 🏭 3D 资产生成工厂 (Asset Factory) - Meshy-5 双轨制
// ==========================================

// 1. 核心生成接口 (Text/Image -> 3D)
// 逻辑：Image模式直接跑; Text模式先跑NanoBanana生成图，再串行跑Meshy-5
app.post('/api/assets/generate', upload.single('image'), async (req, res) => {
  const { userId, prompt, mode } = req.body; // mode: 'TEXT' | 'IMAGE'
  const PUBLIC_HOST = "http://139.224.33.193"; // 必须是公网IP

  try {
    // 1. 检查用户额度
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return res.status(404).json({ error: '用户不存在' });
    if (user.generationCredits <= 0) return res.json({ success: false, message: '您的生成次数已用完' });

    let sourceImageUrl = '';
    let finalPrompt = prompt || '';

    // --- 分支 A: 图片模式 (直接上传 -> 3D) ---
    if (mode === 'IMAGE') {
       if (!req.file) return res.status(400).json({ error: '请上传图片' });
       // 图片已由 Multer 存入 public/uploads，构造公网 URL
       sourceImageUrl = `${PUBLIC_HOST}/uploads/${req.file.filename}`;
       console.log(`[Factory] Mode IMAGE: Source ready -> ${sourceImageUrl}`);

    } 
    // --- 分支 B: 文本模式 (文本 -> 2D -> 3D) ---
    else if (mode === 'TEXT') {
       if (!prompt) return res.status(400).json({ error: '请输入文本描述' });
       
       console.log(`[Factory] Mode TEXT: Generating intermediate 2D image...`);
       
       // a. 调用 Meshy Text-to-Image (Nano Banana)
       const t2iInit = await axios.post('https://api.meshy.ai/openapi/v1/text-to-image', 
         { ai_model: "nano-banana", prompt: prompt, aspect_ratio: "1:1" },
         { headers: { Authorization: `Bearer ${process.env.MESHY_API_KEY}` } }
       );
       const t2iTaskId = t2iInit.data.result;

       // b. 后端内部轮询 (等待 2D 生成, 最多15秒)
       let generated2DUrl = null;
       for (let i = 0; i < 15; i++) {
          await new Promise(r => setTimeout(r, 1000));
          const check = await axios.get(`https://api.meshy.ai/openapi/v1/text-to-image/${t2iTaskId}`, { headers: { Authorization: `Bearer ${process.env.MESHY_API_KEY}` } });
          if (check.data.status === 'SUCCEEDED' && check.data.image_urls?.[0]) {
             generated2DUrl = check.data.image_urls[0];
             break;
          }
          if (check.data.status === 'FAILED') throw new Error("2D 中间图生成失败");
       }
       if (!generated2DUrl) throw new Error("2D 生成超时，请重试");

       // c. 下载这张图到本地 (为了生成稳定的 Source URL)
       const tempName = `temp_t2i_${Date.now()}.png`;
       // 这里复用之前的 downloadFile 逻辑，如果没有请看下面补充
       const response = await axios({ url: generated2DUrl, method: 'GET', responseType: 'stream' });
       const destPath = path.join(UPLOADS_DIR, tempName);
       await streamPipeline(response.data, createWriteStream(destPath));
       
       sourceImageUrl = `${PUBLIC_HOST}/uploads/${tempName}`;
       console.log(`[Factory] Mode TEXT: 2D Generated & Saved -> ${sourceImageUrl}`);
    }

    // 3. 核心：启动 Meshy-5 Image-to-3D
    console.log(`[Factory] Starting Meshy-5 Image-to-3D...`);
    const meshyRes = await axios.post('https://api.meshy.ai/openapi/v1/image-to-3d', 
      {
        image_url: sourceImageUrl,
        enable_pbr: true,
        ai_model: "meshy-5", // 🎯 指定 Meshy-5
        topology: "quad",
        target_polycount: 50000,
        should_remesh: true
      },
      { headers: { Authorization: `Bearer ${process.env.MESHY_API_KEY}` } }
    );
    const meshyTaskId = meshyRes.data.result;

    // 4. 数据库记录：扣额度 + 创建任务
    await prisma.$transaction([
        prisma.user.update({ where: { id: userId }, data: { generationCredits: { decrement: 1 } } }),
        prisma.generationTask.create({
          data: {
            meshyTaskId,
            type: mode === 'IMAGE' ? 'IMAGE_TO_3D' : 'TEXT_TO_3D_CHAIN',
            status: 'SUBMITTED',
            prompt: finalPrompt,
            sourceImageUrl: sourceImageUrl,
            userId
          }
        })
    ]);

    res.json({ success: true, taskId: meshyTaskId }); // 返回 Meshy 任务ID供前端轮询

  } catch (e) {
    console.error("[Factory Error]", e.response?.data || e.message);
    res.status(500).json({ error: e.message || '任务启动失败' });
  }
});

// 2. 任务状态轮询与自动入库
app.get('/api/assets/task/:meshyTaskId', async (req, res) => {
  const { meshyTaskId } = req.params;
  
  // 准备存放目录
  const ASSETS_DIR = path.join(__dirname, 'public', 'assets');
  const MODEL_DIR = path.join(ASSETS_DIR, 'models');
  const THUMB_DIR = path.join(ASSETS_DIR, 'thumbnails');
  [MODEL_DIR, THUMB_DIR].forEach(d => { if(!existsSync(d)) mkdirSync(d, {recursive:true}); });

  try {
    // 1. 查数据库任务
    const task = await prisma.generationTask.findUnique({ where: { meshyTaskId } });
    if (!task) return res.status(404).json({ error: '任务不存在' });

    // 如果已经下载过，直接返回结果
    if (task.status === 'DOWNLOADED') {
        const asset = await prisma.userAsset.findUnique({ where: { uid: task.resultAssetUid } });
        return res.json({ status: 'COMPLETED', progress: 100, asset });
    }
    if (task.status === 'FAILED') return res.json({ status: 'FAILED' });

    // 2. 查 Meshy API
    const check = await axios.get(`https://api.meshy.ai/openapi/v1/image-to-3d/${meshyTaskId}`, {
        headers: { Authorization: `Bearer ${process.env.MESHY_API_KEY}` }
    });
    const { status, progress, model_urls, thumbnail_url } = check.data;

    // 3. 更新进度
    if (status !== 'SUCCEEDED') {
        if (status === 'FAILED') {
            await prisma.generationTask.update({ where: { meshyTaskId }, data: { status: 'FAILED' } });
            return res.json({ status: 'FAILED' });
        }
        // 更新百分比
        await prisma.generationTask.update({ where: { meshyTaskId }, data: { progress: progress || 0 } });
        return res.json({ status: 'IN_PROGRESS', progress });
    }

    // 4. 成功！下载资源并入库
    if (status === 'SUCCEEDED') {
        console.log(`[Factory] Task Success. Downloading assets...`);
        
        const safeId = `${Date.now()}_${Math.floor(Math.random()*1000)}`;
        const localModelPath = `/assets/models/${safeId}.glb`;
        const localThumbPath = `/assets/thumbnails/${safeId}.png`;

        // 下载文件流
        const download = async (url, p) => {
            const resp = await axios({ url, method: 'GET', responseType: 'stream' });
            await streamPipeline(resp.data, createWriteStream(path.join(__dirname, 'public', p)));
        };

        await Promise.all([
            download(model_urls.glb, localModelPath),
            download(thumbnail_url, localThumbPath)
        ]);

        // 生成自制资产 UID: 999999 + 6位随机
        //const assetUid = `999999${Math.floor(100000 + Math.random() * 900000)}`;
        
        // 新逻辑: 随机 6 位作为伪模板ID + 随机 6 位后缀
        const randomTemplateId = Math.floor(100000 + Math.random() * 900000);
        const randomSuffix = Math.floor(100000 + Math.random() * 900000);
        const assetUid = `${randomTemplateId}${randomSuffix}`;
        
        // 事务：创建资产 + 标记任务完成
        const [newAsset] = await prisma.$transaction([
            prisma.userAsset.create({
                data: {
                    uid: assetUid,
                    isOfficial: false,
                    customName: task.prompt ? `生成: ${task.prompt.slice(0,10)}` : '自制模型',
                    modelPath: localModelPath,
                    imagePath: localThumbPath,
                    ownerId: task.userId,
                    creatorId: task.userId,
                    status: 'NORMAL',
                    history: { create: { type: 'GENERATE', toUserId: task.userId } }
                }
            }),
            prisma.generationTask.update({
                where: { meshyTaskId },
                data: { status: 'DOWNLOADED', progress: 100, resultAssetUid: assetUid }
            })
        ]);

        return res.json({ status: 'COMPLETED', progress: 100, asset: newAsset });
    }

  } catch (e) {
    console.error(e);
    res.status(500).json({ error: '查询出错' });
  }
});

// 3. 获取用户背包 (我的资产)
app.get('/api/user/assets', async (req, res) => {
    const { userId } = req.query;
    try {
        const assets = await prisma.userAsset.findMany({
            where: { ownerId: userId },
            include: { template: true }, // 关联官方模板信息
            orderBy: { createdAt: 'desc' }
        });
        res.json({ success: true, assets });
    } catch(e) {
        res.status(500).json({ error: '获取失败' });
    }
});

// [新增] 更新用户资产展示设置 (展柜)
app.post('/api/user/assets/showcase', async (req, res) => {
  const { userId, assetUids } = req.body; // assetUids 是一个数组，最多5个 UID

  if (!Array.isArray(assetUids) || assetUids.length > 5) {
    return res.status(400).json({ error: '最多只能选择 5 个资产进行展示' });
  }

  try {
    // 使用事务确保原子性
    await prisma.$transaction(async (tx) => {
      // 1. 先把该用户所有资产的展示状态重置为 false
      await tx.userAsset.updateMany({
        where: { ownerId: userId },
        data: { isShowcased: false }
      });

      // 2. 如果有选中的资产，将它们设为 true
      if (assetUids.length > 0) {
        await tx.userAsset.updateMany({
          where: { 
            ownerId: userId,
            uid: { in: assetUids }
          },
          data: { isShowcased: true }
        });
      }
    });

    res.json({ success: true, message: '展柜更新成功' });
  } catch (e) {
    console.error("Update Showcase Error:", e);
    res.status(500).json({ error: '更新失败' });
  }
});

// [新增] 更新资产信息 (改名/改描述)
app.post('/api/user/asset/update', async (req, res) => {
  const { userId, assetUid, name, description } = req.body;
  
  try {
    // 1. 鉴权：确认资产存在且属于该用户
    const asset = await prisma.userAsset.findUnique({ where: { uid: assetUid } });
    
    if (!asset) return res.status(404).json({ error: '资产不存在' });
    if (asset.ownerId !== userId) return res.status(403).json({ error: '您无权修改此资产' });
    if (asset.isOfficial) return res.status(403).json({ error: '官方资产不可修改信息' });

    // 2. 更新
    await prisma.userAsset.update({
      where: { uid: assetUid },
      data: {
        customName: name,
        customDescription: description
      }
    });

    res.json({ success: true, message: '更新成功' });
  } catch (e) {
    console.error("Update Asset Error:", e);
    res.status(500).json({ error: '更新失败' });
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