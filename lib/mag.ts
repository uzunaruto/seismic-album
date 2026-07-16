// Magnitude role IDs -> tier + color (from seismic-impostor MAG_ROLES)
export const MAG_ROLES: Record<string, { tier: number; color: string }> = {
  '1346572989654765691': { tier: 3, color: '#2AA346' },
  '1346583232220500545': { tier: 4, color: '#75E300' },
  '1346583465704951879': { tier: 5, color: '#659E0F' },
  '1346583601025781760': { tier: 6, color: '#C19200' },
  '1346583708018278481': { tier: 7, color: '#A87504' },
  '1346583804630011914': { tier: 8, color: '#9C1515' },
  '1346583929473335429': { tier: 9, color: '#0693CD' },
};

// NOTE: Mag 1 & 2 have no dedicated role in the guild config we have on file.
// If the guild maps them to @everyone or a default, they show as tier 0/uncategorized.
// We still render tier 1 & 2 cards but they'll be empty unless roles exist.

export function magFromRoles(roles: string[]): number {
  let best = 0;
  for (const r of roles) {
    const m = MAG_ROLES[r];
    if (m && m.tier > best) best = m.tier;
  }
  return best;
}

export function magColor(tier: number): string {
  for (const k in MAG_ROLES) if (MAG_ROLES[k].tier === tier) return MAG_ROLES[k].color;
  // fallback tiers 1 & 2
  if (tier === 1) return '#D5D1C4';
  if (tier === 2) return '#5BB5A2';
  return '#A87504';
}

export const TIER_NAMES: Record<number, string> = {
  1: 'Initiate',
  2: 'Apprentice',
  3: 'Adept',
  4: 'Specialist',
  5: 'Expert',
  6: 'Veteran',
  7: 'Master',
  8: 'Grandmaster',
  9: 'Legend',
};

export const GUILD_ID = '1343751435711414362';
export const DISCORD_CLIENT_ID = '1509035141526192299';
