import type {
  ApprovalRecord,
  AuditLogRecord,
  Booking,
  BookingLineItem,
  Customer,
  EventExpenseRecord,
  ExpenseRecord,
  InventoryItem,
  InventoryTransaction,
  KitchenPurchase,
  KitchenStock,
  KitchenStockUsage,
  NotificationRecord,
  PaymentRecord,
  ReceiptRecord,
  SystemSettingsRecord,
  User,
  Venue,
} from '@prisma/client';

export interface BookingServiceDto {
  serviceId: string;
  serviceName: string;
  guestCount?: number;
  quantity: number;
  unitPrice: number;
  total: number;
  enteredBy?: string;
  enteredAt?: string;
  isEventDayAddition?: boolean;
}

export interface BookingDto {
  id: string;
  bookingNumber: string;
  serialNumber: number;
  bookingDate: string;
  customer: CustomerDto;
  venueId: string;
  venueName: string;
  functionDate: string;
  functionDay: string;
  programme: string;
  numberOfGuests: number;
  specialInstructions?: string;
  internalNotes?: string;
  services: BookingServiceDto[];
  subtotal: number;
  discount: number;
  taxAmount: number;
  grandTotal: number;
  advancePaid: number;
  remainingBalance: number;
  status: string;
  paymentStatus: string;
  createdBy: string;
  lastUpdatedBy?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CustomerDto {
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

export interface AppStateDto {
  bookings: BookingDto[];
  customers: CustomerDto[];
  payments: ReturnType<typeof mapPayment>[];
  expenses: ReturnType<typeof mapExpense>[];
  eventExpenses: ReturnType<typeof mapEventExpense>[];
  notifications: ReturnType<typeof mapNotification>[];
  auditLogs: ReturnType<typeof mapAuditLog>[];
  approvals: ReturnType<typeof mapApproval>[];
  receipts: ReturnType<typeof mapReceipt>[];
  settings: ReturnType<typeof mapSettings>;
  users: ReturnType<typeof mapUser>[];
  venues: ReturnType<typeof mapVenue>[];
  inventoryItems: ReturnType<typeof mapInventoryItem>[];
  inventoryTransactions: ReturnType<typeof mapInventoryTransaction>[];
  kitchenPurchases: ReturnType<typeof mapKitchenPurchase>[];
  kitchenStock: ReturnType<typeof mapKitchenStock>[];
  kitchenStockUsage: ReturnType<typeof mapKitchenStockUsage>[];
}

export function mapCustomer(c: Customer): CustomerDto {
  return {
    id: c.id,
    name: c.name,
    fatherHusbandName: c.fatherHusbandName ?? undefined,
    cnic: c.cnic ?? undefined,
    phone: c.phone,
    whatsapp: c.whatsapp ?? undefined,
    address: c.address,
    email: c.email ?? undefined,
    notes: c.notes ?? undefined,
    createdAt: c.createdAt,
  };
}

function mapLineItem(item: BookingLineItem): BookingServiceDto {
  return {
    serviceId: item.serviceId,
    serviceName: item.serviceName,
    guestCount: item.guestCount ?? undefined,
    quantity: item.quantity,
    unitPrice: item.unitPrice,
    total: item.total,
    enteredBy: item.enteredBy ?? undefined,
    enteredAt: item.enteredAt ?? undefined,
    isEventDayAddition: item.isEventDayAddition,
  };
}

export function mapBooking(
  b: Booking & { customer: Customer; lineItems: BookingLineItem[] },
): BookingDto {
  return {
    id: b.id,
    bookingNumber: b.bookingNumber,
    serialNumber: b.serialNumber,
    bookingDate: b.bookingDate,
    customer: mapCustomer(b.customer),
    venueId: b.venueId,
    venueName: b.venueName,
    functionDate: b.functionDate,
    functionDay: b.functionDay,
    programme: b.programme,
    numberOfGuests: b.numberOfGuests,
    specialInstructions: b.specialInstructions ?? undefined,
    internalNotes: b.internalNotes ?? undefined,
    services: b.lineItems.map(mapLineItem),
    subtotal: b.subtotal,
    discount: b.discount,
    taxAmount: b.taxAmount,
    grandTotal: b.grandTotal,
    advancePaid: b.advancePaid,
    remainingBalance: b.remainingBalance,
    status: b.status,
    paymentStatus: b.paymentStatus,
    createdBy: b.createdBy,
    lastUpdatedBy: b.lastUpdatedBy ?? undefined,
    createdAt: b.createdAt,
    updatedAt: b.updatedAt,
  };
}

export function mapPayment(p: PaymentRecord) {
  return {
    id: p.id,
    bookingId: p.bookingId,
    bookingNumber: p.bookingNumber,
    amount: p.amount,
    method: p.method,
    paymentDate: p.paymentDate,
    receivedBy: p.receivedBy,
    transactionRef: p.transactionRef ?? undefined,
    notes: p.notes ?? undefined,
    customerName: p.customerName,
  };
}

export function mapReceipt(r: ReceiptRecord) {
  return {
    id: r.id,
    receiptNumber: r.receiptNumber,
    bookingId: r.bookingId,
    bookingNumber: r.bookingNumber,
    customerName: r.customerName,
    functionDate: r.functionDate,
    venueName: r.venueName,
    amount: r.amount,
    previousBalance: r.previousBalance,
    newBalance: r.newBalance,
    method: r.method,
    paymentDate: r.paymentDate,
    receivedBy: r.receivedBy,
    createdAt: r.createdAt,
  };
}

export function mapExpense(e: ExpenseRecord) {
  return {
    id: e.id,
    category: e.category,
    amount: e.amount,
    date: e.date,
    description: e.description,
    method: e.method,
    addedBy: e.addedBy,
    approvalStatus: e.approvalStatus as 'pending' | 'approved' | 'rejected',
  };
}

export function mapEventExpense(e: EventExpenseRecord) {
  return {
    id: e.id,
    bookingId: e.bookingId,
    category: e.category,
    amount: e.amount,
    description: e.description ?? undefined,
    addedBy: e.addedBy,
    addedAt: e.addedAt,
    updatedAt: e.updatedAt ?? undefined,
  };
}

export function mapApproval(a: ApprovalRecord) {
  return {
    id: a.id,
    entityType: a.entityType,
    entityId: a.entityId,
    requestType: a.requestType,
    requestedBy: a.requestedBy,
    status: a.status,
    reason: a.reason,
    decisionNotes: a.decisionNotes ?? undefined,
    approvedBy: a.approvedBy ?? undefined,
    approvedAt: a.approvedAt ?? undefined,
    createdAt: a.createdAt,
    details: a.details,
  };
}

export function mapNotification(n: NotificationRecord) {
  return {
    id: n.id,
    title: n.title,
    message: n.message,
    type: n.type,
    isRead: n.isRead,
    createdAt: n.createdAt,
    link: n.link ?? undefined,
  };
}

export function mapAuditLog(a: AuditLogRecord) {
  return {
    id: a.id,
    action: a.action,
    entity: a.entity,
    entityId: a.entityId,
    performedBy: a.performedBy,
    details: a.details,
    timestamp: a.timestamp,
    oldValue: a.oldValue ?? undefined,
    newValue: a.newValue ?? undefined,
    reason: a.reason ?? undefined,
  };
}

export function mapUser(u: User) {
  return {
    id: u.id,
    name: u.name,
    email: u.email,
    role: u.role,
    phone: u.phone ?? undefined,
    isActive: u.isActive,
    createdAt: u.createdAt,
  };
}

export function mapVenue(v: Venue) {
  return {
    id: v.id,
    name: v.name,
    type: v.type,
    capacity: v.capacity,
    location: v.location,
    description: v.description,
    basePrice: v.basePrice,
    status: v.status,
    imageUrl: v.imageUrl,
  };
}

export function mapSettings(s: SystemSettingsRecord) {
  return {
    discountApprovalThresholdPercent: s.discountApprovalThresholdPercent,
    blockingStatuses: JSON.parse(s.blockingStatusesJson) as string[],
    companyName: s.companyName,
    companyPhone: s.companyPhone,
    companyEmail: s.companyEmail,
    companyAddress: s.companyAddress,
    termsAndConditions: s.termsAndConditions,
  };
}

export function mapInventoryItem(i: InventoryItem) {
  return {
    id: i.id,
    itemName: i.itemName,
    category: i.category,
    serialNumber: i.serialNumber,
    location: i.location,
    status: i.status as 'IN' | 'OUT',
    currentHolder: i.currentHolder ?? undefined,
    purchaseDate: i.purchaseDate ?? undefined,
    purchaseReference: i.purchaseReference ?? undefined,
    supplier: i.supplier ?? undefined,
    notes: i.notes ?? undefined,
    createdBy: i.createdBy,
    createdAt: i.createdAt,
    updatedAt: i.updatedAt,
  };
}

export function mapInventoryTransaction(t: InventoryTransaction) {
  return {
    id: t.id,
    inventoryItemId: t.inventoryItemId,
    serialNumber: t.serialNumber,
    action: t.action as 'IN' | 'OUT',
    transactionDate: t.transactionDate,
    fromLocation: t.fromLocation,
    toLocation: t.toLocation,
    person: t.person,
    reason: t.reason,
    bookingId: t.bookingId ?? undefined,
    condition: t.condition ?? undefined,
    notes: t.notes ?? undefined,
    createdBy: t.createdBy,
    createdAt: t.createdAt,
  };
}

export function mapKitchenPurchase(p: KitchenPurchase) {
  return {
    id: p.id,
    purchaseDate: p.purchaseDate,
    item: p.item,
    category: p.category,
    quantity: p.quantity,
    unit: p.unit,
    unitCost: p.unitCost,
    totalCost: p.totalCost,
    supplier: p.supplier,
    purchasedBy: p.purchasedBy,
    receivedBy: p.receivedBy,
    invoiceNumber: p.invoiceNumber ?? undefined,
    notes: p.notes ?? undefined,
    createdBy: p.createdBy,
    createdAt: p.createdAt,
  };
}

export function mapKitchenStock(s: KitchenStock) {
  return {
    id: s.id,
    item: s.item,
    category: s.category,
    unit: s.unit,
    currentQuantity: s.currentQuantity,
    minThreshold: s.minThreshold,
    lastPurchaseDate: s.lastPurchaseDate ?? undefined,
    lastPurchaseCost: s.lastPurchaseCost ?? undefined,
    updatedAt: s.updatedAt,
  };
}

export function mapKitchenStockUsage(u: KitchenStockUsage) {
  return {
    id: u.id,
    item: u.item,
    quantity: u.quantity,
    unit: u.unit,
    reason: u.reason ?? undefined,
    bookingId: u.bookingId ?? undefined,
    usedBy: u.usedBy,
    usedAt: u.usedAt,
    createdBy: u.createdBy,
    createdAt: u.createdAt,
  };
}
