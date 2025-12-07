import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useLeague } from '../context/LeagueContext';
import { Trophy, Search, Target, HelpCircle, ArrowDown, ArrowUp, Map, Filter } from 'lucide-react';
import PlayerRadar from '../components/PlayerRadar';
import GuessPlayerModal from '../components/modals/GuessPlayerModal'; // [新增]

export default function Stats() {
  const { playerStats, tournaments } = useLeague();
  const [searchTerm, setSearchTerm] = useState('');
  const [sortConfig, setSortConfig] = useState({ key: 'score', direction: 'desc' });
  // [新增] 控制小游戏弹窗
  const [showGuessGame, setShowGuessGame] = useState(false);
  // [修改] 默认 stageId 为 'all' (全程)，tourId 为空 (强制用户选择)
  const [filter, setFilter] = useState({ tourId: '', stageId: 'all' });

  // --- 雷达图状态 ---
  const [hoveredPlayer, setHoveredPlayer] = useState(null);
  const hoverTimeoutRef = useRef(null);

  // --- 核心：数据筛选 ---
  const processedData = useMemo(() => {
    // 如果没有选择赛事，直接返回空，不展示任何数据
    if (!filter.tourId) return [];

    // 1. 严格筛选：必须匹配 赛事ID 和 阶段ID
    let data = playerStats.filter(p => {
        return p.tournamentId === filter.tourId && p.stageId === filter.stageId;
    });

    // 2. 贝叶斯评分
    data = data.map(p => ({ ...p, score: calculateBayesianScore(p) }));
    
    // 3. 搜索
    if (searchTerm) {
        const term = searchTerm.toLowerCase();
        data = data.filter(p => p.name.toLowerCase().includes(term) || p.team.toLowerCase().includes(term));
    }

    // 4. 排序
    return data.sort((a, b) => {
      let aValue = a[sortConfig.key];
      let bValue = b[sortConfig.key];

      if (['rating', 'adr', 'rws', 'maps', 'score', 'kd', 'fk'].includes(sortConfig.key)) {
        aValue = parseFloat(aValue) || 0;
        bValue = parseFloat(bValue) || 0;
      } else {
        aValue = aValue.toString().toLowerCase();
        bValue = bValue.toString().toLowerCase();
      }

      if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
  }, [playerStats, searchTerm, sortConfig, filter]);

  // 计算 Max / Avg (基于当前筛选结果)
  const statsMeta = useMemo(() => {
    if (processedData.length === 0) return { max: null, avg: null };
    
    const count = processedData.length;
    const sum = (key) => processedData.reduce((acc, p) => acc + (parseFloat(p[key]) || 0), 0);
    const sumHs = processedData.reduce((acc, p) => acc + (p.hsVal || 0), 0);

    return {
      max: {
        rating: Math.max(...processedData.map(p => parseFloat(p.rating) || 0)),
        adr: Math.max(...processedData.map(p => parseFloat(p.adr) || 0)),
        rws: Math.max(...processedData.map(p => parseFloat(p.rws) || 0)),
        kd: Math.max(...processedData.map(p => parseFloat(p.kd) || 0)),
        hsVal: Math.max(...processedData.map(p => p.hsVal || 0)),
        fk: Math.max(...processedData.map(p => parseFloat(p.fk) || 0)),
      },
      avg: {
        rating: sum('rating') / count,
        adr: sum('adr') / count,
        rws: sum('rws') / count,
        kd: sum('kd') / count,
        hsVal: sumHs / count,
        fk: sum('fk') / count,
      }
    };
  }, [processedData]);

  // --- 交互处理 ---
  useEffect(() => {
    const handleScroll = () => { if (hoveredPlayer) setHoveredPlayer(null); };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [hoveredPlayer]);

  const handleMouseEnter = (player) => {
    if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
    hoverTimeoutRef.current = setTimeout(() => setHoveredPlayer(player), 200);
  };

  const handleMouseLeave = () => {
    if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
    setHoveredPlayer(null);
  };

  const handleRowClick = (player) => {
    setHoveredPlayer(prev => (prev?.id === player.id ? null : player));
  };

  function calculateBayesianScore(player) {
    const R = parseFloat(player.rating) || 0;
    const v = parseInt(player.maps) || 1;
    const m = 1.0; 
    const C = 5;   
    const score = (R * v + m * C) / (v + C);
    return score.toFixed(3); 
  };

  const handleSort = (key) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'desc' ? 'asc' : 'desc'
    }));
  };

  const SortIcon = ({ colKey }) => (
    <span className={`ml-1 inline-block transition-transform ${sortConfig.key === colKey ? 'text-yellow-500 opacity-100' : 'text-zinc-600 opacity-50'}`}>
      {sortConfig.key === colKey && sortConfig.direction === 'asc' ? <ArrowUp size={10}/> : <ArrowDown size={10}/>}
    </span>
  );

  const currentStages = tournaments.find(t => t.id === filter.tourId)?.stages || [];

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 pb-20 relative">
      
      {/* 雷达图 */}
      {hoveredPlayer && statsMeta.max && (
        <PlayerRadar 
          player={hoveredPlayer} 
          maxValues={statsMeta.max} 
          avgValues={statsMeta.avg} 
        />
      )}
        {/* [新增] 挂载小游戏弹窗 */}
      {showGuessGame && <GuessPlayerModal onClose={() => setShowGuessGame(false)} />}
      {/* 头部区域 */}
      <div className="flex flex-col md:flex-row justify-between items-end mb-8 gap-4">
        <div>
          <h2 className="text-4xl font-black text-white mb-2 flex items-center">
            {/* [修改] 给 Trophy 加上点击事件和鼠标手势 */}
            <Trophy 
                className="text-yellow-500 mr-3 cursor-pointer hover:scale-110 transition-transform active:scale-95" 
                size={36}
                onClick={() => setShowGuessGame(true)} // 点击触发
                title="???"
            />
            PLAYER STATS
          </h2>
          <p className="text-zinc-400">
            {filter.tourId 
                ? `${tournaments.find(t=>t.id===filter.tourId)?.name} - ${filter.stageId === 'all' ? '赛事全程' : currentStages.find(s=>s.id===filter.stageId)?.name}` 
                : '请选择要查看的赛事'}
          </p>
        </div>
        
        <div className="flex flex-col md:flex-row gap-3 w-full md:w-auto">
            {/* 1. 赛事选择 (强制) */}
            <select 
                value={filter.tourId} 
                onChange={e => setFilter({ tourId: e.target.value, stageId: 'all' })} // 切换赛事时，默认切回全程
                className={`border px-3 py-2 rounded-lg outline-none text-sm transition-colors ${!filter.tourId ? 'bg-yellow-500 text-black font-bold border-yellow-600 animate-pulse' : 'bg-zinc-900 border-zinc-700 text-white'}`}
            >
                <option value="">-- 请先选择赛事 --</option>
                {tournaments.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>

            {/* 2. 阶段选择 (选了赛事才出现) */}
            {filter.tourId && (
                <select 
                    value={filter.stageId} 
                    onChange={e => setFilter({ ...filter, stageId: e.target.value })} 
                    className="bg-zinc-900 border border-zinc-700 text-white px-3 py-2 rounded-lg outline-none focus:border-yellow-500 text-sm animate-in fade-in"
                >
                    <option value="all">赛事全程 (Full Event)</option>
                    {currentStages.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
            )}

            {/* 3. 搜索 */}
            {filter.tourId && (
                <div className="relative w-full md:w-64 animate-in fade-in">
                    <input 
                        type="text" 
                        placeholder="搜索选手..." 
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        className="w-full bg-zinc-900 border border-zinc-700 text-white pl-10 pr-4 py-2 rounded-lg focus:border-yellow-500 outline-none transition-all text-sm"
                    />
                    <Search className="absolute left-3 top-2.5 text-zinc-500" size={16}/>
                </div>
            )}
        </div>
      </div>

      {/* 主要内容区 */}
      {!filter.tourId ? (
          // 空状态提示
          <div className="flex flex-col items-center justify-center py-20 border-2 border-dashed border-zinc-800 rounded-xl bg-zinc-900/20">
              <Filter size={64} className="text-zinc-700 mb-6"/>
              <h3 className="text-xl font-bold text-white mb-2">数据未加载</h3>
              <p className="text-zinc-500">请在上方下拉框中选择一个赛事以查看数据榜单。</p>
          </div>
      ) : (
          // 表格
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl overflow-hidden shadow-2xl backdrop-blur-sm animate-in slide-in-from-bottom-4">
            <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
                <thead>
                <tr className="bg-black/60 text-zinc-500 text-xs uppercase tracking-widest border-b border-zinc-800">
                    <th className="p-5 font-bold w-16 text-center">Rank</th>
                    <th className="p-5 font-bold cursor-pointer hover:text-white" onClick={() => handleSort('name')}>Player <SortIcon colKey="name"/></th>
                    <th className="p-5 font-bold cursor-pointer hover:text-white" onClick={() => handleSort('team')}>Team <SortIcon colKey="team"/></th>
                    <th className="p-5 text-right font-bold cursor-pointer hover:text-white" onClick={() => handleSort('maps')}>
                    <div className="flex items-center justify-end gap-1">Maps <SortIcon colKey="maps"/></div>
                    </th>
                    <th className="p-5 text-right font-bold text-yellow-500 cursor-pointer hover:text-yellow-400 group relative" onClick={() => handleSort('score')}>
                    <div className="flex items-center justify-end gap-1">Score <HelpCircle size={12}/> <SortIcon colKey="score"/></div>
                    <div className="absolute top-full right-0 mt-2 w-64 bg-zinc-950 border border-yellow-500/30 text-zinc-300 text-[10px] p-4 rounded-lg shadow-2xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50">
                        <p className="font-bold text-white mb-2 text-xs border-b border-zinc-800 pb-1">贝叶斯评分</p>
                        <div className="bg-zinc-900 p-2 rounded border border-zinc-800 font-mono text-yellow-500/80 text-center">
                            (Rating × maps + 1.0 × 5) ÷ (maps + 5)
                        </div>
                    </div>
                    </th>
                    <th className="p-5 text-right font-bold cursor-pointer hover:text-white" onClick={() => handleSort('rating')}>Rating <SortIcon colKey="rating"/></th>
                    <th className="p-5 text-right font-bold cursor-pointer hover:text-white" onClick={() => handleSort('kd')}>K/D <SortIcon colKey="kd"/></th>
                    <th className="p-5 text-right font-bold cursor-pointer hover:text-white" onClick={() => handleSort('adr')}>ADR <SortIcon colKey="adr"/></th>
                    <th className="p-5 text-right font-bold cursor-pointer hover:text-white" onClick={() => handleSort('hs')}>HS % <SortIcon colKey="hs"/></th>
                </tr>
                </thead>
                <tbody className="text-sm divide-y divide-zinc-800/50" onMouseLeave={handleMouseLeave}>
                {processedData.length === 0 && (
                    <tr><td colSpan="9" className="p-10 text-center text-zinc-500">该阶段暂无数据录入</td></tr>
                )}
                {processedData.map((p, idx) => {
                    const rank = idx + 1;
                    const isLowSample = (parseInt(p.maps) || 0) < 3;
                    return (
                    <tr 
                        key={p.id || idx} 
                        className={`group hover:bg-white/5 transition-colors duration-150 cursor-pointer relative`}
                        onMouseEnter={() => handleMouseEnter(p)}
                        onClick={() => handleRowClick(p)}
                    >
                        <td className="p-5 text-center">
                        <div className={`font-black font-mono w-8 h-8 flex items-center justify-center rounded-lg mx-auto ${rank === 1 ? 'bg-yellow-500 text-black' : rank === 2 ? 'bg-zinc-300 text-black' : rank === 3 ? 'bg-orange-700 text-white' : 'text-zinc-500 bg-zinc-800/50'}`}>
                            {rank}
                        </div>
                        </td>
                        <td className="p-5">
                        <div className="font-bold text-white text-lg group-hover:text-cyan-400 transition-colors flex items-center">
                            {p.name}
                            {isLowSample && <span className="ml-2 text-[9px] border border-zinc-700 text-zinc-600 px-1 py-0.5 rounded">NEW</span>}
                            <Target size={12} className="ml-2 opacity-0 group-hover:opacity-100 text-yellow-500 transition-opacity"/>
                        </div>
                        </td>
                        <td className="p-5"><span className="bg-zinc-950 text-zinc-400 px-2 py-1 rounded border border-zinc-800 text-xs font-mono">{p.team}</span></td>
                        <td className="p-5 text-right font-mono text-zinc-300"><div className="inline-flex items-center bg-zinc-800/50 px-2 py-1 rounded text-xs"><Map size={10} className="mr-1.5 opacity-50"/> {p.maps}</div></td>
                        <td className="p-5 text-right"><div className={`font-black text-xl tracking-tight ${p.score >= 1.2 ? 'text-yellow-500' : p.score >= 1.0 ? 'text-green-400' : 'text-zinc-400'}`}>{p.score}</div></td>
                        <td className="p-5 text-right font-mono text-zinc-500">{p.rating}</td>
                        <td className="p-5 text-right font-mono text-zinc-400">{p.kd || '-'}</td>
                        <td className="p-5 text-right font-mono text-zinc-400">{p.adr}</td>
                        <td className="p-5 text-right font-mono text-zinc-500">{p.hs || '-'}</td>
                    </tr>
                    );
                })}
                </tbody>
            </table>
            </div>
          </div>
      )}
    </div>
  );
}