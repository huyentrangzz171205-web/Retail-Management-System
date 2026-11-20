
require('dotenv').config();
const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const path = require('path');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const PDFDocument = require('pdfkit');
const app = express();
const PORT = 5000;
const JWT_SECRET = process.env.JWT_SECRET;

 // Middleware kiem tra JWT
function verifyToken(req, res, next) {
    // Lay token tu Header
    const authHeader = req.headers.authorization;

    if (!authHeader) {
        return res.status(401).json({
            success: false,
            message: 'Vui long dang nhap!'
        });
    }

    const token = authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({
            success: false,
            message: 'Token khong hop le!'
        });
    }

    // Xac thuc token
    jwt.verify(token, JWT_SECRET, (err, decoded) => {
        if (err) {
            return res.status(401).json({
                success: false,
                message: 'Token het han hoac khong hop le!'
            });
        }

        // Luu thong tin nguoi dung
        req.user = decoded;

        next();
    });
}

// Middleware kiem tra quyen ADMIN
function requireAdmin(req, res, next) {
    if (req.user.vai_tro !== 'ADMIN') {
        return res.status(403).json({
            success: false,
            message: 'Ban khong co quyen truy cap!'
        });
    }

    next();
}


// Middleware
app.use(cors());
app.use(express.json());

// Kết nối database mới
const dbPath = path.join(__dirname, 'retail_management.db');

const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Loi ket noi database:', err.message);
    } else {
        console.log('Da ket noi retail_management.db');

        // Bat khoa ngoai
        db.run('PRAGMA foreign_keys = ON');
    }
});

// API kiem tra server
app.get('/api/health', (req, res) => {
    res.json({
        success: true,
        message: 'Retail Management System Backend dang hoat dong!'
    });
});

 // API kiem tra quyen ADMIN
app.get('/api/admin/profile', verifyToken, requireAdmin, (req, res) => {
    res.json({
        success: true,
        message: 'Ban da truy cap thanh cong!',
        user: req.user
    });
});


// API dang nhap ADMIN
app.post('/api/login', (req, res) => {
    const { ten_dang_nhap, mat_khau } = req.body;

    // Kiem tra du lieu dau vao
    if (!ten_dang_nhap || !mat_khau) {
        return res.status(400).json({
            success: false,
            message: 'Vui long nhap tai khoan va mat khau!'
        });
    }

    // Tim tai khoan trong database
    const sql = `
        SELECT 
            nd.id,
            nd.ten_dang_nhap,
            nd.mat_khau,
            nd.trang_thai,
            nd.nhan_vien_id,
            vt.ten_vai_tro,
            nv.ho_ten
        FROM NguoiDung nd
        JOIN VaiTro vt ON nd.vai_tro_id = vt.id
        LEFT JOIN NhanVien nv ON nd.nhan_vien_id = nv.id
        WHERE nd.ten_dang_nhap = ?
    `;

    db.get(sql, [ten_dang_nhap], (err, user) => {
        if (err) {
            return res.status(500).json({
                success: false,
                message: 'Loi truy van database!'
            });
        }

        // Khong tim thay tai khoan
        if (!user) {
            return res.status(401).json({
                success: false,
                message: 'Tai khoan hoac mat khau khong dung!'
            });
        }

        // Kiem tra trang thai tai khoan
        if (user.trang_thai !== 1) {
            return res.status(403).json({
                success: false,
                message: 'Tai khoan da bi khoa!'
            });
        }

        // Chi cho phep ADMIN dang nhap
        if (user.ten_vai_tro !== 'ADMIN') {
            return res.status(403).json({
                success: false,
                message: 'Tai khoan khong co quyen truy cap!'
            });
        }

        // Kiem tra mat khau
        const isPasswordCorrect = bcrypt.compareSync(
            mat_khau,
            user.mat_khau
        );

        if (!isPasswordCorrect) {
            return res.status(401).json({
                success: false,
                message: 'Tai khoan hoac mat khau khong dung!'
            });
        }

        // Tao JWT
        const token = jwt.sign(
            {
                id: user.id,
                ten_dang_nhap: user.ten_dang_nhap,
                vai_tro: user.ten_vai_tro,
                nhan_vien_id: user.nhan_vien_id
            },
            JWT_SECRET,
            { expiresIn: '8h' }
        );

        // Tra ket qua dang nhap
        res.json({
            success: true,
            message: 'Dang nhap thanh cong!',
            token: token,
            user: {
                id: user.id,
                ten_dang_nhap: user.ten_dang_nhap,
                ho_ten: user.ho_ten,
                vai_tro: user.ten_vai_tro,
                nhan_vien_id: user.nhan_vien_id
            }
        });
    });
});


// API lay danh sach danh muc
app.get('/api/categories', verifyToken, requireAdmin, (req, res) => {
    const sql = `
        SELECT id, ten_danh_muc, mo_ta, trang_thai
        FROM DanhMuc
        ORDER BY id DESC
    `;

    db.all(sql, [], (err, rows) => {
        if (err) {
            return res.status(500).json({
                success: false,
                message: 'Loi khi lay danh sach danh muc!'
            });
        }

        res.json({
            success: true,
            data: rows
        });
    });
});

// API them danh muc
app.post('/api/categories', verifyToken, requireAdmin, (req, res) => {
    const { ten_danh_muc, mo_ta } = req.body;

    // Kiem tra ten danh muc
    if (!ten_danh_muc || !ten_danh_muc.trim()) {
        return res.status(400).json({
            success: false,
            message: 'Ten danh muc khong duoc de trong!'
        });
    }

    const sql = `
        INSERT INTO DanhMuc (ten_danh_muc, mo_ta)
        VALUES (?, ?)
    `;

    db.run(sql, [ten_danh_muc.trim(), mo_ta || ''], function(err) {
        if (err) {
            return res.status(500).json({
                success: false,
                message: 'Khong the them danh muc!',
                error: err.message
            });
        }

        res.status(201).json({
            success: true,
            message: 'Them danh muc thanh cong!',
            id: this.lastID
        });
    });
});

 // API sua danh muc
app.put('/api/categories/:id', verifyToken, requireAdmin, (req, res) => {
    const id = req.params.id;
    const { ten_danh_muc, mo_ta } = req.body;

    if (!ten_danh_muc || !ten_danh_muc.trim()) {
        return res.status(400).json({
            success: false,
            message: 'Ten danh muc khong duoc de trong!'
        });
    }

    const sql = `
        UPDATE DanhMuc
        SET ten_danh_muc = ?, mo_ta = ?
        WHERE id = ?
    `;

    db.run(sql, [ten_danh_muc.trim(), mo_ta || '', id], function(err) {
        if (err) {
            return res.status(500).json({
                success: false,
                message: 'Khong the sua danh muc!',
                error: err.message
            });
        }

        if (this.changes === 0) {
            return res.status(404).json({
                success: false,
                message: 'Khong tim thay danh muc!'
            });
        }

        res.json({
            success: true,
            message: 'Cap nhat danh muc thanh cong!'
        });
    });
});

 // API xoa danh muc
app.delete('/api/categories/:id', verifyToken, requireAdmin, (req, res) => {
    const id = req.params.id;

    // Kiem tra danh muc co ton tai khong
    db.get(
        'SELECT id FROM DanhMuc WHERE id = ?',
        [id],
        (err, category) => {
            if (err) {
                return res.status(500).json({
                    success: false,
                    message: 'Loi kiem tra danh muc!'
                });
            }

            if (!category) {
                return res.status(404).json({
                    success: false,
                    message: 'Khong tim thay danh muc!'
                });
            }

            // Kiem tra san pham thuoc danh muc
            db.get(
                'SELECT COUNT(*) AS total FROM SanPham WHERE danh_muc_id = ?',
                [id],
                (err, result) => {
                    if (err) {
                        return res.status(500).json({
                            success: false,
                            message: 'Loi kiem tra san pham!'
                        });
                    }

                    if (result.total > 0) {
                        return res.status(400).json({
                            success: false,
                            message: 'Khong the xoa danh muc dang co san pham!'
                        });
                    }

                    // Tien hanh xoa danh muc
                    db.run(
                        'DELETE FROM DanhMuc WHERE id = ?',
                        [id],
                        function(err) {
                            if (err) {
                                return res.status(500).json({
                                    success: false,
                                    message: 'Khong the xoa danh muc!'
                                });
                            }

                            res.json({
                                success: true,
                                message: 'Xoa danh muc thanh cong!'
                            });
                        }
                    );
                }
            );
        }
    );
});

 // API lay danh sach san pham

 // API lay danh sach, tim kiem va loc san pham
app.get('/api/products', verifyToken, requireAdmin, (req, res) => {
    const { keyword, danh_muc_id, trang_thai } = req.query;

    let sql = `
        SELECT
            sp.id,
            sp.ma_sp,
            sp.ma_vach,
            sp.ten_sp,
            sp.danh_muc_id,
            dm.ten_danh_muc,
            sp.don_vi_tinh,
            sp.gia_nhap,
            sp.gia_ban,
            sp.ton_kho,
            sp.ton_kho_toi_thieu,
            sp.mo_ta,
            sp.trang_thai
        FROM SanPham sp
        LEFT JOIN DanhMuc dm ON sp.danh_muc_id = dm.id
        WHERE 1 = 1
    `;

    const params = [];

    // Tim kiem theo ma, ma vach va ten san pham
    if (keyword && keyword.trim()) {
        sql += `
            AND (
                sp.ma_sp LIKE ?
                OR sp.ma_vach LIKE ?
                OR sp.ten_sp LIKE ?
            )
        `;

        const searchValue = '%' + keyword.trim() + '%';
        params.push(searchValue, searchValue, searchValue);
    }

    // Loc theo danh muc
    if (danh_muc_id !== undefined && danh_muc_id !== '') {
        if (!Number.isInteger(Number(danh_muc_id)) ||
            Number(danh_muc_id) <= 0) {
            return res.status(400).json({
                success: false,
                message: 'Ma danh muc khong hop le!'
            });
        }

        sql += ' AND sp.danh_muc_id = ?';
        params.push(Number(danh_muc_id));
    }

    // Loc theo trang thai
    if (trang_thai !== undefined && trang_thai !== '') {
        if (trang_thai !== '0' && trang_thai !== '1') {
            return res.status(400).json({
                success: false,
                message: 'Trang thai khong hop le!'
            });
        }

        sql += ' AND sp.trang_thai = ?';
        params.push(Number(trang_thai));
    }

    sql += ' ORDER BY sp.id DESC';

    db.all(sql, params, (err, rows) => {
        if (err) {
            return res.status(500).json({
                success: false,
                message: 'Loi khi lay danh sach san pham!',
                error: err.message
            });
        }

        const products = rows.map(sp => ({
            ...sp,
            canh_bao_ton_kho:
                sp.ton_kho <= sp.ton_kho_toi_thieu
        }));

        res.json({
            success: true,
            total: products.length,
            data: products
        });
    });
});

 // API them san pham
