# Quantity-Only Inventory System — Design Spec

**Date:** 2026-09-28  
**Status:** Approved

## Goal

Simplify banquet inventory to quantity-only tracking with three distinct workflows: initial setup, optional physical counts/adjustments, and outside checkout/return. No internal transfers. No in/out for normal in-hall event usage.

## Quantity Buckets

Each item type tracks: **Good**, **Missing**, **Damaged**, **Out** (checked outside).

```
Total owned = Good + Missing + Damaged + Out
```

## Workflows

### 1. Initial Inventory
Staff add item types with quantities. Increases Good bucket.

### 2. Physical Count & Adjustments
- **Full/partial count:** Compare system Good vs actual count; auto-flag missing (or surplus); remarks required on variance.
- **Quick adjustment:** Record N items missing or damaged with remark without full recount.

In-hall event usage requires no transaction.

### 3. Outside Checkout/Return
Issue records: who, item, qty, datetime, purpose, expected return.  
Return reconciles issued vs returned/missing/damaged with remarks. Updates buckets automatically.

## Removed from Staff UI
- Internal transfers
- Event inventory (in-hall)
- Serial-based stock in/out
- Bulk serial add

## Manager Reports
Overview totals, stock count history, missing/damaged log, outside checkout report (open/overdue/completed).
