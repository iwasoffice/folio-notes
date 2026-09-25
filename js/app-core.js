  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

  const state = {
    view: "notes",
    returnView: "notes",
    queries: { notes: "", archive: "", trash: "" },
    folder: "all",
    editingId: null,
    notes: [],
    settings: FolioStore.settings(),
    saveTimer: null,
    hiddenAt: 0,
    locked: false
  };

  const screens = {
    notes: $("#screen-notes"),
    archive: $("#screen-archive"),
    trash: $("#screen-trash"),
    settings: $("#screen-settings"),
    editor: $("#screen-editor")
  };

  function systemPrefersDark() {
    try {
      if (window.AndroidTheme && typeof window.AndroidTheme.isDarkMode === "function") {
        return Boolean(window.AndroidTheme.isDarkMode());
      }
    } catch {
      // Fall back to the browser media query.
    }
    return window.matchMedia("(prefers-color-scheme: dark)").matches;
  }

  function applyTheme() {
    const pref = state.settings.theme;
    const dark = pref === "dark" || (pref === "system" && systemPrefersDark());
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

  function setSaveStatus(text) {
    $("#save-status").textContent = text;
  }

  function load() {
    FolioStore.purgeExpiredTrash(30);
    state.notes = FolioStore.all();
    state.settings = FolioStore.settings();
    applyTheme();
    $("#theme-select").value = state.settings.theme;
    $("#sort-select").value = state.settings.sort;
    refreshSecurityUi();
    render();
  }

  function fmt(iso) {
    const d = new Date(iso);
    const now = new Date();
    if (d.toDateString() === now.toDateString()) {
      return d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
    }
    return d.toLocaleDateString([], { month: "short", day: "numeric" });
  }

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function noteKind(note) {
    if (note.deletedAt) return "trash";
    return note.archived ? "archive" : "notes";
  }

  function currentQuery(kind) {
    return state.queries[kind] || "";
  }

  function visible(kind) {
    const q = currentQuery(kind).trim().toLowerCase();
    let list = state.notes.filter((n) => noteKind(n) === kind);

    if (kind !== "trash" && state.folder !== "all") {
      list = list.filter((n) => (n.folder || "") === state.folder);
    }

    if (q) {
      list = list.filter((n) =>
        (n.title || "").toLowerCase().includes(q) ||
        (n.body || "").toLowerCase().includes(q) ||
        (n.folder || "").toLowerCase().includes(q)
      );
    }

    const sorter = (a, b) => {
      if (state.settings.sort === "title") return (a.title || "Untitled").localeCompare(b.title || "Untitled");
      if (state.settings.sort === "created") return new Date(b.createdAt) - new Date(a.createdAt);
      return new Date(b.updatedAt) - new Date(a.updatedAt);
    };

    if (kind === "trash") return { pinned: [], rest: list.sort(sorter), total: list.length };
    const pinned = list.filter((n) => n.pinned).sort(sorter);
    const rest = list.filter((n) => !n.pinned).sort(sorter);
    return { pinned, rest, total: list.length };
  }

  function card(note) {
    const preview = (note.body || "").trim() || "Empty note";
    const folder = note.folder ? '<span class="folder-badge">' + escapeHtml(note.folder) + "</span>" : "";
    const deleted = note.deletedAt ? "<span>Deleted " + fmt(note.deletedAt) + "</span>" : "<span>" + fmt(note.updatedAt) + "</span>";
    return '<article class="note-card ' + (note.color || "parchment") + '" data-id="' + note.id + '" role="button" tabindex="0" aria-label="Open ' + escapeHtml(note.title || "Untitled") + '">' +
      '<div class="card-top"><h3>' + escapeHtml(note.title || "Untitled") + "</h3>" + folder + "</div>" +
      "<p>" + escapeHtml(preview) + "</p>" +
      '<div class="meta">' + deleted + '<span class="pin-dot">' + (note.pinned ? "Pinned" : "") + "</span></div></article>";
  }

  function fillList(el, kind, emptyTitle, emptyBody) {
    const { pinned, rest, total } = visible(kind);
    if (!total) {
      el.innerHTML = '<div class="empty"><h2>' + emptyTitle + "</h2><p>" + emptyBody + "</p></div>";
      return;
    }
    el.innerHTML =
      (pinned.length ? '<div class="section-label">Pinned</div>' + pinned.map(card).join("") : "") +
      (rest.length ? '<div class="section-label">' + (pinned.length ? "Everything else" : kind === "trash" ? "Deleted" : "Notes") + "</div>" + rest.map(card).join("") : "");
  }

  function renderFolderFilters() {
    const folders = FolioStore.folders();
    if (state.folder !== "all" && !folders.includes(state.folder)) state.folder = "all";
    const chips = ["all", ...folders]
      .map((folder) => {
        const label = folder === "all" ? "All" : folder;
        return '<button class="folder-chip ' + (state.folder === folder ? "active" : "") + '" type="button" data-folder="' + escapeHtml(folder) + '">' + escapeHtml(label) + "</button>";
      })
      .join("");
    $("#folder-filter-notes").innerHTML = chips;
    $("#folder-filter-archive").innerHTML = chips;
    $("#folder-options").innerHTML = folders.map((f) => '<option value="' + escapeHtml(f) + '"></option>').join("");
  }

  function render() {
    renderFolderFilters();
    fillList(
      $("#notes-list"),
      "notes",
      currentQuery("notes") ? "Nothing matches" : state.folder !== "all" ? "Folder is empty" : "No notes yet",
      currentQuery("notes") ? "Try a different search." : "Tap the plus button to begin."
    );
    fillList(
      $("#archive-list"),
      "archive",
      currentQuery("archive") ? "Nothing matches" : "Archive is empty",
      currentQuery("archive") ? "Try a different search." : "Archived notes live here until you restore or delete them."
    );
    fillList(
      $("#trash-list"),
      "trash",
      currentQuery("trash") ? "Nothing matches" : "Trash is empty",
      currentQuery("trash") ? "Try a different search." : "Deleted notes stay here for 30 days."
    );

    const active = state.notes.filter((n) => !n.deletedAt && !n.archived).length;
    const archived = state.notes.filter((n) => !n.deletedAt && n.archived).length;
    const trashed = state.notes.filter((n) => n.deletedAt).length;
    $("#count-line").textContent = active + " notes · " + archived + " archived · " + trashed + " in trash";
  }
