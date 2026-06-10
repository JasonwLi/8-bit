// ── Per-civilization flavour data ─────────────────────────────────────────────
// ITEM A: civId -> { enemyTypeId: localizedName }
// Full coverage: all 28 enemy types × all 8 civs.
// Military/human types use period-accurate unit names.
// Fantasy/creature types use names drawn from that civ's own mythology/folklore
// so the generic art reads as that civ's own creature.
export const CIV_ENEMY_NAMES = {
  china: {
    // ── Military humanoids ───────────────────────────────────────────────────
    soldier:   'Levy Spearman',          // basic conscript foot-soldier
    archer:    'Crossbowman',            // Chinese chu-ko-nu crossbow
    weaver:    'Jian Assassin',          // swift dual-blade agent
    circler:   'Shadow Cavalry Scout',   // mounted flanker
    charger:   'Iron Cavalry',           // heavy horse-charge
    lunger:    'Halberdier',             // qiang/ji polearm
    brute:     'Wolf-Tooth Monk',        // iron-rod war monk
    sentinel:  'Iron Turtle Guard',      // tower-shield heavy
    reaver:    'Dark Iron Raider',       // fast armoured chaser
    repeater:  'Chu-Ko-Nu Crossbowman',  // rapid bolt repeater
    cannoneer: 'Fire-Cannon Crew',       // gunpowder heavy
    gunner:    'Fire-Lance Soldier',     // early Chinese firearm
    spreader:  'Bomb-Arrow Thrower',     // fan of incendiary bolts
    lobber:    'Fire-Ox Rusher',         // suicidal flaming-bull lobber
    catapult:  'Huihui Pao Crew',        // counterweight trebuchet
    bomber:    'Fire-Pot Rusher',        // fuse-carrying suicide runner
    machine:   'Wooden-Ox War Engine',   // mechanical siege walker
    ballista:  'Bed-Crossbow Battery',   // giant mounted jī-nú crossbow
    // ── Mythology / folklore creatures ──────────────────────────────────────
    harpy:     'Fenghuang Swooper',      // divine phoenix-bird of Chinese legend
    vulture:   'Peng Shadow',            // monstrous Peng bird from Zhuangzi
    jackal:    'Ye Ren Harrier',         // wild-man spirit of the mountain wastes
    shaman:    'Wu Sorcerer',            // 巫 ritual sorcerer/diviner
    acolyte:   'Jiangshi Acolyte',       // hopping undead cult servant
    blinker:   'Bi Fang Flame-Mage',     // one-legged fire-bird spirit turned caster
    wraith:    'Hungry Ghost',           // 餓鬼 Egui, wandering famished spirit
    shard:     'Terracotta Shard',       // animated fragment of a terracotta golem
    golem:     'Terracotta Colossus',    // giant animated clay guardian
    titan:     'Armoured Mountain God',  // 山神 earthbound deity made flesh
  },
  japan: {
    // ── Military humanoids ───────────────────────────────────────────────────
    soldier:   'Ashigaru',               // common foot-soldier
    archer:    'Yumi Ashigaru',          // bow-armed foot-soldier
    weaver:    'Kunoichi',               // female ninja assassin
    circler:   'Shinobi',               // shadow operative circler
    charger:   'Mounted Samurai',        // cavalry charger
    lunger:    'Naginata Monk',          // warrior-monk with naginata
    brute:     'Sumo-Armoured Brawler',  // heavy kanabō brute
    sentinel:  'Armoured Samurai',       // full-plate tower-shield defender
    reaver:    'Rōnin',                  // masterless sword-for-hire chaser
    repeater:  'Rapid-Fire Arbalester',  // multi-bolt burst repeater
    cannoneer: 'Ōzutsu Gunner',          // large-bore hand-cannon
    gunner:    'Tanegashima Gunner',     // matchlock musketeer
    spreader:  'Flame-Scroll Caster',    // fan of burning paper-tag bolts
    lobber:    'Teppō Grenadier',        // bomb-lobbing foot-soldier
    catapult:  'Ōhajiki Siege Crew',     // Japanese torsion catapult crew
    bomber:    'Kamikaze Rusher',        // suicidal fuse-bearer
    machine:   'Mechanical Kara-Karakuri', // clockwork automaton walker
    ballista:  'Ō-Yumi Ballista',        // giant war-bow siege engine
    // ── Mythology / folklore creatures ──────────────────────────────────────
    harpy:     'Tengu Swooper',          // mountain goblin bird-warrior
    vulture:   'Raijū Swooper',          // thunderbeast in bird form
    jackal:    'Tanuki Harrier',         // shapeshifting trickster spirit
    shaman:    'Onmyōji',               // court diviner and yin-yang sorcerer
    acolyte:   'Gaki Acolyte',          // hungry-ghost cult servant
    blinker:   'Kitsune Illusionist',    // fox-spirit trickster mage
    wraith:    'Onryō',                  // vengeful spirit / revenant
    shard:     'Tsukumogami Splinter',   // awakened animated object fragment
    golem:     'Oni Stone-Golem',        // demon-animated stone giant
    titan:     'Daidarabotchi',          // colossal earth-giant of folklore
  },
  byzantium: {
    // ── Military humanoids ───────────────────────────────────────────────────
    soldier:   'Tagmata Soldier',        // imperial household regiment
    archer:    'Skutatos Archer',        // shield-and-bow skirmisher
    weaver:    'Varangian Scout',        // Norse mercenary blade-dancer
    circler:   'Stratiotai Flanker',     // provincial cavalry scout
    charger:   'Cataphract',             // heavily armoured cavalry
    lunger:    'Akritoi Lancer',         // border-guard spearman
    brute:     'Varangian Guard',        // elite axe-bearing bodyguard
    sentinel:  'Scutum Wall',            // shield-wall heavy
    reaver:    'Peltast',               // light fast pursuer
    repeater:  'Gastraphetes Repeater',  // belly-bow rapid repeater
    cannoneer: 'Cheirosiphon Crew',      // hand-siphon greek-fire projector
    gunner:    'Greek Fire Siphonator',  // pressurised fire-siphon
    spreader:  'Liquid Fire Hurler',     // fan of greek-fire grenades
    lobber:    'Petrariae Crew',         // stone-throwing torsion engine
    catapult:  'Manganikon Crew',        // heavy counterweight trebuchet
    bomber:    'Fire-Pot Carrier',       // suicidal incendiary runner
    machine:   'Tortoise War Engine',    // armoured siege-ram on legs
    ballista:  'Toxoballista Crew',      // Byzantine mounted bolt-thrower
    // ── Mythology / folklore creatures ──────────────────────────────────────
    harpy:     'Strix Night-Harpy',      // blood-drinking night-owl witch (Byzantine/Roman folk)
    vulture:   'Aētos Swooper',          // giant divine eagle of Greek myth
    jackal:    'Keres Harrier',          // death-spirit of violent slaughter
    shaman:    'Magus Thaumaturge',      // wonder-worker drawing on ancient Persian magic
    acolyte:   'Nekydaimon Acolyte',     // underworld shade cult servant
    blinker:   'Empusa Glamour-Witch',   // shape-shifting demoness from Greek tradition
    wraith:    'Lamia Revenant',         // child-devouring undead spirit of Byzantine lore
    shard:     'Marble Automaton Shard', // fragment of a shattered bronze Talos-type guardian
    golem:     'Talos Bronze Golem',     // giant bronze automaton from Argonautica
    titan:     'Gigante Colossus',       // earth-born giant of Greek cosmogony
  },
  sumer: {
    // ── Military humanoids ───────────────────────────────────────────────────
    soldier:   'Sumerian Spearman',      // levy copper-spear soldier
    archer:    'Bowman of Ur',           // short-horn-bow archer
    weaver:    'Khor Knife-Runner',      // swift bronze-dagger skirmisher
    circler:   'Temple Guard',           // orbiting sanctuary guardian
    charger:   'War Chariot Runner',     // chariot-mounted charge infantry
    lunger:    'Reed-Stalker',           // long-spear ambush leaper
    brute:     'Ziggurat Enforcer',      // heavy temple guard bruiser
    sentinel:  'Bronze Sentinel',        // armoured tower-shield heavy
    reaver:    'Lapis Raider',           // armoured fast pursuer
    repeater:  'Composite-Bow Skirmisher', // rapid-fire composite-bow unit
    cannoneer: 'Sling-Staff Hurler',     // heavy stone-lobbing cannoneer
    gunner:    'Scorpio Operator',       // torsion bolt-shooting crew (Akkadian era)
    spreader:  'Incense Caster',         // fan of burning ash
    lobber:    'Clay-Pot Grenadier',     // clay incendiary lob
    catapult:  'Sling Crew',             // siege torsion engine
    bomber:    'Fire-Reed Rusher',       // suicidal burning-reed runner
    machine:   'Copper War Engine',      // mythological mechanical siege construct
    ballista:  'Reed Bolt-Thrower',      // large mounted tension bolt-caster
    // ── Mythology / folklore creatures ──────────────────────────────────────
    harpy:     'Anzu Swooper',           // lion-eagle storm-demon of Akkadian myth
    vulture:   'Imdugud Harrier',        // thunderbird / lion-headed eagle Anzû variant
    jackal:    'Asag Harrier',           // demon of the wilderness from Sumerian texts
    shaman:    'Āšipu',                  // Mesopotamian exorcist-sorcerer
    acolyte:   'Kur-Shade Acolyte',      // slave-shade of the Great Below
    blinker:   'Ugallu Blink-Sorcerer',  // lion-headed weather demon who can leap
    wraith:    'Eṭemmu',                 // ghost of the unburied dead (Sumerian lore)
    shard:     'Mud-Brick Shard',        // animated fragment of a clay guardian
    golem:     'Enkimdu Clay-Golem',     // animated clay colossal guardian
    titan:     'Huwawa Earth-Titan',     // monstrous cedar-forest guardian of Gilgamesh epic
  },
  rome: {
    // ── Military humanoids ───────────────────────────────────────────────────
    soldier:   'Legionary',             // standard heavy foot-soldier
    archer:    'Sagittarius',           // eastern-auxiliary archer
    weaver:    'Velite',               // light skirmisher sword-dancer
    circler:   'Exploratores',          // cavalry scout orbiter
    charger:   'Equites',              // cavalry charger
    lunger:    'Hastati',              // thrusting-spear leaper
    brute:     'Secutor Gladiator',    // gladiatorial heavy brute
    sentinel:  'Tortoise Guard',       // testudo-formation heavy
    reaver:    'Triarius',             // fast iron-armoured chaser
    repeater:  'Arcuballista Crew',    // rapid-fire bolt repeater
    cannoneer: 'Scorpio Crew',         // small torsion bolt-caster
    gunner:    'Manuballista Operator', // rapid hand-ballista
    spreader:  'Pilum Volley',         // fan of thrown javelins
    lobber:    'Funditores',           // sling-stone lob
    catapult:  'Onager Crew',          // kicking-mule stone-thrower
    bomber:    'Fire-Pot Rusher',      // suicidal incendiary rusher
    machine:   'Corvus War Engine',    // boarding-spike siege walker
    ballista:  'Ballista Crew',        // large fixed bolt-thrower
    // ── Mythology / folklore creatures ──────────────────────────────────────
    harpy:     'Furia Swooper',        // Furies / Dirae — winged vengeance spirits
    vulture:   'Strix Harrier',        // night-owl blood-drinking witch-bird of Roman lore
    jackal:    'Lemure Harrier',       // malevolent restless dead of Roman religion
    shaman:    'Haruspex',            // Etruscan-Roman entrail-reading sorcerer
    acolyte:   'Lemur Acolyte',        // shade of the malevolent dead
    blinker:   'Larva Blink-Mage',     // frightening spectre / haunting spirit
    wraith:    'Lemure',              // ghost of the restless Roman dead
    shard:     'Statue Shard',         // animated fragment of a bronze or marble guardian
    golem:     'Colossus Automatone',  // animated bronze war-statue
    titan:     'Gigas Colossus',       // earth-born giant of Roman cosmology
  },
  macedon: {
    // ── Military humanoids ───────────────────────────────────────────────────
    soldier:   'Phalangite',           // sarissa-pike formation soldier
    archer:    'Cretan Archer',        // renowned mercenary archer
    weaver:    'Thracian Peltast',     // swift javelin dancer
    circler:   'Companion Scout',      // light cavalry orbiter
    charger:   'Companion Cavalry',    // elite heavy horse-charger
    lunger:    'Hypaspist',           // shield-bearer thrusting-spear leaper
    brute:     'Shield-Breaker',      // heavy offensive champion
    sentinel:  'Aspis Guard',         // hoplon-shield heavy defender
    reaver:    'Agrianian',           // fast light Agrianian javelin-thrower chaser
    repeater:  'Gastraphetes Crew',    // rapid belly-bow repeater
    cannoneer: 'Torsion Catapult',    // heavy stone-caster cannon
    gunner:    'Gastraphetes Operator', // hand-held belly-bow rapid fire
    spreader:  'Javelin Thrower',      // fan of thrown javelins
    lobber:    'Lithobolos Crew',      // stone-lob siege engine
    catapult:  'Lithobolos Crew',      // large stone-throwing torsion catapult
    bomber:    'Fire-Pot Rusher',      // incendiary suicide runner
    machine:   'Siege Tower Engine',   // armoured rolling siege tower
    ballista:  'Oxybeles Crew',        // large arrow-shooting siege engine
    // ── Mythology / folklore creatures ──────────────────────────────────────
    harpy:     'Aello Harpy',          // storm-swift Harpy of Greek myth by name
    vulture:   'Stymphalian Swooper',  // bronze-feathered man-eating Stymphalian bird
    jackal:    'Empusa Harrier',       // shape-shifting demoness of the crossroads
    shaman:    'Mantis Diviner',       // seer drawing on oracle-tradition and omen-reading
    acolyte:   'Shade Acolyte',        // eidolon — shade of the Underworld
    blinker:   'Hecate Blink-Mage',    // crossroads-goddess magic wielder
    wraith:    'Eidolon',             // hollow shade / ghost of Greek tradition
    shard:     'Bronze Talos Shard',   // animated fragment of the Talos automaton
    golem:     'Kolossós Golem',       // bronze animated colossus
    titan:     'Gigas Titan',          // earth-born giant who warred against the Olympians
  },
  mongolia: {
    // ── Military humanoids ───────────────────────────────────────────────────
    soldier:   'Steppe Warrior',       // standard mounted/foot soldier
    archer:    'Mongol Horse Archer',  // renowned composite-bow cavalry archer
    weaver:    'Recurve Raider',       // swift dual-blade scout
    circler:   'Flanking Rider',       // orbiting cavalry flanker
    charger:   'Heavy Lancer',         // armoured lance-charge cavalry
    lunger:    'Lasso Hunter',         // rope-and-lance leaping ambusher
    brute:     "Khan's Bodyguard",     // elite iron-armoured protector
    sentinel:  'Lamellar Guard',       // heavy armoured tower-shield sentry
    reaver:    'Nökör Raider',         // fast sworn-retainer chaser
    repeater:  'Rapid-Draw Archer',    // multi-shot burst horse archer
    cannoneer: 'Huǒ Pào Crew',         // Mongol gunpowder cannon crew
    gunner:    'Naphtha Rider',        // naphtha-thrower rapid-fire
    spreader:  'Whistling Arrow',      // fan of signal-whistle arrows
    lobber:    'Petrariae Operator',   // Mongol siege catapult lob
    catapult:  'Siege Engineer',       // torsion trebuchet crew
    bomber:    'Naphtha Rusher',       // suicidal naphtha-pot runner
    machine:   'Armoured Siege Engine', // wheeled armoured siege walker
    ballista:  'Siege Ballista Crew',  // large mounted bolt-caster
    // ── Mythology / folklore creatures ──────────────────────────────────────
    harpy:     'Garuda Swooper',       // great eagle-deity venerated across the steppe-Buddhist world
    vulture:   'Simurgh Harrier',      // great healing/destroying bird of Iranian/Mongol tradition
    jackal:    'Chono Wolf-Spirit',    // Chono — the blue wolf ancestor spirit of the Mongols
    shaman:    'Böö',                  // male Mongolian shamanic practitioner
    acolyte:   'Ongon Acolyte',        // spirit-vessel serving the ancestral ongon spirits
    blinker:   'Eej Blink-Mage',       // Mother Earth spirit capable of displacement
    wraith:    'Sulde Revenant',        // warrior's battle-soul returned as vengeful shade
    shard:     'Öndür Stone Shard',    // animated fragment of a sacred standing stone-guardian
    golem:     'Balbal Stone-Idol',    // animated balbal — a carved warrior standing-stone
    titan:     'Erleg Khan Titan',     // Erleg Khan — ruler of the underworld made earthly
  },
  norse: {
    // ── Military humanoids ───────────────────────────────────────────────────
    soldier:   'Huscarl',             // household warrior
    archer:    'Skald Archer',        // skald-warrior bow-user
    weaver:    'Ulfheðinn Dancer',    // wolf-skin berserker blade-dancer
    circler:   'Ulfheðinn',          // wolf-shirt shadow-orbiter
    charger:   'Einherjar Charger',   // Valhalla's chosen cavalry charger
    lunger:    'Spear-Dane',         // Danelaw thrusting-spear leaper
    brute:     'Berserkr',           // bear-shirt frenzied brute
    sentinel:  'Shield-Wall Guard',  // skjaldborg heavy
    reaver:    'Sea Reaver',         // fast shipboard raider chaser
    repeater:  'Rapid-Draw Longbowman', // burst-fire Norse archer
    cannoneer: 'Ballista Crew',      // Norse-employed siege ballista
    gunner:    'Ballista Rapid Crew', // fast-fire bolt launcher
    spreader:  'Throwing Axeman',    // fan of hurled axes
    lobber:    'Bale-Fire Hurler',   // flaming lob
    catapult:  'Siege Tower Crew',   // Norse siege engine crew
    bomber:    'Berserk Rusher',     // suicidal frenzied bomb-carrier
    machine:   'Serpent War Engine', // Midgard-serpent-themed siege walker
    ballista:  'Ský-Bolter Crew',    // sky-bolt heavy ballista
    // ── Mythology / folklore creatures ──────────────────────────────────────
    harpy:     'Valkyrja Swooper',   // Valkyrie — winged chooser of the slain
    vulture:   'Hræsvelgr Harrier',  // giant eagle at world's edge whose wings make wind
    jackal:    'Warg Harrier',       // Fenrir's kin — giant spirit wolf of destruction
    shaman:    'Seiðr-Witch',        // seiðr practitioner — Norse shamanic magic-worker
    acolyte:   'Draugr Thrall',      // undead barrow-wight cult servant
    blinker:   'Skaði Blink-Mage',   // mountain-goddess capable of swift traversal
    wraith:    'Draugr',             // undead barrow-dweller / Norse revenant
    shard:     'Jötunn Stone Shard', // animated fragment of a Jötunn stone-giant
    golem:     'Hrímþursar Golem',   // frost-giant animated ice-stone construct
    titan:     'Jötunn Colossus',    // ancient earth-giant older than the gods
  },
};

