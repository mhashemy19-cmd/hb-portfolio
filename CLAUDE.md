# HB Portfolio — Mohammad Hashemi

Static multi-page site (no build framework), hosted on GitHub Pages:
https://mhashemy19-cmd.github.io/hb-portfolio/ (branch `main`, root).

## Structure
- Pages: index, work, project (?id=…), studio (3D walk), tools, about, contact, services, 404
- assets/css/site.css — all styles (dark cinematic tokens on :root)
- assets/js/site.js — shared runtime: EN/FA i18n + RTL, header/footer/FAB injection, contact panel, quote form (WhatsApp/Telegram), lightbox, page renderers from content.json
- assets/js/home3d.js — 3D cinema camera hero (three@0.160.0 via importmap from jsdelivr)
- assets/js/studio.js — first-person studio walk; one room per project
- content/content.json — ALL editable content (text EN/FA, projects, tools, timeline, contact)
- content/admin.json — SHA-256 hashes of admin username/password (first gate only)
- content/media/ — images
- admin/index.html — content editor; saves via GitHub REST API with a fine-grained token (Contents: read & write on this repo)
- _dev/make_content.py, _dev/build_pages.py — generators used to create content.json and the HTML pages (paths inside may point to /home/claude/hb-site/v3 — adjust to repo root)

## Run locally
Must be served over HTTP (fetch of content.json fails on file://):
    python3 -m http.server 8000   → http://localhost:8000/

## Contact (real)
Email Mhashemy54@yahoo.com · Phone/WhatsApp/Telegram +989211359942 · Instagram @hashemibros · Mashhad, Iran

## Known gaps / next steps
- 5 projects have no images (Zargar, PICTO, Gold, Residential, Podcast); showreel video missing
- Timeline years approximate
- 3D hero/studio not tuned on real GPU; check performance on mobile
- Admin login hash is public; real protection is the GitHub token
- Keep: EN default + FA RTL, prefers-reduced-motion, no horizontal overflow at 390px
