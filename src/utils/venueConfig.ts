/** Central hall / venue naming — single source of truth for the banquet hall sub-venues */

export type HallGroup = 'A' | 'B' | 'C';

export const HALL_NAMES = {
  A_RED: 'A Red',
  A_GOLD: 'A Gold',
  A_FULL: 'A Full',
  B1: 'B1',
  B2: 'B2',
  B_FULL: 'B Full',
  C_SILVER: 'C Silver',
  C_DIAMOND: 'C Diamond',
  C_FULL: 'C Full',
} as const;

export type HallSubVenueName = (typeof HALL_NAMES)[keyof typeof HALL_NAMES];

export interface HallSubVenueDef {
  id: string;
  name: HallSubVenueName;
  group: HallGroup;
  capacity: number;
  basePrice: number;
  location: string;
  description: string;
}

/** All bookable sub-halls (Hall A / B / C sections) */
export const HALL_SUB_VENUES: HallSubVenueDef[] = [
  {
    id: 'va-red',
    name: HALL_NAMES.A_RED,
    group: 'A',
    capacity: 200,
    basePrice: 50000,
    location: 'Hall A — Red Section',
    description: 'Hall A Red section for intimate gatherings and family events.',
  },
  {
    id: 'va-gold',
    name: HALL_NAMES.A_GOLD,
    group: 'A',
    capacity: 250,
    basePrice: 55000,
    location: 'Hall A — Gold Section',
    description: 'Hall A Gold section with premium décor.',
  },
  {
    id: 'va-full',
    name: HALL_NAMES.A_FULL,
    group: 'A',
    capacity: 300,
    basePrice: 60000,
    location: 'Hall A — Full',
    description: 'Complete Hall A for larger events.',
  },
  {
    id: 'vb1',
    name: HALL_NAMES.B1,
    group: 'B',
    capacity: 350,
    basePrice: 65000,
    location: 'Hall B — Section 1',
    description: 'Hall B Section 1 with flexible seating.',
  },
  {
    id: 'vb2',
    name: HALL_NAMES.B2,
    group: 'B',
    capacity: 400,
    basePrice: 70000,
    location: 'Hall B — Section 2',
    description: 'Hall B Section 2 for mid-size events.',
  },
  {
    id: 'vb-full',
    name: HALL_NAMES.B_FULL,
    group: 'B',
    capacity: 500,
    basePrice: 80000,
    location: 'Hall B — Full',
    description: 'Complete Hall B for large gatherings.',
  },
  {
    id: 'vc-silver',
    name: HALL_NAMES.C_SILVER,
    group: 'C',
    capacity: 350,
    basePrice: 65000,
    location: 'Hall C — Silver Section',
    description: 'Hall C Silver section for celebrations.',
  },
  {
    id: 'vc-diamond',
    name: HALL_NAMES.C_DIAMOND,
    group: 'C',
    capacity: 400,
    basePrice: 75000,
    location: 'Hall C — Diamond Section',
    description: 'Hall C Diamond section with enhanced décor.',
  },
  {
    id: 'vc-full',
    name: HALL_NAMES.C_FULL,
    group: 'C',
    capacity: 450,
    basePrice: 85000,
    location: 'Hall C — Full',
    description: 'Complete Hall C for premium events.',
  },
];

const HALL_NAME_TO_GROUP = new Map<string, HallGroup>(
  HALL_SUB_VENUES.map((v) => [v.name.toLowerCase(), v.group]),
);

/** Map any venue name to hall group A / B / C (for report column flags) */
export function mapVenueToHallGroup(venueName: string): HallGroup | null {
  const normalized = venueName.trim().toLowerCase();

  const fromRegistry = HALL_NAME_TO_GROUP.get(normalized);
  if (fromRegistry) return fromRegistry;

  // Legacy / fuzzy match
  if (/^a\s*(red|gold|full)?$/i.test(normalized) || normalized.startsWith('a ')) return 'A';
  if (/^b\s*(1|2|full)?$/i.test(normalized) || normalized === 'b1' || normalized === 'b2') return 'B';
  if (/^c\s*(silver|diamond|full)?$/i.test(normalized) || normalized.startsWith('c ')) return 'C';
  if (/\bhall\s*a\b/.test(normalized)) return 'A';
  if (/\bhall\s*b\b/.test(normalized)) return 'B';
  if (/\bhall\s*c\b/.test(normalized)) return 'C';

  return null;
}

export function isHallSubVenue(venueName: string): boolean {
  return HALL_NAME_TO_GROUP.has(venueName.trim().toLowerCase());
}

export function getHallSubVenueById(id: string): HallSubVenueDef | undefined {
  return HALL_SUB_VENUES.find((v) => v.id === id);
}

function getFullHallInGroup(group: HallGroup): HallSubVenueDef | undefined {
  return HALL_SUB_VENUES.find((v) => v.group === group && v.name.endsWith(' Full'));
}

/** Whether two venue IDs cannot be booked on the same date (full hall vs sections). */
export function venuesConflict(venueIdA: string, venueIdB: string): boolean {
  if (venueIdA === venueIdB) return true;

  const a = getHallSubVenueById(venueIdA);
  const b = getHallSubVenueById(venueIdB);
  if (!a || !b || a.group !== b.group) return false;

  const fullHall = getFullHallInGroup(a.group);
  if (!fullHall) return false;

  const aIsFull = a.id === fullHall.id;
  const bIsFull = b.id === fullHall.id;
  return aIsFull || bIsFull;
}

export function getHallSubVenueByName(name: string): HallSubVenueDef | undefined {
  return HALL_SUB_VENUES.find((v) => v.name.toLowerCase() === name.trim().toLowerCase());
}

/** All hall names for dropdowns / labels */
export function getAllHallDisplayNames(): string[] {
  return HALL_SUB_VENUES.map((v) => v.name);
}

/** Hall group labels for reports */
export const HALL_GROUP_LABELS: Record<HallGroup, string> = {
  A: 'Hall A',
  B: 'Hall B',
  C: 'Hall C',
};