// ── ITEM A2: kindClass — classify every enemy type for elite-title branching ──
// humanoid  → rank + name + epithet (existing soldier format)
// beast     → mythic descriptive title (civ-flavoured creature epithets)
// construct → siegework/machine descriptive title
// spirit    → ethereal/mythic descriptive title
export const KIND_CLASS = {
  soldier:   'humanoid',
  archer:    'humanoid',
  weaver:    'humanoid',
  circler:   'humanoid',
  charger:   'humanoid',
  lunger:    'humanoid',
  brute:     'humanoid',
  sentinel:  'humanoid',
  reaver:    'humanoid',
  repeater:  'humanoid',
  cannoneer: 'humanoid',
  gunner:    'humanoid',
  spreader:  'humanoid',
  lobber:    'humanoid',
  shaman:    'humanoid',  // mortal ritual specialist
  acolyte:   'humanoid',  // mortal cult servant
  jackal:    'beast',     // feral creature harrier
  harpy:     'beast',     // flying predatory creature
  vulture:   'beast',     // aerial swooping creature
  bomber:    'beast',     // creature/bomb hybrid
  wraith:    'spirit',    // undead / ghost
  blinker:   'spirit',    // supernatural caster
  golem:     'construct', // animated stone/clay
  shard:     'construct', // animated fragment
  machine:   'construct', // mechanical war engine
  ballista:  'construct', // siege engine
  catapult:  'construct', // siege engine
  titan:     'construct', // massive armoured war-construct
};

