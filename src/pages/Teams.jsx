import React from 'react';
import { useLeague } from '../context/LeagueContext';
import StatusBadge from '../components/StatusBadge';
import { Activity } from 'lucide-react';

export default function Teams() {
  const { teams, user } = useLeague();

  return (
    <div className="animate-in fade-in">
      <h2 className="text-4xl font-black text-white mb-8">参赛战队列表</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {teams.map(team => (
          <div key={team.id} className={`relative bg-zinc-900 border-l-4 p-6 hover:bg-zinc-800 transition-all ${team.status === 'approved' ? 'border-green-500' : team.status === 'rejected' ? 'border-red-500' : 'border-yellow-500'}`}>
            <div className="absolute top-4 right-4">
              <StatusBadge status={team.status} reason={team.rejectReason} />
            </div>
            <div className="mb-4 mt-2">
              <h3 className="text-2xl font-black uppercase italic text-white">{team.name}</h3>
              <span className="text-zinc-500 text-sm font-mono">{team.tag}</span>
            </div>
            <div className="text-3xl font-mono font-bold text-white mb-4 flex items-center">
              {team.avgElo} <Activity size={16} className="ml-2 text-zinc-600"/>
            </div>
            <div className="space-y-1 border-t border-zinc-800 pt-4 text-sm">
              {team.members.map((m, idx) => (
                <div key={idx} className="flex justify-between text-zinc-400">
                  <span className={idx >= 5 ? "text-yellow-600" : ""}>{m.id || '-'}</span>
                  <span className="text-zinc-600 text-xs">{m.role}</span>
                </div>
              ))}
            </div>
            {team.contact && user?.role === 'admin' && (
              <div className="mt-4 pt-2 border-t border-zinc-800 text-xs text-cyan-500 font-mono">
                Admin Only: {team.contact}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}