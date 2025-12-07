import React, { useState, useMemo } from 'react';
import { useLeague } from '../context/LeagueContext';
import { Tv, Calendar, Map, Trophy, Layers } from 'lucide-react';

export default function Matches() {
  const { matches, tournaments } = useLeague();
  const [filter, setFilter] = useState({ tourId: '', stageId: '' });

  // 获取当前选中的赛事对象
  const currentTournament = tournaments.find(t => t.id === filter.tourId);
  
  // 获取阶段列表 (如果选了赛事)
  const currentStages = currentTournament?.stages || [];

  // --- 分组逻辑 ---
  const groupedMatches = useMemo(() => {
    // 1. 基础过滤：先筛出属于当前赛事的比赛
    let baseMatches = matches;
    if (filter.tourId) {
        baseMatches = baseMatches.filter(m => m.tournamentId === filter.tourId);
    }

    // 2. 如果选择了具体阶段，或者没选赛事 -> 不分组，直接返回单组
    if (filter.stageId || !filter.tourId) {
        if (filter.stageId) {
            baseMatches = baseMatches.filter(m => m.stageId === filter.stageId);
        }
        // 没有分组，返回一个默认组
        return [{ title: null, data: baseMatches }];
    }

    // 3. 如果选了赛事但没选阶段 -> 按阶段倒序分组
    // (假设 stages 数组是按时间正序录入的: 小组赛 -> 淘汰赛 -> 决赛)
    // 我们需要倒序展示: 决赛 -> 淘汰赛 -> 小组赛
    const groups = [];
    const reversedStages = [...currentStages].reverse(); // 倒序

    reversedStages.forEach(stage => {
        const stageMatches = baseMatches.filter(m => m.stageId === stage.id);
        if (stageMatches.length > 0) {
            groups.push({
                title: stage.name,
                id: stage.id,
                data: stageMatches
            });
        }
    });

    // 处理未分配阶段的比赛 (放在最后)
    const uncategorized = baseMatches.filter(m => !m.stageId);
    if (uncategorized.length > 0) {
        groups.push({ title: '其他 / 未分类', id: 'other', data: uncategorized });
    }

    return groups;

  }, [matches, filter, currentStages]);


  return (
    <div className="animate-in fade-in max-w-4xl mx-auto pb-20">
      <h2 className="text-4xl font-black text-white mb-8 text-center flex items-center justify-center">
        <Calendar className="mr-3 text-yellow-500" size={36}/>
        赛事日程
      </h2>
      
      {/* --- 筛选器 --- */}
      <div className="flex flex-col md:flex-row justify-center gap-4 mb-10">
          <div className="relative group">
            <select 
                value={filter.tourId} 
                onChange={e => setFilter({ tourId: e.target.value, stageId: '' })} 
                className="appearance-none bg-zinc-900 border border-zinc-700 text-white pl-4 pr-10 py-3 rounded-lg outline-none focus:border-yellow-500 transition-all cursor-pointer hover:border-zinc-600 min-w-[200px]"
            >
                <option value="">全部赛事</option>
                {tournaments.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
            <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-zinc-500">▼</div>
          </div>

          {filter.tourId && (
              <div className="relative animate-in fade-in slide-in-from-left-2">
                <select 
                    value={filter.stageId} 
                    onChange={e => setFilter({ ...filter, stageId: e.target.value })} 
                    className="appearance-none bg-zinc-900 border border-zinc-700 text-white pl-4 pr-10 py-3 rounded-lg outline-none focus:border-yellow-500 transition-all cursor-pointer hover:border-zinc-600 min-w-[150px]"
                >
                    <option value="">全部阶段 (按赛程倒序)</option>
                    {currentStages.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
                <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-zinc-500">▼</div>
              </div>
          )}
      </div>

      {/* --- 列表渲染 (支持分组) --- */}
      {groupedMatches.every(g => g.data.length === 0) && (
          <div className="text-center py-12 border border-dashed border-zinc-800 rounded-xl bg-zinc-900/30">
              <Trophy size={48} className="mx-auto text-zinc-700 mb-4"/>
              <p className="text-zinc-500">暂无符合条件的比赛安排</p>
          </div>
      )}

      <div className="space-y-8">
        {groupedMatches.map((group, groupIdx) => (
            group.data.length > 0 && (
                <div key={groupIdx} className="animate-in fade-in slide-in-from-bottom-2">
                    {/* 分组标题 */}
                    {group.title && (
                        <div className="flex items-center mb-4">
                            <div className="h-px flex-1 bg-gradient-to-r from-transparent to-zinc-800"></div>
                            <div className="px-4 py-1 border border-zinc-800 bg-zinc-900/50 rounded-full text-zinc-400 text-xs font-bold uppercase tracking-widest flex items-center">
                                <Layers size={12} className="mr-2 text-yellow-500"/>
                                {group.title}
                            </div>
                            <div className="h-px flex-1 bg-gradient-to-l from-transparent to-zinc-800"></div>
                        </div>
                    )}

                    <div className="space-y-4">
                        {group.data.map(m => {
                            // 查找关联的赛事名称和阶段名称 (如果未选赛事，需要显示)
                            const tourName = !filter.tourId ? tournaments.find(t => t.id === m.tournamentId)?.name : '';
                            
                            return (
                                <div key={m.id} className="bg-zinc-900 border border-zinc-800 overflow-hidden relative group hover:border-zinc-600 transition-all rounded-sm shadow-md hover:shadow-xl">
                                    
                                    {/* 赛事标签 (仅在全选模式显示) */}
                                    {tourName && (
                                        <div className="absolute top-0 left-0 bg-zinc-800 text-[9px] text-zinc-400 px-2 py-1 rounded-br font-mono uppercase tracking-wider z-20 border-r border-b border-zinc-700">
                                            {tourName}
                                        </div>
                                    )}

                                    {/* Live 标签 */}
                                    {m.status === 'Live' && (
                                        <div className="absolute top-0 right-0 bg-red-600 text-white text-[10px] font-bold px-3 py-1 uppercase animate-pulse z-20">
                                            Live
                                        </div>
                                    )}
                                    
                                    <div className="p-6 flex flex-col md:flex-row items-center relative z-10 mt-2">
                                        {/* Team A */}
                                        <div className="flex-1 flex justify-end items-center gap-4 text-right w-full md:w-auto">
                                            <span className="text-2xl font-black text-white truncate">{m.teamA}</span>
                                            <div className={`w-2 h-10 rounded-sm ${m.scoreA > m.scoreB ? 'bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.5)]' : 'bg-zinc-800'}`}></div>
                                        </div>

                                        {/* 比分与信息 */}
                                        <div className="px-8 text-center min-w-[200px] py-4 md:py-0">
                                            <div className={`text-5xl font-mono font-black tracking-tighter ${m.status === 'Live' ? 'text-red-500' : 'text-white'}`}>
                                                {m.scoreA} <span className="text-zinc-600 mx-1">:</span> {m.scoreB}
                                            </div>
                                            <div className="text-xs text-zinc-500 mt-2 uppercase font-bold tracking-widest">
                                                {m.status} <span className="mx-1 text-zinc-700">|</span> BO{m.bo}
                                            </div>
                                            
                                            {/* 直播按钮 */}
                                            {m.status === 'Live' && m.streamUrl && (
                                                <a 
                                                href={m.streamUrl} 
                                                target="_blank" 
                                                rel="noopener noreferrer"
                                                className="mt-3 inline-flex items-center gap-1.5 bg-purple-600 hover:bg-purple-500 text-white text-[10px] font-bold px-4 py-1.5 rounded-full transition-all shadow-lg shadow-purple-900/50 animate-pulse hover:scale-105"
                                                >
                                                    <Tv size={12} /> 进入直播间
                                                </a>
                                            )}
                                        </div>

                                        {/* Team B */}
                                        <div className="flex-1 flex justify-start items-center gap-4 text-left w-full md:w-auto">
                                            <div className={`w-2 h-10 rounded-sm ${m.scoreB > m.scoreA ? 'bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.5)]' : 'bg-zinc-800'}`}></div>
                                            <span className="text-2xl font-black text-white truncate">{m.teamB}</span>
                                        </div>
                                    </div>
                                    
                                    {/* 地图详情 */}
                                    {m.maps.length > 0 && (
                                    <div className="bg-black/40 py-2 px-4 flex flex-wrap justify-center gap-4 text-xs border-t border-zinc-800/50 relative z-10">
                                        {m.maps.map((map, i) => (
                                        <span key={i} className="text-zinc-500 font-mono flex items-center">
                                            <Map size={10} className="mr-1 opacity-50"/>
                                            {map.name}: <span className={`ml-1 font-bold ${map.winner ? 'text-white' : 'text-zinc-400'}`}>{map.score}</span>
                                        </span>
                                        ))}
                                    </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
            )
        ))}
      </div>
    </div>
  );
}