// ── ITEM B: per-civ first-name pools for elite naming (humanoid only) ─────────
// Era-appropriate given names of common soldiers / minor functionaries.
// NO famous historical figures, generals, kings, or recognisable celebrities.
// 28+ per civ, zero collisions with boss names (bosses listed beside each civ).
// china     bosses: Cao Cao, Xiahou Dun, Zhang Liao
// japan     bosses: Toyotomi Hideyoshi, Takeda Shingen, Date Masamune
// byzantium bosses: Emperor Justinian, Narses, Heraclius
// sumer     bosses: Enkidu, Sargon of Akkad, Hammurabi
// rome      bosses: Pompey the Great, Sulla, Crassus
// macedon   bosses: Philip II, Parmenion, Craterus / Krateros
// mongolia  bosses: Subutai, Jebe, Muqali
// norse     bosses: Harald Hardrada, Bjorn Ironside, Lagertha
export const CIV_ELITE_NAMES = {
  china: [
    // Common given-name pairs from Three Kingdoms era commoner registers — no renowned commanders
    'Bao Cheng', 'Wei Lin', 'Tan Hua', 'Mao Fu', 'Kuai Liang',
    'Gou Ang', 'Ding Xuan', 'Xu Rong', 'Pei Yuan', 'Liang Ji',
    'Cao Hong', 'Fan Chou', 'Zhang Xiu', 'Li Feng', 'Wen Pin',
    'Yang Xiu', 'Wang Lang', 'Qiao Rui', 'Jin Xuan', 'Liu Yan',
    'Cheng Yu', 'Xun You', 'Jia Xu', 'Man Chong', 'Dong Zhao',
    'Liu Fu', 'Hua Xin', 'Wang Can', 'Du Ji', 'Zhong Yao',
    'Chen Lin', 'Ruan Yu', 'Xu Gan', 'Ying Yang', 'Lu Cui',
  ],
  japan: [
    // Commoner names and minor retainers from Sengoku provincial rolls
    'Ōhashi', 'Tanaka Gohei', 'Iwata Jirō', 'Kubota Sahei', 'Hayashi Gorō',
    'Nishida Rokubei', 'Matsuda Shichirō', 'Fukuda Hachirō', 'Yamamoto Kuzō', 'Hasegawa Tarō',
    'Shimizu Jūrō', 'Nakano Kihei', 'Ōtani Sahei', 'Kuwahara Ichibei', 'Tsuda Gorō',
    'Aoki Tōzaemon', 'Inoue Kambei', 'Mori Saburō', 'Koga Ichinojō', 'Seki Tahei',
    'Nishimura Jōzaemon', 'Kaneko Sahei', 'Andō Gorō', 'Takagi Kyūzaemon', 'Fujita Saburō',
    'Ōguri Jihei', 'Nagase Rokuzaemon', 'Kawamura Kyūhei', 'Kimura Einosuke', 'Ōno Tōbei',
    'Sakurai Jirō', 'Ōda Saburō', 'Murase Kinpachi', 'Wakabayashi Tōzō', 'Ueno Hankichi',
  ],
  byzantium: [
    // Common Byzantine male and female given names outside the boss pool
    'Bardanios', 'Symbatios', 'Katakalon', 'Andronikos', 'Niketas',
    'Staurakios', 'Artabasdos', 'Melissenos', 'Skleros', 'Botaneiates',
    'Philanthrophenos', 'Angelos', 'Kantakouzenos', 'Doukas', 'Palaiologos',
    'Tiberios', 'Phokas', 'Bardas', 'Zonaras', 'Branas',
    'Kamytzes', 'Dalassenos', 'Mangaphas', 'Vatatzes', 'Tornikes',
    'Gabalas', 'Chamaretos', 'Kontostephanos', 'Prodromos', 'Tzimiskes',
    'Eirene', 'Zoe Karbonopsina', 'Komnene', 'Doukaina', 'Palaiologina',
  ],
  sumer: [
    // Authentic Sumerian personal names from administrative tablets (non-royal)
    'Ur-Dumu', 'Lu-Nanna', 'Amar-Suena', 'Puzur-Enlil', 'Ilum-Bani',
    'Sin-Iqisham', 'Warad-Enlil', 'Ipiq-Adad', 'Imgur-Enlil', 'Kirum',
    'Apil-Sin', 'Nur-Adad', 'Sîn-Muballit', 'Enlil-Bani', 'Lu-Igisa',
    'Nabi-Enlil', 'Ilum-Gamil', 'Imgur-Marduk', 'Sin-Iqisham', 'Girini-Isag',
    'Ilu-Shuma', 'Puzur-Ishtar', 'Gimil-Adad', 'Itur-Asdum', 'Nabi-Ilishu',
    'Sin-Ippasam', 'Massum', 'Ur-Isara', 'Girisu', 'Ku-Ningal',
    'Ur-Nanše', 'Igi-Enlil', 'Nanna-Mansum', 'Dumuzi-Gamil', 'Lugal-Ezem',
  ],
  rome: [
    // Common Roman praenomina and cognomina — soldiers and minor officials, no famous men
    'Gaius', 'Lucius', 'Marcus', 'Quintus', 'Titus',
    'Spurius', 'Manius', 'Kaeso', 'Appius', 'Numerius',
    'Vibius', 'Tertius', 'Sextus', 'Opiter', 'Faustus',
    'Postumus', 'Statius', 'Mettius', 'Novius', 'Pacuvius',
    'Salvius', 'Trebius', 'Vettius', 'Servilius', 'Petronius',
    'Caecilius', 'Licinius', 'Pompeius', 'Aufidius', 'Didius',
    'Naevius', 'Sempronius', 'Titinius', 'Quinctius', 'Hostius',
  ],
  macedon: [
    // Macedonian and Greek commoner names outside boss pool
    'Aristomachos', 'Nikanor', 'Demetrios', 'Antigonos', 'Ptolemaios',
    'Seleukos', 'Laomedon', 'Peithon', 'Archias', 'Andromachos',
    'Balakros', 'Attalos', 'Meleagros', 'Koinos', 'Polyperchon',
    'Olympichos', 'Adaios', 'Kleomenes', 'Philotas', 'Leonnatos',
    'Nearchos', 'Lysimachos', 'Eumenes', 'Perdikkas', 'Kassandros',
    'Diades', 'Epimachos', 'Charias', 'Glaukias', 'Straton',
    'Menandros', 'Kratinos', 'Theopompos', 'Nikodemos', 'Apollodoros',
  ],
  mongolia: [
    // Authentic Mongol period given names of non-famous soldiers and retainers
    'Börte', 'Ambaghai', 'Belgutei', 'Khasar', 'Temüge',
    'Bogorchu', 'Jelme', 'Chilaun', 'Tolon', 'Dörbei',
    'Naya', 'Qubilai Noyan', 'Yesügei', 'Changshi', 'Esen Buqa',
    'Duwa', 'Kaidu', 'Nayan', 'Ghazan', 'Oljeitu',
    'Tarmashirin', 'Kebek', 'Arghun', 'Abaqa', 'Tolui',
    'Güyük', 'Möngke', 'Berke', 'Batu', 'Chagatai',
    'Temür', 'Sorqan Shira', 'Jebke', 'Toqto\'a', 'Taichu',
  ],
  norse: [
    // Norse given names of minor warriors, jarls, and settlers — no boss names
    'Sigurd', 'Gunnar', 'Ivar', 'Ulf', 'Sven',
    'Orm', 'Halfdan', 'Rollo', 'Eric', 'Olaf',
    'Thorvald', 'Ketil', 'Hrolf', 'Floki', 'Asmund',
    'Gunnbjorn', 'Hakon', 'Thorfinn', 'Knut', 'Magnus',
    'Styrbjorn', 'Palnatoki', 'Ingvar', 'Skuli', 'Hrafn',
    'Arnbjorn', 'Þorsteinn', 'Gisli', 'Eindriði', 'Kolbeinn',
    'Sigríðr', 'Astríðr', 'Ragnhildr', 'Freydís', 'Unn',
  ],
};

