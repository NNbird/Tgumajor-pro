import React, { useState, useEffect } from 'react';
import { useLeague } from '../context/LeagueContext';
import StatusBadge from '../components/StatusBadge';
import { Activity } from 'lucide-react';

export default function Teams() {
  const { teams, user, tournaments } = useLeague();
  
  // 筛选器状态
  const [filterId, setFilterId] = useState('');

  // 初始化：默认选中最新或第一个赛事
  useEffect(() => {
     if (tournaments.length > 0 && !filterId) {
         // 这里可以根据需求逻辑修改，比如默认选第一个 OPEN 的，或者直接选列表第一个
         setFilterId(tournaments[0].id);
     }
  }, [tournaments]);

  // 根据筛选器过滤战队
  const displayTeams = teams.filter(t => !filterId || t.tournamentId === filterId);

  return (
    <div className="animate-in fade-in">
      {/* 顶部标题栏 + 筛选器 */}
      <div className="flex flex-col md:flex-row justify-between items-end mb-8 gap-4">
          <h2 className="text-4xl font-black text-white">参赛战队列表</h2>
          
          <div className="flex items-center gap-2">
            <span className="text-zinc-500 text-xs font-bold uppercase">FILTER BY:</span>
            <select 
               value={filterId} 
               onChange={e => setFilterId(e.target.value)}
               className="bg-zinc-900 border border-zinc-700 text-white p-2 rounded outline-none focus:border-yellow-500 text-sm min-w-[200px]"
            >
               {tournaments.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {displayTeams.length === 0 && (
            <div className="col-span-full text-center py-12 text-zinc-500 border-2 border-dashed border-zinc-800 rounded">
                此赛事暂无参赛战队
            </div>
        )}

        {displayTeams.map(team => (
          <div key={team.id} className={`relative bg-zinc-900 border-l-4 p-6 hover:bg-zinc-800 transition-all ${team.status === 'approved' ? 'border-green-500' : team.status === 'rejected' ? 'border-red-500' : 'border-yellow-500'}`}>
            <div className="absolute top-4 right-4">
              <StatusBadge status={team.status} reason={team.rejectReason} />
            </div>
            <div className="mb-4 mt-2">
              <h3 className="text-2xl font-black uppercase italic text-white truncate pr-2">{team.name}</h3>
              <span className="text-zinc-500 text-sm font-mono">{team.tag}</span>
            </div>
            <div className="text-3xl font-mono font-bold text-white mb-4 flex items-center">
              {team.avgElo} <Activity size={16} className="ml-2 text-zinc-600"/>
            </div>
            <div className="space-y-1 border-t border-zinc-800 pt-4 text-sm">
              {team.members.map((m, idx) => (
                <div key={idx} className="flex justify-between text-zinc-400">
                  <span className={`${idx >= 5 ? "text-yellow-600" : ""} truncate max-w-[150px]`}>{m.id || '-'}</span>
                  <span className="text-zinc-600 text-xs">{m.role}</span>
                </div>
              ))}
            </div>
            {team.contact && user?.role === 'admin' && (
              <div className="mt-4 pt-2 border-t border-zinc-800 text-xs text-cyan-500 font-mono flex justify-between">
                <span>Contact: {team.contact}</span>
                <span className="text-zinc-600">Admin View</span>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}