import React, { useState, useEffect } from 'react';

import { 

  Layout, Menu, Row, Col, Card, Input, Button, Table, Select, Modal, 

  message, Space, Badge, Divider, Radio, Tag, InputNumber, Avatar, Statistic, Tabs, Form 

} from 'antd';

import { 

  ShoppingCartOutlined, DeleteOutlined, PlusOutlined, 

  MinusOutlined, UserOutlined, UserAddOutlined,

  TeamOutlined, AppstoreOutlined, HistoryOutlined, 

  BarChartOutlined, LogoutOutlined, PrinterOutlined,

  GiftOutlined, LockOutlined, CloseCircleOutlined, TagOutlined,

  ImportOutlined, ShopOutlined

} from '@ant-design/icons';

import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';

import axios from 'axios';



const { Header, Sider, Content } = Layout;

const { Search } = Input;

const { Option } = Select;



const API_BASE = 'http://localhost:5000';



function App() {

  // State Quản lý Đăng Nhập

  const [isLoggedIn, setIsLoggedIn] = useState(false);

  const [token, setToken] = useState('');

  const [username, setUsername] = useState('');

  const [password, setPassword] = useState('');



  const [collapsed, setCollapsed] = useState(false);

  const [selectedMenuKey, setSelectedMenuKey] = useState('pos');



  const [products, setProducts] = useState([]);

  const [categories, setCategories] = useState([]);

  const [customers, setCustomers] = useState([]);
  // Lưu thông tin khách hàng đang được chỉnh sửa
const [editingCustomer, setEditingCustomer] = useState(null);

// Điều khiển hiển thị modal chỉnh sửa
const [isEditCustomerModalOpen, setIsEditCustomerModalOpen] = useState(false);

// Lưu dữ liệu biểu mẫu chỉnh sửa
const [editCustomerForm, setEditCustomerForm] = useState({
    ho_ten: '',
    so_dien_thoai: '',
    email: '',
    dia_chi: ''
});

  const [ordersHistory, setOrdersHistory] = useState([]);

  // State thống kê và biểu đồ doanh thu
  const [statistics, setStatistics] = useState({ tong_quan: {} });
  const [chartData, setChartData] = useState({ daily: [], monthly: [], yearly: [] });

  // State quản lý thu chi

const [cashflows, setCashflows] = useState([]);

const [cashflowSummary, setCashflowSummary] = useState({

    tong_thu: 0,

    tong_chi: 0,

    so_du: 0,

    so_phieu_thu: 0,

    so_phieu_chi: 0

});

const [cashflowLoading, setCashflowLoading] = useState(false);



  // State Quản lý Nhà cung cấp & Nhập hàng

  const [suppliers, setSuppliers] = useState([

    { ma_ncc: 'NCC001', ten_ncc: 'Công Ty TNHH Phân Phối Đồ Điện Tử Việt', sdt: '0901234567', dia_chi: 'Hà Nội' },

    { ma_ncc: 'NCC002', ten_ncc: 'Tổng Kho Thời Trang Hàng Hiệu', sdt: '0912345678', dia_chi: 'TP. Hồ Chí Minh' },

    { ma_ncc: 'NCC003', ten_ncc: 'Nhà Cung Cấp Gia Dụng SmartLife', sdt: '0988776655', dia_chi: 'Đà Nẵng' }

  ]);

  const [importHistory, setImportHistory] = useState([]);

  const [importCart, setImportCart] = useState([]);

  const [selectedSupplier, setSelectedSupplier] = useState(null);
  
  // Modal Sửa Nhà Cung Cấp
const [isEditSupplierModalOpen, setIsEditSupplierModalOpen] = useState(false);
const [editingSupplier, setEditingSupplier] = useState(null);


  const [selectedCategory, setSelectedCategory] = useState('ALL');

  const [searchText, setSearchText] = useState('');



  // Giỏ hàng & Khách hàng

  const [cart, setCart] = useState([]);

  const [selectedCustomer, setSelectedCustomer] = useState(null);

  const [discountAmount, setDiscountAmount] = useState(0);



  // Modal Thêm Khách Hàng Nhanh

  const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);

  const [newPhone, setNewPhone] = useState('');

  const [newName, setNewName] = useState('');



  // Modal Thêm Nhà Cung Cấp Nhanh

  const [isSupplierModalOpen, setIsSupplierModalOpen] = useState(false);

  const [newSupplierName, setNewSupplierName] = useState('');

  const [newSupplierPhone, setNewSupplierPhone] = useState('');

  const [newSupplierAddress, setNewSupplierAddress] = useState('');



  // Modal Thanh Toán & Điểm tích lũy

  const [isModalOpen, setIsModalOpen] = useState(false);

  const [paymentMethod, setPaymentMethod] = useState('TIEN_MAT');

  const [cashGiven, setCashGiven] = useState(0);

  const [diemSuDung, setDiemSuDung] = useState(0);

  const [loading, setLoading] = useState(false);



  const [isSuccessModalOpen, setIsSuccessModalOpen] = useState(false);

  const [latestMaDon, setLatestMaDon] = useState('');



  
const fetchData = async () => {
  try {
    // Tải dữ liệu sản phẩm, danh mục, khách hàng và nhà cung cấp
    const [prodRes, catRes, custRes, supplierRes] = await Promise.all([
      axios.get(`${API_BASE}/api/products`),
      axios.get(`${API_BASE}/api/categories`),
      axios.get(`${API_BASE}/api/customers`),
      axios.get(`${API_BASE}/api/suppliers`)
    ]);

    if (prodRes.data.success) {
      setProducts(prodRes.data.data);
    }

    if (catRes.data.success) {
      setCategories(catRes.data.data);
    }

    if (custRes.data.success) {
      setCustomers(custRes.data.data);
    }

    // Tải danh sách nhà cung cấp từ database
    if (supplierRes.data.success) {
      console.table(
  supplierRes.data.data.map(item => ({
    id: item.id,
    ten_ncc: item.ten_ncc,
    trang_thai: item.trang_thai
  }))
);
      setSuppliers(
        supplierRes.data.data.map(item => ({
          ma_ncc: item.id,
          ten_ncc: item.ten_ncc,
          sdt: item.so_dien_thoai || '',
          dia_chi: item.dia_chi || 'Chưa cập nhật',
          trang_thai: item.trang_thai
        }))
      );
    }

    // Tải lịch sử nhập hàng từ database
    try {
      const importRes = await axios.get(`${API_BASE}/api/imports`);

      if (importRes.data.success) {
        setImportHistory(importRes.data.data.map(item => ({
          ma_phieu: item.ma_phieu,
          ngay_nhap: item.ngay_nhap,
          nha_cung_cap: item.ten_ncc,
          tong_tien: item.tong_tien
        })));
      }
    } catch (error) {
      console.log('Chưa tải được lịch sử nhập hàng:', error);
    }

    // Tải lịch sử đơn hàng riêng
    try {
      const orderRes = await axios.get(`${API_BASE}/api/orders`);
      if (orderRes.data.success) {
        setOrdersHistory(orderRes.data.data);
      }
    } catch (error) {
      console.log('Chưa tải được lịch sử đơn hàng:', error);
    }

    // Tải thống kê riêng
    try {
      const statRes = await axios.get(`${API_BASE}/api/statistics`);
      if (statRes.data.success) {
        setStatistics(statRes.data.data);
      }
    } catch (error) {
      console.log('Chưa tải được thống kê:', error);
    }

    // Tải biểu đồ riêng
    try {
      const chartRes = await axios.get(`${API_BASE}/api/statistics/chart`);
      if (chartRes.data.success) {
        setChartData(chartRes.data.data);
      }
    } catch (error) {
      console.log('Chưa tải được dữ liệu biểu đồ:', error);
    }

  } catch (error) {
    console.error('Lỗi tải dữ liệu:', error);
    message.error('Không thể tải dữ liệu từ Backend!');
  }
};




  useEffect(() => {
    if (isLoggedIn) {
        fetchData();
    }
}, [isLoggedIn]);

