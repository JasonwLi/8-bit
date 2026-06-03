// Asset manifest, structured the way the art direction wants it: every CATEGORY
// owns the fixed generation params (size, alignment/framing, and the REQUIRED
// features a subject in that category must have), and each individual asset only
// supplies its variable CHARACTERISTICS (colours, hat, clothing, weapon, …). To
// nail a category you get one right, then batch the rest by swapping characteristics.
//
// A category defines: { w, h, transparent, prompt(traits) }. The prompt() bakes in
// the fixed structure and interpolates the per-asset traits. Sizing is normalised in
// post (gen-sprites trims + refits to a constant fill), so prompts only need to
// guarantee the WHOLE subject is shown — never cropped.
import { CHARACTERS } from '../src/data/characters.js';
import { ENEMIES } from '../src/data/enemies.js';
import { BOSSES, CIV_LIEUTENANTS } from '../src/data/bosses.js';
import { DROP_SLOTS, RARITIES } from '../src/data/equipment.js';
import { THEMES } from '../src/data/themes.js';
import { ABILITIES } from '../src/data/abilities.js';

// ── shared style fragments (the constant "look" across everything) ───────────
// Pushed hard toward FLAT, clean pixel art — Ideogram has no style param, so the
// prompt is the only lever; without this it drifts dark/painterly.
const STYLE = 'clean flat-colour 16-bit SNES pixel art, limited palette, crisp hard-edged pixels, '
  + 'no painterly shading, no gradients, even flat lighting, bright and colourful, '
  + 'bold readable silhouette, strong dark outline, no text, no border';
const HISTORICAL = 'historically accurate authentic period design, grounded with subtle epic flourishes, not cartoonish';
// "full standing figure, every part present" — used by the character category.
const FULLBODY = 'Show the COMPLETE figure from head to toe: headwear, full torso clothing/armour, '
  + 'BOTH arms, BOTH hands, BOTH legs, BOTH feet with boots, and the ENTIRE weapon — nothing cropped or cut off. '
  + 'One single subject, front-facing upright standing pose, centred with a large empty margin (wide full shot)';
// Generic "whole thing, front-facing, not cropped" used by the other categories.
// NOTE: never say "top-down" — Recraft then draws an overhead view that mattes into fragments.
const COMPLETE = 'front-facing side-view, the COMPLETE subject fully shown and centred with a large empty margin, '
  + 'nothing cropped or cut off, one single subject, wide full shot';

const CIV_CULTURE = {
  china: 'Three Kingdoms imperial China', japan: 'Sengoku-era feudal Japan',
  byzantium: 'Byzantine Eastern Roman Empire', sumer: 'ancient Sumer / Mesopotamia',
  rome: 'ancient Imperial Rome / Roman legions', macedon: 'ancient Macedon / Hellenistic Greek phalanx',
  mongolia: 'the medieval Mongol Empire / steppe horde', norse: 'the Viking-age Norse / Scandinavia',
  default: 'ancient imperial',
};

// ── CATEGORY definitions: fixed params + a prompt() that only varies by traits ──
const CATEGORIES = {
  // A playable hero / a boss: a full-body warrior. Required slots: hat, clothing,
  // weapon, boots. Variable per subject: colours, hat, clothing, weapon, archetype.
  character: {
    transparent: true,
    prompt: (t) => `A ${t.colors} ${t.archetype}. `
      + `Wearing ${t.hat}, ${t.clothing}, and boots. Holding ${t.weapon}. `
      + `${FULLBODY}. ${HISTORICAL}. ${STYLE}`,
  },
  enemy: {
    transparent: true,
    prompt: (t) => `${t.desc}${t.colors ? `, ${t.colors}` : ''} — a menacing hostile enemy unit. `
      + `${COMPLETE}. ${HISTORICAL}. ${STYLE}`,
  },
  item: {
    transparent: true,
    prompt: (t) => `A single ${t.slot} equipment item icon — ${t.flavor}. Fantasy RPG loot, the one object ${COMPLETE}. ${STYLE}`,
  },
  prop: {
    transparent: true,
    prompt: (t) => `${t.desc}, a game world prop. The whole object ${COMPLETE}. ${STYLE}`,
  },
  effect: {
    transparent: true,
    prompt: (t) => `${t.desc}, a game visual effect, centred with a large margin, complete, not cropped. ${STYLE}`,
  },
  ability_icon: {
    transparent: true,
    prompt: (t) => `A bold game ability emblem icon: ${t.desc}. A single clear symbol that FILLS most of the icon, centred. ${STYLE}`,
  },
  background: {
    transparent: false,
    // t.desc carries the full per-civ description (ground texture OR faint scenery overlay)
    prompt: (t) => `${t.desc}. Pixel art, fills the entire frame edge to edge, top-down view, no text, no UI.`,
  },
  // Opaque tileable WALL SURFACE texture — a frontal flat stone/masonry face, NOT a
  // top-down scene. No sky, no floor, no door, no room. Just rows of blocks/bricks.
  wall_tile: {
    transparent: false,
    prompt: (t) => `${t.desc}. 16-bit pixel art tileable texture, flat wall surface, stone or brick rows filling the entire frame, no background scene, no sky, no floor, no door, no window, no furniture, evenly lit, no text, no UI.`,
  },
  ui: {
    transparent: true,
    prompt: (t) => `${t.desc} styled with authentic ${t.culture} art and ornament, intricate corners and edges, `
      + `a completely hollow empty centre (only the border is drawn), symmetric, clean pixel art, no text`,
  },
};

