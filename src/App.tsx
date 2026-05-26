// App — top-level router. Picks which screen to render based on the
// session store. The engine only exists when route === 'game'; other
// routes are pure React and don't allocate any PixiJS resources.

import { useEffect } from 'react';
import { useSessionStore } from './store/sessionStore';
import { useProgressStore } from './store/progressStore';
import { initMusicPlayer, setMusicVolume, setMusicScene } from './audio/musicPlayer';
import { initSfxPlayer, setSfxVolume } from './audio/sfxPlayer';
import { LoginScreen } from './ui/LoginScreen';
import { MainMenu } from './ui/MainMenu';
import { LevelSelect } from './ui/LevelSelect';
import { BattleRoyale } from './ui/BattleRoyale';
import { Settings } from './ui/Settings';
import { Credits } from './ui/Credits';
import { QuitScreen } from './ui/QuitScreen';
import { GameView } from './ui/GameView';
import { EditorView } from './ui/editor/EditorView';
import { VariantSandbox } from './ui/dev/VariantSandbox';
import { BiomeSandbox } from './ui/dev/BiomeSandbox';
import { UnitSandbox } from './ui/dev/UnitSandbox';
import { WallSandbox } from './ui/dev/WallSandbox';

const DEV = import.meta.env.DEV;

export default function App() {
  const route = useSessionStore((s) => s.route);
  const selectedLevelId = useSessionStore((s) => s.selectedLevelId);
  const startLevel = useSessionStore((s) => s.startLevel);
  const navigate = useSessionStore((s) => s.navigate);
  const musicVolume = useProgressStore((s) => s.settings.musicVolume);
  const sfxVolume = useProgressStore((s) => s.settings.sfxVolume);

  // Background music: init once with the persisted volume; the player
  // arms itself on the first user gesture (browser autoplay policy).
  // Subsequent volume changes are pushed live.
  useEffect(() => {
    initMusicPlayer(useProgressStore.getState().settings.musicVolume);
    initSfxPlayer(useProgressStore.getState().settings.sfxVolume);
  }, []);
  useEffect(() => {
    setMusicVolume(musicVolume);
  }, [musicVolume]);
  // Swap the background track by scene: the in-game song plays during a
  // live level, the menu melody everywhere else (menus, level select,
  // settings, credits, battle-royale stub, dev sandboxes). Switching is
  // driven off the route so the user never has to touch the volume slider
  // crossing in/out of a level.
  useEffect(() => {
    setMusicScene(route === 'game' && selectedLevelId !== null ? 'game' : 'menu');
  }, [route, selectedLevelId]);
  useEffect(() => {
    setSfxVolume(sfxVolume);
  }, [sfxVolume]);

  // DEV-only URL bootstrap: ?level=N jumps straight to game view at level N;
  // ?variants jumps to the unit-walk-cycle variant sandbox; ?biomes jumps to
  // the biome-floor preview sandbox. Author tools — production users never
  // hit these.
  useEffect(() => {
    if (!DEV) return;
    const params = new URLSearchParams(window.location.search);
    const rawLevel = params.get('level');
    if (rawLevel !== null) {
      const id = Number(rawLevel);
      if (Number.isInteger(id) && id >= 0) {
        startLevel(id);
        return;
      }
    }
    if (params.has('variants')) {
      navigate('variantSandbox');
    } else if (params.has('biomes')) {
      navigate('biomeSandbox');
    } else if (params.has('units')) {
      navigate('unitSandbox');
    } else if (params.has('walls')) {
      navigate('wallSandbox');
    }
  }, [startLevel, navigate]);

  switch (route) {
    case 'login':
      return <LoginScreen />;
    case 'menu':
      return <MainMenu />;
    case 'levelSelect':
      return <LevelSelect />;
    case 'battleRoyale':
      return <BattleRoyale />;
    case 'settings':
      return <Settings />;
    case 'credits':
      return <Credits />;
    case 'quit':
      return <QuitScreen />;
    case 'game':
      if (selectedLevelId === null) return <MainMenu />;
      return <GameView levelId={selectedLevelId} />;
    case 'editor':
      if (!DEV) return <MainMenu />;
      return <EditorView />;
    case 'variantSandbox':
      if (!DEV) return <MainMenu />;
      return <VariantSandbox />;
    case 'biomeSandbox':
      if (!DEV) return <MainMenu />;
      return <BiomeSandbox />;
    case 'unitSandbox':
      if (!DEV) return <MainMenu />;
      return <UnitSandbox />;
    case 'wallSandbox':
      if (!DEV) return <MainMenu />;
      return <WallSandbox />;
  }
}
