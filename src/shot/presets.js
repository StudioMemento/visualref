import { defaultRecipe } from './axes.js';

const recipe = (overrides = {}) => ({ ...defaultRecipe(), ...overrides });

export const FAMILIES = {
  hero: {
    id: 'hero', label: 'Hero', description: 'Make the product feel inevitable.',
    pools: {
      light: ['softbox', 'rim', 'split', 'top', 'daylight'],
      camera: ['hero-3q', 'front', 'rear-3q', 'low'],
      lens: ['cinema35', 'natural50', 'portrait85'],
      focus: ['full', 'front', 'center', 'label'],
      composition: ['center', 'thirds-left', 'thirds-right', 'symmetry', 'negative-left', 'negative-right'],
      scale: ['wide', 'balanced', 'tight'],
      rotation: ['neutral', 'left15', 'right15', 'left35', 'right35'],
      view: ['perspective', 'orthographic'],
      motion: ['still', 'push', 'pull', 'orbit-left', 'orbit-right'],
      environment: ['grey', 'white', 'black', 'void'],
      atmosphere: ['clean', 'warm', 'cool', 'contrast', 'soft', 'nocturne'],
    },
  },
  detail: {
    id: 'detail', label: 'Detail', description: 'Let material and craft carry the shot.',
    pools: {
      light: ['softbox', 'rim', 'split', 'top'],
      camera: ['detail', 'hero-3q', 'side', 'top'],
      lens: ['portrait85', 'macro105', 'natural50'],
      focus: ['label', 'front', 'shallow', 'center'],
      composition: ['center', 'thirds-left', 'thirds-right', 'diagonal'],
      scale: ['tight', 'macro'],
      rotation: ['neutral', 'left15', 'right15', 'tilt-left', 'tilt-right'],
      view: ['detail', 'profile', 'top', 'perspective'],
      motion: ['still', 'push', 'slide-left', 'slide-right', 'rise'],
      environment: ['grey', 'black', 'void', 'white'],
      atmosphere: ['clean', 'warm', 'cool', 'contrast', 'soft', 'nocturne'],
    },
  },
  motion: {
    id: 'motion', label: 'Motion', description: 'Direct a camera move with one readable curve.',
    pools: {
      light: ['softbox', 'rim', 'split', 'daylight'],
      camera: ['hero-3q', 'low', 'side', 'rear-3q'],
      lens: ['wide24', 'cinema35', 'natural50', 'portrait85'],
      focus: ['full', 'center', 'label', 'shallow'],
      composition: ['center', 'thirds-left', 'thirds-right', 'negative-left', 'negative-right', 'diagonal'],
      scale: ['wide', 'balanced', 'tight'],
      rotation: ['neutral', 'left15', 'right15', 'left35', 'right35'],
      view: ['perspective', 'profile', 'orthographic'],
      motion: ['orbit-left', 'orbit-right', 'push', 'pull', 'rise', 'slide-left', 'slide-right'],
      environment: ['grey', 'white', 'black', 'void'],
      atmosphere: ['clean', 'warm', 'cool', 'contrast', 'soft', 'nocturne'],
    },
  },
};

