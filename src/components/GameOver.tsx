import React from 'react';
import { Trophy, RefreshCw, ShoppingCart, Award, Flame, Shield, Activity, Users } from 'lucide-react';
import { Team, Tank, MatchStats } from '../types';
import { GameSounds } from '../sounds';

interface GameOverProps {
  player1: Tank | null;
  winnerTeam: Team;
  matchStats: MatchStats;
  pointsAwarded: number;
  onRestart: () => void;
  onOpenStore: () => void;
}

export default function GameOver({
  player1,
  winnerTeam,
  matchStats,
  pointsAwarded,
  onRestart,
  onOpenStore
}: GameOverProps) {
  
  const playerWon = player1 ? player1.team === winnerTeam : false;
  
  React.useEffect(() => {
    GameSounds.playFinish(playerWon);
  }, [playerWon]);

  return (
    <div id="game-over-screen" className="min-h-screen bg-slate-950 text-white p-4 md:p-8 flex flex-col items-center justify-center select-none relative overflow-hidden font-sans">
      
      {/* Background Atmosphere consistent with Immersive UI */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,#1e293b_0%,#020617_100%)] opacity-55 z-0"></div>
      <div className="absolute inset-0 immersive-grid-layer z-0"></div>

      {/* Decorative neon gradients matching color themes */}
      {winnerTeam === 'BLUE' ? (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[550px] h-[550px] bg-blue-600/15 rounded-full blur-[170px] pointer-events-none z-0" />
      ) : (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/1 -translate-y-1/2 w-[550px] h-[550px] bg-red-600/15 rounded-full blur-[170px] pointer-events-none z-0" />
      )}

      <div className="w-full max-w-2xl z-10 flex flex-col items-center relative">
        
        {/* Trophy icon card */}
        <div className={`p-5 rounded-full border mb-6 shadow-xl relative overflow-hidden ${
          winnerTeam === 'BLUE'
            ? 'bg-blue-950/40 border-blue-500 shadow-blue-500/20 text-blue-400'
            : 'bg-red-950/40 border-red-500 shadow-red-500/20 text-red-400'
        }`}>
          <Trophy className="w-14 h-14 animate-pulse" />
        </div>

        {/* Dynamic header title */}
        <div className="text-center mb-8">
          <h1 className="text-4xl md:text-5xl font-black tracking-tighter leading-none select-text italic uppercase">
            {winnerTeam === 'BLUE' ? (
              <span className="text-blue-500 drop-shadow-[0_2px_15px_rgba(59,130,246,0.6)]">BLUE DIVISION VICTORIOUS!</span>
            ) : (
              <span className="text-red-500 drop-shadow-[0_2px_15px_rgba(239,68,68,0.6)]">RED DIVISION VICTORIOUS!</span>
            )}
          </h1>
          <p className="text-slate-400 tracking-widest text-xs font-mono mt-3 uppercase font-bold">
            {playerWon ? 'Tabriklaymiz, sening jamoang jang maydonini toʻliq egalladi!' : 'Jang yakunlandi. Navbatdagi strategiyaga tayyorlaning!'}
          </p>
        </div>

        {/* Stats and salvage allocation dashboard */}
        <div className="w-full bg-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-2xl mb-6">
          
          <h2 className="text-xs font-mono text-cyan-400 tracking-widest uppercase border-b border-slate-800/80 pb-2 mb-4.5 text-center font-bold">
            POST-COMBAT ANALYSIS SYSTEM (TELEMETRY OVERVIEW)
          </h2>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center mb-6">
            
            <div className="bg-slate-950 border border-slate-850 p-3.5 rounded-xl shadow-inner">
              <span className="text-[9px] text-slate-500 font-mono block uppercase font-bold">BLUE DIVISION FRAGS</span>
              <span className="text-2xl font-black font-mono text-blue-400">{matchStats.blueScore}</span>
            </div>

            <div className="bg-slate-950 border border-slate-850 p-3.5 rounded-xl shadow-inner">
              <span className="text-[9px] text-slate-500 font-mono block uppercase font-bold">RED DIVISION FRAGS</span>
              <span className="text-2xl font-black font-mono text-red-500">{matchStats.redScore}</span>
            </div>

            <div className="bg-slate-950 border border-slate-850 p-3.5 rounded-xl shadow-inner">
              <span className="text-[9px] text-slate-500 font-mono block uppercase font-bold">YOUR BATTALION FRAGS</span>
              <span className="text-2xl font-black font-mono text-emerald-400">{player1 ? player1.kills : 0}</span>
            </div>

            <div className="bg-slate-950 border border-slate-850 p-3.5 rounded-xl shadow-inner">
              <span className="text-[9px] text-slate-500 font-mono block uppercase font-bold">YOUR HULL LOSSES</span>
              <span className="text-2xl font-black font-mono text-rose-500">{player1 ? player1.deaths : 0}</span>
            </div>

          </div>

          {/* Awarded points bonus badge */}
          <div className="bg-gradient-to-r from-amber-500/10 via-amber-500/20 to-amber-500/10 border border-amber-500/30 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-center sm:text-left shadow-inner">
            <div>
              <span className="text-[10px] font-mono text-amber-500 tracking-widest block mb-1 font-black">RESOURCE RECOVERY DISPATCH</span>
              <h3 className="font-extrabold text-white text-xs uppercase tracking-wide">Salvaged technology points awarded:</h3>
              <p className="text-[11px] text-slate-400">Points successfully computed for division achievements and system tags.</p>
            </div>
            
            <div className="self-center flex items-center gap-1.5 p-2 bg-slate-950/90 border border-slate-800 rounded-lg shadow-md">
              <Award className="w-5 h-5 text-amber-500 animate-bounce" />
              <span className="text-2xl font-black font-mono text-amber-400">
                +{pointsAwarded} <span className="text-xs text-slate-500">PTS</span>
              </span>
            </div>
          </div>

        </div>

        {/* Action button triggers config */}
        <div className="w-full flex flex-col sm:flex-row gap-3.5">
          <button
            id="gameover-store-btn"
            onClick={() => { GameSounds.playHit(); onOpenStore(); }}
            className="flex-1 bg-slate-900 status-glow border border-slate-800 hover:bg-slate-800 hover:border-slate-700 text-amber-500 text-xs font-mono font-bold tracking-widest py-4 rounded-xl uppercase transition duration-150 shadow-md cursor-pointer flex items-center justify-center gap-2"
          >
            <ShoppingCart className="w-4 h-4" />
            <span>Garaj & Doʻkonga Kirish</span>
          </button>

          <button
            id="gameover-restart-btn"
            onClick={() => { onRestart(); }}
            className="flex-1 bg-gradient-to-r from-blue-600 via-indigo-600 to-red-600 hover:tracking-widest text-white text-xs font-mono font-black py-4 rounded-xl uppercase transition duration-155 transform hover:scale-[1.01] shadow-xl hover:shadow-[0_0_20px_rgba(99,102,241,0.4)] border border-white/10 hover:border-white/30 cursor-pointer flex items-center justify-center gap-2"
          >
            <RefreshCw className="w-4 h-4 text-white" />
            <span>Qayta Jang maydoniga!</span>
          </button>
        </div>

      </div>
    </div>
  );
}
