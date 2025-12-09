import React, { createContext, useContext, useState, useEffect } from 'react';

const LeagueContext = createContext();
export const useLeague = () => useContext(LeagueContext);

const API_BASE = ''; 

// [新增] 辅助函数：按年份倒序排列历史记录 (最新的年份在前面)
const sortHistoryByYear = (list) => {
  return [...list].sort((a, b) => {
    const yearA = parseInt(a.year) || 0;
    const yearB = parseInt(b.year) || 0;
    return yearB - yearA; // 倒序: 2025 -> 2024 -> ...
  });
};

export const LeagueProvider = ({ children }) => {
  
  const [newsList, setNewsList] = useState([]); // [新增] 新闻列表
  const [isLoaded, setIsLoaded] = useState(false);
  
  const [error, setError] = useState(null);
  
  const [siteConfig, setSiteConfig] = useState({});
  const [teams, setTeams] = useState([]);
  const [matches, setMatches] = useState([]);
  const [playerStats, setPlayerStats] = useState([]);
  const [freeAgents, setFreeAgents] = useState([]);
  const [usersDB, setUsersDB] = useState([]);
  const [tournaments, setTournaments] = useState([]);
  const [feedbacks, setFeedbacks] = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  const [historyTournaments, setHistoryTournaments] = useState([]);
  const [user, setUser] = useState(() => {
    try {
      const saved = localStorage.getItem('currentUser');
      return saved ? JSON.parse(saved) : null;
    } catch(e) { return null; }
  });
  // 辅助函数：按日期倒序排列赛事 (最新的在前面)
const sortTournamentsByDate = (list) => {
  return [...list].sort((a, b) => {
    // 假设 dateRange 格式为 "2025/10/17 - 2025/11/2"
    // 取 " - " 之前的部分作为开始时间
    const getStartTime = (range) => {
        if (!range) return 0;
        const startStr = range.split('-')[0].trim().replace(/\//g, '-');
        return new Date(startStr).getTime() || 0;
    };
    // 倒序：B - A
    return getStartTime(b.dateRange) - getStartTime(a.dateRange);
  });
};

// --- 初始化：从后端读取数据 ---
  useEffect(() => {
    fetch(`${API_BASE}/api/db`)
      .then(res => {
        if (!res.ok) throw new Error(`Server Error: ${res.status}`);
        return res.json();
      })
      .then(data => {
        if (data) {
          setSiteConfig(data.siteConfig || {});
          setTeams(data.teams || []);
          setMatches(data.matches || []);
          setPlayerStats(data.playerStats || []);
          setFreeAgents(data.freeAgents || []);
          setUsersDB(data.usersDB || []);
          setFeedbacks(data.feedbacks || []);
          setAnnouncements(data.announcements || []);
          
          // [修复] 之前可能漏掉了这两行，导致刷新后数据丢失
          setHistoryTournaments(data.historyTournaments || []);
          setTournaments(sortTournamentsByDate(data.tournaments || [])); // <--- 关键修复：读取赛事结构
          
          setIsLoaded(true);
        }
      })
      .catch(err => {
        console.error("Failed to fetch DB:", err);
        setError(err.message);
        setIsLoaded(true);
      });
      
    // [新增] 单独获取新闻 (或者你可以把新闻也放到 db.json 统一接口里，但独立接口更灵活)
    fetch(`${API_BASE}/api/news`)
      .then(res => res.json())
      .then(data => {
        if(data.success) setNewsList(data.news);
      })
      .catch(console.error);
  }, []);

  const syncToRemote = (collection, newData) => {
    fetch(`${API_BASE}/api/sync`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ collection, data: newData })
    }).catch(e => console.error("Sync failed:", e));
  };

  // --- 业务方法 ---
  
  
  