// ── ITEM B2: per-civ epithet pools (14+ per civ) — used for humanoid elites ──
// Used combinatorially with rank + name (~50 % chance appended).
export const CIV_ELITE_EPITHETS = {
  china: [
    'the Ironclad', 'of the Jade Blade', 'the Unyielding', 'the Red Serpent',
    'of the Black Mountain', 'the Swift Hawk', 'the Thousand-Li Rider',
    'the Unbroken', 'of the Southern Flame', 'the Silent Tiger',
    'the Iron Ox', 'the River Wolf', 'the Cloud Spear', 'the Bronze Fist',
  ],
  japan: [
    'the Demon', 'of the Crescent Moon', 'the Shadow Blade', 'the Iron Bear',
    'the Storm Rider', 'of the Red Dawn', 'the Mountain Tiger',
    'the Unseen', 'the Thunder Drum', 'the Crimson Fang',
    'of the Eastern Wind', 'the Night Crow', 'the Burning Eye', 'the Jade Fox',
  ],
  byzantium: [
    'the Unbroken', 'of the Purple Chamber', 'the Iron Strategos', 'the Gold-Crowned',
    'the Flame-Bearer', 'of the Sacred Lance', 'the Unconquered',
    'the Blessed', 'of Anatolia', 'the Invincible',
    'the Fire-Handed', 'the Sacred Shield', 'the Iron Curtain', 'the Twice-Born',
  ],
  sumer: [
    'the Eternal', 'of the Ziggurat', 'the Bull of Heaven', 'the Cedar-Feller',
    'the River-Born', 'of the Great Flood', 'the Lapis Lance',
    'the Reed-Cutter', 'of Nippur', 'the Golden Mace',
    'the Star-Reader', 'the Dust Walker', 'the Clay Throne', 'the Sun-Crowned',
  ],
  rome: [
    'the Unbroken', 'of the Iron Hand', "the Eagle's Wing", 'the Thunderbolt',
    'the Red', 'of the Tiber', 'the Unconquered',
    'the Wall', 'of the Seventh Legion', 'the Iron Fist',
    'the Scarred', 'the Swift Blade', 'the Shield of Rome', 'the Unyielding',
  ],
  macedon: [
    'the Bold', 'of the Silver Shield', "the Lion's Son", 'the Unstoppable',
    'the Far-Marcher', 'of the Companion Guard', 'the Spear-Bearer',
    'the Conqueror', 'of the Phalanx', 'the Golden Helm',
    "the East-Seeker", "the Sarissa's Edge", 'the Flame of Pella', 'the Iron Wing',
  ],
  mongolia: [
    'Wolf of the Steppe', 'the Arrow-Storm', 'the Sky-Rider', 'the Bone-Crusher',
    'the Untracked', 'of the Blue Sky', 'the Hawk-Eye',
    'the Wind-Catcher', 'the Iron Hoof', 'the Steppe Fire',
    'the Shadow Horse', 'the Relentless', 'the Sand-Strider', 'the Night Rider',
  ],
  norse: [
    'the Far-Wanderer', 'of the Raven Banner', 'the Ice-Born', 'the Axe-Breaker',
    'the Storm-Caller', 'of the Shield Wall', 'the Bone-Gnawer',
    'the Sea-Wolf', 'the Frost-Handed', 'the Unbroken',
    'the Blood-Eagle', "of Valhalla's Gate", 'the Iron Oak', 'the Grim',
  ],
};

