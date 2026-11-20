
PRAGMA foreign_keys = ON;

BEGIN TRANSACTION;

-- =====================================
-- 1. BANG VAI TRO
-- =====================================
CREATE TABLE IF NOT EXISTS VaiTro (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ten_vai_tro TEXT NOT NULL UNIQUE,
    mo_ta TEXT
);

-- =====================================
-- 2. BANG NHAN VIEN
-- =====================================
CREATE TABLE IF NOT EXISTS NhanVien (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ho_ten TEXT NOT NULL,
    so_dien_thoai TEXT,
    email TEXT,
    dia_chi TEXT,
    ngay_vao_lam TEXT,
    trang_thai TEXT NOT NULL DEFAULT 'DANG_LAM'
        CHECK (trang_thai IN ('DANG_LAM', 'NGHI_VIEC'))
);

-- =====================================
-- 3. BANG NGUOI DUNG
-- =====================================
CREATE TABLE IF NOT EXISTS NguoiDung (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ten_dang_nhap TEXT NOT NULL UNIQUE,
    mat_khau TEXT NOT NULL,
    vai_tro_id INTEGER NOT NULL,
    nhan_vien_id INTEGER UNIQUE,
    trang_thai INTEGER NOT NULL DEFAULT 1
        CHECK (trang_thai IN (0, 1)),
    FOREIGN KEY (vai_tro_id) REFERENCES VaiTro(id),
    FOREIGN KEY (nhan_vien_id) REFERENCES NhanVien(id)
);

-- =====================================
-- 4. BANG DANH MUC
-- =====================================
CREATE TABLE IF NOT EXISTS DanhMuc (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ten_danh_muc TEXT NOT NULL UNIQUE,
    mo_ta TEXT,
    trang_thai INTEGER NOT NULL DEFAULT 1
        CHECK (trang_thai IN (0, 1))
);

-- =====================================
-- 5. BANG SAN PHAM
-- =====================================
CREATE TABLE IF NOT EXISTS SanPham (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ma_sp TEXT NOT NULL UNIQUE,
    ma_vach TEXT UNIQUE,
    ten_sp TEXT NOT NULL,
    danh_muc_id INTEGER NOT NULL,
    don_vi_tinh TEXT NOT NULL,
    gia_nhap INTEGER NOT NULL DEFAULT 0 CHECK (gia_nhap >= 0),
    gia_ban INTEGER NOT NULL CHECK (gia_ban >= 0),
    ton_kho INTEGER NOT NULL DEFAULT 0 CHECK (ton_kho >= 0),
    ton_kho_toi_thieu INTEGER NOT NULL DEFAULT 5
        CHECK (ton_kho_toi_thieu >= 0),
    mo_ta TEXT,
    trang_thai INTEGER NOT NULL DEFAULT 1
        CHECK (trang_thai IN (0, 1)),
    FOREIGN KEY (danh_muc_id) REFERENCES DanhMuc(id)
);

