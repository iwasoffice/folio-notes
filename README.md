# Folio Notes

Folio Notes is a private, offline-first notes app for web and Android. It is designed for fast personal note-taking without requiring an account or cloud connection.

## Features

- Light, dark, and system themes
- Offline local note storage
- Automatic saving with save status
- Pin and archive notes
- Trash, restore, and 30-day trash cleanup
- Folder organization and search
- Note colors and sorting
- JSON backup export and import
- Optional local PIN screen lock
- Progressive Web App support
- Android application package

## Run locally

Serve the repository as a static site:

```bash
python3 -m http.server 4173
```

Then open `http://localhost:4173`.

## Android

Android source is in `android-app/`.

Package ID:

```
com.folio.notes
```

Installable test APKs are published from the repository's Releases page. Production store builds should use a release signing key and Android App Bundle (AAB).

## Privacy

Notes are stored locally on the device. Folio Notes does not require an account.

The optional PIN is a local screen lock. It is not a substitute for encrypted device storage.
