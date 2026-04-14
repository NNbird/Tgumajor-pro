import React, { useState, useEffect, useMemo } from 'react';
import { X, Trophy, Crosshair, ArrowLeft, ArrowRight, RotateCcw, Map, Target, HelpCircle, ChevronLeft, ChevronRight, AlertCircle, Sparkles, Loader2, Users, User, Shield } from 'lucide-react';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { useLeague } from '../../context/LeagueContext';
import { calculateResult, generateAnalysis } from '../../utils/personalityTest';

const STORAGE_KEY = 'cs2_tactical_quiz_progress';

const DIMENSION_DESC = {
  AGG: "战斗主动性：反映你在进攻端的侵略性，得分越高越倾向于首杀和Rush。",
  TEA: "资源分配：反映你对团队经济和道具的支持力度，得分越高越倾向于辅助角色。",
  INS: "认知处理：反映你对战场信息的即时反应和预判能力，得分越高越灵动。",
  VOC: "沟通机制：反映你在语音中的活跃度和情绪感染力。",
  SPE: "战术流动性：反映你对武器池和站位的适应性，得分越高越是六边形战士。"
};

export default function PersonalityTestModal({ onClose }) {
  const { user, updateUserProfile, tournaments, teams } = useLeague();
  const [appState, setAppState] = useState('welcome'); // welcome, quiz, result, entry
  const [players, setPlayers] = useState([]);
  const [questions, setQuestions] = useState([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [userScores, setUserScores] = useState({ AGG: 50, TEA: 50, INS: 50, VOC: 50, SPE: 50 });
  const [topMatches, setTopMatches] = useState([]); 
  const [aiAnalysis, setAiAnalysis] = useState(''); 
  const [userAnswers, setUserAnswers] = useState({});
  const [isInitialized, setIsInitialized] = useState(false);

  // 选手参赛通道相关状态
  const [entryInfo, setEntryInfo] = useState(null); // { tourId, teamId, playerName }
  const [myMembership, setMyMembership] = useState(null);
  const [entryForm, setEntryForm] = useState({ tourId: '', teamId: '', playerName: '' });
  const [entryError, setEntryError] = useState('');

  // Load data and restore progress
  useEffect(() => {
    Promise.all([
      fetch('/data/personality/players.json').then(res => res.json()),
      fetch('/data/personality/questions.json').then(res => res.json()),
      user ? fetch(`/api/user/my-team?userId=${user.id}`).then(res => res.json()) : Promise.resolve({ success: false })
    ]).then(([playersData, questionsData, teamData]) => {
      setPlayers(playersData);
      setQuestions(questionsData);
      if (teamData.success) setMyMembership(teamData.membership);

      // Restore from user profile or localStorage
      const savedState = user?.personalityTest || JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
      
      if (savedState) {
        const restoredIndex = savedState.currentQuestionIndex || 0;
        const restoredState = (savedState.appState === 'quiz' && restoredIndex >= questionsData.length) 
          ? 'welcome' 
          : (savedState.appState || 'welcome');
        
        setAppState(restoredState);
        setCurrentQuestionIndex(restoredIndex >= questionsData.length ? 0 : restoredIndex);
        setUserScores(savedState.userScores || { AGG: 50, TEA: 50, INS: 50, VOC: 50, SPE: 50 });
        setTopMatches(savedState.topMatches || []);
        setAiAnalysis(savedState.aiAnalysis || ''); 
        setUserAnswers(savedState.userAnswers || {});
        setEntryInfo(savedState.entryInfo || null);
      }
      setIsInitialized(true);
    }).catch(err => {
      console.error("Failed to load personality test data:", err);
    });
  }, [user]);

  // Save progress
  const saveProgress = (state) => {
    const stateToSave = {
      appState: state.appState ?? appState,
      currentQuestionIndex: state.currentQuestionIndex ?? currentQuestionIndex,
      userScores: state.userScores ?? userScores,
      topMatches: state.topMatches ?? topMatches,
      aiAnalysis: state.aiAnalysis ?? aiAnalysis, 
      userAnswers: state.userAnswers ?? userAnswers,
      entryInfo: state.entryInfo ?? entryInfo, 
      updatedAt: new Date().toISOString()
    };
    
    localStorage.setItem(STORAGE_KEY, JSON.stringify(stateToSave));
    
    if (user) {
      console.log("Syncing personality test to backend...", stateToSave);
      updateUserProfile({ 
        userId: user.id, 
        personalityTest: stateToSave 
      }).then(res => {
        if (!res.success) console.error("Backend sync failed:", res.message);
        else console.log("Backend sync successful");
      });
    }
  };

  const handleStart = (mode = 'normal') => {
    const newState = {
      appState: mode === 'entry' ? 'entry' : 'quiz',
      currentQuestionIndex: 0,
      userScores: { AGG: 50, TEA: 50, INS: 50, VOC: 50, SPE: 50 },
      topMatches: [],
      aiAnalysis: '', 
      userAnswers: {},
      entryInfo: mode === 'entry' ? null : null
    };
    setAppState(newState.appState);
    setCurrentQuestionIndex(newState.currentQuestionIndex);
    setUserScores(newState.userScores);
    setTopMatches(newState.topMatches);
    setAiAnalysis(newState.aiAnalysis);
    setUserAnswers(newState.userAnswers);
    setEntryInfo(null);
    saveProgress(newState);
  };

  const calculateScoresFromAnswers = (answers) => {
    const scores = { AGG: 50, TEA: 50, INS: 50, VOC: 50, SPE: 50 };
    Object.entries(answers).forEach(([qIdx, optIdx]) => {
      const question = questions[parseInt(qIdx)];
      if (question) {
        const option = question.options[optIdx];
        if (option) {
          for (const [key, value] of Object.entries(option.scores)) {
            if (key in scores) {
              scores[key] += value;
            }
          }
        }
      }
    });
    return scores;
  };

  const handleAnswer = (optionIndex) => {
    const newUserAnswers = { ...userAnswers, [currentQuestionIndex]: optionIndex };
    setUserAnswers(newUserAnswers);
    
    const newScores = calculateScoresFromAnswers(newUserAnswers);
    setUserScores(newScores);

    if (currentQuestionIndex < questions.length - 1) {
      const nextIdx = currentQuestionIndex + 1;
      setCurrentQuestionIndex(nextIdx);
      saveProgress({ userAnswers: newUserAnswers, userScores: newScores, currentQuestionIndex: nextIdx });
    } else {
      const { topMatches: matches } = calculateResult(newScores, players);
      setTopMatches(matches);
      setAppState('result');
      saveProgress({ userAnswers: newUserAnswers, userScores: newScores, topMatches: matches, appState: 'result' });
    }
  };

  const handleBack = () => {
    if (currentQuestionIndex > 0) {
      const prevIdx = currentQuestionIndex - 1;
      setCurrentQuestionIndex(prevIdx);
      saveProgress({ currentQuestionIndex: prevIdx });
    }
  };

  const handleRestart = () => {
    localStorage.removeItem(STORAGE_KEY);
    const newState = {
      appState: 'welcome',
      currentQuestionIndex: 0,
      userScores: { AGG: 50, TEA: 50, INS: 50, VOC: 50, SPE: 50 },
      topMatches: [],
      aiAnalysis: '', 
      userAnswers: {}
    };
    setAppState(newState.appState);
    setCurrentQuestionIndex(newState.currentQuestionIndex);
    setUserScores(newState.userScores);
    setTopMatches(newState.topMatches);
    setAiAnalysis(newState.aiAnalysis);
    setUserAnswers(newState.userAnswers);
    saveProgress(newState);
  };

  if (!isInitialized || players.length === 0 || questions.length === 0) {
    return (
      <div className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-sm flex items-center justify-center text-yellow-500">
        <div className="animate-pulse text-xl font-mono">LOADING CSTI DATA...</div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-6xl max-h-[90vh] bg-zinc-950 rounded-[2rem] border border-zinc-800 shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="bg-zinc-950/80 backdrop-blur-md border-b border-zinc-800 p-6 flex justify-between items-center flex-shrink-0">
          <div className="flex items-center gap-3">
            <Trophy className="text-yellow-500" size={24} />
            <span className="font-black tracking-tighter text-2xl italic text-white">CSTI <span className="text-zinc-500 font-medium text-sm not-italic ml-2 tracking-widest uppercase">Personality Test</span></span>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors group">
            <X size={28} className="text-zinc-400 group-hover:text-white" />
          </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto flex flex-col bg-zinc-950">
          {appState === 'welcome' && <WelcomeView onStart={handleStart} myMembership={myMembership} />}
          
          {appState === 'entry' && (
            <EntryView 
              tournaments={tournaments}
              teams={teams}
              myMembership={myMembership}
              onBack={() => setAppState('welcome')}
              onConfirm={(info) => {
                setEntryInfo(info);
                setAppState('quiz');
                saveProgress({ appState: 'quiz', entryInfo: info });
              }}
            />
          )}

          {appState === 'quiz' && questions.length > 0 && (
            <QuizView
              questions={questions}
              currentQuestionIndex={currentQuestionIndex}
              userAnswers={userAnswers}
              onAnswer={handleAnswer}
              onBack={handleBack}
            />
          )}
          
          {appState === 'result' && (
            topMatches.length > 0 ? (
              <ResultView
                userScores={userScores}
                topMatches={topMatches}
                aiAnalysis={aiAnalysis}
                entryInfo={entryInfo}
                tournaments={tournaments}
                teams={teams}
                onAiGenerated={(text) => {
                  setAiAnalysis(text);
                  saveProgress({ aiAnalysis: text });
                }}
                onRestart={handleRestart}
                onBackToQuiz={() => setAppState('quiz')}
              />
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center p-12 text-center">
                <div className="p-4 bg-red-500/10 rounded-full mb-4">
                  <AlertCircle className="text-red-500 w-8 h-8" />
                </div>
                <h3 className="text-white font-bold text-lg mb-2">状态异常</h3>
                <p className="text-zinc-500 mb-6">未能找回您的测试进度，请重新开始。</p>
                <button onClick={handleRestart} className="px-8 py-3 bg-yellow-500 text-black font-black rounded-xl">
                  开始新测试
                </button>
              </div>
            )
          )}

          {/* Fallback */}
          {!['welcome', 'quiz', 'result'].includes(appState) && (
            <WelcomeView onStart={handleStart} />
          )}
        </div>
      </div>
    </div>
  );
}

function WelcomeView({ onStart, myMembership }) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center p-8 md:p-12 text-center max-w-4xl mx-auto w-full">
      <div className="mb-8 p-6 bg-zinc-900 rounded-full border border-zinc-800 shadow-[0_0_30px_rgba(234,179,8,0.1)]">
        <Crosshair className="w-16 h-16 md:w-20 md:h-20 text-yellow-500" />
      </div>
      <h1 className="text-5xl md:text-6xl font-black mb-6 tracking-tighter italic text-white">
        CSTI <span className="text-yellow-500">人格测试</span>
      </h1>
      <p className="text-xl text-zinc-400 mb-10 leading-relaxed font-medium">
        基于心理测量学的职业选手游戏人格匹配框架。<br />
        精确捕捉你在虚拟战斗中的隐性行为动机，并与历史上最伟大的CS职业选手进行算法匹配。
      </p>
      
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-12 w-full text-xs uppercase tracking-widest font-bold">
        {[
          { key: 'AGG', label: '战斗主动性' },
          { key: 'TEA', label: '资源分配' },
          { key: 'INS', label: '认知处理' },
          { key: 'VOC', label: '沟通机制' },
          { key: 'SPE', label: '战术流动性' }
        ].map(dim => (
          <div key={dim.key} className="p-4 bg-zinc-900 border border-zinc-800 rounded-xl hover:border-yellow-500/50 transition-colors">
            <div className="text-yellow-500 text-lg mb-1">{dim.key}</div>
            <div className="text-zinc-500">{dim.label}</div>
          </div>
        ))}
      </div>

      <div className="flex flex-col md:flex-row gap-4 w-full max-w-xl">
        <button
          onClick={() => onStart('normal')}
          className="flex-1 px-8 py-5 bg-zinc-800 hover:bg-zinc-700 text-white font-black rounded-2xl text-xl transition-all active:scale-95 border border-zinc-700"
        >
          开始神经匹配
        </button>
        
        <button
          onClick={() => onStart('entry')}
          disabled={!myMembership || myMembership.status !== 'APPROVED'}
          className={`flex-1 px-8 py-5 font-black rounded-2xl text-xl transition-all active:scale-95 shadow-[0_10px_40px_rgba(234,179,8,0.3)] flex items-center justify-center gap-2 ${
            !myMembership || myMembership.status !== 'APPROVED'
            ? 'bg-zinc-900 text-zinc-600 cursor-not-allowed border border-zinc-800 shadow-none'
            : 'bg-yellow-500 text-black hover:scale-105'
          }`}
          title={!myMembership ? "请先在个人主页加入战队" : myMembership.status !== 'APPROVED' ? "战队申请尚未通过" : ""}
        >
          选手参赛通道
          <ArrowRight size={24} />
        </button>
      </div>
      
      {!myMembership && (
        <p className="mt-6 text-zinc-600 text-sm flex items-center gap-1">
          <AlertCircle size={14} />
          仅限已绑定战队的认证选手进入参赛通道
        </p>
      )}
    </div>
  );
}

function EntryView({ tournaments, teams, myMembership, onBack, onConfirm }) {
  const [form, setForm] = useState({ tourId: '', teamId: '', playerName: '' });
  const [error, setError] = useState('');

  // 1. 过滤可报名赛事
  const openTournaments = tournaments.filter(t => t.registrationStatus === 'OPEN');
  
  // 2. 当选择了赛事后，自动匹配用户的战队
  useEffect(() => {
    if (form.tourId && myMembership) {
      const matchedTeam = teams.find(t => 
        t.tournamentId === form.tourId && 
        t.name === myMembership.teamName && 
        t.status === 'approved'
      );
      
      if (matchedTeam) {
        setForm(prev => ({ ...prev, teamId: matchedTeam.id }));
        setError('');
      } else {
        setError('您的战队尚未报名或未通过本赛事的审核');
        setForm(prev => ({ ...prev, teamId: '', playerName: '' }));
      }
    }
  }, [form.tourId, teams, myMembership]);

  const selectedTeam = teams.find(t => t.id === form.teamId);
  const playersInTeam = selectedTeam?.members.filter(m => m.id) || [];

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-8 md:p-12 max-w-2xl mx-auto w-full">
      <div className="w-full bg-zinc-900 border border-zinc-800 rounded-[2rem] p-8 shadow-2xl animate-in zoom-in-95 duration-500">
        <h2 className="text-3xl font-black text-white mb-2 flex items-center gap-3 italic">
          <Users className="text-yellow-500" />
          PLAYER ENTRY
        </h2>
        <p className="text-zinc-500 text-sm mb-8 uppercase tracking-widest font-bold">选手参赛认证通道</p>

        <div className="space-y-6">
          {/* 赛事选择 */}
          <div className="space-y-2">
            <label className="text-xs font-black text-zinc-500 uppercase tracking-widest">选择正在报名的赛事</label>
            <select 
              value={form.tourId}
              onChange={e => setForm({ ...form, tourId: e.target.value, teamId: '', playerName: '' })}
              className="w-full bg-black border border-zinc-800 text-white p-4 rounded-xl outline-none focus:border-yellow-500 transition-colors"
            >
              <option value="">-- 请选择赛事 --</option>
              {openTournaments.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </div>

          {/* 战队自动匹配展示 */}
          <div className="space-y-2">
            <label className="text-xs font-black text-zinc-500 uppercase tracking-widest">对应参赛战队</label>
            <div className={`w-full bg-black/50 border p-4 rounded-xl font-bold ${form.teamId ? 'border-green-500/50 text-green-400' : 'border-zinc-800 text-zinc-700'}`}>
              {selectedTeam ? `${selectedTeam.name} (${selectedTeam.tag})` : '请先选择赛事'}
            </div>
          </div>

          {/* 成员选择 */}
          <div className="space-y-2">
            <label className="text-xs font-black text-zinc-500 uppercase tracking-widest">确认您的选手身份</label>
            <select 
              disabled={!form.teamId}
              value={form.playerName}
              onChange={e => setForm({ ...form, playerName: e.target.value })}
              className="w-full bg-black border border-zinc-800 text-white p-4 rounded-xl outline-none focus:border-yellow-500 transition-colors disabled:opacity-20"
            >
              <option value="">-- 请选择您的选手ID --</option>
              {playersInTeam.map(p => <option key={p.id} value={p.id}>{p.id}</option>)}
            </select>
          </div>

          {error && (
            <div className="p-4 bg-red-500/10 border border-red-500/50 rounded-xl text-red-500 text-sm flex items-center gap-2 animate-in shake duration-300">
              <AlertCircle size={16} />
              {error}
            </div>
          )}
        </div>

        <div className="flex gap-4 mt-10">
          <button 
            onClick={onBack}
            className="flex-1 py-4 bg-zinc-800 hover:bg-zinc-700 text-white font-black rounded-xl transition-all"
          >
            返回
          </button>
          <button 
            disabled={!form.playerName || !!error}
            onClick={() => onConfirm(form)}
            className="flex-[2] py-4 bg-yellow-500 disabled:bg-zinc-800 disabled:text-zinc-600 text-black font-black rounded-xl hover:scale-[1.02] active:scale-95 transition-all shadow-lg shadow-yellow-500/20"
          >
            确认身份并开始
          </button>
        </div>
      </div>
    </div>
  );
}

function QuizView({ questions, currentQuestionIndex, userAnswers, onAnswer, onBack }) {
  const question = questions[currentQuestionIndex];
  if (!question) return null;

  const progress = ((currentQuestionIndex) / questions.length) * 100;
  const selectedOptionIndex = userAnswers[currentQuestionIndex];

  return (
    <div className="max-w-3xl w-full mx-auto p-6 md:p-10 flex-1 flex flex-col justify-center">
      {/* Progress */}
      <div className="mb-12">
        <div className="flex justify-between items-end mb-3">
          <div>
            <span className="text-xs font-black text-zinc-500 uppercase tracking-widest">Question</span>
            <div className="text-3xl font-mono text-white leading-none">
              {String(currentQuestionIndex + 1).padStart(2, '0')}
              <span className="text-zinc-700 text-xl ml-1">/ {questions.length}</span>
            </div>
          </div>
          <div className="text-right">
            <span className="text-xs font-black text-zinc-500 uppercase tracking-widest">Neural Link</span>
            <div className="text-xl font-mono text-yellow-500 leading-none">{Math.round(progress)}%</div>
          </div>
        </div>
        <div className="h-2 bg-zinc-900 rounded-full overflow-hidden border border-zinc-800">
          <div 
            className="h-full bg-yellow-500 shadow-[0_0_15px_rgba(234,179,8,0.5)] transition-all duration-500 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Question */}
      <div className="mb-12 animate-in slide-in-from-bottom-4 duration-500">
        <h2 className="text-2xl md:text-4xl font-black mb-10 leading-tight tracking-tight text-white">
          {question.text}
        </h2>
        
        <div className="grid gap-4">
          {question.options.map((option, index) => {
            const isSelected = selectedOptionIndex === index;
            return (
              <button
                key={index}
                onClick={() => onAnswer(index)}
                className={`w-full text-left p-6 rounded-2xl border-2 transition-all duration-200 flex items-center gap-6 group ${
                  isSelected 
                    ? 'bg-yellow-500/10 border-yellow-500 shadow-[0_0_20px_rgba(234,179,8,0.1)]' 
                    : 'bg-zinc-900 border-zinc-800 hover:border-zinc-600 hover:bg-zinc-800/50'
                }`}
              >
                <div className={`w-12 h-12 flex-shrink-0 rounded-xl flex items-center justify-center font-black text-xl transition-colors ${
                  isSelected ? 'bg-yellow-500 text-black' : 'bg-zinc-800 text-zinc-500 group-hover:text-zinc-300'
                }`}>
                  {String.fromCharCode(65 + index)}
                </div>
                <div className={`text-lg md:text-xl font-medium leading-snug ${isSelected ? 'text-white' : 'text-zinc-400 group-hover:text-zinc-200'}`}>
                  {option.text}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Footer */}
      <div className="flex justify-between items-center pt-8 border-t border-zinc-800/50">
        <button
          onClick={onBack}
          disabled={currentQuestionIndex === 0}
          className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold transition-all ${
            currentQuestionIndex === 0 ? 'text-zinc-800 cursor-not-allowed' : 'text-zinc-500 hover:text-white hover:bg-zinc-900'
          }`}
        >
          <ArrowLeft size={20} />
          PREV
        </button>
        {selectedOptionIndex !== undefined && (
           <button
           onClick={() => onAnswer(selectedOptionIndex)}
           className="flex items-center gap-2 px-8 py-4 bg-yellow-500 text-black font-black rounded-xl hover:scale-105 active:scale-95 transition-all shadow-lg shadow-yellow-500/20"
         >
           {currentQuestionIndex < questions.length - 1 ? 'NEXT' : 'ANALYZE'}
           <ArrowRight size={20} />
         </button>
        )}
      </div>
    </div>
  );
}

function ResultView({ userScores, topMatches, aiAnalysis, onAiGenerated, onRestart, onBackToQuiz, entryInfo, tournaments, teams }) {
  const [matchIdx, setMatchIdx] = useState(0);
  const [isGenerating, setIsGenerating] = useState(false);
  const currentPlayer = topMatches[matchIdx];
  const bestMatch = topMatches[0];

  // 解析参赛信息展示文本
  const entryText = useMemo(() => {
    if (!entryInfo) return null;
    const tour = tournaments.find(t => t.id === entryInfo.tourId);
    const team = teams.find(t => t.id === entryInfo.teamId);
    return {
      tour: tour?.name || '未知赛事',
      team: team?.name || '未知战队',
      player: entryInfo.playerName
    };
  }, [entryInfo, tournaments, teams]);

  const API_KEY = '###################################';
  const MODEL_NAME = 'gemini-3-flash-preview'; // 降级到更稳定的 flash 模型，确保生成成功率

  const fetchAIAnalysis = async () => {
    if (aiAnalysis) return; // 如果已经有持久化的评价，直接跳过生成
    
    setIsGenerating(true);
    try {
      const prompt = `你是一个CS2资深战术专家。请针对该玩家的数据和最匹配选手 ${bestMatch.name} 给出一段极简、犀利的专业点评。
数据得分：AGG(主动性):${userScores.AGG}, TEA(团队合作):${userScores.TEA}, INS(反应预判):${userScores.INS}, VOC(沟通活跃):${userScores.VOC}, SPE(全能性):${userScores.SPE}。
要求：
1. 仅输出一句话。
2. 极其专业或具有冷幽默感。
3. 严禁模版化。
4. 字数严格控制在 30 个汉字以内。`;

      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${MODEL_NAME}:generateContent?key=${API_KEY}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { 
            maxOutputTokens: 100, 
            temperature: 0.85,
            topP: 0.95
          },
          safetySettings: [
            { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" },
            { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_NONE" },
            { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_NONE" },
            { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" }
          ]
        })
      });

      if (!response.ok) throw new Error(`API Error: ${response.status}`);

      const data = await response.json();
      
      // 聚合所有可能的文本片段
      const candidate = data.candidates?.[0];
      const text = candidate?.content?.parts?.map(p => p.text).join('') || '';
      
      if (text && text.length > 5) {
        onAiGenerated(text.trim());
      } else if (candidate?.finishReason === 'SAFETY') {
        onAiGenerated("由于检测到敏感战术词汇，专家评论已被封锁。但从数据看，你绝对是场上的统治者。");
      } else {
        throw new Error("AI response too short or empty");
      }
    } catch (error) {
      console.error("AI Generation failed:", error);
      onAiGenerated(generateAnalysis(userScores, bestMatch));
    } finally {
      setIsGenerating(false);
    }
  };

  useEffect(() => {
    fetchAIAnalysis();
  }, []);

  const radarData = [
    { subject: 'AGG', A: userScores.AGG, B: currentPlayer.AGG, fullMark: 100 },
    { subject: 'TEA', A: userScores.TEA, B: currentPlayer.TEA, fullMark: 100 },
    { subject: 'INS', A: userScores.INS, B: currentPlayer.INS, fullMark: 100 },
    { subject: 'VOC', A: userScores.VOC, B: currentPlayer.VOC, fullMark: 100 },
    { subject: 'SPE', A: userScores.SPE, B: currentPlayer.SPE, fullMark: 100 },
  ];

  const analysis = generateAnalysis(userScores, currentPlayer);

  const nextMatch = () => setMatchIdx(prev => (prev + 1) % topMatches.length);
  const prevMatch = () => setMatchIdx(prev => (prev - 1 + topMatches.length) % topMatches.length);

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-zinc-900 border border-zinc-700 p-4 rounded-xl shadow-2xl backdrop-blur-md max-w-[250px]">
          <p className="text-yellow-500 font-bold mb-2">{data.subject}</p>
          <div className="space-y-1 mb-3">
            <div className="flex justify-between text-xs">
              <span className="text-zinc-400">您的得分:</span>
              <span className="text-white font-mono">{data.A}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-zinc-400">{currentPlayer.name}:</span>
              <span className="text-blue-400 font-mono">{data.B}</span>
            </div>
          </div>
          <p className="text-[10px] text-zinc-500 leading-tight border-t border-zinc-800 pt-2">
            {DIMENSION_DESC[data.subject]}
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="max-w-6xl mx-auto p-4 md:p-8 animate-in fade-in zoom-in-95 duration-700">
      <div className="text-center mb-12">
        <h2 className="text-zinc-500 font-black tracking-[0.2em] text-sm mb-2 uppercase">Neural Matching Complete</h2>
        <h1 className="text-4xl md:text-6xl font-black italic tracking-tighter text-white mb-4">测试结果报告</h1>
        
        {/* 参赛通道信息展示 */}
        {entryText && (
          <div className="inline-flex items-center gap-4 px-6 py-2 bg-yellow-500/10 border border-yellow-500/30 rounded-full text-yellow-500 text-xs font-bold">
            <div className="flex items-center gap-1 border-r border-yellow-500/20 pr-3 mr-1">
              <Trophy size={14} />
              {entryText.tour}
            </div>
            <div className="flex items-center gap-1 border-r border-yellow-500/20 pr-3 mr-1">
              <Shield size={14} />
              {entryText.team}
            </div>
            <div className="flex items-center gap-1">
              <User size={14} />
              认证选手: {entryText.player}
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Player Card Carousel */}
        <div className="lg:col-span-5 bg-zinc-900 rounded-[2.5rem] border border-zinc-800 overflow-hidden shadow-2xl relative group">
          <div className="aspect-[4/5] relative bg-[#121214] overflow-hidden">
            {/* Background Texture for Dark Mode */}
            <div className="absolute inset-0 opacity-[0.05]" style={{ backgroundImage: 'radial-gradient(#fff 0.5px, transparent 0.5px)', backgroundSize: '20px 20px' }} />
            
            <img
              key={currentPlayer.name}
              src={`/players/${currentPlayer.name}.webp`}
              alt={currentPlayer.name}
              className="w-full h-full object-cover object-top relative z-10 animate-in fade-in duration-700"
              onError={(e) => {
                e.target.src = 'https://www.hltv.org/img/static/player/player_silhouette.png';
              }}
            />
            {/* Subtle overlay to make white text readable at bottom */}
            <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-transparent to-transparent z-20" />
            
            {/* Carousel Controls */}
            <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 flex justify-between px-4 z-30 opacity-0 group-hover:opacity-100 transition-opacity">
              <button onClick={prevMatch} className="p-3 bg-black/40 backdrop-blur-md rounded-full text-white hover:bg-yellow-500 hover:text-black transition-all shadow-xl">
                <ChevronLeft size={24} />
              </button>
              <button onClick={nextMatch} className="p-3 bg-black/40 backdrop-blur-md rounded-full text-white hover:bg-yellow-500 hover:text-black transition-all shadow-xl">
                <ChevronRight size={24} />
              </button>
            </div>

            <div className="absolute bottom-0 left-0 p-8 w-full z-30">
              <div className="inline-flex items-center px-3 py-1 bg-yellow-500 text-black text-xs font-black rounded-full mb-4 tracking-widest uppercase shadow-lg">
                {matchIdx === 0 ? 'Best Match' : `Top ${matchIdx + 1} Match`}
              </div>
              <h2 className="text-6xl md:text-7xl font-black italic tracking-tighter text-white mb-2 leading-none drop-shadow-2xl">
                {currentPlayer.name}
              </h2>
            </div>
          </div>
          
          {/* AI Analysis Box */}
          <div className="p-8 bg-zinc-900 border-t border-zinc-800 min-h-[220px] relative overflow-hidden flex flex-col justify-center">
            {isGenerating ? (
              <div className="flex flex-col items-center justify-center h-full gap-4 text-zinc-500 animate-in fade-in duration-300">
                <Loader2 className="animate-spin text-yellow-500" size={32} />
                <div className="flex flex-col items-center">
                  <span className="text-[10px] font-black tracking-[0.2em] uppercase text-zinc-600 mb-1">Neural Analysis</span>
                  <span className="text-sm font-bold text-zinc-400">专家正在针对 Best Match 进行独到分析...</span>
                </div>
              </div>
            ) : (
              <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
                <div className="flex items-center gap-2 mb-4">
                  <div className="p-1 bg-yellow-500/10 rounded">
                    <Sparkles className="text-yellow-500" size={14} />
                  </div>
                  <span className="text-[10px] font-black uppercase tracking-[0.15em] text-zinc-500">
                    Best Match Insight ({bestMatch.name})
                  </span>
                </div>
                <p className="text-zinc-200 text-lg md:text-xl leading-relaxed font-medium italic">
                  "{aiAnalysis}"
                </p>
              </div>
            )}
            
            {/* Decorative background for AI box */}
            <div className="absolute top-0 right-0 -mr-16 -mt-16 w-32 h-32 bg-yellow-500/5 rounded-full blur-3xl" />
          </div>
        </div>

        {/* Analytics */}
        <div className="lg:col-span-7 flex flex-col gap-8">
          <div className="bg-zinc-900 rounded-[2.5rem] border border-zinc-800 p-8 shadow-xl">
            <h3 className="text-xl font-black text-white mb-8 flex items-center gap-2">
              <div className="w-1.5 h-6 bg-yellow-500 rounded-full" />
              多维战术心理画像 - {currentPlayer.name}
            </h3>
            <div className="w-full h-[400px]">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart cx="50%" cy="50%" outerRadius="80%" data={radarData}>
                  <PolarGrid stroke="#27272a" />
                  <PolarAngleAxis dataKey="subject" tick={{ fill: '#71717a', fontWeight: 'bold', fontSize: 14 }} />
                  <PolarRadiusAxis angle={30} domain={[0, 100]} axisLine={false} tick={false} />
                  <Radar
                    name="您的特征"
                    dataKey="A"
                    stroke="#eab308"
                    fill="#eab308"
                    fillOpacity={0.6}
                    animationDuration={1000}
                  />
                  <Radar
                    name={currentPlayer.name}
                    dataKey="B"
                    stroke="#3b82f6"
                    fill="#3b82f6"
                    fillOpacity={0.4}
                    animationDuration={1000}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="flex flex-wrap gap-4">
            <button
              onClick={onRestart}
              className="flex-1 flex items-center justify-center gap-2 px-8 py-5 bg-zinc-800 hover:bg-zinc-700 text-white font-black rounded-2xl transition-all active:scale-95"
            >
              <RotateCcw size={20} />
              重新测试
            </button>
            <button
              onClick={onBackToQuiz}
              className="flex-1 px-8 py-5 bg-yellow-500 text-black font-black rounded-2xl shadow-lg shadow-yellow-500/20 hover:scale-[1.02] active:scale-95 transition-all"
            >
              返回修改
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
