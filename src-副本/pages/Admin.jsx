import React, { useState, useRef } from 'react';
import { useLeague } from '../context/LeagueContext';
import { 
  LayoutTemplate, Calendar, Shield, Users, Plus, Edit, Trash2, Upload, Settings, 
  FileSpreadsheet, AlertCircle, XSquare, CheckSquare, MessageSquare, ArrowUp, ArrowDown, Download, ArrowLeft, ArrowRight,
  History, Trophy, Flag, Bell, Type, Bold, Send, Wand2 // <--- 在这里加上 Trophy
} from 'lucide-react';
import StatusBadge from '../components/StatusBadge';
import TeamEditModal from '../components/modals/TeamEditModal';
import MatchEditModal from '../components/modals/MatchEditModal';
import HistoryEditModal from '../components/modals/HistoryEditModal'; // 引入 Modal
import PlayerDetailModal from '../components/modals/PlayerDetailModal';
import TournamentEditModal from '../components/modals/TournamentEditModal';
import { processFile } from '../utils/dataParser';

export default function Admin() {
  const { 
    user, siteConfig, setSiteConfig, 
    matches, updateMatch, deleteMatch, reorderMatches, importMatches, deleteMatches, // 引入 deleteMatches
    teams, adminUpdateTeam, adminDeleteTeam, 
    playerStats, importPlayers, updateSinglePlayer, deletePlayer, deletePlayers,clearAllPlayers,
    feedbacks, deleteFeedback ,
    historyTournaments, saveHistoryTournament, deleteHistoryTournament,
    tournaments, saveTournament, deleteTournament,
    reorderHistoryTournaments, batchUpdateMatches,
    announcements, saveAnnouncement, deleteAnnouncement
  } = useLeague();

  const [adminTab, setAdminTab] = useState('players'); 
  const [editingTeam, setEditingTeam] = useState(null);
  const [editingMatch, setEditingMatch] = useState(null);
  
  // 战队拒绝相关状态
  const [rejectingId, setRejectingId] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  
  const [editingHistory, setEditingHistory] = useState(null);
  
  // 选手管理相关状态
  const [selectedPlayerIds, setSelectedPlayerIds] = useState([]); 
  // 【新增】比赛批量选择状态
  const [selectedMatchIds, setSelectedMatchIds] = useState([]);
  const fileInputRef = useRef(null);

  const [batchTargetTourId, setBatchTargetTourId] = useState(''); // 用于批量操作的临时赛事ID

  const [editingTournament, setEditingTournament] = useState(null);
  // 选手导入时的选择状态
  const [playerImportContext, setPlayerImportContext] = useState({ tournamentId: '', stageId: '' });
  const [viewingPlayer, setViewingPlayer] = useState(null); // 控制详情弹窗
  const [editingAnnouncement, setEditingAnnouncement] = useState(null);
  const [annoForm, setAnnoForm] = useState({
    content: '',
    date: new Date().toLocaleDateString(),
    style: { color: '#ffffff', fontSize: '14px', isBold: false }
});

  // 完美赛程导入状态
  const [showImportModal, setShowImportModal] = useState(false);
  const [importForm, setImportForm] = useState({ url: '', acw_tc: '', match_id: '' });
  const [isImporting, setIsImporting] = useState(false);



  // --- 逻辑区域：比赛排序 ---
  const moveMatch = (index, direction) => {
    const newMatches = [...matches];
    if (direction === 'up' && index > 0) {
      [newMatches[index], newMatches[index - 1]] = [newMatches[index - 1], newMatches[index]];
    } else if (direction === 'down' && index < newMatches.length - 1) {
      [newMatches[index], newMatches[index + 1]] = [newMatches[index + 1], newMatches[index]];
    }
    reorderMatches(newMatches);
  };

// --- 比赛批量操作逻辑 ---
  const handleSelectAllMatches = (e) => {
    if (e.target.checked) {
      setSelectedMatchIds(matches.map(m => String(m.id)));
    } else {
      setSelectedMatchIds([]);
    }
  };

  const handleSelectMatch = (id) => {
    const strId = String(id);
    setSelectedMatchIds(prev => 
      prev.includes(strId) ? prev.filter(pid => pid !== strId) : [...prev, strId]
    );
  };

  const handleBatchDeleteMatches = () => {
    if (selectedMatchIds.length === 0) return;
    if (confirm(`确定要删除选中的 ${selectedMatchIds.length} 场比赛吗？`)) {
      deleteMatches(selectedMatchIds);
      setSelectedMatchIds([]);
    }
  };

  // --- 逻辑区域：完美赛程导入 ---
  const handleWMPVPImport = async () => {
    if (!importForm.url || !importForm.acw_tc || !importForm.match_id) {
        alert("请填写完整的 URL 和 Cookie 信息");
        return;
    }
    
    setIsImporting(true);
    try {
        // 发送请求到后端 API
        const res = await fetch('/api/import-wmpvp', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                url: importForm.url,
                acw_tc: importForm.acw_tc,
                match_id_cookie: importForm.match_id
            })
        });
        
        const result = await res.json();

            if (result.success) {
                if (result.warnings && result.warnings.length > 0) {
                    alert(`导入部分成功，但有以下问题需要注意：\n\n${result.warnings.join('\n')}`);
                } else {
                    alert(`成功导入 ${result.count} 场比赛！`);
                }

                const newMatches = result.matches;

                // --- 【核心修改】 ---
                // 1. 整理数据：确保每条数据都有 String 类型的 ID
                const matchesToImport = newMatches.map(m => ({
                    ...m,
                    id: m.id.toString() // 确保 ID 存在且为字符串
                }));

                // 2. 调用批量导入函数（只触发一次更新）
                // 注意：这里需要从 useLeague() 里解构出 importMatches
                importMatches(matchesToImport); 
                // ------------------

                setShowImportModal(false);
                setImportForm({ url: '', acw_tc: '', match_id: '' });
            } else {
            alert("导入失败：" + result.error);
        }
    } catch (e) {
        alert("请求失败，请检查后端日志");
        console.error(e);
    } finally {
        setIsImporting(false);
    }
  };

  // --- 逻辑区域：选手管理 ---
  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    // [新增] 必须选择赛事，否则不知道归属到哪里
    if (!playerImportContext.tournamentId) { 
        alert("请先选择归属赛事！"); 
        e.target.value = ''; 
        return; 
    }

    // [新增] 必须选择阶段（全程 or 具体阶段）
    if (!playerImportContext.stageId) {
        alert("请选择是导入【赛事全程】数据还是【具体阶段】数据！");
        e.target.value = '';
        return;
    }

    try {
      const parsedData = await processFile(file);
      if (parsedData.length > 0) {
          
          const finalData = parsedData.map(p => {
              // 生成复合 ID: "原始ID_赛事ID_阶段ID"
              // 注意：这里 stageId 可能为 'all' (全程) 或 具体ID
              const uniqueId = `${p.id}_${playerImportContext.tournamentId}_${playerImportContext.stageId}`;

              return {
                  ...p,
                  id: uniqueId, 
                  originalId: p.id, 
                  tournamentId: playerImportContext.tournamentId,
                  stageId: playerImportContext.stageId // 'all' 或 具体ID
              };
          });

          // 获取名称用于提示
          const tourName = tournaments.find(t=>t.id===playerImportContext.tournamentId)?.name;
          let stageName = '未知';
          if (playerImportContext.stageId === 'all') {
              stageName = '赛事全程 (独立统计)';
          } else {
              stageName = tournaments.find(t=>t.id===playerImportContext.tournamentId)?.stages.find(s=>s.id===playerImportContext.stageId)?.name;
          }

          if (confirm(`解析 ${finalData.length} 条数据\n归属: [${tourName}] - [${stageName}]\n\n确定导入吗？此操作将作为独立数据记录。`)) {
              importPlayers(finalData);
              setSelectedPlayerIds([]); 
              alert('导入成功！');
          }
      }
    } catch (err) {
      alert(`导入出错: ${err.message}`);
    } finally {
      e.target.value = '';
    }
  };

  const handleSelectAllPlayers = (e) => {
    if (e.target.checked) {
      setSelectedPlayerIds(playerStats.map(p => p.id));
    } else {
      setSelectedPlayerIds([]);
    }
  };

  const handleSelectOnePlayer = (id) => {
    setSelectedPlayerIds(prev => 
      prev.includes(id) ? prev.filter(pid => pid !== id) : [...prev, id]
    );
  };

  const handleBatchDeletePlayers = () => {
    if (selectedPlayerIds.length === 0) return;
    if (confirm(`确定要删除选中的 ${selectedPlayerIds.length} 条选手数据吗？`)) {
      deletePlayers(selectedPlayerIds);
      setSelectedPlayerIds([]);
    }
  };
  // [新增] 智能数据清洗：根据名字合并旧数据
  // [修正版] 智能数据清洗：基于 originalId 修复 SteamID
  const handleSmartMerge = () => {
    if (!confirm("⚠️ 数据修复模式\n\n系统检测到数据中包含 originalId (即 SteamID)。\n此操作将把所有记录的 steamId 字段强制修正为 originalId，从而实现完美聚合。\n\n建议备份 db.json！确定执行吗？")) return;

    let fixCount = 0;

    const cleanedData = playerStats.map(p => {
        // 核心逻辑：如果有 originalId，就强制用它覆盖/填充 steamId
        // 如果没有 originalId (极少数情况)，再回退到用名字生成虚拟ID
        let targetSteamId = p.steamId;

        if (p.originalId) {
            targetSteamId = p.originalId;
        } else if (!p.steamId) {
            // 只有既没 originalId 也没 steamId 时，才用名字生成
            const hash = Math.abs(p.name.split('').reduce((a,b)=>{a=((a<<5)-a)+b.charCodeAt(0);return a&a},0));
            targetSteamId = `gen_${hash}`;
        }

        if (targetSteamId !== p.steamId) fixCount++;

        return {
            ...p,
            steamId: targetSteamId, // 修正后的 SteamID
            // 确保其他字段完整
            tournamentId: p.tournamentId || '',
            stageId: p.stageId || '',
            team: p.team || 'Unknown'
        };
    });

    importPlayers(cleanedData);
    alert(`修复完成！\n已修正 ${fixCount} 条记录的 SteamID 关联。\n列表现在应该已正确聚合。`);
  };

  const handleDeleteSinglePlayer = (id, name) => {
    if(confirm(`确定删除选手 ${name} 吗？`)) {
      deletePlayer(id);
      setSelectedPlayerIds(prev => prev.filter(pid => pid !== id));
    }
  };

  const handleClearAllPlayers = () => {
    if(confirm('危险警告：\n确定要清空数据库中所有的选手数据吗？\n此操作无法恢复！')) {
      importPlayers([]); // 传入空数组即清空
      setSelectedPlayerIds([]);
    }
  };

  // --- 逻辑区域：战队 & 比赛 ---
  const handleTeamUpdate = (u) => { adminUpdateTeam(u); setEditingTeam(null); alert('更新成功'); };
  
  const handleMatchSave = (m) => { updateMatch(m); setEditingMatch(null); };
  
  const handleStatusChange = (id, status, reason='') => {
    const t = teams.find(tm => tm.id === id);
    if(t) adminUpdateTeam({...t, status, rejectReason: reason});
    setRejectingId(null); setRejectReason('');
  };

