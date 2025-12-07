import React, { useState, useEffect } from 'react';
import { useLeague } from '../context/LeagueContext';
import { useNavigate } from 'react-router-dom';
import { Shield, Key, User, Save, AlertTriangle, Lock, Fingerprint, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';

export default function Profile() {
  const { user, updateUserProfile, checkNameAvailability } = useLeague();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    username: user?.username || '', // 登录账号 (不可改)
    name: user?.name || '',         // 显示昵称 (可改)
    currentPassword: '', 
    newPassword: '',
    confirmPassword: ''
  });

  const [msg, setMsg] = useState('');
  
  // 昵称检测状态
  const [nameStatus, setNameStatus] = useState('idle'); // idle, checking, available, taken
  const [nameMsg, setNameMsg] = useState('');

  useEffect(() => {
    if (!user) navigate('/');
  }, [user, navigate]);

  // [核心] 昵称修改防抖检测
  useEffect(() => {
    // 如果没有改动，或是空的，或是初始值，则不检测
    if (!user || !form.name || form.name === user.name) {
        setNameStatus('idle');
        return;
    }
    
    setNameStatus('checking');
    const timer = setTimeout(async () => {
        // 传入 user.id 作为 excludeUserId，排除自己当前占用的名字
        const res = await checkNameAvailability(form.name, user.id);
        if (res.available) {
            setNameStatus('available');
        } else {
            setNameStatus('taken');
            setNameMsg(res.message || '已被占用');
        }
    }, 500); // 500ms 防抖

    return () => clearTimeout(timer);
  }, [form.name, user, checkNameAvailability]);

  const handleForgotPassword = () => {
    alert("请联系管理员 NNbird 恢复账号！\nQQ: 1259491619");
  };

  // 密码强度校验规则
  const checkStrength = (pwd) => {
    let types = 0;
    if (/[a-z]/.test(pwd)) types++;
    if (/[A-Z]/.test(pwd)) types++;
    if (/[0-9]/.test(pwd)) types++;
    if (/[^a-zA-Z0-9]/.test(pwd)) types++;
    return { length: pwd.length >= 8, types: types >= 3 };
  };
  const strength = checkStrength(form.newPassword);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMsg('');

    // 拦截：如果昵称被占用，禁止提交
    if (nameStatus === 'taken') {
        return setMsg('❌ 昵称已被占用，请更换');
    }

    // 密码校验
    if (form.newPassword) {
        if (!form.currentPassword) return setMsg('❌ 修改密码必须填写【当前旧密码】');
        if (form.newPassword !== form.confirmPassword) return setMsg('❌ 两次新密码输入不一致');
        if (!strength.length || !strength.types) return setMsg('❌ 新密码强度不足');
    }

    const res = await updateUserProfile({
        userId: user.id,
        name: form.name,
        currentPassword: form.currentPassword, // 传给后端验证
        newPassword: form.newPassword
    });

    if (res.success) {
        alert('修改成功！');
        // 清空密码框
        setForm(prev => ({ ...prev, currentPassword: '', newPassword: '', confirmPassword: '' }));
        // 如果是强制跳转进来的，修改成功后就可以去首页了
        if (user.needUpdate) navigate('/');
    } else {
        setMsg(`❌ ${res.message || res.error}`);
    }
  };

  return (
    <div className="max-w-2xl mx-auto py-10 animate-in fade-in">
      <div className="bg-zinc-900 border border-zinc-800 p-8 rounded-xl shadow-2xl relative overflow-hidden">
        
        {/* 安全警告 (只有需要强制更新时才显示) */}
        {user?.needUpdate && (
            <div className="bg-red-500/10 border border-red-500/50 p-4 rounded mb-6 flex items-start gap-3">
                <AlertTriangle className="text-red-500 shrink-0" />
                <div>
                    <h4 className="text-red-500 font-bold mb-1">账号安全风险警告</h4>
                    <p className="text-red-400 text-sm">
                        您的账号正在使用弱密码或默认密码。为了保障安全，请立即修改为高强度密码。
                    </p>
                </div>
            </div>
        )}

        <h2 className="text-3xl font-black text-white mb-8 flex items-center">
            <Shield className="mr-3 text-cyan-500" size={32}/> 个人中心
        </h2>

        <form onSubmit={handleSubmit} className="space-y-6">
            
            <div className="space-y-4">
                {/* 1. 登录账号 (不可改) */}
                <div>
                    <label className="text-xs text-zinc-500 uppercase font-bold mb-1 block">登录账号 (Login ID) - 不可修改</label>
                    <div className="flex items-center bg-zinc-950 border border-zinc-800 rounded p-3">
                        <Fingerprint size={18} className="text-zinc-600 mr-3"/>
                        <input value={form.username} disabled className="bg-transparent text-zinc-500 outline-none w-full cursor-not-allowed font-mono"/>
                    </div>
                </div>

                {/* 2. 显示昵称 (可改 + 实时检测) */}
                <div>
                    <label className="text-xs text-zinc-500 uppercase font-bold mb-1 flex justify-between">
                        显示昵称 (Nickname)
                        {/* 状态展示 */}
                        {form.name !== user?.name && (
                            <span className={`flex items-center text-[10px] ${nameStatus === 'available' ? 'text-green-500' : nameStatus === 'taken' ? 'text-red-500' : 'text-zinc-500'}`}>
                                {nameStatus === 'checking' && <><Loader2 size={10} className="animate-spin mr-1"/> 检测中...</>}
                                {nameStatus === 'available' && <><CheckCircle2 size={10} className="mr-1"/> 可用</>}
                                {nameStatus === 'taken' && <><AlertCircle size={10} className="mr-1"/> {nameMsg}</>}
                            </span>
                        )}
                    </label>
                    <div className={`flex items-center bg-black border rounded p-3 transition-colors relative ${nameStatus === 'taken' ? 'border-red-500' : nameStatus === 'available' ? 'border-green-500' : 'border-zinc-700 focus-within:border-cyan-500'}`}>
                        <User size={18} className="text-zinc-500 mr-3"/>
                        <input 
                            value={form.name} 
                            onChange={e => setForm({...form, name: e.target.value})} 
                            className="bg-transparent text-white outline-none w-full" 
                            placeholder="输入新昵称"
                        />
                    </div>
                </div>
            </div>

            <hr className="border-zinc-800"/>

            {/* 3. 密码修改区 */}
            <div className="space-y-4 bg-zinc-950 p-4 rounded border border-zinc-800">
                <div className="flex justify-between items-center mb-2">
                    <h4 className="text-sm font-bold text-white flex items-center"><Lock size={14} className="mr-2"/> 修改密码</h4>
                    <button type="button" onClick={handleForgotPassword} className="text-xs text-zinc-500 hover:text-yellow-500 underline cursor-pointer">
                        忘记旧密码？
                    </button>
                </div>

                <div className="grid grid-cols-1 gap-4">
                    <div>
                        <label className="text-[10px] text-zinc-500 uppercase font-bold mb-1 block">当前旧密码 (必填)</label>
                        <input 
                            type="password" 
                            value={form.currentPassword} 
                            onChange={e => setForm({...form, currentPassword: e.target.value})} 
                            className="w-full bg-black border border-zinc-700 p-2 rounded text-white text-sm outline-none focus:border-yellow-500" 
                            placeholder="如需修改密码，请先输入旧密码"
                        />
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-[10px] text-zinc-500 uppercase font-bold mb-1 block">新密码</label>
                            <input type="password" value={form.newPassword} onChange={e => setForm({...form, newPassword: e.target.value})} className="w-full bg-black border border-zinc-700 p-2 rounded text-white text-sm outline-none focus:border-green-500" placeholder="8位以上"/>
                        </div>
                        <div>
                            <label className="text-[10px] text-zinc-500 uppercase font-bold mb-1 block">确认新密码</label>
                            <input type="password" value={form.confirmPassword} onChange={e => setForm({...form, confirmPassword: e.target.value})} className="w-full bg-black border border-zinc-700 p-2 rounded text-white text-sm outline-none focus:border-green-500" placeholder="再次输入"/>
                        </div>
                    </div>
                </div>

                {/* 密码强度提示 */}
                {form.newPassword && (
                    <div className="bg-black p-3 rounded border border-zinc-800 text-xs text-zinc-400 space-y-1 animate-in fade-in">
                        <div className="font-bold mb-1 text-zinc-300">密码要求：</div>
                        <div className={`flex items-center ${strength.length ? 'text-green-400' : ''}`}>
                            <span className={`w-1.5 h-1.5 rounded-full mr-2 ${strength.length ? 'bg-green-500' : 'bg-zinc-600'}`}></span>
                            长度不少于 8 位
                        </div>
                        <div className={`flex items-center ${strength.types ? 'text-green-400' : ''}`}>
                            <span className={`w-1.5 h-1.5 rounded-full mr-2 ${strength.types ? 'bg-green-500' : 'bg-zinc-600'}`}></span>
                            包含大写/小写/数字/符号 (≥3种)
                        </div>
                    </div>
                )}
            </div>

            {/* 底部消息提示 */}
            {msg && <div className={`text-sm font-bold text-center p-2 rounded ${msg.includes('✅') ? 'text-green-400 bg-green-900/20' : 'text-red-400 bg-red-900/20'}`}>{msg}</div>}

            <button 
                type="submit" 
                disabled={nameStatus === 'taken' || nameStatus === 'checking'}
                className="w-full bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-black py-4 rounded uppercase tracking-widest shadow-lg shadow-cyan-900/20 transition-all flex items-center justify-center hover:scale-[1.01] active:scale-[0.99]"
            >
                <Save className="mr-2"/> 保存个人信息
            </button>

        </form>
      </div>
    </div>
  );
}