import React from 'react';
import { motion } from 'motion/react';
import { Crosshair } from 'lucide-react';

interface WelcomeProps {
  onStart: () => void;
}

export default function Welcome({ onStart }: WelcomeProps) {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-6 text-center bg-zinc-950 text-zinc-50">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        className="max-w-2xl"
      >
        <div className="flex justify-center mb-8">
          <div className="p-4 bg-zinc-900 rounded-full border border-zinc-800">
            <Crosshair className="w-16 h-16 text-amber-500" />
          </div>
        </div>
        <h1 className="text-4xl md:text-5xl font-bold mb-6 tracking-tight">
          反恐精英类型指标 (CSTI)
        </h1>
        <p className="text-xl text-zinc-400 mb-8 leading-relaxed">
          基于心理测量学的职业选手游戏人格匹配框架。通过50道深度战术情境题，精确捕捉你在虚拟战斗中的隐性行为动机，并与历史上最伟大的100名CS职业选手进行算法匹配。
        </p>
        
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-12 text-sm text-zinc-500">
          <div className="p-3 bg-zinc-900/50 rounded-lg border border-zinc-800/50">
            <div className="font-semibold text-zinc-300 mb-1">AGG</div>
            <div>战斗主动性</div>
          </div>
          <div className="p-3 bg-zinc-900/50 rounded-lg border border-zinc-800/50">
            <div className="font-semibold text-zinc-300 mb-1">TEA</div>
            <div>资源分配</div>
          </div>
          <div className="p-3 bg-zinc-900/50 rounded-lg border border-zinc-800/50">
            <div className="font-semibold text-zinc-300 mb-1">INS</div>
            <div>认知处理</div>
          </div>
          <div className="p-3 bg-zinc-900/50 rounded-lg border border-zinc-800/50">
            <div className="font-semibold text-zinc-300 mb-1">VOC</div>
            <div>沟通机制</div>
          </div>
          <div className="p-3 bg-zinc-900/50 rounded-lg border border-zinc-800/50 col-span-2 md:col-span-1">
            <div className="font-semibold text-zinc-300 mb-1">SPE</div>
            <div>战术流动性</div>
          </div>
        </div>

        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={onStart}
          className="px-8 py-4 bg-amber-500 text-zinc-950 font-bold rounded-lg text-lg shadow-[0_0_20px_rgba(245,158,11,0.3)] hover:shadow-[0_0_30px_rgba(245,158,11,0.5)] transition-shadow"
        >
          开始人格测试
        </motion.button>
      </motion.div>
    </div>
  );
}
