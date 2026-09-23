// ============================================================
// Core Data Types for Shayan Banquet & Lawn Management System
// ============================================================

import { HALL_SUB_VENUES } from '../utils/venueConfig';

// --- User & Auth ---
export type UserRole = 'booking_office' | 'inventory_staff' | 'manager' | 'super_admin';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  phone?: string;
  avatar?: string;
  isActive: boolean;
  createdAt: string;
}

// --- Customer ---
export interface Customer {
  id: string;
  name: string;
  fatherHusbandName?: string;
  cnic?: string;
  phone: string;
  whatsapp?: string;
  address: string;
  email?: string;
  notes?: string;
  createdAt: string;
}

// --- Venue ---
export type VenueType = 'banquet_hall' | 'lawn' | 'hall' | 'outdoor';
export type VenueStatus = 'active' | 'inactive' | 'maintenance';

export interface Venue {
  id: string;
  name: string;
  type: VenueType;
  capacity: number;
  location: string;
  description: string;
  basePrice: number;
  status: VenueStatus;
  imageUrl: string;
  notes?: string;
}

// --- Services ---
export interface Service {
  id: string;
  name: string;
  unit: string;
  price: number;
  tax?: number;
  isActive: boolean;
  description?: string;
  category: string;
}

// --- Booking ---
export type BookingStatus =
  | 'inquiry'
  | 'pending_review'
  | 'tentative'
  | 'hold'
  | 'confirmed'
  | 'completed'
  | 'cancelled'
  | 'rejected'
  | 'cancellation_requested';

export type PaymentStatus = 'pending' | 'partially_paid' | 'paid' | 'refunded';

export interface BookingService {
  serviceId: string;
  serviceName: string;
  guestCount?: number;
  quantity: number;
  unitPrice: number;
  total: number;
  enteredBy?: string;
  enteredAt?: string;
  /** True when added on event day via "+ Add Item / Service" */
  isEventDayAddition?: boolean;
}

/** Per-event business costs — separate from customer bill and org-level Expense */
export interface EventExpense {
  id: string;
  bookingId: string;
  category: string;
  amount: number;
  description?: string;
  addedBy: string;
  addedAt: string;
  updatedAt?: string;
}

export const EVENT_EXPENSE_CATEGORIES = [
  'Decoration',
  'Generator/Fuel',
  'Staff',
  'Cleaning',
  'Catering Cost',
  'Food Supplies',
  'Transport',
  'Other',
] as const;

export interface Booking {
  id: string;
  bookingNumber: string;
  serialNumber: number;
  bookingDate: string;
  customer: Customer;
  venueId: string;
  venueName: string;
  functionDate: string;
  functionDay: string;
  programme: string;
  numberOfGuests: number;
  specialInstructions?: string;
  internalNotes?: string;
  services: BookingService[];
  subtotal: number;
  discount: number;
  taxAmount: number;
  grandTotal: number;
  advancePaid: number;
  remainingBalance: number;
  status: BookingStatus;
  paymentStatus: PaymentStatus;
  createdBy: string;
  lastUpdatedBy?: string;
  createdAt: string;
  updatedAt: string;
}

// --- Payment ---
export type PaymentMethod = 'cash' | 'bank_transfer' | 'jazzcash' | 'easypaisa' | 'card' | 'other';

export interface Payment {
  id: string;
  bookingId: string;
  bookingNumber: string;
  amount: number;
  method: PaymentMethod;
  paymentDate: string;
  receivedBy: string;
  transactionRef?: string;
  notes?: string;
  customerName: string;
}

// --- Expense ---
export interface Expense {
  id: string;
  category: string;
  amount: number;
  date: string;
  description: string;
  method: PaymentMethod;
  addedBy: string;
  approvalStatus: 'pending' | 'approved' | 'rejected';
}

// --- Notification ---
export interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'success' | 'error';
  isRead: boolean;
  createdAt: string;
  link?: string;
}

// --- Audit Log ---
export interface AuditLog {
  id: string;
  action: string;
  entity: string;
  entityId: string;
  performedBy: string;
  details: string;
  timestamp: string;
  oldValue?: string;
  newValue?: string;
  reason?: string;
}

// --- Package ---
export interface Package {
  id: string;
  name: string;
  venueIds: string[];
  description: string;
  basePrice: number;
  includedServices: { serviceId: string; serviceName: string; quantity: number }[];
  isActive: boolean;
}

// --- Approval ---
export type ApprovalType =
  | 'discount'
  | 'cancellation'
  | 'refund'
  | 'reschedule'
  | 'expense'
  | 'pricing_override';

export type ApprovalStatus = 'pending' | 'approved' | 'rejected';

export interface ApprovalRequest {
  id: string;
  entityType: string;
  entityId: string;
  requestType: ApprovalType;
  requestedBy: string;
  status: ApprovalStatus;
  reason: string;
  decisionNotes?: string;
  approvedBy?: string;
  approvedAt?: string;
  createdAt: string;
  details: string;
}

// --- Receipt ---
export interface Receipt {
  id: string;
  receiptNumber: string;
  bookingId: string;
  bookingNumber: string;
  customerName: string;
  functionDate: string;
  venueName: string;
  amount: number;
  previousBalance: number;
  newBalance: number;
  method: PaymentMethod;
  paymentDate: string;
  receivedBy: string;
  createdAt: string;
}

// --- System Settings ---
export interface SystemSettings {
  discountApprovalThresholdPercent: number;
  blockingStatuses: BookingStatus[];
  companyName: string;
  companyPhone: string;
  companyEmail: string;
  companyAddress: string;
  termsAndConditions: string;
}

