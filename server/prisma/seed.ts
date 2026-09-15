import { PrismaClient } from '@prisma/client';
import { HALLS } from '../src/lib/venueConfig.js';

const prisma = new PrismaClient();

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const getDayName = (d: string) => DAYS[new Date(`${d}T12:00:00`).getDay()];
const demoToday = new Date().toISOString().split('T')[0];

async function main() {
  await prisma.auditLogRecord.deleteMany();
  await prisma.notificationRecord.deleteMany();
  await prisma.approvalRecord.deleteMany();
  await prisma.receiptRecord.deleteMany();
  await prisma.paymentRecord.deleteMany();
  await prisma.eventExpenseRecord.deleteMany();
  await prisma.bookingLineItem.deleteMany();
  await prisma.booking.deleteMany();
  await prisma.expenseRecord.deleteMany();
  await prisma.customer.deleteMany();
  await prisma.user.deleteMany();
  await prisma.venue.deleteMany();
  await prisma.service.deleteMany();
  await prisma.systemSettingsRecord.deleteMany();

  await prisma.user.createMany({
    data: [
      { id: 'u1', name: 'Ahmed Khan', email: 'ahmed@shayanbanquet.pk', role: 'booking_office', phone: '0300-1234567', isActive: true, createdAt: '2026-01-15' },
      { id: 'u2', name: 'Ali Hassan', email: 'ali@shayanbanquet.pk', role: 'manager', phone: '0321-9876543', isActive: true, createdAt: '2026-01-10' },
      { id: 'u3', name: 'Admin', email: 'admin@shayanbanquet.pk', role: 'super_admin', isActive: true, createdAt: '2025-12-01' },
      { id: 'u4', name: 'Sara Bibi', email: 'sara@shayanbanquet.pk', role: 'booking_office', phone: '0333-1112233', isActive: true, createdAt: '2026-03-01' },
    ],
  });

  const hallMeta: Record<string, { capacity: number; basePrice: number; location: string; description: string }> = {
    'va-red': { capacity: 200, basePrice: 50000, location: 'Hall A — Red Section', description: 'Hall A Red section.' },
    'va-gold': { capacity: 250, basePrice: 55000, location: 'Hall A — Gold Section', description: 'Hall A Gold section.' },
    'va-full': { capacity: 300, basePrice: 60000, location: 'Hall A — Full', description: 'Complete Hall A.' },
    vb1: { capacity: 350, basePrice: 65000, location: 'Hall B — Section 1', description: 'Hall B Section 1.' },
    vb2: { capacity: 400, basePrice: 70000, location: 'Hall B — Section 2', description: 'Hall B Section 2.' },
    'vb-full': { capacity: 500, basePrice: 80000, location: 'Hall B — Full', description: 'Complete Hall B.' },
    'vc-silver': { capacity: 350, basePrice: 65000, location: 'Hall C — Silver Section', description: 'Hall C Silver.' },
    'vc-diamond': { capacity: 400, basePrice: 75000, location: 'Hall C — Diamond Section', description: 'Hall C Diamond.' },
    'vc-full': { capacity: 450, basePrice: 85000, location: 'Hall C — Full', description: 'Complete Hall C.' },
  };

  await prisma.venue.createMany({
    data: HALLS.map((h) => ({
      id: h.id,
      name: h.name,
      type: 'hall',
      capacity: hallMeta[h.id].capacity,
      location: hallMeta[h.id].location,
      description: hallMeta[h.id].description,
      basePrice: hallMeta[h.id].basePrice,
      status: 'active',
      imageUrl: 'https://images.unsplash.com/photo-1505236858219-8359eb29e329?w=800&q=80',
      hallGroup: h.group,
    })),
  });

  await prisma.customer.createMany({
    data: [
      { id: 'c1', name: 'Muhammad Aslam', fatherHusbandName: 'Abdul Rashid', cnic: '42101-1234567-1', phone: '0312-4567890', whatsapp: '0312-4567890', address: 'Block 14, Gulistan-e-Jauhar, Karachi', email: 'aslam@email.com', createdAt: '2026-06-10' },
      { id: 'c2', name: 'Fatima Noor', phone: '0345-6789012', whatsapp: '0345-6789012', address: 'DHA Phase 5, Karachi', createdAt: '2026-07-01' },
      { id: 'c3', name: 'Rizwan Ahmed', fatherHusbandName: 'Nadeem Ahmed', cnic: '42201-9876543-2', phone: '0300-1112233', address: 'North Nazimabad, Block H, Karachi', createdAt: '2026-07-15' },
      { id: 'c4', name: 'Ayesha Siddiqui', phone: '0321-4445566', address: 'Clifton Block 8, Karachi', email: 'ayesha.s@email.com', createdAt: '2026-08-01' },
      { id: 'c5', name: 'Kamran Malik', fatherHusbandName: 'Tariq Malik', phone: '0333-7778899', address: 'Malir Cantt, Karachi', createdAt: '2026-08-05' },
      { id: 'c6', name: 'Hina Pervez', phone: '0347-2223344', whatsapp: '0347-2223344', address: 'Gulshan-e-Iqbal Block 13, Karachi', createdAt: '2026-08-10' },
      { id: 'c7', name: 'Zafar Iqbal', phone: '0311-5556677', address: 'Korangi, Karachi', createdAt: '2026-08-22' },
    ],
  });

  const bookings = [
    { id: 'b1', bookingNumber: 'SB-1001', serialNumber: 1, bookingDate: '2026-08-01', customerId: 'c1', venueId: 'va-full', venueName: 'A Full', functionDate: '2026-09-15', programme: 'Wedding', numberOfGuests: 800, subtotal: 415000, discount: 15000, grandTotal: 400000, advancePaid: 200000, remainingBalance: 200000, status: 'confirmed', paymentStatus: 'partially_paid', createdBy: 'Ahmed Khan', createdAt: '2026-08-01T10:30:00', updatedAt: '2026-08-01T10:30:00' },
    { id: 'b2', bookingNumber: 'SB-1002', serialNumber: 2, bookingDate: '2026-08-05', customerId: 'c2', venueId: 'vc-full', venueName: 'C Full', functionDate: '2026-09-20', programme: 'Mehndi', numberOfGuests: 600, subtotal: 225000, discount: 0, grandTotal: 225000, advancePaid: 100000, remainingBalance: 125000, status: 'confirmed', paymentStatus: 'partially_paid', createdBy: 'Ahmed Khan', createdAt: '2026-08-05T14:00:00', updatedAt: '2026-08-05T14:00:00' },
    { id: 'b3', bookingNumber: 'SB-1003', serialNumber: 3, bookingDate: '2026-08-10', customerId: 'c3', venueId: 'vb-full', venueName: 'B Full', functionDate: '2026-10-05', programme: 'Valima', numberOfGuests: 500, subtotal: 775000, discount: 25000, grandTotal: 750000, advancePaid: 300000, remainingBalance: 450000, status: 'pending_review', paymentStatus: 'partially_paid', createdBy: 'Sara Bibi', createdAt: '2026-08-10T11:00:00', updatedAt: '2026-08-10T11:00:00' },
    { id: 'b4', bookingNumber: 'SB-1004', serialNumber: 4, bookingDate: '2026-08-15', customerId: 'c4', venueId: 'va-red', venueName: 'A Red', functionDate: '2026-08-24', programme: 'Birthday Party', numberOfGuests: 150, subtotal: 82500, discount: 0, grandTotal: 82500, advancePaid: 82500, remainingBalance: 0, status: 'confirmed', paymentStatus: 'paid', createdBy: 'Ahmed Khan', createdAt: '2026-08-15T09:00:00', updatedAt: '2026-08-15T09:00:00' },
    { id: 'b5', bookingNumber: 'SB-1005', serialNumber: 5, bookingDate: '2026-08-18', customerId: 'c5', venueId: 'vb-full', venueName: 'B Full', functionDate: '2026-08-25', programme: 'Wedding', numberOfGuests: 1200, subtotal: 305000, discount: 5000, grandTotal: 300000, advancePaid: 150000, remainingBalance: 150000, status: 'confirmed', paymentStatus: 'partially_paid', createdBy: 'Ahmed Khan', createdAt: '2026-08-18T16:30:00', updatedAt: '2026-08-18T16:30:00' },
    { id: 'b6', bookingNumber: 'SB-1006', serialNumber: 6, bookingDate: '2026-08-20', customerId: 'c6', venueId: 'vb1', venueName: 'B1', functionDate: '2026-09-01', programme: 'Corporate Event', numberOfGuests: 250, subtotal: 115000, discount: 0, grandTotal: 115000, advancePaid: 50000, remainingBalance: 65000, status: 'tentative', paymentStatus: 'partially_paid', createdBy: 'Sara Bibi', createdAt: '2026-08-20T10:00:00', updatedAt: '2026-08-20T10:00:00' },
    { id: 'b7', bookingNumber: 'SB-1007', serialNumber: 7, bookingDate: '2026-08-22', customerId: 'c7', venueId: 'va-gold', venueName: 'A Gold', functionDate: '2026-11-10', programme: 'Engagement', numberOfGuests: 400, subtotal: 175000, discount: 0, grandTotal: 175000, advancePaid: 0, remainingBalance: 175000, status: 'inquiry', paymentStatus: 'pending', createdBy: 'Ahmed Khan', createdAt: '2026-08-22T12:00:00', updatedAt: '2026-08-22T12:00:00' },
    { id: 'b8', bookingNumber: 'SB-1008', serialNumber: 8, bookingDate: demoToday, customerId: 'c2', venueId: 'vc-silver', venueName: 'C Silver', functionDate: demoToday, programme: 'Wedding', numberOfGuests: 350, subtotal: 180000, discount: 0, grandTotal: 180000, advancePaid: 80000, remainingBalance: 100000, status: 'confirmed', paymentStatus: 'partially_paid', createdBy: 'Ahmed Khan', specialInstructions: 'Demo event — use Event Day workspace', createdAt: `${demoToday}T09:00:00`, updatedAt: `${demoToday}T09:00:00` },
  ];

  for (const b of bookings) {
    await prisma.booking.create({
      data: {
        ...b,
        functionDay: getDayName(b.functionDate),
        taxAmount: 0,
      },
    });
  }

  const lineItems = [
    { bookingId: 'b1', serviceId: 's1', serviceName: 'Booking Charges', quantity: 1, unitPrice: 150000, total: 150000 },
    { bookingId: 'b1', serviceId: 's2', serviceName: 'Sound System', quantity: 1, unitPrice: 25000, total: 25000 },
    { bookingId: 'b4', serviceId: 's1', serviceName: 'Booking Charges', quantity: 1, unitPrice: 60000, total: 60000 },
    { bookingId: 'b4', serviceId: 's4', serviceName: 'Cold Drinks', quantity: 150, unitPrice: 150, total: 22500 },
    { bookingId: 'b7', serviceId: 's1', serviceName: 'Booking Charges', quantity: 1, unitPrice: 150000, total: 150000 },
    { bookingId: 'b7', serviceId: 's2', serviceName: 'Sound System', quantity: 1, unitPrice: 25000, total: 25000 },
    { bookingId: 'b8', serviceId: 's1', serviceName: 'Booking Charges', quantity: 1, unitPrice: 120000, total: 120000 },
    { bookingId: 'b8', serviceId: 's2', serviceName: 'Sound System', quantity: 1, unitPrice: 25000, total: 25000 },
    { bookingId: 'b8', serviceId: 's7', serviceName: 'Decoration', quantity: 1, unitPrice: 35000, total: 35000 },
  ];
  for (const item of lineItems) {
    await prisma.bookingLineItem.create({ data: item });
  }

  await prisma.paymentRecord.createMany({
    data: [
      { id: 'p1', bookingId: 'b1', bookingNumber: 'SB-1001', amount: 100000, method: 'cash', paymentDate: '2026-08-01', receivedBy: 'Ahmed Khan', customerName: 'Muhammad Aslam' },
      { id: 'p2', bookingId: 'b1', bookingNumber: 'SB-1001', amount: 100000, method: 'bank_transfer', paymentDate: '2026-08-10', receivedBy: 'Ahmed Khan', transactionRef: 'HBL-78654', customerName: 'Muhammad Aslam' },
      { id: 'p3', bookingId: 'b2', bookingNumber: 'SB-1002', amount: 100000, method: 'jazzcash', paymentDate: '2026-08-05', receivedBy: 'Ahmed Khan', transactionRef: 'JC-445566', customerName: 'Fatima Noor' },
      { id: 'p4', bookingId: 'b3', bookingNumber: 'SB-1003', amount: 300000, method: 'cash', paymentDate: '2026-08-10', receivedBy: 'Sara Bibi', customerName: 'Rizwan Ahmed' },
      { id: 'p5', bookingId: 'b4', bookingNumber: 'SB-1004', amount: 82500, method: 'cash', paymentDate: '2026-08-15', receivedBy: 'Ahmed Khan', customerName: 'Ayesha Siddiqui' },
      { id: 'p6', bookingId: 'b5', bookingNumber: 'SB-1005', amount: 150000, method: 'bank_transfer', paymentDate: '2026-08-18', receivedBy: 'Ahmed Khan', transactionRef: 'MCB-99001', customerName: 'Kamran Malik' },
      { id: 'p7', bookingId: 'b6', bookingNumber: 'SB-1006', amount: 50000, method: 'easypaisa', paymentDate: '2026-08-20', receivedBy: 'Sara Bibi', transactionRef: 'EP-112233', customerName: 'Hina Pervez' },
      { id: 'p8', bookingId: 'b8', bookingNumber: 'SB-1008', amount: 80000, method: 'cash', paymentDate: demoToday, receivedBy: 'Ahmed Khan', customerName: 'Fatima Noor' },
    ],
  });

  await prisma.receiptRecord.createMany({
    data: [
      { id: 'r1', receiptNumber: 'RCP-1001', bookingId: 'b1', bookingNumber: 'SB-1001', customerName: 'Muhammad Aslam', functionDate: '2026-09-15', venueName: 'A Full', amount: 100000, previousBalance: 400000, newBalance: 300000, method: 'cash', paymentDate: '2026-08-01', receivedBy: 'Ahmed Khan', createdAt: '2026-08-01T10:32:00' },
      { id: 'r2', receiptNumber: 'RCP-1002', bookingId: 'b1', bookingNumber: 'SB-1001', customerName: 'Muhammad Aslam', functionDate: '2026-09-15', venueName: 'A Full', amount: 100000, previousBalance: 300000, newBalance: 200000, method: 'bank_transfer', paymentDate: '2026-08-10', receivedBy: 'Ahmed Khan', createdAt: '2026-08-10T15:00:00' },
      { id: 'r3', receiptNumber: 'RCP-1003', bookingId: 'b4', bookingNumber: 'SB-1004', customerName: 'Ayesha Siddiqui', functionDate: '2026-08-24', venueName: 'A Red', amount: 82500, previousBalance: 82500, newBalance: 0, method: 'cash', paymentDate: '2026-08-15', receivedBy: 'Ahmed Khan', createdAt: '2026-08-15T09:05:00' },
    ],
  });

  await prisma.eventExpenseRecord.createMany({
    data: [
      { id: 'ee1', bookingId: 'b4', category: 'Decoration', amount: 12000, description: 'Fresh flowers', addedBy: 'Ahmed Khan', addedAt: '2026-08-24T10:00:00' },
      { id: 'ee2', bookingId: 'b4', category: 'Staff', amount: 3000, description: 'Extra wait staff', addedBy: 'Ahmed Khan', addedAt: '2026-08-24T11:30:00' },
    ],
  });

  await prisma.expenseRecord.createMany({
    data: [
      { id: 'e1', category: 'Electricity', amount: 85000, date: '2026-08-01', description: 'August electricity bill', method: 'bank_transfer', addedBy: 'Ali Hassan', approvalStatus: 'approved' },
      { id: 'e5', category: 'Maintenance', amount: 60000, date: '2026-08-15', description: 'AC repair + plumbing', method: 'cash', addedBy: 'Ali Hassan', approvalStatus: 'pending' },
    ],
  });

  await prisma.approvalRecord.createMany({
    data: [
      { id: 'ap1', entityType: 'Booking', entityId: 'SB-1003', requestType: 'discount', requestedBy: 'Sara Bibi', status: 'pending', reason: 'Discount exceeds threshold', createdAt: '2026-08-10T11:05:00', details: 'SB-1003 — Rizwan Ahmed' },
      { id: 'ap2', entityType: 'Expense', entityId: 'e5', requestType: 'expense', requestedBy: 'Ali Hassan', status: 'pending', reason: 'Expense above threshold', createdAt: '2026-08-15T14:00:00', details: 'Maintenance — Rs. 60,000' },
    ],
  });

  await prisma.notificationRecord.createMany({
    data: [
      { id: 'n1', title: 'New Booking Inquiry', message: 'Zafar Iqbal submitted inquiry.', type: 'info', isRead: false, createdAt: '2026-08-22T12:00:00', link: '/office/bookings/b7' },
      { id: 'n4', title: 'Pending Approval', message: 'Booking SB-1003 requires approval.', type: 'warning', isRead: false, createdAt: '2026-08-10T11:05:00' },
      { id: 'n6', title: "Today's Event", message: `Fatima Noor's Wedding at C Silver today (SB-1008).`, type: 'info', isRead: false, createdAt: `${demoToday}T08:00:00`, link: '/office/event-day/b8' },
    ],
  });

  await prisma.auditLogRecord.createMany({
    data: [
      { id: 'a1', action: 'Created', entity: 'Booking', entityId: 'SB-1001', performedBy: 'Ahmed Khan', details: 'New booking created', timestamp: '2026-08-01T10:30:00' },
    ],
  });

  await prisma.systemSettingsRecord.create({
    data: {
      id: 1,
      discountApprovalThresholdPercent: 5,
      blockingStatusesJson: JSON.stringify(['confirmed', 'hold', 'tentative', 'cancellation_requested']),
      companyName: 'SHAYAN BANQUET / LAWN',
      companyPhone: '0300-2033224',
      companyEmail: 'info@shayanbanquet.pk',
      companyAddress: 'PAF Plot # 2, Shaheed-e-Millat Flyover, Baloch Colony, Karachi-75350',
      termsAndConditions: 'Advance payment is required to confirm the booking.',
    },
  });

  console.log('Database seeded successfully.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
