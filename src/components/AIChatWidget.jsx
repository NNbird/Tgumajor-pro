import React, { useState, useRef, useEffect } from 'react';
import { useLeague } from '../context/LeagueContext';
import { MessageSquare, Send, Bot, X, Loader2, Trophy, Activity } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function AIChatWidget() {
  const { teams, playerStats, matches, tournaments } = useLeague();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    { 
      sender: 'ai', 
      text: '你好！我是赛事 AI 分析师。\n你可以问我比赛数据、选手排名，或者...\n\n提示：如果你是来寻找“拆弹密码”的，请先证明你的权限。' 
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  const analyzeQuery = (query) => {
    const q = query.toLowerCase().trim();
    
    setIsLoading(true);
    setTimeout(() => {
      let response = null;

      // --- 0. 彩蛋逻辑 (最高优先级) ---
      if (q.includes('拆弹') || q.includes('密码') || q.includes('密钥') || q.includes('炸弹')) {
          response = {
              text: "⚠️ 权限拒绝。\n检测到未授权的 C4 访问请求。\n\n[系统提示]：你需要开启控制台开发者才能获取机密信息。\n",
              type: 'text'
          };
      }
      else if (q === 'sv_cheats 1' || q.includes('sv_cheats 1')) {
          response = {
              text: "✅ 开发者模式已激活。\n正在解密底层数据...\n\n🔑 第一组密钥 (KEY #1): TGU_CSGOGOGO\n\n下一步线索：\n请前往【数据 (Stats)】页面。\n点击左上角的“奖杯”图标，通过测试后将获得第二组密钥。\n目标是找到那个“不存在的选手”。",
              type: 'highlight'
          };
      }

      // --- 1. 选手查询 ---
      else {
          // ... 原有的常规查询逻辑 ...
          const targetPlayer = playerStats.find(p => q.includes(p.name.toLowerCase()));
          if (targetPlayer) {
             // ... (省略具体的评价生成逻辑，保持你原有的即可，或者简单返回)
             response = { text: `📊 ${targetPlayer.name} 的 Rating 为 ${targetPlayer.rating}`, type: 'player-analysis' };
          } else {
             // 兜底
             response = { text: "抱歉，我没查到相关信息。如果是想问拆弹密码，请尝试“请求权限”。", type: 'text' };
          }
      }

      // 如果上面没匹配到复杂的，这里为了演示简单处理，
      // 实际请保留你之前完整的 matches/tournaments 查询逻辑
      // 这里只重点展示了彩蛋部分

      setMessages(prev => [...prev, { sender: 'ai', ...(response || { text: "收到，正在检索..." }) }]);
      setIsLoading(false);
    }, 800);
  };

  const handleSend = async (e) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;
    const userMsg = input;
    setInput('');
    setMessages(prev => [...prev, { sender: 'user', text: userMsg }]);
    
    // 这里为了演示彩蛋逻辑，直接调用本地 analyzeQuery
    // 如果你要走后端 AI，可以在后端实现同样的关键词拦截
    analyzeQuery(userMsg); 
  };

  // ... (渲染部分 MessageBubble 保持不变) ...
  const MessageBubble = ({ msg }) => {
    const isUser = msg.sender === 'user';
    return (
      <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-4 animate-in fade-in slide-in-from-bottom-2`}>
        {!isUser && <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-600 to-blue-600 border border-purple-500/30 flex items-center justify-center mr-2 text-white"><Bot size={16}/></div>}
        <div className={`max-w-[85%] p-3.5 rounded-2xl text-sm leading-relaxed shadow-md ${isUser ? 'bg-zinc-800 text-white' : 'bg-zinc-900/90 border border-zinc-800 text-zinc-300'}`}>
            {msg.text}
        </div>
      </div>
    );
  };

  return (
    <div className="fixed bottom-6 right-6 z-[100] flex flex-col items-end">
      {isOpen ? (
        <div className="bg-black border border-zinc-800 w-80 md:w-96 h-[550px] rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-bottom-10">
          <div className="p-4 border-b border-zinc-800 bg-zinc-900/50 flex justify-between items-center">
             <div className="flex items-center"><Bot className="text-purple-400 mr-2" size={24}/><span className="font-bold text-white text-sm">赛事 AI</span></div>
             <button onClick={() => setIsOpen(false)} className="text-zinc-500 hover:text-white"><X size={18}/></button>
          </div>
          <div className="flex-1 overflow-y-auto p-4 custom-scrollbar bg-grid-pattern">
            {messages.map((m, i) => <MessageBubble key={i} msg={m} />)}
            {isLoading && <div className="flex items-center text-zinc-500 text-xs gap-2"><Loader2 size={14} className="animate-spin"/> AI 正在思考...</div>}
            <div ref={messagesEndRef} />
          </div>
          <form onSubmit={handleSend} className="p-3 border-t border-zinc-800 bg-zinc-900 flex gap-2">
            <input className="flex-1 bg-black border border-zinc-800 rounded-full px-4 py-3 text-sm text-white focus:border-purple-500 outline-none" placeholder="输入指令..." value={input} onChange={e => setInput(e.target.value)} />
            <button type="submit" disabled={!input.trim() || isLoading} className="bg-purple-600 hover:bg-purple-500 text-white p-3 rounded-full"><Send size={18} /></button>
          </form>
        </div>
      ) : (
        <button onClick={() => setIsOpen(true)} className="bg-zinc-900 border border-purple-500/30 hover:border-purple-400 text-purple-400 p-4 rounded-full shadow-lg group relative">
          <MessageSquare size={28} className="group-hover:scale-110 transition-transform" />
          <span className="absolute top-0 right-0 w-3 h-3 bg-red-500 rounded-full border-2 border-black animate-pulse"></span>
        </button>
      )}
    </div>
  );
}