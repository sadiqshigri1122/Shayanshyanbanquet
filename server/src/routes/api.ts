import { Router } from 'express';
import { z } from 'zod';
import { BOOKING_STATUSES, BookingStatusValidationError, LineItemValidationError } from '../lib/bookingLogic.js';
import { actorName, requireAnyRole, requireAuth, requireInventoryRole, requireOfficeRole, requireRole } from '../middleware/auth.js';
import {
  ApiError,
  addBookingServiceItem,
  addEventExpense,
  addExpense,
  addPayment,
  approveRequest,
  checkAvailability,
  createBooking,
  createCustomer,
  deleteEventExpense,
  getBookingById,
  listBookings,
  requestCancellation,
  updateBookingCharges,
  updateBookingStatus,
  updateEventExpense,
} from '../services/bookingService.js';
import { processEventReminders } from '../services/eventReminderService.js';
import {
  getFullAppState,
  markAllNotificationsRead,
  markNotificationRead,
  updateSettings,
} from '../services/stateService.js';
import { authRouter } from './auth.js';
import { createUser, deleteUser, setUserPassword, updateUser } from '../services/userService.js';
import {
  createInventoryItem,
  getInventoryItemBySerial,
  recordStockIn,
  recordStockOut,
  updateInventoryItem,
  bulkCreateInventoryItems,
} from '../services/inventoryService.js';
import {
  createKitchenPurchase,
  recordKitchenStockUsage,
  updateKitchenStockThreshold,
} from '../services/kitchenService.js';

export const apiRouter = Router();

const staffRead = [
  requireAuth,
  requireAnyRole('booking_office', 'inventory_staff', 'manager', 'super_admin'),
];
const officeWrite = [requireAuth, requireOfficeRole()];
const inventoryWrite = [requireAuth, requireInventoryRole()];
const inventoryRead = [
  requireAuth,
  requireAnyRole('inventory_staff', 'manager', 'super_admin'),
];
const managerUp = [requireAuth, requireRole('manager')];
const adminOnly = [requireAuth, requireRole('super_admin')];

const USER_ROLES = ['booking_office', 'inventory_staff', 'manager', 'super_admin'] as const;

function paramId(req: import('express').Request, key = 'id'): string {
  const val = req.params[key];
  return Array.isArray(val) ? val[0] : String(val);
}

function handle(handler: (req: import('express').Request) => Promise<unknown>) {
  return async (req: import('express').Request, res: import('express').Response) => {
    try {
      const result = await handler(req);
      res.json(result);
    } catch (err) {
      if (err instanceof ApiError) {
        res.status(err.status).json({ error: err.message });
        return;
      }
      if (err instanceof z.ZodError) {
        res.status(400).json({ error: err.issues[0]?.message ?? 'Invalid request data' });
        return;
      }
      if (err instanceof LineItemValidationError || err instanceof BookingStatusValidationError) {
        res.status(400).json({ error: err.message });
        return;
      }
      console.error(err);
      res.status(500).json({ error: 'Internal server error' });
    }
  };
}

apiRouter.use('/auth', authRouter);

apiRouter.get(
  '/health',
  handle(async () => ({
    ok: true,
    service: 'shayan-banquet-api',
    apiVersion: '2026-09-23-inventory',
    roles: USER_ROLES,
  })),
);

apiRouter.get('/state', ...staffRead, handle(async () => getFullAppState()));

apiRouter.get('/bookings', ...staffRead, handle(async () => listBookings()));

apiRouter.get('/bookings/:id', ...staffRead, handle(async (req) => getBookingById(paramId(req))));

apiRouter.get(
  '/availability',
  handle(async (req) => {
    const venueId = String(req.query.venueId ?? '');
    const date = String(req.query.date ?? '');
    const exclude = req.query.excludeBookingId ? String(req.query.excludeBookingId) : undefined;
    if (!venueId || !date) throw new ApiError('venueId and date are required', 400);
    return checkAvailability(venueId, date, exclude);
  }),
);

