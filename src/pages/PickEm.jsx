import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useLeague } from '../context/LeagueContext';
import { DndContext, DragOverlay, useDraggable, useDroppable, closestCenter, useSensor, useSensors, MouseSensor, TouchSensor } from '@dnd-kit/core';
import { 
  Trophy, Lock, Save, CheckCircle2, Activity, Shield, AlertTriangle, 
  Loader2, Clock, X as XIcon, Eye, EyeOff, ChevronDown, ListOrdered,
  BarChart3, Maximize2, Search 
} from 'lucide-react';


// ==========================================
// 1. 排行榜 & 弹窗组件
// ==========================================

const UserPicksDetailModal = ({ targetUser, eventData, onClose }) => {
    const { event, teams, matches } = eventData;
    const isSwiss = event.type === 'SWISS';
    const isDoubleElim16 = event.type === 'DOUBLE_ELIM_16';
    const getName = (id) => teams.find(t => String(t.id) === String(id))?.name || '-';

    const checkWin = (pickId, type, slotId) => {
        if (!pickId) return false;
        if (isSwiss || isDoubleElim16) {
            const t = teams.find(x => String(x.id) === String(pickId));
            if (!t) return false;
            if (isSwiss) {
                if (type === '3-0') return t.wins === 3 && t.losses === 0;
                if (type === '0-3') return t.wins === 0 && t.losses === 3;
                if (type === 'adv') return t.status === 'ADVANCED';
            } else {
                if (type === '2-0') return t.wins === 2 && t.losses === 0;
                if (type === '0-2') return t.wins === 0 && t.losses === 2;
                if (type === 'adv') return t.status === 'ADVANCED';
            }
        } else {
            const slotMap = { 'S1_Top':'Q1', 'S1_Bot':'Q2', 'S2_Top':'Q3', 'S2_Bot':'Q4', 'F1_Top':'S1', 'F1_Bot':'S2', 'Champion':'F1' };
            const mg = slotMap[slotId];
            const m = matches.find(x => x.matchGroup === mg);
            return m?.isFinished && String(m.winnerId) === String(pickId);
        }
        return false;
    };

    return (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm animate-in fade-in">
            <div className="bg-zinc-900 border border-zinc-700 w-full max-w-2xl rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh]">
                <div className="p-4 border-b border-zinc-800 flex justify-between items-center bg-zinc-950">
                    <h3 className="text-white font-bold flex items-center gap-2"><Activity size={18} className="text-yellow-500"/> {targetUser.name} 的作业</h3>
                    <button onClick={onClose}><XIcon size={20} className="text-zinc-500 hover:text-white"/></button>
                </div>
                <div className="p-6 overflow-y-auto custom-scrollbar">
                    {isSwiss || isDoubleElim16 ? (
                        <div className="space-y-6">
                            <div>
                                <h4 className="text-xs text-zinc-500 font-bold uppercase mb-2">
                                    {isSwiss ? '3-0 Undefeated' : '2-0 Undefeated'}
                                </h4>
                                <div className="flex gap-2">
                                    {targetUser.pick30?.map(id => (
                                        <div key={id} className={`px-3 py-1.5 rounded border text-xs font-bold ${checkWin(id, isSwiss ? '3-0' : '2-0') ? 'bg-green-900/30 border-green-500 text-green-400' : 'bg-zinc-800 border-zinc-700 text-zinc-300'}`}>
                                            {getName(id)}
                                        </div>
                                    ))}
                                </div>
                            </div>
                            <div>
                                <h4 className="text-xs text-zinc-500 font-bold uppercase mb-2">
                                    {isSwiss ? '0-3 Eliminated' : '0-2 Eliminated'}
                                </h4>
                                <div className="flex gap-2">
                                    {targetUser.pick03?.map(id => (
                                        <div key={id} className={`px-3 py-1.5 rounded border text-xs font-bold ${checkWin(id, isSwiss ? '0-3' : '0-2') ? 'bg-green-900/30 border-green-500 text-green-400' : 'bg-zinc-800 border-zinc-700 text-zinc-300'}`}>
                                            {getName(id)}
                                        </div>
                                    ))}
                                </div>
                            </div>
                            <div>
                                <h4 className="text-xs text-zinc-500 font-bold uppercase mb-2">Advancing</h4>
                                <div className="grid grid-cols-3 gap-2">
                                    {targetUser.pickAdvance?.map(id => (
                                        <div key={id} className={`px-3 py-1.5 rounded border text-xs font-bold ${checkWin(id, 'adv') ? 'bg-green-900/30 border-green-500 text-green-400' : 'bg-zinc-800 border-zinc-700 text-zinc-300'}`}>
                                            {getName(id)}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {['S1_Top','S1_Bot','S2_Top','S2_Bot','F1_Top','F1_Bot','Champion'].map(slot => {
                                const id = targetUser.bracketPicks?.[slot];
                                if(!id) return null;
                                const isWin = checkWin(id, null, slot);
                                let label = slot.startsWith('F') ? 'Semi Final' : slot==='Champion' ? 'Champion' : 'Quarter Final';
                                return (
                                    <div key={slot} className={`flex justify-between items-center p-3 rounded border ${isWin ? 'bg-green-900/20 border-green-500/30' : 'bg-zinc-800/50 border-zinc-700'}`}>
                                        <span className="text-xs text-zinc-500 uppercase font-bold">{label}</span>
                                        <span className={`text-sm font-bold ${isWin ? 'text-green-400' : 'text-zinc-300'}`}>{getName(id)}</span>
                                    </div>
                                )
                            })}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

const LeaderboardModal = ({ leaderboard, onClose, onShowDetail }) => (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-in zoom-in-95">
        <div className="bg-zinc-950 border border-zinc-800 w-full max-w-3xl rounded-xl shadow-2xl flex flex-col max-h-[80vh]">
            <div className="p-5 border-b border-zinc-800 flex justify-between items-center">
                <h3 className="text-xl font-black text-white flex items-center uppercase italic"><BarChart3 className="mr-3 text-yellow-500"/> 竞猜排行榜</h3>
                <button onClick={onClose}><XIcon size={24} className="text-zinc-500 hover:text-white"/></button>
            </div>
            <div className="flex-1 overflow-y-auto custom-scrollbar p-2">
                <table className="w-full text-left border-collapse">
                    <thead className="text-[10px] text-zinc-500 uppercase font-bold bg-zinc-900/50 sticky top-0"><tr><th className="p-3 text-center w-16">Rank</th><th className="p-3">Player</th><th className="p-3 text-center">Correct</th><th className="p-3 text-right">Action</th></tr></thead>
                    <tbody className="text-sm divide-y divide-zinc-800/50">
                        {leaderboard.map((user, idx) => (
                            <tr key={idx} className="hover:bg-zinc-900 transition-colors group">
                                <td className="p-3 text-center font-mono text-zinc-500">{idx+1}</td>
                                <td className="p-3 font-bold text-white">{user.name}</td>
                                <td className="p-3 text-center"><span className="bg-green-900/30 text-green-400 px-2 py-0.5 rounded font-mono font-bold border border-green-500/30">{user.score}</span></td>
                                <td className="p-3 text-right"><button onClick={() => onShowDetail(user)} className="text-xs text-zinc-500 hover:text-cyan-400 underline decoration-zinc-700 hover:decoration-cyan-400 underline-offset-4">查看详情</button></td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    </div>
);

const LeaderboardWidget = ({ leaderboard, onExpand, onShowDetail }) => {
    const top5 = leaderboard.slice(0, 5);
    return (
        <div className="flex-1 flex flex-col border-t border-zinc-800/50 bg-black/20 overflow-hidden">
            <div className="p-4 border-b border-zinc-800/50 flex justify-between items-center bg-zinc-900/50">
                <h4 className="text-[10px] font-black text-zinc-400 uppercase tracking-wider flex items-center gap-2"><BarChart3 size={12}/> Leaderboard</h4>
                <button onClick={onExpand} className="text-zinc-500 hover:text-white transition-colors"><Maximize2 size={12}/></button>
            </div>
            <div className="flex-1 overflow-y-auto p-2 space-y-1 custom-scrollbar">
                {top5.map((user, idx) => (
                    <div key={idx} className="flex items-center justify-between p-2 rounded hover:bg-zinc-800/50 group cursor-default">
                        <div className="flex items-center gap-3 overflow-hidden">
                            <div className={`w-5 h-5 flex items-center justify-center rounded text-[10px] font-black font-mono ${idx===0?'bg-yellow-500 text-black':idx===1?'bg-zinc-400 text-black':idx===2?'bg-orange-700 text-white':'bg-zinc-800 text-zinc-500'}`}>{idx+1}</div>
                            <span className="text-xs font-bold text-zinc-300 truncate">{user.name}</span>
                        </div>
                        <div className="flex items-center gap-3"><span className="text-xs font-mono font-bold text-green-500">{user.score}</span><button onClick={() => onShowDetail(user)} className="opacity-0 group-hover:opacity-100 text-[10px] text-zinc-500 hover:text-cyan-400 transition-opacity"><Search size={12}/></button></div>
                    </div>
                ))}
                {leaderboard.length === 0 && <div className="text-center text-[10px] text-zinc-600 py-4">暂无数据</div>}
            </div>
        </div>
    );
};

// ==========================================
// 2. 通用 UI 组件
// ==========================================

const CountdownTimer = ({ deadline }) => {
    const [timeLeft, setTimeLeft] = useState('');
    useEffect(() => {
        if (!deadline) return setTimeLeft('');
        const timer = setInterval(() => {
            const now = new Date();
            const end = new Date(deadline);
            const diff = end - now;
            if (diff <= 0) { setTimeLeft('LOCKED'); clearInterval(timer); }
            else {
                const d = Math.floor(diff / (1000 * 60 * 60 * 24));
                const h = Math.floor((diff / (1000 * 60 * 60)) % 24);
                const m = Math.floor((diff / 1000 / 60) % 60);
                setTimeLeft(`${d}D ${h}H ${m}M`);
            }
        }, 1000);
        return () => clearInterval(timer);
    }, [deadline]);
    if (!timeLeft || timeLeft === 'LOCKED') return <span className="text-red-500 font-bold text-xs border border-red-500/30 px-2 py-0.5 rounded bg-red-900/10">LOCKED</span>;
    return <div className="flex items-center gap-1.5 text-[10px] font-mono bg-yellow-900/10 px-2 py-0.5 rounded border border-yellow-500/20 text-yellow-500 font-bold"><Clock size={10}/> {timeLeft}</div>;
};

const LeftSidebar = ({ coinLevel, tasks, leaderboard, onExpandLeaderboard, onShowUserDetail }) => {
    const colors = { BRONZE: 'border-orange-700 text-orange-600 bg-orange-900/10', SILVER: 'border-zinc-400 text-zinc-300 bg-zinc-800/30', GOLD: 'border-yellow-500 text-yellow-500 bg-yellow-900/10', DIAMOND: 'border-cyan-400 text-cyan-400 bg-cyan-900/10 shadow-[0_0_15px_rgba(34,211,238,0.2)]' };
    const total = tasks.reduce((a, g) => a + g.items.length, 0);
    const done = tasks.reduce((a, g) => a + g.items.filter(i => i.completed).length, 0);

    return (
        <div className="h-full flex flex-col bg-zinc-950/80 backdrop-blur-md border-r border-zinc-800/50 w-64 shrink-0">
            <div className="p-6 border-b border-zinc-800/50 flex flex-col items-center gap-3 bg-zinc-900/80">
                <div className="relative group">
                    <div className={`w-20 h-20 rounded-full border-4 flex items-center justify-center transition-all shadow-2xl ${colors[coinLevel] || colors.BRONZE}`}>
                        <Trophy size={32} strokeWidth={2} />
                    </div>
                    <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-black px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-wider border border-zinc-800 text-white">{coinLevel}</div>
                </div>
                <div className="w-full mt-3 text-center">
                    <div className="flex justify-between text-[9px] text-zinc-500 uppercase font-bold mb-1 px-4"><span>Progress</span><span>{done} / {total}</span></div>
                    <div className="w-3/4 mx-auto h-1.5 bg-zinc-800 rounded-full overflow-hidden"><div className="h-full bg-green-500 transition-all duration-500" style={{width: total > 0 ? `${(done/total)*100}%` : '0%'}}></div></div>
                </div>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-6 custom-scrollbar min-h-0">
                {tasks.map((group, idx) => (
                    <div key={idx}>
                        <div className="text-[10px] font-black text-zinc-500 uppercase mb-2 pl-2 border-l-2 border-zinc-700">{group.title}</div>
                        <div className="space-y-1">
                            {group.items.map((t, i) => (
                                <div key={i} className={`text-[9px] p-2 rounded border flex items-start gap-2 ${t.completed ? 'bg-green-900/10 border-green-500/20 text-zinc-300' : 'bg-zinc-900/30 border-zinc-800 text-zinc-600'}`}>
                                    <div className={`w-3 h-3 rounded-full border flex items-center justify-center ${t.completed ? 'bg-green-500 border-green-500' : 'border-zinc-600'}`}>{t.completed && <CheckCircle2 size={8} className="text-black"/>}</div>
                                    <span>{t.desc}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
            </div>
            <LeaderboardWidget leaderboard={leaderboard} onExpand={onExpandLeaderboard} onShowDetail={onShowUserDetail} />
        </div>
    );
};

// ==================== 2. 瑞士轮 (SWISS) 组件 ====================

const DraggableTeam = ({ team, isUsed, isLocked }) => {
    const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: team.id, data: { ...team, type: 'swiss' }, disabled: isLocked });
    const style = transform ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`, zIndex: 999 } : undefined;
    if (isDragging) return <div ref={setNodeRef} className="h-8 bg-zinc-800/30 border-dashed border-zinc-600 rounded opacity-50" />;
    return (
        <div ref={setNodeRef} style={style} {...listeners} {...attributes} className={`p-1.5 rounded flex items-center gap-2 group transition-all border shadow-sm ${isUsed ? 'bg-zinc-950 border-zinc-800 opacity-50 grayscale cursor-default' : 'bg-black/40 border-zinc-700 hover:border-yellow-500/50 cursor-grab active:cursor-grabbing hover:bg-zinc-800'}`}>
             <div className={`w-4 h-4 flex items-center justify-center text-[8px] font-mono rounded ${isUsed ? 'bg-zinc-900 text-zinc-600' : 'bg-zinc-800 text-zinc-400'}`}>{team.seed}</div>
             <div className={`w-5 h-5 flex items-center justify-center text-[8px] font-black rounded border ${isUsed ? 'bg-zinc-900 text-zinc-600 border-zinc-800' : 'bg-zinc-900 text-zinc-500 group-hover:text-yellow-500 border-zinc-800'}`}>{team.name.substring(0,1).toUpperCase()}</div>
             <span className="text-[10px] font-bold truncate">{team.name}</span>
             {isUsed && <CheckCircle2 size={10} className="ml-auto text-green-900"/>}
        </div>
    );
};

const SeedList = ({ teams, usedIds, isLocked }) => {
    const sortedTeams = [...teams].sort((a, b) => a.seed - b.seed);
    return (
        <div className="w-48 flex flex-col h-full border-r border-zinc-800/50 bg-zinc-900/30">
            <div className="h-9 flex items-center justify-between px-3 border-b border-zinc-800/50 bg-zinc-900/80 backdrop-blur text-[10px] font-bold text-zinc-400 uppercase tracking-wider sticky top-0 z-10"><span>Seed Pool</span> <span>{teams.length}</span></div>
            <div className="flex-1 overflow-y-auto p-2 space-y-1 custom-scrollbar">
                {sortedTeams.map(t => { const isUsed = usedIds.includes(t.id); return <DraggableTeam key={t.id} team={t} isUsed={isUsed} isLocked={isLocked}/>; })}
            </div>
        </div>
    );
};

const SwissBracket = ({ matches, teams, userPicks, showUserPicks, type }) => {
    const isDoubleElim16 = type === 'DOUBLE_ELIM_16';
    const getTeam = (id) => teams.find(t => t.id === id) || { name: 'TBD', id: 'tbd' };
    const scrollRef = useRef(null);
    const [isDown, setIsDown] = useState(false);
    const [startX, setStartX] = useState(0);
    const [scrollLeft, setScrollLeft] = useState(0);
    const handleMouseDown = (e) => { setIsDown(true); setStartX(e.pageX - scrollRef.current.offsetLeft); setScrollLeft(scrollRef.current.scrollLeft); scrollRef.current.style.cursor = 'grabbing'; };
    const handleMouseLeave = () => { setIsDown(false); if(scrollRef.current) scrollRef.current.style.cursor = 'grab'; };
    const handleMouseUp = () => { setIsDown(false); if(scrollRef.current) scrollRef.current.style.cursor = 'grab'; };
    const handleMouseMove = (e) => { if (!isDown) return; e.preventDefault(); const x = e.pageX - scrollRef.current.offsetLeft; const walk = (x - startX) * 2; scrollRef.current.scrollLeft = scrollLeft - walk; };

    // [修复] 瑞士轮检查逻辑：遍历 userPicks 的值，而不是 keys
    const checkUserPick = (match) => {
        if (!showUserPicks || !userPicks || !match.isFinished) return null;
        const winnerId = match.winnerId;
        // userPicks 是 { "30_1": teamObj, "03_1": teamObj } 的结构
        // 我们需要把所有选中的 teamObj 的 ID 拿出来
        const allPickIds = Object.values(userPicks).map(team => String(team.id));
        if (allPickIds.includes(String(winnerId))) return 'CORRECT';
        return null;
    };
    const getMatchesByGroup = (round, group) => matches.filter(m => m.round === round && m.matchGroup === group);
    
    const MatchCard = ({ match }) => {
        const tA = getTeam(match.teamAId);
        const tB = getTeam(match.teamBId);
        const userResult = checkUserPick(match);
        return (
            <div className="flex flex-col bg-zinc-900/90 border border-zinc-700/60 rounded-md overflow-hidden text-[10px] w-full relative hover:border-yellow-500/50 transition-colors shadow-md group select-none shrink-0">
                {userResult === 'CORRECT' && <div className="absolute top-0 right-0 bg-green-500 text-black p-0.5 z-10 rounded-bl"><CheckCircle2 size={8}/></div>}
                <div className={`flex justify-between px-2 py-1.5 items-center ${match.winnerId === tA.id ? 'bg-gradient-to-r from-green-500/10 to-transparent' : ''}`}><span className={`truncate font-bold max-w-[80%] ${match.winnerId === tA.id ? 'text-green-400' : 'text-zinc-300'}`}>{tA.name}</span><span className="font-mono text-zinc-500">{match.isFinished ? match.scoreA : ''}</span></div>
                <div className="h-px bg-zinc-800 w-full"></div>
                <div className={`flex justify-between px-2 py-1.5 items-center ${match.winnerId === tB.id ? 'bg-gradient-to-r from-green-500/10 to-transparent' : ''}`}><span className={`truncate font-bold max-w-[80%] ${match.winnerId === tB.id ? 'text-green-400' : 'text-zinc-300'}`}>{tB.name}</span><span className="font-mono text-zinc-500">{match.isFinished ? match.scoreB : ''}</span></div>
            </div>
        );
    };
    const RoundColumn = ({ round, groups, title }) => (
        <div className="flex flex-col h-full min-w-[160px] flex-1 max-w-[240px] shrink-0">
            <div className="text-[9px] font-black text-zinc-500 uppercase text-center py-2 sticky top-0 z-10 bg-gradient-to-b from-black via-black to-transparent mb-2 select-none border-b border-zinc-800/50">{title}</div>
            <div className="flex flex-col gap-4 px-2 h-full overflow-y-auto custom-scrollbar pb-10 justify-center">
                {groups.map(g => {
                    const ms = getMatchesByGroup(round, g);
                    if(ms.length === 0) return null;
                    let groupName = g === '0-0' ? 'Opening' : `${g.replace('-', ':')}`;
                    return (<div key={g} className="flex flex-col gap-1.5"><div className="flex items-center gap-2 px-1 select-none"><div className="h-px bg-zinc-800 flex-1"></div><div className="text-[8px] font-bold text-zinc-600 uppercase tracking-wider">{groupName}</div><div className="h-px bg-zinc-800 flex-1"></div></div>{ms.map(m => <MatchCard key={m.id} match={m} />)}</div>)
                })}
            </div>
        </div>
    );
    return (
        <div ref={scrollRef} className="flex h-full w-full overflow-x-auto px-4 gap-6 items-stretch bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] bg-fixed cursor-grab active:cursor-grabbing no-scrollbar" onMouseDown={handleMouseDown} onMouseLeave={handleMouseLeave} onMouseUp={handleMouseUp} onMouseMove={handleMouseMove}>
            <RoundColumn round={1} groups={['0-0']} title="Round 1" /><div className="w-px bg-white/5 h-[80%] self-center shrink-0 opacity-50"></div>
            <RoundColumn round={2} groups={['1-0', '0-1']} title="Round 2" /><div className="w-px bg-white/5 h-[80%] self-center shrink-0 opacity-50"></div>
            <RoundColumn round={3} groups={['2-0', '1-1', '0-2']} title="Round 3" />
            {!isDoubleElim16 && (
                <>
                    <div className="w-px bg-white/5 h-[80%] self-center shrink-0 opacity-50"></div>
                    <RoundColumn round={4} groups={['2-1', '1-2']} title="Round 4" /><div className="w-px bg-white/5 h-[80%] self-center shrink-0 opacity-50"></div>
                    <RoundColumn round={5} groups={['2-2']} title="Round 5" />
                </>
            )}
            <div className="w-4 shrink-0"></div>
        </div>
    );
};

const DropSlot = ({ id, label, team, onRemove, type, eventType, isFinished, realTeamStats, isCheckingHomework }) => {
    const { setNodeRef, isOver } = useDroppable({ id, disabled: isFinished });
    let resultStatus = null; 
    if (isCheckingHomework && isFinished && team && realTeamStats) {
        const stats = realTeamStats.find(t => t.id === team.id);
        if (stats) {
            if (eventType === 'SWISS') {
                if (type === '3-0') resultStatus = (stats.wins === 3 && stats.losses === 0) ? 'CORRECT' : 'WRONG';
                else if (type === '0-3') resultStatus = (stats.wins === 0 && stats.losses === 3) ? 'CORRECT' : 'WRONG';
                else if (type === 'adv') resultStatus = (stats.status === 'ADVANCED') ? 'CORRECT' : 'WRONG';
            } else if (eventType === 'DOUBLE_ELIM_16') {
                if (type === '3-0') resultStatus = (stats.wins === 2 && stats.losses === 0) ? 'CORRECT' : 'WRONG'; // 这里的 type 名字复用，逻辑改 2-0
                else if (type === '0-3') resultStatus = (stats.wins === 0 && stats.losses === 2) ? 'CORRECT' : 'WRONG'; // 逻辑改 0-2
                else if (type === 'adv') resultStatus = (stats.status === 'ADVANCED') ? 'CORRECT' : 'WRONG';
            }
        }
    }
    let borderColor = 'border-zinc-800/60', bgColor = 'bg-black/20', textColor = 'text-zinc-600';
    if (resultStatus === 'CORRECT') { borderColor = 'border-green-500/50'; bgColor = 'bg-green-900/10'; textColor = 'text-green-500'; }
    else if (resultStatus === 'WRONG') { borderColor = 'border-red-500/50'; bgColor = 'bg-red-900/10'; textColor = 'text-red-500'; }
    else if (isOver) { borderColor = 'border-yellow-500/50'; bgColor = 'bg-yellow-500/10'; }
    else if (team) { borderColor = 'border-zinc-700'; bgColor = 'bg-zinc-900'; }
    return (
        <div ref={setNodeRef} className={`relative h-16 rounded-lg border-2 transition-all flex flex-col items-center justify-center p-1 group ${borderColor} ${bgColor}`}>
            {!team && <span className={`absolute top-1 left-1.5 text-[8px] font-black uppercase tracking-widest opacity-60 ${textColor}`}>{label}</span>}
            {isCheckingHomework && resultStatus === 'CORRECT' && <div className="absolute -top-2 -right-2 bg-green-500 text-black rounded-full p-0.5 shadow-lg z-20 animate-in zoom-in"><CheckCircle2 size={10} /></div>}
            {isCheckingHomework && resultStatus === 'WRONG' && <div className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-0.5 shadow-lg z-20 animate-in zoom-in"><XIcon size={10} /></div>}
            {team ? (
                <div className="w-full h-full flex items-center justify-between px-2 gap-2 relative animate-in zoom-in-95 duration-200">
                    <div className="w-6 h-6 bg-zinc-800 rounded flex items-center justify-center border border-zinc-700 shrink-0">
                        <span className="text-[9px] font-black text-white">{team.name.substring(0,1).toUpperCase()}</span>
                    </div>
                    <span className={`text-[10px] font-bold truncate w-full text-left ${resultStatus === 'CORRECT' ? 'text-green-400' : 'text-zinc-300'}`}>{team.name}</span>
                    {!isFinished && <button onClick={() => onRemove(id)} className="absolute top-0 right-0 text-zinc-500 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity p-1"><XIcon size={12} /></button>}
                </div>
            ) : <div className="opacity-10"><Shield size={20} /></div>}
        </div>
    );
};

// ==========================================
// 3. 单败淘汰 (BRACKET) 组件
// ==========================================

const DraggableCard = ({ id, text, disabled, isCorrect, isWrong, isSource, isFromSlot = false, slotId, isSelected, onCardClick }) => {
    const uniqueId = isFromSlot ? `slot-${slotId}-${id}` : `src-${id}`;
    
    const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ 
        id: uniqueId, 
        data: { 
            id, 
            text, 
            type: 'bracket', 
            isFromSlot,
            slotId: isFromSlot ? slotId : null,
            sourceId: isFromSlot ? null : id
        },
        disabled 
    });
    
    const style = transform ? { 
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`, 
        zIndex: 999,
        transition: 'transform 0.2s ease-out'
    } : undefined;
    
    if (isDragging) {
        return (
            <div ref={setNodeRef} className="w-32 h-10 bg-yellow-500/10 border-2 border-dashed border-yellow-500/50 rounded opacity-70 animate-pulse" />
        );
    }
    
    let borderClass = "border-zinc-700";
    let textClass = "text-zinc-300";
    let bgClass = "bg-zinc-900";
    
    if (isCorrect) { 
        borderClass = "border-green-500"; 
        textClass = "text-green-400"; 
        bgClass = "bg-green-900/20";
    }
    if (isWrong) { 
        borderClass = "border-red-500"; 
        textClass = "text-red-400"; 
        bgClass = "bg-red-900/20";
    }
    
    if (isSource || isFromSlot) {
        borderClass = "border-zinc-600 hover:border-yellow-500 hover:shadow-[0_0_15px_rgba(234,179,8,0.3)] hover:bg-zinc-800 transition-all duration-200";
        bgClass = isFromSlot ? "bg-zinc-800 hover:bg-zinc-700" : "bg-zinc-800 hover:bg-zinc-700";
    }

    // [新增] 选中状态样式
    if (isSelected) {
        borderClass = "border-yellow-400 ring-2 ring-yellow-500 ring-offset-2 ring-offset-black z-50";
        bgClass = "bg-yellow-500/20";
        textClass = "text-white font-black scale-105";
    }

    return (
        <div ref={setNodeRef} style={style} {...listeners} {...attributes} 
             onClick={(e) => {
                 if(onCardClick && !disabled) {
                     e.stopPropagation(); 
                     onCardClick(id); 
                 }
             }}
             className={`w-20 lg:w-32 h-8 lg:h-10 ${bgClass} border ${borderClass} flex items-center justify-center text-[8px] lg:text-[10px] font-bold ${textClass} rounded shadow-sm select-none relative transition-all duration-200 ${!disabled ? 'cursor-grab active:cursor-grabbing' : 'cursor-default'} ${isSelected ? 'animate-pulse' : ''}`}>
            {text}
            {isCorrect && <div className="absolute -top-1 -right-1 bg-green-500 text-black rounded-full p-0.5 animate-bounce"><CheckCircle2 size={8}/></div>}
            {isWrong && <div className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full p-0.5 animate-pulse"><XIcon size={8}/></div>}
            {!isFromSlot && !isSource && (
                <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-r from-transparent via-yellow-500/5 to-transparent animate-pulse"></div>
            )}
        </div>
    );
};

const BracketDropZone = ({ id, children, placeholder, disabled, onRemove, isOver: externalIsOver = false, onZoneClick, isHighlight }) => {
    const { setNodeRef, isOver } = useDroppable({ 
        id, 
        disabled 
    });
    
    const combinedIsOver = isOver || externalIsOver;
    const highlightClass = isHighlight ? "border-yellow-500 bg-yellow-500/10 shadow-[0_0_15px_rgba(234,179,8,0.3)] cursor-pointer" : "";
    
    return (
        <div ref={setNodeRef} 
            onClick={() => { if(onZoneClick && !disabled) onZoneClick(id); }}
            className={`w-20 lg:w-32 h-8 lg:h-10 border-2 rounded flex items-center justify-center relative transition-all duration-200 group ${combinedIsOver ? 'border-yellow-500 bg-yellow-500/10 scale-105 shadow-lg shadow-yellow-500/20' : 'border-zinc-800 bg-black/40'} ${highlightClass}`}>
            
            {children ? children : <span className="text-[8px] lg:text-[9px] text-zinc-600 uppercase font-bold">{placeholder}</span>}
            
            {/* ... 删除按钮逻辑不变 ... */}
            {children && !disabled && (
                <button 
                    onMouseDown={(e) => { e.stopPropagation(); e.preventDefault(); onRemove(id); }} 
                    className="absolute -top-2 -right-2 bg-zinc-800 text-zinc-500 hover:text-red-500 rounded-full p-1 opacity-0 group-hover:opacity-100 transition-all duration-200 z-20 shadow-md border border-zinc-700 hover:scale-110"
                >
                    <XIcon size={10}/>
                </button>
            )}
            
            {/* 左侧连接线适配 */}
            <div className="absolute -left-2 lg:-left-4 top-1/2 w-2 lg:w-4 h-px bg-zinc-800"></div>
        </div>
    );
};

const BracketStage = ({ eventData, userPicks, handleRemoveBracketPick, isLocked, isFinished, showMyPicks, mobileSelectedId, onTeamClick, onSlotClick }) => {
    const { matches, teams } = eventData;
    const picks = userPicks.bracketPicks || {};
    const [activeDragSlot, setActiveDragSlot] = useState(null);

    const getTeam = (id) => teams.find(t => String(t.id) === String(id));
    
    const getRealWinner = (matchGroup) => {
        const m = matches.find(m => m.matchGroup === matchGroup);
        return m?.isFinished ? String(m.winnerId) : null;
    };

    const getMatchGroupForSlot = (slotId) => {
        const slotToGroup = {
            'S1_Top': 'Q1', 'S1_Bot': 'Q2',
            'S2_Top': 'Q3', 'S2_Bot': 'Q4',
            'F1_Top': 'S1', 'F1_Bot': 'S2',
            'Champion': 'F1'
        };
        return slotToGroup[slotId];
    };

    const renderCardContent = (slotId, placeholder) => {
        const matchGroup = getMatchGroupForSlot(slotId);
        
        if (isFinished && !showMyPicks) {
            const winnerId = getRealWinner(matchGroup);
            if (winnerId) {
                const t = getTeam(winnerId);
                return <div className="text-green-500 font-bold text-[10px] tracking-widest uppercase animate-pulse">{t?.name}</div>;
            }
            return <span className="text-[9px] text-zinc-700 uppercase font-bold">{placeholder}</span>;
        }
        
        const pickId = picks[slotId];
        if (pickId) {
            const t = getTeam(pickId);
            if (!t) return <span className="text-[9px] text-zinc-600 uppercase font-bold">{placeholder}</span>;
            
            const realWinner = getRealWinner(matchGroup);
            const isCorrect = isFinished && showMyPicks && realWinner === String(pickId);
            const isWrong = isFinished && showMyPicks && realWinner && realWinner !== String(pickId);
            
            return (
                <DraggableCard 
                    id={pickId} 
                    text={t.name} 
                    disabled={isLocked} 
                    isCorrect={isCorrect}
                    isWrong={isWrong}
                    isSource={true}
                    isFromSlot={true}
                    slotId={slotId}
                    isSelected={mobileSelectedId === String(pickId)} // 判断是否被选中
                    onCardClick={onTeamClick} // 传入点击函数
                />
            );
        }
        return <span className="text-[9px] text-zinc-600 uppercase font-bold">{placeholder}</span>;
    };

    const renderQuarterMatch = (groupId, seeds) => {
        const match = matches.find(m => m.matchGroup === groupId);
        let tA, tB;
        
        if (match) {
            tA = getTeam(match.teamAId); 
            tB = getTeam(match.teamBId);
        } else {
            const sorted = [...teams].sort((a,b) => a.seed - b.seed);
            tA = sorted[seeds[0]-1]; 
            tB = sorted[seeds[1]-1];
        }
        
        if (!tA || !tB) return <div className="h-24 flex items-center justify-center text-xs text-zinc-700">Pending...</div>;

        const teamAIdStr = String(tA.id);
        const teamBIdStr = String(tB.id);
        
        const pickEntries = Object.entries(picks);
        
        const isUsedInSemiOrHigherA = pickEntries.some(([slotId, teamId]) => 
            String(teamId) === teamAIdStr && 
            (slotId.startsWith('S') || slotId.startsWith('F') || slotId === 'Champion')
        );
        
        const isUsedInSemiOrHigherB = pickEntries.some(([slotId, teamId]) => 
            String(teamId) === teamBIdStr && 
            (slotId.startsWith('S') || slotId.startsWith('F') || slotId === 'Champion')
        );

        return (
            <div className="flex flex-col gap-3 justify-center h-32 relative group">
                <DraggableCard 
                    id={tA.id} 
                    text={tA.name} 
                    disabled={isLocked || isUsedInSemiOrHigherA}
                    isSource={true}
                    isSelected={mobileSelectedId === String(tA.id)}
                    onCardClick={onTeamClick}
                />
                <div className="absolute -right-8 top-1/2 -translate-y-1/2 w-8 h-full flex items-center opacity-50 group-hover:opacity-100 transition-opacity">
                    <div className="w-4 h-full border-r border-t border-b border-zinc-700 rounded-r-sm"></div>
                    <div className="w-4 h-px bg-zinc-700"></div>
                </div>
                <DraggableCard 
                    id={tB.id} 
                    text={tB.name} 
                    disabled={isLocked || isUsedInSemiOrHigherB}
                    isSource={true}
                    isSelected={mobileSelectedId === String(tB.id)}
                    onCardClick={onTeamClick}
                />
            </div>
        );
    };

    const checkHover = (slotId) => {
        return activeDragSlot === slotId;
    };

    const handleDragStart = (event) => {
        const { active } = event;
        const slotId = active.data.current?.slotId;
        if (slotId) {
            setActiveDragSlot(slotId);
        }
    };

    const handleDragEnd = () => {
        setActiveDragSlot(null);
    };

    return (
        // 1. 外层容器：改为左对齐或居中，内边距减小 (p-2 lg:p-10)
        <div className="flex-1 flex items-stretch justify-center p-2 lg:p-10 overflow-x-auto min-w-max bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] bg-fixed">
            
            {/* 1. Quarter Finals (4 Groups) */}
            {/* 修改：mr-2 lg:mr-8 (减小右边距) */}
            <div className="flex flex-col justify-around mr-2 lg:mr-8">
                <div className="text-center text-zinc-500 text-[8px] lg:text-[10px] font-bold mb-4 uppercase tracking-widest">Quarter Finals</div>
                {renderQuarterMatch('Q1', [1,8])}
                {renderQuarterMatch('Q2', [4,5])}
                {renderQuarterMatch('Q3', [3,6])}
                {renderQuarterMatch('Q4', [2,7])}
            </div>

            {/* 2. Semi Finals (2 Groups) */}
            {/* 修改：mr-2 lg:mr-8, pt-4 lg:pt-8 */}
            <div className="flex flex-col justify-around mr-2 lg:mr-8 pt-4 lg:pt-8">
                <div className="text-center text-zinc-500 text-[8px] lg:text-[10px] font-bold -mt-8 uppercase tracking-widest">Semi Finals</div>
                
                {/* S1 区域 */}
                <div className="flex flex-col gap-3 h-64 justify-center relative">
                    <BracketDropZone id="S1_Top" onRemove={handleRemoveBracketPick} disabled={isLocked} isOver={checkHover('S1_Top')} onZoneClick={onSlotClick} isHighlight={!!mobileSelectedId}>
                        {renderCardContent('S1_Top', 'Winner Q1')}
                    </BracketDropZone>
                    
                    {/* 连接线适配：-right-2 lg:-right-8, w-2 lg:w-8 */}
                    <div className="absolute -right-2 lg:-right-8 top-1/2 -translate-y-1/2 w-2 lg:w-8 h-full flex items-center">
                        <div className="w-1 lg:w-4 h-full border-r border-t border-b border-zinc-700 rounded-r-sm"></div>
                        <div className="w-1 lg:w-4 h-px bg-zinc-700"></div>
                    </div>

                    <BracketDropZone id="S1_Bot" onRemove={handleRemoveBracketPick} disabled={isLocked} isOver={checkHover('S1_Bot')} onZoneClick={onSlotClick} isHighlight={!!mobileSelectedId}>
                        {renderCardContent('S1_Bot', 'Winner Q2')}
                    </BracketDropZone>
                </div>

                {/* S2 区域 */}
                <div className="flex flex-col gap-3 h-64 justify-center relative">
                    <BracketDropZone id="S2_Top" onRemove={handleRemoveBracketPick} disabled={isLocked} isOver={checkHover('S2_Top')} onZoneClick={onSlotClick} isHighlight={!!mobileSelectedId}>
                        {renderCardContent('S2_Top', 'Winner Q3')}
                    </BracketDropZone>

                    {/* 连接线适配 */}
                    <div className="absolute -right-2 lg:-right-8 top-1/2 -translate-y-1/2 w-2 lg:w-8 h-full flex items-center">
                        <div className="w-1 lg:w-4 h-full border-r border-t border-b border-zinc-700 rounded-r-sm"></div>
                        <div className="w-1 lg:w-4 h-px bg-zinc-700"></div>
                    </div>

                    <BracketDropZone id="S2_Bot" onRemove={handleRemoveBracketPick} disabled={isLocked} isOver={checkHover('S2_Bot')} onZoneClick={onSlotClick} isHighlight={!!mobileSelectedId}>
                        {renderCardContent('S2_Bot', 'Winner Q4')}
                    </BracketDropZone>
                </div>
            </div>

            {/* 3. Grand Final (1 Group) */}
            {/* 修改：mr-2 lg:mr-8 */}
            <div className="flex flex-col justify-center mr-2 lg:mr-8 pt-4 lg:pt-8">
                <div className="text-center text-yellow-500 text-[8px] lg:text-[10px] font-bold -mt-8 uppercase tracking-widest">Grand Final</div>
                <div className="flex flex-col gap-3 h-[500px] justify-center relative">
                    <BracketDropZone id="F1_Top" onRemove={handleRemoveBracketPick} disabled={isLocked} isOver={checkHover('F1_Top')} onZoneClick={onSlotClick} isHighlight={!!mobileSelectedId}>
                        {renderCardContent('F1_Top', 'Semi Winner 1')}
                    </BracketDropZone>
                    
                    <div className="text-center">
                        <div className="text-lg lg:text-2xl font-black text-yellow-500 italic animate-pulse">VS</div>
                        {/* 中间线适配：-right-2 lg:-right-8, w-2 lg:w-8 */}
                        <div className="absolute -right-2 lg:-right-8 top-1/2 -translate-y-1/2 w-2 lg:w-8 h-px bg-yellow-500/50 group-hover:bg-yellow-500 transition-colors"></div>
                    </div>

                    <BracketDropZone id="F1_Bot" onRemove={handleRemoveBracketPick} disabled={isLocked} isOver={checkHover('F1_Bot')} onZoneClick={onSlotClick} isHighlight={!!mobileSelectedId}>
                        {renderCardContent('F1_Bot', 'Semi Winner 2')}
                    </BracketDropZone>
                </div>
            </div>

            {/* 4. Champion */}
            <div className="flex flex-col justify-center pt-4 lg:pt-8">
                <div className="text-center text-yellow-400 text-[8px] lg:text-[10px] font-bold -mt-8 uppercase tracking-widest animate-pulse">Champion</div>
                {/* 奖杯容器适配：p-2 lg:p-8 */}
                <div className="border-4 border-yellow-500/20 p-2 lg:p-8 rounded-full bg-gradient-to-b from-yellow-900/20 to-transparent relative group hover:border-yellow-500/40 transition-colors">
                    {/* 奖杯图标适配：w-8 h-8 lg:w-16 lg:h-16 */}
                    <Trophy className="text-yellow-500 mb-2 lg:mb-6 mx-auto drop-shadow-[0_0_25px_rgba(234,179,8,0.6)] group-hover:scale-110 transition-transform duration-300 w-8 h-8 lg:w-16 lg:h-16" />
                    <BracketDropZone id="Champion" onRemove={handleRemoveBracketPick} disabled={isLocked} isOver={checkHover('Champion')} onZoneClick={onSlotClick} isHighlight={!!mobileSelectedId}>
                        {renderCardContent('Champion', 'WINNER')}
                    </BracketDropZone>
                </div>
            </div>

        </div>
    );
};


// ==================== 4. 主页面 ====================
export default function PickEm() {
    const { user, tournaments } = useLeague();
    const [loading, setLoading] = useState(true);
    
    const [selectedTourId, setSelectedTourId] = useState('');
    const [selectedStageId, setSelectedStageId] = useState('');
    const [isTourDropdownOpen, setIsTourDropdownOpen] = useState(false);

    const [allStagesData, setAllStagesData] = useState([]); 
    const [currentEventData, setCurrentEventData] = useState(null); 
    const [userPicks, setUserPicks] = useState({}); 
    const [submitting, setSubmitting] = useState(false);
    const [showMyPicks, setShowMyPicks] = useState(false); 
    const [activeDragId, setActiveDragId] = useState(null);
    // --- [新增] 移动端点选模式状态 ---
    const [mobileSelectedId, setMobileSelectedId] = useState(null); // 当前选中的战队ID

    // [新增] 处理战队点击 (选中/取消)
    const handleTeamClick = (teamId) => {
        if (isLocked || isFinished) return;
        // 如果点击已选中的，则取消选中；否则选中新的
        setMobileSelectedId(prev => prev === String(teamId) ? null : String(teamId));
    };

    // [新增] 处理槽位点击 (填入逻辑)
    const handleSlotClick = (slotId) => {
        if (!mobileSelectedId || isLocked || isFinished) return;
        
        // 调用通用的放置逻辑 (模拟拖拽结束的数据结构)
        // 我们直接复用 handleDragEnd 的核心逻辑，或者在这里手动执行更新
        // 为了安全起见，我们直接调用一个专门的更新函数
        executePickUpdate(mobileSelectedId, slotId);
        
        // 填入后自动取消选中，体验更好
        setMobileSelectedId(null);
    };

    // [新增] 核心更新逻辑 (从 handleDragEnd 提取或重写，适配两种模式)
    const executePickUpdate = (rawTeamId, slotId) => {
        if (!currentEventData) return;
        const teamId = String(rawTeamId).replace(/^(src-|pick-)/, ''); // 清理ID前缀
        
        // --- A. 单败淘汰赛逻辑 (Bracket) ---
        if (currentEventData.event.type === 'SINGLE_ELIM') {
            const matches = currentEventData.matches;
            const bracketPicks = userPicks.bracketPicks || {};
            const getPick = (sid) => String(bracketPicks[sid] || '');

            let isValid = false;
            
            // 验证规则 (直接复制原 handleDragEnd 的验证逻辑)
            if (['S1_Top', 'S1_Bot', 'S2_Top', 'S2_Bot'].includes(slotId)) {
                const groupMap = { 'S1_Top':'Q1', 'S1_Bot':'Q2', 'S2_Top':'Q3', 'S2_Bot':'Q4' };
                const match = matches.find(m => m.matchGroup === groupMap[slotId]);
                if (match) isValid = (teamId === String(match.teamAId) || teamId === String(match.teamBId));
            }
            else if (slotId === 'F1_Top') isValid = (teamId === getPick('S1_Top') || teamId === getPick('S1_Bot'));
            else if (slotId === 'F1_Bot') isValid = (teamId === getPick('S2_Top') || teamId === getPick('S2_Bot'));
            else if (slotId === 'Champion') isValid = (teamId === getPick('F1_Top') || teamId === getPick('F1_Bot'));

            if (!isValid) return; // 验证不通过，不执行

            setUserPicks(prev => {
                const newBracket = { ...(prev.bracketPicks || {}), [slotId]: teamId };
                // 级联清除逻辑 (复制原 handleDragEnd)
                if (slotId.includes('S1')) { 
                    if (newBracket['F1_Top'] !== teamId) delete newBracket['F1_Top'];
                    if (!newBracket['F1_Top']) delete newBracket['Champion']; // 链式清理
                    if (newBracket['Champion'] === getPick('F1_Top')) delete newBracket['Champion']; 
                }
                if (slotId.includes('S2')) { 
                    if (newBracket['F1_Bot'] !== teamId) delete newBracket['F1_Bot'];
                    if (!newBracket['F1_Bot']) delete newBracket['Champion'];
                }
                if (slotId.includes('F1')) {
                     if (newBracket['Champion'] !== teamId) delete newBracket['Champion'];
                }
                return { ...prev, bracketPicks: newBracket };
            });
        } 
        // --- B. 瑞士轮逻辑 (Swiss) ---
        else {
            // 瑞士轮简单很多，直接填
            const team = currentEventData.teams.find(t => String(t.id) === teamId);
            if(!team) return;

            const existingKey = Object.keys(userPicks).find(k => String(userPicks[k]?.id) === String(teamId));
            const newPicks = { ...userPicks };
            if (existingKey) delete newPicks[existingKey];
            newPicks[slotId] = team; 
            setUserPicks(newPicks);
        }
    };
    
    // 排行榜相关状态
    const [leaderboard, setLeaderboard] = useState([]);
    const [showLeaderboardFull, setShowLeaderboardFull] = useState(false);
    const [detailUser, setDetailUser] = useState(null);
    
    // 在组件内部添加这个函数
const parseJsonArray = (data) => {
    if (!data) return [];
    if (Array.isArray(data)) return data;
    try {
        return JSON.parse(data);
    } catch (e) {
        console.error("解析 JSON 失败:", e);
        return [];
    }
};
    
    // [新增] 1. 刷新左侧任务栏数据
    const fetchTournamentData = async () => {
        if(!selectedTourId) return;
        try {
            const res = await fetch(`/api/pickem/tournament-view?tournamentId=${selectedTourId}&userId=${user?.id}`);
            const json = await res.json();
            if(json.success) setAllStagesData(json.events);
        } catch(e) {}
    };

// [修改] 更新排行榜函数
const updateLeaderboard = async () => {
    if (!selectedStageId) {
        console.log("updateLeaderboard: 缺少 selectedStageId", selectedStageId);
        setLeaderboard([]);
        return;
    }
    
    console.log(`📊 正在获取阶段 ${selectedStageId} 的排行榜数据...`);
    
    try {
        const response = await fetch(`/api/pickem/stage-picks/${selectedStageId}`);
        
        if (!response.ok) {
            console.error(`❌ HTTP 错误! 状态码: ${response.status}`);
            setLeaderboard([]);
            return;
        }
        
        const data = await response.json();
        console.log("📥 排行榜 API 响应:", data);
        
        if (data.success && Array.isArray(data.picks)) {
            console.log(`✅ 找到 ${data.picks.length} 条排行榜数据`);
            
            if (data.picks.length > 0) {
                console.log("📊 排行榜示例数据:", data.picks[0]);
                console.log("总任务完成数:", data.picks[0].score);
            }
            
            setLeaderboard(data.picks); // API 已经排好序
        } else {
            console.warn("⚠️ 排行榜 API 返回数据格式不正确");
            setLeaderboard([]);
        }
    } catch (error) {
        console.error("❌ 获取排行榜失败:", error);
        setLeaderboard([]);
    }
};

// 在组件中添加调试按钮（可选）
const testLeaderboard = async () => {
    console.log("=== 排行榜调试信息 ===");
    console.log("当前阶段 ID:", selectedStageId);
    console.log("当前事件数据:", currentEventData);
    console.log("排行榜状态:", leaderboard);
    
    // 手动调用 API 测试
    if (selectedStageId) {
        try {
            const response = await fetch(`/api/pickem/stage-picks/${selectedStageId}`);
            const data = await response.json();
            console.log("API 原始响应:", data);
        } catch (error) {
            console.error("测试 API 失败:", error);
        }
    }
};
    // [修复 1] 初始化选中赛事
    useEffect(() => {
        if (tournaments.length > 0 && !selectedTourId) {
            setSelectedTourId(tournaments[0].id);
        }
    }, [tournaments, selectedTourId]);
    
        
    // [修复 2] 加载赛事阶段数据 - 增加 finally 确保 loading 结束
    useEffect(() => {
        if (!selectedTourId) return;
        
        const loadTournamentData = async () => {
            try {
                setLoading(true); // 开始加载
                const res = await fetch(`/api/pickem/tournament-view?tournamentId=${selectedTourId}&userId=${user?.id}`);
                const json = await res.json();
                if (json.success) {
                    setAllStagesData(json.events);
                    const first = json.events.find(e => e.isVisible);
                    if (first) setSelectedStageId(first.id);
                }
            } catch (e) {
                console.error("Failed to load tournament data:", e);
            } finally {
                setLoading(false); // 无论成功失败都结束 loading
            }
        };
        
        loadTournamentData();
    }, [selectedTourId, user]);

   // [修复 3] 加载具体阶段数据
    useEffect(() => {
        if (!selectedStageId) return;
        
        const loadDetail = async () => {
            try {
                const res = await fetch(`/api/pickem/event/${selectedStageId}?userId=${user?.id}`);
                const data = await res.json();
                setCurrentEventData(data);
                
                // 恢复作业
                if (data.userPicks) {
                    if (data.event.type === 'SWISS' || data.event.type === 'DOUBLE_ELIM_16') {
                         const loadedPicks = {};
                         // ==================== 修改开始 ====================
                         // 使用 parseJsonArray 安全解析数据
                         const pick30 = parseJsonArray(data.userPicks.pick30);
                         const pick03 = parseJsonArray(data.userPicks.pick03);
                         const pickAdvance = parseJsonArray(data.userPicks.pickAdvance);
                         // ==================== 修改结束 ====================

                         const findTeam = (id) => data.teams?.find(t => String(t.id) === String(id));
                         
                         // 下面的逻辑不用变，现在 pick30 已经是数组了
                         pick30.forEach((tid, i) => { 
                             const t = findTeam(tid); 
                             if(t) loadedPicks[`30_${i+1}`] = t; 
                         });
                         pick03.forEach((tid, i) => { 
                             const t = findTeam(tid); 
                             if(t) loadedPicks[`03_${i+1}`] = t; 
                         });
                         pickAdvance.forEach((tid, i) => { 
                             const t = findTeam(tid); 
                             if(t) loadedPicks[`adv_${i+1}`] = t; 
                         });
                         setUserPicks(loadedPicks);
                    } else {
                        // 淘汰赛同样建议安全解析（虽然 bracketPicks 通常是对象，但为了保险）
                        const bp = typeof data.userPicks.bracketPicks === 'string' 
                            ? JSON.parse(data.userPicks.bracketPicks) 
                            : data.userPicks.bracketPicks;
                            setUserPicks({ bracketPicks: bp || {} });
                    }
                } else { 
                    setUserPicks({}); 
                }
                
            } catch (e) {
                console.error("Failed to load event detail:", e);
            }
        };
        
        loadDetail();
    }, [selectedStageId, user]);
    
    // [修复 4] 简化更新排行榜的逻辑
    useEffect(() => {
        if (!currentEventData) return;
        
        const updateLeaderboard = async () => {
            try {
                const lbRes = await fetch(`/api/pickem/stage-picks/${selectedStageId}`);
                const lbJson = await lbRes.json();
                if (lbJson.success) {
                    const scored = lbJson.picks.map(p => {
                        let score = 0;
                        const teams = currentEventData.teams || [];
                        const matches = currentEventData.matches || [];

                        if (currentEventData.event.type === 'SWISS') {
                            const check = (pid, type) => {
                                if (!pid) return false;
                                const t = teams.find(x => String(x.id) === String(pid));
                                if (!t) return false;
                                if (type === '3-0') return t.wins === 3 && t.losses === 0;
                                if (type === '0-3') return t.wins === 0 && t.losses === 3;
                                if (type === 'adv') return t.status === 'ADVANCED';
                                return false;
                            };
                            
                            (p.pick30 || []).forEach(id => { if(check(id, '3-0')) score++; });
                            (p.pick03 || []).forEach(id => { if(check(id, '0-3')) score++; });
                            (p.pickAdvance || []).forEach(id => { if(check(id, 'adv')) score++; });
                        } else {
                            const check = (slot) => {
                                const id = p.bracketPicks?.[slot];
                                if (!id) return false;
                                const slotMap = { 
                                    'S1_Top':'Q1', 'S1_Bot':'Q2', 'S2_Top':'Q3', 'S2_Bot':'Q4', 
                                    'F1_Top':'S1', 'F1_Bot':'S2', 'Champion':'F1' 
                                };
                                const m = matches.find(x => x.matchGroup === slotMap[slot]);
                                return m?.isFinished && String(m.winnerId) === String(id);
                            };
                            
                            ['S1_Top','S1_Bot','S2_Top','S2_Bot','F1_Top','F1_Bot','Champion'].forEach(slot => {
                                if(check(slot)) score++;
                            });
                        }
                        return { ...p, score };
                    });
                    
                    scored.sort((a, b) => b.score - a.score);
                    setLeaderboard(scored);
                }
            } catch (e) {
                console.error("Failed to update leaderboard:", e);
            }
        };
        
        updateLeaderboard();
    }, [currentEventData, selectedStageId]);




    // [修复] useMemo 必须在 return 之前
    const isHidden = currentEventData?.event?.isVisible === false;
    const isLocked = currentEventData?.event?.status === 'LOCKED' || currentEventData?.event?.status === 'FINISHED';
    const isFinished = currentEventData?.event?.status === 'FINISHED';

// [修改] 计算任务完成情况 - 修复淘汰赛任务判断
const { tasks, coinLevel } = useMemo(() => {
    const generatedTasks = [];
    let totalCompleted = 0;
    let totalPossible = 0;

    allStagesData.forEach(evt => {
        const pick = evt.userPick;
        //  const correctCount = pick?.correctCount || 0;
        // [新增] 实时计算正确数的逻辑
        let liveCorrectCount = 0;
        // 如果是当前正在查看的阶段，使用最新的比赛数据(currentEventData)来计算
        // 如果不是当前阶段，尝试从 evt.matches (tournament-view接口带回的) 计算，或者回退到数据库值
        const eventMatches = (currentEventData && currentEventData.event.id === evt.id) 
            ? currentEventData.matches 
            : (evt.matches || []); // 需要确保 tournament-view 接口返回 matches

        if (evt.type === 'SWISS') {
            // 计算已填写的总数
            const pick30 = pick?.pick30 ? parseJsonArray(pick.pick30) : [];
            const pick03 = pick?.pick03 ? parseJsonArray(pick.pick03) : [];
            const pickAdvance = pick?.pickAdvance ? parseJsonArray(pick.pickAdvance) : [];
            let pickedCount = pick30.length + pick03.length + pickAdvance.length;
             
            // 基础值：取数据库存的 (防止 api 还没返回 teams 时显示 0)
            let swissCorrect = pick?.correctCount || 0; 

            // 🟢 [核心修改]：直接使用 evt.teams (来自 allStagesData)，不再依赖 currentEventData
            // 这样无论你切到哪个 Tab，这里都能拿到该阶段对应的战队数据
            if (evt.teams && evt.teams.length > 0) {
                let liveSwissCorrect = 0;
                
                const checkTeamStatus = (tid, type) => {
                    // 使用当前循环到的这个阶段(evt)里的 teams
                    const t = evt.teams.find(team => String(team.id) === String(tid));
                    if (!t) return false;
                    
                    if (type === '3-0') return t.wins === 3 && t.losses === 0;
                    if (type === '0-3') return t.wins === 0 && t.losses === 3;
                    if (type === 'adv') return t.status === 'ADVANCED';
                    return false;
                };

                pick30.forEach(id => { if(checkTeamStatus(id, '3-0')) liveSwissCorrect++; });
                pick03.forEach(id => { if(checkTeamStatus(id, '0-3')) liveSwissCorrect++; });
                pickAdvance.forEach(id => { if(checkTeamStatus(id, 'adv')) liveSwissCorrect++; });

                // 取最大值
                swissCorrect = Math.max(swissCorrect, liveSwissCorrect);
            }

            const items = [
                 { desc: '在本阶段做出全部10次预测', completed: pickedCount === 10 },
                 { desc: '做出5次正确的竞猜预测', completed: swissCorrect >= 5 }
        ];
        generatedTasks.push({ title: `${evt.stageName} (瑞士轮)`, items });
        items.forEach(i => { if(i.completed) totalCompleted++; });
        totalPossible += 2;
    } else if (evt.type === 'DOUBLE_ELIM_16') {
        // [新增] 16队双败任务逻辑
        const pick30 = pick?.pick30 ? parseJsonArray(pick.pick30) : [];
        const pick03 = pick?.pick03 ? parseJsonArray(pick.pick03) : [];
        const pickAdvance = pick?.pickAdvance ? parseJsonArray(pick.pickAdvance) : [];
        let pickedCount = pick30.length + pick03.length + pickAdvance.length;
        
        let elimCorrect = pick?.correctCount || 0;

        if (evt.teams && evt.teams.length > 0) {
            let liveElimCorrect = 0;
            const checkTeamStatus = (tid, type) => {
                const t = evt.teams.find(team => String(team.id) === String(tid));
                if (!t) return false;
                if (type === '2-0') return t.wins === 2 && t.losses === 0;
                if (type === '0-2') return t.wins === 0 && t.losses === 2;
                if (type === '2-1') return t.wins === 2 && t.losses === 1; // 严谨检查 2-1
                return false;
            };

            pick30.forEach(id => { if(checkTeamStatus(id, '2-0')) liveElimCorrect++; });
            pick03.forEach(id => { if(checkTeamStatus(id, '0-2')) liveElimCorrect++; });
            pickAdvance.forEach(id => { if(checkTeamStatus(id, '2-1')) liveElimCorrect++; });
            elimCorrect = Math.max(elimCorrect, liveElimCorrect);
        }

        const items = [
             { desc: '在本阶段做出全部10次预测', completed: pickedCount === 10 },
             { desc: '做出5次正确的竞猜预测', completed: elimCorrect >= 5 }
        ];
        generatedTasks.push({ title: `${evt.stageName} (双败淘汰)`, items });
        items.forEach(i => { if(i.completed) totalCompleted++; });
        totalPossible += 2;
    } else if (evt.type === 'SINGLE_ELIM') {
        const bp = pick?.bracketPicks ? (typeof pick.bracketPicks === 'string' ? JSON.parse(pick.bracketPicks) : pick.bracketPicks) : {};
        let pickedCount = Object.keys(bp).filter(k => bp[k]).length;
        let elimCorrect = 0;
        if (evt.matches && evt.matches.length > 0) {
            ['Q1','Q2','Q3','Q4','S1','S2','F1'].forEach(slot => {
                const match = evt.matches.find(m => m.matchGroup === slot);
                if (match?.isFinished && String(match.winnerId) === String(bp[slot])) elimCorrect++;
            });
        }
        const items = [
             { desc: '在本阶段做出全部7次预测', completed: pickedCount === 7 },
             { desc: '做出3次正确的竞猜预测', completed: elimCorrect >= 3 }
        ];
        generatedTasks.push({ title: `${evt.stageName} (淘汰赛)`, items });
        items.forEach(i => { if(i.completed) totalCompleted++; });
        totalPossible += 2;
    }
}); 

const calculateCoin = (comp, poss) => {
    if (poss === 0) return 'BRONZE';
    const ratio = comp / poss;
    if (ratio >= 0.9) return 'DIAMOND';
    if (ratio >= 0.6) return 'GOLD';
    if (ratio >= 0.3) return 'SILVER';
    return 'BRONZE';
};

return { tasks: generatedTasks, coinLevel: calculateCoin(totalCompleted, totalPossible) };
}, [allStagesData, currentEventData, user]);


    const availableTeams = currentEventData?.teams.filter(t => !Object.values(userPicks).map(p=>p.id).includes(t.id)) || [];
    
    // [修复] 补全缺失的变量，解决 usedIds is not defined 报错
    const usedIds = useMemo(() => {
        if (!userPicks) return [];
        // 兼容模式：Swiss 使用对象结构，其值有 id；Bracket 使用 ID 字符串
        if (currentEventData?.event?.type === 'SINGLE_ELIM') {
            return Object.values(userPicks.bracketPicks || {}).map(id => String(id));
        }
        return Object.values(userPicks).map(p => String(p?.id)).filter(id => id && id !== 'undefined');
    }, [userPicks, currentEventData]);

    const displayPicks = useMemo(() => {
        if (!currentEventData || currentEventData.event.type === 'SINGLE_ELIM') return {};
        if (isFinished && !showMyPicks) {
            const realPicks = {};
            const t30 = currentEventData.teams.filter(t => t.wins === 3 && t.losses === 0);
            t30.forEach((t, i) => realPicks[`30_${i+1}`] = t);
            const t03 = currentEventData.teams.filter(t => t.wins === 0 && t.losses === 3);
            t03.forEach((t, i) => realPicks[`03_${i+1}`] = t);
            const tAdv = currentEventData.teams.filter(t => t.status === 'ADVANCED' && t.losses > 0);
            tAdv.forEach((t, i) => realPicks[`adv_${i+1}`] = t);
            return realPicks;
        }
        return userPicks;
    }, [currentEventData, userPicks, showMyPicks, isFinished]);

    // [新] activeDragTeam 根据当前拖拽 ID 计算，防止报错
    const activeDragTeam = useMemo(() => {
        if (!activeDragId || !currentEventData?.teams) return null;
        // 兼容：如果是 Bracket，ID 可能是 'src-teamId' 或 'pick-teamId'
        const realId = String(activeDragId).replace(/^(src-|pick-)/, ''); 
        return currentEventData.teams.find(t => String(t.id) === realId);
    }, [activeDragId, currentEventData]);

    const sensors = useSensors(useSensor(MouseSensor, { activationConstraint: { distance: 5 } }), useSensor(TouchSensor, { activationConstraint: { delay: 100, tolerance: 5 } }));

    // --- Drag Logic ---
    // --- 核心拖拽逻辑 ---
    // --- 核心拖拽逻辑 ---
    const handleDragEnd = (event) => {
        if (!currentEventData) return;
        // 比赛结束且不查看作业时，禁止操作
        if (currentEventData?.event?.status === 'FINISHED' && !showMyPicks) return;
        
        setActiveDragId(null);
        const { active, over } = event;
        if (!over) return;

        // [关键修复] 统一转为字符串，防止 ID 类型不匹配导致无法拖入
        const team = active.data.current;
        const rawTeamId = team.id || active.id;
        const teamId = String(rawTeamId).replace(/^(src-|pick-)/, ''); 
        const slotId = over.id;

        // --- A. 单败淘汰赛 (Bracket) ---
        if (currentEventData.event.type === 'SINGLE_ELIM') {
            const matches = currentEventData.matches;
            const bracketPicks = userPicks.bracketPicks || {};
            
            // 🟢 [修复]：这里必须使用 bracketPicks，而不是 picks
            const getPick = (sid) => String(bracketPicks[sid] || '');

            // 1. 定义合法性规则 (Strict Tree Logic)
            let isValid = false;
            
            // 第一层：8进4 (S1/S2 Slots) -> 来源必须是对应 Match 的参赛队伍
            if (['S1_Top', 'S1_Bot', 'S2_Top', 'S2_Bot'].includes(slotId)) {
                const groupMap = { 'S1_Top':'Q1', 'S1_Bot':'Q2', 'S2_Top':'Q3', 'S2_Bot':'Q4' };
                const match = matches.find(m => m.matchGroup === groupMap[slotId]);
                if (match) {
                    isValid = (teamId === String(match.teamAId) || teamId === String(match.teamBId));
                }
            }
            // 第二层：4进2 (F1 Slots)
            else if (slotId === 'F1_Top') {
                isValid = (teamId === getPick('S1_Top') || teamId === getPick('S1_Bot'));
            }
            else if (slotId === 'F1_Bot') {
                isValid = (teamId === getPick('S2_Top') || teamId === getPick('S2_Bot'));
            }
            // 第三层：冠军
            else if (slotId === 'Champion') {
                isValid = (teamId === getPick('F1_Top') || teamId === getPick('F1_Bot'));
            }

            if (!isValid) return;

            // 2. 执行更新 + 级联清除
            setUserPicks(prev => {
                const newBracket = { ...(prev.bracketPicks || {}), [slotId]: teamId };
                
                // 修改了 S1 区 -> 清除 F1_Top 和 冠军
                if (slotId.includes('S1')) { 
                    if (newBracket['F1_Top'] !== teamId) delete newBracket['F1_Top'];
                    // 级联清除冠军
                    const f1Top = newBracket['F1_Top']; 
                    if (!f1Top || newBracket['Champion'] === f1Top) delete newBracket['Champion']; // 逻辑修正
                }
                // 修改了 S2 区 -> 清除 F1_Bot 和 冠军
                if (slotId.includes('S2')) { 
                    if (newBracket['F1_Bot'] !== teamId) delete newBracket['F1_Bot'];
                    // 级联清除冠军
                    const f1Bot = newBracket['F1_Bot'];
                    if (!f1Bot || newBracket['Champion'] === f1Bot) delete newBracket['Champion'];
                }
                // 修改了 F1 区 -> 清除 冠军
                if (slotId.includes('F1')) {
                     if (newBracket['Champion'] !== teamId) delete newBracket['Champion'];
                }

                return { ...prev, bracketPicks: newBracket };
            });
        } 
        // --- B. 瑞士轮 (Swiss) ---
        else {
            const existingKey = Object.keys(userPicks).find(k => String(userPicks[k]?.id) === String(teamId));
            const newPicks = { ...userPicks };
            if (existingKey) delete newPicks[existingKey];
            newPicks[slotId] = team; 
            setUserPicks(newPicks);
        }
    };

    const handleRemovePick = (id) => {
        if (!currentEventData) return;
        if (currentEventData.event.type === 'SINGLE_ELIM') {
            setUserPicks(prev => {
                const newBracket = { ...prev.bracketPicks };
                delete newBracket[id];
                if (id.startsWith('S')) {
                    const finalSlot = id.startsWith('S1') ? 'F1_Top' : 'F1_Bot';
                    delete newBracket[finalSlot];
                    delete newBracket['Champion'];
                }
                if (id.startsWith('F')) delete newBracket['Champion'];
                return { ...prev, bracketPicks: newBracket };
            });
        } else {
            const newPicks = { ...userPicks };
            delete newPicks[id];
            setUserPicks(newPicks);
        }
    };
    const handleRemoveBracketPick = (id) => handleRemovePick(id); 
    const removeFromPicks = (id) => handleRemovePick(id); 

    const handleSubmitPicks = async () => {
        if (!user) return alert("请先登录");
        if (!currentEventData) return;
        setSubmitting(true);
        const payload = { userId: user.id, eventId: selectedStageId, picks: {} };
        if (currentEventData.event.type === 'SINGLE_ELIM') {
            payload.picks.bracketPicks = userPicks.bracketPicks;
        } else {
            const pick30 = [], pick03 = [], pickAdvance = [];
            Object.keys(userPicks).forEach(key => {
                const tid = userPicks[key].id;
                if (key.startsWith('30_')) pick30.push(tid);
                else if (key.startsWith('03_')) pick03.push(tid);
                else if (key.startsWith('adv_')) pickAdvance.push(tid);
            });
            payload.picks = { pick30, pick03, pickAdvance };
        }
        try {
            const res = await fetch('/api/pickem/pick', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
            const json = await res.json();
            if (json.success) {
                alert("✅ 保存成功！");
                
                // [新增] 1. 刷新排行榜
                updateLeaderboard(); 
                
                // [新增] 2. 刷新左侧任务栏 (重新拉取 allStagesData 以更新 evt.userPick)
                // 这行代码会触发上面的 useMemo 重新计算任务
                const tourRes = await fetch(`/api/pickem/tournament-view?tournamentId=${selectedTourId}&userId=${user?.id}`);
                const tourJson = await tourRes.json();
                if(tourJson.success) setAllStagesData(tourJson.events);

            } else { alert("❌ " + json.error); }
        } catch (e) { alert("网络错误"); } finally { setSubmitting(false); }
    };

    if (!user) return <div className="pt-20 text-center text-white">请登录</div>;
    
    // 只有在真的加载中且还没有任何阶段数据时才显示 Loading
    // 显示加载中状态
    if (loading) {
        return (
            <div className="pt-20 text-center text-yellow-500 flex flex-col items-center gap-2">
                <Loader2 className="animate-spin" size={32} />
                <span>加载中...</span>
            </div>
        );
    }
    
    
    


    return (
        <DndContext sensors={sensors} onDragStart={(e) => setActiveDragId(e.active.id)} onDragEnd={handleDragEnd} collisionDetection={closestCenter}>
            <div className="fixed top-20 left-0 right-0 bottom-0 z-0 flex justify-center pb-6 px-2 lg:px-8 pointer-events-none overflow-y-auto lg:overflow-hidden">
                <div className="w-full max-w-[1600px] h-full bg-zinc-950 border border-zinc-800 rounded-2xl shadow-2xl flex flex-col overflow-hidden pointer-events-auto">
                    
                    {/* Header */}
                    <div className="min-h-14 bg-zinc-900/80 backdrop-blur border-b border-zinc-800 flex flex-col lg:flex-row items-center justify-between px-4 py-2 lg:py-0 shrink-0 z-50 gap-2 lg:gap-0">
                        <div className="flex items-center gap-3">
                            
                            {/* [修复] 1. 赛事选择下拉 (点击触发 + 遮罩) */}
                            <div className="relative">
                                <button 
                                    onClick={() => setIsTourDropdownOpen(!isTourDropdownOpen)}
                                    className={`flex items-center gap-2 text-xs font-bold px-3 py-1.5 rounded border transition-colors ${isTourDropdownOpen ? 'bg-zinc-800 text-white border-zinc-600' : 'bg-black text-white border-zinc-700 hover:border-zinc-500'}`}
                                >
                                    {tournaments.find(t=>t.id===selectedTourId)?.name || '选择赛事'} 
                                    <ChevronDown size={12} className={`transition-transform duration-200 ${isTourDropdownOpen ? 'rotate-180' : ''}`}/>
                                </button>

                                {/* 下拉菜单主体 */}
                                {isTourDropdownOpen && (
                                    <>
                                        {/* 透明遮罩：点击空白处关闭 */}
                                        <div 
                                            className="fixed inset-0 z-40 cursor-default" 
                                            onClick={() => setIsTourDropdownOpen(false)}
                                        ></div>

                                        {/* 菜单内容 (z-50) */}
                                        <div className="absolute top-full left-0 mt-1 w-64 bg-zinc-900 border border-zinc-700 rounded shadow-2xl z-50 animate-in fade-in slide-in-from-top-1">
                                            <div className="max-h-80 overflow-y-auto custom-scrollbar py-1">
                                                {tournaments.map(t => (
                                                    <div 
                                                        key={t.id} 
                                                        onClick={() => {
                                                            setSelectedTourId(t.id);
                                                            setIsTourDropdownOpen(false); 
                                                        }} 
                                                        className={`px-4 py-3 text-xs cursor-pointer border-b border-zinc-800 last:border-0 truncate transition-colors ${selectedTourId === t.id ? 'bg-yellow-500/10 text-yellow-500' : 'text-zinc-300 hover:bg-zinc-800 hover:text-white'}`}
                                                    >
                                                        {t.name}
                                                    </div>
                                                ))}
                                                {tournaments.length === 0 && <div className="p-4 text-center text-zinc-500 text-xs">暂无赛事</div>}
                                            </div>
                                        </div>
                                    </>
                                )}
                            </div>

                            <div className="h-6 w-px bg-zinc-700 mx-2"></div>

                            {/* 2. 阶段选择 Tabs */}
                            <div className="flex gap-1 overflow-x-auto no-scrollbar">
                                {allStagesData.map(evt => (
                                    <button 
                                        key={evt.id} 
                                        onClick={() => evt.isVisible && setSelectedStageId(evt.id)} 
                                        disabled={!evt.isVisible}
                                        className={`px-3 py-1 text-[10px] font-bold rounded whitespace-nowrap transition-colors border ${
                                            selectedStageId === evt.id 
                                            ? 'bg-yellow-600 text-white border-yellow-600' 
                                            : evt.isVisible 
                                                ? 'bg-zinc-900 text-zinc-400 border-zinc-800 hover:text-white' 
                                                : 'bg-black text-zinc-700 border-zinc-800 cursor-not-allowed opacity-50'
                                        }`}
                                    >
                                        {evt.stageName} {!evt.isVisible && <Lock size={8} className="inline ml-1"/>}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* 右侧操作区 */}
                        <div className="flex items-center gap-3">
                            {currentEventData && <CountdownTimer deadline={currentEventData.event.deadline}/>}
                            
                            {isFinished && (
                                <label className={`flex items-center gap-1 text-[10px] font-bold border px-2 py-0.5 rounded cursor-pointer select-none transition-all ${showMyPicks ? 'bg-yellow-500 text-black border-yellow-500' : 'bg-zinc-950 border-zinc-700 text-zinc-400'}`}>
                                    <input type="checkbox" className="hidden" checked={showMyPicks} onChange={e=>setShowMyPicks(e.target.checked)} />
                                    {showMyPicks ? <Eye size={12}/> : <EyeOff size={12}/>} <span className="hidden sm:inline">My Picks</span>
                                </label>
                            )}

                            {!isHidden && (
                                <button 
                                    onClick={handleSubmitPicks} 
                                    disabled={submitting || isLocked} 
                                    className={`px-3 py-1.5 rounded text-[10px] font-bold flex items-center gap-1 transition-all ${isLocked ? 'bg-zinc-900 text-zinc-500 border border-zinc-800 cursor-not-allowed' : 'bg-green-600 hover:bg-green-500 text-white shadow-lg'}`}
                                >
                                    {isLocked ? <Lock size={12}/> : <Save size={12}/>}
                                    <span className="hidden sm:inline">{isLocked ? (isFinished ? 'FINISHED' : 'LOCKED') : submitting ? 'SAVING...' : 'SAVE PICKS'}</span>
                                </button>
                            )}
                        </div>
                    </div>

                    {/* --- Main Content (3栏布局) --- */}
                    <div className="flex-1 flex overflow-hidden relative">
                        
                        {/* 1. 左侧：任务栏 (20%) - 仅在有数据时显示 */}
                        {allStagesData.length > 0 && (
                            <div className="hidden lg:flex shrink-0">
                                <LeftSidebar 
                                    coinLevel={coinLevel} 
                                    tasks={tasks} 
                                    leaderboard={leaderboard} 
                                    onExpandLeaderboard={() => setShowLeaderboardFull(true)}
                                    onShowUserDetail={setDetailUser}
                                />
                            </div>
                        )}

                        {/* 核心逻辑分支 */}
                        {allStagesData.length === 0 ? (
                            // ✅ 分支 A: 暂无数据 (显示提示 + 返回按钮)
                            <div className="flex-1 flex flex-col items-center justify-center gap-8 bg-zinc-950/50 animate-in fade-in">
                                <div className="text-center flex flex-col items-center gap-4">
                                    <div className="w-24 h-24 bg-zinc-900 rounded-full flex items-center justify-center border border-zinc-800">
                                        <Trophy size={48} className="opacity-20 text-zinc-500" />
                                    </div>
                                    <div>
                                        <h3 className="text-xl font-bold text-zinc-400">当前赛事暂无竞猜阶段</h3>
                                        <p className="text-sm text-zinc-600 mt-2">该赛事可能尚未配置，或已被隐藏</p>
                                    </div>
                                </div>
                                
                                <button 
                                    onClick={() => setIsTourDropdownOpen(true)}
                                    className="flex items-center gap-2 px-8 py-3 bg-yellow-600 hover:bg-yellow-500 text-white rounded-full font-bold transition-all border border-yellow-500/50 hover:scale-105 shadow-lg shadow-yellow-500/20"
                                >
                                    <ListOrdered size={18}/> 切换其他赛事
                                </button>
                            </div>
                        ) : !currentEventData ? (
                            <div className="flex-1 flex flex-col items-center justify-center bg-zinc-950/50">
                                <Loader2 className="animate-spin text-yellow-500 mb-2" size={32} />
                                <span className="text-xs text-zinc-500">正在加载竞猜详情...</span>
                            </div>
                        ) : isHidden ? (
                            // ✅ 分支 B: 阶段被隐藏
                            <div className="flex-1 flex flex-col items-center justify-center bg-black text-zinc-600">
                                <Lock size={64} className="mb-4 opacity-20"/>
                                <h3 className="text-2xl font-black text-zinc-500 uppercase">STAGE LOCKED / HIDDEN</h3>
                            </div>
                        ) : currentEventData?.event.type === 'SINGLE_ELIM' ? (
                            // --- 单败淘汰赛布局 ---
                            <BracketStage 
                                eventData={currentEventData} 
                                userPicks={userPicks} 
                                setUserPicks={setUserPicks}
                                isLocked={isLocked}
                                isFinished={isFinished}
                                showMyPicks={showMyPicks}
                                handleRemoveBracketPick={handleRemoveBracketPick}
                                mobileSelectedId={mobileSelectedId}
                                onTeamClick={handleTeamClick}
                                onSlotClick={handleSlotClick}
                            />
                        ) : (
                            // --- 瑞士轮布局 (3栏) ---
                            <>
                                {/* 中间：战队池 + 对阵图 */}
                                <div className="flex-1 flex flex-col lg:flex-row border-r border-zinc-800 min-w-0 bg-black overflow-y-auto lg:overflow-visible">
                                    <div className="hidden lg:block h-full">
                                             <SeedList 
                                                teams={currentEventData?.teams || []} 
                                                usedIds={usedIds} 
                                                isLocked={isLocked} 
                                            />
                                        </div>
                                    <div className="flex-1 relative overflow-hidden bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] bg-fixed min-h-[300px] lg:h-auto border-b lg:border-b-0 border-zinc-800">
                                    <div className="absolute inset-0 opacity-10 pointer-events-none"></div>
                                    {currentEventData && <SwissBracket matches={currentEventData.matches} teams={currentEventData.teams} userPicks={userPicks} showUserPicks={showMyPicks} />}
                                </div>
                                </div>

                                {/* 右侧：竞猜填空 */}
                                <div className="w-full lg:w-80 shrink-0 bg-zinc-950 flex flex-col overflow-y-visible lg:overflow-y-auto custom-scrollbar p-4 z-20 border-l border-zinc-800 pb-20 lg:pb-4">
                                    <div className="space-y-6">
                                        <div>
                                            <div className="flex items-center gap-2 mb-2"><div className="w-1.5 h-1.5 bg-green-500 rounded-full"></div><span className="text-[10px] font-black text-white italic uppercase">3-0 Undefeated</span></div>
                                            <div className="grid grid-cols-2 gap-2">{[1,2].map(i => <DropSlot key={`30_${i}`} id={`30_${i}`} label="SELECT TEAM" team={displayPicks[`30_${i}`]} onRemove={removeFromPicks} type={currentEventData.event.type === 'SWISS' ? '3-0' : '2-0'} eventType={currentEventData.event.type} isFinished={isFinished} realTeamStats={currentEventData.teams} isCheckingHomework={showMyPicks} />)}</div>
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2 mb-2"><div className="w-1.5 h-1.5 bg-blue-500 rounded-full"></div><span className="text-[10px] font-black text-white italic uppercase">Advancing</span></div>
                                            <div className="grid grid-cols-2 gap-2">{[1,2,3,4,5,6].map(i => <DropSlot key={`adv_${i}`} id={`adv_${i}`} label="ADVANCE" team={displayPicks[`adv_${i}`]} onRemove={removeFromPicks} type="adv" eventType={currentEventData.event.type} isFinished={isFinished} realTeamStats={currentEventData.teams} isCheckingHomework={showMyPicks} />)}</div>
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2 mb-2"><div className="w-1.5 h-1.5 bg-red-500 rounded-full"></div><span className="text-[10px] font-black text-white italic uppercase">0-3 Eliminated</span></div>
                                            <div className="grid grid-cols-2 gap-2">{[1,2].map(i => <DropSlot key={`03_${i}`} id={`03_${i}`} label="SELECT TEAM" team={displayPicks[`03_${i}`]} onRemove={removeFromPicks} type={currentEventData.event.type === 'SWISS' ? '0-3' : '0-2'} eventType={currentEventData.event.type} isFinished={isFinished} realTeamStats={currentEventData.teams} isCheckingHomework={showMyPicks} />)}</div>
                                        </div>
                                    </div>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            </div>
            
            {/* 弹窗挂载 */}
            {showLeaderboardFull && <LeaderboardModal leaderboard={leaderboard} onClose={() => setShowLeaderboardFull(false)} onShowDetail={setDetailUser}/>}
            {detailUser && currentEventData && <UserPicksDetailModal targetUser={detailUser} eventData={currentEventData} onClose={() => setDetailUser(null)} />}

            <DragOverlay dropAnimation={null}>{activeDragTeam ? <div className="bg-yellow-500 text-black px-3 py-1.5 rounded-lg shadow-2xl font-black text-[10px] border-2 border-white w-28 truncate text-center rotate-6 cursor-grabbing">{activeDragTeam.name}</div> : null}</DragOverlay>
        </DndContext>
    );
}