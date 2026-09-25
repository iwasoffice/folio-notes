# Folio Notes

Folio Notes is a private, offline-first notes app for web/PWA and Android.

## Core features

- Light, dark, and system themes
- Offline local note storage
- Autosave with save status
- Pin, archive, Trash, restore, and 30-day Trash cleanup
- Folder organization and search
- Note colors and sorting
- JSON backup export/import, including appearance and sort settings
- Optional local PIN screen lock
- PWA install support
- Android APK build through GitHub Actions

## GitHub repo

https://github.com/iwasoffice/folio-notes

## Web preview

The repository can be deployed as a static site. The existing Vercel account is not modified by automated work in this repository.

## Android APK

The workflow in `.github/workflows/build-apk.yml` builds the Android WebView wrapper and uploads `folio-notes.apk` as a GitHub Actions artifact.

Package ID: `com.folio.notes`

## Privacy

Notes are stored on the device. The optional PIN is a local screen lock and does not encrypt note data.
