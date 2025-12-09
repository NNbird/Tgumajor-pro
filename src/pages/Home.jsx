import React, { useMemo, useState } from 'react';
import { useLeague } from '../context/LeagueContext';
import { Trophy, Users, DollarSign, Tv, ArrowRight, Flame, Crown, Zap, Bell, Bomb, X, Calendar, MapPin } from 'lucide-react'; 
import { Link, useNavigate } from 'react-router-dom'; 
import AnnouncementModal from '../components/modals/AnnouncementModal';
import C4Modal from '../components/modals/C4Modal'; 

export default function Home() {
  const { user, siteConfig, matches, teams, playerStats, tournaments, announcements } = useLeague();
  const navigate = useNavigate(); 
  
  const [showAnnouncement, setShowAnnouncement] = useState(false);
  
  // C4 默认为 false (手动触发)
  const [showC4, setShowC4] = useState(false); 
  
  // 竞猜活动弹窗状态
  const [showPromo, setShowPromo] = useState(true);
  
  const liveMatch = matches.find(m => m.status === 'Live' && m.streamUrl) 
                 || matches.find(m => m.status === 'Live') 
                 || matches[0];

  const topPlayer = useMemo(() => {
    let scopeData = playerStats;
    if (siteConfig.featuredTournamentId) {
        const featuredData = playerStats.filter(p => 
            p.tournamentId === siteConfig.featuredTournamentId && 
            p.stageId === 'all'
        );
        if (featuredData.length > 0) scopeData = featuredData;
    }
    return [...scopeData].sort((a,b) => parseFloat(b.rating) - parseFloat(a.rating))[0];
  }, [playerStats, siteConfig.featuredTournamentId]);

  const mvpTournamentName = siteConfig.featuredTournamentId 
      ? tournaments.find(t => t.id === siteConfig.featuredTournamentId)?.name 
      : 'All Time';

  return (
    // 外层容器
    <div className="space-y-6 animate-in fade-in pb-24 relative pointer-events-none">
      
      {/* [顶部公告栏] */}
      <div className="pointer-events-auto relative z-20 mx-auto max-w-7xl mt-4 px-4 md:px-6">
        <div className="flex bg-zinc-900/80 backdrop-blur-md border border-yellow-500/20 text-yellow-500 font-bold text-sm uppercase tracking-wider rounded-xl overflow-hidden shadow-lg shadow-yellow-900/10">
            <div className="flex-1 overflow-hidden py-3 px-4 flex items-center relative">
                <div className="absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-zinc-900 to-transparent z-10"></div>
                <div className="flex items-center space-x-12 animate-marquee whitespace-nowrap">
                  {siteConfig.newsTicker && siteConfig.newsTicker.map((news, i) => (
                    <span key={i} className="flex items-center gap-3 text-zinc-300">
                        <Zap size={14} className="text-yellow-500 fill-yellow-500"/> 
                        {news}
                    </span>
                  ))}
                </div>
                <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-zinc-900 to-transparent z-10"></div>
            </div>
            
            <button 
              onClick={() => setShowAnnouncement(true)}
              className="bg-yellow-500/10 hover:bg-yellow-500 hover:text-black text-yellow-500 px-4 md:px-6 py-2 flex items-center gap-2 transition-all duration-300 border-l border-yellow-500/20 group"
              title="查看公告栏"
            >
                <div className="relative">
                    <Bell size={18} className={`group-hover:rotate-12 transition-transform ${announcements.length > 0 ? 'animate-[swing_2s_infinite]' : ''}`}/> 
                    {announcements.length > 0 && <span className="absolute -top-1 -right-0.5 w-2 h-2 bg-red-500 rounded-full animate-ping"></span>}
                </div>
                <span className="hidden md:inline font-black text-xs">NOTICES</span>
            </button>
        </div>
      </div>

      {/* [主要内容] Bento Grid */}
      <div className="max-w-7xl mx-auto px-4 md:px-6">
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6 auto-rows-[minmax(180px,auto)]">
            
            {/* --- 1. Hero Card (左上大图) --- */}
            <div className="pointer-events-auto md:col-span-2 lg:col-span-2 md:row-span-2 relative bg-zinc-900 rounded-3xl overflow-hidden border border-zinc-800 group shadow-2xl shadow-black/50 min-h-[400px]">
              {/* 背景图与遮罩 */}
              <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1542751371-adc38448a05e?ixlib=rb-1.2.1&auto=format&fit=crop&w=1350&q=80')] bg-cover bg-center opacity-40 group-hover:scale-105 group-hover:opacity-30 transition-all duration-1000 ease-out"></div>
              <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/60 to-transparent"></div>
              <div className="absolute inset-0 bg-gradient-to-r from-zinc-950/80 to-transparent"></div>
              
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-yellow-500 via-transparent to-transparent opacity-50"></div>

              <div className="absolute bottom-0 left-0 p-6 md:p-10 z-10 w-full flex flex-col items-start">
                <div className="flex flex-wrap items-center gap-2 md:gap-3 mb-4 md:mb-6 animate-in slide-in-from-left-4 fade-in duration-700">
                    <div className="bg-red-600/90 backdrop-blur-sm text-white px-2 py-1 md:px-3 text-[10px] font-black uppercase tracking-widest flex items-center gap-2 rounded-sm shadow-[0_0_20px_rgba(220,38,38,0.4)]">
                        <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse"></span> Major Event
                    </div>
                    <div className="text-yellow-500 text-[10px] font-bold border border-yellow-500/30 px-3 py-1 rounded-sm bg-yellow-500/5 backdrop-blur-md">
                        SEASON 2025
                    </div>
                </div>
                
                {/* [优化] 手机端字体调整为 text-4xl，防止溢出 */}
                <h1 className="text-4xl md:text-6xl lg:text-7xl font-black text-white mb-4 leading-[0.95] tracking-tighter italic drop-shadow-xl animate-in slide-in-from-bottom-4 fade-in duration-700 delay-100 break-words w-full">
                  {siteConfig.heroTitle} <br/>
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 via-orange-500 to-yellow-300">{siteConfig.heroSubtitle}</span>
                </h1>
                
                <div className="flex items-center gap-3 text-zinc-400 mb-6 md:mb-8 font-mono text-xs md:text-sm pl-1 animate-in slide-in-from-bottom-4 fade-in duration-700 delay-200">
                    <Calendar size={16} className="text-yellow-500 flex-shrink-0"/>
                    <span className="border-l border-zinc-700 pl-3">{siteConfig.heroDate}</span>
                </div>
                
                <div className="flex flex-wrap gap-3 md:gap-4 animate-in slide-in-from-bottom-4 fade-in duration-700 delay-300 w-full">
                  <Link to="/register" className="group/btn relative overflow-hidden bg-white text-black px-6 md:px-8 py-3 font-black uppercase tracking-wider hover:bg-yellow-400 transition-all clip-path-slant skew-x-[-10deg] hover:skew-x-[-10deg] hover:-translate-y-1 shadow-[0_5px_15px_rgba(0,0,0,0.3)] flex-1 md:flex-none text-center">
                    <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/50 to-transparent -translate-x-full group-hover/btn:animate-shimmer"></div>
                    <span className="inline-block skew-x-[10deg] text-xs md:text-sm">立即报名 JOIN</span>
                  </Link>
                  
                  <Link to="/matches" className="group/match flex items-center justify-center gap-2 md:gap-3 border border-zinc-700 bg-zinc-900/50 backdrop-blur-md text-white px-6 md:px-8 py-3 font-bold uppercase tracking-wider hover:bg-zinc-800 hover:border-zinc-500 transition-all rounded-sm flex-1 md:flex-none text-xs md:text-sm">
                    查看赛程 <ArrowRight size={16} className="text-yellow-500 group-hover/match:translate-x-1 transition-transform"/>
                  </Link>
                </div>
              </div>
            </div>

            {/* --- 2. MVP Card (右上) --- */}
            <div className="pointer-events-auto md:col-span-1 bg-zinc-900/60 backdrop-blur-xl rounded-3xl border border-zinc-800 p-6 flex flex-col justify-between relative overflow-hidden group hover:border-cyan-500/50 transition-all duration-500 shadow-xl min-h-[180px]">
                <div className="absolute -top-10 -right-10 w-40 h-40 bg-cyan-500/20 rounded-full blur-[60px] group-hover:bg-cyan-500/30 transition-all duration-700"></div>
                
                <div className="relative z-10">
                    <div className="flex justify-between items-start mb-4">
                        <div className="flex items-center gap-2">
                            <Crown size={18} className="text-yellow-500 fill-yellow-500 animate-[bounce_3s_infinite]" />
                            <span className="text-xs font-bold text-zinc-400 uppercase tracking-widest">MVP</span>
                        </div>
                        <div className="bg-cyan-950/50 border border-cyan-500/30 text-cyan-400 px-2 py-0.5 rounded text-[10px] font-mono max-w-[100px] truncate">
                            {mvpTournamentName}
                        </div>
                    </div>
                    
                    <div>
                        <div className="text-2xl md:text-3xl font-black text-white italic tracking-tighter group-hover:text-cyan-400 transition-colors truncate drop-shadow-lg">
                            {topPlayer?.name || 'TBD'}
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                            <span className="w-1.5 h-1.5 bg-cyan-400 rounded-full shadow-[0_0_10px_#22d3ee]"></span>
                            <span className="text-xs md:text-sm text-zinc-400 font-medium truncate">{topPlayer?.team || 'No Data'}</span>
                        </div>
                    </div>
                </div>

                <div className="relative z-10 mt-auto pt-4">
                  <div className="flex justify-between items-end mb-2">
                      <span className="text-zinc-500 text-[10px] uppercase font-bold tracking-wider">Rating 2.0</span>
                      <span className="text-4xl md:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-b from-white to-zinc-500 tabular-nums tracking-tighter">
                          {topPlayer?.rating || '-'}
                      </span>
                  </div>
                  <div className="w-full bg-zinc-800/50 h-1.5 rounded-full overflow-hidden flex">
                      <div className="bg-gradient-to-r from-cyan-600 to-cyan-400 h-full w-[92%] shadow-[0_0_15px_rgba(34,211,238,0.6)]"></div>
                  </div>
                </div>
            </div>

            {/* --- 3. Live Match Card (中上) - 重点修复移动端显示 --- */}
            <div className={`pointer-events-auto md:col-span-1 rounded-3xl border p-1 relative overflow-hidden transition-all duration-500 group min-h-[180px] ${
                liveMatch?.status === 'Live' 
                ? 'bg-gradient-to-b from-red-900/20 to-zinc-900 border-red-500/30 shadow-[0_0_40px_rgba(220,38,38,0.1)]' 
                : 'bg-zinc-900/60 backdrop-blur-xl border-zinc-800 hover:border-zinc-600'
            }`}>
                <div className="h-full w-full bg-zinc-950/50 rounded-[20px] p-5 flex flex-col relative overflow-hidden">
                    {liveMatch ? (
                      <>
                      {liveMatch.status === 'Live' && (
                          <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-10 mix-blend-overlay"></div>
                      )}
                      
                      <div className="relative z-10 flex-1 flex flex-col">
                          <div className="flex items-center justify-between mb-6">
                            {liveMatch.status === 'Live' ? (
                                <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 px-2 py-1 rounded-full">
                                    <span className="relative flex h-2 w-2">
                                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                                      <span className="relative inline-flex rounded-full h-2 w-2 bg-red-600"></span>
                                    </span>
                                    <span className="text-[10px] font-black text-red-500 uppercase tracking-widest">Live</span>
                                </div>
                            ) : (
                                <div className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest border border-zinc-800 px-2 py-1 rounded">Featured</div>
                            )}
                            <div className="text-[10px] text-zinc-500 font-mono">BO{liveMatch.bo}</div>
                          </div>
                          
                          {/* [修复] 使用 Flex 布局，防止名字被VS挤压 */}
                          <div className="flex flex-col gap-3 mb-4">
                            <div className="flex justify-between items-center group/team">
                                {/* flex-1 min-w-0 确保文本可以截断 */}
                                <div className="text-lg md:text-xl font-black text-white truncate flex-1 min-w-0 mr-2">{liveMatch.teamA}</div>
                                <div className={`text-xl md:text-2xl font-mono font-bold flex-shrink-0 ${liveMatch.scoreA > liveMatch.scoreB ? 'text-yellow-500' : 'text-zinc-600'}`}>{liveMatch.scoreA}</div>
                            </div>
                            <div className="w-full h-px bg-zinc-800"></div>
                            <div className="flex justify-between items-center group/team">
                                <div className="text-lg md:text-xl font-black text-white truncate flex-1 min-w-0 mr-2">{liveMatch.teamB}</div>
                                <div className={`text-xl md:text-2xl font-mono font-bold flex-shrink-0 ${liveMatch.scoreB > liveMatch.scoreA ? 'text-yellow-500' : 'text-zinc-600'}`}>{liveMatch.scoreB}</div>
                            </div>
                          </div>
                          
                          <div className="text-[10px] text-zinc-500 uppercase tracking-widest text-center mb-4 mt-auto">
                              {liveMatch.currentMap || 'Map Pending'} 
                          </div>

                          <div>
                              {liveMatch.status === 'Live' && liveMatch.streamUrl ? (
                                  <a href={liveMatch.streamUrl} target="_blank" rel="noopener noreferrer" className="pointer-events-auto w-full bg-red-600 hover:bg-red-500 text-white text-[10px] md:text-xs font-black uppercase py-2.5 rounded-lg flex items-center justify-center gap-2 transition-all shadow-lg shadow-red-900/30 group/btn">
                                      <Tv size={14} className="group-hover/btn:animate-pulse"/> Watch
                                  </a>
                              ) : (
                                  <Link to="/matches" className="pointer-events-auto w-full border border-zinc-700 hover:bg-zinc-800 text-zinc-400 hover:text-white text-[10px] md:text-xs font-bold uppercase py-2.5 rounded-lg flex items-center justify-center gap-2 transition-all">
                                      Details
                                  </Link>
                              )}
                          </div>
                      </div>
                      </>
                    ) : (
                        <div className="flex-1 flex items-center justify-center text-zinc-600 font-mono text-sm">暂无比赛</div>
                    )}
                </div>
            </div>

            {/* --- 4. Prize Pool (左下) --- */}
            <div className="pointer-events-auto md:col-span-1 bg-zinc-900/60 backdrop-blur-xl rounded-3xl border border-zinc-800 p-6 flex flex-col items-center justify-center text-center group hover:border-yellow-500/30 transition-all duration-500 relative overflow-hidden shadow-lg min-h-[180px]">
                <div className="relative z-10 w-full">
                    <div className="w-12 h-12 bg-zinc-900 border border-yellow-500/20 rounded-2xl flex items-center justify-center mb-3 mx-auto group-hover:scale-110 group-hover:border-yellow-500/50 transition-all duration-500 shadow-lg shadow-black/50">
                        <DollarSign size={24} className="text-yellow-500 drop-shadow-[0_0_8px_rgba(234,179,8,0.5)]"/>
                    </div>
                    <div className="text-zinc-500 text-[10px] uppercase tracking-[0.2em] font-bold mb-1">Prize Pool</div>
                    <div className="text-2xl md:text-3xl font-black text-white mb-4 text-nowrap w-full overflow-hidden text-ellipsis tracking-tight">
                        {siteConfig.prizePool}
                    </div>
                    
                    <div className="w-full bg-zinc-950 border border-zinc-800 h-2.5 rounded-full overflow-hidden relative p-[1px]">
                      <div className="h-full rounded-full bg-gradient-to-r from-yellow-700 via-yellow-500 to-yellow-300 relative" style={{width: `${siteConfig.prizeGoal}%`}}>
                          <div className="absolute top-0 right-0 w-full h-full bg-gradient-to-l from-white/30 to-transparent"></div>
                      </div>
                    </div>
                </div>
            </div>

            {/* --- 5. Registered Teams (右下) --- */}
            <Link to="/teams" className="pointer-events-auto md:col-span-1 bg-zinc-900/60 backdrop-blur-xl rounded-3xl border border-zinc-800 p-6 flex flex-col items-center justify-center text-center group hover:bg-zinc-800 transition-all cursor-pointer relative overflow-hidden shadow-lg min-h-[180px]">
                <div className="absolute -right-8 -bottom-8 opacity-[0.03] group-hover:opacity-[0.08] transition-opacity rotate-12">
                    <Users size={180} />
                </div>
                
                <div className="relative mb-2">
                    <Users size={32} className="text-purple-500 group-hover:scale-110 transition-transform duration-300"/>
                    <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-4 border-zinc-900"></div>
                </div>
                
                <div className="text-4xl md:text-5xl font-black text-white mb-1 tabular-nums tracking-tighter group-hover:text-purple-400 transition-colors">
                    {teams.length}
                </div>
                <div className="text-zinc-500 text-[10px] uppercase tracking-widest font-bold mb-4">Teams</div>
                
                <div className="w-full bg-zinc-950 border border-zinc-800/50 py-2.5 rounded-xl text-[10px] text-zinc-400 font-bold uppercase tracking-wider group-hover:text-white group-hover:border-purple-500/30 group-hover:bg-purple-500/10 transition-all flex items-center justify-center gap-2">
                    View Roster <ArrowRight size={12} className="group-hover:translate-x-1 transition-transform"/>
                </div>
            </Link>

            {/* --- 6. About Tournament (底部通栏) --- */}
            <div className="pointer-events-auto md:col-span-3 lg:col-span-4 bg-zinc-900/40 backdrop-blur-md p-6 md:p-10 rounded-3xl border border-zinc-800/50 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-1.5 h-full bg-gradient-to-b from-yellow-500 via-orange-500 to-transparent"></div>
                <div className="relative z-10">
                    <h3 className="text-xl md:text-2xl font-black text-white mb-4 flex items-center gap-3">
                        <div className="bg-yellow-500/10 p-2 rounded-lg">
                            <Flame className="text-yellow-500 fill-yellow-500" size={20}/>
                        </div>
                        ABOUT TOURNAMENT
                    </h3>
                    <p className="text-zinc-400 leading-relaxed whitespace-pre-wrap text-sm md:text-base max-w-5xl font-light tracking-wide">
                        {siteConfig.aboutText}
                    </p>
                </div>
            </div>

          </div>
      </div>

      {/* C4 悬浮按钮 */}
      <button 
        onClick={() => setShowC4(true)}
        className="fixed bottom-6 right-6 z-50 w-12 h-12 md:w-16 md:h-16 bg-zinc-950 border border-red-500/30 text-red-500 rounded-2xl shadow-[0_0_30px_rgba(220,38,38,0.3)] flex items-center justify-center hover:scale-110 hover:bg-red-950 hover:border-red-500 transition-all duration-300 group pointer-events-auto"
      >
         <Bomb size={24} className="md:w-7 md:h-7 group-hover:animate-[wiggle_0.5s_infinite]" />
         <span className="absolute top-[-4px] right-[-4px] w-3 h-3 md:w-4 md:h-4 bg-red-600 rounded-full animate-ping border-2 border-zinc-900"></span>
      </button>

      {/* 弹窗 */}
      <div className="pointer-events-auto">
          <AnnouncementModal announcements={announcements} onClose={() => setShowAnnouncement(false)} alwaysShow={showAnnouncement} />
          {user && showC4 && <C4Modal onClose={() => setShowC4(false)} />}
          
          {showPromo && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm animate-in fade-in duration-300">
                <div className="bg-zinc-950 border border-yellow-500/20 w-full max-w-sm md:max-w-md rounded-3xl shadow-[0_0_60px_rgba(234,179,8,0.15)] overflow-hidden relative animate-in zoom-in-95 duration-300">
                    <button onClick={() => setShowPromo(false)} className="absolute top-5 right-5 text-zinc-500 hover:text-white transition-colors z-20">
                        <X size={24} />
                    </button>
                    <div className="p-8 md:p-10 text-center flex flex-col items-center relative z-10">
                        <div className="w-16 h-16 bg-gradient-to-b from-yellow-500/20 to-zinc-900 rounded-2xl border border-yellow-500/30 flex items-center justify-center mb-6 shadow-xl animate-bounce">
                            <Trophy size={32} className="text-yellow-500" />
                        </div>
                        <h3 className="text-2xl md:text-3xl font-black text-white italic uppercase mb-3 tracking-tighter">
                            Major <span className="text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-orange-500">Pick'Em</span>
                        </h3>
                        <p className="text-zinc-400 text-sm mb-8 leading-relaxed max-w-[250px]">
                            Major 冠军竞猜活动现已开启！<br/>预测赛程，赢取限定徽章。
                        </p>
                        <div className="flex gap-3 w-full">
                            <button onClick={() => setShowPromo(false)} className="flex-1 py-3 rounded-xl border border-zinc-800 bg-zinc-900 text-zinc-400 font-bold text-sm hover:bg-zinc-800 hover:text-white">稍后再说</button>
                            <button onClick={() => { setShowPromo(false); navigate('/pickem'); }} className="flex-1 py-3 rounded-xl bg-yellow-500 text-black font-black text-sm uppercase hover:bg-yellow-400 hover:scale-[1.02] transition-all">立即参与</button>
                        </div>
                    </div>
                </div>
            </div>
          )}
      </div>
      
    </div>
  );
}