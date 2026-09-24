-- ============================================================
-- Skema Database: Sistem Kasir & Manajemen Toko Kelontong Asri
-- Target: PostgreSQL 14+ (kompatibel dengan Supabase)
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto"; -- untuk gen_random_uuid()

-- ------------------------------------------------------------
-- 1. USERS (Admin & Kasir)
-- ------------------------------------------------------------
CREATE TABLE users (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name                VARCHAR(100) NOT NULL,
    email               VARCHAR(150) NOT NULL UNIQUE,
    password_hash       VARCHAR(255) NOT NULL,          -- bcrypt hash, TIDAK PERNAH plaintext
    role                VARCHAR(20)  NOT NULL DEFAULT 'kasir'
                             CHECK (role IN ('admin', 'kasir')),
    is_active           BOOLEAN NOT NULL DEFAULT TRUE,

    -- Fitur lupa password
    reset_token_hash    VARCHAR(255),                   -- hash dari token reset (bukan token asli)
    reset_token_expires TIMESTAMPTZ,

    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_users_email ON users (email);

-- ------------------------------------------------------------
-- 2. STORE_SETTINGS (identitas toko untuk struk - 1 baris/singleton)
-- ------------------------------------------------------------
CREATE TABLE store_settings (
    id          SMALLINT PRIMARY KEY DEFAULT 1 CHECK (id = 1), -- pastikan hanya 1 baris
    store_name  VARCHAR(150) NOT NULL DEFAULT 'Toko Kelontong Asri',
    address     TEXT NOT NULL DEFAULT '',
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO store_settings (id, store_name, address)
VALUES (1, 'Toko Kelontong Asri', 'Jl. Asri Sejahtera No. 123, Kota Kita');

-- ------------------------------------------------------------
-- 3. PRODUCTS (Master Barang)
-- ------------------------------------------------------------
CREATE TABLE products (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    barcode             VARCHAR(64) NOT NULL UNIQUE,
    name                VARCHAR(200) NOT NULL,
    category            VARCHAR(30) NOT NULL
                             CHECK (category IN ('Makanan','Minuman','Sembako','Kebersihan','Lainnya')),
    unit                VARCHAR(30) NOT NULL,           -- satuan: Pcs, Bks, Karton, dll
    cost_price          NUMERIC(14,2) NOT NULL CHECK (cost_price >= 0),   -- HPP saat ini (bisa berubah)
    sell_price          NUMERIC(14,2) NOT NULL CHECK (sell_price >= 0),   -- Harga jual saat ini
    stock               INTEGER NOT NULL DEFAULT 0 CHECK (stock >= 0),
    low_stock_threshold INTEGER NOT NULL DEFAULT 10,
    is_active           BOOLEAN NOT NULL DEFAULT TRUE,  -- soft delete, agar histori transaksi tak rusak
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_products_barcode  ON products (barcode);
CREATE INDEX idx_products_category ON products (category);
CREATE INDEX idx_products_lowstock ON products (stock) WHERE is_active = TRUE;

-- ------------------------------------------------------------
-- 4. TRANSACTIONS (Header struk)
-- ------------------------------------------------------------
CREATE TABLE transactions (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tx_code         VARCHAR(30) NOT NULL UNIQUE,        -- Format: TX-YYYYMMDD-XXXX (tampil di struk)
    cashier_id      UUID NOT NULL REFERENCES users(id),

    subtotal        NUMERIC(14,2) NOT NULL,
    discount_pct    NUMERIC(5,2)  NOT NULL DEFAULT 0,
    discount_amount NUMERIC(14,2) NOT NULL DEFAULT 0,
    grand_total     NUMERIC(14,2) NOT NULL,

    total_hpp       NUMERIC(14,2) NOT NULL,             -- snapshot total HPP saat transaksi (immutable)
    net_profit      NUMERIC(14,2) NOT NULL,             -- grand_total - total_hpp (immutable)

    payment_method  VARCHAR(20) NOT NULL CHECK (payment_method IN ('CASH','QRIS','DEBIT')),
    cash_received   NUMERIC(14,2),
    change_amount   NUMERIC(14,2),

    status          VARCHAR(20) NOT NULL DEFAULT 'completed'
                        CHECK (status IN ('completed','void')),

    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_transactions_created_at ON transactions (created_at);
CREATE INDEX idx_transactions_tx_code    ON transactions (tx_code);

-- ------------------------------------------------------------
-- 5. TRANSACTION_DETAILS (Item per struk)
-- Kunci penting: product_name_snapshot, unit_cost, unit_price DISALIN
-- pada saat transaksi terjadi. Jika HPP/harga produk berubah di masa
-- depan, baris histori ini TIDAK IKUT BERUBAH -> laporan laba rugi
-- masa lalu tetap akurat.
-- ------------------------------------------------------------
CREATE TABLE transaction_details (
    id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transaction_id        UUID NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
    product_id            UUID REFERENCES products(id) ON DELETE SET NULL, -- boleh NULL bila produk lama dihapus

    product_name_snapshot VARCHAR(200) NOT NULL,
    barcode_snapshot      VARCHAR(64)  NOT NULL,
    unit_snapshot         VARCHAR(30)  NOT NULL,

    qty                   INTEGER NOT NULL CHECK (qty > 0),
    unit_price            NUMERIC(14,2) NOT NULL,   -- harga jual historis
    unit_cost             NUMERIC(14,2) NOT NULL,   -- HPP historis (BUKAN cost_price saat ini)
    line_subtotal         NUMERIC(14,2) NOT NULL,   -- qty * unit_price
    line_hpp              NUMERIC(14,2) NOT NULL    -- qty * unit_cost
);

CREATE INDEX idx_txdetails_transaction ON transaction_details (transaction_id);
CREATE INDEX idx_txdetails_product     ON transaction_details (product_id);

-- ------------------------------------------------------------
-- Trigger updated_at otomatis
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION trg_set_updated_at() RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_updated_at_users
    BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION trg_set_updated_at();

CREATE TRIGGER set_updated_at_products
    BEFORE UPDATE ON products
    FOR EACH ROW EXECUTE FUNCTION trg_set_updated_at();

CREATE TRIGGER set_updated_at_store_settings
    BEFORE UPDATE ON store_settings
    FOR EACH ROW EXECUTE FUNCTION trg_set_updated_at();
