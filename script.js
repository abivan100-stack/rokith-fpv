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

  /* ── Fleet, part 3: the kit as a loop ──
        Radio, aircraft and goggles stand on stations along a track on the ground plane, so the track is drawn in
        u, v like everything else and its corners come out as the same flattened ellipses as the pads. The ground
        station branches off the aircraft. The drawing is laid out in CSS pixels from the stage's width and the
        measured tags, and redrawn when that width changes:
        >= 1100px the loop with every tag beside its device; 760-1099px the loop with the tags in a grid below;
        phone a vertical spine, each device level with its tag. The motion is CSS (offset-path packets and a
        translating dash pattern), paused unless .live; the quad's props idle while .live. */
  (function () {
    var stage = $('kit-stage'), art = $('kit-art');
    if (!stage || !art) return;
    var li = {};
    stage.querySelectorAll('.kit-loop > li').forEach(function (el) { li[el.dataset.kit] = el; });
    var phone = matchMedia('(max-width: 759px)'), wide = matchMedia('(min-width: 1100px)');
    var Q = quad(1, false), set = null;
    var motion = !reduceMotion && CSS.supports('offset-path', 'path("M0 0L1 1")');
    art.classList.toggle('k-still', !motion);                              // no motion path, or reduced motion: marks hold still mid-link
    function pt(p) { return f(p[0]) + ' ' + f(p[1]); }
    function line(pts) { return 'M' + pts.map(pt).join('L'); }
    function g(cls, body, kit, tf) { return '<g class="' + cls + '"' + (kit ? ' data-kit="' + kit + '"' : '') + (tf ? ' transform="' + tf + '"' : '') + '>' + body + '</g>'; }
    function ring(F, cx, cy, r, t, cls) {                                    // a circle drawn on a tilted face
      var pts = [];
      for (var i = 0; i < 28; i++) { var a = i / 28 * Math.PI * 2; pts.push(F(cx + r * Math.cos(a), cy + r * Math.sin(a), t)); }
      return poly(pts, cls);
    }
    // A slab on a tilted face F(x, y, t): sides that face the viewer, then the front.
    function slab(F, outline, t0, t1) {
      function area(p) { var a = 0; for (var i = 0; i < p.length; i++) { var q = p[(i + 1) % p.length]; a += p[i][0] * q[1] - q[0] * p[i][1]; } return a; }
      var front = outline.map(function (q) { return F(q[0], q[1], t1); }), sg = area(front) > 0, s = '';
      outline.forEach(function (a, i) {
        var b = outline[(i + 1) % outline.length], face = [F(b[0], b[1], t1), F(a[0], a[1], t1), F(a[0], a[1], t0), F(b[0], b[1], t0)];
        if ((area(face) > 0) === sg) s += poly(face, 'side');
      });
      return s + poly(front, 'top');
    }

    // A convex outline extruded from z0 to z1 with a smooth side: the faces turned toward the viewer are drawn as one
    // band (so rounded ends don't show every facet), then the top.
    function smooth(uv, z0, z1) {
      var n = uv.length, vis = [], i, s = -1, cu = 0, cv = 0;
      uv.forEach(function (q) { cu += q[0]; cv += q[1]; }); cu /= n; cv /= n;
      for (i = 0; i < n; i++) {                                              // does the outward normal point toward the viewer (+u)?
        var a = uv[i], b = uv[(i + 1) % n], nu = b[1] - a[1], nv = a[0] - b[0];
        if (nu * ((a[0] + b[0]) / 2 - cu) + nv * ((a[1] + b[1]) / 2 - cv) < 0) nu = -nu;
        vis.push(nu > 1e-6);
      }
      for (i = 0; i < n; i++) if (vis[i] && !vis[(i + n - 1) % n]) s = i;
      var top = [], bot = [];
      if (s >= 0) for (i = s; ; i = (i + 1) % n) {
        top.push(P(uv[i][0], uv[i][1], z1)); bot.push(P(uv[i][0], uv[i][1], z0));
        if (!vis[i]) break;
      }
      return (top.length ? poly(top.concat(bot.reverse()), 'side') : '') + poly(uv.map(function (q) { return P(q[0], q[1], z1); }), 'top');
    }
    function turn(a) { var c = Math.cos(a), s = Math.sin(a); return function (u, v) { return [u * c - v * s, u * s + v * c]; }; }

    // The devices, each standing on the ground at its own origin (model units: the quad's 1 = a 5-inch).
    function radio() {
      // held at the pilot's angle and turned a little toward the aircraft: the face leans back about 35 degrees
      // from upright; x across it, y up it, t out of it
      var c = Math.cos(.98), sn = Math.sin(.98), R = turn(.26);
      function F(x, y, t) { var r = R(12 - y * c + t * sn, x); return P(r[0], r[1], 4 + y * sn + t * c); }
      var s = '', top = 54;
      // antenna and shoulder switches first: the body hides their feet
      var a0 = F(0, top - 3, -6), a1 = F(0, top + 7, -8), w = 3.2;
      s += '<path class="ant" d="M' + pt(a0) + 'L' + pt(a1) + '"/>';
      s += poly([F(-w, top + 6, -8), F(w, top + 6, -8), F(w, top + 27, -10), F(0, top + 30, -10.5), F(-w, top + 27, -10)], 'side');
      [-1, 1].forEach(function (k) {
        var b = F(k * 28, top - 1, -4), t = F(k * 30, top + 8, -4);
        s += '<path class="k-stick k-thin" d="M' + pt(b) + 'L' + pt(t) + '"/><circle class="top" cx="' + f(t[0]) + '" cy="' + f(t[1]) + '" r="2.2"/>';
      });
      s += slab(F, [[-18, 0], [-36, 0], [-42, 9], [-42, 44], [-35, top], [35, top], [42, 44], [42, 9], [36, 0], [18, 0], [12, 7], [-12, 7]], -12, 0);
      s += poly([F(-12, 32, 0), F(12, 32, 0), F(12, 46, 0), F(-12, 46, 0)], 'k-screen');                  // the screen
      s += '<path class="k-lcd" d="M' + pt(F(-8, 41.5, 0)) + 'L' + pt(F(2, 41.5, 0)) + 'M' + pt(F(-8, 37, 0)) + 'L' + pt(F(6, 37, 0)) + '"/>';
      [-1, 1].forEach(function (k) {
        s += ring(F, k * 24, 23, 11.5, 0, 'side') + ring(F, k * 24, 23, 7.5, .1, 'top');
        var b = F(k * 24, 23, 0), t = F(k * 24 + (k < 0 ? 0 : 2), 23 + (k < 0 ? 4 : -1), 15);   // left stick: a little throttle
        s += '<path class="k-stick" d="M' + pt(b) + 'L' + pt(t) + '"/><circle class="top" cx="' + f(t[0]) + '" cy="' + f(t[1]) + '" r="3.4"/>';
      });
      s += ring(F, -6, 13, 2, 0, 'top') + ring(F, 6, 13, 2, 0, 'top');
      return s;
    }
    function goggles() {
      // turned a little toward the aircraft, so the front, one end and the foam at the back all show
      var s = '', U = 12, V = 34, z0 = 4, z1 = 27, R = turn(-.34), i, j;
      function G(u, v, z) { var r = R(u, v); return P(r[0], r[1], z); }
      function box(u0, u1, v0, r) {                                          // a rounded rectangle in u, v, turned
        var o = [];
        [[u1 - r, v0 - r, 0], [u0 + r, v0 - r, 1], [u0 + r, -v0 + r, 2], [u1 - r, -v0 + r, 3]].forEach(function (c) {
          for (var j = 0; j <= 5; j++) { var a = c[2] * Math.PI / 2 + j / 5 * Math.PI / 2; o.push(R(c[0] + r * Math.cos(a), c[1] + r * Math.sin(a))); }
        });
        return o;
      }
      // the strap: a band from the ends round the back of the head
      var top = [], bot = [];
      for (i = 0; i <= 32; i++) {
        var t = i / 32 * Math.PI, u = -U - 3 - 28 * Math.sin(t), v = (V - 5) * Math.cos(t);
        top.push(G(u, v, 19)); bot.push(G(u, v, 12));
      }
      s += '<g class="k-foam">' + poly(top.concat(bot.reverse()), 'side') + smooth(box(-U - 6, -U + 2, V - 3, 6), z0 + 2, z1 - 2) + '</g>';
      s += smooth(box(-U, U, V, 9), z0, z1);
      // faceplate: an inset panel on the front, a nose cut-out under it, a status light
      var fp = [];
      for (j = 0; j <= 16; j++) { var b = j / 16; fp.push(G(U, -V + 11 + b * (2 * V - 22), z1 - 4 - 1.5 * Math.sin(b * Math.PI))); }
      for (j = 16; j >= 0; j--) { b = j / 16; fp.push(G(U, -V + 11 + b * (2 * V - 22), z0 + 8 + 1.5 * Math.sin(b * Math.PI))); }
      s += poly(fp, 'k-plate');
      s += '<path class="k-nose" d="M' + pt(G(U, -8, z0)) + 'Q' + pt(G(U, 0, z0 + 14)) + ' ' + pt(G(U, 8, z0)) + 'Z"/>';
      var led = G(U, V - 16, z1 - 9);
      s += '<circle class="k-led" cx="' + f(led[0]) + '" cy="' + f(led[1]) + '" r="1.8"/>';
      [-1, 1].forEach(function (k) {                                         // two receiver antennas on top
        var p0 = G(-4, k * (V - 9), z1), p1 = G(-8, k * (V - 3), z1 + 16);
        s += '<path class="ant" d="M' + pt(p0) + 'L' + pt(p1) + '"/><circle class="ant-tip" cx="' + f(p1[0]) + '" cy="' + f(p1[1]) + '" r="2.1"/>';
      });
      return s;
    }
    function laptop() {
      var s = prism([[-16, -27], [-16, 27], [16, 27], [16, -27]], 0, 2.6);
      s += poly([P(-11, -22, 2.6), P(-11, 22, 2.6), P(4, 22, 2.6), P(4, -22, 2.6)], 'k-keys');
      s += poly([P(7, -7, 2.6), P(7, 7, 2.6), P(13, 7, 2.6), P(13, -7, 2.6)], 'k-keys');
      function L(a, b) { return P(-16 - 10 * b, -27 + 54 * a, 2.6 + 36 * b); }   // a across the lid, b up it
      s += poly([L(0, 0), L(1, 0), L(1, 1), L(0, 1)], 'top');
      s += poly([L(.06, .1), L(.94, .1), L(.94, .92), L(.06, .92)], 'k-screen');
      var grid = '', i;
      for (i = 1; i < 6; i++) grid += 'M' + pt(L(.06 + .88 * i / 6, .1)) + 'L' + pt(L(.06 + .88 * i / 6, .92));
      for (i = 1; i < 4; i++) grid += 'M' + pt(L(.06, .1 + .82 * i / 4)) + 'L' + pt(L(.94, .1 + .82 * i / 4));
      s += '<path class="k-grid" d="' + grid + '"/>';
      // a mission on the map: home, then waypoints joined by the planned route
      var wp = [[.2, .3], [.38, .74], [.56, .34], [.74, .76], [.84, .4]].map(function (q) { return L(q[0], q[1]); });
      s += '<path class="k-route" d="' + line(wp) + '"/>';
      wp.forEach(function (p, j) { s += j ? '<circle class="k-wp" cx="' + f(p[0]) + '" cy="' + f(p[1]) + '" r="1.9"/>' : '<rect class="k-home" x="' + f(p[0] - 2.6) + '" y="' + f(p[1] - 2.6) + '" width="5.2" height="5.2"/>'; });
      return s;
    }
    function quadBody() { return '<g class="k-quad">' + Q.frame + Q.motors + Q.receiver + Q.stack + Q.camera + Q.props + '</g>'; }
    // Each device: its station disc's radius (model units), its size on the loop, its drawing, how high it floats
    // and how tall it stands.
    var DEV = {
      hands: { R: 50, s: 1, body: radio, lift: 0, top: 100 },
      air: { R: 88, s: .58, body: quadBody, lift: 30, top: 80 },
      eyes: { R: 46, s: 1.05, body: goggles, lift: 0, top: 50 },
      ground: { R: 42, s: 1.08, body: laptop, lift: 0, top: 44 }
    };
    // A device on its station: a flat disc on the ground, a soft shadow, the drawing, and a hit area for pointing.
    function device(kit, x, y, k) {
      var d = DEV[kit], hw = d.R * KX * k, h = (d.top + d.lift) * k;
      return g('k-dev', '<rect class="k-hit" x="' + f(-hw) + '" y="' + f(-h) + '" width="' + f(hw * 2) + '" height="' + f(h + d.R * KY * k) + '"/>' +
        g('qa', flatEllipse(0, 0, 0, d.R, 'k-station') + flatEllipse(0, 0, 0, d.R * .6, 'shadow') +
          (d.lift ? '<g transform="translate(0 ' + f(-d.lift) + ')">' + d.body() + '</g>' : d.body()), '', 'scale(' + k + ')'),
        kit, 'translate(' + f(x) + ' ' + f(y) + ')');
    }

    // Polylines: length, and the point and heading at a distance along them.
    function along(pts, d) {
      for (var i = 1; i < pts.length; i++) {
        var a = pts[i - 1], b = pts[i], l = Math.hypot(b[0] - a[0], b[1] - a[1]);
        if (d <= l || i === pts.length - 1) { var t = Math.min(1, d / l); return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, Math.atan2(b[1] - a[1], b[0] - a[0])]; }
        d -= l;
      }
    }
    function len(pts) { var n = 0; for (var i = 1; i < pts.length; i++) n += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); return n; }
    function arrow(p, cls) {
      var c = Math.cos(p[2]), s = Math.sin(p[2]), L = 9, W = 4.2;
      return poly([[p[0] + c * L / 2, p[1] + s * L / 2], [p[0] - c * L / 2 - s * W, p[1] - s * L / 2 + c * W], [p[0] - c * L / 2 + s * W, p[1] - s * L / 2 - c * W]], 'k-arrow' + (cls ? ' ' + cls : ''));
    }
    // A link: a band (a dashed lane for the return) with an arrowhead where it reaches the next device, and its moving
    // marks on an offset-path along the centre line. start and stop trim the link to where it leaves and reaches each
    // device's outline, so nothing shows through a device when it is dimmed. The marks are phased so that the 0 s frame
    // (reduced motion, no offset-path support, off screen) spaces them evenly along the link.
    var T = 6;
    function locate(c, d) {                                                  // segment index and fraction at distance d
      for (var i = 1; i < c.length; i++) { var l = Math.hypot(c[i][0] - c[i - 1][0], c[i][1] - c[i - 1][1]); if (d <= l || i === c.length - 1) return [i, Math.min(1, d / l)]; d -= l; }
    }
    function cut(pts, a, b) {                                                // the part of pts between two locate() results
      function at(q) { var p = pts[q[0] - 1], n = pts[q[0]]; return [p[0] + (n[0] - p[0]) * q[1], p[1] + (n[1] - p[1]) * q[1]]; }
      return [at(a)].concat(pts.slice(a[0], b[0]), [at(b)]);
    }
    function link(kit, c0, inner, outer, start, stop, mark, n) {
      var ret = kit === 'loop', s = '', a = locate(c0, start), b = locate(c0, len(c0) - stop);
      var c = cut(c0, a, b), I = cut(inner, a, b), O = outer === inner ? I : cut(outer, a, b), L = len(c), path = line(c);
      if (!ret) s += '<path class="k-band" d="' + line(O.concat(I.slice().reverse())) + 'Z"/>';
      s += '<path class="' + (ret ? 'k-ret' : 'k-edge') + '" d="' + line(I) + (O !== I ? line(O) : '') + '"/>';
      s += arrow(along(c, L - 4.5), ret ? 'ret' : '');
      for (var i = 0; i < n; i++) {
        var at = (i + .5) / n, p = along(c, L * at);
        s += '<g class="' + (ret ? 'k-ret-run' : 'k-run') + '"' + (motion
          ? ' style="offset-path: path(\'' + path + '\'); --d: ' + f(-at * T) + 's"'
          : ' transform="translate(' + pt(p) + ') rotate(' + f(p[2] * 180 / Math.PI) + ')"') + '>' + mark + '</g>';
      }
      return g('k-link', s, kit);
    }
    var PKT = '<circle class="k-pkt" r="3.2"/>';
    var FRAME = '<rect class="k-frame" x="-5.5" y="-4" width="11" height="8" rx="1.2"/>';
    var PULSE = '<circle class="k-pulse" r="4"/><circle class="k-pulse" cx="-7.5" r="2.7" opacity=".6"/><circle class="k-pulse" cx="-13.5" r="1.7" opacity=".35"/>';
    // Two lanes of dashes running opposite ways, clipped to the link, with an arrowhead at each end: x0,y0 -> x1,y1.
    function mapLink(x0, y0, x1, y1) {
      var dx = x1 - x0, dy = y1 - y0, l = Math.hypot(dx, dy), ux = dx / l, uy = dy / l, nx = -uy * 4.5, ny = ux * 4.5, per = 8;
      var s = '<clipPath id="kit-clip"><path d="M' + f(x0 + nx * 2) + ' ' + f(y0 + ny * 2) + 'L' + f(x1 + nx * 2) + ' ' + f(y1 + ny * 2) + 'L' + f(x1 - nx * 2) + ' ' + f(y1 - ny * 2) + 'L' + f(x0 - nx * 2) + ' ' + f(y0 - ny * 2) + 'Z"/></clipPath>';
      [1, -1].forEach(function (k) {
        var a = [x0 + nx * k - ux * per, y0 + ny * k - uy * per], b = [x1 + nx * k + ux * per, y1 + ny * k + uy * per];
        s += '<g clip-path="url(#kit-clip)"><path class="k-map k-flow" style="--fx: ' + f(ux * per * k) + 'px; --fy: ' + f(uy * per * k) + 'px" d="M' + pt(a) + 'L' + pt(b) + '"/></g>';
      });
      s += arrow([x1 + nx - ux * 4, y1 + ny - uy * 4, Math.atan2(dy, dx)]) + arrow([x0 - nx + ux * 4, y0 - ny + uy * 4, Math.atan2(-dy, -dx)]);
      return g('k-link', s, 'map');
    }
    function place(kit, x, y, ax, ay, al) {
      var st = li[kit].style;
      st.left = f(x) + 'px'; st.top = f(y) + 'px';
      st.transform = 'translate(' + ax + ', ' + ay + ')';
      if (al) { st.alignItems = al; st.textAlign = al === 'flex-end' ? 'right' : al === 'center' ? 'center' : 'left'; }
    }
    function clear() { Object.keys(li).forEach(function (k) { li[k].removeAttribute('style'); }); }

    // Desktop and tablet: the loop. The track's centre line is a rounded rectangle in u, v, run clockwise from the radio;
    // track(d) gives it as three runs (control, video, return), offset d outward.
    var Wt = 9;                                                              // half the track width
    function track(O, U0, U1, V0, V1, RR, d) {
      function S(u, v, nu, nv) { var p = P(u + nu * d, v + nv * d, 0); return [p[0] + O[0], p[1] + O[1]]; }
      function arc(cu, cv, fn, out) { for (var i = 1; i < 12; i++) { var n = fn(i / 12 * Math.PI / 2); out.push(S(cu + n[0] * RR, cv + n[1] * RR, n[0], n[1])); } }
      var a = [S(0, V0, 0, -1), S(U0 + RR, V0, 0, -1)];
      arc(U0 + RR, V0 + RR, function (t) { return [-Math.sin(t), -Math.cos(t)]; }, a);
      a.push(S(U0, V0 + RR, -1, 0), S(U0, 0, -1, 0));
      var b = [S(U0, 0, -1, 0), S(U0, V1 - RR, -1, 0)];
      arc(U0 + RR, V1 - RR, function (t) { return [-Math.cos(t), Math.sin(t)]; }, b);
      b.push(S(U0 + RR, V1, 0, 1), S(0, V1, 0, 1));
      var c = [S(0, V1, 0, 1), S(U1 - RR, V1, 0, 1)];
      arc(U1 - RR, V1 - RR, function (t) { return [Math.sin(t), Math.cos(t)]; }, c);
      c.push(S(U1, V1 - RR, 1, 0), S(U1, V0 + RR, 1, 0));
      arc(U1 - RR, V0 + RR, function (t) { return [Math.cos(t), -Math.sin(t)]; }, c);
      c.push(S(U1 - RR, V0, 0, -1), S(0, V0, 0, -1));
      return [a, b, c];
    }
    function drawLoop() {
      var full = wide.matches, W = stage.clientWidth, k = Math.min(1.25, Math.max(.95, W / 900));
      var sc = function (kit) { return DEV[kit].s * k; };
      var half = function (kit) { return DEV[kit].R * KX * sc(kit); }, low = function (kit) { return DEV[kit].R * KY * sc(kit); };
      var tw = function (kit) { return full ? li[kit].offsetWidth : 0; }, th = function (kit) { return full ? li[kit].offsetHeight : 0; };
      // side: radio and goggles tags beside their devices. Below about 1060px of stage that squeezes the loop, so the
      // three device tags run in a row across the top instead, each over its own device.
      var side = full && W >= 1060, gap = 28;
      var xH = (side ? tw('hands') + gap : 24) + half('hands'), xE = W - (side ? tw('eyes') + gap : 24) - half('eyes');
      var head = side ? th('air') : full ? Math.max(th('hands'), th('air'), th('eyes')) : 0;
      var OX = (xH + xE) / 2, yA = (full ? head + 22 : 40) + (DEV.air.top + DEV.air.lift) * sc('air');
      var Hu = 146, RR = 64, V0 = (xH - OX) / KX, OY = yA + Hu * KY;
      var C = [0, -Wt, Wt].map(function (d) { return track([OX, OY], -Hu, Hu, V0, -V0, RR, d); });
      // the ground station sits in the infield, down and to the left of the aircraft, so its tag and the mapping
      // link's name both have room on the right
      var hands = [xH, OY], air = [OX, yA], eyes = [xE, OY], ground = [OX - (xE - xH) * .17, OY + 34 * k];
      var m0 = [air[0] - half('air') * .3, air[1] + low('air') * .92], m1 = [ground[0] + half('ground') * .86, ground[1] - low('ground') * 1.62];   // ends just clear of the lid
      var yB = OY + Hu * KY, H = yB + 18 + li.loop.offsetHeight;
      var s = link('loop', C[0][2], C[1][2], C[2][2], low('eyes'), low('hands') + 3, PULSE, 1) +
        link('control', C[0][0], C[1][0], C[2][0], 62 * sc('hands'), half('air') + 3, PKT, 3) +
        link('video', C[0][1], C[1][1], C[2][1], half('air'), 38 * sc('eyes'), FRAME, 4) +
        mapLink(m0[0], m0[1], m1[0], m1[1]);
      s += device('air', air[0], air[1], sc('air')) + device('hands', hands[0], hands[1], sc('hands')) +
        device('eyes', eyes[0], eyes[1], sc('eyes')) + device('ground', ground[0], ground[1], sc('ground'));
      // tablet: the tags sit in a grid under the drawing, so numbered callouts key each device to its tag
      if (!full) [['hands', hands, '01'], ['air', air, '02'], ['eyes', eyes, '03'], ['ground', ground, '04']].forEach(function (c) {
        var x = c[1][0] - half(c[0]) * .78, y = c[1][1] + low(c[0]) * .78;
        s += g('k-callout', '<circle cx="' + f(x) + '" cy="' + f(y) + '" r="11"/><text x="' + f(x) + '" y="' + f(y + 3.6) + '">' + c[2] + '</text>', c[0]);
      });
      art.setAttribute('viewBox', '0 0 ' + f(W) + ' ' + f(H));
      art.style.height = f(H) + 'px';
      art.innerHTML = s;
      if (full) {
        if (side) {
          place('hands', xH - half('hands') - gap, OY - 8, '-100%', '-50%');
          place('eyes', xE + half('eyes') + gap, OY - 8, '0', '-50%');
        } else {
          place('hands', 0, 0, '0', '0');
          place('eyes', W, 0, '-100%', '0');
        }
        place('air', OX, 0, '-50%', '0');
        place('ground', ground[0] + half('ground') + 18, ground[1] - 8, '0', '-50%');
      }
      // link names sit on their links: above the top run, either side of the aircraft
      var cornerL = OX + (V0 + RR) * KX, cornerR = OX - (V0 + RR) * KX, top = yA - Wt * KY - 10;
      place('control', (cornerL + OX - half('air')) / 2, top, '-50%', '-100%', 'center');
      place('video', (cornerR + OX + half('air')) / 2, top, '-50%', '-100%', 'center');
      place('map', OX - half('air') - 6, yA + Wt * KY + 10, '-100%', '0', 'flex-end');   // above the laptop, clear of the aircraft's station
      place('loop', OX, yB + 18, '-50%', '0', 'center');
    }
    // Phone: a vertical spine down the drawn column, devices level with their tags, ground branching off the aircraft;
    // the return runs back up the column's left edge.
    function drawSpine() {
      art.style.height = '';
      var col = art.getBoundingClientRect().width, H = stage.offsetHeight, SX = 60, RX = 4, GX = 106, w = 6;
      function mid(kit) { return li[kit].offsetTop + li[kit].offsetHeight / 2; }
      var yH = mid('hands') + 26, yA = mid('air') + 16, yE = mid('eyes') + 20, yG = mid('ground') + 16;
      function band(x, y0, y1) { return [[[x - w, y0], [x - w, y1]], [[x + w, y0], [x + w, y1]]]; }
      var c1 = band(SX, yH, yA), c2 = band(SX, yA, yE), rr = 12, q = 8, back = [[SX, yE], [RX + rr, yE]], i, t;
      for (i = 1; i < q; i++) { t = i / q * Math.PI / 2; back.push([RX + rr - rr * Math.sin(t), yE - rr + rr * Math.cos(t)]); }
      back.push([RX, yE - rr], [RX, yH + rr]);
      for (i = 1; i < q; i++) { t = i / q * Math.PI / 2; back.push([RX + rr - rr * Math.cos(t), yH + rr - rr * Math.sin(t)]); }
      back.push([RX + rr, yH], [SX, yH]);
      var s = link('loop', back, back, back, 46 * KX * .8, 50 * KX * .78 + 3, PULSE, 1) +
        link('control', [[SX, yH], [SX, yA]], c1[0], c1[1], 62 * .78, 88 * KY * .4 + 3, PKT, 2) +
        link('video', [[SX, yA], [SX, yE]], c2[0], c2[1], 88 * KY * .4, 38 * .8, FRAME, 3) +
        mapLink(SX + 16, yA + 20, GX - 6, yG - 18);
      s += device('air', SX, yA, .4) + device('hands', SX, yH, .78) + device('eyes', SX, yE, .8) + device('ground', GX, yG, .6);
      art.setAttribute('viewBox', '0 0 ' + f(col) + ' ' + f(H));
      art.innerHTML = s;
    }

    var lastW = -1;
    function draw() {
      lastW = stage.clientWidth;
      clear();
      if (phone.matches) drawSpine(); else drawLoop();
      var qa = art.querySelector('[data-kit="air"] .qa');
      if (!set) set = spinSet(qa, Q.blades);
      else { set.qa = qa; set.els = Array.prototype.slice.call(qa.querySelectorAll('.blade')); }
    }
    draw();
    if (document.fonts) document.fonts.ready.then(draw);                    // tag sizes settle once the fonts load
    if ('ResizeObserver' in window) new ResizeObserver(function () { if (stage.clientWidth !== lastW) draw(); }).observe(stage);
    else addEventListener('resize', draw);
    stage.onLive = function (on) { setSpin(set, on); };

    // Pointing at a device or its tag lights it and its links (CSS does the dimming). Touch: a tap toggles.
    function focusOn(kit) { if (kit) stage.dataset.on = kit; else delete stage.dataset.on; }
    function devOf(e) { var el = e.target.closest && e.target.closest('.kit-tag, .k-dev'); return el ? el.getAttribute('data-kit') : null; }
    stage.addEventListener('pointerover', function (e) { if (e.pointerType === 'mouse') focusOn(devOf(e)); });
    stage.addEventListener('pointerleave', function (e) { if (e.pointerType === 'mouse') focusOn(null); });
    stage.addEventListener('pointerdown', function (e) {
      if (e.pointerType === 'mouse') return;
      var kit = devOf(e);
      focusOn(kit && stage.dataset.on !== kit ? kit : null);
    });
  })();

  /* ── Flight log figures, the kit loop and Agrifly's data flow: their CSS loops run only while on screen ── */
  document.querySelectorAll('.log-fig, .kit-stage, .flow').forEach(function (fig) {
    function live(on) { fig.classList.toggle('live', on); if (fig.onLive) fig.onLive(on); }
    if (!('IntersectionObserver' in window)) { live(true); return; }
    new IntersectionObserver(function (en) { live(en[en.length - 1].isIntersecting); }).observe(fig);
  });

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

  /* ── Flight rail, current section and the small-screen menu ──
     Waypoints sit at equal steps down the rail (hero first, as the start mark); the marker flies from one waypoint to
     the next as that section scrolls past, so a long section takes longer to cross but never squeezes the others. */
  var sections = Array.prototype.slice.call(document.querySelectorAll('[data-wp]'));
  var rail = document.querySelector('.rail'), marker = $('rail-marker'), here = $('top-here');
  var navLinks = Array.prototype.slice.call(document.querySelectorAll('.nav a'));
  var wps = sections.map(function (s) {
    var d = document.createElement('div');
    d.className = 'rail-wp' + (s.dataset.wp ? '' : ' home');
    d.innerHTML = '<i></i>' + s.dataset.wp;
    rail.insertBefore(d, marker);
    return d;
  });
  var PAD = 40, current = -1;
  function railY(i) { return PAD + i / (sections.length - 1) * (rail.clientHeight - 2 * PAD); }
  function measure() {
    wps.forEach(function (d, i) { d.style.top = railY(i) + 'px'; });
    onScroll();
  }
  function onScroll() {
    var probe = scrollY + innerHeight * 0.35, active = 0, n = sections.length;
    sections.forEach(function (s, i) { if (s.offsetTop <= probe) active = i; });
    var atEnd = scrollY >= document.documentElement.scrollHeight - innerHeight - 2;
    if (atEnd) active = n - 1;
    var pos = active;
    if (active < n - 1) {
      var t0 = sections[active].offsetTop, t1 = sections[active + 1].offsetTop;
      pos += Math.min(1, Math.max(0, (probe - t0) / Math.max(1, t1 - t0)));
    }
    if (rail.clientHeight) marker.style.top = (PAD + pos / (n - 1) * (rail.clientHeight - 2 * PAD)) + 'px';
    if (active === current) return;
    current = active;
    wps.forEach(function (d, i) { d.classList.toggle('passed', i < active); d.classList.toggle('on', i === active); });
    var id = sections[active].id, name = '';
    navLinks.forEach(function (a) {
      var on = a.getAttribute('href') === '#' + id;
      if (on) { a.setAttribute('aria-current', 'location'); name = a.innerHTML; } else a.removeAttribute('aria-current');
    });
    here.innerHTML = name;   // small screens: the current section beside the menu button
  }
  addEventListener('scroll', onScroll, { passive: true });
  addEventListener('resize', measure);
  addEventListener('load', measure);
  measure();

  (function menu() {
    var btn = $('menu-btn'), nav = $('site-nav'), top = document.querySelector('.top');
    var small = matchMedia('(max-width: 820px)');
    function set(open, focusBtn) {
      btn.setAttribute('aria-expanded', open ? 'true' : 'false');
      nav.classList.toggle('open', open);
      if (!open && focusBtn) btn.focus();
    }
    btn.addEventListener('click', function () { set(btn.getAttribute('aria-expanded') !== 'true'); });
    nav.addEventListener('click', function (e) { if (e.target.closest('a') && small.matches) set(false); });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && btn.getAttribute('aria-expanded') === 'true') set(false, top.contains(document.activeElement));
    });
    top.addEventListener('focusout', function (e) { if (e.relatedTarget && !top.contains(e.relatedTarget)) set(false); });
    document.addEventListener('pointerdown', function (e) { if (!top.contains(e.target)) set(false); });
    small.addEventListener('change', function () { set(false); });
  })();

  /* ── Hero: a line-art quad that follows the cursor and leaves a flight trail ── */
  (function () {
    var cv = $('sky'), hero = $('hero'), airEl = $('hero-air'), modeEl = $('hero-mode'), ctx = cv.getContext('2d');
    var W = 0, H = 0, dpr = 1, k = 0.46, air = { x: 0, w: 0, t: 0, b: 0 };
    var pos = { x: 0, y: 0 }, vel = { x: 0, y: 0 }, target = null, heading = 0, lastMove = -1e9, mode = '';
    var trail = [], t0 = performance.now(), visible = true, raf = 0, spin = 0;

    // The lede's age comes from the About calculation above, so the two never disagree.
    $('hero-age').textContent = $('age').textContent;

    function size() {
      dpr = Math.min(2, devicePixelRatio || 1);
      W = hero.clientWidth; H = hero.clientHeight;
      cv.width = W * dpr; cv.height = H * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      var h = hero.getBoundingClientRect(), a = airEl.getBoundingClientRect();
      air = { x: a.left - h.left, w: a.width, t: a.top - h.top, b: a.bottom - h.top };
      // the readouts sit in the box's corners: fly only in the band between them
      airEl.querySelectorAll('p').forEach(function (el) {
        var r = el.getBoundingClientRect(), top = r.top - h.top, bot = r.bottom - h.top;
        if (top + bot < a.top + a.bottom - 2 * h.top) air.t = Math.max(air.t, bot); else air.b = Math.min(air.b, top);
      });
      k = W <= 820 ? 0.34 : air.w < 400 ? 0.4 : 0.46;   // px per quad() unit: about 90px across on wide screens
      if (reduceMotion) park();
      else if (!pos.x) { var p = auto(0); pos.x = p.x; pos.y = p.y; }
    }
    function colors() {
      var cs = getComputedStyle(document.documentElement);
      return { ink: cs.getPropertyValue('--ink').trim(), accent: cs.getPropertyValue('--accent').trim(), surface: cs.getPropertyValue('--surface').trim() };
    }
    // With no pointer, the quad loiters on a slow figure-eight inside the airspace box (#hero-air), never over the text.
    // The amplitudes leave room for the aircraft's own span and the spring's overshoot.
    function auto(t) {
      var r = 97 * k + 18;
      var ax = Math.max(0, Math.min(air.w / 2 - r, 240)), ay = Math.max(0, Math.min((air.b - air.t) / 2 - r, 80));
      return { x: air.x + air.w / 2 + Math.sin(t * 0.00045) * ax, y: (air.t + air.b) / 2 + Math.sin(t * 0.0009) * ay };
    }
    // Reduced motion: fly the loop off screen for a few seconds and draw only the last frame, trail included.
    function park() {
      var p = auto(0);
      pos = { x: p.x, y: p.y }; vel = { x: 0, y: 0 }; trail = []; heading = 0;
      for (var i = 0; i < 260; i++) step(auto(i * 16.7));
    }

    // Plan view of quad() (same parts and proportions: X frame, octagon plate, stack, camera at the nose,
    // receiver and antennas at the tail), drawn in the hangar's line-art style. Nose is local -y.
    function pts(list) { return list.map(function (q) { return [q[1], -q[0]]; }); }
    function shape(list) {
      ctx.beginPath();
      list.forEach(function (q, i) { if (i) ctx.lineTo(q[0], q[1]); else ctx.moveTo(q[0], q[1]); });
      ctx.closePath();
    }
    var A = 55, R = 42, MOTORS = [[A, -A, -1], [A, A, 1], [-A, -A, 1], [-A, A, -1]];
    var PLATE = pts([[34, -14], [34, 14], [22, 20], [-22, 20], [-34, 14], [-34, -14], [-22, -20], [22, -20]]);
    function arm(m) {
      var len = Math.hypot(m[0], m[1]), w = 5.5, nu = -m[1] / len * w, nv = m[0] / len * w;
      return pts([[nu, nv], [m[0] + nu, m[1] + nv], [m[0] - nu, m[1] - nv], [-nu, -nv]]);
    }
    function airframe() {   // arms + plate + motor bells as one path, for the ground shadow
      MOTORS.forEach(function (m) { shape(arm(m)); ctx.fill(); var p = pts([m])[0]; ctx.beginPath(); ctx.arc(p[0], p[1], 9, 0, 6.2832); ctx.fill(); });
      shape(PLATE); ctx.fill();
    }
    function drawQuad(c) {
      var lw = 1.15 / k;
      ctx.save();
      // ground shadow, offset down and right like the hangar drawings' cast shadows
      ctx.translate(pos.x + 7, pos.y + 11); ctx.rotate(heading); ctx.scale(k, k);
      ctx.globalAlpha = 0.07; ctx.fillStyle = c.ink; airframe();
      ctx.restore();

      ctx.save();
      ctx.translate(pos.x, pos.y); ctx.rotate(heading); ctx.scale(k, k);
      ctx.lineJoin = 'round'; ctx.lineCap = 'round'; ctx.lineWidth = lw;
      // prop discs: the accent wash and dashed rim the hangar shows when its props spin
      ctx.setLineDash([3 / k, 4 / k]);
      MOTORS.forEach(function (m) {
        var p = pts([m])[0];
        ctx.beginPath(); ctx.arc(p[0], p[1], R, 0, 6.2832);
        ctx.globalAlpha = 0.07; ctx.fillStyle = c.accent; ctx.fill();
        ctx.globalAlpha = 1; ctx.strokeStyle = c.accent; ctx.stroke();
      });
      ctx.setLineDash([]);
      ctx.strokeStyle = c.ink; ctx.fillStyle = c.surface;
      MOTORS.forEach(function (m) { shape(arm(m)); ctx.fill(); ctx.stroke(); });
      shape(PLATE); ctx.fill(); ctx.stroke();
      // receiver and antennas at the tail
      shape(pts([[-33, -6], [-25, -6], [-25, 6], [-33, 6]])); ctx.fill(); ctx.stroke();
      [-1, 1].forEach(function (sg) {
        var a = pts([[-29, sg * 3]])[0], b = pts([[-44, sg * 13]])[0];
        ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.lineWidth = 1.6 / k; ctx.stroke();
        ctx.beginPath(); ctx.arc(b[0], b[1], 2.2, 0, 6.2832); ctx.fillStyle = c.ink; ctx.fill();
      });
      ctx.lineWidth = lw; ctx.fillStyle = c.surface;
      // flight stack, then the camera at the nose with its lens and accent glint
      shape(pts([[-11, -11], [11, -11], [11, 11], [-11, 11]])); ctx.fill(); ctx.stroke();
      shape(pts([[23, -9], [34, -9], [34, 9], [23, 9]])); ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.ellipse(0, -35, 5.5, 2.4, 0, 0, 6.2832); ctx.fillStyle = c.ink; ctx.fill();
      ctx.beginPath(); ctx.arc(2, -35.4, 1.3, 0, 6.2832); ctx.fillStyle = c.accent; ctx.fill();
      // motors, spinning two-blade props (the hangar's blade profile), hubs
      MOTORS.forEach(function (m, i) {
        var p = pts([m])[0], th = spin * m[2] + i;
        ctx.beginPath(); ctx.arc(p[0], p[1], 9, 0, 6.2832); ctx.fillStyle = c.surface; ctx.fill(); ctx.strokeStyle = c.ink; ctx.stroke();
        ctx.beginPath();
        [0, Math.PI].forEach(function (off) {
          var co = Math.cos(th + off), si = Math.sin(th + off);
          BLADE.forEach(function (q, j) {
            var x = p[0] + (q[0] * co - q[1] * si) * R, y = p[1] + (q[0] * si + q[1] * co) * R;
            if (j) ctx.lineTo(x, y); else ctx.moveTo(x, y);
          });
          ctx.closePath();
        });
        ctx.globalAlpha = 0.82; ctx.fillStyle = c.ink; ctx.fill(); ctx.globalAlpha = 1;
        ctx.beginPath(); ctx.arc(p[0], p[1], 3.2, 0, 6.2832); ctx.fillStyle = c.surface; ctx.fill(); ctx.stroke();
      });
      ctx.restore();
    }

    // One physics step toward the goal: a spring with a little overshoot reads as a real quad correcting itself.
    function step(goal) {
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
    }
    function frame(t) {
      raf = 0;
      if (!visible) return;
      var c = colors(), follow = !!(target && t - lastMove < 4000);
      if (!reduceMotion) step(follow ? target : auto(t - t0));
      var m = follow ? 'Follow' : 'Loiter';
      if (m !== mode) modeEl.textContent = mode = m;

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
      drawQuad(c);
      if (!reduceMotion) raf = requestAnimationFrame(frame);
    }
    function kick() { if (!raf && visible) raf = requestAnimationFrame(frame); }

    hero.addEventListener('pointermove', function (e) {
      if (e.pointerType === 'touch' || reduceMotion) return;
      var b = hero.getBoundingClientRect();
      target = { x: e.clientX - b.left, y: e.clientY - b.top };
      lastMove = performance.now();
    });
    hero.addEventListener('pointerleave', function () { target = null; });
    // Re-measure the airspace whenever the hero's layout changes (resize, web fonts arriving).
    if ('ResizeObserver' in window) { var ro = new ResizeObserver(function () { size(); kick(); }); ro.observe(hero); ro.observe(airEl); }
    else addEventListener('resize', function () { size(); kick(); });
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (en) { visible = en[0].isIntersecting; kick(); }).observe(hero);
    }
    size();
    kick();
  })();
})();
