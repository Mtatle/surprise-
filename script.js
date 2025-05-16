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

  // make explosion quieter
  explosionSound.volume = 0.2;
  // loop music quiet
  bgMusic.volume = 0.3;

  // Inline closers
  window.closeVideoModal   = () => { videoModal.style.display = 'none'; bgMusic.play(); };
  window.closeMessageModal = () => messageModal.style.display = 'none';

  // The five interactive planets (center is "Kika")
  const ITEMS = [
    {
      label: 'Kika',
      type:  'video',
      src:   'videos/planet1.mp4'
    },
    {
      label: 'Thandeka',
      type:  'message',
      message:
`Dear Kika,
A person’s energy and aura never lies. I could tell from our first meeting (my agent interview) that you had a pure and loving, altruistic aura, and it’s been proven true in every interaction since then. Wishing you a happy birthday and a blessed year.`
    },
    {
      label: 'Simon',
      type:  'message',
      message:
`Happy Birthday Kika! May only happiness and health come your way. Thank you for being the best team lead anyone could wish for! Thank you for teaching us how to be patient and hardworking. A lot of adventures and warm teas on your next circle around the sun.`
    },
    {
      label: 'Nadir',
      type:  'message',
      message:
`Happy birthday Kika!! You’re the sun in our little solar system, always giving us energy, good vibes, and keeping us from drifting off into the abyss. We’d be lost without you! Wishing you an amazing day filled with all the best things, a warm cup of tea and hopefully a little well-deserved time off. Free bogo.`
    },
    {
      label: 'Mohammed',
      type:  'message',
      message:
`Happy Birthday!! Today I wish you goodness, kindness and love. You don't deserve less than these.
Looking back and remembering the day I started working here and the day I moved to ops. Everything you taught me and everything we've been through in such a short period of time.
No amount of gratitude can be enough. You are a wonderful person. We love you KIKA!`
    }
  ];

  // Decorative planets: random pastel colors
  const DECOR_COUNT = 20;

  // Three.js essentials
  let scene, camera, renderer, controls, starField;
  const interactive = [], decorative = [], meteors = [];
  const particles   = [];
  const raycaster   = new THREE.Raycaster();
  const mouse       = new THREE.Vector2();

  init();
  animate();

  // Start Journey → explosion sound → supernova → show scene + music
  startBtn.addEventListener('click', () => {
    explosionSound.play().catch(()=>{});
    startScreen.style.display = 'none';
    supernova().then(() => {
      // show everything
      interactive.forEach(o=>o.group.visible = true);
      decorative.forEach(o=>o.group.visible  = true);
      meteors.forEach(m=>m.mesh.visible      = true);
      bgMusic.play().catch(()=>{});
    });
  });

  function init() {
    scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x000021, 0.00015);

    camera = new THREE.PerspectiveCamera(
      60, window.innerWidth / window.innerHeight, 0.1, 2000
    );
    camera.position.set(0, 10, 40);

    renderer = new THREE.WebGLRenderer({ antialias:true, alpha:true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    container.appendChild(renderer.domElement);

    // transparent background so CSS gradient shows through
    renderer.setClearColor(0x000000, 0);

    controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.1;

    window.addEventListener('resize', onResize);
    renderer.domElement.addEventListener('pointerdown', onClick);

    makeStars();
    makeLights();
    makeInteractivePlanets();
    makeDecorativePlanets(DECOR_COUNT);
    makeMeteors(50);
  }

  function supernova() {
    return new Promise(res => {
      // converge stars
      gsap.to(starField.scale, { x:0.1, y:0.1, z:0.1, duration:1.5, ease:'power1.in' });
      // white flash
      const size = 512;
      const canvas = document.createElement('canvas');
      canvas.width = canvas.height = size;
      const ctx = canvas.getContext('2d');
      const grad = ctx.createRadialGradient(size/2,size/2,0,size/2,size/2,size/2);
      ['#fff','#ffdd33','#ff6666','transparent'].forEach((col,i)=>grad.addColorStop(i/3,col));
      ctx.fillStyle = grad; ctx.fillRect(0,0,size,size);
      const tex = new THREE.CanvasTexture(canvas);
      const mat = new THREE.SpriteMaterial({ map:tex, transparent:true });
      const flash = new THREE.Sprite(mat);
      flash.scale.set(400,400,1);
      flash.position.copy(camera.position)
           .add(camera.getWorldDirection(new THREE.Vector3()).multiplyScalar(10));
      scene.add(flash);

      const tl = gsap.timeline({ onComplete:()=>{
        scene.remove(flash);
        res();
      }});
      tl.to(mat, { opacity:0, duration:2, ease:'power2.out' }, 1.5);
      tl.to(starField.scale, { x:1, y:1, z:1, duration:2.5, ease:'power2.out' }, 1.5);
    });
  }

  function makeStars() {
    const geo = new THREE.BufferGeometry();
    const N = 20000, pos = new Float32Array(N*3);
    for(let i=0;i<N;i++){
      const th=Math.random()*Math.PI*2, ph=Math.acos(2*Math.random()-1), r=1000;
      pos.set([
        r*Math.sin(ph)*Math.cos(th),
        r*Math.sin(ph)*Math.sin(th),
        r*Math.cos(ph)
      ], i*3);
    }
    geo.setAttribute('position', new THREE.BufferAttribute(pos,3));
    starField = new THREE.Points(geo, new THREE.PointsMaterial({ color:0xffffff, size:1 }));
    scene.add(starField);
  }

  function makeLights() {
    scene.add(new THREE.HemisphereLight(0xffeebb, 0x080822, 0.6));
    scene.add(new THREE.PointLight(0xffffff,1.2,0));
  }

  function makeInteractivePlanets() {
    ITEMS.forEach((item,i)=> {
      const pivot = new THREE.Object3D();
      pivot.visible = false;
      scene.add(pivot);

      // position in space
      const angle = (i - 2) * 1.2; // spread around center
      const radius = i===0 ? 0 : 8 + i*6;
      const x = Math.cos(angle)*radius;
      const z = Math.sin(angle)*radius;
      const y = -2 + Math.random()*4;

      const color = [0xff6666,0x66ffcc,0x66ccff,0x8866ff,0xffcc66][i];
      const mat = new THREE.MeshStandardMaterial({ color, emissive:color*0.2 });
      const mesh = new THREE.Mesh(new THREE.SphereGeometry(3,32,32), mat);
      mesh.position.set(x,y,z);
      pivot.add(mesh);

      const label = makeLabel(item.label);
      label.position.set(x, y+5, z);
      pivot.add(label);

      interactive.push({ group:pivot, mesh, item });
    });
  }

  function makeDecorativePlanets(count) {
    for(let i=0;i<count;i++){
      const pivot = new THREE.Object3D();
      pivot.visible = false;
      scene.add(pivot);

      // random 3D spread
      const th = Math.random()*Math.PI*2, ph = Math.acos(2*Math.random()-1), r = 30 + Math.random()*400;
      const x = r*Math.sin(ph)*Math.cos(th);
      const y = -20 + Math.random()*40;
      const z = -20 - r*Math.cos(ph);

      // random pastel HSL
      const hue = Math.random()*360;
      const sat = 60 + Math.random()*20;
      const lig = 50 + Math.random()*20;
      const color = new THREE.Color().setHSL(hue/360, sat/100, lig/100);

      const size = (i<3 ? 70 + Math.random()*30 : 2 + Math.random()*10); // first 3 huge
      const mat = new THREE.MeshStandardMaterial({ color, emissive:color.clone().multiplyScalar(0.2) });
      const mesh = new THREE.Mesh(new THREE.SphereGeometry(size,32,32), mat);
      mesh.position.set(x,y,z);
      pivot.add(mesh);

      decorative.push({ group:pivot, mesh });
    }
  }

  function makeMeteors(count) {
    for(let i=0;i<count;i++){
      const mat = new THREE.MeshBasicMaterial({ color:0xdddddd });
      const size = 0.1 + Math.random()*0.5;
      const mesh = new THREE.Mesh(new THREE.SphereGeometry(size,8,8), mat);
      mesh.position.set(
        -100 + Math.random()*200,
        -50 + Math.random()*100,
        -500 + Math.random()*-500
      );
      mesh.visible = false;
      scene.add(mesh);
      meteors.push({ mesh, speed:0.5 + Math.random()*2 });
    }
  }

  function makeLabel(text) {
    const c = document.createElement('canvas');
    c.width = 512; c.height = 128;
    const ctx = c.getContext('2d');
    ctx.font = '700 48px Montserrat, sans-serif';
    ctx.fillStyle = '#fff';
    ctx.textAlign = 'center';
    ctx.fillText(text, 256, 64);
    const tex = new THREE.CanvasTexture(c);
    const spr = new THREE.Sprite(new THREE.SpriteMaterial({ map:tex, depthTest:false }));
    spr.scale.set(14,4,1);
    return spr;
  }

  function onClick(e) {
    const rect = renderer.domElement.getBoundingClientRect();
    mouse.x = ((e.clientX-rect.left)/rect.width)*2 - 1;
    mouse.y = -((e.clientY-rect.top)/rect.height)*2 + 1;
    raycaster.setFromCamera(mouse, camera);

    // particle burst omitted for brevity...

    // planet interaction
    const meshes = interactive.map(o=>o.mesh);
    const hit = raycaster.intersectObjects(meshes)[0];
    if (!hit) return;
    const idx = meshes.indexOf(hit.object);
    const it  = interactive[idx].item;
    if (it.type==='video') {
      bgMusic.pause();
      planetVideo.src = it.src;
      videoModal.style.display = 'flex';
    } else {
      planetMessage.textContent = it.message;
      messageModal.style.display = 'flex';
    }
  }

  function onResize() {
    camera.aspect = window.innerWidth/window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  }

  function animate() {
    requestAnimationFrame(animate);

    interactive.forEach((o,i)=>{
      o.group.rotation.y += 0.002;
      o.mesh.rotation.y  += 0.01;
    });
    decorative.forEach((o,i)=>{
      o.group.rotation.y += 0.0005;
      o.mesh.rotation.y  += 0.003;
    });
    meteors.forEach(m=>{
      m.mesh.visible = true;
      m.mesh.position.z += m.speed;
      if (m.mesh.position.z > camera.position.z+10) {
        m.mesh.position.z = -500 + Math.random()*-300;
      }
    });

    controls.update();
    renderer.render(scene, camera);
  }
});
