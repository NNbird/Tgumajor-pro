import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { Edit, X, Tv, Map as MapIcon, Save, Trash2, CheckSquare, Square, Search, Trophy } from 'lucide-react';
import { useLeague } from '../../context/LeagueContext'; 

// 🗺️ CS2 地图池配置
const CS2_MAPS = [
    { id: 'Mirage', name: 'Mirage (荒漠迷城)' },
    { id: 'Inferno', name: 'Inferno (炼狱小镇)' },
    { id: 'Dust2', name: 'Dust II (炙热沙城)' },
    { id: 'Nuke', name: 'Nuke (核子危机)' },
    { id: 'Ancient', name: 'Ancient (远古遗迹)' },
    { id: 'Anubis', name: 'Anubis (阿努比斯)' },
    { id: 'Train', name: 'Train (列车停放站)' },
    { id: 'Overpass', name: 'Overpass (死亡游乐园)' },
    { id: 'Vertigo', name: 'Vertigo (殒命大厦)' },
    { id: 'Office', name: 'Office (办公室)' }
];

// --- 🌟 提取到外部的子组件 (修复无法输入的问题) ---
const TeamInput = ({ label, value, onChange, isConfirmed, onConfirmChange, allTeams }) => {
    const [showSuggestions, setShowSuggestions] = useState(false);
    const wrapperRef = useRef(null);

    // 模糊匹配逻辑：输入内容不为空，且在列表中包含
    const suggestions = value && allTeams.length > 0
      ? allTeams.filter(t => t.toLowerCase().includes(value.toLowerCase()) && t !== value)
      : [];

    // 精确匹配检测：用于显示勾选框
    const exactMatch = allTeams.includes(value);

    // 点击外部关闭下拉
    useEffect(() => {
      const handleClickOutside = (event) => {
        if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
          setShowSuggestions(false);
        }
      };
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const handleSelect = (teamName) => {
      onChange(teamName); 
      onConfirmChange(true); // 从库里选的，自动勾选
      setShowSuggestions(false);
    };

    return (
      <div className="relative space-y-1" ref={wrapperRef}>
        {/* Label 行：包含 标题 和 勾选框 */}
        <label className="text-xs text-zinc-500 uppercase font-bold flex justify-between items-center ml-1">
          {label}
          {exactMatch && (
            <div 
              onClick={() => onConfirmChange(!isConfirmed)}
              className={`cursor-pointer flex items-center gap-1 text-[10px] transition-colors ${isConfirmed ? 'text-green-500' : 'text-zinc-500'}`}
              title={isConfirmed ? "已关联战队库数据" : "作为自定义文本处理"}
            >
              {isConfirmed ? <CheckSquare size={14}/> : <Square size={14}/>}
              <span>{isConfirmed ? "已关联库" : "未关联"}</span>
            </div>
          )}
        </label>

        <div className="relative">
          <input
            type="text"
            value={value || ''} // 确保不为 undefined
            onChange={(e) => {
                const val = e.target.value;
                onChange(val);
                // 如果修改后名字对不上了，自动取消勾选
                if (!allTeams.includes(val)) {
                    onConfirmChange(false);
                }
            }}
            onFocus={() => setShowSuggestions(true)}
            className={`w-full bg-black border p-3 rounded-lg font-bold text-white outline-none transition-all ${
                isConfirmed 
                ? 'border-green-900 focus:border-green-500 shadow-[0_0_10px_rgba(34,197,94,0.1)]' 
                : 'border-zinc-700 focus:border-yellow-500'
            }`}
            placeholder="输入战队名..."
            autoComplete="off"
          />
          
          {/* 右侧图标指示器 */}
          <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-zinc-600">
             {isConfirmed ? <Trophy size={16} className="text-green-500 animate-in zoom-in"/> : <Search size={16}/>}
          </div>

          {/* 下拉建议框 */}
          {showSuggestions && suggestions.length > 0 && (
            <div className="absolute z-50 w-full bg-zinc-900 border border-zinc-700 mt-1 rounded-lg shadow-xl max-h-48 overflow-y-auto custom-scrollbar animate-in fade-in zoom-in-95 left-0">
                {suggestions.map(team => (
                    <div 
                        key={team}
                        onClick={() => handleSelect(team)}
                        className="px-4 py-2 text-sm text-zinc-300 hover:bg-zinc-800 hover:text-white cursor-pointer border-b border-zinc-800 last:border-0 flex justify-between items-center"
                    >
                        <span>{team}</span>
                        <span className="text-[10px] bg-zinc-950 text-zinc-500 px-1.5 rounded border border-zinc-800">战队库</span>
                    </div>
                ))}
            </div>
          )}
        </div>
      </div>
    );
};

export default function MatchEditModal({ match, onClose, onSave, onDelete }) {
  const { tournaments } = useLeague();
  const [allTeams, setAllTeams] = useState([]);

  // 1. 获取全局战队库
  useEffect(() => {
    const fetchTeams = async () => {
      try {
        const res = await axios.get('/api/teams/unique');
        if (res.data.success) {
          setAllTeams(res.data.teams);
        }
      } catch (e) {
        console.error("加载战队列表失败", e);
      }
    };
    fetchTeams();
  }, []);

  // 2. 初始化表单数据
  // 使用函数式初始化，确保只在首次渲染时计算，且处理好空值
  const [data, setData] = useState(() => {
    const defaultData = {
        teamA: '', teamB: '', scoreA: 0, scoreB: 0,
        status: 'Upcoming', bo: 3, currentMap: '', streamUrl: '',
        tournamentId: '', stageId: '', maps: []
    };
    
    // 合并传入的 match 数据
    const initialData = { ...defaultData, ...match };
    
    // 补充关联状态 (如果 match 已有名字且在库里，但没传 isRegistered 字段，尝试自动推断)
    // 注意：这里 allTeams 初始是空的，所以 effect 会在 allTeams 加载后再次检查
    return {
        ...initialData,
        isTeamARegistered: match.id ? (match.isTeamARegistered || false) : false,
        isTeamBRegistered: match.id ? (match.isTeamBRegistered || false) : false,
    };
  });

  // 当 allTeams 加载完成后，如果是编辑模式，尝试自动匹配勾选状态
  useEffect(() => {
    if (allTeams.length > 0 && match.id) {
        setData(prev => ({
            ...prev,
            isTeamARegistered: prev.isTeamARegistered || allTeams.includes(prev.teamA),
            isTeamBRegistered: prev.isTeamBRegistered || allTeams.includes(prev.teamB)
        }));
    }
  }, [allTeams, match.id]);

  // 当选择赛事变化时，重置阶段
  useEffect(() => {
    if (data.tournamentId) {
        const t = tournaments.find(t => t.id === data.tournamentId);
        if (t && !t.stages.find(s => s.id === data.stageId)) {
            setData(prev => ({ ...prev, stageId: '' }));
        }
    }
  }, [data.tournamentId, tournaments]);

  const currentStages = tournaments.find(t => t.id === data.tournamentId)?.stages || [];

  const updateMap = (idx, field, val) => {
    const newMaps = [...data.maps];
    newMaps[idx] = { ...newMaps[idx], [field]: val };
    setData({ ...data, maps: newMaps });
  };

  const addMap = () => setData({ ...data, maps: [...data.maps, { name: '', score: '', winner: 'Pending' }] });
  const removeMap = (idx) => setData({ ...data, maps: data.maps.filter((_, i) => i !== idx) });

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[60] flex items-center justify-center p-4 animate-in fade-in">
      <div className="bg-zinc-900 border border-zinc-700 w-full max-w-2xl rounded-2xl flex flex-col max-h-[90vh] shadow-2xl overflow-hidden">
        
        {/* 顶部标题栏 */}
        <div className="p-5 border-b border-zinc-800 flex justify-between items-center bg-zinc-950/50">
          <h3 className="text-lg md:text-xl font-black text-white flex items-center gap-2">
            <div className="bg-yellow-500/10 p-2 rounded-lg text-yellow-500"><Edit size={20}/></div>
            {match.id ? '编辑比赛 (Edit Match)' : '添加新比赛 (New Match)'}
          </h3>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-zinc-800 text-zinc-500 hover:text-white transition-colors"><X size={20}/></button>
        </div>

        <div className="p-6 overflow-y-auto custom-scrollbar space-y-6">
          
          {/* 1. 赛事归属选择 */}
          <div className="grid grid-cols-2 gap-4 bg-zinc-950/50 p-4 border border-zinc-800/60 rounded-xl">
              <div>
                <label className="text-xs text-zinc-500 uppercase font-bold block mb-1.5 ml-1">归属赛事 (Tournament)</label>
                <select value={data.tournamentId || ''} onChange={e => setData({...data, tournamentId: e.target.value})} className="w-full bg-black border border-zinc-700 text-white p-2.5 rounded-lg text-sm focus:border-yellow-500 outline-none transition-colors">
                  <option value="">-- 未分配 --</option>
                  {tournaments.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-zinc-500 uppercase font-bold block mb-1.5 ml-1">所属阶段 (Stage)</label>
                <select value={data.stageId || ''} onChange={e => setData({...data, stageId: e.target.value})} className="w-full bg-black border border-zinc-700 text-white p-2.5 rounded-lg text-sm focus:border-yellow-500 outline-none transition-colors" disabled={!data.tournamentId}>
                  <option value="">-- 默认/通用 --</option>
                  {currentStages.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
          </div>

          {/* 2. 核心比分与战队选择区域 (使用提取后的组件) */}
          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-3">
              <TeamInput 
                label="Team A"
                value={data.teamA}
                allTeams={allTeams}
                onChange={(val) => setData(prev => ({...prev, teamA: val}))}
                isConfirmed={data.isTeamARegistered}
                onConfirmChange={(val) => setData(prev => ({...prev, isTeamARegistered: val}))}
              />
              <input type="number" value={data.scoreA} onChange={e => setData({...data, scoreA: parseInt(e.target.value) || 0})} className="w-full bg-zinc-950 border border-zinc-800 text-white p-3 rounded-lg font-mono font-black text-2xl text-center focus:border-yellow-500 outline-none" />
            </div>
            
            <div className="space-y-3">
              <TeamInput 
                label="Team B"
                value={data.teamB}
                allTeams={allTeams}
                onChange={(val) => setData(prev => ({...prev, teamB: val}))}
                isConfirmed={data.isTeamBRegistered}
                onConfirmChange={(val) => setData(prev => ({...prev, isTeamBRegistered: val}))}
              />
              <input type="number" value={data.scoreB} onChange={e => setData({...data, scoreB: parseInt(e.target.value) || 0})} className="w-full bg-zinc-950 border border-zinc-800 text-white p-3 rounded-lg font-mono font-black text-2xl text-center focus:border-yellow-500 outline-none" />
            </div>
          </div>

          {/* 3. 状态与地图设置 */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="text-xs text-zinc-500 uppercase font-bold block mb-1.5 ml-1">Status</label>
                <select value={data.status} onChange={e => setData({...data, status: e.target.value})} className="w-full bg-zinc-900 border border-zinc-700 text-white p-2.5 rounded-lg text-sm focus:border-yellow-500 outline-none">
                  <option value="Upcoming">Upcoming (未开始)</option>
                  <option value="Live">Live (进行中)</option>
                  <option value="Finished">Finished (已结束)</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-zinc-500 uppercase font-bold block mb-1.5 ml-1">Format</label>
                <select value={data.bo} onChange={e => setData({...data, bo: parseInt(e.target.value)})} className="w-full bg-zinc-900 border border-zinc-700 text-white p-2.5 rounded-lg text-sm focus:border-yellow-500 outline-none">
                  <option value="1">Best of 1</option>
                  <option value="3">Best of 3</option>
                  <option value="5">Best of 5</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-yellow-600 uppercase font-bold block mb-1.5 ml-1 flex items-center gap-1">
                   <MapIcon size={12}/> Live Background Map
                </label>
                <select 
                  value={data.currentMap || ''} 
                  onChange={e => setData({...data, currentMap: e.target.value})} 
                  className="w-full bg-zinc-950 border border-yellow-500/30 text-yellow-500 p-2.5 rounded-lg text-sm font-bold focus:border-yellow-500 outline-none shadow-[0_0_10px_rgba(234,179,8,0.1)]"
                >
                   <option value="">-- Auto / Default --</option>
                   {CS2_MAPS.map(m => (
                     <option key={m.id} value={m.id}>{m.name}</option>
                   ))}
                </select>
              </div>
          </div>

          {/* 4. 直播流设置 */}
          {data.status === 'Live' && (
            <div className="bg-zinc-950 p-4 border border-purple-500/30 rounded-xl animate-in fade-in">
                <label className="text-xs text-purple-400 uppercase font-bold flex items-center mb-2 gap-2">
                    <Tv size={14}/> Stream URL (直播间链接)
                </label>
                <input value={data.streamUrl || ''} onChange={e => setData({...data, streamUrl: e.target.value})} className="w-full bg-black border border-zinc-700 text-white p-2.5 rounded-lg text-sm focus:border-purple-500 outline-none placeholder-zinc-700" placeholder="https://live.bilibili.com/..." />
            </div>
          )}

          {/* 5. 地图详情 (Maps Detail) */}
          <div className="pt-2">
            <div className="flex justify-between items-center mb-3">
              <span className="text-sm font-bold text-white flex items-center gap-2"><MapIcon size={14} className="text-zinc-500"/> Map Details (小分)</span>
              <button onClick={addMap} className="text-xs bg-zinc-800 border border-zinc-700 hover:bg-zinc-700 hover:text-white text-zinc-400 px-3 py-1.5 rounded-md transition-colors">+ Add Map</button>
            </div>
            <div className="space-y-2">
                {data.maps.map((m, i) => (
                  <div key={i} className="flex gap-2">
                    <input placeholder="Map Name" value={m.name} onChange={e => updateMap(i, 'name', e.target.value)} className="flex-1 bg-black border border-zinc-700 text-white p-2 text-sm rounded-md focus:border-zinc-500 outline-none"/>
                    <input placeholder="Score" value={m.score} onChange={e => updateMap(i, 'score', e.target.value)} className="w-24 bg-black border border-zinc-700 text-white p-2 text-sm rounded-md text-center focus:border-zinc-500 outline-none"/>
                    <input placeholder="Winner" value={m.winner} onChange={e => updateMap(i, 'winner', e.target.value)} className="w-32 bg-black border border-zinc-700 text-white p-2 text-sm rounded-md text-center focus:border-zinc-500 outline-none"/>
                    <button onClick={() => removeMap(i)} className="text-zinc-600 hover:text-red-500 transition-colors px-1"><Trash2 size={16}/></button>
                  </div>
                ))}
                {data.maps.length === 0 && <div className="text-center text-zinc-700 text-xs py-2 border border-dashed border-zinc-800 rounded">暂无小分数据</div>}
            </div>
          </div>

        </div>

        {/* 底部按钮栏 */}
        <div className="p-5 border-t border-zinc-800 flex justify-between items-center bg-zinc-950/50">
          <div>
              {match.id && onDelete && (
                  <button type="button" onClick={() => { if(confirm('确认删除此比赛记录？')) onDelete(match.id); }} className="text-red-600 hover:text-red-500 text-xs font-bold flex items-center gap-1 transition-colors">
                      <Trash2 size={14}/> 删除比赛
                  </button>
              )}
          </div>
          <div className="flex gap-3">
            <button onClick={onClose} className="px-5 py-2.5 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors text-sm font-bold">取消</button>
            <button onClick={() => onSave(data)} className="px-6 py-2.5 bg-yellow-500 hover:bg-yellow-400 text-black font-black uppercase tracking-wide rounded-xl shadow-lg hover:shadow-yellow-500/20 transition-all text-sm flex items-center gap-2">
                <Save size={16}/> 保存更改
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}