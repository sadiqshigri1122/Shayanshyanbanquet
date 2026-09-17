import { prisma } from '../lib/prisma.js';
import {
  mapApproval,
  mapAuditLog,
  mapBooking,
  mapCustomer,
  mapEventExpense,
  mapExpense,
  mapNotification,
  mapPayment,
  mapReceipt,
  mapSettings,
  mapUser,
  mapVenue,
  type AppStateDto,
} from '../lib/mappers.js';

const AUDIT_LOG_LIMIT = 250;
const NOTIFICATION_LIMIT = 100;

export async function getFullAppState(): Promise<AppStateDto> {
  const [
    bookings,
    customers,
    payments,
    expenses,
    eventExpenses,
    notifications,
    auditLogs,
    approvals,
    receipts,
    settings,
    users,
    venues,
  ] = await Promise.all([
    prisma.booking.findMany({
      include: { customer: true, lineItems: true },
      orderBy: { createdAt: 'asc' },
    }),
    prisma.customer.findMany({ orderBy: { createdAt: 'asc' } }),
    prisma.paymentRecord.findMany({ orderBy: { paymentDate: 'asc' } }),
    prisma.expenseRecord.findMany({ orderBy: { date: 'asc' } }),
    prisma.eventExpenseRecord.findMany({ orderBy: { addedAt: 'asc' } }),
    prisma.notificationRecord.findMany({
      orderBy: { createdAt: 'desc' },
      take: NOTIFICATION_LIMIT,
    }),
    prisma.auditLogRecord.findMany({
      orderBy: { timestamp: 'desc' },
      take: AUDIT_LOG_LIMIT,
    }),
    prisma.approvalRecord.findMany({ orderBy: { createdAt: 'desc' } }),
    prisma.receiptRecord.findMany({ orderBy: { createdAt: 'asc' } }),
    prisma.systemSettingsRecord.findUnique({ where: { id: 1 } }),
    prisma.user.findMany({ orderBy: { createdAt: 'asc' } }),
    prisma.venue.findMany({ orderBy: { id: 'asc' } }),
  ]);

  if (!settings) {
    throw new Error('System settings not initialized — run db:seed');
  }

  return {
    bookings: bookings.map(mapBooking),
    customers: customers.map(mapCustomer),
    payments: payments.map(mapPayment),
    expenses: expenses.map(mapExpense),
    eventExpenses: eventExpenses.map(mapEventExpense),
    notifications: notifications.map(mapNotification),
    auditLogs: auditLogs.map(mapAuditLog),
    approvals: approvals.map(mapApproval),
    receipts: receipts.map(mapReceipt),
    settings: mapSettings(settings),
    users: users.map(mapUser),
    venues: venues.map(mapVenue),
  };
}

export async function getSettings() {
  const settings = await prisma.systemSettingsRecord.findUnique({ where: { id: 1 } });
  if (!settings) throw new Error('Settings not found');
  return mapSettings(settings);
}

export async function appendAuditLog(log: {
  action: string;
  entity: string;
  entityId: string;
  performedBy: string;
  details: string;
  oldValue?: string;
  newValue?: string;
  reason?: string;
}) {
  await prisma.auditLogRecord.create({
    data: {
      id: `a${Date.now()}${Math.random().toString(36).slice(2, 5)}`,
      timestamp: new Date().toISOString(),
      ...log,
    },
  });
}

export async function appendNotification(n: {
  title: string;
  message: string;
  type: string;
  link?: string;
}) {
  await prisma.notificationRecord.create({
    data: {
      id: `n${Date.now()}`,
      isRead: false,
      createdAt: new Date().toISOString(),
      ...n,
    },
  });
}

export async function updateSettings(data: {
  discountApprovalThresholdPercent?: number;
  blockingStatuses?: string[];
  companyName?: string;
  companyPhone?: string;
  companyEmail?: string;
  companyAddress?: string;
  termsAndConditions?: string;
}) {
  const current = await prisma.systemSettingsRecord.findUnique({ where: { id: 1 } });
  if (!current) throw new Error('Settings not found');

  const updated = await prisma.systemSettingsRecord.update({
    where: { id: 1 },
    data: {
      discountApprovalThresholdPercent:
        data.discountApprovalThresholdPercent ?? current.discountApprovalThresholdPercent,
      blockingStatusesJson: data.blockingStatuses
        ? JSON.stringify(data.blockingStatuses)
        : current.blockingStatusesJson,
      companyName: data.companyName ?? current.companyName,
      companyPhone: data.companyPhone ?? current.companyPhone,
      companyEmail: data.companyEmail ?? current.companyEmail,
      companyAddress: data.companyAddress ?? current.companyAddress,
      termsAndConditions: data.termsAndConditions ?? current.termsAndConditions,
    },
  });

  return mapSettings(updated);
}

export async function markNotificationRead(id: string) {
  await prisma.notificationRecord.update({
    where: { id },
    data: { isRead: true },
  });
  return { ok: true };
}

export async function markAllNotificationsRead() {
  await prisma.notificationRecord.updateMany({
    data: { isRead: true },
  });
  return { ok: true };
}
