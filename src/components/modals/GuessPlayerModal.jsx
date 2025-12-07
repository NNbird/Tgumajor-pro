import React, { useState, useEffect, useMemo } from 'react';
import { X, CheckCircle, ArrowUp, ArrowDown, HelpCircle, Search, Lock } from 'lucide-react';
import { GAME_PLAYERS_DB, TARGET_PLAYER_KEY } from '../../data/playersGameData';

export default function GuessPlayerModal({ onClose }) {
  const [guesses, setGuesses] = useState([]);
  const [input, setInput] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [gameStatus, setGameStatus] = useState('playing'); // playing, won, lost, cooldown
  const [cooldown, setCooldown] = useState(0);

  const TARGET = GAME_PLAYERS_DB[TARGET_PLAYER_KEY];

  // 检查冷却
  useEffect(() => {
    const storedCooldown = localStorage.getItem('guess_game_cooldown');
    if (storedCooldown) {
        const diff = parseInt(storedCooldown) - Date.now();
        if (diff > 0) {
            setGameStatus('cooldown');
            setCooldown(Math.ceil(diff / 1000));
            const timer = setInterval(() => {
                setCooldown(prev => {
                    if (prev <= 1) {
                        clearInterval(timer);
                        setGameStatus('playing');
                        localStorage.removeItem('guess_game_cooldown');
                        setGuesses([]); // 重置游戏
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);
            return () => clearInterval(timer);
        }
    }
  }, []);

  // 模糊搜索候选词
  const candidates = useMemo(() => {
      if (!input) return [];
      const keys = Object.keys(GAME_PLAYERS_DB);
      return keys.filter(name => 
          name.toLowerCase().startsWith(input.toLowerCase()) && 
          !guesses.some(g => g.name === name) // 排除已猜过的
      ).slice(0, 5); // 只显示前5个
  }, [input, guesses]);

  const handleGuess = (name) => {
      const player = GAME_PLAYERS_DB[name];
      if (!player) return;

      const newGuess = {
          name,
          ...player,
          // 判定逻辑
          isTeamCorrect: player.team === TARGET.team,
          isRetiredCorrect: player.retired === TARGET.retired,
          isNatCorrect: player.nationality === TARGET.nationality,
          isRoleCorrect: player.role === TARGET.role,
          
          // 数字比对 (0: equal, 1: target is higher, -1: target is lower)
          ageCheck: player.base_age === TARGET.base_age ? 0 : (TARGET.base_age > player.base_age ? 1 : -1),
          majorCheck: player.major_apps === TARGET.major_apps ? 0 : (TARGET.major_apps > player.major_apps ? 1 : -1),
      };

      const newGuesses = [newGuess, ...guesses];
      setGuesses(newGuesses);
      setInput('');
      setShowDropdown(false);

      // 胜利判定
      if (name === TARGET_PLAYER_KEY) {
          setGameStatus('won');
      } 
      // 失败判定 (8次用完)
      else if (newGuesses.length >= 8) {
          setGameStatus('cooldown');
          const coolUntil = Date.now() + 60 * 1000; // 1分钟
          localStorage.setItem('guess_game_cooldown', coolUntil);
          setCooldown(60);
          // 开始倒计时
          const timer = setInterval(() => {
            setCooldown(prev => {
                if (prev <= 1) { clearInterval(timer); setGameStatus('playing'); setGuesses([]); return 0; }
                return prev - 1;
            });
        }, 1000);
      }
  };

  // 渲染单元格
  const Cell = ({ label, isCorrect, arrow }) => (
      <div className={`h-14 md:h-16 flex flex-col items-center justify-center text-xs md:text-sm font-bold border-2 rounded transition-all animate-in flip-in-x duration-500 ${
          isCorrect 
          ? 'bg-green-600 border-green-500 text-white shadow-[0_0_10px_rgba(34,197,94,0.5)]' 
          : 'bg-zinc-800 border-zinc-700 text-zinc-300'
      }`}>
          {label}
          {arrow === 1 && <ArrowUp size={14} className="text-yellow-400 animate-bounce"/>}
          {arrow === -1 && <ArrowDown size={14} className="text-red-400 animate-bounce"/>}
      </div>
  );

  return (
    <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-[100] flex items-center justify-center p-4 animate-in fade-in">
      <div className="bg-zinc-950 border border-yellow-500/30 w-full max-w-4xl h-[80vh] rounded-xl shadow-2xl flex flex-col relative overflow-hidden">
        
        {/* 头部 */}
        <div className="p-4 border-b border-zinc-800 flex justify-between items-center bg-zinc-900/50">
            <div className="flex items-center gap-2">
                <HelpCircle className="text-yellow-500" />
                <h2 className="text-xl font-black text-white italic">GUESS THE PRO</h2>
            </div>
            <button onClick={onClose}><X className="text-zinc-500 hover:text-white"/></button>
        </div>

        {/* 游戏区域 */}
        <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
            
            {/* 状态提示 */}
            {gameStatus === 'playing' && (
                <div className="text-center mb-6">
                    <p className="text-zinc-400 mb-2">Guess the Mystery Player (8 Attempts)</p>
                    <div className="relative max-w-md mx-auto">
                        <input 
                            value={input}
                            onChange={(e) => { setInput(e.target.value); setShowDropdown(true); }}
                            placeholder="Type player name..."
                            className="w-full bg-black border-2 border-zinc-700 text-white p-3 rounded-lg focus:border-yellow-500 outline-none uppercase font-bold"
                        />
                        <Search className="absolute right-3 top-3.5 text-zinc-500"/>
                        
                        {/* 模糊搜索下拉框 */}
                        {showDropdown && candidates.length > 0 && (
                            <div className="absolute top-full left-0 w-full bg-zinc-900 border border-zinc-700 mt-1 rounded-lg z-50 shadow-xl">
                                {candidates.map(c => (
                                    <div 
                                        key={c} 
                                        onClick={() => handleGuess(c)}
                                        className="p-3 hover:bg-zinc-800 cursor-pointer text-white font-bold border-b border-zinc-800 last:border-0"
                                    >
                                        {c}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {gameStatus === 'cooldown' && (
                <div className="text-center py-10 animate-in zoom-in">
                    <Lock size={64} className="mx-auto text-red-500 mb-4"/>
                    <h3 className="text-2xl font-black text-white mb-2">SYSTEM LOCKED</h3>
                    <p className="text-red-400">Too many failed attempts.</p>
                    <div className="text-4xl font-mono font-bold text-white mt-4">{cooldown}s</div>
                </div>
            )}

            {gameStatus === 'won' && (
                <div className="text-center py-6 bg-green-900/20 border border-green-500/50 rounded-lg mb-6 animate-in bounce-in">
                    <h3 className="text-3xl font-black text-green-400 mb-2">CORRECT!</h3>
                    <p className="text-white mb-4">The player was <span className="text-yellow-500 font-bold">{TARGET_PLAYER_KEY}</span></p>
                    <div className="bg-black/50 p-4 rounded inline-block border border-green-500">
                        <div className="text-xs text-zinc-400 uppercase tracking-widest mb-1">KEY #2 UNLOCKED</div>
                        <div className="text-2xl font-mono font-bold text-white select-all">TGUMAJOR_[key2]去数据栏找吧！</div>
                        <div className="text-xs text-zinc-400 uppercase tracking-widest mb-1">第三个密钥去找找“历史的秘密”吧！</div>
                    </div>
                </div>
            )}

            {/* 猜测记录表格 */}
            <div className="grid grid-cols-7 gap-2 mb-2 text-center text-[10px] uppercase text-zinc-500 font-bold tracking-wider">
                <div>Player</div>
                <div>Team</div>
                <div>Nat</div>
                <div>Age</div>
                <div>Role</div>
                <div>Major</div>
                <div>Ret</div>
            </div>

            <div className="space-y-2">
                {guesses.map((g, i) => (
                    <div key={i} className="grid grid-cols-7 gap-2">
                        <div className="h-14 md:h-16 flex items-center justify-center bg-zinc-800 rounded border border-zinc-700 text-xs font-bold text-white break-all p-1">
                            {g.name}
                        </div>
                        <Cell label={g.team} isCorrect={g.isTeamCorrect} />
                        <Cell label={g.nationality} isCorrect={g.isNatCorrect} />
                        <Cell label={g.base_age} isCorrect={g.ageCheck === 0} arrow={g.ageCheck} />
                        <Cell label={g.role} isCorrect={g.isRoleCorrect} />
                        <Cell label={g.major_apps} isCorrect={g.majorCheck === 0} arrow={g.majorCheck} />
                        <Cell label={g.retired ? 'Yes' : 'No'} isCorrect={g.isRetiredCorrect} />
                    </div>
                ))}
                
                {/* 空行占位 (显示剩余机会) */}
                {gameStatus === 'playing' && Array.from({ length: 8 - guesses.length }).map((_, i) => (
                    <div key={`empty-${i}`} className="grid grid-cols-7 gap-2 opacity-30">
                        {Array.from({ length: 7 }).map((_, j) => (
                            <div key={j} className="h-14 bg-zinc-900 rounded border border-zinc-800"></div>
                        ))}
                    </div>
                ))}
            </div>

        </div>
      </div>
    </div>
  );
}