import React, { useState } from 'react';
import { Edit, X, Plus, Trash2, Calendar } from 'lucide-react';

export default function TournamentEditModal({ tournament, onClose, onSave }) {
  const [data, setData] = useState(tournament?.id ? tournament : {
    name: '',
    dateRange: '',
    stages: [] 
  });

  const addStage = () => {
    setData({
      ...data,
      stages: [...data.stages, { id: `s_${Date.now()}`, name: '' }]
    });
  };

  const updateStage = (idx, val) => {
    const newStages = [...data.stages];
    newStages[idx].name = val;
    setData({ ...data, stages: newStages });
  };

  const removeStage = (idx) => {
    const newStages = data.stages.filter((_, i) => i !== idx);
    setData({ ...data, stages: newStages });
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[70] flex items-center justify-center p-4 animate-in fade-in">
      <div className="bg-zinc-900 border border-zinc-700 w-full max-w-lg rounded-lg flex flex-col max-h-[90vh]">
        <div className="p-6 border-b border-zinc-800 flex justify-between items-center">
          <h3 className="text-xl font-black text-white flex items-center">
            <Edit className="mr-2 text-yellow-500" size={20}/> {tournament?.id ? '编辑赛事' : '新建赛事'}
          </h3>
          <button onClick={onClose} className="text-zinc-500 hover:text-white"><X size={24}/></button>
        </div>
        
        <div className="p-6 overflow-y-auto custom-scrollbar space-y-6">
          <div className="space-y-2">
            <label className="text-xs text-zinc-500 uppercase font-bold">赛事名称</label>
            <input value={data.name} onChange={e => setData({...data, name: e.target.value})} className="w-full bg-black border border-zinc-700 text-white p-3 rounded focus:border-yellow-500 outline-none" placeholder="例如: 2025 TGU 年度总决赛" />
          </div>
          
          <div className="space-y-2">
            <label className="text-xs text-zinc-500 uppercase font-bold">举办时间</label>
            <div className="relative">
                <input value={data.dateRange} onChange={e => setData({...data, dateRange: e.target.value})} className="w-full bg-black border border-zinc-700 text-white p-3 pl-10 rounded focus:border-yellow-500 outline-none" placeholder="2025/12/25 - 2025/12/31" />
                <Calendar className="absolute left-3 top-3.5 text-zinc-500" size={16}/>
            </div>
          </div>
          
          

            <div className="space-y-2">
              <label className="text-xs text-zinc-500 uppercase font-bold">报名开关状态</label>
              <select 
                value={data.registrationStatus || 'NOT_STARTED'} 
                onChange={e => setData({...data, registrationStatus: e.target.value})}
                className="w-full bg-black border border-zinc-700 text-white p-3 rounded focus:border-yellow-500 outline-none appearance-none"
              >
                <option value="NOT_STARTED">🔴 未开始报名 (Not Started)</option>
                <option value="OPEN">🟢 正在报名 (Open)</option>
                <option value="CLOSED">⚫ 报名已截止 (Closed)</option>
              </select>
            </div>

          <div className="bg-zinc-950 p-4 border border-zinc-800 rounded">
             <div className="flex justify-between items-center mb-3">
                <label className="text-xs text-zinc-500 uppercase font-bold">赛事阶段 (Stages)</label>
                <button onClick={addStage} className="text-xs bg-zinc-800 hover:bg-zinc-700 text-white px-2 py-1 rounded flex items-center"><Plus size={12} className="mr-1"/> 添加阶段</button>
             </div>
             <div className="space-y-2">
                {data.stages.length === 0 && <div className="text-xs text-zinc-600 text-center py-2">暂无阶段 (如小组赛、淘汰赛)</div>}
                {data.stages.map((s, i) => (
                    <div key={i} className="flex gap-2">
                        <input value={s.name} onChange={e => updateStage(i, e.target.value)} className="flex-1 bg-black border border-zinc-700 text-white p-2 rounded text-sm" placeholder={`阶段 ${i+1} 名称`} />
                        <button onClick={() => removeStage(i)} className="text-zinc-500 hover:text-red-500 p-2"><Trash2 size={16}/></button>
                    </div>
                ))}
             </div>
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