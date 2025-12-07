export const INITIAL_SITE_CONFIG = {
  heroTitle: "ELITE STRIKE",
  heroSubtitle: "GRAND FINALS",
  heroDate: "Season 24 - Grand Finals",
  prizePool: "500,000",
  prizeGoal: 75,
  newsTicker: [
    "BREAKING NEWS: 决赛阶段将于 12月10日 开启",
    "奖金池已追加至 $500,000",
    "NAVI 确认全员参赛",
    "Team Spirit 领跑积分榜"
  ],
  aboutText: "CS:LEAGUE 是专为社区打造的高端竞技平台。无论你是职业哥还是路人王，这里都有属于你的舞台。我们要打造最纯粹的竞技环境，提供128tick服务器支持，以及专业的反作弊系统保护。",
  howToText: [
    "注册账号并验证邮箱",
    "组建5-7人的战队，或在散人区寻找队友",
    "填写报名表，等待管理员审核均分",
    "审核通过后，查看赛程并按时参赛"
  ]
};

export const INITIAL_MATCHES = [
  {
    id: 101,
    teamA: 'NAVI',
    teamB: 'FaZe',
    scoreA: 13,
    scoreB: 11,
    status: 'Live', 
    bo: 3,
    currentMap: 'Inferno',
    maps: [
      { name: 'Mirage', score: '13-9', winner: 'NAVI' },
      { name: 'Nuke', score: '11-13', winner: 'FaZe' },
      { name: 'Inferno', score: 'Live', winner: 'Pending' }
    ]
  },
  {
    id: 102,
    teamA: 'Team Spirit',
    teamB: 'G2',
    scoreA: 0,
    scoreB: 0,
    status: 'Upcoming',
    bo: 3,
    currentMap: '-',
    maps: []
  }
];

export const INITIAL_TEAMS = [
  {
    id: 't1',
    name: 'NAVI (Mock)',
    tag: 'NAVI',
    logoColor: 'bg-yellow-400',
    avgElo: 2850,
    contact: 'QQ: 123456',
    status: 'approved',
    rejectReason: '',
    members: [
      { id: 'Wonderful', score: 3100, role: 'AWP' },
      { id: 'b1t', score: 2900, role: 'Rifler' },
      { id: 'Aleksib', score: 2600, role: 'IGL' },
      { id: 'jL', score: 2850, role: 'Rifler' },
      { id: 'iM', score: 2800, role: 'Rifler' },
    ]
  },
  {
    id: 't2',
    name: 'FaZe Clan (Mock)',
    tag: 'FAZE',
    logoColor: 'bg-red-600',
    avgElo: 2820,
    contact: 'QQ: 654321',
    status: 'approved',
    rejectReason: '',
    members: [
      { id: 'karrigan', score: 2400, role: 'IGL' },
      { id: 'rain', score: 2700, role: 'Entry' },
      { id: 'broky', score: 3000, role: 'AWP' },
      { id: 'ropz', score: 3100, role: 'Lurker' },
      { id: 'frozen', score: 2900, role: 'Rifler' },
    ]
  },
  {
    id: 't3',
    name: 'Team Spirit',
    tag: 'TS',
    logoColor: 'bg-black border border-white',
    avgElo: 2900,
    contact: 'Official',
    status: 'approved',
    rejectReason: '',
    members: [
      { id: 'donk', score: 3500, role: 'Rifler' },
      { id: 'sh1ro', score: 2800, role: 'AWP' },
      { id: 'chopper', score: 2600, role: 'IGL' },
      { id: 'zonixx', score: 2700, role: 'Rifler' },
      { id: 'magixx', score: 2750, role: 'Rifler' },
    ]
  }
];

export const INITIAL_PLAYERS = [
  { id: 1, name: 'Donk', team: 'Spirit', rating: 1.55, kd: 1.60, adr: 105.2, hs: '55%', maps: 12 },
  { id: 2, name: 'm0NESY', team: 'G2', rating: 1.38, kd: 1.45, adr: 88.5, hs: '42%', maps: 14 },
  { id: 3, name: 'ZywOo', team: 'Vitality', rating: 1.35, kd: 1.40, adr: 86.0, hs: '40%', maps: 10 },
  { id: 4, name: 'NiKo', team: 'G2', rating: 1.28, kd: 1.18, adr: 92.1, hs: '52%', maps: 14 },
];

export const INITIAL_FREE_AGENTS = [
  { id: 'fa1', name: 'SoloCarry', score: 2800, role: 'AWP', contact: 'QQ: 999888' },
  { id: 'fa2', name: 'Tactician', score: 2400, role: 'IGL', contact: 'WeChat: tac123' },
];