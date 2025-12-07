import React, { useState, useEffect } from 'react';
import { useLeague } from '../../context/LeagueContext';
import { X, UserPlus, LogIn, User, Lock, FileText, ShieldCheck, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';

export default function LoginModal({ onClose }) {
  const { login, register, checkNameAvailability } = useLeague();
  const [isRegister, setIsRegister] = useState(false);
  
  // 表单数据
  const [username, setUsername] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');

  // 昵称检测状态
  const [nameStatus, setNameStatus] = useState('idle'); // idle, checking, available, taken
  const [nameMsg, setNameMsg] = useState('');

  // [核心] 昵称防抖检测逻辑
  useEffect(() => {
    if (!isRegister || !name) {
        setNameStatus('idle');
        return;
    }
    setNameStatus('checking');
    const timer = setTimeout(async () => {
        const res = await checkNameAvailability(name);
        if (res.available) {
            setNameStatus('available');
        } else {
            setNameStatus('taken');
            setNameMsg(res.message || '已被占用');
        }
    }, 500); // 500ms 防抖
    return () => clearTimeout(timer);
  }, [name, isRegister]);

  // 密码强度校验
  const checkStrength = (pwd) => {
    let types = 0;
    if (/[a-z]/.test(pwd)) types++;
    if (/[A-Z]/.test(pwd)) types++;
    if (/[0-9]/.test(pwd)) types++;
    if (/[^a-zA-Z0-9]/.test(pwd)) types++;
    return { length: pwd.length >= 8, types: types >= 3 };
  };
  const strength = checkStrength(password);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!username || !password) { setError('请输入账号和密码'); return; }

    if (isRegister) {
        if (!name) { setError('请输入用户昵称'); return; }
        if (nameStatus === 'taken') { setError('昵称已被占用，请修改'); return; }
        if (password !== confirmPassword) { setError('两次密码输入不一致'); return; }
        if (!strength.length || !strength.types) { setError('密码强度不足'); return; }

        const res = await register(username, password, name);
        if (res.success) {
            alert('注册成功！请登录');
            setIsRegister(false);
            setPassword(''); setConfirmPassword('');
        } else {
            setError(res.message);
        }
    } else {
        const res = await login(username, password);
        if (res.success) onClose();
        else setError(res.message);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-in fade-in zoom-in-95">
      <div className="bg-zinc-900 border border-yellow-500 w-full max-w-md p-8 relative shadow-2xl rounded-sm">
        <button onClick={onClose} className="absolute top-4 right-4 text-zinc-500 hover:text-white transition-colors"><X/></button>
        
        <div className="flex items-center justify-center mb-8 space-x-6 border-b border-zinc-800 pb-4">
          <button onClick={() => { setIsRegister(false); setError(''); }} className={`text-xl font-black uppercase transition-colors ${!isRegister ? 'text-yellow-500 border-b-2 border-yellow-500 pb-1' : 'text-zinc-600 hover:text-zinc-300'}`}>登录</button>
          <div className="w-px h-6 bg-zinc-700"></div>
          <button onClick={() => { setIsRegister(true); setError(''); }} className={`text-xl font-black uppercase transition-colors ${isRegister ? 'text-cyan-500 border-b-2 border-cyan-500 pb-1' : 'text-zinc-600 hover:text-zinc-300'}`}>注册</button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          
          {/* 1. 登录账号 */}
          <div>
            <label className="block text-xs text-zinc-500 uppercase mb-1 font-bold tracking-wider">登录账号</label>
            <div className="relative">
                <input value={username} onChange={e => setUsername(e.target.value)} className="w-full bg-black border border-zinc-700 text-white p-3 pl-10 focus:border-yellow-500 outline-none transition-colors rounded-sm" placeholder="Login ID"/>
                <User className="absolute left-3 top-3.5 text-zinc-500" size={16}/>
            </div>
          </div>

          {/* 2. 用户昵称 (带实时检测) */}
          {isRegister && (
              <div className="animate-in fade-in slide-in-from-top-2">
                <label className="block text-xs text-zinc-500 uppercase mb-1 font-bold tracking-wider flex justify-between">
                    显示昵称
                    {/* 状态提示文字 */}
                    {name && (
                        <span className={`flex items-center text-[10px] ${nameStatus === 'available' ? 'text-green-500' : nameStatus === 'taken' ? 'text-red-500' : 'text-zinc-500'}`}>
                            {nameStatus === 'checking' && <><Loader2 size={10} className="animate-spin mr-1"/> 检测中...</>}
                            {nameStatus === 'available' && <><CheckCircle2 size={10} className="mr-1"/> 名字可用</>}
                            {nameStatus === 'taken' && <><AlertCircle size={10} className="mr-1"/> {nameMsg}</>}
                        </span>
                    )}
                </label>
                <div className="relative">
                    <input 
                      value={name} 
                      onChange={e => setName(e.target.value)}
                      className={`w-full bg-black border text-white p-3 pl-10 outline-none transition-colors rounded-sm ${nameStatus === 'taken' ? 'border-red-500 focus:border-red-500' : nameStatus === 'available' ? 'border-green-500 focus:border-green-500' : 'border-zinc-700 focus:border-cyan-500'}`} 
                      placeholder="Nickname" 
                    />
                    <FileText className="absolute left-3 top-3.5 text-zinc-500" size={16}/>
                    
                    {/* 右侧状态图标 */}
                    <div className="absolute right-3 top-3.5">
                        {nameStatus === 'checking' && <Loader2 size={16} className="text-zinc-500 animate-spin"/>}
                        {nameStatus === 'available' && <CheckCircle2 size={16} className="text-green-500"/>}
                        {nameStatus === 'taken' && <AlertCircle size={16} className="text-red-500"/>}
                    </div>
                </div>
              </div>
          )}

          {/* 3. 密码 */}
          <div>
            <label className="block text-xs text-zinc-500 uppercase mb-1 font-bold tracking-wider">密码</label>
            <div className="relative">
                <input type="password" value={password} onChange={e => setPassword(e.target.value)} className="w-full bg-black border border-zinc-700 text-white p-3 pl-10 focus:border-yellow-500 outline-none transition-colors rounded-sm" placeholder="Password"/>
                <Lock className="absolute left-3 top-3.5 text-zinc-500" size={16}/>
            </div>
          </div>

          {/* 4. 确认密码 (仅注册) */}
          {isRegister && (
              <div className="animate-in fade-in slide-in-from-top-2 space-y-4">
                  <div>
                    <label className="block text-xs text-zinc-500 uppercase mb-1 font-bold tracking-wider">确认密码</label>
                    <div className="relative">
                        <input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} className="w-full bg-black border border-zinc-700 text-white p-3 pl-10 focus:border-cyan-500 outline-none transition-colors rounded-sm" placeholder="Confirm Password"/>
                        <ShieldCheck className="absolute left-3 top-3.5 text-zinc-500" size={16}/>
                    </div>
                  </div>
                  <div className="bg-zinc-800/50 p-3 rounded border border-zinc-700 text-xs text-zinc-400 space-y-1">
                      <div className="font-bold mb-1 text-zinc-300">密码要求：</div>
                      <div className={`flex items-center ${strength.length ? 'text-green-400' : ''}`}><span className={`w-1.5 h-1.5 rounded-full mr-2 ${strength.length ? 'bg-green-500' : 'bg-zinc-600'}`}></span> 长度 ≥ 8 位</div>
                      <div className={`flex items-center ${strength.types ? 'text-green-400' : ''}`}><span className={`w-1.5 h-1.5 rounded-full mr-2 ${strength.types ? 'bg-green-500' : 'bg-zinc-600'}`}></span> 包含 大/小/数/符 (≥3种)</div>
                  </div>
              </div>
          )}

          {error && <div className="text-red-500 text-sm bg-red-500/10 p-3 border border-red-500/20 rounded text-center animate-pulse">{error}</div>}

          <button className={`w-full font-bold py-3 uppercase transition-all rounded-sm mt-2 ${isRegister ? 'bg-cyan-600 hover:bg-cyan-500 text-white' : 'bg-yellow-500 hover:bg-yellow-400 text-black'}`}>
            {isRegister ? <><UserPlus size={18} className="inline mr-2"/> 立即注册</> : <><LogIn size={18} className="inline mr-2"/> 进入系统</>}
          </button>
        </form>
      </div>
    </div>
  );
}