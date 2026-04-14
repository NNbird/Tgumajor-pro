import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { Question } from '../types';

interface QuizProps {
  questions: Question[];
  currentQuestionIndex: number;
  userAnswers: Record<number, number>;
  onAnswer: (optionIndex: number) => void;
  onBack: () => void;
}

export default function Quiz({ questions, currentQuestionIndex, userAnswers, onAnswer, onBack }: QuizProps) {
  const question = questions[currentQuestionIndex];
  const progress = ((currentQuestionIndex) / questions.length) * 100;
  const selectedOptionIndex = userAnswers[currentQuestionIndex];

  return (
    <div className="flex flex-col min-h-screen bg-zinc-950 text-zinc-50 p-4 md:p-8">
      <div className="max-w-3xl w-full mx-auto flex-1 flex flex-col">
        {/* Header with Back Button */}
        <div className="flex items-center justify-between mb-8">
          <button
            onClick={onBack}
            disabled={currentQuestionIndex === 0}
            className={`flex items-center text-sm transition-colors ${
              currentQuestionIndex === 0 ? 'text-zinc-700 cursor-not-allowed' : 'text-zinc-400 hover:text-amber-500'
            }`}
          >
            <ArrowLeft className="w-4 h-4 mr-1" />
            上一题
          </button>
          <div className="text-sm text-zinc-500 font-mono">
            QUESTION {String(currentQuestionIndex + 1).padStart(2, '0')}
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mb-12">
          <div className="flex justify-between text-xs text-zinc-500 mb-2 uppercase tracking-widest">
            <span>Progress</span>
            <span>{Math.round(progress)}%</span>
          </div>
          <div className="h-1 bg-zinc-900 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.5)]"
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>
        </div>

        {/* Question Area */}
        <div className="flex-1 flex flex-col justify-center pb-12">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentQuestionIndex}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
            >
              <h2 className="text-2xl md:text-4xl font-bold mb-12 leading-tight tracking-tight">
                {question.text}
              </h2>
              
              <div className="grid gap-4">
                {question.options.map((option, index) => {
                  const isSelected = selectedOptionIndex === index;
                  return (
                    <motion.button
                      key={index}
                      whileHover={{ scale: 1.01 }}
                      whileTap={{ scale: 0.99 }}
                      onClick={() => onAnswer(index)}
                      className={`w-full text-left p-6 rounded-xl border transition-all duration-200 group relative overflow-hidden ${
                        isSelected 
                          ? 'bg-amber-500/10 border-amber-500 ring-1 ring-amber-500/50' 
                          : 'bg-zinc-900/50 border-zinc-800 hover:border-zinc-600 hover:bg-zinc-800/50'
                      }`}
                    >
                      {isSelected && (
                        <motion.div 
                          layoutId="active-bg"
                          className="absolute inset-0 bg-amber-500/5 opacity-10"
                        />
                      )}
                      <div className="flex items-center relative z-10">
                        <span className={`flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center font-bold transition-colors ${
                          isSelected 
                            ? 'bg-amber-500 text-zinc-950' 
                            : 'bg-zinc-800 text-zinc-500 group-hover:text-zinc-300'
                        }`}>
                          {String.fromCharCode(65 + index)}
                        </span>
                        <span className={`ml-6 text-lg md:text-xl transition-colors ${
                          isSelected ? 'text-amber-500 font-medium' : 'text-zinc-400 group-hover:text-zinc-100'
                        }`}>
                          {option.text}
                        </span>
                        {isSelected && (
                          <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            className="ml-auto"
                          >
                            <div className="w-2 h-2 rounded-full bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.8)]" />
                          </motion.div>
                        )}
                      </div>
                    </motion.button>
                  );
                })}
              </div>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Footer Navigation */}
        {selectedOptionIndex !== undefined && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-8 flex justify-end"
          >
            {currentQuestionIndex < questions.length - 1 ? (
              <button
                onClick={() => onAnswer(selectedOptionIndex)}
                className="flex items-center px-8 py-4 bg-amber-500 text-zinc-950 font-bold rounded-xl hover:bg-amber-400 transition-colors shadow-lg shadow-amber-500/20"
              >
                下一题
                <ArrowRight className="w-5 h-5 ml-2" />
              </button>
            ) : (
              <button
                onClick={() => onAnswer(selectedOptionIndex)}
                className="flex items-center px-8 py-4 bg-amber-500 text-zinc-950 font-bold rounded-xl hover:bg-amber-400 transition-colors shadow-lg shadow-amber-500/20"
              >
                查看结果
                <ArrowRight className="w-5 h-5 ml-2" />
              </button>
            )}
          </motion.div>
        )}
      </div>
    </div>
  );
}
