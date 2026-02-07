import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Shield, Plus, RefreshCw, Trash2, Edit2, Search, Save, X, CheckSquare, Square, Users } from 'lucide-react';
import TeamMembersModal from './TeamMembersModal'; // [新增] 引入弹窗组件

export default function TeamManager() {
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [filter, setFilter] = useState('');

  // 批量操作状态
  const [selectedIds, setSelectedIds] = useState([]);

  // 编辑/新增状态 (编辑战队基本信息)
  const [editingTeam, setEditingTeam] = useState(null);
  const [formData, setFormData] = useState({ name: '', description: '', logo: '' });

  // [新增] 成员管理状态
  const [memberManagingTeam, setMemberManagingTeam] = useState(null); // 存储当前正在管理成员的战队名

  useEffect(() => {
    fetchTeams();
  }, []);

  const fetchTeams = async () => {
    setLoading(true);
    try {
      const res = await axios.get('/api/teams/list');
      if (res.data.success) {
        setTeams(res.data.teams);
        setSelectedIds([]); 
      }
    } catch (err) {
      alert('加载战队列表失败');
    } finally {
      setLoading(false);
    }
  };

  const handleSync = async () => {
    setSyncing(true);
    try {
      const res = await axios.post('/api/admin/teams/sync');
      if (res.data.success) {
        alert(res.data.message); 
        fetchTeams();
      }
    } catch (err) {
      alert('同步失败');
    } finally {
      setSyncing(false);
    }
  };

  const handleBatchDelete = async () => {
    if (selectedIds.length === 0) return;
    if (!window.confirm(`⚠️ 危险操作：确定要删除选中的 ${selectedIds.length} 支战队吗？`)) return;

    try {
      const res = await axios.post('/api/admin/teams/batch-delete', { ids: selectedIds });
      if (res.data.success) {
        alert(`成功删除了 ${selectedIds.length} 支战队`);
        fetchTeams(); 
      }
    } catch (err) {
      alert('批量删除失败');
    }
  };

  const handleSelectAll = () => {
    if (selectedIds.length === filteredTeams.length) {
      setSelectedIds([]); 
    } else {
      setSelectedIds(filteredTeams.map(t => t.id)); 
    }
  };

  const handleSelectOne = (id) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter(sid => sid !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('确定要删除该战队吗？')) return;
    try {
      await axios.delete(`/api/admin/teams/${id}`);
      fetchTeams();
    } catch (err) {
      alert('删除失败');
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      if (editingTeam.id) {
        await axios.put(`/api/admin/teams/${editingTeam.id}`, formData);
      } else {
        await axios.post('/api/admin/teams', formData);
      }
      setEditingTeam(null);
      fetchTeams();
    } catch (err) {
      alert('保存失败，可能是战队名重复');
    }
  };

