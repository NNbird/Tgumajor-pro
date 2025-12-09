import React, { useState, useEffect } from 'react';
import { useLeague } from '../context/LeagueContext';
import { Lock, Trash2, Plus, Save, AlertCircle, CheckCircle, Info, User, Hash, School, BookOpen } from 'lucide-react';

export default function Register() {
  const { user, teams, saveTeam, deleteTeam, freeAgents, saveFreeAgent, deleteFreeAgent, tournaments } = useLeague();
  const [activeTab, setActiveTab] = useState('team'); 
  
  // --- 新增：赛事选择状态 ---
  const [selectedTourId, setSelectedTourId] = useState('');
  
  // 初始化默认赛事 (优先选 OPEN 的，否则选第一个)
  useEffect(() => {
    if (tournaments.length > 0 && !selectedTourId) {
      const openTour = tournaments.find(t => t.registrationStatus === 'OPEN');
      setSelectedTourId(openTour ? openTour.id : tournaments[0].id);
    }
  }, [tournaments]);

  // 获取当前赛事对象及状态
  const currentTournament = tournaments.find(t => t.id === selectedTourId);
  const isRegistrationOpen = currentTournament?.registrationStatus === 'OPEN';

  // --- 核心逻辑修改：查找当前用户在 *当前选中赛事* 下的报名信息 ---
  const myTeam = user ? teams.find(t => t.ownerId === user.id && t.tournamentId === selectedTourId) : null;
  const myAgent = user ? freeAgents.find(f => f.ownerId === user.id && f.tournamentId === selectedTourId) : null;

  // --- Team Form State ---
  const [teamForm, setTeamForm] = useState({
    name: '', tag: '', contact: '', digitalId: '',
    members: Array(5).fill({ id: '', steamId: '', class: '', studentId: '', score: '', role: 'Rifler' })
  });

  // --- Free Agent Form State ---
  const [faForm, setFaForm] = useState({ 
    name: '', steamId: '', class: '', studentId: '',
    score: '', role: 'Rifler', contact: '' 
  });

  // 数据回填：当切换赛事或数据加载完成时，回填表单
  useEffect(() => {
    if (myTeam) {
      setTeamForm({
        name: myTeam.name,
        tag: myTeam.tag,
        contact: myTeam.contact,
        digitalId: myTeam.digitalId || '',
        members: myTeam.members.map(m => ({
            id: m.id || '',
            steamId: m.steamId || '',
            class: m.class || '',
            studentId: m.studentId || '',
            score: m.score || '',
            role: m.role || 'Rifler'
        }))
      });
    } else {
      // 如果当前赛事没报名，重置表单
      setTeamForm({
        name: '', tag: '', contact: '', digitalId: '',
        members: Array(5).fill({ id: '', steamId: '', class: '', studentId: '', score: '', role: 'Rifler' })
      });
    }
  }, [myTeam, selectedTourId]); // 监听 selectedTourId

  useEffect(() => {
    if (myAgent) {
      setFaForm({
        name: myAgent.name,
        steamId: myAgent.steamId || '',
        class: myAgent.class || '',
        studentId: myAgent.studentId || '',
        score: myAgent.score,
        role: myAgent.role,
        contact: myAgent.contact
      });
    } else {
      setFaForm({ name: '', steamId: '', class: '', studentId: '', score: '', role: 'Rifler', contact: '' });
    }
  }, [myAgent, selectedTourId]); // 监听 selectedTourId

  if (!user) return (
    <div className="text-center py-24 space-y-6 animate-in fade-in">
      <div className="bg-zinc-900 inline-flex p-8 rounded-full border-2 border-dashed border-zinc-700">
        <Lock size={48} className="text-zinc-500"/>
      </div>
      <div className="space-y-2">
        <h3 className="text-3xl font-black text-white">ACCESS DENIED</h3>
        <p className="text-zinc-400 max-w-md mx-auto">请先登录账号以访问报名系统。</p>
      </div>
    </div>
  );

  // --- Helpers ---
  const isTeamLocked = myTeam?.status === 'approved';

  // Team Handlers
  const updateMember = (idx, field, val) => {
    if (isTeamLocked) return;
    const newMembers = [...teamForm.members];
    newMembers[idx] = { ...newMembers[idx], [field]: val };
    setTeamForm({ ...teamForm, members: newMembers });
  };
  
  const addMember = () => !isTeamLocked && teamForm.members.length < 7 && setTeamForm({ ...teamForm, members: [...teamForm.members, { id: '', steamId: '', class: '', studentId: '', score: '', role: 'Substitute' }] });
  const removeMember = () => !isTeamLocked && teamForm.members.length > 5 && setTeamForm({ ...teamForm, members: teamForm.members.slice(0, -1) });
  
  const handleTeamSubmit = (e) => {
    e.preventDefault();
    if (isTeamLocked) return;
    if (!selectedTourId) return alert("请先选择赛事！");

    const avg = (teamForm.members.reduce((a, b) => a + (Number(b.score) || 0), 0) / teamForm.members.length).toFixed(0);
    
    saveTeam({
        id: myTeam?.id,
        tournamentId: selectedTourId, // <--- 关键：绑定当前选中的赛事ID
        name: teamForm.name,
        tag: teamForm.tag.toUpperCase(),
        digitalId: teamForm.digitalId,
        logoColor: 'bg-cyan-500', 
        avgElo: avg,
        contact: teamForm.contact,
        members: teamForm.members
    });
    alert(myTeam ? '修改成功！状态已重置为审核中。' : '报名已提交，请等待管理员审核！');
  };

  const handleTeamDelete = () => {
    if(confirm('确定要撤销报名吗？此操作不可恢复。')) {
        deleteTeam(myTeam.id);
        setTeamForm({ name: '', tag: '', contact: '', digitalId: '', members: Array(5).fill({ id: '', steamId: '', class: '', studentId: '', score: '', role: 'Rifler' }) });
    }
  };

  // FA Handlers
  const handleFaSubmit = (e) => {
    e.preventDefault();
    if (!selectedTourId) return alert("请先选择赛事！");

    saveFreeAgent({
        id: myAgent?.id,
        tournamentId: selectedTourId, // <--- 关键：绑定当前选中的赛事ID
        ...faForm
    });
    alert(myAgent ? '个人信息已更新！' : '个人信息已发布！');
  };

  const handleFaDelete = () => {
      if(confirm('确定要删除求职信息吗？')) {
          deleteFreeAgent(myAgent.id);
          setFaForm({ name: '', steamId: '', class: '', studentId: '', score: '', role: 'Rifler', contact: '' });
      }
  }

  return (
    <div className="space-y-8 animate-in slide-in-from-bottom-4 pb-20">
      
      {/* --- 新增：顶部赛事选择器 --- */}
      <div className="flex flex-col items-center gap-4 mb-8 pt-8">
        <h2 className="text-2xl font-black text-white uppercase">选择报名赛事</h2>
        <div className="relative z-20 w-full max-w-md">
           <select 
             value={selectedTourId} 
             onChange={e => setSelectedTourId(e.target.value)}
             className="w-full bg-zinc-900 border-2 border-yellow-500 text-white text-lg font-bold p-3 rounded shadow-[0_0_15px_rgba(234,179,8,0.3)] focus:outline-none text-center appearance-none"
           >
             {tournaments.map(t => (
               <option key={t.id} value={t.id}>
                 {t.name} {t.registrationStatus === 'OPEN' ? '(报名中)' : t.registrationStatus === 'CLOSED' ? '(已截止)' : '(未开始)'}
               </option>
             ))}
           </select>
        </div>
        
        {/* 状态提示 */}
        {!isRegistrationOpen && (
          <div className="bg-red-900/30 border border-red-500/50 text-red-200 px-6 py-4 rounded-lg flex items-center max-w-xl text-center mt-4">
            <AlertCircle className="mr-3 flex-shrink-0" />
            <div>
               <div className="font-bold text-lg">该赛事当前无法报名</div>
               <div className="text-sm opacity-80">
                 状态：{currentTournament?.registrationStatus === 'CLOSED' ? '报名已截止' : '尚未开放报名'}
               </div>
            </div>
          </div>
        )}
      </div>

      {/* --- 内容区域：只有报名开启时显示 --- */}
      {isRegistrationOpen && (
      <>
      <div className="flex justify-center space-x-4 mb-8">
        <button onClick={() => setActiveTab('team')} className={`px-6 py-2 font-bold border-b-2 transition-colors ${activeTab==='team' ? 'border-yellow-500 text-white' : 'border-transparent text-zinc-500 hover:text-zinc-300'}`}>战队报名</button>
        <button onClick={() => setActiveTab('freeagent')} className={`px-6 py-2 font-bold border-b-2 transition-colors ${activeTab==='freeagent' ? 'border-cyan-500 text-white' : 'border-transparent text-zinc-500 hover:text-zinc-300'}`}>散人登记</button>
      </div>

      {activeTab === 'team' ? (
        <div className="max-w-5xl mx-auto bg-zinc-900/80 border border-zinc-700 p-8 relative overflow-hidden rounded-sm shadow-xl">
            {/* 提示当前赛事 */}
            <div className="text-center mb-6 text-zinc-500 text-xs uppercase tracking-widest border-b border-zinc-800 pb-4">
               正在报名: <span className="text-yellow-500 font-bold ml-2">{currentTournament?.name}</span>
            </div>

            {/* 状态提示栏 */}
            {myTeam && (
                <div className={`mb-8 p-4 border-l-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 ${
                    myTeam.status === 'approved' ? 'bg-green-900/20 border-green-500' : 
                    myTeam.status === 'rejected' ? 'bg-red-900/20 border-red-500' : 
                    'bg-yellow-900/20 border-yellow-500'
                }`}>
                    <div>
                        <div className={`font-black uppercase flex items-center ${
                             myTeam.status === 'approved' ? 'text-green-500' : 
                             myTeam.status === 'rejected' ? 'text-red-500' : 
                             'text-yellow-500'
                        }`}>
                            {myTeam.status === 'approved' && <CheckCircle size={20} className="mr-2"/>}
                            {myTeam.status === 'rejected' && <AlertCircle size={20} className="mr-2"/>}
                            {myTeam.status === 'pending' && <Info size={20} className="mr-2"/>}
                            当前状态: {myTeam.status === 'approved' ? '已通过审核 (LOCKED)' : myTeam.status === 'rejected' ? '未通过审核' : '审核中'}
                        </div>
                        {myTeam.status === 'approved' && <div className="text-xs text-zinc-400 mt-1">恭喜！您的报名已锁定。如需紧急修改请联系管理员。</div>}
                        {myTeam.status === 'rejected' && <div className="text-sm text-red-300 mt-1 font-mono">原因: {myTeam.rejectReason || '未说明'}</div>}
                        {myTeam.status === 'pending' && <div className="text-xs text-zinc-400 mt-1">管理员正在审核您的队伍均分，修改信息将重新排队。</div>}
                    </div>
                    {myTeam.status !== 'approved' && (
                        <button onClick={handleTeamDelete} className="text-red-500 hover:bg-red-500/10 px-4 py-2 rounded flex items-center text-xs font-bold uppercase transition-colors">
                            <Trash2 size={14} className="mr-2"/> 撤销报名
                        </button>
                    )}
                </div>
            )}

            <h2 className="text-3xl font-black text-white mb-8 flex items-center">
                <span className="text-yellow-500 mr-3">//</span> {myTeam ? '管理我的战队' : '创建新战队'}
            </h2>
            
            <form onSubmit={handleTeamSubmit} className={`space-y-8 ${isTeamLocked ? 'opacity-50 pointer-events-none grayscale' : ''}`}>
                {/* 战队基本信息 */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <div className="space-y-2">
                        <label className="text-xs text-zinc-500 uppercase font-bold">战队全称</label>
                        <input required disabled={isTeamLocked} placeholder="Team Name" className="w-full bg-black border border-zinc-700 p-3 text-white focus:border-yellow-500 outline-none disabled:bg-zinc-900 transition-colors" value={teamForm.name} onChange={e => setTeamForm({...teamForm, name: e.target.value})} />
                    </div>
                    <div className="space-y-2">
                        <label className="text-xs text-zinc-500 uppercase font-bold">完美战队数字ID</label>
                        <div className="relative">
                            <input required disabled={isTeamLocked} placeholder="一串数字" className="w-full bg-black border border-zinc-700 p-3 pl-9 text-white focus:border-yellow-500 outline-none disabled:bg-zinc-900 transition-colors font-mono" value={teamForm.digitalId} onChange={e => setTeamForm({...teamForm, digitalId: e.target.value})} />
                            <Hash className="absolute left-3 top-3.5 text-zinc-500" size={16} />
                        </div>
                    </div>
                    <div className="space-y-2">
                        <label className="text-xs text-zinc-500 uppercase font-bold">缩写 (Tag)</label>
                        <input required disabled={isTeamLocked} placeholder="TAG" className="w-full bg-black border border-zinc-700 p-3 text-white focus:border-yellow-500 outline-none disabled:bg-zinc-900 transition-colors" value={teamForm.tag} onChange={e => setTeamForm({...teamForm, tag: e.target.value})} />
                    </div>
                    <div className="space-y-2">
                        <label className="text-xs text-zinc-500 uppercase font-bold">队长联系方式</label>
                        <input required disabled={isTeamLocked} placeholder="QQ / WeChat" className="w-full bg-black border border-zinc-700 p-3 text-white focus:border-yellow-500 outline-none disabled:bg-zinc-900 transition-colors font-mono" value={teamForm.contact} onChange={e => setTeamForm({...teamForm, contact: e.target.value})} />
                    </div>
                </div>

                {/* 队员列表 */}
                <div className="space-y-3 bg-zinc-950/50 p-4 border border-zinc-800 rounded">
                    <div className="flex justify-between items-center text-zinc-400 text-xs uppercase tracking-wider pb-2 border-b border-zinc-800 mb-2">
                        <span>战队成员 ({teamForm.members.length})</span>
                        <div className="flex gap-2">
                            {teamForm.members.length > 5 && !isTeamLocked && <button type="button" onClick={removeMember} className="text-red-500 hover:text-red-400 hover:bg-red-900/20 p-1 rounded"><Trash2 size={16}/></button>}
                            {teamForm.members.length < 7 && !isTeamLocked && <button type="button" onClick={addMember} className="text-green-500 hover:text-green-400 hover:bg-green-900/20 p-1 rounded"><Plus size={16}/></button>}
                        </div>
                    </div>
                    
                    <div className="space-y-4">
                        {teamForm.members.map((m, i) => (
                            <div key={i} className="bg-zinc-900 border border-zinc-800 p-3 rounded-sm relative group hover:border-zinc-700 transition-colors">
                                <div className="absolute -left-1 top-3 bottom-3 w-1 bg-zinc-800 group-hover:bg-yellow-500 transition-colors rounded-r"></div>
                                <div className="mb-2 text-xs font-bold text-zinc-500 flex justify-between">
                                    <span>MEMBER #{i + 1} <span className="text-zinc-600 font-normal">({i < 5 ? 'Main' : 'Substitute'})</span></span>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-3">
                                    <div className="lg:col-span-1">
                                        <div className="flex items-center bg-black border border-zinc-700 rounded px-2">
                                            <User size={14} className="text-zinc-500 mr-2"/>
                                            <input required disabled={isTeamLocked} placeholder="游戏ID" className="w-full bg-transparent py-2 text-white text-sm outline-none" value={m.id} onChange={e => updateMember(i, 'id', e.target.value)} />
                                        </div>
                                    </div>
                                    <div className="lg:col-span-1">
                                        <input required disabled={isTeamLocked} placeholder="SteamID (7656...)" className="w-full bg-black border border-zinc-700 rounded py-2 px-3 text-white text-sm outline-none focus:border-yellow-500 font-mono" value={m.steamId} onChange={e => updateMember(i, 'steamId', e.target.value)} />
                                    </div>
                                    <div className="lg:col-span-1">
                                        <div className="flex items-center bg-black border border-zinc-700 rounded px-2">
                                            <School size={14} className="text-zinc-500 mr-2"/>
                                            <input required disabled={isTeamLocked} placeholder="班级 (外援填外援)" className="w-full bg-transparent py-2 text-white text-sm outline-none" value={m.class} onChange={e => updateMember(i, 'class', e.target.value)} />
                                        </div>
                                    </div>
                                    <div className="lg:col-span-1">
                                        <div className="flex items-center bg-black border border-zinc-700 rounded px-2">
                                            <BookOpen size={14} className="text-zinc-500 mr-2"/>
                                            <input required disabled={isTeamLocked} placeholder="学号" className="w-full bg-transparent py-2 text-white text-sm outline-none font-mono" value={m.studentId} onChange={e => updateMember(i, 'studentId', e.target.value)} />
                                        </div>
                                    </div>
                                    <div className="lg:col-span-1">
                                        <input required disabled={isTeamLocked} type="number" placeholder="天梯分 (Elo)" className="w-full bg-black border border-zinc-700 rounded py-2 px-3 text-white text-sm outline-none focus:border-yellow-500 font-mono text-right" value={m.score} onChange={e => updateMember(i, 'score', e.target.value)} />
                                    </div>
                                    <div className="lg:col-span-1">
                                        <select disabled={isTeamLocked} className="w-full bg-black border border-zinc-700 rounded py-2 px-3 text-zinc-300 text-sm outline-none focus:border-yellow-500" value={m.role} onChange={e => updateMember(i, 'role', e.target.value)}>
                                            <option>Rifler</option><option>AWP</option><option>IGL</option><option>Entry</option><option>Support</option><option>Substitute</option>
                                        </select>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
                
                {!isTeamLocked && (
                    <div className="pt-4 border-t border-zinc-800">
                        <div className="flex items-start gap-2 text-zinc-500 text-xs mb-4 bg-zinc-900 p-3 rounded">
                            <Info size={16} className="flex-shrink-0 mt-0.5"/>
                            <p>提示：班级和学号信息仅管理员可见，用于核实身份。SteamID 请填写 64位 ID (以 7656 开头)。</p>
                        </div>
                        <button className="w-full bg-yellow-500 text-black font-black py-4 uppercase tracking-widest hover:bg-white transition-colors flex items-center justify-center shadow-[0_4px_0_rgb(161,98,7)] active:translate-y-[2px] active:shadow-none rounded-sm">
                            <Save size={20} className="mr-2"/> {myTeam ? '保存修改并重新提交' : '提交报名审核'}
                        </button>
                    </div>
                )}
            </form>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-in fade-in">
            {/* 左侧：散人表单 */}
            <div className="lg:col-span-1 bg-zinc-900/80 p-6 border border-zinc-700 h-fit rounded-sm shadow-xl">
                <div className="flex justify-between items-center mb-6 pb-4 border-b border-zinc-800">
                    <h3 className="text-xl font-black text-white text-cyan-400 uppercase">{myAgent ? '编辑我的信息' : '我是散人 (LFT)'}</h3>
                    {myAgent && <button onClick={handleFaDelete} className="text-red-500 hover:text-red-400 bg-red-900/20 p-2 rounded"><Trash2 size={16}/></button>}
                </div>
                
                <form onSubmit={handleFaSubmit} className="space-y-4">
                    <div className="space-y-1">
                        <label className="text-xs text-zinc-500 uppercase font-bold">游戏 ID</label>
                        <input required placeholder="Game ID" className="w-full bg-black border border-zinc-700 p-3 text-white focus:border-cyan-500 outline-none rounded-sm" value={faForm.name} onChange={e => setFaForm({...faForm, name: e.target.value})} />
                    </div>
                    <div className="space-y-1">
                        <label className="text-xs text-zinc-500 uppercase font-bold">Steam ID</label>
                        <input required placeholder="7656..." className="w-full bg-black border border-zinc-700 p-3 text-white focus:border-cyan-500 outline-none rounded-sm font-mono" value={faForm.steamId} onChange={e => setFaForm({...faForm, steamId: e.target.value})} />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <label className="text-xs text-zinc-500 uppercase font-bold">班级</label>
                            <input required placeholder="或填外援" className="w-full bg-black border border-zinc-700 p-3 text-white focus:border-cyan-500 outline-none rounded-sm" value={faForm.class} onChange={e => setFaForm({...faForm, class: e.target.value})} />
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs text-zinc-500 uppercase font-bold">学号</label>
                            <input required placeholder="Student ID" className="w-full bg-black border border-zinc-700 p-3 text-white focus:border-cyan-500 outline-none rounded-sm font-mono" value={faForm.studentId} onChange={e => setFaForm({...faForm, studentId: e.target.value})} />
                        </div>
                    </div>
                    <div className="space-y-1">
                        <label className="text-xs text-zinc-500 uppercase font-bold">天梯分数 (Elo)</label>
                        <input required type="number" placeholder="完美平台分数" className="w-full bg-black border border-zinc-700 p-3 text-white focus:border-cyan-500 outline-none rounded-sm font-mono" value={faForm.score} onChange={e => setFaForm({...faForm, score: e.target.value})} />
                    </div>
                    <div className="space-y-1">
                        <label className="text-xs text-zinc-500 uppercase font-bold">联系方式</label>
                        <input required placeholder="QQ / WeChat" className="w-full bg-black border border-zinc-700 p-3 text-white focus:border-cyan-500 outline-none rounded-sm font-mono" value={faForm.contact} onChange={e => setFaForm({...faForm, contact: e.target.value})} />
                    </div>
                    <div className="space-y-1">
                        <label className="text-xs text-zinc-500 uppercase font-bold">擅长位置</label>
                        <select className="w-full bg-black border border-zinc-700 p-3 text-zinc-300 focus:border-cyan-500 outline-none rounded-sm" value={faForm.role} onChange={e => setFaForm({...faForm, role: e.target.value})}>
                            <option>Rifler</option><option>AWP</option><option>IGL</option><option>Entry</option><option>Support</option>
                        </select>
                    </div>
                    
                    <button className="w-full bg-cyan-600 hover:bg-cyan-500 text-white font-bold py-3 uppercase flex items-center justify-center shadow-[0_4px_0_rgb(8,145,178)] active:translate-y-[2px] active:shadow-none mt-6 rounded-sm transition-all">
                        {myAgent ? '更新个人信息' : '发布求组信息'}
                    </button>
                </form>
            </div>
            
            {/* 右侧：散人列表 (也需要过滤) */}
            <div className="lg:col-span-2">
                <h3 className="text-xl font-black text-white mb-4 uppercase flex items-center">
                    <User className="mr-2 text-cyan-500"/> 寻找队伍的选手
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {freeAgents
                      .filter(a => a.tournamentId === selectedTourId) // 只显示当前赛事的散人
                      .map(agent => (
                        <div key={agent.id} className={`bg-zinc-900 p-4 border-l-2 flex justify-between items-center group transition-colors ${user && agent.ownerId === user.id ? 'border-yellow-500 bg-zinc-800' : 'border-cyan-500 hover:bg-zinc-800'}`}>
                            <div>
                            <div className="font-bold text-white text-lg flex items-center">
                                {agent.name} 
                                {user && agent.ownerId === user.id && <span className="ml-2 text-[10px] bg-yellow-500 text-black px-1.5 py-0.5 rounded font-bold">YOU</span>}
                            </div>
                            <div className="text-xs text-zinc-500 mt-1 flex items-center gap-2">
                                <span className="bg-zinc-800 px-1.5 rounded border border-zinc-700 text-zinc-400">{agent.role}</span>
                                <span className="font-mono text-cyan-400">{agent.score} Elo</span>
                            </div>
                            </div>
                            <div className="text-right">
                            <div className="text-cyan-400 text-sm font-mono bg-cyan-900/20 px-2 py-1 rounded border border-cyan-900/50">{agent.contact}</div>
                            </div>
                        </div>
                    ))}
                </div>
                {freeAgents.filter(a => a.tournamentId === selectedTourId).length === 0 && (
                    <div className="text-zinc-500 text-center py-10 bg-zinc-900/30 rounded border border-zinc-800 border-dashed">
                        该赛事暂无散人玩家登记，快来发布第一条吧！
                    </div>
                )}
            </div>
        </div>
      )}
      </>
      )}
    </div>
  );
}