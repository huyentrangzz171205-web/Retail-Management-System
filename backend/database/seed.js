
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');
const path = require('path');

// Ket noi database moi
const dbPath = path.join(__dirname, '..', 'retail_management.db');
const db = new sqlite3.Database(dbPath);

function run(sql, params = []) {
    return new Promise((resolve, reject) => {
        db.run(sql, params, function (err) {
            if (err) {
                reject(err);
            } else {
                resolve(this);
            }
        });
    });
}

function get(sql, params = []) {
    return new Promise((resolve, reject) => {
        db.get(sql, params, (err, row) => {
            if (err) reject(err);
            else resolve(row);
        });
    });
}

async function seedDatabase() {
    try {
        await run('PRAGMA foreign_keys = ON');
        await run('BEGIN TRANSACTION');

        // 1. VAI TRO
        await run(`
            INSERT OR IGNORE INTO VaiTro (ten_vai_tro, mo_ta)
            VALUES
            ('ADMIN', 'Quan tri he thong'),
            ('NHAN_VIEN', 'Nhan vien ban hang')
        `);

        // 2. NHAN VIEN
        await run(`
            INSERT OR IGNORE INTO NhanVien
            (ho_ten, so_dien_thoai, email, dia_chi, ngay_vao_lam)
            VALUES
            ('Nguyen Minh Anh', '0901000001',
             'admin@retail.local', 'Ha Noi', '2026-01-01'),
            ('Tran Quoc Bao', '0901000002',
             'bao@retail.local', 'Ha Noi', '2026-02-01')
        `);

        // 3. TAI KHOAN
        const adminPassword = bcrypt.hashSync('Admin@123', 10);
        const staffPassword = bcrypt.hashSync('Nhanvien@123', 10);

        await run(`
            INSERT OR IGNORE INTO NguoiDung
            (ten_dang_nhap, mat_khau, vai_tro_id, nhan_vien_id)
            VALUES (
                'admin',
                ?,
                (SELECT id FROM VaiTro WHERE ten_vai_tro = 'ADMIN'),
                (SELECT id FROM NhanVien
                 WHERE email = 'admin@retail.local')
            )
        `, [adminPassword]);

        await run(`
            INSERT OR IGNORE INTO NguoiDung
            (ten_dang_nhap, mat_khau, vai_tro_id, nhan_vien_id)
            VALUES (
                'nhanvien01',
                ?,
                (SELECT id FROM VaiTro WHERE ten_vai_tro = 'NHAN_VIEN'),
                (SELECT id FROM NhanVien
                 WHERE email = 'bao@retail.local')
            )
        `, [staffPassword]);

        // 4. DANH MUC
        await run(`
            INSERT OR IGNORE INTO DanhMuc (ten_danh_muc, mo_ta)
            VALUES
            ('Dien tu', 'Thiet bi dien tu'),
            ('Do gia dung', 'San pham gia dung'),
            ('Thoi trang', 'Quan ao va phu kien'),
            ('Thuc pham dong goi', 'Thuc pham dong goi san')
        `);

        // 5. SAN PHAM
        await run(`
            INSERT OR IGNORE INTO SanPham
            (ma_sp, ten_sp, danh_muc_id, don_vi_tinh,
             gia_nhap, gia_ban, ton_kho, ton_kho_toi_thieu)
            VALUES
            ('SP001', 'Tai nghe Bluetooth', 
             (SELECT id FROM DanhMuc WHERE ten_danh_muc='Dien tu'),
             'Chiec', 250000, 350000, 30, 5),

            ('SP002', 'Chuot khong day',
             (SELECT id FROM DanhMuc WHERE ten_danh_muc='Dien tu'),
             'Chiec', 120000, 180000, 45, 10),

            ('SP003', 'Ban phim may tinh',
             (SELECT id FROM DanhMuc WHERE ten_danh_muc='Dien tu'),
             'Chiec', 300000, 420000, 20, 5),

            ('SP004', 'Noi com dien',
             (SELECT id FROM DanhMuc WHERE ten_danh_muc='Do gia dung'),
             'Chiec', 550000, 750000, 15, 5),

            ('SP005', 'Am dun nuoc',
             (SELECT id FROM DanhMuc WHERE ten_danh_muc='Do gia dung'),
             'Chiec', 180000, 250000, 25, 5),

            ('SP006', 'Ao thun nam',
             (SELECT id FROM DanhMuc WHERE ten_danh_muc='Thoi trang'),
             'Chiec', 90000, 150000, 50, 10),

            ('SP007', 'Balo thoi trang',
             (SELECT id FROM DanhMuc WHERE ten_danh_muc='Thoi trang'),
             'Chiec', 200000, 290000, 18, 5),

            ('SP008', 'Banh quy hop',
             (SELECT id FROM DanhMuc WHERE ten_danh_muc='Thuc pham dong goi'),
             'Hop', 35000, 50000, 60, 10)
        `);

        // 6. KHACH HANG
        await run(`
            INSERT OR IGNORE INTO KhachHang
            (ho_ten, so_dien_thoai, email, dia_chi)
            VALUES
            ('Le Thu Ha', '0912000001',
             'ha@example.com', 'Ha Noi'),

            ('Pham Duc Long', '0912000002',
             'long@example.com', 'Ha Noi'),

            ('Nguyen Mai Lan', '0912000003',
             'lan@example.com', 'Ha Noi')
        `);

        // 7. NHA CUNG CAP
        await run(`
            INSERT INTO NhaCungCap
            (ten_ncc, so_dien_thoai, email, dia_chi)
            SELECT 'Cong ty Dien may ABC', '0923000001',
                   'abc@example.com', 'Ha Noi'
            WHERE NOT EXISTS (
                SELECT 1 FROM NhaCungCap
                WHERE ten_ncc = 'Cong ty Dien may ABC'
            )
        `);

        await run(`
            INSERT INTO NhaCungCap
            (ten_ncc, so_dien_thoai, email, dia_chi)
            SELECT 'Cong ty Gia dung XYZ', '0923000002',
                   'xyz@example.com', 'Ha Noi'
            WHERE NOT EXISTS (
                SELECT 1 FROM NhaCungCap
                WHERE ten_ncc = 'Cong ty Gia dung XYZ'
            )
        `);

        await run(`
            INSERT INTO NhaCungCap
            (ten_ncc, so_dien_thoai, email, dia_chi)
            SELECT 'Nha phan phoi Minh Phat', '0923000003',
                   'minhphat@example.com', 'Ha Noi'
            WHERE NOT EXISTS (
                SELECT 1 FROM NhaCungCap
                WHERE ten_ncc = 'Nha phan phoi Minh Phat'
            )
        `);

        // 8. LICH SU TON KHO BAN DAU
        await run(`
            INSERT INTO LichSuKho
            (san_pham_id, loai_giao_dich, so_luong,
             ton_truoc, ton_sau, loai_chung_tu,
             nguoi_thuc_hien, ghi_chu)
            SELECT
                sp.id,
                'DIEU_CHINH',
                sp.ton_kho,
                0,
                sp.ton_kho,
                'KHOI_TAO',
                (SELECT id FROM NguoiDung
                 WHERE ten_dang_nhap = 'admin'),
                'Khoi tao du lieu mau'
            FROM SanPham sp
            WHERE NOT EXISTS (
                SELECT 1 FROM LichSuKho ls
                WHERE ls.san_pham_id = sp.id
                  AND ls.loai_chung_tu = 'KHOI_TAO'
            )
        `);

        await run('COMMIT');

        console.log('Da them du lieu mau thanh cong!');

        const tables = [
            'VaiTro', 'NhanVien', 'NguoiDung',
            'DanhMuc', 'SanPham', 'KhachHang',
            'NhaCungCap', 'LichSuKho'
        ];

        for (const table of tables) {
            const result = await get(
                `SELECT COUNT(*) AS total FROM ${table}`
            );
            console.log(table + ': ' + result.total + ' ban ghi');
        }

        console.log('--------------------------------');
        console.log('Tai khoan Admin: admin');
        console.log('Mat khau mau: Admin@123');
        console.log('Tai khoan nhan vien: nhanvien01');
        console.log('Mat khau mau: Nhanvien@123');

    } catch (err) {
        await run('ROLLBACK');
        console.log('Loi them du lieu:', err.message);
    } finally {
        db.close();
    }
}

seedDatabase();
