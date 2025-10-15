import React, { useMemo, useState, useEffect } from "react";

// =============== Utility / UI bits ===============
function Tooltip({ children, content }) {
  const [open, setOpen] = useState(false);
  return (
    <div
      className="relative inline-block"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onFocus={() => setOpen(true)}
      onBlur={() => setOpen(false)}
    >
      {children}
      {open && (
        <div className="absolute z-20 -top-2 left-1/2 -translate-x-1/2 -translate-y-full w-80 bg-gray-950 text-gray-100 border border-gray-700 rounded p-2 shadow-lg">
          {content}
          <div className="absolute top-full left-1/2 -translate-x-1/2 w-3 h-3 bg-gray-950 border-l border-t border-gray-700 rotate-45"></div>
        </div>
      )}
    </div>
  );
}

const clamp = (v, min, max) => Math.max(min, Math.min(max ?? Infinity, v));
const formatSpecial = (arr) => (arr && arr.length ? arr.join(", ") : "—");

// =============== Stat Config ===============
const STAT_CONFIG = {
  Move:  { base: 6, min: 5, max: 8,  upCost: 4, downCost: 4,  format: (v) => `${v}\"`, reverse: false },
  DEF:   { base: 9, min: 5, max: 11, upCost: 1, downCost: 1,  format: (v) => `${v}+`,  reverse: true  },
  AP:    { base: 2, min: 2, max: 4,  upCost: 4, downCost: 4,  format: (v) => `${v}`,   reverse: false },
  HP:    { base: 7, min: 3, max: null,upCost: 1, downCost: 1,  format: (v) => `${v}`,   reverse: false },
  ATK:   { base: 3, min: 3, max: 5,  upCost: 2, downCost: 0,  format: (v) => `${v}`,   reverse: false },
  Fight: { base: 7, min: 5, max: 11, upCost: 2, downCost: 1,  format: (v) => `${v}+`,  reverse: true  },
  Shoot: { base: 7, min: 5, max: 11, upCost: 2, downCost: 1,  format: (v) => `${v}+`,  reverse: true  },
};

// =============== Psychic Powers ===============
const POWERS = [
  { name: "Shield",   range: '9" or self', test: '4+', effect: 'Target may reroll 1 Defense dice each time it is attacked, until the next turn.' },
  { name: "Boost",    range: '9" or self', test: '5+', effect: 'Target gains +1 AP and +1 normal damage on all Close Combat weapons during their next activation.' },
  { name: "Teleport", range: 'Friendly within 9" or self', test: '6+', effect: 'Target may immediately be repositioned up to 6", ignoring any terrain and vertical distance. The target now counts as having been repositioned.' },
  { name: "Heal",     range: '9" or self', test: '5+', effect: 'Target regains up to 2D3 lost wounds.' },
  { name: "Curse",    range: 'Unlimited', test: '5+', effect: 'Any Shooting or Close Combat attack against the target gains Reroll (SR) until the next turn.' },
  { name: "Shatter Mind", range: '18"', test: "Roll equal to or above target's AP × 3", effect: 'Target suffers D3 + 3 Mortal Wounds (or D3 + 6 Mortal Wounds if the Psychic Test is an 11 or 12).' },
  { name: "Control",  range: '18"', test: "Roll equal to or above target's AP × 3", effect: 'Target may be moved up to 4" immediately, have its Move reduced to 3" until the next turn, or have its AP reduced by 1 until the next turn.' },
  { name: "Fireblast",range: 'Unlimited', test: '3+', effect: 'Attack profile: ATK 4, Hit 5+, DMG 3/4, Special: Blast 2", MW(1).'},
];

// =============== Weapons (categories with merged variants) ===============
const CATEGORIES = [
  { key: "cc", label: "Close Combat" },
  { key: "pistol", label: "Pistols / Grenades" },
  { key: "ranged", label: "Light/Medium Ranged" },
  { key: "special", label: "Special" },
  { key: "heavy", label: "Heavy" },
];