app.post('/api/products', verifyToken, requireAdmin, (req, res) => {
    const {
        ma_sp,
        ma_vach,
        ten_sp,
        danh_muc_id,
        don_vi_tinh,
        gia_nhap,
        gia_ban,
        mo_ta
    } = req.body;

    // Kiem tra thong tin bat buoc
    if (!ma_sp || !ma_sp.trim() || !ten_sp || !ten_sp.trim()) {
        return res.status(400).json({
            success: false,
            message: 'Ma san pham va ten san pham khong duoc de trong!'
        });
    }

    // Kiem tra gia
    if (
        gia_nhap == null || gia_ban == null ||
        !Number.isFinite(Number(gia_nhap)) ||
        !Number.isFinite(Number(gia_ban)) ||
        Number(gia_nhap) < 0 || Number(gia_ban) < 0
    ) {
        return res.status(400).json({
            success: false,
            message: 'Gia nhap va gia ban phai la so khong am!'
        });
    }

    if (!danh_muc_id || !don_vi_tinh || !don_vi_tinh.trim()) {
        return res.status(400).json({
            success: false,
            message: 'Vui long chon danh muc va don vi tinh!'
        });
    }

    // Kiem tra danh muc ton tai
    db.get(
        'SELECT id FROM DanhMuc WHERE id = ?',
        [danh_muc_id],
        (err, category) => {
            if (err) {
                return res.status(500).json({
                    success: false,
                    message: 'Loi kiem tra danh muc!'
                });
            }

            if (!category) {
                return res.status(400).json({
                    success: false,
                    message: 'Danh muc khong ton tai!'
                });
            }

            const sql = `
                INSERT INTO SanPham (
                    ma_sp, ma_vach, ten_sp, danh_muc_id,
                    don_vi_tinh, gia_nhap, gia_ban,
                    ton_kho, mo_ta
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?)
            `;

            db.run(sql, [
                ma_sp.trim(),
                ma_vach || null,
                ten_sp.trim(),
                danh_muc_id,
                don_vi_tinh.trim(),
                Number(gia_nhap),
                Number(gia_ban),
                mo_ta || ''
            ], function(err) {
                if (err) {
                    return res.status(400).json({
                        success: false,
                        message: 'Khong the them san pham!',
                        error: err.message
                    });
                }

                res.status(201).json({
                    success: true,
                    message: 'Them san pham thanh cong!',
                    id: this.lastID
                });
            });
        }
    );
});

 // API sua san pham
app.put('/api/products/:id', verifyToken, requireAdmin, (req, res) => {
    const id = req.params.id;

    const {
        ma_sp,
        ma_vach,
        ten_sp,
        danh_muc_id,
        don_vi_tinh,
        gia_nhap,
        gia_ban,
        mo_ta
    } = req.body;

    // Kiem tra thong tin bat buoc
    if (
        !ma_sp || !ma_sp.trim() ||
        !ten_sp || !ten_sp.trim()
    ) {
        return res.status(400).json({
            success: false,
            message: 'Ma san pham va ten san pham khong duoc de trong!'
        });
    }

    // Kiem tra gia
    if (
        gia_nhap == null || gia_ban == null ||
        !Number.isFinite(Number(gia_nhap)) ||
        !Number.isFinite(Number(gia_ban)) ||
        Number(gia_nhap) < 0 || Number(gia_ban) < 0
    ) {
        return res.status(400).json({
            success: false,
            message: 'Gia nhap va gia ban phai la so khong am!'
        });
    }

    if (
        !danh_muc_id ||
        !Number.isInteger(Number(danh_muc_id)) ||
        !don_vi_tinh || !don_vi_tinh.trim()
    ) {
        return res.status(400).json({
            success: false,
            message: 'Danh muc va don vi tinh khong hop le!'
        });
    }

    // Kiem tra san pham co ton tai
    db.get(
        'SELECT id FROM SanPham WHERE id = ?',
        [id],
        (err, product) => {
            if (err) {
                return res.status(500).json({
                    success: false,
                    message: 'Loi kiem tra san pham!'
                });
            }

            if (!product) {
                return res.status(404).json({
                    success: false,
                    message: 'Khong tim thay san pham!'
                });
            }

            // Kiem tra danh muc
            db.get(
                'SELECT id FROM DanhMuc WHERE id = ?',
                [danh_muc_id],
                (err, category) => {
                    if (err) {
                        return res.status(500).json({
                            success: false,
                            message: 'Loi kiem tra danh muc!'
                        });
                    }

                    if (!category) {
                        return res.status(400).json({
                            success: false,
                            message: 'Danh muc khong ton tai!'
                        });
                    }

                    // Cap nhat thong tin san pham
                    const sql = `
                        UPDATE SanPham
                        SET
                            ma_sp = ?,
                            ma_vach = ?,
                            ten_sp = ?,
                            danh_muc_id = ?,
                            don_vi_tinh = ?,
                            gia_nhap = ?,
                            gia_ban = ?,
                            mo_ta = ?
                        WHERE id = ?
                    `;

                    db.run(sql, [
                        ma_sp.trim(),
                        ma_vach || null,
                        ten_sp.trim(),
                        Number(danh_muc_id),
                        don_vi_tinh.trim(),
                        Number(gia_nhap),
                        Number(gia_ban),
                        mo_ta || '',
                        id
                    ], function(err) {
                        if (err) {
                            return res.status(400).json({
                                success: false,
                                message: 'Khong the cap nhat san pham!',
                                error: err.message
                            });
                        }

                        res.json({
                            success: true,
                            message: 'Cap nhat san pham thanh cong!'
                        });
                    });
                }
            );
        }
    );
});

 // API xoa san pham
app.delete('/api/products/:id', verifyToken, requireAdmin, (req, res) => {
    const id = req.params.id;

    // Kiem tra san pham ton tai
    db.get(
        'SELECT id FROM SanPham WHERE id = ?',
        [id],
        (err, product) => {
            if (err) {
                return res.status(500).json({
                    success: false,
                    message: 'Loi kiem tra san pham!'
                });
            }

            if (!product) {
                return res.status(404).json({
                    success: false,
                    message: 'Khong tim thay san pham!'
                });
            }

            // Kiem tra lich su ban hang
            db.get(
                'SELECT COUNT(*) AS total FROM ChiTietDonHang WHERE san_pham_id = ?',
                [id],
                (err, sales) => {
                    if (err) {
                        return res.status(500).json({
                            success: false,
                            message: 'Loi kiem tra lich su ban hang!'
                        });
                    }

                    // Kiem tra lich su nhap hang
                    db.get(
                        'SELECT COUNT(*) AS total FROM ChiTietPhieuNhap WHERE san_pham_id = ?',
                        [id],
                        (err, imports) => {
                            if (err) {
                                return res.status(500).json({
                                    success: false,
                                    message: 'Loi kiem tra lich su nhap hang!'
                                });
                            }

                            if (sales.total > 0 || imports.total > 0) {
                                return res.status(400).json({
                                    success: false,
                                    message: 'San pham da phat sinh giao dich, khong the xoa!'
                                });
                            }

                            // Kiem tra lich su kho
                            db.get(
                                'SELECT COUNT(*) AS total FROM LichSuKho WHERE san_pham_id = ?',
                                [id],
                                (err, history) => {
                                    if (err) {
                                        return res.status(500).json({
                                            success: false,
                                            message: 'Loi kiem tra lich su kho!'
                                        });
                                    }

                                    if (history.total > 0) {
                                        return res.status(400).json({
                                            success: false,
                                            message: 'San pham da co lich su kho, khong the xoa!'
                                        });
                                    }

                                    // Tien hanh xoa
                                    db.run(
                                        'DELETE FROM SanPham WHERE id = ?',
                                        [id],
                                        function(err) {
                                            if (err) {
                                                return res.status(500).json({
                                                    success: false,
                                                    message: 'Khong the xoa san pham!',
                                                    error: err.message
                                                });
                                            }

                                            res.json({
                                                success: true,
                                                message: 'Xoa san pham thanh cong!'
                                            });
                                        }
                                    );
                                }
                            );
                        }
                    );
                }
            );
        }
    );
});

 // API ngung kinh doanh san pham
app.put('/api/products/:id/stop-selling', verifyToken, requireAdmin, (req, res) => {
    const id = req.params.id;

    const sql = `
        UPDATE SanPham
        SET trang_thai = 0
        WHERE id = ?
    `;

    db.run(sql, [id], function(err) {
        if (err) {
            return res.status(500).json({
                success: false,
                message: 'Khong the ngung kinh doanh san pham!'
            });
        }

        if (this.changes === 0) {
            return res.status(404).json({
                success: false,
                message: 'Khong tim thay san pham!'
            });
        }

        res.json({
            success: true,
            message: 'Da ngung kinh doanh san pham!'
        });
    });
});


 // API lay danh sach nha cung cap
app.get('/api/suppliers', verifyToken, requireAdmin, (req, res) => {
    const sql = `
        SELECT
            id,
            ten_ncc,
            so_dien_thoai,
            email,
            dia_chi,
            trang_thai
        FROM NhaCungCap
        ORDER BY id DESC
    `;

    db.all(sql, [], (err, rows) => {
        if (err) {
            return res.status(500).json({
                success: false,
                message: 'Loi khi lay danh sach nha cung cap!',
                error: err.message
            });
        }

        res.json({
            success: true,
            total: rows.length,
            data: rows
        });
    });
});

 // API them nha cung cap
app.post('/api/suppliers', verifyToken, requireAdmin, (req, res) => {
    const { ten_ncc, so_dien_thoai, email, dia_chi } = req.body;

    if (!ten_ncc || !ten_ncc.trim()) {
        return res.status(400).json({
            success: false,
            message: 'Ten nha cung cap khong duoc de trong!'
        });
    }

    const sql = `
        INSERT INTO NhaCungCap
        (ten_ncc, so_dien_thoai, email, dia_chi, trang_thai)
        VALUES (?, ?, ?, ?, 1)
    `;

    db.run(sql, [
        ten_ncc.trim(),
        so_dien_thoai || null,
        email || null,
        dia_chi || null
    ], function(err) {
        if (err) {
            return res.status(500).json({
                success: false,
                message: 'Loi khi them nha cung cap!',
                error: err.message
            });
        }

        res.json({
            success: true,
            message: 'Them nha cung cap thanh cong!',
            id: this.lastID
        });
    });
});

 // API cap nhat nha cung cap
app.put('/api/suppliers/:id', verifyToken, requireAdmin, (req, res) => {
    const id = req.params.id;
    const { ten_ncc, so_dien_thoai, email, dia_chi } = req.body;

    if (!ten_ncc || !ten_ncc.trim()) {
        return res.status(400).json({
            success: false,
            message: 'Ten nha cung cap khong duoc de trong!'
        });
    }

    const sql = `
        UPDATE NhaCungCap
        SET ten_ncc = ?, so_dien_thoai = ?, email = ?, dia_chi = ?
        WHERE id = ?
    `;

    db.run(sql, [
        ten_ncc.trim(),
        so_dien_thoai || null,
        email || null,
        dia_chi || null,
        id
    ], function(err) {
        if (err) {
            return res.status(500).json({
                success: false,
                message: 'Loi khi cap nhat nha cung cap!',
                error: err.message
            });
        }

        if (this.changes === 0) {
            return res.status(404).json({
                success: false,
                message: 'Khong tim thay nha cung cap!'
            });
        }

        res.json({
            success: true,
            message: 'Cap nhat nha cung cap thanh cong!'
        });
    });
});

 // API ngung hoat dong nha cung cap
