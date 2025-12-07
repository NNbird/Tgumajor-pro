import React, { useState, useEffect } from 'react';
import { useLeague } from '../../context/LeagueContext';
import { Lock, Unlock, Siren, CheckCircle, Loader2 } from 'lucide-react';

const KEYS = {
    k1: 'TGU_CSGOGOGO',
    k2: 'TGUMAJOR_WIN',
    k3: 'TGU_CHAMPIONS'
};

export default function DefuseModal({ onClose }) {
  const { user } = useLeague(); // 不需要 addFeedback 了
  const [inputs, setInputs] = useState({ k1: '', k2: '', k3: '' });
  const [status, setStatus] = useState({ k1: false, k2: false, k3: false });
  const [isDefused, setIsDefused] = useState(false);
  const [contactInfo, setContactInfo] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    setStatus({
        k1: inputs.k1.trim() === KEYS.k1,
        k2: inputs.k2.trim() === KEYS.k2,
        k3: inputs.k3.trim() === KEYS.k3
    });
  }, [inputs]);

  const allCorrect = status.k1 && status.k2 && status.k3;

  const handleDefuse = () => {
    if (!allCorrect) return;
    setIsDefused(true);
  };

  // [修改] 调用专用领奖接口
  const handleClaim = async () => {
      if(!contactInfo.trim()) return alert("请输入您的 QQ 号");
      
      setIsSubmitting(true);
      try {
        const res = await fetch('/api/claim-reward', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                name: user?.name || '匿名玩家', 
                qq: contactInfo 
            })
        });

        if (res.ok) {
            setSubmitted(true);
        } else {
            alert("网络繁忙，请重试！");
        }
      } catch (e) {
          alert("提交失败，请检查网络");
      } finally {
          setIsSubmitting(false);
      }
  };

  return (
    <div className="fixed inset-0 bg-black/95 z-[110] flex items-center justify-center p-4 animate-in fade-in duration-500">
      <div className="w-full max-w-lg">
        
        {!isDefused ? (
            <div className="bg-zinc-900 border-4 border-zinc-800 p-8 rounded-xl shadow-2xl relative">
                <div className="absolute top-0 left-0 w-full h-2 bg-zinc-800">
                    <div className="h-full bg-red-500 animate-[progress_30s_linear]"></div>
                </div>
                
                <div className="text-center mb-8">
                    <h2 className="text-4xl font-black text-white tracking-tighter mb-2">BOMB CODE</h2>
                    <p className="text-zinc-500 font-mono text-xs">ENTER 3-PART ENCRYPTION KEY</p>
                    <p className="text-zinc-500 font-mono text-xs">需要区分大小写</p>
                </div>

                <div className="space-y-4 mb-8">
                    {['k1', 'k2', 'k3'].map((k, i) => (
                        <div key={k} className="relative">
                            <input 
                                type="text" 
                                value={inputs[k]}
                                onChange={e => setInputs({...inputs, [k]: e.target.value.trim()})}
                                className={`w-full bg-black border-2 p-4 text-center font-mono font-bold text-lg outline-none transition-all uppercase ${status[k] ? 'border-green-500 text-green-500 shadow-[0_0_15px_rgba(34,197,94,0.5)]' : 'border-red-900 text-red-500 focus:border-red-500'}`}
                                placeholder={`KEY PART ${i+1}`}
                            />
                            <div className="absolute right-4 top-1/2 -translate-y-1/2">
                                {status[k] ? <Unlock size={20} className="text-green-500"/> : <Lock size={20} className="text-zinc-700"/>}
                            </div>
                        </div>
                    ))}
                </div>

                <button 
                    onClick={handleDefuse}
                    disabled={!allCorrect}
                    className={`w-full py-4 font-black text-xl uppercase tracking-widest transition-all ${allCorrect ? 'bg-blue-600 hover:bg-blue-500 text-white shadow-[0_0_30px_rgba(37,99,235,0.6)] cursor-pointer' : 'bg-zinc-800 text-zinc-600 cursor-not-allowed'}`}
                >
                    {allCorrect ? 'CUT THE WIRE' : 'ACCESS DENIED'}
                </button>

                <button onClick={onClose} className="mt-4 w-full text-zinc-600 text-xs hover:text-zinc-400">放弃 (Abort)</button>
            </div>
        ) : (
            <div className="bg-zinc-900 border-2 border-green-500 p-8 rounded-xl text-center animate-in zoom-in duration-300">
                <CheckCircle size={80} className="mx-auto text-green-500 mb-6"/>
                <h2 className="text-4xl font-black text-white mb-2 text-green-400">BOMB DEFUSED</h2>
                <p className="text-zinc-400 mb-8">Counter-Terrorists Win.</p>
                
                {!submitted ? (
                    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4">
                        <p className="text-sm text-white font-bold bg-green-900/20 p-3 rounded border border-green-500/30">
                            恭喜！您已成功拆除炸弹。<br/>请输入您的领奖信息，系统将记录您的精确完成时间。
                        </p>
                        <input 
                            value={contactInfo}
                            onChange={e => setContactInfo(e.target.value)}
                            className="w-full bg-black border border-zinc-700 p-3 rounded text-white text-center focus:border-green-500 outline-none"
                            placeholder="请输入您的 QQ 号码"
                        />
                        <button 
                            onClick={handleClaim} 
                            disabled={isSubmitting}
                            className="w-full bg-green-600 text-white font-bold py-3 rounded hover:bg-green-500 transition-colors disabled:opacity-50 flex items-center justify-center"
                        >
                            {isSubmitting ? <Loader2 className="animate-spin"/> : '提交并锁定排名'}
                        </button>
                    </div>
                ) : (
                    <div className="text-green-500 font-bold py-4 border border-green-500/20 rounded bg-green-900/10">
                        <p className="text-xl mb-2">🎉 提交成功！</p>
                        <p className="text-sm text-zinc-400 font-normal">
                            您的记录已安全保存至服务器加密档案。<br/>
                            管理员将在活动结束后联系首位获胜者。
                        </p>
                        <button onClick={onClose} className="mt-6 text-zinc-500 underline text-sm hover:text-white">关闭窗口</button>
                    </div>
                )}
            </div>
        )}

      </div>
    </div>
  );
}