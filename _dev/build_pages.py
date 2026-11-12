# Writes the static HTML pages. English text comes straight from content.json so the HTML is a real SEO fallback.
import json, html, os
V3 = '/home/claude/hb-site/v3'
C = json.load(open(V3 + '/content/content.json'))
def e(s): return html.escape(str(s), quote=True)
def en(o):
    return o['en'] if isinstance(o, dict) else o
def get(path):
    o = C
    for p in path.split('.'):
        o = o[int(p)] if isinstance(o, list) else o[p]
    return o
def t(path): return e(en(get(path)))
def ui(k): return e(en(C['ui'][k]))
SITE = 'https://mhashemy19-cmd.github.io/hb-portfolio/'
GSAP = 'https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/gsap.min.js'
FONTS = 'https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Lalezar&family=Syne:wght@400;500;600;700;800&family=Vazirmatn:wght@400;500;700&display=swap'
IMPORTMAP = '<script type="importmap">{"imports":{"three":"https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js","three/addons/":"https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/"}}</script>'

def head(page, title, desc, canon, extra='', ogimg='content/media/portrait-1.jpg', admin=False):
    return f'''<!doctype html>
<html lang="en" dir="ltr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>{e(title)}</title>
<meta name="description" content="{e(desc)}">
<meta name="hb-title" content="{e(title.split(' — ')[0])}">
<meta name="theme-color" content="#060607">
<link rel="canonical" href="{SITE}{canon}">
<meta property="og:type" content="website"><meta property="og:title" content="{e(title)}"><meta property="og:description" content="{e(desc)}"><meta property="og:image" content="{SITE}{ogimg}"><meta property="og:url" content="{SITE}{canon}">
<meta name="twitter:card" content="summary_large_image">
<link rel="icon" href="assets/img/favicon.svg" type="image/svg+xml">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="{FONTS}">
<link rel="stylesheet" href="assets/css/site.css">
{extra}</head>
<body data-page="{page}"{' class="studio-page"' if page=='studio' else ''}>
<div id="site-header"></div>
'''

def tail(scripts='', gsap=True):
    g = f'<script src="{GSAP}"></script>\n' if gsap else ''
    return f'''<div id="site-footer"></div>
{g}<script src="assets/js/site.js"></script>
{scripts}</body>
</html>
'''

def card(p):
    im = p.get('cover') or (p['images'][0] if p['images'] else '')
    thumb = f'<img src="{e(im)}" alt="{e(en(p["title"]))}" loading="lazy">' if im else f'<div class="ph" aria-hidden="true"><b>{e(en(p["title"])[0])}</b><small>{ui("label.preview")}</small></div>'
    cat = next((en(c['label']) for c in C['work']['categories'] if c['id'] == p['category']), p['category'])
    return f'<a class="card" href="project.html?id={e(p["id"])}" data-cat="{e(p["category"])}"><div class="thumb">{thumb}</div><div class="info"><div class="meta"><span>{e(cat)}</span><span>{e(p["year"])}</span></div><h3>{e(en(p["title"]))}</h3><p>{e(en(p["summary"]))}</p><span class="more">{ui("cta.view")}</span></div></a>'

def page_head(key, extra=''):
    nk = 'contact' if key == 'contactPage' else key
    return f'''<section class="page-head" data-intro><div class="wrap"><span class="eyebrow" data-ui="nav.{nk}">{ui("nav."+nk)}</span><h1 class="display" style="margin-top:16px" data-t="{key}.title">{t(key+".title")}</h1><p class="lead" data-t="{key}.sub">{t(key+".sub")}</p>{extra}</div></section>'''

pages = {}

