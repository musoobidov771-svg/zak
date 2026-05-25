import React, { useState, useEffect } from 'react';
import { Shield, Zap, Flame, Award, RefreshCw, Volume2, VolumeX, Pause, Play, ShoppingCart, HelpCircle } from 'lucide-react';
import { GameState, Upgrades, Team, Tank, GameLog, MatchStats } from './types';
import MainMenu from './components/MainMenu';
import GameCanvas from './components/GameCanvas';
import HUD from './components/HUD';
import Store from './components/Store';
import GameOver from './components/GameOver';
import { GameSounds } from './sounds';

export default function App() {
  // Global Game Routing State
  const [gameState, setGameState] = useState<GameState>('MENU');
  
  // Players Upgrade points + Progression Hangar levels
  // Start with 150 PTS so players can buy an initial upgrade immediately!
  const [points, setPoints] = useState<number>(150);
  const [upgrades, setUpgrades] = useState<Upgrades>({
    maxHealthLevel: 0,
    maxShieldLevel: 0,
    engineSpeedLevel: 0,
    reloadSpeedLevel: 0,
    damageLevel: 0
  });

  // Chosen combat setup
  const [playerSetup, setPlayerSetup] = useState<{
    team: Team;
    tankType: any;
    mode: 'SOLO' | 'COOP' | 'VERSUS';
    playerName: string;
    botCount: number;
  }>({
    team: 'BLUE',
    tankType: 'BALANCED',
    mode: 'SOLO',
    playerName: 'Jasur_Tankchi',
    botCount: 6
  });

  // Play Live telemetry states (for HUD overlays)
  const [player1Stats, setPlayer1Stats] = useState<Tank | null>(null);
  const [player2Stats, setPlayer2Stats] = useState<Tank | null>(null);
  const [redScore, setRedScore] = useState<number>(0);
  const [blueScore, setBlueScore] = useState<number>(0);
  const [logs, setLogs] = useState<GameLog[]>([]);
  const [isPaused, setIsPaused] = useState<boolean>(false);

  // Playback end results
  const [winnerTeam, setWinnerTeam] = useState<Team>('BLUE');
  const [matchStats, setMatchStats] = useState<MatchStats>({
    redScore: 0,
    blueScore: 0,
    redTanksCount: 0,
    blueTanksCount: 0,
    kills: {},
    deaths: {},
    damageDealt: {}
  });
  const [pointsAwarded, setPointsAwarded] = useState<number>(0);

  // sound toggle on HUD helper
  const [soundEnabled, setSoundEnabled] = useState(GameSounds.isEnabled());

  // Background ambient effects
  useEffect(() => {
    // load saved profile nicknames or points if they exist in localStorage
    try {
      const savedPoints = localStorage.getItem('tank_pts');
      if (savedPoints) setPoints(parseInt(savedPoints));

      const savedUpgrades = localStorage.getItem('tank_upgrades');
      if (savedUpgrades) setUpgrades(JSON.parse(savedUpgrades));
    } catch (e) {
      console.warn("Could not load from localStorage:", e);
    }
  }, []);

  // Save progression state
  const saveProgression = (newPoints: number, newUpgrades: Upgrades) => {
    setPoints(newPoints);
    setUpgrades(newUpgrades);
    try {
      localStorage.setItem('tank_pts', newPoints.toString());
      localStorage.setItem('tank_upgrades', JSON.stringify(newUpgrades));
    } catch (e) {
      console.warn("Could not save to localStorage:", e);
    }
  };

  const handleStartGame = (setup: typeof playerSetup) => {
    setPlayerSetup(setup);
    setRedScore(0);
    setBlueScore(0);
    setLogs([
      {
        id: `logs_sys_start_${Date.now()}`,
        text: `🚀 Jang maydoni tayyorlanmoqda. Jamoalar: Koʻk vs Qizil!`,
        type: 'SYSTEM',
        timestamp: Date.now()
      }
    ]);
    setPlayer1Stats(null);
    setPlayer2Stats(null);
    setIsPaused(false);
    setGameState('PLAYING');
  };

  const handleUpgrade = (type: keyof Upgrades) => {
    const currentCost = [100, 250, 450, 700, 1000][upgrades[type]];
    if (points >= currentCost && upgrades[type] < 5) {
      const nextUpgrades = { ...upgrades, [type]: upgrades[type] + 1 };
      const nextPoints = points - currentCost;
      saveProgression(nextPoints, nextUpgrades);
    }
  };

  const handlePauseToggle = () => {
    GameSounds.playHit();
    setIsPaused(prev => !prev);
  };

  const handleAddLog = (newLog: GameLog) => {
    setLogs(prev => [...prev, newLog].slice(-15)); // cap length at 15 logs in memory
  };

  const handleAwardPoints = (ptsAmt: number) => {
    const nextPoints = points + ptsAmt;
    saveProgression(nextPoints, upgrades);
  };

  const handleMatchFinished = (winner: Team, stats: any, ptsReward: number) => {
    setWinnerTeam(winner);
    // structure matching stats schema
    setMatchStats({
      redScore: stats.redScore || 0,
      blueScore: stats.blueScore || 0,
      redTanksCount: playerSetup.botCount / 2,
      blueTanksCount: playerSetup.botCount / 2,
      kills: {},
      deaths: {},
      damageDealt: {}
    });
    setPointsAwarded(ptsReward);
    setGameState('OVER');
  };

  const handleRestartGame = () => {
    GameSounds.playPowerUp();
    handleStartGame(playerSetup);
  };

  return (
    <div className="w-full h-screen relative bg-slate-950 text-white overflow-hidden font-sans select-none">
      
      {/* Route Views switcher */}
      {gameState === 'MENU' && (
        <MainMenu
          onStartGame={handleStartGame}
          savedPlayerName={playerSetup.playerName}
        />
      )}

      {gameState === 'PLAYING' && (
        <div className="w-full h-full relative">
          
          {/* Active 3D WebGL viewport canvas */}
          <GameCanvas
            playerSetup={playerSetup}
            upgrades={upgrades}
            isPaused={isPaused}
            onUpdateScores={(red, blue) => {
              setRedScore(red);
              setBlueScore(blue);
            }}
            onAddLog={handleAddLog}
            onAwardPoints={handleAwardPoints}
            onMatchFinished={handleMatchFinished}
            onUpdatePlayers={(p1, p2) => {
              setPlayer1Stats(p1);
              setPlayer2Stats(p2);
            }}
          />

          {/* Interactive overlay UI (Heads Up Display) */}
          <HUD
            player1={player1Stats}
            player2={player2Stats}
            redScore={redScore}
            blueScore={blueScore}
            logs={logs}
            isPaused={isPaused}
            onPauseToggle={handlePauseToggle}
            onOpenStore={() => {
              GameSounds.playHit();
              setIsPaused(true);
              setGameState('STORE');
            }}
          />

          {/* Interactive Pause screen overlay popup */}
          {isPaused && (
            <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-md z-35 flex flex-col items-center justify-center p-4">
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6.5 max-w-md w-full shadow-2xl text-center flex flex-col gap-5">
                
                <div>
                  <div className="inline-flex p-3 bg-amber-500/10 border border-amber-500/20 text-amber-500 rounded-full mb-3.5">
                    <Pause className="w-8 h-8 animate-pulse" />
                  </div>
                  <h2 className="text-3xl font-black tracking-tight text-white mb-1">
                    OʻYIN TOʻXTATILDI
                  </h2>
                  <p className="text-xs font-mono text-slate-400 uppercase tracking-widest">
                    Jang maydoni vaqtincha muzlatildi
                  </p>
                </div>

                {/* Substats block */}
                <div className="bg-slate-950 border border-slate-850 p-3.5 rounded-xl text-left text-xs text-slate-400 flex flex-col gap-2">
                  <div className="flex justify-between">
                    <span>O'yinchi:</span>
                    <strong className="text-white font-mono">{playerSetup.playerName}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Jamoa:</span>
                    <strong className={playerSetup.team === 'BLUE' ? 'text-blue-400' : 'text-red-400'}>
                      {playerSetup.team === 'BLUE' ? 'Koʻk Jamoa' : 'Qizil Jamoa'}
                    </strong>
                  </div>
                  <div className="flex justify-between border-t border-slate-900 pt-2.5 mt-0.5">
                    <span>Sening Kills:</span>
                    <strong className="text-emerald-400 font-mono text-sm">{player1Stats ? player1Stats.kills : 0} marta</strong>
                  </div>
                </div>

                {/* Controls triggers list */}
                <div className="flex flex-col gap-2.5">
                  <button
                    id="pause-resume-btn"
                    onClick={handlePauseToggle}
                    className="w-full bg-gradient-to-r from-blue-600 via-indigo-600 to-red-600 hover:from-blue-500 hover:via-indigo-500 hover:to-red-500 text-white font-bold py-3.5 rounded-xl uppercase transition cursor-pointer flex items-center justify-center gap-2 shadow-lg"
                  >
                    <Play className="w-4.5 h-4.5 fill-white" /> davom ettirish
                  </button>

                  <div className="grid grid-cols-2 gap-2.5">
                    <button
                      id="pause-garage-btn"
                      onClick={() => {
                        GameSounds.playPowerUp();
                        setGameState('STORE');
                      }}
                      className="bg-slate-950 border border-slate-850 hover:bg-slate-800 text-amber-400 text-sm font-bold py-3 px-1 rounded-xl transition cursor-pointer flex items-center justify-center gap-1.5"
                    >
                      <ShoppingCart className="w-4 h-4" /> Garaj (Store)
                    </button>

                    <button
                      id="pause-quit-btn"
                      onClick={() => {
                        GameSounds.playHit();
                        setGameState('MENU');
                      }}
                      className="bg-slate-950 border border-slate-850 hover:bg-slate-800 text-slate-300 text-sm font-bold py-3 px-1 rounded-xl transition cursor-pointer"
                    >
                      Asosiy Menyu
                    </button>
                  </div>
                </div>

                {/* Helpful guides list */}
                <div className="text-[10px] font-mono text-slate-500 flex items-center justify-center gap-1.5 pt-2 border-t border-slate-850">
                  <HelpCircle className="w-4 h-4 text-slate-500" />
                  <span>Klaviatura <span className="text-white">SPACE</span> yoki chap sichqoncha oʻlim uradi.</span>
                </div>

              </div>
            </div>
          )}

        </div>
      )}

      {gameState === 'STORE' && (
        <Store
          upgrades={upgrades}
          points={points}
          onUpgrade={handleUpgrade}
          onBack={() => {
            // If they entered upgrades out of pause context, return to play, else return to initial menu screen!
            if (player1Stats) {
              setGameState('PLAYING');
            } else {
              setGameState('MENU');
            }
          }}
        />
      )}

      {gameState === 'OVER' && (
        <GameOver
          player1={player1Stats}
          winnerTeam={winnerTeam}
          matchStats={matchStats}
          pointsAwarded={pointsAwarded}
          onRestart={handleRestartGame}
          onOpenStore={() => {
            setPlayer1Stats(null); // clean game references so Store returns to menu correctly!
            setGameState('STORE');
          }}
        />
      )}

    </div>
  );
}
