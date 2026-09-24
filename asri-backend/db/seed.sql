-- Data contoh untuk pengembangan/testing lokal
-- Password admin default: "admin123" (HARUS diganti setelah deploy!)
-- Hash di bawah adalah bcrypt('admin123', 10) — hanya untuk contoh,
-- selalu generate ulang hash baru via endpoint/register script di produksi.

INSERT INTO users (name, email, password_hash, role) VALUES
('Pemilik Toko', 'admin@kelontong.com', '$2b$10$CwTycUXWue0Thq9StjUM0uJ8Y5nq2f9G0.kL9E6i2N3g8VYqQ1a9O', 'admin');

INSERT INTO products (barcode, name, category, unit, cost_price, sell_price, stock, low_stock_threshold) VALUES
('8991001', 'Minyak Goreng Sawit 1L', 'Sembako', 'Pouch', 13500, 16500, 25, 10),
('8991002', 'Beras Pandan Wangi 5kg', 'Sembako', 'Karung', 68000, 78000, 12, 10),
('8991003', 'Gula Pasir Kristal 1kg', 'Sembako', 'Bks', 14000, 17000, 18, 10),
('8991004', 'Kopi Kapal Api Special 165g', 'Minuman', 'Bks', 12500, 15000, 8, 10),
('8991005', 'Teh Celup Sosro Box 30s', 'Minuman', 'Box', 6000, 8500, 30, 10),
('8991006', 'Indomie Goreng Original 85g', 'Makanan', 'Bks', 2800, 3500, 120, 10),
('8991007', 'Susu UHT Full Cream 1L', 'Minuman', 'Karton', 16000, 19500, 5, 10),
('8991008', 'Sabun Cuci Piring Liquid 780ml', 'Kebersihan', 'Pouch', 12000, 15500, 15, 10);
