// Curated sample members per tier — used as fallback when live Discord fetch
// is unavailable (no Server Members Intent / token lacks permission).
// Replace with real handles/avatars as they come in. Format matches live fetch.

export interface Member {
  id: string;
  name: string;
  avatarUrl: string;
  mag: number;
}

const SAMPLE: Record<number, Member[]> = {
  9: [
    { id: 's9_1', name: 'archanist.eth', avatarUrl: '', mag: 9 },
  ],
  8: [
    { id: 's8_1', name: 'RockyWhale', avatarUrl: '', mag: 8 },
  ],
  7: [
    { id: 's7_1', name: 'SeismicMod', avatarUrl: '', mag: 7 },
  ],
  6: [
    { id: 's6_1', name: 'VeteranTrader', avatarUrl: '', mag: 6 },
  ],
  5: [
    { id: 's5_1', name: 'ExpertMiner', avatarUrl: '', mag: 5 },
  ],
  4: [
    { id: 's4_1', name: 'SpecialistDev', avatarUrl: '', mag: 4 },
  ],
  3: [
    { id: 's3_1', name: 'AdeptGamer', avatarUrl: '', mag: 3 },
  ],
  2: [
    { id: 's2_1', name: 'Apprentice', avatarUrl: '', mag: 2 },
  ],
  1: [
    { id: 's1_1', name: 'Initiate', avatarUrl: '', mag: 1 },
  ],
};

export function getCuratedMembers(tier: number): Member[] {
  return SAMPLE[tier] ?? [];
}
