// script.js

window.addEventListener('DOMContentLoaded', () => {
  // --- DOM Elements & Globals ---
  const startScreen    = document.getElementById('startScreen');
  const startBtn       = document.getElementById('startBtn');
  const explosionSound = document.getElementById('explosionSound');
  const bgMusic        = document.getElementById('bgMusic');
  const container      = document.getElementById('container');
  const videoModal     = document.getElementById('videoModal');
  const planetVideo    = document.getElementById('planetVideo');
  const messageModal   = document.getElementById('messageModal');
  const planetMessage  = document.getElementById('planetMessage');

  // Inline closers
  window.closeVideoModal   = () => { videoModal.style.display = 'none'; bgMusic.play(); };
  window.closeMessageModal = () => messageModal.style.display = 'flex';

  // Audio settings
  explosionSound.volume = 0.2;
  bgMusic.volume        = 0.2;

  // Interactive planets
  const ITEMS = [
    { label: 'Kika', type: 'video',   src: 'videos/planet1.mp4' },
    { label: 'Thandeka', type: 'message', message: 
`Dear Kika,
A person energy and aura never lies. I could tell from our first meeting (my agent interview) that you had a pure and loving, altruistic aura, and it’s been proven true in every interaction since then. Wishing you a happy birthday and a blessed year.`},
    { label: 'Simon',   type: 'message', message: 
`Happy Birthday Kika! May only happiness and health come your way. Thank you for being the best team lead anyone could wish for! Thank you for teaching us how to be patient and hardworking. Lots of adventures and warm teas on your next circle around the sun.`},
    { label: 'Nadir',   type: 'message', message: 
`Happy birthday Kika!! You’re the sun in our little solar system, always giving us energy, good vibes, and keeping us from drifting off into the abyss. We’d be lost without you! Wishing you an amazing day filled with all the best things, a warm cup of tea and hopefully a little well-deserved time off. Free bogo`},
    { label: 'Mohammed', type: 'message', message:
`Happy Birthday!! Today I wish you goodness, kindness and love. You don't deserve less than these. Looking back and remembering the day I started working here and the day I moved to ops. Everything you taught me and everything we've been through in such a short period. No amount of gratitude can be enough. You are a wonderful person. We love you KIKA!`}
  ];

  const COLORS = [0xff6666, 0x66ffcc, 0x66ccff, 0x8866ff, 0xffcc66];

  // Decorative textures (not used for colors now)
  const DECOR_TEX = [];

  // Three.js setup
  let scene, camera, renderer, controls, starField;
  const interactive = [];
  const decorative  = [];
  const meteors     = [];
  const particles   = [];
  const raycaster   = new THREE.Raycaster();
  const mouse       = new THREE.Vector2();

  init();
  animate();

  // Start Journey
  startBtn.addEventListener('click', () => {
    explosionSound.play();
    startScreen.style.display = 'none';
    supernova().then(() => {
      bgMusic.play();
      interactive.forEach(o => o.group.visible   = true);
      decorative.forEach(o  => o.group.visible   = true);
      meteors.forEach(m     => m.mesh.visible   = true);
    });
  });

  function init() {
    scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x000021, 0.00015);

    camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 2000);
    camera.position.set(0, 10, 40);

    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    container.appendChild(renderer.domElement);

    controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.1;

    makeStars();
    makeLights();
    makeInteractivePlanets();
    makeDecorativePlanets(20);
    makeMeteors(50);

    window.addEventListener('resize', onResize);
    renderer.domElement.addEventListener('pointerdown', onClick);
  }

  // Supernova effect
  function supernova() {
    return new Promise(res => {
      gsap.to(starField.scale, { x: 0.1, y: 0.1, z: 0.1, duration: 1.5, ease: 'power1.in' });

      const size = 512;
      const c = document.createElement('canvas');
      c.width = c.height = size;
      const ctx = c.getContext('2d');
      const grad = ctx.createRadialGradient(size/2, size/2, 0, size/2, size/2, size/2);
      ['#fff','#ffdd33','#ff6666','transparent'].forEach((col,i) => grad.addColorStop(i/3, col));
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, size, size);

      const tex = new THREE.CanvasTexture(c);
      const mat = new THREE.SpriteMaterial({ map: tex, transparent: true });
      const flash = new THREE.Sprite(mat);
      flash.scale.set(400, 400, 1);
      flash.position.copy(camera.position).add(camera.getWorldDirection(new THREE.Vector3()).multiplyScalar(10));
      scene.add(flash);

      const tl = gsap.timeline({ onComplete: () => { scene.remove(flash); res(); }});
      tl.to(mat, { opacity: 0, duration: 2, ease: 'power2.out' }, 1.5);
      tl.to(starField.scale, { x:1, y:1, z:1, duration:2.5, ease:'power2.out' }, 1.5);
    });
  }

  function makeStars() {
    const geo = new THREE.BufferGeometry();
    const N = 20000;
    const pos = new Float32Array(N*3);
    for (let i = 0; i < N; i++) {
      const th = Math.random()*Math.PI*2;
      const ph = Math.acos(2*Math.random()-1);
      const r = 1000;
      pos.set([r*Math.sin(ph)*Math.cos(th), r*Math.sin(ph)*Math.sin(th), r*Math.cos(ph)], i*3);
    }
    geo.setAttribute('position', new THREE.BufferAttribute(pos,3));
    starField = new THREE.Points(geo, new THREE.PointsMaterial({ color:0xffffff, size:1 }));
    scene.add(starField);
  }

  function makeLights() {
    scene.add(new THREE.HemisphereLight(0xffeebb, 0x080822, 0.6));
    scene.add(new THREE.PointLight(0xffffff, 1.2, 0));
  }

  function makeInteractivePlanets() {
    ITEMS.forEach((item,i) => {
      const pivot = new THREE.Object3D();
      pivot.visible = false;
      scene.add(pivot);

      const radius = i === 0 ? 0 : 15 + Math.random()*20;
      const height = i === 0 ? 0 : -5 + Math.random()*10;

      const mat = new THREE.MeshStandardMaterial({ color: COLORS[i], emissive: COLORS[i]*0.2 });
      const mesh = new THREE.Mesh(new THREE.SphereGeometry(3,32,32), mat);
      mesh.position.set(radius, height, 0);
      pivot.add(mesh);

      const label = makeLabel(item.label);
      label.position.set(radius, height+5, 0);
      pivot.add(label);

      interactive.push({ group: pivot, mesh, item });
    });
  }

  function makeDecorativePlanets(count) {
    for (let i = 0; i < count; i++) {
      const pivot = new THREE.Object3D();
      pivot.visible = false;
      scene.add(pivot);

      const theta = Math.random()*Math.PI*2;
      const phi = Math.acos(2*Math.random()-1);
      const r = 50 + Math.random()*350;
      const x = r*Math.sin(phi)*Math.cos(theta);
      const y = -30 + Math.random()*60;
      const z = -20 - r*Math.cos(phi);

      // Random pastel color
      const hue = Math.random();
      const sat = 0.6 + Math.random()*0.4;
      const light = 0.5 + Math.random()*0.3;
      const col = new THREE.Color().setHSL(hue, sat, light);

      const mat = new THREE.MeshStandardMaterial({ color: col, emissive: col.clone().multiplyScalar(0.2) });
      const size = 2 + Math.random()*48;
      const mesh = new THREE.Mesh(new THREE.SphereGeometry(size,32,32), mat);
      mesh.position.set(x,y,z);
      pivot.add(mesh);

      decorative.push({ group: pivot, mesh });
    }
  }

  function makeMeteors(count) {
    for (let i = 0; i < count; i++) {
      const mat = new THREE.MeshBasicMaterial({ color: 0xdddddd });
      const size = 0.1 + Math.random()*0.5;
      const mesh = new THREE.Mesh(new THREE.SphereGeometry(size,8,8), mat);
      mesh.position.set(-100+Math.random()*200, -50+Math.random()*100, -500+Math.random()*-500);
      mesh.visible = false;
      scene.add(mesh);
      meteors.push({ mesh, speed: 0.5 + Math.random()*2 });
    }
  }

  function makeLabel(text) {
    const c = document.createElement('canvas'); c.width = 512; c.height = 128;
    const ctx = c.getContext('2d');
    ctx.font = 'bold 48px Montserrat, sans-serif';
    ctx.fillStyle = '#fff'; ctx.textAlign = 'center';
    ctx.fillText(text, 256, 64);
    const tex = new THREE.CanvasTexture(c);
    const spr = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, depthTest: false }));
    spr.scale.set(14,4,1);
    return spr;
  }

  function onClick(e) {
    const rect = renderer.domElement.getBoundingClientRect();
    mouse.x = ((e.clientX - rect.left)/rect.width)*2 - 1;
    mouse.y = -((e.clientY -