const lineItemSchema = z.object({
  serviceId: z.string().min(1),
  serviceName: z.string().min(1),
  guestCount: z.number().optional(),
  quantity: z.number().positive(),
  unitPrice: z.number().min(0),
  total: z.number().min(0),
  enteredBy: z.string().optional(),
  enteredAt: z.string().optional(),
  isEventDayAddition: z.boolean().optional(),
});

apiRouter.post(
  '/bookings',
  ...officeWrite,
  handle(async (req) => {
    const body = z
      .object({
        customerId: z.string().min(1),
        venueId: z.string().min(1),
        functionDate: z.string().min(1),
        programme: z.string().min(1),
        numberOfGuests: z.number().int().positive(),
        specialInstructions: z.string().optional(),
        internalNotes: z.string().optional(),
        services: z.array(lineItemSchema).min(1),
        discount: z.number().min(0),
        advancePaid: z.number().min(0),
        createdBy: z.string().optional(),
      })
      .parse(req.body);
    return createBooking({ ...body, createdBy: actorName(req) });
  }),
);

apiRouter.patch(
  '/bookings/:id/status',
  ...officeWrite,
  handle(async (req) => {
    const body = z
      .object({ status: z.enum(BOOKING_STATUSES), by: z.string().optional() })
      .parse(req.body);
    return updateBookingStatus(paramId(req), body.status, actorName(req));
  }),
);

apiRouter.patch(
  '/bookings/:id/charges',
  ...officeWrite,
  handle(async (req) => {
    const body = z
      .object({
        services: z.array(lineItemSchema).min(1),
        discount: z.number().min(0),
        by: z.string().optional(),
        reason: z.string().optional(),
      })
      .parse(req.body);
    return updateBookingCharges(paramId(req), body.services, body.discount, actorName(req), body.reason);
  }),
);

apiRouter.post(
  '/bookings/:id/cancel-request',
  ...officeWrite,
  handle(async (req) => {
    const body = z.object({ reason: z.string().default(''), by: z.string().optional() }).parse(req.body);
    return requestCancellation(paramId(req), body.reason, actorName(req));
  }),
);

apiRouter.post(
  '/payments',
  ...officeWrite,
  handle(async (req) => {
    const body = z
      .object({
        bookingId: z.string().min(1),
        amount: z.number().positive(),
        method: z.string().min(1),
        receivedBy: z.string().optional(),
        transactionRef: z.string().optional(),
        notes: z.string().optional(),
      })
      .parse(req.body);
    return addPayment({ ...body, receivedBy: actorName(req) });
  }),
);

apiRouter.post(
  '/customers',
  ...officeWrite,
  handle(async (req) => {
    const body = z
      .object({
        name: z.string().min(1).max(200),
        phone: z.string().min(7).max(20),
        address: z.string().min(1).max(500),
        fatherHusbandName: z.string().max(200).optional(),
        cnic: z.string().max(20).optional(),
        email: z.string().email().optional().or(z.literal('')),
      })
      .parse(req.body);
    return createCustomer(body);
  }),
);

apiRouter.post(
  '/approvals/:id/decide',
  ...managerUp,
  handle(async (req) => {
    const body = z
      .object({ approved: z.boolean(), notes: z.string().default(''), by: z.string().optional() })
      .parse(req.body);
    await approveRequest(paramId(req), body.approved, body.notes, actorName(req));
    return { ok: true };
  }),
);

apiRouter.post(
  '/expenses',
  ...managerUp,
  handle(async (req) => {
    const body = z
      .object({
        category: z.string().min(1),
        amount: z.number().positive(),
        date: z.string().min(1),
        description: z.string().min(1),
        method: z.string().min(1),
        addedBy: z.string().optional(),
      })
      .parse(req.body);
    return addExpense({ ...body, addedBy: actorName(req) });
  }),
);

apiRouter.post(
  '/bookings/:id/event-items',
  ...officeWrite,
  handle(async (req) => {
    const body = z
      .object({
        particular: z.string().min(1),
        amount: z.number().positive(),
        by: z.string().optional(),
        guestCount: z.number().int().positive().optional(),
      })
      .parse(req.body);
    return addBookingServiceItem(paramId(req), body.particular, body.amount, actorName(req), body.guestCount);
  }),
);

