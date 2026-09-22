/** API client for Shayan Banquet backend */

const PRODUCTION_API_URL = 'https://shayan-banquet-api.onrender.com';

export const isApiEnabled = (): boolean =>
  import.meta.env.VITE_USE_API === 'true' || import.meta.env.PROD;

const API_BASE =
  (import.meta.env.VITE_API_URL as string | undefined)?.trim() ||
  (import.meta.env.PROD ? PRODUCTION_API_URL : '');

let authToken: string | null = null;

export function setAuthToken(token: string | null): void {
  authToken = token;
}

export function getAuthToken(): string | null {
  return authToken;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(init?.headers as Record<string, string> | undefined),
  };
  if (authToken) headers.Authorization = `Bearer ${authToken}`;

  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error((body as { error?: string }).error ?? `API error ${res.status}`);
  }
  return res.json() as Promise<T>;
}

export interface ApiAppState {
  bookings: import('../types').Booking[];
  customers: import('../types').Customer[];
  payments: import('../types').Payment[];
  expenses: import('../types').Expense[];
  eventExpenses: import('../types').EventExpense[];
  notifications: import('../types').Notification[];
  auditLogs: import('../types').AuditLog[];
  approvals: import('../types').ApprovalRequest[];
  receipts: import('../types').Receipt[];
  settings: import('../types').SystemSettings;
  users: import('../types').User[];
  venues: import('../types').Venue[];
  inventoryItems: import('../types').InventoryItem[];
  inventoryTransactions: import('../types').InventoryTransaction[];
  kitchenPurchases: import('../types').KitchenPurchase[];
  kitchenStock: import('../types').KitchenStock[];
  kitchenStockUsage: import('../types').KitchenStockUsage[];
}

export interface LoginResponse {
  token: string;
  user: { id: string; name: string; email: string; role: import('../types').UserRole };
}

export const api = {
  login: (body: { email: string; password: string; remember?: boolean }) =>
    request<LoginResponse>('/api/auth/login', { method: 'POST', body: JSON.stringify(body) }),
  logout: () => request<{ ok: boolean }>('/api/auth/logout', { method: 'POST' }),
  me: () => request<{ user: LoginResponse['user'] }>('/api/auth/me'),
  getState: () => request<ApiAppState>('/api/state'),
  checkAvailability: (venueId: string, date: string, excludeBookingId?: string) =>
    request<{ available: boolean }>(
      `/api/availability?venueId=${encodeURIComponent(venueId)}&date=${encodeURIComponent(date)}${excludeBookingId ? `&excludeBookingId=${encodeURIComponent(excludeBookingId)}` : ''}`,
    ),
  createBooking: (body: unknown) =>
    request<import('../types').Booking>('/api/bookings', { method: 'POST', body: JSON.stringify(body) }),
  addPayment: (body: unknown) =>
    request<{ payment: import('../types').Payment; receipt: import('../types').Receipt }>(
      '/api/payments',
      { method: 'POST', body: JSON.stringify(body) },
    ),
  createCustomer: (body: unknown) =>
    request<import('../types').Customer>('/api/customers', { method: 'POST', body: JSON.stringify(body) }),
  updateBookingCharges: (id: string, body: unknown) =>
    request<import('../types').Booking>(`/api/bookings/${id}/charges`, {
      method: 'PATCH',
      body: JSON.stringify(body),
    }),
  updateBookingStatus: (id: string, body: unknown) =>
    request<import('../types').Booking>(`/api/bookings/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify(body),
    }),
  requestCancellation: (id: string, body: unknown) =>
    request<import('../types').Booking>(`/api/bookings/${id}/cancel-request`, {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  approveRequest: (id: string, body: unknown) =>
    request<{ ok: boolean }>(`/api/approvals/${id}/decide`, {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  addExpense: (body: unknown) =>
    request<import('../types').Expense>('/api/expenses', { method: 'POST', body: JSON.stringify(body) }),
  addBookingServiceItem: (id: string, body: unknown) =>
    request<import('../types').Booking>(`/api/bookings/${id}/event-items`, {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  addEventExpense: (body: unknown) =>
    request<import('../types').EventExpense>('/api/event-expenses', {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  updateEventExpense: (id: string, body: unknown) =>
    request<import('../types').EventExpense>(`/api/event-expenses/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(body),
    }),
  deleteEventExpense: (id: string, body: unknown) =>
    request<{ ok: boolean }>(`/api/event-expenses/${id}/delete`, {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  updateSettings: (body: unknown) =>
    request<import('../types').SystemSettings>('/api/settings', {
      method: 'PATCH',
      body: JSON.stringify(body),
    }),
  markNotificationRead: (id: string) =>
    request<{ ok: boolean }>(`/api/notifications/${id}/read`, { method: 'PATCH' }),
  markAllNotificationsRead: () =>
    request<{ ok: boolean }>('/api/notifications/read-all', { method: 'POST' }),
  createUser: (body: {
    name: string;
    email: string;
    role: import('../types').UserRole;
    phone?: string;
    password: string;
    isActive?: boolean;
  }) => request<import('../types').User>('/api/users', { method: 'POST', body: JSON.stringify(body) }),
  updateUser: (
    userId: string,
    body: Partial<{
      name: string;
      email: string;
      role: import('../types').UserRole;
      phone: string | null;
      isActive: boolean;
    }>,
  ) =>
    request<import('../types').User>(`/api/users/${encodeURIComponent(userId)}`, {
      method: 'PATCH',
      body: JSON.stringify(body),
    }),
  deleteUser: (userId: string) =>
    request<{ ok: boolean }>(`/api/users/${encodeURIComponent(userId)}`, { method: 'DELETE' }),
  resetUserPassword: (userId: string, newPassword: string) =>
    request<{ ok: boolean }>(`/api/users/${encodeURIComponent(userId)}/password`, {
      method: 'PATCH',
      body: JSON.stringify({ newPassword }),
    }),
  changePassword: (body: { currentPassword: string; newPassword: string }) =>
    request<{ ok: boolean; message?: string }>('/api/auth/change-password', {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  createInventoryItem: (body: unknown) =>
    request<import('../types').InventoryItem>('/api/inventory/items', {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  updateInventoryItem: (id: string, body: unknown) =>
    request<import('../types').InventoryItem>(`/api/inventory/items/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body: JSON.stringify(body),
    }),
  stockOut: (body: unknown) =>
    request<import('../types').InventoryItem>('/api/inventory/stock-out', {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  stockIn: (body: unknown) =>
    request<import('../types').InventoryItem>('/api/inventory/stock-in', {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  searchInventoryBySerial: (serial: string) =>
    request<{
      item: import('../types').InventoryItem;
      transactions: import('../types').InventoryTransaction[];
    }>(`/api/inventory/search/${encodeURIComponent(serial)}`),
  createKitchenPurchase: (body: unknown) =>
    request<import('../types').KitchenPurchase>('/api/kitchen/purchases', {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  recordKitchenStockUsage: (body: unknown) =>
    request<import('../types').KitchenStock>('/api/kitchen/stock-usage', {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  updateKitchenStockThreshold: (item: string, minThreshold: number) =>
    request<import('../types').KitchenStock>(
      `/api/kitchen/stock/${encodeURIComponent(item)}/threshold`,
      { method: 'PATCH', body: JSON.stringify({ minThreshold }) },
    ),
};

export async function refreshAppStateFromApi(): Promise<ApiAppState> {
  return api.getState();
}
