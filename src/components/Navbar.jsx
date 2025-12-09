import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useLeague } from '../context/LeagueContext';
import { 
  Crosshair, Trophy, Users, Map, BarChart3, Activity, Menu, X, 
  Settings, LogOut, LogIn, MessageSquare, User, History, FileText 
} from 'lucide-react';
import LoginModal from './modals/LoginModal';
import DefuseModal from './modals/DefuseModal';
import logo from './logo2.png'; // 如果没有图片，代码会自动降级显示文字

export default function Navbar() {
  const { user, logout } = useLeague();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [showLogin, setShowLogin] = useState(false); // 控制登录弹窗
  const [scrolled, setScrolled] = useState(false);
  const location = useLocation();
  const activeTab = location.pathname;

  // --- 彩蛋逻辑状态 ---
  const [showDefuse, setShowDefuse] = useState(false);
  const [pressTimer, setPressTimer] = useState(null);
  const [progress, setProgress] = useState(0); // 0-100

  // 监听滚动，改变导航栏背景
  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // 路由切换时自动关闭移动端菜单
  useEffect(() => {
    setIsMenuOpen(false);
  }, [location]);

  // --- Logo 长按彩蛋逻辑 ---
  const startPress = () => {
      if (pressTimer) clearInterval(pressTimer);
      let p = 0;
      const interval = setInterval(() => {
          p += 4; // 加快一点触发速度
          setProgress(p);
          if (p >= 100) {
              clearInterval(interval);
              setShowDefuse(true); 
              setProgress(0);
          }
      }, 50);
      setPressTimer(interval);
  };

  const endPress = () => {
      if (pressTimer) clearInterval(pressTimer);
      setProgress(0);
  };

  // --- 导航项组件 (通用) ---
  const NavItem = ({ to, icon: Icon, label, onClick, isMobile = false }) => {
    const isActive = activeTab === to;
    
    // 移动端样式
    if (isMobile) {
        return (
            <Link 
                to={to} 
                onClick={onClick}
                className={`flex items-center space-x-4 px-4 py-3 rounded-lg transition-all duration-200 ${
                    isActive 
                    ? 'bg-yellow-500/10 text-yellow-500 border-l-4 border-yellow-500' 
                    : 'text-zinc-400 hover:bg-white/5 hover:text-white border-l-4 border-transparent'
                }`}
            >
                {Icon && <Icon size={20} className={isActive ? "animate-pulse" : ""} />}
                <span className="font-bold text-sm tracking-wide uppercase">{label}</span>
            </Link>
        );
    }

    // 桌面端样式
    return (
        <Link 
            to={to} 
            className={`relative flex items-center space-x-1.5 px-3 py-2 rounded transition-all duration-300 group ${
                isActive ? 'text-white' : 'text-zinc-400 hover:text-white'
            }`}
        >
            {/* 背景高亮 */}
            {isActive && <div className="absolute inset-0 bg-white/5 rounded pointer-events-none"></div>}
            
            {Icon && <Icon size={16} className={`transition-colors ${isActive ? 'text-yellow-500' : 'group-hover:text-yellow-500'}`} />}
            <span className="text-xs font-bold uppercase tracking-tight">{label}</span>
            
            {/* 底部指示条 */}
            <span className={`absolute bottom-0 left-1/2 -translate-x-1/2 h-[2px] bg-yellow-500 transition-all duration-300 ${isActive ? 'w-1/2' : 'w-0 group-hover:w-1/3'}`}></span>
        </Link>
    );
  };

  return (
    <>
    <nav className={`fixed top-0 w-full z-[60] transition-all duration-500 border-b ${
        scrolled || isMenuOpen 
        ? 'bg-zinc-950/90 backdrop-blur-md border-zinc-800 py-2 shadow-2xl' 
        : 'bg-transparent border-transparent py-4'
    }`}>
      <div className="max-w-7xl mx-auto px-4 md:px-6 flex justify-between items-center">
        
        {/* --- Logo 区域 (含长按彩蛋) --- */}
        <div 
            className="relative select-none cursor-pointer group"
            onMouseDown={startPress} onMouseUp={endPress} onMouseLeave={endPress}
            onTouchStart={startPress} onTouchEnd={endPress}
            title="Long press for surprise"
        >
            {/* 长按进度圈 */}
            {progress > 0 && (
                 <div className="absolute inset-0 -m-2 rounded-full border-2 border-yellow-500 border-t-transparent animate-spin" style={{ animationDuration: '0.5s' }}></div>
            )}

            <Link to="/" className="flex items-center gap-3 relative z-10" onClick={() => setIsMenuOpen(false)}>
                {/* Logo 图标或图片 */}
                <div className={`w-10 h-10 bg-gradient-to-br from-yellow-400 to-yellow-600 flex items-center justify-center rounded-lg shadow-lg shadow-yellow-500/20 transition-transform duration-200 ${progress > 0 ? 'scale-90' : 'group-hover:scale-105'}`}>
                    <img src={logo} alt="Logo" className="w-8 h-8 object-contain opacity-90" onError={(e) => e.target.style.display='none'} />
                    <Crosshair className="text-black absolute opacity-0 logo-fallback" size={24} /> 
                </div>
                <span className="text-xl font-black tracking-tighter text-white italic hidden sm:block">
                    TGU<span className="text-yellow-500">MAJOR</span>
                </span>
            </Link>
        </div>

        {/* --- 桌面端导航 (中间) --- */}
        {/* 使用 hidden lg:flex 隐藏移动端，在大屏显示 */}
        <div className="hidden lg:flex items-center gap-1 bg-zinc-900/50 p-1.5 rounded-lg border border-white/5 backdrop-blur-sm shadow-inner">
          <NavItem to="/" icon={Trophy} label="首页" />
          <NavItem to="/news" icon={FileText} label="资讯" /> {/* [新增] */}
          <NavItem to="/matches" icon={Map} label="赛程" />
          <NavItem to="/teams" icon={Users} label="战队" />
          <NavItem to="/stats" icon={BarChart3} label="数据" />
          <NavItem to="/pickem" icon={Crosshair} label="竞猜" />
          <NavItem to="/history" icon={History} label="历届" />
          <NavItem to="/register" icon={Activity} label="报名" />
          <NavItem to="/feedback" icon={MessageSquare} label="留言" />
        </div>

        {/* --- 右侧操作区 --- */}
        <div className="flex items-center gap-3 md:gap-5">
          {user ? (
            <div className="flex items-center gap-3 pl-4 border-l border-zinc-800">
              {/* 用户信息 (仅桌面显示详细) */}
              <div className="hidden md:flex flex-col items-end leading-tight">
                <span className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider">Welcome</span>
                <span className="text-sm text-white font-bold flex items-center gap-1">
                  {user.role === 'admin' && <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>}
                  {user.name}
                </span>
              </div>
              
              <Link to="/profile" className="w-9 h-9 bg-zinc-800 rounded-full flex items-center justify-center text-zinc-400 hover:text-cyan-400 hover:bg-zinc-700 transition-all border border-zinc-700">
                 <User size={16} />
              </Link>
              
              {user.role === 'admin' && (
                 <Link to="/admin" className="w-9 h-9 bg-zinc-800 rounded-full flex items-center justify-center text-zinc-400 hover:text-yellow-500 hover:bg-zinc-700 transition-all border border-zinc-700" title="管理后台">
                   <Settings size={16} />
                 </Link>
              )}
              
              <button onClick={logout} className="w-9 h-9 bg-zinc-800 rounded-full flex items-center justify-center text-zinc-400 hover:text-red-500 hover:bg-red-900/20 transition-all border border-zinc-700" title="退出">
                <LogOut size={16} />
              </button>
            </div>
          ) : (
            <button 
              onClick={() => setShowLogin(true)} 
              className="hidden md:flex items-center gap-2 bg-yellow-500 hover:bg-yellow-400 text-black px-5 py-2.5 rounded font-black text-xs uppercase tracking-wider shadow-lg shadow-yellow-500/20 hover:scale-105 transition-all"
            >
              <LogIn size={14} strokeWidth={3} /> Login
            </button>
          )}

          {/* 移动端菜单按钮 */}
          <button 
            className="lg:hidden text-white p-2 hover:bg-white/10 rounded-lg transition-colors active:scale-95" 
            onClick={() => setIsMenuOpen(!isMenuOpen)}
          >
            {isMenuOpen ? <X size={24} className="text-yellow-500"/> : <Menu size={24} />}
          </button>
        </div>
      </div>

      {/* --- 移动端下拉菜单 --- */}
      {/* 增加 backdrop-blur 让背景看起来更高级，防止遮挡内容看不清 */}
      {isMenuOpen && (
        <div className="lg:hidden absolute top-full left-0 w-full bg-zinc-950/95 backdrop-blur-xl border-b border-zinc-800 shadow-2xl animate-in slide-in-from-top-2 fade-in duration-200 h-screen md:h-auto overflow-y-auto pb-20">
          <div className="flex flex-col p-4 space-y-1">
            <NavItem to="/" icon={Trophy} label="首页 Home" isMobile onClick={() => setIsMenuOpen(false)} />
            <NavItem to="/news" icon={FileText} label="资讯 News" isMobile onClick={() => setIsMenuOpen(false)} /> {/* [新增] */}
            <NavItem to="/matches" icon={Map} label="近期赛程 Matches" isMobile onClick={() => setIsMenuOpen(false)} />
            <NavItem to="/teams" icon={Users} label="参赛战队 Teams" isMobile onClick={() => setIsMenuOpen(false)} />
            <NavItem to="/stats" icon={BarChart3} label="数据统计 Stats" isMobile onClick={() => setIsMenuOpen(false)} />
            <NavItem to="/pickem" icon={Crosshair} label="冠军竞猜 Pick'Em" isMobile onClick={() => setIsMenuOpen(false)} />
            <NavItem to="/register" icon={Activity} label="报名中心 Register" isMobile onClick={() => setIsMenuOpen(false)} />
            <NavItem to="/history" icon={History} label="历届赛事 History" isMobile onClick={() => setIsMenuOpen(false)} />
            <NavItem to="/feedback" icon={MessageSquare} label="留言反馈 Feedback" isMobile onClick={() => setIsMenuOpen(false)} />
            
            <div className="h-px bg-zinc-800 my-4"></div>

            {user ? (
              <div className="bg-zinc-900/50 rounded-xl p-4 border border-zinc-800">
                 <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 bg-yellow-500 rounded-full flex items-center justify-center text-black font-bold text-lg">
                        {user.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                        <div className="text-white font-bold">{user.name}</div>
                        <div className="text-xs text-zinc-500 uppercase">{user.role} Account</div>
                    </div>
                 </div>
                 <div className="grid grid-cols-2 gap-3">
                    <Link to="/profile" onClick={() => setIsMenuOpen(false)} className="bg-black border border-zinc-700 rounded p-3 text-center text-xs font-bold text-zinc-300 hover:text-white hover:border-zinc-500">个人中心</Link>
                    {user.role === 'admin' && (
                        <Link to="/admin" onClick={() => setIsMenuOpen(false)} className="bg-black border border-zinc-700 rounded p-3 text-center text-xs font-bold text-yellow-500 hover:border-yellow-500">管理后台</Link>
                    )}
                 </div>
                 <button 
                    onClick={() => { logout(); setIsMenuOpen(false); }}
                    className="w-full mt-3 bg-red-900/20 border border-red-900/50 text-red-500 py-3 rounded text-xs font-bold uppercase hover:bg-red-900/40"
                 >
                    退出登录
                 </button>
              </div>
            ) : (
              <button 
                onClick={() => { setShowLogin(true); setIsMenuOpen(false); }} 
                className="w-full bg-yellow-500 text-black py-4 font-black uppercase rounded-lg shadow-lg shadow-yellow-500/10 active:scale-95 transition-transform flex items-center justify-center gap-2"
              >
                <LogIn size={20}/> 立即登录 / 注册
              </button>
            )}
          </div>
        </div>
      )}

      {/* 挂载弹窗 */}
      {showDefuse && <DefuseModal onClose={() => setShowDefuse(false)} />}
      {showLogin && <LoginModal onClose={() => setShowLogin(false)} />}
      
    </nav>
    <style>{`.logo-fallback { display: none; } img[style*="display: none"] + .logo-fallback { display: block; }`}</style>
    </>
  );
}