export const PRESETS = [
  {
    id: 'copper-ledger', familyId: 'hero', label: 'Copper Ledger', note: 'Warm authority with a quiet push.',
    start: recipe({ light: 'softbox', camera: 'hero-3q', lens: 'natural50', focus: 'full', composition: 'thirds-left', scale: 'balanced', rotation: 'left15', motion: 'still', environment: 'grey', atmosphere: 'warm' }),
    end: recipe({ light: 'rim', camera: 'hero-3q', lens: 'portrait85', focus: 'label', composition: 'center', scale: 'tight', rotation: 'right15', motion: 'push', environment: 'grey', atmosphere: 'contrast' }),
  },
  {
    id: 'obsidian-monolith', familyId: 'hero', label: 'Obsidian Monolith', note: 'Low, centered, carved from darkness.',
    start: recipe({ light: 'split', camera: 'low', lens: 'cinema35', composition: 'symmetry', scale: 'balanced', rotation: 'neutral', environment: 'black', atmosphere: 'nocturne' }),
    end: recipe({ light: 'rim', camera: 'front', lens: 'natural50', focus: 'center', composition: 'center', scale: 'tight', rotation: 'right15', motion: 'push', environment: 'black', atmosphere: 'contrast' }),
  },
  {
    id: 'white-authority', familyId: 'hero', label: 'White Authority', note: 'Editorial clarity without the showroom cliché.',
    start: recipe({ light: 'daylight', camera: 'front', lens: 'portrait85', composition: 'negative-right', scale: 'wide', rotation: 'left15', environment: 'white', atmosphere: 'soft' }),
    end: recipe({ light: 'softbox', camera: 'hero-3q', lens: 'natural50', composition: 'thirds-right', scale: 'balanced', rotation: 'neutral', motion: 'orbit-right', environment: 'white', atmosphere: 'clean' }),
  },
  {
    id: 'low-command', familyId: 'hero', label: 'Low Command', note: 'A grounded angle with controlled tension.',
    start: recipe({ light: 'top', camera: 'low', lens: 'wide24', focus: 'front', composition: 'thirds-left', scale: 'wide', rotation: 'right15', environment: 'grey', atmosphere: 'cool' }),
    end: recipe({ light: 'rim', camera: 'low', lens: 'cinema35', focus: 'center', composition: 'center', scale: 'tight', rotation: 'left15', motion: 'pull', environment: 'grey', atmosphere: 'contrast' }),
  },
  {
    id: 'gilded-edge', familyId: 'detail', label: 'Gilded Edge', note: 'Follow the warm material line.',
    start: recipe({ light: 'rim', camera: 'detail', lens: 'macro105', focus: 'label', composition: 'thirds-left', scale: 'macro', rotation: 'left15', view: 'detail', motion: 'still', environment: 'black', atmosphere: 'warm' }),
    end: recipe({ light: 'split', camera: 'detail', lens: 'macro105', focus: 'shallow', composition: 'thirds-right', scale: 'macro', rotation: 'right15', view: 'detail', motion: 'slide-right', environment: 'black', atmosphere: 'contrast' }),
  },
  {
    id: 'material-study', familyId: 'detail', label: 'Material Study', note: 'A clean surface read with measured parallax.',
    start: recipe({ light: 'softbox', camera: 'side', lens: 'portrait85', focus: 'front', composition: 'center', scale: 'tight', rotation: 'neutral', view: 'profile', motion: 'still', environment: 'grey', atmosphere: 'clean' }),
    end: recipe({ light: 'top', camera: 'detail', lens: 'macro105', focus: 'label', composition: 'diagonal', scale: 'macro', rotation: 'tilt-right', view: 'detail', motion: 'push', environment: 'grey', atmosphere: 'soft' }),
  },
  {
    id: 'top-mark', familyId: 'detail', label: 'Top Mark', note: 'Graphic geometry from directly above.',
    start: recipe({ light: 'top', camera: 'top', lens: 'natural50', focus: 'full', composition: 'symmetry', scale: 'tight', rotation: 'neutral', view: 'top', environment: 'white', atmosphere: 'clean' }),
    end: recipe({ light: 'rim', camera: 'top', lens: 'portrait85', focus: 'center', composition: 'diagonal', scale: 'macro', rotation: 'tilt-left', view: 'top', motion: 'orbit-left', environment: 'white', atmosphere: 'cool' }),
  },
  {
    id: 'orbit-ledger', familyId: 'motion', label: 'Orbit Ledger', note: 'A precise arc with a locked visual center.',
    start: recipe({ light: 'softbox', camera: 'hero-3q', lens: 'natural50', focus: 'center', composition: 'center', scale: 'balanced', rotation: 'left15', motion: 'orbit-left', environment: 'grey', atmosphere: 'warm' }),
    end: recipe({ light: 'rim', camera: 'rear-3q', lens: 'portrait85', focus: 'label', composition: 'thirds-right', scale: 'tight', rotation: 'right15', motion: 'orbit-right', environment: 'grey', atmosphere: 'contrast' }),
  },
  {
    id: 'push-reveal', familyId: 'motion', label: 'Push Reveal', note: 'From context to product detail.',
    start: recipe({ light: 'daylight', camera: 'front', lens: 'wide24', focus: 'full', composition: 'negative-left', scale: 'wide', rotation: 'neutral', motion: 'push', environment: 'white', atmosphere: 'soft' }),
    end: recipe({ light: 'split', camera: 'hero-3q', lens: 'portrait85', focus: 'label', composition: 'center', scale: 'tight', rotation: 'right15', motion: 'push', environment: 'white', atmosphere: 'clean' }),
  },
  {
    id: 'side-track', familyId: 'motion', label: 'Side Track', note: 'Horizontal energy without losing product authority.',
    start: recipe({ light: 'rim', camera: 'side', lens: 'cinema35', focus: 'front', composition: 'negative-right', scale: 'balanced', rotation: 'left15', view: 'profile', motion: 'slide-left', environment: 'black', atmosphere: 'cool' }),
    end: recipe({ light: 'split', camera: 'hero-3q', lens: 'natural50', focus: 'center', composition: 'negative-left', scale: 'balanced', rotation: 'right15', view: 'perspective', motion: 'slide-right', environment: 'black', atmosphere: 'nocturne' }),
  },
  {
    id: 'rise-hold', familyId: 'motion', label: 'Rise & Hold', note: 'A restrained vertical reveal.',
    start: recipe({ light: 'top', camera: 'low', lens: 'cinema35', focus: 'front', composition: 'center', scale: 'tight', rotation: 'neutral', motion: 'rise', environment: 'grey', atmosphere: 'contrast' }),
    end: recipe({ light: 'softbox', camera: 'hero-3q', lens: 'natural50', focus: 'full', composition: 'thirds-left', scale: 'balanced', rotation: 'left15', motion: 'still', environment: 'grey', atmosphere: 'clean' }),
  },
];

export function presetsForFamily(familyId) { return PRESETS.filter((preset) => preset.familyId === familyId); }
export function getPreset(presetId) { return PRESETS.find((preset) => preset.id === presetId) || PRESETS[0]; }
export function getFamily(familyId) { return FAMILIES[familyId] || FAMILIES.hero; }