app.put('/api/suppliers/:id/stop', verifyToken, requireAdmin, (req, res) => {
    const id = req.params.id;

    const sql = `
        UPDATE NhaCungCap
        SET trang_thai = 0
        WHERE id = ?
    `;

    db.run(sql, [id], function(err) {
        if (err) {
            return res.status(500).json({
                success: false,
                message: 'Loi khi ngung hoat dong nha cung cap!',
                error: err.message
            });
        }

        if (this.changes === 0) {
            return res.status(404).json({
                success: false,
                message: 'Khong tim thay nha cung cap!'
            });
        }

        res.json({
            success: true,
            message: 'Da ngung hoat dong nha cung cap!'
        });
    });
});

 // API lay danh sach phieu nhap
app.get('/api/imports', verifyToken, requireAdmin, (req, res) => {
    const sql = `
        SELECT
            pn.id,
            pn.ma_phieu,
            pn.nha_cung_cap_id,
            ncc.ten_ncc,
            pn.nhan_vien_id,
            nv.ho_ten,
            pn.ngay_nhap,
            pn.tong_tien,
            pn.trang_thai,
            pn.ghi_chu
        FROM PhieuNhap pn
        JOIN NhaCungCap ncc ON pn.nha_cung_cap_id = ncc.id
        JOIN NhanVien nv ON pn.nhan_vien_id = nv.id
        ORDER BY pn.id DESC
    `;

    db.all(sql, [], (err, rows) => {
        if (err) {
            return res.status(500).json({
                success: false,
                message: 'Loi khi lay danh sach phieu nhap!',
                error: err.message
            });
        }

        res.json({
            success: true,
            total: rows.length,
            data: rows
        });
    });
});

 // API tao phieu nhap hang
app.post('/api/imports', verifyToken, requireAdmin, (req, res) => {
    const { nha_cung_cap_id, ghi_chu } = req.body;

    // Kiem tra nha cung cap
    if (!nha_cung_cap_id ||
        !Number.isInteger(Number(nha_cung_cap_id))) {
        return res.status(400).json({
            success: false,
            message: 'Nha cung cap khong hop le!'
        });
    }

    // Lay nhan vien dang dang nhap
    const nhan_vien_id = req.user.nhan_vien_id;

    if (!nhan_vien_id) {
        return res.status(400).json({
            success: false,
            message: 'Tai khoan chua duoc lien ket voi nhan vien!'
        });
    }

    // Kiem tra nha cung cap co hoat dong khong
    db.get(
        'SELECT id FROM NhaCungCap WHERE id = ? AND trang_thai = 1',
        [Number(nha_cung_cap_id)],
        (err, supplier) => {
            if (err) {
                return res.status(500).json({
                    success: false,
                    message: 'Loi kiem tra nha cung cap!'
                });
            }

            if (!supplier) {
                return res.status(400).json({
                    success: false,
                    message: 'Nha cung cap khong ton tai hoac da ngung hoat dong!'
                });
            }

            // Tao ma phieu nhap
            const ma_phieu = 'PN' + Date.now();

            const sql = `
                INSERT INTO PhieuNhap (
                    ma_phieu,
                    nha_cung_cap_id,
                    nhan_vien_id,
                    tong_tien,
                    trang_thai,
                    ghi_chu
                )
                VALUES (?, ?, ?, 0, 'CHO_NHAP', ?)
            `;

            db.run(sql, [
                ma_phieu,
                Number(nha_cung_cap_id),
                nhan_vien_id,
                ghi_chu || null
            ], function(err) {
                if (err) {
                    return res.status(500).json({
                        success: false,
                        message: 'Khong the tao phieu nhap!',
                        error: err.message
                    });
                }

                res.status(201).json({
                    success: true,
                    message: 'Tao phieu nhap thanh cong!',
                    id: this.lastID,
                    ma_phieu: ma_phieu
                });
            });
        }
    );
});

 // API them san pham vao phieu nhap
app.post('/api/imports/:id/details', verifyToken, requireAdmin, (req, res) => {
    const phieu_nhap_id = req.params.id;
    const { san_pham_id, so_luong, don_gia_nhap } = req.body;

    // Kiem tra du lieu dau vao
    if (
        !Number.isInteger(Number(phieu_nhap_id)) ||
        Number(phieu_nhap_id) <= 0 ||
        !Number.isInteger(Number(san_pham_id)) ||
        Number(san_pham_id) <= 0 ||
        !Number.isInteger(Number(so_luong)) ||
        Number(so_luong) <= 0 ||
        !Number.isFinite(Number(don_gia_nhap)) ||
        Number(don_gia_nhap) < 0
    ) {
        return res.status(400).json({
            success: false,
            message: 'Thong tin san pham nhap khong hop le!'
        });
    }

    // Kiem tra phieu nhap
    db.get(
        'SELECT id, trang_thai FROM PhieuNhap WHERE id = ?',
        [phieu_nhap_id],
        (err, importBill) => {
            if (err) {
                return res.status(500).json({
                    success: false,
                    message: 'Loi kiem tra phieu nhap!'
                });
            }

            if (!importBill) {
                return res.status(404).json({
                    success: false,
                    message: 'Khong tim thay phieu nhap!'
                });
            }

            if (importBill.trang_thai !== 'CHO_NHAP') {
                return res.status(400).json({
                    success: false,
                    message: 'Phieu nhap khong o trang thai cho nhap!'
                });
            }

            // Kiem tra san pham
            db.get(
                'SELECT id FROM SanPham WHERE id = ? AND trang_thai = 1',
                [san_pham_id],
                (err, product) => {
                    if (err) {
                        return res.status(500).json({
                            success: false,
                            message: 'Loi kiem tra san pham!'
                        });
                    }

                    if (!product) {
                        return res.status(404).json({
                            success: false,
                            message: 'San pham khong ton tai hoac da ngung kinh doanh!'
                        });
                    }

                    const thanh_tien =
                        Number(so_luong) * Number(don_gia_nhap);

                    // Them chi tiet phieu nhap
                    const sql = `
                        INSERT INTO ChiTietPhieuNhap (
                            phieu_nhap_id,
                            san_pham_id,
                            so_luong,
                            don_gia_nhap,
                            thanh_tien
                        )
                        VALUES (?, ?, ?, ?, ?)
                    `;

                    db.run(sql, [
                        phieu_nhap_id,
                        san_pham_id,
                        so_luong,
                        don_gia_nhap,
                        thanh_tien
                    ], function(err) {
                        if (err) {
                            return res.status(400).json({
                                success: false,
                                message: 'Khong the them san pham vao phieu nhap. Co the san pham da ton tai trong phieu!',
                                error: err.message
                            });
                        }

                        // Cap nhat tong tien phieu nhap
                        db.run(`
                            UPDATE PhieuNhap
                            SET tong_tien = (
                                SELECT SUM(thanh_tien)
                                FROM ChiTietPhieuNhap
                                WHERE phieu_nhap_id = ?
                            )
                            WHERE id = ?
                        `, [phieu_nhap_id, phieu_nhap_id], function(err) {
                            if (err) {
                                return res.status(500).json({
                                    success: false,
                                    message: 'Da them san pham nhung loi cap nhat tong tien!',
                                    error: err.message
                                });
                            }

                            res.status(201).json({
                                success: true,
                                message: 'Them san pham vao phieu nhap thanh cong!',
                                thanh_tien: thanh_tien
                            });
                        });
                    });
                }
            );
        }
    );
});

 // API xem chi tiet phieu nhap
app.get('/api/imports/:id/details', verifyToken, requireAdmin, (req, res) => {
    const id = req.params.id;

    const sql = `
        SELECT
            ct.id,
            ct.phieu_nhap_id,
            ct.san_pham_id,
            sp.ma_sp,
            sp.ten_sp,
            sp.don_vi_tinh,
            ct.so_luong,
            ct.don_gia_nhap,
            ct.thanh_tien
        FROM ChiTietPhieuNhap ct
        JOIN SanPham sp ON ct.san_pham_id = sp.id
        WHERE ct.phieu_nhap_id = ?
        ORDER BY ct.id DESC
    `;

    db.all(sql, [id], (err, rows) => {
        if (err) {
            return res.status(500).json({
                success: false,
                message: 'Loi khi lay chi tiet phieu nhap!',
                error: err.message
            });
        }

        res.json({
            success: true,
            total: rows.length,
            data: rows
        });
    });
});

 // API xac nhan nhap hang va cap nhat ton kho
app.put('/api/imports/:id/confirm', verifyToken, requireAdmin, (req, res) => {
    const id = Number(req.params.id);

    if (!Number.isInteger(id) || id <= 0) {
        return res.status(400).json({
            success: false,
            message: 'Ma phieu nhap khong hop le!'
        });
    }

    // Bat dau giao dich database
    db.run('BEGIN IMMEDIATE TRANSACTION', (err) => {
        if (err) {
            return res.status(500).json({
                success: false,
                message: 'Khong the bat dau giao dich!'
            });
        }

        // Ham hoan tac neu co loi
        function rollback(status, message, error = null) {
            db.run('ROLLBACK', () => {
                res.status(status).json({
                    success: false,
                    message: message,
                    ...(error ? { error: error.message } : {})
                });
            });
        }

        // Kiem tra phieu nhap
        db.get(
            'SELECT * FROM PhieuNhap WHERE id = ?',
            [id],
            (err, importBill) => {
                if (err) {
                    return rollback(500, 'Loi kiem tra phieu nhap!', err);
                }

                if (!importBill) {
                    return rollback(404, 'Khong tim thay phieu nhap!');
                }

                if (importBill.trang_thai !== 'CHO_NHAP') {
                    return rollback(400, 'Phieu nhap khong o trang thai cho nhap!');
                }

                // Lay danh sach san pham trong phieu
                db.all(
                    'SELECT * FROM ChiTietPhieuNhap WHERE phieu_nhap_id = ?',
                    [id],
                    (err, details) => {
                        if (err) {
                            return rollback(500, 'Loi lay chi tiet phieu nhap!', err);
                        }

                        if (details.length === 0) {
                            return rollback(400, 'Phieu nhap chua co san pham!');
                        }

                        let index = 0;

                        // Xu ly tung san pham trong phieu
                        function processNextProduct() {
                            if (index >= details.length) {
                                // Cap nhat trang thai phieu nhap
                                db.run(
                                    `UPDATE PhieuNhap
                                     SET trang_thai = 'DA_NHAP'
                                     WHERE id = ?`,
                                    [id],
                                    function(err) {
                                        if (err) {
                                            return rollback(500, 'Loi cap nhat trang thai phieu!', err);
                                        }

                                        // Hoan tat giao dich
                                        db.run('COMMIT', (err) => {
                                            if (err) {
                                                return rollback(500, 'Loi hoan tat giao dich!', err);
                                            }

                                            res.json({
                                                success: true,
                                                message: 'Xac nhan nhap hang thanh cong!',
                                                ma_phieu: importBill.ma_phieu,
                                                tong_tien: importBill.tong_tien,
                                                so_san_pham: details.length
                                            });
                                        });
                                    }
                                );

                                return;
                            }

                            const item = details[index];

                            // Lay ton kho truoc khi nhap
                            db.get(
                                'SELECT ton_kho FROM SanPham WHERE id = ?',
                                [item.san_pham_id],
                                (err, product) => {
                                    if (err) {
                                        return rollback(500, 'Loi kiem tra ton kho!', err);
                                    }

                                    if (!product) {
                                        return rollback(400, 'Khong tim thay san pham trong kho!');
                                    }

                                    const ton_truoc = product.ton_kho;
                                    const ton_sau = ton_truoc + item.so_luong;

                                    // Tang ton kho
                                    db.run(
                                        `UPDATE SanPham
                                         SET ton_kho = ?
                                         WHERE id = ?`,
                                        [ton_sau, item.san_pham_id],
                                        function(err) {
                                            if (err) {
                                                return rollback(500, 'Loi cap nhat ton kho!', err);
                                            }

                                            // Ghi lich su kho
                                            db.run(
                                                `INSERT INTO LichSuKho (
                                                    san_pham_id,
                                                    loai_giao_dich,
                                                    so_luong,
                                                    ton_truoc,
                                                    ton_sau,
                                                    loai_chung_tu,
                                                    chung_tu_id,
                                                    nguoi_thuc_hien,
                                                    ghi_chu
                                                )
                                                VALUES (?, 'NHAP', ?, ?, ?, 'PHIEU_NHAP', ?, ?, ?)`,
                                                [
                                                    item.san_pham_id,
                                                    item.so_luong,
                                                    ton_truoc,
                                                    ton_sau,
                                                    id,
                                                    req.user.id,
                                                    'Nhap hang theo phieu ' + importBill.ma_phieu
                                                ],
                                                function(err) {
                                                    if (err) {
                                                        return rollback(500, 'Loi ghi lich su kho!', err);
                                                    }

                                                    index++;
                                                    processNextProduct();
                                                }
                                            );
                                        }
                                    );
                                }
                            );
                        }

                        processNextProduct();
                    }
                );
            }
        );
    });
});
// ==================== QUAN LY DON HANG ====================

