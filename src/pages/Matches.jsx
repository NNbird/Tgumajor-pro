import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios'; // [新增] 用于请求带吉祥物的数据
import { useLeague } from '../context/LeagueContext';
import { Tv, Calendar, Map, Trophy, Layers, Loader2 } from 'lucide-react';

// --- 🦁 [新增] 内部组件：吉祥物展示 ---
const MatchMascot = ({ url, side }) => {
  if (!url) return null;

  // 左侧战队(Left)：摄像机放在左边(-35deg)，看着右边的对手
  // 右侧战队(Right)：摄像机放在右边(35deg)，看着左边的对手
  const cameraOrbit = side === 'left' ? '-35deg 75deg 105%' : '35deg 75deg 105%';

  return (
    <div className={`relative w-20 h-20 md:w-24 md:h-24 shrink-0 flex items-center justify-center ${side === 'left' ? 'order-first' : 'order-last'}`}>
      {/* 底部微光特效，增加立体感 */}
      <div className={`absolute bottom-2 left-1/2 -translate-x-1/2 w-12 h-3 blur-md rounded-full ${side === 'left' ? 'bg-indigo-500/30' : 'bg-pink-500/30'}`}></div>
      
      <model-viewer
        src={url}
        camera-orbit={cameraOrbit}
        disable-zoom
        disable-pan
        interaction-prompt="none"
        auto-rotate
        rotation-per-second="5deg"
        shadow-intensity="1.5"
        shadow-softness="0.8"
        environment-image="neutral"
        style={{ width: '100%', height: '100%' }}
      ></model-viewer>
    </div>
  );
};

export default function Matches() {
  const { tournaments } = useLeague(); // 仅从 Context 获取赛事列表
  const [matches, setMatches] = useState([]); // [修改] 本地状态存储带吉祥物的比赛数据
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState({ tourId: '', stageId: '' });

  // [新增] 初始加载：请求后端独立接口获取 enriched matches
  useEffect(() => {
    const fetchMatches = async () => {
      try {
        const res = await axios.get('/api/matches');
        if (res.data.success) {
          setMatches(res.data.matches);
        }
      } catch (err) {
        console.error("加载比赛失败", err);
      } finally {
        setLoading(false);
      }
    };
    fetchMatches();
  }, []);

  // 获取当前选中的赛事对象
  const currentTournament = tournaments.find(t => t.id === parseInt(filter.tourId));
  
  // 获取阶段列表 (如果选了赛事)
  const currentStages = currentTournament?.stages || [];

  // --- 分组逻辑 ---
  const groupedMatches = useMemo(() => {
    // 1. 基础过滤
    let baseMatches = matches;
    if (filter.tourId) {
        // 注意：API 返回的可能是 int 或 string，建议统一 parseInt 比较
        baseMatches = baseMatches.filter(m => parseInt(m.tournamentId) === parseInt(filter.tourId));
    }

    // 2. 如果选择了具体阶段，或者没选赛事 -> 不分组
    if (filter.stageId || !filter.tourId) {
        if (filter.stageId) {
            baseMatches = baseMatches.filter(m => m.stageId === filter.stageId);
        }
        return [{ title: null, data: baseMatches }];
    }

    // 3. 倒序分组
    const groups = [];
    const reversedStages = [...currentStages].reverse();

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

    const uncategorized = baseMatches.filter(m => !m.stageId);
    if (uncategorized.length > 0) {
        groups.push({ title: '其他 / 未分类', id: 'other', data: uncategorized });
    }

    return groups;

  }, [matches, filter, currentStages]);

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center text-zinc-500">
        <Loader2 className="animate-spin mr-2"/> 加载赛程...
    </div>
  );

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
                            const tourName = !filter.tourId ? tournaments.find(t => t.id === m.tournamentId)?.name : '';
                            
                            return (
                                <div key={m.id} className="bg-zinc-900 border border-zinc-800 overflow-hidden relative group hover:border-zinc-600 transition-all rounded-sm shadow-md hover:shadow-xl">
                                    
                                    {/* 赛事标签 */}
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
                                        
                                        {/* --- Team A (左侧) --- */}
                                        <div className="flex-1 flex justify-end items-center gap-4 text-right w-full md:w-auto">
                                            {/* [插入点] 吉祥物：放在最左边 (order-first) */}
                                            <MatchMascot url={m.teamAMascotUrl} side="left" />
                                            
                                            <div className="flex flex-col items-end">
                                                <span className="text-2xl font-black text-white truncate">{m.teamA}</span>
                                                {/* 小 Verified 标，如果有吉祥物的话 */}
                                                {m.teamAMascotUrl && <span className="text-[9px] bg-indigo-900/30 text-indigo-400 px-1 rounded border border-indigo-900/50">Verified</span>}
                                            </div>
                                            
                                            <div className={`w-2 h-10 rounded-sm ${m.scoreA > m.scoreB ? 'bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.5)]' : 'bg-zinc-800'}`}></div>
                                        </div>

                                        {/* --- 比分与信息 --- */}
                                        <div className="px-8 text-center min-w-[200px] py-4 md:py-0">
                                            <div className={`text-5xl font-mono font-black tracking-tighter ${m.status === 'Live' ? 'text-red-500' : 'text-white'}`}>
                                                {m.scoreA} <span className="text-zinc-600 mx-1">:</span> {m.scoreB}
                                            </div>
                                            <div className="text-xs text-zinc-500 mt-2 uppercase font-bold tracking-widest">
                                                {m.status} <span className="mx-1 text-zinc-700">|</span> BO{m.bo}
                                            </div>
                                            
                                            {/* 直播按钮 */}
                                            {m.status === 'Live' && m.streamUrl && (
                                                <a href={m.streamUrl} target="_blank" rel="noopener noreferrer" className="mt-3 inline-flex items-center gap-1.5 bg-purple-600 hover:bg-purple-500 text-white text-[10px] font-bold px-4 py-1.5 rounded-full transition-all shadow-lg shadow-purple-900/50 animate-pulse hover:scale-105">
                                                    <Tv size={12} /> 进入直播间
                                                </a>
                                            )}
                                        </div>

                                        {/* --- Team B (右侧) --- */}
                                        <div className="flex-1 flex justify-start items-center gap-4 text-left w-full md:w-auto">
                                            <div className={`w-2 h-10 rounded-sm ${m.scoreB > m.scoreA ? 'bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.5)]' : 'bg-zinc-800'}`}></div>
                                            
                                            <div className="flex flex-col items-start">
                                                <span className="text-2xl font-black text-white truncate">{m.teamB}</span>
                                                {m.teamBMascotUrl && <span className="text-[9px] bg-pink-900/30 text-pink-400 px-1 rounded border border-pink-900/50">Verified</span>}
                                            </div>

                                            {/* [插入点] 吉祥物：放在最右边 (order-last) */}
                                            <MatchMascot url={m.teamBMascotUrl} side="right" />
                                        </div>
                                    </div>
                                    
                                    {/* 地图详情 */}
                                    {m.maps && m.maps.length > 0 && (
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