/** Match booking line items to report income categories (client paper form) */

import { mapVenueToHallGroup, type HallGroup } from './venueConfig';

export type HallKey = HallGroup;

export function mapVenueToHall(venueName: string): HallKey | null {
  return mapVenueToHallGroup(venueName);
}

export function isCateringService(serviceName: string): boolean {
  const n = serviceName.toLowerCase();
  return (
    n.includes('cold') ||
    n.includes('drink') ||
    n.includes('catering') ||
    n.includes('mineral water') ||
    n.includes('beverage')
  );
}

export function isEntrySoundService(serviceName: string): boolean {
  const n = serviceName.toLowerCase();
  return n.includes('entry') || n.includes('intri') || n.includes('sound');
}

/** Map org-level expense categories to client report lines */
export const REPORT_EXPENSE_LINES = [
  'Diesel for Generator',
  'H/W Daily Wages',
  'Salaries',
  'Rental to PAF',
  'Electric Bill',
  'Entertainment',
  'Karakary Purchase',
  'Hall Maintenance',
  'Other Expenses',
] as const;

export type ReportExpenseLine = (typeof REPORT_EXPENSE_LINES)[number];

export function mapExpenseToReportLine(category: string, description = ''): ReportExpenseLine {
  const text = `${category} ${description}`.toLowerCase();

  if (text.includes('generator') || text.includes('diesel') || text.includes('fuel')) {
    return 'Diesel for Generator';
  }
  if (text.includes('wage') || text.includes('h/w') || text.includes('waiter') || text.includes('staff') && text.includes('daily')) {
    return 'H/W Daily Wages';
  }
  if (text.includes('salary') || text.includes('salaries')) {
    return 'Salaries';
  }
  if (text.includes('rent') || text.includes('paf') || text.includes('rental')) {
    return 'Rental to PAF';
  }
  if (text.includes('electric') || text.includes('electricity')) {
    return 'Electric Bill';
  }
  if (text.includes('entertainment') || text.includes('marketing')) {
    return 'Entertainment';
  }
  if (text.includes('karakary') || text.includes('crockery') || text.includes('purchase') || text.includes('supplies')) {
    return 'Karakary Purchase';
  }
  if (text.includes('maintenance') || text.includes('cleaning') || text.includes('repair')) {
    return 'Hall Maintenance';
  }
  return 'Other Expenses';
}

export function mapEventExpenseToReportLine(category: string, description = ''): ReportExpenseLine {
  const text = `${category} ${description}`.toLowerCase();
  if (text.includes('generator') || text.includes('fuel')) return 'Diesel for Generator';
  if (text.includes('staff') || text.includes('wage')) return 'H/W Daily Wages';
  if (text.includes('catering') || text.includes('food')) return 'Karakary Purchase';
  if (text.includes('cleaning')) return 'Hall Maintenance';
  return mapExpenseToReportLine(category, description);
}