-- =====================================
-- 6. BANG KHACH HANG
-- =====================================
CREATE TABLE IF NOT EXISTS KhachHang (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ho_ten TEXT NOT NULL,
    so_dien_thoai TEXT UNIQUE,
    email TEXT,
    dia_chi TEXT,
    diem_tich_luy INTEGER NOT NULL DEFAULT 0
        CHECK (diem_tich_luy >= 0),
    ngay_tao TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- =====================================
-- 7. BANG NHA CUNG CAP
-- =====================================
CREATE TABLE IF NOT EXISTS NhaCungCap (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ten_ncc TEXT NOT NULL,
    so_dien_thoai TEXT,
    email TEXT,
    dia_chi TEXT,
    trang_thai INTEGER NOT NULL DEFAULT 1
        CHECK (trang_thai IN (0, 1))
);

-- =====================================
-- 8. BANG DON HANG
-- =====================================
CREATE TABLE IF NOT EXISTS DonHang (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ma_don TEXT NOT NULL UNIQUE,
    khach_hang_id INTEGER,
    nhan_vien_id INTEGER NOT NULL,
    ngay_lap TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    tong_tien_hang INTEGER NOT NULL DEFAULT 0
        CHECK (tong_tien_hang >= 0),
    giam_gia INTEGER NOT NULL DEFAULT 0
        CHECK (giam_gia >= 0),
    tong_thanh_toan INTEGER NOT NULL DEFAULT 0
        CHECK (tong_thanh_toan >= 0),
    trang_thai TEXT NOT NULL DEFAULT 'CHO_THANH_TOAN'
        CHECK (trang_thai IN (
            'CHO_THANH_TOAN', 'HOAN_THANH', 'HUY'
        )),
    ghi_chu TEXT,
    FOREIGN KEY (khach_hang_id) REFERENCES KhachHang(id),
    FOREIGN KEY (nhan_vien_id) REFERENCES NhanVien(id)
);

-- =====================================
-- 9. BANG CHI TIET DON HANG
-- =====================================
CREATE TABLE IF NOT EXISTS ChiTietDonHang (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    don_hang_id INTEGER NOT NULL,
    san_pham_id INTEGER NOT NULL,
    ten_sp TEXT NOT NULL,
    so_luong INTEGER NOT NULL CHECK (so_luong > 0),
    don_gia INTEGER NOT NULL CHECK (don_gia >= 0),
    giam_gia INTEGER NOT NULL DEFAULT 0 CHECK (giam_gia >= 0),
    thanh_tien INTEGER NOT NULL CHECK (thanh_tien >= 0),
    FOREIGN KEY (don_hang_id) REFERENCES DonHang(id),
    FOREIGN KEY (san_pham_id) REFERENCES SanPham(id),
    UNIQUE (don_hang_id, san_pham_id)
);

-- =====================================
-- 10. BANG THANH TOAN
-- =====================================
CREATE TABLE IF NOT EXISTS ThanhToan (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    don_hang_id INTEGER NOT NULL,
    so_tien INTEGER NOT NULL CHECK (so_tien > 0),
    phuong_thuc TEXT NOT NULL
        CHECK (phuong_thuc IN ('TIEN_MAT', 'CHUYEN_KHOAN')),
    ngay_thanh_toan TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    trang_thai TEXT NOT NULL DEFAULT 'THANH_CONG'
        CHECK (trang_thai IN ('THANH_CONG', 'THAT_BAI')),
    FOREIGN KEY (don_hang_id) REFERENCES DonHang(id)
);

-- =====================================
-- 11. BANG PHIEU NHAP
-- =====================================
CREATE TABLE IF NOT EXISTS PhieuNhap (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ma_phieu TEXT NOT NULL UNIQUE,
    nha_cung_cap_id INTEGER NOT NULL,
    nhan_vien_id INTEGER NOT NULL,
    ngay_nhap TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    tong_tien INTEGER NOT NULL DEFAULT 0
        CHECK (tong_tien >= 0),
    trang_thai TEXT NOT NULL DEFAULT 'CHO_NHAP'
        CHECK (trang_thai IN ('CHO_NHAP', 'DA_NHAP', 'HUY')),
    ghi_chu TEXT,
    FOREIGN KEY (nha_cung_cap_id) REFERENCES NhaCungCap(id),
    FOREIGN KEY (nhan_vien_id) REFERENCES NhanVien(id)
);

-- =====================================
-- 12. BANG CHI TIET PHIEU NHAP
-- =====================================
CREATE TABLE IF NOT EXISTS ChiTietPhieuNhap (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    phieu_nhap_id INTEGER NOT NULL,
    san_pham_id INTEGER NOT NULL,
    so_luong INTEGER NOT NULL CHECK (so_luong > 0),
    don_gia_nhap INTEGER NOT NULL CHECK (don_gia_nhap >= 0),
    thanh_tien INTEGER NOT NULL CHECK (thanh_tien >= 0),
    FOREIGN KEY (phieu_nhap_id) REFERENCES PhieuNhap(id),
    FOREIGN KEY (san_pham_id) REFERENCES SanPham(id),
    UNIQUE (phieu_nhap_id, san_pham_id)
);

-- =====================================
-- 13. BANG LICH SU KHO
-- =====================================
CREATE TABLE IF NOT EXISTS LichSuKho (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    san_pham_id INTEGER NOT NULL,
    loai_giao_dich TEXT NOT NULL
        CHECK (loai_giao_dich IN ('NHAP', 'XUAT', 'DIEU_CHINH')),
    so_luong INTEGER NOT NULL CHECK (so_luong > 0),
    ton_truoc INTEGER NOT NULL CHECK (ton_truoc >= 0),
    ton_sau INTEGER NOT NULL CHECK (ton_sau >= 0),
    loai_chung_tu TEXT,
    chung_tu_id INTEGER,
    nguoi_thuc_hien INTEGER,
    ngay_tao TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    ghi_chu TEXT,
    FOREIGN KEY (san_pham_id) REFERENCES SanPham(id),
    FOREIGN KEY (nguoi_thuc_hien) REFERENCES NguoiDung(id)
);

-- =====================================
-- 14. BANG PHIEU THU CHI
-- =====================================
CREATE TABLE IF NOT EXISTS PhieuThuChi (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    loai TEXT NOT NULL CHECK (loai IN ('THU', 'CHI')),
    danh_muc TEXT NOT NULL,
    so_tien INTEGER NOT NULL CHECK (so_tien > 0),
    ngay_giao_dich TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    ghi_chu TEXT,
    nguoi_tao INTEGER NOT NULL,
    FOREIGN KEY (nguoi_tao) REFERENCES NguoiDung(id)
);

-- =====================================
-- TAO CAC CHI MUC
-- =====================================
CREATE INDEX IF NOT EXISTS idx_sanpham_ten
ON SanPham(ten_sp);

CREATE INDEX IF NOT EXISTS idx_sanpham_danhmuc
ON SanPham(danh_muc_id);

CREATE INDEX IF NOT EXISTS idx_donhang_ngay
ON DonHang(ngay_lap);

CREATE INDEX IF NOT EXISTS idx_donhang_khachhang
ON DonHang(khach_hang_id);

CREATE INDEX IF NOT EXISTS idx_chitiet_donhang
ON ChiTietDonHang(don_hang_id);

CREATE INDEX IF NOT EXISTS idx_phieunhap_ngay
ON PhieuNhap(ngay_nhap);

CREATE INDEX IF NOT EXISTS idx_lichsukho_sanpham
ON LichSuKho(san_pham_id);

CREATE INDEX IF NOT EXISTS idx_thanh_toan_donhang
ON ThanhToan(don_hang_id);

COMMIT;
