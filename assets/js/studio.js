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
    var scene = new THREE.Scene(); scene.background = new THREE.Color(0x120d09); scene.fog = new THREE.Fog(0x120d09, 20, 70);
    var pm = new THREE.PMREMGenerator(renderer); scene.environment = pm.fromScene(new RoomEnvironment(), .04).texture;
    var camera = new THREE.PerspectiveCamera(coarse ? 68 : 62, 1, .05, 120); camera.rotation.order = 'YXZ';

    /* ── Safavid palette + procedural textures (all canvas, no downloads) ── */
    function ctex(w, h, fn, srgb, rep) { var c = document.createElement('canvas'); c.width = w; c.height = h; fn(c.getContext('2d'), w, h); var t = new THREE.CanvasTexture(c); if (srgb) t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy()); return t; }
    var seed = 7; function rnd() { seed = (seed * 16807) % 2147483647; return seed / 2147483647; }
    function poly(g, pts, fill, stroke, lw) { g.beginPath(); pts.forEach(function (p, i) { if (i) g.lineTo(p[0], p[1]); else g.moveTo(p[0], p[1]); }); g.closePath(); if (fill) { g.fillStyle = fill; g.fill(); } if (stroke) { g.strokeStyle = stroke; g.lineWidth = lw; g.lineJoin = 'round'; g.stroke(); } }
    function starPts(cx, cy, R, r, n, rot) { var pts = []; for (var i = 0; i < n * 2; i++) { var a = rot + i * Math.PI / n, rr = i % 2 ? r : R; pts.push([cx + Math.cos(a) * rr, cy + Math.sin(a) * rr]); } return pts; }
    function girihCell(g, S, P) {
      g.fillStyle = P.bg; g.fillRect(0, 0, S, S);
      [[0, 0], [S, 0], [0, S], [S, S]].forEach(function (p) { poly(g, starPts(p[0], p[1], S * .21, S * .09, 4, Math.PI / 4), P.c3, P.line, S * .012); });
      var c = S / 2, big = starPts(c, c, S * .47, S * .31, 8, -Math.PI / 2);
      poly(g, big, P.c1, P.ivory, S * .02); poly(g, big, null, P.line, S * .006);
      poly(g, starPts(c, c, S * .3, S * .185, 8, -Math.PI / 2 + Math.PI / 8), P.c2, P.line, S * .01);
      poly(g, starPts(c, c, S * .165, S * .1, 8, -Math.PI / 2), P.ivory, P.line, S * .008);
      for (var i = 0; i < 8; i++) { var a = i * Math.PI / 4; g.beginPath(); g.ellipse(c + Math.cos(a) * S * .07, c + Math.sin(a) * S * .07, S * .035, S * .016, a, 0, Math.PI * 2); g.fillStyle = P.c1; g.fill(); }
      [[c, 0], [c, S], [0, c], [S, c]].forEach(function (p) { poly(g, [[p[0], p[1] - S * .06], [p[0] + S * .06, p[1]], [p[0], p[1] + S * .06], [p[0] - S * .06, p[1]]], P.c2, P.line, S * .008); });
      g.strokeStyle = P.line; g.lineWidth = 2; g.strokeRect(0, 0, S, S);
    }
    var PAL_WALL = { bg: '#183688', c1: '#1ba0a6', c2: '#d9a53a', c3: '#e9ddc1', ivory: '#efe5cd', line: '#10245f' };
    var PAL_FLOOR = { bg: '#5b3322', c1: '#2d8f93', c2: '#c8962f', c3: '#d6c6a3', ivory: '#cdbd9b', line: '#2a1810' };
    var brickTex = ctex(512, 512, function (g, w, h) {
      g.fillStyle = '#cbb48f'; g.fillRect(0, 0, w, h); var rows = 8, bh = h / rows, bw = w / 4, cols = [[164, 92, 58], [178, 104, 66], [150, 82, 52], [188, 118, 76]];
      for (var r = 0; r < rows; r++) for (var c = -1; c < 5; c++) { var x = c * bw + (r % 2 ? bw / 2 : 0), y = r * bh, b = cols[(rnd() * 4) | 0], k = .9 + rnd() * .2; g.fillStyle = 'rgb(' + (b[0] * k | 0) + ',' + (b[1] * k | 0) + ',' + (b[2] * k | 0) + ')'; g.fillRect(x + 2, y + 2, bw - 4, bh - 4); }
      for (var j = 0; j < 5000; j++) { var v = rnd() < .5 ? 0 : 255; g.fillStyle = 'rgba(' + v + ',' + v + ',' + v + ',' + (.03 + rnd() * .05) + ')'; g.fillRect(rnd() * w, rnd() * h, 1 + rnd() * 2, 1 + rnd() * 2); }
    }, true);
    var plasterTex = ctex(256, 256, function (g, w, h) {
      g.fillStyle = '#d9c4a0'; g.fillRect(0, 0, w, h);
      for (var i = 0; i < 40; i++) { var x = rnd() * w, y = rnd() * h, r = 20 + rnd() * 70, gr = g.createRadialGradient(x, y, 0, x, y, r), v = rnd() < .5 ? '255,244,220' : '150,118,80'; gr.addColorStop(0, 'rgba(' + v + ',.16)'); gr.addColorStop(1, 'rgba(' + v + ',0)'); g.fillStyle = gr; g.fillRect(x - r, y - r, r * 2, r * 2); }
    }, true);
    var wallGirih = ctex(512, 512, function (g, w) { girihCell(g, w, PAL_WALL); }, true);
    var floorGirih = ctex(512, 512, function (g, w) { girihCell(g, w, PAL_FLOOR); }, true);
    var domeGirih = ctex(512, 512, function (g, w) { girihCell(g, w, { bg: '#0f6f78', c1: '#2bb3b6', c2: '#e0b04a', c3: '#f1e7cf', ivory: '#f6efdc', line: '#0a3f48' }); }, true);
    var muqTex = ctex(512, 512, function (g, w, h) {
      g.fillStyle = '#16306f'; g.fillRect(0, 0, w, h); var rows = 6, cols = 8, ch = h / rows, cw = w / cols, cs = ['#1ba0a6', '#e9ddc1', '#d9a53a', '#b8623d'];
      for (var r = 0; r < rows; r++) for (var c = -1; c <= cols; c++) {
        var x = c * cw + (r % 2 ? cw / 2 : 0), y = r * ch, col = cs[(r + c + 4) % 4], gr = g.createLinearGradient(0, y, 0, y + ch);
        gr.addColorStop(0, 'rgba(255,255,255,.55)'); gr.addColorStop(.35, 'rgba(255,255,255,0)'); gr.addColorStop(1, 'rgba(0,0,0,.55)');
        g.beginPath(); g.moveTo(x + 3, y + ch - 3); g.lineTo(x + 3, y + ch * .45); g.quadraticCurveTo(x + 3, y + ch * .18, x + cw / 2, y + 3); g.quadraticCurveTo(x + cw - 3, y + ch * .18, x + cw - 3, y + ch * .45); g.lineTo(x + cw - 3, y + ch - 3); g.closePath();
        g.fillStyle = col; g.fill(); g.fillStyle = gr; g.fill(); g.strokeStyle = 'rgba(16,36,95,.9)'; g.lineWidth = 3; g.stroke();
      }
    }, true);
    // mashrabiya lattice: octagon + square cut-outs. wood version has transparent holes; light version is the projected pattern
    function latticeDraw(g, w, light) {
      var n = 4, cs = w / n; if (light) { g.fillStyle = '#000'; g.fillRect(0, 0, w, w); g.fillStyle = '#fff'; } else { g.fillStyle = '#2b1a0d'; g.fillRect(0, 0, w, w); g.globalCompositeOperation = 'destination-out'; g.fillStyle = '#000'; }
      for (var i = 0; i < n; i++) for (var j = 0; j < n; j++) {
        var cx = (i + .5) * cs, cy = (j + .5) * cs, o = []; for (var k = 0; k < 8; k++) o.push([cx + Math.cos(k * Math.PI / 4 + Math.PI / 8) * cs * .36, cy + Math.sin(k * Math.PI / 4 + Math.PI / 8) * cs * .36]);
        poly(g, o, g.fillStyle); poly(g, [[cx + cs / 2, cy - cs * .13], [cx + cs / 2 + cs * .13, cy], [cx + cs / 2, cy + cs * .13], [cx + cs / 2 - cs * .13, cy]], g.fillStyle); poly(g, [[cx - cs * .13, cy + cs / 2], [cx, cy + cs / 2 - cs * .13], [cx + cs * .13, cy + cs / 2], [cx, cy + cs / 2 + cs * .13]], g.fillStyle);
      }
      g.globalCompositeOperation = 'source-over';
    }
    var latticeWood = ctex(512, 512, function (g, w) { latticeDraw(g, w, false); }, true);
    var latticeLight = ctex(512, 512, function (g, w) { latticeDraw(g, w, true); }, false);
    latticeLight.wrapS = latticeLight.wrapT = THREE.ClampToEdgeWrapping;
    var fluteTex = ctex(128, 16, function (g, w, h) { g.fillStyle = '#d8c7a4'; g.fillRect(0, 0, w, h); for (var i = 0; i < 16; i++) { var gr = g.createLinearGradient(i * 8, 0, i * 8 + 8, 0); gr.addColorStop(0, 'rgba(0,0,0,.34)'); gr.addColorStop(.5, 'rgba(255,255,255,.1)'); gr.addColorStop(1, 'rgba(0,0,0,.34)'); g.fillStyle = gr; g.fillRect(i * 8, 0, 8, h); } }, true);
    function glow() { return ctex(256, 256, function (g, w, h) { var r = g.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2); r.addColorStop(0, 'rgba(255,208,150,.5)'); r.addColorStop(.5, 'rgba(255,190,120,.16)'); r.addColorStop(1, 'rgba(255,190,120,0)'); g.fillStyle = r; g.fillRect(0, 0, w, h); }, true); }
    var glowTex = glow();

    var DS = THREE.DoubleSide;
    var MAT = {
      brick: new THREE.MeshStandardMaterial({ map: brickTex, roughness: .95, color: 0xf2e2cc }),
      plaster: new THREE.MeshStandardMaterial({ map: plasterTex, roughness: .95, color: 0xffffff, emissive: 0x4a361e, emissiveIntensity: .7, side: DS }),
      dado: new THREE.MeshStandardMaterial({ map: wallGirih, roughness: .35, metalness: .05 }),
      band: new THREE.MeshStandardMaterial({ map: wallGirih, roughness: .35, metalness: .05 }),
      bandDS: new THREE.MeshStandardMaterial({ map: wallGirih, roughness: .35, metalness: .05, side: DS }),
      paving: new THREE.MeshStandardMaterial({ map: brickTex, roughness: .75, color: 0xc9a58a }),
      rugEdge: new THREE.MeshStandardMaterial({ color: 0x16306f, roughness: .9 }),
      floorT: new THREE.MeshStandardMaterial({ map: floorGirih, roughness: .55, metalness: .04, color: 0xd8c8b4 }),
      dome: new THREE.MeshStandardMaterial({ map: domeGirih, roughness: .4, metalness: .1, side: THREE.BackSide, emissive: 0x0a4a52, emissiveIntensity: .55 }),
      muq: new THREE.MeshStandardMaterial({ map: muqTex, roughness: .45, metalness: .05, emissive: 0x1a1208, emissiveIntensity: .25 }),
      stone: new THREE.MeshStandardMaterial({ color: 0xcdbfa4, roughness: .8 }),
      tileTurq: new THREE.MeshStandardMaterial({ color: 0x1b9aa3, roughness: .3, metalness: .08 }),
      brass: new THREE.MeshStandardMaterial({ color: 0xc89a46, roughness: .35, metalness: .9 }),
      black: new THREE.MeshStandardMaterial({ color: 0x0c0c0e, roughness: .7, metalness: .35 }),
      steel: new THREE.MeshStandardMaterial({ color: 0x8b8f96, roughness: .38, metalness: .9 }),
      silver: new THREE.MeshStandardMaterial({ color: 0xdadde2, roughness: .22, metalness: .95, side: DS }),
      frame: new THREE.MeshStandardMaterial({ color: 0x2a1a0e, roughness: .5, metalness: .25 }),
      mat: new THREE.MeshStandardMaterial({ color: 0xe9e4da, roughness: .95 }),
      lamp: new THREE.MeshStandardMaterial({ color: 0x3b2a14, emissive: 0xffe2b8, emissiveIntensity: 2.2 }),
      soft: new THREE.MeshStandardMaterial({ color: 0x222222, emissive: 0xfff1dc, emissiveIntensity: 2.6, roughness: .8, side: DS }),
      softCool: new THREE.MeshStandardMaterial({ color: 0x222222, emissive: 0xe0ecff, emissiveIntensity: 2.6, roughness: .8, side: DS }),
      led: new THREE.MeshStandardMaterial({ color: 0x222222, emissive: 0xfff3e0, emissiveIntensity: 5 }),
      ledCool: new THREE.MeshStandardMaterial({ color: 0x222222, emissive: 0xdfeaff, emissiveIntensity: 5 }),
      amber: new THREE.MeshStandardMaterial({ color: 0x3a2410, emissive: 0xffb866, emissiveIntensity: 2.4, side: DS }),
      wood: new THREE.MeshStandardMaterial({ color: 0x6e4a2a, roughness: .7 }),
      case_: new THREE.MeshStandardMaterial({ color: 0x15161a, roughness: .55, metalness: .5 }),
      cloth: new THREE.MeshStandardMaterial({ color: 0x17306e, roughness: .9 }),
      gold: new THREE.MeshStandardMaterial({ color: 0xe9a653, roughness: .3, metalness: 1, emissive: 0x3a2204, emissiveIntensity: .4 }),
      water: new THREE.MeshStandardMaterial({ color: 0x0b5560, roughness: .04, metalness: .35, emissive: 0x04262c, emissiveIntensity: .6 }),
      poolbed: new THREE.MeshStandardMaterial({ color: 0x1b9aa3, roughness: .4 }),
      lattice: new THREE.MeshBasicMaterial({ map: latticeWood, alphaTest: .5, side: DS, fog: false }),
      card: new THREE.MeshBasicMaterial({ color: 0xffe2ad, fog: false, side: DS }),
      patch: new THREE.MeshBasicMaterial({ map: latticeLight, color: 0xffd9a0, transparent: true, opacity: .3, blending: THREE.AdditiveBlending, depthWrite: false })
    };
    MAT.floorT.map.repeat.set(1, 1);

    /* ── geometry helpers: pointed (Persian) arches ── */
    function archPts(w, r, n) {
      var R = (w * w / 4 + r * r) / w, cl = -w / 2 + R, a1 = Math.atan2(r, -cl), L = [];
      for (var k = 0; k <= n; k++) { var a = Math.PI + (a1 - Math.PI) * k / n; L.push([cl + R * Math.cos(a), R * Math.sin(a)]); }
      var out = L.slice(); for (var j = n - 1; j >= 0; j--) out.push([-L[j][0], L[j][1]]); return out;
    }
    function shapeGeo(outline, holes, tile) {
      var s = new THREE.Shape(); outline.forEach(function (p, i) { if (i) s.lineTo(p[0], p[1]); else s.moveTo(p[0], p[1]); });
      (holes || []).forEach(function (h) { var pa = new THREE.Path(); h.forEach(function (p, i) { if (i) pa.lineTo(p[0], p[1]); else pa.moveTo(p[0], p[1]); }); s.holes.push(pa); });
      var g = new THREE.ShapeGeometry(s), uv = g.attributes.uv; for (var i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) / tile, uv.getY(i) / tile); return g;
    }
    function shift(pts, dx, dy) { return pts.map(function (p) { return [p[0] + dx, p[1] + dy]; }); }
    function wallGeo(W, H, opens, wins, tile) {
      var o = [[0, 0]]; opens.slice().sort(function (a, b) { return a.cx - b.cx; }).forEach(function (d) { o.push([d.cx - d.w / 2, 0], [d.cx - d.w / 2, d.sp]); o = o.concat(shift(archPts(d.w, d.rise, 10), d.cx, d.sp)); o.push([d.cx + d.w / 2, 0]); });
      o.push([W, 0], [W, H], [0, H]);
      var holes = (wins || []).map(function (w) { return [[w.cx - w.w / 2, w.y0], [w.cx + w.w / 2, w.y0]].concat(shift(archPts(w.w, w.rise, 8), w.cx, w.y0 + w.h).reverse()); });
      return shapeGeo(o, holes, tile);
    }
    function gableGeo(W, H, rise, tile) { return shapeGeo([[0, 0], [W, 0], [W, H]].concat(shift(archPts(W, rise, 14), W / 2, H).reverse()), null, tile); }
    function archBandGeo(cx, w, sp, rise, bw, tile) {
      var out = archPts(w + 2 * bw, rise + bw * .9, 10), inn = archPts(w, rise, 10), P = [[cx - w / 2 - bw, 0], [cx - w / 2 - bw, sp]].concat(shift(out, cx, sp), [[cx + w / 2 + bw, 0], [cx + w / 2, 0], [cx + w / 2, sp]], shift(inn, cx, sp).reverse(), [[cx - w / 2, sp], [cx - w / 2, 0]]);
      return shapeGeo(P, null, tile);
    }
    function archFillGeo(cx, w, sp, rise, tile) { return shapeGeo([[cx - w / 2, 0], [cx + w / 2, 0], [cx + w / 2, sp]].concat(shift(archPts(w, rise, 10), cx, sp).reverse(), [[cx - w / 2, sp]]), null, tile); }
    function hoodGeo(cx, w, sp, rise, tile) { return shapeGeo([[cx - w / 2, sp]].concat(shift(archPts(w, rise, 10), cx, sp).reverse().slice(0, -1)), null, tile); }
    function rectGeo(W, H, tile) { return shapeGeo([[0, 0], [W, 0], [W, H], [0, H]], null, tile); }
    function planeUV(W, D, tile) { var g = new THREE.PlaneGeometry(W, D), uv = g.attributes.uv; for (var i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * W / tile, uv.getY(i) * D / tile); return g; }
    function vaultGeo(span, rise, y0, z0, z1, tile) {
      var pts = archPts(span, rise, 16), pos = [], uvs = [], idx = [], len = 0;
      pts.forEach(function (p, i) { if (i) len += Math.hypot(p[0] - pts[i - 1][0], p[1] - pts[i - 1][1]); pos.push(p[0], y0 + p[1], z0, p[0], y0 + p[1], z1); uvs.push(len / tile, z0 / tile, len / tile, z1 / tile); if (i) { var a = (i - 1) * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); } });
      var g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2)); g.setIndex(idx); g.computeVertexNormals(); return g;
    }

    /* ── world ── */
    var projects = HB.projects(), N = projects.length;
    var HALLW = 7, HALLH = 5, VR = 2.3, RD = 10, RH = 5, SLOT = 12, DOORW = 2.6, DOORH = 3.2, DSP = 2.4, DRISE = 1.4, DOMER = 3.0;
    var slots = Math.ceil(N / 2), HALLL = 8 + SLOT * slots;
    var world = new THREE.Group(); scene.add(world); scene.add(new THREE.HemisphereLight(0xffe6c4, 0x3b2416, 1.0));
    var rects = []; // walkable rectangles {x0,x1,z0,z1}
    var rooms = []; // {i, side, zc, group}
    var clickables = []; // meshes with userData
    var plaqueTexs = [], signTexs = [], frames = [], blockers = [], cols = [];
    var sources = [], labels = [], muq = [], windowsAnch = [];

    function box(w, h, d, mat, x, y, z, parent) { var m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat); m.position.set(x, y, z); (parent || world).add(m); return m; }
    function cyl(rt, rb, h, seg, mat, x, y, z, parent) { var m = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), mat); m.position.set(x, y, z); (parent || world).add(m); return m; }
    function mesh(geo, mat, x, y, z, parent) { var m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); (parent || world).add(m); return m; }
    function addSrc(parent, x, y, z, color, inten, dist) { sources.push({ par: parent, l: new THREE.Vector3(x, y, z), c: color, i: inten, d: dist, w: new THREE.Vector3(), dd: 0 }); }
    function addGlow(parent, x, y, z, s, tint) { var sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: tint || 0xffd9a0, blending: THREE.AdditiveBlending, transparent: true, depthWrite: false, opacity: .9 })); sp.scale.set(s, s, 1); sp.position.set(x, y, z); parent.add(sp); return sp; }
    function addLabel(parent, text, x, y, z) {
      var c = document.createElement('canvas'); c.width = 256; c.height = 64; var g = c.getContext('2d'); g.font = '700 30px "Syne",system-ui,sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.direction = 'ltr';
      g.fillStyle = 'rgba(20,14,8,.55)'; g.fillRect(8, 10, 240, 44); g.fillStyle = '#f3e6c8'; g.fillText(text, 128, 33);
      var t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; var sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, transparent: true, depthWrite: false, opacity: 0, fog: false })); sp.scale.set(.62, .155, 1); sp.position.set(x, y, z); parent.add(sp); labels.push({ s: sp, p: new THREE.Vector3(), par: parent });
    }

    /* muqarnas cornice: stepped tiers of pendant cells (instanced later) */
    function cornice(parent, ax, az, bx, bz, nx, nz, y, skip) {
      var len = Math.hypot(bx - ax, bz - az), dx = (bx - ax) / len, dz = (bz - az) / len, step = .36, n = Math.floor(len / step);
      for (var t = 0; t < 3; t++) for (var k = 0; k < n; k++) {
        var s = (k + .5 + (t % 2 ? .5 : 0)) * step; if (s > len) continue; var off = .24 - t * .09, px = ax + dx * s + nx * off, pz = az + dz * s + nz * off;
        if (skip && skip(px, pz)) continue; muq.push({ par: parent, x: px, y: y - t * .26, z: pz, s: .17 - t * .012, c: (k + t * 2) % 4 });
      }
    }
    /* engaged tile column */
    function column(parent, x, z, h, rad) { cyl(rad, rad, h, 12, MAT.tileTurq, x, h / 2 + .12, z, parent); box(rad * 3, .12, rad * 3, MAT.stone, x, .06, z, parent); box(rad * 2.6, .1, rad * 2.6, MAT.brass, x, h + .17, z, parent); }
    function flightCase(w, h, d, x, z, ry, parent) {
      var g = new THREE.Group(); g.position.set(x, h / 2, z); g.rotation.y = ry || 0;
      g.add(new THREE.Mesh(new RoundedBoxGeometry(w, h, d, 2, .03), MAT.case_));
      [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(function (c) { var k = new THREE.Mesh(new THREE.BoxGeometry(.07, .07, .07), MAT.steel); k.position.set(c[0] * (w / 2), c[1] * (h / 2), (c[0] * c[1]) * (d / 2)); g.add(k); });
      var latch = new THREE.Mesh(new THREE.BoxGeometry(.12, .04, .02), MAT.steel); latch.position.set(0, h * .2, d / 2 + .005); g.add(latch);
      (parent || world).add(g); return g;
    }
    function appleBoxes(x, z, parent) { var g = new THREE.Group(); g.position.set(x, 0, z); [[0, .1, 0, .6, .2, .4], [.05, .3, .02, .6, .2, .4], [.5, .1, .1, .5, .2, .3]].forEach(function (p, i) { var b = new THREE.Mesh(new THREE.BoxGeometry(p[3], p[4], p[5]), MAT.wood); b.position.set(p[0], p[1], p[2]); b.rotation.y = i * .25; g.add(b); }); (parent || world).add(g); return g; }

    /* ── stylised low-poly studio lighting (names are model names only, no logos) ── */
    function stand(g, h, heavy) {
      var legL = heavy ? 1.05 : .95, spread = heavy ? .34 : .26;
      for (var i = 0; i < 3; i++) { var a = i * 2.094 + .5, leg = cyl(.012, .012, legL, 6, MAT.black, Math.cos(a) * spread, .44, Math.sin(a) * spread, g); leg.rotation.set(Math.sin(a) * .5, 0, -Math.cos(a) * .5); }
      cyl(.02, .025, h, 10, MAT.steel, 0, h / 2 + .1, 0, g); cyl(.03, .03, h * .28, 10, MAT.black, 0, h * .42, 0, g);
      if (heavy) box(.4, .13, .2, MAT.case_, .22, .07, .12, g);
    }
    function dishGeo(R, depth) { var pts = []; for (var t = 0; t <= 8; t++) { var r = t / 8 * R; pts.push(new THREE.Vector2(r, r * r / (R * R) * depth)); } var gg = new THREE.LatheGeometry(pts, 20); gg.rotateX(Math.PI / 2); return gg; }
    function yokeHead(g, y, tilt) { var hd = new THREE.Group(); hd.position.set(0, y, 0); hd.rotation.x = tilt || .1; g.add(hd); box(.04, .42, .04, MAT.black, .25, 0, -.05, hd); box(.04, .42, .04, MAT.black, -.25, 0, -.05, hd); return hd; }
    function evoke(parent, x, z, ry, dish) {
      var g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = ry; parent.add(g); stand(g, 2.05, true);
      var hd = yokeHead(g, 2.25, .12), b = cyl(.17, .2, .34, 18, MAT.black, 0, 0, -.14, hd); b.rotation.x = Math.PI / 2;
      if (dish) { mesh(dishGeo(.62, .34), MAT.silver, 0, 0, .0, hd); var cob = cyl(.1, .1, .04, 16, MAT.led, 0, 0, .03, hd); cob.rotation.x = Math.PI / 2; addGlow(hd, 0, 0, .3, 2.3, 0xfff0d8); addSrc(hd, 0, 0, .7, 0xfff1dc, 22, 11); }
      else {
        var fg = new THREE.CylinderGeometry(.62, .2, .55, 4, 1, true); fg.rotateY(Math.PI / 4); fg.rotateX(Math.PI / 2); mesh(fg, MAT.black, 0, 0, .1, hd);
        mesh(new THREE.PlaneGeometry(.87, .87), MAT.soft, 0, 0, .375, hd); addGlow(hd, 0, 0, .55, 2.6, 0xfff0d8); addSrc(hd, 0, 0, .9, 0xfff1dc, 22, 11);
      }
      addLabel(g, 'Evoke 600C', 0, .95, .25); return g;
    }
    function fsLight(parent, x, z, ry, name, cool, h) {
      var g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = ry; parent.add(g); stand(g, h || 1.55, false);
      var hd = yokeHead(g, (h || 1.55) + .2, .08); hd.scale.setScalar(.85); var b = cyl(.1, .13, .3, 14, MAT.black, 0, 0, -.1, hd); b.rotation.x = Math.PI / 2;
      mesh(dishGeo(.27, .13), MAT.silver, 0, 0, .06, hd); var dome = mesh(new THREE.SphereGeometry(.065, 10, 8), cool ? MAT.ledCool : MAT.led, 0, 0, .09, hd);
      addGlow(hd, 0, 0, .25, 1.5, cool ? 0xcfe0ff : 0xffe2b8); addSrc(hd, 0, 0, .5, cool ? 0xdfeaff : 0xffe6c4, 14, 9);
      addLabel(g, name, 0, .85, .2); return g;
    }
    function fs720(parent, x, z, ry) {
      var g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = ry; parent.add(g); stand(g, 2.6, true);
      box(.05, .05, 2.7, MAT.steel, 0, 2.78, .62, g); box(.3, .26, .2, MAT.case_, 0, 2.78, -.82, g); box(.04, .34, .04, MAT.black, 0, 2.6, 1.9, g);
      cyl(.3, .34, .2, 22, MAT.black, 0, 2.4, 1.9, g); var f = mesh(new THREE.CircleGeometry(.3, 22), MAT.soft, 0, 2.295, 1.9, g); f.rotation.x = Math.PI / 2;
      addGlow(g, 0, 2.05, 1.9, 2.4, 0xfff0d8); addSrc(g, 0, 2.0, 1.9, 0xfff1dc, 26, 10); addLabel(g, 'FS-720 BVC', 0, 1.0, .3); return g;
    }
    function jewelrySet(parent, x, z) {
      var g = new THREE.Group(); g.position.set(x, 0, z); parent.add(g);
      cyl(.5, .5, .74, 24, MAT.black, 0, .37, 0, g); cyl(.52, .52, .04, 24, MAT.cloth, 0, .76, 0, g);
      cyl(.09, .13, .26, 10, MAT.stone, 0, .91, 0, g); var ring = mesh(new THREE.TorusGeometry(.07, .018, 8, 18), MAT.gold, 0, 1.12, 0, g); ring.rotation.x = Math.PI / 2.6;
      return g;
    }
    function achaemenid(parent, x, z, h) {
      var g = new THREE.Group(); g.position.set(x, 0, z); parent.add(g);
      cyl(.36, .4, .2, 18, MAT.stone, 0, .1, 0, g); cyl(.28, .34, .16, 18, MAT.stone, 0, .28, 0, g);
      var ft = fluteTex.clone(); ft.needsUpdate = true; ft.repeat.set(1, 1); var sh = new THREE.Mesh(new THREE.CylinderGeometry(.24, .27, h - 1.45, 20), new THREE.MeshStandardMaterial({ map: ft, roughness: .85 })); sh.position.y = .36 + (h - 1.45) / 2; g.add(sh);
      var top = .36 + h - 1.45; cyl(.3, .26, .18, 18, MAT.stone, 0, top + .09, 0, g);
      cyl(.2, .3, .3, 18, MAT.stone, 0, top + .33, 0, g);
      [-1, 1].forEach(function (sd) { var v = mesh(new THREE.TorusGeometry(.14, .045, 6, 14), MAT.stone, sd * .27, top + .5, 0, g); v.rotation.y = Math.PI / 2; v.rotation.z = 0; });
      box(.72, .14, .72, MAT.stone, 0, top + .73, 0, g);
      // double bull protomes back to back
      box(1.0, .3, .3, MAT.stone, 0, top + .95, 0, g);
      [-1, 1].forEach(function (sd) { mesh(new THREE.SphereGeometry(.17, 8, 6), MAT.stone, sd * .55, top + 1.02, 0, g); [-1, 1].forEach(function (hz) { var hn = mesh(new THREE.ConeGeometry(.04, .2, 5), MAT.stone, sd * .55, top + 1.2, hz * .13, g); hn.rotation.x = hz * .5; }); });
      box(1.1, .12, .42, MAT.stone, 0, top + 1.16, 0, g);
      return g;
    }
    function lantern(parent, x, y, z) { cyl(.085, .085, .26, 6, MAT.amber, x, y, z, parent); cyl(.1, .06, .05, 6, MAT.brass, x, y + .15, z, parent); cyl(.05, .09, .05, 6, MAT.brass, x, y - .15, z, parent); addGlow(parent, x, y, z, 1.1, 0xffc680); }

    /* ── hall: a pointed barrel vault, brick walls, tiled dado, iwan portals ── */
    var HV = HALLW / 2;
    // floor: brick paving + a woven runner
    var hf = new THREE.Mesh(planeUV(HALLW, HALLL, 1.2), MAT.paving); hf.rotation.x = -Math.PI / 2; hf.position.set(0, 0, HALLL / 2); world.add(hf);
    var rugL = HALLL - 8.4, rugZ = 3.6 + rugL / 2;
    var rg1 = new THREE.Mesh(planeUV(2.7, rugL + .3, 1), MAT.rugEdge); rg1.rotation.x = -Math.PI / 2; rg1.position.set(0, .004, rugZ); world.add(rg1);
    var rg2 = new THREE.Mesh(planeUV(2.2, rugL, 1.1), MAT.floorT); rg2.rotation.x = -Math.PI / 2; rg2.position.set(0, .007, rugZ); world.add(rg2);
    // vault
    mesh(vaultGeo(HALLW, VR, HALLH, 0, HALLL, 2.2), MAT.plaster, 0, 0, 0, world);
    for (var rz = 3; rz < HALLL - 1; rz += 6) mesh(vaultGeo(HALLW - .04, VR - .02, HALLH, rz, rz + .5, .5), MAT.bandDS, 0, 0, 0, world);
    // end gables
    var gE = new THREE.Mesh(gableGeo(HALLW, HALLH, VR, 1.6), MAT.brick); gE.position.set(-HV, 0, 0); world.add(gE); blockers.push(gE);
    var gF = new THREE.Mesh(gableGeo(HALLW, HALLH, VR, 1.6), MAT.brick); gF.position.set(HV, 0, HALLL); gF.rotation.y = Math.PI; world.add(gF); blockers.push(gF);
    [[0, 0, 0, 1], [HALLL, 0, Math.PI, -1]].forEach(function (e) {
      var G = new THREE.Group(); G.position.set(e[3] > 0 ? -HV : HV, 0, e[0]); G.rotation.y = e[2]; world.add(G);
      mesh(archBandGeo(HV, 4.6, 3.2, 1.9, .34, .6), MAT.band, 0, 0, .02, G); mesh(hoodGeo(HV, 4.6, 3.2, 1.9, 1.25), MAT.muq, 0, 0, .015, G);
      mesh(rectGeo(HV * 2, 1.35, 1), MAT.dado, 0, 0, .012, G); box(HV * 2, .1, .07, MAT.stone, HV, 1.4, .04, G);
      column(G, HV - 2.95, .15, 3.2, .14); column(G, HV + 2.95, .15, 3.2, .14);
    });
    cornice(world, -HV, 0, HV, 0, 0, 1, HALLH + .1); cornice(world, HV, HALLL, -HV, HALLL, 0, -1, HALLH + .1);
    // side walls
    var cuts = {};
    for (var ri = 0; ri < N; ri++) { var sd0 = ri % 2 === 0 ? 1 : -1; (cuts[sd0] = cuts[sd0] || []).push(8 + SLOT * Math.floor(ri / 2)); }
    var winZ = [4]; for (var wq = 0; wq < slots; wq++) { var wz = 8 + SLOT * wq + SLOT / 2; if (wz < HALLL - 5) winZ.push(wz); }
    [1, -1].forEach(function (sd) {
      var doors = (cuts[sd] || []).slice(), X = function (z) { return sd > 0 ? z : HALLL - z; };
      var opens = doors.map(function (zc) { return { cx: X(zc), w: DOORW, sp: DSP, rise: DRISE }; }), wins = winZ.map(function (z) { return { cx: X(z), w: 1.5, y0: 2.5, h: 1.1, rise: .9 }; });
      var W = new THREE.Group(); W.position.set(sd * HV, 0, sd > 0 ? 0 : HALLL); W.rotation.y = sd > 0 ? -Math.PI / 2 : Math.PI / 2; world.add(W);
      var wm = new THREE.Mesh(wallGeo(HALLL, HALLH, opens, wins, 1.6), MAT.brick); W.add(wm); blockers.push(wm);
      // dado between openings
      var edges = [0]; opens.slice().sort(function (a, b) { return a.cx - b.cx; }).forEach(function (o) { edges.push(o.cx - o.w / 2, o.cx + o.w / 2); }); edges.push(HALLL);
      for (var e = 0; e < edges.length; e += 2) { var a = edges[e], b2 = edges[e + 1]; if (b2 - a < .2) continue; var dm = new THREE.Mesh(planeUV(b2 - a, 1.3, 1), MAT.dado); dm.position.set((a + b2) / 2, .65, .012); W.add(dm); box(b2 - a, .1, .07, MAT.stone, (a + b2) / 2, 1.35, .04, W); }
      opens.forEach(function (o) {
        mesh(archBandGeo(o.cx, o.w, o.sp, o.rise, .32, .6), MAT.band, 0, 0, .02, W);
        column(W, o.cx - o.w / 2 - .5, .14, o.sp, .12); column(W, o.cx + o.w / 2 + .5, .14, o.sp, .12);
      });
      wins.forEach(function (w) {
        mesh(archBandGeo(w.cx, w.w, w.h, w.rise, .22, .5), MAT.band, 0, w.y0, .02, W);
        var outline = [[w.cx - w.w / 2, w.y0], [w.cx + w.w / 2, w.y0]].concat(shift(archPts(w.w, w.rise, 8), w.cx, w.y0 + w.h).reverse());
        var card = new THREE.Mesh(shapeGeo(outline, null, 1), MAT.card); card.position.z = -.4; W.add(card);
        var lat = new THREE.Mesh(shapeGeo(outline, null, .75), MAT.lattice); lat.position.z = -.05; W.add(lat);
        box(w.w + .4, .08, .22, MAT.stone, w.cx, w.y0 - .04, .1, W);
        // dappled-light patch on the floor under the window
        var pt = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 3.4), MAT.patch); pt.rotation.x = -Math.PI / 2; pt.rotation.z = sd * .5; pt.position.set(sd * (HV - 1.5), .012, sd > 0 ? w.cx : HALLL - w.cx); world.add(pt);
        [-2.4, 2.4].forEach(function (dx) { var sx = w.cx + dx, ok = true; opens.forEach(function (o) { if (Math.abs(o.cx - sx) < 2.9) ok = false; }); if (sx < 1 || sx > HALLL - 1) ok = false; if (!ok) return; box(.08, .3, .05, MAT.brass, sx, 2.6, .05, W); lantern(W, sx, 2.6, .17); addSrc(W, sx, 2.6, .5, 0xffc27a, 7, 7); });
        windowsAnch.push({ pos: new THREE.Vector3(sd * (HV + .9), 4.3, sd > 0 ? w.cx : HALLL - w.cx), tgt: new THREE.Vector3(sd * (HV - 1.6), 0, sd > 0 ? w.cx : HALLL - w.cx) });
      });
      cornice(world, sd * HV, 0, sd * HV, HALLL, -sd, 0, HALLH + .1);
    });
    // hall gear
    for (var gq = 0; gq < slots; gq++) {
      var gz = 8 + SLOT * gq + 3.5, gxR = HV - .85, gxL = -HV + .85, yR = -Math.PI / 2, yL = Math.PI / 2;
      if (gz > HALLL - 7) continue;
      if (gq % 2 === 0) { evoke(world, gxR, gz, yR + .35, false); fsLight(world, gxL, gz, yL - .3, 'FS-500C', false, 1.7); }
      else { fsLight(world, gxR, gz, yR + .2, 'FS-300C', true, 1.5); fs720(world, gxL, gz - .4, yL); jewelrySet(world, gxL + 1.9, gz - .4); cols.push({ x: gxL + 1.9, z: gz - .4, r: .65 }); }
    }
    // hoz (reflecting pool) in front of the end iwan
    var PZ0 = HALLL - 5.6, PZ1 = HALLL - 1.6;
    mesh(new THREE.BoxGeometry(2.6, .05, PZ1 - PZ0), MAT.poolbed, 0, .06, (PZ0 + PZ1) / 2, world);
    var wat = mesh(new THREE.PlaneGeometry(2.4, PZ1 - PZ0 - .2), MAT.water, 0, .2, (PZ0 + PZ1) / 2, world); wat.rotation.x = -Math.PI / 2;
    box(2.9, .32, .25, MAT.stone, 0, .16, PZ0 - .12, world); box(2.9, .32, .25, MAT.stone, 0, .16, PZ1 + .12, world); box(.25, .32, PZ1 - PZ0, MAT.stone, -1.32, .16, (PZ0 + PZ1) / 2, world); box(.25, .32, PZ1 - PZ0, MAT.stone, 1.32, .16, (PZ0 + PZ1) / 2, world);
    rects.push({ x0: -HV + .45, x1: HV - .45, z0: .5, z1: PZ0 - .45 }, { x0: -HV + .45, x1: -1.8, z0: PZ0 - .5, z1: HALLL - .5 }, { x0: 1.8, x1: HV - .45, z0: PZ0 - .5, z1: HALLL - .5 }, { x0: -HV + .45, x1: HV - .45, z0: PZ1 + .5, z1: HALLL - .5 });
    addSrc(world, 0, 1.6, HALLL - 3, 0x9fe0e6, 8, 8);
    addSrc(world, 0, 3.2, 3, 0xffd9a0, 12, 12);

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

    /* rooms: each one a Safavid chamber with a tiled dome, an iwan on the hero wall and its own lighting set */
    function toWorldXZ(side, zc, lx, lz) { return side > 0 ? { x: HV + lx, z: zc + lz } : { x: -HV - lx, z: zc - lz }; }
    function aimYaw(x, z, tx, tz) { return Math.atan2(tx - x, tz - z); }
    projects.forEach(function (p, i) {
      var side = i % 2 === 0 ? 1 : -1, zc = 8 + SLOT * Math.floor(i / 2);
      var G = new THREE.Group(); G.position.set(side * HALLW / 2, 0, zc); G.rotation.y = side > 0 ? 0 : Math.PI; world.add(G);
      var fl = new THREE.Mesh(planeUV(RD, RD, 1.6), MAT.floorT); fl.rotation.x = -Math.PI / 2; fl.position.set(RD / 2, 0, 0); G.add(fl);
      var cir = []; for (var a = 0; a < 40; a++) cir.push([Math.cos(a / 40 * Math.PI * 2) * DOMER, Math.sin(a / 40 * Math.PI * 2) * DOMER]);
      var ce = new THREE.Mesh(shapeGeo([[-RD / 2, -RD / 2], [RD / 2, -RD / 2], [RD / 2, RD / 2], [-RD / 2, RD / 2]], [cir], 2), MAT.plaster); ce.rotation.x = Math.PI / 2; ce.position.set(RD / 2, RH, 0); G.add(ce);
      var dome = new THREE.Mesh(new THREE.SphereGeometry(DOMER, 28, 10, 0, Math.PI * 2, 0, Math.PI / 2), MAT.dome); dome.scale.y = .62; dome.position.set(RD / 2, RH, 0); G.add(dome);
      var ocu = new THREE.Mesh(new THREE.CircleGeometry(.55, 16), MAT.card); ocu.rotation.x = Math.PI / 2; ocu.position.set(RD / 2, RH + DOMER * .62 - .03, 0); G.add(ocu);
      function roomWall(len, opens, x, z, ry) {
        var W = new THREE.Group(); W.position.set(x, 0, z); W.rotation.y = ry; G.add(W);
        var wm = new THREE.Mesh(wallGeo(len, RH, opens, [], 1.6), MAT.brick); W.add(wm); blockers.push(wm);
        var edges = [0]; opens.forEach(function (o) { edges.push(o.cx - o.w / 2, o.cx + o.w / 2); }); edges.push(len);
        for (var e = 0; e < edges.length; e += 2) { var a0 = edges[e], b0 = edges[e + 1]; if (b0 - a0 < .2) continue; var dm = new THREE.Mesh(planeUV(b0 - a0, .9, 1), MAT.dado); dm.position.set((a0 + b0) / 2, .45, .012); W.add(dm); box(b0 - a0, .08, .06, MAT.stone, (a0 + b0) / 2, .94, .035, W); }
        return W;
      }
      // back wall: the iwan
      var WB = roomWall(RD, [], RD, -RD / 2, -Math.PI / 2);
      mesh(archBandGeo(RD / 2, 4.2, 3.3, 1.3, .3, .6), MAT.band, 0, 0, .02, WB); mesh(hoodGeo(RD / 2, 4.2, 3.3, 1.3, 1.25), MAT.muq, 0, 0, .014, WB);
      mesh(archFillGeo(RD / 2, 4.2, 3.3, 1.3, 2), MAT.plaster, 0, 0, .008, WB);
      column(WB, RD / 2 - 2.55, .14, 3.3, .13); column(WB, RD / 2 + 2.55, .14, 3.3, .13);
      // side walls: pointed niches around each frame
      var WS1 = roomWall(RD, [], 0, -RD / 2, 0), WS2 = roomWall(RD, [], RD, RD / 2, Math.PI);
      [[WS1, 3.6], [WS1, 7.0], [WS2, RD - 3.6], [WS2, RD - 7.0]].forEach(function (n) { mesh(archBandGeo(n[1], 2.9, 2.9, .9, .22, .5), MAT.band, 0, 0, .02, n[0]); mesh(archFillGeo(n[1], 2.9, 2.9, .9, 2), MAT.plaster, 0, 0, .008, n[0]); });
      // door wall with pointed arch
      var WD = roomWall(RD, [{ cx: RD / 2, w: DOORW, sp: DSP, rise: DRISE }], 0, RD / 2, Math.PI / 2);
      mesh(archBandGeo(RD / 2, DOORW, DSP, DRISE, .3, .6), MAT.band, 0, 0, .02, WD);
      box(.5, .04, DOORW + .3, MAT.stone, 0, .02, 0, G);
      cornice(G, RD, -RD / 2, RD, RD / 2, -1, 0, RH - .02, function (x, z) { return Math.abs(z) < 2.85; });
      cornice(G, 0, -RD / 2, RD, -RD / 2, 0, 1, RH - .02); cornice(G, 0, RD / 2, RD, RD / 2, 0, -1, RH - .02);
      cornice(G, 0, -RD / 2, 0, RD / 2, 1, 0, RH - .02, function (x, z) { return Math.abs(z) < 1.75; });
      addSrc(G, RD * .5, RH - 1.2, 0, 0xffd9a8, 24, 15); addSrc(G, RD - .8, 3.0, 0, 0xffcf94, 12, 9);
      windowsAnch.push({ par: G, lpos: new THREE.Vector3(RD / 2, RH + .8, 0), ltgt: new THREE.Vector3(RD / 2, 0, 0), pos: new THREE.Vector3(), tgt: new THREE.Vector3() });

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
      for (var k = 0; k < Math.min(total, slotsPos.length); k++) { var sp = slotsPos[k]; makeFrame(G, p, i, k, imgs[k] || null, sp.w, sp.h, sp.pos, sp.ry); }
      // plaque (back wall, left)
      var pc = drawPlaque(p, i), ptex = new THREE.CanvasTexture(pc); ptex.colorSpace = THREE.SRGBColorSpace; ptex.anisotropy = 8; plaqueTexs[i] = { tex: ptex, canvas: pc };
      var plaque = new THREE.Mesh(new THREE.PlaneGeometry(2.5, 1.875), new THREE.MeshStandardMaterial({ map: ptex, emissiveMap: ptex, emissive: 0xffffff, emissiveIntensity: .35, roughness: .6 }));
      plaque.position.set(RD - .03, 1.7, -3.9); plaque.rotation.y = -Math.PI / 2; G.add(plaque); plaque.userData = { type: 'plaque', room: i }; clickables.push(plaque);
      var pfr = new THREE.Mesh(new THREE.BoxGeometry(.02, 1.95, 2.57), MAT.frame); pfr.position.set(RD + .005, 1.7, -3.9); G.add(pfr);
      // sign above the arch, both faces
      var sc = drawSign(p, i), stex = new THREE.CanvasTexture(sc); stex.colorSpace = THREE.SRGBColorSpace; stex.anisotropy = 8; signTexs[i] = { tex: stex, canvas: sc };
      var smat = new THREE.MeshStandardMaterial({ map: stex, emissiveMap: stex, emissive: 0xffffff, emissiveIntensity: .8, roughness: .5 }), SY = 4.58;
      var signIn = new THREE.Mesh(new THREE.PlaneGeometry(2.4, .6), smat); signIn.position.set(.03, SY, 0); signIn.rotation.y = Math.PI / 2; G.add(signIn); signIn.userData = { type: 'door', room: i }; clickables.push(signIn);
      var signOut = new THREE.Mesh(new THREE.PlaneGeometry(2.4, .6), smat); signOut.position.set(-.03, SY, 0); signOut.rotation.y = -Math.PI / 2; G.add(signOut); signOut.userData = { type: 'door', room: i }; clickables.push(signOut);
      var hit = new THREE.Mesh(new THREE.PlaneGeometry(DOORW, DOORH), new THREE.MeshBasicMaterial({ visible: false })); hit.position.set(0, DOORH / 2, 0); hit.rotation.y = -Math.PI / 2; hit.userData = { type: 'door', room: i }; G.add(hit); clickables.push(hit);
      // lighting set (varies per room)
      var pat = i % 4;
      if (pat === 0) { evoke(G, 1.7, 3.9, aimYaw(1.7, 3.9, 6, 0), false); fsLight(G, 8.3, 3.9, aimYaw(8.3, 3.9, 2, 0), 'FS-300B', false, 1.9); }
      else if (pat === 1) {
        var by = aimYaw(2.0, -3.9, 5, -1.2); fs720(G, 2.0, -3.9, by); var tx = 2.0 + 1.9 * Math.sin(by), tz = -3.9 + 1.9 * Math.cos(by); jewelrySet(G, tx, tz); var wp = toWorldXZ(side, zc, tx, tz); cols.push({ x: wp.x, z: wp.z, r: .65 });
        fsLight(G, 8.2, 3.9, aimYaw(8.2, 3.9, tx, tz), 'FS-300C', true, 1.5);
      }
      else if (pat === 2) { fsLight(G, 1.7, -3.9, aimYaw(1.7, -3.9, 6, 0), 'FS-500C', false, 1.0); evoke(G, 7.6, 3.9, aimYaw(7.6, 3.9, 4, 0), true); }
      else { fsLight(G, 1.7, 3.9, aimYaw(1.7, 3.9, 6, 0), 'FS-300B', false, 1.6); fsLight(G, 1.7, -3.9, aimYaw(1.7, -3.9, 6, 0), 'FS-300C', true, 1.6); fs720(G, 8.2, 3.9, aimYaw(8.2, 3.9, 5, 1.8)); var tx3 = 8.2 + 1.9 * Math.sin(aimYaw(8.2, 3.9, 5, 1.8)), tz3 = 3.9 + 1.9 * Math.cos(aimYaw(8.2, 3.9, 5, 1.8)); jewelrySet(G, tx3, tz3); var wp3 = toWorldXZ(side, zc, tx3, tz3); cols.push({ x: wp3.x, z: wp3.z, r: .65 }); }
      if (i === 1) [-1, 1].forEach(function (sz) { achaemenid(G, RD - 1.1, sz * 3.0, RH - .05); var wc = toWorldXZ(side, zc, RD - 1.1, sz * 3.0); cols.push({ x: wc.x, z: wc.z, r: .5 }); });
      flightCase(.9, .55, .6, 8.2, -RD / 2 + 1.0, .2, G); appleBoxes(1.4, -RD / 2 + 1.0, G);
      // collision rect (world)
      var m = .45;
      if (side > 0) rects.push({ x0: HALLW / 2 + m, x1: HALLW / 2 + RD - m, z0: zc - RD / 2 + m, z1: zc + RD / 2 - m });
      else rects.push({ x0: -HALLW / 2 - RD + m, x1: -HALLW / 2 - m, z0: zc - RD / 2 + m, z1: zc + RD / 2 - m });
      rects.push({ x0: -HALLW / 2 + .2, x1: HALLW / 2 - .2, z0: zc - DOORW / 2 + .35, z1: zc + DOORW / 2 - .35, door: true });
      rects.push(side > 0 ? { x0: HALLW / 2 - .6, x1: HALLW / 2 + m + .1, z0: zc - DOORW / 2 + .35, z1: zc + DOORW / 2 - .35 } : { x0: -HALLW / 2 - m - .1, x1: -HALLW / 2 + .6, z0: zc - DOORW / 2 + .35, z1: zc + DOORW / 2 - .35 });
      rooms.push({ i: i, side: side, zc: zc, group: G, p: p });
    });
    function bigSign(text, sub, z, ry) {
      var c = document.createElement('canvas'); c.width = 2048; c.height = 512; var g = c.getContext('2d'), F = FONTS(); g.fillStyle = '#10142a'; g.fillRect(0, 0, 2048, 512);
      g.strokeStyle = '#d9a53a'; g.lineWidth = 8; g.strokeRect(14, 14, 2020, 484); g.strokeStyle = 'rgba(255,236,206,.25)'; g.lineWidth = 2; g.strokeRect(34, 34, 1980, 444);
      g.fillStyle = '#f3eee6'; g.font = '400 220px ' + F.disp; g.textAlign = 'center'; g.textBaseline = 'middle'; g.direction = HB.lang === 'fa' ? 'rtl' : 'ltr'; g.fillText(text, 1024, 210);
      g.fillStyle = '#e9b866'; g.font = '700 46px ' + F.lab; g.fillText(sub, 1024, 400);
      var t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
      var m = new THREE.Mesh(new THREE.PlaneGeometry(4.2, 1.05), new THREE.MeshStandardMaterial({ map: t, emissiveMap: t, emissive: 0xffffff, emissiveIntensity: .7 })); m.position.set(0, 2.3, z); m.rotation.y = ry; world.add(m); return { m: m, t: t, c: c };
    }
    var signs = [];
    function makeBigSigns() { signs.forEach(function (s) { world.remove(s.m); s.t.dispose(); }); signs = [bigSign('HB Studio', HB.L(HB.content.contact.location).toUpperCase(), .06, 0), bigSign(HB.ui('studio.hall'), HB.ui('cta.studio').toUpperCase(), HALLL - .06, Math.PI)]; }
    makeBigSigns();

    /* ── light pool: a fixed handful of real point lights hop between the nearest glowing fixtures, plus one lattice spot ── */
    world.updateMatrixWorld(true);
    sources.forEach(function (s) { s.w.copy(s.l); s.par.localToWorld(s.w); });
    labels.forEach(function (l) { l.s.getWorldPosition(l.p); });
    windowsAnch.forEach(function (a) { if (a.par) { a.pos.copy(a.lpos); a.par.localToWorld(a.pos); a.tgt.copy(a.ltgt); a.par.localToWorld(a.tgt); } });
    var POOL = coarse ? 6 : 8, pool = [];
    for (var pi = 0; pi < POOL; pi++) { var pl = new THREE.PointLight(0xffe2bd, 0, 10, 2); scene.add(pl); pool.push({ l: pl, src: null, k: 0, leaving: false }); }
    var spot = new THREE.SpotLight(0xffddaa, 0, 18, .5, .55, 2); spot.map = latticeLight; scene.add(spot); scene.add(spot.target);
    var spotCur = null, spotK = 0, lblT = 0;
    function lightsUpdate(dt, force) {
      var px = P.x, pz = P.z;
      sources.forEach(function (s) { var dx = s.w.x - px, dz = s.w.z - pz; s.dd = dx * dx + dz * dz + (s.w.y - 1.6) * (s.w.y - 1.6) * .2; });
      var want = sources.slice().sort(function (a, b) { return a.dd - b.dd; }).slice(0, POOL);
      pool.forEach(function (sl) { sl.leaving = !!sl.src && want.indexOf(sl.src) < 0; });
      want.forEach(function (s) { if (pool.some(function (sl) { return sl.src === s && !sl.leaving; })) return; var free = pool.filter(function (sl) { return !sl.src || (sl.leaving && sl.k <= .001); })[0]; if (free) { free.src = s; free.leaving = false; free.k = force ? 1 : 0; } });
      pool.forEach(function (sl) {
        if (!sl.src) { sl.l.intensity = 0; return; }
        sl.k = Math.max(0, Math.min(1, sl.k + (sl.leaving ? -1 : 1) * dt * 3)); if (sl.leaving && sl.k <= 0) { sl.src = null; sl.l.intensity = 0; return; }
        sl.l.position.copy(sl.src.w); sl.l.color.setHex(sl.src.c); sl.l.intensity = sl.src.i * sl.k; sl.l.distance = sl.src.d;
      });
      var best = null, bd = 1e9; windowsAnch.forEach(function (a) { var dx = a.tgt.x - px, dz = a.tgt.z - pz, d = dx * dx + dz * dz; if (d < bd) { bd = d; best = a; } });
      if (best !== spotCur) { spotK -= dt * 3; if (spotK <= 0 || force) { spotCur = best; spotK = 0; if (best) { spot.position.copy(best.pos); spot.target.position.copy(best.tgt); spot.target.updateMatrixWorld(); } } } else spotK = Math.min(1, spotK + dt * 3);
      spot.intensity = (spotCur ? 110 : 0) * spotK;
      lblT += dt; if (lblT > .12 || force) { lblT = 0; labels.forEach(function (l) { var d = Math.hypot(l.p.x - px, l.p.z - pz), t = Math.max(0, Math.min(1, (6 - d) / 3)); l.s.material.opacity += (t * .9 - l.s.material.opacity) * .5; l.s.visible = l.s.material.opacity > .02; }); }
    }

    /* ── player ── */
    var P = { x: 0, z: 2.2, yaw: Math.PI, pitch: 0, vx: 0, vz: 0 }, EYE = 1.62;
    var keys = {}, path = null, locked = false, drag = null, modal = false, curRoom = -1, hint = $('#hud-room');
    function inRect(x, z) { for (var i = 0; i < rects.length; i++) { var r = rects[i]; if (x >= r.x0 && x <= r.x1 && z >= r.z0 && z <= r.z1) return true; } return false; }
    function free(x, z) { if (!inRect(x, z)) return false; for (var c = 0; c < cols.length; c++) if (Math.hypot(x - cols[c].x, z - cols[c].z) < cols[c].r) return false; return true; }
    function tryMove(nx, nz) { if (free(nx, nz)) { P.x = nx; P.z = nz; return; } if (free(nx, P.z)) { P.x = nx; return; } if (free(P.x, nz)) { P.z = nz; } }
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
      update(dt); lightsUpdate(dt, false); camera.position.set(P.x, EYE + (path ? Math.sin(now * .012) * .012 : 0), P.z); camera.rotation.set(P.pitch, P.yaw, 0); renderer.render(scene, camera);
    }
    // wait for fonts so plaques/signs are drawn with the real faces, then show the studio
    var ready = function () { lightsUpdate(1, true); refreshText(); var l = $('#loading'); if (l) l.classList.add('done'); requestAnimationFrame(frameLoop); setNav(-1); };
    if (document.fonts && document.fonts.load) Promise.all([document.fonts.load('40px "Instrument Serif"'), document.fonts.load('700 24px "Syne"'), document.fonts.load('40px "Lalezar"'), document.fonts.load('24px "Vazirmatn"')]).then(ready, ready); else ready();
    canvas.addEventListener('webglcontextlost', function (e) { e.preventDefault(); toList(HB.ui('studio.nogl')); });
    var out = { resize: resize, unlock: unlock, goto: gotoRoom, hall: gotoHall, state: function () { return { x: P.x, z: P.z, yaw: P.yaw, room: curRoom, rooms: rooms.length, frames: frames.length, modal: modal }; }, teleport: function (x, z, yaw, pitch) { P.x = x; P.z = z; P.yaw = yaw; P.pitch = pitch || 0; path = null; }, rooms: rooms, frames: frames, pick: pick, activate: activate, camera: camera, renderer: renderer };
    window.__studio = out; return out;
  }
})();
