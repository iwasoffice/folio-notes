# Deploy Folio Notes from GitHub to Vercel

## 1. Put the source on GitHub

Repo: https://github.com/iwasoffice/folio-notes

Upload every file from this zip into the **root** of that repo:

```
index.html
manifest.json
sw.js
package.json
vercel.json
README.md
css/styles.css
js/app.js
js/storage.js
icons/icon.svg
icons/icon-192.png
icons/icon-512.png
icons/apple-touch-icon.png
```

Do not nest them in another `folio-notes` folder.

## 2. Connect Vercel

1. Open https://vercel.com
2. Import `iwasoffice/folio-notes`
3. If a project named `folio-notes` already exists, use that project and link the Git repo
4. Settings:
   - Framework: Other
   - Root Directory: `./`
   - Build Command: leave empty
   - Output Directory: `./`
   - Production Branch: `main`
5. Deploy

## 3. Expected result

Vercel publishes a URL such as:

- https://folio-notes-nine.vercel.app
- or https://folio-notes.vercel.app if that name is free

Every later push to `main` updates the live app.

## 4. Give this to ChatGPT

Use the prompt in `CHATGPT_GITHUB_VERCEL.md` plus this zip.