// API tao don hang moi
app.post('/api/orders', verifyToken, requireAdmin, (req, res) => {
    const { khach_hang_id, ghi_chu } = req.body;

    // Kiem tra khach hang neu co truyen len
    if (khach_hang_id) {
        db.get(
            'SELECT id FROM KhachHang WHERE id = ? AND trang_thai = ?',
            [khach_hang_id, 1],
            (err, customer) => {
                if (err) {
                    return res.status(500).json({
                        success: false,
                        message: 'Loi kiem tra khach hang!'
                    });
                }

                if (!customer) {
                    return res.status(400).json({
                        success: false,
                        message: 'Khach hang khong ton tai hoac da ngung hoat dong!'
                    });
                }

                taoDonHang();
            }
        );
    } else {
        taoDonHang();
    }

    // Ham tao don hang
    function taoDonHang() {
        const ma_don = 'DH' + Date.now();

        const sql = `
            INSERT INTO DonHang (
                ma_don,
                khach_hang_id,
                nhan_vien_id,
                ngay_lap,
                tong_tien_hang,
                giam_gia,
                tong_thanh_toan,
                trang_thai,
                ghi_chu
            )
            VALUES (?, ?, ?, datetime('now', 'localtime'), 0, 0, 0, 'CHO_THANH_TOAN', ?)
        `;

        db.run(
            sql,
            [
                ma_don,
                khach_hang_id || null,
                req.user.nhan_vien_id,
                ghi_chu || null
            ],
            function(err) {
                if (err) {
                    console.error('Loi tao don hang:', err.message);

                    return res.status(500).json({
                        success: false,
                        message: 'Khong the tao don hang!'
                    });
                }

                res.status(201).json({
                    success: true,
                    message: 'Tao don hang thanh cong!',
                    data: {
                        id: this.lastID,
                        ma_don: ma_don,
                        khach_hang_id: khach_hang_id || null,
                        trang_thai: 'CHO_THANH_TOAN'
                    }
                });
            }
        );
    }
});
// API them san pham vao don hang
app.post('/api/orders/:id/details', verifyToken, requireAdmin, (req, res) => {
    const don_hang_id = req.params.id;
    const { san_pham_id, so_luong, giam_gia } = req.body;

    // Kiem tra du lieu dau vao
    if (!san_pham_id || !Number.isInteger(so_luong) || so_luong <= 0) {
        return res.status(400).json({
            success: false,
            message: 'Vui long chon san pham va nhap so luong hop le!'
        });
    }

    const tien_giam = giam_gia || 0;

    if (!Number.isInteger(tien_giam) || tien_giam < 0) {
        return res.status(400).json({
            success: false,
            message: 'Giam gia khong hop le!'
        });
    }

    // Kiem tra don hang
    db.get(
        'SELECT * FROM DonHang WHERE id = ? AND trang_thai = ?',
        [don_hang_id, 'CHO_THANH_TOAN'],
        (err, donHang) => {
            if (err) {
                return res.status(500).json({
                    success: false,
                    message: 'Loi kiem tra don hang!'
                });
            }

            if (!donHang) {
                return res.status(404).json({
                    success: false,
                    message: 'Don hang khong ton tai hoac khong con cho thanh toan!'
                });
            }

            // Lay thong tin san pham
            db.get(
                'SELECT * FROM SanPham WHERE id = ? AND trang_thai = ?',
                [san_pham_id, 1],
                (err, sanPham) => {
                    if (err) {
                        return res.status(500).json({
                            success: false,
                            message: 'Loi kiem tra san pham!'
                        });
                    }

                    if (!sanPham) {
                        return res.status(404).json({
                            success: false,
                            message: 'San pham khong ton tai hoac da ngung kinh doanh!'
                        });
                    }

                    const don_gia = sanPham.gia_ban;
                    const thanh_tien = so_luong * don_gia - tien_giam;

                    if (tien_giam > so_luong * don_gia) {
                        return res.status(400).json({
                            success: false,
                            message: 'Giam gia khong duoc lon hon tien hang!'
                        });
                    }

                    // Kiem tra san pham da co trong don hang chua
                    db.get(
                        'SELECT * FROM ChiTietDonHang WHERE don_hang_id = ? AND san_pham_id = ?',
                        [don_hang_id, san_pham_id],
                        (err, chiTiet) => {
                            if (err) {
                                return res.status(500).json({
                                    success: false,
                                    message: 'Loi kiem tra chi tiet don hang!'
                                });
                            }

                            if (chiTiet) {
                                return res.status(400).json({
                                    success: false,
                                    message: 'San pham da co trong don hang!'
                                });
                            }

                            // Them chi tiet don hang
                            const sql = `
                                INSERT INTO ChiTietDonHang (
                                    don_hang_id,
                                    san_pham_id,
                                    ten_sp,
                                    so_luong,
                                    don_gia,
                                    giam_gia,
                                    thanh_tien
                                )
                                VALUES (?, ?, ?, ?, ?, ?, ?)
                            `;

                            db.run(
                                sql,
                                [
                                    don_hang_id,
                                    san_pham_id,
                                    sanPham.ten_sp,
                                    so_luong,
                                    don_gia,
                                    tien_giam,
                                    thanh_tien
                                ],
                                function(err) {
                                    if (err) {
                                        console.error('Loi them san pham:', err.message);

                                        return res.status(500).json({
                                            success: false,
                                            message: 'Khong the them san pham vao don hang!'
                                        });
                                    }

                                    // Cap nhat tong tien don hang
                                    db.run(
                                        `UPDATE DonHang
                                         SET tong_tien_hang = (
                                             SELECT COALESCE(SUM(so_luong * don_gia), 0)
                                             FROM ChiTietDonHang
                                             WHERE don_hang_id = ?
                                         ),
                                         giam_gia = (
                                             SELECT COALESCE(SUM(giam_gia), 0)
                                             FROM ChiTietDonHang
                                             WHERE don_hang_id = ?
                                         ),
                                         tong_thanh_toan = (
                                             SELECT COALESCE(SUM(thanh_tien), 0)
                                             FROM ChiTietDonHang
                                             WHERE don_hang_id = ?
                                         )
                                         WHERE id = ?`,
                                        [don_hang_id, don_hang_id, don_hang_id, don_hang_id],
                                        (err) => {
                                            if (err) {
                                                console.error('Loi cap nhat tong tien:', err.message);

                                                return res.status(500).json({
                                                    success: false,
                                                    message: 'Da them san pham nhung loi cap nhat tong tien!'
                                                });
                                            }

                                            res.status(201).json({
                                                success: true,
                                                message: 'Them san pham vao don hang thanh cong!',
                                                data: {
                                                    id: this.lastID,
                                                    don_hang_id: Number(don_hang_id),
                                                    san_pham_id: san_pham_id,
                                                    ten_sp: sanPham.ten_sp,
                                                    so_luong: so_luong,
                                                    don_gia: don_gia,
                                                    giam_gia: tien_giam,
                                                    thanh_tien: thanh_tien
                                                }
                                            });
                                        }
                                    );
                                }
                            );
                        }
                    );
                }
            );
        }
    );
});

// API su dung diem tich luy de giam gia
app.put('/api/orders/:id/use-points', verifyToken, requireAdmin, (req, res) => {
    const don_hang_id = req.params.id;
    const { diem_su_dung } = req.body;

    // Kiem tra so diem
    if (!Number.isInteger(diem_su_dung) || diem_su_dung <= 0) {
        return res.status(400).json({
            success: false,
            message: 'So diem su dung phai la so nguyen lon hon 0!'
        });
    }

    // Kiem tra don hang
    db.get(
        `SELECT * FROM DonHang
         WHERE id = ? AND trang_thai = 'CHO_THANH_TOAN'`,
        [don_hang_id],
        (err, donHang) => {
            if (err) {
                return res.status(500).json({
                    success: false,
                    message: 'Loi kiem tra don hang!'
                });
            }

            if (!donHang) {
                return res.status(404).json({
                    success: false,
                    message: 'Don hang khong ton tai hoac khong con cho thanh toan!'
                });
            }

            if (!donHang.khach_hang_id) {
                return res.status(400).json({
                    success: false,
                    message: 'Don hang khong co khach hang!'
                });
            }

            if (donHang.diem_su_dung > 0) {
                return res.status(400).json({
                    success: false,
                    message: 'Don hang da su dung diem!'
                });
            }

            // Tinh tien giam tu diem
            const giam_gia_diem = diem_su_dung * 1000;

            if (giam_gia_diem > donHang.tong_thanh_toan) {
                return res.status(400).json({
                    success: false,
                    message: 'So diem su dung vuot qua gia tri don hang!'
                });
            }

            // Kiem tra diem cua khach hang
            db.get(
                'SELECT diem_tich_luy FROM KhachHang WHERE id = ? AND trang_thai = 1',
                [donHang.khach_hang_id],
                (err, customer) => {
                    if (err) {
                        return res.status(500).json({
                            success: false,
                            message: 'Loi kiem tra diem khach hang!'
                        });
                    }

                    if (!customer) {
                        return res.status(400).json({
                            success: false,
                            message: 'Khach hang khong ton tai hoac da ngung hoat dong!'
                        });
                    }

                    if (diem_su_dung > customer.diem_tich_luy) {
                        return res.status(400).json({
                            success: false,
                            message: 'Khach hang khong du diem tich luy!'
                        });
                    }

                    // Cap nhat don hang
                    db.run(
                        `UPDATE DonHang
                         SET diem_su_dung = ?,
                             giam_gia_diem = ?,
                             tong_thanh_toan = tong_thanh_toan - ?
                         WHERE id = ?`,
                        [
                            diem_su_dung,
                            giam_gia_diem,
                            giam_gia_diem,
                            don_hang_id
                        ],
                        function(err) {
                            if (err) {
                                return res.status(500).json({
                                    success: false,
                                    message: 'Khong the cap nhat diem su dung!'
                                });
                            }

                            res.json({
                                success: true,
                                message: 'Su dung diem thanh cong!',
                                data: {
                                    don_hang_id: Number(don_hang_id),
                                    diem_su_dung: diem_su_dung,
                                    giam_gia_diem: giam_gia_diem,
                                    tong_thanh_toan: donHang.tong_thanh_toan - giam_gia_diem
                                }
                            });
                        }
                    );
                }
            );
        }
    );
});