// ── per-asset CHARACTERISTICS ────────────────────────────────────────────────
// Heroes: hand-authored, historically grounded, palette-accurate.
const CHARACTER_TRAITS = {
  lubu:     { archetype: 'Three Kingdoms Chinese warrior general', colors: 'deep crimson-red and gold',
              hat: 'a war helmet topped with a tall green pheasant-tail plume', clothing: 'red lacquered lamellar armour',
              weapon: 'a long ornate Chinese halberd polearm (ji) gripped in both hands' },
  nobunaga: { archetype: 'Sengoku Japanese samurai warlord', colors: 'dark navy-blue, black and gold',
              hat: 'a horned samurai kabuto helmet with a golden crest', clothing: 'lacquered samurai plate armour with a red cape',
              weapon: 'a long matchlock tanegashima musket' },
  belisarius:{ archetype: 'Byzantine Eastern Roman general', colors: 'imperial purple, gold and steel',
              hat: 'a plumed crested Roman officer helmet', clothing: 'gold lamellar armour over a purple tunic',
              weapon: 'a sword in one hand and a large round shield on the other arm' },
  gilgamesh:{ archetype: 'Sumerian demigod king of Uruk', colors: 'lapis-blue, white and gold',
              hat: 'a tall ornate golden crown', clothing: 'ornate Mesopotamian royal scale armour',
              weapon: 'a golden ceremonial mace-scepter' },
  caesar:   { archetype: 'Roman dictator-general', colors: 'crimson cloak, gold-trimmed steel lorica',
              hat: 'a laurel wreath over an Attic helmet', clothing: 'muscled cuirass with a red cape',
              weapon: 'a gladius short sword and a pilum javelin' },
  alexander:{ archetype: 'young Macedonian conqueror-king', colors: 'blue and gold',
              hat: 'a plumed Boeotian helmet with a white plume', clothing: 'bronze muscle cuirass with a blue cape',
              weapon: 'a long sarissa pike' },
  genghis:  { archetype: 'Mongol Great Khan', colors: 'brown furs, bronze and dark leather',
              hat: 'a fur-trimmed pointed steppe helmet', clothing: 'lamellar armour over a fur coat',
              weapon: 'a composite recurve bow' },
  ragnar:   { archetype: 'Viking raider-king', colors: 'dark brown furs, iron-grey and silver',
              hat: 'a horned iron Viking helmet', clothing: 'fur cloak over chainmail',
              weapon: 'a throwing axe and a round wooden shield' },
};

// Bosses: champions, lieutenants, final boss — same character template, richer subjects.
const BOSS_TRAITS = {
  caocao:    { archetype: 'Han Chinese warlord chancellor', colors: 'black, gold and crimson', hat: 'a tall imperial warlord crown-helmet', clothing: 'ornate black-and-gold imperial robes over armour', weapon: 'a long jian straight-sword' },
  hideyoshi: { archetype: 'Japanese unifier warlord', colors: 'gold, brown and red', hat: 'an ornate golden sunburst kabuto helmet', clothing: 'gilded ceremonial samurai armour', weapon: 'a war fan and a katana' },
  justinian: { archetype: 'Byzantine emperor', colors: 'imperial purple and gold', hat: 'a jewelled Byzantine imperial crown', clothing: 'purple-and-gold imperial regalia over lamellar', weapon: 'a cross-topped scepter and a sword' },
  enkidu:    { archetype: 'wild primal demigod of Uruk', colors: 'earthy bronze, green and tan', hat: 'a horned beast headdress', clothing: 'primal hide-and-bronze armour', weapon: 'a massive stone-and-bronze club' },
  finalboss: { archetype: 'undying Persian king-of-kings warlord', colors: 'dark crimson, black and tarnished gold', hat: 'a spiked dark royal crown', clothing: 'ominous black-and-gold imperial war armour', weapon: 'a great dark blade' },
  xiahoudun: { archetype: 'one-eyed Chinese cavalry general', colors: 'dark blue and silver', hat: 'a steel war helm and an eyepatch', clothing: 'blue-and-silver lamellar armour', weapon: 'a heavy spear' },
  zhangliao: { archetype: 'veteran Chinese frontier general', colors: 'crimson and gold', hat: 'a plumed war helm', clothing: 'red lacquered armour', weapon: 'a long halberd' },
  shingen:   { archetype: 'Japanese "Tiger" daimyo warlord', colors: 'deep red and white', hat: 'a horned kabuto with a white flame crest', clothing: 'red samurai armour with a fur-trimmed cloak', weapon: 'a commander baton and a sword' },
  masamune:  { archetype: 'one-eyed "Dragon" samurai lord', colors: 'black and gold', hat: 'a black kabuto with a tall golden crescent-moon crest', clothing: 'black lacquered samurai armour', weapon: 'dual katana' },
  narses:    { archetype: 'Byzantine eunuch general', colors: 'blue and gold', hat: 'a Byzantine officer helm', clothing: 'blue-and-gold court armour', weapon: 'a slim sword' },
  heraclius: { archetype: 'Byzantine soldier-emperor', colors: 'purple, gold and steel', hat: 'a golden crested helm', clothing: 'gilded lamellar with a purple cloak', weapon: 'a longsword' },
  sargon:    { archetype: 'first Akkadian empire-builder king', colors: 'bronze and dark brown', hat: 'an Akkadian royal headdress', clothing: 'bronze scale armour with a ringed beard', weapon: 'a curved bronze sickle-sword' },
  hammurabi: { archetype: 'Babylonian law-giver king', colors: 'deep green, gold and lapis', hat: 'a tall Babylonian royal crown', clothing: 'green-and-gold royal robes over scale armour', weapon: 'a royal mace' },
  // Rome bosses
  pompey:   { archetype: 'Roman general and triumvir', colors: 'crimson and gold', hat: 'a crested Attic war helmet with a red plume', clothing: 'lorica musculata with a red general\'s paludamentum cape', weapon: 'a gladius sword and a decorated shield' },
  sulla:    { archetype: 'Roman dictator and general', colors: 'dark crimson and silver', hat: 'a plain iron legionary helmet with a silver transverse crest', clothing: 'lorica hamata chainmail with a dark-red cloak', weapon: 'a gladius and a scutum shield' },
  crassus:  { archetype: 'Roman triumvir and wealthy general', colors: 'dark red and gold', hat: 'a gilded helmet with a dark-red plume', clothing: 'ornate lorica segmentata with gold trim and a dark-red cape', weapon: 'a pilum javelin and a short sword' },
  // Macedon bosses
  philip:   { archetype: 'Macedonian king and military reformer', colors: 'blue and gold', hat: 'a crested Macedonian helmet with a white plume', clothing: 'bronze muscle cuirass over a blue chiton with a blue cape', weapon: 'a sarissa pike' },
  parmenion:{ archetype: 'senior Macedonian general', colors: 'dark blue and gold', hat: 'a crested bronze Corinthian helmet with a gold plume', clothing: 'bronze lamellar armour over a dark-blue tunic', weapon: 'a sarissa and a hoplon shield' },
  craterus: { archetype: 'elite Macedonian cavalry commander', colors: 'royal blue and bright gold', hat: 'a Boeotian cavalry helmet', clothing: 'blue-and-gold muscle cuirass with a gold-trimmed blue cape', weapon: 'a cavalry javelin and a kopis sword' },
  // Mongolia bosses
  subutai:  { archetype: 'supreme Mongol general and strategist', colors: 'dark brown, bronze and dark leather', hat: 'a fur-lined lamellar iron Mongol command helmet', clothing: 'heavy lamellar armour over fur coat with bronze accents', weapon: 'a composite bow and a curved saber' },
  jebe:     { archetype: 'swift Mongol horse-archer general', colors: 'dark brown and bronze', hat: 'a light pointed Mongol leather helmet', clothing: 'light lamellar leather armour over a dark coat', weapon: 'a composite recurve bow with a quiver of arrows' },
  muqali:   { archetype: 'veteran Mongol heavy cavalry commander', colors: 'dark leather and bronze with a dark cape', hat: 'a lamellar iron Mongol helmet with a face guard', clothing: 'heavy bronze-and-leather lamellar armour with a dark cape', weapon: 'a curved Mongol saber and a round shield' },
  // Norse bosses
  hardrada: { archetype: 'Viking king and fearless warrior', colors: 'dark brown furs and silver', hat: 'a large iron Viking helm with a nose guard', clothing: 'heavy chainmail hauberk over a fur-trimmed surcoat with a dark cape', weapon: 'a great double-handed Viking axe' },
  ironside: { archetype: 'legendary Viking jarl and raider', colors: 'dark iron and grey', hat: 'a rounded iron Viking helm with a horn ornament', clothing: 'riveted iron chainmail hauberk and leather bracers', weapon: 'a Viking longsword and a round iron-bossed shield' },
  lagertha: { archetype: 'Norse shieldmaiden and warrior queen', colors: 'pale gold and silver with a dark cape', hat: 'a light iron circlet with a wing ornament over braided blonde hair', clothing: 'light leather-and-mail armour with a dark hooded cape', weapon: 'a bearded axe and a decorated round shield' },
};

