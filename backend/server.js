const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const PDFDocument = require('pdfkit');

const app = express();
const PORT = 5000;

app.use(cors());
app.use(express.json());

const dbPath = path.join(__dirname, 'ql_banhang.db');
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) console.error('Lỗi DB:', err.message);
    else console.log('✅ Đã kết nối SQLite thành công!');
});

function removeAccents(str) {
    if (!str) return '';
    return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D');
}

function getVietnameseFontPath() {
    const winArialPath = 'C:\\Windows\\Fonts\\arial.ttf';
    if (fs.existsSync(winArialPath)) return winArialPath;
    return null;
}

// Khởi tạo bảng cơ bản
db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS DanhMuc (ma_danh_muc TEXT PRIMARY KEY, ten_danh_muc TEXT NOT NULL)`);
    db.run(`CREATE TABLE IF NOT EXISTS SanPham (ma_sp TEXT PRIMARY KEY, ten_sp TEXT NOT NULL, ma_danh_muc TEXT, gia_ban REAL NOT NULL, ton_kho INTEGER DEFAULT 0)`);
    db.run(`CREATE TABLE IF NOT EXISTS KhachHang (so_dien_thoai TEXT PRIMARY KEY, ho_ten TEXT NOT NULL, diem_tich_luy INTEGER DEFAULT 0, hang_thanh_vien TEXT DEFAULT 'ThanhVien', du_no REAL DEFAULT 0)`);
    db.run(`CREATE TABLE IF NOT EXISTS DonHang (ma_don TEXT PRIMARY KEY, ngay_lap TEXT, tong_tien REAL, trang_thai TEXT, nhan_vien_tao TEXT, so_dien_thoai TEXT, so_tien_no REAL DEFAULT 0)`);
    db.run(`CREATE TABLE IF NOT EXISTS ChiTietDonHang (id INTEGER PRIMARY KEY AUTOINCREMENT, ma_don TEXT, ma_sp TEXT, so_luong INTEGER, don_gia REAL)`);

    // Dữ liệu mẫu nếu trống
    db.get("SELECT COUNT(*) as count FROM SanPham", (err, row) => {
        if (!row || row.count === 0) {
            db.run(`INSERT OR IGNORE INTO DanhMuc (ma_danh_muc, ten_danh_muc) VALUES ('DM01', 'Đồ Điện Tử'), ('DM02', 'Thời Trang')`);
            db.run(`INSERT INTO SanPham (ma_sp, ten_sp, ma_danh_muc, gia_ban, ton_kho) VALUES ('SP001', 'Laptop Gaming Alpha X', 'DM01', 25000000, 15), ('SP003', 'Áo khoác dù chống nước', 'DM02', 450000, 100)`);
        }
    });
});

// APIs
app.get('/api/categories', (req, res) => {
    db.all("SELECT * FROM DanhMuc", [], (err, rows) => res.json({ success: true, data: rows || [] }));
});

app.get('/api/products', (req, res) => {
    db.all("SELECT p.*, d.ten_danh_muc FROM SanPham p LEFT JOIN DanhMuc d ON p.ma_danh_muc = d.ma_danh_muc", [], (err, rows) => res.json({ success: true, data: rows || [] }));
});

app.get('/api/customers', (req, res) => {
    db.all("SELECT * FROM KhachHang", [], (err, rows) => res.json({ success: true, data: rows || [] }));
});

// Thêm khách hàng mới nhanh từ màn hình POS
app.post('/api/customers', (req, res) => {
    const { so_dien_thoai, ho_ten } = req.body;
    if (!so_dien_thoai || !ho_ten) {
        return res.status(400).json({ success: false, message: 'Vui lòng nhập đầy đủ số điện thoại và tên khách hàng!' });
    }

    const sql = `INSERT OR IGNORE INTO KhachHang (so_dien_thoai, ho_ten, diem_tich_luy, hang_thanh_vien, du_no) VALUES (?, ?, 0, 'ThanhVien', 0)`;
    db.run(sql, [so_dien_thoai, ho_ten], function(err) {
        if (err) return res.status(500).json({ success: false, error: err.message });
        res.json({ success: true, message: 'Đã thêm khách hàng thành công!', so_dien_thoai });
    });
});

app.get('/api/orders', (req, res) => {
    db.all("SELECT d.*, k.ho_ten as ten_khach_hang FROM DonHang d LEFT JOIN KhachHang k ON d.so_dien_thoai = k.so_dien_thoai ORDER BY d.ngay_lap DESC", [], (err, rows) => res.json({ success: true, data: rows || [] }));
});

// Thống kê tổng quan
app.get('/api/statistics', (req, res) => {
    const sql = `
        SELECT 
            (SELECT COALESCE(SUM(tong_tien), 0) FROM DonHang) as tong_doanh_thu,
            (SELECT COUNT(*) FROM DonHang) as tong_don_hang,
            (SELECT COALESCE(SUM(ton_kho), 0) FROM SanPham) as tong_ton_kho,
            (SELECT COUNT(*) FROM KhachHang) as tong_khach_hang
    `;
    db.get(sql, [], (err, row) => {
        res.json({ success: true, data: { tong_quan: row || {} } });
    });
});

// Thống kê biểu đồ theo Ngày, Tháng, Năm
app.get('/api/statistics/chart', (req, res) => {
    db.serialize(() => {
        const sqlDaily = `
            SELECT strftime('%Y-%m-%d', ngay_lap) as time_key, SUM(tong_tien) as doanh_thu, COUNT(*) as so_don 
            FROM DonHang 
            GROUP BY time_key 
            ORDER BY time_key ASC 
            LIMIT 30
        `;
        const sqlMonthly = `
            SELECT strftime('%Y-%m', ngay_lap) as time_key, SUM(tong_tien) as doanh_thu, COUNT(*) as so_don 
            FROM DonHang 
            GROUP BY time_key 
            ORDER BY time_key ASC
        `;
        const sqlYearly = `
            SELECT strftime('%Y', ngay_lap) as time_key, SUM(tong_tien) as doanh_thu, COUNT(*) as so_don 
            FROM DonHang 
            GROUP BY time_key 
            ORDER BY time_key ASC
        `;

        db.all(sqlDaily, [], (err, daily) => {
            db.all(sqlMonthly, [], (err2, monthly) => {
                db.all(sqlYearly, [], (err3, yearly) => {
                    res.json({
                        success: true,
                        data: {
                            daily: daily || [],
                            monthly: monthly || [],
                            yearly: yearly || []
                        }
                    });
                });
            });
        });
    });
});

// Xử lý đơn hàng, trừ điểm đã dùng, giảm giá, ghi nhận công nợ và cộng điểm tích lũy mới
app.post('/api/orders', (req, res) => {
    const { ma_don, items, nhan_vien_tao, so_dien_thoai, so_tien_no, diem_su_dung } = req.body;
    if (!items || items.length === 0) return res.status(400).json({ success: false, message: 'Giỏ hàng trống!' });

    let tongTienHang = items.reduce((sum, i) => sum + (i.so_luong * i.don_gia), 0);
    
    // Quy đổi điểm dùng để giảm giá: 1 điểm = 1.000 VNĐ
    const soTienGiamGia = (diem_su_dung || 0) * 1000;
    const tongTienThucTe = Math.max(0, tongTienHang - soTienGiamGia);
    
    const ngayLap = new Date().toISOString();
    
    // Quy tắc tích điểm mới: Cứ 50.000 VNĐ tiền thực trả = 1 điểm tích lũy mới
    const diemThuongThem = Math.floor(tongTienThucTe / 50000);

    db.serialize(() => {
        db.run("BEGIN TRANSACTION");
        
        // Lưu đơn hàng với tổng tiền thực tế sau giảm giá
        db.run(`INSERT INTO DonHang (ma_don, ngay_lap, tong_tien, trang_thai, nhan_vien_tao, so_dien_thoai, so_tien_no) VALUES (?, ?, ?, 'HOAN_THANH', ?, ?, ?)`,
            [ma_don, ngayLap, tongTienThucTe, nhan_vien_tao || 'admin', so_dien_thoai || null, so_tien_no || 0]);

        // Cập nhật điểm tích lũy và dư nợ cho khách hàng
        if (so_dien_thoai) {
            db.run(`UPDATE KhachHang SET diem_tich_luy = diem_tich_luy - ? + ?, du_no = du_no + ? WHERE so_dien_thoai = ?`, 
                [diem_su_dung || 0, diemThuongThem, so_tien_no || 0, so_dien_thoai]);
        }

        items.forEach(item => {
            db.run(`INSERT INTO ChiTietDonHang (ma_don, ma_sp, so_luong, don_gia) VALUES (?, ?, ?, ?)`, [ma_don, item.ma_sp, item.so_luong, item.don_gia]);
            db.run(`UPDATE SanPham SET ton_kho = ton_kho - ? WHERE ma_sp = ?`, [item.so_luong, item.ma_sp]);
        });

        db.run("COMMIT", (err) => {
            if (err) return res.status(500).json({ success: false, error: err.message });
            res.json({ success: true, message: 'Thanh toán thành công, đã cập nhật điểm tích lũy!', ma_don });
        });
    });
});

// ==================== API XUẤT HÓA ĐƠN PDF CHUYÊN NGHIỆP ====================
app.get('/api/export-pdf/invoice/:maDon', (req, res) => {
    const maDon = req.params.maDon;

    const sqlDonHang = `
        SELECT d.*, k.ho_ten as ten_khach_hang 
        FROM DonHang d
        LEFT JOIN KhachHang k ON d.so_dien_thoai = k.so_dien_thoai
        WHERE d.ma_don = ?
    `;
    const sqlChiTiet = `
        SELECT ct.*, sp.ten_sp 
        FROM ChiTietDonHang ct
        JOIN SanPham sp ON ct.ma_sp = sp.ma_sp
        WHERE ct.ma_don = ?
    `;

    db.get(sqlDonHang, [maDon], (err, donHang) => {
        if (err || !donHang) {
            return res.status(404).json({ success: false, message: 'Không tìm thấy hóa đơn!' });
        }

        db.all(sqlChiTiet, [maDon], (err, chiTietList) => {
            const doc = new PDFDocument({ size: 'A5', margin: 25 });
            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', `inline; filename=HoaDon_${maDon}.pdf`);
            doc.pipe(res);

            const fontPath = getVietnameseFontPath();
            let hasUnicodeFont = false;
            if (fontPath) {
                doc.registerFont('VietnameseFont', fontPath);
                doc.font('VietnameseFont');
                hasUnicodeFont = true;
            } else {
                doc.font('Helvetica');
            }

            const txt = (str) => (hasUnicodeFont ? str : removeAccents(str));

            doc.fillColor('#002140').fontSize(14).text(txt('SALES PRO STORE'), { align: 'center' });
            doc.fillColor('#555555').fontSize(8.5).text(txt('Địa chỉ: 194 Giải Phóng, Phương Liệt, Thanh Xuân, Hà Nội'), { align: 'center' });
            doc.text(txt('Hotline: 0988.xxx.xxx | Website: salespro.vn'), { align: 'center' });
            doc.moveDown(0.6);

            doc.moveTo(25, doc.y).lineTo(395, doc.y).strokeColor('#002140').lineWidth(1.5).stroke();
            doc.moveDown(0.8);

            doc.fillColor('#000000').fontSize(13).text(txt('HÓA ĐƠN BÁN HÀNG'), { align: 'center' });
            doc.fillColor('#666666').fontSize(8.5);
            doc.text(`(Mã HĐ: ${donHang.ma_don})`, { align: 'center' });
            doc.moveDown(0.8);

            const infoY = doc.y;
            doc.fillColor('#333333').fontSize(9);
            
            doc.text(`${txt('Ngày lập')}: ${new Date(donHang.ngay_lap).toLocaleString('vi-VN')}`, 25, infoY);
            doc.text(`${txt('Thu ngân')}: ${txt(donHang.nhan_vien_tao)}`, 25, infoY + 13);

            if (donHang.ten_khach_hang) {
                doc.text(`${txt('Khách hàng')}: ${txt(donHang.ten_khach_hang)} (${donHang.so_dien_thoai})`, 25, infoY + 26);
            } else {
                doc.text(`${txt('Khách hàng')}: Khách lẻ`, 25, infoY + 26);
            }

            doc.moveDown(1.2);
            const tableStartY = doc.y + 10;

            doc.rect(25, tableStartY, 370, 18).fill('#f0f2f5');
            doc.fillColor('#000000').fontSize(8.5);
            doc.text(txt('STT'), 30, tableStartY + 4, { width: 25 });
            doc.text(txt('Tên sản phẩm'), 55, tableStartY + 4, { width: 160 });
            doc.text(txt('SL'), 220, tableStartY + 4, { width: 30, align: 'center' });
            doc.text(txt('Đơn giá'), 255, tableStartY + 4, { width: 65, align: 'right' });
            doc.text(txt('Thành tiền'), 325, tableStartY + 4, { width: 65, align: 'right' });

            let currentY = tableStartY + 22;

            if (chiTietList && chiTietList.length > 0) {
                chiTietList.forEach((item, index) => {
                    const thanhTien = item.so_luong * item.don_gia;
                    
                    doc.fillColor('#333333').fontSize(8.5);
                    doc.text((index + 1).toString(), 30, currentY, { width: 25 });
                    doc.text(txt(item.ten_sp), 55, currentY, { width: 160 });
                    doc.text(item.so_luong.toString(), 220, currentY, { width: 30, align: 'center' });
                    doc.text(item.don_gia.toLocaleString('vi-VN'), 255, currentY, { width: 65, align: 'right' });
                    doc.text(thanhTien.toLocaleString('vi-VN'), 325, currentY, { width: 65, align: 'right' });

                    currentY += 16;
                    doc.moveTo(25, currentY - 3).lineTo(395, currentY - 3).strokeColor('#eeeeee').lineWidth(0.5).stroke();
                });
            }

            doc.moveDown(0.8);

            const summaryY = currentY + 5;
            doc.rect(200, summaryY, 195, 50).fillAndStroke('#fafafa', '#d9d9d9');

            doc.fillColor('#000000').fontSize(9);
            doc.text(`${txt('Tổng tiền hàng')}:`, 210, summaryY + 8);
            doc.text(`${donHang.tong_tien.toLocaleString('vi-VN')} VNĐ`, 290, summaryY + 8, { width: 100, align: 'right' });

            if (donHang.so_tien_no > 0) {
                doc.fillColor('#cf1322');
                doc.text(`${txt('Tiền ghi nợ')}:`, 210, summaryY + 22);
                doc.text(`${donHang.so_tien_no.toLocaleString('vi-VN')} VNĐ`, 290, summaryY + 22, { width: 100, align: 'right' });
            } else {
                doc.fillColor('#389e0d');
                doc.text(`${txt('Thanh toán')}:`, 210, summaryY + 22);
                doc.text(`${txt('Đã thanh toán')}`, 290, summaryY + 22, { width: 100, align: 'right' });
            }

            doc.fillColor('#000000').fontSize(10);
            doc.text(`${txt('TỔNG CỘNG')}:`, 210, summaryY + 35);
            doc.fillColor('#cf1322').text(`${donHang.tong_tien.toLocaleString('vi-VN')} VNĐ`, 290, summaryY + 35, { width: 100, align: 'right' });

            const footerY = summaryY + 65;
            doc.moveTo(25, footerY).lineTo(395, footerY).strokeColor('#cccccc').lineWidth(0.5).stroke();
            doc.moveDown(0.8);

            doc.fillColor('#555555').fontSize(8.5).text(txt('Cảm ơn Quý khách đã ủng hộ cửa hàng!'), { align: 'center' });
            doc.text(txt('Hóa đơn có giá trị đổi trả trong vòng 7 ngày (kèm hóa đơn).'), { align: 'center' });

            doc.end();
        });
    });
});

app.listen(PORT, () => {
    console.log(`🚀 Server mới đang chạy tại http://localhost:${PORT}`);
});