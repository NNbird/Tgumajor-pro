import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { useLeague } from '../../context/LeagueContext'; // 确保路径正确
import { 
  Box, Plus, Search, Trash2, RefreshCcw, ArrowRight,
  CheckCircle2, Sparkles, Upload, Type, Image as ImageIcon, Loader2, Lock
} from 'lucide-react';

export default function AdminAssets() {
  const { user } = useLeague(); // 获取当前管理员信息
  const [activeTab, setActiveTab] = useState('TEMPLATES');
  const [templates, setTemplates] = useState([]);
  const [assets, setAssets] = useState([]);
  const [users, setUsers] = useState([]);
  
  // 模态框状态
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isDistributeOpen, setIsDistributeOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState(null);

  // --- 表单状态 ---
  const [newTemplate, setNewTemplate] = useState({
    id: '', name: '', type: 'WEAPON', rarity: 'COMMON', 
    description: '', isTradable: false,
    modelFile: null, imageFile: null
  });

  // --- AI 生成器状态 ---
  const [aiData, setAiData] = useState(null); // { modelPath: '', imagePath: '' }
  const [genMode, setGenMode] = useState('TEXT');
  const [prompt, setPrompt] = useState('');
  const [genFile, setGenFile] = useState(null);
  const [genPreviewUrl, setGenPreviewUrl] = useState('');
  const [genStatus, setGenStatus] = useState('IDLE'); // IDLE, SUBMITTING, POLLING, SUCCESS, FAILED
  const [genProgress, setGenProgress] = useState(0);
  const fileInputRef = useRef(null);

  const [distributeForm, setDistributeForm] = useState({
    targetType: 'USER',
    filter: '',
    selectedIds: []
  });

  // 初始化加载
  useEffect(() => {
    fetchTemplates();
    fetchAssets();
    fetchUsers();
  }, []);

  const fetchTemplates = async () => {
    const res = await axios.get('/api/admin/asset-templates');
    if (res.data.success) setTemplates(res.data.templates);
  };

  const fetchAssets = async (filter = '') => {
    const res = await axios.get(`/api/admin/assets/list?filter=${filter}`);
    if (res.data.success) setAssets(res.data.assets);
  };

  const fetchUsers = async () => {
    const res = await axios.get('/api/admin/users/simple');
    if (res.data.success) setUsers(res.data.users);
  };

  // --- 🤖 AI 生成逻辑 ---
  const handleGenFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setGenFile(file);
      setGenPreviewUrl(URL.createObjectURL(file));
    }
  };

  const startAiGeneration = async () => {
    if (!user) return alert("请先登录");
    if (genMode === 'TEXT' && !prompt) return alert('请输入描述');
    if (genMode === 'IMAGE' && !genFile) return alert('请上传参考图');

    setGenStatus('SUBMITTING');
    try {
      const formData = new FormData();
      formData.append('userId', user.id);
      formData.append('mode', genMode);
      if (genMode === 'TEXT') formData.append('prompt', prompt);
      else formData.append('image', genFile);

      const res = await axios.post('/api/assets/generate', formData);
      if (res.data.error) throw new Error(res.data.error);

      setGenStatus('POLLING');
      pollAiTask(res.data.taskId);
    } catch (e) {
      console.error(e);
      setGenStatus('FAILED');
      alert('生成任务提交失败: ' + e.message);
    }
  };

  const pollAiTask = (taskId) => {
    const interval = setInterval(async () => {
      try {
        const res = await axios.get(`/api/assets/task/${taskId}`);
        const { status, progress, asset } = res.data;

        if (status === 'FAILED') {
          clearInterval(interval);
          setGenStatus('FAILED');
        } else if (status === 'COMPLETED') {
          clearInterval(interval);
          setGenStatus('SUCCESS');
          setGenProgress(100);
          
          // ✨ 核心逻辑：生成成功后，锁定并填充数据
          setAiData({
            modelPath: asset.modelPath,
            imagePath: asset.imagePath
          });
          // 自动填充一部分表单
          setNewTemplate(prev => ({
             ...prev, 
             name: asset.customName || 'AI Generated Asset',
             // 自动生成一个随机ID避免冲突
             id: Math.floor(100000 + Math.random() * 900000).toString() 
          }));
        } else {
          setGenProgress(progress);
        }
      } catch (e) { console.error(e); }
    }, 3000);
  };

  // --- 📝 创建模板提交逻辑 ---
  const handleCreateTemplate = async (e) => {
    e.preventDefault();
    const formData = new FormData();
    
    // 基础字段
    Object.keys(newTemplate).forEach(key => {
      if (key !== 'modelFile' && key !== 'imageFile') {
        formData.append(key, newTemplate[key]);
      }
    });

    // 关键分支：如果使用了 AI 数据，传路径；否则传文件
    if (aiData) {
        formData.append('aiModelPath', aiData.modelPath);
        formData.append('aiImagePath', aiData.imagePath);
    } else {
        if (newTemplate.modelFile) formData.append('model', newTemplate.modelFile);
        if (newTemplate.imageFile) formData.append('image', newTemplate.imageFile);
    }

    try {
      const res = await axios.post('/api/admin/asset-templates', formData);
      if (res.data.success) {
        alert('✅ 模板创建成功！');
        setIsCreateOpen(false);
        resetForm();
        fetchTemplates();
      }
    } catch (err) {
      console.error(err);
      alert('❌ 创建失败: ' + (err.response?.data?.error || err.message));
    }
  };

  const resetForm = () => {
    setNewTemplate({
        id: '', name: '', type: 'WEAPON', rarity: 'COMMON', 
        description: '', isTradable: false,
        modelFile: null, imageFile: null
    });
    setAiData(null);
    setGenStatus('IDLE');
    setGenProgress(0);
    setPrompt('');
    setGenFile(null);
    setGenPreviewUrl('');
  };

  // --- 发放资产 ---
  const handleDistribute = async () => {
    if (!selectedTemplate || distributeForm.selectedIds.length === 0) return;
    if (!confirm(`⚠️ 确定发放吗？`)) return;

    try {
      const res = await axios.post('/api/admin/assets/distribute', {
        templateId: selectedTemplate.id,
        targetType: distributeForm.targetType,
        targetIds: distributeForm.selectedIds
      });
      if (res.data.success) {
        alert(`🎉 成功发放 ${res.data.count} 个资产！`);
        setIsDistributeOpen(false);
        fetchAssets();
      }
    } catch (err) { alert('❌ 发放失败'); }
  };

  // --- 撤销 ---
  const handleRevoke = async (uid) => {
    if (!confirm(`⚠️ 确定要强制回收资产 [UID: ${uid}] 吗？`)) return;
    try {
      const res = await axios.post('/api/admin/assets/revoke', { assetUid: uid });
      if (res.data.success) {
        alert(res.data.message);
        fetchAssets();
      }
    } catch (err) { alert('操作失败'); }
  };

  // 辅助搜索
  const filteredTargets = users.filter(u => {
    if (!distributeForm.filter) return false;
    const search = distributeForm.filter.toLowerCase();
    return distributeForm.targetType === 'USER' 
      ? (u.name.toLowerCase().includes(search) || u.username.toLowerCase().includes(search))
      : (u.team && u.team.toLowerCase().includes(search));
  });
  const uniqueTeams = [...new Set(filteredTargets.map(u => u.team).filter(t => t !== '无战队'))];

  return (
    <div className="min-h-screen bg-black text-white p-8 font-sans">
      <div className="max-w-7xl mx-auto">
        
        {/* Header */}
        <div className="flex justify-between items-center mb-8 border-b border-zinc-800 pb-6">
          <div>
            <h1 className="text-3xl font-black italic tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-orange-500">
              ASSET COMMAND CENTER
            </h1>
            <p className="text-zinc-500 text-sm mt-1">虚拟资产全生命周期管理系统</p>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setActiveTab('TEMPLATES')} className={`px-4 py-2 rounded-lg font-bold transition-all ${activeTab === 'TEMPLATES' ? 'bg-zinc-800 text-white' : 'text-zinc-500'}`}>模板库</button>
            <button onClick={() => setActiveTab('MATRIX')} className={`px-4 py-2 rounded-lg font-bold transition-all ${activeTab === 'MATRIX' ? 'bg-zinc-800 text-white' : 'text-zinc-500'}`}>监控矩阵</button>
          </div>
        </div>

        {/* TAB 1: 模板库 */}
        {activeTab === 'TEMPLATES' && (
          <div className="animate-in fade-in">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold flex items-center gap-2"><Box className="text-purple-500"/> 官方资产模板库</h2>
              <button onClick={() => setIsCreateOpen(true)} className="bg-purple-600 hover:bg-purple-500 text-white px-4 py-2 rounded-lg font-bold flex items-center shadow-lg shadow-purple-900/50">
                <Plus size={18} className="mr-2"/> 铸造新模板
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {templates.map(t => (
                <div key={t.id} className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden group hover:border-purple-500/50 transition-all relative">
                  <div className={`h-1 w-full ${t.rarity === 'LEGENDARY' ? 'bg-yellow-500' : t.rarity === 'RARE' ? 'bg-blue-500' : 'bg-zinc-600'}`}></div>
                  <div className="p-4 flex gap-4">
                    <div className="w-20 h-20 bg-black rounded-lg border border-zinc-700 overflow-hidden shrink-0">
                      <img src={t.imagePath} className="w-full h-full object-cover"/>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-start">
                        <h3 className="font-bold text-lg truncate">{t.name}</h3>
                        <span className="text-[10px] bg-zinc-800 text-zinc-400 px-1.5 py-0.5 rounded font-mono">ID:{t.id}</span>
                      </div>
                      <p className="text-zinc-500 text-xs mt-1 line-clamp-2">{t.description}</p>
                      <div className="mt-3 flex gap-2">
                        <span className="text-[10px] border border-zinc-700 px-2 py-0.5 rounded text-zinc-400">{t.type}</span>
                        <span className={`text-[10px] px-2 py-0.5 rounded font-bold ${t.isTradable ? 'bg-green-900/30 text-green-400' : 'bg-red-900/30 text-red-400'}`}>{t.isTradable ? '可交易' : '绑定'}</span>
                      </div>
                    </div>
                  </div>
                  <div className="absolute inset-0 bg-black/80 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                    <button onClick={() => { setSelectedTemplate(t); setIsDistributeOpen(true); }} className="bg-white text-black font-bold px-4 py-2 rounded-full hover:scale-105 transition-transform flex items-center">
                      <ArrowRight size={16} className="mr-2"/> 发放资产
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 2: 监控矩阵 */}
        {activeTab === 'MATRIX' && (
          <div className="animate-in fade-in">
            <div className="bg-zinc-900 p-4 rounded-xl border border-zinc-800 mb-6 flex gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={18}/>
                <input type="text" placeholder="搜索 UID / 用户名 / 资产名称..." className="w-full bg-black border border-zinc-700 rounded-lg pl-10 pr-4 py-2 text-white focus:border-yellow-500 outline-none" onChange={(e) => fetchAssets(e.target.value)}/>
              </div>
              <button onClick={() => fetchAssets()} className="bg-zinc-800 hover:bg-zinc-700 px-4 rounded-lg text-zinc-300"><RefreshCcw size={18}/></button>
            </div>
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
              <table className="w-full text-left text-sm">
                <thead className="bg-zinc-950 text-zinc-500 font-bold uppercase text-xs">
                  <tr><th className="p-4">资产信息</th><th className="p-4">持有者</th><th className="p-4">UID</th><th className="p-4">来源</th><th className="p-4">时间</th><th className="p-4 text-right">操作</th></tr>
                </thead>
                <tbody className="divide-y divide-zinc-800">
                  {assets.map(asset => (
                    <tr key={asset.uid} className="hover:bg-zinc-800/50 transition-colors group">
                      <td className="p-4 flex items-center gap-3">
                        <div className={`w-10 h-10 rounded border overflow-hidden shrink-0 ${asset.isOfficial?'border-yellow-500/50':'border-zinc-700'}`}>
                          <img src={asset.isOfficial ? asset.template?.imagePath : asset.imagePath} className="w-full h-full object-cover"/>
                        </div>
                        <div><div className="font-bold text-white">{asset.isOfficial ? asset.template?.name : asset.customName}</div></div>
                      </td>
                      <td className="p-4">{asset.owner?.name}</td>
                      <td className="p-4 font-mono text-xs text-zinc-500">{asset.uid}</td>
                      <td className="p-4">{asset.isOfficial ? <span className="text-yellow-500">官方</span> : <span className="text-blue-400">自制</span>}</td>
                      <td className="p-4 text-zinc-500 text-xs">{new Date(asset.createdAt).toLocaleDateString()}</td>
                      <td className="p-4 text-right"><button onClick={() => handleRevoke(asset.uid)} className="text-red-500 hover:bg-red-900/20 p-2 rounded"><Trash2 size={16}/></button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* === Modal: 铸造新模板 (双栏布局) === */}
      {isCreateOpen && (
        <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 p-4">
          <div className="bg-zinc-900 border border-zinc-700 w-full max-w-5xl rounded-2xl flex flex-col md:flex-row overflow-hidden shadow-2xl h-[80vh]">
            
            {/* --- 左侧：AI 生成器 --- */}
            <div className="w-full md:w-1/2 border-r border-zinc-800 bg-zinc-950 p-6 flex flex-col">
                <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                    <Sparkles className="text-blue-500"/> AI 辅助生成 (Generator)
                </h3>
                
                {/* 模式选择 */}
                <div className="flex bg-black p-1 rounded-lg border border-zinc-800 mb-4">
                    <button onClick={() => setGenMode('TEXT')} className={`flex-1 py-2 rounded text-sm font-bold flex items-center justify-center gap-2 ${genMode==='TEXT'?'bg-zinc-800 text-white':'text-zinc-500'}`}>
                        <Type size={16}/> 文本生成
                    </button>
                    <button onClick={() => setGenMode('IMAGE')} className={`flex-1 py-2 rounded text-sm font-bold flex items-center justify-center gap-2 ${genMode==='IMAGE'?'bg-zinc-800 text-white':'text-zinc-500'}`}>
                        <ImageIcon size={16}/> 图片生成
                    </button>
                </div>

                {/* 输入区域 */}
                <div className="flex-1 flex flex-col justify-center mb-4">
                    {genStatus === 'SUCCESS' ? (
                        <div className="text-center">
                            <div className="w-48 h-48 mx-auto bg-black rounded-xl border border-green-500/50 p-1 mb-4">
                                <img src={aiData?.imagePath} className="w-full h-full object-cover rounded-lg"/>
                            </div>
                            <div className="text-green-500 font-bold flex items-center justify-center gap-2">
                                <CheckCircle2/> 生成完毕
                            </div>
                            <p className="text-zinc-500 text-xs mt-2">模型与贴图已就绪，右侧表单已自动锁定。</p>
                        </div>
                    ) : genStatus === 'POLLING' || genStatus === 'SUBMITTING' ? (
                        <div className="text-center">
                            <Loader2 size={48} className="animate-spin text-blue-500 mx-auto mb-4"/>
                            <div className="text-white font-bold mb-2">AI 正在构建模型...</div>
                            <div className="w-full bg-zinc-800 h-2 rounded-full overflow-hidden">
                                <div className="bg-blue-500 h-full transition-all duration-500" style={{width: `${genProgress}%`}}></div>
                            </div>
                            <p className="text-zinc-500 text-xs mt-2">{genProgress}% (约需 3-5 分钟)</p>
                        </div>
                    ) : (
                        // IDLE / FAILED
                        genMode === 'TEXT' ? (
                            <textarea 
                                value={prompt} onChange={e => setPrompt(e.target.value)}
                                placeholder="描述想要生成的官方资产..."
                                className="w-full h-48 bg-black border border-zinc-700 rounded-xl p-4 text-white resize-none outline-none focus:border-blue-500"
                            />
                        ) : (
                            <div onClick={() => fileInputRef.current.click()} className="w-full h-48 border-2 border-dashed border-zinc-700 hover:border-blue-500 rounded-xl flex flex-col items-center justify-center cursor-pointer bg-black relative">
                                {genPreviewUrl ? <img src={genPreviewUrl} className="absolute inset-0 w-full h-full object-contain p-2"/> : <><Upload className="mb-2 text-zinc-500"/><span className="text-zinc-500 text-sm">上传参考图</span></>}
                                <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleGenFileChange}/>
                            </div>
                        )
                    )}
                </div>

                {genStatus === 'IDLE' || genStatus === 'FAILED' ? (
                    <button onClick={startAiGeneration} className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2">
                        <Sparkles size={18}/> 生成素材
                    </button>
                ) : null}
            </div>

            {/* --- 右侧：属性录入 --- */}
            <div className="w-full md:w-1/2 p-6 flex flex-col bg-zinc-900 overflow-y-auto custom-scrollbar">
                <h3 className="text-lg font-bold text-white mb-6">模板属性 (Properties)</h3>
                <form onSubmit={handleCreateTemplate} className="space-y-4 flex-1">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-xs text-zinc-500 mb-1 block">Template ID</label>
                            <input placeholder="自动/手动 ID" className="w-full bg-black border border-zinc-700 p-3 rounded text-white" 
                                value={newTemplate.id} onChange={e => setNewTemplate({...newTemplate, id: e.target.value})} required/>
                        </div>
                        <div>
                            <label className="text-xs text-zinc-500 mb-1 block">Name</label>
                            <input placeholder="资产名称" className="w-full bg-black border border-zinc-700 p-3 rounded text-white"
                                value={newTemplate.name} onChange={e => setNewTemplate({...newTemplate, name: e.target.value})} required/>
                        </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-xs text-zinc-500 mb-1 block">Type</label>
                            <select className="w-full bg-black border border-zinc-700 p-3 rounded text-white"
                                value={newTemplate.type} onChange={e => setNewTemplate({...newTemplate, type: e.target.value})}>
                                <option value="WEAPON">武器 (Weapon)</option>
                                <option value="TROPHY">奖杯 (Trophy)</option>
                                <option value="BADGE">徽章 (Badge)</option>
                                <option value="CHARACTER">角色 (Character)</option>
                            </select>
                        </div>
                        <div>
                            <label className="text-xs text-zinc-500 mb-1 block">Rarity</label>
                            <select className="w-full bg-black border border-zinc-700 p-3 rounded text-white"
                                value={newTemplate.rarity} onChange={e => setNewTemplate({...newTemplate, rarity: e.target.value})}>
                                <option value="COMMON">普通 (Common)</option>
                                <option value="RARE">稀有 (Rare)</option>
                                <option value="LEGENDARY">传说 (Legendary)</option>
                            </select>
                        </div>
                    </div>

                    <div>
                        <label className="text-xs text-zinc-500 mb-1 block">Description</label>
                        <textarea placeholder="描述..." className="w-full bg-black border border-zinc-700 p-3 rounded text-white h-24"
                            value={newTemplate.description} onChange={e => setNewTemplate({...newTemplate, description: e.target.value})} />
                    </div>

                    <div className="flex gap-4 items-center bg-zinc-950 p-3 rounded border border-zinc-800">
                        <input type="checkbox" checked={newTemplate.isTradable} onChange={e => setNewTemplate({...newTemplate, isTradable: e.target.checked})}/>
                        <label className="text-sm text-zinc-300">允许玩家交易 (Tradable)</label>
                    </div>

                    {/* 文件上传区 (AI数据存在时禁用) */}
                    <div className={`space-y-4 p-4 rounded-xl border ${aiData ? 'border-green-900/50 bg-green-900/10' : 'border-zinc-800 bg-black'}`}>
                        {aiData && <div className="text-green-500 text-xs font-bold flex items-center mb-2"><Lock size={12} className="mr-1"/> 已使用 AI 生成的资源</div>}
                        
                        <div className="space-y-2">
                            <label className="text-xs text-zinc-500">模型文件 (.glb)</label>
                            <input type="file" accept=".glb" disabled={!!aiData}
                                onChange={e => setNewTemplate({...newTemplate, modelFile: e.target.files[0]})} 
                                className="w-full text-sm text-zinc-400 disabled:opacity-50"/>
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs text-zinc-500">缩略图 (.png/.jpg)</label>
                            <input type="file" accept="image/*" disabled={!!aiData}
                                onChange={e => setNewTemplate({...newTemplate, imageFile: e.target.files[0]})} 
                                className="w-full text-sm text-zinc-400 disabled:opacity-50"/>
                        </div>
                    </div>

                    <div className="flex gap-3 pt-4 mt-auto">
                        <button type="button" onClick={() => setIsCreateOpen(false)} className="flex-1 bg-zinc-800 py-3 rounded text-zinc-400 font-bold">取消</button>
                        <button type="submit" className="flex-1 bg-white text-black font-bold py-3 rounded hover:bg-zinc-200">确认铸造</button>
                    </div>
                </form>
            </div>

          </div>
        </div>
      )}

      {/* === Modal: 发放资产 (保持不变) === */}
      {isDistributeOpen && selectedTemplate && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-zinc-900 border border-zinc-700 w-full max-w-lg rounded-2xl p-6 shadow-2xl">
            <h3 className="text-xl font-bold text-white mb-2">发放资产</h3>
            <div className="flex items-center gap-3 mb-6 bg-zinc-950 p-3 rounded border border-zinc-800">
              <img src={selectedTemplate.imagePath} className="w-12 h-12 rounded bg-black object-cover"/>
              <div>
                <div className="font-bold">{selectedTemplate.name}</div>
                <div className="text-xs text-zinc-500">库存ID: {selectedTemplate.id}</div>
              </div>
            </div>
            <div className="space-y-4">
              <div className="flex gap-2 bg-black p-1 rounded-lg">
                <button onClick={() => setDistributeForm({...distributeForm, targetType: 'USER', selectedIds: []})} className={`flex-1 py-2 rounded text-sm font-bold ${distributeForm.targetType==='USER'?'bg-zinc-800 text-white':'text-zinc-500'}`}>按用户</button>
                <button onClick={() => setDistributeForm({...distributeForm, targetType: 'TEAM', selectedIds: []})} className={`flex-1 py-2 rounded text-sm font-bold ${distributeForm.targetType==='TEAM'?'bg-zinc-800 text-white':'text-zinc-500'}`}>按战队</button>
              </div>
              <div className="relative">
                <Search className="absolute left-3 top-3 text-zinc-500" size={16}/>
                <input placeholder="搜索..." className="w-full bg-black border border-zinc-700 pl-10 p-3 rounded text-white outline-none focus:border-purple-500" onChange={e => setDistributeForm({...distributeForm, filter: e.target.value})}/>
              </div>
              <div className="h-48 overflow-y-auto bg-black border border-zinc-800 rounded p-2 space-y-1 custom-scrollbar">
                {distributeForm.targetType === 'USER' ? (
                  filteredTargets.map(u => (
                    <div key={u.id} onClick={() => {
                        const ids = distributeForm.selectedIds.includes(u.id) ? distributeForm.selectedIds.filter(id => id !== u.id) : [...distributeForm.selectedIds, u.id];
                        setDistributeForm({...distributeForm, selectedIds: ids});
                      }} className={`flex justify-between items-center p-2 rounded cursor-pointer ${distributeForm.selectedIds.includes(u.id) ? 'bg-purple-900/30 border border-purple-500/50' : 'hover:bg-zinc-800'}`}>
                      <span className="text-sm">{u.name} <span className="text-zinc-500 text-xs">(@{u.username})</span></span>
                      {distributeForm.selectedIds.includes(u.id) && <CheckCircle2 size={14} className="text-purple-500"/>}
                    </div>
                  ))
                ) : (
                  uniqueTeams.map(teamName => (
                    <div key={teamName} onClick={() => {
                        const ids = distributeForm.selectedIds.includes(teamName) ? distributeForm.selectedIds.filter(t => t !== teamName) : [...distributeForm.selectedIds, teamName];
                        setDistributeForm({...distributeForm, selectedIds: ids});
                      }} className={`flex justify-between items-center p-2 rounded cursor-pointer ${distributeForm.selectedIds.includes(teamName) ? 'bg-purple-900/30 border border-purple-500/50' : 'hover:bg-zinc-800'}`}>
                      <span className="text-sm font-bold">{teamName}</span>
                      {distributeForm.selectedIds.includes(teamName) && <CheckCircle2 size={14} className="text-purple-500"/>}
                    </div>
                  ))
                )}
              </div>
              <div className="text-xs text-zinc-500 text-right">已选中 {distributeForm.selectedIds.length} 个目标</div>
              <div className="flex gap-3 mt-6">
                <button onClick={() => setIsDistributeOpen(false)} className="flex-1 bg-zinc-800 py-3 rounded text-zinc-400">取消</button>
                <button onClick={handleDistribute} disabled={distributeForm.selectedIds.length === 0} className="flex-1 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white font-bold py-3 rounded">确认发放</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}