// Per-civ rank words (3–4 per civ, used randomly for humanoid elites).
export const CIV_ELITE_RANKS = {
  china:     ['General', 'Commander', 'Marshal', 'Vanguard'],
  japan:     ['Daimyo', 'Taisho', 'Gunso', 'Samurai-Taishō'],
  byzantium: ['Strategos', 'Tagmatarch', 'Domestikos', 'Merarches'],
  sumer:     ['Lugal', 'En', 'Ensi', 'Galzu'],
  rome:      ['Centurion', 'Legate', 'Tribune', 'Prefect'],
  macedon:   ['Taxiarch', 'Chiliarch', 'Hipparch', 'Strategos'],
  mongolia:  ['Noyan', 'Minghan', 'Tümen', 'Baghatur'],
  norse:     ['Jarl', 'Thane', 'Huscarl', 'Hersir'],
};

// ── ITEM B3: per-civ beast/spirit descriptor pools (~10 per civ) ──────────────
// Used to build "⚔ The <descriptor> of <place> — <modifier>" titles for
// beast and spirit kindClass enemies. Should read as a terrifying creature name.
export const CIV_BEAST_FRAGMENTS = {
  china: [
    ['Crag-Talon', 'Mount Heng'], ['Marrow-Gnawer', 'the Fens'], ['Black-Mane', 'the Yangtze Gorges'],
    ['Fell-Wing', 'Mount Hua'], ['Jade-Fang', 'the Yellow River'], ['Stone-Hide', 'Taishan Peak'],
    ['Thunder-Claw', 'the Eastern Sea'], ['Blood-Beak', 'the Crimson Basin'], ['Iron-Pelt', 'Mount Song'],
    ['Void-Shriek', 'the Palace Depths'],
  ],
  japan: [
    ['Gale-Talon', 'Mount Fuji'], ['Night-Howl', 'the Misty Pines'], ['Iron-Mane', 'the Cedar Ridge'],
    ['Bone-Wind', 'the Haunted Valley'], ['Storm-Fang', 'Kyūshū Shore'], ['Ash-Claw', 'the Burnt Temple'],
    ['Pale-Shriek', 'the Sea Mist'], ['Thunder-Hide', 'Mount Hiei'], ['Shadow-Beak', 'the Moonlit Ravine'],
    ['Fog-Talon', 'the Sunken Forest'],
  ],
  byzantium: [
    ['Fell-Claw', 'the Bosphorus Cliffs'], ['Marrow-Wing', 'the Anatolian Wastes'], ['Stone-Shriek', 'Hagia Sophia'],
    ['Iron-Beak', 'the Golden Horn'], ['Night-Talon', 'Mount Olympos'], ['Fire-Hide', 'the Dardanelles'],
    ['Pale-Fang', 'the Cappadocian Caves'], ['Blood-Wing', 'the Propontis'], ['Dark-Claw', 'the Cilician Gates'],
    ['Thunder-Howl', 'the Ionian Coast'],
  ],
  sumer: [
    ['Dust-Fang', 'the Tigris Delta'], ['Reed-Shriek', 'the Great Marshes'], ['Marrow-Claw', 'Mount Mashu'],
    ['Sand-Howl', 'the Cedar Forest'], ['Stone-Beak', 'Nippur'], ['Blood-Talon', 'the Euphrates Bend'],
    ['Iron-Maw', 'the Zagros Slopes'], ['Night-Wing', 'the Dark Water'], ['Fell-Hide', 'Eridu Shore'],
    ['Thunder-Shriek', 'the Kur Below'],
  ],
  rome: [
    ['Fell-Talon', 'the Tiber Shallows'], ['Blood-Wing', 'the Appian Way'], ['Stone-Shriek', 'the Capitoline'],
    ['Marrow-Claw', 'the Alban Hills'], ['Night-Howl', 'the Pontine Marshes'], ['Iron-Beak', 'the Via Appia'],
    ['Pale-Fang', 'the Aventine'], ['Thunder-Hide', 'the Palatine Crest'], ['Dust-Shriek', 'the Circus Maximus'],
    ['Shadow-Talon', 'the Catacombs'],
  ],
  macedon: [
    ['Gale-Talon', 'Mount Olympos'], ['Stone-Shriek', 'the Pindus Peaks'], ['Fell-Maw', 'Therma Bay'],
    ['Pale-Beak', 'the Axios Valley'], ['Night-Claw', 'the Vergina Woods'], ['Iron-Shriek', 'the Aegean Shore'],
    ['Blood-Hide', 'the Pella Marshes'], ['Thunder-Fang', 'the Thracian Hills'], ['Marrow-Wing', 'the Strymon'],
    ['Shadow-Howl', 'the Pass of Tempe'],
  ],
  mongolia: [
    ['Steppe-Howl', 'the Black Gobi'], ['Storm-Fang', 'the Khentii Range'], ['Iron-Claw', 'the Orkhon Valley'],
    ['Bone-Shriek', 'the Barren Altai'], ['Night-Talon', 'the Outer Steppe'], ['Blood-Mane', 'Lake Baikal'],
    ['Gale-Hide', 'the Wind Corridor'], ['Shadow-Howl', 'the Sacred Burqan Qaldun'], ['Pale-Fang', 'the Taiga Fringe'],
    ['Thunder-Claw', 'the Kerülen River'],
  ],
  norse: [
    ['Frost-Talon', 'the Jötunheim Ridge'], ['Marrow-Gnawer', 'the Fens of Níðafjöll'], ['Blood-Wing', 'Yggdrasil'],
    ['Night-Howl', 'the Ironwood'], ['Stone-Shriek', 'Utgard Hall'], ['Ice-Fang', 'the Gjöll River'],
    ['Shadow-Claw', 'Náströnd Shore'], ['Storm-Beak', 'the Bifröst Crossing'], ['Iron-Maw', 'the Niflheim Mist'],
    ['Void-Howl', 'the Ginnungagap'],
  ],
};

