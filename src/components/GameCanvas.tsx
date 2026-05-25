import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { Tank, Bullet, PowerUp, Obstacle, Particle, Team, WeaponType, GameLog, Upgrades, TankType } from '../types';
import { GameSounds } from '../sounds';

interface GameCanvasProps {
  playerSetup: {
    team: Team;
    tankType: TankType;
    mode: 'SOLO' | 'COOP' | 'VERSUS';
    playerName: string;
    botCount: number;
  };
  upgrades: Upgrades;
  isPaused: boolean;
  onUpdateScores: (red: number, blue: number) => void;
  onAddLog: (log: GameLog) => void;
  onAwardPoints: (points: number) => void;
  onMatchFinished: (winner: Team, matchStats: any, pointsAwarded: number) => void;
  onUpdatePlayers: (player1: Tank | null, player2: Tank | null) => void;
}

export default function GameCanvas({
  playerSetup,
  upgrades,
  isPaused,
  onUpdateScores,
  onAddLog,
  onAwardPoints,
  onMatchFinished,
  onUpdatePlayers
}: GameCanvasProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Use refs to store active mutable state for the deep high-frequency 60fps loop references
  const stateRef = useRef<{
    tanks: Tank[];
    bullets: Bullet[];
    powerUps: PowerUp[];
    obstacles: Obstacle[];
    particles: Particle[];
    scores: { RED: number; BLUE: number };
    logs: GameLog[];
    playerKeys: { [key: string]: boolean };
    mousePos: { x: number; y: number };
    canvasSize: { width: number; height: number };
    lastTime: number;
    screenShake: number;
    matchEnded: boolean;
    frameNum: number;
  }>({
    tanks: [],
    bullets: [],
    powerUps: [],
    obstacles: [],
    particles: [],
    scores: { RED: 0, BLUE: 0 },
    logs: [],
    playerKeys: {},
    mousePos: { x: 0, y: 0 },
    canvasSize: { width: 800, height: 600 },
    lastTime: 0,
    screenShake: 0,
    matchEnded: false,
    frameNum: 0
  });

  // Keep a record of ThreeJS elements so we can clean up easily or update meshes dynamically
  const threeRef = useRef<{
    scene: THREE.Scene | null;
    camera: THREE.PerspectiveCamera | null;
    renderer: THREE.WebGLRenderer | null;
    tankMeshes: { [tankId: string]: THREE.Group };
    bulletMeshes: { [bulletId: string]: THREE.Mesh | THREE.Group };
    powerUpMeshes: { [powerUpId: string]: THREE.Group };
    obstacleMeshes: { [obstacleId: string]: THREE.Group | THREE.Mesh };
    particleMeshes: { [particleId: string]: THREE.Mesh | THREE.Points };
    lights: { ambient: THREE.AmbientLight; directional: THREE.DirectionalLight };
    ground: THREE.Mesh | null;
  }>({
    scene: null,
    camera: null,
    renderer: null,
    tankMeshes: {},
    bulletMeshes: {},
    powerUpMeshes: {},
    obstacleMeshes: {},
    particleMeshes: {},
    lights: {} as any,
    ground: null
  });

  // Arena Grid Metrics
  const ARENA_SIZE = 160; 

  useEffect(() => {
    if (!canvasRef.current || !containerRef.current) return;

    // --- 1. INITIALIZE THREE.JS RENDERING ---
    const width = containerRef.current.clientWidth;
    const height = containerRef.current.clientHeight;
    stateRef.current.canvasSize = { width, height };

    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x020617, 0.015); // soft slate ambient fog
    threeRef.current.scene = scene;

    const camera = new THREE.PerspectiveCamera(50, width / height, 0.1, 500);
    camera.position.set(0, 30, 22);
    threeRef.current.camera = camera;

    const renderer = new THREE.WebGLRenderer({
      canvas: canvasRef.current,
      antialias: true,
      powerPreference: "high-performance"
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    threeRef.current.renderer = renderer;

    // --- 2. LIGHTS AND SHADOWS ---
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 1.3);
    dirLight.position.set(40, 80, 40);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 1024;
    dirLight.shadow.mapSize.height = 1024;
    dirLight.shadow.camera.near = 10;
    dirLight.shadow.camera.far = 200;
    dirLight.shadow.camera.left = -90;
    dirLight.shadow.camera.right = 90;
    dirLight.shadow.camera.top = 90;
    dirLight.shadow.camera.bottom = -90;
    scene.add(dirLight);
    threeRef.current.lights = { ambient: ambientLight, directional: dirLight };

    // --- 3. FLOOR AND MAP GEOMETRY ---
    // Ground with dark grid pattern
    const groundGeo = new THREE.PlaneGeometry(ARENA_SIZE, ARENA_SIZE, 40, 40);
    // Add small hills/bumps in terrain
    const pos = groundGeo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const vx = pos.getX(i);
      const vy = pos.getY(i);
      // create interesting dunes
      const zValue = Math.sin(vx * 0.08) * Math.cos(vy * 0.08) * 0.8 + Math.cos(vx * 0.02) * Math.sin(vy * 0.02) * 2;
      pos.setZ(i, zValue);
    }
    groundGeo.computeVertexNormals();

    const groundMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      roughness: 0.8,
      metalness: 0.1,
      flatShading: true
    });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    scene.add(ground);
    threeRef.current.ground = ground;

    // Create a beautiful circular floor boundary line
    const borderMat = new THREE.MeshBasicMaterial({ color: 0xffffff, wireframe: true, transparent: true, opacity: 0.05 });
    const borderLimit = new THREE.Mesh(new THREE.CylinderGeometry(ARENA_SIZE / 2, ARENA_SIZE / 2, 2, 32, 1, true), borderMat);
    scene.add(borderLimit);

    // --- 4. POPULATE MAP LEVEL LAYOUT (Obstacles, Bases) ---
    const obstacles: Obstacle[] = [];
    const seedObstacles = () => {
      // Clean up meshes
      Object.values(threeRef.current.obstacleMeshes).forEach(m => scene.remove(m as THREE.Object3D));
      threeRef.current.obstacleMeshes = {};

      // Adding 2 bases (Base locations: Red base at (-60, -60), Blue base at (60, 60))
      obstacles.push({
        id: 'base_red',
        type: 'BASE',
        x: -55,
        z: -55,
        radius: 8
      });
      obstacles.push({
        id: 'base_blue',
        type: 'BASE',
        x: 55,
        z: 55,
        radius: 8
      });

      // Construct Rocks & Destructible Boxes
      const generateObstacleAt = (x: number, z: number, r: number, type: 'ROCK' | 'BOX' | 'TREE') => {
        const id = `obs_${type.toLowerCase()}_${obstacles.length}_${Math.random().toString(36).substr(2, 4)}`;
        const obs: Obstacle = {
          id,
          type,
          x,
          z,
          radius: r,
          hp: type === 'BOX' ? 60 : undefined,
          maxHp: type === 'BOX' ? 60 : undefined
        };
        obstacles.push(obs);

        const group = new THREE.Group();
        group.position.set(x, 0, z);

        if (type === 'ROCK') {
          // Bumpy rock formations
          const rockGeo = new THREE.DodecahedronGeometry(r, 1);
          const rockMat = new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.9, flatShading: true });
          const mesh = new THREE.Mesh(rockGeo, rockMat);
          mesh.scale.set(1, 0.4 + Math.random() * 0.8, 1);
          mesh.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, 0);
          mesh.castShadow = true;
          mesh.receiveShadow = true;
          group.add(mesh);
        } else if (type === 'BOX') {
          // Destructible brick boxes
          const boxGeo = new THREE.BoxGeometry(r * 1.8, r * 1.8, r * 1.8);
          // Dark military style box
          const boxMat = new THREE.MeshStandardMaterial({ color: 0x7c2d12, roughness: 0.7, metalness: 0.4 });
          const mesh = new THREE.Mesh(boxGeo, boxMat);
          mesh.position.y = r * 0.9;
          mesh.castShadow = true;
          mesh.receiveShadow = true;
          group.add(mesh);

          // Add simple yellow striped warning decor mesh
          const stripeGeo = new THREE.BoxGeometry(r * 1.82, r * 0.2, r * 1.82);
          const stripeMat = new THREE.MeshBasicMaterial({ color: 0xf59e0b });
          const stripe = new THREE.Mesh(stripeGeo, stripeMat);
          stripe.position.y = r * 0.9;
          group.add(stripe);
        } else if (type === 'TREE') {
          // Pine tree meshes
          const trunkGeo = new THREE.CylinderGeometry(0.3, 0.5, r * 1.2, 5);
          const trunkMat = new THREE.MeshStandardMaterial({ color: 0x78350f });
          const trunk = new THREE.Mesh(trunkGeo, trunkMat);
          trunk.position.y = r * 0.6;
          trunk.castShadow = true;
          group.add(trunk);

          const leavesGeo = new THREE.ConeGeometry(r * 1.2, r * 2.8, 6);
          const leavesMat = new THREE.MeshStandardMaterial({ color: 0x064e3b, roughness: 0.8, flatShading: true });
          const leaves = new THREE.Mesh(leavesGeo, leavesMat);
          leaves.position.y = r * 2.4;
          leaves.castShadow = true;
          group.add(leaves);
        }

        scene.add(group);
        threeRef.current.obstacleMeshes[id] = group;
      };

      // Lay bases decor flags
      const buildFlag = (x: number, z: number, team: Team) => {
        const flagGroup = new THREE.Group();
        flagGroup.position.set(x, 0, z);

        const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 9), new THREE.MeshStandardMaterial({ color: 0xd1d5db, metalness: 0.8 }));
        pole.position.y = 4.5;
        pole.castShadow = true;
        flagGroup.add(pole);

        const bannerGeo = new THREE.BoxGeometry(2.4, 1.4, 0.05);
        const bannerMat = new THREE.MeshStandardMaterial({ color: team === 'RED' ? 0xef4444 : 0x3b82f6 });
        const banner = new THREE.Mesh(bannerGeo, bannerMat);
        banner.position.set(-1.2, 8, 0);
        banner.castShadow = true;
        flagGroup.add(banner);

        // light ring pad underneath flag
        const ringGeo = new THREE.RingGeometry(5, 5.5, 32);
        ringGeo.rotateX(-Math.PI / 2);
        const ringMat = new THREE.MeshBasicMaterial({ color: team === 'RED' ? 0xff0000 : 0x0000ff, side: THREE.DoubleSide, transparent: true, opacity: 0.4 });
        const ring = new THREE.Mesh(ringGeo, ringMat);
        ring.position.y = 0.05;
        flagGroup.add(ring);

        scene.add(flagGroup);
        threeRef.current.obstacleMeshes[`base_flag_${team}`] = flagGroup;
      };

      buildFlag(-55, -55, 'RED');
      buildFlag(55, 55, 'BLUE');

      // Place random rocks, destructible barriers, trees around
      // Outer border blocks to block out of map movement
      const addFortWalls = () => {
        const count = 35;
        for (let i = 0; i < count; i++) {
          const angle = (i / count) * Math.PI * 2;
          const mapRadius = ARENA_SIZE / 2 - 4;
          const x = Math.cos(angle) * mapRadius;
          const z = Math.sin(angle) * mapRadius;
          generateObstacleAt(x, z, 3.5 + Math.random() * 2, 'ROCK');
        }
      };
      addFortWalls();

      // Scattered inner clutter, avoiding bases
      const clutterCoords = [
        { x: -30, z: -10, r: 3.5, type: 'ROCK' as const },
        { x: -20, z: -35, r: 2.2, type: 'TREE' as const },
        { x: -35, z: -25, r: 2.8, type: 'BOX' as const },
        { x: 20, z: -20, r: 4.0, type: 'ROCK' as const },
        { x: 35, z: -35, r: 3.0, type: 'BOX' as const },
        { x: -10, z: 25, r: 3.5, type: 'ROCK' as const },
        { x: -25, z: 45, r: 2.5, type: 'TREE' as const },
        { x: 15, z: 30, r: 2.8, type: 'BOX' as const },
        { x: 30, z: 15, r: 2.4, type: 'TREE' as const },
        { x: 0, z: -55, r: 3.8, type: 'ROCK' as const },
        { x: -55, z: 0, r: 3.5, type: 'ROCK' as const },
        { x: 55, z: 0, r: 3.5, type: 'BOX' as const },
        { x: 0, z: 55, r: 3.8, type: 'ROCK' as const },
        // Central strategic covers
        { x: 0, z: 0, r: 4.5, type: 'ROCK' as const },
        { x: -12, z: -12, r: 2.5, type: 'BOX' as const },
        { x: 12, z: 12, r: 2.5, type: 'BOX' as const },
        { x: -12, z: 12, r: 2.0, type: 'TREE' as const },
        { x: 12, z: -12, r: 2.0, type: 'TREE' as const }
      ];

      clutterCoords.forEach(c => generateObstacleAt(c.x, c.z, c.r, c.type));
    };

    seedObstacles();
    stateRef.current.obstacles = obstacles;

    // --- 5. INITIALIZE PLAYERS AND COMPUTOR AI TANKS ---
    const buildTanks = () => {
      // Clean up meshes
      Object.values(threeRef.current.tankMeshes).forEach(m => scene.remove(m as THREE.Object3D));
      threeRef.current.tankMeshes = {};

      const list: Tank[] = [];

      // Calculate Player Attributes based on chosen class & garage upgrades level!
      const calculateStats = (tType: TankType, isPl: boolean) => {
        let maxHP = 100;
        let speedMult = 1.0;
        let damageMult = 1.0;
        let reloadCoold = 900; // ms between fires

        if (tType === 'HEAVY') {
          maxHP = 150;
          speedMult = 0.7;
          damageMult = 1.6;
          reloadCoold = 1400;
        } else if (tType === 'SCOUT') {
          maxHP = 80;
          speedMult = 1.35;
          damageMult = 0.7;
          reloadCoold = 600;
        }

        // Apply Garage Upgrades if it's the player!
        if (isPl) {
          maxHP += upgrades.maxHealthLevel * 20;
          speedMult += upgrades.engineSpeedLevel * 0.12;
          damageMult += upgrades.damageLevel * 0.18;
          reloadCoold -= upgrades.reloadSpeedLevel * 90; // faster reloading
        }

        return { maxHP, speedMult, damageMult, reloadCoold };
      };

      // Player 1 Initial setup
      const p1Stats = calculateStats(playerSetup.tankType, true);
      const player1: Tank = {
        id: 'player1',
        name: playerSetup.playerName,
        type: playerSetup.tankType,
        team: playerSetup.team,
        isPlayer: true,
        playerIndex: 1,
        // Players spawn on their respective team side bases
        x: playerSetup.team === 'BLUE' ? 50 : -50,
        z: playerSetup.team === 'BLUE' ? 50 : -50,
        y: 0,
        rotation: playerSetup.team === 'BLUE' ? Math.PI * 1.25 : Math.PI * 0.25,
        turretRotation: 0,
        speed: 0,
        targetSpeed: 0,
        velocity: { x: 0, z: 0 },
        health: p1Stats.maxHP,
        maxHealth: p1Stats.maxHP,
        shield: 30 + upgrades.maxShieldLevel * 15,
        maxShield: 30 + upgrades.maxShieldLevel * 15,
        fireCooldown: 0,
        maxFireCooldown: p1Stats.reloadCoold,
        activeWeapon: 'STANDARD',
        ammo: 0,
        score: 0,
        kills: 0,
        deaths: 0
      };
      list.push(player1);

      // Add Player 2 if is in coop/versus mode
      if (playerSetup.mode !== 'SOLO') {
        const p2Team: Team = playerSetup.mode === 'COOP' ? playerSetup.team : (playerSetup.team === 'BLUE' ? 'RED' : 'BLUE');
        const p2Class: TankType = 'BALANCED'; // standard defaults for Player 2
        const p2Stats = calculateStats(p2Class, false); // no upgrades defaults for local player 2 initially
        const player2: Tank = {
          id: 'player2',
          name: 'Doʻst_Koshifi',
          type: p2Class,
          team: p2Team,
          isPlayer: true,
          playerIndex: 2,
          x: p2Team === 'BLUE' ? 58 : -58,
          z: p2Team === 'BLUE' ? 50 : -50,
          y: 0,
          rotation: p2Team === 'BLUE' ? Math.PI * 1.25 : Math.PI * 0.25,
          turretRotation: 0,
          speed: 0,
          targetSpeed: 0,
          velocity: { x: 0, z: 0 },
          health: p2Stats.maxHP,
          maxHealth: p2Stats.maxHP,
          shield: 40,
          maxShield: 40,
          fireCooldown: 0,
          maxFireCooldown: p2Stats.reloadCoold,
          activeWeapon: 'STANDARD',
          ammo: 0,
          score: 0,
          kills: 0,
          deaths: 0
        };
        list.push(player2);
      }

      // Build AI Commander Bots around
      const totalBots = playerSetup.botCount;
      const blueBotsCount = playerSetup.mode === 'COOP' ? Math.floor(totalBots / 2) - 1 : (playerSetup.team === 'BLUE' ? Math.floor(totalBots / 2) - 1 : Math.ceil(totalBots / 2));
      const redBotsCount = playerSetup.mode === 'COOP' ? Math.ceil(totalBots / 2) : (playerSetup.team === 'RED' ? Math.floor(totalBots / 2) - 1 : Math.ceil(totalBots / 2));

      // helper for random offsets
      const rOffset = () => Math.random() * 26 - 13;

      const addBot = (botTeam: Team, idx: number) => {
        const classes: TankType[] = ['BALANCED', 'SCOUT', 'HEAVY'];
        const rStyle = classes[Math.floor(Math.random() * classes.length)];
        const bStats = calculateStats(rStyle, false);

        const botId = `bot_${botTeam.toLowerCase()}_${idx}`;
        const startX = botTeam === 'BLUE' ? 45 + rOffset() : -45 + rOffset();
        const startZ = botTeam === 'BLUE' ? 45 + rOffset() : -45 + rOffset();

        const bot: Tank = {
          id: botId,
          name: `${botTeam === 'BLUE' ? 'Koʻk' : 'Qizil'}_Boʻri_${idx}`,
          type: rStyle,
          team: botTeam,
          isPlayer: false,
          x: startX,
          z: startZ,
          y: 0,
          rotation: Math.random() * Math.PI * 2,
          turretRotation: 0,
          speed: 0,
          targetSpeed: 0,
          velocity: { x: 0, z: 0 },
          health: bStats.maxHP,
          maxHealth: bStats.maxHP,
          shield: 25,
          maxShield: 25,
          fireCooldown: 0,
          maxFireCooldown: bStats.reloadCoold + Math.random() * 300,
          activeWeapon: 'STANDARD',
          ammo: 0,
          aiState: 'PATROL',
          aiTargetId: null,
          aiNextDecisionTime: 0,
          score: 0,
          kills: 0,
          deaths: 0
        };
        list.push(bot);
      };

      // fill lists
      for (let i = 0; i < Math.max(1, redBotsCount); i++) addBot('RED', i + 1);
      for (let i = 0; i < Math.max(1, blueBotsCount); i++) addBot('BLUE', i + 1);

      // Construct visual Three.js models for each spawned tank!
      list.forEach(t => spawnTankVisual(t));
      stateRef.current.tanks = list;
    };

    const spawnTankVisual = (t: Tank) => {
      const activeColor = t.team === 'BLUE' ? 0x00a8ff : 0xff4757;
      const secondaryColor = 0x334155; // carbon gray components
      const treadColor = 0x0f172a; // dark tires

      const tankGroup = new THREE.Group();
      tankGroup.position.set(t.x, 0, t.z);
      tankGroup.rotation.y = t.rotation;

      // Chassis body
      let w = 2.4, h = 0.8, d = 2.0;
      if (t.type === 'HEAVY') { w = 2.9; h = 1.0; d = 2.5; }
      if (t.type === 'SCOUT') { w = 1.95; h = 0.65; d = 1.6; }

      const bodyGeo = new THREE.BoxGeometry(w, h, d);
      const bodyMat = new THREE.MeshStandardMaterial({ color: activeColor, roughness: 0.4, metalness: 0.5 });
      const body = new THREE.Mesh(bodyGeo, bodyMat);
      body.position.y = h / 2 + 0.3; // lift off treads
      body.castShadow = true;
      body.receiveShadow = true;
      tankGroup.add(body);

      // Tread blocks left and right
      const treadMat = new THREE.MeshStandardMaterial({ color: treadColor, roughness: 0.8 });
      const leftT = new THREE.Mesh(new THREE.BoxGeometry(w + 0.3, h + 0.1, 0.45), treadMat);
      leftT.position.set(0, h / 2 + 0.1, d / 2 + 0.1);
      leftT.castShadow = true;
      leftT.receiveShadow = true;

      const rightT = leftT.clone();
      rightT.position.z = -(d / 2 + 0.1);

      tankGroup.add(leftT, rightT);

      // Rotating turret container
      let tRad = t.type === 'HEAVY' ? 0.8 : t.type === 'SCOUT' ? 0.45 : 0.65;
      const turretGeo = new THREE.CylinderGeometry(tRad, tRad * 1.1, 0.5, 8);
      const turretMat = new THREE.MeshStandardMaterial({ color: secondaryColor, roughness: 0.3, metalness: 0.6 });
      const turretSub = new THREE.Mesh(turretGeo, turretMat);
      turretSub.position.y = body.position.y + h / 2 + 0.25;
      turretSub.castShadow = true;
      
      const turretAnchor = new THREE.Group();
      turretAnchor.position.y = turretSub.position.y;
      turretSub.position.y = 0; // reset local Y pivot inside turret group anchor
      turretAnchor.add(turretSub);

      // Long fire barrel / Cannon
      let bLen = t.type === 'HEAVY' ? 2.3 : t.type === 'SCOUT' ? 1.3 : 1.75;
      let bRad = t.type === 'HEAVY' ? 0.15 : t.type === 'SCOUT' ? 0.08 : 0.11;
      const barrelGeo = new THREE.CylinderGeometry(bRad, bRad, bLen, 8);
      barrelGeo.rotateZ(Math.PI / 2); // align forward along X
      barrelGeo.translate(bLen / 2, 0, 0); // shift pivot to back
      const barrel = new THREE.Mesh(barrelGeo, turretMat);
      barrel.position.set(tRad * 0.8, 0, 0); // attach onto side of turret dome
      barrel.castShadow = true;
      turretAnchor.add(barrel);

      tankGroup.add(turretAnchor);

      // Floating status healthbar on bot tanks if requested, or just names for player
      // Flag on tank
      const flagPole = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 1.2), new THREE.MeshBasicMaterial({ color: 0x94a3b8 }));
      flagPole.position.set(-w / 2.5, body.position.y + 0.6, 0);
      tankGroup.add(flagPole);

      const flag = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.24, 0.02), new THREE.MeshBasicMaterial({ color: activeColor }));
      flag.position.set(-w / 2.5 - 0.2, flagPole.position.y + 0.48, 0);
      tankGroup.add(flag);

      // Save references
      scene.add(tankGroup);
      threeRef.current.tankMeshes[t.id] = tankGroup;
    };

    buildTanks();

    // Spawn engine sound idling
    GameSounds.startEngine();

    // --- 6. FLOATING WEAPONS AND POWER-UPS SPAWNER ---
    const spawnPowerUp = () => {
      if (stateRef.current.matchEnded || isPaused) return;

      const activeList = stateRef.current.powerUps.filter(p => !p.collected);
      if (activeList.length >= 5) return; // cap floating elements

      const pUpTypes: PowerUp['type'][] = ['HEALTH', 'SHIELD', 'WEAPON_TRIPLE', 'WEAPON_PLASMA', 'SPEED_BOOST'];
      const rType = pUpTypes[Math.floor(Math.random() * pUpTypes.length)];

      const padding = 20;
      const rx = (Math.random() * (ARENA_SIZE - padding * 2)) - (ARENA_SIZE / -2) - padding;
      const r_angle = Math.random() * Math.PI * 2;
      const dist = Math.random() * (ARENA_SIZE / 2 - 25);
      const px = Math.cos(r_angle) * dist;
      const pz = Math.sin(r_angle) * dist;

      const pId = `pup_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`;

      const powerUpItem: PowerUp = {
        id: pId,
        type: rType,
        x: px,
        z: pz,
        y: 1.0,
        pulseTime: Math.random() * 10,
        collected: false
      };

      stateRef.current.powerUps.push(powerUpItem);

      // Make matching beautiful glowing 3D floats
      const itemGroup = new THREE.Group();
      itemGroup.position.set(px, 1.2, pz);

      let itemMat;
      let shapeMesh;

      if (rType === 'HEALTH') {
        const boxGeo = new THREE.BoxGeometry(0.8, 0.8, 0.8);
        itemMat = new THREE.MeshStandardMaterial({ color: 0x10b981, roughness: 0.1, emissive: 0x047857 });
        shapeMesh = new THREE.Mesh(boxGeo, itemMat);
      } else if (rType === 'SHIELD') {
        const blockGeo = new THREE.DodecahedronGeometry(0.7);
        itemMat = new THREE.MeshStandardMaterial({ color: 0x3b82f6, roughness: 0.1, emissive: 0x1d4ed8 });
        shapeMesh = new THREE.Mesh(blockGeo, itemMat);
      } else if (rType === 'WEAPON_TRIPLE') {
        const cylinderGeo = new THREE.CylinderGeometry(0.5, 0.5, 0.9, 5);
        itemMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b, roughness: 0.2, emissive: 0xb45309 });
        shapeMesh = new THREE.Mesh(cylinderGeo, itemMat);
        shapeMesh.rotation.z = Math.PI / 4;
      } else if (rType === 'WEAPON_PLASMA') {
        const sphereGeo = new THREE.SphereGeometry(0.55, 12, 12);
        itemMat = new THREE.MeshStandardMaterial({ color: 0xa855f7, roughness: 0.1, emissive: 0x6b21a8 });
        shapeMesh = new THREE.Mesh(sphereGeo, itemMat);
      } else { // SPEED BOOST
        const coneGeo = new THREE.ConeGeometry(0.5, 1.0, 5);
        itemMat = new THREE.MeshStandardMaterial({ color: 0xec4899, roughness: 0.1, emissive: 0xbe185d });
        shapeMesh = new THREE.Mesh(coneGeo, itemMat);
        shapeMesh.rotation.x = Math.PI;
      }

      // Floating support light ring under pup
      const supportLight = new THREE.PointLight(itemMat.color.getHex(), 1.0, 6);
      supportLight.position.y = 0.5;
      itemGroup.add(supportLight);

      shapeMesh.castShadow = true;
      itemGroup.add(shapeMesh);

      scene.add(itemGroup);
      threeRef.current.powerUpMeshes[pId] = itemGroup;
    };

    // Pre-seed some powerups
    for (let k = 0; k < 3; k++) spawnPowerUp();
    const powerUpsTimer = setInterval(spawnPowerUp, 7000);

    // --- 7. BIND USER KEY EVENTS ---
    const handleKeyDown = (e: KeyboardEvent) => {
      stateRef.current.playerKeys[e.key.toLowerCase()] = true;
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      stateRef.current.playerKeys[e.key.toLowerCase()] = false;
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    // Bind mouse turret tracking
    const handleMouseMove = (e: MouseEvent) => {
      const rect = canvasRef.current?.getBoundingClientRect();
      if (!rect) return;
      stateRef.current.mousePos = {
        x: ((e.clientX - rect.left) / rect.width) * 2 - 1,
        y: -((e.clientY - rect.top) / rect.height) * 2 + 1
      };
    };

    const handleMouseDown = () => {
      // Fire Player 1 gun on mouseclick
      triggerPlayerShoot('player1');
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mousedown', handleMouseDown);

    // --- 8. GLOBAL MAIN ANIMATION LOGIC ENGINE (60 FPS STABLE) ---
    const gameSimulationTick = (timestamp: number) => {
      if (stateRef.current.matchEnded) return;

      requestAnimationFrame(gameSimulationTick);

      if (isPaused) {
        stateRef.current.lastTime = timestamp;
        return;
      }

      if (stateRef.current.lastTime === 0) stateRef.current.lastTime = timestamp;
      const dt = Math.min((timestamp - stateRef.current.lastTime) / 1000, 0.1); // cap deltaTime
      stateRef.current.lastTime = timestamp;

      updatePhysicsAndAI(dt);
      updateThreeMeshes(dt);
    };

    requestAnimationFrame(gameSimulationTick);

    // Cleanup routines
    return () => {
      clearInterval(powerUpsTimer);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mousedown', handleMouseDown);
      GameSounds.stopEngine();
      renderer.dispose();
    };
  }, [playerSetup, upgrades, isPaused]);

  // Handle shooting trigger for a slot
  const triggerPlayerShoot = (tankId: string) => {
    if (isPaused || stateRef.current.matchEnded) return;
    const tanks = stateRef.current.tanks;
    const t = tanks.find(x => x.id === tankId);
    if (!t || t.health <= 0 || t.fireCooldown > 0) return;

    fireBullet(t);
  };

  // Shoot Bullet math calculations & sound triggers
  const fireBullet = (t: Tank) => {
    // Reset cooldown
    t.fireCooldown = t.maxFireCooldown;

    // Bullet physics launch parameters
    let speed = 40;
    let diameter = 0.28;
    let dmg = 20;
    let life = 1800; // ms

    if (t.type === 'HEAVY') { dmg = 35; speed = 34; }
    if (t.type === 'SCOUT') { dmg = 12; speed = 50; }

    // Apply weapons boost parameters
    if (t.activeWeapon === 'HEAVY') {
      dmg *= 2.0;
      diameter *= 1.8;
      speed *= 0.8;
    } else if (t.activeWeapon === 'PLASMA') {
      dmg *= 1.35;
      diameter *= 1.3;
      speed *= 1.2;
    }

    // Apply Player-specific raw upgrade damage modifier
    if (t.isPlayer) {
      dmg += upgrades.damageLevel * 4;
    }

    const angle = t.rotation + t.turretRotation;
    const barrelLength = t.type === 'HEAVY' ? 3.1 : t.type === 'SCOUT' ? 1.55 : 2.2;
    
    // Shoot location (edge of muzzle barrel tip)
    const bulletX = t.x + Math.cos(angle) * barrelLength;
    const bulletZ = t.z - Math.sin(angle) * barrelLength;

    const playAudioStyle = t.activeWeapon === 'STANDARD' 
      ? (t.type === 'HEAVY' ? 'HEAVY' : 'STANDARD') 
      : t.activeWeapon;

    GameSounds.playShoot(playAudioStyle as any);

    const createProj = (dirAngle: number) => {
      const bId = `b_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`;
      const bullet: Bullet = {
        id: bId,
        ownerId: t.id,
        ownerTeam: t.team,
        weaponType: t.activeWeapon,
        x: bulletX,
        z: bulletZ,
        y: turretHeight(t),
        vx: Math.cos(dirAngle) * speed,
        vz: -Math.sin(dirAngle) * speed,
        vy: t.activeWeapon === 'HEAVY' ? 1.5 : 0, // slight parabolic trajectory for heavy arcs
        gravity: t.activeWeapon === 'HEAVY' ? -3.0 : 0,
        radius: diameter,
        damage: dmg,
        life: life,
        maxLife: life
      };

      stateRef.current.bullets.push(bullet);

      // Generate 3D tracer bullet mesh
      const bGeo = new THREE.SphereGeometry(diameter, 8, 8);
      const bColor = t.team === 'BLUE' ? 0x00f0ff : 0xff4000;
      const bMat = new THREE.MeshBasicMaterial({ color: bColor });
      const bMesh = new THREE.Mesh(bGeo, bMat);
      bMesh.position.set(bulletX, bullet.y, bulletZ);
      
      // glowing tracer light
      const tracerLight = new THREE.PointLight(bColor, 0.8, 4);
      bMesh.add(tracerLight);

      threeRef.current.scene?.add(bMesh);
      threeRef.current.bulletMeshes[bId] = bMesh;
    };

    if (t.activeWeapon === 'TRIPLE') {
      createProj(angle - 0.15); // left
      createProj(angle);        // center
      createProj(angle + 0.15); // right
      
      t.ammo = Math.max(0, t.ammo - 1);
      if (t.ammo <= 0) t.activeWeapon = 'STANDARD';
    } else {
      createProj(angle);
      
      if (t.activeWeapon !== 'STANDARD') {
        t.ammo = Math.max(0, t.ammo - 1);
        if (t.ammo <= 0) t.activeWeapon = 'STANDARD';
      }
    }

    // Spawn gunpowder puff smoke particle
    spawnImpactParticles(bulletX, turretHeight(t), bulletZ, 'SMOKE', t.team === 'BLUE' ? '#60a5fa' : '#f87171', 8);
    // Recoil shock screenshake
    if (t.isPlayer) stateRef.current.screenShake = t.type === 'HEAVY' ? 12 : 5;
  };

  const turretHeight = (t: Tank) => {
    let baseH = 0.8;
    if (t.type === 'HEAVY') baseH = 1.0;
    if (t.type === 'SCOUT') baseH = 0.65;
    return baseH + 0.5;
  };

  // --- PHYSICS TRIGGERS & PATHFINDERS UPDATES ---
  const updatePhysicsAndAI = (dt: number) => {
    const state = stateRef.current;
    
    // 1. Screenshake shake modifier decay
    if (state.screenShake > 0) {
      state.screenShake -= dt * 35;
      if (state.screenShake < 0) state.screenShake = 0;
    }

    // 2. Cooldown timer ticks for active special elements
    state.tanks.forEach(t => {
      if (t.health <= 0) return;
      if (t.fireCooldown > 0) t.fireCooldown = Math.max(0, t.fireCooldown - dt * 1000);
      
      // Auto shield reconditioning passive
      if (t.shield < t.maxShield) {
        // Slow recovery: Player gets faster from upgrade levels!
        const regenFactor = t.isPlayer ? (0.2 + upgrades.maxShieldLevel * 0.1) : 0.25;
        t.shield = Math.min(t.maxShield, t.shield + dt * 10 * regenFactor);
      }
    });

    // 3. User WASD movement parsing (Player 1)
    const p1 = state.tanks.find(t => t.id === 'player1');
    if (p1 && p1.health > 0) {
      let turnInput = 0;
      let driveInput = 0;

      if (state.playerKeys['w'] || state.playerKeys['arrowup']) driveInput = 1.0;
      if (state.playerKeys['s'] || state.playerKeys['arrowdown']) driveInput = -0.5; // slow reverse
      if (state.playerKeys['a'] || state.playerKeys['arrowleft']) turnInput = 1.0;
      if (state.playerKeys['d'] || state.playerKeys['arrowright']) turnInput = -1.0;

      // Accelerate / Brake curves
      const maxSpeed = p1.type === 'SCOUT' ? 24 : (p1.type === 'HEAVY' ? 12 : 17);
      const accelRate = 4.5;
      p1.targetSpeed = driveInput * maxSpeed * (1.0 + (upgrades.engineSpeedLevel * 0.12));
      p1.speed += (p1.targetSpeed - p1.speed) * accelRate * dt;

      p1.rotation += turnInput * (p1.type === 'SCOUT' ? 3.5 : (p1.type === 'HEAVY' ? 1.8 : 2.5)) * dt;

      // Slide/Move math
      p1.velocity.x = Math.cos(p1.rotation) * p1.speed;
      p1.velocity.z = -Math.sin(p1.rotation) * p1.speed;

      p1.x += p1.velocity.x * dt;
      p1.z += p1.velocity.z * dt;

      // Update Engine pitch dynamically
      const activeSpeedRatio = Math.abs(p1.speed) / maxSpeed;
      GameSounds.updateEnginePitch(activeSpeedRatio);

      // MOUSE TURRET TARGETING AIMS DIRECTLY
      if (threeRef.current.camera) {
        // Cast ray from camera onto ground plane to see where mouse aims
        const raycaster = new THREE.Raycaster();
        const screenCoord = new THREE.Vector2(state.mousePos.x, state.mousePos.y);
        raycaster.setFromCamera(screenCoord, threeRef.current.camera);
        
        const groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
        const touchPoint = new THREE.Vector3();
        raycaster.ray.intersectPlane(groundPlane, touchPoint);

        const dx = touchPoint.x - p1.x;
        const dz = touchPoint.z - p1.z;
        const desiredGlobalAngle = Math.atan2(-dz, dx);
        
        // turretRotation is defined relative to the tank chassis' rotation
        let relativeTurretAngle = desiredGlobalAngle - p1.rotation;
        
        // normalize relative angle
        relativeTurretAngle = Math.atan2(Math.sin(relativeTurretAngle), Math.cos(relativeTurretAngle));
        p1.turretRotation = relativeTurretAngle;
      }

      // Check space key for alternative fire
      if (state.playerKeys[' ']) {
        triggerPlayerShoot('player1');
      }
    }

    // 4. Keyboard split-map controls for Player 2 (Local Versus)
    const p2 = state.tanks.find(t => t.id === 'player2');
    if (p2 && p2.health > 0) {
      let turnInput = 0;
      let driveInput = 0;

      // Player 2 controls: numpads or specific keys
      // Arrows are busy if Player 1 chooses to use them, but we mapped ArrowKeys as duplicate P1 tags. 
      // In VS mode, WASD is Player 1, Arrow keys automatically control Player 2:
      if (state.playerKeys['arrowup']) driveInput = 1.0;
      if (state.playerKeys['arrowdown']) driveInput = -0.5;
      if (state.playerKeys['arrowleft']) turnInput = 1.0;
      if (state.playerKeys['arrowright']) turnInput = -1.0;

      const p2MaxSpeed = 16;
      p2.targetSpeed = driveInput * p2MaxSpeed;
      p2.speed += (p2.targetSpeed - p2.speed) * 4.0 * dt;
      p2.rotation += turnInput * 2.5 * dt;

      p2.velocity.x = Math.cos(p2.rotation) * p2.speed;
      p2.velocity.z = -Math.sin(p2.rotation) * p2.speed;

      p2.x += p2.velocity.x * dt;
      p2.z += p2.velocity.z * dt;

      // Turret keys [ and ] for Player 2
      let turretPivot = 0;
      if (state.playerKeys['[']) turretPivot = 1.0;
      if (state.playerKeys[']']) turretPivot = -1.0;
      
      p2.turretRotation += turretPivot * 3.0 * dt;

      // Fire ENTER key
      if (state.playerKeys['enter']) {
        triggerPlayerShoot('player2');
      }
    }

    // 5. INTUATIVE BOOTED AI STRATEGY SYSTEMS
    state.tanks.forEach(bot => {
      if (bot.isPlayer || bot.health <= 0) return;

      const now = Date.now();
      
      // Decider periodic logic block of bots
      if (!bot.aiNextDecisionTime || now > bot.aiNextDecisionTime) {
        bot.aiNextDecisionTime = now + 1200 + Math.random() * 800; // repeat check

        // Search for nearest enemy of OPPOSITE team!
        const enemies = state.tanks.filter(e => e.team !== bot.team && e.health > 0);
        let nearestEnemy: Tank | null = null;
        let minDist = 99999;

        enemies.forEach(e => {
          const d = Math.hypot(e.x - bot.x, e.z - bot.z);
          if (d < minDist) {
            minDist = d;
            nearestEnemy = e;
          }
        });

        // Search for nearest floating powerup that isn't collected
        const activeItem = state.powerUps.filter(p => !p.collected);
        let nearestPup: PowerUp | null = null;
        let minPupDist = 99999;

        activeItem.forEach(p => {
          const d = Math.hypot(p.x - bot.x, p.z - bot.z);
          if (d < minPupDist) {
            minPupDist = d;
            nearestPup = p;
          }
        });

        // Determine AI State machine actions:
        if (bot.health < bot.maxHealth * 0.3 && nearestPup && minPupDist < 45) {
          // LOW health - rush to power up kits
          bot.aiState = 'SEARCH_POWERUP';
          bot.aiTargetId = nearestPup.id;
          bot.aiTargetX = nearestPup.x;
          bot.aiTargetZ = nearestPup.z;
        } else if (nearestEnemy && minDist < 65) {
          // Opponent detected in combat scanner sweep
          bot.aiState = 'CHASE';
          bot.aiTargetId = nearestEnemy!.id;
          bot.aiTargetX = nearestEnemy!.x;
          bot.aiTargetZ = nearestEnemy!.z;
        } else {
          // Patrol landmarks
          bot.aiState = 'PATROL';
          // set target to opponent base or central nodes
          const targetCoords = bot.team === 'BLUE' ? { x: -45, z: -45 } : { x: 45, z: 45 };
          bot.aiTargetX = targetCoords.x + Math.random() * 30 - 15;
          bot.aiTargetZ = targetCoords.z + Math.random() * 30 - 15;
        }
      }

      // Execute AI current Decision maneuvers
      let targetX = bot.aiTargetX || 0;
      let targetZ = bot.aiTargetZ || 0;

      const distToGoal = Math.hypot(targetX - bot.x, targetZ - bot.z);

      if (distToGoal > 3.0) {
        // Calculate angle pointing towards target
        const desiredAngle = Math.atan2(-(targetZ - bot.z), targetX - bot.x);
        
        // Turn chassis smoothly towards target
        let dAngle = desiredAngle - bot.rotation;
        dAngle = Math.atan2(Math.sin(dAngle), Math.cos(dAngle)); // normalize [-PI, PI]

        // Rotation limits
        const turnSpeed = bot.type === 'HEAVY' ? 1.0 : (bot.type === 'SCOUT' ? 2.5 : 1.75);
        bot.rotation += Math.sign(dAngle) * Math.min(Math.abs(dAngle), turnSpeed * dt);

        // Drive forwards if aligned reasonably, else spin in place
        if (Math.abs(dAngle) < 0.6) {
          const maxSpeed = bot.type === 'SCOUT' ? 17 : (bot.type === 'HEAVY' ? 9 : 12);
          bot.targetSpeed = maxSpeed;
        } else {
          bot.targetSpeed = 0;
        }
      } else {
        bot.targetSpeed = 0; // stop near goal
      }

      // Physical velocity damping
      bot.speed += (bot.targetSpeed - bot.speed) * 3.5 * dt;
      bot.velocity.x = Math.cos(bot.rotation) * bot.speed;
      bot.velocity.z = -Math.sin(bot.rotation) * bot.speed;

      bot.x += bot.velocity.x * dt;
      bot.z += bot.velocity.z * dt;

      // AIM TURRET TOWARDS CLOSEST OPPONENT REGARDLESS OF TRAVEL WAYPOINT
      const enemies = state.tanks.filter(e => e.team !== bot.team && e.health > 0);
      let closestOpp: Tank | null = null;
      let minOppD = 99999;

      enemies.forEach(e => {
        const d = Math.hypot(e.x - bot.x, e.z - bot.z);
        if (d < minOppD) {
          minOppD = d;
          closestOpp = e;
        }
      });

      if (closestOpp && minOppD < 55) {
        const desiredAimGlobal = Math.atan2(-(closestOpp.z - bot.z), closestOpp.x - bot.x);
        let relAim = desiredAimGlobal - bot.rotation;
        relAim = Math.atan2(Math.sin(relAim), Math.cos(relAim));

        // turn turret towards him
        const turretRate = 2.5;
        const dTurret = relAim - bot.turretRotation;
        bot.turretRotation += Math.sign(dTurret) * Math.min(Math.abs(dTurret), turretRate * dt);

        // Shoot fire checks if aligned and close
        if (Math.abs(dTurret) < 0.25 && bot.fireCooldown <= 0) {
          fireBullet(bot);
        }
      } else {
        // Return turret to forward alignment
        bot.turretRotation += (0 - bot.turretRotation) * 2.0 * dt;
      }
    });

    // 6. MAP RESOLUTION COLLISION HANDLING
    const resolveCollisions = () => {
      const tRadiusSum = 2.4; // tank circle size bounds

      // A. Keep tanks within arena limits
      state.tanks.forEach(t => {
        if (t.health <= 0) return;
        const distFromCenter = Math.hypot(t.x, t.z);
        const mapLimit = ARENA_SIZE / 2 - 5.5;

        if (distFromCenter > mapLimit) {
          const pushAngle = Math.atan2(t.z, t.x);
          t.x = Math.cos(pushAngle) * mapLimit;
          t.z = Math.sin(pushAngle) * mapLimit;
          t.speed *= -0.2; // slight rebounce dump
        }
      });

      // B. Tank vs Tank physical circle push resolutions
      for (let i = 0; i < state.tanks.length; i++) {
        const t1 = state.tanks[i];
        if (t1.health <= 0) continue;

        for (let j = i + 1; j < state.tanks.length; j++) {
          const t2 = state.tanks[j];
          if (t2.health <= 0) continue;

          const dx = t2.x - t1.x;
          const dz = t2.z - t1.z;
          const dist = Math.hypot(dx, dz);
          const clearance = (t1.type === 'HEAVY' ? 2.3 : 1.7) + (t2.type === 'HEAVY' ? 2.3 : 1.7);

          if (dist < clearance) {
            const pushD = clearance - dist;
            const angle = Math.atan2(dz, dx);
            // push apart
            t1.x -= Math.cos(angle) * pushD * 0.5;
            t1.z -= Math.sin(angle) * pushD * 0.5;
            t2.x += Math.cos(angle) * pushD * 0.5;
            t2.z += Math.sin(angle) * pushD * 0.5;

            // bounce velocity slide
            const vTemp = t1.speed;
            t1.speed = t2.speed * 0.4;
            t2.speed = vTemp * 0.4;
          }
        }
      }

      // C. Tank vs Static Obstacles Solid collisions
      state.tanks.forEach(t => {
        if (t.health <= 0) return;

        state.obstacles.forEach(obs => {
          if (obs.type === 'BASE') return; // flags are traversable overlays
          const dx = t.x - obs.x;
          const dz = t.z - obs.z;
          const dist = Math.hypot(dx, dz);
          const clearance = obs.radius + (t.type === 'HEAVY' ? 1.6 : 1.2);

          if (dist < clearance) {
            const pushD = clearance - dist;
            const angle = Math.atan2(dz, dx);
            t.x += Math.cos(angle) * pushD;
            t.z += Math.sin(angle) * pushD;
            t.speed *= -0.3; // bounce
          }
        });
      });
    };

    resolveCollisions();

    // 7. BULLETS POSITION TICK SWEEPS
    const remainingBullets: Bullet[] = [];
    state.bullets.forEach(b => {
      // update physics
      b.x += b.vx * dt;
      b.z += b.vz * dt;

      // apply bullet gravity if appropriate
      if (b.gravity) {
        b.vy += b.gravity * dt;
        b.y += b.vy * dt;
      }

      b.life -= dt * 1000;

      // collision sweeps
      let collEnded = false;

      // A. Ground boundary / height collisions
      if (b.y < 0.1 || b.life <= 0) {
        collEnded = true;
        // spawn impact cloud
        spawnImpactParticles(b.x, 0.4, b.z, 'SPARK', '#94a3b8', 6);
      }

      // B. Obstacle hitting
      if (!collEnded) {
        for (let i = 0; i < state.obstacles.length; i++) {
          const obs = state.obstacles[i];
          if (obs.type === 'BASE') continue;
          const d = Math.hypot(b.x - obs.x, b.z - obs.z);

          if (d < obs.radius + b.radius) {
            collEnded = true;
            GameSounds.playHit();
            
            // Destruct HP of block barrier
            if (obs.type === 'BOX' && obs.hp !== undefined) {
              obs.hp -= b.damage;
              
              // spawn destruction debris sparks
              spawnImpactParticles(b.x, 1.2, b.z, 'SPARK', '#d97706', 12);
              
              if (obs.hp <= 0) {
                // Delete obstacle
                state.obstacles.splice(i, 1);
                
                // Delete visual 3D
                const mesh = threeRef.current.obstacleMeshes[obs.id];
                if (mesh) {
                  threeRef.current.scene?.remove(mesh);
                  delete threeRef.current.obstacleMeshes[obs.id];
                }

                GameSounds.playExplosion();
                spawnImpactParticles(obs.x, 1.0, obs.z, 'EXPLOSION', '#ca8a04', 25);
                onAddLog({
                  id: `log_b_${Date.now()}`,
                  text: `💥 Devor toʻsiq portlatildi!`,
                  type: 'BASE',
                  timestamp: Date.now()
                });
              }
            } else {
              spawnImpactParticles(b.x, 1.0, b.z, 'SPARK', '#64748b', 8);
            }
            break;
          }
        }
      }

      // C. Hitting Enemy Tanks
      if (!collEnded) {
        const opposingTanks = state.tanks.filter(t => t.team !== b.ownerTeam && t.health > 0);
        for (let t of opposingTanks) {
          const d = Math.hypot(b.x - t.x, b.z - t.z);
          const tRadius = t.type === 'HEAVY' ? 1.7 : (t.type === 'SCOUT' ? 1.15 : 1.4);

          if (d < tRadius + b.radius) {
            collEnded = true;
            
            // Damage calculation with shields absorber checks
            let rDmg = b.damage;
            GameSounds.playHit();

            if (t.shield > 0) {
              if (t.shield >= rDmg) {
                t.shield -= rDmg;
                rDmg = 0; // shield absorbs fully
              } else {
                rDmg -= t.shield;
                t.shield = 0;
              }
            }

            t.health = Math.max(0, t.health - rDmg);

            // Sparks particle flashes
            spawnImpactParticles(b.x, turretHeight(t), b.z, 'SPARK', t.team === 'BLUE' ? '#60a5fa' : '#f87171', 14);
            
            // Add floating damage visual text
            addDamageText(t.x, turretHeight(t) + 1.5, t.z, `-${Math.ceil(b.damage)}`, b.damage > 25 ? '#ca8a04' : '#ffffff');

            // If opponent killed!
            if (t.health <= 0) {
              triggerTankExplosion(t, b.ownerId);
            }

            break;
          }
        }
      }

      // If bullet is still alive
      if (!collEnded) {
        remainingBullets.push(b);
      } else {
        // delete matching visual mesh
        const bMesh = threeRef.current.bulletMeshes[b.id];
        if (bMesh) {
          threeRef.current.scene?.remove(bMesh);
          delete threeRef.current.bulletMeshes[b.id];
        }
      }
    });
    state.bullets = remainingBullets;

    // 8. POWER-UPS ITEMS COLLECTION DETECTIONS
    state.powerUps.forEach(p => {
      if (p.collected) return;

      state.tanks.forEach(t => {
        if (t.health <= 0 || p.collected) return;
        const dist = Math.hypot(t.x - p.x, t.z - p.z);
        const tRadius = t.type === 'HEAVY' ? 1.7 : 1.3;

        if (dist < tRadius + 1.2) {
          // Collected!
          p.collected = true;

          GameSounds.playPowerUp();
          
          let awardText = '';

          if (p.type === 'HEALTH') {
            t.health = Math.min(t.maxHealth, t.health + t.maxHealth * 0.4);
            awardText = `🏥 +40% HAYOT (HP)`;
            addDamageText(t.x, turretHeight(t) + 1.2, t.z, '+HP', '#10b981');
          } else if (p.type === 'SHIELD') {
            t.shield = Math.min(t.maxShield, t.shield + 40);
            awardText = `🛡️ QALQON TIKLANDI (+40)`;
            addDamageText(t.x, turretHeight(t) + 1.2, t.z, '+SHIELD', '#3b82f6');
          } else if (p.type === 'WEAPON_TRIPLE') {
            t.activeWeapon = 'TRIPLE';
            t.ammo = 10;
            awardText = `🔫 UCHLAMA OʻQ (10 ta snaryad)`;
            addDamageText(t.x, turretHeight(t) + 1.2, t.z, 'TRIPLE_AMMO', '#f59e0b');
          } else if (p.type === 'WEAPON_PLASMA') {
            t.activeWeapon = 'PLASMA';
            t.ammo = 8;
            awardText = `⚡ PLASMA ZARBADOR (8 ta snaryad)`;
            addDamageText(t.x, turretHeight(t) + 1.2, t.z, 'PLASMA_AMMO', '#a855f7');
          } else if (p.type === 'SPEED_BOOST') {
            t.speedBoostTime = 7; // 7 seconds
            t.speed = t.speed * 1.5;
            awardText = `⚡ TEZLIK BOOST (+50% TEZLIK)`;
            addDamageText(t.x, turretHeight(t) + 1.2, t.z, 'SPEED_BOOST', '#ec4899');
          }

          // Trigger logs
          onAddLog({
            id: `log_p_${Date.now()}_${Math.random()}`,
            text: `${t.name} ${awardText} quvvatlagichini yigʻdi!`,
            type: 'POWERUP',
            timestamp: Date.now()
          });

          // Delete three.js mesh representation
          const mesh = threeRef.current.powerUpMeshes[p.id];
          if (mesh) {
            threeRef.current.scene?.remove(mesh);
            delete threeRef.current.powerUpMeshes[p.id];
          }
        }
      });
    });

    // 9. POWER UPS TIMERS AND COOLDOWNS DECAYS
    state.powerUps = state.powerUps.filter(p => !p.collected);

    // 10. PARTICLE PARTICLES PHYSICS TRAILER
    const remainingParticles: Particle[] = [];
    state.particles.forEach(p => {
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.z += p.vz * dt;
      p.life -= dt * 1000;

      if (p.life > 0) {
        remainingParticles.push(p);
      } else {
        const mesh = threeRef.current.particleMeshes[p.id];
        if (mesh) {
          threeRef.current.scene?.remove(mesh);
          delete threeRef.current.particleMeshes[p.id];
        }
      }
    });
    state.particles = remainingParticles;

    // 11. CHECK WINNING CONDITIONS TICK
    checkWinningConditions();

    // 12. PUSH CODES TO HUD PERIODICALLY FOR GAUGE UPDAMPINGS
    state.frameNum++;
    if (state.frameNum % 4 === 0) {
      const player1 = state.tanks.find(t => t.id === 'player1') || null;
      const player2 = state.tanks.find(t => t.id === 'player2') || null;
      onUpdatePlayers(player1, player2);
    }
  };

  // Build tank heavy explosion smoke plume
  const triggerTankExplosion = (killed: Tank, killerId: string) => {
    const state = stateRef.current;
    GameSounds.playExplosion();

    // Spawn massive fiery smoke cubes
    spawnImpactParticles(killed.x, turretHeight(killed), killed.z, 'EXPLOSION', '#f59e55', 30);
    spawnImpactParticles(killed.x, turretHeight(killed), killed.z, 'SPARK', '#ea580c', 20);

    // Screen Shake punch
    stateRef.current.screenShake = 35;

    // Award scores points
    const killer = state.tanks.find(t => t.id === killerId);
    let logString = `${killed.name} yo'q qilindi!`;
    
    if (killer) {
      killer.kills += 1;
      killer.score += 150;
      
      const teamAward = killer.team === 'BLUE' ? 'BLUE' : 'RED';
      state.scores[teamAward] += 1; // increase team kill score board!

      logString = `💥 dushmanni urdi: ${killer.name} [${killer.team}] ➔ ${killed.name} [${killed.team}]`;

      // If Player killed the enemy, award salvage points!
      if (killer.id === 'player1') {
        onAwardPoints(100); // 100 points reward!
      }
    }
    
    killed.deaths += 1;

    onAddLog({
      id: `log_d_${Date.now()}`,
      text: logString,
      type: 'KILL',
      timestamp: Date.now()
    });

    // Reposition/Respawn bot tank after short delay!
    setTimeout(() => {
      if (state.matchEnded) return;
      // Respawn
      killed.health = killed.maxHealth;
      killed.shield = killed.maxShield;
      killed.activeWeapon = 'STANDARD';
      killed.ammo = 0;
      
      // Spawn at base nodes
      const baseArea = killed.team === 'BLUE' ? { x: 55, z: 55 } : { x: -55, z: -55 };
      killed.x = baseArea.x + Math.random() * 20 - 10;
      killed.z = baseArea.z + Math.random() * 20 - 10;
      killed.speed = 0;

      // Add popup
      addDamageText(killed.x, 2.0, killed.z, 'RESPAWN', killed.team === 'BLUE' ? '#3b82f6' : '#ef4444');
      onAddLog({
        id: `log_r_${Date.now()}`,
        text: `🛡️ Jamoa tanki qayta yuklandi: ${killed.name}`,
        type: 'SYSTEM',
        timestamp: Date.now()
      });
    }, 5000);
  };

  // Match ending score conditions checks
  const checkWinningConditions = () => {
    const state = stateRef.current;
    if (state.matchEnded) return;

    onUpdateScores(state.scores.RED, state.scores.BLUE);

    const WINNING_SCORE = 15; 
    let winner: Team | null = null;

    if (state.scores.BLUE >= WINNING_SCORE) winner = 'BLUE';
    if (state.scores.RED >= WINNING_SCORE) winner = 'RED';

    if (winner) {
      state.matchEnded = true;
      GameSounds.stopEngine();

      // Calculate matching awarded credit points
      const player1 = state.tanks.find(t => t.id === 'player1') || null;
      const playerWon = player1 ? player1.team === winner : false;
      
      const killsBonus = player1 ? player1.kills * 60 : 0;
      const winBonus = playerWon ? 350 : 100;
      const finalPoints = winBonus + killsBonus;

      onAwardPoints(finalPoints);

      const stats = {
        redScore: state.scores.RED,
        blueScore: state.scores.BLUE,
        kills: player1 ? player1.kills : 0,
        deaths: player1 ? player1.deaths : 0
      };

      onMatchFinished(winner, stats, finalPoints);
    }
  };

  // --- FLOATING TEXTS AND SPARKS MANIPULATORS ---
  const addDamageText = (x: number, y: number, z: number, text: string, colorHex: string) => {
    const pId = `d_txt_${Date.now()}_${Math.random()}`;
    const p: Particle = {
      id: pId,
      type: 'DAMAGE_TEXT',
      x,
      y,
      z,
      vx: Math.random() * 2 - 1,
      vy: 4.5, // float up
      vz: Math.random() * 2 - 1,
      color: colorHex,
      size: 1.0,
      life: 1400,
      maxLife: 1400,
      text
    };

    stateRef.current.particles.push(p);

    // ThreeJS 2D canvas text sprite!
    const canvas = document.createElement('canvas');
    canvas.width = 120;
    canvas.height = 40;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.fillStyle = colorHex;
      ctx.font = 'bold 20px "JetBrains Mono", monospace';
      ctx.textAlign = 'center';
      ctx.fillText(text, 60, 26);
    }

    const texture = new THREE.CanvasTexture(canvas);
    const spriteMat = new THREE.SpriteMaterial({ map: texture, transparent: true });
    const spriteObj = new THREE.Sprite(spriteMat);
    spriteObj.position.set(x, y, z);
    spriteObj.scale.set(3, 1.0, 1);

    threeRef.current.scene?.add(spriteObj);
    threeRef.current.particleMeshes[pId] = spriteObj as any; // treat as mesh
  };

  const spawnImpactParticles = (x: number, y: number, z: number, type: 'SPARK' | 'EXPLOSION' | 'SMOKE', colorHex: string, count: number) => {
    const scene = threeRef.current.scene;
    if (!scene) return;

    for (let i = 0; i < count; i++) {
      const pId = `p_${Date.now()}_${Math.random().toString(36).substr(2, 4)}_${i}`;

      let px = x + (Math.random() * 0.8 - 0.4);
      let py = y + (Math.random() * 0.6 - 0.3);
      let pz = z + (Math.random() * 0.8 - 0.4);

      let vx = (Math.random() * 2 - 1) * 8;
      let vy = (Math.random() * 2 - 0.5) * 6;
      let vz = (Math.random() * 2 - 1) * 8;

      let size = type === 'EXPLOSION' ? 0.4 + Math.random() * 0.6 : 0.12 + Math.random() * 0.15;
      let life = type === 'EXPLOSION' ? 600 + Math.random() * 500 : 350 + Math.random() * 300;

      if (type === 'SMOKE') {
        vx = (Math.random() * 2 - 1) * 2;
        vy = (Math.random() * 2 + 1) * 2; // slow rising smoke
        vz = (Math.random() * 2 - 1) * 2;
        size = 0.5 + Math.random() * 0.5;
        life = 900 + Math.random() * 400;
        px = x;
        py = y;
        pz = z;
      }

      const p: Particle = {
        id: pId,
        type,
        x: px,
        y: py,
        z: pz,
        vx,
        vy,
        vz,
        color: colorHex,
        size,
        life,
        maxLife: life
      };

      stateRef.current.particles.push(p);

      // Create matching mesh representations
      // Colored cube shards for particles explosion look awesome and are fast!
      const pGeo = new THREE.BoxGeometry(size, size, size);
      const pMat = new THREE.MeshBasicMaterial({
        color: type === 'SMOKE' ? 0x64748b : colorHex,
        transparent: true,
        opacity: type === 'SMOKE' ? 0.3 : 1.0
      });
      const pMesh = new THREE.Mesh(pGeo, pMat);
      pMesh.position.set(px, py, pz);

      scene.add(pMesh);
      threeRef.current.particleMeshes[pId] = pMesh;
    }
  };

  // --- THREE.JS GRAPHICS UPDATE LOOPS ---
  const updateThreeMeshes = (dt: number) => {
    const scene = threeRef.current.scene;
    if (!scene) return;

    // 1. Render/Move Tank Meshes
    stateRef.current.tanks.forEach(t => {
      const mesh = threeRef.current.tankMeshes[t.id];
      if (!mesh) return;

      if (t.health <= 0) {
        // Tank is dead visual indicators: sink into ground briefly or rotate upside down!
        mesh.position.y = -1.2;
        mesh.rotation.z = Math.PI / 4; 
        return;
      }

      // Smooth lerp movement interpolation to avoid stutter
      mesh.position.set(t.x, t.y, t.z);
      mesh.rotation.y = t.rotation;

      // Locate and rotate turret child group
      const turretAnchor = mesh.children.find(c => c instanceof THREE.Group);
      if (turretAnchor) {
        turretAnchor.rotation.y = t.turretRotation;
      }

      // Exhaust pipe emissions
      if (Math.random() < 0.25) {
        // back of tank exhaust coordinates
        const backX = t.x - Math.cos(t.rotation) * 1.3;
        const backZ = t.z + Math.sin(t.rotation) * 1.3;
        spawnImpactParticles(backX, 0.6, backZ, 'SMOKE', '#94a3b8', 1);
      }
    });

    // 2. Projectiles tracer updates
    stateRef.current.bullets.forEach(b => {
      const mesh = threeRef.current.bulletMeshes[b.id];
      if (mesh) {
        mesh.position.set(b.x, b.y, b.z);
      }
    });

    // 3. Power-ups items bobbing/levitations
    stateRef.current.powerUps.forEach(p => {
      const mesh = threeRef.current.powerUpMeshes[p.id];
      if (mesh) {
        p.pulseTime += dt * 3.5;
        mesh.position.y = 1.0 + Math.sin(p.pulseTime) * 0.35;
        // rotate crystal geometry
        const shape = mesh.children[1];
        if (shape) {
          shape.rotation.y += dt * 1.8;
          shape.rotation.x += dt * 0.8;
        }
      }
    });

    // 4. Particle floating decays
    stateRef.current.particles.forEach(p => {
      const mesh = threeRef.current.particleMeshes[p.id];
      if (!mesh) return;

      mesh.position.set(p.x, p.y, p.z);
      
      // Decelerate opacity
      const opacity = p.life / p.maxLife;
      if (mesh instanceof THREE.Sprite) {
        mesh.material.opacity = opacity;
      } else if (mesh instanceof THREE.Mesh) {
        if (Array.isArray(mesh.material)) {
          mesh.material.forEach(m => { m.transparent = true; m.opacity = opacity; });
        } else if (mesh.material) {
          mesh.material.transparent = true;
          mesh.material.opacity = opacity;
        }
      }
    });

    // 5. FOLLOW trailing standard camera
    const p1 = stateRef.current.tanks.find(t => t.id === 'player1');
    if (p1 && threeRef.current.camera) {
      const camera = threeRef.current.camera;
      
      // Screenshake offset formulas
      const sShake = stateRef.current.screenShake;
      const rx = (Math.random() * 2 - 1) * sShake * 0.05;
      const ry = (Math.random() * 2 - 1) * sShake * 0.05;
      const rz = (Math.random() * 2 - 1) * sShake * 0.05;

      if (playerSetup.mode === 'VERSUS') {
        // Versus 1v1 Mode: camera looks down at center map, spanning both players
        const p2 = stateRef.current.tanks.find(t => t.id === 'player2');
        if (p2) {
          const midX = (p1.x + p2.x) / 2;
          const midZ = (p1.z + p2.z) / 2;
          const distance = Math.hypot(p1.x - p2.x, p1.z - p2.z);
          
          const camY = Math.max(35, distance * 0.7);
          camera.position.set(midX + rx, camY + ry, midZ + 36 + rz);
          camera.lookAt(midX, 2, midZ);
        }
      } else {
        // Solo/Coop trail follow player 1 smoothly
        const targetCamX = p1.x - Math.cos(p1.rotation) * 16;
        const targetCamZ = p1.z + Math.sin(p1.rotation) * 16;
        const targetCamY = 15;

        // Linear lerp camera positioning
        camera.position.x += (targetCamX - camera.position.x) * 4.5 * dt;
        camera.position.z += (targetCamZ - camera.position.z) * 4.5 * dt;
        camera.position.y += (targetCamY - camera.position.y) * 4.5 * dt;

        // Shake offset overlay
        camera.position.x += rx;
        camera.position.y += ry;
        camera.position.z += rz;

        const lookTarget = new THREE.Vector3(p1.x, p1.y + 1.5, p1.z);
        camera.lookAt(lookTarget);
      }
    }

    // 6. Direct RENDER Call
    if (threeRef.current.renderer && threeRef.current.camera) {
      threeRef.current.renderer.render(scene, threeRef.current.camera);
    }
  };

  return (
    <div ref={containerRef} className="w-full h-full relative cursor-crosshair">
      <canvas ref={canvasRef} className="w-full h-full block" />
      
      {/* HUD Reticle indicator in middle of screen for player guidance */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full w-6 h-6 border border-cyan-400/20 flex items-center justify-center pointer-events-none">
        <div className="w-1.5 h-1.5 rounded-full bg-cyan-400/30" />
      </div>
    </div>
  );
}
