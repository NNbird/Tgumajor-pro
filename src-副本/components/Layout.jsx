import React from 'react';
import Navbar from './Navbar';
import AIChatWidget from './AIChatWidget';
import LoginModal from './modals/LoginModal';

export default function Layout({ children, showLogin, setShowLogin }) {
  return (
    <div className="min-h-screen bg-black font-sans text-zinc-100 selection:bg-yellow-500 selection:text-black flex flex-col">
      {/* 顶部导航 */}
      <Navbar onLoginClick={() => setShowLogin(true)} />
      
      {/* 主内容区域 - 自动撑开高度 */}
      <main className="pt-24 pb-20 px-6 max-w-7xl mx-auto w-full flex-grow">
        {children}
      </main>

      {/* 全局挂件 */}
      <AIChatWidget />
      
      {/* 登录弹窗 */}
      {showLogin && <LoginModal onClose={() => setShowLogin(false)} />}
      
      {/* 底部页脚 */}
      <footer className="border-t border-zinc-800 bg-zinc-950 py-12 mt-auto">
        <div className="max-w-7xl mx-auto px-6 text-center text-zinc-500 text-sm">
          &copy; 2024 CS:LEAGUE. All rights reserved. <br/>
          Professional Tournament Platform
        </div>
      </footer>
    </div>
  );
}