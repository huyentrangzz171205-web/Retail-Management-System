
const sqlite3 = require('sqlite3').verbose();

const path = require('path');

const dbPath = path.join(__dirname, '..', 'retail_management.db');
const db = new sqlite3.Database(dbPath);

const sql = `
    SELECT 
        nd.ten_dang_nhap,
        nd.trang_thai,
        vt.ten_vai_tro
    FROM NguoiDung nd
    JOIN VaiTro vt ON nd.vai_tro_id = vt.id
    WHERE nd.ten_dang_nhap = ?
`;

db.get(sql, ['admin'], (err, row) => {
    if (err) {
        console.log('Loi:', err.message);
    } else {
        console.log('Thong tin tai khoan ADMIN:');
        console.log(row);
    }

    db.close();
});
