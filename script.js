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

  /* ── Hangar ── */

  // Isometric line-art engine. View from the front, above: u points toward the viewer,
  // v to the right, z up. Every aircraft on the page is drawn by quad() below.
  var KX = 1.2247, KY = 0.7071;
  function P(u, v, z) { return [v * KX, u * KY - z]; }
  function f(n) { return String(Math.round(n * 10) / 10); }
  function poly(list, cls) {
    return '<polygon class="' + cls + '" points="' + list.map(function (p) { return f(p[0]) + ',' + f(p[1]); }).join(' ') + '"/>';
  }
  // A flat shape extruded from z0 to z1: faces turned toward the viewer, then the top.
  function prism(uv, z0, z1) {
    var cu = 0, cv = 0, s = '';
    uv.forEach(function (q) { cu += q[0]; cv += q[1]; });
    cu /= uv.length; cv /= uv.length;
    for (var i = 0; i < uv.length; i++) {
      var a = uv[i], b = uv[(i + 1) % uv.length];
      var nu = b[1] - a[1], nv = a[0] - b[0];
      if (nu * ((a[0] + b[0]) / 2 - cu) + nv * ((a[1] + b[1]) / 2 - cv) < 0) { nu = -nu; nv = -nv; }
      if (nu > 1e-6) s += poly([P(a[0], a[1], z1), P(b[0], b[1], z1), P(b[0], b[1], z0), P(a[0], a[1], z0)], 'side');
    }
    return s + poly(uv.map(function (q) { return P(q[0], q[1], z1); }), 'top');
  }
  function cyl(u, v, r, z0, z1) {
    var b = P(u, v, z0), t = P(u, v, z1), rx = r * KX, ry = r * KY;
    return '<path class="side" d="M' + f(t[0] - rx) + ' ' + f(t[1]) + 'L' + f(b[0] - rx) + ' ' + f(b[1]) +
      'A' + f(rx) + ' ' + f(ry) + ' 0 0 0 ' + f(b[0] + rx) + ' ' + f(b[1]) + 'L' + f(t[0] + rx) + ' ' + f(t[1]) + 'Z"/>' +
      '<ellipse class="top" cx="' + f(t[0]) + '" cy="' + f(t[1]) + '" rx="' + f(rx) + '" ry="' + f(ry) + '"/>';
  }
  function flatEllipse(u, v, z, r, cls) {
    var c = P(u, v, z);
    return '<ellipse class="' + cls + '" cx="' + f(c[0]) + '" cy="' + f(c[1]) + '" rx="' + f(r * KX) + '" ry="' + f(r * KY) + '"/>';
  }
  var BLADE = [[0.14, -0.06], [0.5, -0.15], [0.97, -0.08], [1, 0], [0.96, 0.05], [0.5, 0.07], [0.14, 0.06]];
  function bladePath(b, th) {
    var d = '';
    [0, Math.PI].forEach(function (off) {
      var c = Math.cos(th + off), s = Math.sin(th + off);
      BLADE.forEach(function (q, i) {
        var p = P(b.u + (q[0] * c - q[1] * s) * b.R, b.v + (q[0] * s + q[1] * c) * b.R, b.z);
        d += (i ? 'L' : 'M') + f(p[0]) + ' ' + f(p[1]);
      });
      d += 'Z';
    });
    return d;
  }

  // A quad in X layout, drawn in parts. s scales the whole aircraft (1 = a 5-inch).
  function quad(s, ducts) {
    var a = 55 * s, R = 42 * s, t = 4 * s, zm = t + 12 * s, zp = zm + 3 * s;
    var sc = function (list) { return list.map(function (q) { return [q[0] * s, q[1] * s]; }); };
    var sq = function (h) { return [[-h, -h], [h, -h], [h, h], [-h, h]]; };
    // rear-left, rear-right, front-left, front-right: back to front so nearer parts paint last
    var motors = [[-a, -a, 1], [-a, a, -1], [a, -a, -1], [a, a, 1]];

    var frame = '';
    motors.forEach(function (m) {
      var len = Math.hypot(m[0], m[1]), w = 5.5 * s, nu = -m[1] / len * w, nv = m[0] / len * w;
      frame += prism([[nu, nv], [m[0] + nu, m[1] + nv], [m[0] - nu, m[1] - nv], [-nu, -nv]], 0, t);
    });
    frame += prism(sc([[34, -14], [34, 14], [22, 20], [-22, 20], [-34, 14], [-34, -14], [-22, -20], [22, -20]]), 0, t);

    var motorsS = '';
    motors.forEach(function (m) { motorsS += cyl(m[0], m[1], 9 * s, t, zm) + cyl(m[0], m[1], 2.6 * s, zm, zp); });

    var b1 = t + 4 * s, b2 = t + 13 * s, posts = sc([[-8, -8], [-8, 8], [8, -8], [8, 8]]), stack = '';
    posts.forEach(function (q) { stack += cyl(q[0], q[1], 1.3 * s, t, b1); });
    stack += prism(sq(11 * s), b1, b1 + 2 * s);
    posts.forEach(function (q) { stack += cyl(q[0], q[1], 1.3 * s, b1 + 2 * s, b2); });
    stack += prism(sq(11 * s), b2, b2 + 2 * s);

    var vtx = b2 + 5 * s, cam = '';
    posts.forEach(function (q) { cam += cyl(q[0] * 0.8, q[1] * 0.8, 1.1 * s, b2 + 2 * s, vtx); });
    cam += prism(sq(9 * s), vtx, vtx + 2 * s);
    cam += prism(sc([[23, -9], [34, -9], [34, 9], [23, 9]]), t, t + 17 * s);
    var lens = P(34 * s, 0, t + 9 * s);
    cam += '<ellipse class="lens" cx="' + f(lens[0]) + '" cy="' + f(lens[1]) + '" rx="' + f(5.5 * s * KX) + '" ry="' + f(5.5 * s) + '"/>' +
           '<ellipse class="glint" cx="' + f(lens[0] + 2 * s) + '" cy="' + f(lens[1] - 2 * s) + '" rx="' + f(1.6 * s) + '" ry="' + f(1.6 * s) + '"/>';

    var rx = prism(sc([[-33, -6], [-25, -6], [-25, 6], [-33, 6]]), t, t + 5 * s);
    [-1, 1].forEach(function (sg) {
      var p0 = P(-29 * s, sg * 3 * s, t + 5 * s), p1 = P(-44 * s, sg * 13 * s, t + 32 * s);
      rx += '<path class="ant" d="M' + f(p0[0]) + ' ' + f(p0[1]) + 'L' + f(p1[0]) + ' ' + f(p1[1]) + '"/>' +
            '<circle class="ant-tip" cx="' + f(p1[0]) + '" cy="' + f(p1[1]) + '" r="' + f(2.2 * s) + '"/>';
    });

    var props = '', blades = [], start = [0.5, -0.5, 2.0, -2.0];
    motors.forEach(function (m, i) {
      var b = { u: m[0], v: m[1], z: zp, R: R, dir: m[2], th: start[i] };
      var Rd = R + 3 * s, d0 = zp - 7 * s, d1 = zp + 3 * s;
      if (ducts) props += flatEllipse(m[0], m[1], d0, Rd, 'duct-back');
      props += flatEllipse(m[0], m[1], zp, R, 'disc');
      props += '<path class="blade" d="' + bladePath(b, b.th) + '"/>';
      props += flatEllipse(m[0], m[1], zp + 0.5 * s, 3.2 * s, 'hub');
      if (ducts) {
        var c0 = P(m[0], m[1], d0), c1 = P(m[0], m[1], d1), ex = Rd * KX, ey = Rd * KY;
        props += '<path class="duct" d="M' + f(c1[0] - ex) + ' ' + f(c1[1]) + 'L' + f(c0[0] - ex) + ' ' + f(c0[1]) +
                 'A' + f(ex) + ' ' + f(ey) + ' 0 0 0 ' + f(c0[0] + ex) + ' ' + f(c0[1]) + 'L' + f(c1[0] + ex) + ' ' + f(c1[1]) + '"/>';
        props += flatEllipse(m[0], m[1], d1, Rd, 'duct');
      }
      blades.push(b);
    });

    return { frame: frame, motors: motorsS, stack: stack, camera: cam, receiver: rx, props: props, blades: blades };
  }

  // Spinning props: one animation loop shared by every drawing that is spun up.
  // Motors spool up and down instead of switching on and off.
  var spinRaf = 0, spinLast = 0, spinSets = [];
  function spinTick(now) {
    spinRaf = 0;
    var dt = spinLast ? Math.min(48, now - spinLast) : 16, any = false;
    spinLast = now;
    spinSets.forEach(function (set) {
      var goal = set.on ? 1 : 0;
      set.rate += (goal - set.rate) * (1 - Math.exp(-dt / 260));
      if (!set.on && set.rate < 0.01) set.rate = 0;
      if (set.rate === 0) return;
      any = true;
      set.blades.forEach(function (b, i) {
        b.th += b.dir * dt * 0.022 * set.rate;
        set.els[i].setAttribute('d', bladePath(b, b.th));
      });
    });
    if (any) spinRaf = requestAnimationFrame(spinTick);
    else spinLast = 0;
  }
  function spinSet(root, blades) {
    var set = { qa: root, blades: blades, els: Array.prototype.slice.call(root.querySelectorAll('.blade')), on: false, rate: 0 };
    spinSets.push(set);
    return set;
  }
  function setSpin(set, on) {
    on = on && !reduceMotion;
    if (set.on === on) return;
    set.on = on;
    set.qa.classList.toggle('spinning', on);
    if (!spinRaf) spinRaf = requestAnimationFrame(spinTick);
  }

  /* 1. The build: scroll assembles the exploded quad, one stage per step */
  (function () {
    var build = $('build'), art = $('build-art'), meter = $('build-meter');
    var steps = Array.prototype.slice.call(document.querySelectorAll('#build-steps li'));
    var Q = quad(1, false);
    // paint order (back to front) differs from build order, so each group carries its step
    var ORDER = [['frame', 0], ['motors', 1], ['receiver', 4], ['stack', 2], ['camera', 3], ['props', 5]];
    var LIFT = [0, 90, 150, 205, 255, 310];  // how far each step's parts float above the frame when exploded
    art.innerHTML = '<g class="qa">' + ORDER.map(function (o) {
      return '<g class="part" data-step="' + o[1] + '">' + Q[o[0]] + '</g>';
    }).join('') + '</g>';
    var qa = art.firstChild, parts = Array.prototype.slice.call(art.querySelectorAll('.part'));
    var set = spinSet(qa, Q.blades);
    var VB1 = [-125, -100, 250, 162];  // the assembled aircraft's frame
    var live = !reduceMotion;
    if (!live) build.classList.add('no-build');
    function clamp(x) { return Math.max(0, Math.min(1, x)); }
    function smooth(x) { x = clamp(x); return x * x * x * (x * (x * 6 - 15) + 10); }  // smootherstep: gentle start and landing
    function n2(x) { return (Math.round(x * 100) / 100).toString(); }

    // Scroll sets a target; the drawing glides toward it, so wheel ticks and trackpad flicks
    // never make parts jump. Each part's descent overlaps the next, so something is always settling.
    var target = 7, cur = 7, raf = 0, last = 0, lastActive = -1;
    function readTarget() {
      if (!live) return 7;
      var stageH = innerHeight - 56, range = build.offsetHeight - stageH;
      var p = range > 0 ? clamp((56 - build.getBoundingClientRect().top) / range) : 1;
      return Math.min(7, p / 0.88 * 7);   // the last stretch of scroll rests on the finished aircraft
    }
    function render(sf) {
      var active = Math.min(6, Math.floor(sf + 0.0001));
      var floating = 0;
      parts.forEach(function (g) {
        var k = +g.dataset.step;
        var t = k === 0 ? 1 : smooth((sf - (k - 0.3)) / 1.1);   // part k travels from step k-0.3 to k+0.8
        floating = Math.max(floating, LIFT[k] * (1 - t));
        g.setAttribute('transform', 'translate(0 ' + n2(-LIFT[k] * (1 - t)) + ')');
        g.style.opacity = n2(0.45 + 0.55 * smooth(t * 2.5));     // waiting parts recede, landing parts come forward
        g.classList.toggle('on', live && k === active && sf < 6.98);
      });
      // The frame follows the highest part still in the air, so nothing is ever cropped
      // and the view closes in on the aircraft as it comes together.
      var top = VB1[1] - floating - 2, bottom = VB1[1] + VB1[3];
      art.setAttribute('viewBox', [VB1[0], n2(top), VB1[2], n2(bottom - top)].join(' '));
      if (live && active !== lastActive) {
        lastActive = active;
        steps.forEach(function (li, i) {
          li.classList.toggle('on', i === active);
          li.classList.toggle('done', i < active);
        });
      }
      meter.style.transform = 'scaleX(' + n2(clamp(sf / 7)) + ')';
      var r = build.getBoundingClientRect();
      setSpin(set, sf >= 5.9 && r.bottom > 0 && r.top < innerHeight);
    }
    function tick(now) {
      raf = 0;
      var dt = last ? Math.min(64, now - last) : 16;
      last = now;
      cur += (target - cur) * (1 - Math.exp(-dt / 150));
      if (Math.abs(target - cur) < 0.0008) cur = target;
      render(cur);
      if (cur !== target) raf = requestAnimationFrame(tick);
      else last = 0;
    }
    function onScroll() {
      target = readTarget();
      if (!raf) raf = requestAnimationFrame(tick);
    }
    addEventListener('scroll', onScroll, { passive: true });
    addEventListener('resize', onScroll);
    target = cur = readTarget();
    render(cur);
  })();

  /* 2. The hangar: every aircraft side by side on one ground line, to scale, keyed to a spec sheet */
  var fleet = [
    { id: 'agrifly', name: 'Agrifly', inch: 10, cls: 'Agricultural UAV', role: 'Pesticide spraying and crop monitoring',
      desc: 'The largest aircraft in the fleet. A 10-inch platform built for agricultural pesticide spraying and field monitoring, and the airframe behind the Agrifly project.' },
    { id: 'manta', name: 'Manta', inch: 5, cls: 'Freestyle', role: 'Freestyle FPV',
      desc: 'A 5-inch freestyle FPV drone, built for acrobatic flying.' },
    { id: 'switchback', name: 'Switchback', inch: 5, cls: 'Racing', role: 'FPV drone racing',
      desc: 'A 5-inch FPV racing drone, built and tuned for the race track.' },
    { id: 'apex', name: 'Apex', inch: 3, cls: 'Micro racing', role: 'Micro drone racing',
      desc: 'A 3-inch micro racer for tight, technical tracks.' },
    { id: 'cinebot30', name: 'Cinebot 30', inch: 3, cls: 'Cinematic', role: 'Cinematic FPV flying', ducts: true,
      desc: 'A ducted cinematic rig for smooth, close-proximity FPV footage.' }
  ];
  (function () {
    var hangar = $('hangar'), lineup = $('lineup'), sheet = $('spec-sheet'), sets = {};
    // Columns are as wide as each aircraft's propeller size, and each drawing fills its column, so the lineup is to scale.
    lineup.style.gridTemplateColumns = fleet.map(function (d) { return 'minmax(0, ' + d.inch + 'fr)'; }).join(' ');
    // Scale bar: 10 inches of propeller as a share of the lineup width. A 5-inch prop disc spans 84 * KX
    // of its drawing's 284-unit-wide viewBox, and that drawing fills 5 of the lineup's fr.
    var total = fleet.reduce(function (n, d) { return n + d.inch; }, 0);
    hangar.style.setProperty('--ten-in', (84 * KX / 284 * 10 / total * 100).toFixed(2) + '%');
    function pair(id, on) {
      hangar.querySelectorAll('[data-craft="' + id + '"]').forEach(function (el) { el.classList.toggle('is-on', on); });
      setSpin(sets[id], on);
    }
    fleet.forEach(function (d, i) {
      var s = d.inch / 5, Q = quad(s, d.ducts), lift = 20 * s, n = i + 1;
      var vb = [-142 * s, -124 * s, 284 * s, 208 * s];
      var item = document.createElement('li'), card = document.createElement('li');
      item.className = 'craft';
      card.className = 'spec-card';
      item.dataset.craft = card.dataset.craft = d.id;
      item.style.setProperty('--lift', f(-10 * s) + 'px');  // SVG user units, so the lift scales with the drawing
      item.innerHTML =
        '<svg viewBox="' + vb.map(f).join(' ') + '" role="img" aria-label="Drawing of ' + d.name + ', ' + d.inch + '-inch">' +
          '<g class="qa">' +
            flatEllipse(0, 0, 0, 112 * s, 'pad') + flatEllipse(0, 0, 0, 84 * s, 'pad-inner') + flatEllipse(0, 0, 0, 48 * s, 'shadow') +
            '<g class="drone"><g transform="translate(0 ' + f(-lift) + ')">' +
              Q.frame + Q.motors + Q.receiver + Q.stack + Q.camera + Q.props +
            '</g></g>' +
          '</g></svg>' +
        '<p class="craft-tag" aria-hidden="true"><span class="callout">' + n + '</span><span class="craft-inch">' + d.inch + '&Prime;</span></p>';
      card.innerHTML =
        '<div class="spec-photo"></div>' +
        '<p class="bay-class"><span class="callout" aria-hidden="true">' + n + '</span>' + d.cls + '</p>' +
        '<h4 class="bay-name">' + d.name + '</h4>' +
        '<dl class="bay-spec">' +
          '<div><dt>Propeller</dt><dd>' + d.inch + '-inch</dd></div>' +
          '<div><dt>Role</dt><dd>' + d.role + '</dd></div>' +
          '<div><dt>Built and tuned</dt><dd>By Rokith</dd></div>' +
        '</dl>' +
        '<p class="bay-desc">' + d.desc + '</p>';
      lineup.appendChild(item);
      sheet.appendChild(card);
      sets[d.id] = spinSet(item.querySelector('.qa'), Q.blades);
      [item, card].forEach(function (el) {
        el.addEventListener('pointerenter', function (e) { if (e.pointerType === 'mouse') pair(d.id, true); });
        el.addEventListener('pointerleave', function (e) { if (e.pointerType === 'mouse') pair(d.id, false); });
        // Touch has no hover: a tap spins this aircraft up and the others down.
        el.addEventListener('pointerdown', function (e) {
          if (e.pointerType === 'mouse') return;
          var on = !el.classList.contains('is-on');
          fleet.forEach(function (o) { pair(o.id, on && o.id === d.id); });
        });
      });
      // Photos can't be kept to scale, so they go in the spec card; the lineup stays line art.
      tryPhoto('assets/drones/' + d.id + '.jpg', d.name, function (img) {
        card.querySelector('.spec-photo').appendChild(img);
      });
    });
  })();

  /* ── Projects: the Agrifly mission sheet draws the same 10-inch aircraft as the hangar ── */
  (function () {
    var card = $('agrifly'), art = $('agrifly-art');
    if (!card || !art) return;
    var s = 2, Q = quad(s, false);
    art.setAttribute('viewBox', [-142 * s, -124 * s, 284 * s, 208 * s].map(f).join(' '));
    art.innerHTML = '<g class="qa">' +
      flatEllipse(0, 0, 0, 112 * s, 'pad') + flatEllipse(0, 0, 0, 84 * s, 'pad-inner') + flatEllipse(0, 0, 0, 48 * s, 'shadow') +
      '<g class="drone"><g transform="translate(0 ' + f(-20 * s) + ')">' +
        Q.frame + Q.motors + Q.receiver + Q.stack + Q.camera + Q.props +
      '</g></g></g>';
    var set = spinSet(art.firstChild, Q.blades);
    card.addEventListener('mouseenter', function () { setSpin(set, true); });
    card.addEventListener('mouseleave', function () { setSpin(set, card.contains(document.activeElement)); });
    card.addEventListener('focusin', function () { setSpin(set, true); });
    card.addEventListener('focusout', function (e) { if (!card.contains(e.relatedTarget)) setSpin(set, card.matches(':hover')); });
    tryPhoto('assets/drones/agrifly.jpg', 'Agrifly, the 10-inch agricultural drone', function (img) { art.replaceWith(img); });
  })();

  /* ── Contact: isometric landing pad. The quad flies the approach line, touches down on the H and spools down. ── */
  (function () {
    var art = $('lp-art'), fig = art && art.closest('.lp-pad');
    if (!art) return;
    var SVGNS = 'http://www.w3.org/2000/svg';
    var s = 0.58, R = 118, DECK = 6, BODY = 7;           // quad scale (smaller than the deck, like a real helipad); deck radius and thickness; body centre height
    var U0 = -30, V0 = 80, H0 = 150;                     // where the approach starts: behind-right of the pad, 150 up
    function pt(p) { return f(p[0]) + ' ' + f(p[1]); }

    // deck: a low disc with its rings, an H painted on top and edge lights
    var g = '<g class="qa">' + cyl(0, 0, R, 0, DECK).replace('class="side"', 'class="lp-deck-side"').replace('class="top"', 'class="lp-deck"');
    g += flatEllipse(0, 0, DECK, 104, 'lp-ring') + flatEllipse(0, 0, DECK, 82, 'pad-inner');
    // H wider than the quad's propeller span (about ±53), so the bars stay visible once it has landed
    [[-44, -56, 44, -42], [-44, 42, 44, 56], [-6, -42, 6, 42]].forEach(function (b) {   // [u0, v0, u1, v1]
      g += poly([P(b[0], b[1], DECK), P(b[0], b[3], DECK), P(b[2], b[3], DECK), P(b[2], b[1], DECK)], 'lp-h');
    });
    for (var i = 0; i < 8; i++) {
      var a = i * Math.PI / 4 + Math.PI / 8;
      g += flatEllipse(Math.cos(a) * 112, Math.sin(a) * 112, DECK, 3.2, 'lp-light');
    }
    // approach line: a straight glide slope from the start point to the body of the landed quad
    g += '<path class="lp-path" d="M' + pt(P(U0, V0, DECK + H0 + BODY)) + 'L' + pt(P(0, 0, DECK + BODY)) + '"/>';
    g += '<ellipse class="shadow" id="lp-shadow"/>';
    var Q = quad(s, false);
    g += '<g id="lp-drone">' + Q.frame + Q.motors + Q.receiver + Q.stack + Q.camera + Q.props + '</g></g>';
    art.innerHTML = g;

    // frame: crop to the deck; the approach line and the incoming quad draw above it (the svg has overflow: visible),
    // so the figure doesn't reserve empty sky and the layout stays compact on narrow screens
    var top = -R * KY - 22, right = P(U0, V0, 0)[0] + 112;
    var left = -R * KX - 8, bottom = R * KY + DECK + 8;
    art.setAttribute('viewBox', [left, top, right - left, bottom - top].map(f).join(' '));

    var drone = $('lp-drone'), shadow = $('lp-shadow');
    var set = spinSet(art.firstChild, Q.blades);
    function place(t) {                                   // t: 0 = start of approach, 1 = on the pad
      var u = U0 * (1 - t), v = V0 * (1 - t), h = H0 * (1 - t);
      var d = P(u, v, DECK + h), c = P(u, v, DECK), k = 1 - 0.45 * h / H0;
      drone.setAttribute('transform', 'translate(' + pt(d) + ')');
      shadow.setAttribute('cx', f(c[0])); shadow.setAttribute('cy', f(c[1]));
      shadow.setAttribute('rx', f(44 * s * KX * k)); shadow.setAttribute('ry', f(44 * s * KY * k));
      shadow.style.opacity = f(0.09 * (0.25 + 0.75 * t));
    }

    var landed = false;
    function land() {
      var start = null, DUR = 2200;
      setSpin(set, true);
      requestAnimationFrame(function step(now) {
        if (start === null) start = now;
        var x = Math.min(1, (now - start) / DUR);
        place(1 - Math.pow(1 - x, 3));                 // ease out: a long approach, a gentle flare onto the pad
        if (x < 1) requestAnimationFrame(step);
        else { landed = true; setTimeout(function () { if (!fig.matches(':hover')) setSpin(set, false); }, 450); }
      });
    }
    if (reduceMotion || !('IntersectionObserver' in window)) { place(1); landed = true; }
    else {
      place(0);
      var io = new IntersectionObserver(function (en) {
        if (en[0].isIntersecting) { io.disconnect(); land(); }
      }, { threshold: 0.45 });
      io.observe(fig);
    }
    // once it has landed, hovering the pad spins the props up again
    fig.addEventListener('mouseenter', function () { if (landed) setSpin(set, true); });
    fig.addEventListener('mouseleave', function () { if (landed) setSpin(set, false); });
  })();

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

  /* ── Landing: compose panel. mailto alone does nothing on machines without a desktop mail app, so the
        briefs open an editable message the visitor can send through Gmail, Outlook, their app, or copy. ── */
  (function () {
    var dlg = $('compose');
    if (!dlg || typeof dlg.showModal !== 'function') return;   // no <dialog> support: the mailto links keep working
    var TO = 'rokithkumaar742@gmail.com';
    var subj = $('compose-subject'), body = $('compose-body'), status = $('compose-status');
    var gmail = $('send-gmail'), outlook = $('send-outlook'), app = $('send-app'), copyBtn = $('send-copy');
    var opener = null, timer = 0;
    var enc = encodeURIComponent;
    function crlf(t) { return t.replace(/\r?\n/g, '\r\n'); }   // mail clients expect CRLF line breaks

    function sync() {
      var s = subj.value, b = crlf(body.value);
      gmail.href = 'https://mail.google.com/mail/?view=cm&fs=1&to=' + enc(TO) + '&su=' + enc(s) + '&body=' + enc(b);
      outlook.href = 'https://outlook.live.com/mail/0/deeplink/compose?to=' + enc(TO) + '&subject=' + enc(s) + '&body=' + enc(b);
      app.href = 'mailto:' + TO + '?subject=' + enc(s) + '&body=' + enc(b);
    }
    function say(msg) {
      status.textContent = msg;
      clearTimeout(timer);
      timer = setTimeout(function () { status.textContent = ''; }, 4000);
    }
    function open(link) {
      var q = new URLSearchParams((link.getAttribute('href').split('?')[1]) || '');
      $('compose-code').textContent = link.dataset.code || '';
      $('compose-title').textContent = link.dataset.title || 'Email Rokith';
      subj.value = q.get('subject') || '';
      body.value = (q.get('body') || '').replace(/\r\n/g, '\n');
      status.textContent = '';
      sync();
      opener = link;
      dlg.showModal();
      // put the cursor on the first blank line of the template so the visitor can start typing
      var at = body.value.indexOf(':\n'), pos = at >= 0 ? at + 1 : body.value.indexOf('\n\n') + 2;
      body.focus();
      if (pos > 0) body.setSelectionRange(pos, pos);
      body.scrollTop = 0;                                   // keep the greeting in view on short screens
    }
    function close() { dlg.close(); }

    document.querySelectorAll('[data-compose]').forEach(function (link) {
      link.addEventListener('click', function (e) {
        if (e.ctrlKey || e.metaKey || e.shiftKey || e.button) return;   // let modified clicks behave normally
        e.preventDefault();
        open(link);
      });
    });
    subj.addEventListener('input', sync);
    body.addEventListener('input', sync);
    $('compose-close').addEventListener('click', close);
    $('compose-form').addEventListener('submit', function (e) { e.preventDefault(); });
    dlg.addEventListener('click', function (e) { if (e.target === dlg) close(); });   // click on the backdrop
    dlg.addEventListener('close', function () { if (opener) opener.focus(); });
    [gmail, outlook].forEach(function (a) {
      a.addEventListener('click', function () { say('Opened in a new tab. Send it from there.'); });
    });
    app.addEventListener('click', function () {
      say('Opening your email app. If nothing happens, use Gmail, Outlook or Copy message.');
    });
    copyBtn.addEventListener('click', function () {
      var text = 'To: ' + TO + '\nSubject: ' + subj.value + '\n\n' + body.value;
      function done() { say('Message copied. Paste it into any email to ' + TO + '.'); }
      if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(text).then(done, function () { body.select(); say('Message selected. Press Ctrl+C to copy.'); });
      } else { body.select(); say('Message selected. Press Ctrl+C to copy.'); }
    });
  })();

  /* ── Landing: copy the email address. Without the Clipboard API, select it (and try the old copy command). ── */
  (function () {
    var btn = $('copy-mail'), mail = $('lp-mail'), status = $('copy-status'), timer = 0;
    function show(label, msg) {
      btn.textContent = label;
      btn.classList.toggle('done', label !== 'Copy');
      status.textContent = msg;
      clearTimeout(timer);
      timer = setTimeout(function () { btn.textContent = 'Copy'; btn.classList.remove('done'); status.textContent = ''; }, 2000);
    }
    function fallback() {
      var r = document.createRange(), sel = getSelection();
      r.selectNodeContents(mail);
      sel.removeAllRanges();
      sel.addRange(r);
      var ok = false;
      try { ok = document.execCommand('copy'); } catch (e) {}
      if (ok) show('Copied ✓', 'Email address copied');
      else status.textContent = 'Email address selected. Press Ctrl+C to copy.';
    }
    btn.addEventListener('click', function () {
      if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(btn.dataset.copy).then(function () { show('Copied ✓', 'Email address copied'); }, fallback);
      } else fallback();
    });
  })();

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
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (en) { visible = en[0].isIntersecting; kick(); }).observe(hero);
    }
    if (reduceMotion || matchMedia('(hover: none)').matches) $('hero-hint').hidden = true;
    size();
    kick();
  })();
})();
