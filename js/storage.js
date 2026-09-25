const STORAGE_KEY = "folio.notes.v1";
const SETTINGS_KEY = "folio.settings.v1";

const FolioStore = (() => {
  const uid = () =>
    crypto.randomUUID
      ? crypto.randomUUID()
      : "n_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);

  const read = () => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  };

  const write = (notes) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(notes));
  };

  const readSettings = () => {
    try {
      const raw = localStorage.getItem(SETTINGS_KEY);
      return raw
        ? { theme: "system", sort: "updated", ...JSON.parse(raw) }
        : { theme: "system", sort: "updated" };
    } catch {
      return { theme: "system", sort: "updated" };
    }
  };

  const writeSettings = (settings) => {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  };

  const seedIfEmpty = () => {
    const notes = read();
    if (notes.length) return notes;
    const now = new Date().toISOString();
    const seeded = [
      {
        id: uid(),
        title: "Welcome to Quill",
        body: "A quiet place for thoughts.\n\n• Tap + to write a note\n• Pin the ones that matter\n• Search from the top\n• Works offline on your home screen\n\nYour notes stay on this device.",
        color: "sienna",
        pinned: true,
        archived: false,
        createdAt: now,
        updatedAt: now
      },
      {
        id: uid(),
        title: "Sunday market list",
        body: "Sourdough\nBlood oranges\nGreen olives\nOat milk\nA bunch of rosemary",
        color: "sage",
        pinned: false,
        archived: false,
        createdAt: now,
        updatedAt: now
      }
    ];
    write(seeded);
    return seeded;
  };

  return {
    all: () => seedIfEmpty(),
    saveAll: write,
    settings: readSettings,
    saveSettings: writeSettings,
    create(partial = {}) {
      const now = new Date().toISOString();
      const note = {
        id: uid(),
        title: "",
        body: "",
        color: "parchment",
        pinned: false,
        archived: false,
        createdAt: now,
        updatedAt: now,
        ...partial
      };
      const notes = read();
      notes.unshift(note);
      write(notes);
      return note;
    },
    update(id, patch) {
      const notes = read();
      const i = notes.findIndex((n) => n.id === id);
      if (i < 0) return null;
      notes[i] = { ...notes[i], ...patch, updatedAt: new Date().toISOString() };
      write(notes);
      return notes[i];
    },
    remove(id) {
      write(read().filter((n) => n.id !== id));
    },
    exportJson() {
      return JSON.stringify({ notes: read(), settings: readSettings(), exportedAt: new Date().toISOString() }, null, 2);
    },
    importJson(text) {
      const data = JSON.parse(text);
      const incoming = Array.isArray(data) ? data : data.notes;
      if (!Array.isArray(incoming)) throw new Error("Invalid backup");
      const cleaned = incoming.map((n) => ({
        id: n.id || uid(),
        title: String(n.title || ""),
        body: String(n.body || ""),
        color: n.color || "parchment",
        pinned: Boolean(n.pinned),
        archived: Boolean(n.archived),
        createdAt: n.createdAt || new Date().toISOString(),
        updatedAt: n.updatedAt || new Date().toISOString()
      }));
      write(cleaned);
      return cleaned.length;
    }
  };
})();