const WEAPONS = {
  // Close Combat
  cc: [
    { id: "cc:fists-claws", category: "cc", name: "Fists/Claws", cost: 0, profiles: [{ label: "Profile", atk: "User", hit: "User", dmg: "2/3", special: [] }] },
    { id: "cc:beast-claws-bite", category: "cc", name: "Beast Claws/Bite", cost: 2, profiles: [{ label: "Profile", atk: "User", hit: "User", dmg: "3/4", special: [] }] },
    { id: "cc:big-blade-axe", category: "cc", name: "Big Blade/axe", cost: 3, profiles: [{ label: "Profile", atk: "User", hit: "User", dmg: "3/5", special: [] }] },
    { id: "cc:big-chainblade", category: "cc", name: "Big Chainblade", cost: 5, profiles: [{ label: "Profile", atk: "User", hit: "User", dmg: "5/6", special: [] }] },
    { id: "cc:blade-axe", category: "cc", name: "Blade/axe", cost: 2, profiles: [{ label: "Profile", atk: "User", hit: "User", dmg: "3/4", special: [] }] },
    { id: "cc:chainsword", category: "cc", name: "Chainsword", cost: 4, profiles: [{ label: "Profile", atk: "User", hit: "User", dmg: "4/5", special: [] }] },
    { id: "cc:huge-hammer-axe-blade", category: "cc", name: "Huge Hammer/Axe/Blade", cost: 6, profiles: [{ label: "Profile", atk: "User", hit: "User", dmg: "5/6", special: ["Reroll (1)"] }] },
    { id: "cc:monstrous-claws", category: "cc", name: "Monstrous Claws", cost: 6, profiles: [{ label: "Profile", atk: "User", hit: "User", dmg: "5/6", special: ["MW (1)"] }] },
    { id: "cc:poisoned-knife", category: "cc", name: "Poisoned Knife", cost: 3, profiles: [{ label: "Profile", atk: "User", hit: "User", dmg: "3/4", special: ["Poison"] }] },
    { id: "cc:poisoned-weapon", category: "cc", name: "Poisoned Weapon", cost: 6, profiles: [{ label: "Profile", atk: "User", hit: "User", dmg: "4/5", special: ["Poison", "Reroll (SR)"] }] },
    { id: "cc:power-fist", category: "cc", name: "Power Fist", cost: 7, profiles: [{ label: "Profile", atk: "User", hit: "User -2", dmg: "5/7", special: ["Crits on 9+", "MW (1)"] }] },
    { id: "cc:power-knife", category: "cc", name: "Power Knife", cost: 4, profiles: [{ label: "Profile", atk: "User", hit: "User", dmg: "3/5", special: ["Crits on 9+"] }] },
    { id: "cc:power-rapier", category: "cc", name: "Power Rapier", cost: 6, profiles: [{ label: "Profile", atk: "User", hit: "User", dmg: "4/5", special: ["Crits on 9+"] }] },
    { id: "cc:power-weapon", category: "cc", name: "Power Weapon", cost: 7, profiles: [{ label: "Profile", atk: "User", hit: "User", dmg: "4/6", special: ["Crits on 9+"] }] },
    { id: "cc:psychic-staff", category: "cc", name: "Psychic Staff", cost: 8, profiles: [{ label: "Profile", atk: "User", hit: "User", dmg: "4/6", special: ["Crits on 9+", "Fire"] }] },
    { id: "cc:thunder-hammer", category: "cc", name: "Thunder Hammer", cost: 8, profiles: [{ label: "Profile", atk: "User", hit: "User -2", dmg: "5/7", special: ["Crits on 9+", "MW (2)"] }] },
  ],
  // Pistols / Grenades
  pistol: [
    { id: "p:arc-pistol", category: "pistol", name: "Arc Pistol", cost: 4, profiles: [{ label: "Profile", atk: 4, hit: "User", dmg: "4/5", special: ["Rng 8\"", "Piercing (-3)"] }] },
    { id: "p:auto-laspistol", category: "pistol", name: "Auto/Laspistol", cost: 2, profiles: [{ label: "Profile", atk: 4, hit: "User", dmg: "2/3", special: ["Rng 8\""] }] },
    { id: "p:bolt-pistol", category: "pistol", name: "Bolt Pistol", cost: 3, profiles: [{ label: "Profile", atk: 4, hit: "User", dmg: "3/4", special: ["Rng 8\"", "Piercing Crits (-2)"] }] },
    { id: "p:hand-flamer", category: "pistol", name: "Hand Flamer", cost: 5, profiles: [{ label: "Profile", atk: 4, hit: "User +2", dmg: "3/4", special: ["Rng 6\"", "Ignores Cover", "Torrent (1\")", "Fire"] }] },
    { id: "p:melta-pistol", category: "pistol", name: "Melta Pistol", cost: 7, profiles: [{ label: "Profile", atk: 4, hit: "User", dmg: "6/3", special: ["Rng 3\"", "Piercing (-5)", "MW (4)"] }] },
    { id: "p:phosphor-blast-pistol", category: "pistol", name: "Phosphor Blast Pistol", cost: 4, profiles: [{ label: "Profile", atk: 4, hit: "User", dmg: "3/4", special: ["Rng 8\"", "Blast (1\")"] }] },
    { id: "p:plasma-pistol", category: "pistol", name: "Plasma Pistol", cost: 7, profiles: [
      { label: "Std", atk: 4, hit: "User", dmg: "5/6", special: ["Rng 8\"", "Piercing (-3)", "Crits on 9+"] },
      { label: "Supercharged", atk: 4, hit: "User", dmg: "6/6", special: ["Rng 8\"", "Piercing (-4)", "Crits on 9+", "Risky"] },
    ] },
    { id: "p:rokkit-pistol", category: "pistol", name: "Rokkit Pistol", cost: 7, profiles: [{ label: "Profile", atk: 6, hit: "User", dmg: "4/5", special: ["Rng 8\"", "Blast (1\")"] }] },
    { id: "p:slugga", category: "pistol", name: "Slugga", cost: 2, profiles: [{ label: "Profile", atk: 6, hit: "User", dmg: "1/2", special: ["Rng 8\""] }] },
    { id: "p:warpflame-pistol", category: "pistol", name: "Warpflame Pistol", cost: 6, profiles: [{ label: "Profile", atk: 4, hit: "User+2", dmg: "3/4", special: ["Rng 6\"", "Ignores Cover", "Piercing (-2)", "Torrent (1\")", "Fire"] }] },
    { id: "p:frag-grenade", category: "pistol", name: "Frag Grenade", cost: 2, profiles: [{ label: "Profile", atk: 4, hit: "User -2", dmg: "2/4", special: ["Rng 6\"", "Blast (2\")", "Ignores Cover", "One Use Only"] }] },
    { id: "p:krak-grenade", category: "pistol", name: "Krak Grenade", cost: 2, profiles: [{ label: "Profile", atk: 4, hit: "User -2", dmg: "4/5", special: ["Rng 6\"", "Piercing (-2)", "Ignores Cover", "One Use Only"] }] },
    { id: "p:melta-bomb", category: "pistol", name: "Melta Bomb", cost: 4, profiles: [{ label: "Profile", atk: 4, hit: "User -2", dmg: "5/6", special: ["Rng 6\"", "Blast (2\")", "Piercing (-2)", "One Use Only", "2 AP action"] }] },
  ],
  // Light/Medium Ranged
  ranged: [
    { id: "r:auto-lasgun", category: "ranged", name: "Auto/Lasgun", cost: 3, profiles: [{ label: "Profile", atk: 4, hit: "User", dmg: "2/3", special: [] }] },
    { id: "r:bolt-gun", category: "ranged", name: "Bolt Gun", cost: 4, profiles: [{ label: "Profile", atk: 4, hit: "User", dmg: "3/4", special: ["Piercing Crits (-2)"] }] },
    { id: "r:gauss-blaster", category: "ranged", name: "Gauss Blaster", cost: 5, profiles: [{ label: "Profile", atk: 4, hit: "User", dmg: "4/5", special: ["Piercing (-2)"] }] },
    { id: "r:hvy-shotgun", category: "ranged", name: "Hvy. Shotgun", cost: 4, profiles: [{ label: "Profile", atk: 4, hit: "3+", dmg: "4/4", special: ["Rng 6\""] }] },
    { id: "r:inferno-bolt-gun", category: "ranged", name: "Inferno Bolt Gun", cost: 5, profiles: [{ label: "Profile", atk: 4, hit: "User", dmg: "3/4", special: ["Piercing (-2)"] }] },
    { id: "r:ion-rifle", category: "ranged", name: "Ion Rifle", cost: 5, profiles: [{ label: "Profile", atk: 4, hit: "User", dmg: "4/5", special: ["Piercing Crits (-2)"] }] },
    { id: "r:neutron-blaster", category: "ranged", name: "Neutron Blaster", cost: 6, profiles: [{ label: "Profile", atk: 4, hit: "User", dmg: "3/3", special: ["MW (2)"] }] },
    { id: "r:pulse-carbine", category: "ranged", name: "Pulse Carbine", cost: 5, profiles: [{ label: "Profile", atk: 4, hit: "User", dmg: "4/5", special: ["Reroll (1)"] }] },
    { id: "r:shotgun", category: "ranged", name: "Shotgun", cost: 3, profiles: [{ label: "Profile", atk: 4, hit: "3+", dmg: "3/3", special: ["Rng 6\""] }] },
    { id: "r:tesla-carbine", category: "ranged", name: "Tesla Carbine", cost: 6, profiles: [{ label: "Profile", atk: 5, hit: "User", dmg: "3/3", special: ["Deals MW (2) to Fighters within 2\" of target."] }] },
  ],
  // Special
  special: [
    { id: "s:flamer", category: "special", name: "Flamer", cost: 10, profiles: [{ label: "Profile", atk: 4, hit: "User +2", dmg: "4/4", special: ["Rng 10\"", "Ignores Cover", "Torrent (2\")", "Fire"] }] },
    { id: "s:grenade-launcher", category: "special", name: "Grenade Launcher", cost: 10, profiles: [
      { label: "Frag", atk: 4, hit: "User", dmg: "2/4", special: ["Blast (2\")"] },
      { label: "Krak", atk: 4, hit: "User", dmg: "4/5", special: ["Piercing (-2)"] },
    ] },
    { id: "s:melta-gun", category: "special", name: "Melta Gun", cost: 10, profiles: [{ label: "Profile", atk: 4, hit: "User", dmg: "6/3", special: ["Rng 6\"", "Piercing (-5)", "MW (4)"] }] },
    { id: "s:neutron-rail-rifle", category: "special", name: "Neutron Rail Rifle", cost: 7, profiles: [{ label: "Profile", atk: 4, hit: "User", dmg: "4/4", special: ["MW (2)"] }] },
    { id: "s:plasma-gun", category: "special", name: "Plasma Gun", cost: 10, profiles: [
      { label: "Std", atk: 4, hit: "User", dmg: "5/6", special: ["Piercing (-3)", "Crits on 9+"] },
      { label: "Supercharged", atk: 4, hit: "User", dmg: "6/6", special: ["Piercing (-4)", "Crits on 9+", "Risky"] },
    ] },
    { id: "s:scoped-big-shoota", category: "special", name: "Scoped Big Shoota", cost: 10, profiles: [{ label: "Profile", atk: 5, hit: "User +1", dmg: "3/3", special: ["MW (2)", "Heavy"] }] },
    { id: "s:shredder", category: "special", name: "Shredder", cost: 9, profiles: [{ label: "Profile", atk: 4, hit: "User", dmg: "4/5", special: ["Piercing (-3)"] }] },
    { id: "s:sniper-rifle", category: "special", name: "Sniper Rifle", cost: 12, profiles: [{ label: "Profile", atk: 4, hit: "User +1", dmg: "3/3", special: ["Piercing (-2)", "Ignores Cover", "MW (3)"] }] },
    { id: "s:synaptic-disintegrator", category: "special", name: "Synaptic Disintegrator", cost: 14, profiles: [{ label: "Profile", atk: 4, hit: "User +1", dmg: "4/3", special: ["Piercing (-2)", "Ignores Cover", "MW (2)"] }] },
    { id: "s:warpflamer", category: "special", name: "Warpflamer", cost: 7, profiles: [{ label: "Profile", atk: 4, hit: "User +2", dmg: "4/4", special: ["Rng 8\"", "Ignores Cover", "Torrent (2\")", "Piercing (-2)", "Fire"] }] },
  ],
  // Heavy
  heavy: [
    { id: "h:eavy-rokkit-launcha", category: "heavy", name: "‘Eavy Rokkit Launcha", cost: 13, profiles: [{ label: "Profile", atk: 6, hit: "User +2", dmg: "4/5", special: ["Blast (1\")", "Heavy (Dash)"] }] },
    { id: "h:big-shoota", category: "heavy", name: "Big Shoota", cost: 7, profiles: [{ label: "Profile", atk: 6, hit: "User", dmg: "3/4", special: [] }] },
    { id: "h:chaincannon", category: "heavy", name: "Chaincannon", cost: 10, profiles: [{ label: "Profile", atk: 6, hit: "User", dmg: "4/4", special: ["Reroll (1)", "Heavy (Dash)"] }] },
    { id: "h:frag-cannon", category: "heavy", name: "Frag Cannon", cost: 10, profiles: [
      { label: "Shell", atk: 4, hit: "User", dmg: "5/7", special: ["Piercing (-3)"] },
      { label: "Shrapnel", atk: 5, hit: "User", dmg: "4/5", special: ["Blast (2\")"] },
    ] },
    { id: "h:heavy-bolter", category: "heavy", name: "Heavy Bolter", cost: 10, profiles: [{ label: "Profile", atk: 5, hit: "User", dmg: "5/6", special: ["Reroll (1)", "Heavy (Dash)"] }] },
    { id: "h:heavy-stubber", category: "heavy", name: "Heavy Stubber", cost: 6, profiles: [{ label: "Profile", atk: 5, hit: "User", dmg: "4/5", special: ["Heavy (Dash)"] }] },
    { id: "h:lascannon", category: "heavy", name: "Lascannon", cost: 10, profiles: [{ label: "Profile", atk: 4, hit: "User", dmg: "6/7", special: ["Piercing (-2)", "MW (2)", "Heavy (Dash)"] }] },
    { id: "h:missile-launcher", category: "heavy", name: "Missile Launcher", cost: 10, profiles: [
      { label: "Krak", atk: 4, hit: "User", dmg: "6/7", special: ["Piercing (-4)", "Heavy (Dash)"] },
      { label: "Frag", atk: 4, hit: "User", dmg: "3/5", special: ["Blast (2\")", "Piercing Crits (-2)", "Heavy (Dash)"] },
    ] },
    { id: "h:multi-melta", category: "heavy", name: "Multi Melta", cost: 13, profiles: [{ label: "Profile", atk: 4, hit: "User", dmg: "6/3", special: ["MW (4)", "Heavy (Dash)", "Piercing (-5)"] }] },
    { id: "h:plasma-cannon", category: "heavy", name: "Plasma Cannon", cost: 12, profiles: [
      { label: "Std", atk: 4, hit: "User", dmg: "5/6", special: ["Blast (2\")", "Piercing (-3)", "Heavy (Dash)"] },
      { label: "Supercharged", atk: 4, hit: "User", dmg: "6/6", special: ["Blast (2\")", "Piercing (-3)", "Heavy (Dash)", "Risky"] },
    ] },
    { id: "h:rokkit-launcha", category: "heavy", name: "Rokkit Launcha", cost: 9, profiles: [{ label: "Profile", atk: 6, hit: "User", dmg: "4/5", special: ["Blast (1\")"] }] },
    { id: "h:shuriken-cannon", category: "heavy", name: "Shuriken Cannon", cost: 7, profiles: [{ label: "Profile", atk: 5, hit: "User", dmg: "4/5", special: [] }] },
    { id: "h:soulreaper-cannon", category: "heavy", name: "Soulreaper Cannon", cost: 12, profiles: [{ label: "Profile", atk: 6, hit: "User", dmg: "4/5", special: ["Piercing Crits (-2)"] }] },
    { id: "h:wraith-cannon", category: "heavy", name: "Wraith Cannon", cost: 13, profiles: [{ label: "Profile", atk: 4, hit: "User", dmg: "6/3", special: ["MW (3)", "Heavy (Dash)", "Piercing (-4)", "Crits on 9+"] }] },
    { id: "h:placeholder", category: "heavy", name: "Wraith Cannon", cost: 13, profiles: [{ label: "Profile", atk: 4, hit: "User", dmg: "6/3", special: ["MW (3)", "Heavy (Dash)", "Piercing (-4)", "Crits on 9+"] }] },
  ],
};