// --- Inventory ---
export type InventoryStatus =
  | 'AVAILABLE'
  | 'RESERVED'
  | 'MISSING'
  | 'DAMAGED'
  | 'OUT'
  | 'IN_TRANSIT'
  | 'UNDER_MAINTENANCE'
  | 'RETIRED';

export type InventoryAction =
  | 'IN'
  | 'OUT'
  | 'TRANSFER'
  | 'MARK_MISSING'
  | 'MARK_DAMAGED'
  | 'RESTORE'
  | 'MAINTENANCE_START'
  | 'RETIRE'
  | 'RESERVE'
  | 'ISSUE'
  | 'RETURN'
  | 'ADJUSTMENT';

export type EventInventoryLineStatus = 'REQUIRED' | 'RESERVED' | 'ISSUED' | 'RETURNED' | 'RECONCILED';

export interface InventoryItemType {
  id: string;
  name: string;
  category: string;
  unit: string;
  serialTracking: boolean;
  defaultLocation?: string;
  notes?: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface InventoryStockBalance {
  id: string;
  itemTypeId: string;
  location: string;
  quantity: number;
  updatedAt: string;
}

export interface InventoryQuantityMovement {
  id: string;
  itemTypeId: string;
  action: string;
  quantity: number;
  fromLocation?: string;
  toLocation?: string;
  bookingId?: string;
  reason: string;
  reference?: string;
  notes?: string;
  createdBy: string;
  createdAt: string;
}

export interface EventInventoryAsset {
  id: string;
  eventLineId: string;
  inventoryItemId: string;
  serialNumber?: string;
  status: string;
  issuedAt?: string;
  returnedAt?: string;
  notes?: string;
  createdAt: string;
}

export interface EventInventoryLine {
  id: string;
  bookingId: string;
  itemTypeId: string;
  itemName: string;
  requiredQty: number;
  reservedQty: number;
  issuedQty: number;
  returnedQty: number;
  missingQty: number;
  damagedQty: number;
  status: EventInventoryLineStatus;
  notes?: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  allocations?: EventInventoryAsset[];
}

export interface InventoryMasterRow {
  itemTypeId: string;
  itemName: string;
  category: string;
  unit: string;
  serialTracking: boolean;
  total: number;
  available: number;
  reserved: number;
  issued: number;
  missing: number;
  damaged: number;
  underMaintenance: number;
  inTransit: number;
  retired: number;
  locations: string[];
  lastUpdated: string;
}

export interface InventoryItem {
  id: string;
  itemTypeId?: string;
  itemName: string;
  category: string;
  serialNumber: string;
  location: string;
  status: InventoryStatus;
  condition?: string;
  lastKnownLocation?: string;
  currentHolder?: string;
  activeBookingId?: string;
  purchaseDate?: string;
  purchaseReference?: string;
  supplier?: string;
  notes?: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface InventoryTransaction {
  id: string;
  inventoryItemId: string;
  serialNumber: string;
  action: InventoryAction;
  transactionDate: string;
  fromLocation: string;
  toLocation: string;
  person: string;
  reason: string;
  bookingId?: string;
  reference?: string;
  condition?: string;
  notes?: string;
  createdBy: string;
  createdAt: string;
}

// --- Kitchen ---
export interface KitchenPurchase {
  id: string;
  purchaseDate: string;
  item: string;
  category: string;
  quantity: number;
  unit: string;
  unitCost: number;
  totalCost: number;
  supplier: string;
  purchasedBy: string;
  receivedBy: string;
  invoiceNumber?: string;
  notes?: string;
  createdBy: string;
  createdAt: string;
}

export interface KitchenStock {
  id: string;
  item: string;
  category: string;
  unit: string;
  currentQuantity: number;
  minThreshold: number;
  lastPurchaseDate?: string;
  lastPurchaseCost?: number;
  updatedAt: string;
}

export interface KitchenStockUsage {
  id: string;
  item: string;
  quantity: number;
  unit: string;
  reason?: string;
  bookingId?: string;
  usedBy: string;
  usedAt: string;
  createdBy: string;
  createdAt: string;
}

export const INVENTORY_CATEGORIES = [
  'Kitchen Equipment',
  'Electronics',
  'Furniture',
  'Generator',
  'Appliances',
  'Other',
] as const;

export const KITCHEN_CATEGORIES = [
  'Meat & Poultry',
  'Rice & Grains',
  'Vegetables',
  'Spices',
  'Oil & Ghee',
  'Beverages',
  'Dairy',
  'Other',
] as const;

export const INVENTORY_STORAGE_LOCATIONS = [
  'Kitchen Store',
  'Kitchen',
  'Store Room',
  'Office',
  'Receiving',
  'Main Storage',
  'Maintenance/Damaged Area',
] as const;

/** All hall sections (A, B, C sub-venues) for per-hall asset tracking */
export const INVENTORY_HALL_LOCATIONS = HALL_SUB_VENUES.map((v) => v.location);

export const INVENTORY_LOCATIONS = [
  ...INVENTORY_STORAGE_LOCATIONS,
  ...INVENTORY_HALL_LOCATIONS,
] as const;

// --- Dashboard KPIs ---
export interface DashboardKPIs {
  todayBookings: number;
  todayEvents: number;
  todayRevenue: number;
  todayPaymentsReceived: number;
  pendingPayments: number;
  todayCancellations: number;
  totalBookings: number;
  confirmedBookings: number;
  pendingBookings: number;
  tentativeBookings: number;
  cancelledBookings: number;
  completedEvents: number;
  totalBookingValue: number;
  totalAdvanceReceived: number;
  totalBalance: number;
  totalPaymentsReceived: number;
  totalRefunds: number;
  totalExpenses: number;
  netRevenue: number;
}
