// ============================================================
// Initial Seed Data — Shayan Banquet & Lawn Management System
// ============================================================
import type {
  User, Customer, Venue, Service, Booking, Payment,
  Expense, EventExpense, Notification, AuditLog, Package, ApprovalRequest, Receipt, SystemSettings,
} from '../types';
import { getDayName } from '../utils/bookingUtils';
import { HALL_SUB_VENUES } from '../utils/venueConfig';

/** Always includes a confirmed event on the current date for Event Day demo */
export const demoToday = new Date().toISOString().split('T')[0];

// --- Current User ---
export const currentUser: User = {
  id: 'u1',
  name: 'Ahmed Khan',
  email: 'ahmed@shayanbanquet.pk',
  role: 'booking_office',
  phone: '0300-1234567',
  isActive: true,
  createdAt: '2026-01-15',
};

// --- Users ---
export const users: User[] = [
  currentUser,
  { id: 'u2', name: 'Ali Hassan', email: 'ali@shayanbanquet.pk', role: 'manager', phone: '0321-9876543', isActive: true, createdAt: '2026-01-10' },
  { id: 'u3', name: 'Admin', email: 'admin@shayanbanquet.pk', role: 'super_admin', isActive: true, createdAt: '2025-12-01' },
  { id: 'u4', name: 'Sara Bibi', email: 'sara@shayanbanquet.pk', role: 'booking_office', phone: '0333-1112233', isActive: true, createdAt: '2026-03-01' },
];

// --- Customers ---
export const customers: Customer[] = [
  { id: 'c1', name: 'Muhammad Aslam', fatherHusbandName: 'Abdul Rashid', cnic: '42101-1234567-1', phone: '0312-4567890', whatsapp: '0312-4567890', address: 'Block 14, Gulistan-e-Jauhar, Karachi', email: 'aslam@email.com', createdAt: '2026-06-10' },
  { id: 'c2', name: 'Fatima Noor', phone: '0345-6789012', whatsapp: '0345-6789012', address: 'DHA Phase 5, Karachi', createdAt: '2026-07-01' },
  { id: 'c3', name: 'Rizwan Ahmed', fatherHusbandName: 'Nadeem Ahmed', cnic: '42201-9876543-2', phone: '0300-1112233', address: 'North Nazimabad, Block H, Karachi', createdAt: '2026-07-15' },
  { id: 'c4', name: 'Ayesha Siddiqui', phone: '0321-4445566', address: 'Clifton Block 8, Karachi', email: 'ayesha.s@email.com', createdAt: '2026-08-01' },
  { id: 'c5', name: 'Kamran Malik', fatherHusbandName: 'Tariq Malik', phone: '0333-7778899', address: 'Malir Cantt, Karachi', createdAt: '2026-08-05' },
  { id: 'c6', name: 'Hina Pervez', phone: '0347-2223344', whatsapp: '0347-2223344', address: 'Gulshan-e-Iqbal Block 13, Karachi', createdAt: '2026-08-10' },
];

// --- Venues ---
const hallVenues: Venue[] = HALL_SUB_VENUES.map((h) => ({
  id: h.id,
  name: h.name,
  type: 'hall' as const,
  capacity: h.capacity,
  location: h.location,
  description: h.description,
  basePrice: h.basePrice,
  status: 'active' as const,
  imageUrl: 'https://images.unsplash.com/photo-1505236858219-8359eb29e329?w=800&q=80',
}));

export const venues: Venue[] = [...hallVenues];

// --- Services ---
export const services: Service[] = [
  { id: 's1', name: 'Booking Charges', unit: 'per event', price: 0, isActive: true, category: 'Core', description: 'Base venue booking charge' },
  { id: 's2', name: 'Sound System', unit: 'per event', price: 25000, isActive: true, category: 'Audio/Visual' },
  { id: 's3', name: 'Entry', unit: 'per event', price: 15000, isActive: true, category: 'Core' },
  { id: 's4', name: 'Cold Drinks', unit: 'per person', price: 150, isActive: true, category: 'Beverages' },
  { id: 's5', name: 'Mineral Water', unit: 'per person', price: 50, isActive: true, category: 'Beverages' },
  { id: 's6', name: 'Catering', unit: 'per person', price: 1200, isActive: true, category: 'Food' },
  { id: 's7', name: 'Decoration', unit: 'per event', price: 80000, isActive: true, category: 'Decoration' },
  { id: 's8', name: 'Generator', unit: 'per event', price: 30000, isActive: true, category: 'Utilities' },
  { id: 's9', name: 'Parking', unit: 'per event', price: 10000, isActive: true, category: 'Core' },
  { id: 's10', name: 'Stage', unit: 'per event', price: 45000, isActive: true, category: 'Decoration' },
  { id: 's11', name: 'Lighting', unit: 'per event', price: 35000, isActive: true, category: 'Audio/Visual' },
  { id: 's12', name: 'Photography', unit: 'per event', price: 50000, isActive: true, category: 'Media' },
  { id: 's13', name: 'Security', unit: 'per event', price: 20000, isActive: true, category: 'Core' },
  { id: 's14', name: 'Extra Chairs', unit: 'per 50 chairs', price: 5000, isActive: true, category: 'Furniture' },
  { id: 's15', name: 'Extra Tables', unit: 'per 10 tables', price: 8000, isActive: true, category: 'Furniture' },
];

