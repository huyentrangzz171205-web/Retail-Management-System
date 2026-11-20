
const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const path = require('path');

// Duong dan database moi
const dbPath = path.join(__dirname, '..', 'retail_management.db');

// Doc file SQL cap nhat
const sqlPath = path.join(__dirname, 'update_schema.sql');
const sql = fs.readFileSync(sqlPath, 'utf8');

// Ket noi database
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.log('Loi ket noi:', err.message);
        return;
    }

    console.log('Da ket noi database!');

    db.exec(sql, (err) => {
        if (err) {
            console.log('Loi cap nhat database:', err.message);
        } else {
            console.log('Cap nhat database thanh cong!');

            db.all(
                "PRAGMA table_info(KhachHang)",
                [],
                (err, rows) => {
                    if (!err) {
                        console.log('\nCac cot trong bang KhachHang:');
                        rows.forEach(row => console.log(row.name));
                    }

                    db.all(
                        "PRAGMA table_info(DonHang)",
                        [],
                        (err, rows) => {
                            if (!err) {
                                console.log('\nCac cot trong bang DonHang:');
                                rows.forEach(row => console.log(row.name));
                            }

                            db.close();
                        }
                    );
                }
            );
        }
    });
});