# ───────── home ─────────
H = C['home']
stats = ''.join(f'<div class="stat"><b>{e(s["value"])}</b><span>{e(en(s["label"]))}</span></div>' for s in H['stats'])
feat = ''.join(card(next(p for p in C['projects'] if p['id'] == i)) for i in H['featured']['ids'])
tease = ''.join(f'<div class="tile"><div class="n">0{i+1}</div><h3>{e(en(x["title"]))}</h3><p>{e(en(x["text"]))}</p></div>' for i, x in enumerate(H['services']['items']))
pages['index.html'] = head('home', 'Mohammad Hashemi — Film, jewelry and motion', en(C['site']['description']), '', ogimg='content/media/portrait-1.jpg') + f'''<main id="main">
<section class="hero" data-intro>
 <div class="wrap hero-grid">
  <div class="hero-copy">
   <span class="eyebrow" data-t="home.hero.kicker">{t("home.hero.kicker")}</span>
   <h1 class="display" data-t="home.hero.title">{t("home.hero.title")}</h1>
   <p class="lead" data-t="home.hero.sub">{t("home.hero.sub")}</p>
   <div class="row"><a class="btn" href="work.html"><span data-t="home.hero.cta1">{t("home.hero.cta1")}</span> <svg class="arr" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2 8h12M9 3l5 5-5 5"/></svg></a><a class="btn ghost" href="studio.html" data-t="home.hero.cta2">{t("home.hero.cta2")}</a></div>
   <div class="hero-stats" id="hero-stats">{stats}</div>
  </div>
  <div class="stage" id="stage3d" role="img" aria-label="Cinema camera on a studio floor"><div class="fallback"><img data-img="home.hero.image" src="{e(H["hero"]["image"])}" alt="Portrait of Mohammad Hashemi"></div><div class="stage-cap" aria-hidden="true"><span>HB Studio</span><span>Mashhad</span></div></div>
 </div>
</section>
<section class="section tight"><div class="wrap"><div class="sec-head rv"><span class="eyebrow" data-ui="nav.work">{ui("nav.work")}</span><h2 class="display" data-t="home.reel.title">{t("home.reel.title")}</h2></div>
 <div class="reel" id="reel"><img src="{e(H["reel"]["poster"])}" alt="" loading="lazy"><div class="reel-meta"><p>{t("home.reel.sub")}</p><span class="badge soon"><i></i>{ui("status.soon")}</span></div></div></div></section>
<section class="section"><div class="wrap"><div class="sec-head rv"><span class="eyebrow">01</span><h2 class="display" data-t="home.featured.title">{t("home.featured.title")}</h2><p class="lead" data-t="home.featured.sub">{t("home.featured.sub")}</p></div>
 <div class="grid" id="featured">{feat}</div>
 <div class="row" style="margin-top:36px"><a class="btn ghost" href="work.html" data-ui="cta.all">{ui("cta.all")}</a><a class="btn ghost" href="studio.html" data-ui="cta.studio">{ui("cta.studio")}</a></div></div></section>
<section class="section tight"><div class="wrap"><div class="sec-head rv"><span class="eyebrow">02</span><h2 class="display" data-t="home.services.title">{t("home.services.title")}</h2><p class="lead" data-t="home.services.sub">{t("home.services.sub")}</p></div>
 <div class="trio" id="teaser">{tease}</div><div class="row" style="margin-top:32px"><a class="btn ghost" href="services.html" data-ui="cta.services">{ui("cta.services")}</a></div></div></section>
<section class="section"><div class="wrap"><div class="cta-band rv"><h2 class="display" data-t="home.cta.title">{t("home.cta.title")}</h2><p class="lead" data-t="home.cta.sub">{t("home.cta.sub")}</p><div class="row" style="justify-content:center"><button type="button" class="btn" data-open-panel data-ui="cta.talk">{ui("cta.talk")}</button><a class="btn ghost" href="contact.html#quote" data-ui="cta.quote">{ui("cta.quote")}</a></div></div></div></section>
</main>
''' + tail(IMPORTMAP + '\n<script src="assets/js/home3d.js"></script>\n')

# ───────── work ─────────
grid = ''.join(card(p) for p in C['projects'])
pages['work.html'] = head('work', 'Work — Mohammad Hashemi', 'Filterable portfolio of commercial films, jewelry content, real estate, podcasts, motion graphics and AI films by Mohammad Hashemi and HB Studio.', 'work.html') + f'''<main id="main">
{page_head("work")}
<section class="section tight"><div class="wrap"><div class="filters" id="filters" role="group" aria-label="Filter"></div><div class="grid" id="grid">{grid}</div></div></section>
<section class="section tight"><div class="wrap"><div class="row"><a class="btn" href="studio.html" data-ui="cta.studio">{ui("cta.studio")}</a><a class="btn ghost" href="contact.html#quote" data-ui="cta.quote">{ui("cta.quote")}</a></div></div></section>
</main>
''' + tail()

# ───────── project ─────────
pages['project.html'] = head('project', 'Project — Mohammad Hashemi', 'A project by Mohammad Hashemi and HB Studio: gallery, film, credits and description.', 'project.html') + '''<main id="main"><div id="project"><div class="wrap page-head"><h1 class="display">Project</h1><p class="lead">Loading the project…</p><p><a class="btn ghost" href="work.html">All projects</a></p></div></div></main>
''' + tail()

