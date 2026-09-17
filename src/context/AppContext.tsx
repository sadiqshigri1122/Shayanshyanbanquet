import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
  type ReactNode,
} from 'react';
import type {
  Booking,
  Customer,
  Payment,
  Expense,
  EventExpense,
  Notification,
  AuditLog,
  ApprovalRequest,
  Receipt,
  SystemSettings,
  BookingService,
  BookingStatus,
  PaymentMethod,
  User,
  UserRole,
  Venue,
} from '../types';
import {
  initialBookings,
  initialCustomers,
  initialPayments,
  initialExpenses,
  initialNotifications,
  initialAuditLogs,
  initialApprovals,
  initialReceipts,
  initialSettings,
  initialUsers,
  initialEventExpenses,
  venues,
  services,
  packages,
  currentUser,
} from '../data/initialData';
import {
  getDayName,
  generateBookingNumber,
  calculateBookingTotals,
  calculateRemainingBalance,
  derivePaymentStatus,
  checkVenueAvailability,
  needsDiscountApproval,
} from '../utils/bookingUtils';
import { isBookingFinanciallyEditable, createEventDayService } from '../utils/eventDayUtils';
import { api, isApiEnabled, setAuthToken } from '../api/backend';
import {
  authenticateUser,
  clearStoredAuth,
  loadStoredAuth,
  saveStoredAuth,
} from '../utils/authUtils';

const STORAGE_KEY = 'shayan-banquet-demo';
const USE_API = isApiEnabled();

interface AppState {
  bookings: Booking[];
  customers: Customer[];
  payments: Payment[];
  expenses: Expense[];
  eventExpenses: EventExpense[];
  notifications: Notification[];
  auditLogs: AuditLog[];
  approvals: ApprovalRequest[];
  receipts: Receipt[];
  settings: SystemSettings;
  users: User[];
  currentUser: User;
  venues: Venue[];
}

interface AppContextType extends AppState {
  services: typeof services;
  packages: typeof packages;
  addCustomer: (customer: Omit<Customer, 'id' | 'createdAt'>) => Promise<Customer>;
  createBooking: (data: CreateBookingInput) => Promise<Booking | null>;
  updateBookingStatus: (bookingId: string, status: BookingStatus, by: string) => Promise<void>;
  requestCancellation: (bookingId: string, reason: string, by: string) => Promise<boolean>;
  addPayment: (data: AddPaymentInput) => Promise<{ payment: Payment; receipt: Receipt } | null>;
  addExpense: (data: Omit<Expense, 'id' | 'approvalStatus'>) => Promise<Expense>;
  approveRequest: (id: string, approved: boolean, notes: string, by: string) => Promise<void>;
  markNotificationRead: (id: string) => Promise<void>;
  markAllNotificationsRead: () => Promise<void>;
  addAuditLog: (log: Omit<AuditLog, 'id' | 'timestamp'>) => void;
  isVenueAvailable: (venueId: string, date: string, excludeBookingId?: string) => boolean;
  getNextSerial: () => number;
  updateSettings: (settings: Partial<SystemSettings>) => Promise<void>;
  resetUserPassword: (
    userId: string,
    newPassword: string,
  ) => Promise<{ ok: true } | { ok: false; error: string }>;
  createUser: (input: {
    name: string;
    email: string;
    role: UserRole;
    phone?: string;
    password: string;
    isActive?: boolean;
  }) => Promise<{ ok: true; user: User } | { ok: false; error: string }>;
  updateUser: (
    userId: string,
    input: Partial<{ name: string; email: string; role: UserRole; phone: string | null; isActive: boolean }>,
  ) => Promise<{ ok: true; user: User } | { ok: false; error: string }>;
  deleteUser: (userId: string) => Promise<{ ok: true } | { ok: false; error: string }>;
  updateBookingCharges: (
    bookingId: string,
    services: BookingService[],
    discount: number,
    by: string,
    reason?: string,
  ) => Promise<boolean>;
  addBookingServiceItem: (
    bookingId: string,
    particular: string,
    amount: number,
    by: string,
    guestCount?: number,
  ) => Promise<boolean>;
  addEventExpense: (data: Omit<EventExpense, 'id' | 'addedAt' | 'updatedAt'>) => Promise<EventExpense | null>;
  updateEventExpense: (
    id: string,
    data: Partial<Pick<EventExpense, 'category' | 'amount' | 'description'>>,
    by: string,
  ) => Promise<boolean>;
  deleteEventExpense: (id: string, by: string) => Promise<boolean>;
  getEventExpensesForBooking: (bookingId: string) => EventExpense[];
  setCurrentUser: (user: User) => void;
  isAuthenticated: boolean;
  login: (
    email: string,
    password: string,
    remember?: boolean,
  ) => Promise<{ ok: true; user: User } | { ok: false; error: string }>;
  logout: () => void;
  apiMode: boolean;
  apiLoading: boolean;
  apiError: string | null;
}

export interface CreateBookingInput {
  customer: Customer;
  venueId: string;
  functionDate: string;
  programme: string;
  numberOfGuests: number;
  specialInstructions?: string;
  internalNotes?: string;
  services: BookingService[];
  discount: number;
  advancePaid: number;
  status?: BookingStatus;
  createdBy: string;
}

export interface AddPaymentInput {
  bookingId: string;
  amount: number;
  method: PaymentMethod;
  receivedBy: string;
  transactionRef?: string;
  notes?: string;
}

