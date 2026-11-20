
const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const path = require('path');

// Duong dan den database moi
const dbPath = path.join(__dirname, '..', 'retail_management.db');

// Duong dan den file SQL
const sqlPath = path.join(__dirname, 'schema.sql');

// Doc noi dung file SQL
const sql = fs.readFileSync(sqlPath, 'utf8');

// Ket noi database
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.log('Loi ket noi database:', err.message);
        return;
    }

    console.log('Da ket noi database moi!');

    // Thuc thi cac lenh SQL
    db.exec(sql, (err) => {
        if (err) {
            console.log('Loi khi tao bang:', err.message);
            db.close();
            return;
        }

        console.log('Da tao cau truc database thanh cong!');

        // Kiem tra danh sach bang
        db.all(
            "SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' ORDER BY name",
            (err, rows) => {
                if (err) {
                    console.log('Loi kiem tra bang:', err.message);
                } else {
                    console.log('Danh sach bang da tao:');
                    rows.forEach((row, index) => {
                        console.log((index + 1) + '. ' + row.name);
                    });
                    console.log('Tong so bang:', rows.length);
                }

                db.close();
            }
        );
    });
});
