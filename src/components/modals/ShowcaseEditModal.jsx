import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { X, Save, CheckCircle2, Circle, AlertCircle } from 'lucide-react';

export default function ShowcaseEditModal({ userId, onClose, onSuccess }) {
  const [assets, setAssets] = useState([]);
  const [selectedUids, setSelectedUids] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // 加载用户所有资产
  useEffect(() => {
    const fetchAssets = async () => {
      try {
        const res = await axios.get(`/api/user/assets?userId=${userId}`);
        if (res.data.success) {
          setAssets(res.data.assets);
          // 初始化已勾选的
          const showcased = res.data.assets.filter(a => a.isShowcased).map(a => a.uid);
          setSelectedUids(showcased);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchAssets();
  }, [userId]);

  // 处理勾选
  const toggleAsset = (uid) => {
    if (selectedUids.includes(uid)) {
      setSelectedUids(prev => prev.filter(id => id !== uid));
    } else {
      if (selectedUids.length >= 5) {
        alert("最多只能展示 5 个资产！");
        return;
      }
      setSelectedUids(prev => [...prev, uid]);
    }
  };

  // 保存更改
  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await axios.post('/api/user/assets/showcase', {
        userId,
        assetUids: selectedUids
      });
      if (res.data.success) {
        onSuccess(); // 通知父组件刷新
        onClose();
      }
    } catch (e) {
      alert("保存失败");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in">
      <div className="bg-zinc-900 border border-zinc-700 w-full max-w-2xl rounded-2xl flex flex-col max-h-[85vh] shadow-2xl">
        
        <div className="p-5 border-b border-zinc-800 flex justify-between items-center bg-zinc-950">
          <div>
            <h3 className="text-xl font-bold text-white">管理资产展柜</h3>
            <p className="text-xs text-zinc-500 mt-1">请选择最多 5 个资产对外展示</p>
          </div>
          <div className="flex items-center gap-4">
            <span className={`text-sm font-bold ${selectedUids.length === 5 ? 'text-yellow-500' : 'text-zinc-400'}`}>
              已选: {selectedUids.length} / 5
            </span>
            <button onClick={onClose} className="p-2 hover:bg-zinc-800 rounded-full text-zinc-500 hover:text-white"><X size={20}/></button>
          </div>
        </div>

        <div className="p-4 overflow-y-auto custom-scrollbar grid grid-cols-2 md:grid-cols-3 gap-3">
          {loading ? <div className="col-span-full text-center py-10 text-zinc-500">加载中...</div> : 
           assets.length === 0 ? <div className="col-span-full text-center py-10 text-zinc-500">背包是空的，快去铸造吧！</div> :
           assets.map(asset => {
             const isSelected = selectedUids.includes(asset.uid);
             const isOfficial = asset.isOfficial;
             const name = isOfficial ? asset.template?.name : asset.customName;
             const thumb = isOfficial ? asset.template?.imagePath : asset.imagePath;

             return (
               <div 
                 key={asset.uid}
                 onClick={() => toggleAsset(asset.uid)}
                 className={`relative border rounded-xl p-3 flex flex-col items-center gap-2 cursor-pointer transition-all ${
                   isSelected 
                     ? 'bg-yellow-500/10 border-yellow-500 shadow-[0_0_15px_rgba(234,179,8,0.2)]' 
                     : 'bg-black border-zinc-800 hover:bg-zinc-800'
                 }`}
               >
                 <div className="w-full aspect-square bg-zinc-900 rounded-lg overflow-hidden relative">
                    <img src={thumb} className="w-full h-full object-contain" />
                    {/* 勾选标记 */}
                    <div className="absolute top-2 right-2">
                        {isSelected ? <CheckCircle2 className="text-yellow-500 fill-black" size={20}/> : <Circle className="text-zinc-600" size={20}/>}
                    </div>
                 </div>
                 <div className="text-xs font-bold text-white truncate w-full text-center">{name}</div>
                 <div className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded border border-white/10 text-zinc-500">
                    {isOfficial ? 'Official' : 'UGC'}
                 </div>
               </div>
             )
           })
          }
        </div>

        <div className="p-5 border-t border-zinc-800 bg-zinc-950 flex justify-end">
          <button 
            onClick={handleSave}
            disabled={saving}
            className="bg-white hover:bg-zinc-200 text-black font-bold px-6 py-2 rounded-lg flex items-center gap-2 transition-colors disabled:opacity-50"
          >
            <Save size={18}/> {saving ? '保存中...' : '保存设置'}
          </button>
        </div>

      </div>
    </div>
  );
}