// =============== Equipment ===============
// costType: 'flat' | 'percent'; percent applies to Base+Stats and is rounded up.
const EQUIPMENT = [
  { id: 'eq:medipack', name: 'Medipack Kit', onlyOne: true, costType: 'flat', costValue: 4, rules: [
    '1 AP Action: Friendly Fighter within 1” regains 2D3 lost HP.'
  ]},
  { id: 'eq:scanner', name: 'Scanner/Auspex', onlyOne: false, costType: 'flat', costValue: 4, rules: [
    '1 AP Action: Token an enemy in LoS; attacks vs that target gain Reroll (SR) until next turn.'
  ]},
  { id: 'eq:blink-pack', name: 'Blink Pack / Personal Teleporter', onlyOne: true, costType: 'percent', costValue: 0.5, rules: [
    '1 AP: Reposition up to 12”; ignore terrain/vertical; cannot Charge/Dash this activation.',
    'After use roll D12: on 1–2 suffer D3 Mortal Wounds and no more actions this activation.'
  ]},
  { id: 'eq:jump-pack', name: 'Jump Pack / Rokkit Pack / Wings', onlyOne: false, costType: 'percent', costValue: 0.33, rules: [
    'Jump Move: +3” Move; ignore terrain/vertical when repositioning.'
  ]},
  { id: 'eq:banner', name: 'Banner', onlyOne: true, costType: 'flat', costValue: 2, rules: [
    'Friendly Fighters within 3” gain +1 to hit with CC and Shooting.'
  ]},
  { id: 'eq:demolitions', name: 'Demolitions', onlyOne: true, costType: 'flat', costValue: 6, rules: [
    'Plant one Explosive Device per game during reposition.',
    '1 AP: Detonate (ATK 4, Hit 3+, DMG 5/6, Piercing (-2), Blast (2”)).'
  ]},
  { id: 'eq:climbing', name: 'Climbing Equipment', onlyOne: false, costType: 'flat', costValue: 2, rules: [
    'Ignore first 2” of vertical repositioning.'
  ]},
  { id: 'eq:holy-relic', name: 'Holy Relic', onlyOne: true, costType: 'flat', costValue: 3, rules: [
    'Ignore 1 normal damage attack per game.'
  ]},
  { id: 'eq:camo-cloak', name: 'Camo Cloak', onlyOne: false, costType: 'flat', costValue: 4, rules: [
    'Gain -1 to hit when in cover or Hidden (stacks).'
  ]},
  { id: 'eq:force-field', name: 'Force Field', onlyOne: true, costType: 'flat', costValue: 5, rules: [
    'Gain a 9+ Aegis save.'
  ]},
  { id: 'eq:combat-drugs', name: 'Combat Drugs', onlyOne: false, costType: 'flat', costValue: 4, rules: [
    'At start of activation choose: Heal 2D3; or Reroll (SR) on CC until end of turn; or +2” Move until end of turn.'
  ]},
  { id: 'eq:mc-force-field', name: 'Mastercrafted Force Field', onlyOne: true, costType: 'flat', costValue: 10, rules: [
    'Gain a 7+ Aegis save.'
  ]},
  { id: 'eq:suspensor', name: 'Suspensor System', onlyOne: false, costType: 'flat', costValue: 3, rules: [
    'Heavy Weapons gain “Heavy (Move)”.'
  ]},
  { id: 'eq:grenadier', name: 'Grenadier', onlyOne: true, costType: 'flat', costValue: 6, rules: [
    'Unlimited Frag/Krak grenades; +2 to hit when using them.'
  ]},
  { id: 'eq:comms', name: 'Comms Equipment', onlyOne: true, costType: 'flat', costValue: 4, rules: [
    '1 AP: Grant a friendly Fighter within 9” +1 AP.'
  ]},
  { id: 'eq:recon-drone', name: 'Recon Drone / Servo Skull', onlyOne: false, costType: 'flat', costValue: 4, rules: [
    '1 AP: Token an enemy in LoS; ignore negative To-Hit from Light Cover or Hidden until end of turn.'
  ]},
  { id: 'eq:breaching-ram', name: 'Breaching Ram', onlyOne: true, costType: 'flat', costValue: 5, rules: [
    'Treat walls < 1” as Accessible Terrain (costs 1” Move to pass).'
  ]},
  { id: 'eq:shimmershield', name: 'Shimmershield', onlyOne: true, costType: 'flat', costValue: 4, rules: [
    'Bearer and friendlies within 2” reduce Piercing of enemy shooting by 2.'
  ]},
  { id: 'eq:digital-weapons', name: 'Digital Weapons', onlyOne: true, costType: 'flat', costValue: 2, rules: [
    'At start of Close Combat, deal 2 damage to the enemy Fighter.'
  ]},
  { id: 'eq:storm-shield', name: 'Storm Shield', onlyOne: true, costType: 'flat', costValue: 5, rules: [
    'Gain 7+ Aegis; 4 Defense dice in CC when using this.',
    'May only take Pistols and/or Close Combat weapons.'
  ]},
  { id: 'eq:comms-jammer', name: 'Comms Jammer', onlyOne: true, costType: 'flat', costValue: 5, rules: [
    '1 AP: Choose a visible enemy; that Fighter must activate last this turn.'
  ]},
  { id: 'eq:grappling-hook', name: 'Grappling Hook Gun', onlyOne: true, costType: 'flat', costValue: 5, rules: [
    '1 AP: Place this Fighter within 1” of a chosen terrain point; counts as Move.',
    'This Fighter may not have any ranged weapons.'
  ]},
  { id: 'eq:macabre-memento', name: 'Macabre Memento', onlyOne: true, costType: 'flat', costValue: 6, rules: [
    'While visible and within 3” of enemies, reduce their Ranged and Melee ATK by 1.'
  ]},
  { id: 'eq:command-uplink', name: 'Command Uplink', onlyOne: true, costType: 'flat', costValue: 5, rules: [
    'Gain 1 extra FP at the start of the battle.'
  ]},
  { id: 'eq:blessed-ammo', name: 'Blessid/Tainted Ammo', onlyOne: true, costType: 'flat', costValue: 5, rules: [
    'Add +1 to both damage values of this Fighter’s Ranged weapons (not Heavy).'
  ]},
  { id: 'eq:targeting-designator', name: 'Targeting Designator', onlyOne: false, costType: 'flat', costValue: 14, rules: [
    'Gain an extra Ranged weapon: Artillery strike – ATK 4, Hit 6+, DMG 3/5, Blast (2”), Heavy (Dash), usable while Hidden.'
  ]},
  { id: 'eq:laser-sight', name: 'Laser Sight', onlyOne: false, costType: 'flat', costValue: 3, rules: [
    'Ranged weapons with “Rng X” (not Flamers/Grenades) gain +1” range.'
  ]},
  { id: 'eq:grav-chute', name: 'Grav Chute / Sliders', onlyOne: false, costType: 'flat', costValue: 3, rules: [
    'Ignore vertical height when dropping down.'
  ]},
  { id: 'eq:gorget', name: 'Gorget Protection', onlyOne: false, costType: 'flat', costValue: 4, rules: [
    'Enemies can only Crit on 11+ in Close Combat.'
  ]},
  { id: 'eq:operational-intel', name: 'Operational Intelligence', onlyOne: false, costType: 'flat', costValue: 4, rules: [
    'Once per battle you may reroll the initiative. In Randomized Activation, return token and draw another.'
  ]},
  { id: 'eq:hyperstatic-field', name: 'Hyperstatic Field', onlyOne: false, costType: 'flat', costValue: 5, rules: [
    'When an enemy moves within 1”, roll 3D12; deal 1 Mortal Wound per 9+.'
  ]},
  { id: 'eq:markerlights', name: 'Markerlights', onlyOne: false, costType: 'flat', costValue: 5, rules: [
    '1 AP: Place a markerlight on an enemy.',
    'Shooting vs markerlit targets: 1 token = No Cover; 2 tokens = No Cover + Reroll (1).'
  ]},
];

