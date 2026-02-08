import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation, useNavigate } from 'react-router-dom';
import { LeagueProvider, useLeague } from './context/LeagueContext';
import Navbar from './components/Navbar';
import AIChatWidget from './components/AIChatWidget';
import LoginModal from './components/modals/LoginModal';
import PickEm from './pages/PickEm'; 
import News from './pages/News';          
import AdminNews from './pages/AdminNews';
// ✅ 1. 确保引入路径正确 (你已经写了，保持不动)
import AdminAssets from './components/admin/AdminAssets'; 
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
import MascotCreator from './pages/MascotCreator';
import Inventory from './pages/Inventory';
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
  const [showLogin, setShowLogin] = React.useState(false);

  if (IS_MAINTENANCE_MODE) {
    return (
      <LeagueProvider>
        <Router>
          <Routes>
            <Route path="*" element={<Maintenance />} />
          </Routes>
        </Router>
      </LeagueProvider>
    );
  }

  return (
    <LeagueProvider>
      <Router>
        <SecurityGuard>
          <div className="min-h-screen bg-transparent font-sans text-zinc-100 selection:bg-yellow-500 selection:text-black flex flex-col relative">
            
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