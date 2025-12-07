import React from 'react';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, ResponsiveContainer, PolarRadiusAxis, Legend } from 'recharts';

export default function PlayerRadar({ player, maxValues, avgValues }) {
  if (!player || !maxValues || !avgValues) return null;

  // 核心：数据归一化 (所有数值基于全服最大值映射到 0-100)
  const normalize = (val, max) => {
    if (!max) return 0;
    const ceiling = max * 1.1; // 留出 10% 的余量，避免顶格
    return Math.min((val / ceiling) * 100, 100);
  };

  // 这里的 A 代表选手数据，B 代表平均数据
  const data = [
    { 
      subject: 'Rating', 
      A: normalize(parseFloat(player.rating), maxValues.rating), 
      B: normalize(avgValues.rating, maxValues.rating),
      fullMark: 100, 
      val: player.rating,
      avg: avgValues.rating.toFixed(2)
    },
    { 
      subject: 'ADR',    
      A: normalize(parseFloat(player.adr), maxValues.adr),       
      B: normalize(avgValues.adr, maxValues.adr),
      fullMark: 100, 
      val: player.adr,
      avg: avgValues.adr.toFixed(1)
    },
    { 
      subject: 'RWS',    
      A: normalize(parseFloat(player.rws), maxValues.rws),       
      B: normalize(avgValues.rws, maxValues.rws),
      fullMark: 100, 
      val: player.rws,
      avg: avgValues.rws.toFixed(2)
    },
    { 
      subject: 'K/D',    
      A: normalize(parseFloat(player.kd), maxValues.kd),         
      B: normalize(avgValues.kd, maxValues.kd),
      fullMark: 100, 
      val: player.kd,
      avg: avgValues.kd.toFixed(2)
    },
    { 
      subject: 'HS%',    
      A: normalize(player.hsVal, maxValues.hsVal),               
      B: normalize(avgValues.hsVal, maxValues.hsVal),
      fullMark: 100, 
      val: player.hs,
      avg: (avgValues.hsVal).toFixed(1) + '%'
    },
    { 
      subject: '首杀',   
      A: normalize(parseFloat(player.fk), maxValues.fk),         
      B: normalize(avgValues.fk, maxValues.fk),
      fullMark: 100, 
      val: player.fk,
      avg: avgValues.fk.toFixed(2)
    },
  ];

  return (
    <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-50 w-80 md:w-96 aspect-square pointer-events-none animate-in zoom-in-95 duration-200">
      {/* 背景卡片 */}
      <div className="relative w-full h-full bg-zinc-950/95 backdrop-blur-xl border border-zinc-700 rounded-2xl shadow-[0_0_50px_rgba(0,0,0,0.8)] overflow-hidden flex flex-col">
        
        {/* 选手信息头 */}
        <div className="absolute top-0 left-0 w-full p-4 flex justify-between items-start z-10 bg-gradient-to-b from-black/80 to-transparent">
          <div>
            <h3 className="text-2xl font-black text-white italic tracking-tighter flex items-center">
              {player.name}
            </h3>
            <p className="text-sm text-zinc-400 font-mono">{player.team}</p>
          </div>
          <div className="text-right">
            <div className="text-xs text-zinc-500 uppercase tracking-widest">Rating</div>
            <div className={`text-2xl font-bold ${parseFloat(player.rating) >= avgValues.rating ? 'text-yellow-500' : 'text-white'}`}>
              {player.rating}
            </div>
          </div>
        </div>

        {/* 图表主体 */}
        <div className="flex-1 w-full h-full mt-6">
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart cx="50%" cy="52%" outerRadius="60%" data={data}>
              <PolarGrid gridType="polygon" stroke="#3f3f46" strokeWidth={1} strokeOpacity={0.5} />
              <PolarAngleAxis 
                dataKey="subject" 
                tick={{ fill: '#d4d4d8', fontSize: 10, fontWeight: 'bold' }} 
              />
              <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
              
              {/* 平均水平 (紫色) */}
              <Radar
                name="平均水平"
                dataKey="B"
                stroke="#a855f7" // 紫色边框
                strokeWidth={2}
                fill="#a855f7"   // 紫色填充
                fillOpacity={0.2}
              />

              {/* 选手数据 (黄色) */}
              <Radar
                name={player.name}
                dataKey="A"
                stroke="#eab308" // 黄色边框
                strokeWidth={3}
                fill="#eab308"   // 黄色填充
                fillOpacity={0.5}
              />
              
            </RadarChart>
          </ResponsiveContainer>
        </div>

        {/* 底部图例与数据栏 */}
        <div className="bg-black/60 border-t border-white/5 p-2">
          <div className="flex justify-center gap-4 mb-2 text-[10px] uppercase font-bold tracking-widest">
             <div className="flex items-center"><span className="w-2 h-2 rounded-full bg-yellow-500 mr-1.5"></span> Player</div>
             <div className="flex items-center"><span className="w-2 h-2 rounded-full bg-purple-500 mr-1.5"></span> Average</div>
          </div>
          <div className="grid grid-cols-3 gap-1 text-center">
              <div><div className="text-[9px] text-zinc-500">ADR</div><div className="text-xs font-mono text-white">{player.adr} <span className="text-zinc-600">/ {avgValues.adr.toFixed(0)}</span></div></div>
              <div><div className="text-[9px] text-zinc-500">K/D</div><div className="text-xs font-mono text-white">{player.kd} <span className="text-zinc-600">/ {avgValues.kd.toFixed(1)}</span></div></div>
              <div><div className="text-[9px] text-zinc-500">HS%</div><div className="text-xs font-mono text-white">{player.hs}</div></div>
          </div>
        </div>
      </div>
    </div>
  );
}