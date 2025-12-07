import React, { useState, useEffect } from 'react';
import { X, ShieldAlert, Lock } from 'lucide-react';

export default function C4Modal({ onClose }) {
  const [timeLeft, setTimeLeft] = useState('');
  
  // 目标时间: 2025-12-31 23:59:59
  const targetDate = new Date('2025-12-31T23:59:59').getTime();

  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date().getTime();
      const distance = targetDate - now;

      if (distance < 0) {
        clearInterval(timer);
        setTimeLeft("EXPIRED");
      } else {
        const days = Math.floor(distance / (1000 * 60 * 60 * 24));
        const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((distance % (1000 * 60)) / 1000);
        // C4 风格倒计时
        setTimeLeft(`${days}d ${hours.toString().padStart(2,'0')}:${minutes.toString().padStart(2,'0')}:${seconds.toString().padStart(2,'0')}`);
      }
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="fixed inset-0 bg-black/90 z-[100] flex items-center justify-center p-4 animate-in zoom-in-95 duration-300">
      <div className="bg-zinc-950 border-2 border-red-600 w-full max-w-md p-1 rounded-lg shadow-[0_0_50px_rgba(220,38,38,0.5)] animate-alarm relative overflow-hidden">
        
        {/* 装饰线条 */}
        <div className="absolute top-0 left-0 w-full h-1 bg-red-600 animate-pulse"></div>
        <div className="absolute bottom-0 left-0 w-full h-1 bg-red-600 animate-pulse"></div>
        
        <div className="bg-black/80 p-8 text-center relative z-10">
            <button onClick={onClose} className="absolute top-2 right-2 text-zinc-600 hover:text-red-500"><X/></button>

            <ShieldAlert size={64} className="mx-auto text-red-600 mb-4 animate-bounce"/>
            
            <h2 className="text-3xl font-black text-white mb-2 glitch-text tracking-tighter">C4 ARMED</h2>
            <p className="text-red-500 font-mono text-xs mb-6">SYSTEM COMPROMISED // CODE RED</p>
            
            <div className="bg-black border border-red-900/50 p-4 rounded mb-6">
                <div className="text-4xl font-mono font-bold text-red-600 tracking-widest tabular-nums">
                    {timeLeft}
                </div>
                <div className="text-[10px] text-zinc-500 mt-2 uppercase">Time Remaining until Detonation</div>
            </div>

            <div className="text-left space-y-3 text-sm text-zinc-400 bg-zinc-900/50 p-4 rounded border border-zinc-800">
                <p className="flex items-start gap-2">
                    <Lock size={16} className="text-yellow-500 shrink-0 mt-0.5"/>
                    <span>任务目标：寻找 <span className="text-white font-bold">3组</span> 拆弹密钥。</span>
                </p>
                <p className="flex items-start gap-2">
                    <Lock size={16} className="text-yellow-500 shrink-0 mt-0.5"/>
                    <span>首位拆弹专家奖励：<span className="text-yellow-500">CS周边外设</span></span>
                </p>
                <p className="text-xs text-zinc-600 mt-2 border-t border-zinc-800 pt-2">
                    Tip: 或许 <span className="text-purple-500 font-bold">AI 助手</span> 知道些什么...
                </p>
            </div>

            <button onClick={onClose} className="mt-6 w-full bg-red-600/20 hover:bg-red-600 text-red-500 hover:text-white border border-red-600 py-2 rounded uppercase font-bold tracking-widest transition-all">
                ACKNOWLEDGE
            </button>
        </div>
      </div>
    </div>
  );
}