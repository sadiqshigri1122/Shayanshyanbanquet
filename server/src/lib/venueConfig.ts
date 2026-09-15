/** Server-side hall conflict rules (mirrors frontend venueConfig) */

export type HallGroup = 'A' | 'B' | 'C';

export interface HallDef {
  id: string;
  name: string;
  group: HallGroup;
}

export const HALLS: HallDef[] = [
  { id: 'va-red', name: 'A Red', group: 'A' },
  { id: 'va-gold', name: 'A Gold', group: 'A' },
  { id: 'va-full', name: 'A Full', group: 'A' },
  { id: 'vb1', name: 'B1', group: 'B' },
  { id: 'vb2', name: 'B2', group: 'B' },
  { id: 'vb-full', name: 'B Full', group: 'B' },
  { id: 'vc-silver', name: 'C Silver', group: 'C' },
  { id: 'vc-diamond', name: 'C Diamond', group: 'C' },
  { id: 'vc-full', name: 'C Full', group: 'C' },
];

function getHall(id: string): HallDef | undefined {
  return HALLS.find((h) => h.id === id);
}

function getFullHallInGroup(group: HallGroup): HallDef | undefined {
  return HALLS.find((h) => h.group === group && h.name.endsWith(' Full'));
}

export function venuesConflict(venueIdA: string, venueIdB: string): boolean {
  if (venueIdA === venueIdB) return true;
  const a = getHall(venueIdA);
  const b = getHall(venueIdB);
  if (!a || !b || a.group !== b.group) return false;
  const fullHall = getFullHallInGroup(a.group);
  if (!fullHall) return false;
  return a.id === fullHall.id || b.id === fullHall.id;
}
