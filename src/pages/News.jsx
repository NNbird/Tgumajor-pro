import React from 'react';
import { useLeague } from '../context/LeagueContext';
import { Calendar, ArrowUpRight, Pin, Zap } from 'lucide-react';

export default function News() {
  const { newsList } = useLeague();

  return (
    <div className="min-h-screen pb-20 animate-in fade-in">
      {/* 顶部 Hero 区域 */}
      <div className="relative py-16 mb-12 border-b border-white/5 bg-zinc-900/50">
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-10"></div>
        <div className="max-w-7xl mx-auto px-6 relative z-10">
           <h1 className="text-5xl md:text-7xl font-black text-white italic tracking-tighter mb-4">
              LATEST <span className="text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-orange-500">NEWS</span>
           </h1>
           <p className="text-zinc-400 max-w-2xl text-lg">
              追踪 TGU Major 赛事的最新动态、战报分析与独家专访。
           </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6">
        {newsList.length === 0 ? (
            <div className="text-center py-20 text-zinc-500 border-2 border-dashed border-zinc-800 rounded-xl">
                暂无新闻资讯
            </div>
        ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {newsList.map((item, index) => (
                    <a 
                        key={item.id} 
                        href={item.link} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className={`group relative flex flex-col bg-zinc-900 border rounded-2xl overflow-hidden hover:-translate-y-2 transition-all duration-300 shadow-xl ${
                            item.isPinned 
                            ? 'border-yellow-500/50 shadow-[0_0_30px_rgba(234,179,8,0.15)] md:col-span-2 lg:col-span-2' // 置顶新闻占两格
                            : 'border-zinc-800 hover:border-zinc-600'
                        }`}
                    >
                        {/* 封面图 */}
                        <div className={`relative overflow-hidden ${item.isPinned ? 'h-64 md:h-80' : 'h-48'}`}>
                            <img 
                                src={item.cover} 
                                alt={item.title} 
                                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-zinc-900 via-zinc-900/20 to-transparent"></div>
                            
                            {/* 置顶标记 */}
                            {item.isPinned && (
                                <div className="absolute top-4 left-4 bg-yellow-500 text-black text-xs font-black uppercase px-3 py-1 rounded flex items-center gap-1 shadow-lg">
                                    <Pin size={12} className="fill-black"/> TOP STORY
                                </div>
                            )}
                            
                            {/* 外部链接图标 */}
                            <div className="absolute top-4 right-4 bg-black/50 backdrop-blur text-white p-2 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                                <ArrowUpRight size={20}/>
                            </div>
                        </div>

                        {/* 内容区 */}
                        <div className="p-6 flex flex-col flex-1 relative">
                            {/* 装饰光效 */}
                            {item.isPinned && <div className="absolute top-0 left-10 w-32 h-32 bg-yellow-500/10 blur-[50px] pointer-events-none"></div>}

                            <div className="flex items-center gap-3 text-xs text-zinc-500 mb-3 font-mono">
                                <span className="flex items-center gap-1"><Calendar size={12}/> {item.date}</span>
                                {item.isPinned && <span className="text-yellow-500 flex items-center gap-1"><Zap size={12}/> Recommended</span>}
                            </div>
                            
                            <h3 className={`font-bold text-white mb-3 group-hover:text-yellow-500 transition-colors leading-tight ${item.isPinned ? 'text-3xl' : 'text-xl'}`}>
                                {item.title}
                            </h3>
                            
                            <p className="text-zinc-400 text-sm leading-relaxed line-clamp-3 mb-4 flex-1">
                                {item.description}
                            </p>
                            
                            <div className="text-xs font-bold text-zinc-500 group-hover:text-white uppercase tracking-widest flex items-center gap-2 mt-auto">
                                Read More <div className="h-px w-8 bg-zinc-700 group-hover:bg-yellow-500 transition-colors"></div>
                            </div>
                        </div>
                    </a>
                ))}
            </div>
        )}
      </div>
    </div>
  );
}