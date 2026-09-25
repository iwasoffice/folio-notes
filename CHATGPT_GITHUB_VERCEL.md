# Paste this into ChatGPT

Use this prompt exactly.

---

You are helping me deploy Folio Notes.

GitHub repo (already created, currently empty or incomplete):
https://github.com/iwasoffice/folio-notes

Vercel account is already connected to this GitHub user: iwasoffice

Live preview already exists from an earlier direct upload:
https://folio-notes-nine.vercel.app

## Goal
1. Upload every file from the attached zip into the GitHub repo root (not inside a nested extra folder).
2. Connect the Vercel project named `folio-notes` to `iwasoffice/folio-notes`.
3. Deploy production from the `main` branch.
4. Tell me the final live URL.

## Repo files that must be at the root
- index.html
- manifest.json
- sw.js
- package.json
- vercel.json
- README.md
- css/styles.css
- js/app.js
- js/storage.js
- icons/icon.svg
- icons/icon-192.png
- icons/icon-512.png
- icons/apple-touch-icon.png

## Vercel settings
- Framework preset: Other
- Root directory: ./
- Build command: none
- Output directory: ./
- Production branch: main

## After deploy
Give me:
- GitHub repo URL
- Vercel project name
- Production URL
- How to install on Android Chrome and iPhone Safari

Do not rename the repo. Do not wrap the files in another folio-notes folder.
---
