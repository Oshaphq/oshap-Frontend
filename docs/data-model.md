# Oshap — Data Model

SQLModel (SQLAlchemy + Pydantic) entity reference for the FastAPI backend.
This document mirrors the PostgreSQL schema in `docs/ddl.sql`.

---

## Enums

```python
import enum

class OrderStatus(str, enum.Enum):
    CREATED = "CREATED"               # order placed, visible in kitchen
    PREPARING = "PREPARING"           # kitchen started cooking
    READY = "READY"                   # kitchen finished
    PAYMENT_PENDING = "PAYMENT_PENDING"  # customer claimed payment
    CONFIRMED = "CONFIRMED"           # admin verified / paid
    CANCELLED = "CANCELLED"           # admin force-closed (abandoned)

class PaymentStatus(str, enum.Enum):
    NOT_PAID = "NOT_PAID"          # no payment attempt
    CLAIMED = "CLAIMED"             # customer submitted payment proof
    CONFIRMED = "CONFIRMED"         # order flow auto-confirm
    VERIFIED = "VERIFIED"           # admin manually verified

class TableStatus(str, enum.Enum):
    OPEN = "OPEN"
    CLOSED = "CLOSED"

class SessionStatus(str, enum.Enum):
    ACTIVE = "ACTIVE"
    CLOSED = "CLOSED"

class CloseReason(str, enum.Enum):
    paid = "paid"
    abandoned = "abandoned"
```

---

## Entities

### Restaurant
```python
from sqlmodel import SQLModel, Field
from uuid import UUID, uuid4
from datetime import datetime

class Restaurant(SQLModel, table=True):
    __tablename__ = "restaurants"

    id: UUID = Field(default_factory=uuid4, primary_key=True)
    name: str
    bank_name: str | None = None
    account_number: str | None = None
    account_name: str | None = None
    whatsapp_number: str | None = None
    logo_url: str | None = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
```

### Table
```python
class Table(SQLModel, table=True):
    __tablename__ = "tables"

    id: str = Field(primary_key=True)  # e.g. "T1", "T12", "T-G37"
    restaurant_id: UUID = Field(foreign_key="restaurants.id", ondelete="CASCADE")
    status: TableStatus = Field(default=TableStatus.OPEN)
    created_at: datetime = Field(default_factory=datetime.utcnow)

    # Relationships
    restaurant: Restaurant = Relationship()
    orders: list["Order"] = Relationship(back_populates="table")
    sessions: list["TableSession"] = Relationship(back_populates="table")

    # Index: ix_tables_restaurant ON restaurant_id
```

### MenuItem
```python
class MenuItem(SQLModel, table=True):
    __tablename__ = "menu_items"

    id: UUID = Field(default_factory=uuid4, primary_key=True)
    restaurant_id: UUID = Field(foreign_key="restaurants.id", ondelete="CASCADE")
    name: str
    price: int                     # Naira (integer amounts)
    category: str                  # e.g. "Meals", "Grills", "Drinks", "Sides"
    description: str | None = None
    image_url: str | None = None
    available: bool = True
    sort_order: int = 0
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    # Relationships
    restaurant: Restaurant = Relationship()

    # Indexes:
    #   ix_menu_items_restaurant ON restaurant_id
    #   ix_menu_items_category ON (restaurant_id, category)
```

### Order
```python
class Order(SQLModel, table=True):
    __tablename__ = "orders"

    id: UUID = Field(default_factory=uuid4, primary_key=True)
    table_id: str = Field(foreign_key="tables.id")
    restaurant_id: UUID = Field(foreign_key="restaurants.id", ondelete="CASCADE")
    status: OrderStatus = Field(default=OrderStatus.CREATED)
    total: int = 0                 # Naira
    reference: str                 # unique, e.g. "OSHAP-T1-4829"
    session_id: UUID | None = Field(
        foreign_key="table_sessions.id",
        ondelete="SET NULL",       # deleting a session does NOT cascade to orders
        default=None
    )
    customer_name: str | None = None
    device_token: str | None = None  # anonymous device UUID per browser tab
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    # Relationships
    table: Table = Relationship(back_populates="orders")
    restaurant: Restaurant = Relationship()
    session: TableSession | None = Relationship(back_populates="orders")
    order_items: list["OrderItem"] = Relationship(back_populates="order", cascade_delete=True)
    payments: list["Payment"] = Relationship(back_populates="order")

    # Indexes:
    #   ix_orders_table ON table_id
    #   ix_orders_restaurant ON restaurant_id
    #   ix_orders_reference ON reference (unique)
    #   ix_orders_device_token ON (table_id, device_token)
```

