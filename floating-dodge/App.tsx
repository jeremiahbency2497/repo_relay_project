
import React, { useState, useCallback } from 'react';
import GameView from './components/GameView';
import { GameStatus } from './types';

const App: React.FC = () => {
  const [status, setStatus] = useState<GameStatus>(GameStatus.START);
  const [score, setScore] = useState(0);
  const [time, setTime] = useState(0);
  const [highScore, setHighScore] = useState(() => {
    const saved = localStorage.getItem('floating-dodge-highscore-points');
    return saved ? parseInt(saved) : 0;
  });

  const handleGameOver = useCallback((finalScore: number, finalTime: number) => {
    setScore(finalScore);
    setTime(finalTime);
    setStatus(GameStatus.GAMEOVER);
    if (finalScore > highScore) {
      setHighScore(finalScore);
      localStorage.setItem('floating-dodge-highscore-points', finalScore.toString());
    }
  }, [highScore]);

  const startGame = () => {
    setStatus(GameStatus.PLAYING);
    setScore(0);
    setTime(0);
  };

  return (
    <div className="relative w-full h-screen bg-slate-950 overflow-hidden text-white select-none font-sans">
      {status === GameStatus.START && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 backdrop-blur-sm z-50">
          <h1 className="text-6xl font-black mb-4 tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-600 drop-shadow-[0_0_15px_rgba(34,211,238,0.5)]">
            FLOATING DODGE
          </h1>
          <p className="text-slate-400 mb-8 max-w-md text-center">
            Master inertia. Engage the thrusters. Eliminate threats.
          </p>
          <div className="grid grid-cols-3 gap-6 mb-10 text-sm text-slate-300">
            <div className="flex flex-col items-center">
              <span className="font-bold text-cyan-400 mb-1">MOVE</span>
              <span className="bg-slate-800 px-2 py-1 rounded">WASD / Arrows</span>
            </div>
            <div className="flex flex-col items-center">
              <span className="font-bold text-red-500 mb-1">FIRE</span>
              <span className="bg-slate-800 px-2 py-1 rounded">Space</span>
            </div>
            <div className="flex flex-col items-center">
              <span className="font-bold text-cyan-400 mb-1">BOOST</span>
              <span className="bg-slate-800 px-2 py-1 rounded">Shift</span>
            </div>
          </div>
          <button 
            onClick={startGame}
            className="px-10 py-4 bg-cyan-500 hover:bg-cyan-400 text-black font-bold text-xl rounded-full transition-all hover:scale-105 active:scale-95 shadow-[0_0_20px_rgba(34,211,238,0.4)]"
          >
            INITIALIZE ENGINE
          </button>
        </div>
      )}

      {status === GameStatus.GAMEOVER && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 backdrop-blur-md z-50">
          <h2 className="text-5xl font-black mb-2 text-red-500">SYSTEM FAILURE</h2>
          <div className="text-center mb-8 flex gap-12">
            <div>
              <p className="text-slate-400 text-sm uppercase tracking-widest">TOTAL SCORE</p>
              <p className="text-6xl font-mono text-cyan-400 font-bold">{score}</p>
            </div>
            <div>
              <p className="text-slate-400 text-sm uppercase tracking-widest">FLIGHT TIME</p>
              <p className="text-6xl font-mono text-white/80">{time.toFixed(1)}s</p>
            </div>
          </div>
          <p className="text-slate-500 mb-8">Personal Best: {highScore} pts</p>
          <button 
            onClick={startGame}
            className="px-10 py-4 border-2 border-cyan-500 text-cyan-500 hover:bg-cyan-500 hover:text-black font-bold text-xl rounded-full transition-all hover:scale-105 active:scale-95 shadow-[0_0_20px_rgba(34,211,238,0.2)]"
          >
            REBOOT SYSTEM
          </button>
        </div>
      )}

      <GameView 
        isActive={status === GameStatus.PLAYING} 
        onGameOver={handleGameOver} 
      />
    </div>
  );
};

export default App;
