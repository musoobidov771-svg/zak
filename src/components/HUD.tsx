import React from 'react';
import { Shield, Activity, RefreshCw, Volume2, VolumeX, Pause, Play, ShoppingCart, Award, Zap } from 'lucide-react';
import { Tank, GameLog, Team, WeaponType } from '../types';
import { GameSounds } from '../sounds';

interface HUDProps {
  player1: Tank | null;
  player2: Tank | null; // Null if playing Solo
  redScore: number;
  blueScore: number;
  logs: GameLog[];
  isPaused: boolean;
  onPauseToggle: () => void;
  onOpenStore: () => void;
}

export default function HUD({
  player1,
  player2,
  redScore,
  blueScore,
  logs,
  isPaused,
  onPauseToggle,
  onOpenStore
}: HUDProps) {
  const soundOn = GameSounds.isEnabled();

  const handleSoundToggle = () => {
    GameSounds.toggleSound();
    GameSounds.playHit();
  };

  const renderPlayerBar = (player: Tank, index: 1 | 2) => {
    const healthPercent = Math.max(0, (player.health / player.maxHealth) * 100);
    const shieldPercent = Math.max(0, (player.shield / player.maxShield) * 100);
    const cooldownPercent = Math.max(0, (player.fireCooldown / player.maxFireCooldown) * 100);

    const weaponLabels: { [key in WeaponType]: string } = {
      STANDARD: 'STANDARD',
      TRIPLE: 'TRIPLE SHELL',
      HEAVY: 'HEAVY GUN',
      PLASMA: 'PLASMA PULSE'
    };

    const isBlue = player.team === 'BLUE';
    const borderAccentClass = isBlue 
      ? 'border-blue-500/30 glow-blue text-blue-400' 
      : 'border-red-500/30 glow-red text-red-400';
    
    const glowBarBg = isBlue ? 'bg-blue-500 shadow-[0_0_10px_#3b82f6]' : 'bg-red-500 shadow-[0_0_10px_#ef4444]';
    const systemStatus = healthPercent > 35 ? 'SYSTEMS NOMINAL' : 'CRITICAL DAMAGE';
    const armorLevel = player.shield > 40 ? 'HIGH' : (player.shield > 15 ? 'MEDIUM' : 'LOW');
    const armorColorClass = player.shield > 40 ? 'text-emerald-400' : (player.shield > 15 ? 'text-amber-400' : 'text-rose-500');

    return (
      <div 
        key={player.id} 
        className={`bg-slate-950/95 border backdrop-blur-md rounded-xl p-5 w-full max-w-[340px] shadow-2xl transition-all duration-300 ${borderAccentClass}`}
      >
        {/* Name and index heading */}
        <div className="flex justify-between items-baseline mb-4">
          <div>
            <p className="text-[10px] uppercase tracking-widest text-slate-400 font-bold mb-0.5">PLAYER {index}</p>
            <h3 className="text-xl font-black italic tracking-wide text-white leading-tight font-sans">
              {player.name.toUpperCase()}
            </h3>
          </div>
          <span className="text-[10px] font-mono font-bold tracking-wider uppercase px-2 py-0.5 bg-slate-900 border border-slate-800 rounded">
            {player.type}
          </span>
        </div>

        {/* Health point meter */}
        <div className="mb-4">
          <div className="flex justify-between items-center text-[10px] font-mono text-slate-400 mb-1.5 uppercase tracking-wider">
            <span className="flex items-center gap-1">HP STATUS:</span>
            <span className="font-bold text-white">{Math.ceil(player.health)} / {player.maxHealth}</span>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="flex-1 h-2.5 bg-slate-900 rounded-full overflow-hidden p-[1px] border border-slate-800">
              <div
                className={`h-full rounded-full transition-all duration-100 ease-out ${glowBarBg}`}
                style={{ width: `${healthPercent}%` }}
              />
            </div>
            <span className={`text-[10px] font-black tracking-tighter ${healthPercent > 35 ? 'text-emerald-400' : 'text-rose-500 animate-pulse'}`}>
              {systemStatus}
            </span>
          </div>
        </div>

        {/* Shield integrity meter */}
        {player.maxShield > 0 && (
          <div className="mb-4">
            <div className="flex justify-between items-center text-[10px] font-mono text-slate-400 mb-1.5 uppercase tracking-wider">
              <span>ENERGY SHIELD:</span>
              <span className="font-bold text-cyan-400">{Math.ceil(player.shield)} / {player.maxShield}</span>
            </div>
            <div className="h-2 bg-slate-900/80 p-[1px] border border-slate-800 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-150 ease-out bg-cyan-400 shadow-[0_0_10px_#22d3ee]"
                style={{ width: `${shieldPercent}%` }}
              />
            </div>
          </div>
        )}

        {/* Core Stats Grid */}
        <div className="grid grid-cols-2 gap-4 py-3 border-y border-slate-900">
          <div className="text-center border-r border-slate-900">
            <p className="text-[10px] text-slate-500 uppercase tracking-widest font-mono font-bold">SHELLS</p>
            <p className="text-lg font-mono font-black text-white mt-1">
              {player.activeWeapon === 'STANDARD' ? '∞' : `${player.ammo}/30`}
            </p>
            <span className="text-[8px] font-mono text-slate-400 opacity-80 block truncate">
              {weaponLabels[player.activeWeapon]}
            </span>
          </div>
          <div className="text-center">
            <p className="text-[10px] text-slate-500 uppercase tracking-widest font-mono font-bold">ARMOR</p>
            <p className={`text-lg font-mono font-black mt-1 ${armorColorClass}`}>
              {armorLevel}
            </p>
            <span className="text-[8px] font-mono text-slate-400 opacity-80 block">
              SYSTEM
            </span>
          </div>
        </div>

        {/* Reload visual indicator line */}
        <div className="mt-3 flex items-center justify-between">
          <div className="w-2/3 h-1 bg-slate-900 rounded-full overflow-hidden flex">
            <div 
              className={`h-full transition-all duration-75 ${cooldownPercent > 0 ? 'bg-amber-500 animate-pulse' : 'bg-emerald-400'}`}
              style={{ width: `${cooldownPercent > 0 ? cooldownPercent : 100}%` }}
            />
          </div>
          <span className="text-[9px] font-mono font-bold text-slate-400 uppercase">
            {cooldownPercent > 0 ? 'RELOADING' : 'READY TO FIRE'}
          </span>
        </div>

        {/* Personal Scoreboard */}
        <div className="flex justify-between items-center mt-3 pt-3 border-t border-dashed border-slate-850 text-[10px] font-mono text-slate-400">
          <span className="flex items-center gap-1 text-amber-400 font-extrabold"><Award className="w-3.5 h-3.5" /> {player.score} PTS</span>
          <div className="flex gap-2 text-[9px]">
            <span>KILLS: <span className="text-white font-bold">{player.kills}</span></span>
            <span>DEATHS: <span className="text-white font-bold">{player.deaths}</span></span>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="absolute inset-x-0 inset-y-0 h-full w-full pointer-events-none flex flex-col justify-between p-4 z-20 font-sans select-none">
      
      {/* TOP HEADER ROW: Unified score bar and global actions */}
      <div className="w-full flex items-center justify-between pointer-events-auto gap-4">
        
        {/* Left Actions: Pause, Sound, Hangar/Store */}
        <div className="flex gap-1.5 self-start">
          <button
            id="hud-pause-btn"
            onClick={onPauseToggle}
            className="bg-slate-900 border border-slate-800 rounded-lg p-2.5 text-slate-400 hover:text-white hover:bg-slate-800 hover:border-slate-700 transition duration-150 cursor-pointer flex items-center justify-center gap-1.5 shadow-md font-mono text-xs font-bold"
          >
            {isPaused ? <Play className="w-4 h-4 text-emerald-400" /> : <Pause className="w-4 h-4 text-amber-500" />}
            <span className="hidden md:inline">{isPaused ? 'DAVOM ETISH' : 'PAUZA'}</span>
          </button>

          <button
            id="hud-sound-btn"
            onClick={handleSoundToggle}
            className="bg-slate-900 border border-slate-800 rounded-lg p-2.5 text-slate-400 hover:text-white hover:bg-slate-800 hover:border-slate-700 transition duration-150 cursor-pointer flex items-center justify-center shadow-md bg-transparent"
          >
            {soundOn ? <Volume2 className="w-4 h-4 text-emerald-400" /> : <VolumeX className="w-4 h-4 text-rose-500" />}
          </button>

          <button
            id="hud-store-btn"
            onClick={onOpenStore}
            className="bg-gradient-to-r from-amber-600 to-amber-500 border border-amber-500/30 rounded-lg p-2.5 text-white hover:from-amber-500 hover:to-amber-400 transition duration-150 cursor-pointer flex items-center justify-center gap-1.5 shadow-lg font-mono text-xs font-bold"
          >
            <ShoppingCart className="w-4 h-4" />
            <span>GARAJ (UPGRADE)</span>
          </button>
        </div>

        {/* CENTER: Team scoreboard with custom visual bar layout */}
        <div className="flex flex-col items-center bg-slate-900/90 border border-slate-800 rounded-xl px-5 py-2 hover:bg-slate-900 shadow-xl max-w-sm w-full relative">
          
          <div className="absolute -top-2 left-1/2 -translate-x-1/2 px-2.5 py-0.5 bg-slate-950 border border-slate-800 rounded text-[8px] font-mono font-bold text-slate-400 tracking-widest uppercase">
            BATTLE DURATION / STATUS
          </div>

          <div className="flex justify-between items-center w-full mt-1.5 px-1">
            {/* Red score */}
            <div className="text-left flex flex-col">
              <span className="text-[8px] font-mono text-red-400 block uppercase font-bold tracking-widest">RED TEAM</span>
              <span className="text-xl md:text-2xl font-black font-mono text-red-500 leading-none">{redScore}</span>
            </div>

            {/* VS Accent and Glow Lights */}
            <div className="flex gap-2 items-center mx-3 mt-1.5">
              <div className="w-6 h-1 bg-red-500 shadow-[0_0_10px_#ef4444]"></div>
              <div className="text-sm font-mono text-slate-350 font-bold tracking-widest px-2 py-0.5 bg-slate-950 border border-slate-800 rounded-full">
                {redScore} - {blueScore}
              </div>
              <div className="w-6 h-1 bg-blue-500 shadow-[0_0_10px_#3b82f6]"></div>
            </div>

            {/* Blue score */}
            <div className="text-right flex flex-col">
              <span className="text-[8px] font-mono text-blue-400 block uppercase font-bold tracking-widest">BLUE TEAM</span>
              <span className="text-xl md:text-2xl font-black font-mono text-blue-500 leading-none">{blueScore}</span>
            </div>
          </div>

          {/* Graphical timeline comparison line */}
          <div className="w-full h-1 bg-slate-950 rounded-full mt-2 overflow-hidden flex">
            {blueScore === 0 && redScore === 0 ? (
              <div className="w-1/2 h-full bg-slate-700" />
            ) : (
              <>
                <div
                  className="h-full bg-red-500 transition-all duration-300"
                  style={{ width: `${(redScore / (blueScore + redScore)) * 100}%` }}
                />
                <div
                  className="h-full bg-blue-500 transition-all duration-300"
                  style={{ width: `${(blueScore / (blueScore + redScore)) * 100}%` }}
                />
              </>
            )}
          </div>

        </div>

        {/* Right side helper layout coordinates status or game duration */}
        <div className="hidden md:flex bg-slate-900/90 border border-slate-800 rounded-lg p-2.5 font-mono text-xs text-slate-400 self-center">
          <div className="flex items-center gap-3">
            <div className="flex flex-col text-right">
              <span className="text-[9px] text-slate-500">ARENA REGION</span>
              <span className="text-yellow-400 font-bold text-[10px]">SECTOR_D3</span>
            </div>
            <div className="h-6 w-[1px] bg-slate-850" />
            <div className="flex items-center gap-2 bg-slate-950 px-2 py-1 rounded border border-slate-850">
              <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></div>
              <span className="text-[9px] uppercase tracking-wider text-slate-300 font-bold">Stable 14ms</span>
            </div>
          </div>
        </div>

      </div>

      {/* BOTTOM SECTION: Players telemetry and battle feed */}
      <div className="w-full flex flex-col md:flex-row justify-between items-end gap-4 mt-auto">
        
        {/* Left Side: Players Telemetries */}
        <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto pointer-events-auto">
          {player1 && renderPlayerBar(player1, 1)}
          {player2 && renderPlayerBar(player2, 2)}
        </div>

        {/* Right Side: Kill Feed & Battle Event Log */}
        <div className="bg-slate-900/80 border border-slate-800 backdrop-blur-md rounded-xl p-3.5 w-full max-w-[340px] shadow-lg pointer-events-auto flex flex-col gap-2 min-h-[140px] justify-between">
          
          <div className="border-b border-slate-800 pb-1.5 flex justify-between items-center">
            <span className="text-[10px] font-mono text-slate-400 uppercase tracking-widest font-bold">Harbiy Jang Shajarasi</span>
            <span className="text-[8px] font-mono text-amber-500 font-bold px-1.5 py-0.5 rounded bg-amber-500/10 border border-amber-500/10">BATTLE_LOGS</span>
          </div>

          <div className="flex-1 flex flex-col justify-end gap-1.5 overflow-hidden">
            {logs.length === 0 ? (
              <span className="text-xs font-mono text-slate-600 text-center italic block my-auto py-4">Tinchlik hukmron. Harakat aniqlanmadi.</span>
            ) : (
              logs.slice(-4).map((log) => {
                let colorClass = 'text-slate-350';
                if (log.type === 'KILL') colorClass = 'text-rose-400';
                if (log.type === 'POWERUP') colorClass = 'text-amber-400';
                if (log.type === 'BASE') colorClass = 'text-cyan-400 font-bold';

                return (
                  <div key={log.id} className="text-[11px] font-mono leading-tight flex gap-1.5 items-start break-words border-l-2 border-slate-800 pl-1.5">
                    <span className="text-[8px] text-slate-500 mt-0.5">
                      {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                    </span>
                    <span className={colorClass}>{log.text}</span>
                  </div>
                );
              })
            )}
          </div>

          <div className="text-[8px] font-mono text-slate-400 flex items-center gap-1 border-t border-slate-850 pt-1.5 mt-1 select-text">
            <span>💡</span>
            <span>Quvvatlagichlarni yigʻib, toʻpingizni kuchaytiring!</span>
          </div>

        </div>

      </div>

    </div>
  );
}
