/* HB Studio v3 — studio.js
   "Walk the studio": a first-person walk through a film studio. One room per project.
   Desktop: mouse looks (pointer lock, or drag), WASD / arrows walk, click the floor to go there.
   Touch: drag to look, tap a doorway or the floor to go there. Click/tap a frame to open it large.
   Used on studio.html ONLY. A list view is the fallback (and a toggle). */
(function () {
  'use strict';
  var HB = window.HB, $ = HB.$, shell = $('#studio-shell');
  var body = document.body;
  var coarse = window.matchMedia('(pointer:coarse)').matches;
  var reduce = HB.reduce;

  function toList(msg) {
    body.classList.add('list-mode');
    var n = $('#gl-note'); if (n && msg) { n.hidden = false; n.textContent = msg; }
    var l = $('#loading'); if (l) l.classList.add('done');
  }
  function toWalk() { body.classList.remove('list-mode'); var n = $('#gl-note'); if (n) n.hidden = true; if (api && api.resize) api.resize(); }
  var api = null;

  HB.onReady(function () {
    if (!HB.content || !HB.content.projects || !HB.content.projects.length) { toList(); return; }
    Promise.all([import('three'), import('three/addons/geometries/RoundedBoxGeometry.js'), import('three/addons/environments/RoomEnvironment.js')])
      .then(function (m) { try { api = build(m[0], m[1].RoundedBoxGeometry, m[2].RoomEnvironment); } catch (e) { console.warn('[hb] studio unavailable:', e); toList(HB.ui('studio.nogl')); } })
      .catch(function (e) { console.warn('[hb] three failed to load:', e); toList(HB.ui('studio.nogl')); });
  });
  document.addEventListener('click', function (e) {
    if (e.target.closest('[data-view-list]')) { if (api && api.unlock) api.unlock(); toList(); }
    if (e.target.closest('[data-view-walk]')) { if (api) toWalk(); }
  });

  function build(THREE, RoundedBoxGeometry, RoomEnvironment) {
    var canvas = document.createElement('canvas'); shell.insertBefore(canvas, shell.firstChild);
    var renderer;
    try { renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true, powerPreference: 'high-performance' }); } catch (e) { canvas.remove(); throw e; }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, coarse ? 1.5 : 1.75));
    renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.0;
    var scene = new THREE.Scene(); scene.background = new THREE.Color(0x050506); scene.fog = new THREE.Fog(0x050506, 18, 60);
    var pm = new THREE.PMREMGenerator(renderer); scene.environment = pm.fromScene(new RoomEnvironment(), .04).texture;
    var camera = new THREE.PerspectiveCamera(coarse ? 68 : 62, 1, .05, 120); camera.rotation.order = 'YXZ';

    /* ── procedural textures ── */
    function ctex(w, h, fn, srgb) { var c = document.createElement('canvas'); c.width = w; c.height = h; fn(c.getContext('2d'), w, h); var t = new THREE.CanvasTexture(c); if (srgb) t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 8; return t; }
    var seed = 7; function rnd() { seed = (seed * 16807) % 2147483647; return seed / 2147483647; }
    var concrete = ctex(1024, 1024, function (g, w, h) {
      g.fillStyle = '#3b3b3f'; g.fillRect(0, 0, w, h);
      for (var i = 0; i < 90; i++) { var x = rnd() * w, y = rnd() * h, r = 40 + rnd() * 180, v = 52 + (rnd() * 26 | 0); var gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, 'rgba(' + v + ',' + v + ',' + (v + 3) + ',.35)'); gr.addColorStop(1, 'rgba(' + v + ',' + v + ',' + v + ',0)'); g.fillStyle = gr; g.fillRect(x - r, y - r, r * 2, r * 2); }
      for (var j = 0; j < 7000; j++) { var v2 = 30 + (rnd() * 50 | 0); g.fillStyle = 'rgba(' + v2 + ',' + v2 + ',' + v2 + ',' + (.08 + rnd() * .12) + ')'; g.fillRect(rnd() * w, rnd() * h, 1 + rnd() * 2, 1 + rnd() * 2); }
      g.strokeStyle = 'rgba(8,8,10,.85)'; g.lineWidth = 3; g.strokeRect(1.5, 1.5, w - 3, h - 3);
      g.strokeStyle = 'rgba(255,255,255,.04)'; g.lineWidth = 2; g.strokeRect(5, 5, w - 10, h - 10);
    }, true);
    var wallTex = ctex(512, 512, function (g, w, h) {
      g.fillStyle = '#2b2b2f'; g.fillRect(0, 0, w, h);
      for (var i = 0; i < 4000; i++) { var v = 34 + (rnd() * 22 | 0); g.fillStyle = 'rgba(' + v + ',' + v + ',' + (v + 2) + ',.18)'; g.fillRect(rnd() * w, rnd() * h, 2 + rnd() * 3, 2 + rnd() * 3); }
    }, true);
    function glow() { return ctex(256, 256, function (g, w, h) { var r = g.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2); r.addColorStop(0, 'rgba(255,208,150,.5)'); r.addColorStop(.5, 'rgba(255,190,120,.16)'); r.addColorStop(1, 'rgba(255,190,120,0)'); g.fillStyle = r; g.fillRect(0, 0, w, h); }, true); }
    var glowTex = glow();

    var MAT = {
      floor: new THREE.MeshStandardMaterial({ map: concrete, roughness: .7, metalness: .05, color: 0x8c8c90 }),
      wall: new THREE.MeshStandardMaterial({ map: wallTex, roughness: .92, metalness: 0, color: 0xdddddd }),
      ceil: new THREE.MeshStandardMaterial({ color: 0x0c0c0e, roughness: .95 }),
      base: new THREE.MeshStandardMaterial({ color: 0x0a0a0b, roughness: .6 }),
      black: new THREE.MeshStandardMaterial({ color: 0x0c0c0e, roughness: .7, metalness: .35 }),
      steel: new THREE.MeshStandardMaterial({ color: 0x8b8f96, roughness: .38, metalness: .9 }),
      frame: new THREE.MeshStandardMaterial({ color: 0x0b0b0c, roughness: .45, metalness: .5 }),
      mat: new THREE.MeshStandardMaterial({ color: 0xe9e4da, roughness: .95 }),
      lamp: new THREE.MeshStandardMaterial({ color: 0x111111, emissive: 0xffe2b8, emissiveIntensity: 2.2 }),
      soft: new THREE.MeshStandardMaterial({ color: 0x1a1a1a, emissive: 0xffdca8, emissiveIntensity: 1.5, roughness: .8 }),
      wood: new THREE.MeshStandardMaterial({ color: 0x8a6a45, roughness: .75 }),
      case_: new THREE.MeshStandardMaterial({ color: 0x15161a, roughness: .55, metalness: .5 }),
      gold: new THREE.MeshStandardMaterial({ color: 0xe9a653, roughness: .3, metalness: 1, emissive: 0x3a2204, emissiveIntensity: .4 })
    };

    /* ── world ── */
    var projects = HB.projects(), N = projects.length;
    var HALLW = 7, HALLH = 5, RD = 10, RH = 4.4, SLOT = 12, DOORW = 2.6, DOORH = 3.2;
    var slots = Math.ceil(N / 2), HALLL = 8 + SLOT * slots;
    var world = new THREE.Group(); scene.add(world); scene.add(new THREE.HemisphereLight(0xfff0dd, 0x2a2a30, .55));
    var rects = []; // walkable rectangles {x0,x1,z0,z1}
    var rooms = []; // {i, side, zc, group}
    var clickables = []; // meshes with userData
    var plaqueTexs = [], signTexs = [], frames = [], blockers = [];

    function box(w, h, d, mat, x, y, z, parent) { var m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat); m.position.set(x, y, z); (parent || world).add(m); return m; }
    function plane(w, h, mat, x, y, z, ry, rx, parent) { var m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat); m.position.set(x, y, z); m.rotation.set(rx || 0, ry || 0, 0); (parent || world).add(m); return m; }
    function tiled(tex, rx, ry) { var t = tex.clone(); t.needsUpdate = true; t.repeat.set(rx, ry); return t; }
    function floorMesh(w, d, x, z, parent) { var mm = MAT.floor.clone(); mm.map = tiled(concrete, w / 4, d / 4); var m = new THREE.Mesh(new THREE.PlaneGeometry(w, d), mm); m.rotation.x = -Math.PI / 2; m.position.set(x, 0, z); (parent || world).add(m); return m; }
    function wallMesh(w, h, x, y, z, ry, parent) { var mm = MAT.wall.clone(); mm.map = tiled(wallTex, w / 3, h / 3); var m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mm); m.position.set(x, y, z); m.rotation.y = ry; (parent || world).add(m); blockers.push(m); return m; }

    /* props */
    function lightStand(h, parent) {
      var g = new THREE.Group();
      for (var i = 0; i < 3; i++) { var a = i * 2.094 + .4, leg = new THREE.Mesh(new THREE.CylinderGeometry(.012, .012, .95, 6), MAT.black); leg.position.set(Math.cos(a) * .26, .44, Math.sin(a) * .26); leg.rotation.set(Math.sin(a) * .5, 0, -Math.cos(a) * .5); g.add(leg); }
      var pole = new THREE.Mesh(new THREE.CylinderGeometry(.018, .022, h, 10), MAT.steel); pole.position.y = h / 2 + .1; g.add(pole);
      var sec = new THREE.Mesh(new THREE.CylinderGeometry(.028, .028, h * .3, 10), MAT.black); sec.position.y = h * .45; g.add(sec);
      (parent || world).add(g); return g;
    }
    function softbox(w, h, parent) {
      var g = new THREE.Group();
      var back = new THREE.Mesh(new THREE.CylinderGeometry(w * .35, w * .72, .5, 4, 1, true), MAT.black); back.rotation.set(Math.PI / 2, Math.PI / 4, 0); back.position.z = -.25; back.scale.set(1, 1, h / w); g.add(back);
      var face = new THREE.Mesh(new THREE.PlaneGeometry(w * 1.02, h * 1.02), MAT.soft); face.position.z = 0; g.add(face);
      var rim = new THREE.Mesh(new THREE.BoxGeometry(w * 1.06, .03, .04), MAT.black); rim.position.set(0, h * .52, 0); g.add(rim); var rim2 = rim.clone(); rim2.position.y = -h * .52; g.add(rim2);
      var rim3 = new THREE.Mesh(new THREE.BoxGeometry(.03, h * 1.06, .04), MAT.black); rim3.position.set(w * .52, 0, 0); g.add(rim3); var rim4 = rim3.clone(); rim4.position.x = -w * .52; g.add(rim4);
      var head = new THREE.Mesh(new THREE.BoxGeometry(.16, .16, .22), MAT.black); head.position.set(0, -h * .5 - .12, -.2); g.add(head);
      (parent || world).add(g); return g;
    }
    function cStand(parent) {
      var g = new THREE.Group();
      for (var i = 0; i < 3; i++) { var a = i * 2.094, leg = new THREE.Mesh(new THREE.CylinderGeometry(.012, .012, .8, 6), MAT.black); leg.position.set(Math.cos(a) * .33, .08, Math.sin(a) * .33); leg.rotation.set(Math.sin(a) * 1.3, 0, -Math.cos(a) * 1.3); g.add(leg); }
      var pole = new THREE.Mesh(new THREE.CylinderGeometry(.016, .02, 2.1, 10), MAT.steel); pole.position.y = 1.1; g.add(pole);
      var arm = new THREE.Mesh(new THREE.CylinderGeometry(.011, .011, 1.0, 8), MAT.steel); arm.rotation.z = Math.PI / 2; arm.position.set(.5, 1.95, 0); g.add(arm);
      var flag = new THREE.Mesh(new THREE.BoxGeometry(.9, .9, .01), MAT.black); flag.position.set(.9, 1.55, 0); g.add(flag);
      var fr = new THREE.Mesh(new THREE.BoxGeometry(.93, .93, .006), MAT.steel); fr.position.set(.9, 1.55, -.007); g.add(fr);
      (parent || world).add(g); return g;
    }
    function flightCase(w, h, d, x, z, ry, parent) {
      var g = new THREE.Group(); g.position.set(x, h / 2, z); g.rotation.y = ry || 0;
      var b = new THREE.Mesh(new RoundedBoxGeometry(w, h, d, 2, .03), MAT.case_); g.add(b);
      [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(function (c) { var k = new THREE.Mesh(new THREE.BoxGeometry(.07, .07, .07), MAT.steel); k.position.set(c[0] * (w / 2), c[1] * (h / 2), (c[0] * c[1]) * (d / 2)); g.add(k); });
      var latch = new THREE.Mesh(new THREE.BoxGeometry(.12, .04, .02), MAT.steel); latch.position.set(0, h * .2, d / 2 + .005); g.add(latch);
      (parent || world).add(g); return g;
    }
    function appleBoxes(x, z, parent) { var g = new THREE.Group(); g.position.set(x, 0, z); [[0, .1, 0, .6, .2, .4], [.05, .3, .02, .6, .2, .4], [.5, .1, .1, .5, .2, .3]].forEach(function (p, i) { var b = new THREE.Mesh(new THREE.BoxGeometry(p[3], p[4], p[5]), MAT.wood); b.position.set(p[0], p[1], p[2]); b.rotation.y = i * .25; g.add(b); }); (parent || world).add(g); return g; }
    function ceilingLights(w, d, y, x, z, nx, nz, parent) { for (var i = 0; i < nx; i++) for (var j = 0; j < nz; j++) { box(w / nx * .45, .05, d / nz * .18, MAT.lamp, x - w / 2 + w / nx * (i + .5), y - .03, z - d / 2 + d / nz * (j + .5), parent); } }
    function pointLight(x, y, z, int, dist, parent) { var l = new THREE.PointLight(0xffe2bd, int, dist, 2); l.position.set(x, y, z); (parent || world).add(l); return l; }

    /* hall */
    floorMesh(HALLW, HALLL, 0, HALLL / 2);
    var ceilH = new THREE.Mesh(new THREE.PlaneGeometry(HALLW, HALLL), MAT.ceil); ceilH.rotation.x = Math.PI / 2; ceilH.position.set(0, HALLH, HALLL / 2); world.add(ceilH);
    ceilingLights(HALLW, HALLL, HALLH, 0, HALLL / 2, 1, Math.max(2, slots * 2), world);
    // black truss beams across the hall
    for (var tz = 3; tz < HALLL; tz += 6) { box(HALLW, .16, .16, MAT.black, 0, HALLH - .35, tz); box(.1, .12, .1, MAT.black, -HALLW / 2 + .2, HALLH - .35, tz); }
    wallMesh(HALLW, HALLH, 0, HALLH / 2, 0, 0); // entrance wall (faces +z)
    wallMesh(HALLW, HALLH, 0, HALLH / 2, HALLL, Math.PI); // end wall (faces -z)
    pointLight(0, HALLH - .6, 3, 26, 16);
    for (var s = 0; s < slots; s++) pointLight(0, HALLH - .6, 8 + SLOT * s, 26, 16);
    pointLight(0, HALLH - .6, HALLL - 3, 22, 14);

    // door frames in hall walls + room generation
    function hallWallSegment(side, z0, z1) { var len = z1 - z0; if (len <= .01) return; var m = wallMesh(len, HALLH, side * HALLW / 2, HALLH / 2, (z0 + z1) / 2, side > 0 ? -Math.PI / 2 : Math.PI / 2); }
    var cuts = {}; // per side list of door z centers
    for (var ri = 0; ri < N; ri++) { var sd = ri % 2 === 0 ? 1 : -1; (cuts[sd] = cuts[sd] || []).push(8 + SLOT * Math.floor(ri / 2)); }
    [1, -1].forEach(function (sd) {
      var list = (cuts[sd] || []).slice().sort(function (a, b) { return a - b; }), cur = 0;
      list.forEach(function (zc) { hallWallSegment(sd, cur, zc - DOORW / 2); // above-door lintel
        var lin = wallMesh(DOORW, HALLH - DOORH, sd * HALLW / 2, DOORH + (HALLH - DOORH) / 2, zc, sd > 0 ? -Math.PI / 2 : Math.PI / 2); cur = zc + DOORW / 2; });
      hallWallSegment(sd, cur, HALLL);
    });

    function wrap(ctx, text, maxW, rtl) {
      var words = String(text).split(/\s+/), lines = [], cur = '';
      words.forEach(function (w) { var t = cur ? cur + ' ' + w : w; if (ctx.measureText(t).width > maxW && cur) { lines.push(cur); cur = w; } else cur = t; });
      if (cur) lines.push(cur); return lines;
    }
    var FONTS = function () { return HB.lang === 'fa' ? { disp: '"Lalezar","Vazirmatn",sans-serif', body: '"Vazirmatn",sans-serif', lab: '"Vazirmatn",sans-serif' } : { disp: '"Instrument Serif",Georgia,serif', body: '"Syne",system-ui,sans-serif', lab: '"Syne",system-ui,sans-serif' }; };
    function drawPlaque(p, i, canvas) {
      var c = canvas || document.createElement('canvas'); c.width = 1024; c.height = 768; var g = c.getContext('2d'), F = FONTS(), fa = HB.lang === 'fa';
      var bg = g.createLinearGradient(0, 0, 0, 768); bg.addColorStop(0, '#17171b'); bg.addColorStop(1, '#0b0b0d'); g.fillStyle = bg; g.fillRect(0, 0, 1024, 768);
      g.strokeStyle = 'rgba(233,166,83,.7)'; g.lineWidth = 3; g.strokeRect(22, 22, 980, 724);
      g.strokeStyle = 'rgba(255,236,206,.12)'; g.lineWidth = 1.5; g.strokeRect(34, 34, 956, 700);
      g.direction = fa ? 'rtl' : 'ltr'; g.textAlign = fa ? 'right' : 'left'; var X = fa ? 970 : 54, maxW = 916, y = 96;
      g.fillStyle = '#e9a653'; g.font = '700 26px ' + F.lab; g.fillText(HB.numFmt(('0' + (i + 1)).slice(-2)) + '  ·  ' + HB.ui('label.room').toUpperCase(), X, y);
      y += 74; g.fillStyle = '#f3eee6'; g.font = '400 ' + (fa ? 66 : 74) + 'px ' + F.disp;
      wrap(g, HB.L(p.title), maxW).slice(0, 2).forEach(function (ln) { g.fillText(ln, X, y); y += fa ? 84 : 80; });
      y += 4; g.fillStyle = '#c9c3b9'; g.font = '500 28px ' + F.body;
      var meta = [HB.L(p.client), HB.numFmt(p.year), HB.L(p.role)].filter(Boolean);
      meta.forEach(function (ln) { wrap(g, ln, maxW).slice(0, 1).forEach(function (l2) { g.fillText(l2, X, y); y += 42; }); });
      y += 12; g.strokeStyle = 'rgba(255,236,206,.14)'; g.beginPath(); g.moveTo(54, y - 16); g.lineTo(970, y - 16); g.stroke();
      g.fillStyle = '#9b958b'; g.font = '400 26px ' + F.body; y += 24;
      wrap(g, HB.L(p.description), maxW).slice(0, 5).forEach(function (ln) { g.fillText(ln, X, y); y += 38; });
      g.fillStyle = '#e9a653'; g.font = '700 26px ' + F.lab; g.fillText(HB.ui('cta.view') + (fa ? '  ←' : '  →'), X, 722);
      return c;
    }
    function drawSign(p, i, canvas) {
      var c = canvas || document.createElement('canvas'); c.width = 1024; c.height = 256; var g = c.getContext('2d'), F = FONTS(), fa = HB.lang === 'fa';
      var bg = g.createLinearGradient(0, 0, 0, 256); bg.addColorStop(0, '#1b1b20'); bg.addColorStop(1, '#0c0c0e'); g.fillStyle = bg; g.fillRect(0, 0, 1024, 256);
      g.strokeStyle = '#e9a653'; g.lineWidth = 4; g.strokeRect(10, 10, 1004, 236);
      g.fillStyle = '#e9a653'; g.font = '400 120px ' + F.disp; g.textBaseline = 'middle'; g.direction = 'ltr'; g.textAlign = 'center'; g.fillText(HB.numFmt(('0' + (i + 1)).slice(-2)), 126, 134);
      g.strokeStyle = 'rgba(255,236,206,.25)'; g.lineWidth = 2; g.beginPath(); g.moveTo(236, 40); g.lineTo(236, 216); g.stroke();
      g.fillStyle = '#f3eee6'; g.direction = fa ? 'rtl' : 'ltr'; g.textAlign = 'center'; var t = HB.L(p.title), size = 74; g.font = '400 ' + size + 'px ' + F.disp;
      while (g.measureText(t).width > 740 && size > 34) { size -= 4; g.font = '400 ' + size + 'px ' + F.disp; }
      g.fillText(t, 630, 134); return c;
    }
    function placeholderCanvas(p, k) {
      var c = document.createElement('canvas'); c.width = 800; c.height = 1000; var g = c.getContext('2d'), F = FONTS();
      var bg = g.createRadialGradient(400, 0, 0, 400, 0, 900); bg.addColorStop(0, '#2a2118'); bg.addColorStop(.6, '#131317'); bg.addColorStop(1, '#09090b'); g.fillStyle = bg; g.fillRect(0, 0, 800, 1000);
      g.strokeStyle = 'rgba(255,236,206,.2)'; g.lineWidth = 2; g.strokeRect(110, 140, 580, 720);
      g.fillStyle = 'rgba(246,196,127,.85)'; g.font = '400 300px ' + F.disp; g.textAlign = 'center'; g.textBaseline = 'middle'; g.direction = 'ltr'; g.fillText(HB.L(p.title).charAt(0), 400, 470);
      g.fillStyle = '#8d877d'; g.font = '700 30px ' + F.lab; g.fillText(HB.ui('label.preview').toUpperCase(), 400, 800); return c;
    }

    var loader = new THREE.TextureLoader(); var texCache = {};
    function loadTex(path, cb) {
      var u = HB.img(path); if (texCache[u]) { texCache[u].then(cb); return; }
      texCache[u] = new Promise(function (res) { loader.load(u, function (t) { t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; res(t); }, undefined, function () { res(null); }); });
      texCache[u].then(cb);
    }

    function makeFrame(parent, p, roomIdx, imgIdx, imgPath, maxW, maxH, pos, ry) {
      var g = new THREE.Group(); g.position.set(pos[0], pos[1], pos[2]); g.rotation.y = ry; parent.add(g);
      var W = maxW * .78, H = maxH;
      var fm = new THREE.Mesh(new THREE.BoxGeometry(1, 1, .07), MAT.frame); fm.position.z = .035; g.add(fm);
      var matm = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), MAT.mat); matm.position.z = .072; g.add(matm);
      var pmat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: .55, metalness: 0, emissive: 0xffffff, emissiveIntensity: .22 });
      var pic = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), pmat); pic.position.z = .075; g.add(pic);
      var wash = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: glowTex, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, opacity: .55 })); wash.position.z = .012; g.add(wash);
      var lamp = new THREE.Mesh(new THREE.BoxGeometry(1, .035, .09), MAT.lamp); g.add(lamp);
      var bracket = new THREE.Mesh(new THREE.BoxGeometry(.02, .02, .22), MAT.black); g.add(bracket);
      function fit(ar) {
        var w = W, h = w / ar; if (h > H) { h = H; w = h * ar; }
        var m = .09, fw = w + m * 2, fh = h + m * 2;
        fm.scale.set(fw + .06, fh + .06, 1); matm.scale.set(fw, fh, 1); pic.scale.set(w, h, 1); wash.scale.set(fw * 2.1, fh * 1.7, 1); wash.position.y = .1;
        lamp.scale.set(fw * .55, 1, 1); lamp.position.set(0, fh / 2 + .2, .16); bracket.position.set(0, fh / 2 + .12, .1);
        g.userData.h = fh; g.userData.w = fw;
      }
      fit(.8);
      var data = { type: 'frame', room: roomIdx, img: imgIdx, path: imgPath };
      pic.userData = data; fm.userData = data; matm.userData = data;
      clickables.push(pic, fm, matm);
      var ph = null;
      if (imgPath) {
        loadTex(imgPath, function (t) { if (!t) return; pmat.map = t; pmat.emissiveMap = t; pmat.needsUpdate = true; fit(t.image.width / t.image.height); });
      } else {
        var cv = placeholderCanvas(p, imgIdx), t2 = new THREE.CanvasTexture(cv); t2.colorSpace = THREE.SRGBColorSpace; t2.anisotropy = 8; pmat.map = t2; pmat.emissiveMap = t2; pmat.needsUpdate = true; fit(.8); data.dataURL = cv.toDataURL('image/jpeg', .8); data.ph = cv; data.tex = t2;
      }
      frames.push({ data: data, group: g, pmat: pmat });
      return g;
    }

    /* rooms */
    projects.forEach(function (p, i) {
      var side = i % 2 === 0 ? 1 : -1, zc = 8 + SLOT * Math.floor(i / 2);
      var G = new THREE.Group(); G.position.set(side * HALLW / 2, 0, zc); G.rotation.y = side > 0 ? 0 : Math.PI; world.add(G);
      // local: +x into room, z lateral. floor + ceiling
      floorMesh(RD, RD, RD / 2, 0, G);
      var ce = new THREE.Mesh(new THREE.PlaneGeometry(RD, RD), MAT.ceil); ce.rotation.x = Math.PI / 2; ce.position.set(RD / 2, RH, 0); G.add(ce);
      ceilingLights(RD * .8, RD * .8, RH, RD / 2, 0, 2, 2, G);
      // walls: back, two sides, and door wall with opening (local)
      wallMesh(RD, RH, RD, RH / 2, 0, -Math.PI / 2, G); // back facing -x
      wallMesh(RD, RH, RD / 2, RH / 2, -RD / 2, 0, G); // side z=-5 faces +z
      wallMesh(RD, RH, RD / 2, RH / 2, RD / 2, Math.PI, G); // side z=+5 faces -z
      var dw1 = (RD - DOORW) / 2; wallMesh(dw1, RH, 0, RH / 2, -(DOORW / 2 + dw1 / 2), Math.PI / 2, G); wallMesh(dw1, RH, 0, RH / 2, (DOORW / 2 + dw1 / 2), Math.PI / 2, G); wallMesh(DOORW, RH - DOORH, 0, DOORH + (RH - DOORH) / 2, 0, Math.PI / 2, G);
      // skirting
      box(.04, .12, RD, MAT.base, RD - .02, .06, 0, G); box(RD, .12, .04, MAT.base, RD / 2, .06, -RD / 2 + .02, G); box(RD, .12, .04, MAT.base, RD / 2, .06, RD / 2 - .02, G);
      // door frame
      box(.14, DOORH, .1, MAT.base, 0, DOORH / 2, -DOORW / 2 - .05, G); box(.14, DOORH, .1, MAT.base, 0, DOORH / 2, DOORW / 2 + .05, G); box(.14, .1, DOORW + .2, MAT.base, 0, DOORH + .05, 0, G);
      // glowing threshold strip
      box(.06, .015, DOORW, MAT.gold, 0, .01, 0, G);
      pointLight(RD * .45, RH - .7, 0, 34, 16, G);
      pointLight(RD * .8, RH - 1.2, 0, 14, 10, G);

      // images -> frames
      var imgs = (p.images && p.images.length) ? p.images : [null], extras = imgs.length === 1 && !imgs[0] ? 3 : 0;
      var slotsPos = [
        { w: 3.6, h: 2.7, pos: [RD - .02, 1.95, 0], ry: -Math.PI / 2 },
        { w: 2.4, h: 2.1, pos: [3.6, 1.85, -RD / 2 + .02], ry: 0 },
        { w: 2.4, h: 2.1, pos: [3.6, 1.85, RD / 2 - .02], ry: Math.PI },
        { w: 2.4, h: 2.1, pos: [7.0, 1.85, -RD / 2 + .02], ry: 0 },
        { w: 2.4, h: 2.1, pos: [7.0, 1.85, RD / 2 - .02], ry: Math.PI },
        { w: 2.4, h: 2.1, pos: [RD - .02, 1.85, 3.5], ry: -Math.PI / 2 }
      ];
      var total = imgs.length + (extras ? 2 : 0);
      for (var k = 0; k < Math.min(total, slotsPos.length); k++) {
        var sp = slotsPos[k]; makeFrame(G, p, i, k, imgs[k] || null, sp.w, sp.h, sp.pos, sp.ry);
      }
      // plaque (back wall, left)
      var pc = drawPlaque(p, i), ptex = new THREE.CanvasTexture(pc); ptex.colorSpace = THREE.SRGBColorSpace; ptex.anisotropy = 8; plaqueTexs[i] = { tex: ptex, canvas: pc };
      var plaque = new THREE.Mesh(new THREE.PlaneGeometry(2.5, 1.875), new THREE.MeshStandardMaterial({ map: ptex, emissiveMap: ptex, emissive: 0xffffff, emissiveIntensity: .35, roughness: .6 }));
      plaque.position.set(RD - .03, 1.7, -3.7); plaque.rotation.y = -Math.PI / 2; G.add(plaque); plaque.userData = { type: 'plaque', room: i }; clickables.push(plaque);
      var pfr = new THREE.Mesh(new THREE.BoxGeometry(.02, 1.95, 2.57), MAT.frame); pfr.position.set(RD + .005, 1.7, -3.7); G.add(pfr);
      // sign: inside above door + in hall
      var sc = drawSign(p, i), stex = new THREE.CanvasTexture(sc); stex.colorSpace = THREE.SRGBColorSpace; stex.anisotropy = 8; signTexs[i] = { tex: stex, canvas: sc };
      var smat = new THREE.MeshStandardMaterial({ map: stex, emissiveMap: stex, emissive: 0xffffff, emissiveIntensity: .8, roughness: .5 });
      var signIn = new THREE.Mesh(new THREE.PlaneGeometry(2.4, .6), smat); signIn.position.set(.03, DOORH + .5, 0); signIn.rotation.y = Math.PI / 2; G.add(signIn); signIn.userData = { type: 'door', room: i };
      var signOut = new THREE.Mesh(new THREE.PlaneGeometry(2.4, .6), smat); signOut.position.set(-.03, DOORH + .5, 0); signOut.rotation.y = -Math.PI / 2; G.add(signOut); signOut.userData = { type: 'door', room: i }; clickables.push(signOut);
      // doorway hit target (clear plane) so tapping the opening walks there
      var hit = new THREE.Mesh(new THREE.PlaneGeometry(DOORW, DOORH), new THREE.MeshBasicMaterial({ visible: false })); hit.position.set(0, DOORH / 2, 0); hit.rotation.y = -Math.PI / 2; hit.userData = { type: 'door', room: i }; G.add(hit); clickables.push(hit);
      // props
      var ls = lightStand(2.3, G); ls.position.set(2.2, 0, RD / 2 - 1.1); var sb = softbox(.9, 1.2, G); sb.position.set(2.2, 2.35, RD / 2 - 1.1); sb.rotation.y = -Math.PI * .72;
      var ls2 = lightStand(2.0, G); ls2.position.set(RD - 1.6, 0, RD / 2 - 1.0); var sb2 = softbox(.7, .9, G); sb2.position.set(RD - 1.6, 2.1, RD / 2 - 1.0); sb2.rotation.y = -Math.PI * .6;
      var cs = cStand(G); cs.position.set(RD - 1.3, 0, 2.7); cs.rotation.y = Math.PI * .6;
      flightCase(.9, .55, .6, RD - .9, -RD / 2 + 1.0, .2, G); flightCase(.9, .45, .6, RD - 2.0, -RD / 2 + .8, -.1, G); appleBoxes(1.4, -RD / 2 + 1.0, G);
      // collision rect (world)
      var m = .45;
      if (side > 0) rects.push({ x0: HALLW / 2 + m, x1: HALLW / 2 + RD - m, z0: zc - RD / 2 + m, z1: zc + RD / 2 - m });
      else rects.push({ x0: -HALLW / 2 - RD + m, x1: -HALLW / 2 - m, z0: zc - RD / 2 + m, z1: zc + RD / 2 - m });
      rects.push({ x0: -HALLW / 2 + .2, x1: HALLW / 2 - .2, z0: zc - DOORW / 2 + .35, z1: zc + DOORW / 2 - .35, door: true }); // walls thickness covered by hall rect overlap below
      rects.push(side > 0 ? { x0: HALLW / 2 - .6, x1: HALLW / 2 + m + .1, z0: zc - DOORW / 2 + .35, z1: zc + DOORW / 2 - .35 } : { x0: -HALLW / 2 - m - .1, x1: -HALLW / 2 + .6, z0: zc - DOORW / 2 + .35, z1: zc + DOORW / 2 - .35 });
      rooms.push({ i: i, side: side, zc: zc, group: G, p: p });
    });
    rects.push({ x0: -HALLW / 2 + .45, x1: HALLW / 2 - .45, z0: .5, z1: HALLL - .5 });

    // hall dressing: stands between doors, big end-wall sign, entrance wall sign
    for (var q = 0; q < slots; q++) {
      var zz = 8 + SLOT * q + SLOT / 2 - 0.2; if (zz > HALLL - 4) continue;
      [1, -1].forEach(function (sd) { var s1 = lightStand(2.4, world); s1.position.set(sd * (HALLW / 2 - .8), 0, zz); var b1 = softbox(.8, 1.1, world); b1.position.set(sd * (HALLW / 2 - .8), 2.5, zz); b1.rotation.y = sd > 0 ? -Math.PI / 2 : Math.PI / 2; });
      var cc = cStand(world); cc.position.set(0, 0, zz); cc.rotation.y = q % 2 ? 1.2 : -1.2;
    }
    flightCase(1.1, .6, .7, -2.6, 2.2, .3); flightCase(1.1, .5, .7, 2.5, 2.0, -.2); appleBoxes(2.3, 3.3);
    // hall floor guide: gold line down the centre
    box(.05, .008, HALLL - 2, MAT.gold, 0, .006, HALLL / 2);
    function bigSign(text, sub, z, ry, big) {
      var c = document.createElement('canvas'); c.width = 2048; c.height = 512; var g = c.getContext('2d'), F = FONTS(); g.fillStyle = '#0b0b0d'; g.fillRect(0, 0, 2048, 512);
      g.strokeStyle = '#e9a653'; g.lineWidth = 6; g.strokeRect(14, 14, 2020, 484); g.fillStyle = '#f3eee6'; g.font = '400 220px ' + F.disp; g.textAlign = 'center'; g.textBaseline = 'middle'; g.direction = HB.lang === 'fa' ? 'rtl' : 'ltr'; g.fillText(text, 1024, 210);
      g.fillStyle = '#e9a653'; g.font = '700 46px ' + F.lab; g.fillText(sub, 1024, 400);
      var t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
      var m = new THREE.Mesh(new THREE.PlaneGeometry(5.6, 1.4), new THREE.MeshStandardMaterial({ map: t, emissiveMap: t, emissive: 0xffffff, emissiveIntensity: .7 })); m.position.set(0, 3.5, z); m.rotation.y = ry; world.add(m); return { m: m, t: t, c: c };
    }
    var signs = [];
    function makeBigSigns() { signs.forEach(function (s) { world.remove(s.m); s.t.dispose(); }); signs = [bigSign('HB Studio', HB.L(HB.content.contact.location).toUpperCase(), .05, 0), bigSign(HB.ui('studio.hall'), HB.ui('cta.studio').toUpperCase(), HALLL - .05, Math.PI)]; }
    makeBigSigns();

    /* ── player ── */
    var P = { x: 0, z: 2.2, yaw: Math.PI, pitch: 0, vx: 0, vz: 0 }, EYE = 1.62;
    var keys = {}, path = null, locked = false, drag = null, modal = false, curRoom = -1, hint = $('#hud-room');
    function inRect(x, z) { for (var i = 0; i < rects.length; i++) { var r = rects[i]; if (x >= r.x0 && x <= r.x1 && z >= r.z0 && z <= r.z1) return true; } return false; }
    function tryMove(nx, nz) { if (inRect(nx, nz)) { P.x = nx; P.z = nz; return; } if (inRect(nx, P.z)) { P.x = nx; return; } if (inRect(P.x, nz)) { P.z = nz; } }
    function regionOf(x, z) {
      if (Math.abs(x) <= HALLW / 2) return -1;
      for (var i = 0; i < rooms.length; i++) { var r = rooms[i]; if ((r.side > 0 ? x > 0 : x < 0) && Math.abs(z - r.zc) <= RD / 2) return i; }
      return -1;
    }
    function routeTo(tx, tz, finalYaw) {
      var a = regionOf(P.x, P.z), b = regionOf(tx, tz), pts = [];
      if (a !== b) {
        if (a >= 0) { var ra = rooms[a]; pts.push([ra.side * (HALLW / 2 - .1), ra.zc], [ra.side * (HALLW / 2 - 1.4), ra.zc]); }
        if (b >= 0) { var rb = rooms[b]; pts.push([rb.side * (HALLW / 2 - 1.4), rb.zc], [rb.side * (HALLW / 2 + .5), rb.zc]); }
      }
      pts.push([tx, tz]);
      // clamp end into walkable
      path = { pts: pts, i: 0, yaw: finalYaw };
    }
    function gotoRoom(i) {
      var r = rooms[i]; if (!r) return;
      var tx = r.side * (HALLW / 2 + 3.2), yaw = r.side > 0 ? -Math.PI / 2 : Math.PI / 2;
      routeTo(tx, r.zc, yaw); setNav(i);
    }
    function gotoHall() { routeTo(0, 2.4, Math.PI); setNav(-1); }
    function wrapAngle(a) { while (a > Math.PI) a -= Math.PI * 2; while (a < -Math.PI) a += Math.PI * 2; return a; }
    var lastT = performance.now();
    function update(dt) {
      var fwd = 0, str = 0, turn = 0;
      if (!modal) {
        if (keys.KeyW || keys.ArrowUp) fwd += 1; if (keys.KeyS || keys.ArrowDown) fwd -= 1;
        if (keys.KeyD) str += 1; if (keys.KeyA) str -= 1;
        if (keys.ArrowLeft) turn += 1; if (keys.ArrowRight) turn -= 1;
        P.yaw += turn * 1.9 * dt;
      }
      if ((fwd || str || turn) && path) path = null;
      if (path) {
        var tgt = path.pts[path.i], dx = tgt[0] - P.x, dz = tgt[1] - P.z, d = Math.hypot(dx, dz);
        if (d < .12) { path.i++; if (path.i >= path.pts.length) { var fy = path.yaw; path = null; if (fy != null) { P._ty = fy; } } }
        else {
          var sp = Math.min(d / dt, 3.6), want = Math.atan2(-dx, -dz); P.yaw += wrapAngle(want - P.yaw) * Math.min(1, dt * 5);
          var nx = P.x + dx / d * sp * dt, nz = P.z + dz / d * sp * dt; var ox = P.x, oz = P.z; tryMove(nx, nz); if (Math.hypot(P.x - ox, P.z - oz) < sp * dt * .2) path = null;
        }
      } else if (P._ty != null) { P.yaw += wrapAngle(P._ty - P.yaw) * Math.min(1, dt * 4); if (Math.abs(wrapAngle(P._ty - P.yaw)) < .01) P._ty = null; }
      if (!modal && (fwd || str)) {
        var l = Math.hypot(fwd, str) || 1, sp2 = 3.1 * dt, fx = -Math.sin(P.yaw), fz = -Math.cos(P.yaw), rx = Math.cos(P.yaw), rz = -Math.sin(P.yaw);
        tryMove(P.x + (fx * fwd + rx * str) / l * sp2, P.z + (fz * fwd + rz * str) / l * sp2);
      }
      var rg = regionOf(P.x, P.z); if (rg !== curRoom) { curRoom = rg; setNav(rg); }
    }
    function setNav(rg) {
      var el = $('#hud-room'); if (!el) return;
      var name = rg >= 0 ? HB.L(rooms[rg].p.title) : HB.ui('studio.hall');
      el.innerHTML = '<small>' + (rg >= 0 ? HB.esc(HB.ui('label.room') + ' ' + HB.numFmt(('0' + (rg + 1)).slice(-2))) : HB.esc(HB.ui('label.rooms'))) + '</small>' + HB.esc(name);
      HB.$$('#room-nav button').forEach(function (b) { b.classList.toggle('on', +b.getAttribute('data-r') === rg); });
    }
    function buildNav() {
      var nav = $('#room-nav'); if (!nav) return;
      nav.innerHTML = '<button type="button" data-r="-1">' + HB.esc(HB.ui('studio.hall')) + '</button>' + rooms.map(function (r) { return '<button type="button" data-r="' + r.i + '">' + HB.esc(HB.numFmt(('0' + (r.i + 1)).slice(-2)) + ' ' + HB.L(r.p.title)) + '</button>'; }).join('');
      nav.onclick = function (e) { var b = e.target.closest('button'); if (!b) return; var r = +b.getAttribute('data-r'); if (r < 0) gotoHall(); else gotoRoom(r); };
    }
    buildNav();

    /* ── input ── */
    var ray = new THREE.Raycaster(), V2 = new THREE.Vector2(), floorPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    function pick(clientX, clientY, center) {
      var r = canvas.getBoundingClientRect(); V2.set(center ? 0 : ((clientX - r.left) / r.width) * 2 - 1, center ? 0 : -((clientY - r.top) / r.height) * 2 + 1);
      ray.setFromCamera(V2, camera);
      var hits = ray.intersectObjects(clickables.concat(blockers), false), h = hits[0];
      if (h && h.object.userData && h.object.userData.type) return h.object.userData;
      var fp = new THREE.Vector3(), onFloor = ray.ray.intersectPlane(floorPlane, fp);
      if (onFloor && (!h || camera.position.distanceTo(fp) < h.distance) && fp.distanceTo(camera.position) < 40) return { type: 'floor', pt: fp };
      return null;
    }
    function activate(u, ev) {
      if (!u) return;
      var rm = rooms[u.room];
      if (u.type === 'frame') {
        var p = rm.p, items;
        if (u.path) items = (p.images || []).map(function (s) { return { src: s, title: HB.L(p.title), caption: HB.L(p.client) + ' · ' + HB.numFmt(p.year) }; });
        else items = [{ src: u.dataURL, title: HB.L(p.title), caption: HB.L(p.summary) }];
        modal = true; unlock(); HB.openLightbox(items, u.path ? Math.min(u.img, items.length - 1) : 0);
      } else if (u.type === 'plaque') { location.href = HB.pageUrl('project.html') + '?id=' + encodeURIComponent(rm.p.id); }
      else if (u.type === 'door') { gotoRoom(u.room); }
      else if (u.type === 'floor') {
        var tx = u.pt.x, tz = u.pt.z; if (!inRect(tx, tz)) { // snap to nearest walkable point
          var best = null, bd = 1e9; rects.forEach(function (r) { var cx = Math.max(r.x0, Math.min(r.x1, tx)), cz = Math.max(r.z0, Math.min(r.z1, tz)), d = Math.hypot(cx - tx, cz - tz); if (d < bd) { bd = d; best = [cx, cz]; } }); if (!best || bd > 6) return; tx = best[0]; tz = best[1];
        }
        routeTo(tx, tz, null);
      }
    }
    document.addEventListener('hb:lightbox', function (e) { modal = !!e.detail; if (!modal) { lastT = performance.now(); } });
    window.addEventListener('keydown', function (e) {
      if (modal || document.body.classList.contains('list-mode')) return; var t = e.target; if (t && /INPUT|TEXTAREA|SELECT/.test(t.tagName)) return;
      if (/^(KeyW|KeyA|KeyS|KeyD|ArrowUp|ArrowDown|ArrowLeft|ArrowRight)$/.test(e.code)) {
        var arrow = e.code.indexOf('Arrow') === 0;
        if (arrow && !shellFocus && !locked && !shell.contains(document.activeElement)) return;
        keys[e.code] = true; if (arrow) e.preventDefault();
      }
    });
    var shellFocus = false;
    shell.addEventListener('pointerenter', function () { shellFocus = true; }); shell.addEventListener('pointerleave', function () { shellFocus = false; });
    window.addEventListener('keyup', function (e) { keys[e.code] = false; });
    window.addEventListener('blur', function () { keys = {}; });

    function lock() { if (coarse || !canvas.requestPointerLock) return; try { var p = canvas.requestPointerLock(); if (p && p.catch) p.catch(function () {}); } catch (e) {} }
    function unlock() { if (document.pointerLockElement === canvas) document.exitPointerLock(); }
    document.addEventListener('pointerlockchange', function () { locked = document.pointerLockElement === canvas; var x = $('#cross'); if (x) x.classList.toggle('on', locked); var b = $('#btn-unlock'); if (b) b.hidden = !locked; });
    var down = null;
    canvas.addEventListener('pointerdown', function (e) { if (modal) return; down = { x: e.clientX, y: e.clientY, t: performance.now(), moved: 0 }; drag = { x: e.clientX, y: e.clientY, id: e.pointerId }; try { canvas.setPointerCapture(e.pointerId); } catch (er) {} });
    canvas.addEventListener('pointermove', function (e) {
      if (modal) return;
      if (locked) { P.yaw -= e.movementX * .0022; P.pitch = Math.max(-1.2, Math.min(1.2, P.pitch - e.movementY * .0022)); if (down) down.moved += Math.abs(e.movementX) + Math.abs(e.movementY); return; }
      if (drag && e.pointerId === drag.id) { var dx = e.clientX - drag.x, dy = e.clientY - drag.y; drag.x = e.clientX; drag.y = e.clientY; var k = coarse ? .0032 : .0026; P.yaw += dx * k; P.pitch = Math.max(-1.2, Math.min(1.2, P.pitch + dy * k)); if (down) down.moved += Math.abs(dx) + Math.abs(dy); if (path) path = null; P._ty = null; }
      else if (!coarse) { var u = pick(e.clientX, e.clientY, false); canvas.style.cursor = u && u.type !== 'floor' ? 'pointer' : (u ? 'pointer' : 'default'); }
    });
    function end(e) { if (!down) return; var d = down; down = null; drag = null; try { canvas.releasePointerCapture(e.pointerId); } catch (er) {} if (modal) return; if (d.moved < 7 && performance.now() - d.t < 450) { activate(pick(e.clientX, e.clientY, locked), e); } }
    canvas.addEventListener('pointerup', end); canvas.addEventListener('pointercancel', function () { down = null; drag = null; });
    var enter = $('#enter');
    function dismissEnter() { if (!enter) return; enter.hidden = true; lock(); canvas.focus && canvas.focus(); }
    var eb = $('#btn-enter'); if (eb) eb.addEventListener('click', dismissEnter);
    var ub = $('#btn-unlock'); if (ub) ub.addEventListener('click', unlock);

    /* ── lang + resize + loop ── */
    function refreshText() {
      plaqueTexs.forEach(function (o, i) { drawPlaque(projects[i], i, o.canvas); o.tex.needsUpdate = true; });
      signTexs.forEach(function (o, i) { drawSign(projects[i], i, o.canvas); o.tex.needsUpdate = true; });
      frames.forEach(function (f) { if (f.data.ph) { var p = projects[f.data.room], cv = placeholderCanvas(p, f.data.img); f.data.ph.getContext('2d').drawImage(cv, 0, 0); f.data.tex.needsUpdate = true; f.data.dataURL = f.data.ph.toDataURL('image/jpeg', .8); } });
      makeBigSigns(); buildNav(); setNav(curRoom);
      var eb2 = $('#btn-enter'); if (eb2) eb2.textContent = HB.ui(coarse ? 'studio.enterTouch' : 'studio.enter');
      var hh = $('#hud-help'); if (hh) hh.textContent = HB.ui(coarse ? 'studio.helpTouch' : 'studio.helpDesk');
    }
    document.addEventListener('hb:lang', function () { var go = function () { refreshText(); }; if (document.fonts && document.fonts.load) { Promise.all([document.fonts.load('40px "Lalezar"'), document.fonts.load('24px "Vazirmatn"'), document.fonts.load('40px "Instrument Serif"'), document.fonts.load('700 24px "Syne"')]).then(go, go); } else go(); });
    function resize() { var w = shell.clientWidth, h = shell.clientHeight; if (!w || !h) return; renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix(); }
    resize(); new ResizeObserver(resize).observe(shell);
    var running = true, vis = true;
    new IntersectionObserver(function (es) { vis = es[0].isIntersecting; }).observe(shell);
    function frameLoop(now) {
      requestAnimationFrame(frameLoop); var dt = Math.min(.05, (now - lastT) / 1000); lastT = now;
      if (!vis || document.hidden || body.classList.contains('list-mode')) return;
      update(dt); camera.position.set(P.x, EYE + (path ? Math.sin(now * .012) * .012 : 0), P.z); camera.rotation.set(P.pitch, P.yaw, 0); renderer.render(scene, camera);
    }
    // wait for fonts so plaques/signs are drawn with the real faces, then show the studio
    var ready = function () { refreshText(); var l = $('#loading'); if (l) l.classList.add('done'); requestAnimationFrame(frameLoop); setNav(-1); };
    if (document.fonts && document.fonts.load) Promise.all([document.fonts.load('40px "Instrument Serif"'), document.fonts.load('700 24px "Syne"'), document.fonts.load('40px "Lalezar"'), document.fonts.load('24px "Vazirmatn"')]).then(ready, ready); else ready();
    canvas.addEventListener('webglcontextlost', function (e) { e.preventDefault(); toList(HB.ui('studio.nogl')); });
    var out = { resize: resize, unlock: unlock, goto: gotoRoom, hall: gotoHall, state: function () { return { x: P.x, z: P.z, yaw: P.yaw, room: curRoom, rooms: rooms.length, frames: frames.length, modal: modal }; }, teleport: function (x, z, yaw, pitch) { P.x = x; P.z = z; P.yaw = yaw; P.pitch = pitch || 0; path = null; }, rooms: rooms, frames: frames, pick: pick, activate: activate, camera: camera, renderer: renderer };
    window.__studio = out; return out;
  }
})();
