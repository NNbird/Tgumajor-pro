import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { X, Shield, Check, Ban, User, Crown } from 'lucide-react';

export default function TeamDetailModal({ isOpen, onClose, teamName, currentUser, onUpdate }) {
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(false);

  // 判断当前用户是否为该队队长 (用于显示审批按钮)
  const isCaptain = members.find(m => 
    m.userId === currentUser.id && 
    m.role === 'CAPTAIN' && 
    m.status === 'APPROVED'
  );
  
  // 管理员也有权限
  const canManage = isCaptain || currentUser.role === 'admin';

  const fetchMembers = async () => {
    setLoading(true);
    try {
      const res = await axios.get('http://localhost:3001/api/team/members', { params: { teamName } });
      if (res.data.success) {
        setMembers(res.data.members);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && teamName) {
      fetchMembers();
    }
  }, [isOpen, teamName]);

  const handleApprove = async (id, action) => {
    if (!window.confirm(`确定要 ${action === 'APPROVED' ? '通过' : '拒绝'} 该申请吗？`)) return;
    try {
      const res = await axios.post('http://localhost:3001/api/team/member/approve', {
        currentUserId: currentUser.id,
        targetMembershipId: id,
        action
      });
      if (res.data.success) {
        fetchMembers(); // 刷新列表
        if (onUpdate) onUpdate(); // 刷新父组件状态
      } else {
        alert(res.data.message);
      }
    } catch (err) {
      alert('操作失败');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm animate-in fade-in">
      <div className="bg-zinc-900 border border-zinc-700 w-full max-w-lg rounded-xl shadow-2xl p-6 relative">
        <button onClick={onClose} className="absolute top-4 right-4 text-zinc-500 hover:text-white">
            <X size={20} />
        </button>

        <h3 className="text-xl font-black text-white mb-6 flex items-center">
            <Shield className="text-cyan-500 mr-2" /> 
            {teamName} - 成员列表
        </h3>

        {loading ? (
            <div className="text-center py-10 text-zinc-500">加载中...</div>
        ) : (
            <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
                {members.map(m => (
                    <div key={m.id} className="flex items-center justify-between bg-zinc-950 p-3 rounded border border-zinc-800">
                        <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-full ${m.role === 'CAPTAIN' ? 'bg-yellow-500/20 text-yellow-500' : 'bg-zinc-800 text-zinc-400'}`}>
                                {m.role === 'CAPTAIN' ? <Crown size={16} /> : <User size={16} />}
                            </div>
                            <div>
                                <div className="text-white font-bold text-sm">
                                    {m.user?.name || 'Unknown'} 
                                    {m.userId === currentUser.id && <span className="ml-2 text-[10px] bg-cyan-900 text-cyan-300 px-1 rounded">ME</span>}
                                </div>
                                <div className="text-xs text-zinc-500 flex items-center gap-2">
                                    <span>{m.role}</span>
                                    <span className={`px-1.5 py-0.5 rounded text-[10px] ${
                                        m.status === 'APPROVED' ? 'bg-green-900/30 text-green-500' : 
                                        m.status === 'PENDING' ? 'bg-orange-900/30 text-orange-500' : 'bg-red-900/30 text-red-500'
                                    }`}>
                                        {m.status}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* 审批按钮区 */}
                        {canManage && m.status === 'PENDING' && (
                            <div className="flex gap-2">
                                <button onClick={() => handleApprove(m.id, 'APPROVED')} className="p-1.5 bg-green-600 hover:bg-green-500 rounded text-white" title="通过">
                                    <Check size={14} />
                                </button>
                                <button onClick={() => handleApprove(m.id, 'REJECTED')} className="p-1.5 bg-red-600 hover:bg-red-500 rounded text-white" title="拒绝/踢出">
                                    <Ban size={14} />
                                </button>
                            </div>
                        )}
                    </div>
                ))}

                {members.length === 0 && <div className="text-center text-zinc-500 text-sm">暂无成员</div>}
            </div>
        )}
      </div>
    </div>
  );
}