// =============== Fighter Abilities ===============
// costType: 'flat' | 'percent_hp' | 'equal_hp'
const ABILITIES = [
  { id: 'fa:counterstrike', name: 'Counterstrike', costType: 'flat', costValue: 4, rules: [
    'Each time an enemy Fighter deals this Fighter damage from an attack dice in Close Combat, this Fighter deals that Fighter 1 Mortal Wound.'
  ]},
  { id: 'fa:terrifying', name: 'Terrifying', costType: 'flat', costValue: 3, rules: [
    'Enemy Fighters within 1” of this Fighter have -2 to hit in Close Combat.'
  ]},
  { id: 'fa:expert-gunfighter', name: 'Expert Gunfighter', costType: 'flat', costValue: 4, rules: [
    'This Fighter can use Shooting attacks (Pistols only) within 1” of Enemy Fighters.'
  ]},
  { id: 'fa:expert-dueller', name: 'Expert Dueller', costType: 'flat', costValue: 4, rules: [
    'This Fighter’s Close Combat weapons gain Reroll (SR).'
  ]},
  { id: 'fa:horrifying-dismemberment', name: 'Horrifying Dismemberment', costType: 'flat', costValue: 2, rules: [
    'When this Fighter slays an enemy in Close Combat, enemy Fighters within 6” of the slain enemy get -1 AP for the rest of the turn.'
  ]},
  { id: 'fa:experienced-brawler', name: 'Experienced Brawler', costType: 'flat', costValue: 2, rules: [
    'This Fighter does not suffer -2 to hit for being outnumbered in Close Combat, and enemies do not gain +2 to hit for outnumbering this Fighter.'
  ]},
  { id: 'fa:null-pariah', name: 'Null / Pariah', costType: 'flat', costValue: 5, rules: [
    'This Fighter cannot be targeted by Psychic Powers and cannot be a Psyker.',
    'Any Psykers within 6” (friendly or enemy) cannot use their Psychic Powers.'
  ]},
  { id: 'fa:zealot', name: 'Zealot', costType: 'flat', costValue: 3, rules: [
    'If this Fighter charged this activation, it gains +1 to hit in Close Combat.'
  ]},
  { id: 'fa:fast', name: 'Fast', costType: 'flat', costValue: 2, rules: [
    'This Fighter may perform one Free Dash during its activation.'
  ]},
  { id: 'fa:hyper-aggressive', name: 'Hyper Aggressive', costType: 'flat', costValue: 4, rules: [
    'This Fighter may perform either 2 Shooting actions (Pistols/Light/Medium only) or 2 Close Combat actions during its activation.'
  ]},
  { id: 'fa:gestalt-mind', name: 'Gestalt Mind', costType: 'flat', costValue: 2, rules: [
    'This Fighter may share its AP with other Fighters in the Team that also have Gestalt Mind.',
    'When activating a Fighter, you may declare another unactivated friendly Gestalt Mind Fighter gains 1 AP (to a max of 4). Place a token on that Fighter.'
  ]},
  { id: 'fa:reanimation', name: 'Reanimation', costType: 'flat', costValue: 4, rules: [
    'When a Fighter with Reanimation is slain, place a Reanimation token within 1”. At the start of each turn roll a D12; on 5+, place the Fighter within 1” of the token with D3+2 HP (remove the token). A Fighter can only be Reanimated once per game.'
  ]},
  { id: 'fa:vengeance', name: 'Vengeance', costType: 'flat', costValue: 2, rules: [
    'When an enemy slays a friendly Fighter, that enemy gains a Vengeance token. Fighters with Vengeance can change a normal hit to a Crit when attacking a Vengeance-marked enemy. Remove the token when the enemy is slain. Tokens stack.'
  ]},
  { id: 'fa:power-from-pain', name: 'Power from Pain', costType: 'flat', costValue: 2, rules: [
    'Gain a PfP token each time this Fighter injures or slays an enemy. During this activation, spend a PfP token to: +1 AP (until end of turn), or regain D3+1 HP, or gain Reroll (SR) on all weapons (until end of turn).'
  ]},
  { id: 'fa:ruthless', name: 'Ruthless', costType: 'flat', costValue: 2, rules: [
    'This Fighter may shoot into Close Combat. Any fails (1s or 2s) hit the friendly model as normal damage.'
  ]},
  { id: 'fa:regenerate', name: 'Regenerate', costType: 'flat', costValue: 4, rules: [
    'At the beginning of its activation, this Fighter regains D3+1 lost HP.'
  ]},
  { id: 'fa:extremely-resilient', name: 'Extremely Resilient', costType: 'percent_hp', costValue: 0.33, rules: [
    'Whenever this Fighter takes damage from an attack, roll a D12 for each point of damage; on 9+, ignore that point of damage.',
    'Cost: +33% of Fighter’s HP stat (rounded up).'
  ]},
  { id: 'fa:unfettered-rage', name: 'Unfettered Rage', costType: 'flat', costValue: 4, rules: [
    'If this Fighter scores no Critical Hits in Close Combat, you may change one Normal Hit to a Critical Hit.'
  ]},
  { id: 'fa:noxious-presence', name: 'Noxious Presence', costType: 'flat', costValue: 4, rules: [
    'Enemy Fighters within 3” have their DEF reduced by 1. Stacks with other instances.'
  ]},
  { id: 'fa:scarred', name: 'Scarred', costType: 'flat', costValue: 3, rules: [
    'Once per turn when attacking in Close Combat, this Fighter may lose 1 HP to reroll one attack die. If the new roll succeeds, deal +1 damage; if it fails, lose 1 additional HP.'
  ]},
  { id: 'fa:born-in-darkness', name: 'Born in Darkness', costType: 'flat', costValue: 5, rules: [
    'This Fighter cannot be targeted by Shooting attacks made from 12” or more away, and cannot make Shooting attacks against targets 12” or more away.'
  ]},
  { id: 'fa:chem-specialist', name: 'Chem Specialist', costType: 'flat', costValue: 3, rules: [
    'Damage dealt by Poison/Fire tokens applied by this Fighter’s weapons instead deal D3+1 damage.'
  ]},
  { id: 'fa:trench-warrior', name: 'Trench Warrior', costType: 'flat', costValue: 4, rules: [
    'This Fighter can use the Shoot action even if Hidden.'
  ]},
  { id: 'fa:safeguard', name: 'Safeguard', costType: 'flat', costValue: 3, rules: [
    'Whenever this Fighter is within proximity of an Objective, their weapons gain Reroll (SR).'
  ]},
  { id: 'fa:gunslinger', name: 'Gunslinger', costType: 'flat', costValue: 4, rules: [
    '1 AP: If the Fighter has not used a Shooting action this activation, it may perform two free Shooting actions with Pistol weapons.'
  ]},
  { id: 'fa:head-taker', name: 'Head-taker', costType: 'flat', costValue: 3, rules: [
    'Whenever this Fighter kills an enemy in Melee, increase Crit damage for all its melee weapons by +2 for the rest of the battle.'
  ]},
  { id: 'fa:overwatch', name: 'Overwatch', costType: 'flat', costValue: 4, rules: [
    'When an enemy ends a Move within 6” and visible, this Fighter may immediately perform a Shoot action at -2. Counts as its Counteract action for the turn. Cannot trigger if the enemy is within 1”.'
  ]},
  { id: 'fa:endless-horde', name: 'Endless Horde', costType: 'equal_hp', rules: [
    'When this Fighter dies, return it to the owning player’s Rearguard Deployment Zone at the start of the next turn.',
    'Only for Fighters with 2 AP or less and 10 HP or less.',
    'Cost: equal to the Fighter’s HP stat.'
  ]},
  { id: 'fa:volatile-expiration', name: 'Volatile Expiration', costType: 'flat', costValue: 3, rules: [
    'When this Fighter is slain, roll a D12 (subtract 2 if within 1” of another enemy Fighter). On 6+, each Fighter within 2” suffers D3 Mortal Wounds.'
  ]},
  { id: 'fa:expendable', name: 'Expendable', costType: 'flat', costValue: 3, rules: [
    'When this Fighter dies, roll a D12. On a 6+, you gain 1 FP.'
  ]},
  { id: 'fa:agent', name: 'Agent', costType: 'flat', costValue: 2, rules: [
    'The AP cost of all Interact actions is reduced by 1 (min 0).'
  ]},
  { id: 'fa:veteran-astartes', name: 'Veteran Astartes', costType: 'flat', costValue: 10, rules: [
    'This Fighter may perform either 2 Shooting actions or 2 Close Combat actions during its activation. If it shoots with a Special or Heavy weapon, the second Shoot action costs 2 AP.',
    'Additionally, this Fighter may perform 2 Actions when Counteracting, but they must be different actions.'
  ]},
];

