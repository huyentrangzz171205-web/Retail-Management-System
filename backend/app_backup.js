const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const PDFDocument = require('pdfkit');
const bcrypt = require('bcrypt');

const app = express();
const PORT = 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Kết nối CSDL Bán hàng SQLite
const dbPath = path.join(__dirname, 'ql_banhang.db');
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Lỗi kết nối CSDL Bán hàng:', err.message);
    } else {
        console.log('✅ Đã kết nối cơ sở dữ liệu SQLite: ql_banhang.db');
    }
});

// Hàm hỗ trợ loại bỏ dấu tiếng Việt cho PDF
function removeAccents(str) {
    if (!str) return '';
    return str.normalize('NFD')
              .replace(/[\u0300-\u036f]/g, '')
              .replace(/đ/g, 'd').replace(/Đ/g, 'D');
}

// Lấy đường dẫn Font Unicode tiếng Việt cho PDF
function getVietnameseFontPath() {
    const customFontPath = path.join(__dirname, 'fonts', 'Roboto-Regular.ttf');
    if (fs.existsSync(customFontPath)) return customFontPath;

    const winArialPath = 'C:\\Windows\\Fonts\\arial.ttf';
    if (fs.existsSync(winArialPath)) return winArialPath;

    return null;
}

// Khởi tạo các bảng dữ liệu & Dữ liệu mẫu
db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS NguoiDung (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        tai_khoan TEXT UNIQUE,
        mat_khau TEXT,
        vai_tro TEXT,
        ho_ten TEXT
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS DanhMuc (
        ma_danh_muc TEXT PRIMARY KEY,
        ten_danh_muc TEXT NOT NULL
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS SanPham (
        ma_sp TEXT PRIMARY KEY,
        ten_sp TEXT NOT NULL,
        ma_danh_muc TEXT,
        gia_ban REAL NOT NULL,
        gia_nhap REAL,
        ton_kho INTEGER DEFAULT 0,
        FOREIGN KEY(ma_danh_muc) REFERENCES DanhMuc(ma_danh_muc)
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS DonHang (
        ma_don TEXT PRIMARY KEY,
        ngay_lap TEXT,
        tong_tien REAL,
        trang_thai TEXT,
        nhan_vien_tao TEXT,
        so_dien_thoai TEXT,
        so_tien_no REAL DEFAULT 0
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS ChiTietDonHang (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        ma_don TEXT,
        ma_sp TEXT,
        so_luong INTEGER,
        don_gia REAL,
        FOREIGN KEY(ma_don) REFERENCES DonHang(ma_don),
        FOREIGN KEY(ma_sp) REFERENCES SanPham(ma_sp)
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS NhaCungCap (
        ma_ncc TEXT PRIMARY KEY,
        ten_ncc TEXT NOT NULL,
        so_dien_thoai TEXT,
        dia_chi TEXT,
        du_no REAL DEFAULT 0
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS PhieuNhap (
        ma_phieu TEXT PRIMARY KEY,
        ma_ncc TEXT,
        ngay_nhap TEXT,
        tong_tien_nhap REAL,
        nguoi_tao TEXT,
        FOREIGN KEY(ma_ncc) REFERENCES NhaCungCap(ma_ncc)
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS ChiTietPhieuNhap (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        ma_phieu TEXT,
        ma_sp TEXT,
        so_luong_nhap INTEGER,
        gia_nhap REAL,
        FOREIGN KEY(ma_phieu) REFERENCES PhieuNhap(ma_phieu),
        FOREIGN KEY(ma_sp) REFERENCES SanPham(ma_sp)
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS KhachHang (
        so_dien_thoai TEXT PRIMARY KEY,
        ho_ten TEXT NOT NULL,
        diem_tich_luy INTEGER DEFAULT 0,
        hang_thanh_vien TEXT DEFAULT 'ThanhVien',
        du_no REAL DEFAULT 0
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS PhieuThuChi (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        loai TEXT NOT NULL,
        doi_tuong_id TEXT NOT NULL,
        so_tien REAL NOT NULL,
        ngay_giao_dich TEXT,
        ghi_chu TEXT,
        nguoi_tao TEXT
    )`);

    // Tạo dữ liệu mẫu Danh mục & Sản phẩm nếu chưa có
    db.get("SELECT COUNT(*) as count FROM SanPham", (err, row) => {
        if (!row || row.count === 0) {
            db.run(`INSERT OR IGNORE INTO DanhMuc (ma_danh_muc, ten_danh_muc) VALUES 
                ('DM01', 'Đồ Điện Tử & Gadgets'),
                ('DM02', 'Thời Trang Nam/Nữ'),
                ('DM03', 'Đồ Gia Dụng')
            `);

            db.run(`INSERT INTO SanPham (ma_sp, ten_sp, ma_danh_muc, gia_ban, gia_nhap, ton_kho) VALUES 
                ('SP001', 'Laptop Gaming Alpha X', 'DM01', 25000000, 21000000, 15),
                ('SP002', 'Tai nghe Bluetooth Pro', 'DM01', 1200000, 800000, 50),
                ('SP003', 'Áo khoác dù chống nước', 'DM02', 450000, 250000, 100),
                ('SP004', 'Nồi chiên không dầu Smart', 'DM03', 1800000, 1300000, 20)
            `, () => {
                console.log('🌱 Đã nạp dữ liệu mẫu sản phẩm vào CSDL!');
            });
        }
    });

    // Tạo khách hàng mẫu
    db.get("SELECT COUNT(*) as count FROM KhachHang", (err, row) => {
        if (!row || row.count === 0) {
            db.run(`INSERT INTO KhachHang (so_dien_thoai, ho_ten, diem_tich_luy, hang_thanh_vien, du_no) VALUES 
                ('0912345678', 'Nguyễn Văn A', 150, 'Vang', 0),
                ('0988888888', 'Trần Thị B', 450, 'KimCuong', 500000)
            `);
        }
    });
});

// ==================== API ====================
app.get('/api/categories', (req, res) => {
    db.all("SELECT * FROM DanhMuc", [], (err, rows) => {
        if (err) return res.status(500).json({ success: false, error: err.message });
        res.json({ success: true, data: rows });
    });
});

app.get('/api/products', (req, res) => {
    const sql = `
        SELECT p.*, d.ten_danh_muc 
        FROM SanPham p 
        LEFT JOIN DanhMuc d ON p.ma_danh_muc = d.ma_danh_muc
    `;
    db.all(sql, [], (err, rows) => {
        if (err) return res.status(500).json({ success: false, error: err.message });
        res.json({ success: true, data: rows });
    });
});

app.get('/api/customers', (req, res) => {
    db.all("SELECT * FROM KhachHang", [], (err, rows) => {
        if (err) return res.status(500).json({ success: false, error: err.message });
        res.json({ success: true, data: rows });
    });
});

app.post('/api/orders', (req, res) => {
    const { ma_don, items, nhan_vien_tao, so_dien_thoai, so_tien_no } = req.body; 

    if (!items || items.length === 0) {
        return res.status(400).json({ success: false, message: 'Giỏ hàng trống!' });
    }

    let tongTien = 0;
    items.forEach(item => {
        tongTien += (item.so_luong * item.don_gia);
    });

    const soTienNoThem = so_tien_no || 0;
    const ngayLap = new Date().toISOString();
    const trangThai = 'HOAN_THANH';
    const diemThuongThem = Math.floor(tongTien / 10000); 

    db.serialize(() => {
        db.run("BEGIN TRANSACTION", (err) => {
            if (err) return res.status(500).json({ success: false, error: err.message });

            const insertOrderSql = `INSERT INTO DonHang (ma_don, ngay_lap, tong_tien, trang_thai, nhan_vien_tao, so_dien_thoai, so_tien_no) VALUES (?, ?, ?, ?, ?, ?, ?)`;
            db.run(insertOrderSql, [ma_don, ngayLap, tongTien, trangThai, nhan_vien_tao || 'admin', so_dien_thoai || null, soTienNoThem], function(err) {
                if (err) {
                    db.run("ROLLBACK");
                    return res.status(500).json({ success: false, error: err.message });
                }

                if (so_dien_thoai) {
                    db.run(`UPDATE KhachHang SET diem_tich_luy = diem_tich_luy + ?, du_no = du_no + ? WHERE so_dien_thoai = ?`, [diemThuongThem, soTienNoThem, so_dien_thoai]);
                }

                let completedItems = 0;
                let hasError = false;

                items.forEach(item => {
                    const insertDetailSql = `INSERT INTO ChiTietDonHang (ma_don, ma_sp, so_luong, don_gia) VALUES (?, ?, ?, ?)`;
                    db.run(insertDetailSql, [ma_don, item.ma_sp, item.so_luong, item.don_gia], (err) => {
                        if (err) hasError = hasError || err;
                    });

                    const updateStockSql = `UPDATE SanPham SET ton_kho = ton_kho - ? WHERE ma_sp = ?`;
                    db.run(updateStockSql, [item.so_luong, item.ma_sp], (err) => {
                        if (err) hasError = hasError || err;
                        completedItems++;

                        if (completedItems === items.length) {
                            if (hasError) {
                                db.run("ROLLBACK", () => {
                                    return res.status(500).json({ success: false, message: 'Lỗi xử lý tồn kho!' });
                                });
                            } else {
                                db.run("COMMIT", (err) => {
                                    if (err) return res.status(500).json({ success: false, error: err.message });
                                    return res.json({ success: true, message: 'Thanh toán thành công!', ma_don, tong_tien: tongTien });
                                });
                            }
                        }
                    });
                });
            });
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

// Khởi chạy server độc lập
app.listen(PORT, () => {
    console.log(`🚀 POS Backend đang chạy tại http://localhost:${PORT}`);
});