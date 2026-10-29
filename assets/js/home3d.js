/* HB Studio v3 — home3d.js
   Photoreal-leaning cinema camera on a clean dark seamless backdrop.
   PBR materials, RoomEnvironment studio IBL, one warm key + cool rim, soft VSM shadow and a baked contact shadow.
   No bokeh, no particles, no noise. Loaded with dynamic import() so a blocked CDN degrades to the static fallback. */
(function () {
  'use strict';
  var stage = document.getElementById('stage3d');
  if (!stage) return;
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var fail = function (e) { stage.classList.add('nogl'); if (e) console.warn('[hb] 3D hero unavailable:', e.message || e); };

  Promise.all([
    import('three'),
    import('three/addons/environments/RoomEnvironment.js'),
    import('three/addons/geometries/RoundedBoxGeometry.js')
  ]).then(function (m) { try { start(m[0], m[1].RoomEnvironment, m[2].RoundedBoxGeometry); } catch (e) { fail(e); } }).catch(fail);

  function start(THREE, RoomEnvironment, RoundedBoxGeometry) {
    var canvas = document.createElement('canvas');
    stage.insertBefore(canvas, stage.firstChild);
    var renderer;
    try { renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true, alpha: true, powerPreference: 'high-performance' }); }
    catch (e) { canvas.remove(); return fail(e); }
    var coarse = window.matchMedia('(pointer:coarse)').matches;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, coarse ? 1.5 : 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.25;
    renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.VSMShadowMap;
    renderer.setClearColor(0x000000, 0);

    var scene = new THREE.Scene();
    var pmrem = new THREE.PMREMGenerator(renderer);
    var envTex = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environment = envTex; scene.environmentIntensity = 1.0;

    var cam = new THREE.PerspectiveCamera(30, 1, 0.1, 100);
    cam.position.set(6.6, 2.7, 8.4); cam.lookAt(0, 0.1, 1.2);

    /* ── textures made in code ── */
    function canvasTex(w, h, draw, srgb) {
      var c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h);
      var t = new THREE.CanvasTexture(c); if (srgb) t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t;
    }
    var radial = canvasTex(256, 256, function (g, w, h) {
      var r = g.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
      r.addColorStop(0, '#fff'); r.addColorStop(.55, '#aaa'); r.addColorStop(1, '#000'); g.fillStyle = r; g.fillRect(0, 0, w, h);
    });
    var contact = canvasTex(256, 256, function (g, w, h) {
      var r = g.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
      r.addColorStop(0, 'rgba(0,0,0,.95)'); r.addColorStop(.35, 'rgba(0,0,0,.55)'); r.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = r; g.fillRect(0, 0, w, h);
    }, true);
    var knurl = canvasTex(512, 64, function (g, w, h) {
      g.fillStyle = '#777'; g.fillRect(0, 0, w, h);
      for (var x = 0; x < w; x += 8) { var gr = g.createLinearGradient(x, 0, x + 8, 0); gr.addColorStop(0, '#000'); gr.addColorStop(.5, '#fff'); gr.addColorStop(1, '#000'); g.fillStyle = gr; g.fillRect(x, 0, 8, h); }
    });
    knurl.wrapS = knurl.wrapT = THREE.RepeatWrapping; knurl.repeat.set(1, 1);
    var brushed = canvasTex(256, 256, function (g, w, h) {
      g.fillStyle = '#808080'; g.fillRect(0, 0, w, h);
      for (var i = 0; i < 900; i++) { var y = Math.random() * h, v = 100 + Math.random() * 60 | 0; g.fillStyle = 'rgba(' + v + ',' + v + ',' + v + ',.35)'; g.fillRect(0, y, w, 1); }
    });
    brushed.wrapS = brushed.wrapT = THREE.RepeatWrapping;
    var lcd = canvasTex(512, 320, function (g, w, h) {
      var bg = g.createLinearGradient(0, 0, 0, h); bg.addColorStop(0, '#16222c'); bg.addColorStop(1, '#0a1016'); g.fillStyle = bg; g.fillRect(0, 0, w, h);
      g.strokeStyle = 'rgba(255,255,255,.25)'; g.lineWidth = 2; g.strokeRect(34, 34, w - 68, h - 68);
      g.strokeStyle = 'rgba(255,255,255,.12)'; g.beginPath(); g.moveTo(w / 2, 34); g.lineTo(w / 2, h - 34); g.moveTo(34, h / 2); g.lineTo(w - 34, h / 2); g.stroke();
      g.fillStyle = '#ff3b30'; g.beginPath(); g.arc(64, 62, 9, 0, 7); g.fill();
      g.fillStyle = '#fff'; g.font = '600 26px monospace'; g.fillText('REC', 84, 72); g.fillText('00:00:12:08', w - 210, 72);
      g.font = '500 20px monospace'; g.fillStyle = 'rgba(255,255,255,.8)'; g.fillText('4K  24p   ISO 800   T2.8', 56, h - 52);
      g.strokeStyle = '#e9a653'; g.lineWidth = 3; g.beginPath(); for (var x = 0; x < 180; x++) { var y = h - 110 - (Math.sin(x * .09) * 16 + Math.sin(x * .31) * 6); x ? g.lineTo(w - 230 + x, y) : g.moveTo(w - 230, y); } g.stroke();
    }, true);

    /* ── materials (PBR) ── */
    var M = {
      body: new THREE.MeshStandardMaterial({ color: 0x1c1d21, metalness: .82, roughness: .44, roughnessMap: brushed, envMapIntensity: 1 }),
      plate: new THREE.MeshStandardMaterial({ color: 0x2c2e34, metalness: .9, roughness: .3, roughnessMap: brushed }),
      rubber: new THREE.MeshStandardMaterial({ color: 0x0b0b0c, metalness: .05, roughness: .78 }),
      lensBody: new THREE.MeshStandardMaterial({ color: 0x131316, metalness: .55, roughness: .42, roughnessMap: brushed }),
      knurl: new THREE.MeshStandardMaterial({ color: 0x17171a, metalness: .6, roughness: .5, bumpMap: knurl, bumpScale: 1.4 }),
      chrome: new THREE.MeshStandardMaterial({ color: 0xcfd3d8, metalness: 1, roughness: .2 }),
      brass: new THREE.MeshStandardMaterial({ color: 0xc89a4d, metalness: 1, roughness: .32 }),
      glass: new THREE.MeshPhysicalMaterial({ color: 0x03070a, metalness: 0, roughness: .03, clearcoat: 1, clearcoatRoughness: .02, reflectivity: .9, envMapIntensity: 1.6 }),
      coatTeal: new THREE.MeshStandardMaterial({ color: 0x0a2a30, emissive: 0x0c6670, emissiveIntensity: .22, metalness: .2, roughness: .08 }),
      coatAmber: new THREE.MeshStandardMaterial({ color: 0x2a1706, emissive: 0x8a4e12, emissiveIntensity: .25, metalness: .2, roughness: .08 }),
      matte: new THREE.MeshStandardMaterial({ color: 0x08080a, metalness: .1, roughness: .9 }),
      screen: new THREE.MeshStandardMaterial({ color: 0x000000, emissive: 0xffffff, emissiveMap: lcd, emissiveIntensity: .9, roughness: .15, metalness: 0 }),
      floor: new THREE.MeshStandardMaterial({ color: 0x0d0d10, metalness: .25, roughness: .38, envMapIntensity: .35, transparent: true, alphaMap: radial })
    };

    var rig = new THREE.Group(); scene.add(rig);
    var cine = new THREE.Group(); rig.add(cine);
    function add(geo, mat, x, y, z, parent) { var m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.castShadow = true; m.receiveShadow = true; (parent || cine).add(m); return m; }
    function cylZ(r, len, mat, x, y, z, seg) { var m = add(new THREE.CylinderGeometry(r, r, len, seg || 64), mat, x, y, z); m.rotation.x = Math.PI / 2; return m; }

    // body, plates, vents
    add(new RoundedBoxGeometry(1.6, 1.25, 2.1, 5, .1), M.body, 0, 0, 0);
    add(new RoundedBoxGeometry(1.36, .06, 1.7, 3, .02), M.plate, 0, .64, -.05);
    for (var i = 0; i < 9; i++) add(new THREE.BoxGeometry(.02, .5, .07), M.matte, -.81, .02, -.7 + i * .17);
    add(new RoundedBoxGeometry(.04, .5, .5, 2, .01), M.plate, .81, .15, .3);       // side plate
    // lens mount + lens (lathe profile for a believable silhouette)
    cylZ(.66, .22, M.chrome, 0, 0, 1.14); cylZ(.58, .3, M.brass, 0, 0, 1.2);
    var prof = [[.0, 1.3], [.52, 1.3], [.54, 1.45], [.54, 1.6], [.5, 1.62], [.5, 2.0], [.54, 2.02], [.54, 2.6], [.5, 2.62], [.5, 2.8], [.56, 2.84], [.64, 2.9], [.66, 3.3], [.62, 3.34], [.56, 3.34], [.54, 3.2], [.0, 3.2]];
    var lathe = new THREE.LatheGeometry(prof.map(function (p) { return new THREE.Vector2(p[0], p[1]); }), 96);
    var barrel = new THREE.Mesh(lathe, M.lensBody); barrel.rotation.x = Math.PI / 2; barrel.rotation.z = 0;
    // lathe axis is Y (z coord stored as y) -> rotate so +Y becomes +Z
    barrel.castShadow = true; barrel.receiveShadow = true; cine.add(barrel);
    // knurled focus + iris rings
    var fr = add(new THREE.CylinderGeometry(.575, .575, .5, 128, 1, true), M.knurl, 0, 0, 1.85); fr.rotation.x = Math.PI / 2; fr.material.bumpMap.repeat.set(1, 1);
    var ir = add(new THREE.CylinderGeometry(.575, .575, .4, 128, 1, true), M.knurl, 0, 0, 2.4); ir.rotation.x = Math.PI / 2;
    // white-ish distance witness stripes on focus ring
    for (var k = 0; k < 18; k++) { var a = -.9 + k * .1, tk = add(new THREE.BoxGeometry(.012, .012, .12), M.chrome, Math.sin(a) * .58, Math.cos(a) * .58, 2.05); tk.rotation.z = -a; tk.position.y = Math.cos(a) * .58 + 0; tk.position.z = 2.62; }
    // front glass + coatings
    var fg = add(new THREE.CircleGeometry(.48, 64), M.glass, 0, 0, 3.215);
    [[.4, M.coatTeal, 3.222], [.28, M.coatAmber, 3.226], [.14, M.glass, 3.23]].forEach(function (c) { add(new THREE.RingGeometry(c[0] - .06, c[0], 64), c[1], 0, 0, c[2]); });
    add(new THREE.TorusGeometry(.5, .018, 12, 96), M.chrome, 0, 0, 3.2);
    // matte box: four plates + bellows lip
    var mb = new THREE.Group(); mb.position.z = 3.35; cine.add(mb);
    [[0, .72, 1.5, .05, .9], [0, -.72, 1.5, .05, .9], [.76, 0, .05, 1.4, .9], [-.76, 0, .05, 1.4, .9]].forEach(function (p) { add(new RoundedBoxGeometry(p[2], p[3], p[4], 2, .015), M.matte, p[0], p[1], .55, mb); });
    add(new RoundedBoxGeometry(1.7, 1.6, .12, 2, .03), M.rubber, 0, 0, .02, mb).geometry.translate(0, 0, 0);
    var flag = add(new RoundedBoxGeometry(1.55, .02, .6, 2, .008), M.matte, 0, .86, 1.05, mb); flag.rotation.x = -.06;
    // top handle
    [[-.45], [.45]].forEach(function (p) { add(new THREE.CylinderGeometry(.05, .05, .5, 20), M.rubber, p[0], .88, -.05); });
    var bar = add(new THREE.CylinderGeometry(.06, .06, 1.1, 24), M.rubber, 0, 1.12, -.05); bar.rotation.z = Math.PI / 2;
    // side monitor on arm
    add(new THREE.CylinderGeometry(.03, .03, .9, 16), M.chrome, -.95, .45, .1);
    var mon = new THREE.Group(); mon.position.set(-1.2, .85, .1); mon.rotation.y = -.35; cine.add(mon);
    add(new RoundedBoxGeometry(1.5, .95, .08, 3, .03), M.body, 0, 0, 0, mon);
    var scr = new THREE.Mesh(new THREE.PlaneGeometry(1.36, .82), M.screen); scr.position.z = .045; mon.add(scr);
    // rear: V-mount plate + battery
    cylZ(.46, .2, M.brass, 0, 0, -1.15); add(new RoundedBoxGeometry(.9, .95, .6, 4, .06), M.body, 0, -.02, -1.55);
    add(new THREE.BoxGeometry(.5, .06, .02), M.chrome, 0, .2, -1.86);
    // baseplate + rails + riser
    add(new RoundedBoxGeometry(1.4, .16, 1.9, 3, .04), M.plate, 0, -.72, .1);
    [[-.38], [.38]].forEach(function (p) { cylZ(.045, 3.2, M.chrome, p[0], -.9, 1.1, 24); });
    add(new THREE.CylinderGeometry(.32, .4, .55, 48), M.body, 0, -1.1, .1);
    cine.position.set(0, .35, -.4); cine.scale.setScalar(.82);
    // dolly disc the camera stands on
    var disc = new THREE.Mesh(new THREE.CylinderGeometry(1.15, 1.2, .1, 96), M.plate); disc.position.y = -1.5; disc.castShadow = true; disc.receiveShadow = true; rig.add(disc);
    rig.position.y = 0; var FLOOR = -1.55;

    // floor (fading seamlessly into the backdrop), baked contact shadow, soft cast shadow catcher
    var floor = new THREE.Mesh(new THREE.CircleGeometry(16, 96), M.floor); floor.rotation.x = -Math.PI / 2; floor.position.y = FLOOR; floor.receiveShadow = true; scene.add(floor);
    var blob = new THREE.Mesh(new THREE.PlaneGeometry(5.2, 5.2), new THREE.MeshBasicMaterial({ map: contact, transparent: true, depthWrite: false, opacity: .85 }));
    blob.rotation.x = -Math.PI / 2; blob.position.y = FLOOR + .006; scene.add(blob);
    var catcher = new THREE.Mesh(new THREE.PlaneGeometry(26, 26), new THREE.ShadowMaterial({ opacity: .55 }));
    catcher.rotation.x = -Math.PI / 2; catcher.position.y = FLOOR + .012; catcher.receiveShadow = true; scene.add(catcher);

    // lights: one warm key, cool rim, tiny fill — studio, not party
    var key = new THREE.SpotLight(0xffd6a0, 4200, 40, .5, 1, 2); key.position.set(-7, 9, 6.5); key.target.position.set(0, -.2, 1); key.castShadow = true;
    key.shadow.mapSize.set(1024, 1024); key.shadow.radius = 9; key.shadow.blurSamples = 14; key.shadow.bias = -.0004; key.shadow.camera.near = 4; key.shadow.camera.far = 30;
    scene.add(key, key.target);
    var rim = new THREE.SpotLight(0xb7cdff, 2400, 40, .6, 1, 2); rim.position.set(7, 4.5, -7); rim.target.position.set(0, .2, .6); scene.add(rim, rim.target);
    var fill = new THREE.DirectionalLight(0xfff1de, 1.4); fill.position.set(5, 2.5, 8); scene.add(fill);

    /* ── sizing, input, loop ── */
    function size() {
      var w = stage.clientWidth || 600, h = stage.clientHeight || 600;
      renderer.setSize(w, h, false); cam.aspect = w / h;
      cam.fov = w / h < .9 ? 38 : 30; cam.updateProjectionMatrix();
    }
    size(); new ResizeObserver(function () { size(); if (reduce) draw(0); }).observe(stage);
    var mx = 0, my = 0, tmx = 0, tmy = 0, running = true, vis = true, t0 = performance.now();
    stage.addEventListener('pointermove', function (e) { var r = stage.getBoundingClientRect(); tmx = (e.clientX - r.left) / r.width * 2 - 1; tmy = (e.clientY - r.top) / r.height * 2 - 1; });
    stage.addEventListener('pointerleave', function () { tmx = tmy = 0; });
    function draw(t) {
      mx += (tmx - mx) * .05; my += (tmy - my) * .05;
      rig.rotation.y = -.15 + Math.sin(t * .22) * .28 + mx * .32;
      cam.position.y = 2.9 - my * .7; cam.lookAt(0, .05, 1.0);
      cine.rotation.x = Math.sin(t * .31) * .004 + my * .02;
      renderer.render(scene, cam);
    }
    function loop(now) { if (!running) return; requestAnimationFrame(loop); if (!vis) return; draw((now - t0) / 1000); }
    if (reduce) { draw(0); stage.classList.add('ready'); }
    else { requestAnimationFrame(loop); stage.classList.add('ready'); }
    new IntersectionObserver(function (es) { vis = es[0].isIntersecting; }).observe(stage);
    document.addEventListener('visibilitychange', function () { vis = !document.hidden; });
    canvas.addEventListener('webglcontextlost', function (e) { e.preventDefault(); running = false; stage.classList.add('nogl'); });
    window.__hb3d = { renderer: renderer, scene: scene };
  }
})();
