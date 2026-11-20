const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.resolve(__dirname, 'ql_sinhvien.db');
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('❌ Lỗi kết nối SQLite:', err.message);
    } else {
        console.log('✅ Đã kết nối CSDL SQLite thành công!');
    }
});

db.serialize(() => {
    // 1. Bảng Lớp học
    db.run(`
        CREATE TABLE IF NOT EXISTS Lop (
            ma_lop TEXT PRIMARY KEY,
            ten_lop TEXT NOT NULL,
            khoa TEXT NOT NULL
        )
    `);

    // 2. Bảng Sinh viên (được liên kết với Bảng Lớp)
    db.run(`
        CREATE TABLE IF NOT EXISTS SinhVien (
            ma_sv TEXT PRIMARY KEY,
            ho_ten TEXT NOT NULL,
            email TEXT,
            so_dien_thoai TEXT,
            ma_lop TEXT,
            FOREIGN KEY (ma_lop) REFERENCES Lop(ma_lop) ON DELETE SET NULL
        )
    `);

    // 3. Bảng Môn học
    db.run(`
        CREATE TABLE IF NOT EXISTS MonHoc (
            ma_mon TEXT PRIMARY KEY,
            ten_mon TEXT NOT NULL,
            so_tin_chi INTEGER NOT NULL
        )
    `);

    // 4. Bảng Điểm
    db.run(`
        CREATE TABLE IF NOT EXISTS Diem (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            ma_sv TEXT NOT NULL,
            ma_mon TEXT NOT NULL,
            diem_chuyen_can REAL,
            diem_giua_ky REAL,
            diem_cuoi_ky REAL,
            diem_trung_binh REAL,
            FOREIGN KEY (ma_sv) REFERENCES SinhVien(ma_sv) ON DELETE CASCADE,
            FOREIGN KEY (ma_mon) REFERENCES MonHoc(ma_mon) ON DELETE CASCADE
        )
    `);

    // 5. Bảng Tài khoản (Phân quyền: admin, giangvien, sinhvien)
    db.run(`
        CREATE TABLE IF NOT EXISTS TaiKhoan (
            username TEXT PRIMARY KEY,
            password TEXT NOT NULL,
            role TEXT NOT NULL, -- 'admin', 'giangvien', 'sinhvien'
            ma_lien_ket TEXT    -- Lưu mã SV nếu là tài khoản sinh viên
        )
    `);

    // Tạo sẵn tài khoản Admin mặc định nếu chưa có
    db.run(`
        INSERT OR IGNORE INTO TaiKhoan (username, password, role) 
        VALUES ('admin', 'admin123', 'admin')
    `);
});

module.exports = db;