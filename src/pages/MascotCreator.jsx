import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { useLeague } from '../context/LeagueContext';
import { useNavigate } from 'react-router-dom';
import { 
  Sparkles, Box, RefreshCw, Download, ArrowLeft, Loader2, 
  AlertTriangle, CheckCircle2, Clock, Move3d, Sun, RotateCw 
} from 'lucide-react';

export default function MascotCreator() {
  const { user } = useLeague();
  const navigate = useNavigate();
  
  // 3D Viewer 引用
  const modelViewerRef = useRef(null);

  // 数据状态
  const [team, setTeam] = useState(null);
  const [prompt, setPrompt] = useState('');
  
  // UI 交互状态
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState('LOADING'); // LOADING, READY, GEN_2D, WAITING_CONFIRM, GEN_3D, COMPLETED, FAILED
  const [progress, setProgress] = useState(0);

  // 3D 预览设置
  const [autoRotate, setAutoRotate] = useState(true);
  const [exposure, setExposure] = useState(1.0);

  // 1. 初始加载与权限检查
  useEffect(() => {
    if (!user) {
        navigate('/');
        return;
    }
    fetchTeamData();
  }, [user, navigate]);

  // 2. 自动轮询机制 (当状态为 GEN_3D 时自动启动)
  useEffect(() => {
    let intervalId;
    if (status === 'GEN_3D' && team?.id) {
        intervalId = setInterval(async () => {
            try {
                const res = await axios.get(`/api/mascot/status/${team.id}`);
                const { status: newStatus, progress: newProgress } = res.data;
                
                if (newProgress !== undefined) setProgress(newProgress);

                if (newStatus === 'COMPLETED') {
                    setStatus('COMPLETED');
                    fetchTeamData(); 
                } else if (newStatus === 'FAILED') {
                    setStatus('FAILED');
                    alert("建模任务失败 (Meshy Error)");
                }
            } catch (e) {
                console.error("轮询错误", e);
            }
        }, 3000);
    }
    return () => { if (intervalId) clearInterval(intervalId); };
  }, [status, team?.id]);

  // 获取战队数据 & 状态回显
  const fetchTeamData = async () => {
    try {
        const res = await axios.get(`/api/user/my-team?userId=${user.id}`);
        if (res.data.membership && res.data.membership.status === 'APPROVED' && res.data.membership.role === 'CAPTAIN') {
            const details = await axios.get('/api/teams/list'); 
            const myTeam = details.data.teams.find(t => t.name === res.data.membership.teamName);
            
            if (myTeam) {
                setTeam(myTeam);
                if (myTeam.mascotPrompt) setPrompt(myTeam.mascotPrompt);

                let currentStatus = myTeam.mascotStatus === 'NONE' ? 'READY' : myTeam.mascotStatus;
                if (['IN_PROGRESS', 'PENDING'].includes(currentStatus)) {
                    currentStatus = 'GEN_3D';
                }
                
                setStatus(currentStatus);
            }
        } else {
            alert("权限不足：仅限战队队长访问此功能。");
            navigate('/profile');
        }
    } catch (e) { console.error(e); }
  };

  // 生成 2D 设计图
  const handleGen2D = async () => {
    if (team.creditsTextToImage <= 0) return alert("设计次数已用完，请联系管理员充值！");
    if (!prompt.trim()) return alert("请输入吉祥物描述");
    
    setLoading(true);
    setStatus('GEN_2D'); 
    
    try {
        const res = await axios.post('/api/mascot/gen-2d', {
            teamId: team.id,
            userPrompt: prompt
        });
        if (res.data.success) {
            await fetchTeamData(); 
        } else {
            alert(res.data.message);
            setStatus('READY');
        }
    } catch (e) {
        alert("生成请求失败，请稍后重试");
        setStatus('READY');
    } finally {
        setLoading(false);
    }
  };

  // 开启 3D 建模
  const handleStart3D = async () => {
    if (team.creditsImageTo3D <= 0) return alert("建模次数已用完！");
    if (!window.confirm("⚠️ 确定要将此设计图 3D 化吗？\n这将消耗珍贵的 1 次建模机会，且不可撤销！")) return;

    try {
        const res = await axios.post('/api/mascot/start-3d', { teamId: team.id });
        if (res.data.success) {
            setProgress(0);
            setStatus('GEN_3D'); 
        } else {
            alert(res.data.message);
        }
    } catch (e) { alert("任务启动失败"); }
  };

  // 3D 视角重置
  const handleResetCamera = () => {
    const viewer = modelViewerRef.current;
    if (viewer) {
        viewer.cameraOrbit = '0deg 75deg 105%';
        viewer.fieldOfView = '30deg';
    }
  };

  if (!team || status === 'LOADING') return (
    <div className="min-h-screen bg-black flex items-center justify-center text-white">
        <Loader2 className="animate-spin mr-2"/> 加载工坊资源...
    </div>
  );

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-6 relative overflow-hidden font-sans">
      {/* 背景噪点 */}
      <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 pointer-events-none"></div>
      
      <div className="max-w-7xl mx-auto relative z-10 h-[calc(100vh-48px)] flex flex-col">
        
        {/* Header */}
        <div className="flex justify-between items-center mb-6 shrink-0">
            <button onClick={() => navigate('/profile')} className="flex items-center text-zinc-400 hover:text-white transition-colors group">
                <ArrowLeft className="mr-2 group-hover:-translate-x-1 transition-transform" size={20}/> 返回
            </button>
            <div className="flex items-center">
                <Box className="text-purple-500 mr-3" size={28}/>
                <div>
                    <h1 className="text-2xl font-black italic tracking-tighter text-white leading-none">MASCOT <span className="text-purple-500">WORKBENCH</span></h1>
                    <p className="text-[10px] text-zinc-500 font-mono tracking-widest uppercase">Meshy Engine V6</p>
                </div>
            </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 flex-1 min-h-0">
            
            {/* 左侧：工具栏 (固定宽度) */}
            <div className="lg:col-span-3 flex flex-col gap-4 h-full overflow-y-auto pr-1 custom-scrollbar">
                
                {/* 额度卡片 */}
                <div className="bg-zinc-900 border border-zinc-800 p-5 rounded-xl shadow-lg">
                    <h3 className="text-zinc-500 text-xs font-bold uppercase mb-4 flex justify-between">
                        资源配额
                        <span className="text-zinc-700">CREDITS</span>
                    </h3>
                    <div className="space-y-3">
                        <div className="flex justify-between items-center p-3 bg-black/50 rounded border border-zinc-800">
                            <span className="text-sm text-zinc-300">2D 设计次数</span>
                            <span className={`font-mono font-bold ${team.creditsTextToImage > 0 ? 'text-green-400' : 'text-red-500'}`}>
                                {team.creditsTextToImage}
                            </span>
                        </div>
                        <div className="flex justify-between items-center p-3 bg-black/50 rounded border border-zinc-800">
                            <span className="text-sm text-zinc-300">3D 建模次数</span>
                            <span className={`font-mono font-bold ${team.creditsImageTo3D > 0 ? 'text-purple-400' : 'text-red-500'}`}>
                                {team.creditsImageTo3D}
                            </span>
                        </div>
                    </div>
                    {team.creditsTextToImage === 0 && (
                        <div className="mt-3 text-[10px] text-red-400 bg-red-900/10 p-2 rounded border border-red-900/30 flex gap-2">
                            <AlertTriangle size={12} className="shrink-0 mt-0.5"/>
                            次数耗尽，请联系管理员充值。
                        </div>
                    )}
                </div>

                {/* 流程状态 */}
                <div className="bg-zinc-900 border border-zinc-800 p-5 rounded-xl flex-1 flex flex-col">
                    <h3 className="text-zinc-500 text-xs font-bold uppercase mb-4">工作流</h3>
                    <div className="space-y-6 relative ml-2 flex-1">
                        <div className="absolute left-3.5 top-2 bottom-2 w-0.5 bg-zinc-800 -z-10"></div>
                        <StepItem active={status === 'READY' || status === 'GEN_2D'} completed={status !== 'READY' && status !== 'GEN_2D'} title="1. 创意生成" desc="AI 概念设计"/>
                        <StepItem active={status === 'WAITING_CONFIRM'} completed={status === 'GEN_3D' || status === 'COMPLETED'} title="2. 确认方案" desc="三视图审查"/>
                        <StepItem active={status === 'GEN_3D'} completed={status === 'COMPLETED'} title="3. 3D 建模" desc="Meshy 引擎渲染"/>
                        <StepItem active={status === 'COMPLETED'} completed={status === 'COMPLETED'} title="4. 交付成品" desc="交互预览与下载"/>
                    </div>
                </div>
            </div>

            {/* 右侧：主工作区 (Workbench) */}
            <div className="lg:col-span-9 h-full flex flex-col">
                <div className="bg-zinc-900 border border-zinc-800 rounded-2xl h-full relative overflow-hidden flex flex-col shadow-2xl">
                    
                    {/* --- 状态 1: 输入 (READY) --- */}
                    {(status === 'READY') && (
                        <div className="flex-1 flex flex-col items-center justify-center p-12 text-center animate-in fade-in">
                            <div className="bg-zinc-800/30 p-10 rounded-3xl border border-zinc-700/50 max-w-2xl w-full backdrop-blur-sm">
                                <div className="w-20 h-20 bg-purple-500/10 rounded-full flex items-center justify-center mx-auto mb-6 border border-purple-500/20">
                                    <Sparkles size={40} className="text-purple-400" />
                                </div>
                                <h2 className="text-3xl font-bold text-white mb-3">创造你的战队灵魂</h2>
                                <p className="text-zinc-400 text-sm mb-8">
                                    输入简单的描述，AI 将自动应用 <span className="text-white font-bold">PopMart 盲盒风格</span> 进行 3D 渲染设计。
                                </p>
                                
                                <div className="relative">
                                    <textarea 
                                        value={prompt}
                                        onChange={e => setPrompt(e.target.value)}
                                        className="w-full bg-black border border-zinc-600 p-6 rounded-2xl text-white outline-none focus:border-purple-500 h-40 resize-none text-lg transition-colors placeholder:text-zinc-700"
                                        placeholder="例如: 一只穿着宇航服的柯基，手里拿着电竞键盘，未来科技感..."
                                    />
                                    <div className="absolute bottom-4 right-4">
                                        <button 
                                            onClick={handleGen2D}
                                            disabled={team.creditsTextToImage <= 0}
                                            className="bg-purple-600 hover:bg-purple-500 text-white font-bold py-2.5 px-6 rounded-xl shadow-lg hover:shadow-purple-500/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                                        >
                                            <RefreshCw size={18} className="mr-2"/> 生成草图
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* --- 状态 2: Loading --- */}
                    {status === 'GEN_2D' && (
                        <div className="flex-1 flex flex-col items-center justify-center p-12">
                            <div className="relative mb-8">
                                <div className="w-32 h-32 border-4 border-purple-500/20 border-t-purple-500 rounded-full animate-spin"></div>
                                <div className="absolute inset-0 flex items-center justify-center">
                                    <Sparkles size={32} className="text-purple-400 animate-pulse"/>
                                </div>
                            </div>
                            <h3 className="text-2xl font-bold text-white mb-2">AI 正在绘制设计图...</h3>
                            <p className="text-zinc-500">正在调用 Gemini 优化提示词并生成 Nano Banana 图像</p>
                        </div>
                    )}

                    {/* --- 状态 3: 确认设计 --- */}
                    {status === 'WAITING_CONFIRM' && (
                        <div className="flex-1 flex flex-col items-center justify-center p-8 animate-in fade-in bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-zinc-800/50 to-zinc-950">
                            <h3 className="text-xl font-bold text-white mb-8 flex items-center">
                                <span className="w-2 h-8 bg-purple-500 rounded-full mr-3"></span> 
                                确认设计方案
                            </h3>
                            
                            <div className="relative group max-w-3xl w-full flex justify-center mb-10">
                                <div className="absolute -inset-1 bg-gradient-to-r from-purple-600 to-pink-600 rounded-2xl blur opacity-20 group-hover:opacity-40 transition duration-1000"></div>
                                <img src={team.mascot2DUrl} alt="Design" className="relative rounded-xl shadow-2xl border border-zinc-700 bg-black max-h-[55vh] object-contain"/>
                                <div className="absolute top-4 right-4 bg-black/60 backdrop-blur px-3 py-1 rounded-full text-xs text-zinc-300 border border-zinc-700">
                                    2D Preview
                                </div>
                            </div>

                            <div className="flex gap-6">
                                <button 
                                    onClick={() => setStatus('READY')} 
                                    className="px-8 py-3 border border-zinc-600 rounded-xl text-zinc-300 hover:text-white hover:bg-zinc-800 hover:border-zinc-500 transition-all flex items-center"
                                >
                                    <RefreshCw size={18} className="mr-2"/> 不满意，重画
                                </button>
                                <button 
                                    onClick={handleStart3D} 
                                    className="px-10 py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:brightness-110 text-white font-bold rounded-xl shadow-lg shadow-purple-900/30 flex items-center transform hover:-translate-y-0.5 transition-all"
                                >
                                    <Box size={20} className="mr-2"/> 确认并生成 3D 模型
                                </button>
                            </div>
                        </div>
                    )}

                    {/* --- 状态 4: 3D 生成中 (进度条) --- */}
                    {status === 'GEN_3D' && (
                        <div className="flex-1 flex flex-col items-center justify-center p-12">
                            <div className="w-full max-w-md bg-zinc-800/40 p-10 rounded-3xl border border-zinc-700/50 backdrop-blur-sm">
                                <div className="flex justify-between items-end mb-6">
                                    <span className="text-purple-400 font-bold flex items-center text-lg">
                                        <Loader2 className="animate-spin mr-3" size={24}/> 
                                        Meshy 建模中...
                                    </span>
                                    <span className="text-4xl font-black text-white">{progress}%</span>
                                </div>
                                
                                <div className="w-full h-4 bg-black rounded-full overflow-hidden border border-zinc-600 mb-6 relative">
                                    <div className="absolute inset-0 bg-zinc-800/50 w-full h-full" style={{backgroundImage: 'linear-gradient(45deg,rgba(255,255,255,.05) 25%,transparent 25%,transparent 50%,rgba(255,255,255,.05) 50%,rgba(255,255,255,.05) 75%,transparent 75%,transparent)', backgroundSize: '1rem 1rem'}}></div>
                                    <div 
                                        className="h-full bg-gradient-to-r from-purple-600 to-pink-500 transition-all duration-500 ease-out relative" 
                                        style={{ width: `${progress}%` }}
                                    >
                                        <div className="absolute right-0 top-0 bottom-0 w-1 bg-white/50 shadow-[0_0_10px_white]"></div>
                                    </div>
                                </div>
                                
                                <div className="flex items-center justify-center text-zinc-500 text-sm bg-black/20 py-2 rounded-lg">
                                    <Clock size={16} className="mr-2"/> 预计耗时: 3-5 分钟
                                </div>
                                <p className="text-zinc-600 text-xs mt-4 text-center">您可以离开此页面，任务将在云端继续运行。</p>
                            </div>
                        </div>
                    )}

                    {/* --- 状态 5: 3D 预览工作台 (核心功能) --- */}
                    {status === 'COMPLETED' && (
                        <div className="relative w-full h-full group flex flex-col">
                            
                            {/* 3D 视窗 */}
                            <div className="flex-1 relative bg-[#121214]">
                                <model-viewer 
                                    ref={modelViewerRef}
                                    src={team.mascot3DUrl} 
                                    alt="3D Mascot"
                                    camera-controls 
                                    auto-rotate={autoRotate ? '' : null}
                                    rotation-per-second="30deg"
                                    interaction-prompt="none" 
                                    shadow-intensity="1.5"
                                    shadow-softness="0.8"
                                    exposure={exposure}
                                    tone-mapping="aces"
                                    environment-image="neutral" 
                                    min-camera-orbit="auto auto 5%"
                                    max-camera-orbit="auto auto 200%"
                                    style={{
                                        width: '100%', 
                                        height: '100%', 
                                        backgroundImage: 'radial-gradient(#27272a 1px, transparent 1px)', 
                                        backgroundSize: '24px 24px'
                                    }}
                                >
                                    <div slot="poster" className="flex items-center justify-center w-full h-full text-zinc-500">
                                        加载模型资源...
                                    </div>
                                </model-viewer>

                                {/* 悬浮工具栏 */}
                                <div className="absolute bottom-8 left-1/2 -translate-x-1/2 bg-zinc-900/90 backdrop-blur border border-zinc-700/50 rounded-full px-6 py-3 flex items-center gap-6 shadow-2xl transition-all hover:border-zinc-500">
                                    
                                    {/* 自动旋转 */}
                                    <button 
                                        onClick={() => setAutoRotate(!autoRotate)} 
                                        className={`flex flex-col items-center gap-1 transition-colors ${autoRotate ? 'text-purple-400' : 'text-zinc-500 hover:text-white'}`}
                                        title="自动旋转"
                                    >
                                        <RotateCw size={20} className={autoRotate ? 'animate-spin-slow' : ''}/>
                                    </button>

                                    <div className="w-px h-6 bg-zinc-700"></div>

                                    {/* 重置视角 */}
                                    <button 
                                        onClick={handleResetCamera} 
                                        className="flex flex-col items-center gap-1 text-zinc-500 hover:text-white transition-colors"
                                        title="重置视角"
                                    >
                                        <Move3d size={20}/>
                                    </button>

                                    <div className="w-px h-6 bg-zinc-700"></div>

                                    {/* 亮度调节 */}
                                    <div className="flex items-center gap-3 group/exp">
                                        <Sun size={20} className="text-zinc-500 group-hover/exp:text-yellow-400 transition-colors"/>
                                        <input 
                                            type="range" 
                                            min="0.5" max="2" step="0.1" 
                                            value={exposure} 
                                            onChange={e => setExposure(parseFloat(e.target.value))}
                                            className="w-20 h-1 bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-purple-500 hover:accent-purple-400"
                                            title={`曝光度: ${exposure}`}
                                        />
                                    </div>

                                    <div className="w-px h-6 bg-zinc-700"></div>

                                    {/* 重新生成按钮 (如果用户不喜欢 3D 结果) */}
                                    <button 
                                        onClick={() => {
                                            if(window.confirm('确定要放弃当前模型并重新开始吗？模型将不会被删除，但你需要重新消耗额度来生成新的。')) {
                                                setStatus('READY');
                                            }
                                        }} 
                                        className="flex flex-col items-center gap-1 text-zinc-500 hover:text-red-400 transition-colors"
                                        title="重新开始"
                                    >
                                        <RefreshCw size={20}/>
                                    </button>
                                </div>

                                {/* 右上角下载按钮 */}
                                <div className="absolute top-6 right-6 flex gap-3">
                                    <div className="px-3 py-1.5 bg-black/60 backdrop-blur rounded text-xs text-zinc-400 border border-zinc-800 pointer-events-none">
                                        左键旋转 • 右键平移 • 滚轮缩放
                                    </div>
                                    <a 
                                        href={team.mascot3DUrl} 
                                        download 
                                        className="flex items-center gap-2 px-4 py-1.5 bg-white text-black font-bold rounded hover:bg-zinc-200 transition-colors shadow-lg"
                                    >
                                        <Download size={16}/> 下载 .GLB
                                    </a>
                                </div>
                            </div>
                        </div>
                    )}

                </div>
            </div>
        </div>
      </div>
    </div>
  );
}

// 辅助组件：步骤条
function StepItem({ active, completed, title, desc }) {
    return (
        <div className={`flex items-start relative pl-8 pb-8 last:pb-0 transition-opacity duration-300 ${active || completed ? 'opacity-100' : 'opacity-30'}`}>
            <div className={`absolute left-0 top-0 w-8 h-8 rounded-full flex items-center justify-center border-2 z-10 bg-zinc-950 transition-colors duration-300 ${
                active || completed ? 'border-purple-500 text-purple-500 shadow-[0_0_15px_rgba(168,85,247,0.4)]' : 'border-zinc-800 text-zinc-700'
            }`}>
                {completed ? <CheckCircle2 size={16}/> : <div className={`w-2.5 h-2.5 rounded-full ${active ? 'bg-purple-500 animate-pulse' : 'bg-zinc-800'}`}></div>}
            </div>
            <div>
                <h4 className={`text-sm font-bold ${active || completed ? 'text-white' : 'text-zinc-500'} transition-colors`}>{title}</h4>
                {desc && <p className="text-[10px] text-zinc-500 mt-0.5 font-mono">{desc}</p>}
            </div>
        </div>
    );
}