// =============== Leader Abilities ===============
const LEADER_ABILITIES = [
  { id: 'lead:inspiring-presence', name: 'Inspiring Presence', rules: [
    '1 AP: Friendly Fighters within 3” of your Leader gain 1 AP until end of turn.'
  ]},
  { id: 'lead:master-tactician', name: 'Master Tactician', rules: [
    '1 AP: You immediately gain 1 FP.'
  ]},
  { id: 'lead:guidance', name: 'Guidance', rules: [
    '1 AP: Choose a Friendly Fighter within Line of Sight. This Fighter gains 1 AP until end of turn.'
  ]},
  { id: 'lead:grizzled-veteran', name: 'Grizzled Veteran', rules: [
    'As long as this Fighter is on the Battlefield, you can use the Tactical Reroll once pr. Turn for 0 FP.'
  ]},
  { id: 'lead:heroic-leader', name: 'Heroic Leader', rules: [
    "May use a Feat for free once pr. Turn, but only during his activation."
  ]},
  { id: 'lead:give-orders', name: 'Give Orders', rules: [
    '1 AP: All Fighters within 6” gain (choose one for all Fighters, lasts until end of turn) either +1 to hit, +1” charge range or Hide action for 0 AP.'
  ]},
  { id: 'lead:no-escape', name: 'No Escape', rules: [
    'The Fall Back action of Enemy Fighters within melee range has its Move stat reduced by 2”.'
  ]},
  { id: 'lead:get-him-mark', name: 'Get Him! (Mark)', rules: [
    "1 AP: Select an Enemy Fighter within this Fighter's Line of Sight. All shooting attacks against that Fighter gain Reroll (SR) until end of turn."
  ]},
  { id: 'lead:perfect-duellist', name: 'Perfect Duellist', rules: [
    'This Fighter can defend against Critical Hits in Close Combat using Normal Defense Rolls.'
  ]},
  { id: 'lead:implacable', name: 'Implacable', rules: [
    'This Fighter is immune to Glancing Hits.'
  ]},
  { id: 'lead:impermeable', name: 'Impermeable', rules: [
    'This Fighter is immune to effects from the Poison/Fire keyword.'
  ]},
  { id: 'lead:infernal', name: 'Infernal', rules: [
    'This Fighter’s weapons gain Poison/Fire. Attacks against enemy Fighters with a Poison/Fire token on them improves the weapon’s damage stat by +1/+1.'
  ]},
  { id: 'lead:uncontrolled-eruption', name: 'Uncontrolled Eruption', rules: [
    '2 AP: Inflict D3+2 Mortal Wounds to each other Fighter that is within 2” and visible to this Fighter.'
  ]},
  { id: 'lead:whispers-of-the-warp', name: 'Whispers of the Warp', rules: [
    'Whenever an opponent activates a Fighter within 6”, roll a D6. If the result is higher than that Fighter’s AP, the Fighter loses 1 AP for this activation.'
  ]},
  { id: 'lead:spiritual-pariah', name: 'Spiritual Pariah', rules: [
    'Enemy Fighters cannot reroll attacks or defence rolls when they are within 6” and visible to this Fighter.'
  ]},
  { id: 'lead:merciless-onslaught', name: 'Merciless Onslaught', rules: [
    '1 AP: Activate this ability before you roll to hit with a Close Combat attack. For the duration of the attack, Glancing Hits deal 2 damage.'
  ]},
  { id: 'lead:get-him-aura', name: 'Get Him! (Aura)', rules: [
    '2 AP: All friendly Fighters visible and within 6” has for the duration of the turn EITHER their Move increased by 2” and Fight stat improved by 2, OR their Shoot stat improved by 2. This ability can only be activated once per battle and the active Fighter is immediately spent.'
  ]},
  { id: 'lead:mind-on-the-mission', name: 'Mind on the Mission', rules: [
    'All Fighters within 6” may use the Interact action for 0 AP.'
  ]},
  { id: 'lead:feed-on-pain', name: 'Feed on Pain', rules: [
    'If this Fighter slays an enemy Fighter with an attack, this Fighter regains 3 lost HP.'
  ]}
];

