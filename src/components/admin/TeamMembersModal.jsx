// src/components/admin/TeamMembersModal.jsx
import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { X, Shield, Check, Ban, User, Crown, Loader2, Trash2 } from 'lucide-react';
import { useLeague } from '../../context/LeagueContext'; // 引入 Context 获取当前管理员ID

export default function TeamMembersModal({ isOpen, onClose, teamName }) {
  const { user } = useLeague(); // 获取当前登录的管理员信息
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [processingId, setProcessingId] = useState(null); // 正在操作的条目ID

  // 获取成员列表
  const fetchMembers = async () => {
    if (!teamName) return;
    setLoading(true);
    try {
      const res = await axios.get('/api/team/members', { params: { teamName } });
      if (res.data.success) {
        setMembers(res.data.members);
      }
    } catch (err) {
      console.error(err);
      alert('获取成员列表失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && teamName) {
      fetchMembers();
    }
  }, [isOpen, teamName]);

  // 审批或移除成员
  const handleAction = async (memberId, action) => {
    // action: 'APPROVED' | 'REJECTED'
    if (!user?.id) return alert('无法获取管理员信息');
    
    // 如果是踢出已通过的成员，也使用 REJECTED 逻辑（后端是直接删除）
    const isKick = action === 'REJECTED' && members.find(m => m.id === memberId)?.status === 'APPROVED';
    const confirmText = isKick ? '确定要将该成员踢出战队吗？' : (action === 'APPROVED' ? '确定通过该申请吗？' : '确定拒绝该申请吗？');
    
    if (!window.confirm(confirmText)) return;

    setProcessingId(memberId);
    try {
      const res = await axios.post('/api/team/member/approve', {
        currentUserId: user.id, // 必须传管理员ID用于后端鉴权
        targetMembershipId: memberId,
        action
      });
      
      if (res.data.success) {
        fetchMembers(); // 刷新列表
      } else {
        alert(res.data.message);
      }
    } catch (err) {
      alert('操作失败');
    } finally {
      setProcessingId(null);
    }
  };

  if (!isOpen) return null;

  // 将成员分为：待审核 和 已正式
  const pendingMembers = members.filter(m => m.status === 'PENDING');
  const activeMembers = members.filter(m => m.status === 'APPROVED');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm animate-in fade-in">
      <div className="bg-zinc-900 border border-zinc-700 w-full max-w-2xl rounded-xl shadow-2xl p-6 relative max-h-[85vh] flex flex-col">
        {/* 关闭按钮 */}
        <button onClick={onClose} className="absolute top-4 right-4 text-zinc-500 hover:text-white">
            <X size={20} />
        </button>

        {/* 标题 */}
        <div className="mb-6 pb-4 border-b border-zinc-800">
            <h3 className="text-xl font-black text-white flex items-center">
                <Shield className="text-cyan-500 mr-2" /> 
                成员管理 - <span className="text-cyan-400 ml-1">{teamName}</span>
            </h3>
            <p className="text-xs text-zinc-500 mt-1">管理员权限：审核申请或管理现有成员</p>
        </div>

        {loading ? (
            <div className="flex-1 flex justify-center items-center py-20 text-zinc-500">
                <Loader2 className="animate-spin mr-2"/> 加载中...
            </div>
        ) : (
            <div className="flex-1 overflow-y-auto custom-scrollbar space-y-6 pr-2">
                
                {/* 1. 待审核列表 */}
                {pendingMembers.length > 0 && (
                    <div className="bg-orange-900/10 border border-orange-900/30 rounded-lg p-4">
                        <h4 className="text-sm font-bold text-orange-400 mb-3 flex items-center">
                            <User size={16} className="mr-2"/> 待审核申请 ({pendingMembers.length})
                        </h4>
                        <div className="space-y-2">
                            {pendingMembers.map(m => (
                                <div key={m.id} className="flex items-center justify-between bg-black/40 p-3 rounded border border-orange-900/20">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-zinc-800 rounded-full text-zinc-400">
                                            <User size={16} />
                                        </div>
                                        <div>
                                            <div className="text-white font-bold text-sm">{m.user?.name || 'Unknown'}</div>
                                            <div className="text-xs text-zinc-500">申请职位: <span className="text-zinc-300">{m.role}</span></div>
                                            <div className="text-[10px] text-zinc-600 font-mono">ID: {m.user?.username}</div>
                                        </div>
                                    </div>
                                    <div className="flex gap-2">
                                        <button 
                                            onClick={() => handleAction(m.id, 'APPROVED')} 
                                            disabled={processingId === m.id}
                                            className="px-3 py-1.5 bg-green-600 hover:bg-green-500 text-white text-xs font-bold rounded flex items-center disabled:opacity-50"
                                        >
                                            {processingId === m.id ? <Loader2 size={12} className="animate-spin"/> : <Check size={12} className="mr-1"/>}
                                            通过
                                        </button>
                                        <button 
                                            onClick={() => handleAction(m.id, 'REJECTED')} 
                                            disabled={processingId === m.id}
                                            className="px-3 py-1.5 bg-red-600 hover:bg-red-500 text-white text-xs font-bold rounded flex items-center disabled:opacity-50"
                                        >
                                            {processingId === m.id ? <Loader2 size={12} className="animate-spin"/> : <X size={12} className="mr-1"/>}
                                            拒绝
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* 2. 正式成员列表 */}
                <div>
                    <h4 className="text-sm font-bold text-zinc-400 mb-3 flex items-center">
                        <Shield size={16} className="mr-2"/> 正式成员 ({activeMembers.length})
                    </h4>
                    {activeMembers.length === 0 ? (
                        <div className="text-zinc-600 text-sm text-center py-4 bg-zinc-950 rounded border border-zinc-800 border-dashed">暂无正式成员</div>
                    ) : (
                        <div className="space-y-2">
                            {activeMembers.map(m => (
                                <div key={m.id} className="flex items-center justify-between bg-zinc-950 p-3 rounded border border-zinc-800 hover:border-zinc-700 transition-colors">
                                    <div className="flex items-center gap-3">
                                        <div className={`p-2 rounded-full ${m.role === 'CAPTAIN' ? 'bg-yellow-500/10 text-yellow-500' : 'bg-zinc-800 text-zinc-400'}`}>
                                            {m.role === 'CAPTAIN' ? <Crown size={16} /> : <User size={16} />}
                                        </div>
                                        <div>
                                            <div className="text-white font-bold text-sm flex items-center gap-2">
                                                {m.user?.name}
                                                {m.role === 'CAPTAIN' && <span className="text-[10px] bg-yellow-900/30 text-yellow-500 px-1.5 rounded border border-yellow-900/50">队长</span>}
                                            </div>
                                            <div className="text-xs text-zinc-500">职位: {m.role}</div>
                                        </div>
                                    </div>
                                    <button 
                                        onClick={() => handleAction(m.id, 'REJECTED')} 
                                        disabled={processingId === m.id}
                                        className="p-2 text-zinc-600 hover:text-red-500 hover:bg-red-900/10 rounded transition-colors disabled:opacity-50"
                                        title="踢出战队"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

            </div>
        )}
      </div>
    </div>
  );
}