// API xem chi tiet don hang
app.get('/api/orders/:id/details', verifyToken, requireAdmin, (req, res) => {
    const don_hang_id = req.params.id;

    // Lay thong tin don hang
    db.get(
        'SELECT * FROM DonHang WHERE id = ?',
        [don_hang_id],
        (err, donHang) => {
            if (err) {
                return res.status(500).json({
                    success: false,
                    message: 'Loi truy van don hang!'
                });
            }

            if (!donHang) {
                return res.status(404).json({
                    success: false,
                    message: 'Khong tim thay don hang!'
                });
            }

            // Lay danh sach san pham trong don hang
            db.all(
                `SELECT * FROM ChiTietDonHang
                 WHERE don_hang_id = ?
                 ORDER BY id ASC`,
                [don_hang_id],
                (err, chiTiet) => {
                    if (err) {
                        return res.status(500).json({
                            success: false,
                            message: 'Loi truy van chi tiet don hang!'
                        });
                    }

                    res.json({
                        success: true,
                        message: 'Lay chi tiet don hang thanh cong!',
                        data: {
                            don_hang: donHang,
                            chi_tiet: chiTiet
                        }
                    });
                }
            );
        }
    );
});
// API xac nhan ban hang va tru ton kho
app.put('/api/orders/:id/confirm', verifyToken, requireAdmin, (req, res) => {
    const don_hang_id = req.params.id;

    // Bat dau giao dich
    db.serialize(() => {
        db.run('BEGIN IMMEDIATE', (err) => {
            if (err) {
                return res.status(500).json({
                    success: false,
                    message: 'Khong the bat dau giao dich!'
                });
            }

            // Ham hoan tac neu co loi
            function hoanTac(message, statusCode = 400) {
                db.run('ROLLBACK', () => {
                    res.status(statusCode).json({
                        success: false,
                        message: message
                    });
                });
            }

            // Kiem tra don hang
            db.get(
                'SELECT * FROM DonHang WHERE id = ?',
                [don_hang_id],
                (err, donHang) => {
                    if (err) {
                        return hoanTac('Loi kiem tra don hang!', 500);
                    }

                    if (!donHang) {
                        return hoanTac('Khong tim thay don hang!', 404);
                    }

                    if (donHang.trang_thai !== 'CHO_THANH_TOAN') {
                        return hoanTac('Don hang khong o trang thai cho thanh toan!');
                    }

                    // Lay danh sach san pham trong don hang
                    db.all(
                        'SELECT * FROM ChiTietDonHang WHERE don_hang_id = ?',
                        [don_hang_id],
                        (err, chiTiet) => {
                            if (err) {
                                return hoanTac('Loi lay chi tiet don hang!', 500);
                            }

                            if (chiTiet.length === 0) {
                                return hoanTac('Don hang chua co san pham!');
                            }

                            // Xu ly tung san pham
                            let viTri = 0;

                            function truKhoTungSanPham() {
                                if (viTri >= chiTiet.length) {
                                    return capNhatDonHang();
                                }

                                const sanPhamDonHang = chiTiet[viTri];

                                // Kiem tra ton kho hien tai
                                db.get(
                                    'SELECT * FROM SanPham WHERE id = ?',
                                    [sanPhamDonHang.san_pham_id],
                                    (err, sanPham) => {
                                        if (err) {
                                            return hoanTac('Loi kiem tra san pham!', 500);
                                        }

                                        if (!sanPham) {
                                            return hoanTac('San pham ' + sanPhamDonHang.ten_sp + ' khong ton tai!');
                                        }

                                        if (sanPham.ton_kho < sanPhamDonHang.so_luong) {
                                            return hoanTac(
                                                'San pham ' + sanPham.ten_sp +
                                                ' khong du ton kho! Ton kho hien tai: ' +
                                                sanPham.ton_kho
                                            );
                                        }

                                        const ton_truoc = sanPham.ton_kho;
                                        const ton_sau = ton_truoc - sanPhamDonHang.so_luong;

                                        // Cap nhat ton kho
                                        db.run(
                                            `UPDATE SanPham
                                             SET ton_kho = ?
                                             WHERE id = ? AND ton_kho >= ?`,
                                            [
                                                ton_sau,
                                                sanPhamDonHang.san_pham_id,
                                                sanPhamDonHang.so_luong
                                            ],
                                            function(err) {
                                                if (err) {
                                                    return hoanTac('Loi cap nhat ton kho!', 500);
                                                }

                                                if (this.changes !== 1) {
                                                    return hoanTac('Ton kho da thay doi, vui long thu lai!');
                                                }

                                                // Ghi lich su xuat kho
                                                db.run(
                                                    `INSERT INTO LichSuKho (
                                                        san_pham_id,
                                                        loai_giao_dich,
                                                        so_luong,
                                                        ton_truoc,
                                                        ton_sau,
                                                        loai_chung_tu,
                                                        chung_tu_id,
                                                        nguoi_thuc_hien,
                                                        ngay_tao,
                                                        ghi_chu
                                                    )
                                                    VALUES (?, 'XUAT', ?, ?, ?, 'DON_HANG', ?, ?, datetime('now', 'localtime'), ?)`,
                                                    [
                                                        sanPhamDonHang.san_pham_id,
                                                        sanPhamDonHang.so_luong,
                                                        ton_truoc,
                                                        ton_sau,
                                                        don_hang_id,
                                                        req.user.id,
                                                        'Xuat kho ban hang ' + donHang.ma_don
                                                    ],
                                                    (err) => {
                                                        if (err) {
                                                            return hoanTac('Loi ghi lich su kho!', 500);
                                                        }

                                                        viTri++;
                                                        truKhoTungSanPham();
                                                    }
                                                );
                                            }
                                        );
                                    }
                                );
                            }

                            // Cap nhat trang thai don hang
                            function capNhatDonHang() {
                                db.run(
                                    `UPDATE DonHang
                                     SET trang_thai = 'HOAN_THANH'
                                     WHERE id = ? AND trang_thai = 'CHO_THANH_TOAN'`,
                                    [don_hang_id],
                                    function(err) {
                                        if (err) {
                                            return hoanTac('Loi cap nhat trang thai don hang!', 500);
                                        }

                                        if (this.changes !== 1) {
                                            return hoanTac('Khong the cap nhat trang thai don hang!');
                                        }

                                        // Hoan tat giao dich
                                        db.run('COMMIT', (err) => {
                                            if (err) {
                                                return hoanTac('Loi hoan tat giao dich!', 500);
                                            }

                                            res.json({
                                                success: true,
                                                message: 'Xac nhan ban hang thanh cong!',
                                                data: {
                                                    don_hang_id: Number(don_hang_id),
                                                    ma_don: donHang.ma_don,
                                                    tong_thanh_toan: donHang.tong_thanh_toan,
                                                    trang_thai: 'HOAN_THANH',
                                                    so_san_pham: chiTiet.length
                                                }
                                            });
                                        });
                                    }
                                );
                            }

                            // Bat dau tru kho
                            truKhoTungSanPham();
                        }
                    );
                }
            );
        });
    });
});
// ==================== THANH TOAN DON HANG ====================

// API thanh toan don hang

// API thanh toan don hang va tich diem
app.post('/api/orders/:id/payments', verifyToken, requireAdmin, (req, res) => {
    const don_hang_id = req.params.id;
    const { so_tien, phuong_thuc } = req.body;

    // Kiem tra du lieu
    if (!Number.isInteger(so_tien) || so_tien <= 0) {
        return res.status(400).json({
            success: false,
            message: 'So tien thanh toan phai lon hon 0!'
        });
    }

    if (!['TIEN_MAT', 'CHUYEN_KHOAN'].includes(phuong_thuc)) {
        return res.status(400).json({
            success: false,
            message: 'Phuong thuc thanh toan khong hop le!'
        });
    }

    // Bat dau giao dich
    db.serialize(() => {
        db.run('BEGIN IMMEDIATE', (err) => {
            if (err) {
                return res.status(500).json({
                    success: false,
                    message: 'Khong the bat dau giao dich!'
                });
            }

            // Ham hoan tac neu co loi
            function hoanTac(message, statusCode = 500) {
                db.run('ROLLBACK', () => {
                    res.status(statusCode).json({
                        success: false,
                        message: message
                    });
                });
            }

            // Kiem tra don hang
            db.get(
                'SELECT * FROM DonHang WHERE id = ? AND trang_thai != ?',
                [don_hang_id, 'HUY'],
                (err, donHang) => {
                    if (err) {
                        return hoanTac('Loi kiem tra don hang!');
                    }

                    if (!donHang) {
                        return hoanTac('Don hang khong ton tai hoac da bi huy!', 404);
                    }

                    // Tinh so tien da thanh toan
                    db.get(
                        `SELECT COALESCE(SUM(so_tien), 0) AS da_thanh_toan
                         FROM ThanhToan
                         WHERE don_hang_id = ?
                         AND trang_thai = 'THANH_CONG'`,
                        [don_hang_id],
                        (err, ketQua) => {
                            if (err) {
                                return hoanTac('Loi kiem tra thanh toan!');
                            }

                            const da_thanh_toan = ketQua.da_thanh_toan;
                            const con_phai_tra = donHang.tong_thanh_toan - da_thanh_toan;

                            if (con_phai_tra <= 0) {
                                return hoanTac('Don hang da duoc thanh toan day du!', 400);
                            }

                            if (so_tien > con_phai_tra) {
                                return hoanTac('So tien thanh toan vuot qua so tien con phai tra!', 400);
                            }

                            // Luu thanh toan
                            db.run(
                                `INSERT INTO ThanhToan (
                                    don_hang_id,
                                    so_tien,
                                    phuong_thuc,
                                    ngay_thanh_toan,
                                    trang_thai
                                )
                                VALUES (?, ?, ?, datetime('now', 'localtime'), 'THANH_CONG')`,
                                [don_hang_id, so_tien, phuong_thuc],
                                function(err) {
                                    if (err) {
                                        return hoanTac('Khong the luu thanh toan!');
                                    }

                                    const thanh_toan_id = this.lastID;
                                    const tong_da_thanh_toan = da_thanh_toan + so_tien;
                                    const con_lai = donHang.tong_thanh_toan - tong_da_thanh_toan;

                                    // Chi tich diem khi da thanh toan du
                                    if (con_lai === 0 && donHang.khach_hang_id) {

                                        // Lay so diem khach hang da su dung
                                        const diem_su_dung = donHang.diem_su_dung || 0;

                                        // Moi 50.000 dong duoc 1 diem
                                        const diem_cong = Math.floor(
                                            donHang.tong_thanh_toan / 50000
                                        );

                                        // Tru diem da su dung va cong diem moi
                                        db.run(
                                            `UPDATE KhachHang
                                            SET diem_tich_luy = diem_tich_luy - ? + ?
                                            WHERE id = ? AND diem_tich_luy >= ?`,
                                            [
                                                diem_su_dung,
                                                diem_cong,
                                                donHang.khach_hang_id,
                                                diem_su_dung
                                            ],
                                            function(err) {
                                                if (err) {
                                                    return hoanTac('Loi cap nhat diem tich luy!');
                                                }

                                                if (this.changes !== 1) {
                                                    return hoanTac('Khach hang khong du diem de thanh toan!');
                                                }

                                                // Luu so diem da cong vao don hang
                                                db.run(
                                                    `UPDATE DonHang
                                                    SET diem_cong = ?
                                                    WHERE id = ?`,
                                                    [diem_cong, don_hang_id],
                                                    (err) => {
                                                        if (err) {
                                                            return hoanTac('Loi luu diem cong don hang!');
                                                        }

                                                        hoanTatThanhToan(
                                                            thanh_toan_id,
                                                            tong_da_thanh_toan,
                                                            con_lai,
                                                            diem_cong
                                                        );
                                                    }
                                                );
                                            }
                                        );

                                    } else {
                                        hoanTatThanhToan(
                                            thanh_toan_id,
                                            tong_da_thanh_toan,
                                            con_lai,
                                            0
                                        );
                                    }
                                }
                            );
                        }
                    );
                }
            );

            // Ham hoan tat thanh toan
            function hoanTatThanhToan(
                thanh_toan_id,
                tong_da_thanh_toan,
                con_lai,
                diem_cong
            ) {
                db.run('COMMIT', (err) => {
                    if (err) {
                        return hoanTac('Loi hoan tat giao dich!');
                    }

                    res.status(201).json({
                        success: true,
                        message: 'Thanh toan thanh cong!',
                        data: {
                            thanh_toan_id: thanh_toan_id,
                            don_hang_id: Number(don_hang_id),
                            tong_thanh_toan: tong_da_thanh_toan + con_lai,
                            so_tien_vua_thanh_toan: so_tien,
                            da_thanh_toan: tong_da_thanh_toan,
                            con_phai_tra: con_lai,
                            phuong_thuc: phuong_thuc,
                            diem_duoc_cong: diem_cong
                        }
                    });
                });
            }
        });
    });
});

