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
  window.closeMessageModal = () => messageModal.style.display = 'none';

  // Lower the background music volume
  bgMusic.volume = 0.3;
  // Softer explosion
  explosionSound.volume = 0.2;

  // Interactive planets
  const ITEMS = [
    { label:'Kika',      type:'video',   src:'videos/video.mp4' },
    { label:'Thandeka',  type:'message', message:`Dear Kika,\nA person energy and aura never lies. I could tell from our first meeting (my agent interview) that you had a pure and loving, altruistic aura, and it’s been proven true in every interaction since then. Wishing you a happy birthday and a blessed year.` },
    { label:'Simon',     type:'message', message:`Happy Birthday Kika! May only happiness and health come your way. Thank you for being the best team lead anyone could wish for! Thank you for teaching us how to be patient and hardworking. Lots of adventures and warm teas on your next circle around the sun.` },
    { label:'Nadir',     type:'message', message:`Happy birthday Kika!! You’re the sun in our little solar system, always giving us energy, good vibes, and keeping us from drifting off into the abyss. We’d be lost without you! Wishing you an amazing day filled with all the best things, a warm cup of tea and hopefully a little well-deserved time off. Free bogo` },
    { label:'Mohammed',  type:'message', message:`Happy Birthday!! Today I wish you goodness, kindness and love. You don't deserve less than these.\nLooking back and remembering the day I started working here and the day I moved to ops. Everything you taught me and everything we've been through in such a short time.\nNo amount of gratitude can be enough. You are a wonderful person. We love you KIKA!` }
  ];
  const COLORS = [0xff6666,0x66ffcc,0x66ccff,0x8866ff,0xffcc66];

  // Decorative planets with random gradients
  let scene, camera, renderer, controls, starField;
  const interactive = [], decorative = [], meteors = [], particles = [];
  const raycaster = new THREE.Raycaster();
  const mouse = new THREE.Vector2();

  init();
  animate();

  startBtn.addEventListener('click', () => {
    explosionSound.play().catch(()=>{});
    startScreen.style.display = 'none';
    supernova().then(() => {
      bgMusic.play().catch(()=>{});
      interactive.forEach(o=>o.group.visible=true);
      decorative.forEach(o=>o.group.visible=true);
      meteors.forEach(m=>m.mesh.visible=true);
    });
  });

  function init() {
    scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x000021, 0.00015);

    camera = new THREE.PerspectiveCamera(60, window.innerWidth/window.innerHeight, 0.1, 2000);
    camera.position.set(0,10,40);

    renderer = new THREE.WebGLRenderer({ antialias:true, alpha:true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    container.appendChild(renderer.domElement);

    controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.1;

    window.addEventListener('resize', onResize);
    renderer.domElement.addEventListener('pointerdown', onClick);

    makeStars(); makeLights(); makeInteractivePlanets(); makeDecorativePlanets(20); makeMeteors(50);
  }

  function supernova() {
    return new Promise(res => {
      gsap.to(starField.scale, { x:0.1,y:0.1,z:0.1,duration:1.5,ease:'power1.in' });
      const size=512;
      const c=document.createElement('canvas'); c.width=c.height=size;
      const ctx=c.getContext('2d');
      const grad=ctx.createRadialGradient(size/2,size/2,0,size/2,size/2,size/2);
      ['#fff','#ffdd33','#ff6666','transparent'].forEach((c,i)=>grad.addColorStop(i/3,c));
      ctx.fillStyle=grad;ctx.fillRect(0,0,size,size);
      const tex=new THREE.CanvasTexture(c);
      const mat=new THREE.SpriteMaterial({ map:tex, transparent:true });
      const flash=new THREE.Sprite(mat);
      flash.scale.set(400,400,1);
      flash.position.copy(camera.position).add(camera.getWorldDirection(new THREE.Vector3()).multiplyScalar(10));
      scene.add(flash);
      const tl=gsap.timeline({ onComplete:()=>{scene.remove(flash);res();}});
      tl.to(mat,{opacity:0,duration:2,ease:'power2.out'},1.5);
      tl.to(starField.scale,{x:1,y:1,z:1,duration:2.5,ease:'power2.out'},1.5);
    });
  }

  function makeStars() {
    const geo=new THREE.BufferGeometry(); const N=20000;
    const pos=new Float32Array(N*3);
    for(let i=0;i<N;i++){
      const th=Math.random()*2*Math.PI, ph=Math.acos(2*Math.random()-1), r=1000;
      pos.set([r*Math.sin(ph)*Math.cos(th),r*Math.sin(ph)*Math.sin(th),r*Math.cos(ph)],i*3);
    }
    geo.setAttribute('position',new THREE.BufferAttribute(pos,3));
    starField=new THREE.Points(geo,new THREE.PointsMaterial({color:0xffffff,size:1}));
    scene.add(starField);
  }

  function makeLights() {
    scene.add(new THREE.HemisphereLight(0xffeebb,0x080822,0.6));
    scene.add(new THREE.PointLight(0xffffff,1.2,0));
  }

  function makeInteractivePlanets() {
    ITEMS.forEach((item,i)=>{
      const pivot=new THREE.Object3D(); pivot.visible=false; scene.add(pivot);
      const radius=i===0?0:15+Math.random()*20;
      const height=i===0?0:-5+Math.random()*10;
      const mat=new THREE.MeshStandardMaterial({color:COLORS[i],emissive:COLORS[i]*0.2});
      const mesh=new THREE.Mesh(new THREE.SphereGeometry(3,32,32),mat);
      mesh.position.set(radius,height,0);
      pivot.add(mesh);
      const label=makeLabel(item.label);
      label.position.set(radius,height+5,0);
      pivot.add(label);
      interactive.push({group:pivot,mesh,item});
    });
  }

  function makeDecorativePlanets(count) {
    for(let i=0;i<count;i++){
      const pivot=new THREE.Object3D(); pivot.visible=false; scene.add(pivot);
      const th=Math.random()*2*Math.PI, ph=Math.acos(2*Math.random()-1), r=50+Math.random()*350;
      const x=r*Math.sin(ph)*Math.cos(th), y=-30+Math.random()*60, z=-20-r*Math.cos(ph);
      // random pastel gradient material
      const hue=Math.random()*360;
      const mat=new THREE.MeshStandardMaterial({
        color:new THREE.Color(`hsl(${hue}, 70%, 60%)`),
        emissive:new THREE.Color(`hsl(${hue}, 70%, 50%)`)
      });
      const size=2+Math.random()*48;
      const mesh=new THREE.Mesh(new THREE.SphereGeometry(size,32,32),mat);
      mesh.position.set(x,y,z);
      pivot.add(mesh);
      decorative.push({group:pivot,mesh});
    }
  }

  function makeMeteors(count) {
    for(let i=0;i<count;i++){
      const mat=new THREE.MeshBasicMaterial({color:0xdddddd});
      const size=0.1+Math.random()*0.5;
      const mesh=new THREE.Mesh(new THREE.SphereGeometry(size,8,8),mat);
      mesh.position.set(-100+Math.random()*200,-50+Math.random()*100,-500+Math.random()*-500);
      mesh.visible=false; scene.add(mesh);
      meteors.push({mesh,speed:0.5+Math.random()*2});
    }
  }

  function makeLabel(text) {
    const c=document.createElement('canvas'); c.width=512; c.height=128;
    const ctx=c.getContext('2d');
    ctx.font='bold 48px Montserrat'; ctx.fillStyle='#fff'; ctx.textAlign='center';
    ctx.fillText(text,256,64);
    const tex=new THREE.CanvasTexture(c);
    const spr=new THREE.Sprite(new THREE.SpriteMaterial({map:tex,depthTest:false}));
    spr.scale.set(14,4,1);
    return spr;
  }

  function onClick(e) {
    const rect=renderer.domElement.getBoundingClientRect();
    mouse.x=((e.clientX-rect.left)/rect.width)*2-1;
    mouse.y=-((e.clientY-rect.top)/rect.height)*2+1;
    raycaster.setFromCamera(mouse,camera);
    const hit=raycaster.intersectObjects(interactive.map(o=>o.mesh))[0];
    // spawn particles at click
    const world=new THREE.Vector3(); raycaster.ray.at(30,world); spawnParticles(world);
    if(hit){
      const idx=interactive.map(o=>o.mesh).indexOf(hit.object);
      const it=interactive[idx].item;
      if(it.type==='video'){
        bgMusic.pause(); planetVideo.src=it.src; videoModal.style.display='flex';
      } else {
        messageModal.style.display='flex';
        typeWriter(planetMessage, it.message, 30);
      }
    }
  }

  function spawnParticles(pos){
    const count=40, geo=new THREE.BufferGeometry(), posArr=new Float32Array(count*3), vel=[];
    for(let i=0;i<count;i++){ posArr.set([pos.x,pos.y,pos.z],i*3); vel.push(new THREE.Vector3((Math.random()-0.5)*0.5,(Math.random()-0.5)*0.5,(Math.random()-0.5)*0.5)); }
    geo.setAttribute('position',new THREE.BufferAttribute(posArr,3));
    const mat=new THREE.PointsMaterial({color:0xffffff,size:0.3,transparent:true,opacity:1});
    const pts=new THREE.Points(geo,mat); scene.add(pts);
    particles.push({points:pts,velocities:vel});
  }

  // Typewriter effect
  function typeWriter(el, text, speed){
    el.textContent = '';
    let i=0;
    const timer = setInterval(()=>{
      if(i < text.length) el.textContent += text.charAt(i++);
      else clearInterval(timer);
    }, speed);
  }

  function onResize(){
    camera.aspect=window.innerWidth/window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth,window.innerHeight);
  }

  function animate(){
    requestAnimationFrame(animate);
    interactive.forEach((o,i)=>{ o.group.rotation.y+=0.0005 + i*0.0001; o.mesh.rotation.y+=0.002 + i*0.0005; });
    decorative.forEach((o,i)=>{ o.group.rotation.y+=0.0002 + i*0.00005; o.mesh.rotation.y+=0.001 + i*0.0002; });
    meteors.forEach(m=>{ m.mesh.visible=true; m.mesh.position.z+=m.speed; if(m.mesh.position.z>camera.position.z+10) m.mesh.position.z=-500+Math.random()*-300; });
    for(let i=particles.length-1;i>=0;i--){
      const p=particles[i], attr=p.points.geometry.attributes.position;
      p.velocities.forEach((v,j)=>{ attr.array[j*3]+=v.x; attr.array[j*3+1]+=v.y; attr.array[j*3+2]+=v.z; });
      attr.needsUpdate=true; p.points.material.opacity-=0.02;
      if(p.points.material.opacity<=0){ scene.remove(p.points); particles.splice(i,1); }
    }
    controls.update(); renderer.render(scene,camera);
  }
});
