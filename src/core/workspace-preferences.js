const KEY = 'memento.visualref.v49.workspace';

export const DEFAULT_WORKSPACE_PREFERENCES = {
  displayMode: 'viewport',
  splitRatio: 0.5,
  splitSwapped: false,
  shotSubview: 'director',
  sequenceView: 'simple',
  leftPanelCollapsed: false,
  inspectorCollapsed: false,
  selectedWorldTab: 'transform',
  viewportTool: 'select',
  transformSpace: 'world',
  snapEnabled: false,
  snapTranslate: 0.25,
  snapRotate: 15,
  snapScale: 0.1,
  editorCamera: {
    yaw: -0.65,
    pitch: -0.18,
    distance: 6.6,
    target: [0, 1.55, 0],
  },
  guides: true,
  viewportShading: 'shaded',
  timelineTool: 'select',
  timelinePan: 0,
};

const copy = (value) => (typeof structuredClone === 'function' ? structuredClone(value) : JSON.parse(JSON.stringify(value)));

export function loadWorkspacePreferences() {
  try {
    const value = JSON.parse(localStorage.getItem(KEY) || 'null');
    const next = { ...copy(DEFAULT_WORKSPACE_PREFERENCES), ...(value || {}) };
    next.editorCamera = { ...copy(DEFAULT_WORKSPACE_PREFERENCES.editorCamera), ...(value?.editorCamera || {}) };
    next.splitRatio = Math.max(0.35, Math.min(0.65, Number(next.splitRatio) || 0.5));
    return next;
  } catch {
    return copy(DEFAULT_WORKSPACE_PREFERENCES);
  }
}

export function saveWorkspacePreferences(preferences) {
  try { localStorage.setItem(KEY, JSON.stringify(preferences)); } catch (error) { console.warn('Workspace preferences could not be saved', error); }
}

export function clearWorkspacePreferences() { localStorage.removeItem(KEY); }
