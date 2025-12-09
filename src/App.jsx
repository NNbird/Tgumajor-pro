import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation, useNavigate } from 'react-router-dom';
import { LeagueProvider, useLeague } from './context/LeagueContext';
import Navbar from './components/Navbar';
import AIChatWidget from './components/AIChatWidget';
import LoginModal from './components/modals/LoginModal';
import PickEm from './pages/PickEm'; // <--- 添加这一行
import News from './pages/News';          // [新增]
import AdminNews from './pages/AdminNews'; // [新增]

// 引入背景组件
import ParticleBackground from './components/ParticleBackground';

// Pages
import Home from './pages/Home';
import Matches from './pages/Matches'; 
import Teams from './pages/Teams';
import Stats from './pages/Stats';
import Register from './pages/Register';
import Admin from './pages/Admin';
import Feedback from './pages/Feedback';
import History from './pages/History';
import Profile from './pages/Profile';
import Maintenance from './pages/Maintenance';

// 安全卫士组件
function SecurityGuard({ children }) {
  const { user } = useLeague();
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    if (user && user.needUpdate && location.pathname !== '/profile') {
      navigate('/profile');
    }
  }, [user, location, navigate]);

  return children;
}

export default function App() {
  // 🔥 [开关] true = 开启维护模式, false = 正常网站
  const IS_MAINTENANCE_MODE = false;

  const [showLogin, setShowLogin] = React.useState(false);

  // --- 1. 维护模式逻辑 (修复版) ---
  if (IS_MAINTENANCE_MODE) {
    return (
      // [关键修复] 必须包裹 LeagueProvider，因为粒子背景需要读取选手数据
      <LeagueProvider>
        <Router>
          <Routes>
            {/* 无论访问什么路径，都显示维护页 */}
            <Route path="*" element={<Maintenance />} />
          </Routes>
        </Router>
      </LeagueProvider>
    );
  }

  // --- 2. 正常网站逻辑 ---
  return (
    <LeagueProvider>
      <Router>
        <SecurityGuard>
          <div className="min-h-screen bg-transparent font-sans text-zinc-100 selection:bg-yellow-500 selection:text-black flex flex-col relative">
            
            {/* 正常模式下的背景 */}
            <ParticleBackground />

            <Navbar onLoginClick={() => setShowLogin(true)} />
            
            <main className="pt-24 pb-20 px-6 max-w-7xl mx-auto w-full flex-grow min-h-screen z-10">
              <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/matches" element={<Matches />} />
                <Route path="/teams" element={<Teams />} />
                <Route path="/stats" element={<Stats />} />
                <Route path="/register" element={<Register />} />
                <Route path="/feedback" element={<Feedback />} />
                <Route path="/admin" element={<Admin />} />
                <Route path="/history" element={<History />} />
                <Route path="/profile" element={<Profile />} />
                <Route path="/pickem" element={<PickEm />} />
                <Route path="/news" element={<News />} />          {/* [新增] 用户新闻页 */}
                <Route path="/admin/news" element={<AdminNews />} /> {/* [新增] 后台新闻管理 */}
              </Routes>
            </main>

            <AIChatWidget />
            
            {showLogin && <LoginModal onClose={() => setShowLogin(false)} />}
            
            <footer className="border-t border-zinc-800 bg-zinc-950/80 backdrop-blur-md py-12 mt-auto z-10">
              <div className="max-w-7xl mx-auto px-6 text-center text-zinc-500 text-sm">
                &copy; 2025 CS:LEAGUE. All rights reserved.
              </div>
            </footer>
          </div>
        </SecurityGuard>
      </Router>
    </LeagueProvider>
  );
}