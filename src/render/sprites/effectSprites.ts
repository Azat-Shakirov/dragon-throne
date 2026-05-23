// Effect sprite registry. Currently just the per-faction death-puff
// (red blood-cloud HSV-shifted to each banner color). Spawned by
// PixiRenderer when a unit group disappears in hostile combat at its
// destination.

import { Assets, type Texture } from 'pixi.js';
import type { FactionId } from '../../types';

import azureUrl from './effects/death-puff-azure.png';
import crimsonUrl from './effects/death-puff-crimson.png';
import verdantUrl from './effects/death-puff-verdant.png';
import amethystUrl from './effects/death-puff-amethyst.png';
import shadowUrl from './effects/death-puff-shadow.png';

const DEATH_PUFF_URLS: Partial<Record<FactionId, string>> = {
  azure: azureUrl,
  crimson: crimsonUrl,
  verdant: verdantUrl,
  amethyst: amethystUrl,
  shadow: shadowUrl,
};

const deathPuffTextures = new Map<FactionId, Texture>();
let loaded = false;

export async function loadEffectTextures(): Promise<void> {
  if (loaded) return;
  for (const [faction, url] of Object.entries(DEATH_PUFF_URLS)) {
    if (!url) continue;
    const tex = (await Assets.load(url)) as Texture;
    deathPuffTextures.set(faction as FactionId, tex);
  }
  loaded = true;
}

export function getDeathPuffTexture(faction: FactionId): Texture | null {
  return deathPuffTextures.get(faction) ?? null;
}