const openEdit = (team = { id: null, name: '', description: '', logo: '', creditsTextToImage: 3, creditsImageTo3D: 1 }) => {
    setEditingTeam(team);
    setFormData({ 
        name: team.name, 
        description: team.description || '', 
        logo: team.logo || '',
        creditsTextToImage: team.creditsTextToImage ?? 3, // 默认值
        creditsImageTo3D: team.creditsImageTo3D ?? 1      // 默认值
    });
  };

  const filteredTeams = teams.filter(t => t.name.toLowerCase().includes(filter.toLowerCase()));

  return (
    <div className="space-y-6 animate-in fade-in">
      <div className="flex justify-between items-center bg-zinc-950 p-4 rounded border border-zinc-800">
        <div>
          <h2 className="text-2xl font-black text-white flex items-center">
            <Shield className="mr-2 text-cyan-500" /> 战队管理 (Team DB)
          </h2>
          <p className="text-zinc-500 text-sm mt-1">
            当前共有 <span className="text-white font-bold">{teams.length}</span> 支入库战队。
          </p>
        </div>
        
        <div className="flex gap-3">
           {selectedIds.length > 0 && (
             <button 
               onClick={handleBatchDelete}
               className="flex items-center px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded transition-colors shadow-lg animate-in fade-in slide-in-from-right-2"
             >
               <Trash2 size={16} className="mr-2" /> 批量删除 ({selectedIds.length})
             </button>
           )}

          <button 
            onClick={handleSync}
            disabled={syncing}
            className="flex items-center px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-cyan-400 rounded transition-colors border border-cyan-900/30"
          >
            <RefreshCw size={16} className={`mr-2 ${syncing ? 'animate-spin' : ''}`} />
            {syncing ? '同步中...' : '同步过审战队'}
          </button>
          
          <button 
            onClick={() => openEdit()}
            className="flex items-center px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded transition-colors shadow-lg shadow-cyan-900/20"
          >
            <Plus size={16} className="mr-2" /> 新建
          </button>
        </div>
      </div>

      {/* 编辑/新增 模态框 */}
      {editingTeam && (
        <div className="bg-zinc-900 border border-zinc-700 p-6 rounded-xl mb-6 shadow-xl animate-in zoom-in-95">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-bold text-white">{editingTeam.id ? '编辑战队' : '新建战队'}</h3>
            <button onClick={() => setEditingTeam(null)} className="text-zinc-500 hover:text-white"><X size={20} /></button>
          </div>
          <form onSubmit={handleSave} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-zinc-500 uppercase font-bold mb-1">战队名称 (唯一)</label>
                <input 
                  value={formData.name} 
                  onChange={e => setFormData({...formData, name: e.target.value})}
                  className="w-full bg-black border border-zinc-700 p-2 rounded text-white outline-none focus:border-cyan-500"
                  required
                />
              </div>
              <div>
                <label className="block text-xs text-zinc-500 uppercase font-bold mb-1">Logo URL (可选)</label>
                <input 
                  value={formData.logo} 
                  onChange={e => setFormData({...formData, logo: e.target.value})}
                  className="w-full bg-black border border-zinc-700 p-2 rounded text-white outline-none focus:border-cyan-500"
                  placeholder="https://..."
                />
              </div>
              {/* 💰 吉祥物工坊额度控制 (仅管理员可见) */}
            <div className="bg-purple-900/10 p-4 rounded border border-purple-500/30 mt-4">
                <label className="text-xs text-purple-400 uppercase font-bold mb-3 flex items-center">
                    <span className="bg-purple-500 w-2 h-2 rounded-full mr-2"></span>
                    吉祥物生成额度 (Credits)
                </label>
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="text-xs text-zinc-500 block mb-1">设计次数 (2D Gen)</label>
                        <input 
                            type="number" 
                            min="0"
                            value={formData.creditsTextToImage} 
                            onChange={e => setFormData({...formData, creditsTextToImage: parseInt(e.target.value)})}
                            className="w-full bg-black border border-zinc-700 p-2 rounded text-white outline-none focus:border-purple-500"
                        />
                    </div>
                    <div>
                        <label className="text-xs text-zinc-500 block mb-1">建模次数 (3D Gen)</label>
                        <input 
                            type="number" 
                            min="0"
                            value={formData.creditsImageTo3D} 
                            onChange={e => setFormData({...formData, creditsImageTo3D: parseInt(e.target.value)})}
                            className="w-full bg-black border border-zinc-700 p-2 rounded text-white outline-none focus:border-purple-500"
                        />
                    </div>
                </div>
                <p className="text-[10px] text-zinc-500 mt-2">* 增加次数允许战队重新生成设计图或模型。</p>
            </div>
            </div>
            <div>
              <label className="block text-xs text-zinc-500 uppercase font-bold mb-1">简介 / 备注</label>
              <textarea 
                value={formData.description} 
                onChange={e => setFormData({...formData, description: e.target.value})}
                className="w-full bg-black border border-zinc-700 p-2 rounded text-white outline-none focus:border-cyan-500 h-20"
              />
            </div>
            <div className="flex justify-end gap-3">
              <button type="button" onClick={() => setEditingTeam(null)} className="px-4 py-2 text-zinc-400 hover:text-white">取消</button>
              <button type="submit" className="px-6 py-2 bg-cyan-600 hover:bg-cyan-500 text-white font-bold rounded flex items-center">
                <Save size={16} className="mr-2" /> 保存
              </button>
            </div>
          </form>
        </div>
      )}

      {/* 搜索栏 */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={18} />
        <input 
          type="text" 
          placeholder="搜索战队..." 
          value={filter}
          onChange={e => setFilter(e.target.value)}
          className="w-full bg-zinc-900 border border-zinc-800 py-3 pl-10 pr-4 rounded text-white outline-none focus:border-zinc-600"
        />
      </div>

      {/* 战队列表 */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-lg overflow-hidden">
        <div className="grid grid-cols-12 gap-4 p-4 border-b border-zinc-800 bg-zinc-950/50 text-xs font-bold text-zinc-500 uppercase items-center">
          <div className="col-span-1 flex justify-center">
             <button onClick={handleSelectAll} className="hover:text-white">
                {selectedIds.length > 0 && selectedIds.length === filteredTeams.length ? <CheckSquare size={16}/> : <Square size={16}/>}
             </button>
          </div>
          <div className="col-span-1">ID</div>
          <div className="col-span-4">战队信息</div>
          <div className="col-span-4">简介 / 来源</div>
          <div className="col-span-2 text-right">操作</div>
        </div>
        
        {loading ? (
          <div className="p-8 text-center text-zinc-500">加载中...</div>
        ) : filteredTeams.length === 0 ? (
          <div className="p-8 text-center text-zinc-500">
            暂无数据。
          </div>
        ) : (
          <div className="divide-y divide-zinc-800">
            {filteredTeams.map(team => (
              <div key={team.id} className={`grid grid-cols-12 gap-4 p-4 items-center transition-colors ${selectedIds.includes(team.id) ? 'bg-cyan-900/10' : 'hover:bg-zinc-800/50'}`}>
                
                {/* 复选框 */}
                <div className="col-span-1 flex justify-center">
                   <button onClick={() => handleSelectOne(team.id)} className={`transition-colors ${selectedIds.includes(team.id) ? 'text-cyan-500' : 'text-zinc-600 hover:text-white'}`}>
                      {selectedIds.includes(team.id) ? <CheckSquare size={16}/> : <Square size={16}/>}
                   </button>
                </div>

                <div className="col-span-1 text-zinc-600 font-mono text-xs">#{team.id}</div>
                
                <div className="col-span-4 flex items-center gap-3">
                  <div className="w-8 h-8 rounded bg-zinc-800 flex items-center justify-center overflow-hidden border border-zinc-700 shrink-0">
                    {team.logo ? <img src={team.logo} alt={team.name} className="w-full h-full object-cover" /> : <Shield size={16} className="text-zinc-600"/>}
                  </div>
                  <span className="font-bold text-white text-lg truncate">{team.name}</span>
                </div>
                
                <div className="col-span-4 text-zinc-400 text-sm truncate">{team.description || '-'}</div>
                
                <div className="col-span-2 flex justify-end gap-2">
                  {/* [新增] 成员管理按钮 */}
                  <button 
                    onClick={() => setMemberManagingTeam(team.name)} 
                    className="p-2 text-zinc-400 hover:text-cyan-400 bg-zinc-800 hover:bg-zinc-700 rounded transition-colors" 
                    title="成员管理/审核"
                  >
                    <Users size={14} />
                  </button>

                  <button onClick={() => openEdit(team)} className="p-2 text-zinc-400 hover:text-white bg-zinc-800 hover:bg-zinc-700 rounded transition-colors"><Edit2 size={14} /></button>
                  <button onClick={() => handleDelete(team.id)} className="p-2 text-red-500 hover:text-white bg-red-900/10 hover:bg-red-600 rounded transition-colors"><Trash2 size={14} /></button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* [新增] 成员管理弹窗 */}
      <TeamMembersModal 
        isOpen={!!memberManagingTeam}
        teamName={memberManagingTeam}
        onClose={() => setMemberManagingTeam(null)}
      />

    </div>
  );
}