// API xem lich su thanh toan don hang
app.get('/api/orders/:id/payments', verifyToken, requireAdmin, (req, res) => {
    const don_hang_id = req.params.id;

    // Kiem tra don hang
    db.get(
        'SELECT * FROM DonHang WHERE id = ?',
        [don_hang_id],
        (err, donHang) => {
            if (err) {
                return res.status(500).json({
                    success: false,
                    message: 'Loi kiem tra don hang!'
                });
            }

            if (!donHang) {
                return res.status(404).json({
                    success: false,
                    message: 'Khong tim thay don hang!'
                });
            }

            // Lay danh sach thanh toan
            db.all(
                `SELECT *
                 FROM ThanhToan
                 WHERE don_hang_id = ?
                 ORDER BY ngay_thanh_toan DESC`,
                [don_hang_id],
                (err, thanhToan) => {
                    if (err) {
                        return res.status(500).json({
                            success: false,
                            message: 'Loi lay lich su thanh toan!'
                        });
                    }

                    // Tinh tong tien da thanh toan thanh cong
                    db.get(
                        `SELECT COALESCE(SUM(so_tien), 0) AS da_thanh_toan
                         FROM ThanhToan
                         WHERE don_hang_id = ?
                         AND trang_thai = 'THANH_CONG'`,
                        [don_hang_id],
                        (err, ketQua) => {
                            if (err) {
                                return res.status(500).json({
                                    success: false,
                                    message: 'Loi tinh tong tien thanh toan!'
                                });
                            }

                            const da_thanh_toan = ketQua.da_thanh_toan;
                            const con_phai_tra = Math.max(
                                0,
                                donHang.tong_thanh_toan - da_thanh_toan
                            );

                            res.json({
                                success: true,
                                message: 'Lay lich su thanh toan thanh cong!',
                                data: {
                                    don_hang_id: donHang.id,
                                    ma_don: donHang.ma_don,
                                    tong_thanh_toan: donHang.tong_thanh_toan,
                                    da_thanh_toan: da_thanh_toan,
                                    con_phai_tra: con_phai_tra,
                                    lich_su_thanh_toan: thanhToan
                                }
                            });
                        }
                    );
                }
            );
        }
    );
});
// ==================== QUAN LY KHACH HANG ====================

// API lay danh sach khach hang
app.get('/api/customers', verifyToken, requireAdmin, (req, res) => {

    const sql = `
        SELECT *
        FROM KhachHang
        ORDER BY id DESC
    `;

    db.all(sql, [], (err, customers) => {
        if (err) {
            console.error('Loi lay danh sach khach hang:', err.message);

            return res.status(500).json({
                success: false,
                message: 'Khong the lay danh sach khach hang!'
            });
        }

        res.json({
            success: true,
            message: 'Lay danh sach khach hang thanh cong!',
            data: customers,
            total: customers.length
        });
    });
});
// API them khach hang moi
app.post('/api/customers', verifyToken, requireAdmin, (req, res) => {
    const { ho_ten, so_dien_thoai, email, dia_chi } = req.body;

    // Kiem tra du lieu
    if (!ho_ten || !so_dien_thoai) {
        return res.status(400).json({
            success: false,
            message: 'Ho ten va so dien thoai khong duoc de trong!'
        });
    }

    // Kiem tra so dien thoai da ton tai
    db.get(
        'SELECT id FROM KhachHang WHERE so_dien_thoai = ?',
        [so_dien_thoai],
        (err, customer) => {
            if (err) {
                return res.status(500).json({
                    success: false,
                    message: 'Loi kiem tra khach hang!'
                });
            }

            if (customer) {
                return res.status(400).json({
                    success: false,
                    message: 'So dien thoai da duoc dang ky!'
                });
            }

            // Them khach hang
            const sql = `
                INSERT INTO KhachHang (
                    ho_ten,
                    so_dien_thoai,
                    email,
                    dia_chi,
                    diem_tich_luy,
                    ngay_tao,
                    hang_thanh_vien,
                    du_no
                )
                VALUES (?, ?, ?, ?, 0, datetime('now', 'localtime'), 'THANH_VIEN', 0)
            `;

            db.run(
                sql,
                [
                    ho_ten.trim(),
                    so_dien_thoai.trim(),
                    email || null,
                    dia_chi || null
                ],
                function(err) {
                    if (err) {
                        console.error('Loi them khach hang:', err.message);

                        return res.status(500).json({
                            success: false,
                            message: 'Khong the them khach hang!'
                        });
                    }

                    res.status(201).json({
                        success: true,
                        message: 'Them khach hang thanh cong!',
                        data: {
                            id: this.lastID,
                            ho_ten: ho_ten,
                            so_dien_thoai: so_dien_thoai,
                            email: email || null,
                            dia_chi: dia_chi || null,
                            diem_tich_luy: 0,
                            hang_thanh_vien: 'THANH_VIEN',
                            du_no: 0
                        }
                    });
                }
            );
        }
    );
});
// API cap nhat thong tin khach hang
app.put('/api/customers/:id', verifyToken, requireAdmin, (req, res) => {
    const id = req.params.id;
    const { ho_ten, so_dien_thoai, email, dia_chi } = req.body;

    if (!ho_ten || !so_dien_thoai) {
        return res.status(400).json({
            success: false,
            message: 'Ho ten va so dien thoai khong duoc de trong!'
        });
    }

    // Kiem tra khach hang co ton tai khong
    db.get(
        'SELECT * FROM KhachHang WHERE id = ?',
        [id],
        (err, customer) => {
            if (err) {
                return res.status(500).json({
                    success: false,
                    message: 'Loi kiem tra khach hang!'
                });
            }

            if (!customer) {
                return res.status(404).json({
                    success: false,
                    message: 'Khong tim thay khach hang!'
                });
            }

            // Kiem tra so dien thoai trung voi khach hang khac
            db.get(
                'SELECT id FROM KhachHang WHERE so_dien_thoai = ? AND id != ?',
                [so_dien_thoai, id],
                (err, duplicate) => {
                    if (err) {
                        return res.status(500).json({
                            success: false,
                            message: 'Loi kiem tra so dien thoai!'
                        });
                    }

                    if (duplicate) {
                        return res.status(400).json({
                            success: false,
                            message: 'So dien thoai da duoc khach hang khac su dung!'
                        });
                    }

                    // Cap nhat thong tin
                    db.run(
                        `UPDATE KhachHang
                         SET ho_ten = ?,
                             so_dien_thoai = ?,
                             email = ?,
                             dia_chi = ?
                         WHERE id = ?`,
                        [
                            ho_ten.trim(),
                            so_dien_thoai.trim(),
                            email || null,
                            dia_chi || null,
                            id
                        ],
                        function(err) {
                            if (err) {
                                return res.status(500).json({
                                    success: false,
                                    message: 'Khong the cap nhat khach hang!'
                                });
                            }

                            res.json({
                                success: true,
                                message: 'Cap nhat khach hang thanh cong!',
                                data: {
                                    id: Number(id),
                                    ho_ten: ho_ten,
                                    so_dien_thoai: so_dien_thoai,
                                    email: email || null,
                                    dia_chi: dia_chi || null
                                }
                            });
                        }
                    );
                }
            );
        }
    );
});
// API ngung hoat dong khach hang
app.put('/api/customers/:id/stop', verifyToken, requireAdmin, (req, res) => {
    const id = req.params.id;

    db.get(
        'SELECT * FROM KhachHang WHERE id = ?',
        [id],
        (err, customer) => {
            if (err) {
                return res.status(500).json({
                    success: false,
                    message: 'Loi kiem tra khach hang!'
                });
            }

            if (!customer) {
                return res.status(404).json({
                    success: false,
                    message: 'Khong tim thay khach hang!'
                });
            }

            if (customer.trang_thai === 0) {
                return res.status(400).json({
                    success: false,
                    message: 'Khach hang da ngung hoat dong!'
                });
            }

            db.run(
                'UPDATE KhachHang SET trang_thai = 0 WHERE id = ?',
                [id],
                function(err) {
                    if (err) {
                        return res.status(500).json({
                            success: false,
                            message: 'Khong the ngung hoat dong khach hang!'
                        });
                    }

                    res.json({
                        success: true,
                        message: 'Ngung hoat dong khach hang thanh cong!',
                        data: {
                            id: Number(id),
                            ho_ten: customer.ho_ten,
                            trang_thai: 0
                        }
                    });
                }
            );
        }
    );
});

// ==================== QUAN LY THU CHI ====================

// API lay danh sach phieu thu chi
app.get('/api/cashflows', verifyToken, requireAdmin, (req, res) => {

    const sql = `
        SELECT
            id,
            loai,
            danh_muc,
            so_tien,
            ngay_giao_dich,
            ghi_chu,
            nguoi_tao
        FROM PhieuThuChi
        ORDER BY ngay_giao_dich DESC, id DESC
    `;

    db.all(sql, [], (err, rows) => {
        if (err) {
            return res.status(500).json({
                success: false,
                message: 'Loi khi lay danh sach phieu thu chi!',
                error: err.message
            });
        }

        res.json({
            success: true,
            message: 'Lay danh sach phieu thu chi thanh cong!',
            total: rows.length,
            data: rows
        });
    });
});

