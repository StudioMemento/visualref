import { migrateV48ToV49, normalizeProject } from './schema.js';

const STORAGE_KEY = 'memento.visualref.v49.project';
const LEGACY_KEY = 'memento.visualref.v48.project';
const HISTORY_LIMIT = 120;

export function cloneProject(value) {
  return typeof structuredClone === 'function' ? structuredClone(value) : JSON.parse(JSON.stringify(value));
}

export class ProjectStore {
  constructor(initialState) {
    this.state = normalizeProject(initialState);
    this.listeners = new Set();
    this.undoStack = [];
    this.redoStack = [];
    this.saveTimer = 0;
    this.activePreview = null;
  }

  getState() { return this.state; }

  subscribe(listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  emit(meta = {}) {
    for (const listener of this.listeners) listener(this.state, meta);
  }

  commit(label, producer, { history = true, persist = true } = {}) {
    const before = cloneProject(this.state);
    const next = cloneProject(this.state);
    producer(next);
    next.meta = { ...(next.meta || {}), updatedAt: new Date().toISOString() };
    this.activePreview = null;
    if (history) {
      this.undoStack.push({ label, state: before });
      if (this.undoStack.length > HISTORY_LIMIT) this.undoStack.shift();
      this.redoStack.length = 0;
    }
    this.state = normalizeProject(next);
    if (persist) this.scheduleSave();
    this.emit({ label, history });
    return this.state;
  }

  beginPreview(label) {
    if (this.activePreview) return;
    this.activePreview = { label, before: cloneProject(this.state) };
  }

  preview(producer) {
    if (!this.activePreview) this.beginPreview('Preview edit');
    const next = cloneProject(this.state);
    producer(next);
    this.state = normalizeProject(next);
    this.emit({ label: this.activePreview.label, preview: true, history: false });
  }

  commitPreview(label = this.activePreview?.label || 'Edit') {
    if (!this.activePreview) return false;
    const before = this.activePreview.before;
    this.activePreview = null;
    this.undoStack.push({ label, state: before });
    if (this.undoStack.length > HISTORY_LIMIT) this.undoStack.shift();
    this.redoStack.length = 0;
    this.scheduleSave();
    this.emit({ label, history: true, previewCommit: true });
    return true;
  }

  cancelPreview() {
    if (!this.activePreview) return false;
    this.state = this.activePreview.before;
    const label = this.activePreview.label;
    this.activePreview = null;
    this.emit({ label: `Cancel ${label}`, history: false });
    return true;
  }

  replace(next, { label = 'Replace project', history = false, persist = true } = {}) {
    if (history) this.undoStack.push({ label, state: cloneProject(this.state) });
    this.activePreview = null;
    this.state = normalizeProject(next);
    if (persist) this.scheduleSave();
    this.emit({ label, history });
  }

  undo() {
    if (this.activePreview) this.cancelPreview();
    const entry = this.undoStack.pop();
    if (!entry) return false;
    this.redoStack.push({ label: entry.label, state: cloneProject(this.state) });
    this.state = normalizeProject(entry.state);
    this.scheduleSave();
    this.emit({ label: `Undo ${entry.label}`, history: false });
    return true;
  }

  redo() {
    if (this.activePreview) this.cancelPreview();
    const entry = this.redoStack.pop();
    if (!entry) return false;
    this.undoStack.push({ label: entry.label, state: cloneProject(this.state) });
    this.state = normalizeProject(entry.state);
    this.scheduleSave();
    this.emit({ label: `Redo ${entry.label}`, history: false });
    return true;
  }

  scheduleSave() {
    clearTimeout(this.saveTimer);
    this.saveTimer = setTimeout(() => this.saveNow(), 80);
  }

  saveNow() {
    clearTimeout(this.saveTimer);
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(this.state)); } catch (error) { console.warn('Project persistence failed', error); }
  }

  canUndo() { return this.undoStack.length > 0; }
  canRedo() { return this.redoStack.length > 0; }
}

export function restoreProject(fallbackFactory) {
  try {
    const current = localStorage.getItem(STORAGE_KEY);
    if (current) return normalizeProject(JSON.parse(current));
    const legacy = localStorage.getItem(LEGACY_KEY);
    if (legacy) {
      const migrated = migrateV48ToV49(JSON.parse(legacy));
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(migrated)); } catch {}
      return migrated;
    }
    return fallbackFactory();
  } catch (error) {
    console.warn('Project restore failed', error);
    return fallbackFactory();
  }
}

export function clearProjectPersistence({ includeLegacy = false } = {}) {
  localStorage.removeItem(STORAGE_KEY);
  if (includeLegacy) localStorage.removeItem(LEGACY_KEY);
}

export const PROJECT_STORAGE_KEY = STORAGE_KEY;