apiRouter.post(
  '/event-expenses',
  ...officeWrite,
  handle(async (req) => {
    const body = z
      .object({
        bookingId: z.string().min(1),
        category: z.string().min(1),
        amount: z.number().positive(),
        description: z.string().max(500).optional(),
        addedBy: z.string().optional(),
      })
      .parse(req.body);
    return addEventExpense({ ...body, addedBy: actorName(req) });
  }),
);

apiRouter.patch(
  '/event-expenses/:id',
  ...officeWrite,
  handle(async (req) => {
    const body = z
      .object({
        category: z.string().min(1).optional(),
        amount: z.number().positive().optional(),
        description: z.string().max(500).optional(),
        by: z.string().optional(),
      })
      .parse(req.body);
    return updateEventExpense(paramId(req), body, actorName(req));
  }),
);

apiRouter.post(
  '/event-expenses/:id/delete',
  ...officeWrite,
  handle(async (req) => {
    z.object({ by: z.string().optional() }).parse(req.body);
    return deleteEventExpense(paramId(req), actorName(req));
  }),
);

const inventoryItemBodySchema = z.object({
  itemName: z.string().min(1).max(200),
  category: z.string().min(1).max(100),
  serialNumber: z.string().min(1).max(100),
  location: z.string().min(1).max(200),
  purchaseDate: z.string().optional(),
  purchaseReference: z.string().max(100).optional(),
  supplier: z.string().max(200).optional(),
  notes: z.string().max(1000).optional(),
});

apiRouter.post(
  '/inventory/items',
  ...inventoryWrite,
  handle(async (req) => {
    const body = inventoryItemBodySchema.parse(req.body);
    return createInventoryItem(body, actorName(req));
  }),
);

apiRouter.post(
  '/inventory/items/bulk',
  ...inventoryWrite,
  handle(async (req) => {
    const body = z
      .object({
        items: z.array(inventoryItemBodySchema).min(1).max(500),
      })
      .parse(req.body);
    return bulkCreateInventoryItems(body.items, actorName(req));
  }),
);

apiRouter.patch(
  '/inventory/items/:id',
  ...inventoryWrite,
  handle(async (req) => {
    const body = z
      .object({
        itemName: z.string().min(1).max(200).optional(),
        category: z.string().min(1).max(100).optional(),
        purchaseDate: z.string().optional(),
        purchaseReference: z.string().max(100).optional(),
        supplier: z.string().max(200).optional(),
        notes: z.string().max(1000).optional(),
      })
      .parse(req.body);
    return updateInventoryItem(paramId(req), body, actorName(req));
  }),
);

apiRouter.post(
  '/inventory/stock-out',
  ...inventoryWrite,
  handle(async (req) => {
    const body = z
      .object({
        serialNumber: z.string().min(1).max(100),
        fromLocation: z.string().min(1).max(200),
        toLocation: z.string().min(1).max(200),
        givenTo: z.string().min(1).max(200),
        reason: z.string().min(1).max(500),
        bookingId: z.string().optional(),
        notes: z.string().max(1000).optional(),
      })
      .parse(req.body);
    return recordStockOut(body, actorName(req));
  }),
);

apiRouter.post(
  '/inventory/stock-in',
  ...inventoryWrite,
  handle(async (req) => {
    const body = z
      .object({
        serialNumber: z.string().min(1).max(100),
        fromLocation: z.string().min(1).max(200),
        toLocation: z.string().min(1).max(200),
        returnedBy: z.string().min(1).max(200),
        condition: z.string().min(1).max(100),
        reason: z.string().min(1).max(500),
        bookingId: z.string().optional(),
        notes: z.string().max(1000).optional(),
      })
      .parse(req.body);
    return recordStockIn(body, actorName(req));
  }),
);

apiRouter.get(
  '/inventory/search/:serial',
  ...inventoryRead,
  handle(async (req) => {
    const serial = paramId(req, 'serial');
    return getInventoryItemBySerial(serial);
  }),
);