// Enemies: generic invaders / machines / creatures — short descriptor per id.
const ENEMY_DESC = {
  soldier: 'an armoured foot-soldier with a sword',
  archer: 'a light leather-clad skirmisher archer drawing a wooden bow',
  machine: 'a hulking armoured siege war-engine on legs',
  ballista: 'a giant wheeled siege ballista — a mounted crossbow bolt-thrower on a wooden frame (a machine, not a person)',
  weaver: 'a swift lightly-armoured human assassin wielding two curved daggers, lean and agile',
  circler: 'a cloaked agile human skirmisher',
  charger: 'a heavy shield-bearing charging brute',
  lunger: 'a lean agile warrior in bright tan leather armour leaping forward holding a long spear, vivid high-contrast colours',
  spreader: 'a soldier with a wide scattergun',
  gunner: 'a rapid-firing human handgunner',
  lobber: 'a stout human grenadier lobbing a bomb',
  harpy: 'a winged harpy monster — a fierce woman-headed bird creature with large feathered wings and sharp talons, in flight',
  catapult: 'a wooden torsion catapult siege machine with a long throwing arm and heavy counterweight on a wheeled wooden frame (a machine, no person)',
  bomber: 'a round black bomb-bodied creature with stubby legs and a lit sparking fuse on top',
  blinker: 'a sorcerer in bright teal-and-gold robes with the hood down, holding a glowing blue orb, vivid high-contrast colours',
  brute: 'a huge hulking heavily-muscled brute in dark crimson-and-iron armour swinging a massive spiked club, broad and menacing',
  golem: 'a massive lumbering stone golem made of grey cracked rock and boulders, glowing runes in its chest, heavy armoured colossus',
  reaver: 'a tall armoured iron reaver knight in dark steel-blue plate armour with a horned helm and a heavy greatsword, grim and imposing',
  // ten new enemies
  jackal: 'a lean fast desert raider in sandy-gold leather armour with a curved dagger in each hand, crouching in a sprinting pose, agile and wiry',
  titan: 'a colossal armoured war titan in dark purple-and-iron plate armour towering over the battlefield, massive fists raised, unstoppable and enormous',
  shaman: 'a sinister tribal shaman in dark green robes and bone ornaments holding a gnarled staff topped with a glowing toxic-green skull, eerie and mystical',
  sentinel: 'a stoic heavy sentinel soldier in polished grey plate armour with a large tower shield and a short stabbing sword, disciplined and immovable',
  vulture: 'a hunched sandy-brown vulture-headed winged creature with a hooked beak and leathery wings spread wide, swooping menacingly in flight',
  shard: 'a jagged animated stone golem shard — a broken chunk of pale grey rock with glowing cracks and two crude rocky fists, crackling with energy',
  repeater: 'a stocky crossbowman in brown leather armour crouching behind a heavy repeating crossbow mounted on a frame, finger on the trigger, intense focus',
  cannoneer: 'a grim black-armoured heavy cannoneer hauling a short stubby hand-cannon pointed forward, smoke and sparks at the muzzle, menacing bulk',
  acolyte: 'a robed dark cult acolyte in deep purple robes with glowing violet eyes and outstretched hands crackling with dark magic energy, unsettling and sinister',
  wraith: 'a translucent ghostly void wraith in dark navy-blue tattered robes with glowing white eyes, partially fading into shadow, ethereal and threatening',
};