# ───────── studio ─────────
rooms_static = ''.join(card(p) for p in C['projects'])
pages['studio.html'] = head('studio', 'Walk the studio — Mohammad Hashemi', en(C['studio']['sub']), 'studio.html', ogimg='content/media/onset.jpg') + f'''<main id="main">
<div class="studio-shell" id="studio-shell" aria-label="Interactive 3D studio walk">
 <div class="studio-hud">
  <div class="hud-top"><div class="hud-room" id="hud-room" aria-live="polite"></div><div class="hud-btns"><button type="button" class="btn sm ghost" id="btn-unlock" hidden data-ui="studio.exit">{ui("studio.exit")}</button><button type="button" class="btn sm" data-view-list data-ui="cta.listview">{ui("cta.listview")}</button></div></div>
  <div class="cross" id="cross" aria-hidden="true"></div>
  <div class="hud-bottom"><div class="hud-help" id="hud-help">{ui("studio.helpDesk")}</div><div class="room-nav" id="room-nav" role="group" aria-label="Rooms"></div></div>
 </div>
 <div class="enter" id="enter"><div class="enter-card"><span class="eyebrow" data-ui="nav.studio">{ui("nav.studio")}</span><h1 class="display" data-t="studio.title">{t("studio.title")}</h1><p class="lead" data-t="studio.sub">{t("studio.sub")}</p><div class="row" style="justify-content:center"><button type="button" class="btn" id="btn-enter">{ui("studio.enter")}</button><button type="button" class="btn ghost" data-view-list data-ui="cta.listview">{ui("cta.listview")}</button></div></div></div>
 <div class="loading" id="loading" data-ui="studio.loading">{ui("studio.loading")}</div>
</div>
<div class="list-view"><section class="page-head"><div class="wrap"><span class="eyebrow" data-ui="nav.studio">{ui("nav.studio")}</span><h2 class="display" style="margin-top:16px" data-t="studio.title">{t("studio.title")}</h2><p class="lead" data-t="studio.sub">{t("studio.sub")}</p><div class="row" style="margin-top:24px"><button type="button" class="btn" data-view-walk data-ui="cta.walkview">{ui("cta.walkview")}</button></div></div></section>
<section class="section tight"><div class="wrap"><p class="glcheck-note" id="gl-note" hidden></p><div id="studio-list"><div class="grid">{rooms_static}</div></div></div></section></div>
</main>
''' + tail(IMPORTMAP + '\n<script src="assets/js/studio.js"></script>\n')

# ───────── tools ─────────
tools_static = ''.join(f'<article class="tool" id="{e(x["id"])}"><div class="tool-vis"></div><div class="tool-body"><span class="badge"><i></i>{ui("status."+x["status"])}</span><span class="kind">{e(en(x["kind"]))}</span><h3>{e(en(x["name"]))}</h3><p>{e(en(x["description"]))}</p></div></article>' for x in C['tools']['items'])
pages['tools.html'] = head('tools', 'Tools — Mohammad Hashemi', 'Plugins and software built by Mohammad Hashemi: HB Glass for After Effects, a sound panel, a file browser, a chat-directed editing panel and an auto-subtitle tool.', 'tools.html') + f'''<main id="main">
{page_head("tools")}
<section class="section tight"><div class="wrap"><div class="tools" id="tools">{tools_static}</div></div></section>
<section class="section tight"><div class="wrap"><div class="cta-band rv"><h2 class="display" data-t="home.cta.title">{t("home.cta.title")}</h2><p class="lead" data-t="home.cta.sub">{t("home.cta.sub")}</p><div class="row" style="justify-content:center"><button type="button" class="btn" data-open-panel data-ui="cta.talk">{ui("cta.talk")}</button></div></div></div></section>
</main>
''' + tail()

