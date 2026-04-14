import React from 'react';
import { motion } from 'motion/react';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, Legend } from 'recharts';
import { Player, UserScores } from '../types';
import { generateAnalysis } from '../utils/calculateResult';
import { RotateCcw } from 'lucide-react';

interface ResultProps {
  userScores: UserScores;
  closestPlayer: Player;
  onRestart: () => void;
  onBackToQuiz?: () => void;
}

export default function Result({ userScores, closestPlayer, onRestart, onBackToQuiz }: ResultProps) {
  const data = [
    {
      subject: '战斗主动性(AGG)',
      A: Math.max(0, Math.min(100, userScores.AGG)),
      B: closestPlayer.AGG,
      fullMark: 100,
    },
    {
      subject: '资源分配(TEA)',
      A: Math.max(0, Math.min(100, userScores.TEA)),
      B: closestPlayer.TEA,
      fullMark: 100,
    },
    {
      subject: '认知处理(INS)',
      A: Math.max(0, Math.min(100, userScores.INS)),
      B: closestPlayer.INS,
      fullMark: 100,
    },
    {
      subject: '沟通机制(VOC)',
      A: Math.max(0, Math.min(100, userScores.VOC)),
      B: closestPlayer.VOC,
      fullMark: 100,
    },
    {
      subject: '战术流动性(SPE)',
      A: Math.max(0, Math.min(100, userScores.SPE)),
      B: closestPlayer.SPE,
      fullMark: 100,
    },
  ];

  const analysis = generateAnalysis({
    AGG: Math.max(0, Math.min(100, userScores.AGG)),
    TEA: Math.max(0, Math.min(100, userScores.TEA)),
    INS: Math.max(0, Math.min(100, userScores.INS)),
    VOC: Math.max(0, Math.min(100, userScores.VOC)),
    SPE: Math.max(0, Math.min(100, userScores.SPE)),
  }, closestPlayer);

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-50 py-12 px-4 md:px-8">
      <div className="max-w-5xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="text-center mb-12"
        >
          <h1 className="text-3xl md:text-4xl font-bold mb-4">测试结果</h1>
          <p className="text-zinc-400 text-lg">您的战术心理画像已生成</p>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-start">
          {/* Player Profile */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="bg-zinc-900 rounded-2xl border border-zinc-800 overflow-hidden flex flex-col"
          >
            <div className="relative h-[417px] w-full bg-zinc-950 flex items-center justify-center overflow-hidden">
              <img
                src={`/players/${closestPlayer.name}.webp`}
                alt={closestPlayer.name}
                className="absolute inset-0 w-full h-full object-cover object-top opacity-90"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none';
                  (e.target as HTMLImageElement).nextElementSibling?.classList.remove('hidden');
                }}
              />
              <div className="hidden flex-col items-center text-zinc-600">
                <div className="w-24 h-24 mb-4 rounded-full border-2 border-dashed border-zinc-700 flex items-center justify-center">
                  <span className="text-sm">No Image</span>
                </div>
                <p className="text-sm">等待上传 {closestPlayer.name}.webp</p>
              </div>
              <div className="absolute inset-0 bg-gradient-to-t from-zinc-900 via-transparent to-transparent" />
              <div className="absolute bottom-0 left-0 p-6 w-full">
                <div className="text-amber-500 text-sm font-bold tracking-wider mb-1">最匹配选手</div>
                <h2 className="text-5xl font-black italic tracking-tighter">{closestPlayer.name}</h2>
              </div>
            </div>
            <div className="p-6 bg-zinc-900">
              <p className="text-zinc-300 leading-relaxed text-lg">
                {analysis}
              </p>
            </div>
          </motion.div>

          {/* Radar Chart */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            className="bg-zinc-900 rounded-2xl border border-zinc-800 p-6 flex flex-col items-center"
          >
            <h3 className="text-xl font-bold mb-6 w-full text-left">多维战术雷达图</h3>
            <div className="w-full h-[400px]">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart cx="50%" cy="50%" outerRadius="70%" data={data}>
                  <PolarGrid stroke="#3f3f46" />
                  <PolarAngleAxis dataKey="subject" tick={{ fill: '#a1a1aa', fontSize: 12 }} />
                  <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fill: '#52525b' }} />
                  <Radar
                    name="您的数据"
                    dataKey="A"
                    stroke="#3b82f6"
                    fill="#3b82f6"
                    fillOpacity={0.5}
                  />
                  <Radar
                    name={closestPlayer.name}
                    dataKey="B"
                    stroke="#f59e0b"
                    fill="#f59e0b"
                    fillOpacity={0.5}
                  />
                  <Legend wrapperStyle={{ paddingTop: '20px' }} />
                </RadarChart>
              </ResponsiveContainer>
            </div>
            
            <div className="w-full mt-8 pt-6 border-t border-zinc-800 flex justify-center">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={onRestart}
                className="flex items-center px-6 py-3 bg-zinc-800 hover:bg-zinc-700 text-zinc-100 rounded-lg transition-colors"
              >
                <RotateCcw className="w-5 h-5 mr-2" />
                重新测试
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => {
                  // This will be handled in App.tsx by changing appState back to 'quiz'
                  // We need to pass a prop for this
                  onBackToQuiz?.();
                }}
                className="flex items-center px-6 py-3 bg-zinc-800 hover:bg-zinc-700 text-zinc-100 rounded-lg transition-colors ml-4"
              >
                返回修改
              </motion.button>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
