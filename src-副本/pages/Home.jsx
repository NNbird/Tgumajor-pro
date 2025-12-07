import React, { useMemo, useState } from 'react';
import { useLeague } from '../context/LeagueContext';
import { Trophy, Users, DollarSign, Tv, ArrowRight, Flame, Target, Zap, Bell } from 'lucide-react';
import { Link } from 'react-router-dom';
import AnnouncementModal from '../components/modals/AnnouncementModal';

export default function Home() {
  const { siteConfig, matches, teams, playerStats, tournaments, announcements } = useLeague();
  
  // 控制公告弹窗手动显示的状态
  const [showAnnouncement, setShowAnnouncement] = useState(false);
  
  // --- 1. Live Match 逻辑 ---
  const liveMatch = matches.find(m => m.status === 'Live' && m.streamUrl) 
                 || matches.find(m => m.status === 'Live') 
                 || matches[0];

  // --- 2. MVP 计算逻辑 (精准匹配赛事全程) ---
  const topPlayer = useMemo(() => {
    let scopeData = playerStats;

    // 如果后台配置了 "主推赛事 ID"
    if (siteConfig.featuredTournamentId) {
        // 筛选出该赛事的“全程”数据 (stageId === 'all')
        const featuredData = playerStats.filter(p => 
            p.tournamentId === siteConfig.featuredTournamentId && 
            p.stageId === 'all'
        );
        
        if (featuredData.length > 0) {
            scopeData = featuredData;
        }
    }

    // 排序取第一
    return [...scopeData].sort((a,b) => parseFloat(b.rating) - parseFloat(a.rating))[0];
  }, [playerStats, siteConfig.featuredTournamentId]);

  // 获取当前展示 MVP 的赛事名称
  const mvpTournamentName = siteConfig.featuredTournamentId 
      ? tournaments.find(t => t.id === siteConfig.featuredTournamentId)?.name 
      : 'All Time';

  return (
    <div className="space-y-8 animate-in fade-in pb-20 relative">
      
      {/* [背景] 赛博网格 + 顶部聚光灯 */}
      <div className="fixed inset-0 pointer-events-none z-[-1]">
        <div className="absolute inset-0 bg-grid-pattern opacity-30"></div>
        <div className="absolute top-[-10%] left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-yellow-500/10 blur-[120px] rounded-full"></div>
      </div>

      {/* [顶部栏] 滚动新闻 & 公告按钮 */}
      <div className="flex bg-yellow-500 text-black font-bold text-sm uppercase tracking-widest shadow-[0_0_20px_rgba(234,179,8,0.4)] relative z-10">
         {/* 左侧：滚动新闻 (自适应宽度) */}
         <div className="flex-1 overflow-hidden py-2 px-4 flex items-center">
             <div className="flex items-center space-x-8 animate-marquee whitespace-nowrap">
               {siteConfig.newsTicker && siteConfig.newsTicker.map((news, i) => (
                 <span key={i} className="flex items-center gap-4">{news} <Zap size={12} className="fill-black"/></span>
               ))}
             </div>
         </div>
         
         {/* 右侧：公告栏开关按钮 (固定宽度) */}
         <button 
            onClick={() => setShowAnnouncement(true)}
            className="bg-zinc-950 text-yellow-500 px-6 py-2 flex items-center gap-2 hover:bg-zinc-800 transition-colors z-20 relative border-l border-yellow-600/20"
            title="查看公告栏"
         >
             <Bell size={16} className={announcements.length > 0 ? 'animate-[swing_2s_infinite]' : ''}/> 
             <span className="hidden md:inline">公告</span>
         </button>
      </div>

      {/* [主要内容] Bento Grid 布局 */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6 h-auto md:h-[600px]">
        
        {/* --- 1. Hero Card (主视觉) --- */}
        <div className="md:col-span-2 lg:col-span-2 md:row-span-2 relative bg-zinc-900 rounded-2xl overflow-hidden border border-white/10 group shadow-2xl">
          <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1542751371-adc38448a05e?ixlib=rb-1.2.1&auto=format&fit=crop&w=1350&q=80')] bg-cover bg-center opacity-50 group-hover:scale-110 group-hover:opacity-40 transition-all duration-700 ease-out"></div>
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/60 to-transparent"></div>
          
          <div className="absolute bottom-0 left-0 p-8 z-10 w-full">
            <div className="flex items-center gap-3 mb-4">
                <div className="bg-red-600 text-white px-3 py-1 text-xs font-black uppercase tracking-widest flex items-center gap-2 shadow-[0_0_15px_rgba(220,38,38,0.6)] animate-pulse">
                    <span className="w-2 h-2 bg-white rounded-full"></span> Live Event
                </div>
                <div className="text-yellow-500 text-xs font-mono border border-yellow-500/30 px-2 py-1 rounded bg-black/50 backdrop-blur">
                    LAN FINALS
                </div>
            </div>
            
            <h1 className="text-5xl md:text-6xl font-black text-white mb-2 leading-none tracking-tighter italic">
              {siteConfig.heroTitle} <br/>
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 via-orange-500 to-yellow-400 animate-border-flow">{siteConfig.heroSubtitle}</span>
            </h1>
            <p className="text-zinc-400 mb-8 font-mono text-sm border-l-2 border-yellow-500 pl-3">{siteConfig.heroDate}</p>
            
            <div className="flex gap-4">
              <Link to="/register" className="shimmer-effect relative overflow-hidden bg-white text-black px-8 py-3 font-black uppercase hover:bg-yellow-400 transition-colors clip-path-slant">
                立即报名
              </Link>
              <Link to="/matches" className="group/btn flex items-center gap-2 border border-white/20 bg-black/30 backdrop-blur-sm text-white px-6 py-3 font-bold hover:bg-white/10 transition-all">
                查看赛程 <ArrowRight size={16} className="group-hover/btn:translate-x-1 transition-transform"/>
              </Link>
            </div>
          </div>
        </div>

        {/* --- 2. MVP Card (选手卡片) --- */}
        <div className="md:col-span-1 bg-zinc-900/80 backdrop-blur-md rounded-2xl border border-zinc-800 p-6 flex flex-col justify-between relative overflow-hidden group hover:border-zinc-600 transition-colors">
            <div className="absolute top-[-50px] right-[-50px] w-32 h-32 bg-cyan-500/20 rounded-full blur-[50px] group-hover:bg-cyan-500/30 transition-all"></div>
            
            <div>
                <div className="flex justify-between items-start">
                    <div className="text-zinc-500 text-[10px] font-bold uppercase tracking-widest border border-zinc-700 px-2 py-1 rounded bg-zinc-950">
                        Tournament MVP
                    </div>
                    <Target className="text-zinc-700 group-hover:text-cyan-500 transition-colors" size={24}/>
                </div>
                
                <div className="mt-6">
                    <div className="text-4xl font-black text-white italic tracking-tighter group-hover:text-cyan-400 transition-colors truncate">
                        {topPlayer?.name || 'TBD'}
                    </div>
                    <div className="text-xs text-cyan-500 font-bold mt-1 truncate">
                        {mvpTournamentName}
                    </div>
                    <div className="text-xs text-zinc-500 font-mono flex items-center gap-1 mt-1">
                        <span className="w-2 h-2 bg-cyan-500 rounded-full"></span>
                        {topPlayer?.team || 'No Data'}
                    </div>
                </div>
            </div>

            <div className="mt-4 pt-4 border-t border-white/5">
              <div className="flex justify-between items-end mb-2">
                  <span className="text-zinc-400 text-xs uppercase font-bold">Rating</span>
                  <span className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-b from-white to-zinc-600">
                      {topPlayer?.rating || '-'}
                  </span>
              </div>
              <div className="w-full bg-zinc-800 h-1.5 rounded-full overflow-hidden">
                  <div className="bg-cyan-500 h-full w-[85%] shadow-[0_0_10px_rgba(6,182,212,0.8)]"></div>
              </div>
              <div className="flex justify-between mt-2 text-xs font-mono text-zinc-500">
                  <span>ADR: {topPlayer?.adr}</span>
                  <span className="text-cyan-500">TOP 1</span>
              </div>
            </div>
        </div>

        {/* --- 3. Live Match Card --- */}
        <div className={`md:col-span-1 rounded-2xl border p-6 text-center flex flex-col justify-center relative overflow-hidden transition-all duration-500 ${
            liveMatch?.status === 'Live' 
            ? 'bg-zinc-900 border-red-500/50 shadow-[0_0_30px_rgba(220,38,38,0.15)]' 
            : 'bg-zinc-900 border-zinc-800 hover:border-zinc-600'
        }`}>
            {liveMatch ? (
              <>
              {liveMatch.status === 'Live' && (
                  <div className="absolute inset-0 bg-gradient-to-b from-red-900/10 to-transparent pointer-events-none"></div>
              )}

              <div className="relative z-10">
                  <div className="flex items-center justify-center gap-2 mb-6">
                    {liveMatch.status === 'Live' ? (
                        <span className="flex items-center gap-1.5 text-red-500 text-xs font-black uppercase tracking-widest">
                            <span className="relative flex h-2 w-2">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                              <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                            </span>
                            Live Now
                        </span>
                    ) : (
                        <span className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Featured Match</span>
                    )}
                  </div>
                  
                  <div className="flex justify-between items-center mb-4 px-2">
                    <div className="text-lg font-black text-white truncate w-[40%] text-right">{liveMatch.teamA}</div>
                    <div className="text-zinc-600 font-mono text-xs mx-2">VS</div>
                    <div className="text-lg font-black text-white truncate w-[40%] text-left">{liveMatch.teamB}</div>
                  </div>
                  
                  <div className="text-5xl font-mono font-black text-white mb-2 tracking-tighter">
                      {liveMatch.scoreA} <span className="text-zinc-600 mx-1">:</span> {liveMatch.scoreB}
                  </div>
                  
                  <div className="text-[10px] text-zinc-400 uppercase tracking-widest mb-6 border-b border-white/5 pb-4">
                      {liveMatch.currentMap || 'Map Pending'} • BO{liveMatch.bo}
                  </div>

                  {liveMatch.status === 'Live' && liveMatch.streamUrl ? (
                      <a href={liveMatch.streamUrl} target="_blank" rel="noopener noreferrer" className="group w-full bg-red-600 hover:bg-red-500 text-white font-bold py-3 rounded-lg flex items-center justify-center gap-2 transition-all shadow-lg shadow-red-900/20">
                          <Tv size={18} className="group-hover:animate-bounce"/> WATCH STREAM
                      </a>
                  ) : (
                      <Link to="/matches" className="w-full border border-zinc-700 hover:bg-white/5 text-zinc-300 hover:text-white font-bold py-3 rounded-lg flex items-center justify-center gap-2 transition-all">
                          Match Details
                      </Link>
                  )}
              </div>
              </>
            ) : <div className="text-zinc-500">暂无比赛</div>}
        </div>

        {/* --- 4. Prize Pool --- */}
        <div className="md:col-span-1 bg-zinc-900 rounded-2xl border border-zinc-800 p-6 flex flex-col items-center justify-center text-center group hover:border-yellow-500/30 transition-colors relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-yellow-500 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
            <div className="bg-yellow-500/10 p-4 rounded-full mb-4 group-hover:scale-110 transition-transform duration-500">
                <DollarSign size={32} className="text-yellow-500"/>
            </div>
            <div className="text-zinc-500 text-[10px] uppercase tracking-[0.2em] mb-1">Total Prize Pool</div>
            <div className="text-2xl font-black text-white mb-6 text-nowrap w-full overflow-hidden text-ellipsis px-2">
                {siteConfig.prizePool}
            </div>
            <div className="w-full bg-zinc-800 h-2 rounded-full overflow-hidden relative">
              <div className="bg-gradient-to-r from-yellow-600 to-yellow-400 h-full relative" style={{width: `${siteConfig.prizeGoal}%`}}>
                  <div className="absolute top-0 left-0 w-full h-full bg-white/20 animate-[shine_2s_infinite] transform skew-x-12"></div>
              </div>
            </div>
            <div className="flex justify-between w-full mt-2 text-[10px] text-zinc-500 font-mono">
                <span>Raised: {siteConfig.prizeGoal}%</span>
                <span>Goal</span>
            </div>
        </div>

        {/* --- 5. Registered Teams --- */}
        <Link to="/teams" className="md:col-span-1 bg-zinc-900 rounded-2xl border border-zinc-800 p-6 flex flex-col items-center justify-center text-center group hover:bg-zinc-800 transition-all cursor-pointer relative overflow-hidden">
            <div className="absolute -right-6 -bottom-6 opacity-5 group-hover:opacity-10 transition-opacity rotate-12">
                <Users size={120} />
            </div>
            <div className="mb-2 relative">
                <Users size={40} className="text-purple-500 group-hover:scale-110 transition-transform duration-300"/>
                <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-zinc-900"></div>
            </div>
            <div className="text-4xl font-black text-white mb-1">{teams.length}</div>
            <div className="text-zinc-500 text-xs uppercase tracking-widest mb-4">Teams Registered</div>
            <div className="text-xs text-purple-400 font-bold flex items-center gap-1 group-hover:gap-2 transition-all">
                Join the battle <ArrowRight size={12}/>
            </div>
        </Link>
      </div>

      {/* 关于赛事 */}
      <div className="bg-zinc-900/50 p-8 rounded-2xl border border-white/5 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-yellow-500 to-transparent"></div>
          <h3 className="text-2xl font-black text-white mb-4 flex items-center gap-2">
              <Flame className="text-yellow-500 fill-yellow-500" size={24}/> 关于赛事
          </h3>
          <p className="text-zinc-400 leading-relaxed whitespace-pre-wrap text-sm md:text-base max-w-4xl">
              {siteConfig.aboutText}
          </p>
      </div>

      {/* 公告弹窗 */}
      <AnnouncementModal 
        announcements={announcements} 
        onClose={() => setShowAnnouncement(false)} 
        alwaysShow={showAnnouncement} 
      />
    </div>
  );
}