# ───────── about ─────────
A = C['about']
bio = ''.join(f'<p>{e(en(b))}</p>' for b in A['bio'])
specs = ''.join(f'<span class="tag">{e(en(s))}</span>' for s in A['specialities'])
tl = ''.join(f'<div class="tl-item in"><div class="tl-year" data-editable="about.timeline.{i}.year">{e(x["year"])}</div><div class="tl-card"><h3 data-editable="about.timeline.{i}.title">{e(en(x["title"]))}</h3><p data-editable="about.timeline.{i}.text">{e(en(x["text"]))}</p></div></div>' for i, x in enumerate(A['timeline']))
sw_static = ''.join(f'<span class="tag">{e(s["name"])}</span>' for s in A['software'])
pages['about.html'] = head('about', 'About — Mohammad Hashemi', 'Mohammad Hashemi: twelve years in content production, founder of HB Studio, a seven-person team. Based in Mashhad, after years in Tehran.', 'about.html', ogimg='content/media/portrait-2.jpg') + f'''<main id="main">
{page_head("about")}
<section class="section tight"><div class="wrap about-grid">
 <figure class="portrait rv"><img data-img="about.portrait" data-alt="about.portraitAlt" src="{e(A["portrait"])}" alt="{e(en(A["portraitAlt"]))}" width="1013" height="1800"></figure>
 <div class="bio rv"><h2 class="display" style="margin-bottom:24px" data-t="about.heading">{t("about.heading")}</h2><div id="bio">{bio}</div><div class="tags" id="specs">{specs}</div>
  <div class="row" style="margin-top:32px"><a class="btn" href="work.html" data-ui="cta.work">{ui("cta.work")}</a><a class="btn ghost" href="contact.html" data-ui="nav.contact">{ui("nav.contact")}</a></div></div>
</div></section>
<section class="section"><div class="wrap"><div class="sec-head rv" style="align-items:center;text-align:center;margin-inline:auto"><span class="eyebrow" data-t="about.timelineNote">{t("about.timelineNote")}</span><h2 class="display" data-t="about.timelineTitle">{t("about.timelineTitle")}</h2></div>
 <div class="timeline" id="timeline">{tl}</div></div></section>
<section class="section"><div class="wrap"><div class="sec-head rv"><span class="eyebrow" data-ui="about.toolsHint">{ui("about.toolsHint")}</span><h2 class="display" data-t="about.toolsTitle">{t("about.toolsTitle")}</h2><p class="lead" data-t="about.toolsSub">{t("about.toolsSub")}</p></div>
 <div class="float-wrap" id="float" role="group" aria-label="{e(en(A["toolsTitle"]))}"><div class="tags" style="padding:24px">{sw_static}</div></div></div></section>
</main>
''' + tail()

# ───────── contact ─────────
Ct = C['contact']
pages['contact.html'] = head('contact', 'Contact — Mohammad Hashemi', 'Contact Mohammad Hashemi on WhatsApp, Telegram, email or Instagram, or send a quote request. Based in Mashhad, Iran, working worldwide.', 'contact.html', ogimg='content/media/portrait-3.jpg') + f'''<main id="main">
{page_head("contactPage")}
<section class="section tight"><div class="wrap contact-grid">
 <figure class="big-img rv"><img data-img="contactPage.image" data-alt="contactPage.imageAlt" src="{e(C["contactPage"]["image"])}" alt="{e(en(C["contactPage"]["imageAlt"]))}" width="1013" height="1800"><figcaption data-t="contact.location">{t("contact.location")}</figcaption></figure>
 <div class="rv"><div id="methods"><ul><li>{e(Ct["email"])}</li><li>{e(Ct["phone"])}</li><li>{e(Ct["instagramHandle"])}</li></ul></div><p class="based"><i></i><span data-t="contact.location">{t("contact.location")}</span></p>
 <div id="quote" style="scroll-margin-top:90px;margin-top:24px"><div id="quote-host"></div></div></div>
</div></section>
</main>
''' + tail()
# ───────── services ─────────
Sx = C['services']
tiers = ''.join(f'<article class="tier{" feat" if x.get("featured") else ""}" id="tier-{x["id"]}"><span class="n">{x["n"]}</span><h3>{e(en(x["name"]))}</h3><p class="tag">{e(en(x["tag"]))}</p>' + (f'<div class="lead-in">{e(en(x["lead"]))}</div>' if en(x['lead']) else '') + '<ul>' + ''.join(f'<li>{e(en(i))}</li>' for i in x['items']) + '</ul></article>' for x in Sx['tiers'])
pages['services.html'] = head('services', 'Services — Mohammad Hashemi', 'Three ways to work with Mohammad Hashemi and HB Studio: Essential, Signature and Prestige packages for film, motion, AI film and content programmes.', 'services.html') + f'''<main id="main">
{page_head("services")}
<section class="section tight"><div class="wrap"><div class="tiers" id="tiers">{tiers}</div></div></section>
<section class="section"><div class="wrap"><div id="quote" style="scroll-margin-top:90px;max-width:860px;margin-inline:auto"><div id="quote-host"></div></div></div></section>
</main>
''' + tail()

for name, body in pages.items():
    open(f'{V3}/{name}', 'w').write(body)
print('pages:', ', '.join(pages))
