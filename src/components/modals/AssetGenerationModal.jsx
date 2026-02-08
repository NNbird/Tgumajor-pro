import React, { useState, useRef } from 'react';
import axios from 'axios';
import { X, Upload, Type, Image as ImageIcon, Loader2, Sparkles, CheckCircle2 } from 'lucide-react';
import { useLeague } from '../../context/LeagueContext';

export default function AssetGenerationModal({ onClose, onSuccess }) {
  const { user, refreshUser } = useLeague();
  const [mode, setMode] = useState('TEXT'); // 'TEXT' | 'IMAGE'
  const [prompt, setPrompt] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState('');
  
  // 状态机: IDLE -> SUBMITTING -> POLLING -> SUCCESS -> FAILED
  const [status, setStatus] = useState('IDLE'); 
  const [progress, setProgress] = useState(0);
  const [resultAsset, setResultAsset] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');

  const fileInputRef = useRef(null);

  // 处理图片选择
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  // 核心提交逻辑
  const handleSubmit = async () => {
    if (user.generationCredits <= 0) {
      alert('您的生成次数已用完！');
      return;
    }
    if (mode === 'TEXT' && !prompt) return alert('请输入描述');
    if (mode === 'IMAGE' && !selectedFile) return alert('请上传图片');

    setStatus('SUBMITTING');
    setErrorMsg('');

    try {
      const formData = new FormData();
      formData.append('userId', user.id);
      formData.append('mode', mode);
      
      if (mode === 'TEXT') {
        formData.append('prompt', prompt);
      } else {
        formData.append('image', selectedFile);
      }

      // 1. 提交任务
      const res = await axios.post('/api/assets/generate', formData);
      if (res.data.error) throw new Error(res.data.error);
      
      const { taskId } = res.data;
      setStatus('POLLING');
      startPolling(taskId);

      // 刷新用户数据(扣除额度)
      refreshUser();

    } catch (e) {
      console.error(e);
      setStatus('FAILED');
      setErrorMsg(e.response?.data?.error || e.message);
    }
  };

  // 轮询逻辑
  const startPolling = (taskId) => {
    const interval = setInterval(async () => {
      try {
        const res = await axios.get(`/api/assets/task/${taskId}`);
        const { status: taskStatus, progress: taskProgress, asset } = res.data;

        if (taskStatus === 'FAILED') {
          clearInterval(interval);
          setStatus('FAILED');
          setErrorMsg('生成失败，请稍后重试');
        } else if (taskStatus === 'COMPLETED') {
          clearInterval(interval);
          setStatus('SUCCESS');
          setResultAsset(asset);
          setProgress(100);
          if(onSuccess) onSuccess(); // 通知父组件刷新列表
        } else {
          // IN_PROGRESS
          setProgress(taskProgress);
        }
      } catch (e) {
        // 网络错误不中断，继续重试
        console.log("Polling error, retrying...", e);
      }
    }, 3000); // 每3秒查一次
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in">
      <div className="bg-zinc-900 border border-zinc-700 w-full max-w-2xl rounded-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="p-5 border-b border-zinc-800 flex justify-between items-center bg-zinc-950">
          <div>
            <h3 className="text-xl font-black text-white flex items-center gap-2">
              <Sparkles className="text-yellow-500" size={20}/> 资产铸造工厂
            </h3>
            <p className="text-xs text-zinc-500 mt-1">剩余额度: <span className="text-yellow-500 font-bold">{user?.generationCredits || 0}</span> 次</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-zinc-800 rounded-full text-zinc-500 hover:text-white"><X size={20}/></button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto flex-1 custom-scrollbar">
          
          {/* 成功态 */}
          {status === 'SUCCESS' ? (
            <div className="text-center py-10 space-y-6">
              <div className="w-20 h-20 bg-green-500/20 text-green-500 rounded-full flex items-center justify-center mx-auto animate-bounce">
                <CheckCircle2 size={40} />
              </div>
              <h4 className="text-2xl font-bold text-white">铸造完成！</h4>
              <p className="text-zinc-400">您的新资产已存入库存。</p>
              <div className="w-48 h-48 mx-auto bg-black rounded-xl border border-zinc-700 overflow-hidden">
                <img src={resultAsset?.imagePath} className="w-full h-full object-cover"/>
              </div>
              <button onClick={onClose} className="bg-white text-black font-bold px-8 py-3 rounded-xl hover:scale-105 transition-transform">
                前往查看
              </button>
            </div>
          ) : (
            // 表单态 & 进行态
            <div className="space-y-6">
              
              {/* Mode Switcher */}
              <div className="flex bg-black p-1 rounded-xl border border-zinc-800">
                <button 
                  onClick={() => setMode('TEXT')}
                  disabled={status !== 'IDLE'}
                  className={`flex-1 py-3 rounded-lg flex items-center justify-center gap-2 font-bold transition-all ${mode === 'TEXT' ? 'bg-zinc-800 text-white shadow-lg' : 'text-zinc-500 hover:text-zinc-300'}`}
                >
                  <Type size={18}/> 文本生成 (Text-to-3D)
                </button>
                <button 
                  onClick={() => setMode('IMAGE')}
                  disabled={status !== 'IDLE'}
                  className={`flex-1 py-3 rounded-lg flex items-center justify-center gap-2 font-bold transition-all ${mode === 'IMAGE' ? 'bg-zinc-800 text-white shadow-lg' : 'text-zinc-500 hover:text-zinc-300'}`}
                >
                  <ImageIcon size={18}/> 图片生成 (Image-to-3D)
                </button>
              </div>

              {/* Input Area */}
              <div className="min-h-[200px] flex flex-col justify-center">
                {status !== 'IDLE' ? (
                  // Loading View
                  <div className="text-center space-y-4">
                    <div className="relative w-24 h-24 mx-auto">
                      <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                        <path className="text-zinc-800" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeWidth="2" />
                        <path className="text-yellow-500 transition-all duration-500 ease-out" strokeDasharray={`${progress}, 100`} d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeWidth="2" />
                      </svg>
                      <div className="absolute inset-0 flex items-center justify-center font-black text-xl">{progress}%</div>
                    </div>
                    <div className="text-zinc-400 animate-pulse">
                      {status === 'SUBMITTING' && '正在提交任务...'}
                      {status === 'POLLING' && 'AI 正在全力构建模型 (约需 3-5 分钟)...'}
                    </div>
                  </div>
                ) : (
                  // Input View
                  mode === 'TEXT' ? (
                    <textarea 
                      value={prompt}
                      onChange={e => setPrompt(e.target.value)}
                      placeholder="描述你想要的 3D 物品，例如：'A golden dragon trophy with glowing eyes'..."
                      className="w-full h-48 bg-black border border-zinc-700 rounded-xl p-4 text-white resize-none focus:border-yellow-500 outline-none"
                    />
                  ) : (
                    <div 
                      onClick={() => fileInputRef.current.click()}
                      className="w-full h-48 border-2 border-dashed border-zinc-700 hover:border-yellow-500 rounded-xl flex flex-col items-center justify-center cursor-pointer transition-colors bg-black group relative overflow-hidden"
                    >
                      {previewUrl ? (
                        <img src={previewUrl} className="absolute inset-0 w-full h-full object-contain p-2"/>
                      ) : (
                        <>
                          <Upload className="text-zinc-500 group-hover:text-yellow-500 mb-2 transition-colors" size={32}/>
                          <span className="text-zinc-500 text-sm">点击上传参考图 (.png/.jpg)</span>
                        </>
                      )}
                      <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange}/>
                    </div>
                  )
                )}
              </div>

              {/* Error Message */}
              {status === 'FAILED' && (
                <div className="bg-red-900/20 border border-red-900/50 p-4 rounded-xl text-red-400 text-sm text-center">
                  {errorMsg}
                </div>
              )}

            </div>
          )}
        </div>

        {/* Footer */}
        {status !== 'SUCCESS' && (
          <div className="p-5 border-t border-zinc-800 bg-zinc-950 flex justify-end">
            <button 
              onClick={handleSubmit}
              disabled={status !== 'IDLE' || user.generationCredits <= 0}
              className="bg-yellow-500 hover:bg-yellow-400 disabled:opacity-50 disabled:cursor-not-allowed text-black font-black px-8 py-3 rounded-xl flex items-center gap-2 transition-transform active:scale-95"
            >
              {status === 'IDLE' ? (
                <> <Sparkles size={18}/> 开始铸造 (消耗1点) </>
              ) : (
                <> <Loader2 size={18} className="animate-spin"/> 处理中... </>
              )}
            </button>
          </div>
        )}

      </div>
    </div>
  );
}