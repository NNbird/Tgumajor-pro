import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Box, RefreshCcw, Plus, Cuboid, Edit3, Save, X, RotateCcw } from 'lucide-react';
import { useLeague } from '../context/LeagueContext';
import AssetGenerationModal from '../components/modals/AssetGenerationModal';

export default function Inventory() {
  const { user } = useLeague();
  const [assets, setAssets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showGenModal, setShowGenModal] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState(null); // 用于展示详情/3D预览

  const fetchAssets = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const res = await axios.get(`/api/user/assets?userId=${user.id}`);
      if (res.data.success) {
        setAssets(res.data.assets);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAssets();
  }, [user]);

  // --- 内嵌组件：详情与编辑器 ---
  const AssetDetailModal = ({ asset, onClose, onUpdateSuccess }) => {
    if (!asset) return null;
    
    const isOfficial = asset.isOfficial;
    const modelUrl = isOfficial ? asset.template?.modelPath : asset.modelPath;
    
    // 编辑状态管理
    const [isEditing, setIsEditing] = useState(false);
    const [editForm, setEditForm] = useState({
        name: asset.customName || '',
        description: asset.customDescription || ''
    });
    const [saving, setSaving] = useState(false);

    // 显示用的数据 (官方用模板数据，自制用自定义数据)
    const displayName = isOfficial ? asset.template?.name : (isEditing ? editForm.name : asset.customName);
    const displayDesc = isOfficial ? asset.template?.description : (isEditing ? editForm.description : (asset.customDescription || '这是一个玩家自制的 3D 资产。'));
    const displayType = isOfficial ? asset.template?.type : 'UGC_MODEL';
    const displayRarity = isOfficial ? asset.template?.rarity : 'COMMON';

    // 稀有度样式
    const rarityColors = {
      LEGENDARY: 'text-yellow-500 border-yellow-500 bg-yellow-500/10',
      RARE: 'text-purple-500 border-purple-500 bg-purple-500/10',
      COMMON: 'text-zinc-400 border-zinc-600 bg-zinc-800/50',
    };
    const colorClass = rarityColors[displayRarity] || rarityColors['COMMON'];

    // 保存逻辑
    const handleSave = async () => {
        if (!editForm.name.trim()) return alert("资产名称不能为空");
        setSaving(true);
        try {
            const res = await axios.post('/api/user/asset/update', {
                userId: user.id,
                assetUid: asset.uid,
                name: editForm.name,
                description: editForm.description
            });
            if (res.data.success) {
                // 更新本地视图并通知父组件刷新
                asset.customName = editForm.name;
                asset.customDescription = editForm.description;
                setIsEditing(false);
                if (onUpdateSuccess) onUpdateSuccess(); 
            } else {
                alert(res.data.error);
            }
        } catch(e) {
            alert("保存失败");
        } finally {
            setSaving(false);
        }
    };

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm p-4 animate-in zoom-in-95">
        <div className="bg-zinc-900 border border-zinc-700 w-full max-w-5xl h-[80vh] rounded-2xl overflow-hidden flex flex-col md:flex-row shadow-2xl relative">
          
          {/* Close Button */}
          <button onClick={onClose} className="absolute top-4 right-4 z-20 p-2 bg-black/50 rounded-full hover:bg-white/20 text-white transition-colors">
            <X size={20}/>
          </button>
          
          {/* Left: 3D Viewer Area */}
          <div className="flex-1 bg-gradient-to-b from-zinc-800 to-black relative">
             <model-viewer
                src={modelUrl}
                camera-controls
                auto-rotate={!isEditing} // 编辑时停止旋转，防晕
                shadow-intensity="1.5"
                style={{ width: '100%', height: '100%' }}
                alt="3D Model"
             ></model-viewer>
             <div className="absolute bottom-6 left-6 pointer-events-none">
                <div className="flex items-center gap-2 mb-2">
                    <span className={`text-[10px] font-bold border px-2 py-0.5 rounded uppercase tracking-wider ${colorClass}`}>
                        {displayRarity}
                    </span>
                    <span className="text-[10px] font-bold border border-zinc-600 text-zinc-400 bg-zinc-800/50 px-2 py-0.5 rounded uppercase tracking-wider">
                        {displayType}
                    </span>
                </div>
                {!isEditing && (
                    <h2 className="text-4xl font-black text-white drop-shadow-xl">{displayName}</h2>
                )}
             </div>
          </div>

          {/* Right: Info & Edit Panel */}
          <div className="w-full md:w-96 bg-zinc-950 border-l border-zinc-800 flex flex-col relative">
            
            {/* 顶部：标题栏 / 编辑栏 */}
            <div className="p-6 border-b border-zinc-800">
                <div className="flex justify-between items-start mb-4">
                    <div className="text-xs text-zinc-500 font-bold uppercase tracking-widest">Asset Details</div>
                    {!isOfficial && !isEditing && (
                        <button 
                            onClick={() => setIsEditing(true)}
                            className="text-xs flex items-center gap-1 text-purple-400 hover:text-purple-300 transition-colors"
                        >
                            <Edit3 size={14}/> 编辑信息
                        </button>
                    )}
                </div>

                {isEditing ? (
                    <div className="space-y-4 animate-in fade-in slide-in-from-right-4">
                        <div>
                            <label className="text-xs text-zinc-500 mb-1 block">资产名称</label>
                            <input 
                                value={editForm.name}
                                onChange={e => setEditForm({...editForm, name: e.target.value})}
                                className="w-full bg-zinc-900 border border-purple-500/50 p-2 rounded text-white font-bold outline-none focus:ring-2 focus:ring-purple-500/20"
                                autoFocus
                            />
                        </div>
                        <div>
                            <label className="text-xs text-zinc-500 mb-1 block">资产描述</label>
                            <textarea 
                                value={editForm.description}
                                onChange={e => setEditForm({...editForm, description: e.target.value})}
                                className="w-full h-32 bg-zinc-900 border border-purple-500/50 p-2 rounded text-zinc-300 text-sm outline-none resize-none focus:ring-2 focus:ring-purple-500/20"
                                placeholder="输入关于这个物品的故事..."
                            />
                        </div>
                        <div className="flex gap-2 pt-2">
                            <button 
                                onClick={handleSave} 
                                disabled={saving}
                                className="flex-1 bg-purple-600 hover:bg-purple-500 text-white py-2 rounded font-bold flex items-center justify-center gap-2"
                            >
                                {saving ? <RefreshCcw className="animate-spin" size={16}/> : <Save size={16}/>} 保存
                            </button>
                            <button 
                                onClick={() => setIsEditing(false)} 
                                disabled={saving}
                                className="px-4 bg-zinc-800 hover:bg-zinc-700 text-zinc-400 rounded font-bold"
                            >
                                取消
                            </button>
                        </div>
                    </div>
                ) : (
                    <>
                        <h2 className="text-2xl font-bold text-white mb-4 leading-tight">{displayName}</h2>
                        <div className="h-40 overflow-y-auto custom-scrollbar pr-2">
                            <p className="text-zinc-400 text-sm leading-relaxed whitespace-pre-wrap">{displayDesc}</p>
                        </div>
                    </>
                )}
            </div>

            {/* 底部：元数据信息 */}
            <div className="p-6 mt-auto space-y-4 bg-zinc-900/50">
              <div className="flex justify-between items-center py-2 border-b border-zinc-800/50">
                <span className="text-zinc-500 text-xs">Owner</span>
                <div className="flex items-center gap-2">
                    <div className="w-5 h-5 rounded-full bg-purple-500 flex items-center justify-center text-[10px] text-white font-bold">
                        {user.name[0]}
                    </div>
                    <span className="text-zinc-300 text-sm font-medium">{user.name}</span>
                </div>
              </div>
              
              <div className="flex justify-between items-center py-2 border-b border-zinc-800/50">
                <span className="text-zinc-500 text-xs">Origin</span>
                <span className={`text-xs font-bold px-2 py-0.5 rounded ${isOfficial ? 'bg-yellow-500/10 text-yellow-500' : 'bg-blue-500/10 text-blue-400'}`}>
                    {isOfficial ? 'OFFICIAL DROP' : 'USER GENERATED'}
                </span>
              </div>

              <div className="flex justify-between items-center py-2">
                <span className="text-zinc-500 text-xs">UID</span>
                <span className="text-zinc-600 font-mono text-xs tracking-wider select-all">{asset.uid}</span>
              </div>
            </div>

          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen pt-24 pb-20 px-6 max-w-7xl mx-auto">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-end mb-8 gap-4 border-b border-zinc-800 pb-6">
        <div>
          <h1 className="text-4xl font-black italic text-white flex items-center gap-3">
            <Cuboid className="text-yellow-500" size={40}/> 
            INVENTORY
          </h1>
          <p className="text-zinc-500 mt-2">管理你的虚拟资产收藏</p>
        </div>
        <div className="flex gap-3">
          <button onClick={fetchAssets} className="p-3 bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 rounded-xl text-zinc-400 transition-colors">
            <RefreshCcw size={20}/>
          </button>
          <button 
            onClick={() => setShowGenModal(true)}
            className="px-6 py-3 bg-yellow-500 hover:bg-yellow-400 text-black font-black rounded-xl flex items-center gap-2 shadow-lg shadow-yellow-500/20 transition-transform hover:scale-105"
          >
            <Plus size={20}/> 铸造新资产
          </button>
        </div>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="text-center py-20 text-zinc-500">加载库存数据...</div>
      ) : assets.length === 0 ? (
        <div className="text-center py-20 border-2 border-dashed border-zinc-800 rounded-2xl">
          <Box size={48} className="mx-auto text-zinc-700 mb-4"/>
          <h3 className="text-xl font-bold text-zinc-500">库存空空如也</h3>
          <p className="text-zinc-600 mt-2">快去铸造你的第一个 3D 资产吧！</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {assets.map(asset => {
            const isOfficial = asset.isOfficial;
            const thumb = isOfficial ? asset.template?.imagePath : asset.imagePath;
            const name = isOfficial ? asset.template?.name : asset.customName;
            const rarity = isOfficial ? asset.template?.rarity : 'COMMON';
            
            // 边框颜色逻辑
            let borderClass = 'border-zinc-800 hover:border-zinc-500';
            if (rarity === 'LEGENDARY') borderClass = 'border-yellow-900/50 hover:border-yellow-500';
            if (rarity === 'RARE') borderClass = 'border-purple-900/50 hover:border-purple-500';

            return (
              <div 
                key={asset.uid}
                onClick={() => setSelectedAsset(asset)}
                className={`bg-zinc-900/50 border ${borderClass} rounded-xl overflow-hidden cursor-pointer group transition-all hover:scale-[1.02] hover:shadow-xl relative`}
              >
                <div className="aspect-square bg-black/50 p-4">
                  <img src={thumb} alt={name} className="w-full h-full object-contain group-hover:scale-110 transition-transform duration-500"/>
                </div>
                <div className="p-3 border-t border-white/5">
                  <div className="text-sm font-bold text-white truncate">{name}</div>
                  <div className="text-[10px] text-zinc-500 mt-1 flex justify-between">
                    <span>{isOfficial ? 'OFFICIAL' : 'UGC'}</span>
                    <span className="opacity-0 group-hover:opacity-100 transition-opacity">点击管理</span>
                  </div>
                </div>
                {/* 官方标 */}
                {isOfficial && (
                  <div className="absolute top-2 right-2 bg-yellow-500 text-black text-[10px] font-black px-1.5 rounded">OFFICIAL</div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Modals */}
      {showGenModal && <AssetGenerationModal onClose={() => setShowGenModal(false)} onSuccess={fetchAssets} />}
      
      {selectedAsset && (
        <AssetDetailModal 
            asset={selectedAsset} 
            onClose={() => setSelectedAsset(null)} 
            onUpdateSuccess={fetchAssets} // 保存成功后刷新列表
        />
      )}

    </div>
  );
}