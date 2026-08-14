# Oshap — Data Model

> **This file no longer defines the schema.** It used to hold a hand-maintained
> copy of the SQLModel entities, and that copy silently went stale — it was
> missing `staff_members`, `bank_accounts`, `restaurant_groups` and the
> `stock_count` / `low_stock_threshold` inventory fields, all of which the
> running backend has had for some time. `docs/ddl.sql` had the same problem and
> has been deleted.
>
> Duplicating a schema across repos guarantees drift. This page is now a
> signpost, not a source.

## Where the schema actually lives

| What | Where |
|---|---|
| **Entity definitions** | `app/connections/models.py` in [`Oshaphq/Oshap-backend`](https://github.com/Bizsavvy/Oshap-backend) — SQLModel classes, the single source of truth |
| **Schema history** | `migrations/versions/` in the same repo (Alembic) |
| **API request/response shapes** | [`openapi.yaml`](openapi.yaml) — the contract between the repos |
| **TypeScript mirrors of those shapes** | [`packages/shared/src/types/index.ts`](../packages/shared/src/types/index.ts) |

To create or update the database, generate an Alembic revision from the models.
Do not write DDL by hand, and do not reintroduce a checked-in `.sql` baseline —
that is exactly what went stale.

## Entities, for orientation

Names only. Columns live in the models, deliberately.

**Tenancy** — `RestaurantGroup`, `Restaurant`, `BankAccount`, `RestaurantTable`, `StaffMember`

**Catalogue** — `MenuItem`, `MenuItemMedia`

**Trading** — `TableSession`, `Order`, `OrderItem`, `Payment`

**Devices and events** — `RegisteredDevice` (admin FCM), `CustomerDevice`, `WaiterCallEvent`

Lifecycles (order status, payment status, session status) are documented in
[`PRD.md §10`](../PRD.md#10-data-model--lifecycles) and enforced by the enums in
`models.py`.

## Seed data for local development

The frontend's mock API carries a complete, current demo dataset — one
restaurant, an owner login, 13 tables, 17 menu items with realistic stock
levels, and an active bank account. It is exercised by the test suite, so unlike
the old DDL seed block it cannot quietly rot.

Mirror it when seeding a local database:
[`packages/shared/src/api/mock.ts`](../packages/shared/src/api/mock.ts) (search
for `SEED_MENU` and `_restaurant`).

Matching it matters for more than convenience — [`smoke-test.md`](smoke-test.md)
assumes these tables and items exist.

## Known divergences

Tracked in [`integration-reconciliation.md`](integration-reconciliation.md).
Anything the backend models and `openapi.yaml` disagree on belongs there, not
here.