// --- Packages ---
export const packages: Package[] = [
  {
    id: 'pkg1', name: 'Royal Wedding Package', venueIds: ['va-full', 'vb-full', 'vc-full'],
    description: 'Complete wedding solution with decoration, sound, catering & photography',
    basePrice: 450000, isActive: true,
    includedServices: [
      { serviceId: 's1', serviceName: 'Booking Charges', quantity: 1 },
      { serviceId: 's7', serviceName: 'Decoration', quantity: 1 },
      { serviceId: 's2', serviceName: 'Sound System', quantity: 1 },
      { serviceId: 's6', serviceName: 'Catering', quantity: 500 },
      { serviceId: 's12', serviceName: 'Photography', quantity: 1 },
    ],
  },
  {
    id: 'pkg2', name: 'Mehndi Special', venueIds: ['va-gold', 'vc-silver', 'vc-diamond'],
    description: 'Perfect mehndi setup with stage, lighting & sound',
    basePrice: 200000, isActive: true,
    includedServices: [
      { serviceId: 's1', serviceName: 'Booking Charges', quantity: 1 },
      { serviceId: 's10', serviceName: 'Stage', quantity: 1 },
      { serviceId: 's11', serviceName: 'Lighting', quantity: 1 },
      { serviceId: 's2', serviceName: 'Sound System', quantity: 1 },
    ],
  },
  {
    id: 'pkg3', name: 'Corporate Essentials', venueIds: ['va-red', 'va-gold', 'vb1', 'vb2'],
    description: 'Professional setup for corporate events and seminars',
    basePrice: 150000, isActive: true,
    includedServices: [
      { serviceId: 's1', serviceName: 'Booking Charges', quantity: 1 },
      { serviceId: 's2', serviceName: 'Sound System', quantity: 1 },
      { serviceId: 's9', serviceName: 'Parking', quantity: 1 },
      { serviceId: 's4', serviceName: 'Cold Drinks', quantity: 200 },
    ],
  },
];

