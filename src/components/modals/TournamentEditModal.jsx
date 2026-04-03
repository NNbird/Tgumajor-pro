import React, { useState, useRef } from 'react';
import { Edit, X, Plus, Trash2, Calendar, FileText, Upload, Check, Loader2, FileUp } from 'lucide-react';

export default function TournamentEditModal({ tournament, onClose, onSave }) {
  const [data, setData] = useState(tournament?.id ? tournament : {
    name: '',
    dateRange: '',
    stages: [],
    rulebook: null 
  });
  const [isUploading, setIsUploading] = useState(false);
  const [editingRulebook, setEditingRulebook] = useState(false);
  const fileInputRef = useRef(null);

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setIsUploading(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch('/api/upload-rulebook', {
        method: 'POST',
        body: formData,
      });
      const result = await res.json();
      if (result.success) {
        setData({ ...data, rulebook: result.content });
        setEditingRulebook(true); 
      } else {
        alert('文件上传失败: ' + (result.error || '未知错误'));
      }
    } catch (err) {
      console.error(err);
      alert('连接服务器失败');
    } finally {
      setIsUploading(false);
      e.target.value = ''; 
    }
  };

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

          <div className="bg-zinc-950 p-4 border border-zinc-800 rounded space-y-4">
            <div className="flex justify-between items-center">
              <label className="text-xs text-zinc-500 uppercase font-bold">赛事规则书 (Rulebook)</label>
              {!data.rulebook ? (
                <button 
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading}
                  className="text-xs bg-yellow-500/10 hover:bg-yellow-500/20 text-yellow-500 px-3 py-1.5 rounded flex items-center border border-yellow-500/30 transition-colors"
                >
                  {isUploading ? <Loader2 size={14} className="mr-1 animate-spin"/> : <Upload size={14} className="mr-1"/>}
                  上传规则书 (PDF/Text)
                </button>
              ) : (
                <div className="flex gap-2">
                   <button onClick={() => setEditingRulebook(true)} className="text-xs bg-zinc-800 hover:bg-zinc-700 text-white px-2 py-1 rounded flex items-center"><Edit size={12} className="mr-1"/> 修改内容</button>
                   <button onClick={() => setData({...data, rulebook: null})} className="text-xs bg-red-900/20 hover:bg-red-900/40 text-red-500 px-2 py-1 rounded flex items-center border border-red-500/20"><Trash2 size={12} className="mr-1"/> 删除</button>
                </div>
              )}
            </div>
            
            <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" accept=".pdf,.txt" />

            {data.rulebook && !editingRulebook && (
               <div className="bg-black/50 p-3 rounded border border-zinc-800 max-h-32 overflow-hidden relative group">
                  <div className="text-xs text-zinc-400 whitespace-pre-wrap line-clamp-4">{data.rulebook}</div>
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent flex items-end justify-center pb-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <span className="text-[10px] text-zinc-500 font-bold uppercase">已上传并提取内容</span>
                  </div>
               </div>
            )}

            {editingRulebook && (
              <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-[80] flex items-center justify-center p-4">
                <div className="bg-zinc-900 border border-zinc-700 w-full max-w-4xl rounded-lg flex flex-col h-[80vh]">
                  <div className="p-4 border-b border-zinc-800 flex justify-between items-center">
                    <h4 className="text-white font-bold flex items-center"><FileText className="mr-2 text-yellow-500" size={18}/> 编辑规则书内容</h4>
                    <button onClick={() => setEditingRulebook(false)} className="text-zinc-500 hover:text-white"><X size={20}/></button>
                  </div>
                  <div className="flex-1 p-4 overflow-hidden flex flex-col gap-4">
                    <div className="text-xs text-zinc-500">
                      提示：规则书内容将以纯文本或 Markdown 形式展示。您可以根据需要进行格式化调整。
                    </div>
                    <textarea 
                      value={data.rulebook || ''} 
                      onChange={e => setData({...data, rulebook: e.target.value})}
                      className="flex-1 bg-black border border-zinc-700 text-zinc-300 p-4 rounded focus:border-yellow-500 outline-none font-mono text-sm resize-none custom-scrollbar"
                      placeholder="在这里输入或修改规则书内容..."
                    />
                  </div>
                  <div className="p-4 border-t border-zinc-800 flex justify-end">
                    <button onClick={() => setEditingRulebook(false)} className="px-6 py-2 bg-yellow-500 text-black font-bold rounded flex items-center hover:bg-yellow-400 transition-colors">
                      <Check size={18} className="mr-2"/> 完成编辑
                    </button>
                  </div>
                </div>
              </div>
            )}
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