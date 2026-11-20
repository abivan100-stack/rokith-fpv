/* rokith.fpv — interactions. No dependencies. */
(function () {
  'use strict';
  var reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var $ = function (id) { return document.getElementById(id); };

  /* ── Age and year, so the page never goes stale ── */
  (function () {
    var now = new Date();
    var born = { y: 2009, m: 12, d: 12 };
    var age = now.getFullYear() - born.y;
    if (now.getMonth() + 1 < born.m || (now.getMonth() + 1 === born.m && now.getDate() < born.d)) age--;
    $('age').textContent = age;
    $('year').textContent = now.getFullYear();
  })();

  /* ── Theme toggle ── */
  $('theme-toggle').addEventListener('click', function () {
    var next = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
    document.documentElement.dataset.theme = next;
    try { localStorage.setItem('rokith-theme', next); } catch (e) {}
  });

  /* ── Optional photos: drop a file at the path and it appears. Missing files are ignored. ── */
  function tryPhoto(src, alt, onload) {
    var img = new Image();
    img.alt = alt;
    img.onload = function () { onload(img); };
    img.src = src;
  }
  tryPhoto('assets/rokith.jpg', 'Rokith Kumaar', function (img) {
    var fig = $('portrait');
    fig.appendChild(img);
    fig.hidden = false;
  });

  /* ── Fleet ── */
  var fleet = [
    { id: 'agrifly', name: 'Agrifly', inch: 10, size: '10-inch', cls: 'Agricultural UAV', role: 'Pesticide spraying and crop monitoring',
      desc: 'The largest aircraft in the fleet. A 10-inch platform built for agricultural pesticide spraying and field monitoring, and the airframe behind the Agrifly project.' },
    { id: 'manta', name: 'Manta', inch: 5, size: '5-inch', cls: 'Freestyle', role: 'Freestyle FPV',
      desc: 'A 5-inch freestyle FPV drone, built for acrobatic flying.' },
    { id: 'switchback', name: 'Switchback', inch: 5, size: '5-inch', cls: 'Racing', role: 'FPV drone racing',
      desc: 'A 5-inch FPV racing drone, built and tuned for the race track.' },
    { id: 'apex', name: 'Apex', inch: 3, size: '3-inch', cls: 'Micro racing', role: 'Micro drone racing',
      desc: 'A 3-inch micro racer for tight, technical tracks.' },
    { id: 'cinebot30', name: 'Cinebot 30', inch: 3, size: '3-inch', cls: 'Cinematic', role: 'Cinematic FPV flying', ducts: true,
      desc: 'A ducted cinematic rig for smooth, close-proximity FPV footage.' }
  ];

  // Top-view schematic, scaled by prop size. Illustrative, not a CAD drawing.
  function blueprint(d) {
    var c = 160, off = (56 + d.inch * 4.4) * 0.7071, r = 10 + d.inch * 5.2;
    var s = '<svg viewBox="0 0 320 320" role="img" aria-label="Top-view schematic of ' + d.name + '">';
    s += '<path class="bp-thin" d="M160 12V308M12 160H308"/>';
    [[-1, -1], [1, -1], [1, 1], [-1, 1]].forEach(function (q, i) {
      var x = c + q[0] * off, y = c + q[1] * off;
      s += '<path class="bp" d="M' + c + ' ' + c + 'L' + x + ' ' + y + '"/>';
      s += '<circle class="bp-thin" cx="' + x + '" cy="' + y + '" r="' + r + '"/>';
      if (d.ducts) s += '<circle class="bp" cx="' + x + '" cy="' + y + '" r="' + (r + 5) + '"/>';
      s += '<g class="prop' + (i % 2 ? ' ccw' : '') + '"><path class="bp-acc" d="M' + (x - r + 3) + ' ' + y + 'H' + (x + r - 3) + '"/><circle cx="' + x + '" cy="' + y + '" r="' + r + '" fill="none"/></g>';
      s += '<circle class="bp-fill" cx="' + x + '" cy="' + y + '" r="5"/>';
    });
    s += '<rect class="bp-fill" x="142" y="124" width="36" height="72" rx="5"/>';
    s += '<path class="bp-acc" d="M152 136L160 128L168 136"/>';
    s += '<text x="160" y="24" text-anchor="middle">FRONT</text>';
    s += '<text x="160" y="304" text-anchor="middle">' + d.size.toUpperCase() + ' · TOP VIEW</text>';
    return s + '</svg>';
  }

  var tabs = $('fleet-tabs'), current = -1;
  function showCraft(i, focus) {
    if (i === current) return;
    current = i;
    var d = fleet[i];
    Array.prototype.forEach.call(tabs.children, function (b, n) {
      b.setAttribute('aria-selected', n === i ? 'true' : 'false');
      b.tabIndex = n === i ? 0 : -1;
      if (n === i && focus) b.focus();
    });
    $('fleet-panel').setAttribute('aria-labelledby', 'tab-' + d.id);
    $('fleet-blueprint').innerHTML = blueprint(d);
    $('fleet-class').textContent = d.cls;
    $('fleet-name').textContent = d.name;
    $('fleet-desc').textContent = d.desc;
    $('fleet-size').textContent = d.size;
    $('fleet-role').textContent = d.role;
    tryPhoto('assets/drones/' + d.id + '.jpg', d.name, function (img) {
      if (fleet[current] === d) $('fleet-blueprint').appendChild(img);
    });
  }
  fleet.forEach(function (d, i) {
    var b = document.createElement('button');
    b.type = 'button';
    b.id = 'tab-' + d.id;
    b.setAttribute('role', 'tab');
    b.setAttribute('aria-controls', 'fleet-panel');
    b.innerHTML = d.name + ' <span>' + (d.inch + '"') + '</span>';
    b.addEventListener('click', function () { showCraft(i); });
    tabs.appendChild(b);
  });
  tabs.addEventListener('keydown', function (e) {
    var step = (e.key === 'ArrowDown' || e.key === 'ArrowRight') ? 1 : (e.key === 'ArrowUp' || e.key === 'ArrowLeft') ? -1 : 0;
    if (!step) return;
    e.preventDefault();
    showCraft((current + step + fleet.length) % fleet.length, true);
  });
  showCraft(0);

  /* ── Reveal on scroll ── */
  var reveals = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window && !reduceMotion) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); }
      });
    }, { rootMargin: '0px 0px -8% 0px' });
    reveals.forEach(function (el) { io.observe(el); });
  } else {
    reveals.forEach(function (el) { el.classList.add('in'); });
  }

  /* ── Flight rail + active nav ── */
  var sections = Array.prototype.slice.call(document.querySelectorAll('[data-wp]'));
  var rail = document.querySelector('.rail'), marker = $('rail-marker'), label = $('rail-label');
  var navLinks = document.querySelectorAll('.nav a');
  var dots = sections.map(function () {
    var d = document.createElement('div');
    d.className = 'rail-dot';
    rail.insertBefore(d, marker);
    return d;
  });
  var stops = [];
  function measure() {
    var max = Math.max(1, document.documentElement.scrollHeight - innerHeight);
    stops = sections.map(function (s) { return Math.min(1, s.offsetTop / max); });
    var h = rail.clientHeight - 48;
    dots.forEach(function (d, i) { d.style.top = (24 + stops[i] * h) + 'px'; });
    onScroll();
  }
  function onScroll() {
    var max = Math.max(1, document.documentElement.scrollHeight - innerHeight);
    var p = Math.min(1, Math.max(0, scrollY / max));
    marker.style.top = (24 + p * (rail.clientHeight - 48)) + 'px';
    var probe = scrollY + innerHeight * 0.35, active = 0;
    sections.forEach(function (s, i) { if (s.offsetTop <= probe) active = i; });
    if (p > 0.995) active = sections.length - 1;
    label.textContent = sections[active].dataset.wp;
    dots.forEach(function (d, i) { d.classList.toggle('passed', i <= active); });
    navLinks.forEach(function (a) { a.classList.toggle('on', a.getAttribute('href') === '#' + sections[active].id); });
  }
  addEventListener('scroll', onScroll, { passive: true });
  addEventListener('resize', measure);
  addEventListener('load', measure);
  measure();

  /* ── Hero: a line-art quad that follows the cursor and leaves a flight trail ── */
  (function () {
    var cv = $('sky'), hero = $('hero'), ctx = cv.getContext('2d');
    var W = 0, H = 0, dpr = 1;
    var pos = { x: 0, y: 0 }, vel = { x: 0, y: 0 }, target = null, heading = 0, lastMove = -1e9;
    var trail = [], t0 = performance.now(), visible = true, raf = 0, spin = 0;

    function size() {
      dpr = Math.min(2, devicePixelRatio || 1);
      W = hero.clientWidth; H = hero.clientHeight;
      cv.width = W * dpr; cv.height = H * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      if (!pos.x) { pos.x = W * 0.72; pos.y = H * 0.45; }
    }
    function colors() {
      var cs = getComputedStyle(document.documentElement);
      return { ink: cs.getPropertyValue('--ink').trim(), accent: cs.getPropertyValue('--accent').trim(), muted: cs.getPropertyValue('--muted').trim() };
    }
    // With no pointer, the quad flies a slow figure-eight on the open side of the hero.
    function auto(t) {
      var wide = W > 820;
      var cx = wide ? W * 0.72 : W * 0.5, cy = wide ? H * 0.48 : 100;
      var ax = wide ? W * 0.18 : W * 0.32, ay = wide ? H * 0.24 : 14;
      return { x: cx + Math.sin(t * 0.00045) * ax, y: cy + Math.sin(t * 0.0009) * ay };
    }
    function drawQuad(c, s) {
      var arm = 17 * s, r = 11 * s;
      ctx.save();
      ctx.translate(pos.x, pos.y);
      ctx.rotate(heading);
      ctx.lineWidth = 1.5; ctx.lineCap = 'round';
      ctx.strokeStyle = c.ink;
      ctx.beginPath();
      ctx.moveTo(-arm, -arm); ctx.lineTo(arm, arm);
      ctx.moveTo(arm, -arm); ctx.lineTo(-arm, arm);
      ctx.stroke();
      [[-1, -1], [1, -1], [1, 1], [-1, 1]].forEach(function (q, i) {
        var x = q[0] * arm, y = q[1] * arm, a = spin * (i % 2 ? -1 : 1);
        ctx.strokeStyle = c.muted; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.arc(x, y, r, 0, 6.2832); ctx.stroke();
        ctx.strokeStyle = c.accent; ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(x - Math.cos(a) * r, y - Math.sin(a) * r);
        ctx.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r);
        ctx.stroke();
      });
      ctx.fillStyle = c.ink;
      ctx.fillRect(-5 * s, -9 * s, 10 * s, 18 * s);
      ctx.fillStyle = c.accent;
      ctx.fillRect(-2 * s, -9 * s, 4 * s, 4 * s);
      ctx.restore();
    }
    function frame(t) {
      raf = 0;
      if (!visible) return;
      var c = colors();
      var goal = (target && t - lastMove < 4000) ? target : auto(t - t0);
      // Spring toward the goal: a little overshoot reads as a real quad correcting itself.
      vel.x += (goal.x - pos.x) * 0.012; vel.y += (goal.y - pos.y) * 0.012;
      vel.x *= 0.9; vel.y *= 0.9;
      pos.x += vel.x; pos.y += vel.y;
      var speed = Math.hypot(vel.x, vel.y);
      if (speed > 0.15) {
        var want = Math.atan2(vel.y, vel.x) + Math.PI / 2, diff = want - heading;
        while (diff > Math.PI) diff -= 6.2832;
        while (diff < -Math.PI) diff += 6.2832;
        heading += diff * 0.08;
      }
      spin += 0.5 + speed * 0.05;
      var last = trail[trail.length - 1];
      if (!last || Math.hypot(pos.x - last.x, pos.y - last.y) > 7) trail.push({ x: pos.x, y: pos.y });
      if (trail.length > 90) trail.shift();

      ctx.clearRect(0, 0, W, H);
      ctx.lineWidth = 1.2;
      ctx.setLineDash([2, 7]);
      for (var i = 1; i < trail.length; i++) {
        ctx.globalAlpha = (i / trail.length) * 0.75;
        ctx.strokeStyle = c.accent;
        ctx.beginPath(); ctx.moveTo(trail[i - 1].x, trail[i - 1].y); ctx.lineTo(trail[i].x, trail[i].y); ctx.stroke();
      }
      ctx.setLineDash([]);
      ctx.globalAlpha = 1;
      drawQuad(c, W > 820 ? 1.5 : 1.1);
      if (!reduceMotion) raf = requestAnimationFrame(frame);
    }
    function kick() { if (!raf && visible) raf = requestAnimationFrame(frame); }

    hero.addEventListener('pointermove', function (e) {
      if (e.pointerType === 'touch') return;
      var b = hero.getBoundingClientRect();
      target = { x: e.clientX - b.left, y: e.clientY - b.top };
      lastMove = performance.now();
    });
    hero.addEventListener('pointerleave', function () { target = null; });
    addEventListener('resize', function () { size(); kick(); });
    new MutationObserver(kick).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (en) { visible = en[0].isIntersecting; kick(); }).observe(hero);
    }
    if (reduceMotion || matchMedia('(hover: none)').matches) $('hero-hint').hidden = true;
    size();
    kick();
  })();
})();
