import { prisma } from '../lib/prisma.js';
import { ApiError } from './bookingService.js';
import { appendAuditLog } from './stateService.js';
import {
  countAvailableQuantity,
  countAvailableSerialized,
} from './inventoryCalculationService.js';

function nowIso(): string {
  return new Date().toISOString();
}

export function newEventLineId(): string {
  return `evl${Date.now()}${Math.random().toString(36).slice(2, 5)}`;
}

export function newEventAssetId(): string {
  return `eva${Date.now()}${Math.random().toString(36).slice(2, 5)}`;
}

export function newInventoryItemTypeId(): string {
  return `ityp${Date.now()}${Math.random().toString(36).slice(2, 5)}`;
}

async function getBookingOrThrow(bookingId: string) {
  const booking = await prisma.booking.findUnique({ where: { id: bookingId } });
  if (!booking) throw new ApiError('Booking not found.', 404);
  return booking;
}

async function getItemTypeOrThrow(itemTypeId: string) {
  const type = await prisma.inventoryItemType.findUnique({ where: { id: itemTypeId } });
  if (!type) throw new ApiError('Inventory item type not found.', 404);
  return type;
}

export async function listEventInventoryLines(bookingId: string) {
  await getBookingOrThrow(bookingId);
  return prisma.eventInventoryLine.findMany({
    where: { bookingId },
    include: {
      itemType: true,
      allocations: { include: { inventoryItem: true } },
    },
    orderBy: { itemName: 'asc' },
  });
}

export async function upsertEventInventoryRequirement(
  input: {
    bookingId: string;
    itemTypeId: string;
    requiredQty: number;
    notes?: string;
  },
  createdBy: string,
) {
  if (input.requiredQty < 1) throw new ApiError('Required quantity must be at least 1.', 400);

  const [booking, itemType] = await Promise.all([
    getBookingOrThrow(input.bookingId),
    getItemTypeOrThrow(input.itemTypeId),
  ]);

  const existing = await prisma.eventInventoryLine.findFirst({
    where: { bookingId: booking.id, itemTypeId: itemType.id },
  });

  const ts = nowIso();

  if (existing) {
    if (input.requiredQty < existing.issuedQty) {
      throw new ApiError(
        `Required quantity cannot be less than already issued (${existing.issuedQty}).`,
        400,
      );
    }
    const line = await prisma.eventInventoryLine.update({
      where: { id: existing.id },
      data: {
        requiredQty: input.requiredQty,
        notes: input.notes?.trim() ?? existing.notes,
        updatedAt: ts,
        status: existing.status === 'RECONCILED' ? 'REQUIRED' : existing.status,
      },
    });
    await appendAuditLog({
      action: 'update',
      entity: 'event_inventory_line',
      entityId: line.id,
      performedBy: createdBy,
      details: `Updated event inventory requirement: ${itemType.name} × ${input.requiredQty} for ${booking.bookingNumber}`,
    });
    return line;
  }

  const line = await prisma.eventInventoryLine.create({
    data: {
      id: newEventLineId(),
      bookingId: booking.id,
      itemTypeId: itemType.id,
      itemName: itemType.name,
      requiredQty: input.requiredQty,
      status: 'REQUIRED',
      notes: input.notes?.trim() || null,
      createdBy,
      createdAt: ts,
      updatedAt: ts,
    },
  });

  await appendAuditLog({
    action: 'create',
    entity: 'event_inventory_line',
    entityId: line.id,
    performedBy: createdBy,
    details: `Added event inventory requirement: ${itemType.name} × ${input.requiredQty} for ${booking.bookingNumber}`,
  });

  return line;
}

