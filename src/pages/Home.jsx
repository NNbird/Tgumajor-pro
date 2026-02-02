import React, { useMemo, useState } from 'react';
import { useLeague } from '../context/LeagueContext';
import { 
  Trophy, Users, DollarSign, Tv, ArrowRight, Flame, Crown, Zap, Bell, Bomb, X, 
  Calendar, MapPin, Activity, BarChart3, Pin, ChevronRight 
} from 'lucide-react'; 
import { Link, useNavigate } from 'react-router-dom'; 
import AnnouncementModal from '../components/modals/AnnouncementModal';
import C4Modal from '../components/modals/C4Modal'; 
import mirageBg from './maps/mirage.png';
import infernoBg from './maps/inferno.png';
import dust2Bg from './maps/dust2.png';
import nukeBg from './maps/nuke.png';
import ancientBg from './maps/ancient.png';
//import anubisBg from './maps/anubis.png';
import trainBg from './maps/train.png';
//import overpassBg from './maps/overpass.png';
//import vertigoBg from './maps/vertigo.png';
//import officeBg from './maps/office.png';

export default function Home() {
  const { user, siteConfig, matches, teams, playerStats, tournaments, announcements, newsList } = useLeague();
  const navigate = useNavigate(); 
  
  const [showAnnouncement, setShowAnnouncement] = useState(false);
  const [selectedAnnouncement, setSelectedAnnouncement] = useState(null);
  const [showC4, setShowC4] = useState(false); 
  const [showPromo, setShowPromo] = useState(true);
  const [selectedNews, setSelectedNews] = useState(null);

  // --- 1. 智能比赛获取逻辑 ---
  const liveMatch = useMemo(() => {
      const liveWithStream = matches.find(m => m.status === 'Live' && m.streamUrl);
      if (liveWithStream) return liveWithStream;

      const live = matches.find(m => m.status === 'Live');
      if (live) return live;

      const upcoming = matches.find(m => m.status === 'Upcoming');
      if (upcoming) return upcoming;

      return matches.length > 0 ? matches[0] : null;
  }, [matches]);

  const activeMatches = useMemo(() => {
    const live = matches.filter(m => m.status === 'Live');
    const upcoming = matches.filter(m => m.status === 'Upcoming');
    const finished = matches.filter(m => m.status === 'Finished').sort((a,b) => b.id - a.id);
    return [...live, ...upcoming, ...finished].slice(0, 4);
  }, [matches]);

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

  const topNews = useMemo(() => {
    if (!newsList) return [];
    return [...newsList].sort((a, b) => {
        if (a.isPinned === b.isPinned) return new Date(b.date) - new Date(a.date);
        return a.isPinned ? -1 : 1;
    }).slice(0, 5);
  }, [newsList]);

  // 获取 MVP 所属的赛事名称 (用于 MVP 卡片显示)
  const mvpTournamentName = useMemo(() => {
      if (siteConfig.featuredTournamentId) {
          const t = tournaments.find(t => t.id === siteConfig.featuredTournamentId);
          return t ? t.name : 'Season'; 
      }
      return 'All-Time'; 
  }, [siteConfig.featuredTournamentId, tournaments]);

  // ✅ [修改] 2. 更新地图映射函数，使用导入的变量
  const getMapImage = (mapName) => {
      // 默认图 (如果没选地图)
      if (!mapName) return 'https://wallpapers.com/images/hd/csgo-esports-background-728b584d584.jpg';
      
      const mapImages = {
          'Mirage': mirageBg,
          'Inferno': infernoBg,
          'Dust2': dust2Bg,
          'Nuke': nukeBg,
          'Ancient': ancientBg,
          //'Anubis': anubisBg, // 保持注释
          'Train': trainBg,
          //'Overpass': overpassBg, // 保持注释
          //'Vertigo': vertigoBg, // 保持注释
          //'Office': officeBg, // 保持注释

          // 兜底默认
          'default': 'https://images.unsplash.com/photo-1542751371-adc38448a05e?ixlib=rb-1.2.1&auto=format&fit=crop&w=1350&q=80'
      };
      
      return mapImages[mapName] || mapImages['default'];
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-zinc-800 via-zinc-950 to-black text-zinc-100 flex flex-col relative overflow-hidden pb-24 font-sans selection:bg-yellow-500/30">
        
        {/* 背景装饰 */}
        <div className="fixed inset-0 opacity-[0.03] pointer-events-none z-0" 
             style={{backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`}}>
        </div>
        <div className="absolute top-[-10%] left-1/2 -translate-x-1/2 w-[1000px] h-[600px] bg-indigo-900/20 blur-[120px] rounded-full pointer-events-none z-0 mix-blend-screen" />

        <div className="container mx-auto px-4 py-6 relative z-10 space-y-6 lg:space-y-8">
            
            {/* --- Hero 区域 (Grid布局) --- */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-auto lg:h-[500px]">
                
                {/* 1. 左侧 Hero Card - 【已还原为您最喜欢的样式】 */}
                <div className="lg:col-span-2 relative bg-zinc-900 rounded-[2rem] overflow-hidden border border-zinc-800 group shadow-2xl shadow-black/50 min-h-[400px]">
                     {/* 背景图：优先用配置图，否则用您原代码里的 Unsplash 图 */}
                     <div 
                        className="absolute inset-0 bg-cover bg-center opacity-50 group-hover:scale-105 group-hover:opacity-40 transition-all duration-1000 ease-out"
                        style={{
                            backgroundImage: `url('${siteConfig.heroImage || "https://images.unsplash.com/photo-1542751371-adc38448a05e?ixlib=rb-1.2.1&auto=format&fit=crop&w=1350&q=80"}')`
                        }}
                     ></div>
                     <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/60 to-transparent"></div>
                     <div className="absolute inset-0 bg-gradient-to-r from-zinc-950/80 to-transparent"></div>
                     <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-yellow-500 via-transparent to-transparent opacity-50"></div>

                     <div className="absolute bottom-0 left-0 p-6 md:p-10 z-10 w-full flex flex-col items-start">
                        {/* Tags */}
                        <div className="flex flex-wrap items-center gap-2 md:gap-3 mb-4 md:mb-6 animate-in slide-in-from-left-4 fade-in duration-700">
                            <div className="bg-red-600/90 backdrop-blur-sm text-white px-2 py-1 md:px-3 text-[10px] font-black uppercase tracking-widest flex items-center gap-2 rounded-sm shadow-[0_0_20px_rgba(220,38,38,0.4)]">
                                <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse"></span> Major Event
                            </div>
                            <div className="text-yellow-500 text-[10px] font-bold border border-yellow-500/30 px-3 py-1 rounded-sm bg-yellow-500/5 backdrop-blur-md">
                                SEASON 2025
                            </div>
                        </div>
                        
                        {/* Title - 【恢复超大字体和渐变】 */}
                        <h1 className="text-4xl md:text-6xl lg:text-7xl font-black text-white mb-4 leading-[0.95] tracking-tighter italic drop-shadow-xl animate-in slide-in-from-bottom-4 fade-in duration-700 delay-100 break-words w-full">
                          {siteConfig.heroTitle || "TGU CS MAJOR"} <br/>
                          <span className="text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 via-orange-500 to-yellow-300">
                             {siteConfig.heroSubtitle || "The Final Championship"}
                          </span>
                        </h1>
                        
                        {/* Date */}
                        <div className="flex items-center gap-3 text-zinc-400 mb-6 md:mb-8 font-mono text-xs md:text-sm pl-1 animate-in slide-in-from-bottom-4 fade-in duration-700 delay-200">
                            <Calendar size={16} className="text-yellow-500 flex-shrink-0"/>
                            <span className="border-l border-zinc-700 pl-3">{siteConfig.heroDate || "Coming Soon"}</span>
                        </div>
                        
                        {/* Buttons */}
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

                {/* 2. 右侧：功能区 (占 1/3) - 旗舰级视觉升级 */}
                <div className="lg:col-span-1 flex flex-col gap-6 h-full">
                    
                    {/* MVP 卡片 - 全息数据风格 */}
                    <div className="flex-1 relative rounded-[2rem] overflow-hidden border border-white/10 group cursor-default">
                        {/* 动态背景：深邃蓝流光 */}
                        <div className="absolute inset-0 bg-gradient-to-br from-zinc-900 via-black to-cyan-950/30"></div>
                        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-5 mix-blend-overlay"></div>
                        
                        {/* 悬停时的激光扫描线 */}
                        <div className="absolute top-0 left-0 w-full h-[2px] bg-cyan-400 shadow-[0_0_15px_#22d3ee] -translate-x-full group-hover:animate-[scan_1.5s_ease-in-out_infinite] opacity-0 group-hover:opacity-100"></div>

                        <div className="relative z-10 p-6 flex flex-col justify-between h-full">
                            <div className="flex justify-between items-start">
                                <div className="flex items-center gap-2">
                                    <div className="p-1.5 bg-yellow-500/10 rounded-md border border-yellow-500/20 text-yellow-500">
                                        <Crown size={14} fill="currentColor" />
                                    </div>
                                    {/* ✅ 显示 MVP 所属赛事 */}
                                    <span className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em]">
                                        {mvpTournamentName} MVP
                                    </span>
                                </div>
                                {/* 评分标签 */}
                                <div className="flex flex-col items-end">
                                    <span className="text-[10px] font-bold text-cyan-500 uppercase tracking-widest">Rating 2.0</span>
                                    <div className="h-0.5 w-8 bg-cyan-500/50 mt-1"></div>
                                </div>
                            </div>

                            <div className="mt-4">
                                <div className="text-4xl lg:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white to-zinc-600 italic tracking-tighter group-hover:from-cyan-400 group-hover:to-white transition-all duration-500">
                                    {topPlayer?.name || 'TBD'}
                                </div>
                                <div className="flex items-center gap-2 mt-1">
                                    <span className="w-1.5 h-1.5 bg-cyan-500 rounded-full shadow-[0_0_10px_#22d3ee]"></span>
                                    <span className="text-xs text-zinc-400 font-bold uppercase tracking-wider">{topPlayer?.team || 'NO DATA'}</span>
                                </div>
                            </div>

                            {/* 巨大化的评分数字背景 */}
                            <div className="absolute -bottom-6 -right-2 z-0 opacity-10 group-hover:opacity-20 transition-opacity duration-700">
                                <span className="text-[8rem] font-black text-white leading-none tracking-tighter">
                                    {topPlayer?.rating || '0.0'}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Live Match 卡片 - 战术监视器风格 */}
                    <div className="flex-[1.5] relative rounded-[2rem] overflow-hidden border border-white/10 shadow-2xl group">
                        {/* 1. 地图背景 + 电影级暗角 */}
                        <div className="absolute inset-0 z-0">
                            <img 
                                src={getMapImage(liveMatch?.currentMap)} 
                                className={`w-full h-full object-cover transition-transform duration-[2s] ease-out ${liveMatch ? 'group-hover:scale-110' : 'grayscale opacity-20'}`}
                                alt="Match Map"
                            />
                            {/* 上下渐变遮罩，保证文字清晰 */}
                            <div className="absolute inset-0 bg-gradient-to-b from-black/80 via-transparent to-black/90" />
                            {/* 网格纹理覆盖 */}
                            <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-10 mix-blend-overlay"></div>
                        </div>

                        {/* 2. 内容层 */}
                        <div className="relative z-10 p-6 flex flex-col h-full justify-between">
                            
                            {/* 顶部：状态指示器 */}
                            <div className="flex justify-between items-center border-b border-white/5 pb-3">
                                {liveMatch?.status === 'Live' ? (
                                    <div className="flex items-center gap-2">
                                        <span className="relative flex h-2.5 w-2.5">
                                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75"></span>
                                          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-600 shadow-[0_0_10px_#ef4444]"></span>
                                        </span>
                                        <span className="text-xs font-black text-white uppercase tracking-widest drop-shadow-[0_0_10px_rgba(220,38,38,0.8)]">LIVE NOW</span>
                                    </div>
                                ) : (
                                    <span className="text-xs font-bold text-zinc-400 uppercase tracking-widest flex items-center gap-2">
                                        <Activity size={12} /> Upcoming Match
                                    </span>
                                )}
                                {liveMatch && (
                                    <div className="px-2 py-0.5 bg-white/10 backdrop-blur rounded text-[10px] font-mono text-zinc-300 border border-white/10">
                                        BO{liveMatch.bo}
                                    </div>
                                )}
                            </div>

                            {/* ✅ [新增] 赛事和阶段信息显示 */}
                            {liveMatch && tournaments.length > 0 && (
                                <div className="flex justify-center mt-2">
                                    <div className="inline-flex items-center justify-center gap-1.5 px-3 py-1 rounded-full bg-zinc-950/50 border border-white/10 backdrop-blur-sm shadow-sm">
                                        <Trophy size={10} className="text-yellow-600" />
                                        <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider whitespace-nowrap max-w-[220px] truncate">
                                            {tournaments.find(t => t.id === liveMatch.tournamentId)?.name || ''}
                                            {liveMatch.stageId && (
                                                <>
                                                    <span className="mx-1.5 text-zinc-700">|</span>
                                                    {tournaments.find(t => t.id === liveMatch.tournamentId)?.stages?.find(s => s.id === liveMatch.stageId)?.name || ''}
                                                </>
                                            )}
                                        </span>
                                    </div>
                                </div>
                            )}

                            {/* 中部：对阵信息 */}
                            {liveMatch ? (
                                <div className="flex flex-col gap-1 mt-1">
                                    {/* Team A */}
                                    <div className="flex justify-between items-end group/team">
                                        <span className="text-xl font-black text-white tracking-tight truncate max-w-[70%] group-hover/team:text-yellow-400 transition-colors">
                                            {liveMatch.teamA}
                                        </span>
                                        <span className={`text-2xl font-mono font-bold leading-none ${liveMatch.scoreA > liveMatch.scoreB ? 'text-yellow-400 drop-shadow-[0_0_10px_rgba(250,204,21,0.5)]' : 'text-zinc-600'}`}>
                                            {liveMatch.scoreA}
                                        </span>
                                    </div>
                                    {/* VS 分割线 */}
                                    <div className="w-full h-px bg-gradient-to-r from-transparent via-white/20 to-transparent my-1"></div>
                                    {/* Team B */}
                                    <div className="flex justify-between items-end group/team">
                                        <span className="text-xl font-black text-white tracking-tight truncate max-w-[70%] group-hover/team:text-yellow-400 transition-colors">
                                            {liveMatch.teamB}
                                        </span>
                                        <span className={`text-2xl font-mono font-bold leading-none ${liveMatch.scoreB > liveMatch.scoreA ? 'text-yellow-400 drop-shadow-[0_0_10px_rgba(250,204,21,0.5)]' : 'text-zinc-600'}`}>
                                            {liveMatch.scoreB}
                                        </span>
                                    </div>
                                </div>
                            ) : (
                                <div className="flex-1 flex items-center justify-center">
                                    <div className="text-center">
                                        <Trophy size={32} className="text-zinc-700 mx-auto mb-2" />
                                        <div className="text-zinc-500 text-xs font-bold uppercase tracking-wider">No Match Scheduled</div>
                                    </div>
                                </div>
                            )}

                            {/* 底部：交互按钮 */}
                            {liveMatch?.status === 'Live' && liveMatch?.streamUrl ? (
                                <a href={liveMatch.streamUrl} target="_blank" rel="noopener noreferrer" className="mt-4 w-full group/btn relative overflow-hidden bg-red-600 hover:bg-red-500 text-white py-3 rounded-xl font-black text-xs uppercase tracking-[0.2em] flex items-center justify-center gap-2 transition-all shadow-lg hover:shadow-red-900/50">
                                    <div className="absolute inset-0 w-full h-full bg-[linear-gradient(45deg,transparent_25%,rgba(255,255,255,0.2)_50%,transparent_75%)] bg-[length:250%_250%] animate-[shimmer_2s_infinite]"></div>
                                    <Tv size={14} className="relative z-10" /> <span className="relative z-10">Watch Stream</span>
                                </a>
                            ) : (
                                <button onClick={() => navigate('/matches')} className="mt-4 w-full bg-white/5 hover:bg-white/10 border border-white/5 text-zinc-300 hover:text-white py-3 rounded-xl font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 backdrop-blur transition-all">
                                    Match Details <ArrowRight size={12}/>
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* --- Bento Grid 下半部分 (新闻 + 侧边栏) --- */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* 左侧：新闻列表 (8列) - 杂志风格 */}
                <div className="lg:col-span-8 space-y-6">
                    <div className="flex items-center justify-between border-b border-white/5 pb-4">
                        <h2 className="text-2xl font-black text-white italic uppercase flex items-center gap-3">
                            <span className="w-1.5 h-6 bg-yellow-500 rounded-sm shadow-[0_0_15px_rgba(234,179,8,0.5)]"></span>
                            Headlines
                        </h2>
                        <Link to="/news" className="text-xs font-bold text-zinc-500 hover:text-white transition-colors flex items-center gap-1">
                            VIEW ARCHIVE <ArrowRight size={12}/>
                        </Link>
                    </div>

                    <div className="flex flex-col gap-3">
                        {topNews.length > 0 ? topNews.map((news, idx) => (
                            <div 
                                key={news.id} 
                                onClick={() => setSelectedNews(news)}
                                className="group relative flex items-center gap-4 p-2 pr-6 bg-zinc-900/30 hover:bg-zinc-800/50 border border-white/5 hover:border-yellow-500/30 rounded-2xl transition-all cursor-pointer overflow-hidden"
                            >
                                {/* 悬停光效 */}
                                <div className="absolute inset-0 bg-gradient-to-r from-yellow-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"/>

                                {/* 图片区 - 缩小为精致的缩略图 */}
                                <div className="relative w-24 h-24 md:w-48 md:h-32 rounded-xl overflow-hidden shrink-0">
                                    <img 
                                        src={news.cover || '/api/placeholder/400/320'} 
                                        alt={news.title} 
                                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 filter brightness-75 group-hover:brightness-100" 
                                    />
                                    {news.isPinned && (
                                        <div className="absolute top-0 left-0 bg-yellow-500 text-black p-1 rounded-br-lg z-10 shadow-lg">
                                            <Pin size={12} className="fill-black"/>
                                        </div>
                                    )}
                                </div>

                                {/* 内容区 */}
                                <div className="flex-1 py-1 min-w-0">
                                    <div className="flex items-center gap-3 mb-1.5">
                                        <span className="text-[10px] font-mono text-zinc-500 uppercase flex items-center gap-1 bg-black/30 px-2 py-0.5 rounded border border-white/5">
                                            <Calendar size={10} /> {new Date(news.date).toLocaleDateString()}
                                        </span>
                                        {/* 装饰性 Tag */}
                                        <span className="w-1 h-1 rounded-full bg-zinc-600"></span>
                                        <span className="text-[10px] font-bold text-yellow-500/80 uppercase tracking-wider">
                                            News
                                        </span>
                                    </div>

                                    <h3 className="text-base md:text-xl font-bold text-white leading-tight group-hover:text-yellow-400 transition-colors line-clamp-2 mb-2">
                                        {news.title}
                                    </h3>
                                    
                                    <p className="text-xs text-zinc-400 line-clamp-1 md:line-clamp-2 w-[90%] group-hover:text-zinc-300 transition-colors">
                                        {news.description}
                                    </p>
                                </div>

                                {/* 箭头图标 (PC端显示) */}
                                <div className="hidden md:flex items-center justify-center w-10 h-10 rounded-full border border-white/5 group-hover:bg-yellow-500 group-hover:text-black group-hover:border-yellow-500 transition-all">
                                    <ArrowRight size={16} className="group-hover:-rotate-45 transition-transform duration-300"/>
                                </div>
                            </div>
                        )) : (
                            <div className="text-zinc-600 text-center py-10 border border-zinc-800 border-dashed rounded-xl bg-black/20">
                                暂无新闻数据
                            </div>
                        )}
                    </div>
                </div>

                <div className="lg:col-span-4 space-y-6">
                    <div className="bg-black/20 backdrop-blur-xl border border-white/5 p-6 rounded-[1.5rem] relative overflow-hidden">
                        <h3 className="text-xs font-black text-zinc-500 uppercase tracking-widest mb-4 flex items-center gap-2"><Activity size={14} className="text-green-500"/> Match Center</h3>
                        <div className="space-y-3">
                            {activeMatches.map(match => (
                                <div key={match.id} className="bg-zinc-900/50 rounded-xl p-3 border border-white/5 hover:border-white/10 transition-colors">
                                    <div className="flex justify-between items-center text-[10px] font-bold text-zinc-400 mb-2">
                                        {match.status === 'Live' ? <span className="text-red-500 animate-pulse">● LIVE</span> : <span>{match.status.toUpperCase()}</span>}
                                        <span>BO{match.bo}</span>
                                    </div>
                                    <div className="flex justify-between items-center text-xs font-bold text-white">
                                        <span>{match.teamA}</span>
                                        <span className="font-mono text-zinc-500">{match.scoreA}:{match.scoreB}</span>
                                        <span>{match.teamB}</span>
                                    </div>
                                </div>
                            ))}
                            {activeMatches.length === 0 && <div className="text-center text-zinc-600 text-xs">暂无数据</div>}
                        </div>
                        <button onClick={() => navigate('/matches')} className="w-full mt-4 text-xs font-bold text-zinc-500 hover:text-white text-center uppercase py-2 hover:bg-white/5 rounded transition-colors">View All Matches</button>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div onClick={() => navigate('/stats')} className="bg-zinc-900/40 p-5 rounded-2xl border border-white/5 hover:-translate-y-1 transition-transform cursor-pointer group">
                             <BarChart3 className="text-cyan-500 mb-3 group-hover:scale-110 transition-transform" size={24} />
                             <div className="text-sm font-bold text-white">Stats</div>
                             <div className="text-[10px] text-zinc-500">Player Data</div>
                        </div>
                        <div onClick={() => navigate('/pickem')} className="bg-yellow-900/10 p-5 rounded-2xl border border-yellow-500/10 hover:-translate-y-1 transition-transform cursor-pointer group hover:bg-yellow-900/20">
                            <Trophy className="text-yellow-500 mb-3 group-hover:scale-110 transition-transform" size={24} />
                            <div className="text-sm font-bold text-white">Pick'Em</div>
                            <div className="text-[10px] text-yellow-500/60">Win Badges</div>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <button onClick={() => setShowC4(true)} className="fixed bottom-6 right-6 z-50 w-14 h-14 bg-zinc-950 border border-red-500/30 text-red-500 rounded-2xl shadow-[0_0_30px_rgba(220,38,38,0.3)] flex items-center justify-center hover:scale-110 hover:bg-red-950 hover:border-red-500 transition-all duration-300 group">
           <Bomb size={24} className="group-hover:animate-[wiggle_0.5s_infinite]" />
           <span className="absolute top-[-4px] right-[-4px] w-3 h-3 bg-red-600 rounded-full animate-ping border-2 border-zinc-900"></span>
        </button>

        {user && showC4 && <C4Modal onClose={() => setShowC4(false)} />}
        {showPromo && (
           <div className="fixed inset-0 z-[90] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
               <div className="bg-zinc-950 border border-yellow-500/20 w-full max-w-sm rounded-[2rem] shadow-2xl relative overflow-hidden animate-in zoom-in-95">
                   <button onClick={() => setShowPromo(false)} className="absolute top-4 right-4 text-zinc-500 hover:text-white"><X size={20} /></button>
                   <div className="p-8 text-center flex flex-col items-center">
                       <div className="w-14 h-14 bg-yellow-500/10 rounded-xl flex items-center justify-center mb-4 text-yellow-500"><Trophy size={28}/></div>
                       <h3 className="text-2xl font-black text-white italic uppercase mb-2">Major Pick'Em</h3>
                       <p className="text-zinc-400 text-xs mb-6">预测赛程，赢取限定徽章。</p>
                       <div className="flex gap-2 w-full">
                           <button onClick={() => setShowPromo(false)} className="flex-1 py-2.5 rounded-xl bg-zinc-900 text-zinc-400 text-xs font-bold">Close</button>
                           <button onClick={() => { setShowPromo(false); navigate('/pickem'); }} className="flex-1 py-2.5 rounded-xl bg-yellow-500 text-black text-xs font-black uppercase">Play Now</button>
                       </div>
                   </div>
               </div>
           </div>
        )}
        
        {selectedNews && (
            <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-[100] flex items-center justify-center p-4 animate-in fade-in" onClick={() => setSelectedNews(null)}>
                <div className="bg-zinc-900 border border-zinc-700 max-w-3xl w-full rounded-2xl overflow-hidden shadow-2xl relative animate-in zoom-in-95" onClick={e => e.stopPropagation()}>
                    <button onClick={() => setSelectedNews(null)} className="absolute top-4 right-4 bg-black/50 p-2 rounded-full text-white hover:bg-red-500 transition-colors z-20"><X size={20}/></button>
                    <div className="h-64 relative">
                         <div className="absolute inset-0 bg-gradient-to-t from-zinc-900 to-transparent z-10"/>
                         <img src={selectedNews.cover || '/api/placeholder/800/400'} className="w-full h-full object-cover"/>
                         <div className="absolute bottom-4 left-6 z-20 right-6">
                             <h2 className="text-2xl md:text-3xl font-black text-white italic">{selectedNews.title}</h2>
                         </div>
                    </div>
                    <div className="p-8 max-h-[50vh] overflow-y-auto">
                        <div className="text-zinc-300 leading-relaxed whitespace-pre-line text-sm">{selectedNews.description}</div>
                        {selectedNews.link && (
                            <a href={selectedNews.link} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 mt-6 text-yellow-500 hover:text-yellow-400 font-bold text-sm">
                                阅读原文 <ArrowRight size={14}/>
                            </a>
                        )}
                    </div>
                </div>
            </div>
        )}
    </div>
  );
}