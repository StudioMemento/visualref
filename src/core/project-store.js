const STORAGE_KEY = 'memento.visualref.v48.project';
const HISTORY_LIMIT = 80;

export function cloneProject(value) {
  return typeof structuredClone === 'function' ? structuredClone(value) : JSON.parse(JSON.stringify(value));
}

export class ProjectStore {
  constructor(initialState) {
    this.state = initialState;
    this.listeners = new Set();
    this.undoStack = [];
    this.redoStack = [];
    this.saveTimer = 0;
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
    if (history) {
      this.undoStack.push({ label, state: before });
      if (this.undoStack.length > HISTORY_LIMIT) this.undoStack.shift();
      this.redoStack.length = 0;
    }
    this.state = next;
    if (persist) this.scheduleSave();
    this.emit({ label, history });
    return next;
  }

  replace(next, { label = 'Replace project', history = false, persist = true } = {}) {
    if (history) this.undoStack.push({ label, state: cloneProject(this.state) });
    this.state = cloneProject(next);
    if (persist) this.scheduleSave();
    this.emit({ label, history });
  }

  undo() {
    const entry = this.undoStack.pop();
    if (!entry) return false;
    this.redoStack.push({ label: entry.label, state: cloneProject(this.state) });
    this.state = entry.state;
    this.scheduleSave();
    this.emit({ label: `Undo ${entry.label}`, history: false });
    return true;
  }

  redo() {
    const entry = this.redoStack.pop();
    if (!entry) return false;
    this.undoStack.push({ label: entry.label, state: cloneProject(this.state) });
    this.state = entry.state;
    this.scheduleSave();
    this.emit({ label: `Redo ${entry.label}`, history: false });
    return true;
  }

  scheduleSave() {
    clearTimeout(this.saveTimer);
    this.saveTimer = setTimeout(() => this.saveNow(), 90);
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
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return fallbackFactory();
    const parsed = JSON.parse(raw);
    if (parsed?.schemaVersion !== 48) return fallbackFactory();
    return parsed;
  } catch (error) {
    console.warn('Project restore failed', error);
    return fallbackFactory();
  }
}

export function clearProjectPersistence() {
  localStorage.removeItem(STORAGE_KEY);
}
