import React, { useState } from 'react';
import { Edit, X, User, Hash, School, BookOpen, Save, Phone } from 'lucide-react';

export default function TeamEditModal({ team, onClose, onSave }) {
  // 初始化数据，确保新字段有默认值
  const [formData, setFormData] = useState({
    ...team,
    digitalId: team.digitalId || '',
    members: team.members.map(m => ({
        id: m.id || '',
        steamId: m.steamId || '',
        class: m.class || '',
        studentId: m.studentId || '',
        score: m.score || '',
        role: m.role || 'Rifler'
    }))
  });
  
  const handleBasicChange = (f, v) => setFormData({ ...formData, [f]: v });
  
  const handleMemberChange = (i, f, v) => {
    const nm = [...formData.members]; 
    nm[i] = { ...nm[i], [f]: v };
    setFormData({ ...formData, members: nm });
  };

  // 自动计算均分
  const avg = () => (formData.members.reduce((a, c) => a + (Number(c.score)||0), 0) / formData.members.length).toFixed(0);

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[60] flex items-center justify-center p-4 animate-in fade-in">
      {/* [修改] 加宽弹窗 max-w-5xl 以容纳更多列 */}
      <div className="bg-zinc-900 border border-zinc-700 w-full max-w-5xl rounded-lg flex flex-col max-h-[90vh]">
        
        {/* 头部 */}
        <div className="p-6 border-b border-zinc-800 flex justify-between items-center bg-zinc-950">
          <h3 className="text-xl font-black text-white flex items-center">
            <Edit className="mr-2 text-cyan-500" size={20}/> 编辑战队档案
          </h3>
          <button onClick={onClose} className="text-zinc-500 hover:text-white"><X size={24}/></button>
        </div>

        {/* 内容滚动区 */}
        <div className="p-6 overflow-y-auto custom-scrollbar space-y-8">
          
          {/* 1. 战队基本信息 */}
          <div className="bg-black/40 p-4 rounded border border-zinc-800">
              <h4 className="text-xs text-zinc-500 font-bold uppercase mb-3 flex items-center gap-2">
                  <span className="w-1 h-4 bg-cyan-500 rounded-full"></span> 基本信息
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="space-y-1">
                    <label className="text-[10px] text-zinc-500 uppercase font-bold">战队名称</label>
                    <input value={formData.name} onChange={e => handleBasicChange('name', e.target.value)} className="w-full bg-zinc-900 border border-zinc-700 text-white p-2 rounded focus:border-cyan-500 outline-none" placeholder="战队名" />
                </div>
                <div className="space-y-1">
                    <label className="text-[10px] text-zinc-500 uppercase font-bold">完美数字ID</label>
                    <div className="relative">
                        <input value={formData.digitalId} onChange={e => handleBasicChange('digitalId', e.target.value)} className="w-full bg-zinc-900 border border-zinc-700 text-white p-2 pl-8 rounded focus:border-cyan-500 outline-none font-mono" placeholder="Digital ID" />
                        <Hash size={14} className="absolute left-2.5 top-2.5 text-zinc-600"/>
                    </div>
                </div>
                <div className="space-y-1">
                    <label className="text-[10px] text-zinc-500 uppercase font-bold">Tag</label>
                    <input value={formData.tag} onChange={e => handleBasicChange('tag', e.target.value)} className="w-full bg-zinc-900 border border-zinc-700 text-white p-2 rounded focus:border-cyan-500 outline-none" placeholder="TAG" />
                </div>
                <div className="space-y-1">
                    <label className="text-[10px] text-zinc-500 uppercase font-bold">联系方式</label>
                    <div className="relative">
                        <input value={formData.contact} onChange={e => handleBasicChange('contact', e.target.value)} className="w-full bg-zinc-900 border border-zinc-700 text-white p-2 pl-8 rounded focus:border-cyan-500 outline-none font-mono" placeholder="QQ/WeChat" />
                        <Phone size={14} className="absolute left-2.5 top-2.5 text-zinc-600"/>
                    </div>
                </div>
              </div>
          </div>

          {/* 2. 成员详细信息 */}
          <div>
            <div className="flex justify-between items-center mb-3 px-1">
                <h4 className="text-xs text-zinc-500 font-bold uppercase flex items-center gap-2">
                    <span className="w-1 h-4 bg-yellow-500 rounded-full"></span> 成员列表 (详细)
                </h4>
                <div className="text-xs bg-zinc-800 px-2 py-1 rounded border border-zinc-700 text-zinc-300">
                    Team Avg: <span className="text-yellow-500 font-mono font-bold">{avg()}</span>
                </div>
            </div>

            <div className="space-y-2">
                {formData.members.map((m, i) => (
                  <div key={i} className="grid grid-cols-12 gap-2 items-center bg-zinc-950 p-2 border border-zinc-800 rounded hover:border-zinc-600 transition-colors">
                     
                     {/* 序号与身份 */}
                     <div className="col-span-12 md:col-span-1 flex items-center justify-between md:justify-center">
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border w-full text-center ${i < 5 ? 'bg-green-900/20 text-green-500 border-green-900/50' : 'bg-zinc-800 text-zinc-500 border-zinc-700'}`}>
                            {i < 5 ? 'MAIN' : 'SUB'}
                        </span>
                     </div>

                     {/* 游戏ID */}
                     <div className="col-span-6 md:col-span-2">
                        <div className="flex items-center bg-black border border-zinc-700 rounded px-2">
                            <User size={12} className="text-zinc-600 mr-1.5 flex-shrink-0"/>
                            <input value={m.id} onChange={e => handleMemberChange(i, 'id', e.target.value)} className="w-full bg-transparent py-1.5 text-white text-xs outline-none placeholder-zinc-700" placeholder="Game ID" />
                        </div>
                     </div>

                     {/* Steam ID */}
                     <div className="col-span-6 md:col-span-2">
                        <input value={m.steamId} onChange={e => handleMemberChange(i, 'steamId', e.target.value)} className="w-full bg-black border border-zinc-700 rounded py-1.5 px-2 text-zinc-300 text-xs outline-none font-mono placeholder-zinc-700 focus:text-white" placeholder="SteamID64..." />
                     </div>

                     {/* 班级 */}
                     <div className="col-span-4 md:col-span-2">
                        <div className="flex items-center bg-black border border-zinc-700 rounded px-2">
                            <School size={12} className="text-zinc-600 mr-1.5 flex-shrink-0"/>
                            <input value={m.class} onChange={e => handleMemberChange(i, 'class', e.target.value)} className="w-full bg-transparent py-1.5 text-zinc-300 text-xs outline-none placeholder-zinc-700 focus:text-white" placeholder="班级" />
                        </div>
                     </div>

                     {/* 学号 */}
                     <div className="col-span-4 md:col-span-2">
                        <div className="flex items-center bg-black border border-zinc-700 rounded px-2">
                            <BookOpen size={12} className="text-zinc-600 mr-1.5 flex-shrink-0"/>
                            <input value={m.studentId} onChange={e => handleMemberChange(i, 'studentId', e.target.value)} className="w-full bg-transparent py-1.5 text-zinc-300 text-xs outline-none font-mono placeholder-zinc-700 focus:text-white" placeholder="学号" />
                        </div>
                     </div>

                     {/* Elo */}
                     <div className="col-span-2 md:col-span-1">
                        <input type="number" value={m.score} onChange={e => handleMemberChange(i, 'score', e.target.value)} className="w-full bg-black border border-zinc-700 rounded py-1.5 px-2 text-yellow-500 text-xs font-bold font-mono outline-none text-center" placeholder="Elo" />
                     </div>

                     {/* Role */}
                     <div className="col-span-2 md:col-span-2">
                        <select value={m.role} onChange={e => handleMemberChange(i, 'role', e.target.value)} className="w-full bg-black border border-zinc-700 rounded py-1.5 px-2 text-zinc-400 text-xs outline-none cursor-pointer hover:text-white">
                            <option>Rifler</option><option>AWP</option><option>IGL</option><option>Entry</option><option>Support</option><option>Substitute</option>
                        </select>
                     </div>

                  </div>
                ))}
            </div>
          </div>

        </div>

        {/* 底部按钮 */}
        <div className="p-6 border-t border-zinc-800 flex justify-end gap-3 bg-zinc-950 rounded-b-lg">
          <button onClick={onClose} className="px-4 py-2 text-zinc-400 hover:text-white transition-colors text-sm font-bold">取消</button>
          <button onClick={() => onSave({ ...formData, avgElo: avg() })} className="px-6 py-2 bg-cyan-600 hover:bg-cyan-500 text-white font-bold rounded text-sm flex items-center shadow-lg shadow-cyan-900/20 transition-all">
            <Save size={16} className="mr-2"/> 保存更改
          </button>
        </div>
      </div>
    </div>
  );
}