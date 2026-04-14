import React, { useState, useEffect } from 'react';
import Welcome from './components/Welcome';
import Quiz from './components/Quiz';
import Result from './components/Result';
import { Player, Question, QuestionOption, UserScores } from './types';
import { calculateResult } from './utils/calculateResult';

type AppState = 'welcome' | 'quiz' | 'result';

const STORAGE_KEY = 'cs2_tactical_quiz_progress';

export default function App() {
  const [appState, setAppState] = useState<AppState>('welcome');
  const [players, setPlayers] = useState<Player[]>([]);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [userScores, setUserScores] = useState<UserScores>({
    AGG: 50,
    TEA: 50,
    INS: 50,
    VOC: 50,
    SPE: 50,
  });
  const [closestPlayer, setClosestPlayer] = useState<Player | null>(null);
  const [userAnswers, setUserAnswers] = useState<Record<number, number>>({});
  const [isInitialized, setIsInitialized] = useState(false);

  // Load data and restore progress
  useEffect(() => {
    Promise.all([
      fetch('/players.json').then(res => res.json()),
      fetch('/questions.json').then(res => res.json())
    ]).then(([playersData, questionsData]) => {
      setPlayers(playersData);
      setQuestions(questionsData);

      // Restore from localStorage
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          setAppState(parsed.appState || 'welcome');
          setCurrentQuestionIndex(parsed.currentQuestionIndex || 0);
          setUserScores(parsed.userScores || { AGG: 50, TEA: 50, INS: 50, VOC: 50, SPE: 50 });
          setClosestPlayer(parsed.closestPlayer || null);
          setUserAnswers(parsed.userAnswers || {});
        } catch (e) {
          console.error("Failed to parse saved state:", e);
        }
      }
      setIsInitialized(true);
    }).catch(err => {
      console.error("Failed to load data:", err);
    });
  }, []);

  // Save progress whenever state changes
  useEffect(() => {
    if (isInitialized) {
      const stateToSave = {
        appState,
        currentQuestionIndex,
        userScores,
        closestPlayer,
        userAnswers
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(stateToSave));
    }
  }, [appState, currentQuestionIndex, userScores, closestPlayer, userAnswers, isInitialized]);

  const handleStart = () => {
    setAppState('quiz');
    setCurrentQuestionIndex(0);
    setUserScores({
      AGG: 50,
      TEA: 50,
      INS: 50,
      VOC: 50,
      SPE: 50,
    });
    setClosestPlayer(null);
    setUserAnswers({});
  };

  const calculateScoresFromAnswers = (answers: Record<number, number>) => {
    const scores: UserScores = { AGG: 50, TEA: 50, INS: 50, VOC: 50, SPE: 50 };
    Object.entries(answers).forEach(([qIdx, optIdx]) => {
      const question = questions[parseInt(qIdx)];
      if (question) {
        const option = question.options[optIdx];
        if (option) {
          for (const [key, value] of Object.entries(option.scores)) {
            if (key in scores) {
              scores[key as keyof UserScores] += value as number;
            }
          }
        }
      }
    });
    return scores;
  };

  const handleAnswer = (optionIndex: number) => {
    const newUserAnswers = { ...userAnswers, [currentQuestionIndex]: optionIndex };
    setUserAnswers(newUserAnswers);
    
    const newScores = calculateScoresFromAnswers(newUserAnswers);
    setUserScores(newScores);

    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
    } else {
      // Finish quiz
      const { closestPlayer } = calculateResult(newScores, players);
      setClosestPlayer(closestPlayer);
      setAppState('result');
    }
  };

  const handleBack = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(prev => prev - 1);
    }
  };

  const handleRestart = () => {
    localStorage.removeItem(STORAGE_KEY);
    setAppState('welcome');
    setCurrentQuestionIndex(0);
    setUserScores({
      AGG: 50,
      TEA: 50,
      INS: 50,
      VOC: 50,
      SPE: 50,
    });
    setClosestPlayer(null);
    setUserAnswers({});
  };

  const handleBackToQuiz = () => {
    setAppState('quiz');
    setCurrentQuestionIndex(questions.length - 1);
  };

  if (!isInitialized || players.length === 0 || questions.length === 0) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center text-amber-500">
        <div className="animate-pulse text-xl">加载数据中...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 font-sans selection:bg-amber-500/30">
      {appState === 'welcome' && <Welcome onStart={handleStart} />}
      {appState === 'quiz' && (
        <Quiz
          questions={questions}
          currentQuestionIndex={currentQuestionIndex}
          userAnswers={userAnswers}
          onAnswer={handleAnswer}
          onBack={handleBack}
        />
      )}
      {appState === 'result' && closestPlayer && (
        <Result
          userScores={userScores}
          closestPlayer={closestPlayer}
          onRestart={handleRestart}
          onBackToQuiz={handleBackToQuiz}
        />
      )}
    </div>
  );
}
