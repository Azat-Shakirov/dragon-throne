// Spell sprite registry. PixiRenderer overlays the matching texture
// on the targeted node when a spell visual is active.
//
// v2.9.2: freeze ships first.
// v2.11.1: starve (thorn-and-skull wreath) + sabotage (gold-coin wreath)
// PNGs added — processed from the author's drops via
// game-assets/process_spell_overlays.py (rembg cutout → cropped → 256 px).

import { Assets, type Texture } from 'pixi.js';

import freezeUrl from './spells/freeze.png';
import starveUrl from './spells/starve.png';
import sabotageUrl from './spells/sabotage.png';

export type SpellSpriteId = 'freeze' | 'starve' | 'sabotage';

const SPRITE_URLS: Partial<Record<SpellSpriteId, string>> = {
  freeze: freezeUrl,
  starve: starveUrl,
  sabotage: sabotageUrl,
};

const textures = new Map<SpellSpriteId, Texture>();
let loaded = false;

export async function loadSpellTextures(): Promise<void> {
  if (loaded) return;
  for (const [id, url] of Object.entries(SPRITE_URLS)) {
    if (!url) continue;
    const tex = (await Assets.load(url)) as Texture;
    textures.set(id as SpellSpriteId, tex);
  }
  loaded = true;
}

export function getSpellTexture(id: SpellSpriteId): Texture | null {
  return textures.get(id) ?? null;
}