// ── ITEM B4: per-civ construct descriptor pools (~10 per civ) ─────────────────
// Used to build "⚔ The <material> <vehicle> of <place> — <modifier>" style titles
// for construct kindClass enemies (golems, siege engines, machines, shards).
export const CIV_CONSTRUCT_FRAGMENTS = {
  china: [
    ['Iron Bull', 'Wuchang'], ['Stone Ox', 'the Yellow River'], ['Bronze Turtle', 'the Wei River'],
    ['Jade War-Engine', 'the Han Pass'], ['Clay Sentinel', 'Luoyang'], ['Iron Beetle', 'the Southern Wall'],
    ['Wooden Ox', 'Mount Song'], ['Bronze Tower', 'Ye City'], ['Stone Dragon', 'the Northern Rampart'],
    ['Iron Tortoise', 'the Capital Road'],
  ],
  japan: [
    ['Iron Serpent', 'Mount Fuji'], ['Stone Demon', 'Kyoto Gate'], ['Bronze Oni', 'the Inland Sea'],
    ['Black Tortoise', 'Nara Plain'], ['Iron Buddha', 'the Cedar Pass'], ['Jade Automaton', 'Edo Bay'],
    ['Steel Tengu', 'the Northern Ridge'], ['Iron Bell', 'Osaka Castle'], ['Stone Tanuki', 'the Bamboo Road'],
    ['Bronze Crab', 'the Inland Shore'],
  ],
  byzantium: [
    ['Marble Sentinel', 'the Golden Gate'], ['Bronze Colossus', 'the Hippodrome'], ['Iron Tortoise', 'the Theodosian Wall'],
    ['Stone Angel', 'Hagia Sophia'], ['Copper Engine', 'the Bosphorus Shore'], ['Iron Automaton', 'the Great Palace'],
    ['Bronze Guardian', 'the Forum of Constantine'], ['Stone Behemoth', 'the Blachernae'], ['Iron Idol', 'the Galata Tower'],
    ['Marble Golem', 'Chalcedon Shore'],
  ],
  sumer: [
    ['Clay Bull', 'the Ziggurat'], ['Bronze Lion', 'the Gate of Ishtar'], ['Stone Servant', 'Nippur'],
    ['Mud-Brick Giant', 'the River Quay'], ['Copper Sentinel', 'Lagash'], ['Iron Cedar-Feller', 'Mount Mashu'],
    ['Bronze Ox', 'Ur'], ['Clay Colossus', 'the Temple Complex'], ['Stone Warden', 'Akkad'],
    ['Copper Golem', 'the Euphrates Levee'],
  ],
  rome: [
    ['Iron Eagle', 'the Colosseum'], ['Bronze Legionary', 'the Via Appia'], ['Stone Tortoise', 'the Tiber Wall'],
    ['Copper Golem', 'the Forum'], ['Iron Battering Ram', 'the Capena Gate'], ['Stone Ballista', 'the Palatine'],
    ['Bronze Centurion', 'the Praetorian Camp'], ['Iron Scorpion', 'the Rhine Frontier'], ['Stone Onager', 'Carthage'],
    ['Bronze Corvus', 'the Sicilian Shore'],
  ],
  macedon: [
    ['Bronze Phalanx', 'Pella'], ['Stone Siege Tower', 'the Aegean Shore'], ['Iron Tortoise', 'the Pindus Pass'],
    ['Copper Colossus', 'Corinth'], ['Bronze Talos', 'Mount Olympos'], ['Stone Sarissa', 'the Axios Valley'],
    ['Iron Onager', 'the Persian Gate'], ['Copper Siege Engine', 'Tyre'], ['Stone Automaton', 'Babylon'],
    ['Bronze Colossus', 'Rhodes'],
  ],
  mongolia: [
    ['Iron Horse', 'the Great Steppe'], ['Stone Ox', 'the Kerülen River'], ['Copper Siege Tower', 'Karakorum'],
    ['Iron Balbal', 'the Black Gobi'], ['Bronze Battering Ram', 'the Jurchid Wall'], ['Stone Eagle', 'the Khentii Range'],
    ['Iron Ger-Engine', 'the Orkhon Valley'], ['Copper Ballista', 'the Yellow River Crossing'], ['Stone Automaton', 'Zhongdu'],
    ['Iron Sentinel', 'the Altai Pass'],
  ],
  norse: [
    ['Stone Jötunn', 'Jötunheim'], ['Iron Serpent', 'Midgard Wall'], ['Frost Golem', 'the Gjöll River'],
    ['Rune-Carved Giant', 'Utgard'], ['Bronze Fenriswulf', 'the Ironwood'], ['Stone Draugr', 'the Barrow-Mound'],
    ['Iron Thor-Engine', 'Bifröst'], ['Ice Colossus', 'Niflheim'], ['Stone Automaton', 'the Skraeling Shore'],
    ['Iron Thrall', 'the Longship Yard'],
  ],
};

