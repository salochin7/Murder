(() => {
  if (!matchMedia('(hover: hover) and (pointer: fine)').matches ||
      matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const base = new URL('./', document.currentScript.src);
  const asset = name => new URL(name, base).href;
  const climb = ['crow-flap-up.svg', 'crow-dive-glide.svg', 'crow-flap-up-alt.svg', 'crow-dive-glide.svg'].map(asset);
  const cruise = ['crow-flap-up.svg', 'crow-dive-glide.svg', 'crow-flap-up-alt.svg', 'crow-dive-glide.svg'].map(asset);
  const dive = ['crow-dive-glide.svg', 'crow-dive-fold.svg', 'crow-dive-glide.svg'].map(asset);
  const perched = new URL('crow-perched.svg', base).href;
  // Align each pose by its torso rather than by the silhouette's outer bounds.
  // Offsets are pixels at the 72px displayed size; horizontal values mirror with facing.
  const bodyOffset = new Map([
    ['crow-flap-up.svg', [0, 0]],
    ['crow-flap-up-alt.svg', [-10, 1]],
    ['crow-dive-glide.svg', [-3, 6]],
    ['crow-dive-fold.svg', [-2, 9]],
  ].map(([name, offset]) => [asset(name), offset]));
  [...new Set([...climb, ...cruise, ...dive, perched])].forEach(src => { const preload = new Image(); preload.src = src; });

  const crow = document.createElement('div');
  crow.className = 'crow-companion';
  function setPose(src) {
    const image = `url("${src}")`;
    crow.style.maskImage = image;
    crow.style.webkitMaskImage = image;
  }
  setPose(cruise[0]);
  crow.setAttribute('aria-hidden', 'true');
  document.body.append(crow);

  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
  // Perched SVG talons are 13px right and 17px below the center at 72px display size.
  const talonX = 13, talonY = 17;
  let x = 0, y = 0, vx = 0, vy = 0;
  let pointerX = 0, pointerY = 0, anchorX = 0, anchorY = 0;
  let perchX = 0, perchY = 0, direction = 1;
  let lastIntent = 0, lastTick = 0, lastFrame = -1;
  let frameOffset = [0, 0];
  let state = 'hidden', scheduled = false;

  function findPerch() {
    let nearest = null, shortest = Infinity;
    const selector = '.button, .link-card, .feature-card, .mark-wrap, .tavern-banner img, header, .hero, .tavern-banner, .links, .feature, .sponsor, footer';
    document.querySelectorAll(selector).forEach(element => {
      if (element.closest('[hidden]')) return;
      const box = element.getBoundingClientRect();
      if (box.width < 30 || box.top < 8 || box.top > innerHeight - 8 || box.right < 0 || box.left > innerWidth) return;
      const px = clamp(pointerX, box.left + 12, box.right - 12);
      const distance = Math.hypot(pointerX - px, pointerY - box.top);
      if (distance < shortest) {
        shortest = distance;
        nearest = { x: px - direction * talonX, y: box.top - talonY };
      }
    });
    return nearest || { x: clamp(pointerX - direction * talonX, 36, innerWidth - 36), y: 9 };
  }

  function schedule() {
    if (scheduled || document.hidden) return;
    scheduled = true;
    requestAnimationFrame(tick);
  }

  function tick(now) {
    scheduled = false;
    if (state === 'perched') return;
    if (now - lastTick < 32) { schedule(); return; } // At most 30 position updates per second.
    const dt = Math.min((now - lastTick || 33) / 1000, 0.06);
    lastTick = now;

    if (state === 'flight' && now - lastIntent > 380) {
      const perch = findPerch();
      perchX = clamp(perch.x, 32, innerWidth - 32);
      perchY = perch.y;
      state = 'landing';
    }

    let targetX, targetY;
    if (state === 'flight') {
      // The crow pursues a loose pocket behind the pointer and weaves within it.
      targetX = clamp(pointerX - direction * 72 + Math.sin(now * 0.0026) * 18, 32, innerWidth - 32);
      targetY = clamp(pointerY + 22 + Math.sin(now * 0.0037 + 1.1) * 13, 32, innerHeight - 32);
    } else {
      targetX = perchX;
      targetY = perchY;
    }

    const dx = targetX - x, dy = targetY - y;
    const rising = dy < -35;
    const falling = dy > 45;
    const maxSpeed = state === 'flight'
      ? (rising ? 205 : falling ? 450 : 290)
      : (rising ? 230 : falling ? 390 : 320);
    const response = state === 'flight' ? (rising ? 4.2 : falling ? 3.7 : 3.4) : 7.2;
    const distance = Math.hypot(dx, dy);
    const speed = Math.min(maxSpeed, distance * (state === 'flight' ? (rising ? 2.0 : falling ? 3.0 : 2.4) : 4.5));
    const desiredX = distance ? dx / distance * speed : 0;
    const desiredY = distance ? dy / distance * speed : 0;
    const steering = Math.min(1, response * dt);
    vx += (desiredX - vx) * steering;
    vy += (desiredY - vy) * steering;
    x += vx * dt;
    y += vy * dt;

    if (state === 'landing' && distance < 2.5 && Math.hypot(vx, vy) < 18) {
      x = perchX; y = perchY; vx = vy = 0;
      setPose(perched);
      lastFrame = perched;
      frameOffset = [0, 0];
      state = 'perched';
    } else {
      if (state === 'flight' && vx > 40) direction = 1;
      if (state === 'flight' && vx < -40) direction = -1;
      const sequence = rising ? climb : falling ? dive : cruise;
      const cadence = rising ? 125 : falling ? 245 : 180;
      const frame = Math.floor(now / cadence) % sequence.length;
      const frameKey = sequence[frame];
      if (frameKey !== lastFrame) {
        setPose(frameKey);
        lastFrame = frameKey;
        frameOffset = bodyOffset.get(frameKey) || [0, 0];
      }
    }

    const bank = state === 'perched' ? 0 : clamp(vy * 0.035, -15, 15);
    crow.style.transform = `translate3d(${x - 36 + direction * frameOffset[0]}px, ${y - 36 + frameOffset[1]}px, 0) rotate(${bank}deg) scaleX(${direction})`;
    if (state !== 'perched') schedule();
  }

  document.addEventListener('pointermove', event => {
    if (event.pointerType !== 'mouse') return;
    const threshold = state === 'perched' || state === 'landing' ? 28 : 14;
    if (state !== 'hidden' && Math.hypot(event.clientX - anchorX, event.clientY - anchorY) < threshold) return;

    if (state === 'hidden') {
      x = event.clientX - 85;
      y = event.clientY + 20;
      crow.style.opacity = '1';
    }
    pointerX = anchorX = event.clientX;
    pointerY = anchorY = event.clientY;
    lastIntent = performance.now();
    state = 'flight';
    schedule();
  }, { passive: true });

  function reposition() {
    if (state === 'hidden') return;
    if (state === 'flight') { schedule(); return; }
    const perch = findPerch();
    perchX = clamp(perch.x, 32, innerWidth - 32);
    perchY = perch.y;
    state = 'landing';
    schedule();
  }
  window.addEventListener('scroll', reposition, { passive: true });
  window.addEventListener('resize', reposition);
  document.addEventListener('visibilitychange', () => { if (!document.hidden && (state === 'flight' || state === 'landing')) schedule(); });
})();
