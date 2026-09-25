(() => {
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

  const state = {
    view: "notes",
    query: "",
    editingId: null,
    notes: [],
    settings: FolioStore.settings()
  };

  const screens = {
    notes: $("#screen-notes"),
    archive: $("#screen-archive"),
    settings: $("#screen-settings"),
    editor: $("#screen-editor")
  };

  function applyTheme() {
    const pref = state.settings.theme;
    const dark =
      pref === "dark" ||
      (pref === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);
    document.documentElement.dataset.theme = dark ? "dark" : "light";
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute("content", dark ? "#161411" : "#C45C26");
  }

  function toast(msg) {
    const el = $("#toast");
    el.textContent = msg;
    el.classList.add("show");
    clearTimeout(toast._t);
    toast._t = setTimeout(() => el.classList.remove("show"), 1800);
  }

  function load() {
    state.notes = FolioStore.all();
    state.settings = FolioStore.settings();
    applyTheme();
    $("#theme-select").value = state.settings.theme;
    $("#sort-select").value = state.settings.sort;
    render();
  }

  function fmt(iso) {
    const d = new Date(iso);
    const now = new Date();
    const sameDay = d.toDateString() === now.toDateString();
    if (sameDay) return d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
    return d.toLocaleDateString([], { month: "short", day: "numeric" });
  }

  function visible(archived) {
    const q = state.query.trim().toLowerCase();
    let list = state.notes.filter((n) => Boolean(n.archived) === archived);
    if (q) {
      list = list.filter(
        (n) =>
          (n.title || "").toLowerCase().includes(q) ||
          (n.body || "").toLowerCase().includes(q)
      );
    }
    const pinned = list.filter((n) => n.pinned);
    const rest = list.filter((n) => !n.pinned);
    const sorter = (a, b) => {
      if (state.settings.sort === "title") return (a.title || "Untitled").localeCompare(b.title || "Untitled");
      if (state.settings.sort === "created") return new Date(b.createdAt) - new Date(a.createdAt);
      return new Date(b.updatedAt) - new Date(a.updatedAt);
    };
    return { pinned: pinned.sort(sorter), rest: rest.sort(sorter), total: list.length };
  }

  function card(note) {
    const preview = (note.body || "").trim() || "Empty note";
    return `<article class="note-card ${note.color || "parchment"}" data-id="${note.id}" role="button" tabindex="0">
      <h3>${escapeHtml(note.title || "Untitled")}</h3>
      <p>${escapeHtml(preview)}</p>
      <div class="meta">
        <span>${fmt(note.updatedAt)}</span>
        <span class="pin-dot">${note.pinned ? "Pinned" : ""}</span>
      </div>
    </article>`;
  }

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function fillList(el, archived, emptyTitle, emptyBody) {
    const { pinned, rest, total } = visible(archived);
    if (!total) {
      el.innerHTML = `<div class="empty"><h2>${emptyTitle}</h2><p>${emptyBody}</p></div>`;
      return;
    }
    el.innerHTML =
      (pinned.length ? `<div class="section-label">Pinned</div>${pinned.map(card).join("")}` : "") +
      (rest.length ? `<div class="section-label">${pinned.length ? "Everything else" : "Notes"}</div>${rest.map(card).join("")}` : "");
  }

  function render() {
    fillList(
      $("#notes-list"),
      false,
      state.query ? "Nothing matches" : "No notes yet",
      state.query ? "Try a different search." : "Tap the plus button to begin."
    );
    fillList(
      $("#archive-list"),
      true,
      "Archive is empty",
      "Archived notes live here until you restore or delete them."
    );
    $("#count-line").textContent = `${state.notes.filter((n) => !n.archived).length} notes on this device`;
  }

  function show(view) {
    state.view = view;
    Object.entries(screens).forEach(([k, el]) => el.classList.toggle("active", k === view));
    $$(".tab").forEach((t) => t.classList.toggle("active", t.dataset.view === view));
    $("#fab").hidden = view === "editor" || view === "settings";
  }

  function openEditor(id) {
    const note = state.notes.find((n) => n.id === id);
    if (!note) return;
    state.editingId = id;
    $("#note-title").value = note.title;
    $("#note-body").value = note.body;
    $$(".swatch").forEach((s) => s.classList.toggle("on", s.dataset.color === note.color));
    $("#btn-pin").setAttribute("aria-pressed", note.pinned ? "true" : "false");
    $("#btn-pin").title = note.pinned ? "Unpin" : "Pin";
    show("editor");
    setTimeout(() => $("#note-title").focus(), 50);
  }

  function persistEditor() {
    if (!state.editingId) return;
    FolioStore.update(state.editingId, {
      title: $("#note-title").value,
      body: $("#note-body").value
    });
    state.notes = FolioStore.all();
  }

  function newNote() {
    const note = FolioStore.create({ color: "parchment" });
    state.notes = FolioStore.all();
    openEditor(note.id);
  }

  document.addEventListener("click", (e) => {
    const tab = e.target.closest(".tab");
    if (tab) {
      persistEditor();
      show(tab.dataset.view);
      render();
      return;
    }
    const cardEl = e.target.closest(".note-card");
    if (cardEl) {
      openEditor(cardEl.dataset.id);
      return;
    }
    const sw = e.target.closest(".swatch");
    if (sw && state.editingId) {
      FolioStore.update(state.editingId, { color: sw.dataset.color });
      state.notes = FolioStore.all();
      $$(".swatch").forEach((s) => s.classList.toggle("on", s === sw));
    }
  });

  $("#fab").addEventListener("click", newNote);
  $("#btn-back").addEventListener("click", () => {
    persistEditor();
    const current = state.notes.find((n) => n.id === state.editingId);
    if (current && !current.title.trim() && !current.body.trim()) {
      FolioStore.remove(current.id);
      state.notes = FolioStore.all();
    }
    state.editingId = null;
    show(current && current.archived ? "archive" : "notes");
    render();
  });

  $("#note-title").addEventListener("input", persistEditor);
  $("#note-body").addEventListener("input", persistEditor);
  $("#search-notes").addEventListener("input", (e) => {
    state.query = e.target.value;
    render();
  });
  $("#search-archive").addEventListener("input", (e) => {
    state.query = e.target.value;
    render();
  });

  $("#btn-pin").addEventListener("click", () => {
    const n = state.notes.find((x) => x.id === state.editingId);
    if (!n) return;
    FolioStore.update(n.id, { pinned: !n.pinned });
    state.notes = FolioStore.all();
    const updated = state.notes.find((x) => x.id === state.editingId);
    $("#btn-pin").setAttribute("aria-pressed", updated.pinned ? "true" : "false");
    toast(updated.pinned ? "Pinned" : "Unpinned");
  });

  $("#btn-archive").addEventListener("click", () => {
    const n = state.notes.find((x) => x.id === state.editingId);
    if (!n) return;
    FolioStore.update(n.id, { archived: !n.archived, pinned: n.archived ? n.pinned : false });
    state.notes = FolioStore.all();
    state.editingId = null;
    show(n.archived ? "notes" : "archive");
    render();
    toast(n.archived ? "Restored" : "Archived");
  });

  $("#btn-delete").addEventListener("click", () => {
    if (!state.editingId) return;
    if (!confirm("Delete this note permanently?")) return;
    FolioStore.remove(state.editingId);
    state.notes = FolioStore.all();
    state.editingId = null;
    show("notes");
    render();
    toast("Deleted");
  });

  $("#theme-select").addEventListener("change", (e) => {
    state.settings.theme = e.target.value;
    FolioStore.saveSettings(state.settings);
    applyTheme();
  });
  $("#sort-select").addEventListener("change", (e) => {
    state.settings.sort = e.target.value;
    FolioStore.saveSettings(state.settings);
    render();
  });

  $("#btn-export").addEventListener("click", () => {
    const blob = new Blob([FolioStore.exportJson()], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "folio-notes-backup.json";
    a.click();
    URL.revokeObjectURL(a.href);
    toast("Backup downloaded");
  });

  $("#btn-import").addEventListener("click", () => $("#file-import").click());
  $("#file-import").addEventListener("change", async (e) => {
    const file = e.target.files[0];
    e.target.value = "";
    if (!file) return;
    try {
      const text = await file.text();
      const count = FolioStore.importJson(text);
      load();
      toast(`Imported ${count} notes`);
    } catch {
      toast("Could not import that file");
    }
  });

  $("#btn-clear").addEventListener("click", () => {
    if (!confirm("Delete every note on this device?")) return;
    FolioStore.saveAll([]);
    load();
    toast("All notes cleared");
  });

  window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", applyTheme);

  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("./sw.js").catch(() => {});
  }

  load();
  show("notes");
})();