// ── ITEM B5: no-repeat ring-buffer (last 12 names per civ × class) ────────────
const ELITE_NAME_RECENT = {};

function _pickNoRepeat(key, pool) {
  if (!ELITE_NAME_RECENT[key]) ELITE_NAME_RECENT[key] = [];
  const recent = ELITE_NAME_RECENT[key];
  const candidates = pool.filter(n => !recent.includes(n));
  const source = candidates.length > 0 ? candidates : pool;
  const chosen = source[Math.floor(Math.random() * source.length)];
  recent.push(chosen);
  if (recent.length > 12) recent.shift();
  return chosen;
}

/**
 * Return the localized name for an enemy type within a given civ, falling back
 * to the base ENEMIES[typeId].name when no override exists.
 */
export function localEnemyName(civId, typeId, baseName) {
  const overrides = CIV_ENEMY_NAMES[civId];
  if (overrides && overrides[typeId]) return overrides[typeId];
  return baseName;
}

/**
 * Generate a flavoured elite title string.
 * @param {string} civId       - e.g. 'china', 'norse'
 * @param {string} modifierName - e.g. 'Volatile', 'Berserker'
 * @param {string} [typeId]    - enemy type id (e.g. 'wraith', 'golem') for kindClass routing
 *
 * humanoid  → "⚔ Centurion Vibius the Unbroken — Volatile"
 * beast     → "⚔ The Crag-Talon of Mount Heng — Volatile"
 * spirit    → "⚔ The Crag-Talon of Mount Heng — Volatile"  (same descriptive format)
 * construct → "⚔ The Iron Bull of Wuchang — Bulwark"
 */