// API them phieu thu chi
app.post('/api/cashflows', verifyToken, requireAdmin, (req, res) => {

    const { loai, danh_muc, so_tien, ngay_giao_dich, ghi_chu } = req.body;

    // Kiem tra loai giao dich
    if (!['THU', 'CHI'].includes(loai)) {
        return res.status(400).json({
            success: false,
            message: 'Loai giao dich chi duoc la THU hoac CHI!'
        });
    }

    // Kiem tra danh muc
    if (!danh_muc || !danh_muc.trim()) {
        return res.status(400).json({
            success: false,
            message: 'Danh muc khong duoc de trong!'
        });
    }

    // Kiem tra so tien
    if (!Number.isInteger(so_tien) || so_tien <= 0) {
        return res.status(400).json({
            success: false,
            message: 'So tien phai la so nguyen lon hon 0!'
        });
    }

    // Lay ID tai khoan dang dang nhap
    const nguoi_tao = req.user.id;

    const sql = `
        INSERT INTO PhieuThuChi (
            loai,
            danh_muc,
            so_tien,
            ngay_giao_dich,
            ghi_chu,
            nguoi_tao
        )
        VALUES (?, ?, ?, COALESCE(?, datetime('now', 'localtime')), ?, ?)
    `;

    db.run(sql, [
        loai,
        danh_muc.trim(),
        so_tien,
        ngay_giao_dich || null,
        ghi_chu || null,
        nguoi_tao
    ], function(err) {

        if (err) {
            return res.status(500).json({
                success: false,
                message: 'Khong the them phieu thu chi!',
                error: err.message
            });
        }

        res.status(201).json({
            success: true,
            message: 'Them phieu thu chi thanh cong!',
            data: {
                id: this.lastID,
                loai: loai,
                danh_muc: danh_muc,
                so_tien: so_tien,
                ngay_giao_dich: ngay_giao_dich || null,
                ghi_chu: ghi_chu || null,
                nguoi_tao: nguoi_tao
            }
        });
    });
});

// API sua phieu thu chi
app.put('/api/cashflows/:id', verifyToken, requireAdmin, (req, res) => {

    const id = Number(req.params.id);
    const { loai, danh_muc, so_tien, ngay_giao_dich, ghi_chu } = req.body;

    // Kiem tra ID
    if (!Number.isInteger(id) || id <= 0) {
        return res.status(400).json({
            success: false,
            message: 'Ma phieu khong hop le!'
        });
    }

    // Kiem tra loai giao dich
    if (!['THU', 'CHI'].includes(loai)) {
        return res.status(400).json({
            success: false,
            message: 'Loai giao dich chi duoc la THU hoac CHI!'
        });
    }

    // Kiem tra danh muc
    if (!danh_muc || !danh_muc.trim()) {
        return res.status(400).json({
            success: false,
            message: 'Danh muc khong duoc de trong!'
        });
    }

    // Kiem tra so tien
    if (!Number.isInteger(so_tien) || so_tien <= 0) {
        return res.status(400).json({
            success: false,
            message: 'So tien phai la so nguyen lon hon 0!'
        });
    }

    // Kiem tra phieu co ton tai khong
    db.get(
        'SELECT id FROM PhieuThuChi WHERE id = ?',
        [id],
        (err, phieu) => {

            if (err) {
                return res.status(500).json({
                    success: false,
                    message: 'Loi kiem tra phieu thu chi!'
                });
            }

            if (!phieu) {
                return res.status(404).json({
                    success: false,
                    message: 'Khong tim thay phieu thu chi!'
                });
            }

            // Cap nhat phieu
            const sql = `
                UPDATE PhieuThuChi
                SET loai = ?,
                    danh_muc = ?,
                    so_tien = ?,
                    ngay_giao_dich = COALESCE(?, ngay_giao_dich),
                    ghi_chu = ?
                WHERE id = ?
            `;

            db.run(sql, [
                loai,
                danh_muc.trim(),
                so_tien,
                ngay_giao_dich || null,
                ghi_chu || null,
                id
            ], function(err) {

                if (err) {
                    return res.status(500).json({
                        success: false,
                        message: 'Khong the cap nhat phieu thu chi!',
                        error: err.message
                    });
                }

                res.json({
                    success: true,
                    message: 'Cap nhat phieu thu chi thanh cong!',
                    id: id
                });
            });
        }
    );
});

 // API xoa phieu thu chi
app.delete('/api/cashflows/:id', verifyToken, requireAdmin, (req, res) => {

    const id = Number(req.params.id);

    // Kiem tra ID
    if (!Number.isInteger(id) || id <= 0) {
        return res.status(400).json({
            success: false,
            message: 'Ma phieu khong hop le!'
        });
    }

    // Kiem tra phieu co ton tai khong
    db.get(
        'SELECT id FROM PhieuThuChi WHERE id = ?',
        [id],
        (err, phieu) => {

            if (err) {
                return res.status(500).json({
                    success: false,
                    message: 'Loi kiem tra phieu thu chi!'
                });
            }

            if (!phieu) {
                return res.status(404).json({
                    success: false,
                    message: 'Khong tim thay phieu thu chi!'
                });
            }

            // Tien hanh xoa phieu
            db.run(
                'DELETE FROM PhieuThuChi WHERE id = ?',
                [id],
                function(err) {

                    if (err) {
                        return res.status(500).json({
                            success: false,
                            message: 'Khong the xoa phieu thu chi!',
                            error: err.message
                        });
                    }

                    res.json({
                        success: true,
                        message: 'Xoa phieu thu chi thanh cong!',
                        id: id
                    });
                }
            );
        }
    );
});

// API thong ke thu chi
app.get('/api/cashflows/summary', verifyToken, requireAdmin, (req, res) => {

    const sql = `
        SELECT
            COALESCE(SUM(CASE WHEN loai = 'THU' THEN so_tien ELSE 0 END), 0) AS tong_thu,
            COALESCE(SUM(CASE WHEN loai = 'CHI' THEN so_tien ELSE 0 END), 0) AS tong_chi,
            COUNT(CASE WHEN loai = 'THU' THEN 1 END) AS so_phieu_thu,
            COUNT(CASE WHEN loai = 'CHI' THEN 1 END) AS so_phieu_chi
        FROM PhieuThuChi
    `;

    db.get(sql, [], (err, result) => {

        if (err) {
            return res.status(500).json({
                success: false,
                message: 'Loi thong ke thu chi!',
                error: err.message
            });
        }

        const so_du = result.tong_thu - result.tong_chi;

        res.json({
            success: true,
            message: 'Thong ke thu chi thanh cong!',
            data: {
                tong_thu: result.tong_thu,
                tong_chi: result.tong_chi,
                so_du: so_du,
                so_phieu_thu: result.so_phieu_thu,
                so_phieu_chi: result.so_phieu_chi
            }
        });
    });
});



 // ==================== API XUAT HOA DON PDF ====================

app.get('/api/export-pdf/invoice/:ma_don', verifyToken, requireAdmin, (req, res) => {
    const ma_don = req.params.ma_don;

    const sqlDonHang = `
        SELECT
            dh.*,
            COALESCE(kh.ho_ten, 'Khach le') AS ten_khach_hang,
            kh.so_dien_thoai,
            nv.ho_ten AS ten_nhan_vien
        FROM DonHang dh
        LEFT JOIN KhachHang kh ON dh.khach_hang_id = kh.id
        LEFT JOIN NhanVien nv ON dh.nhan_vien_id = nv.id
        WHERE dh.ma_don = ?
    `;

    db.get(sqlDonHang, [ma_don], (err, donHang) => {
        if (err) {
            return res.status(500).json({
                success: false,
                message: 'Loi lay thong tin don hang!'
            });
        }

        if (!donHang) {
            return res.status(404).json({
                success: false,
                message: 'Khong tim thay don hang!'
            });
        }

        const sqlChiTiet = `
            SELECT ten_sp, so_luong, don_gia, giam_gia, thanh_tien
            FROM ChiTietDonHang
            WHERE don_hang_id = ?
        `;

        db.all(sqlChiTiet, [donHang.id], (err, chiTiet) => {
            if (err) {
                return res.status(500).json({
                    success: false,
                    message: 'Loi lay chi tiet don hang!'
                });
            }

            try {
                // Tao hoa don kho 80mm
                const pageWidth = 226.77;
                const pageHeight = 480 + chiTiet.length * 100;

                const doc = new PDFDocument({
                    size: [pageWidth, pageHeight],
                    margin: 12
                });

                // Dang ky font tieng Viet
                doc.registerFont(
                    'Arial',
                    path.join(__dirname, 'fonts', 'arial.ttf')
                );

                doc.font('Arial');

                res.setHeader('Content-Type', 'application/pdf');
                res.setHeader(
                    'Content-Disposition',
                    `inline; filename="HoaDon-${ma_don}.pdf"`
                );

                doc.pipe(res);

                const navy = '#12345A';
                const blue = '#1455A0';
                const gray = '#667085';
                const black = '#252525';

                const tien = (value) =>
                    Number(value || 0).toLocaleString('vi-VN') + ' đ';

                const line = () => {
                    doc.moveTo(12, doc.y)
                        .lineTo(pageWidth - 12, doc.y)
                        .strokeColor('#C8D3E0')
                        .lineWidth(0.7)
                        .stroke();

                    doc.moveDown(0.7);
                };

                // LOGO VA TIEU DE
                doc.fillColor(navy)
                    .fontSize(23)
                    .text('SALES PRO', {
                        align: 'center'
                    });

                doc.moveDown(0.2);

                doc.fillColor(gray)
                    .fontSize(8)
                    .text('HE THONG QUAN LY BAN HANG', {
                        align: 'center'
                    });

                doc.moveDown(0.7);
                line();

                doc.fillColor(navy)
                    .fontSize(15)
                    .text('HOA DON BAN HANG', {
                        align: 'center'
                    });

                doc.moveDown(0.3);

                doc.fillColor(blue)
                    .fontSize(9)
                    .text('Ma don: ' + donHang.ma_don, {
                        align: 'center'
                    });

                doc.moveDown(0.8);
                line();

                // THONG TIN DON HANG
                doc.fillColor(navy)
                    .fontSize(10)
                    .text('THONG TIN DON HANG');

                doc.moveDown(0.4);

                doc.fillColor(black).fontSize(9);

                doc.text('Ngay lap: ' + (donHang.ngay_lap || ''));
                doc.text('Khach hang: ' + donHang.ten_khach_hang);
                doc.text('Dien thoai: ' + (donHang.so_dien_thoai || 'Khong co'));
                doc.text('Thu ngan: ' + (donHang.ten_nhan_vien || ''));

                doc.moveDown(0.7);
                line();

                // CHI TIET SAN PHAM
                doc.fillColor(navy)
                    .fontSize(10)
                    .text('CHI TIET SAN PHAM');

                doc.moveDown(0.6);

                chiTiet.forEach((sp, index) => {
                    doc.fillColor(black)
                        .fontSize(9)
                        .text((index + 1) + '. ' + sp.ten_sp, {
                            width: pageWidth - 24
                        });

                    doc.moveDown(0.2);

                    doc.fillColor(gray)
                        .fontSize(8)
                        .text(
                            sp.so_luong + ' x ' + tien(sp.don_gia)
                        );

                    doc.fillColor(blue)
                        .fontSize(9)
                        .text(tien(sp.thanh_tien), {
                            align: 'right'
                        });

                    if (Number(sp.giam_gia) > 0) {
                        doc.fillColor(gray)
                            .fontSize(8)
                            .text('Giam gia: ' + tien(sp.giam_gia));
                    }

                    doc.moveDown(0.5);
                });

                line();

                // TONG TIEN
                const tongTienHang = Number(donHang.tong_tien_hang || 0);
                const giamGia = Number(donHang.giam_gia || 0);
                const giamGiaDiem = Number(donHang.giam_gia_diem || 0);
                const tongThanhToan = Number(donHang.tong_thanh_toan || 0);

                doc.fillColor(black).fontSize(9);

                doc.text('Tong tien hang: ' + tien(tongTienHang));
                doc.moveDown(0.3);

                doc.text('Giam gia: ' + tien(giamGia));
                doc.moveDown(0.3);

                doc.text('Giam gia diem: ' + tien(giamGiaDiem));
                doc.moveDown(0.7);

                // KHUNG TONG THANH TOAN
                const totalY = doc.y;
                const totalHeight = 43;

                doc.roundedRect(
                    12,
                    totalY,
                    pageWidth - 24,
                    totalHeight,
                    5
                )
                .fill(navy);

                doc.fillColor('#FFFFFF')
                    .fontSize(9)
                    .text('TONG THANH TOAN', 19, totalY + 7);

                doc.fontSize(14)
                    .text(tien(tongThanhToan), 19, totalY + 21, {
                        width: pageWidth - 38,
                        align: 'center'
                    });

                doc.y = totalY + totalHeight + 15;

                // LOI CAM ON
                doc.fillColor(navy)
                    .fontSize(10)
                    .text('CAM ON QUY KHACH!', {
                        align: 'center'
                    });

                doc.moveDown(0.3);

                doc.fillColor(gray)
                    .fontSize(8)
                    .text('Hen gap lai quy khach!', {
                        align: 'center'
                    });

                doc.end();

            } catch (error) {
                console.error('Loi tao hoa don PDF:', error);

                if (!res.headersSent) {
                    return res.status(500).json({
                        success: false,
                        message: 'Khong the tao hoa don PDF!'
                    });
                }
            }
        });
    });
});