// [修改] 新闻保存方法
  const saveNews = async (newsData) => {
    try {
        // 判断是否为 FormData (文件上传)
        const isFormData = newsData instanceof FormData;
        
        const res = await fetch(`${API_BASE}/api/news/save`, {
            method: 'POST', 
            // 如果是 FormData，不要手动设置 Content-Type，浏览器会自动处理 boundary
            headers: isFormData ? {} : { 'Content-Type': 'application/json' },
            body: isFormData ? newsData : JSON.stringify(newsData)
        });
        
        const data = await res.json();
        if(data.success) {
            // 刷新列表
            const listRes = await fetch(`${API_BASE}/api/news`);
            const listData = await listRes.json();
            setNewsList(listData.news);
        }
        return data;
    } catch(e) { console.error(e); }
  };

  const deleteNews = async (id) => {
      await fetch(`${API_BASE}/api/news/${id}`, { method: 'DELETE' });
      setNewsList(prev => prev.filter(n => n.id !== id));
  };

  const togglePinNews = async (id, currentStatus) => {
      await fetch(`${API_BASE}/api/news/pin`, {
          method: 'POST', headers: {'Content-Type': 'application/json'},
          body: JSON.stringify({ id, isPinned: !currentStatus })
      });
      // 重新拉取以更新排序
      const listRes = await fetch(`${API_BASE}/api/news`);
      const listData = await listRes.json();
      setNewsList(listData.news);
  };

  const updateSiteConfig = (newConf) => {
    setSiteConfig(newConf);
    syncToRemote('siteConfig', newConf);
  };

  const saveTeam = (d) => {
    const newTeams = d.id 
      ? teams.map(t => t.id === d.id ? { ...t, ...d, status: 'pending' } : t)
      : [...teams, { ...d, id: `t_${Date.now()}`, ownerId: user?.id, status: 'pending' }];
    setTeams(newTeams);
    syncToRemote('teams', newTeams);
  };
  
  // 在 LeagueContext.jsx 中找到 adminUpdateTeam 方法，替换为以下逻辑：

const adminUpdateTeam = (d) => {
  let newTeams;
  if (d.id && teams.some(t => t.id === d.id)) {
    // 如果 ID 存在，则是更新
    newTeams = teams.map(t => t.id === d.id ? d : t);
  } else {
    // 如果 ID 不存在，则是管理员导入的新战队
    // 自动生成 ID，标记状态为 approved (管理员导入的默认通过)，ownerId 设为 'admin' 或 null
    const newTeam = { 
      ...d, 
      id: d.id || `t_${Date.now()}`, 
      ownerId: d.ownerId || 'admin_import', 
      status: d.status || 'approved' 
    };
    newTeams = [...teams, newTeam];
  }
  setTeams(newTeams);
  syncToRemote('teams', newTeams);
};
  
  const deleteTeam = (id) => {
    const newTeams = teams.filter(t => t.id !== id);
    setTeams(newTeams);
    syncToRemote('teams', newTeams);
  };

  // [新增] 检查名字可用性
  const checkNameAvailability = async (name, excludeUserId = null) => {
    try {
        const res = await fetch(`${API_BASE}/api/check-name`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, excludeUserId })
        });
        return await res.json();
    } catch (e) {
        return { available: false, message: "网络错误" };
    }
  };


  // 修改后的 updateMatch 方法
  const updateMatch = (d) => {
    let newMatches;
    const exists = d.id && matches.some(m => m.id == d.id);
    if (exists) {
      newMatches = matches.map(m => m.id == d.id ? d : m);
    } else {
      newMatches = [...matches, { ...d, id: d.id || Date.now() }];
    }
    setMatches(newMatches);
    syncToRemote('matches', newMatches);
  };
  
  // 2. 【新增】批量导入方法（核心修复）
  // 一次性处理所有数据，只进行一次数据库写入
  const importMatches = (newMatchesData) => {
    let updatedMatches = [...matches];

    newMatchesData.forEach(newMatch => {
        const newId = String(newMatch.id);
        const index = updatedMatches.findIndex(m => String(m.id) === newId);
        if (index !== -1) updatedMatches[index] = newMatch;
        else updatedMatches.push(newMatch);
    });

    // --- 核心修改：强制按 ID 倒序排列 ---
    // 因为完美平台的 RoomID 是递增的，ID 越大代表比赛越新。
    // 这样可以确保最新的比赛永远在列表最上面
    updatedMatches.sort((a, b) => Number(b.id) - Number(a.id));

    setMatches(updatedMatches);
    syncToRemote('matches', updatedMatches);
  };
  
  const deleteMatch = (id) => {
    const newMatches = matches.filter(m => m.id !== id);
    setMatches(newMatches);
    syncToRemote('matches', newMatches);
  };
  
  // 【新增】批量删除方法
  const deleteMatches = (ids) => {
    // 过滤掉 ID 在 ids 数组中的比赛
    // 注意：转换成 String 进行比较，防止类型不一致
    const newMatches = matches.filter(m => !ids.includes(String(m.id)));
    setMatches(newMatches);
    syncToRemote('matches', newMatches);
  };
  
  // 【新增】通用批量更新比赛信息 (例如批量修改阶段、状态等)
  const batchUpdateMatches = (ids, updateData) => {
    const newMatches = matches.map(m => {
      if (ids.includes(String(m.id))) {
        return { ...m, ...updateData };
      }
      return m;
    });
    setMatches(newMatches);
    syncToRemote('matches', newMatches);
  };

  const reorderMatches = (newMatchesList) => {
    setMatches(newMatchesList);
    syncToRemote('matches', newMatchesList);
  };

  // 【新增】公告管理方法
