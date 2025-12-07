import React, { useState } from 'react';
import { Edit, X, Trophy, Users, Medal } from 'lucide-react';

export default function HistoryEditModal({ tournament, onClose, onSave }) {
  // 【修复】判断 tournament 是否有 id。
  // 如果是新建（传入的是 {}），tournament.id 为 undefined (假)，就会使用后面的默认值。
  // 如果是编辑（传入的是完整对象），tournament.id 存在，就会使用传入的数据。
  const [data, setData] = useState(tournament?.id ? tournament : {
    name: '',
    year: new Date().getFullYear().toString(),
    champion: { team: '', players: ['', '', '', '', ''] },
    finalist: '',
    semis: ['', ''],
    quarters: ['', '', '', '']
  });

  const updateChampionPlayer = (idx, val) => {
    const newPlayers = [...data.champion.players];
    newPlayers[idx] = val;
    setData({ ...data, champion: { ...data.champion, players: newPlayers } });
  };

  const updateArrayItem = (field, idx, val) => {
    const newArr = [...data[field]];
    newArr[idx] = val;
    setData({ ...data, [field]: newArr });
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[70] flex items-center justify-center p-4 animate-in fade-in">
      <div className="bg-zinc-900 border border-zinc-700 w-full max-w-3xl rounded-lg flex flex-col max-h-[90vh]">
        <div className="p-6 border-b border-zinc-800 flex justify-between items-center">
          <h3 className="text-xl font-black text-white flex items-center">
            <Edit className="mr-2 text-purple-500" size={20}/> {tournament?.id ? '编辑锦标赛' : '添加锦标赛'}
          </h3>
          <button onClick={onClose} className="text-zinc-500 hover:text-white"><X size={24}/></button>
        </div>
        
        <div className="p-6 overflow-y-auto custom-scrollbar space-y-8">
          
          {/* 基础信息 */}
          <div className="grid grid-cols-3 gap-4">
            <div className="col-span-2">
                <label className="text-xs text-zinc-500 uppercase font-bold mb-1 block">锦标赛名称</label>
                <input value={data.name} onChange={e => setData({...data, name: e.target.value})} className="w-full bg-black border border-zinc-700 text-white p-2 rounded" placeholder="例如: 2025 Shanghai Major" />
            </div>
            <div>
                <label className="text-xs text-zinc-500 uppercase font-bold mb-1 block">年份</label>
                <input value={data.year} onChange={e => setData({...data, year: e.target.value})} className="w-full bg-black border border-zinc-700 text-white p-2 rounded" placeholder="2025" />
            </div>
          </div>

          {/* 冠军部分 (重点) */}
          <div className="bg-yellow-500/10 border border-yellow-500/30 p-4 rounded">
             <h4 className="text-yellow-500 font-black uppercase mb-3 flex items-center"><Trophy size={16} className="mr-2"/> 冠军 (Champion)</h4>
             <div className="mb-4">
                <label className="text-xs text-zinc-500 uppercase font-bold mb-1 block">冠军战队名</label>
                <input value={data.champion?.team || ''} onChange={e => setData({...data, champion: {...data.champion, team: e.target.value}})} className="w-full bg-black border border-zinc-700 text-white p-2 rounded font-bold text-yellow-500" placeholder="Team Name" />
             </div>
             <div>
                <label className="text-xs text-zinc-500 uppercase font-bold mb-1 block">5名冠军选手ID</label>
                <div className="grid grid-cols-5 gap-2">
                    {data.champion?.players?.map((p, i) => (
                        <input key={i} value={p} onChange={e => updateChampionPlayer(i, e.target.value)} className="bg-black border border-zinc-700 text-white p-2 rounded text-sm text-center" placeholder={`Player ${i+1}`} />
                    ))}
                </div>
             </div>
          </div>

          {/* 亚军 & 四强 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
             <div className="bg-zinc-950 p-4 border border-zinc-800 rounded">
                <h4 className="text-zinc-300 font-bold uppercase mb-3 flex items-center"><Medal size={16} className="mr-2 text-zinc-400"/> 亚军 (Finalist)</h4>
                <input value={data.finalist} onChange={e => setData({...data, finalist: e.target.value})} className="w-full bg-black border border-zinc-700 text-white p-2 rounded" placeholder="Runner-up Team" />
             </div>
             
             <div className="bg-zinc-950 p-4 border border-zinc-800 rounded">
                <h4 className="text-zinc-300 font-bold uppercase mb-3 flex items-center"><Users size={16} className="mr-2 text-zinc-400"/> 四强 (Semi-Finalists)</h4>
                <div className="space-y-2">
                    {data.semis.map((t, i) => (
                        <input key={i} value={t} onChange={e => updateArrayItem('semis', i, e.target.value)} className="w-full bg-black border border-zinc-700 text-white p-2 rounded text-sm" placeholder={`Semi-Finalist ${i+1}`} />
                    ))}
                </div>
             </div>
          </div>

          {/* 八强 */}
          <div className="bg-zinc-950 p-4 border border-zinc-800 rounded">
             <h4 className="text-zinc-400 font-bold uppercase mb-3 text-sm">八强 (Quarter-Finalists)</h4>
             <div className="grid grid-cols-2 gap-4">
                {data.quarters.map((t, i) => (
                    <input key={i} value={t} onChange={e => updateArrayItem('quarters', i, e.target.value)} className="w-full bg-black border border-zinc-700 text-white p-2 rounded text-sm" placeholder={`QF Team ${i+1}`} />
                ))}
             </div>
          </div>

        </div>
        <div className="p-6 border-t border-zinc-800 flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 text-zinc-400">取消</button>
          <button onClick={() => onSave(data)} className="px-6 py-2 bg-purple-600 text-white font-bold rounded hover:bg-purple-500">保存记录</button>
        </div>
      </div>
    </div>
  );
}