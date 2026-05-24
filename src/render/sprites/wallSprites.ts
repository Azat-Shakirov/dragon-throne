// Wall sprite registry. Each painterly wall PNG is the bbox-stretched
// visual for a given biome's walls. Engine wall math is unchanged
// (polylines drive PathSystem clearance + hit detection); the sprite
// just occupies the polyline's bounding box. Biomes without a
// registered wall sprite fall through to the procedural stone-grey
// stroke rendering in PixiRenderer.syncWalls.
//
// v2.9.2: ships two candidates per biome (grass + grass-1, desert +
// desert-1) — the un-suffixed file is the production default; the
// `-1` variant is loaded for the WallSandbox A/B compare and is
// otherwise dormant.

import { Assets, type Texture } from 'pixi.js';
import type { BiomeId } from '../../engine/content/ContentLibrary';

// Vite resolves these at build time; the build will fail loudly if a
// production-path PNG goes missing, which is the right behavior —
// silent fallbacks would mask asset-pipeline regressions.
import grassWallUrl from './walls/wall-grass.png';
import grassWall1Url from './walls/wall-grass-1.png';
// v2.9.5: desert wall sources retired from the registry per author —
// both candidates read poorly enough that procedural stone-grey
// stroke (PixiRenderer.syncWalls' fallback path) is the better
// shipping default for desert walls until a regenerated source
// lands. PNGs stay on disk (game-assets/ sources + the v2.9.2
// processed PNGs at src/render/sprites/walls/wall-desert*.png)
// per the local-file-preservation rule; nothing in the bundle
// references them so they're dead weight only on disk, not in the
// served app. WallSandbox keeps its loadWallAltTextures path for
// the day someone re-enables the entry to A/B fresh candidates.

interface WallVariantUrls {
  primary: string;
  alt?: string;
}

const VARIANT_URLS: Partial<Record<BiomeId, WallVariantUrls>> = {
  grass: { primary: grassWallUrl, alt: grassWall1Url },
};

const primaryTextures = new Map<BiomeId, Texture>();
const altTextures = new Map<BiomeId, Texture>();
let loadedPrimary = false;
let loadedAlt = false;

// Loads only the production-path primary wall textures. Called by
// PixiRenderer at app boot. Skips alt variants (they ship for the
// /?walls A/B sandbox only — pulling them at runtime would waste
// ~670 KB on every level load).
export async function loadWallTextures(): Promise<void> {
  if (loadedPrimary) return;
  for (const [biome, urls] of Object.entries(VARIANT_URLS)) {
    if (!urls) continue;
    const primary = (await Assets.load(urls.primary)) as Texture;
    primaryTextures.set(biome as BiomeId, primary);
  }
  loadedPrimary = true;
}

// Loads the alt-variant textures (wall-grass-1.png, wall-desert-1.png).
// Only WallSandbox calls this — production rendering never reads alts.
export async function loadWallAltTextures(): Promise<void> {
  if (loadedAlt) return;
  for (const [biome, urls] of Object.entries(VARIANT_URLS)) {
    if (!urls?.alt) continue;
    const alt = (await Assets.load(urls.alt)) as Texture;
    altTextures.set(biome as BiomeId, alt);
  }
  loadedAlt = true;
}

export function getWallTexture(biome: BiomeId): Texture | null {
  return primaryTextures.get(biome) ?? null;
}

export function getWallAltTexture(biome: BiomeId): Texture | null {
  return altTextures.get(biome) ?? null;
}