apiRouter.post(
  '/kitchen/purchases',
  ...inventoryWrite,
  handle(async (req) => {
    const body = z
      .object({
        purchaseDate: z.string().min(1),
        item: z.string().min(1).max(200),
        category: z.string().min(1).max(100),
        quantity: z.number().positive(),
        unit: z.string().min(1).max(50),
        unitCost: z.number().min(0),
        supplier: z.string().min(1).max(200),
        purchasedBy: z.string().min(1).max(200),
        receivedBy: z.string().min(1).max(200),
        invoiceNumber: z.string().max(100).optional(),
        notes: z.string().max(1000).optional(),
      })
      .parse(req.body);
    return createKitchenPurchase(body, actorName(req));
  }),
);

apiRouter.post(
  '/kitchen/stock-usage',
  ...inventoryWrite,
  handle(async (req) => {
    const body = z
      .object({
        item: z.string().min(1).max(200),
        quantity: z.number().positive(),
        reason: z.string().max(500).optional(),
        bookingId: z.string().optional(),
        usedBy: z.string().min(1).max(200),
        usedAt: z.string().optional(),
      })
      .parse(req.body);
    return recordKitchenStockUsage(body, actorName(req));
  }),
);

apiRouter.patch(
  '/kitchen/stock/:item/threshold',
  ...managerUp,
  handle(async (req) => {
    const item = decodeURIComponent(paramId(req, 'item'));
    const body = z.object({ minThreshold: z.number().min(0) }).parse(req.body);
    return updateKitchenStockThreshold(item, body.minThreshold, actorName(req));
  }),
);

apiRouter.post(
  '/users',
  ...adminOnly,
  handle(async (req) => {
    const body = z
      .object({
        name: z.string().min(1).max(100),
        email: z.string().email(),
        role: z.enum(USER_ROLES),
        phone: z.string().max(30).optional(),
        password: z.string().min(8),
        isActive: z.boolean().optional(),
      })
      .parse(req.body);
    return createUser(body);
  }),
);

apiRouter.patch(
  '/users/:id',
  ...adminOnly,
  handle(async (req) => {
    const body = z
      .object({
        name: z.string().min(1).max(100).optional(),
        email: z.string().email().optional(),
        role: z.enum(USER_ROLES).optional(),
        phone: z.string().max(30).nullable().optional(),
        isActive: z.boolean().optional(),
      })
      .parse(req.body);
    return updateUser(paramId(req), body, req.user!.id);
  }),
);

apiRouter.delete(
  '/users/:id',
  ...adminOnly,
  handle(async (req) => {
    await deleteUser(paramId(req), req.user!.id);
    return { ok: true };
  }),
);

apiRouter.patch(
  '/users/:id/password',
  ...adminOnly,
  handle(async (req) => {
    const body = z
      .object({
        newPassword: z.string().min(8),
      })
      .parse(req.body);
    await setUserPassword(paramId(req), body.newPassword);
    return { ok: true };
  }),
);

apiRouter.patch(
  '/settings',
  ...adminOnly,
  handle(async (req) => {
    const body = z
      .object({
        discountApprovalThresholdPercent: z.number().min(0).max(100).optional(),
        blockingStatuses: z.array(z.string()).optional(),
        companyName: z.string().min(1).max(200).optional(),
        companyPhone: z.string().max(50).optional(),
        companyEmail: z.string().email().optional().or(z.literal('')),
        companyAddress: z.string().max(500).optional(),
        termsAndConditions: z.string().max(10000).optional(),
      })
      .parse(req.body);
    return updateSettings(body);
  }),
);

apiRouter.patch(
  '/notifications/:id/read',
  ...staffRead,
  handle(async (req) => {
    await markNotificationRead(paramId(req));
    return { ok: true };
  }),
);

apiRouter.post(
  '/notifications/read-all',
  ...staffRead,
  handle(async () => {
    await markAllNotificationsRead();
    return { ok: true };
  }),
);

apiRouter.post(
  '/reminders/run',
  ...adminOnly,
  handle(async () => processEventReminders()),
);
