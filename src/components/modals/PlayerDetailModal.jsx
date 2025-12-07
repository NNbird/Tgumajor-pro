import React, { useState } from 'react';
import { X, Save, Trash2, Plus, Edit, Trophy, Calendar } from 'lucide-react';
import { useLeague } from '../../context/LeagueContext';

export default function PlayerDetailModal({ playerGroup, onClose }) {
  const { savePlayerStat, deletePlayer, tournaments } = useLeague();
  
  // playerGroup 是聚合后的对象，包含 { steamId, name, records: [...] }
  const [records, setRecords] = useState(playerGroup.records);
  const [editingRecord, setEditingRecord] = useState(null); // 当前正在编辑/新建的记录

  // 表单状态
  const [form, setForm] = useState({});

  // 开启编辑/新建
  const handleEdit = (record = null) => {
    if (record) {
        setEditingRecord(record);
        setForm(record);
    } else {
        // 新建记录，预填基本信息
        setEditingRecord({ isNew: true });
        setForm({
            id: '',
            name: playerGroup.name,
            steamId: playerGroup.steamId, // 锁定 SteamID
            team: playerGroup.team,       // 默认填最新队伍
            tournamentId: '',
            stageId: '',
            rating: '', adr: '', kd: '', maps: '',
            hs: '', fk: ''
        });
    }
  };

  // 保存提交
  const handleSubmit = (e) => {
    e.preventDefault();
    // 调用 Context 保存
    savePlayerStat(form);
    
    // 更新本地视图 (为了即时反馈，虽然 Context 更新也会触发重绘，但这样更稳)
    if (form.id) {
        setRecords(prev => prev.map(r => r.id === form.id ? form : r));
    } else {
        // 实际上 Context 会生成 ID，这里刷新整个列表最好，或者简单关闭编辑模式
        // 为了简单，我们依赖 Context 的更新流，这里只关闭编辑窗
    }
    setEditingRecord(null);
  };

  // 删除单条记录
  const handleDelete = (id) => {
    if(confirm('确定删除这条赛事记录吗？')) {
        deletePlayer(id);
        setRecords(prev => prev.filter(r => r.id !== id));
        // 如果删光了，可能需要关闭弹窗，这里暂保留空状态
    }
  };

  // 获取赛事/阶段名称的辅助函数
  const getTourInfo = (tid, sid) => {
    const t = tournaments.find(x => x.id === tid);
    const s = t?.stages.find(x => x.id === sid);
    return `${t?.name || '未知赛事'} - ${s?.name || (sid==='all'?'全程':'未知阶段')}`;
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[70] flex items-center justify-center p-4 animate-in fade-in">
      <div className="bg-zinc-900 border border-zinc-700 w-full max-w-4xl rounded-lg flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="p-6 border-b border-zinc-800 flex justify-between items-center bg-zinc-950 rounded-t-lg">
          <div>
              <h3 className="text-2xl font-black text-white flex items-center">
                {playerGroup.name} <span className="ml-3 text-sm font-mono text-zinc-500 font-normal bg-zinc-900 px-2 py-1 rounded border border-zinc-800">{playerGroup.steamId}</span>
              </h3>
              <p className="text-zinc-400 text-xs mt-1">选手详细履历管理</p>
          </div>
          <button onClick={onClose} className="text-zinc-500 hover:text-white"><X size={24}/></button>
        </div>

        <div className="flex-1 overflow-hidden flex flex-col md:flex-row">
            
            {/* 左侧：记录列表 */}
            <div className={`flex-1 overflow-y-auto custom-scrollbar p-6 space-y-3 ${editingRecord ? 'hidden md:block md:w-1/2 border-r border-zinc-800' : 'w-full'}`}>
                <div className="flex justify-between items-center mb-4">
                    <h4 className="text-sm font-bold text-white uppercase tracking-wider">参赛记录 ({records.length})</h4>
                    <button onClick={() => handleEdit(null)} className="text-xs bg-green-600 hover:bg-green-500 text-white px-3 py-1.5 rounded flex items-center font-bold">
                        <Plus size={12} className="mr-1"/> 添加记录
                    </button>
                </div>

                {records.length === 0 && <div className="text-zinc-500 text-center py-10">暂无记录</div>}

                {records.map(record => (
                    <div key={record.id} className="bg-zinc-950 border border-zinc-800 p-4 rounded hover:border-yellow-500/50 transition-colors group relative">
                        <div className="flex justify-between items-start mb-2">
                            <div className="flex items-center gap-2">
                                <Trophy size={14} className="text-yellow-600"/>
                                <span className="text-xs font-bold text-zinc-300 truncate max-w-[180px]" title={getTourInfo(record.tournamentId, record.stageId)}>
                                    {getTourInfo(record.tournamentId, record.stageId)}
                                </span>
                            </div>
                            <span className="text-[10px] text-zinc-600 font-mono bg-zinc-900 px-1.5 py-0.5 rounded">{record.team}</span>
                        </div>
                        
                        <div className="grid grid-cols-4 gap-2 text-center text-xs border-t border-zinc-800/50 pt-2">
                            <div><div className="text-zinc-500 scale-75 origin-center">RATING</div><div className="font-bold text-yellow-500">{record.rating}</div></div>
                            <div><div className="text-zinc-500 scale-75 origin-center">ADR</div><div className="font-mono text-zinc-300">{record.adr}</div></div>
                            <div><div className="text-zinc-500 scale-75 origin-center">K/D</div><div className="font-mono text-zinc-300">{record.kd}</div></div>
                            <div><div className="text-zinc-500 scale-75 origin-center">MAPS</div><div className="font-mono text-zinc-300">{record.maps}</div></div>
                        </div>

                        {/* 操作浮层 */}
                        <div className="absolute inset-0 bg-black/80 flex items-center justify-center gap-3 opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-[1px] rounded">
                            <button onClick={() => handleEdit(record)} className="p-2 bg-zinc-800 rounded-full text-cyan-400 hover:bg-cyan-900/50 border border-zinc-700"><Edit size={16}/></button>
                            <button onClick={() => handleDelete(record.id)} className="p-2 bg-zinc-800 rounded-full text-red-500 hover:bg-red-900/50 border border-zinc-700"><Trash2 size={16}/></button>
                        </div>
                    </div>
                ))}
            </div>

            {/* 右侧：编辑表单 */}
            {editingRecord && (
                <div className="flex-1 bg-zinc-900 p-6 overflow-y-auto custom-scrollbar animate-in slide-in-from-right-4">
                    <h4 className="text-sm font-bold text-white uppercase tracking-wider mb-6 flex items-center justify-between">
                        <span>{form.id ? '编辑记录' : '新增记录'}</span>
                        <button onClick={() => setEditingRecord(null)} className="text-zinc-500 hover:text-white md:hidden"><X size={18}/></button>
                    </h4>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-[10px] text-zinc-500 uppercase font-bold mb-1">所属战队</label>
                                <input required value={form.team} onChange={e => setForm({...form, team: e.target.value})} className="w-full bg-black border border-zinc-700 text-white p-2 rounded text-sm" />
                            </div>
                            <div>
                                <label className="block text-[10px] text-zinc-500 uppercase font-bold mb-1">参赛场次</label>
                                <input type="number" value={form.maps} onChange={e => setForm({...form, maps: e.target.value})} className="w-full bg-black border border-zinc-700 text-white p-2 rounded text-sm" />
                            </div>
                        </div>

                        {/* 赛事选择 */}
                        <div className="space-y-2 bg-zinc-950 p-3 rounded border border-zinc-800">
                            <div>
                                <label className="block text-[10px] text-zinc-500 uppercase font-bold mb-1">归属赛事</label>
                                <select required value={form.tournamentId} onChange={e => setForm({...form, tournamentId: e.target.value, stageId: ''})} className="w-full bg-black border border-zinc-700 text-white p-2 rounded text-sm">
                                    <option value="">-- 选择赛事 --</option>
                                    {tournaments.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-[10px] text-zinc-500 uppercase font-bold mb-1">赛事阶段</label>
                                <select required value={form.stageId} onChange={e => setForm({...form, stageId: e.target.value})} className="w-full bg-black border border-zinc-700 text-white p-2 rounded text-sm" disabled={!form.tournamentId}>
                                    <option value="">-- 选择阶段 --</option>
                                    <option value="all">赛事全程 (All Stages)</option>
                                    {tournaments.find(t => t.id === form.tournamentId)?.stages.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                </select>
                            </div>
                        </div>

                        {/* 数据录入 */}
                        <div className="grid grid-cols-2 gap-4">
                            <div><label className="block text-[10px] text-zinc-500 uppercase font-bold mb-1 text-yellow-500">Rating</label><input type="number" step="0.01" value={form.rating} onChange={e => setForm({...form, rating: e.target.value})} className="w-full bg-black border border-yellow-500/30 text-yellow-500 font-bold p-2 rounded text-sm" /></div>
                            <div><label className="block text-[10px] text-zinc-500 uppercase font-bold mb-1">ADR</label><input type="number" step="0.1" value={form.adr} onChange={e => setForm({...form, adr: e.target.value})} className="w-full bg-black border border-zinc-700 text-white p-2 rounded text-sm" /></div>
                            <div><label className="block text-[10px] text-zinc-500 uppercase font-bold mb-1">K/D Ratio</label><input type="number" step="0.01" value={form.kd} onChange={e => setForm({...form, kd: e.target.value})} className="w-full bg-black border border-zinc-700 text-white p-2 rounded text-sm" /></div>
                            <div><label className="block text-[10px] text-zinc-500 uppercase font-bold mb-1">Headshot %</label><input value={form.hs} onChange={e => setForm({...form, hs: e.target.value})} className="w-full bg-black border border-zinc-700 text-white p-2 rounded text-sm" placeholder="50%" /></div>
                        </div>

                        <div className="pt-4 flex justify-end gap-3">
                            <button type="button" onClick={() => setEditingRecord(null)} className="px-4 py-2 text-zinc-500 hover:text-white text-xs">取消</button>
                            <button type="submit" className="px-6 py-2 bg-green-600 hover:bg-green-500 text-white font-bold rounded text-xs flex items-center shadow-lg">
                                <Save size={14} className="mr-2"/> 保存记录
                            </button>
                        </div>
                    </form>
                </div>
            )}
        </div>
      </div>
    </div>
  );
}