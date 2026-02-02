import React, { useState, useEffect } from 'react';
import { Edit, X, Tv, Map as MapIcon, Save, Trash2 } from 'lucide-react';
import { useLeague } from '../../context/LeagueContext'; // 保持引入

// 🗺️ CS2 地图池配置 (新增)
const CS2_MAPS = [
    { id: 'Mirage', name: 'Mirage (荒漠迷城)' },
    { id: 'Inferno', name: 'Inferno (炼狱小镇)' },
    { id: 'Dust2', name: 'Dust II (炙热沙城)' },
    { id: 'Nuke', name: 'Nuke (核子危机)' },
    { id: 'Ancient', name: 'Ancient (远古遗迹)' },
    { id: 'Anubis', name: 'Anubis (阿努比斯)' },
    { id: 'Train', name: 'Train (列车停放站)' },
    { id: 'Overpass', name: 'Overpass (死亡游乐园)' },
    { id: 'Vertigo', name: 'Vertigo (殒命大厦)' },
    { id: 'Office', name: 'Office (办公室)' }
];

export default function MatchEditModal({ match, onClose, onSave, onDelete }) {
  const { tournaments } = useLeague(); // 获取赛事列表
  
  // 初始化数据
  const [data, setData] = useState(match.id ? match : { 
    teamA: '', teamB: '', scoreA: 0, scoreB: 0, 
    status: 'Upcoming', bo: 3, currentMap: '', 
    streamUrl: '', 
    tournamentId: '', 
    stageId: '',      
    maps: [] 
  });

  // 当选择赛事变化时，如果当前选的阶段不属于该赛事，重置阶段 (保留原逻辑)
  useEffect(() => {
    if (data.tournamentId) {
        const t = tournaments.find(t => t.id === data.tournamentId);
        if (t && !t.stages.find(s => s.id === data.stageId)) {
            setData(prev => ({ ...prev, stageId: '' }));
        }
    }
  }, [data.tournamentId, tournaments]);

  // 获取当前选中赛事的阶段列表
  const currentStages = tournaments.find(t => t.id === data.tournamentId)?.stages || [];

  const updateMap = (idx, field, val) => {
    const newMaps = [...data.maps];
    newMaps[idx] = { ...newMaps[idx], [field]: val };
    setData({ ...data, maps: newMaps });
  };

  const addMap = () => setData({ ...data, maps: [...data.maps, { name: '', score: '', winner: 'Pending' }] });
  const removeMap = (idx) => setData({ ...data, maps: data.maps.filter((_, i) => i !== idx) });

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[60] flex items-center justify-center p-4 animate-in fade-in">
      <div className="bg-zinc-900 border border-zinc-700 w-full max-w-2xl rounded-2xl flex flex-col max-h-[90vh] shadow-2xl overflow-hidden">
        
        {/* 顶部标题栏 */}
        <div className="p-5 border-b border-zinc-800 flex justify-between items-center bg-zinc-950/50">
          <h3 className="text-lg md:text-xl font-black text-white flex items-center gap-2">
            <div className="bg-yellow-500/10 p-2 rounded-lg text-yellow-500"><Edit size={20}/></div>
            {match.id ? '编辑比赛 (Edit Match)' : '添加新比赛 (New Match)'}
          </h3>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-zinc-800 text-zinc-500 hover:text-white transition-colors"><X size={20}/></button>
        </div>

        <div className="p-6 overflow-y-auto custom-scrollbar space-y-6">
          
          {/* 1. 赛事归属选择 (保留) */}
          <div className="grid grid-cols-2 gap-4 bg-zinc-950/50 p-4 border border-zinc-800/60 rounded-xl">
             <div>
               <label className="text-xs text-zinc-500 uppercase font-bold block mb-1.5 ml-1">归属赛事 (Tournament)</label>
               <select value={data.tournamentId || ''} onChange={e => setData({...data, tournamentId: e.target.value})} className="w-full bg-black border border-zinc-700 text-white p-2.5 rounded-lg text-sm focus:border-yellow-500 outline-none transition-colors">
                 <option value="">-- 未分配 --</option>
                 {tournaments.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
               </select>
             </div>
             <div>
               <label className="text-xs text-zinc-500 uppercase font-bold block mb-1.5 ml-1">所属阶段 (Stage)</label>
               <select value={data.stageId || ''} onChange={e => setData({...data, stageId: e.target.value})} className="w-full bg-black border border-zinc-700 text-white p-2.5 rounded-lg text-sm focus:border-yellow-500 outline-none transition-colors" disabled={!data.tournamentId}>
                 <option value="">-- 默认/通用 --</option>
                 {currentStages.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
               </select>
             </div>
          </div>

          {/* 2. 核心比分区域 */}
          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-xs text-zinc-500 uppercase font-bold ml-1">Team A</label>
              <input value={data.teamA} onChange={e => setData({...data, teamA: e.target.value})} className="w-full bg-black border border-zinc-700 text-white p-3 rounded-lg font-bold focus:border-yellow-500 outline-none" placeholder="战队名称" />
              <input type="number" value={data.scoreA} onChange={e => setData({...data, scoreA: parseInt(e.target.value) || 0})} className="w-full bg-zinc-950 border border-zinc-800 text-white p-3 rounded-lg font-mono font-black text-2xl text-center focus:border-yellow-500 outline-none" />
            </div>
            <div className="space-y-2">
              <label className="text-xs text-zinc-500 uppercase font-bold ml-1">Team B</label>
              <input value={data.teamB} onChange={e => setData({...data, teamB: e.target.value})} className="w-full bg-black border border-zinc-700 text-white p-3 rounded-lg font-bold focus:border-yellow-500 outline-none" placeholder="战队名称" />
              <input type="number" value={data.scoreB} onChange={e => setData({...data, scoreB: parseInt(e.target.value) || 0})} className="w-full bg-zinc-950 border border-zinc-800 text-white p-3 rounded-lg font-mono font-black text-2xl text-center focus:border-yellow-500 outline-none" />
            </div>
          </div>

          {/* 3. 状态与地图设置 */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
             <div>
               <label className="text-xs text-zinc-500 uppercase font-bold block mb-1.5 ml-1">Status</label>
               <select value={data.status} onChange={e => setData({...data, status: e.target.value})} className="w-full bg-zinc-900 border border-zinc-700 text-white p-2.5 rounded-lg text-sm focus:border-yellow-500 outline-none">
                 <option value="Upcoming">Upcoming (未开始)</option>
                 <option value="Live">Live (进行中)</option>
                 <option value="Finished">Finished (已结束)</option>
               </select>
             </div>
             <div>
               <label className="text-xs text-zinc-500 uppercase font-bold block mb-1.5 ml-1">Format</label>
               <select value={data.bo} onChange={e => setData({...data, bo: parseInt(e.target.value)})} className="w-full bg-zinc-900 border border-zinc-700 text-white p-2.5 rounded-lg text-sm focus:border-yellow-500 outline-none">
                 <option value="1">Best of 1</option>
                 <option value="3">Best of 3</option>
                 <option value="5">Best of 5</option>
               </select>
             </div>
             
             {/* 🔥 重点升级：地图选择器 (替换原有的 Map Input) */}
             <div>
               <label className="text-xs text-yellow-600 uppercase font-bold block mb-1.5 ml-1 flex items-center gap-1">
                  <MapIcon size={12}/> Live Background Map
               </label>
               <select 
                  value={data.currentMap || ''} 
                  onChange={e => setData({...data, currentMap: e.target.value})} 
                  className="w-full bg-zinc-950 border border-yellow-500/30 text-yellow-500 p-2.5 rounded-lg text-sm font-bold focus:border-yellow-500 outline-none shadow-[0_0_10px_rgba(234,179,8,0.1)]"
               >
                 <option value="">-- Auto / Default --</option>
                 {CS2_MAPS.map(m => (
                    <option key={m.id} value={m.id}>{m.name}</option>
                 ))}
               </select>
             </div>
          </div>

          {/* 4. 直播流设置 (仅 Live 显示) */}
          {data.status === 'Live' && (
            <div className="bg-zinc-950 p-4 border border-purple-500/30 rounded-xl animate-in fade-in">
                <label className="text-xs text-purple-400 uppercase font-bold flex items-center mb-2 gap-2">
                    <Tv size={14}/> Stream URL (直播间链接)
                </label>
                <input value={data.streamUrl || ''} onChange={e => setData({...data, streamUrl: e.target.value})} className="w-full bg-black border border-zinc-700 text-white p-2.5 rounded-lg text-sm focus:border-purple-500 outline-none placeholder-zinc-700" placeholder="https://live.bilibili.com/..." />
            </div>
          )}

          {/* 5. 地图详情 (Maps Detail) - 保留原逻辑 */}
          <div className="pt-2">
            <div className="flex justify-between items-center mb-3">
              <span className="text-sm font-bold text-white flex items-center gap-2"><MapIcon size={14} className="text-zinc-500"/> Map Details (小分)</span>
              <button onClick={addMap} className="text-xs bg-zinc-800 border border-zinc-700 hover:bg-zinc-700 hover:text-white text-zinc-400 px-3 py-1.5 rounded-md transition-colors">+ Add Map</button>
            </div>
            <div className="space-y-2">
                {data.maps.map((m, i) => (
                  <div key={i} className="flex gap-2">
                    <input placeholder="Map Name" value={m.name} onChange={e => updateMap(i, 'name', e.target.value)} className="flex-1 bg-black border border-zinc-700 text-white p-2 text-sm rounded-md focus:border-zinc-500 outline-none"/>
                    <input placeholder="Score" value={m.score} onChange={e => updateMap(i, 'score', e.target.value)} className="w-24 bg-black border border-zinc-700 text-white p-2 text-sm rounded-md text-center focus:border-zinc-500 outline-none"/>
                    <input placeholder="Winner" value={m.winner} onChange={e => updateMap(i, 'winner', e.target.value)} className="w-32 bg-black border border-zinc-700 text-white p-2 text-sm rounded-md text-center focus:border-zinc-500 outline-none"/>
                    <button onClick={() => removeMap(i)} className="text-zinc-600 hover:text-red-500 transition-colors px-1"><Trash2 size={16}/></button>
                  </div>
                ))}
                {data.maps.length === 0 && <div className="text-center text-zinc-700 text-xs py-2 border border-dashed border-zinc-800 rounded">暂无小分数据</div>}
            </div>
          </div>

        </div>

        {/* 底部按钮栏 */}
        <div className="p-5 border-t border-zinc-800 flex justify-between items-center bg-zinc-950/50">
          <div>
              {match.id && onDelete && (
                  <button type="button" onClick={() => { if(confirm('确认删除此比赛记录？')) onDelete(match.id); }} className="text-red-600 hover:text-red-500 text-xs font-bold flex items-center gap-1 transition-colors">
                      <Trash2 size={14}/> 删除比赛
                  </button>
              )}
          </div>
          <div className="flex gap-3">
            <button onClick={onClose} className="px-5 py-2.5 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors text-sm font-bold">取消</button>
            <button onClick={() => onSave(data)} className="px-6 py-2.5 bg-yellow-500 hover:bg-yellow-400 text-black font-black uppercase tracking-wide rounded-xl shadow-lg hover:shadow-yellow-500/20 transition-all text-sm flex items-center gap-2">
                <Save size={16}/> 保存更改
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}