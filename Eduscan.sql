L-- =========== BẢNG TỔ CHỨC ===========
CREATE TABLE TOCHUC (
    maToChuc BIGSERIAL PRIMARY KEY,
    tenToChuc VARCHAR(255) NOT NULL,
    loaiToChuc VARCHAR(50) NOT NULL,
    diaChi TEXT,
    urlLogo VARCHAR(255),
    thoiGianTao TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    thoiGianCapNhat TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- =========== BẢNG NGƯỜI DÙNG ===========
CREATE TABLE NGUOIDUNG (
    maNguoiDung BIGSERIAL PRIMARY KEY,
    maToChuc BIGINT NOT NULL REFERENCES TOCHUC(maToChuc),
    email VARCHAR(255) NOT NULL UNIQUE,
    matKhauMaHoa VARCHAR(255) NOT NULL,
    hoTen VARCHAR(255) NOT NULL,
    vaiTro VARCHAR(50) NOT NULL,
    soDienThoai VARCHAR(20),
    urlAnhDaiDien VARCHAR(255),
    thoiGianDangNhapCuoi TIMESTAMP,
    trangThai BOOLEAN NOT NULL DEFAULT TRUE,
    thoiGianTao TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    thoiGianCapNhat TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_vaitro CHECK (vaiTro IN ('admin', 'manager', 'teacher'))
);

CREATE INDEX idx_nguoidung_tochuc ON NGUOIDUNG(maToChuc);
CREATE INDEX idx_nguoidung_email ON NGUOIDUNG(email);

-- =========== BẢNG LỚP HỌC ===========
CREATE TABLE LOPHOC (
    maLopHoc BIGSERIAL PRIMARY KEY,
    maToChuc BIGINT NOT NULL REFERENCES TOCHUC(maToChuc),
    tenLop VARCHAR(100) NOT NULL,
    capHoc VARCHAR(20),
    namHoc VARCHAR(20),
    maGiaoVienChuNhiem BIGINT NOT NULL REFERENCES NGUOIDUNG(maNguoiDung),
    moTa TEXT,
    trangThai BOOLEAN NOT NULL DEFAULT TRUE,
    thoiGianTao TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    thoiGianCapNhat TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_lophoc_tochuc ON LOPHOC(maToChuc);
CREATE INDEX idx_lophoc_giaovien ON LOPHOC(maGiaoVienChuNhiem);

-- =========== BẢNG HỌC SINH ===========
CREATE TABLE HOCSINH (
    maHocSinh BIGSERIAL PRIMARY KEY,
    maLopHoc BIGINT NOT NULL REFERENCES LOPHOC(maLopHoc),
    maHocSinhTruong VARCHAR(50) NOT NULL,
    hoTen VARCHAR(255) NOT NULL,
    ngaySinh DATE,
    gioiTinh VARCHAR(10),
    soDienThoaiPhuHuynh VARCHAR(20),
    emailPhuHuynh VARCHAR(255),
    trangThai BOOLEAN NOT NULL DEFAULT TRUE,
    thoiGianTao TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    thoiGianCapNhat TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(maHocSinhTruong, maLopHoc)
);

CREATE INDEX idx_hocsinh_lophoc ON HOCSINH(maLopHoc);
CREATE INDEX idx_hocsinh_mahocsinhtruong ON HOCSINH(maHocSinhTruong);

-- =========== BẢNG MẪU PHIẾU TRẢ LỜI ===========
CREATE TABLE MAUPHIEUTRALOI (
    maMauPhieu BIGSERIAL PRIMARY KEY,
    maToChuc BIGINT NOT NULL REFERENCES TOCHUC(maToChuc),
    maNguoiTao BIGINT NOT NULL REFERENCES NGUOIDUNG(maNguoiDung),
    tenMauPhieu VARCHAR(255) NOT NULL,
    soCauHoi INTEGER NOT NULL,
    soLuaChonMoiCau INTEGER NOT NULL DEFAULT 4,
    khoGiay VARCHAR(10) NOT NULL DEFAULT 'A4',
    coTuLuan BOOLEAN NOT NULL DEFAULT FALSE,
    coThongTinHocSinh BOOLEAN NOT NULL DEFAULT TRUE,
    coLogo BOOLEAN NOT NULL DEFAULT FALSE,
    cauTrucJSON JSONB,
    cssFormat TEXT,
    laMacDinh BOOLEAN NOT NULL DEFAULT FALSE,
    laCongKhai BOOLEAN NOT NULL DEFAULT FALSE,
    thoiGianTao TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    thoiGianCapNhat TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_socauhoi CHECK (soCauHoi > 0),
    CONSTRAINT chk_soluachon CHECK (soLuaChonMoiCau >= 2)
);

CREATE INDEX idx_mauphieutraloi_tochuc ON MAUPHIEUTRALOI(maToChuc);
CREATE INDEX idx_mauphieutraloi_nguoitao ON MAUPHIEUTRALOI(maNguoiTao);

-- =========== BẢNG BÀI KIỂM TRA ===========
CREATE TABLE BAIKIEMTRA (
    maBaiKiemTra BIGSERIAL PRIMARY KEY,
    maToChuc BIGINT NOT NULL REFERENCES TOCHUC(maToChuc),
    maNguoiTao BIGINT NOT NULL REFERENCES NGUOIDUNG(maNguoiDung),
    maMauPhieu BIGINT NOT NULL REFERENCES MAUPHIEUTRALOI(maMauPhieu),
    tieuDe VARCHAR(255) NOT NULL,
    monHoc VARCHAR(100) NOT NULL,
    ngayThi DATE,
    thoiGianLamBai INTEGER,
    tongSoCau INTEGER NOT NULL,
    tongDiem DECIMAL(5,2) NOT NULL DEFAULT 10.0,
    moTa TEXT,
    laDeThiTongHop BOOLEAN NOT NULL DEFAULT FALSE,
    trangThai VARCHAR(20) NOT NULL DEFAULT 'nhap',
    thoiGianTao TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    thoiGianCapNhat TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_tongsocau CHECK (tongSoCau > 0),
    CONSTRAINT chk_tongdiem CHECK (tongDiem > 0)
);

CREATE INDEX idx_baikiemtra_tochuc ON BAIKIEMTRA(maToChuc);
CREATE INDEX idx_baikiemtra_nguoitao ON BAIKIEMTRA(maNguoiTao);
CREATE INDEX idx_baikiemtra_mauphieu ON BAIKIEMTRA(maMauPhieu);

-- =========== BẢNG GÁN ĐỀ CHO LỚP ===========
CREATE TABLE BAIKIEMTRA_LOPHOC (
    maBKT_LopHoc BIGSERIAL PRIMARY KEY,
    maBaiKiemTra BIGINT NOT NULL REFERENCES BAIKIEMTRA(maBaiKiemTra) ON DELETE CASCADE,
    maLopHoc BIGINT NOT NULL REFERENCES LOPHOC(maLopHoc) ON DELETE CASCADE,
    thoiGianTao TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(maBaiKiemTra, maLopHoc)
);

CREATE INDEX idx_baikiemtra_lophoc_bkt ON BAIKIEMTRA_LOPHOC(maBaiKiemTra);
CREATE INDEX idx_baikiemtra_lophoc_lophoc ON BAIKIEMTRA_LOPHOC(maLopHoc);

-- =========== BẢNG ĐÁP ÁN ===========
CREATE TABLE DAPAN (
    maDapAn BIGSERIAL PRIMARY KEY,
    maBaiKiemTra BIGINT NOT NULL REFERENCES BAIKIEMTRA(maBaiKiemTra) ON DELETE CASCADE,
    dapAnJSON JSONB NOT NULL,
    diemMoiCauJSON JSONB,
    thoiGianTao TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    thoiGianCapNhat TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(maBaiKiemTra)
);

CREATE INDEX idx_dapan_baikiemtra ON DAPAN(maBaiKiemTra);

-- =========== BẢNG PHIẾU TRẢ LỜI ===========
CREATE TABLE PHIEUTRALOI (
    maPhieuTraLoi BIGSERIAL PRIMARY KEY,
    maBaiKiemTra BIGINT NOT NULL REFERENCES BAIKIEMTRA(maBaiKiemTra),
    maHocSinh BIGINT NOT NULL REFERENCES HOCSINH(maHocSinh),
    maNguoiQuet BIGINT NOT NULL REFERENCES NGUOIDUNG(maNguoiDung),
    urlHinhAnh VARCHAR(255),
    urlHinhAnhXuLy VARCHAR(255),
    cauTraLoiJSON JSONB,
    daXuLyHoanTat BOOLEAN NOT NULL DEFAULT FALSE,
    doTinCay DECIMAL(5,2),
    canhBaoJSON JSONB,
    thoiGianQuet TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    thoiGianTao TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    thoiGianCapNhat TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(maBaiKiemTra, maHocSinh)
);

CREATE INDEX idx_phieutraloi_baikiemtra ON PHIEUTRALOI(maBaiKiemTra);
CREATE INDEX idx_phieutraloi_hocsinh ON PHIEUTRALOI(maHocSinh);
CREATE INDEX idx_phieutraloi_nguoiquet ON PHIEUTRALOI(maNguoiQuet);

-- =========== BẢNG KẾT QUẢ ===========
CREATE TABLE KETQUA (
    maKetQua BIGSERIAL PRIMARY KEY,
    maPhieuTraLoi BIGINT NOT NULL REFERENCES PHIEUTRALOI(maPhieuTraLoi) ON DELETE CASCADE,
    maBaiKiemTra BIGINT NOT NULL REFERENCES BAIKIEMTRA(maBaiKiemTra),
    maHocSinh BIGINT NOT NULL REFERENCES HOCSINH(maHocSinh),
    diem DECIMAL(5,2) NOT NULL,
    soCauDung INTEGER NOT NULL,
    soCauSai INTEGER NOT NULL,
    soCauChuaTraLoi INTEGER NOT NULL,
    chiTietJSON JSONB,
    diemTheoMonJSON JSONB,
    thuHangTrongLop INTEGER,
    thoiGianTao TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    thoiGianCapNhat TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(maPhieuTraLoi),
    CONSTRAINT chk_diem_ketqua CHECK (diem >= 0),
    CONSTRAINT chk_socau_dung CHECK (soCauDung >= 0),
    CONSTRAINT chk_socau_sai CHECK (soCauSai >= 0),
    CONSTRAINT chk_socau_chuatraloi CHECK (soCauChuaTraLoi >= 0)
);

CREATE INDEX idx_ketqua_phieutraloi ON KETQUA(maPhieuTraLoi);
CREATE INDEX idx_ketqua_baikiemtra ON KETQUA(maBaiKiemTra);
CREATE INDEX idx_ketqua_hocsinh ON KETQUA(maHocSinh);

-- =========== BẢNG THỐNG KÊ KIỂM TRA ===========
CREATE TABLE THONGKEKIEMTRA (
    maThongKe BIGSERIAL PRIMARY KEY,
    maBaiKiemTra BIGINT NOT NULL REFERENCES BAIKIEMTRA(maBaiKiemTra) ON DELETE CASCADE,
    maLopHoc BIGINT NOT NULL REFERENCES LOPHOC(maLopHoc),
    soLuongThamGia INTEGER NOT NULL DEFAULT 0,
    diemTrungBinh DECIMAL(5,2),
    diemCaoNhat DECIMAL(5,2),
    diemThapNhat DECIMAL(5,2),
    diemTrungVi DECIMAL(5,2),
    doLechChuan DECIMAL(5,2),
    thongKeCauHoiJSON JSONB,
    phanLoaiDoKhoJSON JSONB,
    phanBoDiemJSON JSONB,
    thoiGianTao TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    thoiGianCapNhat TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(maBaiKiemTra, maLopHoc),
    CONSTRAINT chk_thamgia CHECK (soLuongThamGia >= 0)
);

CREATE INDEX idx_thongkekiemtra_baikiemtra ON THONGKEKIEMTRA(maBaiKiemTra);
CREATE INDEX idx_thongkekiemtra_lophoc ON THONGKEKIEMTRA(maLopHoc);

-- =========== BẢNG CÀI ĐẶT ===========
CREATE TABLE CAIDAT (
    maCaiDat BIGSERIAL PRIMARY KEY,
    maToChuc BIGINT NOT NULL REFERENCES TOCHUC(maToChuc),
    tuKhoa VARCHAR(100) NOT NULL,
    giaTri TEXT,
    thoiGianTao TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    thoiGianCapNhat TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(maToChuc, tuKhoa)
);

CREATE INDEX idx_caidat_tochuc ON CAIDAT(maToChuc);

-- =========== BẢNG TẬP TIN ===========
CREATE TABLE TAPTIN (
    maTapTin BIGSERIAL PRIMARY KEY,
    maNguoiDung BIGINT NOT NULL REFERENCES NGUOIDUNG(maNguoiDung),
    maToChuc BIGINT NOT NULL REFERENCES TOCHUC(maToChuc),
    tenTapTin VARCHAR(255) NOT NULL,
    duongDan VARCHAR(500) NOT NULL,
    loaiTapTin VARCHAR(100) NOT NULL,
    kichThuoc INTEGER NOT NULL,
    thucTheNguon VARCHAR(50),
    maThucTheNguon BIGINT,
    thoiGianTao TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_kichthuoc CHECK (kichThuoc > 0)
);

CREATE INDEX idx_taptin_nguoidung ON TAPTIN(maNguoiDung);
CREATE INDEX idx_taptin_tochuc ON TAPTIN(maToChuc);
CREATE INDEX idx_taptin_thucthe ON TAPTIN(thucTheNguon, maThucTheNguon);
