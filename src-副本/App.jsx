import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation, useNavigate } from 'react-router-dom';
import { LeagueProvider, useLeague } from './context/LeagueContext';
import Navbar from './components/Navbar';
import AIChatWidget from './components/AIChatWidget';
import LoginModal from './components/modals/LoginModal';

// Pages
import Home from './pages/Home';
import Matches from './pages/Matches'; 
import Teams from './pages/Teams';
import Stats from './pages/Stats';
import Register from './pages/Register';
import Admin from './pages/Admin';
import Feedback from './pages/Feedback';
import History from './pages/History'; // 历届锦标赛
import Profile from './pages/Profile'; // 个人中心

// [新增] 安全卫士组件：强制存在安全风险的用户跳转到个人中心修改密码
function SecurityGuard({ children }) {
  const { user } = useLeague();
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    // 逻辑：如果用户已登录 且 标记为需要更新(needUpdate) 且 当前不在 Profile 页面
    // 则强制跳转，防止用户进行其他操作
    if (user && user.needUpdate && location.pathname !== '/profile') {
      navigate('/profile');
    }
  }, [user, location, navigate]);

  return children;
}

export default function App() {
  const [showLogin, setShowLogin] = React.useState(false);

  return (
    <LeagueProvider>
      <Router>
        {/* 包裹 SecurityGuard 以启用路由拦截 */}
        <SecurityGuard>
          <div className="min-h-screen bg-black font-sans text-zinc-100 selection:bg-yellow-500 selection:text-black flex flex-col">
            
            <Navbar onLoginClick={() => setShowLogin(true)} />
            
            {/* 主内容区域 */}
            <main className="pt-24 pb-20 px-6 max-w-7xl mx-auto w-full flex-grow min-h-screen">
              <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/matches" element={<Matches />} />
                <Route path="/teams" element={<Teams />} />
                <Route path="/stats" element={<Stats />} />
                <Route path="/register" element={<Register />} />
                <Route path="/feedback" element={<Feedback />} />
                <Route path="/admin" element={<Admin />} />
                
                {/* 新增页面路由 */}
                <Route path="/history" element={<History />} />
                <Route path="/profile" element={<Profile />} />
              </Routes>
            </main>

            <AIChatWidget />
            
            {showLogin && <LoginModal onClose={() => setShowLogin(false)} />}
            
            <footer className="border-t border-zinc-800 bg-zinc-950 py-12 mt-auto">
              <div className="max-w-7xl mx-auto px-6 text-center text-zinc-500 text-sm">
                &copy; 2025 CS:LEAGUE. All rights reserved. <br/>
                Professional Tournament Platform
              </div>
            </footer>
          </div>
        </SecurityGuard>
      </Router>
    </LeagueProvider>
  );
}