// Projectile sprite registry. Maps each tower level to its visual
// projectile. PixiRenderer.drawTowerBeams uses this in place of the
// solid-color beam line when a sprite is registered for the firing
// tower's level.
//
// v2.9.2: Tower L1 → arrow, L2 → ballista-bolt, L3 → cannonball.
// Matches the visual weight progression (light arrow → heavy bolt
// → siege cannonball) without changing tower damage/rate balance.

import { Assets, type Texture } from 'pixi.js';

import arrowUrl from './projectiles/arrow.png';
import ballistaBoltUrl from './projectiles/ballista-bolt.png';
import cannonballUrl from './projectiles/cannonball.png';

export type ProjectileId = 'arrow' | 'ballista-bolt' | 'cannonball';

const SPRITE_URLS: Record<ProjectileId, string> = {
  arrow: arrowUrl,
  'ballista-bolt': ballistaBoltUrl,
  cannonball: cannonballUrl,
};

const textures = new Map<ProjectileId, Texture>();
let loaded = false;

export async function loadProjectileTextures(): Promise<void> {
  if (loaded) return;
  for (const [id, url] of Object.entries(SPRITE_URLS)) {
    const tex = (await Assets.load(url)) as Texture;
    textures.set(id as ProjectileId, tex);
  }
  loaded = true;
}

export function getProjectileTexture(id: ProjectileId): Texture | null {
  return textures.get(id) ?? null;
}

// Map a tower level (1, 2, 3+) to the projectile sprite it fires.
// Levels above 3 keep firing cannonballs.
export function projectileForTowerLevel(level: number): ProjectileId {
  if (level <= 1) return 'arrow';
  if (level === 2) return 'ballista-bolt';
  return 'cannonball';
}