export function buildManifest() {
  const items = [];
  const push = (key, category, traits, w, h) => {
    const c = CATEGORIES[category];
    items.push({ key, category, transparent: c.transparent, w, h, prompt: c.prompt(traits) });
  };

  for (const c of Object.values(CHARACTERS)) {
    if (c.id === 'genghis') continue; // the horse-archer is MOUNTED — pushed with a custom prompt below
    push(`char_${c.id}`, 'character', CHARACTER_TRAITS[c.id] || { archetype: c.name, colors: '', hat: 'a helmet', clothing: 'armour', weapon: 'a weapon' }, 48, 48);
  }
  // Genghis rides into battle — a MOUNTED horse-archer (the 'character' FULLBODY template
  // forces a standing figure, so push him as a custom prop-style prompt that allows a mount).
  push('char_genghis', 'prop', { desc: 'a Mongol Great Khan horse-archer MOUNTED on a galloping brown steppe pony, side view facing right: a rider in brown furs and bronze lamellar armour with a fur-trimmed pointed steppe helmet, drawing a composite recurve bow to loose an arrow — dynamic mounted pose, the WHOLE horse and rider visible head to hooves, nothing cropped' }, 56, 48);
  for (const e of Object.values(ENEMIES)) {
    push(`enemy_${e.id}`, 'enemy', { desc: ENEMY_DESC[e.id] || e.name }, e.size || 40, e.size || 40);
  }
  for (const b of Object.values(BOSSES)) {
    push(`boss_${b.id}`, 'character', BOSS_TRAITS[b.id] || { archetype: `${b.name}, champion of ${b.civ}`, colors: '', hat: 'a crown-helm', clothing: 'ornate armour', weapon: 'a weapon' }, b.size || 80, b.size || 80);
  }
  // one icon per slot × rarity — the rarity drives the material/ornamentation + colour
  const RARITY_FLAVOR = {
    common: 'plain worn dull grey iron and leather, no decoration',
    rare: 'fine polished steel with a blue gemstone and modest silver trim',
    epic: 'ornate enchanted with a purple magical glow and gold filigree',
    legendary: 'a radiant legendary artifact, brilliant glowing gold, highly ornate and divine',
  };
  for (const s of DROP_SLOTS) {
    for (const r of RARITIES) {
      push(`icon_${s.id}_${r.id}`, 'item', { slot: s.name, flavor: RARITY_FLAVOR[r.id] }, 48, 48);
    }
  }
  const PROPS = [
    ['rock', 60, 50, 'a large solid grey granite boulder, brightly lit, clear chunky stone texture'], ['pillar', 40, 70, 'a broken ancient stone pillar column'],
    ['crate', 36, 36, 'a wooden breakable crate bound with iron'], ['shrine', 44, 58, 'a small ancient carved stone shrine altar with a bright blue glowing crystal orb on top'],
    ['spikes', 52, 52, 'a cluster of sharp pointed metal spikes sticking straight up out of the ground, a spike trap, clearly spiky and metallic'], ['chest', 32, 28, 'a closed wooden treasure chest with gold trim'],
  ];
  for (const [key, w, h, desc] of PROPS) push(key, 'prop', { desc }, w, h);

  // Environmental DECORATION props — scattered densely by MapSystem to make each
  // battlefield feel like a real, themed place (Vampire-Survivors-style clutter).
  // Non-colliding background flavour. Universal set + a themed set per civ.
  const DECOR = [
    // universal (any battlefield)
    ['decor_grass', 30, 24, 'a small tuft of wild grass blades'],
    ['decor_flowers', 30, 24, 'a small cluster of colourful wildflowers'],
    ['decor_bones', 34, 26, 'a small pile of bleached bones with a skull'],
    ['decor_rubble', 36, 26, 'a small pile of broken grey rocks and rubble'],
    // China — Three Kingdoms
    ['decor_cn_lantern', 40, 58, 'an ornate red Chinese hanging stone lantern on a post'],
    ['decor_cn_banner', 36, 66, 'a tall Three Kingdoms war banner flag on a wooden pole'],
    ['decor_cn_vase', 36, 48, 'a large blue-and-white Chinese porcelain vase'],
    ['decor_cn_tree', 64, 70, 'a gnarled bare twisted leafless tree'],
    // Japan — Sengoku
    ['decor_jp_torii', 64, 58, 'a small red Japanese torii gate'],
    ['decor_jp_cherry', 64, 70, 'a pink cherry blossom sakura tree'],
    ['decor_jp_lantern', 36, 54, 'a grey stone Japanese toro lantern'],
    ['decor_jp_bamboo', 48, 70, 'a cluster of tall green bamboo stalks'],
    // Byzantium
    ['decor_bz_column', 38, 62, 'a broken cracked white marble column ruin'],
    ['decor_bz_statue', 44, 68, 'a weathered white marble statue of a robed figure on a pedestal'],
    ['decor_bz_urn', 36, 46, 'an ornate gold-and-purple Byzantine urn'],
    ['decor_bz_brazier', 36, 56, 'a lit golden fire brazier bowl on a tripod stand'],
    // Sumer
    ['decor_sm_palm', 56, 70, 'a desert date palm tree'],
    ['decor_sm_pot', 34, 40, 'a round terracotta Mesopotamian clay pot'],
    ['decor_sm_obelisk', 32, 64, 'a carved tan sandstone Sumerian obelisk with cuneiform engravings'],
    ['decor_sm_reeds', 42, 60, 'a cluster of tall dry marsh reeds'],
    // Rome
    ['decor_rm_column', 38, 70, 'a fluted white marble Roman column'],
    ['decor_rm_eagle', 44, 64, 'a large golden Roman aquila: a bold eagle with wings spread wide perched atop a short ornate standard with a small red SPQR banner, the eagle big and centered, filling most of the frame'],
    ['decor_rm_cypress', 40, 72, 'a tall dark-green Roman cypress tree'],
    ['decor_rm_statue', 44, 70, 'a white marble statue of a Roman figure in a toga on a stone plinth'],
    // Macedon
    ['decor_mc_column', 38, 68, 'a Greek Doric column of plain pale stone'],
    ['decor_mc_olive', 60, 64, 'a gnarled grey-green olive tree with silvery leaves'],
    ['decor_mc_shield', 44, 46, 'a stack of bronze hoplite round shields with central bosses'],
    ['decor_mc_cypress', 36, 72, 'a slim dark-green cypress tree'],
    // Mongolia
    ['decor_mn_yurt', 72, 54, 'a round white felt Mongol ger yurt with a circular crown opening'],
    ['decor_mn_banner', 48, 70, 'a Mongol tug war standard: a thick wide spray of black and white horsetails fanning out densely at the top of a short pole, the bushy horsetail spray big and centered, filling most of the frame'],
    ['decor_mn_grass', 38, 36, 'a tuft of tall golden-green steppe grass blades'],
    ['decor_mn_cairn', 40, 54, 'an ovoo sacred Mongolian stone cairn adorned with blue khadag cloth'],
    // Norse
    ['decor_no_runestone', 38, 68, 'a carved grey stone runestone inscribed with Norse runes and knotwork'],
    ['decor_no_pine', 56, 74, 'a dark northern pine tree with snow-dusted branches'],
    ['decor_no_longship', 80, 50, 'a wooden Viking longship: a brown clinker-built timber hull with overlapping wooden planks, a row of round painted shields along the side, a single mast, and a carved dragon-head prow at the front; side view, mostly brown wood tones (NOT a green serpent)'],
    ['decor_no_horn', 36, 40, 'a drinking horn resting in a carved wooden stand'],
  ];
  for (const [key, w, h, desc] of DECOR) push(key, 'prop', { desc }, w, h);

  // Per-civ GAMEPLAY objects — solid obstacles (rock + structural block), breakable
  // containers, and shrines. MapSystem picks the civ-appropriate key (falling back to
  // the generic placeholder). Themed so a desert doesn't get a blue marble pillar.
  const GAMEPLAY = [
    // China — Three Kingdoms
    ['rock_china', 56, 46, 'a large weathered grey boulder with faint green moss'],
    ['block_china', 46, 66, 'a carved stone Chinese guardian lion foo-dog statue on a plinth'],
    ['crate_china', 40, 40, 'a wooden breakable crate bound with rope and iron brackets'],
    ['shrine_china', 52, 62, 'a small ornate red-and-gold Chinese ancestral altar shrine with a bright glowing orb on top'],
    // Japan — Sengoku
    ['rock_japan', 56, 46, 'a large rounded grey boulder covered in green moss'],
    ['block_japan', 42, 66, 'a tall grey stone Japanese ishidoro lantern pedestal'],
    ['crate_japan', 42, 42, 'a round wooden sake barrel bound with rope'],
    ['shrine_japan', 52, 62, 'a small red wooden Japanese Shinto hokora shrine with a bright glowing orb on top'],
    // Byzantium
    ['rock_byzantium', 54, 46, 'a broken chunk of pale white marble masonry rubble'],
    ['block_byzantium', 40, 70, 'a tall fluted white marble Corinthian column'],
    ['crate_byzantium', 40, 50, 'a large terracotta amphora jar with two handles'],
    ['shrine_byzantium', 52, 62, 'a small ornate gold Byzantine icon altar shrine with a bright glowing orb on top'],
    // Sumer
    ['rock_sumer', 56, 46, 'a large tan sandstone desert rock'],
    ['block_sumer', 44, 66, 'a weathered broken tan sandstone Sumerian statue of a bearded figure'],
    ['crate_sumer', 42, 46, 'a large round terracotta clay storage jar'],
    ['shrine_sumer', 52, 62, 'a small tan stone stepped Sumerian ziggurat altar shrine with a bright glowing orb on top'],
    // Rome
    ['rock_rome', 56, 46, 'broken marble rubble — chunks of white marble masonry on the ground'],
    ['block_rome', 44, 66, 'a fluted white marble column drum segment on its side'],
    ['crate_rome', 40, 50, 'a terracotta amphora jar in a wooden rack'],
    ['shrine_rome', 52, 62, 'a marble altar topped with a golden aquila eagle and a glowing orb'],
    // Macedon
    ['rock_macedon', 56, 46, 'a mossy rounded grey boulder'],
    ['block_macedon', 42, 66, 'a carved grey stone stele with a faint inscription'],
    ['crate_macedon', 40, 40, 'a wooden supply crate with rope binding'],
    ['shrine_macedon', 52, 62, 'a votive marble altar bearing a Vergina sunburst and a glowing orb'],
    // Mongolia
    ['rock_mongolia', 56, 46, 'a weathered steppe boulder with dry grass at the base'],
    ['block_mongolia', 44, 56, 'a stacked ovoo stone cairn mound'],
    ['crate_mongolia', 42, 44, 'a felt-wrapped bundle of Mongol campaign supplies bound with leather straps'],
    ['shrine_mongolia', 52, 62, 'an ovoo stone cairn shrine draped with blue khadag cloth and a glowing orb'],
    // Norse
    ['rock_norse', 56, 46, 'a frost-covered dark boulder with patches of lichen and snow'],
    ['block_norse', 42, 70, 'a tall carved runestone on a wide base'],
    ['crate_norse', 44, 46, 'a large round wooden barrel bound with dark iron hoops, viewed from the side, big and centered, filling most of the frame'],
    ['shrine_norse', 52, 62, 'a stone altar carved with Norse knotwork patterns and topped with a glowing orb'],
  ];
  for (const [key, w, h, desc] of GAMEPLAY) push(key, 'prop', { desc }, w, h);

  // Slow-zone terrain patches — so the (currently near-invisible) slowing hazards read
  // clearly as swamp / quicksand / tall grass / brambles. Transparent overlay patches.
  const TERRAIN_TEX = [
    ['terrain_swamp', 112, 112, 'a top-down circular patch of murky dark-green swamp water and mud with floating lily pads, reeds and bubbles, clearly a boggy swamp'],
    ['terrain_sand', 112, 112, 'a top-down circular patch of pale tan loose quicksand and sand with concentric ripple rings, clearly a sandy sinkhole'],
    ['terrain_grass', 112, 112, 'a top-down circular clump of tall wild overgrown green grass blades and weeds, a dense meadow tuft patch'],
    ['terrain_thorns', 112, 112, 'a top-down circular patch of dark tangled thorny brambles with sharp red thorns and briars'],
  ];
  for (const [key, w, h, desc] of TERRAIN_TEX) push(key, 'prop', { desc }, w, h);

  // Dungeon ENCOUNTER-ZONE markers — diegetic floor features the player reads to decide
  // whether to approach: TREASURE (a half-spilled loot cache), TRAP (a concealed floor
  // hazard), AMBUSH (signs of waiting enemies). One per civ × type, so they fit the
  // stage's culture AND stay distinguishable. Top-down circular floor overlays, subtle —
  // NOT glowing beacons. (FloorSystem draws enc_<civ>_<kind> at each zone centre.)
  const ENCOUNTERS = [
    // China — Three Kingdoms
    ['enc_china_treasure', 'a small jade-inlaid bronze treasure urn half-buried in grey flagstone with spilled ancient Chinese bronze coins around it'],
    ['enc_china_trap', 'a cracked grey stone floor tile with sharp bamboo spikes jutting up through the cracks, a hidden spike trap'],
    ['enc_china_ambush', 'grey flagstone littered with discarded Three Kingdoms spear tips and fresh muddy footprints, the sign of a waiting ambush'],
    // Japan — Sengoku
    ['enc_japan_treasure', 'a small dark lacquered wooden box tipped open on a stone floor with gold koban oval coins spilling out'],
    ['enc_japan_trap', 'dark wooden floor planks with a partly-open trapdoor revealing sharpened bamboo spikes in the pit below'],
    ['enc_japan_ambush', 'a stone floor scattered with dropped iron shuriken and a disturbed tatami mat, the sign of hidden ambushers'],
    // Byzantium
    ['enc_byzantium_treasure', 'a small gem-studded gold Byzantine reliquary box on a marble floor with a hoard of spilled gold solidus coins'],
    ['enc_byzantium_trap', 'a marble floor tile with a faint square seam and small holes leaking pale green poison gas, a concealed trap'],
    ['enc_byzantium_ambush', 'a marble floor scattered with discarded arrows and a torn purple cloak, the sign of a lurking ambush'],
    // Sumer
    ['enc_sumer_treasure', 'a cracked clay storage jar tipped over on tan mudbrick floor spilling carved lapis-lazuli and gold jewelry'],
    ['enc_sumer_trap', 'cracked tan mudbrick floor collapsing into a pit lined with protruding sharpened wooden stakes'],
    ['enc_sumer_ambush', 'a patch of tan sand with many overlapping footprints and dropped bronze sickle-swords, the sign of an ambush'],
    // Rome
    ['enc_rome_treasure', 'a small ornate iron strongbox open on a mosaic floor with a pile of scattered gold Roman aureus coins'],
    ['enc_rome_trap', 'a mosaic floor panel cracked open over a covered pit lined with iron spikes, a Roman pit trap'],
    ['enc_rome_ambush', 'a cobblestone floor scattered with dropped pila javelins and fresh sandal footprints, the sign of a legionary ambush'],
    // Macedon
    ['enc_macedon_treasure', 'a gold laurel wreath and a hoard of silver Greek tetradrachm coins spilled on a pale marble floor'],
    ['enc_macedon_trap', 'a pale stone floor slab tilted open over a hidden pit with bronze-tipped wooden stakes below'],
    ['enc_macedon_ambush', 'a stone floor scattered with a dropped bronze hoplite shield and broken sarissa pike shafts, the sign of an ambush'],
    // Mongolia
    ['enc_mongolia_treasure', 'an open leather saddlebag on dry steppe earth spilling gold ingots and looted jewelry'],
    ['enc_mongolia_trap', 'a patch of disturbed steppe earth thinly covering a stake-lined pit trap with dry brush over it'],
    ['enc_mongolia_ambush', 'trampled steppe grass with many hoofprints and scattered dropped arrows, the sign of a horse-archer ambush'],
    // Norse
    ['enc_norse_treasure', 'an open wooden chest on a snow-dusted stone floor spilling silver arm-rings, hacksilver and coins'],
    ['enc_norse_trap', 'a frosted wooden floor with a sprung iron bear-trap and protruding iron spikes'],
    ['enc_norse_ambush', 'a patch of snow churned with many bootprints and a dropped iron axe, the sign of a Viking ambush'],
  ];
  for (const [key, desc] of ENCOUNTERS) push(key, 'prop', { desc: `${desc}, viewed from directly above as a small circular feature on the dungeon floor` }, 96, 96);

  // Belisarius's ultimate: a charging cataphract used as a moving sprite (faces right,
  // flipped per charge direction in AbilitySystem).
  push('cataphract', 'prop', { desc: 'a side-view armored Byzantine cataphract heavy cavalry charging to the RIGHT: a barded armored warhorse at full gallop carrying an armored rider in a purple cloak who holds a long couched lance pointing right, dynamic charging pose' }, 96, 64);

  // Alexander's ultimate: a Macedonian Companion cavalryman, used as a galloping charge sprite.
  push('companion_rider', 'prop', { desc: 'a side-view Macedonian Companion cavalry (hetairos) charging to the RIGHT: a galloping warhorse carrying a Greek rider in a bronze muscle cuirass and a blue cloak with a white-plumed Boeotian helmet, couching a long xyston cavalry lance pointing right, dynamic charging pose, blue and bronze and gold' }, 96, 64);

  // Weapon-stab sprites for the THRUST lunge animation (Lü Bu's halberd, Alexander's
  // sarissa) — a single weapon laid horizontally, BLADE/POINT TO THE RIGHT, no hand/arm.
  push('weapon_halberd', 'prop', { desc: 'ONLY an ornate Chinese halberd polearm (ji) laid flat horizontally with its blade and spear-point to the RIGHT: a long dark wooden shaft, a gold crescent axe-blade and a sharp spear tip — just the weapon by itself, no hand, no arm, no person' }, 64, 20);
  push('weapon_sarissa', 'prop', { desc: 'ONLY a very long Macedonian sarissa pike laid flat horizontally with its bronze leaf-shaped spear point to the RIGHT: a long thin wooden shaft and a bronze tip — just the weapon by itself, no hand, no arm, no person' }, 72, 16);

  // Caesar's summoned legionary ally — a small standing Roman legionary, front view.
  push('ally_legionary', 'character', { archetype: 'a Roman legionary soldier', colors: 'red tunic, silver-steel lorica segmentata, gold-trimmed shield', hat: 'an iron legionary helmet', clothing: 'segmented plate armour over a red tunic', weapon: 'a gladius short sword and a large red-and-gold rectangular scutum shield' }, 40, 44);

  // Proper weapon-shaped projectiles for the new heroes (arrows / axe / javelins / lance),
  // BLADE/POINT TO THE RIGHT (rotated to travel direction at runtime). Replace the
  // generic energy-orb fallback the new weapons were using.
  push('proj_composite_bow', 'prop', { desc: 'ONLY a single arrow pointing RIGHT: a thin wooden shaft, a sharp metal arrowhead on the right, feather fletching on the left — just the arrow, no bow, no hand' }, 28, 12);
  push('proj_arrow_storm', 'prop', { desc: 'ONLY a single feathered war arrow pointing RIGHT, gold-brown shaft, sharp steel head on the right — just the arrow' }, 28, 12);
  push('proj_axe_throw', 'prop', { desc: 'ONLY a Viking double-bit throwing axe: a short wooden haft with a steel axe head, seen from the side — just the axe, no hand' }, 26, 26);
  push('proj_pilum_volley', 'prop', { desc: 'ONLY a Roman pilum javelin pointing RIGHT: a long wooden shaft with a thin iron shank and pyramidal point on the right — just the javelin' }, 30, 12);
  push('proj_companion_javelin', 'prop', { desc: 'ONLY a light cavalry javelin pointing RIGHT: a slim wooden shaft with a small iron leaf-head on the right — just the javelin' }, 30, 12);
  push('proj_thrust_sky', 'prop', { desc: 'ONLY an ornate spear/lance head pointing RIGHT: a polished shaft with a gleaming gold spearhead on the right — just the lance, no hand' }, 30, 14);

  push('sweep', 'effect', { desc: 'ONLY a glowing white-and-gold crescent slash arc — a curved swoosh motion trail of energy by itself, no sword, no weapon, no hand, no character, just the arc shape' }, 128, 128);
  // Genghis's Khan's Cleave — a distinct, heavier saber slash (white so it tints to the
  // weapon colour); a thicker, more aggressive double-edged crescent vs the thin 'sweep'.
  push('fx_cleave', 'effect', { desc: 'ONLY a single bold thick curved SABER SLASH arc — a heavy aggressive crescent blade swoosh with a sharp jagged leading edge and trailing motion-streak lines, bright white energy, oriented as a horizontal crescent, no sword, no hand, no character, just the slash arc shape' }, 128, 128);
  push('flame_pool', 'effect', { desc: 'a top-down pool of burning orange fire on the ground' }, 64, 64);
  // Lingering scorched-earth burn patch — used by the heroes' fire-leaving upgrades
  // (Belisarius embers, Incendiary/Cataclysm/Scorch craters). Distinct from the green acid pool.
  push('scorch_fire', 'effect', { desc: 'a top-down circular patch of burning scorched earth — blackened charred ground with bright orange and yellow flames, glowing red embers and smoke, seen from directly above, a fiery hazard zone' }, 64, 64);
  // Genghis's trail hazard — a top-down caltrop/arrow trap field he leaves in his wake.
  push('caltrops', 'effect', { desc: 'a top-down patch of scuffed dark earth bristling with scattered sharp iron caltrops and barbed arrows stuck point-up into the ground — a deadly trap field seen from directly above, brown dirt with glinting steel spikes' }, 48, 48);
  const ABIL_ICON = {
    warcry: 'a red expanding shockwave ring burst',
    barrage: 'a black cannonball with a fiery explosion',
    cataphract: 'a golden charging cavalry lance crossed with a shield',
    meteors: 'a flaming falling meteor with a fire trail',
    testudo: 'a red shield-wall shockwave ring',
    companion_charge: 'a blue cavalry charge streak',
    wrath_of_ra: 'a golden Egyptian sun-disk of Ra firing radiant solar beams',
    sky_arrows: 'a ring of arrows raining down in a circle (an encircling perimeter)',
    berserker: 'a red shockwave ring burst',
  };
  for (const a of Object.values(ABILITIES)) push(`abil_${a.id}`, 'ability_icon', { desc: ABIL_ICON[a.id] || a.name }, 48, 48);

  // AI ability-emblem icons for ALL 12 abilities (each hero's primary + secondary +
  // ultimate). The game/HUD/upgrade/cards reference `abil_icon_<id>` — generating these
  // makes the loaded AI art override the procedural placeholder of the same key.
  const ABILITY_ICONS = [
    // Lü Bu
    ['halberd_sweep', 'a glowing crescent halberd slash arc, a curved blade swoosh of energy'],
    ['thrust_sky', 'a golden spear lance thrusting forward with a sharp pointed spearhead'],
    ['warcry', 'a red expanding shockwave ring burst with a war horn'],
    // Oda Nobunaga
    ['matchlock_volley', 'a steel matchlock musket firing forward with a bright muzzle flash'],
    ['scattershot', 'a short musket blasting a spreading fan of three bullet pellets'],
    ['barrage', 'a black iron cannon firing a cannonball with a fiery explosion'],
    // Belisarius
    ['greek_fire', 'a thrown round clay pot bursting into orange greek-fire flames'],
    ['fireburst', 'a radial starburst ring of orange fire flames erupting outward'],
    ['cataphract', 'an armored Byzantine cataphract horseman charging with a couched lance'],
    // Gilgamesh
    ['divine_arsenal', 'two crossed golden swords inside a circular orbit ring'],
    ['gate_spear', 'a fan of golden spears bursting out of a glowing portal gate'],
    ['meteors', 'a flaming falling meteor with a fiery tail'],
    // Caesar (Rome)
    ['gladius', 'a Roman gladius short sword, blade up'],
    ['pilum_volley', 'three Roman pila javelins in flight'],
    ['testudo', 'a Roman legion shield-wall (testudo) with a red shockwave ring'],
    // Alexander (Macedon)
    ['sarissa', 'a long Macedonian sarissa pike, diagonal'],
    ['companion_javelin', 'a fan of cavalry javelins in flight'],
    ['wrath_of_ra', 'a blazing golden Egyptian sun-disk (the Eye of Ra) firing a sweeping beam of solar fire, radiant gold-and-white sunbeams, a winged-sun emblem'],
    // Genghis (Mongolia)
    ['composite_bow', 'a bold emblem of an iron caltrop: a cluster of four sharp grey-steel metal spikes pointing outward like a jack, with two crossed arrows behind it — dark metal weapon icon, NO plants, NO grass, NO green'],
    ['arrow_storm', 'a radial burst of arrows firing outward in all directions'],
    ['sky_arrows', 'a circular ring of arrows raining down to encircle a target — arrows arranged in a perimeter circle, an encirclement emblem'],
    // Ragnar (Norse)
    ['axe_throw', 'a spinning Viking throwing axe in flight'],
    ['shield_bash', 'a round Viking shield with an iron boss crashing forward'],
    ['berserker', 'a red expanding shockwave ring with a Viking axe at center'],
  ];
  for (const [id, desc] of ABILITY_ICONS) push(`abil_icon_${id}`, 'ability_icon', { desc }, 48, 48);
  // Per-civ battlefield ground (seamless texture) + faint distant scenery overlay.
  // ORGANIC seamless ground — NO regular tiles/paving/grid (that created a visible
  // repeating square grid). Mottled natural terrain, low-contrast so repetition hides.
  const NO_GRID = 'mottled, organic and irregular, NO tiles, NO paving, NO grid, NO straight lines, NO repeating pattern, low contrast, seamless';
  const BG_GROUND = {
    china: `a seamless organic top-down ground of natural packed brown dirt and dry earth with scattered patches of sparse grass and a few small stones, ${NO_GRID}, warm earthy brown tones`,
    japan: `a seamless organic top-down ground of natural green grass and moss with patches of brown dirt and a few scattered fallen leaves, ${NO_GRID}`,
    byzantium: `a seamless organic top-down ground of weathered pale stone and dust with faint cracks and patches of moss, ${NO_GRID}, muted stone tones`,
    sumer: `a seamless organic top-down ground of tan desert sand and dry cracked clay with small scattered pebbles, ${NO_GRID}, warm sandy beige tones, NO purple NO blue`,
    rome: `a seamless organic top-down ground of cracked marble paving fragments and pale dust with scattered rubble chips, ${NO_GRID}, pale warm stone tones`,
    macedon: `a seamless organic top-down ground of dry grassy plain with patches of packed earth and scattered small stones, ${NO_GRID}, dry olive-green and earthy tones`,
    mongolia: `a seamless organic top-down ground of vast open green-gold steppe grass with scattered small stones and dry soil patches, ${NO_GRID}, golden-green grassland tones`,
    norse: `a seamless organic top-down ground of grey rocky frozen tundra with snow patches and patches of lichen-covered stone, ${NO_GRID}, cold grey-blue stone tones`,
    default: `a seamless organic top-down worn grey-brown earth battlefield ground, ${NO_GRID}`,
  };
  const BG_SCENERY = {
    china: 'a faint dark low-contrast seamless silhouette band of distant pagodas, temple rooftops and mountains, muted shadowy tones, NO window, NO frame, NO lattice, mostly dark, very subtle',
    japan: 'a faint, muted, very low-contrast distant backdrop of a torii gate, a Japanese castle and pine trees, dark silhouettes',
    byzantium: 'a faint, muted, very low-contrast distant backdrop of domed Byzantine cathedrals and marble colonnades, dark silhouettes',
    sumer: 'a faint, muted, very low-contrast distant backdrop of a great ziggurat and palm trees, dark silhouettes',
    rome: 'a faint, muted, very low-contrast distant backdrop of Roman temple columns and a tall arched aqueduct, dark silhouettes',
    macedon: 'a faint, muted, very low-contrast distant backdrop of a Greek acropolis with Doric columns and olive trees, dark silhouettes',
    mongolia: 'a faint, muted, very low-contrast distant backdrop of distant round yurts on an open plain with low mountains, dark silhouettes',
    norse: 'a faint, muted, very low-contrast distant backdrop of a Viking longship and a wooden palisade wall, dark silhouettes',
    default: 'a faint, muted, very low-contrast distant backdrop of fortress walls and towers, dark silhouettes',
  };
  for (const t of Object.values(THEMES)) {
    const culture = CIV_CULTURE[t.id] || t.id;
    push(`bg_ground_${t.id}`, 'background', { desc: `${BG_GROUND[t.id] || BG_GROUND.default}, natural earthy colours, no unexpected purple or blue tint` }, 256, 256);
    push(`bg_motif_${t.id}`, 'background', { desc: BG_SCENERY[t.id] || BG_SCENERY.default }, 200, 200);
    push(`ui_frame_${t.id}`, 'ui', { desc: 'a rectangular UI panel border frame', culture }, 256, 256);
  }
  push('ui_banner', 'ui', { desc: 'a wide ornate horizontal title banner ribbon with gold trim', culture: 'ancient imperial' }, 320, 96);

  // ── Dungeon CAVE WALL textures — one per civ, opaque 96×96 tileable tiles.
  // Uses the background category (transparent:false → Recraft pixel_art path) with
  // overhead-view stone surface descriptions that produce flat tileable textures —
  // same approach that works for the bg_ground_* floor tiles.
  const WALL_NO_GRID = 'mottled organic stone, NO regular grid, low contrast, seamless, dark';
  const DUNGEON_WALLS = [
    ['dungeon_wall_china',    `a seamless top-down overhead view of a dark grey cut-stone dungeon floor surface made of rectangular stone blocks with faint jade-green moss in the cracks, ${WALL_NO_GRID}, dark grey tones`],
    ['dungeon_wall_japan',    `a seamless top-down overhead view of a dark aged wooden plank dungeon floor surface with horizontal brown timber boards and pale plaster patches, ${WALL_NO_GRID}, dark brown tones`],
    ['dungeon_wall_byzantium',`a seamless top-down overhead view of a pale marble stone dungeon floor surface with fine mortar joints between cream-white ashlar blocks, ${WALL_NO_GRID}, pale cream and grey tones`],
    ['dungeon_wall_sumer',    `a seamless top-down overhead view of a tan mudbrick dungeon floor surface with rows of warm sandy clay bricks and faint cuneiform scratches, ${WALL_NO_GRID}, warm sandy tan tones`],
    ['dungeon_wall_rome',     `a seamless top-down overhead view of a pale travertine stone surface with irregular warm-beige stone blocks and pale mortar, ${WALL_NO_GRID}, warm pale beige-cream stone tones`],
    ['dungeon_wall_macedon',  `a seamless top-down overhead view of a pale limestone dungeon floor surface with finely cut ashlar stone blocks and visible chisel marks, ${WALL_NO_GRID}, pale grey-white tones`],
    ['dungeon_wall_mongolia', `a seamless top-down overhead view of a dark rough stone dungeon floor surface made of irregular rough steppe rocks and packed earth, ${WALL_NO_GRID}, dark brown-grey tones`],
    ['dungeon_wall_norse',    `a seamless top-down overhead view of a dark frost-rimed stone dungeon floor surface with dark grey blocks and ice crystals and grey lichen patches, ${WALL_NO_GRID}, dark grey-blue tones`],
  ];
  for (const [key, desc] of DUNGEON_WALLS) {
    push(key, 'background', { desc }, 96, 96);
  }

  return items;
}

export const MANIFEST = buildManifest();
export { CATEGORIES, CHARACTER_TRAITS, BOSS_TRAITS };