// --- Bookings ---
export const initialBookings: Booking[] = [
  {
    id: 'b1', bookingNumber: 'SB-1001', serialNumber: 1, bookingDate: '2026-08-01',
    customer: customers[0], venueId: 'va-full', venueName: 'A Full',
    functionDate: '2026-09-15', functionDay: getDayName('2026-09-15'),
    programme: 'Wedding', numberOfGuests: 800,
    specialInstructions: 'Bridal entrance from east gate', internalNotes: 'VIP client — referred by Malik sb',
    services: [
      { serviceId: 's1', serviceName: 'Booking Charges', quantity: 1, unitPrice: 150000, total: 150000 },
      { serviceId: 's2', serviceName: 'Sound System', quantity: 1, unitPrice: 25000, total: 25000 },
      { serviceId: 's4', serviceName: 'Cold Drinks', quantity: 800, unitPrice: 150, total: 120000 },
      { serviceId: 's5', serviceName: 'Mineral Water', quantity: 800, unitPrice: 50, total: 40000 },
      { serviceId: 's7', serviceName: 'Decoration', quantity: 1, unitPrice: 80000, total: 80000 },
    ],
    subtotal: 415000, discount: 15000, taxAmount: 0, grandTotal: 400000,
    advancePaid: 200000, remainingBalance: 200000,
    status: 'confirmed', paymentStatus: 'partially_paid',
    createdBy: 'Ahmed Khan', createdAt: '2026-08-01T10:30:00', updatedAt: '2026-08-01T10:30:00',
  },
  {
    id: 'b2', bookingNumber: 'SB-1002', serialNumber: 2, bookingDate: '2026-08-05',
    customer: customers[1], venueId: 'vc-full', venueName: 'C Full',
    functionDate: '2026-09-20', functionDay: getDayName('2026-09-20'),
    programme: 'Mehndi', numberOfGuests: 600,
    services: [
      { serviceId: 's1', serviceName: 'Booking Charges', quantity: 1, unitPrice: 120000, total: 120000 },
      { serviceId: 's2', serviceName: 'Sound System', quantity: 1, unitPrice: 25000, total: 25000 },
      { serviceId: 's10', serviceName: 'Stage', quantity: 1, unitPrice: 45000, total: 45000 },
      { serviceId: 's11', serviceName: 'Lighting', quantity: 1, unitPrice: 35000, total: 35000 },
    ],
    subtotal: 225000, discount: 0, taxAmount: 0, grandTotal: 225000,
    advancePaid: 100000, remainingBalance: 125000,
    status: 'confirmed', paymentStatus: 'partially_paid',
    createdBy: 'Ahmed Khan', createdAt: '2026-08-05T14:00:00', updatedAt: '2026-08-05T14:00:00',
  },
  {
    id: 'b3', bookingNumber: 'SB-1003', serialNumber: 3, bookingDate: '2026-08-10',
    customer: customers[2], venueId: 'vb-full', venueName: 'B Full',
    functionDate: '2026-10-05', functionDay: getDayName('2026-10-05'),
    programme: 'Valima', numberOfGuests: 500,
    services: [
      { serviceId: 's1', serviceName: 'Booking Charges', quantity: 1, unitPrice: 150000, total: 150000 },
      { serviceId: 's6', serviceName: 'Catering', quantity: 500, unitPrice: 1200, total: 600000 },
      { serviceId: 's2', serviceName: 'Sound System', quantity: 1, unitPrice: 25000, total: 25000 },
    ],
    subtotal: 775000, discount: 25000, taxAmount: 0, grandTotal: 750000,
    advancePaid: 300000, remainingBalance: 450000,
    status: 'pending_review', paymentStatus: 'partially_paid',
    createdBy: 'Sara Bibi', createdAt: '2026-08-10T11:00:00', updatedAt: '2026-08-10T11:00:00',
  },
  {
    id: 'b4', bookingNumber: 'SB-1004', serialNumber: 4, bookingDate: '2026-08-15',
    customer: customers[3], venueId: 'va-red', venueName: 'A Red',
    functionDate: '2026-08-24', functionDay: getDayName('2026-08-24'),
    programme: 'Birthday Party', numberOfGuests: 150,
    services: [
      { serviceId: 's1', serviceName: 'Booking Charges', quantity: 1, unitPrice: 60000, total: 60000 },
      { serviceId: 's4', serviceName: 'Cold Drinks', quantity: 150, unitPrice: 150, total: 22500 },
    ],
    subtotal: 82500, discount: 0, taxAmount: 0, grandTotal: 82500,
    advancePaid: 82500, remainingBalance: 0,
    status: 'confirmed', paymentStatus: 'paid',
    createdBy: 'Ahmed Khan', createdAt: '2026-08-15T09:00:00', updatedAt: '2026-08-15T09:00:00',
  },
  {
    id: 'b5', bookingNumber: 'SB-1005', serialNumber: 5, bookingDate: '2026-08-18',
    customer: customers[4], venueId: 'vb-full', venueName: 'B Full',
    functionDate: '2026-08-25', functionDay: getDayName('2026-08-25'),
    programme: 'Wedding', numberOfGuests: 1200,
    services: [
      { serviceId: 's1', serviceName: 'Booking Charges', quantity: 1, unitPrice: 120000, total: 120000 },
      { serviceId: 's2', serviceName: 'Sound System', quantity: 1, unitPrice: 25000, total: 25000 },
      { serviceId: 's7', serviceName: 'Decoration', quantity: 1, unitPrice: 80000, total: 80000 },
      { serviceId: 's12', serviceName: 'Photography', quantity: 1, unitPrice: 50000, total: 50000 },
      { serviceId: 's8', serviceName: 'Generator', quantity: 1, unitPrice: 30000, total: 30000 },
    ],
    subtotal: 305000, discount: 5000, taxAmount: 0, grandTotal: 300000,
    advancePaid: 150000, remainingBalance: 150000,
    status: 'confirmed', paymentStatus: 'partially_paid',
    createdBy: 'Ahmed Khan', createdAt: '2026-08-18T16:30:00', updatedAt: '2026-08-18T16:30:00',
  },
  {
    id: 'b6', bookingNumber: 'SB-1006', serialNumber: 6, bookingDate: '2026-08-20',
    customer: customers[5], venueId: 'vb1', venueName: 'B1',
    functionDate: '2026-09-01', functionDay: getDayName('2026-09-01'),
    programme: 'Corporate Event', numberOfGuests: 250,
    services: [
      { serviceId: 's1', serviceName: 'Booking Charges', quantity: 1, unitPrice: 80000, total: 80000 },
      { serviceId: 's2', serviceName: 'Sound System', quantity: 1, unitPrice: 25000, total: 25000 },
      { serviceId: 's9', serviceName: 'Parking', quantity: 1, unitPrice: 10000, total: 10000 },
    ],
    subtotal: 115000, discount: 0, taxAmount: 0, grandTotal: 115000,
    advancePaid: 50000, remainingBalance: 65000,
    status: 'tentative', paymentStatus: 'partially_paid',
    createdBy: 'Sara Bibi', createdAt: '2026-08-20T10:00:00', updatedAt: '2026-08-20T10:00:00',
  },
  {
    id: 'b7', bookingNumber: 'SB-1007', serialNumber: 7, bookingDate: '2026-08-22',
    customer: { id: 'c7', name: 'Zafar Iqbal', phone: '0311-5556677', address: 'Korangi, Karachi', createdAt: '2026-08-22' },
    venueId: 'va-gold', venueName: 'A Gold',
    functionDate: '2026-11-10', functionDay: getDayName('2026-11-10'),
    programme: 'Engagement', numberOfGuests: 400,
    services: [
      { serviceId: 's1', serviceName: 'Booking Charges', quantity: 1, unitPrice: 150000, total: 150000 },
      { serviceId: 's2', serviceName: 'Sound System', quantity: 1, unitPrice: 25000, total: 25000 },
    ],
    subtotal: 175000, discount: 0, taxAmount: 0, grandTotal: 175000,
    advancePaid: 0, remainingBalance: 175000,
    status: 'inquiry', paymentStatus: 'pending',
    createdBy: 'Ahmed Khan', createdAt: '2026-08-22T12:00:00', updatedAt: '2026-08-22T12:00:00',
  },
  {
    id: 'b8', bookingNumber: 'SB-1008', serialNumber: 8, bookingDate: demoToday,
    customer: customers[1], venueId: 'vc-silver', venueName: 'C Silver',
    functionDate: demoToday, functionDay: getDayName(demoToday),
    programme: 'Wedding', numberOfGuests: 350,
    specialInstructions: 'Demo event — use Event Day workspace to add items and costs',
    services: [
      { serviceId: 's1', serviceName: 'Booking Charges', quantity: 1, unitPrice: 120000, total: 120000 },
      { serviceId: 's2', serviceName: 'Sound System', quantity: 1, unitPrice: 25000, total: 25000 },
      { serviceId: 's7', serviceName: 'Decoration', quantity: 1, unitPrice: 35000, total: 35000 },
    ],
    subtotal: 180000, discount: 0, taxAmount: 0, grandTotal: 180000,
    advancePaid: 80000, remainingBalance: 100000,
    status: 'confirmed', paymentStatus: 'partially_paid',
    createdBy: 'Ahmed Khan', createdAt: `${demoToday}T09:00:00`, updatedAt: `${demoToday}T09:00:00`,
  },
];

