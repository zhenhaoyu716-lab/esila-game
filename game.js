(() => {
  'use strict';
  const { FruitWorld, RADII } = FruitPhysics;
  const canvas = document.getElementById('game'), ctx = canvas.getContext('2d');
  const nextCanvas = document.getElementById('next');
  const scoreEl = document.getElementById('score'), bestEl = document.getElementById('best');
  const overlay = document.getElementById('overlay'), hint = document.getElementById('start-hint');
  const names = Array.from({ length: RADII.length }, (_, level) => `${level + 1}号`);
  const colors = ['#efc24c', '#eb6872', '#9880bc', '#f3ae52', '#efa13e', '#dc6b5c', '#ccd66d', '#f4b2ac', '#e8c957', '#cbdc8b', '#7eae66'];
  const imageFiles = ['1.jpg', '2.jpg', '3.jpg', '4.jpg', '5.jpg', '6.jpg', '7.jpg', '8.jpg', '9.png', '10.png', '11.jpg'];
  const fruitImages = imageFiles.map((file, level) => {
    const picture = new Image();
    picture.onload = () => {
      const icon = document.querySelectorAll('.fruit-row canvas')[level];
      if (icon) { const c = icon.getContext('2d'); c.clearRect(0, 0, 64, 64); drawFruit(c, level, 32, 35, 22); }
      updateNext();
    };
    picture.onerror = () => console.warn(`未能加载${level + 1}号图片：${file}`);
    picture.src = `新建文件夹/${file}`;
    return picture;
  });
  let score = 0, best = 0, aim = 215, current = 0, next = 0;
  let cooldown = 0, started = false, paused = false, gameOver = false, won = false;
  let effects = [], floating = [], soundOn = false, audioContext;
  try { best = Math.max(0, Number(localStorage.getItem('little-orchard-best')) || 0); } catch (_) {}
  bestEl.textContent = best;

  function circle(c, x, y, r, color) { c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2); c.fillStyle = color; c.fill(); }
  function drawFruit(c, level, x, y, r, angle = 0, alpha = 1) {
    c.save(); c.globalAlpha = alpha; c.translate(x, y); c.rotate(angle); c.scale(r, r);
    c.shadowColor = '#65552b20'; c.shadowBlur = r * .10; c.shadowOffsetY = 2;
    circle(c, 0, 0, .98, colors[level]); c.shadowColor = 'transparent';
    const picture = fruitImages[level];
    if (picture.complete && picture.naturalWidth > 0) {
      // Display the original image inside the circular game piece.
      c.save(); c.beginPath(); c.arc(0, 0, .98, 0, Math.PI * 2); c.clip();
      const size = Math.min(picture.naturalWidth, picture.naturalHeight);
      const sx = (picture.naturalWidth - size) / 2;
      const sy = (picture.naturalHeight - size) / 2;
      c.drawImage(picture, sx, sy, size, size, -1, -1, 2, 2);
      c.restore();
    } else {
      c.fillStyle = '#504832'; c.font = 'bold .65px system-ui';
      c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(String(level + 1), 0, 0);
    }
    c.beginPath(); c.arc(0, 0, .98, 0, Math.PI * 2);
    c.strokeStyle = '#6d60351f'; c.lineWidth = .025; c.stroke(); c.restore();
  }

  names.forEach((name, level) => {
    const row = document.createElement('div'); row.className = 'fruit-row';
    const number = document.createElement('span'); number.className = 'fruit-number'; number.textContent = String(level+1).padStart(2,'0');
    const icon = document.createElement('canvas'); icon.width = 64; icon.height = 64;
    drawFruit(icon.getContext('2d'), level, 32, 35, 22);
    const label = document.createElement('span'); label.className = 'fruit-name'; label.textContent = name;
    const arrow = document.createElement('span'); arrow.className = 'fruit-arrow'; arrow.textContent = level === 10 ? '✦' : '↓';
    row.append(number, icon, label, arrow); document.getElementById('fruit-guide').append(row);
  });

  function tone(level, drop = false) {
    if (!soundOn) return;
    try {
      if (!audioContext) audioContext = new (window.AudioContext || window.webkitAudioContext)();
      audioContext.resume();
      const oscillator = audioContext.createOscillator(), gain = audioContext.createGain();
      oscillator.type = 'sine'; const t = audioContext.currentTime;
      oscillator.frequency.setValueAtTime(drop ? 260 : 330 * Math.pow(1.12, level), t);
      oscillator.frequency.exponentialRampToValueAtTime(drop ? 160 : 550 * Math.pow(1.10, level), t+.12);
      gain.gain.setValueAtTime(.0001,t); gain.gain.exponentialRampToValueAtTime(.075,t+.015); gain.gain.exponentialRampToValueAtTime(.0001,t+.2);
      oscillator.connect(gain); gain.connect(audioContext.destination); oscillator.start(t); oscillator.stop(t+.22);
    } catch (_) {}
  }
  const world = new FruitWorld(({fruit, points}) => {
    // Reaching EsiLA fixes this round's score at 388, including any remaining chain merges.
    score = won || fruit.level === 10 ? 388 : score + points;
    scoreEl.textContent = score;
    if (score > best) { best = score; bestEl.textContent = best; try { localStorage.setItem('little-orchard-best', String(best)); } catch (_) {} }
    for (let i = 0; i < 12; i++) {
      const angle = i / 12 * Math.PI * 2;
      effects.push({x:fruit.x,y:fruit.y,vx:Math.cos(angle)*(60+Math.random()*70),vy:Math.sin(angle)*(60+Math.random()*70),life:.65,color:colors[fruit.level],r:2+Math.random()*3});
    }
    if (!won || fruit.level === 10) {
      floating.push({x:fruit.x,y:fruit.y-fruit.r,text:fruit.level === 10 ? '388!' : '+'+points,life:1});
    }
    tone(fruit.level);
    if (fruit.level === 10 && !won) { won = true; setTimeout(() => { if (!gameOver && won) showResult(true); }, 350); }
  });
  canvas.height = world.height;
  document.querySelector('.danger-label').style.top = `${85 / world.height * 100}%`;
  function randomFruit() { return Math.floor(Math.random() * 4); }
  function updateNext() {
    const c = nextCanvas.getContext('2d'); c.clearRect(0,0,64,64); drawFruit(c,next,32,35,21);
    nextCanvas.setAttribute('aria-label','下一颗：'+names[next]);
  }
  function reset() {
    world.reset(); score = 0; scoreEl.textContent = '0'; current = randomFruit(); next = randomFruit(); updateNext();
    aim = 215; cooldown = 0; started = false; paused = false; gameOver = false; won = false; effects = []; floating = [];
    overlay.hidden = true; hint.style.opacity = '1';
    lastTime = performance.now(); accumulator = 0;
  }
  function drop() {
    if (paused || gameOver || cooldown > 0) return;
    const r = RADII[current]; world.add(current, Math.max(12+r,Math.min(418-r,aim)),48,{spin:(Math.random()-.5)*.5});
    current = next; next = randomFruit(); updateNext(); cooldown = .48; started = true; hint.style.opacity = '0'; tone(current,true);
  }
  function showResult(victory) {
    paused = true; gameOver = !victory; overlay.hidden = false;
    document.getElementById('result-label').textContent = victory ? '小e，大E' : '每一颗都是小小的收获';
    document.getElementById('result-title').textContent = victory ? '合成EsiLA成功！' : '没品的东西...';
    document.getElementById('result-score').innerHTML = score + ' <span>分</span>';
    document.getElementById('continue').hidden = !victory;
  }
  function pointerPosition(event) {
    const rect = canvas.getBoundingClientRect(); aim = (event.clientX-rect.left)*430/rect.width;
    const r = RADII[current]; aim = Math.max(12+r,Math.min(418-r,aim));
  }
  canvas.addEventListener('pointermove', pointerPosition);
  canvas.addEventListener('pointerdown', event => { if (event.button !== 0) return; event.preventDefault(); pointerPosition(event); canvas.focus({preventScroll:true}); drop(); });
  document.addEventListener('keydown', event => {
    if (event.target.tagName === 'BUTTON' || event.target.tagName === 'A') return;
    if (['ArrowLeft','ArrowRight',' ','Enter'].includes(event.key)) {
      event.preventDefault(); if (event.key === 'ArrowLeft') aim -= 15; else if (event.key === 'ArrowRight') aim += 15; else if (!event.repeat) drop();
      const r = RADII[current]; aim = Math.max(12+r,Math.min(418-r,aim));
    }
  });
  document.getElementById('restart').addEventListener('click',reset);
  document.getElementById('play-again').addEventListener('click',reset);
  document.getElementById('continue').addEventListener('click',() => { overlay.hidden = true; paused = false; accumulator = 0; });
  document.getElementById('sound').addEventListener('click',event => {
    soundOn = !soundOn; const button = event.currentTarget;
    button.querySelector('.sound-status').textContent = soundOn ? '开' : '关';
    button.setAttribute('aria-label',soundOn ? '关闭声音' : '开启声音'); button.title = soundOn ? '关闭声音' : '开启声音';
    if (soundOn) tone(1);
  });
  document.addEventListener('visibilitychange', () => { lastTime = performance.now(); accumulator = 0; });

  function render(dt) {
    ctx.clearRect(0,0,canvas.width,canvas.height);
    // A quiet dotted paper texture inside the glass fruit basket.
    ctx.fillStyle = '#dde2cf70';
    for (let x = 25; x < world.width; x += 24) for (let y = 124; y <= world.floor; y += 24) { ctx.beginPath(); ctx.arc(x,y,.65,0,Math.PI*2); ctx.fill(); }
    const danger = world.dangerTime > .2;
    ctx.save(); ctx.setLineDash([5,7]); ctx.strokeStyle = danger ? '#d78b6e' : '#cdd5b9'; ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.moveTo(13,100); ctx.lineTo(417,100); ctx.stroke(); ctx.restore();
    if (!paused && !gameOver) {
      const r = RADII[current], previewX = Math.max(12+r,Math.min(418-r,aim));
      if (cooldown <= 0) {
        ctx.save(); ctx.setLineDash([3,8]); ctx.strokeStyle='#bac7a263'; ctx.beginPath(); ctx.moveTo(previewX,48+r+12); ctx.lineTo(previewX,world.floor-17); ctx.stroke(); ctx.restore();
        drawFruit(ctx,current,previewX,48,r,0,.9);
        ctx.fillStyle='#7e956255'; ctx.beginPath(); ctx.moveTo(previewX-4,15); ctx.lineTo(previewX+4,15); ctx.lineTo(previewX,21); ctx.fill();
      } else {
        ctx.fillStyle='#a4b48b'; ctx.font='10px system-ui'; ctx.textAlign='center'; ctx.fillText('下一颗准备中…',215,45);
      }
    }
    for (const b of world.bodies) {
      const pop = b.merged ? 1 - .18 * Math.exp(-b.age * 9) * Math.cos(b.age * 22) : 1;
      const squash = b.impactStrength * Math.exp(-b.impactAge * 10) * Math.cos(b.impactAge * 26);
      ctx.save(); ctx.translate(b.x, b.y); ctx.rotate(b.impactAngle);
      ctx.scale(1 - squash, 1 / (1 - squash)); ctx.rotate(-b.impactAngle);
      drawFruit(ctx,b.level,0,0,b.r*pop,b.angle); ctx.restore();
    }
    if (!paused) {
      effects = effects.filter(p => p.life > 0); floating = floating.filter(p => p.life > 0);
      for (const p of effects) { p.life -= dt; p.x += p.vx*dt; p.y += p.vy*dt; p.vy += 150*dt; }
      for (const f of floating) { f.life -= dt; f.y -= 32*dt; }
    }
    for (const p of effects) { ctx.globalAlpha = Math.max(0,p.life/.65); circle(ctx,p.x,p.y,p.r,p.color); }
    ctx.globalAlpha = 1;
    for (const f of floating) { ctx.globalAlpha = Math.max(0,f.life); ctx.font='bold 18px system-ui'; ctx.fillStyle='#658149'; ctx.textAlign='center'; ctx.fillText(f.text,f.x,f.y); }
    ctx.globalAlpha = 1;
    if (danger && !gameOver) { ctx.fillStyle='#cc8764'; ctx.font='11px "Microsoft YaHei"'; ctx.textAlign='center'; ctx.fillText('快满啦，快合e位',215,82); }
  }
  let lastTime = performance.now(), accumulator = 0;
  function frame(now) {
    const dt = Math.min((now-lastTime)/1000,.05); lastTime = now;
    if (!paused && !document.hidden) {
      cooldown = Math.max(0,cooldown-dt); accumulator += dt;
      while (accumulator >= 1/120) { const lost = world.step(1/120); accumulator -= 1/120; if (lost) { showResult(false); accumulator = 0; break; } }
    }
    render(dt); requestAnimationFrame(frame);
  }
  reset(); requestAnimationFrame(frame);
})();