// =============== Component ===============
export default function StatsBuilderStandalone() {
  const [pointsCap, setPointsCap] = useState(375);
  const [stats, setStats] = useState(
    Object.fromEntries(Object.keys(STAT_CONFIG).map(k => [k, STAT_CONFIG[k].base]))
  );
  const [psyker, setPsyker] = useState(false);
  const [masterPsyker, setMasterPsyker] = useState(false);
  const [selectedPowers, setSelectedPowers] = useState([]);
  const [leaderAbilities, setLeaderAbilities] = useState([]);

  const [pane, setPane] = useState('weapons'); // 'weapons' | 'equipment'
  const [activeCategory, setActiveCategory] = useState(null); // weapon category selector
  const [selectedWeapons, setSelectedWeapons] = useState([]);
  const [variantChoice, setVariantChoice] = useState({}); // weaponId -> profile index

  const [selectedEquipment, setSelectedEquipment] = useState([]);
  const [selectedAbilities, setSelectedAbilities] = useState([]);

  const allWeaponsFlat = useMemo(() => Object.values(WEAPONS).reduce((acc, arr) => acc.concat(arr), []), []);
  const weaponIndex = useMemo(() => Object.fromEntries(allWeaponsFlat.map(w => [w.id, w])), [allWeaponsFlat]);
  const equipmentIndex = useMemo(() => Object.fromEntries(EQUIPMENT.map(e => [e.id, e])), []);
  const abilitiesIndex = useMemo(() => Object.fromEntries(ABILITIES.map(a => [a.id, a])), []);

  // Sanity checks (runtime tests)
  useEffect(() => {
    const missing = allWeaponsFlat.filter(w => !Array.isArray(w.profiles) || w.profiles.length === 0);
    if (missing.length) console.warn("Weapon entries missing profiles:", missing.map(w => w.id));
  }, [allWeaponsFlat]);
  useEffect(() => { if ([pointsCap].some(isNaN)) console.warn("Points cap is NaN"); }, [pointsCap]);

  const totalStatsCost = () => {
    return Object.entries(STAT_CONFIG).reduce((sum, [k, cfg]) => {
      const value = stats[k];
      const base = cfg.base;
      let improve = 0; let worsen = 0;
      if (cfg.reverse) {
        if (value < base) improve = base - value; 
        if (value > base) worsen = value - base; 
      } else {
        if (value > base) improve = value - base; 
        if (value < base) worsen = base - value; 
      }
      return sum + improve * (cfg.upCost || 0) - worsen * (cfg.downCost || 0);
    }, 0);
  };

  const BASE_COST = 16;
  const statsCost = totalStatsCost();
  const baseAndStats = BASE_COST + statsCost;
  let psychicAdd = 0;
  if (psyker) psychicAdd = Math.ceil(baseAndStats * 0.5);
  if (masterPsyker) psychicAdd = Math.ceil(baseAndStats * 0.66);

  const weaponsTotal = selectedWeapons.reduce((sum, id) => sum + (weaponIndex[id]?.cost || 0), 0);
  const equipmentTotal = selectedEquipment.reduce((sum, id) => {
    const e = equipmentIndex[id];
    if (!e) return sum;
    if (e.costType === 'percent') {
      return sum + Math.ceil(baseAndStats * (e.costValue || 0));
    }
    return sum + (e.costValue || 0);
  }, 0);

  const abilitiesTotal = selectedAbilities.reduce((sum, id) => {
    const a = abilitiesIndex[id];
    if (!a) return sum;
    if (a.costType === 'percent_hp') return sum + Math.ceil((stats.HP || 0) * (a.costValue || 0));
    if (a.costType === 'equal_hp') return sum + (stats.HP || 0);
    return sum + (a.costValue || 0);
  }, 0);

  const total = baseAndStats + psychicAdd + weaponsTotal + equipmentTotal + abilitiesTotal;
  const overCap = total > pointsCap;

  const toggleWeapon = (id) => setSelectedWeapons(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  const toggleEquipment = (id) => setSelectedEquipment(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  const toggleAbility = (id) => setSelectedAbilities(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);

  return (
    <div className="p-5 max-w-7xl mx-auto bg-gray-900 text-gray-100 rounded-lg">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <h1 className="text-2xl font-bold tracking-tight">Fighter Builder</h1>
        <div className="flex items-center gap-2 text-sm">
          <label className="opacity-80">Points cap</label>
          <input
            type="number"
            value={pointsCap}
            onChange={(e) => setPointsCap(parseInt(e.target.value || 0, 10))}
            className="w-24 bg-gray-800 border border-gray-700 rounded px-2 py-1"
          />
        </div>
      </div>

      {/* STATS + SUMMARY */}
      <div className="grid grid-cols-1 gap-4">
        <div>
          {/* Stats row */}
          <div className="flex flex-wrap gap-3 mb-4">
            {Object.keys(STAT_CONFIG).map((stat) => (
              <div key={stat} className="min-w-[110px] flex-1 bg-gray-800/70 rounded p-2 border border-gray-700">
                <div className="text-xs uppercase tracking-wide text-gray-400">{stat}</div>
                <div className="text-lg font-semibold">{STAT_CONFIG[stat].format(stats[stat])}</div>
                <div className="flex gap-1 mt-1">
                  <button
                    className="px-2 py-1 bg-gray-800 border border-gray-700 rounded disabled:opacity-40"
                    onClick={() => setStats(s => ({ ...s, [stat]: clamp(s[stat] - 1, STAT_CONFIG[stat].min, STAT_CONFIG[stat].max) }))}
                    disabled={stats[stat] <= STAT_CONFIG[stat].min}
                  >−</button>
                  <button
                    className="px-2 py-1 bg-gray-800 border border-gray-700 rounded disabled:opacity-40"
                    onClick={() => setStats(s => ({ ...s, [stat]: clamp(s[stat] + 1, STAT_CONFIG[stat].min, STAT_CONFIG[stat].max) }))}
                    disabled={STAT_CONFIG[stat].max !== null && stats[stat] >= (STAT_CONFIG[stat].max ?? Infinity)}
                  >+</button>
                </div>
              </div>
            ))}
          </div>

          {/* Psyker toggles (below stats) */}
          <div className="mb-4 flex flex-wrap gap-6 items-center">
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" className="w-4 h-4" checked={psyker} onChange={() => { setPsyker(!psyker); if (masterPsyker) setMasterPsyker(false); setSelectedPowers([]); }} />
              Psyker — use 1 Psychic Power per Activation, choose 2 (adds 50% of Base+Stats)
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" className="w-4 h-4" checked={masterPsyker} onChange={() => { setMasterPsyker(!masterPsyker); if (psyker) setPsyker(false); setSelectedPowers([]); }} />
              Master Psyker — use 2 per Activation, choose 3 (adds 66% of Base+Stats)
            </label>
          </div>

          {/* Powers picker (only when psyker selected) */}
          {(psyker || masterPsyker) && (
            <div className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-semibold">Choose Powers</h3>
                <div className="text-xs text-gray-400">Allowed: {masterPsyker ? 3 : 2} · Selected: {selectedPowers.length}</div>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
                {POWERS.map((p) => {
                  const active = selectedPowers.includes(p.name);
                  const limit = masterPsyker ? 3 : 2;
                  const disabled = !active && selectedPowers.length >= limit;
                  return (
                    <Tooltip
                      key={p.name}
                      content={(
                        <ul className="list-disc pl-5 text-xs space-y-1">
                          <li><strong>Range:</strong> {p.range}</li>
                          <li><strong>Psychic test:</strong> {p.test}</li>
                          <li><strong>Effect:</strong> {p.effect}</li>
                        </ul>
                      )}
                    >
                      <button
                        onClick={() => setSelectedPowers(prev => active ? prev.filter(n => n !== p.name) : disabled ? prev : [...prev, p.name])}
                        disabled={disabled}
                        className={`px-3 py-2 rounded border text-sm ${
                          active
                            ? 'bg-indigo-700/60 border-indigo-400 text-indigo-100'
                            : disabled
                              ? 'bg-gray-800 border-gray-700 text-gray-500 cursor-not-allowed'
                              : 'bg-gray-900 border-gray-700 hover:bg-gray-800 text-gray-200'
                        }`}
                      >
                        {p.name}
                      </button>
                    </Tooltip>
                  );
                })}
              </div>
            </div>
          )}

          {/* Pane selector */}
          <div className="flex items-center gap-2 mt-4 mb-2">
            <button onClick={() => setPane('weapons')} className={`px-3 py-1.5 rounded border text-sm ${pane==='weapons' ? 'bg-teal-700/60 border-indigo-400 text-indigo-100' : 'bg-gray-900 border-gray-700 hover:bg-gray-800 text-gray-200'}`}>Weapons</button>
            <button onClick={() => setPane('equipment')} className={`px-3 py-1.5 rounded border text-sm ${pane==='equipment' ? 'bg-indigo-700/60 border-indigo-400 text-indigo-100' : 'bg-gray-900 border-gray-700 hover:bg-gray-800 text-gray-200'}`}>Equipment</button>
            <button onClick={() => setPane('abilities')} className={`px-3 py-1.5 rounded border text-sm ${pane==='abilities' ? 'bg-indigo-700/60 border-indigo-400 text-indigo-100' : 'bg-gray-900 border-gray-700 hover:bg-gray-800 text-gray-200'}`}>Fighter Abilities</button>
            <button onClick={() => setPane('leader')} className={`px-3 py-1.5 rounded border text-sm ${pane==='leader' ? 'bg-indigo-700/60 border-indigo-400 text-indigo-100' : 'bg-gray-900 border-gray-700 hover:bg-gray-800 text-gray-200'}`}>Leader Abilities</button>
          </div>

          {/* Weapons pane */}
          {pane === 'weapons' && (
            <div className="mt-2">
              <div className="flex flex-wrap gap-2 mb-2">
                {CATEGORIES.map((c) => (
                  <button
                    key={c.key}
                    onClick={() => setActiveCategory(c.key)}
                    className={`px-3 py-1.5 rounded border text-sm ${activeCategory===c.key ? 'bg-indigo-700/60 border-indigo-400 text-indigo-100' : 'bg-gray-900 border-gray-700 hover:bg-gray-800 text-gray-200'}`}
                  >
                    {c.label}
                  </button>
                ))}
                <button
                  onClick={() => setActiveCategory(null)}
                  className={`px-3 py-1.5 rounded border text-sm ${activeCategory===null ? 'bg-gray-800 border-gray-700 text-gray-300' : 'bg-gray-900 border-gray-700 hover:bg-gray-800 text-gray-200'}`}
                >Clear</button>
              </div>

              {activeCategory ? (
                <div>
                  <div className="text-sm text-gray-400 mb-2">Category: {CATEGORIES.find(x=>x.key===activeCategory)?.label}</div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-3">
                    {(WEAPONS[activeCategory] || []).map((w) => {
                      const active = selectedWeapons.includes(w.id);
                      const choice = Math.min(variantChoice[w.id] ?? 0, (w.profiles?.length || 1) - 1);
                      const prof = w.profiles?.[choice] || w.profiles?.[0];
                      return (
                        <div key={w.id} className={`p-3 rounded border ${active ? 'bg-gray-900 border-indigo-400' : 'bg-gray-900 border-gray-800'}`}>
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <div className="font-semibold text-gray-100">{w.name}</div>
                              <div className="text-xs text-gray-400">Cost: {w.cost} pts</div>
                            </div>
                            <button
                              className={`px-2 py-1 text-xs rounded border ${active ? 'bg-indigo-600/60 border-indigo-400 text-indigo-50' : 'bg-gray-800 border-gray-700 hover:bg-gray-700'}`}
                              onClick={() => toggleWeapon(w.id)}
                            >
                              {active ? 'Remove' : 'Add'}
                            </button>
                          </div>

                          {Array.isArray(w.profiles) && w.profiles.length > 1 && (
                            <div className="mt-2 flex flex-wrap gap-1">
                              {w.profiles.map((p, i) => (
                                <button
                                  key={i}
                                  onClick={() => setVariantChoice(prev => ({ ...prev, [w.id]: i }))}
                                  className={`px-2 py-0.5 text-xs rounded border ${i === choice ? 'bg-gray-700 border-gray-600' : 'bg-gray-900 border-gray-800 hover:bg-gray-800'}`}
                                >
                                  {p.label}
                                </button>
                              ))}
                            </div>
                          )}

                          {prof && (
                            <div className="mt-2 grid grid-cols-4 gap-2 text-xs text-gray-300">
                              <div><span className="text-gray-500">ATK</span>: {prof.atk}</div>
                              <div><span className="text-gray-500">Hit</span>: {prof.hit}</div>
                              <div><span className="text-gray-500">DMG</span>: {prof.dmg}</div>
                              <div className="col-span-4"><span className="text-gray-500">Special</span>: {formatSpecial(prof.special)}</div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div className="text-sm text-gray-400">Select a weapon category to view cards.</div>
              )}
            </div>
          )}

          {/* Equipment pane */}
          {pane === 'equipment' && (
            <div className="mt-2">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-3">
                {EQUIPMENT.map((e) => {
                  const active = selectedEquipment.includes(e.id);
                  const cost = e.costType === 'percent' ? Math.ceil(baseAndStats * (e.costValue || 0)) : (e.costValue || 0);
                  return (
                    <div key={e.id} className={`p-3 rounded border ${active ? 'bg-gray-900 border-indigo-400' : 'bg-gray-900 border-gray-800'}`}>
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="font-semibold text-gray-100 flex items-center gap-2">
                            {e.name}
                            {e.onlyOne && <span className="text-[10px] px-1 py-0.5 border border-yellow-600 text-yellow-300 rounded">Only one per Team</span>}
                          </div>
                          <div className="text-xs text-gray-400">Cost: {e.costType==='percent' ? `+${Math.round((e.costValue||0)*100)}% of Base+Stats → ${cost}` : `${cost}`} pts</div>
                        </div>
                        <button
                          className={`px-2 py-1 text-xs rounded border ${active ? 'bg-indigo-600/60 border-indigo-400 text-indigo-50' : 'bg-gray-800 border-gray-700 hover:bg-gray-700'}`}
                          onClick={() => toggleEquipment(e.id)}
                        >
                          {active ? 'Remove' : 'Add'}
                        </button>
                      </div>
                      {Array.isArray(e.rules) && e.rules.length > 0 && (
                        <ul className="mt-2 list-disc pl-5 text-xs text-gray-300 space-y-1">
                          {e.rules.map((line, i) => <li key={i}>{line}</li>)}
                        </ul>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        

          {pane === 'abilities' && (
            <div className="mt-2">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-3">
                {ABILITIES.map((a) => {
                  const active = selectedAbilities.includes(a.id);
                  const cost = a.costType === 'percent_hp' ? Math.ceil((stats.HP || 0) * (a.costValue || 0)) : a.costType === 'equal_hp' ? (stats.HP || 0) : (a.costValue || 0);
                  return (
                    <div key={a.id} className={`p-3 rounded border ${active ? 'bg-gray-900 border-indigo-400' : 'bg-gray-900 border-gray-800'}`}>
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="font-semibold text-gray-100 flex items-center gap-2">{a.name}</div>
                          <div className="text-xs text-gray-400">Cost: {a.costType==='percent_hp' ? `+${Math.round((a.costValue||0)*100)}% of HP → ${cost}` : a.costType==='equal_hp' ? `${cost} (equal to HP)` : `${cost}`} pts</div>
                        </div>
                        <button className={`px-2 py-1 text-xs rounded border ${active ? 'bg-indigo-600/60 border-indigo-400 text-indigo-50' : 'bg-gray-800 border-gray-700 hover:bg-gray-700'}`} onClick={() => toggleAbility(a.id)}>
                          {active ? 'Remove' : 'Add'}
                        </button>
                      </div>
                      {Array.isArray(a.rules) && a.rules.length > 0 && (
                        <ul className="mt-2 list-disc pl-5 text-xs text-gray-300 space-y-1">
                          {a.rules.map((line, i) => <li key={i}>{line}</li>)}
                        </ul>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Leader Abilities pane */}
        {pane === 'leader' && (
            <div className="mt-2">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-semibold">Choose Leader Abilities</h3>
                <div className="text-xs text-gray-400">Allowed: 2 · Selected: {leaderAbilities.length}</div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-3">
                {LEADER_ABILITIES.map((a) => {
                  const active = leaderAbilities.includes(a.id);
                  return (
                    <div key={a.id} className={`p-3 rounded border ${active ? 'bg-gray-900 border-indigo-400' : 'bg-gray-900 border-gray-800'}`}>
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="font-semibold text-gray-100">{a.name}</div>
                          <div className="text-xs text-gray-400">Leader Ability</div>
                        </div>
                        <button
                          className={`px-2 py-1 text-xs rounded border ${active ? 'bg-gray-600/60 border-gray-400 text-gray-50' : 'bg-gray-800 border-gray-700 hover:bg-gray-700'}`}
                          onClick={() => setLeaderAbilities(prev => active ? prev.filter(id => id !== a.id) : (prev.length >= 2 ? prev : [...prev, a.id]))} disabled={!active && leaderAbilities.length >= 2}
                        >
                          {active ? 'Remove' : 'Select'}
                        </button>
                      </div>
                      {Array.isArray(a.rules) && a.rules.length > 0 && (
                        <ul className="mt-2 list-disc pl-5 text-xs text-gray-300 space-y-1">
                          {a.rules.map((line, i) => <li key={i}>{line}</li>)}
                        </ul>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          </div>

          {/* Summary Panel */}
        <div className="xl:col-span-1 bg-gray-800/40 border border-gray-700 rounded p-3 h-max">
          <div className="text-sm text-gray-300 space-y-2">
            <div className="font-semibold text-gray-100">Summary</div>
            <div className="text-xs">Base+Stats: {baseAndStats} pts · Psychic: +{psychicAdd} pts · Weapons: +{weaponsTotal} pts · Equipment: +{equipmentTotal} pts · Abilities: +{abilitiesTotal} pts</div>
            <div className={`text-base font-bold ${overCap ? 'text-red-300' : 'text-indigo-200'}`}>Total: {total} / {pointsCap} pts</div>

            <div className="mt-3">
              <div className="font-semibold text-gray-200 mb-2">Final Stats</div>
              <div className="flex gap-2 overflow-x-auto pb-2">
                {Object.keys(STAT_CONFIG).map((k) => (
                  <div key={k} className="min-w-[110px] bg-gray-900 border border-gray-700 rounded p-3 text-center">
                    <div className="text-xs uppercase tracking-wide text-gray-400">{k}</div>
                    <div className="text-2xl font-bold text-indigo-200">{STAT_CONFIG[k].format(stats[k])}</div>
                  </div>
                ))}
              </div>
            </div>

            {(psyker || masterPsyker) && (
              <div className="mt-3">
                <div className="font-semibold text-gray-200 mb-1">Psychic</div>
                <div className="text-xs text-gray-300">{masterPsyker ? 'Master Psyker' : 'Psyker'} · Powers: {selectedPowers.length ? selectedPowers.join(', ') : '— none —'}</div>
              </div>
            )}

            <div className="mt-3">
              {leaderAbilities.length > 0 && (
              <div className="mt-3">
                <div className="font-semibold text-gray-200 mb-1">Leader Abilities</div>
                <ul className="pl-5 text-xs space-y-2">
                  {leaderAbilities.map((id) => {
                    const a = LEADER_ABILITIES.find(x => x.id === id);
                    return (
                      <li key={id} className="space-y-1">
                        <div className="flex items-baseline justify-between gap-2">
                          <span className="list-item list-disc ml-1">{a?.name}</span>
                        </div>
                        {Array.isArray(a?.rules) && a.rules.length > 0 && (
                          <ul className="pl-6 text-[11px] text-gray-400 list-disc space-y-0.5">
                            {a.rules.map((line, i) => <li key={i}>{line}</li>)}
                          </ul>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}

            <div className="font-semibold text-gray-200 mb-1">Weapons</div>
              {selectedWeapons.length ? (
                <ul className="list-disc pl-5 text-xs space-y-1">
                  {selectedWeapons.map((id) => {
                    const w = weaponIndex[id];
                    const choice = Math.min((variantChoice[id] ?? 0), (w?.profiles?.length || 1) - 1);
                    const prof = w?.profiles?.[choice] || w?.profiles?.[0];
                    return (
                      <li key={id} className="flex items-baseline justify-between gap-2">
                        <span>
                          {w?.name}
                          {prof?.label && w?.profiles?.length > 1 ? <span className="text-gray-400"> — {prof.label}</span> : null}
                          {prof ? <span className="text-gray-500"> (ATK {prof.atk}, Hit {prof.hit}, DMG {prof.dmg}{prof.special?.length ? `, ${prof.special.join(', ')}` : ''})</span> : null}
                        </span>
                        <span className="font-mono">+{w?.cost ?? 0}</span>
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <div className="text-xs text-gray-400">— no weapons selected —</div>
              )}
            </div>

            <div className="mt-3">
              <div className="font-semibold text-gray-200 mb-1">Fighter Abilities</div>
              {selectedAbilities.length ? (
                <ul className="pl-5 text-xs space-y-2">
                  {selectedAbilities.map((id) => {
                    const a = abilitiesIndex[id];
                    const cost = a?.costType === 'percent_hp' ? Math.ceil((stats.HP || 0) * (a?.costValue || 0)) : a?.costType === 'equal_hp' ? (stats.HP || 0) : (a?.costValue || 0);
                    return (
                      <li key={id} className="space-y-1">
                        <div className="flex items-baseline justify-between gap-2">
                          <span className="list-item list-disc ml-1">{a?.name}</span>
                          <span className="font-mono">+{cost}</span>
                        </div>
                        {Array.isArray(a?.rules) && a.rules.length > 0 && (
                          <ul className="pl-6 text-[11px] text-gray-400 list-disc space-y-0.5">
                            {a.rules.map((line, i) => <li key={i}>{line}</li>)}
                          </ul>
                        )}
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <div className="text-xs text-gray-400">— no fighter abilities selected —</div>
              )}

              <div className="font-semibold text-gray-200 mb-1">Equipment</div>
              {selectedEquipment.length ? (
                <ul className="pl-5 text-xs space-y-2">
                  {selectedEquipment.map((id) => {
                    const e = equipmentIndex[id];
                    const cost = e?.costType === 'percent' ? Math.ceil(baseAndStats * (e?.costValue || 0)) : (e?.costValue || 0);
                    return (
                      <li key={id} className="space-y-1">
                        <div className="flex items-baseline justify-between gap-2">
                          <span className="list-item list-disc ml-1">{e?.name}</span>
                          <span className="font-mono">+{cost}</span>
                        </div>
                        {Array.isArray(e?.rules) && e.rules.length > 0 && (
                          <ul className="pl-6 text-[11px] text-gray-400 list-disc space-y-0.5">
                            {e.rules.map((line, i) => <li key={i}>{line}</li>)}
                          </ul>
                        )}
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <div className="text-xs text-gray-400">— no equipment selected —</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
