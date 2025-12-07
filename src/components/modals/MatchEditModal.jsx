import React, { useState, useEffect } from 'react';
import { Edit, X, Tv } from 'lucide-react';
import { useLeague } from '../../context/LeagueContext'; // 引入 Context 获取赛事列表

export default function MatchEditModal({ match, onClose, onSave }) {
  const { tournaments } = useLeague(); // 获取赛事列表
  
  const [data, setData] = useState(match.id ? match : { 
    teamA: '', teamB: '', scoreA: 0, scoreB: 0, 
    status: 'Upcoming', bo: 3, currentMap: '', 
    streamUrl: '', 
    tournamentId: '', // 新增
    stageId: '',      // 新增
    maps: [] 
  });

  // 当选择赛事变化时，如果当前选的阶段不属于该赛事，重置阶段
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
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
      <div className="bg-zinc-900 border border-zinc-700 w-full max-w-2xl rounded-lg flex flex-col max-h-[90vh]">
        <div className="p-6 border-b border-zinc-800 flex justify-between items-center">
          <h3 className="text-xl font-black text-white flex items-center"><Edit className="mr-2 text-yellow-500" size={20}/> {match.id ? '编辑比赛' : '添加新比赛'}</h3>
          <button onClick={onClose} className="text-zinc-500 hover:text-white"><X size={24}/></button>
        </div>
        <div className="p-6 overflow-y-auto custom-scrollbar space-y-6">
          
          {/* 【新增】赛事归属选择 */}
          <div className="grid grid-cols-2 gap-4 bg-zinc-950 p-4 border border-zinc-800 rounded">
             <div>
               <label className="text-xs text-zinc-500 uppercase font-bold block mb-1">归属赛事</label>
               <select value={data.tournamentId || ''} onChange={e => setData({...data, tournamentId: e.target.value})} className="w-full bg-black border border-zinc-700 text-white p-2 rounded text-sm">
                 <option value="">-- 未分配 --</option>
                 {tournaments.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
               </select>
             </div>
             <div>
               <label className="text-xs text-zinc-500 uppercase font-bold block mb-1">所属阶段</label>
               <select value={data.stageId || ''} onChange={e => setData({...data, stageId: e.target.value})} className="w-full bg-black border border-zinc-700 text-white p-2 rounded text-sm" disabled={!data.tournamentId}>
                 <option value="">-- 默认/通用 --</option>
                 {currentStages.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
               </select>
             </div>
          </div>

          {/* 原有比分输入区域 (保持不变) */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-xs text-zinc-500 uppercase">Team A</label>
              <input value={data.teamA} onChange={e => setData({...data, teamA: e.target.value})} className="w-full bg-black border border-zinc-700 text-white p-2 rounded" />
              <input type="number" value={data.scoreA} onChange={e => setData({...data, scoreA: parseInt(e.target.value)})} className="w-full bg-black border border-zinc-700 text-white p-2 rounded font-mono font-bold text-lg" />
            </div>
            <div className="space-y-2">
              <label className="text-xs text-zinc-500 uppercase">Team B</label>
              <input value={data.teamB} onChange={e => setData({...data, teamB: e.target.value})} className="w-full bg-black border border-zinc-700 text-white p-2 rounded" />
              <input type="number" value={data.scoreB} onChange={e => setData({...data, scoreB: parseInt(e.target.value)})} className="w-full bg-black border border-zinc-700 text-white p-2 rounded font-mono font-bold text-lg" />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4">
             <div>
               <label className="text-xs text-zinc-500 uppercase">Status</label>
               <select value={data.status} onChange={e => setData({...data, status: e.target.value})} className="w-full bg-black border border-zinc-700 text-white p-2 rounded">
                 <option value="Upcoming">Upcoming</option>
                 <option value="Live">Live</option>
                 <option value="Finished">Finished</option>
               </select>
             </div>
             <div>
               <label className="text-xs text-zinc-500 uppercase">Format</label>
               <select value={data.bo} onChange={e => setData({...data, bo: parseInt(e.target.value)})} className="w-full bg-black border border-zinc-700 text-white p-2 rounded">
                 <option value="1">BO1</option>
                 <option value="3">BO3</option>
                 <option value="5">BO5</option>
               </select>
             </div>
             <div>
               <label className="text-xs text-zinc-500 uppercase">Map</label>
               <input value={data.currentMap} onChange={e => setData({...data, currentMap: e.target.value})} className="w-full bg-black border border-zinc-700 text-white p-2 rounded" />
             </div>
          </div>
          {data.status === 'Live' && (
            <div className="bg-zinc-950 p-3 border border-purple-500/30 rounded">
                <label className="text-xs text-purple-400 uppercase font-bold flex items-center mb-2"><Tv size={14} className="mr-1"/> Stream URL</label>
                <input value={data.streamUrl || ''} onChange={e => setData({...data, streamUrl: e.target.value})} className="w-full bg-black border border-zinc-700 text-white p-2 rounded text-sm focus:border-purple-500 outline-none" />
            </div>
          )}
          <div>
            <div className="flex justify-between items-center mb-2 border-b border-zinc-800 pb-1">
              <span className="text-sm font-bold text-white">Maps Detail</span>
              <button onClick={addMap} className="text-xs bg-zinc-800 px-2 py-1 rounded hover:bg-zinc-700 text-white">+ Add Map</button>
            </div>
            {data.maps.map((m, i) => (
              <div key={i} className="flex gap-2 mb-2">
                <input placeholder="Map Name" value={m.name} onChange={e => updateMap(i, 'name', e.target.value)} className="flex-1 bg-black border border-zinc-700 text-white p-1 text-sm rounded"/>
                <input placeholder="Score" value={m.score} onChange={e => updateMap(i, 'score', e.target.value)} className="w-24 bg-black border border-zinc-700 text-white p-1 text-sm rounded"/>
                <input placeholder="Winner" value={m.winner} onChange={e => updateMap(i, 'winner', e.target.value)} className="w-32 bg-black border border-zinc-700 text-white p-1 text-sm rounded"/>
                <button onClick={() => removeMap(i)} className="text-red-500"><X size={16}/></button>
              </div>
            ))}
          </div>
        </div>
        <div className="p-6 border-t border-zinc-800 flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 text-zinc-400">取消</button>
          <button onClick={() => onSave(data)} className="px-6 py-2 bg-yellow-500 text-black font-bold rounded">保存</button>
        </div>
      </div>
    </div>
  );
}