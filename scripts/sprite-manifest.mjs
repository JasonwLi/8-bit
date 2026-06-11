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
  // ── 16 civ signature units ──────────────────────────────────────────────────
  china_bolt_cart: 'a wooden two-wheeled cart lacquered red-and-black with a mounted chu-ko-nu repeating crossbow on top, a Han-era soldier in bronze lamellar armour crouching behind it operating a hand crank, warm amber torchlight',
  china_fire_lance: 'a Song-dynasty foot soldier in dark padded armour holding a thick bamboo tube-spear with the tip trailing orange sparks and grey smoke, belt pouch of ignition powder, rust-red tunic',
  japan_shinobi: 'a Sengoku shinobi in ash-grey kosode and black tabi, half-face wrapped in dark cloth, gripping a straight ninjato at low guard, faint purple smoke trail at feet suggesting teleport residue',
  japan_yari_ashigaru: 'three Ashigaru foot-soldiers in straw-yellow do-maru armour advancing shoulder-to-shoulder, gripping long yari spears at a consistent forward angle, sashimono clan-flag banners on their backs, muted ochre and indigo palette',
  rome_testudo: 'four Roman legionaries in lorica segmentata locked shoulder-to-shoulder beneath a canopy of overlapping scutum shields, visible only from chest-down, iron-red tunics, polished boss ornaments catching light',
  rome_scorpio: 'a heavy Roman iron-shod scorpio bolt-thrower on a low wooden tripod, two legionaries in segmented armour operating the windlass crank, bolt resting in the groove glinting silver, stone-coloured background',
  byzantium_siphon: 'two Byzantine siphonarioi in dark lamellar armour operating a bronze-nozzle pressurised siphon mounted on a two-wheel cart, nozzle glowing orange-red, dark olive uniforms trimmed gold, Greek fire splashing amber',
  byzantium_kataphraktoi: 'a Byzantine cataphract on an armoured horse, rider and mount fully encased in klivanion lamellar plates, kontos lance levelled forward, gold-trimmed purple pennant, deep maroon and burnished-iron palette',
  sumer_war_chariot: 'an Early Dynastic Sumerian war chariot with solid disc wheels, two onager asses in copper-studded harness, a spearman in a fleece-bordered helmet standing on the platform, earth-ochre and copper palette',
  sumer_ashipu: 'an Akkadian ashipu exorcist priest in fringed wool kaunakes robe, bald-shaved head, holding a clay ritual tablet aloft and a lapis-lazuli staff, golden incantation smoke rising around him, lapis-blue and ochre palette',
  macedon_phalangite: 'a Macedonian phalangite in bronze thorax and Macedonian-style helmet with forward-angled crest, gripping a long sarissa pike at low port arms, linothorax shoulder guards, classic bronze and deep-blue palette',
  macedon_peltast: 'an Agrianian javelin skirmisher in short Greek chiton, light leather pelta shield slung on left arm, right arm cocked back mid-throw, sandalled and bareheaded, terracotta and earthy-brown palette with olive shield',
  mongolia_horse_archer: 'a Mongol composite-bow horse archer at full gallop on a stocky steppe pony, torso twisted backward in the Parthian shot, deel coat flaring, recurve bow drawn, earth-brown and rust-red felt palette',
  mongolia_drummer: 'a Mongol naccara drummer astride a painted warhorse, two large copper kettledrums strapped to the horse flanks, drummer striking with curved mallets, silk-wrapped drums bearing tugh insignia, deep red and brass palette',
  norse_berserkr: 'a Norse berserkr in bear-pelt cloak with no armour, bare-chested above tattered trews, dual axes, wild matted beard and hair, eyes wide, body covered in rune-carved self-inflicted cuts, iron-grey and blood-red palette',
  norse_skjaldborg: 'two Norse huscarls shoulder-to-shoulder, round painted shields interlocked edge-to-edge forming a wall, iron-rimmed with knotwork, long spears angled forward above the shield rim, iron byrnies chainmail, blue-grey and forest-green palette',
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
  // ── Per-civ enemy skins: 7 common types × 8 civs ────────────────────────────
  // Prompts combine the type's combat role with era-appropriate gear and palette.
  // Sizes match the base type (soldier:36, archer:34, weaver:30, circler:34,
  // charger:42, lunger:36, brute:48).
  const CIV_ENEMY = {
    // soldier — armoured foot-soldier with sword
    enemy_soldier_china:    { desc: 'a Three Kingdoms Chinese levy soldier in dark brown-and-bronze lamellar armour and a bronze dou helmet, wielding a jian straight-sword', colors: 'dark brown, bronze and red' },
    enemy_soldier_japan:    { desc: 'a Sengoku ashigaru foot-soldier in simple dark iron lamellar armour and a flat jingasa hat, gripping a yari spear', colors: 'dark grey, red and black' },
    enemy_soldier_byzantium:{ desc: 'a Byzantine Roman foot-soldier in steel lamellar armour and a crested iron helmet, holding a sword and a round shield', colors: 'steel-blue, gold and red' },
    enemy_soldier_sumer:    { desc: 'a Sumerian levy soldier in a copper-scale cuirass and a bronze war helmet, bearing a short bronze sword', colors: 'copper, tan and dark brown' },
    enemy_soldier_rome:     { desc: 'a Roman legionary in lorica segmentata plate armour and an imperial-Gallic helmet, holding a gladius sword', colors: 'red, silver-steel and gold' },
    enemy_soldier_macedon:  { desc: 'a Macedonian foot-soldier in bronze linothorax armour and a Boeotian helmet, holding a short kopis sword', colors: 'bronze, blue and tan' },
    enemy_soldier_mongolia: { desc: 'a Mongol warrior in leather lamellar armour and a pointed iron steppe helmet, wielding a curved saber', colors: 'dark brown, bronze and cream' },
    enemy_soldier_norse:    { desc: 'a Viking huscarl in chainmail hauberk and an iron nasal helmet, holding a battle axe and a round wooden shield', colors: 'iron-grey, dark brown and red' },
    // archer — light skirmisher archer
    enemy_archer_china:     { desc: 'a Three Kingdoms Chinese archer in padded green-and-brown cloth armour and a bamboo hat, drawing a bamboo recurve bow', colors: 'green, brown and tan' },
    enemy_archer_japan:     { desc: 'a Sengoku Japanese ashigaru archer in light leather armour and a jingasa hat, drawing a traditional yumi longbow', colors: 'dark brown, tan and black' },
    enemy_archer_byzantium: { desc: 'a Byzantine skirmisher archer in light quilted-linen armour and a leather cap, drawing a composite bow', colors: 'dark green, gold and tan' },
    enemy_archer_sumer:     { desc: 'a Sumerian archer in a simple linen kilt and a leather cap, drawing a short horn bow', colors: 'sandy tan, copper and dark brown' },
    enemy_archer_rome:      { desc: 'a Roman auxiliary archer in scale armour and a Phrygian cap, drawing an eastern composite bow', colors: 'tan, green and dark red' },
    enemy_archer_macedon:   { desc: 'a Macedonian skirmisher archer in a light leather cuirass and a broad-brimmed petasos hat, drawing a short recurve bow', colors: 'tan, bronze and blue' },
    enemy_archer_mongolia:  { desc: 'a Mongol steppe horse-archer on foot in light lamellar leather armour and a pointed steppe cap, drawing a recurve composite bow', colors: 'brown, cream and dark leather' },
    enemy_archer_norse:     { desc: 'a Viking archer in a short tunic and a leather skullcap, drawing a plain wooden longbow', colors: 'dark brown, tan and grey' },
    // weaver — swift assassin with two daggers
    enemy_weaver_china:     { desc: 'a swift Three Kingdoms Chinese assassin in dark silk clothing and a black hood, wielding two jade-hilted butterfly daggers', colors: 'black, jade-green and gold' },
    enemy_weaver_japan:     { desc: 'a swift Sengoku ninja shinobi in a dark grey cloth uniform and a face wrap, wielding two short ninjato blades', colors: 'dark grey and black' },
    enemy_weaver_byzantium: { desc: 'a swift Byzantine court assassin in dark blue tunic with light lamellar shoulder guards, wielding two curved paramerion daggers', colors: 'dark blue, silver and gold' },
    enemy_weaver_sumer:     { desc: 'a swift Sumerian cut-throat in a leather kilt and a plain leather cap, wielding two bronze sickle daggers', colors: 'tan, copper and dark brown' },
    enemy_weaver_rome:      { desc: 'a swift Roman sicarius blade-for-hire in a hooded dark cloak, wielding two pugio daggers', colors: 'dark grey, rust-red and silver' },
    enemy_weaver_macedon:   { desc: 'a swift Macedonian peltast skirmisher in a light linen tunic and a Thracian cap, wielding two kopis short blades', colors: 'tan, bronze and dark blue' },
    enemy_weaver_mongolia:  { desc: 'a swift Mongol blade scout in light leather armour and a dark cloth headwrap, wielding two curved daggers', colors: 'dark leather, bronze and cream' },
    enemy_weaver_norse:     { desc: 'a swift Viking berserker in a plain short tunic with no armour, wielding two hand seax daggers in a frenzy', colors: 'dark brown, tan and blood-red' },
    // circler — cloaked orbiting skirmisher
    enemy_circler_china:    { desc: 'a cloaked Three Kingdoms Chinese cavalry scout in a brown horse-fur cloak and an iron cap, circling with a dao sabre', colors: 'brown, dark red and iron' },
    enemy_circler_japan:    { desc: 'a cloaked Sengoku ronin in a tattered dark grey haori coat, circling with a katana held low', colors: 'dark grey, brown and black' },
    enemy_circler_byzantium:{ desc: 'a cloaked Byzantine skoutatoi skirmisher in a hooded dark cloak and light mail, circling with a short sword', colors: 'dark purple, silver and gold' },
    enemy_circler_sumer:    { desc: 'a cloaked Sumerian scout in a tan linen wrap and a hooded headdress, circling with a bronze khopesh', colors: 'sandy tan, copper and dark brown' },
    enemy_circler_rome:     { desc: 'a cloaked Roman velites skirmisher in a light tunic and a wolf-pelt headdress, circling with a short sword', colors: 'dark grey, tan and red' },
    enemy_circler_macedon:  { desc: 'a cloaked Macedonian hypaspist in a short linen tunic and a leather cap, circling with a short xiphos sword', colors: 'tan, bronze and dark blue' },
    enemy_circler_mongolia: { desc: 'a cloaked Mongol skirmisher in a fur-lined coat and a dark cloth mask, circling with a curved saber', colors: 'dark brown, cream and bronze' },
    enemy_circler_norse:    { desc: 'a cloaked Viking skald-warrior in a long dark cloak and an iron cap, circling with a seax blade', colors: 'dark grey, dark brown and silver' },
    // charger — heavy shield-bearing charging brute
    enemy_charger_china:    { desc: 'a heavy Three Kingdoms Chinese shield-bearer in red lacquered heavy lamellar armour and a great dou helmet, charging forward with a large wooden tower-shield and a heavy mace', colors: 'red, bronze and dark brown' },
    enemy_charger_japan:    { desc: 'a heavy Sengoku ashigaru in thick iron chest plate and a somen full-face mask kabuto, charging with a large rectangular tate shield and a kanabō iron club', colors: 'black, dark iron and dark brown' },
    enemy_charger_byzantium:{ desc: 'a heavy Byzantine skutatos in full iron lamellar armour and a crested ridge helmet, charging with a great oval shield and a heavy kontarion lance', colors: 'steel-blue, dark iron and gold' },
    enemy_charger_sumer:    { desc: 'a heavy Sumerian heavy-spearman in a copper-scale cuirass and a great bronze plumed helmet, charging with a large rectangular wicker-and-copper shield', colors: 'copper, tan and dark brown' },
    enemy_charger_rome:     { desc: 'a heavy Roman praetorian in full lorica segmentata and a Attic crested officer helmet, charging with a large curved scutum shield and a pilum javelin', colors: 'red, silver-steel and gold' },
    enemy_charger_macedon:  { desc: 'a heavy Macedonian hoplite in bronze linothorax with a Corinthian full-face helmet, charging with a large bronze-rimmed hoplon shield', colors: 'bronze, dark blue and tan' },
    enemy_charger_mongolia: { desc: 'a heavy Mongol heavy cavalry trooper on foot in full lamellar iron armour and a face-guard helmet, charging with a large round iron shield', colors: 'dark iron, bronze and dark brown' },
    enemy_charger_norse:    { desc: 'a heavy Viking shieldman in thick chainmail and a padded iron nasal helmet, charging with a huge iron-bossed wooden shield and a heavy war-axe', colors: 'iron-grey, dark brown and blood-red' },
    // lunger — lean agile warrior leaping forward with a long spear
    enemy_lunger_china:     { desc: 'a lean Three Kingdoms Chinese spearman in light tan-and-green leather armour and a bamboo lamellar chest piece, leaping forward with a long qiang spear', colors: 'tan, green and dark brown' },
    enemy_lunger_japan:     { desc: 'a lean Sengoku ashigaru spearman in light bamboo-splint armour and a conical jingasa hat, lunging forward with a long naginata polearm', colors: 'dark brown, tan and red' },
    enemy_lunger_byzantium: { desc: 'a lean Byzantine kontaratoi spearman in light lamellar shoulder plates and a leather cap, lunging forward with a long thrusting lance', colors: 'steel-blue, tan and gold' },
    enemy_lunger_sumer:     { desc: 'a lean Sumerian long-spearman in a simple linen kilt and a leather headband, lunging forward with a long bronze-tipped reed spear', colors: 'tan, copper and dark brown' },
    enemy_lunger_rome:      { desc: 'a lean Roman hastati in light lorica hamata chainmail and a legionary helmet, lunging forward with a long hasta spear', colors: 'red, silver and dark iron' },
    enemy_lunger_macedon:   { desc: 'a lean Macedonian sarissophoros phalangite in light bronze armour and a Phrygian helmet, lunging forward with the tip of a six-metre sarissa pike', colors: 'bronze, blue and tan' },
    enemy_lunger_mongolia:  { desc: 'a lean Mongol light cavalry trooper on foot in a light leather coat and a round leather helmet, lunging forward with a long bamboo cavalry lance', colors: 'dark brown, cream and bronze' },
    enemy_lunger_norse:     { desc: 'a lean Viking hersir warrior in a short tunic and a round iron helm, lunging forward with a long ash-wood spear', colors: 'dark grey, tan and blood-red' },
    // brute — huge hulking heavily-muscled brute with a massive spiked club
    enemy_brute_china:      { desc: 'a huge hulking Three Kingdoms Chinese war-monk in heavy dark iron armour and a horned dou helmet, swinging a massive iron-spiked iron rod (wolf-tooth mace)', colors: 'dark iron, blood-red and gold' },
    enemy_brute_japan:      { desc: 'a huge hulking Sengoku sumo-armoured foot-soldier in black heavy lamellar armour and a horned oni kabuto, swinging a massive iron kanabō spiked club', colors: 'black, dark iron and crimson' },
    enemy_brute_byzantium:  { desc: 'a huge hulking Byzantine heavy tagma warrior in thick full lamellar armour and a great crested ridge helmet, swinging a massive iron-headed war mace', colors: 'dark iron, gold and purple' },
    enemy_brute_sumer:      { desc: 'a huge hulking Sumerian temple guard in thick copper-and-bronze scale armour and a horned bronze helmet, swinging a massive stone-and-bronze spiked mace', colors: 'bronze, copper and dark brown' },
    enemy_brute_rome:       { desc: 'a huge hulking Roman gladiator secutor in heavy lorica plumata armour and a full-visor iron helmet, swinging a massive iron ball-and-chain flail', colors: 'dark iron, crimson and gold' },
    enemy_brute_macedon:    { desc: 'a huge hulking Macedonian war-champion in thick bronze muscle cuirass and a crested Attic helmet, swinging a massive iron-tipped kophinos club', colors: 'bronze, dark blue and gold' },
    enemy_brute_mongolia:   { desc: 'a huge hulking Mongol heavy cavalry champion in full iron lamellar armour and a face-guard helmet with a fur collar, swinging a massive spiked iron mace', colors: 'dark iron, bronze and dark fur' },
    enemy_brute_norse:      { desc: 'a huge hulking Viking berserker jarl in thick iron-ringed chainmail hauberk and a horned great helmet, swinging a massive two-handed double-bit war axe', colors: 'dark iron, dark fur and blood-red' },
  };
  for (const [key, traits] of Object.entries(CIV_ENEMY)) {
    // Size lookup: match base type
    const baseType = key.replace(/^enemy_/, '').replace(/_[a-z]+$/, '');
    const baseDef = Object.values(ENEMIES).find((e) => e.id === baseType);
    const sz = baseDef?.size || 40;
    push(key, 'enemy', traits, sz, sz);
  }

  // ── Artifact icons — one per artifact (ability_icon category, 48×48) ─────────
  const ARTIFACT_ICONS = [
    // Champion relics (8 civ relics)
    ['artifact_heros_sword_china',    'a glowing jade-green Chinese jian straight-sword crossed with a red scroll, Three Kingdoms imperial emblem'],
    ['artifact_heros_sword_japan',    'a gleaming steel Japanese katana in an ornate lacquer scabbard with a golden mon clan crest, Sengoku era relic'],
    ['artifact_heros_sword_byzantium','a jewelled golden Byzantine labarum war standard topped with a Chi-Rho cross emblem, imperial purple and gold'],
    ['artifact_heros_sword_sumer',    'a glowing Sumerian clay tablet with golden cuneiform script, a lapis-lazuli seal stamp beside it, destiny relic'],
    ['artifact_heros_sword_rome',     'a laurel wreath crown of golden leaves with a small SPQR banner, Caesar\'s eternal crown'],
    ['artifact_heros_sword_macedon',  'a long Macedonian sarissa pike with a bronze spearhead on a blue sunburst Vergina star background'],
    ['artifact_heros_sword_mongolia', 'a Mongol composite recurve bow strung with a golden string, Genghis Khan\'s legendary bow emblem'],
    ['artifact_heros_sword_norse',    'a glowing broken golden spear shard — a fragment of Gungnir — with Norse runes and lightning sparks'],
    // General artifacts (11 originals)
    ['artifact_imperial_mandate',     'a golden imperial decree scroll tied with a crimson ribbon and stamped with a red dragon seal, a conqueror\'s decree'],
    ['artifact_jade_seal',            'a jade-green carved seal stone of heaven with a coiled dragon on top, the sacred seal of imperial legitimacy'],
    ['artifact_vanguard_banner',      'a bold red war battle standard banner on a pole with a golden sun emblem, the flag that leads the charge'],
    ['artifact_conquerors_pauldron',  'a single ornate shoulder pauldron armour piece covered in scratched tally marks, a trophy of fallen warlords'],
    ['artifact_bloodpact_ring',       'a dark crimson iron ring with a blood-red gem, a warlord\'s oath ring forged in a dark bloodpact ritual'],
    ['artifact_silk_road_compass',    'a golden bronze navigator\'s compass pointing east, with a glowing gemstone core and fine filigree engravings'],
    ['artifact_shadow_wraith_cloak',  'a dark navy-blue hooded phantom cloak with glowing silver trim and ghostly wisps trailing from its hem'],
    ['artifact_battle_drum',          'a round war drum with taut animal-skin head and two crossed bone drumsticks, a warlord\'s battle rhythm drum'],
    ['artifact_ancient_relic_core',   'a glowing ancient crystalline orb core — a round pulsating violet gem with golden rune filaments inside'],
    ['artifact_philosophers_crown',   'a tall ornate golden philosopher\'s crown with a glowing blue gem, draped with chains of thought and wisdom'],
    ['artifact_eternal_legionary_plate', 'a gleaming breastplate cuirass with Roman SPQR eagle carvings and a golden laurel trim, the eternal armour'],
    // Contract icons (5 contracts)
    ['contract_bloodlust',  'a dripping crimson sword blade with droplets of blood, a pact of carnage and bloodlust'],
    ['contract_horde',      'a cluster of five silhouetted enemy figures pressing forward in a horde, a menacing crowd emblem'],
    ['contract_siege',      'a dark silhouette of a towering fortress gate with thick iron chains barring it, a siege warfare emblem'],
    ['contract_scorched',   'a scorched blackened field of earth with orange flames and ash, a scorched-earth war emblem'],
    ['contract_frailty',    'a cracked dark heart split down the middle with glowing cracks of red, a frailty and weakness emblem'],
  ];
  for (const [key, desc] of ARTIFACT_ICONS) push(key, 'ability_icon', { desc }, 48, 48);

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

  // ── Per-weapon melee SWEEP arcs (PART B visual identity) ─────────────────────
  // Each melee hero's string-step sweep gets a DISTINCT slash silhouette so the four
  // sword/polearm/axe heroes don't share one gold crescent. White-cored so the runtime
  // per-step tint (s.def.color) reads cleanly; fireMeleeArc falls back to 'sweep' if a
  // key is missing. Oriented as a horizontal crescent (rotated to the swing at runtime).
  // Bold SATURATED gold/orange fills (NOT white): the runtime tint (s.def.color)
  // recolours these anyway, and a saturated source survives the matte + reads densely
  // (a near-white arc gets cut to a faint wisp). Routed through RECRAFT_SOLID below.
  push('sweep_halberd_sweep', 'effect', { desc: 'ONLY a long sweeping CRESCENT HALBERD ARC — a wide thin elegant curved polearm slash trail, a graceful elongated SOLID bright gold and orange crescent swoosh with a fine tapering tip, densely filled glowing energy, no weapon, no hand, no character, just the arc shape' }, 128, 128);
  push('sweep_gladius', 'effect', { desc: 'ONLY a short sharp GLADIUS SLASH ARC — a compact tight SOLID bright gold steel sword-cut crescent, a quick clean stabbing slash trail with a hard crisp leading edge, densely filled glowing energy, no sword, no hand, no character, just the slash arc shape' }, 128, 128);
  push('sweep_composite_bow', 'effect', { desc: 'ONLY a curved CLEAVE SLASH ARC — a heavy aggressive sabre cleave crescent with a thick jagged leading edge and trailing motion-streak lines, SOLID bright gold and amber densely-filled glowing energy oriented as a horizontal crescent, no sword, no hand, no character, just the slash arc shape' }, 128, 128);
  push('sweep_axe_throw', 'effect', { desc: 'ONLY a round whirling AXE WHIRL ARC — a chunky thick circular SOLID bright gold axe-spin slash trail forming a heavy rounded crescent loop with rough churning motion streaks, densely filled glowing energy, no axe, no hand, no character, just the whirl arc shape' }, 128, 128);
  push('sweep_sarissa', 'effect', { desc: 'ONLY a sweeping PIKE BUTT-SWEEP ARC — a long thin SOLID bright gold shaft-swing crescent with a sharp leading streak, a fast wide low arc swoosh, densely filled glowing energy, no pike, no hand, no character, just the arc shape' }, 128, 128);

  // Gilgamesh orbital + radial blade projectile (was falling back to the generic
  // placeholder blade): a single SOLID golden divine sword from the Gate of Babylon.
  push('proj_divine_arsenal', 'prop', { desc: 'ONLY a single ornate golden divine sword blade pointing RIGHT — a SOLID FILLED gleaming gold short-sword with a jewelled cross-guard and a glowing lapis-blue gem in the pommel, a Mesopotamian treasury weapon, fully gold-filled NOT hollow, just the blade, no hand, no portal' }, 22, 22);
  push('flame_pool', 'effect', { desc: 'a top-down pool of burning orange fire on the ground' }, 64, 64);
  // Green toxic hazard pool — enemy/boss/siege/trap zones (distinct from the fiery effects).
  push('acid_pool', 'effect', { desc: 'a top-down circular pool of bubbling sickly-green toxic acid sludge — glowing radioactive green ooze with bright lime bubbles, froth and a corrosive caustic glow, seen from directly above, a poisonous hazard zone' }, 64, 64);
  // Lingering scorched-earth burn patch — used by the heroes' fire-leaving upgrades
  // (Belisarius embers, Incendiary/Cataclysm/Scorch craters). Distinct from the green acid pool.
  push('scorch_fire', 'effect', { desc: 'a top-down circular patch of burning scorched earth — blackened charred ground with bright orange and yellow flames, glowing red embers and smoke, seen from directly above, a fiery hazard zone' }, 64, 64);
  // Churned-earth trample mark left by a heavy cavalry CHARGE — distinct from fire scorch.
  push('trample_dust', 'effect', { desc: 'a top-down patch of churned trampled earth — broken brown dirt and mud clods, scattered pebbles and debris, faint overlapping hoofprints, a low kicked-up tan dust cloud, seen from directly above, no fire, no flames' }, 64, 64);
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

  // ── ITEM 1: core pickup + projectile sprites ─────────────────────────────────
  // XP gem — glowing cyan crystal diamond, 16×16. Should read as a desirable XP drop.
  push('gem', 'effect', { desc: 'a single small glowing cyan XP crystal gem — a tiny bright diamond-shaped crystal with an inner cyan-white glow and light blue facets, transparent background, small pixel-art style icon' }, 16, 16);

  // Health drop — classic pixel heart, 18×18 red.
  push('pickup_heart', 'effect', { desc: 'a single classic pixel-art red heart shape — a bright red heart with a small white highlight dot at top-left, solid fully-filled red heart icon, transparent background' }, 18, 18);

  // Enemy projectile orb — kept near-white/warm-white so enemy tinting colours show correctly.
  // The code clears or sets tint per-projectile so a warm-white base ensures tint accuracy.
  push('enemy_proj', 'effect', { desc: 'a single small glowing energy orb projectile — a round luminous sphere with a bright white-ivory core surrounded by a warm pale cream glow and a soft edge, mostly white with subtle warmth, transparent background, small game projectile icon' }, 16, 16);

  // Power-up orb icons (48×48 emblem chips) — shown in HUD as active buff icons.
  push('pu_atk', 'ability_icon', { desc: 'a red attack power emblem icon — a bold upward-pointing golden sword silhouette on a dark crimson background chip, glowing red power orb emblem, small 48x48 game icon' }, 48, 48);
  push('pu_def', 'ability_icon', { desc: 'a blue defense emblem icon — a bold steel-blue shield silhouette on a dark navy background chip, glowing blue defense orb emblem, small 48x48 game icon' }, 48, 48);
  push('pu_spd', 'ability_icon', { desc: 'a green speed emblem icon — a bold bright green lightning bolt silhouette on a dark green background chip, glowing green speed orb emblem, small 48x48 game icon' }, 48, 48);
  push('pu_invuln', 'ability_icon', { desc: 'a yellow invulnerability emblem icon — a bold bright golden 5-pointed star silhouette on a dark amber background chip, glowing gold star orb emblem, small 48x48 game icon' }, 48, 48);

  // Missing primary-weapon projectile sprites — BLADE/POINT TO THE RIGHT (rotated at runtime).
  push('proj_matchlock_volley', 'prop', { desc: 'a single small elongated musket ball or bullet — a slim grey-silver metallic oval/cylinder, dull grey lead colour, solid opaque shape, tiny projectile icon, no gun, no fire, no human' }, 16, 16);
  push('proj_scattershot', 'prop', { desc: 'a single small lead musket ball — a solid round grey metallic bullet, flat matte grey-silver colour, COMPLETELY SOLID OPAQUE filled disc, NOT hollow, NOT outlined, fully filled grey sphere, tiny game projectile' }, 16, 16);

  // Secondary-weapon projectile sprites:
  push('proj_gate_spear', 'prop', { desc: 'ONLY a single SOLID FILLED golden magical spear head — a SOLID FILLED bright gold diamond-shaped arrowhead or spearpoint, fully gold-filled, warm yellow-gold metallic colour, NO hollow outline or lineart, just the solid golden spearhead shape, no handle, no hand' }, 16, 16);
  push('proj_fireburst', 'prop', { desc: 'ONLY a single blazing orange fire bolt pointing RIGHT — a tear-shaped bright orange fireball with a flame tail streaming to the left, vivid hot orange and yellow glow, just the fire bolt, no hand, 16x16 pixel art' }, 16, 16);
  push('proj_greek_fire', 'prop', { desc: 'ONLY a single round ceramic flask/pot of greek fire — a small round orange clay pot with flames bursting from the top, an incendiary projectile, just the flask by itself, no hand, 16x16 pixel art' }, 16, 16);

  // ── Scene emblem icons: mandate contracts, war omens, floor doors, merchant services ──
  // Bold single-symbol emblems (ability_icon category, 48×48) for the choice-screen cards.
  const SCENE_ICONS = [
    // 5 mandate-only contracts (the harder post-conquest mandates) — distinct from the
    // 5 base contract icons that already exist.
    ['contract_iron_elite',  'a bold armoured iron gauntlet fist clenched, plated steel knuckles, an elite heavy-armour emblem'],
    ['contract_war_tithe',   'a golden balance scale weighing a stack of gold coins, a war-tax tithe emblem'],
    ['contract_famine',      'a shattered cracked red heart broken in pieces with no glow, a no-healing famine emblem'],
    ['contract_enrage',      'a burning skull wearing a jagged crown wreathed in orange flames, a boss-enrage emblem'],
    ['contract_deep_budget', 'a tight rank of three dark armoured soldier silhouettes standing shoulder to shoulder holding tall upright spears with pointed metal tips, a massed-reinforcement war-host emblem, grey steel and dark iron, NO plants, NO leaves, NO bush'],

    // 10 war omens (replace plain colour circles on OmenScene cards)
    ['omen_comet',         'a streaking purple comet — a bright star with a long glowing violet tail, a wandering-star omen'],
    ['omen_iron_frugality','a single gold coin pinched between two fingers, a thrifty discount emblem, golden'],
    ['omen_wind_riders',   'a winged boot — a leather boot with a small feathered wing, a swift wind-rider emblem, cyan-blue'],
    ['omen_gilded_path',   'a golden paved road winding into the distance lined with gold coins, a gilded-path emblem'],
    ['omen_old_wounds',    'a bandaged scar — crossed cloth bandages over a healed gash with a drop of blood, an old-wounds emblem, orange-red'],
    ['omen_beast_tongue',  'a fanged open beast maw with sharp teeth and a snarl, a green beast-tongue emblem'],
    ['omen_warlord_tax',   'a golden set of tithe scales over a small coin pile, a warlord-tax emblem, amber-gold'],
    ['omen_iron_spine',    'an armoured upright spine of iron vertebrae plates, a sturdy iron-spine emblem, steel-blue'],
    ['omen_blood_debt',    'a dripping red blood droplet over a small ledger mark, a blood-debt emblem, crimson-red'],
    ['omen_shattered_sky', 'a cracked sky with a forked white lightning bolt splitting it, a shattered-sky emblem, pale violet'],

    // 5 floor-door types
    ['door_vault',  'a barred golden treasure vault door — a heavy iron-barred door with a gold coin pile glinting behind the bars'],
    ['door_horde',  'a wall of massed red spears and shields pressing forward through a dark doorway, a horde emblem'],
    ['door_cursed', 'a dark stone door marked with a glowing purple hexagram curse rune, an ominous cursed door'],
    ['door_shrine', 'a serene red Japanese torii gate over a calm glowing altar, a peaceful sanctuary door'],
    ['door_normal', 'a plain grey stone archway doorway, an ordinary simple descent, neutral stone tones'],

    // 4 merchant service cards
    ['svc_heal',           'a red heart-shaped healing flask — a round glass vial filled with glowing red healing potion shaped like a heart, a heal emblem'],
    ['svc_banish',         'an open outstretched hand pushing away with a sweeping motion, a banishing-hand emblem, amber-orange'],
    ['svc_reroll',         'two curved cycling arrows forming a circle, a refresh/reroll emblem, pale lavender'],
    ['svc_cursed_bargain', 'a glowing purple cursed gem cut diagonally in half with a small price tag, a half-price cursed-bargain emblem'],
  ];
  for (const [key, desc] of SCENE_ICONS) push(key, 'ability_icon', { desc }, 48, 48);

  return items;
}

export const MANIFEST = buildManifest();
export { CATEGORIES, CHARACTER_TRAITS, BOSS_TRAITS };