export async function reserveEventInventory(
  input: {
    eventLineId: string;
    quantity: number;
    serialNumbers?: string[];
    location?: string;
  },
  createdBy: string,
) {
  const line = await prisma.eventInventoryLine.findUnique({
    where: { id: input.eventLineId },
    include: { itemType: true, booking: true },
  });
  if (!line) throw new ApiError('Event inventory line not found.', 404);

  const remainingToReserve = line.requiredQty - line.reservedQty;
  if (input.quantity > remainingToReserve) {
    throw new ApiError(
      `Cannot reserve ${input.quantity}. Only ${remainingToReserve} more needed (${line.reservedQty} already reserved of ${line.requiredQty} required).`,
      400,
    );
  }

  const ts = nowIso();

  if (line.itemType.serialTracking) {
    const serials = [...new Set((input.serialNumbers ?? []).map((s) => s.trim()).filter(Boolean))];
    if (serials.length !== input.quantity) {
      throw new ApiError('Provide exact serial numbers matching the reserve quantity.', 400);
    }

    const items = await prisma.inventoryItem.findMany({
      where: { serialNumber: { in: serials }, itemTypeId: line.itemTypeId },
    });
    if (items.length !== serials.length) {
      throw new ApiError('One or more serial numbers not found for this item type.', 404);
    }

    for (const item of items) {
      if (item.status !== 'AVAILABLE') {
        throw new ApiError(`${item.serialNumber} is ${item.status}, not available.`, 400);
      }
      if (input.location && item.location !== input.location.trim()) {
        throw new ApiError(`${item.serialNumber} is at ${item.location}, not ${input.location}.`, 400);
      }
      if (item.activeBookingId && item.activeBookingId !== line.bookingId) {
        throw new ApiError(`${item.serialNumber} is already reserved for another event.`, 409);
      }
    }

    const available = await countAvailableSerialized(line.itemTypeId, input.location);
    if (available < input.quantity) {
      throw new ApiError(`Only ${available} unit(s) currently available.`, 400);
    }

    await prisma.$transaction(async (tx) => {
      for (const item of items) {
        await tx.eventInventoryAsset.create({
          data: {
            id: newEventAssetId(),
            eventLineId: line.id,
            inventoryItemId: item.id,
            status: 'RESERVED',
            createdAt: ts,
          },
        });
        await tx.inventoryItem.update({
          where: { id: item.id },
          data: { status: 'RESERVED', activeBookingId: line.bookingId, updatedAt: ts },
        });
      }
      await tx.eventInventoryLine.update({
        where: { id: line.id },
        data: {
          reservedQty: line.reservedQty + input.quantity,
          status: line.reservedQty + input.quantity >= line.requiredQty ? 'RESERVED' : 'REQUIRED',
          updatedAt: ts,
        },
      });
    });
  } else {
    const available = await countAvailableQuantity(line.itemTypeId, input.location);
    if (available < input.quantity) {
      throw new ApiError(`Only ${available} unit(s) currently available.`, 400);
    }

    await prisma.eventInventoryLine.update({
      where: { id: line.id },
      data: {
        reservedQty: line.reservedQty + input.quantity,
        status: line.reservedQty + input.quantity >= line.requiredQty ? 'RESERVED' : 'REQUIRED',
        updatedAt: ts,
      },
    });
  }

  await appendAuditLog({
    action: 'reserve',
    entity: 'event_inventory_line',
    entityId: line.id,
    performedBy: createdBy,
    details: `Reserved ${input.quantity} × ${line.itemName} for ${line.booking.bookingNumber}`,
  });

  return prisma.eventInventoryLine.findUniqueOrThrow({
    where: { id: line.id },
    include: { allocations: { include: { inventoryItem: true } }, itemType: true },
  });
}