// --- Payments ---
export const initialPayments: Payment[] = [
  { id: 'p1', bookingId: 'b1', bookingNumber: 'SB-1001', amount: 100000, method: 'cash', paymentDate: '2026-08-01', receivedBy: 'Ahmed Khan', customerName: 'Muhammad Aslam' },
  { id: 'p2', bookingId: 'b1', bookingNumber: 'SB-1001', amount: 100000, method: 'bank_transfer', paymentDate: '2026-08-10', receivedBy: 'Ahmed Khan', transactionRef: 'HBL-78654', customerName: 'Muhammad Aslam' },
  { id: 'p3', bookingId: 'b2', bookingNumber: 'SB-1002', amount: 100000, method: 'jazzcash', paymentDate: '2026-08-05', receivedBy: 'Ahmed Khan', transactionRef: 'JC-445566', customerName: 'Fatima Noor' },
  { id: 'p4', bookingId: 'b3', bookingNumber: 'SB-1003', amount: 300000, method: 'cash', paymentDate: '2026-08-10', receivedBy: 'Sara Bibi', customerName: 'Rizwan Ahmed' },
  { id: 'p5', bookingId: 'b4', bookingNumber: 'SB-1004', amount: 82500, method: 'cash', paymentDate: '2026-08-15', receivedBy: 'Ahmed Khan', customerName: 'Ayesha Siddiqui' },
  { id: 'p6', bookingId: 'b5', bookingNumber: 'SB-1005', amount: 150000, method: 'bank_transfer', paymentDate: '2026-08-18', receivedBy: 'Ahmed Khan', transactionRef: 'MCB-99001', customerName: 'Kamran Malik' },
  { id: 'p7', bookingId: 'b6', bookingNumber: 'SB-1006', amount: 50000, method: 'easypaisa', paymentDate: '2026-08-20', receivedBy: 'Sara Bibi', transactionRef: 'EP-112233', customerName: 'Hina Pervez' },
  { id: 'p8', bookingId: 'b8', bookingNumber: 'SB-1008', amount: 80000, method: 'cash', paymentDate: demoToday, receivedBy: 'Ahmed Khan', customerName: 'Fatima Noor' },
];