// Dong bo trang thai khach hang giua cac tab
useEffect(() => {
    const handleCustomerStatusChange = (event) => {
        if (event.key !== 'customerStatusChanged' || !event.newValue) {
            return;
        }

        try {
            const data = JSON.parse(event.newValue);
            const stoppedPhone = data.so_dien_thoai;

            if (stoppedPhone && selectedCustomer === stoppedPhone) {
                setSelectedCustomer(null);
                message.info(
                    'Khách hàng đã ngừng hoạt động và được bỏ chọn khỏi POS!'
                );
            }

            fetchData();
        } catch (error) {
            console.error('Lỗi đồng bộ trạng thái khách hàng:', error);
        }
    };

    window.addEventListener('storage', handleCustomerStatusChange);

    return () => {
        window.removeEventListener('storage', handleCustomerStatusChange);
    };
}, [selectedCustomer]);

    

  const handleLogin = async () => {
    if (username.trim() === '' || password.trim() === '') {
      message.error('Vui lòng nhập tên đăng nhập và mật khẩu!');
      return;
    }

    try {
      const res = await axios.post(`${API_BASE}/api/login`, {
        ten_dang_nhap: username,
        mat_khau: password
      });

      if (res.data.success && res.data.token) {
        setToken(res.data.token);

        // Tu dong gui JWT trong cac request Axios
        axios.defaults.headers.common['Authorization'] = `Bearer ${res.data.token}`;

        setIsLoggedIn(true);
        message.success('Đăng nhập thành công!');
      } else {
        message.error(res.data.message || 'Đăng nhập thất bại!');
      }

    } catch (error) {
      message.error(
        error.response?.data?.message || 'Tên đăng nhập hoặc mật khẩu không chính xác!'
      );
    }
  };


  const handleLogout = () => {
    setIsLoggedIn(false);
    setToken('');
    delete axios.defaults.headers.common['Authorization'];

    setUsername('');
    setPassword('');
    setCart([]);
    setDiscountAmount(0);

    message.info('Đã đăng xuất tài khoản thành công.');
  };

  // Thêm Khách hàng mới
  const handleAddCustomer = async () => {
    if (!newPhone.trim() || !newName.trim()) {
  message.error('Vui lòng nhập đầy đủ Số điện thoại và Họ tên khách hàng!');
  return;
}

// Kiểm tra số điện thoại Việt Nam
const phoneRegex = /^(0|\+84)[35789][0-9]{8}$/;
const normalizedPhone = newPhone.trim().replace(/\s+/g, '');

if (!phoneRegex.test(normalizedPhone)) {
  message.error('Số điện thoại không hợp lệ! Vui lòng nhập số điện thoại Việt Nam gồm 10 chữ số.');
  return;
}

    try {
      const res = await axios.post(`${API_BASE}/api/customers`, {
        so_dien_thoai: normalizedPhone,
        ho_ten: newName.trim()
      });

      if (res.data.success) {
        message.success('Thêm khách hàng thành công!');
        setIsCustomerModalOpen(false);
        setSelectedCustomer(newPhone);
        setNewPhone('');
        setNewName('');
        fetchData();
      }

    } catch (error) {
      message.error('Lỗi khi thêm khách hàng (Số điện thoại có thể đã tồn tại)!');
    }
  };

// Mở cửa sổ chỉnh sửa khách hàng
const handleEditCustomer = (customer) => {
    setEditingCustomer(customer);

    setEditCustomerForm({
        ho_ten: customer.ho_ten || '',
        so_dien_thoai: customer.so_dien_thoai || '',
        email: customer.email || '',
        dia_chi: customer.dia_chi || ''
    });

    setIsEditCustomerModalOpen(true);
};

// Lưu thông tin khách hàng đã chỉnh sửa
const handleSaveEditCustomer = async () => {
    if (
        !editCustomerForm.ho_ten.trim() ||
        !editCustomerForm.so_dien_thoai.trim()
    ) {
        message.error('Vui lòng nhập họ tên và số điện thoại!');
        return;
    }

    try {
        const response = await axios.put(
            `${API_BASE}/api/customers/${editingCustomer.id}`,
            editCustomerForm
        );

        if (response.data.success) {
            message.success('Cập nhật khách hàng thành công!');
            setIsEditCustomerModalOpen(false);
            setEditingCustomer(null);
            await fetchData();
        }
    } catch (error) {
        console.error('Lỗi cập nhật khách hàng:', error);
        message.error(
            error.response?.data?.message || 'Không thể cập nhật khách hàng!'
        );
    }
};

// THÊM HÀM MỚI NGAY TẠI ĐÂY
const handleStopCustomer = async (customer) => {
    try {
        const response = await axios.put(
            `${API_BASE}/api/customers/${customer.id}/stop`
        );

        if (response.data.success) {
            message.success('Ngừng hoạt động khách hàng thành công!');
            // Gui tin hieu dong bo sang cac tab khac
            localStorage.setItem(
                'customerStatusChanged',
                JSON.stringify({
                    so_dien_thoai: customer.so_dien_thoai,
                    timestamp: Date.now()
                })
            );

            // Neu khach hang dang duoc chon tai POS thi bo chon
            if (selectedCustomer === customer.so_dien_thoai) {
                setSelectedCustomer(null);
                message.info('Khách hàng đã được bỏ chọn khỏi đơn hàng POS!');
            }

            await fetchData();
        }
    } catch (error) {
        console.error('Lỗi ngừng hoạt động khách hàng:', error);
        message.error(
            error.response?.data?.message || 'Không thể ngừng hoạt động khách hàng!'
        );
    }
};
// Ham kich hoat lai khach hang
const handleActivateCustomer = async (customer) => {
    try {
        const response = await axios.put(
            `${API_BASE}/api/customers/${customer.id}/activate`
        );

        if (response.data.success) {
            message.success('Kích hoạt lại khách hàng thành công!');
            await fetchData();
        }
    } catch (error) {
        console.error('Lỗi kích hoạt khách hàng:', error);
        message.error(
            error.response?.data?.message || 'Không thể kích hoạt khách hàng!'
        );
    }
};

  // Thêm Nhà Cung Cấp mới
  
const handleAddSupplier = async () => {
  if (!newSupplierName.trim() || !newSupplierPhone.trim()) {
    message.error('Vui lòng nhập Tên Nhà Cung Cấp và Số Điện Thoại!');
    return;
  }

  try {
    const res = await axios.post(`${API_BASE}/api/suppliers`, {
      ten_ncc: newSupplierName.trim(),
      so_dien_thoai: newSupplierPhone.trim(),
      dia_chi: newSupplierAddress.trim() || null
    });

    if (res.data.success) {
      message.success('Thêm nhà cung cấp thành công!');

      setIsSupplierModalOpen(false);
      setNewSupplierName('');
      setNewSupplierPhone('');
      setNewSupplierAddress('');
      
      // Cập nhật nhà cung cấp vừa thêm vào giao diện
      const newSupplier = {
        ma_ncc: 'NCC' + String(res.data.id).padStart(3, '0'),
        ten_ncc: newSupplierName.trim(),
        sdt: newSupplierPhone.trim(),
        dia_chi: newSupplierAddress.trim() || 'Chưa cập nhật'
      };

      setSuppliers(prev => [newSupplier, ...prev]);
    }
  } catch (error) {
    message.error(
      error.response?.data?.message || 'Không thể thêm nhà cung cấp!'
    );
  }
};

const handleUpdateSupplier = async () => {
  if (!editingSupplier?.ten_ncc?.trim()) {
    message.error('Vui lòng nhập tên nhà cung cấp!');
    return;
  }

  try {
    const response = await axios.put(
      `${API_BASE}/api/suppliers/${editingSupplier.ma_ncc}`,
      {
        ten_ncc: editingSupplier.ten_ncc.trim(),
        so_dien_thoai: editingSupplier.sdt || '',
        dia_chi: editingSupplier.dia_chi || ''
      }
    );

    if (response.data.success) {
      message.success('Cập nhật nhà cung cấp thành công!');

      setIsEditSupplierModalOpen(false);
      setEditingSupplier(null);

      await fetchData();
    }
  } catch (error) {
    console.error('Lỗi cập nhật nhà cung cấp:', error);
    message.error(
      error.response?.data?.message ||
      'Không thể cập nhật nhà cung cấp!'
    );
  }
};

// Ngừng hoạt động nhà cung cấp
const handleStopSupplier = async (supplier) => {
  try {
    const response = await axios.put(
      `${API_BASE}/api/suppliers/${supplier.ma_ncc}/stop`
    );

    if (response.data.success) {
      message.success('Đã ngừng hoạt động nhà cung cấp!');
      await fetchData();
    }
  } catch (error) {
    console.error('Lỗi ngừng hoạt động:', error);
    message.error(
      error.response?.data?.message ||
      'Không thể ngừng hoạt động nhà cung cấp!'
    );
  }
};



  // Xử lý thêm vào giỏ hàng Nhập Hàng
  const handleAddProductToImport = (prodId) => {
    const prod = products.find(p => p.ma_sp === prodId);

    if (!prod) return;
    console.log('KIỂM TRA SẢN PHẨM NHẬP KHO:', {
  id: prod.id,
  ma_sp: prod.ma_sp,
  ten_sp: prod.ten_sp,
  trang_thai: prod.trang_thai
});

    const existing = importCart.find(i => i.ma_sp === prodId);

    if (existing) {
      message.info('Sản phẩm đã có trong danh sách nhập kho.');
    } else {
      setImportCart([
        ...importCart,
        {
          ...prod,
          so_luong_nhap: 10,
          gia_nhap: Math.round(prod.gia_ban * 0.7)
        }
      ]);

      message.success(`Đã thêm ${prod.ten_sp} vào danh sách nhập hàng`);
    }
  };
    // Xác nhận nhập kho hàng -> Cộng dồn vào tồn kho local
  