### OrderItem
```python
class OrderItem(SQLModel, table=True):
    __tablename__ = "order_items"

    id: UUID = Field(default_factory=uuid4, primary_key=True)
    order_id: UUID = Field(foreign_key="orders.id", ondelete="CASCADE")
    name: str                      # denormalized menu item name
    quantity: int = 1
    price: int                     # Naira (unit price at time of order)

    # Relationships
    order: Order = Relationship(back_populates="order_items")

    # Index: ix_order_items_order ON order_id
```

### Payment
```python
class Payment(SQLModel, table=True):
    __tablename__ = "payments"

    id: UUID = Field(default_factory=uuid4, primary_key=True)
    order_id: UUID = Field(
        foreign_key="orders.id",
        ondelete="CASCADE",
        unique=True                  # ONE payment per order (upsert on conflict)
    )
    amount: int                      # Naira
    status: PaymentStatus = Field(default=PaymentStatus.NOT_PAID)
    proof_url: str | None = None     # screenshot / transfer receipt
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    # Relationships
    order: Order = Relationship(back_populates="payments")

    # Index: ix_payments_order ON order_id (unique)
```

### TableSession
```python
class TableSession(SQLModel, table=True):
    __tablename__ = "table_sessions"

    id: UUID = Field(default_factory=uuid4, primary_key=True)
    table_id: str = Field(foreign_key="tables.id")
    pin: str                       # 4-digit PIN for group join
    status: SessionStatus = Field(default=SessionStatus.ACTIVE)
    created_at: datetime = Field(default_factory=datetime.utcnow)

    # Relationships
    table: Table = Relationship(back_populates="sessions")
    orders: list["Order"] = Relationship(back_populates="session")
```

### DeviceToken (FCM)
```python
class DeviceToken(SQLModel, table=True):
    __tablename__ = "device_tokens"

    id: UUID = Field(default_factory=uuid4, primary_key=True)
    restaurant_id: UUID = Field(foreign_key="restaurants.id", ondelete="CASCADE")
    fcm_token: str                 # Firebase Cloud Messaging token
    device_label: str | None = None
    created_at: datetime = Field(default_factory=datetime.utcnow)

    # Relationships
    restaurant: Restaurant = Relationship()

    # Index: ix_device_tokens_restaurant ON restaurant_id
```

---

## Relationship Summary

```
Restaurant 1──N Table
Restaurant 1──N MenuItem
Restaurant 1──N Order
Restaurant 1──N DeviceToken

Table      1──N Order
Table      1──N TableSession

Order      1──N OrderItem   (CASCADE delete)
Order      1──1 Payment     (unique order_id)
Order      N──1 TableSession (SET NULL on session delete)

TableSession 1──N Order     (SET NULL on session delete)
```

---

## Status Lifecycle

### Order lifecycle
```
CREATED ──(kitchen "Start")──► PREPARING ──(kitchen "Ready")──► READY
   │                                                               │
   │  (customer claims payment)                                    │
   └──────────────► PAYMENT_PENDING ◄──────────────────────────────┘
                         │
              ┌──────────┼──────────┐
              │ (admin verify)       │ (admin close abandoned)
              ▼                      ▼
          CONFIRMED              CANCELLED
```

### Payment lifecycle
```
NOT_PAID ──(customer claims)──► CLAIMED ──(order confirm)──► CONFIRMED
                                                       OR
                                  ──► VERIFIED (admin manual verify)
```

### Table lifecycle
```
OPEN ──► (all orders paid/cancelled; no active sessions) ──► effectively clean (status stays OPEN, sessions deleted)
```

---

## Key Design Decisions

1. **Prices are integers (Naira).** No decimals, no floats. `2500` = N2,500.
2. **Device scoping.** Pre-session orders scoped by `device_token` (UUID per browser tab). Joining a session migrates unclaimed orders.
3. **Session delete is non-destructive.** `ON DELETE SET NULL` preserves order history even when sessions are cleaned up.
4. **Payment upsert.** One payment per order (`unique order_id`). Payment upload uses upsert to handle re-submissions.
5. **Table status is stable.** Tables stay `OPEN` unless explicitly closed by admin. Cleaning a table deletes sessions but doesn't change table status.
6. **Order references are unique.** Format: `OSHAP-{tableId}-{4-digit random}`.
