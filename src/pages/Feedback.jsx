import React, { useState } from 'react';
import { useLeague } from '../context/LeagueContext';
import { MessageSquare, Send, Trash2, User, Info } from 'lucide-react';

export default function Feedback() {
  const { user, feedbacks, addFeedback, deleteFeedback } = useLeague();
  const [input, setInput] = useState('');
  const [qq, setQq] = useState(''); // 新增 QQ 状态

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!input.trim()) return;
    addFeedback(input, qq); // 提交时带上 QQ
    setInput('');
    setQq('');
  };

  return (
    <div className="max-w-4xl mx-auto animate-in fade-in slide-in-from-bottom-4">
      <div className="text-center mb-12">
        <h2 className="text-4xl font-black text-white mb-4 flex items-center justify-center">
          <MessageSquare className="mr-3 text-cyan-500" size={40} />
          公测留言板
        </h2>
        <p className="text-zinc-400 max-w-lg mx-auto">
          本网站目前正处于公开测试阶段 (Beta)。如果您发现任何 BUG 或有功能建议，欢迎在此留言。
          <br/>您的每一条建议都是我们进步的动力！
        </p>
      </div>

      {/* 留言输入框 */}
      <div className="bg-zinc-900/80 border border-zinc-700 p-6 rounded-xl shadow-xl mb-10">
        {!user ? (
          <div className="flex flex-col items-center justify-center py-8 text-zinc-500">
            <Info size={32} className="mb-2 opacity-50"/>
            <p>请先 <span className="text-yellow-500 font-bold cursor-pointer">登录</span> 后发表留言</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="relative">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-yellow-500 to-orange-600 flex items-center justify-center text-black font-bold text-lg shadow-lg">
                {user.name.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1">
                {/* 新增 QQ 输入框 */}
                <input 
                  value={qq}
                  onChange={e => setQq(e.target.value)}
                  placeholder="您的 QQ 号码 (选填，仅管理员可见，方便我们联系您)"
                  className="w-full bg-black border border-zinc-700 rounded-lg p-3 mb-3 text-white focus:border-cyan-500 outline-none transition-colors text-sm"
                />
                
                <textarea
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  placeholder={`以 ${user.name} 的身份发表建议...`}
                  className="w-full bg-black border border-zinc-700 rounded-lg p-4 text-white focus:border-cyan-500 outline-none min-h-[100px] resize-none transition-colors"
                />
                <div className="flex justify-between items-center mt-3">
                  <span className="text-xs text-zinc-600">请文明发言，共建良好社区环境</span>
                  <button 
                    type="submit" 
                    disabled={!input.trim()}
                    className="bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 disabled:cursor-not-allowed text-white px-6 py-2 rounded-lg font-bold flex items-center transition-all"
                  >
                    <Send size={16} className="mr-2"/> 发送
                  </button>
                </div>
              </div>
            </div>
          </form>
        )}
      </div>

      {/* 留言列表 */}
      <div className="space-y-6">
        {feedbacks.length === 0 && (
          <div className="text-center text-zinc-600 py-10">暂无留言，快来抢沙发吧！</div>
        )}
        
        {feedbacks.map((fb) => (
          <div key={fb.id} className="flex gap-4 group animate-in slide-in-from-bottom-2">
            <div className="flex-shrink-0 mt-1">
              <div className="w-10 h-10 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center text-zinc-400">
                <User size={20}/>
              </div>
            </div>
            <div className="flex-1">
              <div className="flex items-baseline justify-between mb-1">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-white">{fb.user}</span>
                  {fb.user === 'Admin' && <span className="bg-red-600 text-white text-[10px] px-1.5 rounded">OFFICIAL</span>}
                  {/* 注意：前台页面不显示 QQ 号 */}
                  <span className="text-xs text-zinc-500">{fb.date}</span>
                </div>
                {/* 管理员删除按钮 */}
                {user?.role === 'admin' && (
                  <button 
                    onClick={() => { if(confirm('确定删除此留言?')) deleteFeedback(fb.id) }}
                    className="text-zinc-600 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity p-1"
                    title="删除留言"
                  >
                    <Trash2 size={14}/>
                  </button>
                )}
              </div>
              <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-lg rounded-tl-none text-zinc-300 text-sm leading-relaxed shadow-sm relative group-hover:border-zinc-700 transition-colors">
                {fb.content}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}