export async function issueEventInventory(
  input: {
    eventLineId: string;
    quantity: number;
    serialNumbers?: string[];
    issuedTo: string;
    notes?: string;
  },
  createdBy: string,
) {
  const line = await prisma.eventInventoryLine.findUnique({
    where: { id: input.eventLineId },
    include: { itemType: true, booking: true, allocations: { include: { inventoryItem: true } } },
  });
  if (!line) throw new ApiError('Event inventory line not found.', 404);

  const canIssue = line.reservedQty - line.issuedQty;
  if (input.quantity > canIssue) {
    throw new ApiError(
      `Cannot issue ${input.quantity}. Only ${canIssue} reserved and not yet issued.`,
      400,
    );
  }

  const ts = nowIso();

  if (line.itemType.serialTracking) {
    const serials = [...new Set((input.serialNumbers ?? []).map((s) => s.trim()).filter(Boolean))];
    if (serials.length !== input.quantity) {
      throw new ApiError('Provide exact serial numbers matching issue quantity.', 400);
    }

    const allocations = line.allocations.filter(
      (a) => a.status === 'RESERVED' && serials.includes(a.inventoryItem.serialNumber),
    );
    if (allocations.length !== input.quantity) {
      throw new ApiError('Serial numbers must match reserved assets for this event line.', 400);
    }

    await prisma.$transaction(async (tx) => {
      for (const alloc of allocations) {
        const item = alloc.inventoryItem;
        await tx.inventoryTransaction.create({
          data: {
            id: `itx${Date.now()}${Math.random().toString(36).slice(2, 5)}`,
            inventoryItemId: item.id,
            serialNumber: item.serialNumber,
            action: 'OUT',
            transactionDate: ts,
            fromLocation: item.location,
            toLocation: line.booking.venueName,
            person: input.issuedTo.trim(),
            reason: `Issued to event ${line.booking.bookingNumber}`,
            bookingId: line.bookingId,
            reference: line.id,
            condition: item.condition,
            notes: input.notes?.trim() || null,
            createdBy,
            createdAt: ts,
          },
        });
        await tx.eventInventoryAsset.update({
          where: { id: alloc.id },
          data: { status: 'ISSUED', issuedAt: ts },
        });
        await tx.inventoryItem.update({
          where: { id: item.id },
          data: {
            status: 'OUT',
            location: line.booking.venueName,
            lastKnownLocation: item.location,
            currentHolder: input.issuedTo.trim(),
            activeBookingId: line.bookingId,
            updatedAt: ts,
          },
        });
      }
      await tx.eventInventoryLine.update({
        where: { id: line.id },
        data: {
          issuedQty: line.issuedQty + input.quantity,
          status: 'ISSUED',
          updatedAt: ts,
        },
      });
    });
  } else {
    const balances = await prisma.inventoryStockBalance.findMany({ where: { itemTypeId: line.itemTypeId } });
    const totalStock = balances.reduce((s, b) => s + b.quantity, 0);
    if (totalStock < input.quantity) throw new ApiError('Insufficient stock to issue.', 400);

    await prisma.$transaction(async (tx) => {
      let remaining = input.quantity;
      for (const balance of balances.sort((a, b) => b.quantity - a.quantity)) {
        if (remaining <= 0) break;
        const take = Math.min(balance.quantity, remaining);
        await tx.inventoryStockBalance.update({
          where: { id: balance.id },
          data: { quantity: balance.quantity - take, updatedAt: ts },
        });
        remaining -= take;
      }

      await tx.inventoryQuantityMovement.create({
        data: {
          id: `iqm${Date.now()}${Math.random().toString(36).slice(2, 5)}`,
          itemTypeId: line.itemTypeId,
          action: 'OUT',
          quantity: input.quantity,
          fromLocation: balances[0]?.location ?? 'Storage',
          toLocation: line.booking.venueName,
          bookingId: line.bookingId,
          reason: `Issued to event ${line.booking.bookingNumber}`,
          reference: line.id,
          notes: input.notes?.trim() || null,
          createdBy,
          createdAt: ts,
        },
      });

      await tx.eventInventoryLine.update({
        where: { id: line.id },
        data: {
          issuedQty: line.issuedQty + input.quantity,
          status: 'ISSUED',
          updatedAt: ts,
        },
      });
    });
  }

  await appendAuditLog({
    action: 'issue',
    entity: 'event_inventory_line',
    entityId: line.id,
    performedBy: createdBy,
    details: `Issued ${input.quantity} × ${line.itemName} for ${line.booking.bookingNumber}`,
  });

  return prisma.eventInventoryLine.findUniqueOrThrow({
    where: { id: line.id },
    include: { allocations: { include: { inventoryItem: true } }, itemType: true },
  });
}

