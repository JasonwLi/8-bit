// Flavour dialogue for heroes and bosses.
// All pools are arrays; pick with pickRandom() at runtime.
// Era-appropriate voice: terse, commanding, Dynasty-Warriors swagger — no modern slang.

export function pickRandom(arr) {
  if (!arr || !arr.length) return '';
  return arr[Math.floor(Math.random() * arr.length)];
}

// ─────────────────────────────────────────────────────────────────────────────
// HERO DIALOGUE
// ─────────────────────────────────────────────────────────────────────────────
export const HERO_DIALOGUE = {
  lubu: {
    ultCast: [
      'SKY PIERCER — TASTE HEAVEN!',
      'None alive can match this arm!',
      'Warcry of the undefeated — kneel!',
      'I am Lü Bu. This field is MINE.',
      'Red Hare and I — unstoppable!',
    ],
    stageStart: {
      default: [
        'Another civ. Another pile of skulls.',
        'Step aside — or be stepped upon.',
      ],
      china: [
        'These warlords dare call themselves rivals of Lü Bu?',
        'I owe allegiance to no one. China falls to ME.',
      ],
      japan: [
        'Island swordsmen. Let them come in numbers.',
        'Their blades are small. My halberd is patient.',
      ],
      byzantium: [
        'Golden domes and purple robes. They bleed red like any man.',
        'Their fire cannot outrun my spear.',
      ],
      sumer: [
        'Ancient walls, ancient kings. They crumble the same.',
        'The gods of Uruk will watch their city fall.',
      ],
      rome: [
        'A legion is still just men. Men have backs to break.',
        'They fight in formation — I fight alone. I am enough.',
      ],
      macedon: [
        'A long spear against a longer halberd. We shall see.',
        'They conquered the East once. I will end their line.',
      ],
      mongolia: [
        'Horse archers. They flee before they face me.',
        'The steppe has never seen a warrior like Lü Bu.',
      ],
      norse: [
        'These northmen bellow and beat their chests. Then they die.',
        'Their axes are crude. Their courage, wasted.',
      ],
    },
    lowHp: [
      'Blood! At last — a worthy wound.',
      'Pain sharpens the edge. Come closer.',
      'Is this all you have?!',
    ],
    victory: [
      'Under heaven, there is no equal.',
      'They called me a traitor. Now they call me conqueror.',
      'Red Hare — we ride on.',
    ],
    duelReply: [
      'A duel? You honour me with your death.',
      'Good. No armies. Just you and me.',
      'I have slain kings for less impertinence. Begin.',
    ],
  },

  nobunaga: {
    ultCast: [
      'Volley — FIRE!',
      'Tanegashima speaks for me.',
      'The Demon King opens his eyes.',
      'No prayer will stop this iron.',
      'Heaven burns for those who resist.',
    ],
    stageStart: {
      default: [
        'Conquer by force when reason fails.',
        'Rule by powder and iron, not birth.',
      ],
      china: [
        'Warlords squabbling over a throne. How familiar.',
        'Three Kingdoms, one outcome — mine.',
      ],
      japan: [
        'My own land turns against me. So be it.',
        'I broke Takeda once. I will break them all again.',
      ],
      byzantium: [
        'Greek fire against Tanegashima. A fair contest.',
        'Their empire outlasted Rome. It will not outlast me.',
      ],
      sumer: [
        'Old civilizations cling to old gods. Both die.',
        'The first cities — and the last to fall to Nobunaga.',
      ],
      rome: [
        'Legions march in rows. My volleys do not care about rows.',
        'They made laws for the world. I make graves.',
      ],
      macedon: [
        'A phalanx advances slowly. Bullets do not.',
        'Alexander loved glory. I love results.',
      ],
      mongolia: [
        'Horse and bow — my volleys fly faster than any horse.',
        'The Mongol tide met iron before. It will again.',
      ],
      norse: [
        'They cross seas to raid. I cross continents to conquer.',
        'Berserkers fear nothing. Not even matchlock fire.',
      ],
    },
    lowHp: [
      'Retreat is for those who plan to live mediocre lives.',
      'A Demon King does not beg mercy.',
      'Even this wound is calculated.',
    ],
    victory: [
      'Tenka fubu. Under heaven, by force.',
      'History will curse me. History will remember me.',
      'The realm unites — under MY banner.',
    ],
    duelReply: [
      'One opponent. Cleaner than a battlefield.',
      'You challenge the Demon King? Remarkable courage. Remarkable foolishness.',
      'I accept. Load the chamber.',
    ],
  },

  belisarius: {
    ultCast: [
      'CATAPHRACT — charge through!',
      'For the glory of Constantinople!',
      'Greek fire cleanses all heresy.',
      'The emperor\'s arm does not tire.',
      'Form up — we END this here.',
    ],
    stageStart: {
      default: [
        'The empire stands wherever I plant its standard.',
        'We have held worse ground than this.',
      ],
      china: [
        'The Han had their empire. Ours endures longer.',
        'Silk Road merchants warned me of this land. They were right.',
      ],
      japan: [
        'Island warriors far from Rome. Yet they bleed the same.',
        'They have never heard of Byzantium. They will.',
      ],
      byzantium: [
        'Justinian will not thank me for this. He never does.',
        'My own emperor fears me more than the enemy. A familiar war.',
      ],
      sumer: [
        'The cradle of civilization — and I must burn it. Forgive me.',
        'Mesopotamia has seen a thousand conquerors. One more.',
      ],
      rome: [
        'I serve the last heirs of Rome against Rome\'s ghost. The irony.',
        'Old Rome collapsed from within. We face its corpse today.',
      ],
      macedon: [
        'Alexander\'s heirs squabble like children. We end the argument.',
        'The phalanx tactic is ancient. My cavalry is not.',
      ],
      mongolia: [
        'The Mongol advance reaches even the steppe we have never crossed.',
        'Nomads who break every wall — until they meet mine.',
      ],
      norse: [
        'They sailed the Varangian route into Byzantium once as allies. No longer.',
        'A Varangian guard turned enemy is the most dangerous kind.',
      ],
    },
    lowHp: [
      'I have bled worse at Dara. Hold the line.',
      'An emperor\'s general does not fall here.',
      'My flame still burns. So does my hatred for retreat.',
    ],
    victory: [
      'The emperor inherits what I bleed for.',
      'Justinian will claim this victory. Let him. I know the truth.',
      'Rome reborn — for one more generation.',
    ],
    duelReply: [
      'Single combat suits a general. None of this cavalry nonsense.',
      'A duel? I have fought in the name of a dozen emperors. One more.',
      'Step forward. The last of the Romans will not yield.',
    ],
  },

  gilgamesh: {
    ultCast: [
      'GATE OF BABYLON — open!',
      'My treasury rains destruction!',
      'Two-thirds god — feel the difference!',
      'Enkidu once fought me to a standstill. No one else will.',
      'From the walls of Uruk — I STRIKE!',
    ],
    stageStart: {
      default: [
        'I have crossed the sea of death. This is nothing.',
        'There is no adventure I have not claimed.',
      ],
      china: [
        'These warlords quarrel over a river basin. I ruled the first city.',
        'I have wrestled the Bull of Heaven. Who are these men?',
      ],
      japan: [
        'An island at the edge of the world. Even the edge belongs to me.',
        'Strange armor, strange banners. The Gate opens for them too.',
      ],
      byzantium: [
        'A second Rome built on older bones. I remember the first temples.',
        'Purple-clad emperors. Even gods wear crowns.',
      ],
      sumer: [
        'Uruk is MY city. These usurpers squatted on my throne.',
        'I built those walls with my own hands. Watch them shatter.',
      ],
      rome: [
        'They speak of eternal cities. Uruk was eternal first.',
        'Legions and law — crude imitations of Sumerian order.',
      ],
      macedon: [
        'Alexander found my old kingdom and wept — I gave him nothing to surpass.',
        'He called himself divine. He never met the genuine article.',
      ],
      mongolia: [
        'A horde that rides to the ends of the earth. I walked those same ends.',
        'Even the wild steppes fall within my treasury.',
      ],
      norse: [
        'They have their Ragnarok. I have the Flood — and survived it.',
        'Frost and iron. My Gate has seen worse.',
      ],
    },
    lowHp: [
      'I sought immortality and could not find it. But I found THIS.',
      'Even Humbaba gave me more of a fight. Come, then.',
      'A god-king does not die to mere soldiers.',
    ],
    victory: [
      'No glory under heaven that I have not seized.',
      'The epic of Gilgamesh gains another canto.',
      'Let the scribes record it — the world is mine.',
    ],
    duelReply: [
      'One foe. Good — I can give this my full attention.',
      'Single combat is the oldest law. I helped write it.',
      'You challenge a king who walked with gods. Your boldness is... noted.',
    ],
  },

  caesar: {
    ultCast: [
      'TESTUDO — shields up, advance!',
      'The legions do not stop!',
      'Rome is HERE — in this formation!',
      'Veni, vidi — now I conquer!',
      'Lock shields! None pass through Roman iron!',
    ],
    stageStart: {
      default: [
        'Every campaign sharpens the next. Forward.',
        'I have crossed the Rubicon. There is no going back.',
      ],
      china: [
        'Their generals are feared across a continent. So am I.',
        'Silk, strategy, and iron discipline — we have much in common.',
      ],
      japan: [
        'Disciplined island warriors. They remind me of my Tenth Legion.',
        'Islands have never stopped Rome. They will not start now.',
      ],
      byzantium: [
        'My heirs built that empire. Fitting that I should take it back.',
        'They call themselves heirs of Rome. I AM Rome.',
      ],
      sumer: [
        'The oldest laws of Hammurabi — my lawyers have read them.',
        'First civilization. Last to face the Roman machine.',
      ],
      rome: [
        'Romans against Romans. The saddest war and the most necessary.',
        'They follow the Senate. I follow victory.',
      ],
      macedon: [
        'Alexander and I share admiration — and nothing else.',
        'He wept there were no more worlds to conquer. I found several.',
      ],
      mongolia: [
        'Cavalry that circles and strikes. My legions have met worse.',
        'The Mongol way of war is brilliant. It is also insufficient against me.',
      ],
      norse: [
        'I campaigned in Gaul. The Germanic tribes taught me about northern fury.',
        'Raiders with no discipline. A classic tactical problem.',
      ],
    },
    lowHp: [
      'Fortune favors the bold — and I am still standing.',
      'My soldiers are watching. I will not fall here.',
      'Even the Ides of March did not finish me. Nothing will.',
    ],
    victory: [
      'Veni, vidi, vici. The old words ring true again.',
      'Rome\'s glory extends as far as my arm can reach.',
      'The Senate will despise this victory. That is how I know it was worth it.',
    ],
    duelReply: [
      'Single combat between commanders — the Homeric way. I respect it.',
      'Good. No legions between us. Just iron and will.',
      'I have killed in single combat before. I am not afraid of it now.',
    ],
  },

  alexander: {
    ultCast: [
      'WRATH OF RA — CHARGE!',
      'Amun-Ra guides this arm!',
      'Macedon advances — none hold the line!',
      'I am the son of Zeus — and I PROVE IT!',
      'By the sarissa — BREAK THEM!',
    ],
    stageStart: {
      default: [
        'No world is too far. No enemy too entrenched.',
        'Undefeated. That record stands until I say otherwise.',
      ],
      china: [
        'A vast kingdom of warlords — this is what the East held beyond Persia.',
        'They never heard of Macedon. They will name their children after me.',
      ],
      japan: [
        'I planned to sail around every coast. I simply ran out of years.',
        'Island warriors who have never seen the phalanx. Not for long.',
      ],
      byzantium: [
        'My generals founded cities across my empire. This one too.',
        'Constantinople — built on ground I marched through. It belongs to me.',
      ],
      sumer: [
        'I stood at Babylon and wept — not from sadness but from recognition.',
        'The two rivers. Darius\'s empire. My empire now.',
      ],
      rome: [
        'They admired me. Now they face me.',
        'Rome learned from my tactics. The lesson ends here.',
      ],
      macedon: [
        'My own kingdom — in other hands. Unacceptable.',
        'They carry the Vergina sun but not its fire. I carry both.',
      ],
      mongolia: [
        'My cavalry Companions matched any horsemen alive. I believe that still.',
        'The steppe horde — I would have absorbed them into the army, once.',
      ],
      norse: [
        'I never reached the northern seas. Today I correct that.',
        'Wild warriors who fight for glory. We understand each other.',
      ],
    },
    lowHp: [
      'At Gaugamela the line nearly broke. NEARLY.',
      'I took an arrow at the Mallian fortress. I survived. Remember that.',
      'Pain is proof of life. I am very much alive.',
    ],
    victory: [
      'Undefeated. As it was. As it will be.',
      'My name will be the last word spoken in this age.',
      'East and West united — under the son of Amun-Ra.',
    ],
    duelReply: [
      'A duel! Like Achilles and Hector — yes. I accept.',
      'Step forward. Greatness settles matters this way.',
      'One blade, one chance. Come — I am impatient.',
    ],
  },

  genghis: {
    ultCast: [
      'Rain of arrows — LOOSE!',
      'The sky belongs to the Mongol!',
      'Sky arrows darken the sun!',
      'No wall stops the Great Khan!',
      'Encircle — and DESTROY!',
    ],
    stageStart: {
      default: [
        'Every horizon is Mongol territory that does not know it yet.',
        'We do not siege. We obliterate, and move on.',
      ],
      china: [
        'The Jin Dynasty thought walls would stop us. Walls are lumber and dust.',
        'Three kingdoms, three surrenders. The horde does not negotiate twice.',
      ],
      japan: [
        'We tried the islands before. The winds turned us back. No winds today.',
        'Island nations believe the sea protects them. It does not protect them from arrows.',
      ],
      byzantium: [
        'Gold domes and Greek fire. Novel obstacles. Nothing more.',
        'Constantinople fell to others — let us claim what they left.',
      ],
      sumer: [
        'The oldest civilization. We have leveled older.',
        'Rivers make fine borders for everyone except the Mongol horde.',
      ],
      rome: [
        'They built roads to move their armies. We need no roads.',
        'The legion fights in one direction. We fight in all of them.',
      ],
      macedon: [
        'Alexander rode hard and fast. We ride harder and further.',
        'Companion cavalry against Mongol horse archers. A worthy problem.',
      ],
      mongolia: [
        'My own lands — held by pretenders. Blood will correct this.',
        'The spirit banner is mine. It was always mine.',
      ],
      norse: [
        'Northmen who raid by sea. We raid by steppe. Let them compare notes.',
        'Berserker rage against Mongol tactics. Rage loses.',
      ],
    },
    lowHp: [
      'The Great Khan does not bleed for nothing.',
      'Pain is a lesson. I am learning.',
      'Harder — you will need to do MUCH harder than that.',
    ],
    victory: [
      'From the Yellow Sea to the Caspian — mine.',
      'The eternal blue sky blesses the victorious.',
      'They asked how far we would ride. Here is the answer.',
    ],
    duelReply: [
      'One enemy, no horse — a different kind of hunt.',
      'I have fought champions of a dozen nations. Add yours to the list.',
      'Good. The Great Khan enters the circle.',
    ],
  },

  ragnar: {
    ultCast: [
      'ODIN GUIDES THIS AXE!',
      'BERSERKER RAGE — ALL OF YOU!',
      'Tonight we feast in Valhalla — OR we take the field!',
      'No shield wall holds against a Lothbrok!',
      'The serpent bites — KILL THEM!',
    ],
    stageStart: {
      default: [
        'A good death waits somewhere on this field. Let us find it.',
        'Raids teach you more than thrones. I have raided everywhere.',
      ],
      china: [
        'Silk and jade — plunder worthy of a longship.',
        'They have never heard the raven banner. They will learn its meaning.',
      ],
      japan: [
        'Island warriors who pray before they fight. Respect. Then I kill them.',
        'Their swords are beautiful. Good loot if I leave them in one piece.',
      ],
      byzantium: [
        'Varangians served this empire for coin. I take it by axe.',
        'Byzantine gold has filled many Norse halls. Let us add to the tradition.',
      ],
      sumer: [
        'The oldest gods in the world. Odin will want a word.',
        'Desert rivers and ziggurats. Strange new ground for the Serpent.',
      ],
      rome: [
        'Romans and Northmen met at the Rhine. They did not like what they found.',
        'Legions march in perfect step — until they meet a berserker.',
      ],
      macedon: [
        'Macedonians and Norsemen — both born fighters. Good.',
        'Long spears against spinning axes. My kind of problem.',
      ],
      mongolia: [
        'Steppe riders — they remind me of the raids back home. Only drier.',
        'Horse archers at range. I close the range.',
      ],
      norse: [
        'My own kinsmen across the water, turned against me.',
        'I do not fight brothers — but I will fight men who forgot what brotherhood means.',
      ],
    },
    lowHp: [
      'A fine wound. I will miss this later.',
      'The Norns did not spin my thread this short. Keep fighting!',
      'I am not done DYING yet, let alone KILLING!',
    ],
    victory: [
      'Valhalla waited. It will keep waiting.',
      'My sons will hear this tale — and demand to do the same.',
      'The raven perches on the highest tower. As it should.',
    ],
    duelReply: [
      'A duel! FINALLY — something PERSONAL.',
      'One on one. Odin loves this kind of math.',
      'No retreat, no tricks. Just axes. Perfect.',
    ],
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// BOSS DIALOGUE
// ─────────────────────────────────────────────────────────────────────────────
export const BOSS_DIALOGUE = {
  // ── Lieutenants ──
  xiahoudun: {
    preDuel: [
      'One eye sees all I need — your end.',
      'Cao Cao\'s iron fist fights YOU today.',
    ],
    death: [
      'I... did not fall lightly...',
      'Tell... Cao Cao... the line held as long as it could.',
    ],
  },
  zhangliao: {
    preDuel: [
      'A thousand men fear my name. You should too.',
      'I rallied at Hefei. I will hold here as well.',
    ],
    death: [
      'Spread your men well... learn from me...',
      'You have strength... I grant you that...',
    ],
  },
  shingen: {
    preDuel: [
      'The mountain does not move. Nor do I.',
      'Wind, forest, fire, mountain — today I am the mountain.',
    ],
    death: [
      'The mountain... at last... erodes...',
      'Strike deep... as the Fūrinkazan commands...',
    ],
  },
  masamune: {
    preDuel: [
      'The One-Eyed Dragon of the North — face me!',
      'I was born too late for glory. I will make my own here.',
    ],
    death: [
      'Had I been born ten years sooner...',
      'The dragon falls... but its fire... lingers...',
    ],
  },
  narses: {
    preDuel: [
      'I am eighty years old and I have not lost. Ask Totila.',
      'The emperor\'s chamberlain commands this field, not you.',
    ],
    death: [
      'Even age... cannot grant endless years...',
      'The trap is... sprung at last... against me...',
    ],
  },
  heraclius: {
    preDuel: [
      'I rode from the Danube to Ctesiphon. One more battle changes nothing.',
      'The empire needs soldiers who never tire. I am that soldier.',
    ],
    death: [
      'The empire survives... the man does not...',
      'I thought... I had more campaigns left...',
    ],
  },
  sargon: {
    preDuel: [
      'I conquered the world before your civilization existed.',
      'The first empire was mine. This is MY land.',
    ],
    death: [
      'The world\'s first... conqueror... falls...',
      'Remember my name... Sargon of Akkad...',
    ],
  },
  hammurabi: {
    preDuel: [
      'My laws govern the living and the dead. You will learn one today.',
      'Eye for an eye — and you only have two.',
    ],
    death: [
      'The law... was written in stone... not flesh...',
      'Even... the lawgiver... is subject to... the final verdict...',
    ],
  },
  sulla: {
    preDuel: [
      'I marched on Rome itself. One more enemy changes nothing.',
      'Dictator Sulla yields to no one — not Caesar, not you.',
    ],
    death: [
      'The city... will remember... what I built...',
      'Rome... endures... even when I do not...',
    ],
  },
  crassus: {
    preDuel: [
      'I fund armies the way others fund festivals. This one ends you.',
      'Pompey and Caesar needed me. Who do you have?',
    ],
    death: [
      'Wealth... means nothing... in the end...',
      'At Carrhae... gold was no answer... neither was it... here...',
    ],
  },
  parmenion: {
    preDuel: [
      'I advised Philip and Alexander both. My counsel is steel.',
      'Old general, old tricks — they still kill the young.',
    ],
    death: [
      'Serve well... even those who... reward it poorly...',
      'The phalanx held... as long as I drew breath...',
    ],
  },
  craterus: {
    preDuel: [
      'Alexander called me his dearest friend. Today I earn that name.',
      'Swift cavalry does not wait for philosophy — CHARGE!',
    ],
    death: [
      'Tell the king... I gave... everything...',
      'Fast as lightning... and gone the same way...',
    ],
  },
  jebe: {
    preDuel: [
      'I once shot the Great Khan\'s horse from under him. He made me a general.',
      'You will not hear the arrow that ends this.',
    ],
    death: [
      'The Arrow General... misses once... and only once...',
      'Ride on... without me... Great Khan...',
    ],
  },
  muqali: {
    preDuel: [
      'The horde obeys or it dies. Guess which you have chosen.',
      'I hold the eastern campaigns. None pass through me.',
    ],
    death: [
      'The horde... is greater than any... one warrior...',
      'Khan... the east... still holds...',
    ],
  },
  ironside: {
    preDuel: [
      'Iron-Sided. Test the name.',
      'My father is Ragnar Lothbrok. I will not shame that blood.',
    ],
    death: [
      'The iron... has its first... real dent...',
      'Father... I fought well...',
    ],
  },
  lagertha: {
    preDuel: [
      'The shieldmaiden of Hedeby yields to NO ONE.',
      'I fought Ragnar himself to a draw. You will not do better.',
    ],
    death: [
      'The shield... arm weakens... at last...',
      'Die well... as I did...',
    ],
  },

  // ── Champions ──
  caocao: {
    preDuel: [
      'The world holds three heroes: Liu Bei, Sun Quan — and the one who stands before you.',
      'I did not claw my way from nothing to fall to the likes of YOU.',
    ],
    death: [
      'A hero — defined by success... and by... this...',
      'The Cao clan endures... even if I do not...',
    ],
  },
  hideyoshi: {
    preDuel: [
      'A peasant who became lord of all Japan. Bow before what determination builds.',
      'I crossed to Korea with two hundred thousand men. What did you cross with?',
    ],
    death: [
      'My castle at Osaka... my son... I leave it all...',
      'The monkey dies... but the dance... was glorious...',
    ],
  },
  justinian: {
    preDuel: [
      'I restored the glory of Rome from a throne in Constantinople. What have YOU restored?',
      'Empress Theodora and I built an empire that will outlast any battle here.',
    ],
    death: [
      'The code of law outlasts the lawmaker...',
      'New Rome... falls... as old Rome... fell before it...',
    ],
  },
  enkidu: {
    preDuel: [
      'I was shaped from clay and breath. I am OLDER than your civilization.',
      'Gilgamesh himself could not kill me the easy way. You will not either.',
    ],
    death: [
      'Back to the clay... from which I came...',
      'The wild... cannot be... caged forever...',
    ],
  },
  pompey: {
    preDuel: [
      'Pompey Magnus — the Great. Your epithet will not be as flattering.',
      'I cleared the Mediterranean of pirates in forty days. Disposing of you will take less.',
    ],
    death: [
      'Fortune... how fickle... even for the... Great...',
      'I should have... stayed in Spain...',
    ],
  },
  philip: {
    preDuel: [
      'I built the army Alexander used. Remember that when you face him.',
      'Macedonia was nothing before me. I made it everything.',
    ],
    death: [
      'The father falls... so the son... can rise...',
      'Do not let my blood... be wasted...',
    ],
  },
  subutai: {
    preDuel: [
      'I have won more battles than most generals have fought. Count them.',
      'I rode from Mongolia to Hungary. This ground is no different.',
    ],
    death: [
      'The grand strategist... outmaneuvered... at last...',
      'The horde learns... even from... defeat...',
    ],
  },
  hardrada: {
    preDuel: [
      'Harald Hardrada — the last true Viking king. Make this worth my time.',
      'I ruled Norway, held the Byzantine guard, and claimed England. WHO ARE YOU?',
    ],
    death: [
      'Stamford Bridge... again... in another shape...',
      'The last... Viking king... dies... as a Viking should...',
    ],
  },
  finalboss: {
    preDuel: [
      'They called me Xerxes the Undying. They were nearly right.',
      'Eight civilizations fall to you? Then you are worthy of a proper death.',
      'I have watched every empire rise. I will watch you fall.',
    ],
    death: [
      'Undying... merely means... dying last...',
      'The world... was mine... for a thousand years... it was mine...',
      'Even eternity... ends...',
    ],
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// STAGE INTRO CARDS
// Each civ + final: { title, tagline, year }
// ─────────────────────────────────────────────────────────────────────────────
export const STAGE_INTROS = {
  china: {
    title: 'Three Kingdoms China',
    tagline: 'Where heroes drowned in ambition, rivers ran with iron.',
    year: 'c. 220 AD',
  },
  japan: {
    title: 'Sengoku Japan',
    tagline: 'A century of war that forged the sharpest swords in the world.',
    year: 'c. 1560 AD',
  },
  byzantium: {
    title: 'Byzantine Empire',
    tagline: 'The flame of Rome, burning alone for a thousand years.',
    year: 'c. 550 AD',
  },
  sumer: {
    title: 'Sumer / Uruk',
    tagline: 'The first city. The first army. The first war.',
    year: 'c. 2700 BC',
  },
  rome: {
    title: 'Rome',
    tagline: 'Iron discipline that bent a continent to one will.',
    year: 'c. 50 BC',
  },
  macedon: {
    title: 'Macedon',
    tagline: 'A kingdom that out-ran the edge of the known world.',
    year: 'c. 330 BC',
  },
  mongolia: {
    title: 'Mongol Empire',
    tagline: 'The largest empire ever forged — from horseback, in a single lifetime.',
    year: 'c. 1220 AD',
  },
  norse: {
    title: 'Norse Scandinavia',
    tagline: 'Raiders who mapped the world from longship decks.',
    year: 'c. 860 AD',
  },
  final: {
    title: 'Warlord of Warlords',
    tagline: 'Every empire falls. Every conqueror faces one last throne.',
    year: 'The End of Ages',
  },
};
