import React, { useState, useRef, useEffect } from 'react';
import { MessageSquare, Send, Bot, X, Loader2 } from 'lucide-react';

export default function AIChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    { 
      sender: 'ai', 
      text: '你好！我是接入了通义千问的 TGU 赛事助手。\n我可以读取实时数据库，你可以问我：\n\n1. "Donk 在秋季赛表现如何？"\n2. "刚才 TGU vs idk 谁赢了？"\n3. "总结一下目前的赛事状况"' 
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMsg = input;
    setInput('');
    setMessages(prev => [...prev, { sender: 'user', text: userMsg }]);
    setIsLoading(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userMsg })
      });
      
      const data = await res.json();
      
      if (data.reply) {
        setMessages(prev => [...prev, { sender: 'ai', text: data.reply }]);
      } else {
        setMessages(prev => [...prev, { sender: 'ai', text: '抱歉，我暂时无法分析数据。' }]);
      }
    } catch (error) {
      setMessages(prev => [...prev, { sender: 'ai', text: '网络连接失败，请稍后重试。' }]);
    } finally {
      setIsLoading(false);
    }
  };

  // --- 渲染部分 ---
  const MessageBubble = ({ msg }) => {
    const isUser = msg.sender === 'user';
    return (
      <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-4 animate-in fade-in slide-in-from-bottom-2`}>
        {!isUser && (
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-600 to-blue-600 border border-purple-500/30 flex items-center justify-center mr-2 flex-shrink-0 text-white shadow-lg shadow-purple-500/20">
            <Bot size={16} />
          </div>
        )}
        <div className={`max-w-[85%] p-3.5 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap shadow-md ${
          isUser 
            ? 'bg-zinc-800 text-white rounded-tr-none border border-zinc-700' 
            : 'bg-zinc-900/90 border border-zinc-800 text-zinc-300 rounded-tl-none backdrop-blur-sm'
        }`}>
          {/* 支持简单的 Markdown 渲染 (如换行) */}
          {msg.text}
        </div>
      </div>
    );
  };

  return (
    <div className="fixed bottom-6 right-6 z-[100] flex flex-col items-end">
      {isOpen ? (
        <div className="bg-black border border-zinc-800 w-80 md:w-96 h-[550px] rounded-2xl shadow-[0_0_50px_rgba(0,0,0,0.6)] flex flex-col overflow-hidden animate-in slide-in-from-bottom-10 fade-in duration-300 ring-1 ring-white/10">
          
          {/* Header */}
          <div className="p-4 border-b border-zinc-800 bg-zinc-900/50 backdrop-blur-md flex justify-between items-center">
             <div className="flex items-center">
               <div className="relative mr-3">
                 <div className="w-2 h-2 bg-green-500 rounded-full absolute right-0 bottom-0 ring-2 ring-zinc-900 animate-pulse"></div>
                 <Bot className="text-purple-400" size={24}/>
               </div>
               <div>
                 <div className="font-bold text-white text-sm">TGU AI Assistant</div>
                 <div className="text-[10px] text-zinc-500 uppercase tracking-wider">Powered by Qwen</div>
               </div>
             </div>
             <button onClick={() => setIsOpen(false)} className="text-zinc-500 hover:text-white transition-colors p-1 hover:bg-white/10 rounded">
               <X size={18}/>
             </button>
          </div>

          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto p-4 custom-scrollbar bg-grid-pattern">
            {messages.map((m, i) => <MessageBubble key={i} msg={m} />)}
            {isLoading && (
                <div className="flex justify-start mb-4">
                    <div className="w-8 h-8 rounded-full bg-zinc-900 flex items-center justify-center mr-2">
                        <Bot size={16} className="text-purple-500"/>
                    </div>
                    <div className="bg-zinc-900/50 border border-zinc-800 p-3 rounded-2xl rounded-tl-none flex items-center gap-2 text-zinc-500 text-xs">
                        <Loader2 size={14} className="animate-spin"/> 正在分析赛场数据...
                    </div>
                </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <form onSubmit={handleSend} className="p-3 border-t border-zinc-800 bg-zinc-900 flex gap-2 items-center">
            <input 
              className="flex-1 bg-black border border-zinc-800 rounded-full px-4 py-3 text-sm text-white focus:border-purple-500 outline-none transition-all placeholder-zinc-600 shadow-inner" 
              placeholder="问问我比赛结果..." 
              value={input} 
              onChange={e => setInput(e.target.value)} 
            />
            <button 
              type="submit" 
              disabled={!input.trim() || isLoading}
              className="bg-purple-600 hover:bg-purple-500 disabled:opacity-50 disabled:cursor-not-allowed text-white p-3 rounded-full transition-all shadow-lg shadow-purple-900/20 hover:scale-105 active:scale-95"
            >
              <Send size={18} />
            </button>
          </form>
        </div>
      ) : (
        <button 
          onClick={() => setIsOpen(true)} 
          className="bg-zinc-900 border border-purple-500/30 hover:border-purple-400 text-purple-400 p-4 rounded-full shadow-[0_0_30px_rgba(147,51,234,0.3)] hover:shadow-[0_0_40px_rgba(147,51,234,0.6)] hover:-translate-y-1 transition-all duration-300 group relative"
        >
          <MessageSquare size={28} className="group-hover:scale-110 transition-transform" />
          {/* 呼吸灯红点 */}
          <span className="absolute top-0 right-0 w-3 h-3 bg-red-500 rounded-full border-2 border-black animate-pulse"></span>
        </button>
      )}
    </div>
  );
}