import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useLeague } from '../context/LeagueContext';
import { useNavigate, Link } from 'react-router-dom';
import { 
  Shield, Lock, User, Save, Fingerprint, 
  Loader2, CheckCircle2, Users, LogOut, Clock, PlusCircle, Crown, Check, X, Ban, Sparkles, Box, Package, ArrowRight, Settings, ExternalLink
} from 'lucide-react';

// 引入组件
import ShowcaseEditModal from '../components/modals/ShowcaseEditModal';

export default function Profile() {
  const { user, updateUserProfile, checkNameAvailability } = useLeague();
  const navigate = useNavigate();

  // --- 状态定义 ---
  const [teamList, setTeamList] = useState([]);
  const [myTeam, setMyTeam] = useState(null); 
  const [teamInfo, setTeamInfo] = useState(null); 
  const [teamMembers, setTeamMembers] = useState([]); 
  const [loadingTeam, setLoadingTeam] = useState(true);
  const [processingId, setProcessingId] = useState(null); 

  // 资产相关状态
  const [showcaseAssets, setShowcaseAssets] = useState([]);
  const [isShowcaseEditOpen, setIsShowcaseEditOpen] = useState(false);
  const [previewAsset, setPreviewAsset] = useState(null); // 当前正在3D预览的资产

  const [teamForm, setTeamForm] = useState({ teamName: '', role: 'MEMBER' });

  // 个人信息表单
  const [form, setForm] = useState({
    username: user?.username || '', 
    name: user?.name || '',          
    currentPassword: '', 
    newPassword: '',
    confirmPassword: ''
  });

  const [msg, setMsg] = useState('');
  const [nameStatus, setNameStatus] = useState('idle'); 
  const [nameMsg, setNameMsg] = useState('');

  const isCaptain = myTeam?.role === 'CAPTAIN' && myTeam?.status === 'APPROVED';

  // --- Effect: 初始加载 ---
  useEffect(() => {
    if (!user) {
        navigate('/');
        return;
    }
    setForm(prev => ({ ...prev, username: user.username, name: user.name }));
    Promise.all([
        fetchMyTeamStatus(), 
        fetchUniqueTeams(),
        fetchShowcaseAssets() // 加载展柜
    ]).finally(() => setLoadingTeam(false));
  }, [user, navigate]);

  useEffect(() => {
    if (myTeam && myTeam.status === 'APPROVED') {
        fetchTeamDetails(myTeam.teamName);
        fetchTeamMembers(myTeam.teamName);
    }
  }, [myTeam]);

  // --- API ---
  const fetchMyTeamStatus = async () => {
      if (!user?.id) return;
      try {
          const res = await axios.get(`/api/user/my-team?userId=${user.id}`);
          if (res.data.success) setMyTeam(res.data.membership);
      } catch (e) { console.error(e); }
  };

  const fetchUniqueTeams = async () => {
      try {
          const res = await axios.get('/api/teams/unique');
          if (res.data.success) setTeamList(res.data.teams);
      } catch (e) { console.error(e); }
  };

  const fetchTeamDetails = async (name) => {
      try {
          const res = await axios.get('/api/teams/list');
          if (res.data.success) {
              const info = res.data.teams.find(t => t.name === name);
              setTeamInfo(info); 
          }
      } catch (e) { console.error(e); }
  };

  const fetchTeamMembers = async (name) => {
      try {
          const res = await axios.get('/api/team/members', { params: { teamName: name } });
          if (res.data.success) setTeamMembers(res.data.members);
      } catch (e) { console.error(e); }
  };

  // 获取展示的资产 (复用 user/assets 接口并过滤前端，或者后端支持)
  // 为了简单，这里直接获取全部 assets 并在前端筛选 isShowcased
  const fetchShowcaseAssets = async () => {
      if (!user?.id) return;
      try {
          const res = await axios.get(`/api/user/assets?userId=${user.id}`);
          if (res.data.success) {
              const showcased = res.data.assets.filter(a => a.isShowcased).slice(0, 5);
              setShowcaseAssets(showcased);
          }
      } catch(e) { console.error("加载展柜失败", e); }
  };

  // --- 交互 ---
  const handleMemberAction = async (targetMembershipId, action, memberName) => {
      if (!isCaptain) return;
      if (!window.confirm(`确定执行操作吗？`)) return;
      setProcessingId(targetMembershipId);
      try {
          const res = await axios.post('/api/team/member/approve', {
              currentUserId: user.id, targetMembershipId, action
          });
          if (res.data.success) fetchTeamMembers(myTeam.teamName);
      } catch (e) { alert('操作失败'); } 
      finally { setProcessingId(null); }
  };

  const handleJoinTeam = async (e) => {
      e.preventDefault();
      if (!teamForm.teamName) return alert('请选择战队');
      try {
          const res = await axios.post('/api/user/bind-team', { userId: user.id, ...teamForm });
          if (res.data.success) {
              alert('申请已提交！');
              fetchMyTeamStatus();
          } else { alert(res.data.message); }
      } catch (e) { alert('申请失败'); }
  };

  const handleUnbind = async () => {
      if (!window.confirm('⚠️ 确定要退出战队吗？')) return;
      try {
          const res = await axios.post('/api/user/unbind-team', { userId: user.id });
          if (res.data.success) {
              setMyTeam(null); setTeamInfo(null); setTeamMembers([]);
              alert('已退出');
          }
      } catch (e) { alert('操作失败'); }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMsg('');
    if (nameStatus === 'taken') return setMsg('❌ 昵称已被占用');
    const res = await updateUserProfile({
        userId: user.id, name: form.name, currentPassword: form.currentPassword, newPassword: form.newPassword
    });
    if (res.success) {
        alert('修改成功！');
        setForm(prev => ({ ...prev, currentPassword: '', newPassword: '', confirmPassword: '' }));
    } else { setMsg(`❌ ${res.message || res.error}`); }
  };

  useEffect(() => {
    if (!user || !form.name || form.name === user.name) { setNameStatus('idle'); return; }
    setNameStatus('checking');
    const timer = setTimeout(async () => {
        const res = await checkNameAvailability(form.name, user.id);
        if (res.available) setNameStatus('available');
        else { setNameStatus('taken'); setNameMsg(res.message || '已被占用'); }
    }, 500);
    return () => clearTimeout(timer);
  }, [form.name, user, checkNameAvailability]);

  const pendingMembers = teamMembers.filter(m => m.status === 'PENDING');
  const approvedMembers = teamMembers.filter(m => m.status === 'APPROVED');

  // --- 3D 预览弹窗组件 (Inline) ---
  const Asset3DPreviewModal = ({ asset, onClose }) => {
    if (!asset) return null;
    const isOfficial = asset.isOfficial;
    const modelUrl = isOfficial ? asset.template?.modelPath : asset.modelPath;
    const name = isOfficial ? asset.template?.name : asset.customName;

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/90 backdrop-blur-sm p-4 animate-in zoom-in-95">
            <div className="relative w-full max-w-3xl aspect-video bg-zinc-900 border border-zinc-700 rounded-2xl overflow-hidden shadow-2xl flex flex-col">
                <button onClick={onClose} className="absolute top-4 right-4 z-10 p-2 bg-black/50 text-white rounded-full hover:bg-white/20"><X size={20}/></button>
                <div className="flex-1 bg-gradient-to-b from-zinc-800 to-black relative">
                    <model-viewer
                        src={modelUrl}
                        camera-controls
                        auto-rotate
                        shadow-intensity="1.5"
                        style={{ width: '100%', height: '100%' }}
                    ></model-viewer>
                    <div className="absolute bottom-4 left-4 pointer-events-none">
                        <h3 className="text-2xl font-black text-white drop-shadow-md">{name}</h3>
                        <p className="text-zinc-400 text-xs mt-1">* 拖拽旋转 / 滚轮缩放</p>
                    </div>
                </div>
            </div>
        </div>
    );
  };

  return (
    <div className="max-w-6xl mx-auto py-10 animate-in fade-in px-4">
      <div className="bg-zinc-900 border border-zinc-800 p-8 rounded-xl shadow-2xl relative overflow-hidden">
        
        <h2 className="text-3xl font-black text-white mb-8 flex items-center border-b border-zinc-800 pb-6">
            <Shield className="mr-3 text-cyan-500" size={32}/> 个人中心
        </h2>

        {/* =======================
            💎 资产展柜 (SHOWCASE)
           ======================= */}
        <div className="mb-12">
            <div className="flex justify-between items-end mb-5">
                <div>
                    <h3 className="text-xl font-bold text-white flex items-center gap-2">
                        <Package className="text-yellow-500" size={24}/> 
                        资产展柜 <span className="text-zinc-600 text-sm font-normal uppercase tracking-wider">Showcase</span>
                    </h3>
                    <p className="text-zinc-500 text-xs mt-1">展示你最稀有或最得意的 5 个虚拟资产。</p>
                </div>
                <div className="flex gap-3">
                    <button 
                        onClick={() => setIsShowcaseEditOpen(true)}
                        className="text-xs flex items-center gap-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 px-3 py-1.5 rounded-lg transition-colors border border-zinc-700"
                    >
                        <Settings size={14}/> 管理展柜
                    </button>
                    <Link 
                        to="/inventory"
                        className="text-xs flex items-center gap-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 px-3 py-1.5 rounded-lg transition-colors border border-zinc-700"
                    >
                        <ExternalLink size={14}/> 全部库存
                    </Link>
                </div>
            </div>

            {/* 展柜格子 (5个) */}
            <div className="grid grid-cols-5 gap-4">
                {[0, 1, 2, 3, 4].map(idx => {
                    const asset = showcaseAssets[idx];
                    
                    if (!asset) {
                        // 空格子
                        return (
                            <div key={`empty-${idx}`} className="aspect-square bg-zinc-950/50 border border-dashed border-zinc-800 rounded-xl flex items-center justify-center text-zinc-700">
                                <Box size={24} className="opacity-20"/>
                            </div>
                        );
                    }

                    const isOfficial = asset.isOfficial;
                    const thumb = isOfficial ? asset.template?.imagePath : asset.imagePath;
                    const name = isOfficial ? asset.template?.name : asset.customName;
                    
                    // 特效样式区分
                    const containerClass = isOfficial 
                        ? "border-yellow-500/50 shadow-[0_0_20px_rgba(234,179,8,0.15)] bg-gradient-to-br from-yellow-900/20 to-black"
                        : "border-purple-500/50 shadow-[0_0_20px_rgba(168,85,247,0.15)] bg-gradient-to-br from-purple-900/20 to-black";
                    
                    const badgeClass = isOfficial 
                        ? "bg-yellow-500 text-black" 
                        : "bg-purple-600 text-white";

                    return (
                        <div 
                            key={asset.uid}
                            onClick={() => setPreviewAsset(asset)}
                            className={`aspect-square rounded-xl border-2 relative group cursor-pointer overflow-hidden transition-transform hover:scale-105 ${containerClass}`}
                        >
                            {/* 图片 */}
                            <div className="w-full h-full p-3 flex items-center justify-center">
                                <img src={thumb} alt={name} className="w-full h-full object-contain drop-shadow-2xl group-hover:scale-110 transition-transform duration-500"/>
                            </div>
                            
                            {/* 标签 */}
                            <div className={`absolute top-2 right-2 text-[10px] font-black px-1.5 py-0.5 rounded shadow-lg ${badgeClass}`}>
                                {isOfficial ? 'OFFICIAL' : 'UGC'}
                            </div>

                            {/* 底部名称浮层 */}
                            <div className="absolute inset-x-0 bottom-0 bg-black/80 backdrop-blur-sm p-2 translate-y-full group-hover:translate-y-0 transition-transform">
                                <div className="text-[10px] text-center text-white font-bold truncate">{name}</div>
                                <div className="text-[9px] text-center text-zinc-400 mt-0.5 flex items-center justify-center gap-1">
                                    <Box size={10}/> 点击预览 3D
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>

        <hr className="border-zinc-800 mb-10"/>

        {/* =======================
            🏟️ 战队管理区域 (保持原样)
           ======================= */}
        <div className="mb-10">
            <h3 className="text-xl font-bold text-white mb-4 flex items-center">
                <Users className="text-purple-500 mr-2" size={24}/> 我的战队
            </h3>

            {loadingTeam ? (
                <div className="text-zinc-500 flex items-center"><Loader2 className="animate-spin mr-2"/> 加载中...</div>
            ) : (
                <>
                    {/* Case 1: 未加入 */}
                    {!myTeam && (
                        <div className="bg-zinc-950/50 p-6 rounded-lg border border-zinc-800">
                            <form onSubmit={handleJoinTeam} className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
                                <div>
                                    <label className="text-xs text-zinc-500 mb-1 block">选择战队</label>
                                    <select 
                                        className="w-full bg-black border border-zinc-700 p-2.5 rounded text-white text-sm outline-none focus:border-purple-500"
                                        value={teamForm.teamName}
                                        onChange={e => setTeamForm({...teamForm, teamName: e.target.value})}
                                    >
                                        <option value="">-- 请选择 --</option>
                                        {teamList.map(t => <option key={t} value={t}>{t}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="text-xs text-zinc-500 mb-1 block">申请职位</label>
                                    <select 
                                        className="w-full bg-black border border-zinc-700 p-2.5 rounded text-white text-sm outline-none focus:border-purple-500"
                                        value={teamForm.role}
                                        onChange={e => setTeamForm({...teamForm, role: e.target.value})}
                                    >
                                        <option value="MEMBER">队员 (Member)</option>
                                        <option value="CAPTAIN">队长 (Captain)</option>
                                        <option value="COACH">教练 (Coach)</option>
                                        <option value="MANAGER">经理 (Manager)</option>
                                    </select>
                                </div>
                                <button type="submit" className="bg-purple-600 hover:bg-purple-500 text-white font-bold py-2.5 rounded flex items-center justify-center transition-colors">
                                    <PlusCircle size={16} className="mr-1"/> 提交申请
                                </button>
                            </form>
                        </div>
                    )}

                    {/* Case 2: 审核中 */}
                    {myTeam && myTeam.status === 'PENDING' && (
                        <div className="bg-orange-900/10 border border-orange-900/30 p-6 rounded-lg flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <Clock className="text-orange-500" size={24} />
                                <div>
                                    <div className="text-orange-200 font-bold">申请审核中</div>
                                    <div className="text-orange-400/80 text-sm mt-1">
                                        申请加入 <span className="font-bold text-white">{myTeam.teamName}</span> 正在审核中。
                                    </div>
                                </div>
                            </div>
                            <button onClick={handleUnbind} className="text-zinc-400 text-sm hover:text-white underline">撤销申请</button>
                        </div>
                    )}

                    {/* Case 3: 已加入 (战队面板) */}
                    {myTeam && myTeam.status === 'APPROVED' && (
                        <div className="bg-zinc-950 border border-zinc-800 rounded-lg overflow-hidden">
                            <div className="p-6 bg-gradient-to-r from-zinc-900 to-zinc-950 border-b border-zinc-800 flex flex-col md:flex-row justify-between items-start gap-6">
                                <div className="flex gap-5 flex-1">
                                    <div className="w-20 h-20 bg-black rounded-lg border border-zinc-700 flex items-center justify-center overflow-hidden shrink-0">
                                        {teamInfo?.logo ? <img src={teamInfo.logo} alt={myTeam.teamName} className="w-full h-full object-cover"/> : <Shield size={32} className="text-zinc-600"/>}
                                    </div>
                                    <div>
                                        <h2 className="text-3xl font-black text-white italic tracking-tighter">{myTeam.teamName}</h2>
                                        <div className="flex items-center gap-3 mt-2 flex-wrap">
                                            <span className="px-2 py-0.5 bg-purple-900/50 text-purple-300 text-xs rounded border border-purple-800 font-bold uppercase">
                                                {myTeam.role}
                                            </span>
                                            {isCaptain && (
                                                <button onClick={() => navigate('/mascot')} className="px-3 py-0.5 bg-gradient-to-r from-purple-600 to-pink-600 hover:brightness-110 text-white rounded text-[10px] flex items-center transition-all shadow-lg">
                                                    <Sparkles size={10} className="mr-1"/> 吉祥物工坊
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                                {teamInfo?.mascotStatus === 'COMPLETED' && teamInfo?.mascot3DUrl && (
                                    <div className="w-full md:w-48 h-48 bg-black/50 rounded-xl border border-zinc-700 relative overflow-hidden shrink-0 group">
                                        <div className="absolute top-2 left-2 z-10 bg-purple-600/20 text-purple-400 text-[10px] px-2 py-0.5 rounded border border-purple-500/30 font-bold uppercase backdrop-blur-sm flex items-center">
                                            <Box size={10} className="mr-1"/> Team Mascot
                                        </div>
                                        <model-viewer src={teamInfo.mascot3DUrl} auto-rotate camera-controls shadow-intensity="1" interaction-prompt="none" style={{width: '100%', height: '100%'}}></model-viewer>
                                    </div>
                                )}
                                <button onClick={handleUnbind} className="absolute top-6 right-6 text-zinc-500 hover:text-red-500 transition-colors p-2" title="退出战队"><LogOut size={16}/></button>
                            </div>

                            {/* 队长审核区 */}
                            {isCaptain && pendingMembers.length > 0 && (
                                <div className="p-4 bg-orange-900/5 border-b border-orange-900/20">
                                    <h4 className="text-xs font-bold text-orange-400 mb-3 uppercase flex items-center">待审核申请 ({pendingMembers.length})</h4>
                                    <div className="space-y-2">
                                        {pendingMembers.map(m => (
                                            <div key={m.id} className="flex items-center justify-between bg-black/40 p-3 rounded border border-orange-900/20">
                                                <div className="text-sm font-bold text-white">{m.user?.name} <span className="text-zinc-500 font-normal ml-2">{m.role}</span></div>
                                                <div className="flex gap-2">
                                                    <button onClick={() => handleMemberAction(m.id, 'APPROVED', m.user?.name)} className="px-3 py-1 bg-green-600 hover:bg-green-500 text-white text-xs rounded">通过</button>
                                                    <button onClick={() => handleMemberAction(m.id, 'REJECTED', m.user?.name)} className="px-3 py-1 bg-red-600 hover:bg-red-500 text-white text-xs rounded">拒绝</button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* 队员列表 */}
                            <div className="p-6">
                                <h4 className="text-sm font-bold text-zinc-400 mb-4 uppercase tracking-wider">现役成员</h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    {approvedMembers.map(member => (
                                        <div key={member.id} className={`flex items-center justify-between p-3 rounded border ${member.userId === user.id ? 'bg-zinc-800/50 border-cyan-900/50' : 'bg-black border-zinc-800'}`}>
                                            <div className="flex items-center gap-3">
                                                <div className={`p-2 rounded-full ${member.role === 'CAPTAIN' ? 'bg-yellow-500/10 text-yellow-500' : 'bg-zinc-800 text-zinc-500'}`}>
                                                    {member.role === 'CAPTAIN' ? <Crown size={16}/> : <User size={16}/>}
                                                </div>
                                                <div>
                                                    <div className="text-white font-bold text-sm">{member.user?.name} {member.userId === user.id && '(ME)'}</div>
                                                    <div className="text-xs text-zinc-500">{member.role}</div>
                                                </div>
                                            </div>
                                            {isCaptain && member.userId !== user.id && (
                                                <button onClick={() => handleMemberAction(member.id, 'REJECTED', member.user?.name)} className="p-2 text-zinc-600 hover:text-red-500"><Ban size={16}/></button>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}
                </>
            )}
        </div>

        <hr className="border-zinc-800 mb-10"/>

        {/* 个人信息表单 (保持不变) */}
        <form onSubmit={handleSubmit} className="space-y-6 opacity-80 hover:opacity-100 transition-opacity">
            <h3 className="text-xl font-bold text-white mb-4 flex items-center"><Fingerprint className="text-cyan-500 mr-2" size={24}/> 账号信息</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                    <label className="text-xs text-zinc-500 uppercase font-bold mb-1 block">登录账号</label>
                    <div className="flex items-center bg-zinc-950 border border-zinc-800 rounded p-3 text-zinc-500 font-mono"><Lock size={16} className="mr-3"/> {form.username}</div>
                </div>
                <div>
                    <label className="text-xs text-zinc-500 uppercase font-bold mb-1 block">显示昵称 {nameStatus === 'available' && <span className="text-green-500 text-xs ml-2">✔ 可用</span>}</label>
                    <div className="flex items-center bg-black border border-zinc-700 focus-within:border-cyan-500 rounded p-3">
                        <User size={16} className="text-zinc-500 mr-3"/>
                        <input value={form.name} onChange={e => setForm({...form, name: e.target.value})} className="bg-transparent text-white outline-none w-full"/>
                    </div>
                </div>
            </div>
            <div className="bg-zinc-950 p-5 rounded border border-zinc-800 mt-4">
                <h4 className="text-sm font-bold text-zinc-400 mb-4 flex items-center"><Lock size={14} className="mr-2"/> 修改密码</h4>
                <div className="space-y-4">
                    <input type="password" placeholder="当前旧密码" value={form.currentPassword} onChange={e => setForm({...form, currentPassword: e.target.value})} className="w-full bg-black border border-zinc-700 p-3 rounded text-sm text-white outline-none"/>
                    <div className="grid grid-cols-2 gap-4">
                        <input type="password" placeholder="新密码" value={form.newPassword} onChange={e => setForm({...form, newPassword: e.target.value})} className="w-full bg-black border border-zinc-700 p-3 rounded text-sm text-white outline-none"/>
                        <input type="password" placeholder="确认新密码" value={form.confirmPassword} onChange={e => setForm({...form, confirmPassword: e.target.value})} className="w-full bg-black border border-zinc-700 p-3 rounded text-sm text-white outline-none"/>
                    </div>
                </div>
            </div>
            {msg && <div className={`text-sm font-bold text-center p-2 rounded ${msg.includes('✅') ? 'text-green-400 bg-green-900/20' : 'text-red-400 bg-red-900/20'}`}>{msg}</div>}
            <button type="submit" className="w-full bg-cyan-600 hover:bg-cyan-500 text-white font-black py-4 rounded uppercase tracking-widest shadow-lg shadow-cyan-900/20 transition-all flex items-center justify-center mt-4">
                <Save className="mr-2"/> 保存更改
            </button>
        </form>

        {/* 弹窗挂载 */}
        {isShowcaseEditOpen && (
            <ShowcaseEditModal 
                userId={user.id} 
                onClose={() => setIsShowcaseEditOpen(false)} 
                onSuccess={fetchShowcaseAssets}
            />
        )}
        {previewAsset && (
            <Asset3DPreviewModal 
                asset={previewAsset} 
                onClose={() => setPreviewAsset(null)}
            />
        )}

      </div>
    </div>
  );
}