// --- 历史记录排序逻辑 ---
  const moveHistory = (index, direction) => {
    const newHistory = [...historyTournaments];
    if (direction === 'left' && index > 0) {
      // 向前移动 (交换索引)
      [newHistory[index], newHistory[index - 1]] = [newHistory[index - 1], newHistory[index]];
    } else if (direction === 'right' && index < newHistory.length - 1) {
      // 向后移动
      [newHistory[index], newHistory[index + 1]] = [newHistory[index + 1], newHistory[index]];
    }
    reorderHistoryTournaments(newHistory);
  };

  // 战队删除
  const handleDeleteTeam = (team) => {
    if(confirm(`危险操作：确定要彻底删除战队【${team.name}】吗？\n这将清除该战队的所有报名信息。`)) {
        if (adminDeleteTeam) {
            adminDeleteTeam(team.id);
        } else {
            console.error("Context 中缺少 adminDeleteTeam 方法");
            alert("系统错误：Context缺失删除方法");
        }
    }
  };

  const deleteMatchItem = (id) => { if(confirm('确定删除这场比赛吗?')) deleteMatch(id); };
  
  // 聚合选手数据 (Group by SteamID)
// --- 选手聚合逻辑 (核心优化：按赛事时间判断最新战队) ---
  const groupedPlayers = React.useMemo(() => {
    const groups = {};
    
    // 1. 分组 (保持不变)
    // 1. 分组
    playerStats.forEach(p => {
        // [核心修正] 优先使用 originalId (即导入时的 SteamID)，其次才是 steamId 字段
        // 这样可以把所有拥有相同原始 SteamID 的记录聚在一起
        const key = p.originalId || p.steamId || p.name || p.id; 
        
        if (!groups[key]) groups[key] = [];
        groups[key].push(p);
    });

    // [新增] 辅助函数：解析赛事结束时间
    const getTourEndTime = (tourId) => {
        if (!tourId) return 0;
        const tour = tournaments.find(t => t.id === tourId);
        if (!tour || !tour.dateRange) return 0;
        // 兼容 "2025/10/17-2025/11/2" 或 "2025/10/17 - 2025/11/2"
        const parts = tour.dateRange.split('-');
        if (parts.length < 2) return 0;
        const endDateStr = parts[1].trim().replace(/\//g, '-'); 
        return new Date(endDateStr).getTime();
    };

    return Object.values(groups).map(records => {
        // [修改] 排序记录：按所属赛事的结束时间倒序排列
        // 这样 records[0] 就一定是时间线上最新的记录
        records.sort((a, b) => {
            const timeA = getTourEndTime(a.tournamentId);
            const timeB = getTourEndTime(b.tournamentId);
            // 如果时间相同，保持原有顺序或按ID排
            return timeB - timeA; 
        });

        const latest = records[0]; // 取最新的这一条作为展示基准
        
        // 计算平均 Rating
        const totalRating = records.reduce((sum, r) => sum + (parseFloat(r.rating) || 0), 0);
        const avgRating = (totalRating / records.length).toFixed(2);

        return {
            uniqueKey: latest.steamId || latest.id,
            name: latest.name,
            team: latest.team, // 现在这里取的是时间最新的战队
            steamId: latest.steamId,
            avgRating: avgRating,
            recordCount: records.length,
            records: records 
        };
    });
  }, [playerStats, tournaments]); // <--- [重要] 别忘了把 tournaments 加进依赖数组

// 批量删除聚合选手
const handleDeleteGroupedPlayer = (player) => {
    if(confirm(`确定删除选手【${player.name}】及其所有 ${player.recordCount} 条历史记录吗？`)) {
        const idsToDelete = player.records.map(r => r.id);
        deletePlayers(idsToDelete);
    }
}

  // 权限检查
  if (user?.role !== 'admin') return (
    <div className="flex flex-col items-center justify-center h-[60vh] text-center animate-in fade-in">
      <div className="bg-red-500/10 p-6 rounded-full mb-4">
        <AlertCircle size={48} className="text-red-500" />
      </div>
      <h2 className="text-2xl font-bold text-white mb-2">访问被拒绝</h2>
      <p className="text-zinc-400">您没有权限访问管理后台。</p>
    </div>
  );
  // --- 渲染区域 ---
  return (
    <div className="space-y-6 animate-in fade-in pb-20">
      
      {/* 顶部 Tabs 导航 */}
      <div className="bg-zinc-900 border-b border-zinc-800 p-4 flex flex-wrap gap-4 items-center justify-between rounded-t-lg">
        <div className="flex items-center text-white font-black text-xl">
          <Settings className="mr-3 text-red-600" /> 后台管理系统
        </div>
        <div className="flex gap-2 overflow-x-auto">
           {[
             { id: 'site', label: '全局设置', icon: LayoutTemplate },
             { id: 'tournaments', label: '赛事管理', icon: Flag },
             { id: 'matches', label: '赛程管理', icon: Calendar },
             { id: 'teams', label: '战队审批', icon: Shield },
             { id: 'players', label: '选手数据', icon: Users },
             { id: 'feedback', label: '留言管理', icon: MessageSquare },
             { id: 'history', label: '历届锦标赛', icon: History },
             { id: 'announcements', label: '公告栏', icon: Bell },
           ].map(tab => (
             <button 
               key={tab.id} 
               onClick={() => setAdminTab(tab.id)} 
               className={`flex items-center gap-2 px-4 py-2 rounded-sm transition-all duration-200 whitespace-nowrap ${
                 adminTab === tab.id 
                   ? 'bg-yellow-500 text-black font-bold shadow-lg shadow-yellow-500/20' 
                   : 'text-zinc-400 hover:bg-zinc-800 hover:text-white'
               }`}
             >
                <tab.icon size={18}/> {tab.label}
             </button>
           ))}
        </div>
      </div>

      <div className="bg-zinc-900 p-6 min-h-[600px] border border-zinc-800 rounded-b-lg">
        
        {/* --- Tab 1: 全局设置 --- */}
        {adminTab === 'site' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 animate-in slide-in-from-bottom-2">
            <div className="space-y-6">
              <h3 className="text-white font-bold border-b border-zinc-800 pb-2 uppercase tracking-wider text-sm flex items-center"><LayoutTemplate size={16} className="mr-2 text-yellow-500"/> 首页配置</h3>
              
              {/* [新增] 首页主推赛事选择 */}
              <div>
                <label className="block text-xs text-zinc-500 mb-1 uppercase font-bold text-yellow-500">首页展示 MVP 所属赛事</label>
                <select 
                    value={siteConfig.featuredTournamentId || ''} 
                    onChange={e => setSiteConfig({...siteConfig, featuredTournamentId: e.target.value})} 
                    className="w-full bg-black border border-yellow-500/30 text-white p-3 rounded-sm focus:border-yellow-500 outline-none"
                >
                    <option value="">-- 默认 (全站最高) --</option>
                    {tournaments.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
                <p className="text-[10px] text-zinc-600 mt-1">* 首页的 MVP 卡片将展示该赛事【全程】阶段的 Rating 第一名。</p>
              </div>

              <div><label className="block text-xs text-zinc-500 mb-1 uppercase font-bold">主标题 (Hero Title)</label><input value={siteConfig.heroTitle} onChange={e => setSiteConfig({...siteConfig, heroTitle: e.target.value})} className="w-full bg-black border border-zinc-700 text-white p-3 rounded-sm"/></div>
              <div><label className="block text-xs text-zinc-500 mb-1 uppercase font-bold">副标题 (Highlighted)</label><input value={siteConfig.heroSubtitle} onChange={e => setSiteConfig({...siteConfig, heroSubtitle: e.target.value})} className="w-full bg-black border border-zinc-700 text-white p-3 rounded-sm"/></div>
              <div><label className="block text-xs text-zinc-500 mb-1 uppercase font-bold">日期/赛季文案</label><input value={siteConfig.heroDate} onChange={e => setSiteConfig({...siteConfig, heroDate: e.target.value})} className="w-full bg-black border border-zinc-700 text-white p-3 rounded-sm"/></div>
            </div>
            
            <div className="space-y-6">
              <h3 className="text-white font-bold border-b border-zinc-800 pb-2 uppercase tracking-wider text-sm flex items-center"><Settings size={16} className="mr-2 text-green-500"/> 运营配置</h3>
              <div><label className="block text-xs text-zinc-500 mb-1 uppercase font-bold">奖金池 ($)</label><input value={siteConfig.prizePool} onChange={e => setSiteConfig({...siteConfig, prizePool: e.target.value})} className="w-full bg-black border border-zinc-700 text-white p-3 rounded-sm font-mono"/></div>
              <div><label className="block text-xs text-zinc-500 mb-1 uppercase font-bold">滚动新闻 (逗号分隔)</label><textarea value={siteConfig.newsTicker?.join(',')} onChange={e => setSiteConfig({...siteConfig, newsTicker: e.target.value.split(',')})} className="w-full bg-black border border-zinc-700 text-white p-3 rounded-sm h-32"/></div>
            </div>
            
            <div className="md:col-span-2 space-y-4">
               <h3 className="text-white font-bold border-b border-zinc-800 pb-2 uppercase tracking-wider text-sm">关于赛事文案</h3>
               <textarea value={siteConfig.aboutText} onChange={e => setSiteConfig({...siteConfig, aboutText: e.target.value})} className="w-full bg-black border border-zinc-700 text-white p-3 rounded-sm h-32"/>
            </div>
          </div>
        )}

        {/* --- Tab: 公告管理 --- */}
        {adminTab === 'announcements' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-in slide-in-from-bottom-2">
             
             {/* 左侧：编辑器 */}
             <div className="lg:col-span-1 bg-zinc-950 border border-zinc-800 p-6 rounded h-fit">
                <h3 className="text-white font-bold mb-4 flex items-center border-b border-zinc-800 pb-2">
                    <Edit size={16} className="mr-2 text-yellow-500"/> {editingAnnouncement ? '编辑公告' : '发布新公告'}
                </h3>
                
                <div className="space-y-4">
                    <div>
                        <label className="text-xs text-zinc-500 uppercase font-bold block mb-1">发布日期</label>
                        <input 
                            type="date"
                            value={annoForm.date.replace(/\//g, '-')} 
                            onChange={e => setAnnoForm({...annoForm, date: e.target.value})}
                            className="w-full bg-black border border-zinc-700 text-white p-2 rounded text-sm outline-none focus:border-yellow-500"
                        />
                    </div>
                    
                    <div>
                        <label className="text-xs text-zinc-500 uppercase font-bold block mb-1">公告内容</label>
                        <textarea 
                            value={annoForm.content} 
                            onChange={e => setAnnoForm({...annoForm, content: e.target.value})}
                            className="w-full bg-black border border-zinc-700 text-white p-3 rounded text-sm outline-none focus:border-yellow-500 min-h-[100px]"
                            placeholder="请输入公告详情..."
                        />
                    </div>

                    {/* 样式编辑器 */}
                    <div className="bg-zinc-900 p-3 rounded border border-zinc-800">
                        <label className="text-[10px] text-zinc-500 uppercase font-bold block mb-2">样式自定义</label>
                        <div className="flex items-center gap-3">
                            {/* 颜色 */}
                            <div className="flex items-center gap-1" title="字体颜色">
                                <input 
                                    type="color" 
                                    value={annoForm.style.color} 
                                    onChange={e => setAnnoForm({...annoForm, style: {...annoForm.style, color: e.target.value}})}
                                    className="w-6 h-6 bg-transparent border-none cursor-pointer"
                                />
                            </div>
                            
                            {/* 字号 */}
                            <div className="flex items-center gap-1 bg-black border border-zinc-700 rounded px-2 py-1">
                                <Type size={12} className="text-zinc-500"/>
                                <select 
                                    value={annoForm.style.fontSize} 
                                    onChange={e => setAnnoForm({...annoForm, style: {...annoForm.style, fontSize: e.target.value}})}
                                    className="bg-transparent text-white text-xs outline-none w-12"
                                >
                                    <option value="12px">小</option>
                                    <option value="14px">中</option>
                                    <option value="16px">大</option>
                                    <option value="20px">特大</option>
                                </select>
                            </div>

                            {/* 加粗 */}
                            <button 
                                onClick={() => setAnnoForm({...annoForm, style: {...annoForm.style, isBold: !annoForm.style.isBold}})}
                                className={`p-1 rounded border ${annoForm.style.isBold ? 'bg-yellow-500 text-black border-yellow-500' : 'bg-black text-zinc-500 border-zinc-700'}`}
                                title="加粗"
                            >
                                <Bold size={14}/>
                            </button>
                        </div>
                        
                        {/* 预览 */}
                        <div className="mt-3 pt-3 border-t border-zinc-800">
                            <div className="text-[10px] text-zinc-600 mb-1">预览效果：</div>
                            <div style={{ 
                                color: annoForm.style.color, 
                                fontSize: annoForm.style.fontSize, 
                                fontWeight: annoForm.style.isBold ? 'bold' : 'normal' 
                            }}>
                                {annoForm.content || '示例文本 Text Preview'}
                            </div>
                        </div>
                    </div>

                    <div className="flex justify-end gap-2 pt-2">
                        {editingAnnouncement && (
                            <button 
                                onClick={() => {
                                    setEditingAnnouncement(null);
                                    setAnnoForm({ content: '', date: new Date().toLocaleDateString(), style: { color: '#ffffff', fontSize: '14px', isBold: false } });
                                }} 
                                className="text-zinc-500 text-xs hover:text-white px-3"
                            >
                                重置 / 取消
                            </button>
                        )}
                        <button 
                            onClick={() => {
                                if(!annoForm.content) return alert('请输入内容');
                                saveAnnouncement({ ...annoForm, id: editingAnnouncement?.id }); // Save
                                setEditingAnnouncement(null);
                                setAnnoForm({ content: '', date: new Date().toLocaleDateString(), style: { color: '#ffffff', fontSize: '14px', isBold: false } }); // Reset
                                alert('发布成功');
                            }} 
                            className="bg-yellow-500 hover:bg-yellow-400 text-black font-bold px-6 py-2 rounded-sm text-sm flex items-center shadow-lg"
                        >
                            <Send size={14} className="mr-2"/> {editingAnnouncement ? '更新公告' : '立即发布'}
                        </button>
                    </div>
                </div>
             </div>

             {/* 右侧：列表 */}
             <div className="lg:col-span-2 space-y-3">
                <h3 className="text-white font-bold mb-4 flex items-center"><Bell size={16} className="mr-2 text-zinc-400"/> 现存公告 ({announcements.length})</h3>
                {announcements.map(anno => (
                    <div key={anno.id} className="bg-zinc-950 border border-zinc-800 p-4 rounded flex justify-between items-start group hover:border-zinc-600 transition-colors">
                        <div>
                            <div className="text-xs text-zinc-500 font-mono mb-1">{anno.date}</div>
                            <div style={{ 
                                color: anno.style?.color, 
                                fontSize: anno.style?.fontSize, 
                                fontWeight: anno.style?.isBold ? 'bold' : 'normal' 
                            }}>
                                {anno.content}
                            </div>
                        </div>
                        <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button 
                                onClick={() => {
                                    setEditingAnnouncement(anno);
                                    setAnnoForm(anno);
                                }} 
                                className="p-2 bg-zinc-900 border border-zinc-700 rounded text-zinc-400 hover:text-white"
                            >
                                <Edit size={14}/>
                            </button>
                            <button 
                                onClick={() => { if(confirm('删除此条公告？')) deleteAnnouncement(anno.id); }} 
                                className="p-2 bg-zinc-900 border border-zinc-700 rounded text-zinc-400 hover:text-red-500"
                            >
                                <Trash2 size={14}/>
                            </button>
                        </div>
                    </div>
                ))}
             </div>
          </div>
        )}

        {/* --- Tab: 赛程管理 --- */}
        {adminTab === 'matches' && (
          <div className="animate-in slide-in-from-bottom-2">
            <div className="flex flex-col gap-4 mb-4 bg-zinc-950 p-4 border border-zinc-800 rounded">
              {/* 第一行：标题 & 基础操作 */}
              <div className="flex justify-between items-center">
                  <h3 className="text-white font-bold uppercase tracking-wider text-sm flex items-center">
                    <Calendar size={16} className="mr-2 text-cyan-500"/> 比赛列表 ({matches.length})
                  </h3>
                  <div className="flex gap-3">
                      <button onClick={() => setShowImportModal(true)} className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-sm text-sm font-bold flex items-center shadow-lg transition-all"><Download size={16} className="mr-2"/> 导入赛程</button>
                      <button onClick={() => setEditingMatch({})} className="bg-green-600 hover:bg-green-500 text-white px-4 py-2 rounded-sm text-sm font-bold flex items-center shadow-lg transition-all"><Plus size={16} className="mr-2"/> 新建</button>
                  </div>
              </div>

              {/* 第二行：批量操作工具栏 (仅当有选中时显示) */}
              <div className="flex items-center gap-4 pt-4 border-t border-zinc-800">
                  <div className="flex items-center gap-2">
                      <input type="checkbox" onChange={handleSelectAllMatches} checked={matches.length > 0 && selectedMatchIds.length === matches.length} className="w-4 h-4 accent-yellow-500 cursor-pointer"/>
                      <span className="text-xs text-zinc-500">全选</span>
                  </div>

                  {selectedMatchIds.length > 0 && (
                      <div className="flex items-center gap-3 animate-in fade-in slide-in-from-left-2 ml-4 border-l border-zinc-800 pl-4">
                          <span className="text-xs text-zinc-400 font-bold">已选 {selectedMatchIds.length} 项操作:</span>
                          
                          {/* 批量修改阶段组件 */}
                          <div className="flex items-center gap-2">
                              <select 
                                id="batchTournament" 
                                className="bg-black border border-zinc-700 text-white text-xs p-1.5 rounded outline-none w-32"
                                onChange={(e) => {
                                    // 简单的联动逻辑：存一下临时状态，这里为了简化直接读DOM或需要增加state
                                    // 建议增加一个 state: batchTargetTourId
                                    setBatchTargetTourId(e.target.value);
                                }}
                              >
                                  <option value="">选择归属赛事...</option>
                                  {tournaments.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                              </select>
                              
                              <select 
                                id="batchStage" 
                                className="bg-black border border-zinc-700 text-white text-xs p-1.5 rounded outline-none w-32"
                                disabled={!batchTargetTourId}
                              >
                                  <option value="">选择阶段...</option>
                                  {tournaments.find(t=>t.id===batchTargetTourId)?.stages.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                              </select>

                              <button 
                                onClick={() => {
                                    const stageId = document.getElementById('batchStage').value;
                                    if(!batchTargetTourId) return alert('请选择赛事');
                                    // 执行批量更新
                                    batchUpdateMatches(selectedMatchIds, { tournamentId: batchTargetTourId, stageId: stageId });
                                    setSelectedMatchIds([]); // 清空选择
                                    alert('批量修改成功！');
                                }}
                                className="bg-zinc-800 hover:bg-zinc-700 text-white px-3 py-1.5 rounded text-xs border border-zinc-600"
                              >
                                  应用修改
                              </button>
                          </div>

                          <div className="w-px h-4 bg-zinc-800 mx-2"></div>

                          <button onClick={handleBatchDeleteMatches} className="bg-red-600/20 hover:bg-red-600 hover:text-white text-red-500 border border-red-600/50 px-3 py-1.5 rounded text-xs font-bold flex items-center transition-all">
                            <Trash2 size={12} className="mr-1"/> 批量删除
                          </button>
                      </div>
                  )}
              </div>
            </div>

            {/* 列表区域 (保持不变) */}
            <div className="space-y-2">
              {matches.map((m, idx) => (
                <div key={m.id} className={`bg-zinc-950 p-4 border flex justify-between items-center rounded-sm group ${selectedMatchIds.includes(String(m.id)) ? 'border-yellow-500 bg-yellow-500/5' : 'border-zinc-800 hover:border-zinc-600'}`}>
                   {/* ... item content ... */}
                   <div className="flex items-center gap-4">
                       <input type="checkbox" checked={selectedMatchIds.includes(String(m.id))} onChange={() => handleSelectMatch(m.id)} className="w-4 h-4 accent-yellow-500 cursor-pointer"/>
                       <div className="flex flex-col gap-1">
                           <button onClick={() => moveMatch(idx, 'up')} disabled={idx===0} className="text-zinc-600 hover:text-white disabled:opacity-20"><ArrowUp size={14}/></button>
                           <button onClick={() => moveMatch(idx, 'down')} disabled={idx===matches.length-1} className="text-zinc-600 hover:text-white disabled:opacity-20"><ArrowDown size={14}/></button>
                       </div>
                       <span className="text-zinc-600 font-mono text-xs w-6">{idx + 1}</span>
                       <div className="flex flex-col">
                           <span className="text-white font-bold flex items-center gap-3">
                               {m.teamA} <span className="text-zinc-500 text-xs">vs</span> {m.teamB} 
                               <span className={`text-xs font-normal px-2 py-0.5 rounded border ${m.bo > 1 ? 'border-purple-500/30 text-purple-400 bg-purple-500/10' : 'border-zinc-700 text-zinc-500 bg-zinc-800'}`}>BO{m.bo}</span>
                           </span>
                           {/* 显示当前的阶段归属，方便管理员核对 */}
                           <span className="text-[10px] text-zinc-500 font-mono mt-1">
                               {tournaments.find(t=>t.id===m.tournamentId)?.name || '未分配赛事'} 
                               {m.stageId ? ` / ${tournaments.find(t=>t.id===m.tournamentId)?.stages.find(s=>s.id===m.stageId)?.name}` : ''}
                           </span>
                       </div>
                   </div>
                   {/* ... buttons ... */}
                   <div className="flex gap-2 opacity-50 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => setEditingMatch(m)} className="p-2 bg-zinc-800 hover:bg-cyan-600 hover:text-white rounded text-zinc-400"><Edit size={16}/></button>
                      <button onClick={() => deleteMatch(m.id)} className="p-2 bg-zinc-800 hover:bg-red-600 hover:text-white rounded text-zinc-400"><Trash2 size={16}/></button>
                   </div>
                </div>
              ))}
            </div>
            {/* ... modals ... */}
            {editingMatch && <MatchEditModal match={editingMatch} onClose={() => setEditingMatch(null)} onSave={(d) => { updateMatch(d); setEditingMatch(null); }} />}
          </div>
        )}

        {/* --- Tab 3: 战队审批 --- */}
        {/* --- Tab 3: 战队审批 (修改版) --- */}
        {adminTab === 'teams' && (
             <div className="overflow-x-auto animate-in slide-in-from-bottom-2">
               <table className="w-full text-left text-sm text-zinc-300 border-collapse">
                 <thead className="bg-black text-zinc-500 uppercase text-xs tracking-wider">
                    <tr>
                        <th className="p-4 border-b border-zinc-800">Team</th>
                        <th className="p-4 border-b border-zinc-800">Status</th>
                        <th className="p-4 border-b border-zinc-800 text-right">Actions</th>
                    </tr>
                 </thead>
                 <tbody className="divide-y divide-zinc-800">
                   {teams.map(t => (
                     <tr key={t.id} className="hover:bg-zinc-800/30 transition-colors group">
                       <td className="p-4 font-bold text-white cursor-pointer hover:text-cyan-400" onClick={() => setEditingTeam(t)}>{t.name}</td>
                       <td className="p-4"><StatusBadge status={t.status} reason={t.rejectReason}/></td>
                       <td className="p-4 text-right">
                         <div className="flex justify-end items-center gap-2">
                            <button onClick={() => setEditingTeam(t)} className="text-zinc-400 hover:text-cyan-400 p-1" title="编辑"><Edit size={16}/></button>
                            
                            {/* [修复] 审批按钮逻辑修改：
                                1. 只要不是 approved 状态，就显示“通过”按钮。
                                2. 只要不是 rejected 状态，就显示“拒绝”按钮（用于撤回审批）。
                            */}
                            {t.status !== 'approved' && (
                                <button onClick={() => handleStatusChange(t.id, 'approved')} className="text-green-500 hover:text-green-400 p-1" title="通过"><CheckSquare size={16}/></button>
                            )}
                            {t.status !== 'rejected' && (
                                <button onClick={() => setRejectingId(t.id)} className="text-red-500 hover:text-red-400 p-1" title={t.status === 'approved' ? "撤回审批 (改为拒绝)" : "驳回"}><XSquare size={16}/></button>
                            )}
                            
                            <span className="w-px h-4 bg-zinc-700 mx-1"></span>
                            <button onClick={() => handleDeleteTeam(t)} className="text-zinc-600 hover:text-red-600 p-1 transition-colors" title="删除"><Trash2 size={16}/></button>
                         </div>
                       </td>
                     </tr>
                   ))}
                 </tbody>
               </table>
               {editingTeam && <TeamEditModal team={editingTeam} onClose={() => setEditingTeam(null)} onSave={(u) => { adminUpdateTeam(u); setEditingTeam(null); }} />}
               
               {rejectingId && (
                  <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 animate-in zoom-in-95">
                    <div className="bg-zinc-900 p-6 border border-red-600 w-96 shadow-2xl">
                      <h4 className="text-white font-bold mb-4">拒绝 / 撤回理由</h4>
                      <textarea className="w-full bg-black text-white p-3 border border-zinc-700 mb-4" value={rejectReason} onChange={e => setRejectReason(e.target.value)} placeholder="请输入理由..."/>
                      <div className="flex justify-end gap-3">
                          <button onClick={() => setRejectingId(null)} className="text-zinc-400">取消</button>
                          <button onClick={() => handleStatusChange(rejectingId, 'rejected', rejectReason)} className="bg-red-600 text-white px-4 py-2 rounded">确认拒绝</button>
                      </div>
                    </div>
                  </div>
               )}
             </div>
        )}

         {/* --- Tab 4: 选手数据 (布局优化版) --- */}
         {adminTab === 'players' && (
           // [修改1] 给容器设定固定高度 h-[800px] (或 calc(100vh-200px))，确保左右对齐
           <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 h-[800px] animate-in slide-in-from-bottom-2">
              
              {/* [修改2] 左侧栏：flex flex-col h-full，让内容撑开 */}
              <div className="lg:col-span-1 flex flex-col gap-6 h-full overflow-y-auto custom-scrollbar pr-2">
                
                {/* 1. 归属设置 */}
                <div className="bg-zinc-950 p-4 border border-zinc-800 rounded-sm">
                      <h4 className="text-xs text-zinc-500 font-bold uppercase mb-3">数据归属设置 (导入前必选)</h4>
                      <div className="space-y-2">
                          <select value={playerImportContext.tournamentId} onChange={e => setPlayerImportContext({...playerImportContext, tournamentId: e.target.value, stageId: 'all'})} className="w-full bg-black border border-zinc-700 text-white p-2 rounded text-sm">
                              <option value="">-- 请首先选择赛事 --</option>
                              {tournaments.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                          </select>
                          <select value={playerImportContext.stageId} onChange={e => setPlayerImportContext({...playerImportContext, stageId: e.target.value})} className="w-full bg-black border border-zinc-700 text-white p-2 rounded text-sm" disabled={!playerImportContext.tournamentId}>
                              <option value="all">赛事全程 (独立录入)</option>
                              {tournaments.find(t => t.id === playerImportContext.tournamentId)?.stages.map(s => (<option key={s.id} value={s.id}>{s.name}</option>))}
                          </select>
                      </div>
                </div>
                
                {/* 2. 覆盖导入 */}
                <div className="bg-zinc-950 p-6 border border-zinc-800 rounded-sm">
                  <h3 className="text-lg font-bold text-white mb-4 pb-2 border-b border-zinc-800 flex items-center text-green-500"><FileSpreadsheet className="mr-2"/> 覆盖/追加导入</h3>
                  <div className="bg-zinc-900/50 p-8 border-2 border-dashed border-zinc-700 hover:border-green-500 transition-all text-center rounded-sm cursor-pointer group" onClick={() => fileInputRef.current?.click()}>
                    <Upload size={40} className="mx-auto text-zinc-600 group-hover:text-green-500 mb-4 transition-colors" />
                    <p className="text-zinc-300 font-bold mb-1">点击上传 Excel/CSV</p>
                    <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" accept=".csv,.txt,.xls,.xlsx" />
                  </div>
                </div>

                {/* 3. 数据治理 */}
                <div className="bg-zinc-950 p-6 border border-purple-900/30 rounded-sm">
                  <h3 className="text-lg font-bold text-white mb-4 pb-2 border-b border-zinc-800 flex items-center text-purple-500"><Wand2 className="mr-2"/> 数据治理</h3>
                  <button onClick={handleSmartMerge} className="w-full bg-purple-900/20 hover:bg-purple-900/50 text-purple-400 border border-purple-900/50 py-3 rounded text-sm font-bold transition-all flex items-center justify-center"><Wand2 size={16} className="mr-2"/> 智能合并旧数据</button>
                </div>

                {/* 4. 危险区 (使用 mt-auto 让它沉底，如果内容不够长的话) */}
                <div className="mt-auto bg-zinc-950 p-6 border border-red-900/30 rounded-sm">
                    <h3 className="text-lg font-bold text-white mb-4 flex items-center text-red-500"><Trash2 className="mr-2"/> 危险区</h3>
                    <button 
    onClick={() => {
        if(confirm('⚠️ 高危操作：确定清空所有选手数据吗？此操作不可恢复！')) {
            clearAllPlayers();
            alert('已清空所有选手数据。');
        }
    }} 
    className="w-full bg-red-900/20 hover:bg-red-900/50 text-red-500 border border-red-900/50 py-3 rounded text-sm font-bold transition-all"
>
    清空所有选手数据
</button>
                </div>
              </div>

              {/* [修改3] 右侧栏：flex flex-col h-full，让列表撑满剩余空间 */}
              <div className="lg:col-span-2 bg-zinc-950 border border-zinc-800 rounded-sm flex flex-col h-full overflow-hidden">
                <div className="p-4 border-b border-zinc-800 bg-zinc-900 flex justify-between items-center h-16 shrink-0">
                    <div className="flex items-center gap-2">
                        <h3 className="font-bold text-white uppercase text-sm tracking-wider">选手库 ({groupedPlayers.length})</h3>
                        <span className="text-xs text-zinc-500">(按 SteamID 聚合)</span>
                    </div>
                </div>
                
                {/* 列表滚动区 */}
                <div className="flex-1 overflow-y-auto custom-scrollbar p-2">
                   {/* 表头 */}
                   <div className="grid grid-cols-12 gap-2 px-3 py-2 text-[10px] text-zinc-500 font-bold uppercase border-b border-zinc-800/50 mb-1 items-center sticky top-0 bg-zinc-950 z-10">
                      <div className="col-span-3">Player</div>
                      <div className="col-span-3">Latest Team</div>
                      <div className="col-span-2 text-center">Avg Rating</div>
                      <div className="col-span-2 text-center">Records</div>
                      <div className="col-span-2 text-right">Actions</div>
                   </div>
                   
                   {groupedPlayers.length === 0 && <div className="text-center py-10 text-zinc-500">暂无数据</div>}

                   {groupedPlayers.map((p, i) => (
                      <div key={i} className="grid grid-cols-12 gap-2 items-center px-3 py-3 border-b border-zinc-800/30 hover:bg-zinc-900/50 transition-colors group text-sm">
                         <div className="col-span-3 truncate">
                             <div className="font-bold text-white">{p.name}</div>
                             <div className="text-[10px] text-zinc-500 font-mono">{p.steamId?.startsWith('gen_') ? 'No SteamID' : p.steamId}</div>
                         </div>
                         <div className="col-span-3 text-zinc-400 truncate text-xs font-mono bg-zinc-900/50 px-2 py-1 rounded w-fit">
                             {p.team}
                         </div>
                         <div className="col-span-2 text-center font-bold text-yellow-500">
                             {p.avgRating}
                         </div>
                         <div className="col-span-2 text-center">
                             <span className="bg-zinc-800 text-zinc-400 px-2 py-0.5 rounded-full text-xs">{p.recordCount}</span>
                         </div>
                         <div className="col-span-2 flex justify-end gap-2 opacity-60 group-hover:opacity-100 transition-opacity">
                             <button onClick={() => setViewingPlayer(p)} className="bg-cyan-600 hover:bg-cyan-500 text-white px-2 py-1 rounded text-xs font-bold">详细</button>
                             <button onClick={() => handleDeleteGroupedPlayer(p)} className="p-1 bg-zinc-800 hover:bg-red-600 text-zinc-400 hover:text-white rounded"><Trash2 size={14}/></button>
                         </div>
                      </div>
                   ))}
                </div>
              </div>
              
              {viewingPlayer && <PlayerDetailModal playerGroup={viewingPlayer} onClose={() => setViewingPlayer(null)} />}
           </div>
         )}

         {/* --- Tab 5: 留言管理 (完整版：显示 QQ) --- */}
         {adminTab === 'feedback' && (
            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-white font-bold flex items-center">
                        <MessageSquare className="mr-2 text-cyan-500" size={18}/> 用户留言管理 ({feedbacks.length})
                    </h3>
                </div>
                
                {feedbacks.length === 0 && <div className="text-zinc-500 text-center py-10">暂无留言数据</div>}
                
                <div className="grid grid-cols-1 gap-4">
                    {feedbacks.map(fb => (
                        <div key={fb.id} className="bg-zinc-950 p-4 border border-zinc-800 rounded flex justify-between items-start hover:border-zinc-700 transition-colors group">
                            <div>
                                <div className="flex items-center gap-3 mb-1">
                                    <span className="font-bold text-white">{fb.user}</span>
                                    {/* QQ号显示 */}
                                    {fb.qq && (
                                      <span className="bg-cyan-900/30 text-cyan-400 text-xs px-2 py-0.5 rounded border border-cyan-800 font-mono">
                                        QQ: {fb.qq}
                                      </span>
                                    )}
                                    <span className="text-xs text-zinc-500 font-mono">{fb.date}</span>
                                </div>
                                <p className="text-zinc-400 text-sm leading-relaxed">{fb.content}</p>
                            </div>
                            <button 
                                onClick={() => {if(confirm('确定永久删除此条留言?')) deleteFeedback(fb.id)}} 
                                className="text-zinc-600 hover:text-red-500 p-2 opacity-0 group-hover:opacity-100 transition-opacity"
                                title="删除"
                            >
                                <Trash2 size={18}/>
                            </button>
                        </div>
                    ))}
                </div>
            </div>
        )}
        
        {/* --- Tab: 赛事管理 --- */}
        {adminTab === 'tournaments' && (
          <div className="animate-in slide-in-from-bottom-2">
             <div className="flex justify-between mb-6 items-center">
                <h3 className="text-white font-bold uppercase tracking-wider text-sm flex items-center">
                  <Flag size={16} className="mr-2 text-orange-500"/> 赛事结构管理 ({tournaments.length})
                </h3>
                <button onClick={() => setEditingTournament({})} className="bg-orange-600 hover:bg-orange-500 text-white px-4 py-2 rounded-sm text-sm font-bold flex items-center shadow-lg transition-all">
                  <Plus size={16} className="mr-2"/> 新建赛事
                </button>
             </div>
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {tournaments.map(t => (
                    <div key={t.id} className="bg-zinc-950 border border-zinc-800 p-6 rounded hover:border-orange-500/50 transition-colors relative group">
                        <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity flex gap-2">
                            <button onClick={() => setEditingTournament(t)} className="p-1.5 bg-zinc-800 rounded text-zinc-400 hover:text-white"><Edit size={14}/></button>
                            <button onClick={() => {if(confirm('删除赛事将影响关联的比赛和数据，确定删除？')) deleteTournament(t.id)}} className="p-1.5 bg-zinc-800 rounded text-zinc-400 hover:text-red-500"><Trash2 size={14}/></button>
                        </div>
                        <div className="text-xs text-zinc-500 font-mono mb-1">{t.dateRange}</div>
                        <h3 className="text-xl font-black text-white mb-4">{t.name}</h3>
                        <div className="flex flex-wrap gap-2">
                            {t.stages.map(s => <span key={s.id} className="text-xs bg-zinc-900 border border-zinc-700 px-2 py-1 rounded text-zinc-300">{s.name}</span>)}
                        </div>
                    </div>
                ))}
             </div>
             {editingTournament && <TournamentEditModal tournament={editingTournament} onClose={() => setEditingTournament(null)} onSave={(d) => { saveTournament(d); setEditingTournament(null); }} />}
          </div>
        )}
        
        {/* --- Tab6: 历届锦标赛 --- */}
        {adminTab === 'history' && (
      <div className="animate-in slide-in-from-bottom-2">
         <div className="flex justify-between mb-6 items-center">
            <h3 className="text-white font-bold uppercase tracking-wider text-sm flex items-center">
              <History size={16} className="mr-2 text-purple-500"/> 历届 Major 记录 ({historyTournaments.length})
            </h3>
            <button onClick={() => setEditingHistory({})} className="bg-purple-600 hover:bg-purple-500 text-white px-4 py-2 rounded-sm text-sm font-bold flex items-center shadow-lg transition-all">
              <Plus size={16} className="mr-2"/> 添加锦标赛
            </button>
         </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {historyTournaments.map((h, idx) => (
                  <div key={h.id} className="bg-zinc-950 border border-zinc-800 p-6 rounded relative group hover:border-purple-500/50 transition-colors flex flex-col">
                     {/* 右上角操作按钮 */}
                     <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity flex gap-2">
                        <button onClick={() => setEditingHistory(h)} className="p-1.5 bg-zinc-800 rounded text-zinc-400 hover:text-white"><Edit size={14}/></button>
                        <button onClick={() => {if(confirm('确定删除?')) deleteHistoryTournament(h.id)}} className="p-1.5 bg-zinc-800 rounded text-zinc-400 hover:text-red-500"><Trash2 size={14}/></button>
                     </div>
                     
                     <div className="flex-1">
                        <div className="text-xs text-zinc-500 font-mono mb-2">{h.year}</div>
                        <h3 className="text-xl font-black text-white mb-4">{h.name}</h3>
                        
                        <div className="space-y-2 text-sm">
                            <div className="flex justify-between border-b border-white/5 pb-1">
                            <span className="text-yellow-500 font-bold flex items-center"><Trophy size={12} className="mr-1"/> 冠军</span>
                            <span className="text-white font-bold">{h.champion.team}</span>
                            </div>
                            {/* ... 其他信息保持不变 ... */}
                        </div>
                     </div>

                     {/* 【新增】底部排序栏 */}
                     <div className="mt-4 pt-3 border-t border-white/5 flex justify-between items-center opacity-50 group-hover:opacity-100 transition-opacity">
                        <span className="text-[10px] text-zinc-600 font-mono">Order: {idx + 1}</span>
                        <div className="flex gap-1">
                            <button 
                                onClick={() => moveHistory(idx, 'left')} 
                                disabled={idx === 0}
                                className="p-1 bg-zinc-900 border border-zinc-700 rounded hover:bg-zinc-800 text-zinc-400 disabled:opacity-20 disabled:cursor-not-allowed"
                                title="向前移"
                            >
                                <ArrowLeft size={14}/>
                            </button>
                            <button 
                                onClick={() => moveHistory(idx, 'right')} 
                                disabled={idx === historyTournaments.length - 1}
                                className="p-1 bg-zinc-900 border border-zinc-700 rounded hover:bg-zinc-800 text-zinc-400 disabled:opacity-20 disabled:cursor-not-allowed"
                                title="向后移"
                            >
                                <ArrowRight size={14}/>
                            </button>
                        </div>
                     </div>
                  </div>
                ))}
        </div>

         {editingHistory && (
           <HistoryEditModal 
             tournament={editingHistory} 
             onClose={() => setEditingHistory(null)} 
             onSave={(d) => { saveHistoryTournament(d); setEditingHistory(null); }} 
           />
         )}
      </div>
    )}

      </div>

      {/* --- 导入弹窗 (完整版) --- */}
      {showImportModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 animate-in zoom-in-95">
            <div className="bg-zinc-900 border border-blue-600 w-full max-w-lg p-6 rounded shadow-2xl">
                <h3 className="text-xl font-bold text-white mb-4 flex items-center">
                    <Download className="mr-2 text-blue-500"/> 导入完美对战平台赛程
                </h3>
                <div className="space-y-4">
                    <div>
                        <label className="block text-xs text-zinc-500 mb-1">列表页 URL (含 page 参数)</label>
                        <input 
                            value={importForm.url}
                            onChange={e => setImportForm({...importForm, url: e.target.value})}
                            className="w-full bg-black border border-zinc-700 p-2 text-white text-sm rounded"
                            placeholder="https://match.wmpvp.com/csgo/list?..."
                        />
                    </div>
                    <div>
                        <label className="block text-xs text-zinc-500 mb-1">Cookie: acw_tc</label>
                        <input 
                            value={importForm.acw_tc}
                            onChange={e => setImportForm({...importForm, acw_tc: e.target.value})}
                            className="w-full bg-black border border-zinc-700 p-2 text-white text-sm rounded font-mono"
                            placeholder="例如: 0a47329c..."
                        />
                    </div>
                    <div>
                        <label className="block text-xs text-zinc-500 mb-1">Cookie: NEWPVPMATCHID</label>
                        <input 
                            value={importForm.match_id}
                            onChange={e => setImportForm({...importForm, match_id: e.target.value})}
                            className="w-full bg-black border border-zinc-700 p-2 text-white text-sm rounded font-mono"
                            placeholder="例如: cd520772..."
                        />
                    </div>
                    <div className="bg-blue-900/20 p-3 rounded border border-blue-500/30 text-xs text-blue-200">
                        <strong>说明：</strong> 系统会自动识别 BO1/BO3 并合并数据。如果 BO3 跨页显示，系统会提示“数据不完整”，请手动补录剩余地图。
                    </div>
                </div>
                <div className="flex justify-end gap-3 mt-6">
                    <button onClick={() => setShowImportModal(false)} className="px-4 py-2 text-zinc-400 hover:text-white">取消</button>
                    <button 
                        onClick={handleWMPVPImport} 
                        disabled={isImporting}
                        className="px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded flex items-center disabled:opacity-50"
                    >
                        {isImporting ? '正在抓取...' : '开始导入'}
                    </button>
                </div>
            </div>
        </div>
      )}

    </div>
  );
}