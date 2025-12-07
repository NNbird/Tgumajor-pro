import React from 'react';
import { useLeague } from '../context/LeagueContext';
import { Trophy, Medal, Users } from 'lucide-react';

export default function History() {
  const { historyTournaments } = useLeague();

  const sortedHistory = historyTournaments;

  return (
    // [优化] 使用 min-h 并在底部增加 pb-20 (防止被手机导航栏遮挡)
    <div className="animate-in fade-in w-full min-h-[calc(100vh-100px)] flex flex-col pb-20 md:pb-0">
      
      {/* 标题区域：手机端字体调小，增加顶部留白 */}
      <div className="mb-4 md:mb-6 px-4 pt-4 md:pt-0">
        <h2 className="text-2xl md:text-4xl font-black text-white flex items-center">
          <Trophy className="text-yellow-500 mr-2 md:mr-3" size={28}/> {/* 图标响应式大小 */}
          MAJOR HISTORY
        </h2>
        <p className="text-zinc-400 text-xs md:text-base">Counter-Strike 职业赛事名人堂</p>
      </div>

      {/* 横向滚动容器：增加 snap-x 实现磁吸滑动效果 */}
      <div className="flex-1 overflow-x-auto custom-scrollbar pb-8 px-4 flex gap-4 items-stretch snap-x snap-mandatory">
        {sortedHistory.map((item, index) => (
          <HistoryBanner key={item.id} data={item} index={index} />
        ))}
        
        {/* 占位符 */}
        <div className="w-4 flex-shrink-0"></div>
      </div>
    </div>
  );
}

// 单个锦标赛 Banner 组件
function HistoryBanner({ data, index }) {
  const gradients = [
    "from-yellow-900/20 to-black",
    "from-blue-900/20 to-black",
    "from-red-900/20 to-black",
    "from-purple-900/20 to-black",
    "from-emerald-900/20 to-black",
  ];
  const bgClass = gradients[index % gradients.length];

  return (
    // [核心优化] 
    // 1. w-[85vw]: 手机端宽度占屏幕 85%，留出一点边缘暗示后面还有内容
    // 2. sm:w-72 md:w-80: 平板和电脑端保持固定宽度
    // 3. snap-center: 滑动停止时自动居中
    <div className={`relative w-[85vw] sm:w-72 md:w-80 flex-shrink-0 bg-zinc-950 border border-zinc-800 flex flex-col overflow-hidden group hover:border-yellow-500/50 transition-all duration-500 snap-center rounded-xl`}>
      
      {/* 背景装饰 */}
      <div className={`absolute inset-0 bg-gradient-to-b ${bgClass} opacity-50 pointer-events-none`}></div>
      <div className="absolute top-0 left-0 w-full h-1 bg-zinc-800 group-hover:bg-yellow-500 transition-colors duration-500"></div>

      {/* 顶部：赛事名称 */}
      <div className="relative z-10 pt-6 pb-2 text-center px-4">
        <div className="text-[10px] font-mono text-zinc-500 mb-1">{data.year}</div>
        <h3 className="text-xl md:text-2xl font-black text-white leading-tight uppercase italic tracking-tighter text-shadow">
          {data.name}
        </h3>
      </div>

      {/* 中间：冠军展示区 */}
      <div className="relative z-10 flex-1 flex flex-col items-center justify-center py-6 border-y border-white/5 bg-black/20 group/champion min-h-[200px]">
        
        {/* 默认显示：冠军奖杯 + 队名 */}
        <div className="absolute inset-0 flex flex-col items-center justify-center transition-opacity duration-300 group-hover:opacity-0 opacity-100 p-4">
           <Trophy size={64} className="text-yellow-500 mb-4 drop-shadow-[0_0_15px_rgba(234,179,8,0.5)]"/>
           <div className="text-[10px] text-yellow-500/80 font-bold uppercase tracking-widest mb-2">Champion</div>
           <div className="text-3xl font-black text-white text-center px-2 break-words w-full leading-none">
             {data.champion.team}
           </div>
        </div>

        {/* 悬停/点击显示：冠军成员名单 */}
        {/* 手机端点击卡片即可触发 hover 效果 */}
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/90 backdrop-blur-md transition-opacity duration-300 group-hover:opacity-100 opacity-0 px-4">
           <div className="text-yellow-500 font-black text-xl mb-4 border-b border-yellow-500/30 pb-2 w-full text-center uppercase italic tracking-tighter truncate">
             {data.champion.team}
           </div>
           
           <div className="space-y-2 w-full">
             {data.champion.players.map((player, i) => (
               <div key={i} className="flex items-center justify-center text-white font-bold tracking-wider text-base hover:text-yellow-200 transition-colors cursor-default">
                 <span className="w-1.5 h-1.5 bg-yellow-500 rounded-full mr-2 opacity-80 shadow-[0_0_5px_rgba(234,179,8,0.8)]"></span>
                 {player || '-'}
               </div>
             ))}
           </div>
        </div>
      </div>

      {/* 底部：排名列表 */}
      <div className="relative z-10 p-6 space-y-4 bg-gradient-to-t from-black to-transparent">
        
        {/* 亚军 */}
        <div className="text-center">
           <div className="text-[9px] text-zinc-500 uppercase tracking-widest mb-1 flex items-center justify-center gap-1">
             <Medal size={12}/> Finalist
           </div>
           <div className="text-lg font-bold text-zinc-200 truncate px-2">{data.finalist}</div>
        </div>

        {/* 四强 */}
        <div className="text-center pt-3 border-t border-white/5">
           <div className="text-[9px] text-zinc-500 uppercase tracking-widest mb-2">Semi-Finalists</div>
           <div className="flex flex-col gap-1">
             {data.semis.map((t,i) => <div key={i} className="text-sm text-zinc-400 font-medium truncate px-2">{t}</div>)}
           </div>
        </div>

        {/* 八强 */}
        <div className="text-center pt-3 border-t border-white/5">
           <div className="text-[9px] text-zinc-600 uppercase tracking-widest mb-2">Quarter-Finalists</div>
           <div className="grid grid-cols-2 gap-x-2 gap-y-1">
             {data.quarters.map((t,i) => <div key={i} className="text-xs text-zinc-500 truncate px-1">{t}</div>)}
           </div>
        </div>

      </div>
    </div>
  );
}