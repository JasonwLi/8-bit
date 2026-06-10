import Phaser from 'phaser';
import { GAME } from './config.js';
import { Audio } from './systems/AudioManager.js';
import BootScene from './scenes/BootScene.js';
import MenuScene from './scenes/MenuScene.js';
import ConquestScene from './scenes/ConquestScene.js';
import ContractScene from './scenes/ContractScene.js';
import GameScene from './scenes/GameScene.js';
import UIScene from './scenes/UIScene.js';
import UpgradeScene from './scenes/UpgradeScene.js';
import LootScene from './scenes/LootScene.js';
import ArtifactScene from './scenes/ArtifactScene.js';
import PauseScene from './scenes/PauseScene.js';
import SettingsScene from './scenes/SettingsScene.js';
import WinScene from './scenes/WinScene.js';
import GameOverScene from './scenes/GameOverScene.js';
import CombatManualScene from './scenes/CombatManualScene.js';
import TipScene from './scenes/TipScene.js';

const config = {
  type: Phaser.AUTO,
  // QA harness: ?qa=1 runs the game loop on setTimeout instead of requestAnimationFrame —
  // headless CDP sessions can lose rAF after a crash, which froze automated playtests.
  fps: new URLSearchParams(location.search).has('qa') ? { forceSetTimeOut: true } : undefined,
  parent: 'game',
  backgroundColor: GAME.bgColor,
  pixelArt: true,
  roundPixels: true,
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: GAME.width,
    height: GAME.height,
  },
  physics: {
    default: 'arcade',
    arcade: { gravity: { x: 0, y: 0 }, debug: false },
  },
  scene: [BootScene, MenuScene, ConquestScene, ContractScene, GameScene, UIScene, UpgradeScene, LootScene, ArtifactScene, PauseScene, SettingsScene, WinScene, GameOverScene, CombatManualScene, TipScene],
};

window.__bootErrors = [];
window.addEventListener('error', (e) =>
  window.__bootErrors.push(`${e.message} @ ${e.filename || ''}:${e.lineno}:${e.colno}`)
);

// QA/balance harness hooks: lets an automated playtest construct representative
// late-conquest loadouts (gear rolls) without going through hours of real play.
import { rollItem, DROP_SLOTS } from './data/equipment.js';
import { newRun } from './data/campaign.js';
window.__qa = { rollItem, DROP_SLOTS, newRun };
window.addEventListener('unhandledrejection', (e) =>
  window.__bootErrors.push(`promise: ${e.reason}`)
);

window.game = new Phaser.Game(config);

// Browsers block all audio until the user interacts with the page. Unlock the
// audio context and start music on the very first gesture anywhere (not just on
// the game canvas), so the menu theme plays as soon as it's permitted and keeps
// looping across every scene. Scenes pick the right theme via Audio.setTheme().
const unlockAudio = () => {
  Audio.resume();
  Audio.startMusic();
  if (Audio.ctx && Audio.ctx.state === 'running') {
    window.removeEventListener('pointerdown', unlockAudio);
    window.removeEventListener('keydown', unlockAudio);
    window.removeEventListener('touchend', unlockAudio);
  }
};
window.addEventListener('pointerdown', unlockAudio);
window.addEventListener('keydown', unlockAudio);
window.addEventListener('touchend', unlockAudio);