// --- Event Expenses (per-booking business costs) ---
export const initialEventExpenses: EventExpense[] = [
  {
    id: 'ee1',
    bookingId: 'b4',
    category: 'Decoration',
    amount: 12000,
    description: 'Fresh flowers and backdrop setup',
    addedBy: 'Ahmed Khan',
    addedAt: '2026-08-24T10:00:00',
  },
  {
    id: 'ee2',
    bookingId: 'b4',
    category: 'Staff',
    amount: 3000,
    description: 'Extra wait staff for birthday',
    addedBy: 'Ahmed Khan',
    addedAt: '2026-08-24T11:30:00',
  },
];

// --- Expenses ---
export const initialExpenses: Expense[] = [
  { id: 'e1', category: 'Electricity', amount: 85000, date: '2026-08-01', description: 'August electricity bill', method: 'bank_transfer', addedBy: 'Ali Hassan', approvalStatus: 'approved' },
  { id: 'e2', category: 'Generator', amount: 45000, date: '2026-08-05', description: 'Diesel + maintenance', method: 'cash', addedBy: 'Ali Hassan', approvalStatus: 'approved' },
  { id: 'e3', category: 'Staff Salary', amount: 350000, date: '2026-08-01', description: 'August staff salaries', method: 'bank_transfer', addedBy: 'Ali Hassan', approvalStatus: 'approved' },
  { id: 'e4', category: 'Cleaning', amount: 25000, date: '2026-08-10', description: 'Deep cleaning services', method: 'cash', addedBy: 'Ali Hassan', approvalStatus: 'approved' },
  { id: 'e5', category: 'Maintenance', amount: 60000, date: '2026-08-15', description: 'AC repair + plumbing', method: 'cash', addedBy: 'Ali Hassan', approvalStatus: 'pending' },
  { id: 'e6', category: 'Marketing', amount: 30000, date: '2026-08-20', description: 'Social media advertising', method: 'bank_transfer', addedBy: 'Ali Hassan', approvalStatus: 'approved' },
];

// --- Notifications ---
export const initialNotifications: Notification[] = [
  { id: 'n1', title: 'New Booking Inquiry', message: 'Zafar Iqbal submitted a booking inquiry for A Gold on Nov 10.', type: 'info', isRead: false, createdAt: '2026-08-22T12:00:00', link: '/office/bookings/b7' },
  { id: 'n2', title: 'Payment Received', message: 'Rs. 150,000 received from Kamran Malik for SB-1005.', type: 'success', isRead: false, createdAt: '2026-08-18T16:35:00' },
  { id: 'n3', title: 'Upcoming Event Tomorrow', message: 'Ayesha Siddiqui\'s Birthday Party at A Red tomorrow (Aug 24).', type: 'warning', isRead: true, createdAt: '2026-08-23T08:00:00' },
  { id: 'n4', title: 'Pending Approval', message: 'Booking SB-1003 requires manager approval.', type: 'warning', isRead: false, createdAt: '2026-08-10T11:05:00' },
  { id: 'n5', title: 'Expense Pending Approval', message: 'AC repair + plumbing expense of Rs. 60,000 needs approval.', type: 'info', isRead: false, createdAt: '2026-08-15T14:00:00' },
];

