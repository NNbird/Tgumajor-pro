import React, { useState, useEffect } from 'react';
import { useLeague } from '../../context/LeagueContext';
import { Trophy, Save, Lock, Unlock, Play, CheckCircle, RefreshCw, Calendar, Trash2, Users, Eye, Plus, X, AlertTriangle, EyeOff } from 'lucide-react';

export default function PickemManager() {
    const { tournaments } = useLeague();
    
    // --- 状态管理 ---
    const [existingEvents, setExistingEvents] = useState([]); 
    const [eventData, setEventData] = useState(null); // 当前选中的详情
    
    // 初始化表单
    const [initForm, setInitForm] = useState({ 
        tourId: '', 
        stageId: '', 
        teamsStr: '', 
        deadline: '', 
        type: 'SWISS' // 默认瑞士轮
    });
    
    const [loading, setLoading] = useState(false);
    
    // 本地比分缓存 { matchId: { scoreA: 13, scoreB: 5 } }
    const [localScores, setLocalScores] = useState({});
    
    // 用户预测查看弹窗状态
    const [showUserPicks, setShowUserPicks] = useState(null); // eventId
    const [userPicksList, setUserPicksList] = useState([]);

    // --- 1. 页面加载时自动拉取列表 ---
    useEffect(() => {
        fetchEventsList();
    }, []);

    const fetchEventsList = async () => {
        try {
            const res = await fetch('/api/pickem/list');
            const json = await res.json();
            if (json.success) {
                setExistingEvents(json.events);
            }
        } catch (e) { console.error("无法连接到数据库 API"); }
    };

    // --- 加载详情 ---
    const loadEvent = async (id) => {
        setLoading(true);
        try {
            const res = await fetch(`/api/pickem/event/${id}`);
            const data = await res.json();
            setEventData(data);
            
            // 初始化本地比分缓存
            const initialScores = {};
            data.matches.forEach(m => {
                initialScores[m.id] = { scoreA: m.scoreA, scoreB: m.scoreB };
            });
            setLocalScores(initialScores);
        } catch (e) { alert("加载详情失败"); }
        setLoading(false);
    };

    // --- 初始化竞猜逻辑 ---
    const handleInit = async () => {
        if (!initForm.tourId || !initForm.stageId) return alert("请先选择赛事和阶段");
        if (!initForm.teamsStr.trim()) return alert("请输入战队名单");
        
        const teams = initForm.teamsStr.split('\n').map(t => t.trim()).filter(t => t);
        
        // 校验队伍数量
        if (initForm.type === 'SWISS' && teams.length !== 16) return alert("瑞士轮必须录入 16 支队伍！");
        if (initForm.type === 'SINGLE_ELIM' && teams.length !== 8) return alert("单败淘汰赛必须录入 8 支队伍！");

        if(!confirm(`确认初始化吗？\n赛制: ${initForm.type}\n队伍: ${teams.length} 支`)) return;

        setLoading(true);
        try {
            const res = await fetch('/api/pickem/init', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    tournamentId: initForm.tourId,
                    stageId: initForm.stageId,
                    type: initForm.type,
                    teams,
                    deadline: initForm.deadline
                })
            });
            const json = await res.json();
            if (json.success) {
                alert('初始化成功！');
                fetchEventsList(); // 刷新左侧列表
                loadEvent(json.eventId); // 自动进入详情
                setInitForm({ ...initForm, teamsStr: '' }); // 清空输入框
            } else {
                alert('失败: ' + json.error);
            }
        } catch (e) { alert('网络错误'); }
        setLoading(false);
    };

    // --- 切换可见性 (隐藏/显示) ---
    const toggleVisibility = async (e, evt) => {
        e.stopPropagation();
        const newVis = !evt.isVisible;
        try {
            const res = await fetch('/api/pickem/event/visibility', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({ eventId: evt.id, isVisible: newVis })
            });
            if((await res.json()).success) {
                // 乐观更新列表状态
                setExistingEvents(prev => prev.map(item => item.id === evt.id ? { ...item, isVisible: newVis } : item));
            }
        } catch(err) { alert("操作失败"); }
    };

    // --- 删除竞猜逻辑 ---
    const handleDeleteEvent = async (e, id) => {
        e.stopPropagation(); 
        if (!confirm("⚠️ 危险操作：确定要删除这个竞猜活动吗？\n所有战队数据、对阵记录、用户预测都将永久丢失！")) return;
        
        try {
            const res = await fetch(`/api/pickem/event/${id}`, { method: 'DELETE' });
            const json = await res.json();
            if (json.success) {
                alert("已删除");
                if (eventData?.event?.id === id) setEventData(null);
                fetchEventsList(); 
            } else {
                alert("删除失败");
            }
        } catch (e) { alert("网络错误"); }
    };

    // --- 锁定/解锁竞猜 ---
    const toggleLockStatus = async () => {
        if (!eventData) return;
        const currentStatus = eventData.event.status;
        const newStatus = currentStatus === 'LOCKED' ? 'OPEN' : 'LOCKED';
        
        const actionName = newStatus === 'LOCKED' ? '锁定' : '开启';
        if (!confirm(`确定要【${actionName}】当前阶段的竞猜吗？\n\n锁定后：用户将无法修改作业。\n开启后：用户可以继续提交/修改作业。`)) return;

        try {
            const res = await fetch('/api/pickem/event/status', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ eventId: eventData.event.id, status: newStatus })
            });
            if ((await res.json()).success) {
                loadEvent(eventData.event.id); // 刷新状态
                alert(`已${actionName}`);
            }
        } catch (e) { alert("操作失败"); }
    };

    // --- 本地输入处理 ---
    const handleLocalScoreChange = (matchId, team, val) => {
        setLocalScores(prev => ({
            ...prev,
            [matchId]: {
                ...prev[matchId],
                [team === 'A' ? 'scoreA' : 'scoreB']: parseInt(val) || 0
            }
        }));
    };

    // --- 提交比分 ---
    const submitScore = async (matchId) => {
        const scores = localScores[matchId];
        if (!scores) return;

        try {
            const res = await fetch('/api/pickem/match/update', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    matchId, 
                    scoreA: scores.scoreA, 
                    scoreB: scores.scoreB 
                })
            });
            const json = await res.json();
            if (json.success) {
                loadEvent(eventData.event.id); 
            } else {
                alert("提交失败: " + (json.error || "未知错误"));
            }
        } catch (e) { alert("网络错误"); }
    };

    // --- 生成下一轮 ---
    const handleGenerateRound = async (nextRound) => {
        if (!confirm(`⚠️ 确认生成第 ${nextRound} 轮对阵吗？\n\n生成后上一轮比分将锁定！`)) return;
        setLoading(true);
        try {
            const res = await fetch('/api/pickem/generate-round', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ eventId: eventData.event.id, nextRound })
            });
            const json = await res.json();
            if (json.success) {
                alert(`操作成功！`);
                loadEvent(eventData.event.id);
            } else {
                alert('操作失败: ' + json.error);
            }
        } catch (e) { alert('错误'); }
        setLoading(false);
    };

    // --- 查看用户预测 ---
    const loadUserPicks = async (eventId) => {
        setShowUserPicks(eventId);
        try {
            const res = await fetch(`/api/pickem/admin/user-picks/${eventId}`);
            const json = await res.json();
            if (json.success) setUserPicksList(json.picks);
        } catch (e) { alert("获取作业失败"); }
    };

    // --- 辅助函数 ---
    const getTourName = (tid) => tournaments.find(t => t.id === tid)?.name || tid;
    const getStageName = (tid, sid) => tournaments.find(t => t.id === tid)?.stages.find(s => s.id === sid)?.name || sid;
    
    const matchesByRound = eventData?.matches.reduce((acc, m) => {
        if (!acc[m.round]) acc[m.round] = [];
        acc[m.round].push(m);
        return acc;
    }, {}) || {};

    const idToName = (ids) => {
        if (!ids || !eventData?.teams) return '-';
        let idArray = [];
        try {
            idArray = typeof ids === 'string' ? JSON.parse(ids) : ids;
        } catch(e) { idArray = [ids]; }
        if (!Array.isArray(idArray)) idArray = [idArray];

        return idArray.map(id => {
            const t = eventData.teams.find(team => team.id === id);
            return t ? t.name : 'Unknown';
        }).join(', ');
    };

    const maxRound = eventData ? Math.max(...eventData.matches.map(m => m.round)) : 0;

    return (
        <div className="space-y-8 animate-in fade-in p-4 relative pb-20">
            
            {/* 1. 顶部控制台 */}
            <div className="bg-zinc-900 p-6 rounded-xl border border-zinc-800">
                <h3 className="text-white font-bold mb-4 flex items-center gap-2">
                    <RefreshCw className="text-cyan-500" size={20}/> 竞猜活动管理
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* 左侧：列表 */}
                    <div>
                        <h4 className="text-xs text-zinc-500 font-bold uppercase mb-2">已创建的竞猜 ({existingEvents.length})</h4>
                        <div className="flex flex-col gap-2 bg-zinc-950 p-2 rounded border border-zinc-800 max-h-60 overflow-y-auto custom-scrollbar">
                            {existingEvents.map(evt => (
                                <div key={evt.id} className="flex items-center gap-2 group">
                                    <button 
                                        onClick={() => loadEvent(evt.id)}
                                        className={`flex-1 text-left px-3 py-2 text-xs rounded border flex justify-between items-center transition-colors ${eventData?.event?.id === evt.id ? 'bg-yellow-900/20 border-yellow-500 text-yellow-500' : 'bg-zinc-900 border-zinc-700 text-zinc-300 hover:border-zinc-500'}`}
                                    >
                                        <span className="truncate">{getTourName(evt.tournamentId)} - {getStageName(evt.tournamentId, evt.stageId)}</span>
                                        <div className="flex items-center gap-2">
                                            {/* 隐藏/显示按钮 */}
                                            <div onClick={(e) => toggleVisibility(e, evt)} className={`p-1 rounded cursor-pointer ${evt.isVisible ? 'text-green-500' : 'text-zinc-600'}`} title={evt.isVisible ? "当前可见 (点击隐藏)" : "当前隐藏 (点击显示)"}>
                                                {evt.isVisible ? <Eye size={14}/> : <EyeOff size={14}/>}
                                            </div>
                                            <span className={`px-1.5 py-0.5 rounded text-[10px] ${evt.status === 'OPEN' ? 'bg-green-900 text-green-400' : 'bg-zinc-800 text-zinc-500'}`}>{evt.status}</span>
                                        </div>
                                    </button>
                                    
                                    <button onClick={(e) => handleDeleteEvent(e, evt.id)} className="p-2 bg-zinc-900 border border-zinc-700 rounded text-zinc-600 hover:text-red-500 hover:border-red-500 transition-colors">
                                        <Trash2 size={14}/>
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* 右侧：新建 */}
                    <div className="border-l border-zinc-800 pl-8">
                        <h4 className="text-xs text-zinc-500 font-bold uppercase mb-4 flex items-center gap-2"><Plus size={12}/> 初始化新阶段</h4>
                        <div className="space-y-4">
                            
                            {/* 赛制选择 */}
                            <div className="flex gap-4">
                                <label className={`flex items-center gap-2 text-xs p-2 rounded border cursor-pointer ${initForm.type === 'SWISS' ? 'bg-yellow-500/20 border-yellow-500 text-yellow-500' : 'border-zinc-700 text-zinc-400'}`}>
                                    <input type="radio" name="format" checked={initForm.type === 'SWISS'} onChange={() => setInitForm({...initForm, type: 'SWISS'})} className="hidden"/>
                                    <div className={`w-3 h-3 rounded-full border ${initForm.type === 'SWISS' ? 'bg-yellow-500 border-yellow-500' : 'border-zinc-500'}`}></div>
                                    瑞士轮 (16队)
                                </label>
                                <label className={`flex items-center gap-2 text-xs p-2 rounded border cursor-pointer ${initForm.type === 'SINGLE_ELIM' ? 'bg-cyan-500/20 border-cyan-500 text-cyan-500' : 'border-zinc-700 text-zinc-400'}`}>
                                    <input type="radio" name="format" checked={initForm.type === 'SINGLE_ELIM'} onChange={() => setInitForm({...initForm, type: 'SINGLE_ELIM'})} className="hidden"/>
                                    <div className={`w-3 h-3 rounded-full border ${initForm.type === 'SINGLE_ELIM' ? 'bg-cyan-500 border-cyan-500' : 'border-zinc-500'}`}></div>
                                    单败淘汰 (8队)
                                </label>
                            </div>

                            <div className="flex gap-2">
                                <select className="bg-black border border-zinc-700 text-white p-2 rounded text-xs w-1/2 outline-none"
                                    value={initForm.tourId}
                                    onChange={e => setInitForm({...initForm, tourId: e.target.value})}>
                                    <option value="">1. 选择赛事...</option>
                                    {tournaments.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                                </select>
                                <select className="bg-black border border-zinc-700 text-white p-2 rounded text-xs w-1/2 outline-none"
                                    value={initForm.stageId}
                                    onChange={e => setInitForm({...initForm, stageId: e.target.value})}>
                                    <option value="">2. 选择阶段...</option>
                                    {tournaments.find(t=>t.id===initForm.tourId)?.stages.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}
                                </select>
                            </div>
                            
                            <div className="flex flex-col gap-1">
                                <label className="text-[10px] text-zinc-500 font-bold uppercase">截止时间</label>
                                <input type="datetime-local" className="w-full bg-black border border-zinc-700 text-white p-2 rounded text-xs outline-none" value={initForm.deadline} onChange={e => setInitForm({...initForm, deadline: e.target.value})} />
                            </div>
                            
                            <textarea 
                                className="w-full h-24 bg-black border border-zinc-700 text-white p-2 rounded text-xs font-mono outline-none focus:border-yellow-500"
                                placeholder={`3. 粘贴战队名单 (一行一个，需 ${initForm.type === 'SWISS' ? 16 : 8} 支)...`}
                                value={initForm.teamsStr}
                                onChange={e => setInitForm({...initForm, teamsStr: e.target.value})}
                            />
                            <button onClick={handleInit} disabled={loading} className="w-full bg-cyan-600 hover:bg-cyan-500 text-white py-2 rounded text-xs font-bold transition-colors flex items-center justify-center">
                                {loading ? <RefreshCw className="animate-spin mr-2" size={14}/> : null}
                                {loading ? '处理中...' : '初始化新竞猜'}
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* 2. 详情操作面板 */}
            {eventData && (
                <div className="bg-zinc-900 p-6 rounded-xl border border-zinc-800 space-y-6 animate-in slide-in-from-bottom-4">
                    
                    <div className="flex justify-between items-end border-b border-zinc-800 pb-4">
                        <div className="flex flex-col gap-2">
                            <h2 className="text-xl font-black text-white flex items-center gap-2">
                                {getTourName(eventData.event.tournamentId)} <span className="text-zinc-600">/</span> {getStageName(eventData.event.tournamentId, eventData.event.stageId)}
                            </h2>
                            <div className="flex items-center gap-3 text-xs text-zinc-500 font-mono">
                                <span className="bg-black px-2 py-1 rounded border border-zinc-800">ID: {eventData.event.id}</span>
                                <span className="bg-black px-2 py-1 rounded border border-zinc-800 text-blue-500 font-bold">{eventData.event.type}</span>
                                <div className="flex items-center gap-2 bg-zinc-950 px-2 py-0.5 rounded border border-zinc-800">
                                    <span className="text-yellow-600 font-bold">截止:</span>
                                    <input type="datetime-local" className="bg-transparent text-white text-[10px] outline-none w-32 font-sans" defaultValue={eventData.event.deadline ? new Date(eventData.event.deadline).toISOString().slice(0,16) : ''} onBlur={async (e) => { if(!e.target.value) return; if(!confirm("修改截止时间？")) return; await fetch('/api/pickem/event/update-deadline', { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({ eventId: eventData.event.id, deadline: e.target.value }) }); }} />
                                </div>
                            </div>
                        </div>
                        <div className="flex gap-3 items-center">
                            <button onClick={toggleLockStatus} className={`px-4 py-2 rounded text-xs font-bold flex items-center shadow-lg transition-all ${eventData.event.status === 'LOCKED' ? 'bg-red-600' : 'bg-green-600'} text-white`}>
                                {eventData.event.status === 'LOCKED' ? <Lock size={14} className="mr-2"/> : <Unlock size={14} className="mr-2"/>}
                                {eventData.event.status === 'LOCKED' ? '已锁定' : '进行中'}
                            </button>
                            <button onClick={() => loadUserPicks(eventData.event.id)} className="bg-blue-600 hover:bg-blue-500 text-white px-3 py-2 rounded text-xs font-bold flex items-center shadow-lg"><Users size={14} className="mr-2"/> 查看玩家作业</button>
                        </div>
                    </div>

                    {/* 对阵列表 */}
                    <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                        {Object.keys(matchesByRound).sort((a,b)=>b-a).map(round => {
                            const isLockedRound = parseInt(round) !== maxRound;
                            return (
                                <div key={round} className={`bg-zinc-950 border ${isLockedRound ? 'border-zinc-800 opacity-60' : 'border-yellow-500/30'} rounded-lg overflow-hidden transition-all`}>
                                    <div className="bg-black/50 p-3 border-b border-zinc-800 text-white text-sm font-bold flex justify-between items-center"><span>Round {round}</span><span className="text-[10px] text-zinc-500">{matchesByRound[round].length} 场</span></div>
                                    <div className="p-3 space-y-2">
                                        {matchesByRound[round].map(m => {
                                            const tA = eventData.teams.find(t => t.id === m.teamAId);
                                            const tB = eventData.teams.find(t => t.id === m.teamBId);
                                            const scores = localScores[m.id] || { scoreA: m.scoreA, scoreB: m.scoreB };
                                            return (
                                                <div key={m.id} className={`flex items-center justify-between p-2 rounded border transition-colors ${m.isFinished ? 'bg-zinc-900/50 border-green-900/30' : 'bg-zinc-900 border-zinc-700 hover:border-yellow-500/30'}`}>
                                                    <div className="w-24 text-right text-xs truncate text-zinc-300 font-bold">{tA?.name}</div>
                                                    <div className="flex items-center gap-1">
                                                        <input type="number" disabled={isLockedRound} value={scores.scoreA} onChange={(e) => handleLocalScoreChange(m.id, 'A', e.target.value)} className={`w-8 h-8 text-center bg-black border ${isLockedRound ? 'border-zinc-800 text-zinc-600' : 'border-zinc-600 text-white focus:border-yellow-500'} rounded outline-none`} />
                                                        <span className="text-zinc-600">:</span>
                                                        <input type="number" disabled={isLockedRound} value={scores.scoreB} onChange={(e) => handleLocalScoreChange(m.id, 'B', e.target.value)} className={`w-8 h-8 text-center bg-black border ${isLockedRound ? 'border-zinc-800 text-zinc-600' : 'border-zinc-600 text-white focus:border-yellow-500'} rounded outline-none`} />
                                                        {!isLockedRound && <button onClick={() => submitScore(m.id)} className={`ml-2 p-1.5 rounded transition-colors ${m.isFinished ? 'bg-zinc-800 text-zinc-500' : 'bg-green-600 text-white shadow-lg'}`} title="确认">{m.isFinished ? <RefreshCw size={12}/> : <CheckCircle size={12}/>}</button>}
                                                    </div>
                                                    <div className="w-24 text-left text-xs truncate text-zinc-300 font-bold">{tB?.name}</div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                    <div className="flex justify-end pt-4 border-t border-zinc-800">
                         {eventData.event.status === 'FINISHED' ? (
                            <div className="flex items-center text-green-500 font-bold bg-green-900/20 px-4 py-2 rounded border border-green-500/30">
                                <CheckCircle size={18} className="mr-2"/> 赛事已结算
                            </div>
                        ) : (
                            <button onClick={() => handleGenerateRound(Object.keys(matchesByRound).length + 1)} className="bg-green-600 hover:bg-green-500 text-white px-8 py-3 rounded font-black uppercase tracking-widest shadow-lg flex items-center animate-pulse"><Play size={18} className="mr-2 fill-white"/> {Object.keys(matchesByRound).length >= 5 ? '结算最终成绩' : '生成下一轮'}</button>
                        )}
                    </div>
                </div>
            )}

            {/* 3. 用户预测弹窗 (优化版：区分瑞士轮/单败) */}
            {showUserPicks && (
                <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 animate-in zoom-in-95 backdrop-blur-sm">
                    <div className="bg-zinc-900 border border-zinc-700 w-full max-w-5xl p-0 rounded-lg shadow-2xl max-h-[80vh] flex flex-col overflow-hidden">
                        <div className="flex justify-between items-center p-4 border-b border-zinc-800 bg-zinc-950">
                            <h3 className="text-white font-bold text-lg flex items-center">
                                <Eye size={18} className="mr-2 text-blue-500"/> 
                                玩家作业公示 <span className="ml-2 text-xs bg-zinc-800 text-zinc-400 px-2 py-0.5 rounded">{eventData.event.type}</span>
                            </h3>
                            <button onClick={() => setShowUserPicks(null)} className="text-zinc-500 hover:text-white p-2 rounded hover:bg-zinc-800"><X size={20}/></button>
                        </div>
                        
                        <div className="flex-1 overflow-y-auto custom-scrollbar p-4">
                            <table className="w-full text-left text-xs text-zinc-300 border-collapse">
                                <thead className="bg-zinc-950 text-zinc-500 uppercase font-bold sticky top-0 z-10">
                                    <tr>
                                        <th className="p-3 border-b border-zinc-800">User</th>
                                        {eventData.event.type === 'SWISS' ? (
                                            <>
                                                <th className="p-3 border-b border-zinc-800 w-1/4">3-0 Picks</th>
                                                <th className="p-3 border-b border-zinc-800 w-1/4">0-3 Picks</th>
                                                <th className="p-3 border-b border-zinc-800 w-1/3">Advance Picks</th>
                                            </>
                                        ) : (
                                            <>
                                                <th className="p-3 border-b border-zinc-800 w-1/4">Quarter Finals</th>
                                                <th className="p-3 border-b border-zinc-800 w-1/4">Semi Finals</th>
                                                <th className="p-3 border-b border-zinc-800 w-1/4">Champion</th>
                                            </>
                                        )}
                                        <th className="p-3 border-b border-zinc-800 text-center">Correct</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-zinc-800/50">
                                    {userPicksList.map(p => {
                                        // --- 1. 单败数据解析 & 实时计算 ---
                                        let quarters = [], semis = [], champ = '';
                                        let liveCorrectCount = 0; // 实时正确数

                                        if (eventData.event.type === 'SINGLE_ELIM' && p.bracketPicks) {
                                            // A. 解析展示数据
                                            quarters = [p.bracketPicks.S1_Top, p.bracketPicks.S1_Bot, p.bracketPicks.S2_Top, p.bracketPicks.S2_Bot].filter(Boolean);
                                            semis = [p.bracketPicks.F1_Top, p.bracketPicks.F1_Bot].filter(Boolean);
                                            champ = p.bracketPicks.Champion;

                                            // B. 实时计算正确数 (不依赖数据库旧值)
                                            const checkWin = (slotId, matchGroup) => {
                                                const m = eventData.matches.find(x => x.matchGroup === matchGroup);
                                                // 必须比赛结束且胜者ID匹配
                                                return m?.isFinished && m.winnerId && String(m.winnerId) === String(p.bracketPicks[slotId]);
                                            };

                                            // 统计 8进4 (4场)
                                            if (checkWin('S1_Top', 'Q1')) liveCorrectCount++;
                                            if (checkWin('S1_Bot', 'Q2')) liveCorrectCount++;
                                            if (checkWin('S2_Top', 'Q3')) liveCorrectCount++;
                                            if (checkWin('S2_Bot', 'Q4')) liveCorrectCount++;

                                            // 统计 半决赛 (2场)
                                            if (checkWin('F1_Top', 'S1')) liveCorrectCount++;
                                            if (checkWin('F1_Bot', 'S2')) liveCorrectCount++;

                                            // 统计 冠军 (1场)
                                            if (checkWin('Champion', 'F1')) liveCorrectCount++;
                                        
                                        } else if (eventData.event.type === 'SWISS') {
                                            // 瑞士轮也可以加实时计算，或者直接用 correctCount
                                            // 为了统一，这里暂时沿用 correctCount，因为瑞士轮计算复杂(涉及3-0/0-3/adv)
                                            // 如果需要，也可以把前端 PickEm.jsx 里的 checkTeamStatus 逻辑搬过来
                                            liveCorrectCount = p.correctCount; 
                                        }

                                        return (
                                            <tr key={p.id} className="hover:bg-zinc-800/30 transition-colors">
                                                <td className="p-3 font-bold text-white">{p.userName}</td>
                                                
                                                {eventData.event.type === 'SWISS' ? (
                                                    <>
                                                        <td className="p-3 text-green-400 font-bold">{idToName(p.pick30)}</td>
                                                        <td className="p-3 text-red-400 font-bold">{idToName(p.pick03)}</td>
                                                        <td className="p-3 text-blue-300">{idToName(p.pickAdvance)}</td>
                                                    </>
                                                ) : (
                                                    <>
                                                        <td className="p-3 text-zinc-400 text-xs" title="4强预测">{idToName(quarters)}</td>
                                                        <td className="p-3 text-blue-400 font-bold text-xs" title="决赛预测">{idToName(semis)}</td>
                                                        <td className="p-3 text-yellow-500 font-black text-xs" title="冠军预测">
                                                            {champ ? (
                                                                <span className="flex items-center gap-1"><Trophy size={12}/> {idToName(champ)}</span>
                                                            ) : '-'}
                                                        </td>
                                                    </>
                                                )}
                                                
                                                <td className="p-3 font-black text-center text-green-500 text-sm bg-green-900/10">
                                                    {/* [修改] 优先显示实时计算值 */}
                                                    {liveCorrectCount}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                            {userPicksList.length === 0 && (
                                <div className="p-12 text-center text-zinc-600 flex flex-col items-center">
                                    <Users size={32} className="mb-2 opacity-50"/>
                                    暂无玩家提交作业
                                </div>
                            )}
                        </div>
                        
                        <div className="p-3 border-t border-zinc-800 bg-zinc-950 text-right">
                            <button onClick={() => setShowUserPicks(null)} className="px-4 py-2 bg-white text-black font-bold rounded text-xs hover:bg-zinc-200">关闭</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}