const saveAnnouncement = (d) => {
  const newAnnos = d.id 
    ? announcements.map(a => a.id === d.id ? d : a)
    : [{ ...d, id: `anno_${Date.now()}` }, ...announcements]; // 新的放前面
  setAnnouncements(newAnnos);
  syncToRemote('announcements', newAnnos);
};

const deleteAnnouncement = (id) => {
  const newAnnos = announcements.filter(a => a.id !== id);
  setAnnouncements(newAnnos);
  syncToRemote('announcements', newAnnos);
};

  // [修复] 选手数据导入：改为“合并/追加”模式
  const importPlayers = (newPlayersData) => {
    // 1. 复制现有数据
    let updatedStats = [...playerStats];

    newPlayersData.forEach(p => {
        // 2. 检查 ID 是否已存在
        // 注意：为了区分不同赛事，我们在 Admin 导入时会生成复合 ID
        const index = updatedStats.findIndex(old => String(old.id) === String(p.id));
        
        if (index !== -1) {
            // 3. 如果 ID 存在 -> 更新 (覆盖旧数据)
            updatedStats[index] = p;
        } else {
            // 4. 如果 ID 不存在 -> 追加 (新数据)
            updatedStats.push(p);
        }
    });

    setPlayerStats(updatedStats);
    syncToRemote('playerStats', updatedStats);
  };
  
  // [新增] 专门用于清空所有选手数据
  const clearAllPlayers = () => {
    setPlayerStats([]);
    syncToRemote('playerStats', []);
  };
  
  const updateSinglePlayer = (p) => {
    const newStats = playerStats.map(x => x.id === p.id ? p : x);
    setPlayerStats(newStats);
    syncToRemote('playerStats', newStats);
  };

  // [新增] 保存单条选手记录 (新建或更新)
  const savePlayerStat = (p) => {
    let newStats;
    if (p.id) {
        // 更新
        newStats = playerStats.map(x => x.id === p.id ? p : x);
    } else {
        // 新建 (生成一个带时间戳的ID)
        const newRecord = { ...p, id: `p_${Date.now()}` };
        newStats = [...playerStats, newRecord];
    }
    setPlayerStats(newStats);
    syncToRemote('playerStats', newStats);
  };
  
  const deletePlayer = (id) => {
    const newStats = playerStats.filter(p => p.id !== id);
    setPlayerStats(newStats);
    syncToRemote('playerStats', newStats);
  };
  
  const deletePlayers = (ids) => {
    const newStats = playerStats.filter(p => !ids.includes(p.id));
    setPlayerStats(newStats);
    syncToRemote('playerStats', newStats);
  };

  const saveFreeAgent = (d) => {
    const newAgents = d.id 
      ? freeAgents.map(f => f.id === d.id ? d : f)
      : [...freeAgents, { ...d, id: `fa_${Date.now()}`, ownerId: user?.id }];
    setFreeAgents(newAgents);
    syncToRemote('freeAgents', newAgents);
  };
  
  const deleteFreeAgent = (id) => {
    const newAgents = freeAgents.filter(f => f.id !== id);
    setFreeAgents(newAgents);
    syncToRemote('freeAgents', newAgents);
  };

  // 【修改】增加 qq 参数
  const addFeedback = (content, qq = '') => {
    const newFeedback = {
      id: `fb_${Date.now()}`,
      user: user?.name || 'Anonymous',
      userId: user?.id || null,
      content,
      qq, // 存储 QQ 号
      date: new Date().toLocaleString('zh-CN', { hour12: false })
    };
    const newFeedbacks = [newFeedback, ...feedbacks];
    setFeedbacks(newFeedbacks);
    syncToRemote('feedbacks', newFeedbacks);
  };

  const deleteFeedback = (id) => {
    const newFeedbacks = feedbacks.filter(f => f.id !== id);
    setFeedbacks(newFeedbacks);
    syncToRemote('feedbacks', newFeedbacks);
  };