// ==================== API LICH SU DON HANG ====================

app.get('/api/orders', verifyToken, requireAdmin, (req, res) => {
    const sql = `
        SELECT
            dh.ma_don,
            dh.ngay_lap,
            COALESCE(kh.ho_ten, 'Khach le') AS ten_khach_hang,
            dh.tong_thanh_toan AS tong_tien,
            nv.ho_ten AS nhan_vien_tao,
            dh.trang_thai
        FROM DonHang dh
        LEFT JOIN KhachHang kh ON dh.khach_hang_id = kh.id
        LEFT JOIN NhanVien nv ON dh.nhan_vien_id = nv.id
        ORDER BY dh.ngay_lap DESC
    `;

    db.all(sql, [], (err, orders) => {
        if (err) {
            return res.status(500).json({
                success: false,
                message: 'Loi lay lich su don hang!',
                error: err.message
            });
        }

        res.json({
            success: true,
            message: 'Lay lich su don hang thanh cong!',
            data: orders
        });
    });
});


// ==================== API THONG KE TONG QUAN ====================

app.get('/api/statistics', verifyToken, requireAdmin, (req, res) => {
    const sql = `
        SELECT
            (
                SELECT COALESCE(SUM(tong_thanh_toan), 0)
                FROM DonHang
                WHERE trang_thai = 'HOAN_THANH'
            ) AS tong_doanh_thu,

            (
                SELECT COUNT(*)
                FROM DonHang
                WHERE trang_thai = 'HOAN_THANH'
            ) AS tong_don_hang,

            (
                SELECT COALESCE(SUM(ton_kho), 0)
                FROM SanPham
                WHERE trang_thai = 1
            ) AS tong_ton_kho,

            (
                SELECT COUNT(*)
                FROM KhachHang
                WHERE trang_thai = 1
            ) AS tong_khach_hang
    `;

    db.get(sql, [], (err, result) => {
        if (err) {
            return res.status(500).json({
                success: false,
                message: 'Loi thong ke tong quan!',
                error: err.message
            });
        }

        res.json({
            success: true,
            message: 'Thong ke tong quan thanh cong!',
            data: {
                tong_quan: {
                    tong_doanh_thu: result.tong_doanh_thu,
                    tong_don_hang: result.tong_don_hang,
                    tong_ton_kho: result.tong_ton_kho,
                    tong_khach_hang: result.tong_khach_hang
                }
            }
        });
    });
});


// ==================== API BIEU DO DOANH THU ====================

app.get('/api/statistics/chart', verifyToken, requireAdmin, (req, res) => {

    const sqlDaily = `
        SELECT
            date(ngay_lap) AS time_key,
            SUM(tong_thanh_toan) AS doanh_thu
        FROM DonHang
        WHERE trang_thai = 'HOAN_THANH'
          AND date(ngay_lap) >= date('now', 'localtime', '-29 days')
        GROUP BY date(ngay_lap)
        ORDER BY time_key ASC
    `;

    const sqlMonthly = `
        SELECT
            strftime('%Y-%m', ngay_lap) AS time_key,
            SUM(tong_thanh_toan) AS doanh_thu
        FROM DonHang
        WHERE trang_thai = 'HOAN_THANH'
          AND date(ngay_lap) >= date('now', 'localtime', 'start of month', '-11 months')
        GROUP BY strftime('%Y-%m', ngay_lap)
        ORDER BY time_key ASC
    `;

    const sqlYearly = `
        SELECT
            strftime('%Y', ngay_lap) AS time_key,
            SUM(tong_thanh_toan) AS doanh_thu
        FROM DonHang
        WHERE trang_thai = 'HOAN_THANH'
          AND date(ngay_lap) >= date('now', 'localtime', 'start of year', '-4 years')
        GROUP BY strftime('%Y', ngay_lap)
        ORDER BY time_key ASC
    `;

    db.all(sqlDaily, [], (err, daily) => {
        if (err) {
            return res.status(500).json({
                success: false,
                message: 'Loi thong ke doanh thu theo ngay!',
                error: err.message
            });
        }

        db.all(sqlMonthly, [], (err, monthly) => {
            if (err) {
                return res.status(500).json({
                    success: false,
                    message: 'Loi thong ke doanh thu theo thang!',
                    error: err.message
                });
            }

            db.all(sqlYearly, [], (err, yearly) => {
                if (err) {
                    return res.status(500).json({
                        success: false,
                        message: 'Loi thong ke doanh thu theo nam!',
                        error: err.message
                    });
                }

                res.json({
                    success: true,
                    message: 'Lay du lieu bieu do thanh cong!',
                    data: {
                        daily: daily,
                        monthly: monthly,
                        yearly: yearly
                    }
                });
            });
        });
    });
});

// ==================== API LICH SU DON HANG ====================

app.get('/api/orders', verifyToken, requireAdmin, (req, res) => {
    const sql = `
        SELECT
            dh.ma_don,
            dh.ngay_lap,
            COALESCE(kh.ho_ten, 'Khach le') AS ten_khach_hang,
            dh.tong_thanh_toan AS tong_tien,
            nv.ho_ten AS nhan_vien_tao,
            dh.trang_thai
        FROM DonHang dh
        LEFT JOIN KhachHang kh ON dh.khach_hang_id = kh.id
        LEFT JOIN NhanVien nv ON dh.nhan_vien_id = nv.id
        ORDER BY dh.ngay_lap DESC
    `;

    db.all(sql, [], (err, orders) => {
        if (err) {
            return res.status(500).json({
                success: false,
                message: 'Loi lay lich su don hang!',
                error: err.message
            });
        }

        res.json({
            success: true,
            message: 'Lay lich su don hang thanh cong!',
            data: orders
        });
    });
});


// ==================== API THONG KE TONG QUAN ====================

app.get('/api/statistics', verifyToken, requireAdmin, (req, res) => {
    const sql = `
        SELECT
            (
                SELECT COALESCE(SUM(tong_thanh_toan), 0)
                FROM DonHang
                WHERE trang_thai = 'HOAN_THANH'
            ) AS tong_doanh_thu,

            (
                SELECT COUNT(*)
                FROM DonHang
                WHERE trang_thai = 'HOAN_THANH'
            ) AS tong_don_hang,

            (
                SELECT COALESCE(SUM(ton_kho), 0)
                FROM SanPham
                WHERE trang_thai = 1
            ) AS tong_ton_kho,

            (
                SELECT COUNT(*)
                FROM KhachHang
                WHERE trang_thai = 1
            ) AS tong_khach_hang
    `;

    db.get(sql, [], (err, result) => {
        if (err) {
            return res.status(500).json({
                success: false,
                message: 'Loi thong ke tong quan!',
                error: err.message
            });
        }

        res.json({
            success: true,
            message: 'Thong ke tong quan thanh cong!',
            data: {
                tong_quan: {
                    tong_doanh_thu: result.tong_doanh_thu,
                    tong_don_hang: result.tong_don_hang,
                    tong_ton_kho: result.tong_ton_kho,
                    tong_khach_hang: result.tong_khach_hang
                }
            }
        });
    });
});


// ==================== API BIEU DO DOANH THU ====================

app.get('/api/statistics/chart', verifyToken, requireAdmin, (req, res) => {

    const sqlDaily = `
        SELECT
            date(ngay_lap) AS time_key,
            SUM(tong_thanh_toan) AS doanh_thu
        FROM DonHang
        WHERE trang_thai = 'HOAN_THANH'
          AND date(ngay_lap) >= date('now', 'localtime', '-29 days')
        GROUP BY date(ngay_lap)
        ORDER BY time_key ASC
    `;

    const sqlMonthly = `
        SELECT
            strftime('%Y-%m', ngay_lap) AS time_key,
            SUM(tong_thanh_toan) AS doanh_thu
        FROM DonHang
        WHERE trang_thai = 'HOAN_THANH'
          AND date(ngay_lap) >= date('now', 'localtime', 'start of month', '-11 months')
        GROUP BY strftime('%Y-%m', ngay_lap)
        ORDER BY time_key ASC
    `;

    const sqlYearly = `
        SELECT
            strftime('%Y', ngay_lap) AS time_key,
            SUM(tong_thanh_toan) AS doanh_thu
        FROM DonHang
        WHERE trang_thai = 'HOAN_THANH'
          AND date(ngay_lap) >= date('now', 'localtime', 'start of year', '-4 years')
        GROUP BY strftime('%Y', ngay_lap)
        ORDER BY time_key ASC
    `;

    db.all(sqlDaily, [], (err, daily) => {
        if (err) {
            return res.status(500).json({
                success: false,
                message: 'Loi thong ke doanh thu theo ngay!',
                error: err.message
            });
        }

        db.all(sqlMonthly, [], (err, monthly) => {
            if (err) {
                return res.status(500).json({
                    success: false,
                    message: 'Loi thong ke doanh thu theo thang!',
                    error: err.message
                });
            }

            db.all(sqlYearly, [], (err, yearly) => {
                if (err) {
                    return res.status(500).json({
                        success: false,
                        message: 'Loi thong ke doanh thu theo nam!',
                        error: err.message
                    });
                }

                res.json({
                    success: true,
                    message: 'Lay du lieu bieu do thanh cong!',
                    data: {
                        daily: daily,
                        monthly: monthly,
                        yearly: yearly
                    }
                });
            });
        });
    });
});

// Xuat app de bin/www khoi dong server
module.exports = app;