const handleConfirmImport = async () => {
  if (importCart.length === 0) {
    message.error('Danh sách nhập hàng đang trống!');
    return;
  }

  if (!selectedSupplier) {
    message.error('Vui lòng chọn Nhà cung cấp!');
    return;
  }

  try {
    // Bước 1: Tạo phiếu nhập trong database
    const importRes = await axios.post(`${API_BASE}/api/imports`, {
      nha_cung_cap_id: Number(selectedSupplier)
    });

    if (!importRes.data.success) {
      throw new Error(importRes.data.message);
    }

    const importId = importRes.data.id;

    // Bước 2: Thêm từng sản phẩm vào chi tiết phiếu nhập
    for (const item of importCart) {
      await axios.post(`${API_BASE}/api/imports/${importId}/details`, {
        san_pham_id: Number(item.id),
        so_luong: Number(item.so_luong_nhap),
        don_gia_nhap: Number(item.gia_nhap)
      });
    }

    // Bước 3: Xác nhận nhập kho
    const confirmRes = await axios.put(
      `${API_BASE}/api/imports/${importId}/confirm`
    );

    if (!confirmRes.data.success) {
      throw new Error(confirmRes.data.message);
    }

    message.success('Nhập kho thành công!');

    // Bước 4: Làm mới dữ liệu từ database
    await fetchData();

    const historyRes = await axios.get(`${API_BASE}/api/imports`);

    if (historyRes.data.success) {
      setImportHistory(historyRes.data.data.map(item => ({
        ma_phieu: item.ma_phieu,
        ngay_nhap: item.ngay_nhap,
        nha_cung_cap: item.ten_ncc,
        tong_tien: item.tong_tien
      })));
    }

    // Bước 5: Xóa giỏ nhập hàng
    setImportCart([]);
    setSelectedSupplier(null);

  } catch (error) {
    console.error('Lỗi nhập hàng:', error);
    message.error(
      error.response?.data?.message ||
      error.message ||
      'Không thể thực hiện nhập hàng!'
    );
  }
};


  const handleAddToCart = (product) => {
    if (product.ton_kho <= 0) {
      message.warning(`Sản phẩm [${product.ten_sp}] đã hết hàng trong kho!`);
      return;
    }

    setCart(prevCart => {
      const existingItem = prevCart.find(item => item.ma_sp === product.ma_sp);

      if (existingItem) {
        if (existingItem.so_luong >= product.ton_kho) {
          message.warning('Số lượng trong giỏ hàng đã đạt giới hạn tồn kho!');
          return prevCart;
        }

        return prevCart.map(item =>
          item.ma_sp === product.ma_sp
            ? { ...item, so_luong: item.so_luong + 1 }
            : item
        );

      } else {
        return [
          ...prevCart,
          { ...product, so_luong: 1, don_gia: product.gia_ban }
        ];
      }
    });

    message.success(`Đã thêm ${product.ten_sp}`);
  };


  const handleQuantityChange = (ma_sp, delta) => {
    setCart(prevCart => {
      return prevCart.map(item => {
        if (item.ma_sp === ma_sp) {
          const newQty = item.so_luong + delta;

          if (newQty <= 0) return null;

          if (newQty > item.ton_kho) {
            message.warning('Vượt quá số lượng tồn kho!');
            return item;
          }

          return { ...item, so_luong: newQty };
        }

        return item;
      }).filter(Boolean);
    });
  };


  const handleRemoveItem = (ma_sp) => {
    setCart(prevCart => prevCart.filter(item => item.ma_sp !== ma_sp));
  };


  const totalAmount = cart.reduce(
    (sum, item) => sum + ((item.gia_ban || item.don_gia) * item.so_luong),
    0
  );

  const currentCustomerObj = customers.find(
    c => c.so_dien_thoai === selectedCustomer
  );

  const maxDiemCoTheDung = currentCustomerObj
    ? currentCustomerObj.diem_tich_luy
    : 0;

  const tienGiamGiaDiem = Math.min(
    Math.max(0, totalAmount - (discountAmount || 0)),
    (diemSuDung || 0) * 1000
  );

  const tongThanhToanCuoi = Math.max(
    0,
    totalAmount - (discountAmount || 0) - tienGiamGiaDiem
  );

  const diemThuongDuKien = Math.floor(tongThanhToanCuoi / 50000);


  const filteredProducts = products.filter(p => {
    const matchCat =
      selectedCategory === 'ALL' ||
      p.danh_muc_id === selectedCategory;

    const matchSearch =
      p.ten_sp.toLowerCase().includes(searchText.toLowerCase()) ||
      p.ma_sp.toLowerCase().includes(searchText.toLowerCase());

    return matchCat && matchSearch;
  });


  
