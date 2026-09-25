const STORAGE_KEY = "folio.notes.v1";
const SETTINGS_KEY = "folio.settings.v1";
const META_KEY = "folio.meta.v2";
const SECURITY_KEY = "folio.security.v1";

const FolioStore = (() => {
  const defaults = { theme: "system", sort: "updated" };

  const uid = () =>
    crypto.randomUUID
      ? crypto.randomUUID()
      : "n_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);

  const readJson = (key, fallback) => {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch {
      return fallback;
    }
  };

  const read = () => {
    const notes = readJson(STORAGE_KEY, []);
    return Array.isArray(notes) ? notes : [];
  };

  const write = (notes) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(notes));
  };

  const readSettings = () => ({ ...defaults, ...readJson(SETTINGS_KEY, {}) });
  const writeSettings = (settings) => {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify({ ...defaults, ...settings }));
  };

  const markInitialized = () => {
    localStorage.setItem(META_KEY, JSON.stringify({ initialized: true }));
  };

  const normalize = (n) => ({
    id: n.id || uid(),
    title: String(n.title || ""),
    body: String(n.body || ""),
    color: n.color || "parchment",
    folder: String(n.folder || "").trim().slice(0, 40),
    pinned: Boolean(n.pinned),
    archived: Boolean(n.archived),
    deletedAt: n.deletedAt || null,
    createdAt: n.createdAt || new Date().toISOString(),
    updatedAt: n.updatedAt || new Date().toISOString()
  });

  const seedIfNeeded = () => {
    const existing = read().map(normalize);
    const meta = readJson(META_KEY, {});

    if (meta.initialized || existing.length) {
      if (!meta.initialized) markInitialized();
      if (existing.length) write(existing);
      return existing;
    }

    const now = new Date().toISOString();
    const seeded = [
      {
        id: uid(),
        title: "Welcome to Folio Notes",
        body: "A quiet place for thoughts.\n\n• Tap + to write a note\n• Pin the ones that matter\n• Organize with folders\n• Search from the top\n• Works offline on your home screen\n\nYour notes stay on this device.",
        color: "sienna",
        folder: "Getting Started",
        pinned: true,
        archived: false,
        deletedAt: null,
        createdAt: now,
        updatedAt: now
      },
      {
        id: uid(),
        title: "Sunday market list",
        body: "Sourdough\nBlood oranges\nGreen olives\nOat milk\nA bunch of rosemary",
        color: "sage",
        folder: "Personal",
        pinned: false,
        archived: false,
        deletedAt: null,
        createdAt: now,
        updatedAt: now
      }
    ];

    write(seeded);
    markInitialized();
    return seeded;
  };

  const purgeExpiredTrash = (days = 30) => {
    const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
    const before = read();
    const after = before.filter((n) => !n.deletedAt || new Date(n.deletedAt).getTime() >= cutoff);
    if (after.length !== before.length) write(after);
    return before.length - after.length;
  };

  return {
    all() {
      purgeExpiredTrash(30);
      return seedIfNeeded();
    },
    saveAll(notes) {
      write(notes.map(normalize));
      markInitialized();
    },
    settings: readSettings,
    saveSettings: writeSettings,
    folders() {
      return [...new Set(read().filter((n) => !n.deletedAt).map((n) => String(n.folder || "").trim()).filter(Boolean))]
        .sort((a, b) => a.localeCompare(b));
    },
    create(partial = {}) {
      const now = new Date().toISOString();
      const note = normalize({
        id: uid(),
        title: "",
        body: "",
        color: "parchment",
        folder: "",
        pinned: false,
        archived: false,
        deletedAt: null,
        createdAt: now,
        updatedAt: now,
        ...partial
      });
      const notes = read();
      notes.unshift(note);
      write(notes);
      markInitialized();
      return note;
    },
    update(id, patch) {
      const notes = read();
      const i = notes.findIndex((n) => n.id === id);
      if (i < 0) return null;
      notes[i] = normalize({ ...notes[i], ...patch, updatedAt: new Date().toISOString() });
      write(notes);
      return notes[i];
    },
    moveToTrash(id) {
      return this.update(id, { deletedAt: new Date().toISOString(), archived: false, pinned: false });
    },
    restore(id) {
      return this.update(id, { deletedAt: null, archived: false });
    },
    remove(id) {
      write(read().filter((n) => n.id !== id));
    },
    clearAll() {
      write([]);
      markInitialized();
    },
    purgeExpiredTrash,
    exportJson() {
      return JSON.stringify(
        {
          version: 2,
          app: "Folio Notes",
          notes: read().map(normalize),
          settings: readSettings(),
          exportedAt: new Date().toISOString()
        },
        null,
        2
      );
    },
    importJson(text) {
      const data = JSON.parse(text);
      const incoming = Array.isArray(data) ? data : data.notes;
      if (!Array.isArray(incoming)) throw new Error("Invalid backup");

      const cleaned = incoming.map(normalize);
      write(cleaned);
      markInitialized();

      if (!Array.isArray(data) && data.settings && typeof data.settings === "object") {
        const next = {
          theme: ["system", "light", "dark"].includes(data.settings.theme) ? data.settings.theme : "system",
          sort: ["updated", "created", "title"].includes(data.settings.sort) ? data.settings.sort : "updated"
        };
        writeSettings(next);
      }
      return cleaned.length;
    }
  };
})();

const FolioSecurity = (() => {
  const read = () => {
    try {
      const raw = localStorage.getItem(SECURITY_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  };

  const randomSalt = () => {
    if (crypto.getRandomValues) {
      const bytes = new Uint8Array(16);
      crypto.getRandomValues(bytes);
      return [...bytes].map((b) => b.toString(16).padStart(2, "0")).join("");
    }
    return Date.now().toString(36) + Math.random().toString(36).slice(2);
  };

  const fallbackHash = (value) => {
    let h1 = 0xdeadbeef ^ value.length;
    let h2 = 0x41c6ce57 ^ value.length;
    for (let i = 0, ch; i < value.length; i += 1) {
      ch = value.charCodeAt(i);
      h1 = Math.imul(h1 ^ ch, 2654435761);
      h2 = Math.imul(h2 ^ ch, 1597334677);
    }
    h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
    h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
    return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(36);
  };

  const hash = async (pin, salt) => {
    const value = `${salt}:${pin}`;
    if (crypto.subtle && typeof TextEncoder !== "undefined") {
      const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
      return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
    }
    return fallbackHash(value);
  };

  return {
    hasPin() {
      const sec = read();
      return Boolean(sec && sec.salt && sec.hash);
    },
    async setPin(pin) {
      const salt = randomSalt();
      const pinHash = await hash(pin, salt);
      localStorage.setItem(SECURITY_KEY, JSON.stringify({ salt, hash: pinHash }));
    },
    async verify(pin) {
      const sec = read();
      if (!sec) return false;
      return (await hash(pin, sec.salt)) === sec.hash;
    },
    removePin() {
      localStorage.removeItem(SECURITY_KEY);
    }
  };
})();