export async function returnEventInventory(
  input: {
    eventLineId: string;
    returnedQty: number;
    serialNumbers?: string[];
    toLocation: string;
    returnedBy: string;
    missingQty?: number;
    damagedQty?: number;
    damagedSerials?: string[];
    missingSerials?: string[];
    notes?: string;
  },
  createdBy: string,
) {
  const line = await prisma.eventInventoryLine.findUnique({
    where: { id: input.eventLineId },
    include: { itemType: true, booking: true, allocations: { include: { inventoryItem: true } } },
  });
  if (!line) throw new ApiError('Event inventory line not found.', 404);

  const outstanding = line.issuedQty - line.returnedQty - line.missingQty - line.damagedQty;
  const totalReturn = input.returnedQty + (input.missingQty ?? 0) + (input.damagedQty ?? 0);
  if (totalReturn > outstanding) {
    throw new ApiError(
      `Return total (${totalReturn}) exceeds outstanding issued (${outstanding}).`,
      400,
    );
  }

  const ts = nowIso();
  const toLocation = input.toLocation.trim();

  if (line.itemType.serialTracking) {
    const returnedSerials = [...new Set((input.serialNumbers ?? []).map((s) => s.trim()).filter(Boolean))];
    const missingSerials = [...new Set((input.missingSerials ?? []).map((s) => s.trim()).filter(Boolean))];
    const damagedSerials = [...new Set((input.damagedSerials ?? []).map((s) => s.trim()).filter(Boolean))];

    if (returnedSerials.length !== input.returnedQty) {
      throw new ApiError('Returned serial count must match returnedQty.', 400);
    }
    if (missingSerials.length !== (input.missingQty ?? 0)) {
      throw new ApiError('Missing serial count must match missingQty.', 400);
    }
    if (damagedSerials.length !== (input.damagedQty ?? 0)) {
      throw new ApiError('Damaged serial count must match damagedQty.', 400);
    }

    const allSerials = [...returnedSerials, ...missingSerials, ...damagedSerials];
    const issuedAllocations = line.allocations.filter(
      (a) => a.status === 'ISSUED' && allSerials.includes(a.inventoryItem.serialNumber),
    );
    if (issuedAllocations.length !== allSerials.length) {
      throw new ApiError('All serials must be currently issued for this event.', 400);
    }

    await prisma.$transaction(async (tx) => {
      for (const serial of returnedSerials) {
        const alloc = issuedAllocations.find((a) => a.inventoryItem.serialNumber === serial)!;
        const item = alloc.inventoryItem;
        await tx.inventoryTransaction.create({
          data: {
            id: `itx${Date.now()}${Math.random().toString(36).slice(2, 5)}`,
            inventoryItemId: item.id,
            serialNumber: serial,
            action: 'IN',
            transactionDate: ts,
            fromLocation: item.location,
            toLocation,
            person: input.returnedBy.trim(),
            reason: `Returned from event ${line.booking.bookingNumber}`,
            bookingId: line.bookingId,
            reference: line.id,
            condition: item.condition,
            notes: input.notes?.trim() || null,
            createdBy,
            createdAt: ts,
          },
        });
        await tx.eventInventoryAsset.update({
          where: { id: alloc.id },
          data: { status: 'RETURNED', returnedAt: ts },
        });
        await tx.inventoryItem.update({
          where: { id: item.id },
          data: {
            status: 'AVAILABLE',
            location: toLocation,
            lastKnownLocation: toLocation,
            currentHolder: null,
            activeBookingId: null,
            updatedAt: ts,
          },
        });
      }

      for (const serial of missingSerials) {
        const alloc = issuedAllocations.find((a) => a.inventoryItem.serialNumber === serial)!;
        const item = alloc.inventoryItem;
        await tx.inventoryTransaction.create({
          data: {
            id: `itx${Date.now()}${Math.random().toString(36).slice(2, 5)}`,
            inventoryItemId: item.id,
            serialNumber: serial,
            action: 'MARK_MISSING',
            transactionDate: ts,
            fromLocation: item.location,
            toLocation: 'Missing',
            person: input.returnedBy.trim(),
            reason: `Missing after event ${line.booking.bookingNumber}`,
            bookingId: line.bookingId,
            reference: line.id,
            notes: input.notes?.trim() || null,
            createdBy,
            createdAt: ts,
          },
        });
        await tx.eventInventoryAsset.update({
          where: { id: alloc.id },
          data: { status: 'MISSING', returnedAt: ts },
        });
        await tx.inventoryItem.update({
          where: { id: item.id },
          data: {
            status: 'MISSING',
            location: 'Missing',
            lastKnownLocation: item.location,
            currentHolder: null,
            activeBookingId: line.bookingId,
            updatedAt: ts,
          },
        });
      }

      for (const serial of damagedSerials) {
        const alloc = issuedAllocations.find((a) => a.inventoryItem.serialNumber === serial)!;
        const item = alloc.inventoryItem;
        await tx.inventoryTransaction.create({
          data: {
            id: `itx${Date.now()}${Math.random().toString(36).slice(2, 5)}`,
            inventoryItemId: item.id,
            serialNumber: serial,
            action: 'MARK_DAMAGED',
            transactionDate: ts,
            fromLocation: item.location,
            toLocation: 'Damaged',
            person: input.returnedBy.trim(),
            reason: `Damaged after event ${line.booking.bookingNumber}`,
            bookingId: line.bookingId,
            reference: line.id,
            condition: 'Damaged',
            notes: input.notes?.trim() || null,
            createdBy,
            createdAt: ts,
          },
        });
        await tx.eventInventoryAsset.update({
          where: { id: alloc.id },
          data: { status: 'DAMAGED', returnedAt: ts },
        });
        await tx.inventoryItem.update({
          where: { id: item.id },
          data: {
            status: 'DAMAGED',
            location: 'Damaged',
            condition: 'Damaged',
            lastKnownLocation: item.location,
            currentHolder: null,
            activeBookingId: null,
            updatedAt: ts,
          },
        });
      }

      const newReturned = line.returnedQty + input.returnedQty;
      const newMissing = line.missingQty + (input.missingQty ?? 0);
      const newDamaged = line.damagedQty + (input.damagedQty ?? 0);
      const reconciled = newReturned + newMissing + newDamaged >= line.issuedQty;

      await tx.eventInventoryLine.update({
        where: { id: line.id },
        data: {
          returnedQty: newReturned,
          missingQty: newMissing,
          damagedQty: newDamaged,
          status: reconciled ? 'RECONCILED' : 'RETURNED',
          updatedAt: ts,
        },
      });
    });
  } else {
    await prisma.$transaction(async (tx) => {
      const balance = await tx.inventoryStockBalance.findFirst({
        where: { itemTypeId: line.itemTypeId, location: toLocation },
      });
      if (balance) {
        await tx.inventoryStockBalance.update({
          where: { id: balance.id },
          data: { quantity: balance.quantity + input.returnedQty, updatedAt: ts },
        });
      } else {
        await tx.inventoryStockBalance.create({
          data: {
            id: `isb${Date.now()}${Math.random().toString(36).slice(2, 5)}`,
            itemTypeId: line.itemTypeId,
            location: toLocation,
            quantity: input.returnedQty,
            updatedAt: ts,
          },
        });
      }

      if (input.returnedQty > 0) {
        await tx.inventoryQuantityMovement.create({
          data: {
            id: `iqm${Date.now()}${Math.random().toString(36).slice(2, 5)}`,
            itemTypeId: line.itemTypeId,
            action: 'IN',
            quantity: input.returnedQty,
            fromLocation: line.booking.venueName,
            toLocation,
            bookingId: line.bookingId,
            reason: `Returned from event ${line.booking.bookingNumber}`,
            reference: line.id,
            notes: input.notes?.trim() || null,
            createdBy,
            createdAt: ts,
          },
        });
      }

      const newReturned = line.returnedQty + input.returnedQty;
      const newMissing = line.missingQty + (input.missingQty ?? 0);
      const newDamaged = line.damagedQty + (input.damagedQty ?? 0);
      const reconciled = newReturned + newMissing + newDamaged >= line.issuedQty;

      await tx.eventInventoryLine.update({
        where: { id: line.id },
        data: {
          returnedQty: newReturned,
          missingQty: newMissing,
          damagedQty: newDamaged,
          status: reconciled ? 'RECONCILED' : 'RETURNED',
          updatedAt: ts,
        },
      });
    });
  }

  await appendAuditLog({
    action: 'return',
    entity: 'event_inventory_line',
    entityId: line.id,
    performedBy: createdBy,
    details: `Returned/reconciled inventory for ${line.booking.bookingNumber}: ${input.returnedQty} returned, ${input.missingQty ?? 0} missing, ${input.damagedQty ?? 0} damaged`,
  });

  return prisma.eventInventoryLine.findUniqueOrThrow({
    where: { id: line.id },
    include: { allocations: { include: { inventoryItem: true } }, itemType: true },
  });
}

export async function getEventInventoryReport(bookingId?: string) {
  const where = bookingId ? { bookingId } : undefined;
  const lines = await prisma.eventInventoryLine.findMany({
    where,
    include: { booking: true, itemType: true, allocations: { include: { inventoryItem: true } } },
    orderBy: { updatedAt: 'desc' },
  });

  return lines.map((line) => ({
    bookingId: line.bookingId,
    bookingNumber: line.booking.bookingNumber,
    functionDate: line.booking.functionDate,
    venueName: line.booking.venueName,
    itemName: line.itemName,
    requiredQty: line.requiredQty,
    reservedQty: line.reservedQty,
    issuedQty: line.issuedQty,
    returnedQty: line.returnedQty,
    missingQty: line.missingQty,
    damagedQty: line.damagedQty,
    status: line.status,
    discrepancy: line.issuedQty - line.returnedQty - line.missingQty - line.damagedQty,
    serials: line.allocations.map((a) => ({
      serialNumber: a.inventoryItem.serialNumber,
      status: a.status,
    })),
  }));
}
