  document.addEventListener("click", (e) => {
    if (state.locked && !e.target.closest("#lock-overlay")) return;

    const tab = e.target.closest(".tab");
    if (tab) {
      if (state.view === "editor") persistEditor();
      state.folder = "all";
      show(tab.dataset.view);
      render();
      return;
    }

    const chip = e.target.closest(".folder-chip");
    if (chip) {
      state.folder = chip.dataset.folder;
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
      const note = state.notes.find((n) => n.id === state.editingId);
      if (!note || note.deletedAt) return;
      FolioStore.update(state.editingId, { color: sw.dataset.color });
      state.notes = FolioStore.all();
      $$(".swatch").forEach((s) => s.classList.toggle("on", s === sw));
      setSaveStatus("Saved");
    }
  });

  document.addEventListener("keydown", (e) => {
    const cardEl = e.target.closest && e.target.closest(".note-card");
    if (cardEl && (e.key === "Enter" || e.key === " ")) {
      e.preventDefault();
      openEditor(cardEl.dataset.id);
    }
  });

  $("#fab").addEventListener("click", newNote);
  $("#btn-back").addEventListener("click", leaveEditor);
  $("#note-title").addEventListener("input", queueSave);
  $("#note-body").addEventListener("input", queueSave);
  $("#note-folder").addEventListener("input", queueSave);

  [["#search-notes", "notes"], ["#search-archive", "archive"], ["#search-trash", "trash"]].forEach(([selector, kind]) => {
    $(selector).addEventListener("input", (e) => {
      state.queries[kind] = e.target.value;
      render();
    });
  });

  $("#btn-pin-note").addEventListener("click", () => {
    const n = state.notes.find((x) => x.id === state.editingId);
    if (!n || n.deletedAt) return;
    FolioStore.update(n.id, { pinned: !n.pinned });
    state.notes = FolioStore.all();
    const updated = state.notes.find((x) => x.id === state.editingId);
    $("#btn-pin-note").setAttribute("aria-pressed", updated.pinned ? "true" : "false");
    $("#btn-pin-note").title = updated.pinned ? "Unpin" : "Pin";
    toast(updated.pinned ? "Pinned" : "Unpinned");
  });

  $("#btn-archive").addEventListener("click", () => {
    persistEditor();
    const n = state.notes.find((x) => x.id === state.editingId);
    if (!n || n.deletedAt) return;
    const wasArchived = n.archived;
    FolioStore.update(n.id, { archived: !n.archived, pinned: wasArchived ? n.pinned : false });
    state.notes = FolioStore.all();
    state.editingId = null;
    show(wasArchived ? "notes" : "archive");
    render();
    toast(wasArchived ? "Restored" : "Archived");
  });

  $("#btn-restore").addEventListener("click", () => {
    const n = state.notes.find((x) => x.id === state.editingId);
    if (!n || !n.deletedAt) return;
    FolioStore.restore(n.id);
    state.notes = FolioStore.all();
    state.editingId = null;
    show("notes");
    render();
    toast("Restored from Trash");
  });

  $("#btn-delete").addEventListener("click", () => {
    const n = state.notes.find((x) => x.id === state.editingId);
    if (!n) return;

    if (n.deletedAt) {
      if (!confirm("Delete this note permanently? This cannot be undone.")) return;
      FolioStore.remove(n.id);
      toast("Deleted permanently");
    } else {
      FolioStore.moveToTrash(n.id);
      toast("Moved to Trash");
    }

    state.notes = FolioStore.all();
    state.editingId = null;
    show(n.deletedAt ? "trash" : "notes");
    render();
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
    setTimeout(() => URL.revokeObjectURL(a.href), 0);
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
      toast("Imported " + count + " notes and settings");
    } catch {
      toast("Could not import that backup");
    }
  });

  $("#btn-clear").addEventListener("click", () => {
    if (!confirm("Delete every note on this device? Your settings and app PIN will stay.")) return;
    FolioStore.clearAll();
    state.notes = FolioStore.all();
    render();
    toast("All notes cleared");
  });

  $("#btn-pin").addEventListener("click", openPinDialog);
  $("#btn-lock-now").addEventListener("click", () => setLocked(true));
  $("#btn-unlock").addEventListener("click", unlock);
  $("#unlock-pin").addEventListener("keydown", (e) => {
    if (e.key === "Enter") unlock();
  });

  $("#btn-pin-cancel").addEventListener("click", () => $("#pin-dialog").close());
  $("#pin-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const enabled = FolioSecurity.hasPin();
    const current = $("#current-pin").value;
    const next = $("#new-pin").value;
    const confirmPin = $("#confirm-pin").value;
    const error = $("#pin-error");

    if (enabled && !(await FolioSecurity.verify(current))) {
      error.textContent = "Current PIN is incorrect.";
      return;
    }
    if (!validPin(next)) {
      error.textContent = "PIN must contain 4–8 digits.";
      return;
    }
    if (next !== confirmPin) {
      error.textContent = "The new PINs do not match.";
      return;
    }

    await FolioSecurity.setPin(next);
    $("#pin-dialog").close();
    refreshSecurityUi();
    toast(enabled ? "PIN changed" : "App lock enabled");
  });

  $("#btn-remove-pin").addEventListener("click", async () => {
    const current = $("#current-pin").value;
    if (!(await FolioSecurity.verify(current))) {
      $("#pin-error").textContent = "Enter your current PIN before removing app lock.";
      return;
    }
    if (!confirm("Remove the app PIN?")) return;
    FolioSecurity.removePin();
    $("#pin-dialog").close();
    refreshSecurityUi();
    setLocked(false);
    toast("App lock removed");
  });

  window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", applyTheme);
  window.addEventListener("folio-system-theme-change", applyTheme);

  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      state.hiddenAt = Date.now();
      return;
    }
    if (FolioSecurity.hasPin() && state.hiddenAt && Date.now() - state.hiddenAt > 30000) {
      setLocked(true);
    }
  });

  if ("serviceWorker" in navigator && location.protocol !== "file:") {
    navigator.serviceWorker.register("./sw.js").catch(() => {});
  }

  load();
  show("notes");
  if (FolioSecurity.hasPin()) setLocked(true);