// --- Audit Logs ---
export const initialAuditLogs: AuditLog[] = [
  { id: 'a1', action: 'Created', entity: 'Booking', entityId: 'SB-1001', performedBy: 'Ahmed Khan', details: 'New booking created for Muhammad Aslam — Wedding at A Full on Sep 15.', timestamp: '2026-08-01T10:30:00' },
  { id: 'a2', action: 'Payment Received', entity: 'Payment', entityId: 'p1', performedBy: 'Ahmed Khan', details: 'Rs. 100,000 cash advance received for SB-1001.', timestamp: '2026-08-01T10:32:00' },
  { id: 'a3', action: 'Modified', entity: 'Booking', entityId: 'SB-1001', performedBy: 'Ali Hassan', details: 'Advance updated: Rs. 100,000 → Rs. 200,000.', timestamp: '2026-08-10T15:00:00' },
  { id: 'a4', action: 'Status Changed', entity: 'Booking', entityId: 'SB-1001', performedBy: 'Ali Hassan', details: 'Status changed: Pending Review → Confirmed.', timestamp: '2026-08-01T11:00:00' },
  { id: 'a5', action: 'Created', entity: 'Booking', entityId: 'SB-1005', performedBy: 'Ahmed Khan', details: 'New booking for Kamran Malik — Wedding at B Full on Aug 25.', timestamp: '2026-08-18T16:30:00' },
];

// --- Approvals ---
export const initialApprovals: ApprovalRequest[] = [
  {
    id: 'ap1', entityType: 'Booking', entityId: 'SB-1003', requestType: 'discount',
    requestedBy: 'Sara Bibi', status: 'pending',
    reason: 'Discount of Rs. 25,000 exceeds 5% threshold',
    createdAt: '2026-08-10T11:05:00',
    details: 'SB-1003 — Rizwan Ahmed (Valima)',
  },
  {
    id: 'ap2', entityType: 'Expense', entityId: 'e5', requestType: 'expense',
    requestedBy: 'Ali Hassan', status: 'pending',
    reason: 'Expense above Rs. 50,000 threshold',
    createdAt: '2026-08-15T14:00:00',
    details: 'Maintenance — AC repair + plumbing (Rs. 60,000)',
  },
];

// --- Receipts ---
export const initialReceipts: Receipt[] = [
  { id: 'r1', receiptNumber: 'RCP-1001', bookingId: 'b1', bookingNumber: 'SB-1001', customerName: 'Muhammad Aslam', functionDate: '2026-09-15', venueName: 'A Full', amount: 100000, previousBalance: 400000, newBalance: 300000, method: 'cash', paymentDate: '2026-08-01', receivedBy: 'Ahmed Khan', createdAt: '2026-08-01T10:32:00' },
  { id: 'r2', receiptNumber: 'RCP-1002', bookingId: 'b1', bookingNumber: 'SB-1001', customerName: 'Muhammad Aslam', functionDate: '2026-09-15', venueName: 'A Full', amount: 100000, previousBalance: 300000, newBalance: 200000, method: 'bank_transfer', paymentDate: '2026-08-10', receivedBy: 'Ahmed Khan', createdAt: '2026-08-10T15:00:00' },
  { id: 'r3', receiptNumber: 'RCP-1003', bookingId: 'b4', bookingNumber: 'SB-1004', customerName: 'Ayesha Siddiqui', functionDate: '2026-08-24', venueName: 'A Red', amount: 82500, previousBalance: 82500, newBalance: 0, method: 'cash', paymentDate: '2026-08-15', receivedBy: 'Ahmed Khan', createdAt: '2026-08-15T09:05:00' },
];

// --- Settings ---
export const initialSettings: SystemSettings = {
  discountApprovalThresholdPercent: 5,
  blockingStatuses: ['confirmed', 'hold', 'tentative', 'cancellation_requested'],
  companyName: 'SHAYAN BANQUET / LAWN',
  companyPhone: '0300-2033224',
  companyEmail: 'info@shayanbanquet.pk',
  companyAddress: 'PAF Plot # 2, Shaheed-e-Millat Flyover, Baloch Colony, Karachi-75350',
  termsAndConditions: `1. Advance payment is required to confirm the booking.
2. Full payment must be cleared 7 days before the function date.
3. Advance amount is non-refundable.
4. Date change is subject to availability and management approval.
5. Outside food, drinks, or equipment are not allowed.
6. Guest count must match the booked number.
7. Extra guests will be charged additionally.
8. Cancellation requires 30 days prior notice.
9. Any damage during the event will be charged to the party.
10. Management decision shall be final.`,
};

export const initialCustomers = customers;
export const initialUsers = users;
