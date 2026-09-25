  function show(view) {
    state.view = view;
    Object.entries(screens).forEach(([k, el]) => el.classList.toggle("active", k === view));
    $$(".tab").forEach((t) => t.classList.toggle("active", t.dataset.view === view));
    $("#fab").hidden = view === "editor" || view === "settings" || view === "trash";
  }

  function openEditor(id) {
    const note = state.notes.find((n) => n.id === id);
    if (!note) return;
    state.editingId = id;
    state.returnView = noteKind(note);

    $("#note-title").value = note.title;
    $("#note-body").value = note.body;
    $("#note-folder").value = note.folder || "";
    $$(".swatch").forEach((s) => s.classList.toggle("on", s.dataset.color === note.color));

    const inTrash = Boolean(note.deletedAt);
    $("#note-title").readOnly = inTrash;
    $("#note-body").readOnly = inTrash;
    $("#note-folder").readOnly = inTrash;
    $("#note-tools").classList.toggle("read-only", inTrash);
    $("#btn-pin-note").hidden = inTrash;
    $("#btn-archive").hidden = inTrash;
    $("#btn-restore").hidden = !inTrash;
    $("#btn-delete").title = inTrash ? "Delete permanently" : "Move to Trash";
    $("#btn-delete").setAttribute("aria-label", inTrash ? "Delete note permanently" : "Move note to Trash");

    $("#btn-pin-note").setAttribute("aria-pressed", note.pinned ? "true" : "false");
    $("#btn-pin-note").title = note.pinned ? "Unpin" : "Pin";
    setSaveStatus(inTrash ? "In Trash" : "Saved");
    show("editor");
    if (!inTrash) setTimeout(() => $("#note-title").focus(), 50);
  }

  function persistEditor() {
    if (!state.editingId) return;
    const note = state.notes.find((n) => n.id === state.editingId);
    if (!note || note.deletedAt) return;
    clearTimeout(state.saveTimer);
    FolioStore.update(state.editingId, {
      title: $("#note-title").value,
      body: $("#note-body").value,
      folder: $("#note-folder").value.trim().slice(0, 40)
    });
    state.notes = FolioStore.all();
    setSaveStatus("Saved");
  }

  function queueSave() {
    const note = state.notes.find((n) => n.id === state.editingId);
    if (!note || note.deletedAt) return;
    setSaveStatus("Saving…");
    clearTimeout(state.saveTimer);
    state.saveTimer = setTimeout(() => {
      persistEditor();
      renderFolderFilters();
    }, 250);
  }

  function newNote() {
    const folder = state.folder === "all" ? "" : state.folder;
    const note = FolioStore.create({ color: "parchment", folder });
    state.notes = FolioStore.all();
    openEditor(note.id);
  }

  function leaveEditor() {
    persistEditor();
    const current = state.notes.find((n) => n.id === state.editingId);
    if (current && !current.deletedAt && !current.title.trim() && !current.body.trim() && !(current.folder || "").trim()) {
      FolioStore.remove(current.id);
      state.notes = FolioStore.all();
    }
    state.editingId = null;
    show(state.returnView === "editor" ? "notes" : state.returnView);
    render();
  }

  function nativeBiometricAvailable() {
    try {
      return Boolean(
        window.AndroidSecurity &&
        typeof window.AndroidSecurity.isBiometricAvailable === "function" &&
        window.AndroidSecurity.isBiometricAvailable()
      );
    } catch {
      return false;
    }
  }

  function requestBiometricUnlock() {
    if (!nativeBiometricAvailable()) return;
    try {
      window.AndroidSecurity.authenticateBiometric();
    } catch {
      $("#lock-error").textContent = "Fingerprint unlock is unavailable.";
    }
  }

  function setLocked(locked) {
    state.locked = locked;
    $("#lock-overlay").hidden = !locked;
    $("#app-shell").classList.toggle("is-locked", locked);

    const canUseBiometric =
      locked &&
      FolioSecurity.hasPin() &&
      FolioSecurity.biometricEnabled() &&
      nativeBiometricAvailable();

    $("#btn-biometric-unlock").hidden = !canUseBiometric;

    if (locked) {
      $("#unlock-pin").value = "";
      $("#lock-error").textContent = "";
      setTimeout(() => $("#unlock-pin").focus(), 30);
    }
  }

  function refreshSecurityUi() {
    const enabled = FolioSecurity.hasPin();
    const biometricAvailable = nativeBiometricAvailable();
    const biometricEnabled = enabled && FolioSecurity.biometricEnabled();

    $("#btn-pin").textContent = enabled ? "Change PIN" : "Set PIN";
    $("#lock-now-row").hidden = !enabled;
    $("#biometric-row").hidden = !enabled || !biometricAvailable;
    $("#btn-biometric-toggle").textContent = biometricEnabled ? "Disable" : "Enable";
    $("#btn-biometric-unlock").hidden = !(state.locked && biometricEnabled && biometricAvailable);
  }

  function validPin(pin) {
    return /^\d{4,8}$/.test(pin);
  }

  function openPinDialog() {
    const enabled = FolioSecurity.hasPin();
    $("#pin-dialog-title").textContent = enabled ? "Change app PIN" : "Set app PIN";
    $("#current-pin-wrap").hidden = !enabled;
    $("#btn-remove-pin").hidden = !enabled;
    $("#current-pin").value = "";
    $("#new-pin").value = "";
    $("#confirm-pin").value = "";
    $("#pin-error").textContent = "";
    $("#pin-dialog").showModal();
    setTimeout(() => (enabled ? $("#current-pin") : $("#new-pin")).focus(), 30);
  }

  async function unlock() {
    const pin = $("#unlock-pin").value;
    if (await FolioSecurity.verify(pin)) {
      setLocked(false);
      return;
    }
    $("#lock-error").textContent = "Incorrect PIN.";
    $("#unlock-pin").select();
  }
