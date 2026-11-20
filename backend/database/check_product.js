
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, '..', 'retail_management.db');
const db = new sqlite3.Database(dbPath);

db.get(`
    SELECT COUNT(*) AS total
    FROM LichSuKho
    WHERE san_pham_id = 17
`, (err, result) => {
    if (err) {
        console.log('Loi:', err.message);
    } else {
        console.log('So ban ghi lich su kho cua SP009:', result.total);
    }

    db.close();
});
