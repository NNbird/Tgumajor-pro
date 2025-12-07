import React, { useState, useEffect } from 'react';
import { Clock, Calendar, AlertTriangle, Lock } from 'lucide-react';
// 如果你想保留背景粒子效果，可以取消下面这行的注释
import ParticleBackground from '../components/ParticleBackground'; 

export default function Maintenance() {
  const [timeLeft, setTimeLeft] = useState(calculateTimeLeft());

  // 目标时间: 2026年1月1日 20:00:00
  const targetDate = new Date('2026-01-01T20:00:00').getTime();

  function calculateTimeLeft() {
    const now = new Date().getTime();
    const difference = new Date('2026-01-01T20:00:00').getTime() - now;

    if (difference > 0) {
      return {
        days: Math.floor(difference / (1000 * 60 * 60 * 24)),
        hours: Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
        minutes: Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60)),
        seconds: Math.floor((difference % (1000 * 60)) / 1000)
      };
    }
    return null;
  }

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(calculateTimeLeft());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const TimeBox = ({ value, label }) => (
    <div className="flex flex-col items-center mx-2 sm:mx-4">
      <div className="w-16 h-16 sm:w-24 sm:h-24 bg-zinc-900 border border-yellow-500/30 rounded-lg flex items-center justify-center mb-2 shadow-[0_0_20px_rgba(234,179,8,0.1)]">
        <span className="text-2xl sm:text-4xl font-black text-white font-mono">
          {String(value).padStart(2, '0')}
        </span>
      </div>
      <span className="text-xs text-zinc-500 uppercase tracking-widest">{label}</span>
    </div>
  );

  return (
    <div className="min-h-screen bg-black font-sans text-zinc-100 selection:bg-yellow-500 selection:text-black flex flex-col items-center justify-center relative overflow-hidden px-4">
      
      {/* 1. 背景装饰 (如果你想保留粒子效果，取消下面组件的注释) */}
      {/* <ParticleBackground /> */}
      <ParticleBackground />
      
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-yellow-900/10 via-black to-black pointer-events-none"></div>
      <div className="absolute top-0 w-full h-1 bg-gradient-to-r from-transparent via-yellow-600 to-transparent"></div>

      {/* 2. 主内容卡片 */}
      <div className="relative z-10 text-center max-w-4xl mx-auto animate-in fade-in zoom-in duration-700">
        
        {/* 顶部 Logo 区域 */}
        <div className="mb-8 flex justify-center">
            <div className="inline-flex items-center gap-2 px-4 py-1 rounded-full bg-yellow-500/10 border border-yellow-500/50 text-yellow-500 text-xs font-bold uppercase tracking-widest mb-6">
                <Lock size={12} /> Public Beta Ended
            </div>
        </div>

        <h1 className="text-5xl sm:text-7xl font-black text-white mb-4 tracking-tighter italic">
          TGU <span className="text-yellow-500">CS Major</span>
        </h1>
        
        <h2 className="text-xl sm:text-2xl text-zinc-400 font-light mb-12">
          网站公测圆满结束，感谢各位同学的参与
        </h2>

        {/* 倒计时区域 */}
        {timeLeft ? (
            <div className="flex flex-wrap justify-center mb-16">
                <TimeBox value={timeLeft.days} label="Days" />
                <TimeBox value={timeLeft.hours} label="Hours" />
                <TimeBox value={timeLeft.minutes} label="Minutes" />
                <TimeBox value={timeLeft.seconds} label="Seconds" />
            </div>
        ) : (
            <div className="text-4xl font-bold text-green-500 mb-16">
                OFFICIAL LAUNCH NOW!
            </div>
        )}

        {/* 底部信息 */}
        <div className="bg-zinc-900/80 border border-zinc-800 p-8 rounded-2xl backdrop-blur-sm max-w-2xl mx-auto">
            <div className="flex items-center justify-center gap-2 text-yellow-500 font-bold mb-4">
                <Calendar size={20} />
                <span>正式发布时间：2026年1月1日 20:00</span>
            </div>
            <p className="text-zinc-400 text-sm leading-relaxed">
                我们将利用这段时间对平台进行全面升级，优化赛制系统与数据分析功能。
                <br/>敬请期待更专业的 TGU CS Major。
            </p>
        </div>

      </div>

      <footer className="absolute bottom-8 text-zinc-600 text-xs text-center">
        &copy; 2025-2026 TGU CS Major. All rights reserved.
      </footer>
    </div>
  );
}