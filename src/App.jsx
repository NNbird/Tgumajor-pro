import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation, useNavigate } from 'react-router-dom';
import { useLeague } from './context/LeagueContext';
import Navbar from './components/Navbar';
import LoginModal from './components/modals/LoginModal';

// Pages (Lazy Loaded)
const Home = React.lazy(() => import('./pages/Home'));
const Matches = React.lazy(() => import('./pages/Matches')); 
const Teams = React.lazy(() => import('./pages/Teams'));
const Stats = React.lazy(() => import('./pages/Stats'));
const Register = React.lazy(() => import('./pages/Register'));
const Admin = React.lazy(() => import('./pages/Admin'));
const Feedback = React.lazy(() => import('./pages/Feedback'));
const History = React.lazy(() => import('./pages/History'));
const Profile = React.lazy(() => import('./pages/Profile'));
const Maintenance = React.lazy(() => import('./pages/Maintenance'));
const MascotCreator = React.lazy(() => import('./pages/MascotCreator'));
const Inventory = React.lazy(() => import('./pages/Inventory'));
const News = React.lazy(() => import('./pages/News'));
const AdminNews = React.lazy(() => import('./pages/AdminNews'));
const PickEm = React.lazy(() => import('./pages/PickEm'));
const AdminAssets = React.lazy(() => import('./components/admin/AdminAssets'));
const AIChatWidget = React.lazy(() => import('./components/AIChatWidget'));
const ParticleBackground = React.lazy(() => import('./components/ParticleBackground'));

// 辅助函数：快速判断移动端
const checkIsMobile = () => {
  if (typeof window === 'undefined') return false;
  return window.innerWidth < 768 || /Mobi|Android|iPhone/i.test(navigator.userAgent);
};

// Loading Screen
function AppLoader() {
  return (
    <div className="fixed inset-0 bg-black flex flex-col items-center justify-center z-[9999]">
      <div className="w-12 h-12 border-4 border-purple-500/20 border-t-purple-500 rounded-full animate-spin mb-4"></div>
      <div className="text-zinc-500 text-sm animate-pulse tracking-widest font-bold">LOADING SYSTEM</div>
    </div>
  );
}

// Security Guard
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
  const IS_MAINTENANCE_MODE = false;
  const { isLoaded } = useLeague();
  const [showLogin, setShowLogin] = React.useState(false);

  // 移动端检测 - 初始值即进行判断，避免首帧触发 3D 组件加载
  const [isMobile, setIsMobile] = React.useState(checkIsMobile());

  React.useEffect(() => {
    const handleResize = () => {
      setIsMobile(checkIsMobile());
    };
    window.addEventListener('resize', handleResize);
    
    // 如果不是移动端，才异步加载 model-viewer 脚本
    if (!isMobile && !document.querySelector('script[src*="model-viewer"]')) {
      const script = document.createElement('script');
      script.type = 'module';
      script.src = 'https://ajax.googleapis.com/ajax/libs/model-viewer/3.3.0/model-viewer.min.js';
      document.head.appendChild(script);
    }
    
    return () => window.removeEventListener('resize', handleResize);
  }, [isMobile]);

  if (IS_MAINTENANCE_MODE) {
    return (
      <Router>
        <Routes>
          <Route path="*" element={<Maintenance />} />
        </Routes>
      </Router>
    );
  }

  // 加载状态拦截
  if (!isLoaded) return <AppLoader />;

  return (
    <Router>
      <SecurityGuard>
        <div className="min-h-screen bg-transparent font-sans text-zinc-100 selection:bg-yellow-500 selection:text-black flex flex-col relative">
          
          {/* 只有非移动端才渲染 3D 粒子背景 */}
          {!isMobile && (
            <React.Suspense fallback={<div className="fixed inset-0 bg-black z-0" />}>
              <ParticleBackground />
            </React.Suspense>
          )}
          {isMobile && <div className="fixed inset-0 bg-black z-0" />}

          <Navbar onLoginClick={() => setShowLogin(true)} />
          
          <main className="pt-24 pb-20 px-6 max-w-7xl mx-auto w-full flex-grow min-h-screen z-10">
            <React.Suspense fallback={<div className="flex items-center justify-center min-h-[50vh] text-zinc-500 text-sm italic">正在载入组件...</div>}>
              <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/matches" element={<Matches />} />
                <Route path="/teams" element={<Teams />} />
                <Route path="/stats" element={<Stats />} />
                <Route path="/register" element={<Register />} />
                <Route path="/feedback" element={<Feedback />} />
                
                {/* 管理员入口 */}
                <Route path="/admin" element={<Admin />} />
                
                {/* ✅ 2. 在这里添加资产管理的路由配置！ */}
                <Route path="/admin/assets" element={<AdminAssets />} />
                
                <Route path="/history" element={<History />} />
                <Route path="/profile" element={<Profile />} />
                <Route path="/inventory" element={<Inventory />} />
                <Route path="/mascot" element={<MascotCreator />} />
                <Route path="/pickem" element={<PickEm />} />
                <Route path="/news" element={<News />} />         
                <Route path="/admin/news" element={<AdminNews />} />
              </Routes>
            </React.Suspense>
          </main>

          <React.Suspense fallback={null}>
            <AIChatWidget />
          </React.Suspense>
          
          {showLogin && <LoginModal onClose={() => setShowLogin(false)} />}
          
          <footer className="border-t border-zinc-800 bg-zinc-950/80 backdrop-blur-md py-12 mt-auto z-10">
            <div className="max-w-7xl mx-auto px-6 text-center text-zinc-500 text-sm">
              &copy; 2025 CS:LEAGUE. All rights reserved.
            </div>
          </footer>
        </div>
      </SecurityGuard>
    </Router>
  );
}