const handleCheckout = async () => {
  if (cart.length === 0) {
    message.error('Giỏ hàng đang trống!');
    return;
  }

  if (paymentMethod === 'GHI_NO') {
    message.error('Backend hiện chưa hỗ trợ thanh toán ghi nợ!');
    return;
  }

  if (paymentMethod === 'TIEN_MAT' && cashGiven < tongThanhToanCuoi) {
    message.error('Tiền khách đưa chưa đủ!');
    return;
  }

  setLoading(true);

  try {
    // BƯỚC 1: Tìm ID khách hàng từ số điện thoại
    const khachHang = customers.find(
      c => c.so_dien_thoai === selectedCustomer
    );

    // BƯỚC 2: Tạo đơn hàng
    const orderRes = await axios.post(`${API_BASE}/api/orders`, {
      khach_hang_id: khachHang ? khachHang.id : null,
      ghi_chu: 'Don hang ban tai quay POS'
    });

    if (!orderRes.data.success) {
      throw new Error(orderRes.data.message || 'Không thể tạo đơn hàng!');
    }

    const donHangId = orderRes.data.data.id;
    const maDon = orderRes.data.data.ma_don;

    // BƯỚC 3: Thêm từng sản phẩm vào đơn hàng
    let giamGiaConLai = discountAmount || 0;

    for (const item of cart) {
      const thanhTienGoc = item.gia_ban * item.so_luong;

      // Phân bổ giảm giá trực tiếp vào từng sản phẩm
      const giamGiaSanPham = Math.min(
        giamGiaConLai,
        thanhTienGoc
      );

      giamGiaConLai -= giamGiaSanPham;

      const detailRes = await axios.post(
        `${API_BASE}/api/orders/${donHangId}/details`,
        {
          san_pham_id: Number(item.id),
          so_luong: item.so_luong,
          giam_gia: giamGiaSanPham
        }
      );

      if (!detailRes.data.success) {
        throw new Error(
          detailRes.data.message || 'Không thể thêm sản phẩm vào đơn hàng!'
        );
      }
    }

    // BƯỚC 4: Sử dụng điểm tích lũy nếu khách có chọn
    if (diemSuDung > 0) {
      const pointRes = await axios.put(
        `${API_BASE}/api/orders/${donHangId}/use-points`,
        {
          diem_su_dung: diemSuDung
        }
      );

      if (!pointRes.data.success) {
        throw new Error(
          pointRes.data.message || 'Không thể sử dụng điểm tích lũy!'
        );
      }
    }

    // BƯỚC 5: Ghi nhận thanh toán
    if (tongThanhToanCuoi > 0) {
      const paymentRes = await axios.post(
        `${API_BASE}/api/orders/${donHangId}/payments`,
        {
          so_tien: tongThanhToanCuoi,
          phuong_thuc: paymentMethod
        }
      );

      if (!paymentRes.data.success) {
        throw new Error(
          paymentRes.data.message || 'Thanh toán thất bại!'
        );
      }
    }

    // BƯỚC 6: Xác nhận đơn hàng và trừ tồn kho
    const confirmRes = await axios.put(
      `${API_BASE}/api/orders/${donHangId}/confirm`
    );

    if (!confirmRes.data.success) {
      throw new Error(
        confirmRes.data.message || 'Không thể xác nhận đơn hàng!'
      );
    }

    // BƯỚC 7: Hoàn tất giao diện
    message.success('Thanh toán thành công! Đã lưu đơn và cập nhật tồn kho.');

    setIsModalOpen(false);
    setLatestMaDon(maDon);
    setIsSuccessModalOpen(true);

    setCart([]);
    setSelectedCustomer(null);
    setDiscountAmount(0);
    setDiemSuDung(0);
    setCashGiven(0);

    await fetchData();

  } catch (error) {
    console.error('Lỗi thanh toán:', error);

    message.error(
      error.response?.data?.message ||
      error.message ||
      'Lỗi khi xử lý đơn hàng!'
    );

  } finally {
    setLoading(false);
  }
};


  const columnsCart = [
    {
      title: 'Sản phẩm',
      dataIndex: 'ten_sp',
      key: 'ten_sp',
      render: (text, record) => (
        <div>
          <div style={{ fontWeight: 600 }}>{text}</div>
          <small style={{ color: '#8c8c8c' }}>
            {record.ma_sp} | ĐG: {(record.gia_ban || record.don_gia).toLocaleString()}đ
          </small>
        </div>
      )
    },
    {
      title: 'SL',
      key: 'so_luong',
      width: 100,
      render: (_, record) => (
        <Space size={2}>
          <Button
            size="small"
            icon={<MinusOutlined />}
            onClick={() => handleQuantityChange(record.ma_sp, -1)}
          />
          <span style={{ fontWeight: 'bold', padding: '0 4px' }}>
            {record.so_luong}
          </span>
          <Button
            size="small"
            icon={<PlusOutlined />}
            onClick={() => handleQuantityChange(record.ma_sp, 1)}
          />
        </Space>
      )
    },
    {
      title: 'Thành tiền',
      key: 'thanh_tien',
      align: 'right',
      render: (_, record) => (
        <span style={{ fontWeight: 600, color: '#1890ff' }}>
          {(record.so_luong * (record.gia_ban || record.don_gia)).toLocaleString()}đ
        </span>
      )
    },
    {
      title: '',
      key: 'action',
      width: 35,
      render: (_, record) => (
        <Button
          type="text"
          danger
          icon={<DeleteOutlined />}
          onClick={() => handleRemoveItem(record.ma_sp)}
        />
      )
    }
  ];


  const menuItems = [
    { key: 'pos', icon: <ShoppingCartOutlined />, label: 'Bán Hàng Tại Quầy (POS)' },
    { key: 'imports', icon: <ImportOutlined />, label: 'Quản Lý Nhập Hàng' },
    { key: 'suppliers', icon: <ShopOutlined />, label: 'Nhà Cung Cấp' },
    { key: 'orders', icon: <HistoryOutlined />, label: 'Lịch Sử Đơn Hàng' },
    { key: 'reports', icon: <BarChartOutlined />, label: 'Báo Cáo & Doanh Thu' },
    { key: 'customers', icon: <TeamOutlined />, label: 'Khách Hàng & CRM' },
    { key: 'products', icon: <AppstoreOutlined />, label: 'Quản Lý Sản Phẩm' }
  ];


  if (!isLoggedIn) {
    return (
      <div
        style={{
          height: '100vh',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          background: 'linear-gradient(135deg, #001529 0%, #003a8c 100%)'
        }}
      >
        <Card
          style={{
            width: 380,
            borderRadius: 12,
            boxShadow: '0 8px 24px rgba(0,0,0,0.2)'
          }}
        >
          <div style={{ textAlign: 'center', marginBottom: 24 }}>
            <h1 style={{ color: '#1890ff', margin: 0, fontSize: 26, fontWeight: 'bold' }}>
              🛒 SALES PRO
            </h1>
            <p style={{ color: '#8c8c8c', marginTop: 4 }}>
              Đăng nhập hệ thống quản lý bán hàng
            </p>
          </div>

          <Form layout="vertical" onFinish={handleLogin}>
            <Form.Item label="Tên đăng nhập" required>
              <Input
                prefix={<UserOutlined style={{ color: '#bfbfbf' }} />}
                placeholder="admin"
                size="large"
                value={username}
                onChange={e => setUsername(e.target.value)}
              />
            </Form.Item>

            <Form.Item label="Mật khẩu" required>
              <Input.Password
                prefix={<LockOutlined style={{ color: '#bfbfbf' }} />}
                placeholder="123456"
                size="large"
                value={password}
                onChange={e => setPassword(e.target.value)}
              />
            </Form.Item>

            <Form.Item style={{ marginTop: 28 }}>
              <Button
                type="primary"
                htmlType="submit"
                size="large"
                block
                style={{ borderRadius: 6, fontWeight: 'bold' }}
              >
                ĐĂNG NHẬP
              </Button>
            </Form.Item>
          </Form>
        </Card>
      </div>
    );
  }


  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider
        collapsible
        collapsed={collapsed}
        onCollapse={val => setCollapsed(val)}
        theme="dark"
        width={230}
        style={{ background: '#001529' }}
      >
        <div
          style={{
            height: '64px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: '#002140'
          }}
        >
          <h2
            style={{
              color: '#fff',
              margin: 0,
              fontSize: collapsed ? '14px' : '18px',
              fontWeight: 'bold'
            }}
          >
            🛒 SALES PRO
          </h2>
        </div>

        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[selectedMenuKey]}
          onClick={e => setSelectedMenuKey(e.key)}
          items={menuItems}
        />
      </Sider>

      <Layout>
              <Header
          style={{
            background: '#fff',
            padding: '0 24px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            boxShadow: '0 1px 4px rgba(0,21,41,.08)',
            zIndex: 1
          }}
        >
          <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 'bold' }}>
            HỆ THỐNG BÁN HÀNG - POS
          </h3>

          <Space size="middle">
            <Avatar
              style={{ backgroundColor: '#1890ff' }}
              icon={<UserOutlined />}
            />
            <span style={{ fontWeight: 500 }}>Quản Trị Viên Hệ Thống</span>
            <Tag color="blue">ADMIN</Tag>
            <Button
              type="text"
              danger
              icon={<LogoutOutlined />}
              onClick={handleLogout}
              title="Đăng xuất"
            />
          </Space>
        </Header>

        <Content style={{ margin: '16px', background: '#f0f2f5' }}>
          {selectedMenuKey === 'pos' && (
            <Row gutter={16}>
              <Col xs={24} lg={15}>
                <Card
                  title={
                    <span style={{ fontSize: '16px', fontWeight: 'bold' }}>
                      <ShoppingCartOutlined /> Danh Sách Sản Phẩm
                    </span>
                  }
                  extra={
                    <Search
                      placeholder="Tìm sản phẩm..."
                      allowClear
                      onChange={e => setSearchText(e.target.value)}
                      style={{ width: 220 }}
                    />
                  }
                  style={{ borderRadius: '8px' }}
                >
                  <div
                    style={{
                      marginBottom: '16px',
                      overflowX: 'auto',
                      whiteSpace: 'nowrap'
                    }}
                  >
                    <Button
                      type={selectedCategory === 'ALL' ? 'primary' : 'default'}
                      onClick={() => setSelectedCategory('ALL')}
                      style={{ marginRight: 8, borderRadius: 6 }}
                    >
                      Tất cả
                    </Button>

                    {categories.map(cat => (
                    <Button
                      key={cat.id}
                      type={
                        selectedCategory === cat.id
                          ? 'primary'
                          : 'default'
                      }
                      onClick={() => setSelectedCategory(cat.id)}
                      style={{ marginRight: 8, borderRadius: 6 }}
                    >
                      {cat.ten_danh_muc}
                    </Button>
                  ))}
                  </div>

                  <div
                    style={{
                      maxHeight: '60vh',
                      overflowY: 'auto',
                      paddingRight: '4px'
                    }}
                  >
                    <Row gutter={[12, 12]}>
                      {filteredProducts.map(p => (
                        <Col xs={24} sm={12} md={8} key={p.ma_sp}>
                          <Card
                            hoverable
                            size="small"
                            onClick={() => handleAddToCart(p)}
                            style={{
                              borderRadius: '8px',
                              border: '1px solid #e8e8e8'
                            }}
                            bodyStyle={{ padding: '10px' }}
                          >
                            <div
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '10px',
                                marginBottom: '8px'
                              }}
                            >
                              <img
                                src={
                                  p.hinh_anh ||
                                  `https://placehold.co/60x60/e2e8f0/1e293b?text=${p.ma_sp}`
                                }
                                alt={p.ten_sp}
                                style={{
                                  width: 45,
                                  height: 45,
                                  objectFit: 'cover',
                                  borderRadius: 6,
                                  border: '1px solid #eee'
                                }}
                              />

                              <div style={{ flex: 1, overflow: 'hidden' }}>
                                <Tag
                                  color="blue"
                                  style={{ margin: 0, fontSize: '10px' }}
                                >
                                  {p.ma_sp}
                                </Tag>

                                <div
                                  style={{
                                    fontSize: '11px',
                                    color: p.ton_kho > 0 ? '#52c41a' : '#ff4d4f',
                                    fontWeight: 500
                                  }}
                                >
                                  {p.ton_kho > 0
                                    ? `Kho: ${p.ton_kho}`
                                    : 'Hết hàng'}
                                </div>
                              </div>
                            </div>

                            <div
                              style={{
                                fontWeight: 'bold',
                                fontSize: '13px',
                                margin: '4px 0',
                                minHeight: '34px',
                                lineHeight: '1.2'
                              }}
                            >
                              {p.ten_sp}
                            </div>

                            <div
                              style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                marginTop: '4px'
                              }}
                            >
                              <span
                                style={{
                                  color: '#cf1322',
                                  fontWeight: 'bold',
                                  fontSize: '14px'
                                }}
                              >
                                {p.gia_ban.toLocaleString()} đ
                              </span>

                              <Button
                                type="primary"
                                size="small"
                                icon={<PlusOutlined />}
                                shape="circle"
                              />
                            </div>
                          </Card>
                        </Col>
                      ))}
                    </Row>
                  </div>
                </Card>
              </Col>

              <Col xs={24} lg={9}>
                <Card
                  title={
                    <span style={{ fontSize: '16px', fontWeight: 'bold' }}>
                      Giỏ Hàng Thanh Toán (POS)
                    </span>
                  }
                  extra={
                    cart.length > 0 && (
                      <Button
                        type="text"
                        danger
                        size="small"
                        icon={<CloseCircleOutlined />}
                        onClick={() => {
                          setCart([]);
                          setDiscountAmount(0);
                          setDiemSuDung(0);
                        }}
                      >
                        Hủy đơn
                      </Button>
                    )
                  }
                  style={{ borderRadius: '8px' }}
                >
                  <div style={{ marginBottom: '10px' }}>
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginBottom: 4
                      }}
                    >
                      <span style={{ fontWeight: 500, fontSize: '13px' }}>
                        Khách hàng (Tích điểm 50k = 1đ):
                      </span>

                      <Button
                        type="link"
                        icon={<UserAddOutlined />}
                        size="small"
                        onClick={() => setIsCustomerModalOpen(true)}
                        style={{ padding: 0 }}
                      >
                        + Thêm khách mới
                      </Button>
                    </div>

                    <Select
                      showSearch
                      placeholder="-- Chọn hoặc tìm SĐT khách hàng --"
                      optionFilterProp="children"
                      value={selectedCustomer}
                      onChange={val => {
                        setSelectedCustomer(val);
                        setDiemSuDung(0);
                      }}
                      style={{ width: '100%' }}
                      allowClear
                    >
                      {customers
    .filter(c => Number(c.trang_thai) === 1)
    .map(c => (
        <Option
            key={c.so_dien_thoai}
            value={c.so_dien_thoai}
        >
            {c.ho_ten} - {c.so_dien_thoai} ({c.diem_tich_luy} điểm)
        </Option>
    ))}
                    </Select>
                  </div>

                  <Table
                    dataSource={cart}
                    columns={columnsCart}
                    rowKey="ma_sp"
                    pagination={false}
                    scroll={{ y: 160 }}
                    size="small"
                    locale={{
                      emptyText: 'Chưa có sản phẩm trong giỏ hàng'
                    }}
                  />
                                    <Divider style={{ margin: '8px 0' }} />

                  <div
                    style={{
                      marginBottom: '8px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between'
                    }}
                  >
                    <span style={{ fontSize: '12px', fontWeight: 500 }}>
                      <TagOutlined /> Giảm giá trực tiếp (VNĐ):
                    </span>

                    <InputNumber
                      size="small"
                      min={0}
                      max={totalAmount}
                      value={discountAmount}
                      onChange={val => setDiscountAmount(val || 0)}
                      formatter={value =>
                        `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')
                      }
                      parser={value =>
                        value ? value.replace(/,/g, '') : ''
                      }
                      style={{ width: 130 }}
                      placeholder="0 đ"
                    />
                  </div>

                  <div
                    style={{
                      background: '#fafafa',
                      padding: '8px 10px',
                      borderRadius: '6px',
                      marginBottom: '10px'
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        marginBottom: '2px',
                        fontSize: '12px'
                      }}
                    >
                      <span>Tổng tiền hàng:</span>
                      <b>{totalAmount.toLocaleString()} VNĐ</b>
                    </div>

                    {discountAmount > 0 && (
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          marginBottom: '2px',
                          fontSize: '12px',
                          color: '#fa8c16'
                        }}
                      >
                        <span>Giảm giá trực tiếp:</span>
                        <b>-{discountAmount.toLocaleString()} VNĐ</b>
                      </div>
                    )}

                    {selectedCustomer && (
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          marginBottom: '2px',
                          fontSize: '12px',
                          color: '#1890ff'
                        }}
                      >
                        <span>Điểm hiện có của KH:</span>
                        <b>{maxDiemCoTheDung} điểm</b>
                      </div>
                    )}

                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        marginBottom: '2px',
                        fontSize: '12px'
                      }}
                    >
                      <span>Điểm tích lũy mới:</span>
                      <b style={{ color: '#52c41a' }}>
                        +{diemThuongDuKien} điểm
                      </b>
                    </div>

                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        fontSize: '15px',
                        fontWeight: 'bold',
                        borderTop: '1px dashed #d9d9d9',
                        paddingTop: '4px',
                        marginTop: '4px'
                      }}
                    >
                      <span>Cần thanh toán:</span>
                      <span style={{ color: '#cf1322' }}>
                        {tongThanhToanCuoi.toLocaleString()} VNĐ
                      </span>
                    </div>
                  </div>

                  <Button
                    type="primary"
                    size="large"
                    block
                    disabled={cart.length === 0}
                    onClick={() => {
                      setCashGiven(tongThanhToanCuoi);
                      setIsModalOpen(true);
                    }}
                    style={{
                      height: '42px',
                      fontSize: '15px',
                      fontWeight: 'bold',
                      background: '#52c41a',
                      borderColor: '#52c41a',
                      borderRadius: '6px'
                    }}
                  >
                    Thanh Toán & Xử Lý Đơn
                  </Button>
                </Card>
              </Col>
            </Row>
          )}

          {/* TAB MỚI: QUẢN LÝ NHẬP HÀNG & PHIẾU NHẬP */}
          {selectedMenuKey === 'imports' && (
            <Row gutter={16}>
              <Col xs={24} lg={14}>
                <Card
                  title={
                    <span style={{ fontSize: '16px', fontWeight: 'bold' }}>
                      <ImportOutlined /> Tạo Phiếu Nhập Hàng Kho
                    </span>
                  }
                  style={{ borderRadius: '8px' }}
                >
                  <div style={{ marginBottom: 16 }}>
                    <div style={{ fontWeight: 500, marginBottom: 4 }}>
                      1. Chọn Nhà Cung Cấp:
                    </div>

                    <Select
                      placeholder="-- Chọn nhà cung cấp phân phối --"
                      value={selectedSupplier}
                      onChange={val => setSelectedSupplier(val)}
                      style={{ width: '100%' }}
                    >
                      
{suppliers
  .filter(s => Number(s.trang_thai) === 1)
  .map(s => (
    <Option key={s.ma_ncc} value={s.ma_ncc}>
      {s.ten_ncc} ({s.sdt})
    </Option>
  ))}

                    </Select>
                  </div>

                  <div style={{ marginBottom: 16 }}>
                    <div style={{ fontWeight: 500, marginBottom: 4 }}>
                      2. Chọn sản phẩm nhập vào kho:
                    </div>

                    <Select
                      showSearch
                      placeholder="-- Chọn sản phẩm nhập kho --"
                      onChange={handleAddProductToImport}
                      style={{ width: '100%' }}
                      optionFilterProp="children"
                    >
                      {products.map(p => (
                        <Option key={p.ma_sp} value={p.ma_sp}>
                          {p.ten_sp} (Tồn hiện tại: {p.ton_kho})
                        </Option>
                      ))}
                    </Select>
                  </div>

                  <Table
                    dataSource={importCart}
                    rowKey="ma_sp"
                    pagination={false}
                    size="small"
                    columns={[
                      { title: 'Tên SP', dataIndex: 'ten_sp', key: 'ten_sp' },
                      {
                        title: 'SL Nhập',
                        key: 'so_luong_nhap',
                        width: 110,
                        render: (_, record) => (
                          <InputNumber
                            min={1}
                                                        value={record.so_luong_nhap}
                            onChange={val => {
                              setImportCart(
                                importCart.map(i =>
                                  i.ma_sp === record.ma_sp
                                    ? { ...i, so_luong_nhap: val || 1 }
                                    : i
                                )
                              );
                            }}
                          />
                        )
                      },
                      {
                        title: 'Giá Nhập (VNĐ)',
                        key: 'gia_nhap',
                        width: 140,
                        render: (_, record) => (
                          <InputNumber
                            min={0}
                            value={record.gia_nhap}
                            onChange={val => {
                              setImportCart(
                                importCart.map(i =>
                                  i.ma_sp === record.ma_sp
                                    ? { ...i, gia_nhap: val || 0 }
                                    : i
                                )
                              );
                            }}
                          />
                        )
                      },
                      {
                        title: 'Thành Tiền',
                        key: 'thanh_tien',
                        align: 'right',
                        render: (_, record) => (
                          <b>
                            {(record.so_luong_nhap * record.gia_nhap).toLocaleString()} đ
                          </b>
                        )
                      },
                      {
                        title: '',
                        key: 'action',
                        width: 40,
                        render: (_, record) => (
                          <Button
                            type="text"
                            danger
                            icon={<DeleteOutlined />}
                            onClick={() =>
                              setImportCart(
                                importCart.filter(i => i.ma_sp !== record.ma_sp)
                              )
                            }
                          />
                        )
                      }
                    ]}
                  />

                  <Divider style={{ margin: '12px 0' }} />

                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}
                  >
                    <span style={{ fontSize: '15px', fontWeight: 'bold' }}>
                      Tổng tiền nhập:{' '}
                      <span style={{ color: '#1890ff' }}>
                        {importCart.reduce(
                          (s, i) => s + (i.gia_nhap * i.so_luong_nhap),
                          0
                        ).toLocaleString()} VNĐ
                      </span>
                    </span>

                    <Button
                      type="primary"
                      size="large"
                      icon={<ImportOutlined />}
                      onClick={handleConfirmImport}
                      style={{ background: '#1890ff', fontWeight: 'bold' }}
                    >
                      Xác Nhận Nhập Kho
                    </Button>
                  </div>
                </Card>
              </Col>

              <Col xs={24} lg={10}>
                <Card
                  title={
                    <span style={{ fontSize: '16px', fontWeight: 'bold' }}>
                      <HistoryOutlined /> Lịch Sử Nhập Hàng Gần Đây
                    </span>
                  }
                  style={{ borderRadius: '8px' }}
                >
                  <Table
                    dataSource={importHistory}
                    rowKey="ma_phieu"
                    pagination={{ pageSize: 5 }}
                    locale={{ emptyText: 'Chưa có phiếu nhập hàng nào' }}
                    columns={[
                      {
                        title: 'Mã Phiếu',
                        dataIndex: 'ma_phieu',
                        key: 'ma_phieu'
                      },
                      {
                        title: 'Nhà Cung Cấp',
                        dataIndex: 'nha_cung_cap',
                        key: 'nha_cung_cap'
                      },
                      {
                        title: 'Tổng Tiền',
                        dataIndex: 'tong_tien',
                        key: 'tong_tien',
                        render: val => `${val.toLocaleString()} đ`
                      },
                      {
                        title: 'Thời Gian',
                        dataIndex: 'ngay_nhap',
                        key: 'ngay_nhap'
                      }
                    ]}
                  />
                </Card>
              </Col>
            </Row>
          )}

          {/* TAB MỚI: QUẢN LÝ NHÀ CUNG CẤP */}
          {selectedMenuKey === 'suppliers' && (
            <Card
              title={
                <span style={{ fontSize: '16px', fontWeight: 'bold' }}>
                  <ShopOutlined /> Danh Sách Nhà Cung Cấp & Đối Tác
                </span>
              }
              extra={
                <Button
                  type="primary"
                  icon={<PlusOutlined />}
                  onClick={() => setIsSupplierModalOpen(true)}
                >
                  + Thêm Nhà Cung Cấp
                </Button>
              }
              style={{ borderRadius: '8px' }}
            >
              <Table
                dataSource={suppliers}
                rowKey="ma_ncc"
                columns={[
                  {
                    title: 'Mã NCC',
                    dataIndex: 'ma_ncc',
                    key: 'ma_ncc'
                  },
                  {
                    title: 'Tên Nhà Cung Cấp',
                    dataIndex: 'ten_ncc',
                    key: 'ten_ncc',
                    render: text => <b>{text}</b>
                  },
                  {
                    title: 'Số Điện Thoại',
                    dataIndex: 'sdt',
                    key: 'sdt'
                  },
                  {
                    title: 'Địa Chỉ',
                    dataIndex: 'dia_chi',
                    key: 'dia_chi'
                  },

                  {
  title: 'Trạng Thái',
  dataIndex: 'trang_thai',
  key: 'trang_thai',
  render: status => (
    Number(status) === 1
      ? <Tag color="success">Đang hoạt động</Tag>
      : <Tag color="error">Ngừng hoạt động</Tag>
  )
},
                  {
                    title: 'Hành Động',
                    key: 'action',
                    render: (_, record) => (
                      <Space>
                        <Button
                          type="primary"
                          size="small"
                          onClick={() => {
                            setEditingSupplier({ ...record });
                            setIsEditSupplierModalOpen(true);
                          }}
                        >
                          Sửa
                        </Button>

                        
                        <Button
                          danger
                          size="small"
                          onClick={() => {
                            Modal.confirm({
                              title: 'Xác nhận ngừng hoạt động',
                              content: `Bạn có chắc chắn muốn ngừng hoạt động nhà cung cấp "${record.ten_ncc}" không?`,
                              okText: 'Đồng ý',
                              cancelText: 'Hủy',
                              okButtonProps: { danger: true },
                              onOk: () => handleStopSupplier(record)
                            });
                          }}
                        >
                          Ngừng hoạt động
                        </Button>

                      </Space>
                    )
                  }


                ]}
              />
            </Card>
          )}

          {selectedMenuKey === 'orders' && (
            <Card
              title={
                <span style={{ fontSize: '16px', fontWeight: 'bold' }}>
                  <HistoryOutlined /> Lịch Sử Đơn Hàng
                </span>
              }
              style={{ borderRadius: '8px' }}
            >
              <Table
                dataSource={ordersHistory}
                rowKey="ma_don"
                columns={[
                  {
                    title: 'Mã Đơn',
                    dataIndex: 'ma_don',
                    key: 'ma_don'
                  },
                  {
                    title: 'Thời Gian',
                    dataIndex: 'ngay_lap',
                    key: 'ngay_lap',
                    render: val => new Date(val).toLocaleString('vi-VN')
                  },
                  {
                    title: 'Khách Hàng',
                    dataIndex: 'ten_khach_hang',
                    key: 'ten_khach_hang',
                    render: val => val || 'Khách lẻ'
                  },
                  {
                    title: 'Tổng Tiền',
                    dataIndex: 'tong_tien',
                    key: 'tong_tien',
                    render: val => (
                      <b style={{ color: '#cf1322' }}>
                        {val.toLocaleString()} đ
                      </b>
                    )
                  },
                  {
                    title: 'Thu Ngân',
                    dataIndex: 'nhan_vien_tao',
                    key: 'nhan_vien_tao'
                  },
                  {
                    title: 'Hành Động',
                    key: 'action',
                    render: (_, record) => (
                      <Button
                        type="primary"
                        size="small"
                        icon={<PrinterOutlined />}
                        onClick={async () => {
  try {
    const response = await axios.get(
      `${API_BASE}/api/export-pdf/invoice/${record.ma_don}`,
      {
        headers: {
          Authorization: `Bearer ${token}`
        },
        responseType: 'blob'
      }
    );

    const fileURL = URL.createObjectURL(
      new Blob([response.data], { type: 'application/pdf' })
    );

    window.open(fileURL, '_blank');
  } catch (error) {
    console.error('Lỗi xuất hóa đơn:', error);
    console.error('Chi tiết lỗi từ server:', error.response?.data);
    message.error(
    error.response?.data?.message || 'Không thể xuất hóa đơn PDF!'
  );
  }
}}
                      >
                        In lại hóa đơn
                      </Button>
                    )
                  }
                ]}
              />
            </Card>
          )}

          {selectedMenuKey === 'reports' && (
            <div>
              <Row gutter={16} style={{ marginBottom: 16 }}>
                <Col span={6}>
                  <Card
                    bordered={false}
                    style={{ background: '#e6f7ff', borderRadius: 8 }}
                  >
                    <Statistic
                      title="Tổng Doanh Thu"
                      value={statistics.tong_quan?.tong_doanh_thu || 0}
                      precision={0}
                      valueStyle={{ color: '#1890ff', fontWeight: 'bold' }}
                      suffix="đ"
                    />
                  </Card>
                </Col>
                                <Col span={6}>
                  <Card
                    bordered={false}
                    style={{ background: '#f6ffed', borderRadius: 8 }}
                  >
                    <Statistic
                      title="Tổng Số Đơn Hàng"
                      value={statistics.tong_quan?.tong_don_hang || 0}
                      valueStyle={{ color: '#52c41a', fontWeight: 'bold' }}
                    />
                  </Card>
                </Col>

                <Col span={6}>
                  <Card
                    bordered={false}
                    style={{ background: '#fff7e6', borderRadius: 8 }}
                  >
                    <Statistic
                      title="Tồn Kho Hiện Tại"
                      value={statistics.tong_quan?.tong_ton_kho || 0}
                      valueStyle={{ color: '#fa8c16', fontWeight: 'bold' }}
                    />
                  </Card>
                </Col>

                <Col span={6}>
                  <Card
                    bordered={false}
                    style={{ background: '#fff0f6', borderRadius: 8 }}
                  >
                    <Statistic
                      title="Khách Hàng"
                      value={statistics.tong_quan?.tong_khach_hang || 0}
                      valueStyle={{ color: '#eb2f96', fontWeight: 'bold' }}
                    />
                  </Card>
                </Col>
              </Row>

              <Card
                title={
                  <span style={{ fontSize: '16px', fontWeight: 'bold' }}>
                    <BarChartOutlined /> Biểu Đồ Thống Kê Doanh Thu
                  </span>
                }
                style={{ borderRadius: '8px' }}
              >
                <Tabs
                  defaultActiveKey="daily"
                  items={[
                    {
                      key: 'daily',
                      label: 'Theo Ngày (30 ngày)',
                      children: (
                        <div style={{ height: 350, width: '100%', paddingTop: 20 }}>
                          <ResponsiveContainer>
                            <BarChart data={chartData.daily}>
                              <CartesianGrid strokeDasharray="3 3" />
                              <XAxis dataKey="time_key" />
                              <YAxis />
                              <Tooltip
                                formatter={value => `${value.toLocaleString()} VNĐ`}
                              />
                              <Bar
                                dataKey="doanh_thu"
                                fill="#1890ff"
                                name="Doanh thu"
                              />
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                      )
                    },
                    {
                      key: 'monthly',
                      label: 'Theo Tháng',
                      children: (
                        <div style={{ height: 350, width: '100%', paddingTop: 20 }}>
                          <ResponsiveContainer>
                            <BarChart data={chartData.monthly}>
                              <CartesianGrid strokeDasharray="3 3" />
                              <XAxis dataKey="time_key" />
                              <YAxis />
                              <Tooltip
                                formatter={value => `${value.toLocaleString()} VNĐ`}
                              />
                              <Bar
                                dataKey="doanh_thu"
                                fill="#52c41a"
                                name="Doanh thu"
                              />
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                      )
                    },
                    {
                      key: 'yearly',
                      label: 'Theo Năm',
                      children: (
                        <div style={{ height: 350, width: '100%', paddingTop: 20 }}>
                          <ResponsiveContainer>
                            <BarChart data={chartData.yearly}>
                              <CartesianGrid strokeDasharray="3 3" />
                              <XAxis dataKey="time_key" />
                              <YAxis />
                              <Tooltip
                                formatter={value => `${value.toLocaleString()} VNĐ`}
                              />
                              <Bar
                                dataKey="doanh_thu"
                                fill="#fa8c16"
                                name="Doanh thu"
                              />
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                      )
                    }
                  ]}
                />
              </Card>
            </div>
          )}

          {selectedMenuKey === 'customers' && (
            <Card
              title={
                <span style={{ fontSize: '16px', fontWeight: 'bold' }}>
                  <TeamOutlined /> Quản Lý Khách Hàng & CRM
                </span>
              }
              style={{ borderRadius: '8px' }}
            >
              <Table
                dataSource={customers}
                rowKey="so_dien_thoai"
                columns={[
                  {
                    title: 'Số Điện Thoại',
                    dataIndex: 'so_dien_thoai',
                    key: 'so_dien_thoai'
                  },
                  {
                    title: 'Họ Tên',
                    dataIndex: 'ho_ten',
                    key: 'ho_ten'
                  },
                  {
                    title: 'Điểm Tích Lũy',
                    dataIndex: 'diem_tich_luy',
                    key: 'diem_tich_luy'
                  },
                  {
                    title: 'Hạng Thành Viên',
                    dataIndex: 'hang_thanh_vien',
                    key: 'hang_thanh_vien'
                  },
                  {
    title: 'Trạng Thái',
    dataIndex: 'trang_thai',
    key: 'trang_thai',
    render: (status) => (
        Number(status) === 1
            ? <Tag color="success">Đang hoạt động</Tag>
            : <Tag color="error">Ngừng hoạt động</Tag>
    )
},
                  
{
    title: 'Dư Nợ',
    dataIndex: 'du_no',
    key: 'du_no',
    render: val => (
        <span style={{ color: val > 0 ? 'red' : 'green' }}>
            {val.toLocaleString()} đ
        </span>
    )
},
{
    title: 'Hành Động',
    key: 'action',
    render: (_, record) => (
        <Space>
            <Button
                type="primary"
                size="small"
                onClick={() => handleEditCustomer(record)}
            >
                Chỉnh sửa
            </Button>

            {Number(record.trang_thai) === 1 ? (
    <Button
        danger
        size="small"
        onClick={() => {
            Modal.confirm({
                title: 'Xác nhận ngừng hoạt động',
                content: `Bạn có chắc chắn muốn ngừng hoạt động khách hàng "${record.ho_ten}" không?`,
                okText: 'Đồng ý',
                cancelText: 'Hủy',
                okButtonProps: { danger: true },
                onOk: () => handleStopCustomer(record)
            });
        }}
    >
        Ngừng hoạt động
    </Button>
) : (
    <Button
        type="primary"
        size="small"
        onClick={() => {
            Modal.confirm({
                title: 'Xác nhận kích hoạt khách hàng',
                content: `Bạn có chắc chắn muốn kích hoạt lại khách hàng "${record.ho_ten}" không?`,
                okText: 'Kích hoạt',
                cancelText: 'Hủy',
                onOk: () => handleActivateCustomer(record)
            });
        }}
    >
        Kích hoạt lại
    </Button>
)}
        </Space>
    )
}

                ]}
              />
            </Card>
          )}

          {selectedMenuKey === 'products' && (
            <Card
              title={
                <span style={{ fontSize: '16px', fontWeight: 'bold' }}>
                  <AppstoreOutlined /> Quản Lý Sản Phẩm
                </span>
              }
              style={{ borderRadius: '8px' }}
            >
              <Table
                dataSource={products}
                rowKey="ma_sp"
                columns={[
                  { title: 'Mã SP', dataIndex: 'ma_sp', key: 'ma_sp' },
                  { title: 'Tên Sản Phẩm', dataIndex: 'ten_sp', key: 'ten_sp' },
                  { title: 'Danh Mục', dataIndex: 'ten_danh_muc', key: 'ten_danh_muc' },
                  {
                    title: 'Giá Bán',
                    dataIndex: 'gia_ban',
                    key: 'gia_ban',
                    render: val => `${val.toLocaleString()} đ`
                  },
                  {
                    title: 'Tồn Kho',
                    dataIndex: 'ton_kho',
                    key: 'ton_kho',
                    render: val => (
                      <b style={{ color: val > 0 ? '#52c41a' : '#ff4d4f' }}>
                        {val}
                      </b>
                    )
                  }
                ]}
              />
            </Card>
          )}

          {/* MODAL THÊM KHÁCH HÀNG NHANH */}
          <Modal
            title={
              <span style={{ fontSize: '16px', fontWeight: 'bold' }}>
                <UserAddOutlined /> Thêm Khách Hàng Thành Viên Mới
              </span>
            }
            open={isCustomerModalOpen}
            onOk={handleAddCustomer}
            onCancel={() => setIsCustomerModalOpen(false)}
            okText="Lưu Khách Hàng"
            cancelText="Hủy"
          >
                      <div style={{ padding: '10px 0' }}>
              <div style={{ marginBottom: 12 }}>
                <div style={{ fontWeight: 500, marginBottom: 4 }}>
                  Số điện thoại:
                </div>
                <Input
                  placeholder="Nhập số điện thoại..."
                  value={newPhone}
                  onChange={e => setNewPhone(e.target.value)}
                  size="large"
                />
              </div>

              <div>
                <div style={{ fontWeight: 500, marginBottom: 4 }}>
                  Họ và tên khách hàng:
                </div>
                <Input
                  placeholder="Nhập họ tên..."
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                  size="large"
                />
              </div>
            </div>
          </Modal>

{/* MODAL CHỈNH SỬA KHÁCH HÀNG */}
<Modal
    title={
        <span style={{ fontSize: '16px', fontWeight: 'bold' }}>
            <TeamOutlined /> Chỉnh Sửa Thông Tin Khách Hàng
        </span>
    }
    open={isEditCustomerModalOpen}
    onOk={handleSaveEditCustomer}
    onCancel={() => {
        setIsEditCustomerModalOpen(false);
        setEditingCustomer(null);
    }}
    okText="Lưu Thay Đổi"
    cancelText="Hủy"
>
    <div style={{ padding: '10px 0' }}>
        <div style={{ marginBottom: 12 }}>
            <div style={{ fontWeight: 500, marginBottom: 4 }}>
                Họ và tên:
            </div>
            <Input
                value={editCustomerForm.ho_ten}
                onChange={e =>
                    setEditCustomerForm({
                        ...editCustomerForm,
                        ho_ten: e.target.value
                    })
                }
                placeholder="Nhập họ và tên..."
                size="large"
            />
        </div>

        <div style={{ marginBottom: 12 }}>
            <div style={{ fontWeight: 500, marginBottom: 4 }}>
                Số điện thoại:
            </div>
            <Input
                value={editCustomerForm.so_dien_thoai}
                onChange={e =>
                    setEditCustomerForm({
                        ...editCustomerForm,
                        so_dien_thoai: e.target.value
                    })
                }
                placeholder="Nhập số điện thoại..."
                size="large"
            />
        </div>

        <div style={{ marginBottom: 12 }}>
            <div style={{ fontWeight: 500, marginBottom: 4 }}>
                Email:
            </div>
            <Input
                value={editCustomerForm.email}
                onChange={e =>
                    setEditCustomerForm({
                        ...editCustomerForm,
                        email: e.target.value
                    })
                }
                placeholder="Nhập email..."
                size="large"
            />
        </div>

        <div>
            <div style={{ fontWeight: 500, marginBottom: 4 }}>
                Địa chỉ:
            </div>
            <Input.TextArea
                value={editCustomerForm.dia_chi}
                onChange={e =>
                    setEditCustomerForm({
                        ...editCustomerForm,
                        dia_chi: e.target.value
                    })
                }
                placeholder="Nhập địa chỉ..."
                rows={3}
            />
        </div>
    </div>
</Modal>


          {/* MODAL THÊM NHÀ CUNG CẤP MỚI */}
          <Modal
            title={
              <span style={{ fontSize: '16px', fontWeight: 'bold' }}>
                <ShopOutlined /> Thêm Nhà Cung Cấp Mới
              </span>
            }
            open={isSupplierModalOpen}
            onOk={handleAddSupplier}
            onCancel={() => setIsSupplierModalOpen(false)}
            okText="Lưu Nhà Cung Cấp"
            cancelText="Hủy"
          >
            <div style={{ padding: '10px 0' }}>
              <div style={{ marginBottom: 12 }}>
                <div style={{ fontWeight: 500, marginBottom: 4 }}>
                  Tên nhà cung cấp:
                </div>
                <Input
                  placeholder="Nhập tên công ty / nhà phân phối..."
                  value={newSupplierName}
                  onChange={e => setNewSupplierName(e.target.value)}
                  size="large"
                />
              </div>

              <div style={{ marginBottom: 12 }}>
                <div style={{ fontWeight: 500, marginBottom: 4 }}>
                  Số điện thoại liên hệ:
                </div>
                <Input
                  placeholder="Nhập số điện thoại..."
                  value={newSupplierPhone}
                  onChange={e => setNewSupplierPhone(e.target.value)}
                  size="large"
                />
              </div>

              <div>
                <div style={{ fontWeight: 500, marginBottom: 4 }}>
                  Địa chỉ trụ sở / kho:
                </div>
                <Input
                  placeholder="Nhập địa chỉ..."
                  value={newSupplierAddress}
                  onChange={e => setNewSupplierAddress(e.target.value)}
                  size="large"
                />
              </div>
            </div>
          </Modal>

{/* MODAL SỬA NHÀ CUNG CẤP */}
<Modal
  title={
    <span style={{ fontSize: '16px', fontWeight: 'bold' }}>
      <ShopOutlined /> Chỉnh Sửa Nhà Cung Cấp
    </span>
  }
  open={isEditSupplierModalOpen}
  onOk={handleUpdateSupplier}
  onCancel={() => {
    setIsEditSupplierModalOpen(false);
    setEditingSupplier(null);
  }}
  okText="Lưu Thay Đổi"
  cancelText="Hủy"
>
  {editingSupplier && (
    <div style={{ padding: '10px 0' }}>
      <div style={{ marginBottom: 12 }}>
        <div style={{ fontWeight: 500, marginBottom: 4 }}>
          Tên nhà cung cấp:
        </div>
        <Input
          value={editingSupplier.ten_ncc || ''}
          onChange={e =>
            setEditingSupplier({
              ...editingSupplier,
              ten_ncc: e.target.value
            })
          }
          size="large"
          placeholder="Nhập tên nhà cung cấp..."
        />
      </div>

      <div style={{ marginBottom: 12 }}>
        <div style={{ fontWeight: 500, marginBottom: 4 }}>
          Số điện thoại:
        </div>
        <Input
          value={editingSupplier.sdt || ''}
          onChange={e =>
            setEditingSupplier({
              ...editingSupplier,
              sdt: e.target.value
            })
          }
          size="large"
          placeholder="Nhập số điện thoại..."
        />
      </div>

      <div>
        <div style={{ fontWeight: 500, marginBottom: 4 }}>
          Địa chỉ:
        </div>
        <Input
          value={editingSupplier.dia_chi || ''}
          onChange={e =>
            setEditingSupplier({
              ...editingSupplier,
              dia_chi: e.target.value
            })
          }
          size="large"
          placeholder="Nhập địa chỉ..."
        />
      </div>
    </div>
  )}
</Modal>



          {/* MODAL THANH TOÁN KÈM DÙNG ĐIỂM GIẢM GIÁ */}
          <Modal
            title={
              <span style={{ fontSize: '18px', fontWeight: 'bold' }}>
                Xác Nhận Thanh Toán & Dùng Điểm
              </span>
            }
            open={isModalOpen}
            onOk={handleCheckout}
            onCancel={() => setIsModalOpen(false)}
            confirmLoading={loading}
            okText="Xác Nhận Thanh Toán"
            cancelText="Hủy"
            width={520}
          >
            <div style={{ padding: '10px 0' }}>
              <div
                style={{
                  fontSize: '15px',
                  marginBottom: '12px',
                  background: '#e6f7ff',
                  padding: '10px',
                  borderRadius: '6px'
                }}
              >
                <span>Tổng tiền hàng: </span>
                <b style={{ fontSize: '16px', float: 'right' }}>
                  {totalAmount.toLocaleString()} VNĐ
                </b>
              </div>

              {selectedCustomer && maxDiemCoTheDung > 0 && (
                <div
                  style={{
                    marginBottom: '14px',
                    background: '#fff7e6',
                    padding: '12px',
                    borderRadius: '6px',
                    border: '1px solid #ffe58f'
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginBottom: 6
                    }}
                  >
                    <span style={{ fontWeight: 500, color: '#d46b08' }}>
                      <GiftOutlined /> Dùng điểm giảm giá (1 điểm = 1.000đ):
                    </span>
                    <span style={{ fontSize: '12px', color: '#666' }}>
                      Khách có: <b>{maxDiemCoTheDung} điểm</b>
                    </span>
                  </div>

                  <InputNumber
                    style={{ width: '100%' }}
                    min={0}
                    max={Math.min(
                      maxDiemCoTheDung,
                      Math.floor(Math.max(0, totalAmount - discountAmount) / 1000)
                    )}
                    value={diemSuDung}
                    onChange={val => setDiemSuDung(val || 0)}
                    placeholder="Nhập số điểm muốn dùng..."
                    size="large"
                  />

                  {diemSuDung > 0 && (
                    <div
                      style={{
                        marginTop: 6,
                        color: '#52c41a',
                        fontSize: '13px',
                        fontWeight: 'bold'
                      }}
                    >
                      ✨ Giảm giá điểm: -{tienGiamGiaDiem.toLocaleString()} VNĐ
                    </div>
                  )}
                </div>
              )}

              <div
                style={{
                  fontSize: '16px',
                  marginBottom: '14px',
                  background: '#f6ffed',
                  padding: '12px',
                  borderRadius: '6px',
                  border: '1px solid #b7eb8f',
                  fontWeight: 'bold'
                }}
              >
                <span>Thực trả sau cùng: </span>
                <span
                  style={{
                    fontSize: '18px',
                    color: '#cf1322',
                    float: 'right'
                  }}
                >
                  {tongThanhToanCuoi.toLocaleString()} VNĐ
                </span>
              </div>

              <div style={{ marginBottom: '14px' }}>
                <div style={{ fontWeight: 500, marginBottom: 6 }}>
                  Hình thức thanh toán:
                </div>
                <Radio.Group
                  value={paymentMethod}
                  onChange={e => setPaymentMethod(e.target.value)}
                  buttonStyle="solid"
                >
                  <Radio.Button value="TIEN_MAT">Tiền Mặt</Radio.Button>
                  <Radio.Button value="CHUYEN_KHOAN">Chuyển Khoản QR</Radio.Button>
                  <Radio.Button value="GHI_NO">Ghi Nợ Khách Hàng</Radio.Button>
                </Radio.Group>
              </div>

              {paymentMethod === 'TIEN_MAT' && (
                <>
                  <div style={{ marginBottom: '12px' }}>
                    <div style={{ fontWeight: 500, marginBottom: 4 }}>
                      Tiền khách đưa:
                    </div>
                    <InputNumber
                      style={{ width: '100%' }}
                      size="large"
                      min={0}
                      value={cashGiven}
                      onChange={val => setCashGiven(val || 0)}
                      formatter={value =>
                        `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')
                      }
                      parser={value =>
                        value ? value.replace(/,/g, '') : ''
                      }
                    />
                  </div>

                  <div
                    style={{
                      background: '#fafafa',
                      padding: '10px',
                      borderRadius: '6px',
                      border: '1px solid #d9d9d9'
                    }}
                  >
                    <span>Tiền thừa trả lại: </span>
                    <b
                      style={{
                        fontSize: '16px',
                        color: '#52c41a',
                        float: 'right'
                      }}
                    >
                      {Math.max(0, cashGiven - tongThanhToanCuoi).toLocaleString()} VNĐ
                    </b>
                  </div>
                                  </>
              )}

              {paymentMethod === 'CHUYEN_KHOAN' && (
                <div
                  style={{
                    textAlign: 'center',
                    padding: '12px',
                    background: '#fafafa',
                    borderRadius: '8px'
                  }}
                >
                  <img
                    src={`https://api.vietqr.io/image/970422-0388888888-nCoV.jpg?amount=${tongThanhToanCuoi}&addInfo=ThanhToanPOS`}
                    alt="QR Code"
                    style={{
                      width: '150px',
                      height: '150px',
                      objectFit: 'contain'
                    }}
                  />

                  <div
                    style={{
                      marginTop: 6,
                      color: '#666',
                      fontSize: '12px'
                    }}
                  >
                    Quét mã QR bằng ứng dụng ngân hàng để thanh toán
                  </div>
                </div>
              )}
            </div>
          </Modal>


          {/* POPUP THÀNH CÔNG: IN HÓA ĐƠN */}
          <Modal
            title={
              <span style={{ color: '#52c41a', fontWeight: 'bold' }}>
                ✅ Thanh Toán Đơn Hàng Thành Công!
              </span>
            }
            open={isSuccessModalOpen}
            onCancel={() => setIsSuccessModalOpen(false)}
            footer={[
              <Button
                key="cancel"
                onClick={() => setIsSuccessModalOpen(false)}
              >
                Hủy bỏ / Bỏ qua
              </Button>,

              <Button
                key="print"
                type="primary"
                icon={<PrinterOutlined />}
                style={{
                  background: '#52c41a',
                  borderColor: '#52c41a',
                  fontWeight: 'bold'
                }}
                onClick={() => {
                  window.open(
                    `${API_BASE}/api/export-pdf/invoice/${latestMaDon}`,
                    '_blank'
                  );
                  setIsSuccessModalOpen(false);
                }}
              >
                In Hóa Đơn
              </Button>
            ]}
          >
            <div style={{ padding: '8px 0', fontSize: '15px' }}>
              <p>
                Đơn hàng <b>{latestMaDon}</b> đã lưu thành công, đã trừ/cộng
                điểm tích lũy và trừ tồn kho.
              </p>

              <p style={{ color: '#666', margin: 0 }}>
                Bạn có muốn in hóa đơn cho khách hàng ngay bây giờ không?
              </p>
            </div>
          </Modal>

        </Content>
      </Layout>
    </Layout>
  );
}

export default App;

  