const defaultState: AppState = {
  bookings: initialBookings,
  customers: initialCustomers,
  payments: initialPayments,
  expenses: initialExpenses,
  eventExpenses: initialEventExpenses,
  notifications: initialNotifications,
  auditLogs: initialAuditLogs,
  approvals: initialApprovals,
  receipts: initialReceipts,
  settings: initialSettings,
  users: initialUsers,
  currentUser,
  venues,
};

const AppContext = createContext<AppContextType | null>(null);

function loadState(): AppState {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved) as Partial<AppState>;
      return {
        ...defaultState,
        ...parsed,
        venues: parsed.venues ?? defaultState.venues,
        eventExpenses: parsed.eventExpenses ?? defaultState.eventExpenses,
        settings: {
          ...defaultState.settings,
          ...(parsed.settings ?? {}),
          blockingStatuses:
            parsed.settings?.blockingStatuses?.includes('cancellation_requested')
              ? parsed.settings.blockingStatuses
              : [
                  ...(parsed.settings?.blockingStatuses ?? defaultState.settings.blockingStatuses),
                  'cancellation_requested',
                ],
        },
        currentUser,
      };
    }
  } catch {
    /* use defaults */
  }
  return defaultState;
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AppState>(() => {
    const base = USE_API ? defaultState : loadState();
    const storedAuth = loadStoredAuth();
    if (storedAuth) {
      const user = base.users.find((u) => u.id === storedAuth.userId && u.isActive);
      if (user) {
        return { ...base, currentUser: user };
      }
    }
    return base;
  });
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    const storedAuth = loadStoredAuth();
    if (!storedAuth) return false;
    const users = USE_API ? defaultState.users : loadState().users;
    return users.some((u) => u.id === storedAuth.userId && u.isActive);
  });
  const [apiLoading, setApiLoading] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  const applyApiState = useCallback(
    (data: Awaited<ReturnType<typeof api.getState>>, currentUser?: User) =>
      (prev: AppState): AppState => ({
        ...prev,
        bookings: data.bookings,
        customers: data.customers,
        payments: data.payments,
        expenses: data.expenses,
        eventExpenses: data.eventExpenses,
        notifications: data.notifications,
        auditLogs: data.auditLogs,
        approvals: data.approvals as ApprovalRequest[],
        receipts: data.receipts,
        settings: {
          ...data.settings,
          blockingStatuses: (data.settings.blockingStatuses ?? prev.settings.blockingStatuses) as BookingStatus[],
        },
        users: data.users,
        venues: data.venues.length > 0 ? data.venues : prev.venues,
        ...(currentUser ? { currentUser } : {}),
      }),
    [],
  );

  const stateFetchInFlight = useRef<Promise<void> | null>(null);

  const refreshFromApi = useCallback(async () => {
    if (stateFetchInFlight.current) {
      await stateFetchInFlight.current;
      return;
    }

    const task = (async () => {
      const data = await api.getState();
      setState(applyApiState(data));
    })();

    stateFetchInFlight.current = task;
    try {
      await task;
    } finally {
      stateFetchInFlight.current = null;
    }
  }, [applyApiState]);

  useEffect(() => {
    if (!USE_API) return;
    let cancelled = false;
    (async () => {
      const storedAuth = loadStoredAuth();
      if (!storedAuth?.token) return;

      try {
        setApiLoading(true);
        setApiError(null);
        setAuthToken(storedAuth.token);
        await api.me();
        if (cancelled) return;
        setIsAuthenticated(true);
        await refreshFromApi();
        if (cancelled) return;
        if (storedAuth.userId) {
          setState((prev) => {
            const user = prev.users.find((u) => u.id === storedAuth.userId && u.isActive);
            return user ? { ...prev, currentUser: user } : prev;
          });
        }
      } catch {
        setAuthToken(null);
        clearStoredAuth();
        if (!cancelled) setIsAuthenticated(false);
      } finally {
        if (!cancelled) setApiLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [refreshFromApi]);

  useEffect(() => {
    if (!USE_API || !isAuthenticated) return;

    const interval = window.setInterval(() => {
      if (document.visibilityState === 'visible') {
        void refreshFromApi().catch(() => {});
      }
    }, 5 * 60 * 1000);
    return () => window.clearInterval(interval);
  }, [refreshFromApi, isAuthenticated]);

  useEffect(() => {
    if (USE_API) return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state]);

  const addAuditLog = useCallback((log: Omit<AuditLog, 'id' | 'timestamp'>) => {
    setState((prev) => ({
      ...prev,
      auditLogs: [
        {
          ...log,
          id: `a${Date.now()}`,
          timestamp: new Date().toISOString(),
        },
        ...prev.auditLogs,
      ],
    }));
  }, []);

  const addNotification = useCallback((n: Omit<Notification, 'id' | 'createdAt' | 'isRead'>) => {
    setState((prev) => ({
      ...prev,
      notifications: [
        {
          ...n,
          id: `n${Date.now()}`,
          isRead: false,
          createdAt: new Date().toISOString(),
        },
        ...prev.notifications,
      ],
    }));
  }, []);

  const getNextSerial = useCallback(
    () => Math.max(0, ...state.bookings.map((b) => b.serialNumber)) + 1,
    [state.bookings],
  );

  const isVenueAvailable = useCallback(
    (venueId: string, date: string, excludeBookingId?: string) =>
      checkVenueAvailability(
        state.bookings,
        venueId,
        date,
        excludeBookingId,
        state.settings.blockingStatuses,
      ),
    [state.bookings, state.settings.blockingStatuses],
  );

  const addCustomer = useCallback(
    async (data: Omit<Customer, 'id' | 'createdAt'>): Promise<Customer> => {
      if (USE_API) {
        const customer = await api.createCustomer(data);
        await refreshFromApi();
        return customer;
      }

      const customer: Customer = {
        ...data,
        id: `c${Date.now()}`,
        createdAt: new Date().toISOString().split('T')[0],
      };
      setState((prev) => ({ ...prev, customers: [...prev.customers, customer] }));
      addAuditLog({
        action: 'Created',
        entity: 'Customer',
        entityId: customer.id,
        performedBy: state.currentUser.name,
        details: `New customer: ${customer.name} (${customer.phone})`,
      });
      return customer;
    },
    [addAuditLog, state.currentUser.name, refreshFromApi],
  );

  const createBooking = useCallback(
    async (data: CreateBookingInput): Promise<Booking | null> => {
      if (USE_API) {
        try {
          const booking = await api.createBooking({
            customerId: data.customer.id,
            venueId: data.venueId,
            functionDate: data.functionDate,
            programme: data.programme,
            numberOfGuests: data.numberOfGuests,
            specialInstructions: data.specialInstructions,
            internalNotes: data.internalNotes,
            services: data.services,
            discount: data.discount,
            advancePaid: data.advancePaid,
            createdBy: data.createdBy,
          });
          await refreshFromApi();
          return booking;
        } catch {
          return null;
        }
      }

      const venue = state.venues.find((v) => v.id === data.venueId);
      if (!venue) return null;

      if (
        !checkVenueAvailability(
          state.bookings,
          data.venueId,
          data.functionDate,
          undefined,
          state.settings.blockingStatuses,
        )
      ) {
        return null;
      }

      const serial = getNextSerial();
      const { subtotal, grandTotal } = calculateBookingTotals(data.services, data.discount);
      const cappedAdvance = Math.min(Math.max(0, data.advancePaid), grandTotal);
      const remainingBalance = calculateRemainingBalance(grandTotal, cappedAdvance);
      const paymentStatus = derivePaymentStatus(grandTotal, cappedAdvance);
      const discountThreshold = state.settings.discountApprovalThresholdPercent;

      let status = data.status ?? 'confirmed';
      if (needsDiscountApproval(subtotal, data.discount, discountThreshold)) {
        status = 'pending_review';
      }

      const booking: Booking = {
        id: `b${Date.now()}`,
        bookingNumber: generateBookingNumber(serial),
        serialNumber: serial,
        bookingDate: new Date().toISOString().split('T')[0],
        customer: data.customer,
        venueId: data.venueId,
        venueName: venue.name,
        functionDate: data.functionDate,
        functionDay: getDayName(data.functionDate),
        programme: data.programme,
        numberOfGuests: data.numberOfGuests,
        specialInstructions: data.specialInstructions,
        internalNotes: data.internalNotes,
        services: data.services,
        subtotal,
        discount: data.discount,
        taxAmount: 0,
        grandTotal,
        advancePaid: cappedAdvance,
        remainingBalance,
        status,
        paymentStatus,
        createdBy: data.createdBy,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      setState((prev) => {
        const newApprovals = [...prev.approvals];
        if (needsDiscountApproval(subtotal, data.discount, discountThreshold)) {
          newApprovals.unshift({
            id: `ap${Date.now()}`,
            entityType: 'Booking',
            entityId: booking.bookingNumber,
            requestType: 'discount',
            requestedBy: data.createdBy,
            status: 'pending',
            reason: `Discount of Rs. ${data.discount.toLocaleString()} exceeds ${discountThreshold}% threshold`,
            createdAt: new Date().toISOString(),
            details: `${booking.bookingNumber} — ${data.customer.name}`,
          });
        }

        const newPayments = [...prev.payments];
        const newReceipts = [...prev.receipts];
        if (cappedAdvance > 0) {
          const payment: Payment = {
            id: `p${Date.now()}`,
            bookingId: booking.id,
            bookingNumber: booking.bookingNumber,
            amount: cappedAdvance,
            method: 'cash',
            paymentDate: new Date().toISOString().split('T')[0],
            receivedBy: data.createdBy,
            customerName: data.customer.name,
          };
          newPayments.push(payment);
          newReceipts.push({
            id: `r${Date.now()}`,
            receiptNumber: `RCP-${1000 + newReceipts.length + 1}`,
            bookingId: booking.id,
            bookingNumber: booking.bookingNumber,
            customerName: data.customer.name,
            functionDate: booking.functionDate,
            venueName: venue.name,
            amount: cappedAdvance,
            previousBalance: grandTotal,
            newBalance: remainingBalance,
            method: 'cash',
            paymentDate: payment.paymentDate,
            receivedBy: data.createdBy,
            createdAt: new Date().toISOString(),
          });
        }

        return {
          ...prev,
          bookings: [...prev.bookings, booking],
          approvals: newApprovals,
          payments: newPayments,
          receipts: newReceipts,
        };
      });

      addAuditLog({
        action: 'Created',
        entity: 'Booking',
        entityId: booking.bookingNumber,
        performedBy: data.createdBy,
        details: `New booking for ${data.customer.name} — ${data.programme} at ${venue.name} on ${data.functionDate}. Total: Rs. ${grandTotal.toLocaleString()}`,
      });

      data.services.forEach((svc) => {
        addAuditLog({
          action: 'Charge Entered',
          entity: 'BookingCharge',
          entityId: booking.bookingNumber,
          performedBy: svc.enteredBy || data.createdBy,
          details: `${svc.serviceName} — Rs. ${svc.total.toLocaleString()} entered for ${booking.bookingNumber}`,
          newValue: `Rs. ${svc.total.toLocaleString()}`,
        });
      });

      if (data.discount > 0) {
        addAuditLog({
          action: 'Discount Applied',
          entity: 'Booking',
          entityId: booking.bookingNumber,
          performedBy: data.createdBy,
          details: `Discount of Rs. ${data.discount.toLocaleString()} on ${booking.bookingNumber}`,
          newValue: `Rs. ${data.discount.toLocaleString()}`,
        });
      }

      if (needsDiscountApproval(subtotal, data.discount, discountThreshold)) {
        addNotification({
          title: 'Discount Approval Required',
          message: `Booking ${booking.bookingNumber} requires manager approval for discount.`,
          type: 'warning',
          link: '/manager/approvals',
        });
      }

      return booking;
    },
    [state.bookings, state.settings, state.venues, getNextSerial, addAuditLog, addNotification, refreshFromApi],
  );

  const updateBookingStatus = useCallback(
    async (bookingId: string, status: BookingStatus, by: string) => {
      if (USE_API) {
        await api.updateBookingStatus(bookingId, { status, by });
        await refreshFromApi();
        return;
      }

      setState((prev) => {
        const booking = prev.bookings.find((b) => b.id === bookingId);
        if (booking) {
          setTimeout(() => {
            addAuditLog({
              action: 'Status Changed',
              entity: 'Booking',
              entityId: booking.bookingNumber,
              performedBy: by,
              details: `Status: ${booking.status} → ${status}`,
            });
          }, 0);
        }
        return {
          ...prev,
          bookings: prev.bookings.map((b) =>
            b.id === bookingId
              ? { ...b, status, updatedAt: new Date().toISOString(), lastUpdatedBy: by }
              : b,
          ),
        };
      });
    },
    [addAuditLog, refreshFromApi],
  );

  const requestCancellation = useCallback(
    async (bookingId: string, reason: string, by: string): Promise<boolean> => {
      if (USE_API) {
        try {
          await api.requestCancellation(bookingId, { reason, by });
          await refreshFromApi();
          return true;
        } catch {
          return false;
        }
      }

      const booking = state.bookings.find((b) => b.id === bookingId);
      if (!booking || ['cancelled', 'cancellation_requested', 'completed'].includes(booking.status)) {
        return false;
      }

      setState((prev) => ({
        ...prev,
        bookings: prev.bookings.map((b) =>
          b.id === bookingId
            ? {
                ...b,
                status: 'cancellation_requested' as const,
                updatedAt: new Date().toISOString(),
                lastUpdatedBy: by,
              }
            : b,
        ),
        approvals: [
          {
            id: `ap${Date.now()}`,
            entityType: 'Booking',
            entityId: booking.bookingNumber,
            requestType: 'cancellation' as const,
            requestedBy: by,
            status: 'pending' as const,
            reason: reason || `Cancellation requested for ${booking.bookingNumber}`,
            createdAt: new Date().toISOString(),
            details: `${booking.bookingNumber} — ${booking.customer.name} · ${booking.venueName} · ${booking.functionDate}`,
          },
          ...prev.approvals,
        ],
      }));

      addAuditLog({
        action: 'Cancellation Requested',
        entity: 'Booking',
        entityId: booking.bookingNumber,
        performedBy: by,
        details: reason || `Cancellation requested for ${booking.bookingNumber}`,
      });

      addNotification({
        title: 'Cancellation Approval Required',
        message: `${booking.bookingNumber} (${booking.customer.name}) — manager approval needed.`,
        type: 'warning',
        link: '/manager/approvals',
      });

      return true;
    },
    [state.bookings, addAuditLog, addNotification, refreshFromApi],
  );

  const addPayment = useCallback(
    async (data: AddPaymentInput): Promise<{ payment: Payment; receipt: Receipt } | null> => {
      if (USE_API) {
        try {
          const result = await api.addPayment(data);
          await refreshFromApi();
          return result;
        } catch {
          return null;
        }
      }

      const booking = state.bookings.find((b) => b.id === data.bookingId);
      if (!booking || !isBookingFinanciallyEditable(booking.status)) return null;
      if (booking.remainingBalance <= 0) return null;

      const amount = Math.min(data.amount, booking.remainingBalance);
      if (amount <= 0) return null;

      const previousBalance = booking.remainingBalance;
      const newAdvance = booking.advancePaid + amount;
      const newBalance = calculateRemainingBalance(booking.grandTotal, newAdvance);
      const paymentStatus = derivePaymentStatus(booking.grandTotal, newAdvance);

      const payment: Payment = {
        id: `p${Date.now()}`,
        bookingId: booking.id,
        bookingNumber: booking.bookingNumber,
        amount,
        method: data.method,
        paymentDate: new Date().toISOString().split('T')[0],
        receivedBy: data.receivedBy,
        transactionRef: data.transactionRef,
        notes: data.notes,
        customerName: booking.customer.name,
      };

      const receipt: Receipt = {
        id: `r${Date.now()}`,
        receiptNumber: `RCP-${1000 + state.receipts.length + 1}`,
        bookingId: booking.id,
        bookingNumber: booking.bookingNumber,
        customerName: booking.customer.name,
        functionDate: booking.functionDate,
        venueName: booking.venueName,
        amount,
        previousBalance,
        newBalance,
        method: data.method,
        paymentDate: payment.paymentDate,
        receivedBy: data.receivedBy,
        createdAt: new Date().toISOString(),
      };

      setState((prev) => ({
        ...prev,
        payments: [...prev.payments, payment],
        receipts: [...prev.receipts, receipt],
        bookings: prev.bookings.map((b) =>
          b.id === data.bookingId
            ? {
                ...b,
                advancePaid: newAdvance,
                remainingBalance: newBalance,
                paymentStatus,
                updatedAt: new Date().toISOString(),
              }
            : b,
        ),
      }));

      addAuditLog({
        action: 'Payment Received',
        entity: 'Payment',
        entityId: payment.id,
        performedBy: data.receivedBy,
        details: `Rs. ${amount.toLocaleString()} received for ${booking.bookingNumber}`,
      });

      addNotification({
        title: 'Payment Received',
        message: `Rs. ${amount.toLocaleString()} from ${booking.customer.name} for ${booking.bookingNumber}`,
        type: 'success',
      });

      return { payment, receipt };
    },
    [state.bookings, state.receipts.length, addAuditLog, addNotification, refreshFromApi],
  );

  const addExpense = useCallback(
    async (data: Omit<Expense, 'id' | 'approvalStatus'>) => {
      if (USE_API) {
        const expense = await api.addExpense(data);
        await refreshFromApi();
        return expense as Expense;
      }

      const expense: Expense = {
        ...data,
        id: `e${Date.now()}`,
        approvalStatus: data.amount > 50000 ? 'pending' : 'approved',
      };
      setState((prev) => ({
        ...prev,
        expenses: [...prev.expenses, expense],
        approvals:
          expense.approvalStatus === 'pending'
            ? [
                {
                  id: `ap${Date.now()}`,
                  entityType: 'Expense',
                  entityId: expense.id,
                  requestType: 'expense' as const,
                  requestedBy: data.addedBy,
                  status: 'pending' as const,
                  reason: `Expense above threshold: ${expense.description}`,
                  createdAt: new Date().toISOString(),
                  details: `${expense.category} — Rs. ${expense.amount.toLocaleString()}`,
                },
                ...prev.approvals,
              ]
            : prev.approvals,
      }));
      return expense;
    },
    [refreshFromApi],
  );

  const approveRequest = useCallback(
    async (id: string, approved: boolean, notes: string, by: string) => {
      if (USE_API) {
        await api.approveRequest(id, { approved, notes, by });
        await refreshFromApi();
        return;
      }

      setState((prev) => {
        const approval = prev.approvals.find((a) => a.id === id);
        if (!approval) return prev;

        const updatedApprovals = prev.approvals.map((a) =>
          a.id === id
            ? {
                ...a,
                status: approved ? ('approved' as const) : ('rejected' as const),
                decisionNotes: notes,
                approvedBy: by,
                approvedAt: new Date().toISOString(),
              }
            : a,
        );

        let updatedBookings = prev.bookings;
        let updatedExpenses = prev.expenses;

        if (approval.entityType === 'Booking' && approval.requestType === 'discount') {
          updatedBookings = prev.bookings.map((b) =>
            b.bookingNumber === approval.entityId
              ? {
                  ...b,
                  status: approved ? ('confirmed' as const) : ('rejected' as const),
                  updatedAt: new Date().toISOString(),
                }
              : b,
          );
        }

        if (approval.entityType === 'Booking' && approval.requestType === 'cancellation') {
          updatedBookings = prev.bookings.map((b) =>
            b.bookingNumber === approval.entityId
              ? {
                  ...b,
                  status: approved ? ('cancelled' as const) : ('confirmed' as const),
                  updatedAt: new Date().toISOString(),
                }
              : b,
          );
        }

        if (approval.entityType === 'Expense') {
          updatedExpenses = prev.expenses.map((e) =>
            e.id === approval.entityId
              ? { ...e, approvalStatus: approved ? ('approved' as const) : ('rejected' as const) }
              : e,
          );
        }

        return {
          ...prev,
          approvals: updatedApprovals,
          bookings: updatedBookings,
          expenses: updatedExpenses,
        };
      });

      addAuditLog({
        action: approved ? 'Approved' : 'Rejected',
        entity: 'Approval',
        entityId: id,
        performedBy: by,
        details: notes || `Approval ${approved ? 'granted' : 'denied'}`,
      });
    },
    [addAuditLog, refreshFromApi],
  );

  const markNotificationRead = useCallback(
    async (id: string) => {
      if (USE_API) {
        await api.markNotificationRead(id);
        await refreshFromApi();
        return;
      }
      setState((prev) => ({
        ...prev,
        notifications: prev.notifications.map((n) => (n.id === id ? { ...n, isRead: true } : n)),
      }));
    },
    [refreshFromApi],
  );

  const markAllNotificationsRead = useCallback(async () => {
    if (USE_API) {
      await api.markAllNotificationsRead();
      await refreshFromApi();
      return;
    }
    setState((prev) => ({
      ...prev,
      notifications: prev.notifications.map((n) => ({ ...n, isRead: true })),
    }));
  }, [refreshFromApi]);

  const updateSettings = useCallback(
    async (settings: Partial<SystemSettings>) => {
      if (USE_API) {
        await api.updateSettings(settings);
        await refreshFromApi();
        return;
      }
      setState((prev) => ({ ...prev, settings: { ...prev.settings, ...settings } }));
    },
    [refreshFromApi],
  );

  const setCurrentUser = useCallback((user: User) => {
    setState((prev) => ({ ...prev, currentUser: user }));
  }, []);

  const resetUserPassword = useCallback(
    async (userId: string, newPassword: string) => {
      if (USE_API) {
        try {
          await api.resetUserPassword(userId, newPassword);
          return { ok: true as const };
        } catch (err) {
          return {
            ok: false as const,
            error: err instanceof Error ? err.message : 'Failed to reset password',
          };
        }
      }
      return { ok: false as const, error: 'Password reset requires API mode.' };
    },
    [],
  );

  const createUser = useCallback(
    async (input: {
      name: string;
      email: string;
      role: UserRole;
      phone?: string;
      password: string;
      isActive?: boolean;
    }) => {
      if (USE_API) {
        try {
          const user = await api.createUser(input);
          await refreshFromApi();
          return { ok: true as const, user };
        } catch (err) {
          return {
            ok: false as const,
            error: err instanceof Error ? err.message : 'Failed to create user',
          };
        }
      }
      return { ok: false as const, error: 'User management requires API mode.' };
    },
    [refreshFromApi],
  );

  const updateUser = useCallback(
    async (
      userId: string,
      input: Partial<{ name: string; email: string; role: UserRole; phone: string | null; isActive: boolean }>,
    ) => {
      if (USE_API) {
        try {
          const user = await api.updateUser(userId, input);
          await refreshFromApi();
          return { ok: true as const, user };
        } catch (err) {
          return {
            ok: false as const,
            error: err instanceof Error ? err.message : 'Failed to update user',
          };
        }
      }
      return { ok: false as const, error: 'User management requires API mode.' };
    },
    [refreshFromApi],
  );

  const deleteUser = useCallback(
    async (userId: string) => {
      if (USE_API) {
        try {
          await api.deleteUser(userId);
          await refreshFromApi();
          return { ok: true as const };
        } catch (err) {
          return {
            ok: false as const,
            error: err instanceof Error ? err.message : 'Failed to delete user',
          };
        }
      }
      return { ok: false as const, error: 'User management requires API mode.' };
    },
    [refreshFromApi],
  );

  const login = useCallback(
    async (email: string, password: string, remember = true) => {
      if (USE_API) {
        try {
          setApiLoading(true);
          setApiError(null);
          const result = await api.login({ email, password, remember });
          setAuthToken(result.token);
          saveStoredAuth({
            userId: result.user.id,
            email: result.user.email,
            token: result.token,
          });

          const data = await api.getState();
          const user: User =
            data.users.find((u) => u.id === result.user.id) ??
            ({
              ...result.user,
              isActive: true,
              phone: '',
              createdAt: new Date().toISOString().split('T')[0],
            } as User);

          // Set currentUser together with API data before marking authenticated,
          // so route guards never see the default demo user (booking office).
          setState(applyApiState(data, user));
          setIsAuthenticated(true);
          return { ok: true as const, user };
        } catch (err) {
          return {
            ok: false as const,
            error: err instanceof Error ? err.message : 'Login failed',
          };
        } finally {
          setApiLoading(false);
        }
      }

      const result = authenticateUser(state.users, email, password);
      if (!result.ok) return result;

      setState((prev) => ({ ...prev, currentUser: result.user }));
      setIsAuthenticated(true);

      if (remember) {
        saveStoredAuth({ userId: result.user.id, email: result.user.email });
      } else {
        clearStoredAuth();
      }

      return result;
    },
    [applyApiState, state.users],
  );

  const logout = useCallback(async () => {
    if (USE_API) {
      try {
        await api.logout();
      } catch {
        /* session may already be expired */
      }
    }
    setAuthToken(null);
    clearStoredAuth();
    setIsAuthenticated(false);
    setState((prev) => ({ ...prev, currentUser }));
  }, []);

  const updateBookingCharges = useCallback(
    async (
      bookingId: string,
      services: BookingService[],
      discount: number,
      by: string,
      reason?: string,
    ): Promise<boolean> => {
      if (USE_API) {
        try {
          await api.updateBookingCharges(bookingId, { services, discount, by, reason });
          await refreshFromApi();
          return true;
        } catch {
          return false;
        }
      }

      const booking = state.bookings.find((b) => b.id === bookingId);
      if (!booking || !isBookingFinanciallyEditable(booking.status)) return false;

      setState((prev) => {
        const current = prev.bookings.find((b) => b.id === bookingId);
        if (!current || !isBookingFinanciallyEditable(current.status)) return prev;

        const { subtotal, grandTotal } = calculateBookingTotals(services, discount);
        const remainingBalance = calculateRemainingBalance(grandTotal, current.advancePaid);
        const paymentStatus = derivePaymentStatus(grandTotal, current.advancePaid);

        const newLogs: Omit<AuditLog, 'id' | 'timestamp'>[] = [];

        if (current.grandTotal !== grandTotal) {
          newLogs.push({
            action: 'Amount Changed',
            entity: 'Booking',
            entityId: current.bookingNumber,
            performedBy: by,
            details: reason || `Booking total updated for ${current.bookingNumber}`,
            oldValue: `Rs. ${current.grandTotal.toLocaleString()}`,
            newValue: `Rs. ${grandTotal.toLocaleString()}`,
            reason,
          });
        }

        if (current.discount !== discount) {
          newLogs.push({
            action: 'Discount Changed',
            entity: 'Booking',
            entityId: current.bookingNumber,
            performedBy: by,
            details: `Discount updated on ${current.bookingNumber}`,
            oldValue: `Rs. ${current.discount.toLocaleString()}`,
            newValue: `Rs. ${discount.toLocaleString()}`,
            reason,
          });
        }

        services.forEach((svc) => {
          const prevSvc = current.services.find((s) => s.serviceId === svc.serviceId);
          if (!prevSvc || prevSvc.total !== svc.total) {
            newLogs.push({
              action: prevSvc ? 'Charge Modified' : 'Charge Added',
              entity: 'BookingCharge',
              entityId: current.bookingNumber,
              performedBy: by,
              details: `${svc.serviceName} on ${current.bookingNumber}`,
              oldValue: prevSvc ? `Rs. ${prevSvc.total.toLocaleString()}` : undefined,
              newValue: `Rs. ${svc.total.toLocaleString()}`,
              reason,
            });
          }
        });

        return {
          ...prev,
          bookings: prev.bookings.map((b) =>
            b.id === bookingId
              ? {
                  ...b,
                  services,
                  subtotal,
                  discount,
                  grandTotal,
                  remainingBalance,
                  paymentStatus,
                  updatedAt: new Date().toISOString(),
                  lastUpdatedBy: by,
                }
              : b,
          ),
          auditLogs: [
            ...newLogs.map((log) => ({
              ...log,
              id: `a${Date.now()}${Math.random()}`,
              timestamp: new Date().toISOString(),
            })),
            ...prev.auditLogs,
          ],
        };
      });
      return true;
    },
    [state.bookings, refreshFromApi],
  );

  const addBookingServiceItem = useCallback(
    async (
      bookingId: string,
      particular: string,
      amount: number,
      by: string,
      guestCount?: number,
    ): Promise<boolean> => {
      if (!particular.trim() || amount <= 0) return false;

      if (USE_API) {
        try {
          await api.addBookingServiceItem(bookingId, { particular, amount, by, guestCount });
          await refreshFromApi();
          return true;
        } catch {
          return false;
        }
      }

      const booking = state.bookings.find((b) => b.id === bookingId);
      if (!booking || !isBookingFinanciallyEditable(booking.status)) return false;

      const newService = createEventDayService(particular, amount, by, guestCount);
      const services = [...booking.services, newService];
      const { subtotal, grandTotal } = calculateBookingTotals(services, booking.discount);
      const remainingBalance = calculateRemainingBalance(grandTotal, booking.advancePaid);
      const paymentStatus = derivePaymentStatus(grandTotal, booking.advancePaid);

      setState((prev) => ({
        ...prev,
        bookings: prev.bookings.map((b) =>
          b.id === bookingId
            ? {
                ...b,
                services,
                subtotal,
                grandTotal,
                remainingBalance,
                paymentStatus,
                updatedAt: new Date().toISOString(),
                lastUpdatedBy: by,
              }
            : b,
        ),
        auditLogs: [
          {
            id: `a${Date.now()}`,
            timestamp: new Date().toISOString(),
            action: 'Event Day Item Added',
            entity: 'BookingCharge',
            entityId: booking.bookingNumber,
            performedBy: by,
            details: `${newService.serviceName} — Rs. ${amount.toLocaleString()} added on event day`,
            newValue: `Rs. ${amount.toLocaleString()}`,
          },
          ...prev.auditLogs,
        ],
      }));

      return true;
    },
    [state.bookings, refreshFromApi],
  );

  const addEventExpense = useCallback(
    async (data: Omit<EventExpense, 'id' | 'addedAt' | 'updatedAt'>): Promise<EventExpense | null> => {
      if (USE_API) {
        try {
          const expense = await api.addEventExpense(data);
          await refreshFromApi();
          return expense;
        } catch {
          return null;
        }
      }

      const booking = state.bookings.find((b) => b.id === data.bookingId);
      if (!booking || !isBookingFinanciallyEditable(booking.status)) return null;
      if (data.amount <= 0 || !data.category.trim()) return null;

      const expense: EventExpense = {
        ...data,
        id: `ee${Date.now()}`,
        addedAt: new Date().toISOString(),
      };

      setState((prev) => ({
        ...prev,
        eventExpenses: [...prev.eventExpenses, expense],
        auditLogs: [
          {
            id: `a${Date.now()}`,
            timestamp: new Date().toISOString(),
            action: 'Event Expense Added',
            entity: 'EventExpense',
            entityId: booking.bookingNumber,
            performedBy: data.addedBy,
            details: `${data.category} — Rs. ${data.amount.toLocaleString()} for ${booking.bookingNumber}`,
            newValue: `Rs. ${data.amount.toLocaleString()}`,
          },
          ...prev.auditLogs,
        ],
      }));

      return expense;
    },
    [state.bookings, refreshFromApi],
  );

  const updateEventExpense = useCallback(
    async (
      id: string,
      data: Partial<Pick<EventExpense, 'category' | 'amount' | 'description'>>,
      by: string,
    ): Promise<boolean> => {
      if (USE_API) {
        try {
          await api.updateEventExpense(id, { ...data, by });
          await refreshFromApi();
          return true;
        } catch {
          return false;
        }
      }

      const expense = state.eventExpenses.find((e) => e.id === id);
      if (!expense) return false;

      const booking = state.bookings.find((b) => b.id === expense.bookingId);
      if (!booking || !isBookingFinanciallyEditable(booking.status)) return false;

      if (data.amount !== undefined && data.amount <= 0) return false;

      setState((prev) => ({
        ...prev,
        eventExpenses: prev.eventExpenses.map((e) =>
          e.id === id
            ? {
                ...e,
                ...data,
                updatedAt: new Date().toISOString(),
              }
            : e,
        ),
        auditLogs: [
          {
            id: `a${Date.now()}`,
            timestamp: new Date().toISOString(),
            action: 'Event Expense Updated',
            entity: 'EventExpense',
            entityId: booking.bookingNumber,
            performedBy: by,
            details: `Updated ${expense.category} expense for ${booking.bookingNumber}`,
            oldValue: `Rs. ${expense.amount.toLocaleString()}`,
            newValue: data.amount != null ? `Rs. ${data.amount.toLocaleString()}` : undefined,
          },
          ...prev.auditLogs,
        ],
      }));

      return true;
    },
    [state.eventExpenses, state.bookings, refreshFromApi],
  );

  const deleteEventExpense = useCallback(
    async (id: string, by: string): Promise<boolean> => {
      if (USE_API) {
        try {
          await api.deleteEventExpense(id, { by });
          await refreshFromApi();
          return true;
        } catch {
          return false;
        }
      }

      const expense = state.eventExpenses.find((e) => e.id === id);
      if (!expense) return false;

      const booking = state.bookings.find((b) => b.id === expense.bookingId);
      if (!booking || !isBookingFinanciallyEditable(booking.status)) return false;

      setState((prev) => ({
        ...prev,
        eventExpenses: prev.eventExpenses.filter((e) => e.id !== id),
        auditLogs: [
          {
            id: `a${Date.now()}`,
            timestamp: new Date().toISOString(),
            action: 'Event Expense Deleted',
            entity: 'EventExpense',
            entityId: booking.bookingNumber,
            performedBy: by,
            details: `Removed ${expense.category} — Rs. ${expense.amount.toLocaleString()}`,
          },
          ...prev.auditLogs,
        ],
      }));

      return true;
    },
    [state.eventExpenses, state.bookings, refreshFromApi],
  );

  const getEventExpensesForBooking = useCallback(
    (bookingId: string) => state.eventExpenses.filter((e) => e.bookingId === bookingId),
    [state.eventExpenses],
  );

  const value: AppContextType = {
    ...state,
    services,
    packages,
    addCustomer,
    createBooking,
    updateBookingStatus,
    requestCancellation,
    addPayment,
    addExpense,
    approveRequest,
    markNotificationRead,
    markAllNotificationsRead,
    addAuditLog,
    isVenueAvailable,
    getNextSerial,
    updateSettings,
    resetUserPassword,
    createUser,
    updateUser,
    deleteUser,
    updateBookingCharges,
    addBookingServiceItem,
    addEventExpense,
    updateEventExpense,
    deleteEventExpense,
    getEventExpensesForBooking,
    setCurrentUser,
    isAuthenticated,
    login,
    logout,
    apiMode: USE_API,
    apiLoading,
    apiError,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}

export function computeKPIs(bookings: Booking[], payments: Payment[], expenses: Expense[]) {
  const today = new Date().toISOString().split('T')[0];
  const todayBookings = bookings.filter((b) => b.bookingDate === today);
  const todayEvents = bookings.filter((b) => b.functionDate === today && b.status === 'confirmed');
  const todayPayments = payments.filter((p) => p.paymentDate === today);

  return {
    todayBookings: todayBookings.length,
    todayEvents: todayEvents.length,
    todayRevenue: todayPayments.reduce((s, p) => s + p.amount, 0),
    todayPaymentsReceived: todayPayments.reduce((s, p) => s + p.amount, 0),
    pendingPayments: bookings.filter((b) => b.remainingBalance > 0).length,
    todayCancellations: bookings.filter((b) => b.status === 'cancelled' && b.updatedAt.startsWith(today)).length,
    totalBookings: bookings.length,
    confirmedBookings: bookings.filter((b) => b.status === 'confirmed').length,
    pendingBookings: bookings.filter((b) => b.status === 'pending_review' || b.status === 'inquiry').length,
    tentativeBookings: bookings.filter((b) => b.status === 'tentative').length,
    cancelledBookings: bookings.filter((b) => b.status === 'cancelled').length,
    completedEvents: bookings.filter((b) => b.status === 'completed').length,
    totalBookingValue: bookings.reduce((s, b) => s + b.grandTotal, 0),
    totalAdvanceReceived: bookings.reduce((s, b) => s + b.advancePaid, 0),
    totalBalance: bookings.reduce((s, b) => s + b.remainingBalance, 0),
    totalPaymentsReceived: payments.reduce((s, p) => s + p.amount, 0),
    totalRefunds: 0,
    totalExpenses: expenses.filter((e) => e.approvalStatus === 'approved').reduce((s, e) => s + e.amount, 0),
    netRevenue:
      payments.reduce((s, p) => s + p.amount, 0) -
      expenses.filter((e) => e.approvalStatus === 'approved').reduce((s, e) => s + e.amount, 0),
  };
}
