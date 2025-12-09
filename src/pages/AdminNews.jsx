import React, { useState, useEffect } from 'react';
import { useLeague } from '../context/LeagueContext';
import { ArrowLeft, Plus, Edit, Trash2, Pin, PinOff, ExternalLink, Calendar, Link as LinkIcon, Save, X, Image as ImageIcon, Upload } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function AdminNews() {
  const { newsList, saveNews, deleteNews, togglePinNews, user } = useLeague();
  
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    id: null, title: '', description: '', cover: '', date: '', link: '', isPinned: false
  });
  
  // [新增] 文件对象和预览图 URL
  const [coverFile, setCoverFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState('');

  // 权限检查
  if (user?.role !== 'admin') return <div className="p-10 text-center text-white">Access Denied</div>;

  const handleEdit = (news) => {
    if (news) {
        setFormData(news);
        setPreviewUrl(news.cover); // 如果是编辑，显示已有封面
    } else {
        setFormData({ id: null, title: '', description: '', cover: '', date: new Date().toISOString().split('T')[0], link: '', isPinned: false });
        setPreviewUrl('');
    }
    setCoverFile(null); // 重置文件
    setIsEditing(true);
  };

  // [新增] 处理文件选择
  const handleFileChange = (e) => {
      const file = e.target.files[0];
      if (file) {
          setCoverFile(file);
          // 生成本地预览地址
          setPreviewUrl(URL.createObjectURL(file));
      }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // 使用 FormData 构建数据
    const data = new FormData();
    if (formData.id) data.append('id', formData.id);
    data.append('title', formData.title);
    data.append('description', formData.description);
    data.append('date', formData.date);
    data.append('link', formData.link);
    data.append('isPinned', formData.isPinned); // 注意布尔值转字符

    // 如果选择了新文件，传文件；否则传旧的 cover 路径
    if (coverFile) {
        data.append('coverImage', coverFile);
    } else {
        data.append('cover', formData.cover);
    }

    await saveNews(data);
    setIsEditing(false);
  };

  return (
    <div className="min-h-screen bg-black text-white p-6 animate-in fade-in pb-20">
      <div className="max-w-6xl mx-auto">
        {/* 顶部导航 */}
        <div className="flex items-center justify-between mb-8 border-b border-zinc-800 pb-6">
            <div className="flex items-center gap-4">
                <Link to="/admin" className="p-2 bg-zinc-900 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors">
                    <ArrowLeft size={20}/>
                </Link>
                <div>
                    <h1 className="text-2xl font-black uppercase italic">News Management</h1>
                    <p className="text-zinc-500 text-sm">发布和管理站点新闻资讯</p>
                </div>
            </div>
            <button 
                onClick={() => handleEdit(null)}
                className="bg-yellow-500 hover:bg-yellow-400 text-black font-bold px-4 py-2 rounded flex items-center gap-2 shadow-lg shadow-yellow-500/20"
            >
                <Plus size={18}/> 发布新闻
            </button>
        </div>

        {/* 新闻列表 */}
        <div className="space-y-4">
            {newsList.map(item => (
                <div key={item.id} className={`bg-zinc-900 border p-4 rounded-xl flex gap-6 items-center transition-all ${item.isPinned ? 'border-yellow-500/50 bg-yellow-900/10' : 'border-zinc-800'}`}>
                    {/* 封面预览 */}
                    <div className="w-32 h-20 flex-shrink-0 bg-black rounded-lg overflow-hidden border border-zinc-700 relative group">
                        {item.cover ? (
                            <img src={item.cover} alt="" className="w-full h-full object-cover"/>
                        ) : (
                            <div className="w-full h-full flex items-center justify-center text-zinc-700"><ImageIcon size={20}/></div>
                        )}
                    </div>
                    
                    {/* 信息 */}
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                            {item.isPinned && <span className="bg-yellow-500 text-black text-[10px] font-bold px-1.5 rounded flex items-center gap-1"><Pin size={10}/> PINNED</span>}
                            <span className="text-zinc-500 text-xs font-mono">{item.date}</span>
                        </div>
                        <h3 className="font-bold text-lg truncate text-white">{item.title}</h3>
                        <p className="text-zinc-400 text-sm truncate">{item.description}</p>
                    </div>

                    {/* 操作按钮 */}
                    <div className="flex items-center gap-2">
                        <button 
                            onClick={() => togglePinNews(item.id, item.isPinned)}
                            className={`p-2 rounded border ${item.isPinned ? 'bg-yellow-500 text-black border-yellow-500' : 'bg-zinc-800 text-zinc-400 border-zinc-700 hover:text-white'}`}
                            title={item.isPinned ? "取消置顶" : "置顶新闻"}
                        >
                            {item.isPinned ? <PinOff size={18}/> : <Pin size={18}/>}
                        </button>
                        <button 
                            onClick={() => handleEdit(item)}
                            className="p-2 bg-blue-600/20 text-blue-400 border border-blue-600/50 rounded hover:bg-blue-600 hover:text-white transition-colors"
                        >
                            <Edit size={18}/>
                        </button>
                        <button 
                            onClick={() => { if(confirm('确定删除?')) deleteNews(item.id) }}
                            className="p-2 bg-red-600/20 text-red-500 border border-red-600/50 rounded hover:bg-red-600 hover:text-white transition-colors"
                        >
                            <Trash2 size={18}/>
                        </button>
                    </div>
                </div>
            ))}
            
            {newsList.length === 0 && <div className="text-center py-10 text-zinc-500">暂无新闻数据</div>}
        </div>
      </div>

      {/* 编辑弹窗 */}
      {isEditing && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in">
            <div className="bg-zinc-900 border border-zinc-700 w-full max-w-lg rounded-2xl shadow-2xl flex flex-col max-h-[90vh]">
                <div className="p-6 border-b border-zinc-800 flex justify-between items-center">
                    <h3 className="text-xl font-bold text-white">
                        {formData.id ? '编辑新闻' : '发布新资讯'}
                    </h3>
                    <button onClick={() => setIsEditing(false)} className="text-zinc-500 hover:text-white"><X size={24}/></button>
                </div>
                
                <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4">
                    <div>
                        <label className="block text-xs text-zinc-500 uppercase font-bold mb-1">标题</label>
                        <input required value={formData.title} onChange={e=>setFormData({...formData, title: e.target.value})} className="w-full bg-black border border-zinc-700 text-white p-3 rounded focus:border-yellow-500 outline-none"/>
                    </div>
                    
                    <div>
                        <label className="block text-xs text-zinc-500 uppercase font-bold mb-1">简短描述</label>
                        <textarea required rows={3} value={formData.description} onChange={e=>setFormData({...formData, description: e.target.value})} className="w-full bg-black border border-zinc-700 text-white p-3 rounded focus:border-yellow-500 outline-none"/>
                    </div>
                    
                    {/* 封面图上传区域 */}
                    <div>
                        <label className="block text-xs text-zinc-500 uppercase font-bold mb-2 flex items-center gap-1">
                            <ImageIcon size={12}/> 封面图片
                        </label>
                        <div className="border-2 border-dashed border-zinc-700 rounded-lg p-4 text-center hover:border-yellow-500 transition-colors bg-black/20 relative group">
                            <input 
                                type="file" 
                                accept="image/*"
                                onChange={handleFileChange}
                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                            />
                            {previewUrl ? (
                                <div className="relative h-40 w-full">
                                    <img src={previewUrl} alt="Preview" className="w-full h-full object-cover rounded"/>
                                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-xs font-bold uppercase">
                                        点击更换图片
                                    </div>
                                </div>
                            ) : (
                                <div className="py-8 text-zinc-500 flex flex-col items-center">
                                    <Upload size={24} className="mb-2"/>
                                    <span>点击上传或拖拽图片</span>
                                    <span className="text-[10px] mt-1">支持 JPG, PNG, WEBP</span>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs text-zinc-500 uppercase font-bold mb-1 flex items-center gap-1"><Calendar size={12}/> 发布日期</label>
                            <input required type="date" value={formData.date} onChange={e=>setFormData({...formData, date: e.target.value})} className="w-full bg-black border border-zinc-700 text-white p-3 rounded focus:border-yellow-500 outline-none"/>
                        </div>
                        <div>
                            <label className="block text-xs text-zinc-500 uppercase font-bold mb-1 flex items-center gap-1"><LinkIcon size={12}/> 跳转链接 (站外)</label>
                            <input required value={formData.link} onChange={e=>setFormData({...formData, link: e.target.value})} className="w-full bg-black border border-zinc-700 text-white p-3 rounded focus:border-yellow-500 outline-none" placeholder="https://..."/>
                        </div>
                    </div>
                    
                    <button className="w-full bg-yellow-500 hover:bg-yellow-400 text-black font-bold py-3 rounded mt-4 flex items-center justify-center gap-2 shadow-lg shadow-yellow-500/20">
                        <Save size={18}/> 保存发布
                    </button>
                </form>
            </div>
        </div>
      )}
    </div>
  );
}