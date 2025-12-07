import React, { useState, useEffect } from 'react';
import { X, Bell, Calendar } from 'lucide-react';

export default function AnnouncementModal({ announcements, onClose, alwaysShow = false }) {
  const [dontShowToday, setDontShowToday] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // 如果是手动点击打开 (alwaysShow=true)，则忽略缓存，直接显示
    if (alwaysShow) {
      setIsVisible(true);
      return;
    }

    // 检查 LocalStorage
    const todayDate = new Date().toDateString();
    const lastClosed = localStorage.getItem('announcement_closed_date');

    if (lastClosed !== todayDate) {
      // 如果上次关闭不是今天，则显示，并稍作延迟产生动画效果
      setTimeout(() => setIsVisible(true), 500);
    }
  }, [alwaysShow]);

  const handleClose = () => {
    setIsVisible(false);
    if (dontShowToday) {
      localStorage.setItem('announcement_closed_date', new Date().toDateString());
    }
    setTimeout(onClose, 300); // 等待动画结束
  };

  if (!isVisible && !alwaysShow) return null;

  return (
    <div className={`fixed inset-0 z-[80] flex items-center justify-center p-4 transition-all duration-300 ${isVisible ? 'bg-black/80 backdrop-blur-sm' : 'bg-transparent pointer-events-none'}`}>
      <div className={`bg-zinc-900 border border-yellow-500/30 w-full max-w-lg rounded-xl shadow-2xl flex flex-col max-h-[80vh] transition-all duration-500 transform ${isVisible ? 'scale-100 opacity-100 translate-y-0' : 'scale-95 opacity-0 translate-y-10'}`}>
        
        {/* Header */}
        <div className="p-6 border-b border-zinc-800 flex justify-between items-center bg-gradient-to-r from-yellow-900/20 to-transparent rounded-t-xl">
          <h3 className="text-xl font-black text-white flex items-center">
            <Bell className="mr-3 text-yellow-500 fill-yellow-500 animate-pulse" size={24}/> 
            赛事公告 <span className="text-xs text-zinc-500 ml-2 font-normal bg-black/30 px-2 py-1 rounded">OFFICIAL NEWS</span>
          </h3>
          <button onClick={handleClose} className="text-zinc-500 hover:text-white transition-colors"><X size={24}/></button>
        </div>

        {/* Content List */}
        <div className="p-6 overflow-y-auto custom-scrollbar space-y-6">
          {announcements.length === 0 ? (
            <div className="text-center text-zinc-500 py-8">暂无最新公告</div>
          ) : (
            announcements.map((anno) => (
              <div key={anno.id} className="group">
                <div className="flex items-center gap-2 mb-1">
                   <Calendar size={12} className="text-zinc-600"/>
                   <span className="text-xs font-mono text-zinc-500 group-hover:text-yellow-500 transition-colors">{anno.date}</span>
                </div>
                <div 
                  className="leading-relaxed break-words"
                  style={{ 
                    color: anno.style?.color || '#fff', 
                    fontSize: anno.style?.fontSize || '14px',
                    fontWeight: anno.style?.isBold ? 'bold' : 'normal'
                  }}
                >
                  {anno.content}
                </div>
                <div className="h-px bg-zinc-800 w-full mt-4 group-last:hidden"></div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-zinc-800 bg-zinc-950 rounded-b-xl flex justify-between items-center">
          {!alwaysShow && (
            <label className="flex items-center gap-2 text-xs text-zinc-400 cursor-pointer hover:text-white select-none">
              <input 
                type="checkbox" 
                checked={dontShowToday} 
                onChange={e => setDontShowToday(e.target.checked)}
                className="accent-yellow-500 w-4 h-4 rounded border-zinc-700 bg-zinc-800"
              />
              今日不再自动弹出
            </label>
          )}
          <button onClick={handleClose} className="ml-auto bg-yellow-500 hover:bg-yellow-400 text-black font-bold px-6 py-2 rounded text-sm transition-colors shadow-[0_0_15px_rgba(234,179,8,0.3)]">
            我知道了
          </button>
        </div>
      </div>
    </div>
  );
}