export function generateEliteTitle(civId, modifierName, typeId) {
  const kind = (typeId && KIND_CLASS[typeId]) || 'humanoid';

  if (kind === 'construct') {
    const frags = CIV_CONSTRUCT_FRAGMENTS[civId] || CIV_CONSTRUCT_FRAGMENTS.rome;
    const pair  = _pickNoRepeat(`${civId}_construct`, frags);
    return `⚔ The ${pair[0]} of ${pair[1]} — ${modifierName}`;
  }

  if (kind === 'beast' || kind === 'spirit') {
    const frags = CIV_BEAST_FRAGMENTS[civId] || CIV_BEAST_FRAGMENTS.rome;
    const pair  = _pickNoRepeat(`${civId}_beast`, frags);
    return `⚔ The ${pair[0]} of ${pair[1]} — ${modifierName}`;
  }

  // humanoid: existing rank + name + optional epithet format
  const namePool = CIV_ELITE_NAMES[civId]    || CIV_ELITE_NAMES.rome;
  const rankPool = CIV_ELITE_RANKS[civId]    || CIV_ELITE_RANKS.rome;
  const epithets = CIV_ELITE_EPITHETS[civId] || CIV_ELITE_EPITHETS.rome;

  const name    = _pickNoRepeat(`${civId}_humanoid`, namePool);
  const rank    = rankPool[Math.floor(Math.random() * rankPool.length)];
  const epithet = Math.random() < 0.5
    ? ' ' + epithets[Math.floor(Math.random() * epithets.length)]
    : '';

  return `⚔ ${rank} ${name}${epithet} — ${modifierName}`;
}

// Legacy single-rank export kept for any direct consumers (SpawnSystem uses
// generateEliteTitle which now uses CIV_ELITE_RANKS instead).
export const CIV_ELITE_RANK = {
  china:     'General',
  japan:     'Daimyo',
  byzantium: 'Strategos',
  sumer:     'Lugal',
  rome:      'Centurion',
  macedon:   'Taxiarch',
  mongolia:  'Noyan',
  norse:     'Jarl',
};

// ── ITEM D: per-civ ambient particle config ────────────────────────────────
// tint (0xRRGGBB), maxAlive, speed (drift), gravity adjustments, depth.
export const CIV_AMBIENCE = {
  china:     { tint: 0xff8c44, label: 'ember-leaves' },
  japan:     { tint: 0xffaec9, label: 'petals' },
  byzantium: { tint: 0xffd700, label: 'golden-dust' },
  sumer:     { tint: 0xd4b483, label: 'sandy-motes' },
  rome:      { tint: 0xe8e0d0, label: 'pale-ash' },
  macedon:   { tint: 0x8fbc6a, label: 'olive-flecks' },
  mongolia:  { tint: 0xd4b483, label: 'sandy-motes' },
  norse:     { tint: 0xeaedf2, label: 'snow' },
  // final stage: red embers
  final:     { tint: 0xff3a0a, label: 'red-embers' },
};
