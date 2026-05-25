import React from 'react';
import { ArrowLeft, Shield, Flame, Zap, Award, Activity, Check } from 'lucide-react';
import { Upgrades } from '../types';
import { GameSounds } from '../sounds';

interface StoreProps {
  upgrades: Upgrades;
  points: number;
  onUpgrade: (type: keyof Upgrades) => void;
  onBack: () => void;
}

export default function Store({ upgrades, points, onUpgrade, onBack }: StoreProps) {
  
  // Costs for each level config (Level 0 -> Level 5)
  // Costs: Lvl 0->1: 100, 1->2: 250, 2->3: 450, 3->4: 700, 4->5: Max
  const getUpgradeCost = (currentLevel: number) => {
    if (currentLevel >= 5) return Infinity;
    const costs = [100, 250, 450, 700, 1000];
    return costs[currentLevel] || 9999;
  };

  const attemptUpgrade = (key: keyof Upgrades) => {
    const cost = getUpgradeCost(upgrades[key]);
    if (points >= cost && upgrades[key] < 5) {
      GameSounds.playPowerUp();
      onUpgrade(key);
    } else {
      GameSounds.playHit(); // play error sound
    }
  };

  const upgradeItems = [
    {
      key: 'maxHealthLevel' as keyof Upgrades,
      title: 'Zirh Mustahkamligi (HP)',
      descr: 'Tankning maksimal hayot darajasini va korpus mustahkamligini oshiradi. Har bir bosqich +20 HP qoʻshadi.',
      icon: Activity,
      color: 'text-emerald-400 border-emerald-500/20 bg-emerald-950/20',
      barColor: 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]'
    },
    {
      key: 'maxShieldLevel' as keyof Upgrades,
      title: 'Nanotexnik Plastik Qalʼa',
      descr: 'Avtomatik ravishda tiklanadigan elektromagnit qalqon sigʻimini va quvvatini tizimga qoʻshadi. Har bir bosqich +15 SHIELD.',
      icon: Shield,
      color: 'text-blue-400 border-blue-500/20 bg-blue-950/20',
      barColor: 'bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]'
    },
    {
      key: 'engineSpeedLevel' as keyof Upgrades,
      title: 'Yashin Tezlagich (Dvigatel)',
      descr: 'Tank dvigatelining maksimal tezligini va burilish tezkorligini kuchaytiradi. Maydonda dushmanni chetlab oʻtishda asqotadi.',
      icon: Zap,
      color: 'text-amber-400 border-amber-500/20 bg-amber-950/20',
      barColor: 'bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]'
    },
    {
      key: 'damageLevel' as keyof Upgrades,
      title: 'Yadro Toʻp Snaryadi (Zarar)',
      descr: 'Asosiy va maxsus snaryadlarning yakuniy portlash zararini va impulsiv kuchini sezilarli darajada kuchaytiradi.',
      icon: Flame,
      color: 'text-red-400 border-red-500/20 bg-red-950/20',
      barColor: 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]'
    },
    {
      key: 'reloadSpeedLevel' as keyof Upgrades,
      title: 'Kojux Avtomatik Sovutgich',
      descr: 'Qayta oʻqlash tanaffusini (reload cooldown) qisqartiradi, shunda siz dushmanga qarshi toʻxtovsiz zarbalar bera olasiz.',
      icon: Award,
      color: 'text-cyan-400 border-cyan-500/20 bg-cyan-950/20',
      barColor: 'bg-cyan-500 shadow-[0_0_8px_rgba(6,182,212,0.5)]'
    }
  ];

  return (
    <div id="store-panel" className="min-h-screen bg-slate-950 text-white p-4 md:p-8 flex flex-col items-center select-none relative font-sans">
      
      {/* Background Atmosphere consistent with Immersive UI */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,#1e293b_0%,#020617_100%)] opacity-55 z-0"></div>
      <div className="absolute inset-0 immersive-grid-layer z-0"></div>

      <div className="w-full max-w-4xl z-10 flex flex-col gap-6 relative">
        
        {/* Hangar Navigation Bar */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-5">
          <button
            id="store-back-btn"
            onClick={() => { GameSounds.playHit(); onBack(); }}
            className="flex items-center gap-2 text-xs font-mono font-bold tracking-widest text-slate-300 hover:text-white transition duration-200 self-start bg-slate-900/90 border border-slate-800 rounded-lg px-4 py-2 cursor-pointer shadow-lg hover:border-slate-600 uppercase"
          >
            <ArrowLeft className="w-4 h-4" /> BATTLE ARENA
          </button>
          
          <div className="text-center md:text-right">
            <h1 className="text-3xl font-black italic tracking-tight uppercase text-white">
              ARMORED GARAGE & UPGRADES
            </h1>
            <p className="text-xs text-slate-400 font-mono tracking-widest uppercase">
              MODULAR HARDWARE INTEGRATION AND SYSTEMS REINFORCEMENT
            </p>
          </div>
        </div>

        {/* Balance credit board */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-slate-950/90 border border-slate-800 rounded-xl p-5 md:col-span-2 flex items-center justify-between overflow-hidden relative shadow-2xl">
            <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500/10 rounded-full blur-2xl pointer-events-none" />
            <div>
              <span className="text-[10px] font-mono text-cyan-400 uppercase tracking-widest block font-bold mb-1">AVAILABLE RESOURCE CREDITS</span>
              <span className="text-3xl md:text-4xl font-black font-mono text-white tracking-tight">
                {points.toLocaleString()} <span className="text-xs text-cyan-500 font-sans uppercase font-bold tracking-wide">PTS</span>
              </span>
            </div>
            <div className="text-right text-[10px] text-slate-400 font-mono italic max-w-[180px] leading-tight font-bold">
              * Eliminate rival divisions on the battlefield to accumulate points.
            </div>
          </div>
          
          <div className="bg-gradient-to-br from-indigo-950/40 to-slate-950 border border-indigo-500/20 rounded-xl p-5 flex flex-col justify-center shadow-xl">
            <span className="text-[10px] font-mono text-indigo-400 uppercase tracking-widest block mb-1 font-bold">UPGRADE QUANTITY</span>
            <span className="text-md font-black text-white uppercase tracking-tight block">
              TOTAL CORE RETROFITS
            </span>
            <span className="text-sm font-mono text-slate-400">
              {Object.values(upgrades).reduce((a, b) => a + b, 0)} / 25 MODS INSTALLED
            </span>
          </div>
        </div>

        {/* Upgrade cards list */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {upgradeItems.map((item) => {
            const currentLvl = upgrades[item.key];
            const cost = getUpgradeCost(currentLvl);
            const isMax = currentLvl >= 5;
            const canAfford = points >= cost && !isMax;

            const Icon = item.icon;

            // Mapping translated labels
            const translatedTitle: { [key: string]: string } = {
              maxHealthLevel: 'ARMORED HULL INTEGRITY (HP)',
              maxShieldLevel: 'NANOTECH BARRIER DEFENSE (SHIELD)',
              engineSpeedLevel: 'COMBAT ENGINE THRUST (SPEED)',
              damageLevel: 'HIGH IMPACT MUTATOR (HE_DAMAGE)',
              reloadSpeedLevel: 'RELOAD VELOCITY CALIBRATOR (RPM)'
            };

            const translatedDesc: { [key: string]: string } = {
              maxHealthLevel: 'Greatly increases your tank hulls health points limit and chassis endurance. Adds +20 HP per step.',
              maxShieldLevel: 'Equips an active electrostatic deflector shield that automatically replenishes. Adds +15 SHIELD per mod.',
              engineSpeedLevel: 'Improves engine shaft rotation limits. Maximizes maximum velocity, traction, and hull response speed.',
              damageLevel: 'Substantially increases basic ammunition yield and plasma kinetic impact radius.',
              reloadSpeedLevel: 'Accelerates the turret standard reload cooldown, enabling high cycle constant spray fire.'
            };

            return (
              <div
                key={item.key}
                className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 flex flex-col justify-between transition-all duration-200 hover:border-slate-700 hover:shadow-2xl relative overflow-hidden"
              >
                {/* Tech icon in background */}
                <div className="absolute top-2 right-2 opacity-[0.03] text-white">
                  <Icon className="w-24 h-24" />
                </div>

                <div className="flex gap-4">
                  <div className={`p-3 rounded-lg border h-fit ${item.color} shadow-inner`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-extrabold text-white text-sm tracking-wide font-sans">{translatedTitle[item.key] || item.title}</h3>
                    <p className="text-xs text-slate-400 mt-1.5 leading-relaxed font-sans">{translatedDesc[item.key] || item.descr}</p>
                  </div>
                </div>

                {/* Level bars meter */}
                <div className="mt-4.5">
                  <div className="flex justify-between text-[10px] font-mono text-slate-400 mb-1.5 uppercase tracking-wide">
                    <span>MODIFICATION PROGRESSION</span>
                    <span className="font-bold text-white">LEVEL {currentLvl} / 5</span>
                  </div>
                  <div className="flex gap-1.5 h-2.5 bg-slate-950 border border-slate-850 p-0.5 rounded-full shadow-inner">
                    {[1, 2, 3, 4, 5].map((lvl) => (
                      <div
                        key={lvl}
                        className={`flex-1 rounded-full transition-all duration-300 ${
                          lvl <= currentLvl ? item.barColor : 'bg-transparent'
                        }`}
                      />
                    ))}
                  </div>
                </div>

                {/* Buy Button row */}
                <div className="flex items-center justify-between mt-5 pt-3.5 border-t border-slate-850">
                  <div className="font-mono">
                    <span className="text-[9px] text-slate-505 block uppercase font-sans">COST</span>
                    {isMax ? (
                      <span className="text-emerald-400 font-black uppercase text-xs flex items-center gap-1">
                        <Check className="w-3.5 h-3.5 text-emerald-400" /> MAX COGNITIVE LEVEL
                      </span>
                    ) : (
                      <span className={`text-base font-black font-mono ${canAfford ? 'text-cyan-400' : 'text-slate-500'}`}>
                        {cost.toLocaleString()} <span className="text-[10px] text-slate-500">PTS</span>
                      </span>
                    )}
                  </div>

                  {!isMax && (
                    <button
                      id={`upgrade-${item.key}-btn`}
                      disabled={!canAfford}
                      onClick={() => attemptUpgrade(item.key)}
                      className={`text-xs font-bold font-mono uppercase px-4.5 py-2.5 rounded-lg border transition duration-200 cursor-pointer ${
                        canAfford
                          ? 'bg-cyan-950 border-cyan-500 hover:bg-cyan-900 text-cyan-400 shadow-[0_0_10px_rgba(6,182,212,0.15)] active:scale-95'
                          : 'bg-slate-950 border-slate-850 text-slate-600 cursor-not-allowed'
                      }`}
                    >
                      INTEGRATE MOD ⚙️
                    </button>
                  )}
                </div>

              </div>
            );
          })}
        </div>

        {/* Custom footer tips */}
        <div className="bg-slate-900/40 border border-slate-800/80 rounded-xl p-5 flex gap-3 text-xs text-slate-400 leading-relaxed max-w-full">
          <span className="text-lg">📢</span>
          <div>
            <span className="font-mono text-white tracking-widest uppercase block mb-1 font-bold">TACTICAL HANGAR BRIEFING:</span>
            Modular system installs persist permanently and carry over onto subsequent operations. For scout classes, prioritizing ARMORED HULL integrity is recommended; for heavy titanium frames, engine speed upgrades can offer substantial tactical value.
          </div>
        </div>

      </div>
    </div>
  );
}
