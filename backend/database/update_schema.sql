
-- =====================================
-- CAP NHAT DATABASE RETAIL MANAGEMENT
-- =====================================

BEGIN TRANSACTION;

-- 1. Bo sung thong tin khach hang
ALTER TABLE KhachHang
ADD COLUMN hang_thanh_vien TEXT NOT NULL DEFAULT 'THANH_VIEN';

ALTER TABLE KhachHang
ADD COLUMN du_no INTEGER NOT NULL DEFAULT 0
CHECK (du_no >= 0);

-- 2. Bo sung thong tin diem vao don hang
ALTER TABLE DonHang
ADD COLUMN diem_su_dung INTEGER NOT NULL DEFAULT 0
CHECK (diem_su_dung >= 0);

ALTER TABLE DonHang
ADD COLUMN giam_gia_diem INTEGER NOT NULL DEFAULT 0
CHECK (giam_gia_diem >= 0);

ALTER TABLE DonHang
ADD COLUMN diem_cong INTEGER NOT NULL DEFAULT 0
CHECK (diem_cong >= 0);

COMMIT;
