import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useLeague } from '../context/LeagueContext';
import { Crosshair, Trophy, Users, Map, BarChart3, Activity, Menu, X, Settings, LogOut, LogIn, MessageSquare, User } from 'lucide-react';

export default function Navbar({ onLoginClick }) {
  const { user, logout } = useLeague();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const location = useLocation();
  const activeTab = location.pathname;

  // 监听滚动
  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // 路由切换时关闭菜单
  useEffect(() => {
    setIsMenuOpen(false);
  }, [location]);

  const NavItem = ({ to, icon: Icon, label, onClick }) => (
    <Link 
      to={to} 
      onClick={onClick}
      className={`flex items-center space-x-2 px-4 py-2 rounded-sm transition-all duration-300 ${
        activeTab === to ? 'text-yellow-500 font-bold bg-yellow-500/10' : 'text-zinc-400 hover:text-white hover:bg-white/5'
      }`}
    >
      {Icon && <Icon size={18} />}
      <span>{label}</span>
    </Link>
  );

  return (
    <nav className={`fixed top-0 w-full z-50 transition-all duration-300 border-b border-white/10 ${scrolled || isMenuOpen ? 'bg-black/95 backdrop-blur-md py-3 shadow-lg' : 'bg-transparent py-5'}`}>
      <div className="max-w-7xl mx-auto px-6 flex justify-between items-center">
        
        {/* Logo */}
        <Link to="/" className="flex items-center space-x-2 z-50" onClick={() => setIsMenuOpen(false)}>
          <div className="w-10 h-10 bg-yellow-500 flex items-center justify-center shadow-[0_0_15px_rgba(234,179,8,0.5)]">
            <Crosshair className="text-black animate-spin-slow" size={24} />
          </div>
          <span className="text-xl font-black tracking-tighter text-white italic">TGUmajor</span>
        </Link>

        {/* Desktop Navigation */}
        <div className="hidden md:flex space-x-1 bg-zinc-900/50 p-1 rounded-md border border-white/5 backdrop-blur-sm">
          <NavItem to="/" icon={Trophy} label="首页" />
          <NavItem to="/history" icon={HistoryIcon} label="历届锦标赛" /> {/* 确保你之前引入了History图标，如果报错请删掉这行或换回其他 */}
          <NavItem to="/teams" icon={Users} label="战队" />
          <NavItem to="/matches" icon={Map} label="对局" />
          <NavItem to="/stats" icon={BarChart3} label="数据" />
          <NavItem to="/register" icon={Activity} label="报名" />
          <NavItem to="/feedback" icon={MessageSquare} label="留言" />
        </div>

        {/* Right Side Actions */}
        <div className="flex items-center gap-4">
          {user ? (
            <div className="hidden md:flex items-center gap-3 pl-4 border-l border-zinc-700">
              <div className="flex flex-col items-end leading-tight">
                <span className="text-xs text-zinc-500 uppercase font-bold tracking-wider">Welcome</span>
                <span className="text-sm text-white font-bold flex items-center">
                  {user.role === 'admin' && <span className="text-[10px] bg-red-600 text-white px-1 rounded mr-1">GM</span>}
                  {user.name}
                </span>
              </div>
              
              {/* [新增] 个人中心按钮 */}
              <Link to="/profile" className="bg-zinc-800 p-2 rounded hover:bg-zinc-700 hover:text-cyan-400 transition-colors" title="个人中心">
                 <User size={18} />
              </Link>

              {user.role === 'admin' && (
                 <Link to="/admin" className="bg-zinc-800 p-2 rounded hover:bg-zinc-700 hover:text-yellow-500 transition-colors" title="管理后台">
                   <Settings size={18} />
                 </Link>
              )}
              <button onClick={logout} className="bg-zinc-800 p-2 rounded hover:bg-red-900/50 hover:text-red-500 transition-colors" title="退出">
                <LogOut size={18} />
              </button>
            </div>
          ) : (
            <button 
              onClick={onLoginClick} 
              className="hidden md:flex items-center gap-2 bg-yellow-500 text-black px-5 py-2 font-black text-sm uppercase hover:bg-yellow-400 hover:scale-105 transition-all shadow-[0_0_20px_rgba(234,179,8,0.3)] clip-path-slant"
            >
              <LogIn size={16} /> Login
            </button>
          )}

          {/* Mobile Menu Toggle */}
          <button 
            className="md:hidden text-white p-2 hover:bg-white/10 rounded transition-colors z-50" 
            onClick={() => setIsMenuOpen(!isMenuOpen)}
          >
            {isMenuOpen ? <X size={28} className="text-yellow-500"/> : <Menu size={28} />}
          </button>
        </div>
      </div>

      {/* Mobile Navigation Menu */}
      {isMenuOpen && (
        <div className="md:hidden absolute top-full left-0 w-full bg-zinc-950 border-b border-zinc-800 shadow-2xl animate-in slide-in-from-top-5 fade-in duration-200">
          <div className="flex flex-col p-4 space-y-2">
            <NavItem to="/" icon={Trophy} label="首页" onClick={() => setIsMenuOpen(false)} />
            <NavItem to="/history" icon={Activity} label="历届锦标赛" onClick={() => setIsMenuOpen(false)} />
            <NavItem to="/teams" icon={Users} label="参赛战队" onClick={() => setIsMenuOpen(false)} />
            <NavItem to="/matches" icon={Map} label="近期对局" onClick={() => setIsMenuOpen(false)} />
            <NavItem to="/stats" icon={BarChart3} label="数据统计" onClick={() => setIsMenuOpen(false)} />
            <NavItem to="/register" icon={Activity} label="报名中心" onClick={() => setIsMenuOpen(false)} />
            <NavItem to="/feedback" icon={MessageSquare} label="公测留言" onClick={() => setIsMenuOpen(false)} />
            
            <div className="h-px bg-zinc-800 my-2"></div>

            {user ? (
              <div className="space-y-2">
                <div className="px-4 py-2 flex items-center justify-between bg-zinc-900 rounded border border-zinc-800">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-zinc-800 rounded-full flex items-center justify-center text-yellow-500 font-bold border border-zinc-700">
                      {user.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div className="text-xs text-zinc-500">当前用户</div>
                      <div className="text-sm text-white font-bold">{user.name}</div>
                    </div>
                  </div>
                  {user.role === 'admin' && <span className="text-[10px] bg-red-600 text-white px-1.5 py-0.5 rounded">ADMIN</span>}
                </div>
                
                <div className="grid grid-cols-2 gap-2">
                  {/* [新增] 移动端个人中心 */}
                  <Link to="/profile" onClick={() => setIsMenuOpen(false)} className="flex items-center justify-center gap-2 bg-zinc-800 py-3 text-sm font-bold text-zinc-300 hover:text-white hover:bg-zinc-700 rounded">
                    <User size={16} /> 个人中心
                  </Link>

                  {user.role === 'admin' && (
                    <Link to="/admin" onClick={() => setIsMenuOpen(false)} className="flex items-center justify-center gap-2 bg-zinc-800 py-3 text-sm font-bold text-zinc-300 hover:text-white hover:bg-zinc-700 rounded">
                      <Settings size={16} /> 管理后台
                    </Link>
                  )}
                  <button 
                    onClick={() => { logout(); setIsMenuOpen(false); }} 
                    className={`flex items-center justify-center gap-2 bg-zinc-800 py-3 text-sm font-bold text-red-400 hover:bg-red-900/20 rounded ${user.role !== 'admin' ? 'col-span-2' : 'col-span-2'}`}
                  >
                    <LogOut size={16} /> 退出登录
                  </button>
                </div>
              </div>
            ) : (
              <button 
                onClick={() => { onLoginClick(); setIsMenuOpen(false); }} 
                className="w-full bg-yellow-500 text-black py-3 font-black uppercase flex items-center justify-center gap-2 hover:bg-yellow-400 transition-colors rounded"
              >
                <LogIn size={18} /> 立即登录 / 注册
              </button>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}

// 补充定义一个简单的 History 图标以防报错 (如果上面用了 Lucide 的 History 就不需要这个)
const HistoryIcon = (props) => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    width={props.size || 24} 
    height={props.size || 24} 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="2" 
    strokeLinecap="round" 
    strokeLinejoin="round" 
    {...props}
  >
    <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
    <path d="M3 3v5h5" />
    <path d="M12 7v5l4 2" />
  </svg>
);