-- ============================================================================
-- Oshap — PostgreSQL 15 Schema
-- Consolidated from scripts/001-005 + supabase_migration.sql
-- Use this as the Alembic baseline for the FastAPI backend.
-- ============================================================================

-- ============================================================================
-- 1. EXTENSIONS
-- ============================================================================
CREATE EXTENSION IF NOT EXISTS "pgcrypto";   -- for gen_random_uuid()

-- ============================================================================
-- 2. RESTAURANTS
-- ============================================================================
CREATE TABLE restaurants (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name          TEXT NOT NULL,
    bank_name     TEXT,
    account_number TEXT,
    account_name  TEXT,
    whatsapp_number TEXT,
    logo_url      TEXT,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================================
-- 3. TABLES
-- ============================================================================
CREATE TABLE tables (
    id            TEXT PRIMARY KEY,  -- e.g. "T1", "T12", "T-G37"
    restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
    status        TEXT NOT NULL DEFAULT 'OPEN' CHECK (status IN ('OPEN', 'CLOSED')),
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================================
-- 4. TABLE SESSIONS
-- ============================================================================
CREATE TABLE table_sessions (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    table_id      TEXT NOT NULL REFERENCES tables(id),
    pin           TEXT NOT NULL,  -- 4-digit PIN for group join
    status        TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'CLOSED')),
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================================
-- 5. MENU ITEMS
-- ============================================================================
CREATE TABLE menu_items (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
    name          TEXT NOT NULL,
    price         INTEGER NOT NULL,  -- Naira (integer amounts)
    category      TEXT NOT NULL,
    description   TEXT,
    image_url     TEXT,
    available     BOOLEAN NOT NULL DEFAULT true,
    sort_order    INTEGER NOT NULL DEFAULT 0,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================================
-- 6. ORDERS
-- ============================================================================
CREATE TABLE orders (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    table_id      TEXT NOT NULL REFERENCES tables(id),
    restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
    status        TEXT NOT NULL DEFAULT 'CREATED'
                  CHECK (status IN (
                      'CREATED',
                      'PREPARING',
                      'READY',
                      'PAYMENT_PENDING',
                      'CONFIRMED',
                      'CANCELLED'
                  )),
    total         INTEGER NOT NULL DEFAULT 0,
    reference     TEXT UNIQUE NOT NULL,  -- e.g. "OSHAP-T1-4829"
    session_id    UUID REFERENCES table_sessions(id) ON DELETE SET NULL,
    customer_name TEXT,
    device_token  TEXT,                  -- anonymous device UUID per browser tab
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================================
-- 7. ORDER ITEMS
-- ============================================================================
CREATE TABLE order_items (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id      UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    name          TEXT NOT NULL,         -- denormalized menu item name
    quantity      INTEGER NOT NULL DEFAULT 1,
    price         INTEGER NOT NULL       -- Naira (unit price at time of order)
);

-- ============================================================================
-- 8. PAYMENTS
-- ============================================================================
CREATE TABLE payments (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id      UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    amount        INTEGER NOT NULL,
    status        TEXT NOT NULL DEFAULT 'NOT_PAID'
                  CHECK (status IN (
                      'NOT_PAID',
                      'CLAIMED',
                      'CONFIRMED',
                      'VERIFIED'
                  )),
    proof_url     TEXT,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT payments_order_id_key UNIQUE (order_id)
);

-- ============================================================================
-- 9. FCM DEVICE TOKENS
-- ============================================================================
CREATE TABLE device_tokens (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
    fcm_token     TEXT NOT NULL,         -- Firebase Cloud Messaging token
    device_label  TEXT,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================================
-- 10. INDEXES
-- ============================================================================
CREATE INDEX ix_tables_restaurant        ON tables(restaurant_id);
CREATE INDEX ix_menu_items_restaurant    ON menu_items(restaurant_id);
CREATE INDEX ix_menu_items_category      ON menu_items(restaurant_id, category);
CREATE INDEX ix_orders_table             ON orders(table_id);
CREATE INDEX ix_orders_restaurant        ON orders(restaurant_id);
CREATE INDEX ix_orders_reference         ON orders(reference);
CREATE INDEX ix_orders_status            ON orders(restaurant_id, status);
CREATE INDEX ix_orders_device_token      ON orders(table_id, device_token);
CREATE INDEX ix_order_items_order        ON order_items(order_id);
CREATE INDEX ix_payments_order           ON payments(order_id);
CREATE INDEX ix_device_tokens_restaurant ON device_tokens(restaurant_id);
CREATE INDEX ix_table_sessions_table     ON table_sessions(table_id);

-- ============================================================================
-- 11. SEED DATA (optional — run once for development)
-- ============================================================================

-- Demo restaurant
INSERT INTO restaurants (id, name, bank_name, account_number, account_name, whatsapp_number)
VALUES (
    '00000000-0000-0000-0000-000000000001',
    'Aji''s Kitchen',
    'Access Bank',
    '0123456789',
    'Aji''s Kitchen Ltd',
    '+2348012345678'
)
ON CONFLICT (id) DO NOTHING;

-- Demo tables
INSERT INTO tables (id, restaurant_id) VALUES
    ('T1',    '00000000-0000-0000-0000-000000000001'),
    ('T2',    '00000000-0000-0000-0000-000000000001'),
    ('T3',    '00000000-0000-0000-0000-000000000001'),
    ('T4',    '00000000-0000-0000-0000-000000000001'),
    ('T5',    '00000000-0000-0000-0000-000000000001'),
    ('T6',    '00000000-0000-0000-0000-000000000001'),
    ('T7',    '00000000-0000-0000-0000-000000000001'),
    ('T8',    '00000000-0000-0000-0000-000000000001'),
    ('T9',    '00000000-0000-0000-0000-000000000001'),
    ('T10',   '00000000-0000-0000-0000-000000000001'),
    ('T11',   '00000000-0000-0000-0000-000000000001'),
    ('T12',   '00000000-0000-0000-0000-000000000001'),
    ('T-G37', '00000000-0000-0000-0000-000000000001')
ON CONFLICT (id) DO NOTHING;

-- Demo menu items
INSERT INTO menu_items (restaurant_id, name, price, category, description, image_url, sort_order) VALUES
    ('00000000-0000-0000-0000-000000000001', 'Chicken Shawarma',     2500, 'Meals',  'Grilled chicken wrap with garlic sauce, pickles and fries',               'https://images.unsplash.com/photo-1529042410759-befb1204b468?w=400&q=80', 1),
    ('00000000-0000-0000-0000-000000000001', 'Beef Shawarma',        3000, 'Meals',  'Tender beef strips with tahini sauce and fresh vegetables',               'https://images.unsplash.com/photo-1626082927389-6cd097cdc6ec?w=400&q=80', 2),
    ('00000000-0000-0000-0000-000000000001', 'Jollof Rice & Chicken', 3500, 'Meals',  'Party-style jollof rice with a perfectly grilled chicken thigh',          'https://images.unsplash.com/photo-1596797038530-2c107229654b?w=400&q=80', 3),
    ('00000000-0000-0000-0000-000000000001', 'Fried Rice & Turkey',   4000, 'Meals',  'Vegetable fried rice served with peppered turkey',                        'https://images.unsplash.com/photo-1603133872878-684f208fb84b?w=400&q=80', 4),
    ('00000000-0000-0000-0000-000000000001', 'Peppered Chicken',      2000, 'Meals',  'Spicy fried chicken in a pepper sauce',                                   'https://images.unsplash.com/photo-1598103442097-8b74394b95c6?w=400&q=80', 5),
    ('00000000-0000-0000-0000-000000000001', 'Suya Platter',          3000, 'Grills', 'Grilled beef skewers with yaji spice, onions and tomatoes',               'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=400&q=80', 1),
    ('00000000-0000-0000-0000-000000000001', 'Grilled Fish',          5000, 'Grills', 'Whole catfish grilled with pepper sauce and plantain',                    'https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?w=400&q=80', 2),
    ('00000000-0000-0000-0000-000000000001', 'Asun',                  3500, 'Grills', 'Spicy smoked goat meat with peppers and onions',                          'https://images.unsplash.com/photo-1544025162-d76694265947?w=400&q=80', 3),
    ('00000000-0000-0000-0000-000000000001', 'Chapman',               1500, 'Drinks', 'Classic Nigerian cocktail with Fanta, Sprite and bitters',                'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?w=400&q=80', 1),
    ('00000000-0000-0000-0000-000000000001', 'Zobo',                   800, 'Drinks', 'Refreshing hibiscus drink with ginger and pineapple',                     'https://images.unsplash.com/photo-1556679343-c7306c1976bc?w=400&q=80', 2),
    ('00000000-0000-0000-0000-000000000001', 'Fresh Orange Juice',    1200, 'Drinks', 'Freshly squeezed orange juice, no sugar added',                           'https://images.unsplash.com/photo-1600271886742-f049cd451bba?w=400&q=80', 3),
    ('00000000-0000-0000-0000-000000000001', 'Coca-Cola',              500, 'Drinks', 'Classic Coca-Cola 50cl bottle',                                          'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?w=400&q=80', 4),
    ('00000000-0000-0000-0000-000000000001', 'Malt',                   600, 'Drinks', 'Amstel Malt 50cl bottle',                                                'https://images.unsplash.com/photo-1558645836-e44122a743ee?w=400&q=80', 5),
    ('00000000-0000-0000-0000-000000000001', 'Puff Puff',              500, 'Sides',  '6 pieces of fluffy Nigerian doughnuts',                                   'https://images.unsplash.com/photo-1551024601-bec78aea704b?w=400&q=80', 1),
    ('00000000-0000-0000-0000-000000000001', 'Plantain Chips',         800, 'Sides',  'Crunchy plantain chips with a spicy dip',                                 'https://images.unsplash.com/photo-1599487405259-2a2b7e2898fb?w=400&q=80', 2),
    ('00000000-0000-0000-0000-000000000001', 'French Fries',          1000, 'Sides',  'Golden crispy fries with ketchup',                                        'https://images.unsplash.com/photo-1573080496219-bb080dd4f877?w=400&q=80', 3),
    ('00000000-0000-0000-0000-000000000001', 'Coleslaw',               500, 'Sides',  'Fresh coleslaw with creamy dressing',                                     'https://images.unsplash.com/photo-1540420773420-3366772f4999?w=400&q=80', 4)
ON CONFLICT DO NOTHING;