const saveHistoryTournament = (d) => {
    // 复制副本
    let newHistory = [...historyTournaments]; 

    if (d.id) {
      // [编辑模式]：原地更新，绝对不改变位置
      // 注意：虽然 ID 在后台被重写了，但 React Key 匹配没问题，刷新后会获取新 ID
      newHistory = newHistory.map(h => h.id === d.id ? d : h);
    } else {
      // [新建模式]：智能插入
      // 先给个临时 ID，反正存到后台会被重写为 h_000xx
      const newItem = { ...d, id: `temp_${Date.now()}` }; 
      const newYear = parseInt(newItem.year) || 0;

      // 找到插入位置：插在第一个“年份比我小”的记录前面
      // 假设列表当前是：[2025A, 2025B, 2024, 2022]
      // 新建 2023 -> 插在 2022 前面
      const insertIndex = newHistory.findIndex(h => {
          const currentYear = parseInt(h.year) || 0;
          return currentYear < newYear;
      });

      if (insertIndex === -1) {
        newHistory.push(newItem); // 没找到更小的，放最后
      } else {
        newHistory.splice(insertIndex, 0, newItem); // 插队
      }
    }

    setHistoryTournaments(newHistory);
    syncToRemote('historyTournaments', newHistory);
  };

  // 【新增】删除历史锦标赛
  const deleteHistoryTournament = (id) => {
    const newHistory = historyTournaments.filter(h => h.id !== id);
    setHistoryTournaments(newHistory);
    syncToRemote('historyTournaments', newHistory);
  };
  
  // 【新增】重排历史锦标赛顺序
  const reorderHistoryTournaments = (newHistoryList) => {
    setHistoryTournaments(newHistoryList);
    syncToRemote('historyTournaments', newHistoryList);
  };

// 【新增】赛事管理方法
  const saveTournament = (d) => {
    const rawList = d.id 
      ? tournaments.map(t => t.id === d.id ? d : t)
      : [...tournaments, { ...d, id: `tour_${Date.now()}` }];
    
    // [修改] 保存前重新排序
    const newTournaments = sortTournamentsByDate(rawList);
    
    setTournaments(newTournaments);
    syncToRemote('tournaments', newTournaments);
  };

  const deleteTournament = (id) => {
    const newTournaments = tournaments.filter(t => t.id !== id);
    setTournaments(newTournaments);
    syncToRemote('tournaments', newTournaments);
  };


  const register = async (username, password, name) => { // <--- 确保这里有 name
    try {
        const res = await fetch(`${API_BASE}/api/register`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password, name }) // <--- 传给后端
        });
        return await res.json();
    } catch (e) { return { success: false, message: "注册失败" }; }
  };
  const updateUserProfile = async (formData) => {
    try {
        const res = await fetch(`${API_BASE}/api/user/update`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(formData)
        });
        const data = await res.json();
        if (data.success) {
            setUser(data.user);
            localStorage.setItem('currentUser', JSON.stringify(data.user));
        }
        return data;
    } catch (e) { return { success: false, message: "更新请求失败" }; }
  };
  const login = async (username, password) => {
    try {
        const res = await fetch(`${API_BASE}/api/login`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });
        const data = await res.json();
        if (data.success) {
            setUser(data.user);
            localStorage.setItem('currentUser', JSON.stringify(data.user));
            return { success: true };
        } else { return { success: false, message: data.message }; }
    } catch (e) { return { success: false, message: "服务器连接失败" }; }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('currentUser');
  };

const value = {
    isLoaded, error, user, setUser, login, register, logout,
    siteConfig: siteConfig || {}, setSiteConfig: updateSiteConfig,
    teams, saveTeam, adminUpdateTeam, deleteTeam, adminDeleteTeam: deleteTeam,
    matches, updateMatch, deleteMatch, reorderMatches, importMatches, deleteMatches, batchUpdateMatches,announcements, saveAnnouncement, deleteAnnouncement,
    playerStats, importPlayers, updateSinglePlayer, deletePlayer, deletePlayers,
    freeAgents, saveFreeAgent, deleteFreeAgent,savePlayerStat,updateUserProfile,checkNameAvailability,
    feedbacks, addFeedback, deleteFeedback,clearAllPlayers,newsList, saveNews, deleteNews, togglePinNews,
    
    // [检查] 确保这下面三行都存在
    historyTournaments, saveHistoryTournament, deleteHistoryTournament, reorderHistoryTournaments,
    tournaments, saveTournament, deleteTournament // <--- 这一行必须有
  };

  if (!isLoaded) return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center text-white">
      <div className="animate-spin w-8 h-8 border-4 border-yellow-500 border-t-transparent rounded-full mb-4"></div>
      <div className="font-mono text-sm text-zinc-400">CONNECTING TO SERVER...</div>
    </div>
  );

  if (error) return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center text-white p-8 text-center">
      <div className="bg-red-900/20 p-6 rounded-lg border border-red-800 max-w-md">
        <h2 className="text-xl font-bold text-red-500 mb-2">SYSTEM ERROR</h2>
        <p className="text-zinc-400 mb-4 text-sm">{error}</p>
        <button onClick={() => window.location.reload()} className="bg-red-600 hover:bg-red-500 px-4 py-2 rounded text-sm font-bold">
          RETRY
        </button>
      </div>
    </div>
  );

  return <LeagueContext.Provider value={value}>{children}</LeagueContext.Provider>;
};