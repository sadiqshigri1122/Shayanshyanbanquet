import { prisma } from '../lib/prisma.js';
import { daysBetween, formatDisplayDate, todayIso } from '../lib/dateUtils.js';

const REMINDER_STATUSES = ['confirmed', 'hold', 'tentative'];
const REMINDER_DAYS = [7, 1];

export async function processEventReminders(): Promise<{ created: number }> {
  const today = todayIso();
  let created = 0;

  const bookings = await prisma.booking.findMany({
    where: {
      status: { in: REMINDER_STATUSES },
      functionDate: { gte: today },
    },
    include: { customer: true },
  });

  for (const booking of bookings) {
    const daysUntil = daysBetween(today, booking.functionDate);

    for (const reminderDay of REMINDER_DAYS) {
      if (daysUntil !== reminderDay) continue;

      const link = `/office/bookings/${booking.id}?reminder=${reminderDay}d`;
      const existing = await prisma.notificationRecord.findFirst({ where: { link } });
      if (existing) continue;

      const balanceNote =
        booking.remainingBalance > 0
          ? ` Balance due: Rs. ${booking.remainingBalance.toLocaleString('en-PK')}.`
          : '';

      const title = reminderDay === 1 ? 'Event Tomorrow' : 'Event in 7 Days';
      const message =
        reminderDay === 1
          ? `${booking.customer.name} · ${booking.venueName} · ${formatDisplayDate(booking.functionDate)} (${booking.bookingNumber}). Contact customer to confirm final details.${balanceNote}`
          : `${booking.customer.name} · ${booking.venueName} · ${formatDisplayDate(booking.functionDate)} (${booking.bookingNumber}). Remind customer and confirm arrangements.${balanceNote}`;

      await prisma.notificationRecord.create({
        data: {
          id: `n${Date.now()}${Math.random().toString(36).slice(2, 5)}`,
          title,
          message,
          type: 'warning',
          link,
          isRead: false,
          createdAt: new Date().toISOString(),
        },
      });
      created++;
    }
  }

  return { created };
}

let lastRunAt = 0;
const RUN_INTERVAL_MS = 60 * 60 * 1000;

export async function processEventRemindersThrottled(): Promise<{ created: number }> {
  const now = Date.now();
  if (now - lastRunAt < RUN_INTERVAL_MS) return { created: 0 };
  lastRunAt = now;
  return runEventRemindersSafely();
}

async function runEventRemindersSafely(): Promise<{ created: number }> {
  try {
    const result = await processEventReminders();
    if (result.created > 0) {
      console.log(`Event reminders: created ${result.created} notification(s)`);
    }
    return result;
  } catch (err) {
    console.error('Event reminder processing failed:', err);
    return { created: 0 };
  }
}

export function startEventReminderScheduler() {
  void runEventRemindersSafely();
  setInterval(() => void runEventRemindersSafely(), RUN_INTERVAL_MS);
}
