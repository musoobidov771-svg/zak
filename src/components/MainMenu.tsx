import React, { useEffect, useRef, useState } from 'react';
import { Swords, Play, Users, User, Gamepad2, Volume2, VolumeX, Shield, Zap, Target } from 'lucide-react';
import * as THREE from 'three';
import { Team, TankType } from '../types';
import { GameSounds } from '../sounds';

interface MainMenuProps {
  onStartGame: (setup: {
    team: Team;
    tankType: TankType;
    mode: 'SOLO' | 'COOP' | 'VERSUS';
    playerName: string;
    botCount: number;
  }) => void;
  savedPlayerName: string;
}

export default function MainMenu({ onStartGame, savedPlayerName }: MainMenuProps) {
  const [team, setTeam] = useState<Team>('BLUE');
  const [tankType, setTankType] = useState<TankType>('BALANCED');
  const [mode, setMode] = useState<'SOLO' | 'COOP' | 'VERSUS'>('SOLO');
  const [playerName, setPlayerName] = useState(savedPlayerName || 'Jasur_Tankchi');
  const [botCount, setBotCount] = useState(6);
  const [soundOn, setSoundOn] = useState(GameSounds.isEnabled());

  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // 3D spinning tank preview in the menu!
  useEffect(() => {
    if (!canvasRef.current) return;

    const width = canvasRef.current.clientWidth;
    const height = canvasRef.current.clientHeight;

    const scene = new THREE.Scene();
    scene.background = null; // transparent background

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
    camera.position.set(3, 2, 4);
    camera.lookAt(0, 0.3, 0);

    const renderer = new THREE.WebGLRenderer({
      canvas: canvasRef.current,
      alpha: true,
      antialias: true
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    // Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 1.2);
    dirLight.position.set(5, 10, 5);
    scene.add(dirLight);

    // Build a nice detailed mini tank procedurally to match selected configurations!
    const tankGroup = new THREE.Group();
    scene.add(tankGroup);

    const activeColor = team === 'BLUE' ? 0x00a8ff : 0xff4757;
    const secondaryColor = 0x2f3542;
    const treadColor = 0x1e272e;

    // Chassis (Zirh asosi)
    let chassisGeo;
    if (tankType === 'HEAVY') {
      chassisGeo = new THREE.BoxGeometry(1.4, 0.45, 1.2);
    } else if (tankType === 'SCOUT') {
      chassisGeo = new THREE.BoxGeometry(0.9, 0.3, 0.8);
    } else {
      chassisGeo = new THREE.BoxGeometry(1.1, 0.38, 1.0);
    }
    const chassisMat = new THREE.MeshStandardMaterial({ color: activeColor, roughness: 0.3, metalness: 0.6 });
    const chassis = new THREE.Mesh(chassisGeo, chassisMat);
    chassis.position.y = 0.25;
    tankGroup.add(chassis);

    // Treads (Gusenitsalar)
    const treadMat = new THREE.MeshStandardMaterial({ color: treadColor, roughness: 0.9, metalness: 0.1 });
    const leftTread = new THREE.Mesh(
      new THREE.BoxGeometry(chassisGeo.parameters.width + 0.1, chassisGeo.parameters.height + 0.05, 0.22),
      treadMat
    );
    leftTread.position.set(0, 0.22, chassisGeo.parameters.depth / 2);
    const rightTread = leftTread.clone();
    rightTread.position.z = -chassisGeo.parameters.depth / 2;
    tankGroup.add(leftTread, rightTread);

    // Turret (Minora)
    let turretRadius = tankType === 'HEAVY' ? 0.4 : tankType === 'SCOUT' ? 0.25 : 0.33;
    const turretGeo = new THREE.CylinderGeometry(turretRadius, turretRadius * 1.1, 0.25, 8);
    const turretMat = new THREE.MeshStandardMaterial({ color: secondaryColor, roughness: 0.4, metalness: 0.4 });
    const turret = new THREE.Mesh(turretGeo, turretMat);
    turret.position.y = chassis.position.y + chassisGeo.parameters.height / 2 + 0.12;
    tankGroup.add(turret);

    // Cannon Barrel (Dulo)
    let barrelLength = tankType === 'HEAVY' ? 0.9 : tankType === 'SCOUT' ? 0.55 : 0.75;
    let barrelRadius = tankType === 'HEAVY' ? 0.08 : tankType === 'SCOUT' ? 0.04 : 0.06;
    const barrelGeo = new THREE.CylinderGeometry(barrelRadius, barrelRadius, barrelLength, 8);
    barrelGeo.rotateZ(Math.PI / 2); // align forward along X
    barrelGeo.translate(barrelLength / 2, 0, 0);
    const barrel = new THREE.Mesh(barrelGeo, turretMat);
    barrel.position.y = turret.position.y;
    tankGroup.add(barrel);

    // Team Flag status
    const flagPole = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.6), new THREE.MeshBasicMaterial({ color: 0x95a5a6 }));
    flagPole.position.set(-chassisGeo.parameters.width / 3, chassis.position.y + 0.3, 0);
    tankGroup.add(flagPole);

    const flagGeo = new THREE.BoxGeometry(0.2, 0.12, 0.01);
    const flagMat = new THREE.MeshBasicMaterial({ color: activeColor });
    const flagObj = new THREE.Mesh(flagGeo, flagMat);
    flagObj.position.set(-chassisGeo.parameters.width / 3 - 0.1, flagPole.position.y + 0.24, 0);
    tankGroup.add(flagObj);

    // Render loop
    let animationFrameId: number;
    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      tankGroup.rotation.y += 0.015; // rotate preview tank
      renderer.render(scene, camera);
    };
    animate();

    // Resize Handler
    const handleResize = () => {
      if (!canvasRef.current) return;
      const w = canvasRef.current.clientWidth;
      const h = canvasRef.current.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', handleResize);
      renderer.dispose();
      chassisGeo.dispose();
      chassisMat.dispose();
      treadMat.dispose();
      turretGeo.dispose();
      turretMat.dispose();
      barrelGeo.dispose();
      flagGeo.dispose();
      flagMat.dispose();
    };
  }, [team, tankType]);

  const handleSoundToggle = () => {
    const newState = GameSounds.toggleSound();
    setSoundOn(newState);
    if (newState) {
      GameSounds.playPowerUp();
    }
  };

  const launchGame = () => {
    GameSounds.playPowerUp();
    onStartGame({
      team,
      tankType,
      mode,
      playerName: playerName.trim() || 'Jasur_Tankchi',
      botCount
    });
  };

  return (
    <div id="main-menu" className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-6 relative overflow-hidden font-sans select-none">
      
      {/* Background Atmosphere consistent with Immersive UI */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,#1e293b_0%,#020617_100%)] opacity-55 z-0"></div>
      <div className="absolute inset-0 immersive-grid-layer z-0"></div>
      
      {/* Glowing Neon Spotlights to reflect red and blue teams */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-600 rounded-full blur-[130px] opacity-25 pointer-events-none z-0" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-red-600 rounded-full blur-[130px] opacity-25 pointer-events-none z-0" />

      {/* Floating Header UI */}
      <div className="absolute top-4 right-4 flex gap-2 z-10">
        <button
          id="sound-toggle-btn"
          onClick={handleSoundToggle}
          className="bg-slate-900 status-glow hover:bg-slate-800 border border-slate-800 rounded-lg p-3 text-slate-400 hover:text-white transition duration-200 shadow-md flex items-center justify-center cursor-pointer"
          title="Tovushni yoqish/o'chirish"
        >
          {soundOn ? <Volume2 className="h-5 w-5 text-emerald-400" /> : <VolumeX className="h-5 w-5 text-rose-500" />}
        </button>
      </div>

      <div className="w-full max-w-5xl z-10 flex flex-col items-center relative">
        
        {/* Main Title of game */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 bg-slate-900/90 border border-slate-800 rounded-full text-xs font-mono text-cyan-400 tracking-widest uppercase mb-2">
            <Swords className="w-3.5 h-3.5 animate-pulse text-rose-500" /> 3D BATTLE ARENA SIMULATOR
          </div>
          <h1 className="text-5xl md:text-6xl font-black italic tracking-tighter uppercase text-white drop-shadow-[0_4px_12px_rgba(0,0,0,0.8)] leading-none">
            TANKLAR JANGGI
          </h1>
          <p className="text-xs text-slate-400 font-mono tracking-[0.25em] uppercase mt-2.5">
            RED COMMANDERS <span className="text-rose-500 font-bold">VS</span> BLUE STRIKERS
          </p>
        </div>

        {/* Dashboard Grid Container */}
        <div className="w-full grid grid-cols-1 lg:grid-cols-12 gap-6 bg-slate-900/80 border border-slate-800 rounded-2xl p-6 md:p-8 shadow-2xl relative">
          
          {/* Left panel: Customization & Team Selection (7 columns) */}
          <div className="lg:col-span-7 flex flex-col gap-6 justify-between">
            
            {/* Nickname input */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-mono text-slate-400 uppercase tracking-[0.15em] font-bold">
                TANK COMMANDER CALLSIGN:
              </label>
              <input
                id="player-name-input"
                type="text"
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 16))}
                className="bg-slate-950 border border-slate-800 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/20 rounded-xl py-3 px-4 text-white font-mono placeholder:text-slate-600 focus:outline-none transition duration-150 shadow-inner w-full text-lg font-black"
                placeholder="Enter pilot callsgn..."
              />
            </div>

            {/* Team Selector Qizil vs Ko'k */}
            <div>
              <label className="text-xs font-mono text-slate-400 uppercase tracking-[0.15em] block mb-2 font-bold">
                SELECT BATTALION TEAM:
              </label>
              <div className="grid grid-cols-2 gap-4">
                <button
                  id="select-team-blue-btn"
                  onClick={() => { setTeam('BLUE'); GameSounds.playHit(); }}
                  className={`relative overflow-hidden rounded-xl py-4 px-5 border text-left transition duration-200 cursor-pointer ${
                    team === 'BLUE'
                      ? 'bg-blue-950/40 border-blue-500/50 shadow-[0_0_20px_rgba(59,130,246,0.25)] text-blue-100'
                      : 'bg-slate-950/80 border-slate-850 hover:border-slate-700 hover:bg-slate-900/40 text-slate-300'
                  }`}
                >
                  <div className={`absolute top-0 right-0 w-2.5 h-full ${team === 'BLUE' ? 'bg-blue-500 shadow-[0_0_10px_#3b82f6]' : 'bg-transparent'}`} />
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-blue-600/20 border border-blue-500/50 flex items-center justify-center shadow-[0_0_10px_rgba(59,130,246,0.2)]">
                      <Shield className="w-5 h-5 text-blue-400" />
                    </div>
                    <div>
                      <h3 className="font-black italic text-blue-400 tracking-wide text-lg">BLUE STRIKER</h3>
                      <p className="text-[10px] text-slate-400 font-mono">TACTICAL ADVANTAGE</p>
                    </div>
                  </div>
                </button>

                <button
                  id="select-team-red-btn"
                  onClick={() => { setTeam('RED'); GameSounds.playHit(); }}
                  className={`relative overflow-hidden rounded-xl py-4 px-5 border text-left transition duration-200 cursor-pointer ${
                    team === 'RED'
                      ? 'bg-red-950/40 border-red-500/50 shadow-[0_0_20px_rgba(239,68,68,0.25)] text-red-100'
                      : 'bg-slate-950/80 border-slate-850 hover:border-slate-700 hover:bg-slate-900/40 text-slate-300'
                  }`}
                >
                  <div className={`absolute top-0 right-0 w-2.5 h-full ${team === 'RED' ? 'bg-red-500 shadow-[0_0_10px_#ef4444]' : 'bg-transparent'}`} />
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-red-600/20 border border-red-500/50 flex items-center justify-center shadow-[0_0_10px_rgba(239,68,68,0.2)]">
                      <Target className="w-5 h-5 text-red-400" />
                    </div>
                    <div>
                      <h3 className="font-black italic text-red-400 tracking-wide text-lg">RED STALKER</h3>
                      <p className="text-[10px] text-slate-400 font-mono">HIGH IMPACT ATTACK</p>
                    </div>
                  </div>
                </button>
              </div>
            </div>

            {/* Tank Class Selector (Tur) */}
            <div>
              <label className="text-xs font-mono text-slate-400 uppercase tracking-[0.15em] block mb-2 font-bold">
                SELECT ARMORED TANK HULL:
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'BALANCED', label: 'Balanced', desc: 'Standard Core', stat: 'Speed: Medium | Core Armor: Medium' },
                  { id: 'SCOUT', label: 'Scout Strike', desc: 'Lightweight', stat: 'Speed: Extreme | Core Armor: Thin' },
                  { id: 'HEAVY', label: 'Heavy Goliath', desc: 'Titan Mech', stat: 'Speed: Heavy | Core Armor: Reinforced' }
                ].map((item) => (
                  <button
                    key={item.id}
                    onClick={() => { setTankType(item.id as TankType); GameSounds.playHit(); }}
                    className={`rounded-xl p-3 border text-center flex flex-col justify-between transition duration-200 h-24 cursor-pointer ${
                      tankType === item.id
                        ? 'bg-slate-950 border-white text-white shadow-lg shadow-black/80'
                        : 'bg-slate-950/70 border-slate-850 hover:bg-slate-900/40 hover:border-slate-700 text-slate-450'
                    }`}
                  >
                    <span className="font-black tracking-wide block text-white text-sm">{item.label}</span>
                    <span className="text-[9px] font-mono uppercase text-cyan-400 tracking-widest block font-bold">{item.desc}</span>
                    <span className="text-[9px] text-slate-500 leading-tight block">{item.stat}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Game Mode Selector */}
            <div>
              <label className="text-xs font-mono text-slate-400 uppercase tracking-[0.15em] block mb-2 font-bold">
                TACTICAL MISSION DEPLOYMENT:
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'SOLO', label: 'Solo Vanguard', icon: User, desc: 'Lead AI division to victory' },
                  { id: 'COOP', label: 'Dual Squad', icon: Users, desc: 'Shared screen coop with comrade' },
                  { id: 'VERSUS', label: 'War Match 1v1', icon: Swords, desc: 'Split control arena battle' }
                ].map((m) => {
                  const Icon = m.icon;
                  return (
                    <button
                      key={m.id}
                      onClick={() => { setMode(m.id as any); GameSounds.playHit(); }}
                      className={`rounded-xl p-3 border text-left flex flex-col justify-between transition duration-205 h-24 cursor-pointer ${
                        mode === m.id
                          ? 'bg-slate-950 border-cyan-500 shadow-[0_0_15px_rgba(6,182,212,0.25)] text-cyan-200'
                          : 'bg-slate-950/70 border-slate-850 hover:bg-slate-900/40 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex justify-between items-center w-full">
                        <Icon className={`w-4 h-4 ${mode === m.id ? 'text-cyan-400' : 'text-slate-500'}`} />
                        <span className={`text-[8px] font-mono px-1.5 py-0.5 rounded ${mode === m.id ? 'bg-cyan-950/80 text-cyan-300 font-bold' : 'bg-slate-900 text-slate-500'}`}>
                          {m.id}
                        </span>
                      </div>
                      <span className="font-black text-xs tracking-wide text-white block mt-1">{m.label}</span>
                      <span className="text-[9px] text-slate-500 leading-tight block">{m.desc}</span>
                    </button>
                  );
                })}
              </div>
            </div>

          </div>

          {/* Right panel: Live 3D Preview (5 columns) */}
          <div className="lg:col-span-5 flex flex-col gap-4">
            
            {/* Interactive Object Area */}
            <div className="relative flex-1 min-h-[220px] lg:min-h-[280px] bg-slate-950 border border-slate-850 rounded-xl overflow-hidden flex flex-col items-center justify-center p-4">
              <div className="absolute top-3 left-3 flex items-center gap-1.5 pl-2 z-10 bg-slate-900/90 border border-slate-800 py-1 px-2.5 rounded-md">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-500"></span>
                </span>
                <span className="text-[9px] uppercase font-mono tracking-widest text-slate-400 font-bold">3D DESIGN ROTATION MATRIX</span>
              </div>
              
              <canvas ref={canvasRef} className="w-full h-full cursor-grab active:cursor-grabbing" />
              
              {/* Overlay with small stats bar */}
              <div className="absolute bottom-3 inset-x-3 bg-slate-900/95 border border-slate-800 p-2.5 backdrop-blur-sm rounded-lg flex justify-around text-center">
                <div>
                  <span className="text-[9px] text-slate-500 font-mono block uppercase font-bold">ARMOR CAPACITY</span>
                  <span className="text-sm font-bold text-emerald-400 font-mono">
                    {tankType === 'HEAVY' ? '150 HP' : tankType === 'SCOUT' ? '80 HP' : '100 HP'}
                  </span>
                </div>
                <div className="border-r border-slate-800 h-8 self-center" />
                <div>
                  <span className="text-[9px] text-slate-500 font-mono block uppercase font-bold">SPEED THRUST</span>
                  <span className="text-sm font-bold text-amber-500 font-mono">
                    {tankType === 'HEAVY' ? '30 km/s' : tankType === 'SCOUT' ? '60 km/s' : '45 km/s'}
                  </span>
                </div>
                <div className="border-r border-slate-800 h-8 self-center" />
                <div>
                  <span className="text-[9px] text-slate-500 font-mono block uppercase font-bold">SHELL HE_DMG</span>
                  <span className="text-sm font-bold text-rose-500 font-mono">
                    {tankType === 'HEAVY' ? '35 DMG' : tankType === 'SCOUT' ? '15 DMG' : '20 DMG'}
                  </span>
                </div>
              </div>
            </div>

            {/* Bottom options: bots selection */}
            <div className="bg-slate-950 border border-slate-850 flex flex-col justify-center p-4 rounded-xl gap-2">
              <div className="flex justify-between items-center text-xs font-mono text-slate-400">
                <span className="font-bold">TOTAL BOT PARTICIPANTS:</span>
                <span className="text-white bg-slate-900 border border-slate-800 px-2 py-0.5 rounded font-black text-xs font-mono">
                  {botCount} UNITS
                </span>
              </div>
              <input
                id="bot-count-slider"
                type="range"
                min="2"
                max="12"
                step="2"
                value={botCount}
                onChange={(e) => {
                  setBotCount(parseInt(e.target.value));
                  GameSounds.playHit();
                }}
                className="w-full h-1.5 bg-slate-900 rounded-lg appearance-none cursor-pointer accent-cyan-500"
              />
              <div className="flex justify-between text-[8px] text-slate-500 font-mono">
                <span>MIN: 2 UNITS</span>
                <span>RECOMMENDED: 6 UNITS</span>
                <span>MAX: 12 UNITS</span>
              </div>
            </div>

            {/* Launch Action Button */}
            <button
              id="start-battle-launch-btn"
              onClick={launchGame}
              className="bg-gradient-to-r from-red-600 via-indigo-600 to-blue-600 hover:tracking-widest text-white py-4.5 rounded-xl text-xl font-black tracking-wider uppercase transition-all duration-300 transform hover:scale-[1.01] shadow-[0_0_25px_rgba(99,102,241,0.45)] border border-white/10 hover:border-white/30 flex items-center justify-center gap-3 cursor-pointer group"
            >
              <Play className="w-6 h-6 fill-white group-hover:scale-110 transition duration-200" />
              <span>DEPLOY COMBAT MISSION</span>
            </button>

          </div>

        </div>

        {/* Tactical Controls Helper Widget */}
        <div className="w-full mt-6 bg-slate-900/40 border border-slate-800/80 p-5 rounded-xl flex flex-col md:flex-row justify-between gap-4 text-xs select-text">
          
          <div className="flex-1">
            <h4 className="font-black text-cyan-400 uppercase tracking-widest font-sans flex items-center gap-1.5 mb-2 border-b border-slate-800/80 pb-1.5">
              <Gamepad2 className="w-4 h-4 text-cyan-400" /> PLAYER 1 COGNITIVE CONSOLE
            </h4>
            <p className="text-slate-400 leading-relaxed font-mono">
              <span className="text-white px-1.5 py-0.5 rounded bg-slate-950 border border-slate-800 mr-1.5 font-bold">W / A / S / D</span> navigate armored chassis.<br />
              <span className="text-white px-1.5 py-0.5 rounded bg-slate-950 border border-slate-800 mr-1.5 font-bold">MOUSE</span> turret rotational azimuth pointer (aim).<br />
              <span className="text-white px-1.5 py-0.5 rounded bg-slate-950 border border-slate-800 mr-1.5 font-bold">LEFT CLICK / SPACE</span> deploy heavy ammunition.
            </p>
          </div>

          <div className="md:border-r border-slate-800 my-1 md:my-0 md:mx-4" />

          <div className="flex-1">
            <h4 className="font-black text-rose-400 uppercase tracking-widest font-sans flex items-center gap-1.5 mb-2 border-b border-slate-800/80 pb-1.5">
              <Gamepad2 className="w-4 h-4 text-rose-400" /> PLAYER 2 COGNITIVE CONSOLE {mode === 'SOLO' && <span className="text-[10px] text-slate-500 font-normal tracking-wide italic lowercase">(standby)</span>}
            </h4>
            <p className="text-slate-400 leading-relaxed font-mono">
              <span className="text-white px-1.5 py-0.5 rounded bg-slate-950 border border-slate-800 mr-1.5 font-bold">↑ / ↓ / ← / →</span> navigate secondary chassis.<br />
              <span className="text-white px-1.5 py-0.5 rounded bg-slate-950 border border-slate-800 mr-1.5 font-bold">ENTER / NUM 0</span> discharge secondary cannon.<br />
              <span className="text-white px-1.5 py-0.5 rounded bg-slate-950 border border-slate-850 mr-1.5 font-bold">[ / ]</span> rotate turret azimuth manually.
            </p>
          </div>

        </div>

      </div>
    </div>
  );
}
