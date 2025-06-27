# """
# create_eduscan_tables – fixed for SQLAlchemy 2.x (upper-case tables, camelCase columns)

# Revision ID: ff60d5c04b9b
# Revises    :
# Create Date: 2025-05-21 12:34:00
# """
# from __future__ import annotations

# import datetime as _dt
# import json
# import random

# from alembic import op
# import sqlalchemy as sa
# from sqlalchemy.dialects.postgresql import JSONB

# # ------------ Alembic identifiers ------------
# revision: str = "ff60d5c04b9b"
# down_revision: str | None = None
# branch_labels = None
# depends_on = None
# # ---------------------------------------------

# # ---------- tiện ích sinh dữ liệu -------------
# ORG_TYPES = (
#     "TRUONG_THPT",
#     "TRUONG_THCS",
#     "TIEU_HOC",
#     "TRUONG_DAI_HOC",
# )
# ROLES = ("ADMIN", "MANAGER", "TEACHER")
# CAP_HOC = ("THPT", "THCS", "TIEU_HOC", "TRUONG_DAI_HOC")
# MON_HOC = [
#     "Toán",
#     "Vật lý",
#     "Hóa",
#     "Sinh",
#     "Ngữ văn",
#     "Tiếng Anh",
#     "Lịch sử",
#     "Địa lý",
# ]

# HO_LIST = [
#     "Nguyễn",
#     "Trần",
#     "Lê",
#     "Phạm",
#     "Hoàng",
#     "Huỳnh",
#     "Phan",
#     "Vũ",
#     "Đặng",
#     "Bùi",
# ]
# TEN_NAM = [
#     "Minh",
#     "Hùng",
#     "Dũng",
#     "Tùng",
#     "Thắng",
#     "Quang",
#     "Phong",
#     "Hải",
#     "Nam",
#     "Tuấn",
# ]
# TEN_NU = [
#     "Hương",
#     "Lan",
#     "Phương",
#     "Mai",
#     "Linh",
#     "Thảo",
#     "Hà",
#     "Trang",
#     "Anh",
#     "Yến",
# ]

# today_year = _dt.date.today().year
# # ----------------------------------------------

# # ============================================================
# # Helper – always use exec_driver_sql() for raw SQL (SA 2.x)
# # ============================================================

# def exec_sql(sql: str):
#     """Shortcut to run plain SQL under SQLAlchemy 2.x safe API."""
#     bind = op.get_bind()
#     return bind.exec_driver_sql(sql)

# # ============================================================
# #                    U P G R A D E
# # ============================================================

# def upgrade() -> None:  # noqa: C901 – long but clear
#     # 1.  TỔ CHỨC
#     op.create_table(
#         "TOCHUC",
#         sa.Column("maToChuc", sa.BigInteger, primary_key=True, autoincrement=True),
#         sa.Column("tenToChuc", sa.String(255), nullable=False),
#         sa.Column("loaiToChuc", sa.String(50), nullable=False),
#         sa.Column("diaChi", sa.Text),
#         sa.Column("urlLogo", sa.String(255)),
#         sa.Column("thoiGianTao", sa.TIMESTAMP, server_default=sa.text("CURRENT_TIMESTAMP")),
#         sa.Column("thoiGianCapNhat", sa.TIMESTAMP, server_default=sa.text("CURRENT_TIMESTAMP")),
#         sa.CheckConstraint('"loaiToChuc" IN %s' % str(ORG_TYPES), name="chk_loai_to_chuc"),
#     )

#     # 2.  NGƯỜI DÙNG
#     op.create_table(
#         "NGUOIDUNG",
#         sa.Column("maNguoiDung", sa.BigInteger, primary_key=True, autoincrement=True),
#         sa.Column("maToChuc", sa.BigInteger, sa.ForeignKey("TOCHUC.maToChuc", ondelete="CASCADE")),  # sửa
#         sa.Column("email", sa.String(255), nullable=False, unique=True),
#         sa.Column("matKhauMaHoa", sa.String(255), nullable=False),
#         sa.Column("hoTen", sa.String(255), nullable=False),
#         sa.Column("vaiTro", sa.String(50), nullable=False),
#         sa.Column("soDienThoai", sa.String(20)),
#         sa.Column("urlAnhDaiDien", sa.String(255)),
#         sa.Column("thoiGianDangNhapCuoi", sa.TIMESTAMP),
#         sa.Column("trangThai", sa.Boolean, server_default=sa.text("TRUE")),
#         sa.Column("thoiGianTao", sa.TIMESTAMP, server_default=sa.text("CURRENT_TIMESTAMP")),
#         sa.Column("thoiGianCapNhat", sa.TIMESTAMP, server_default=sa.text("CURRENT_TIMESTAMP")),
#         sa.CheckConstraint('"vaiTro" IN %s' % str(ROLES), name="chk_vai_tro"),
#     )
#     op.create_index("idx_nguoidung_tochuc", "NGUOIDUNG", ["maToChuc"])

#     # 3.  LỚP HỌC
#     op.create_table(
#         "LOPHOC",
#         sa.Column("maLopHoc", sa.BigInteger, primary_key=True, autoincrement=True),
#         sa.Column("maToChuc", sa.BigInteger, sa.ForeignKey("TOCHUC.maToChuc", ondelete="CASCADE"), nullable=False),  # sửa
#         sa.Column("tenLop", sa.String(100), nullable=False),
#         sa.Column("capHoc", sa.String(20)),
#         sa.Column("namHoc", sa.String(20)),
#         sa.Column("maGiaoVienChuNhiem", sa.BigInteger, sa.ForeignKey("NGUOIDUNG.maNguoiDung", ondelete="CASCADE"), nullable=False),  # sửa
#         sa.Column("moTa", sa.Text),
#         sa.Column("trangThai", sa.Boolean, server_default=sa.text("TRUE")),
#         sa.Column("thoiGianTao", sa.TIMESTAMP, server_default=sa.text("CURRENT_TIMESTAMP")),
#         sa.Column("thoiGianCapNhat", sa.TIMESTAMP, server_default=sa.text("CURRENT_TIMESTAMP")),
#         sa.CheckConstraint('"capHoc" IN %s' % str(CAP_HOC), name="chk_cap_hoc"),
#     )
#     op.create_index("idx_lophoc_to_chuc", "LOPHOC", ["maToChuc"])
#     op.create_index("idx_lophoc_gvcn", "LOPHOC", ["maGiaoVienChuNhiem"])

#     # 4.  HỌC SINH
#     op.create_table(
#         "HOCSINH",
#         sa.Column("maHocSinh", sa.BigInteger, primary_key=True, autoincrement=True),
#         sa.Column("maLopHoc", sa.BigInteger, sa.ForeignKey("LOPHOC.maLopHoc", ondelete="CASCADE"), nullable=False),  # sửa
#         sa.Column("maHocSinhTruong", sa.String(50), nullable=False),
#         sa.Column("hoTen", sa.String(255), nullable=False),
#         sa.Column("ngaySinh", sa.Date),
#         sa.Column("gioiTinh", sa.String(10)),
#         sa.Column("soDienThoaiPhuHuynh", sa.String(20)),
#         sa.Column("emailPhuHuynh", sa.String(255)),
#         sa.Column("trangThai", sa.Boolean, server_default=sa.text("TRUE")),
#         sa.Column("thoiGianTao", sa.TIMESTAMP, server_default=sa.text("CURRENT_TIMESTAMP")),
#         sa.Column("thoiGianCapNhat", sa.TIMESTAMP, server_default=sa.text("CURRENT_TIMESTAMP")),
#         sa.UniqueConstraint("maHocSinhTruong", "maLopHoc", name="uq_hocsinh_code_lop"),
#     )
#     op.create_index("idx_hocsinh_lop", "HOCSINH", ["maLopHoc"])

#     # 5.  MẪU PHIẾU
#     op.create_table(
#         "MAUPHIEUTRALOI",
#         sa.Column("maMauPhieu", sa.BigInteger, primary_key=True, autoincrement=True),
#         sa.Column("maToChuc", sa.BigInteger, sa.ForeignKey("TOCHUC.maToChuc", ondelete="CASCADE"), nullable=False),  # sửa
#         sa.Column("maNguoiTao", sa.BigInteger, sa.ForeignKey("NGUOIDUNG.maNguoiDung", ondelete="CASCADE"), nullable=False),  # sửa
#         sa.Column("tenMauPhieu", sa.String(255), nullable=False),
#         sa.Column("soCauHoi", sa.Integer, nullable=False),
#         sa.Column("soLuaChonMoiCau", sa.Integer, server_default="4", nullable=False),
#         sa.Column("khoGiay", sa.String(10), server_default="A4", nullable=False),
#         sa.Column("coTuLuan", sa.Boolean, server_default=sa.text("FALSE")),
#         sa.Column("coThongTinHocSinh", sa.Boolean, server_default=sa.text("TRUE")),
#         sa.Column("coLogo", sa.Boolean, server_default=sa.text("FALSE")),
#         sa.Column("cauTrucJson", JSONB),
#         sa.Column("cssFormat", sa.Text),
#         sa.Column("laMacDinh", sa.Boolean, server_default=sa.text("FALSE")),
#         sa.Column("laCongKhai", sa.Boolean, server_default=sa.text("FALSE")),
#         sa.Column("thoiGianTao", sa.TIMESTAMP, server_default=sa.text("CURRENT_TIMESTAMP")),
#         sa.Column("thoiGianCapNhat", sa.TIMESTAMP, server_default=sa.text("CURRENT_TIMESTAMP")),
#         sa.CheckConstraint('"soCauHoi" > 0', name="chk_so_cau_hoi"),
#         sa.CheckConstraint('"soLuaChonMoiCau" >= 2', name="chk_so_lc"),
#     )
#     op.create_index("idx_mauphieu_org", "MAUPHIEUTRALOI", ["maToChuc"])
#     op.create_index("idx_mauphieu_author", "MAUPHIEUTRALOI", ["maNguoiTao"])

#     # 6.  BÀI KIỂM TRA
#     op.create_table(
#         "BAIKIEMTRA",
#         sa.Column("maBaiKiemTra", sa.BigInteger, primary_key=True, autoincrement=True),
#         sa.Column("maToChuc", sa.BigInteger, sa.ForeignKey("TOCHUC.maToChuc", ondelete="CASCADE"), nullable=False),  # sửa
#         sa.Column("maNguoiTao", sa.BigInteger, sa.ForeignKey("NGUOIDUNG.maNguoiDung", ondelete="CASCADE"), nullable=False),  # sửa
#         sa.Column("maMauPhieu", sa.BigInteger, sa.ForeignKey("MAUPHIEUTRALOI.maMauPhieu", ondelete="CASCADE"), nullable=False),  # sửa
#         sa.Column("tieuDe", sa.String(255), nullable=False),
#         sa.Column("monHoc", sa.String(100), nullable=False),
#         sa.Column("ngayThi", sa.Date),
#         sa.Column("thoiGianLamBai", sa.Integer),
#         sa.Column("tongSoCau", sa.Integer, nullable=False),
#         sa.Column("tongDiem", sa.Numeric(5, 2), server_default="10", nullable=False),
#         sa.Column("moTa", sa.Text),
#         sa.Column("laDeTongHop", sa.Boolean, server_default=sa.text("FALSE")),
#         sa.Column("trangThai", sa.String(20), server_default="nhap"),
#         sa.Column("thoiGianTao", sa.TIMESTAMP, server_default=sa.text("CURRENT_TIMESTAMP")),
#         sa.Column("thoiGianCapNhat", sa.TIMESTAMP, server_default=sa.text("CURRENT_TIMESTAMP")),
#         sa.CheckConstraint('"tongSoCau" > 0', name="chk_tong_so_cau"),
#         sa.CheckConstraint('"tongDiem" > 0', name="chk_tong_diem"),
#     )
#     op.create_index("idx_bkt_org", "BAIKIEMTRA", ["maToChuc"])
#     op.create_index("idx_bkt_author", "BAIKIEMTRA", ["maNguoiTao"])

#     # 7 – BAIKIEMTRA_LOPHOC ----------------------------------------
#     op.create_table(
#         "BAIKIEMTRA_LOPHOC",
#         sa.Column("id", sa.BigInteger, primary_key=True, autoincrement=True),
#         sa.Column("maBaiKiemTra", sa.BigInteger, sa.ForeignKey("BAIKIEMTRA.maBaiKiemTra", ondelete="CASCADE"), nullable=False),
#         sa.Column("maLopHoc", sa.BigInteger, sa.ForeignKey("LOPHOC.maLopHoc", ondelete="CASCADE"), nullable=False),
#         sa.Column("thoiGianTao", sa.TIMESTAMP, server_default=sa.text("CURRENT_TIMESTAMP")),
#         sa.UniqueConstraint("maBaiKiemTra", "maLopHoc", name="uq_bkt_lop"),
#     )


#     # 8 – DAPAN -----------------------------------------------------
#     op.create_table(
#         "DAPAN",
#         sa.Column("maDapAn", sa.BigInteger, primary_key=True, autoincrement=True),
#         sa.Column("maBaiKiemTra", sa.BigInteger, sa.ForeignKey("BAIKIEMTRA.maBaiKiemTra", ondelete="CASCADE"), nullable=False, unique=True),
#         sa.Column("dapAnJson", JSONB, nullable=False),
#         sa.Column("diemMoiCauJson", JSONB),
#         sa.Column("thoiGianTao", sa.TIMESTAMP, server_default=sa.text("CURRENT_TIMESTAMP")),
#         sa.Column("thoiGianCapNhat", sa.TIMESTAMP, server_default=sa.text("CURRENT_TIMESTAMP")),
#     )

#     # 9 – PHIEUTRALOI ----------------------------------------------
#     op.create_table(
#         "PHIEUTRALOI",
#         sa.Column("maPhieuTraLoi", sa.BigInteger, primary_key=True, autoincrement=True),
#         sa.Column("maBaiKiemTra", sa.BigInteger, sa.ForeignKey("BAIKIEMTRA.maBaiKiemTra")),
#         sa.Column("maHocSinh", sa.BigInteger, sa.ForeignKey("HOCSINH.maHocSinh")),
#         sa.Column("maNguoiQuet", sa.BigInteger, sa.ForeignKey("NGUOIDUNG.maNguoiDung")),
#         sa.Column("urlHinhAnh", sa.String(255)),
#         sa.Column("urlHinhAnhXuLy", sa.String(255)),
#         sa.Column("cauTraLoiJson", JSONB),
#         sa.Column("daXuLyHoanTat", sa.Boolean, server_default=sa.text("FALSE")),
#         sa.Column("doTinCay", sa.Numeric(5, 2)),
#         sa.Column("canhBaoJson", JSONB),
#         sa.Column("thoiGianQuet", sa.TIMESTAMP, server_default=sa.text("CURRENT_TIMESTAMP")),
#         sa.Column("thoiGianTao", sa.TIMESTAMP, server_default=sa.text("CURRENT_TIMESTAMP")),
#         sa.Column("thoiGianCapNhat", sa.TIMESTAMP, server_default=sa.text("CURRENT_TIMESTAMP")),
#         sa.UniqueConstraint("maBaiKiemTra", "maHocSinh", name="uq_phieu_unique"),
#     )

#     # 10 – KETQUA ----------------------------------------------------
#     op.create_table(
#         "KETQUA",
#         sa.Column("maKetQua", sa.BigInteger, primary_key=True, autoincrement=True),
#         sa.Column("maPhieuTraLoi", sa.BigInteger, sa.ForeignKey("PHIEUTRALOI.maPhieuTraLoi", ondelete="CASCADE"), unique=True),
#         sa.Column("maBaiKiemTra", sa.BigInteger, sa.ForeignKey("BAIKIEMTRA.maBaiKiemTra")),
#         sa.Column("maHocSinh", sa.BigInteger, sa.ForeignKey("HOCSINH.maHocSinh")),
#         sa.Column("diem", sa.Numeric(5, 2), nullable=False),
#         sa.Column("soCauDung", sa.Integer, nullable=False),
#         sa.Column("soCauSai", sa.Integer, nullable=False),
#         sa.Column("soCauChuaTraLoi", sa.Integer, nullable=False),
#         sa.Column("chiTietJson", JSONB),
#         sa.Column("diemTheoMonJson", JSONB),
#         sa.Column("thuHangTrongLop", sa.Integer),
#         sa.Column("thoiGianTao", sa.TIMESTAMP, server_default=sa.text("CURRENT_TIMESTAMP")),
#         sa.Column("thoiGianCapNhat", sa.TIMESTAMP, server_default=sa.text("CURRENT_TIMESTAMP")),
#         sa.CheckConstraint('"diem" >= 0', name="chk_diem_duong"),
#     )

#     # 11 – THONGKEKIEMTRA ------------------------------------------
#     op.create_table(
#         "THONGKEKIEMTRA",
#         sa.Column("maThongKe", sa.BigInteger, primary_key=True, autoincrement=True),
#         sa.Column("maBaiKiemTra", sa.BigInteger, sa.ForeignKey("BAIKIEMTRA.maBaiKiemTra", ondelete="CASCADE")),
#         sa.Column("maLopHoc", sa.BigInteger, sa.ForeignKey("LOPHOC.maLopHoc")),
#         sa.Column("soLuongThamGia", sa.Integer, server_default="0", nullable=False),
#         sa.Column("diemTrungBinh", sa.Numeric(5, 2)),
#         sa.Column("diemCaoNhat", sa.Numeric(5, 2)),
#         sa.Column("diemThapNhat", sa.Numeric(5, 2)),
#         sa.Column("diemTrungVi", sa.Numeric(5, 2)),
#         sa.Column("doLechChuan", sa.Numeric(5, 2)),
#         sa.Column("thongKeCauHoiJson", JSONB),
#         sa.Column("phanLoaiDoKhoJson", JSONB),
#         sa.Column("phanBoDiemJson", JSONB),
#         sa.Column("thoiGianTao", sa.TIMESTAMP, server_default=sa.text("CURRENT_TIMESTAMP")),
#         sa.Column("thoiGianCapNhat", sa.TIMESTAMP, server_default=sa.text("CURRENT_TIMESTAMP")),
#         sa.UniqueConstraint("maBaiKiemTra", "maLopHoc", name="uq_thongke_bkt_lop"),
#     )

#     # 12 – CAIDAT ----------------------------------------------------
#     op.create_table(
#         "CAIDAT",
#         sa.Column("maCaiDat", sa.BigInteger, primary_key=True, autoincrement=True),
#         sa.Column("maToChuc", sa.BigInteger, sa.ForeignKey("TOCHUC.maToChuc"), nullable=False),
#         sa.Column("tuKhoa", sa.String(100), nullable=False),
#         sa.Column("giaTri", sa.Text),
#         sa.Column("thoiGianTao", sa.TIMESTAMP, server_default=sa.text("CURRENT_TIMESTAMP")),
#         sa.Column("thoiGianCapNhat", sa.TIMESTAMP, server_default=sa.text("CURRENT_TIMESTAMP")),
#         sa.UniqueConstraint("maToChuc", "tuKhoa", name="uq_caidat_org_key"),
#     )

#     # 13 – TAPTIN ----------------------------------------------------
#     op.create_table(
#         "TAPTIN",
#         sa.Column("maTapTin", sa.BigInteger, primary_key=True, autoincrement=True),
#         sa.Column("maNguoiDung", sa.BigInteger, sa.ForeignKey("NGUOIDUNG.maNguoiDung"), nullable=False),
#         sa.Column("maToChuc", sa.BigInteger, sa.ForeignKey("TOCHUC.maToChuc"), nullable=False),
#         sa.Column("tenTapTin", sa.String(255), nullable=False),
#         sa.Column("duongDan", sa.String(500), nullable=False),
#         sa.Column("loaiTapTin", sa.String(100), nullable=False),
#         sa.Column("kichThuoc", sa.Integer, nullable=False),
#         sa.Column("thucTheNguon", sa.String(50)),
#         sa.Column("maThucTheNguon", sa.BigInteger),
#         sa.Column("thoiGianTao", sa.TIMESTAMP, server_default=sa.text("CURRENT_TIMESTAMP")),
#         sa.CheckConstraint('"kichThuoc" > 0', name="chk_kich_thuoc_duong"),
#     )

#     # ==============================================================
#     # 14.  SAMPLE DATA
#     # ==============================================================
#     # --- Chèn tổ chức
#     orgs_sql = """INSERT INTO "TOCHUC" ("tenToChuc", "loaiToChuc", "diaChi") VALUES
#         ('Trường THPT Nguyễn Huệ', 'TRUONG_THPT', '123 Lê Lợi, Q1, TP.HCM'),
#         ('Trường THCS Lê Quý Đôn', 'TRUONG_THCS', '45 CMT8, Q3, TP.HCM'),
#         ('Trường Đại học Sư Phạm Kỹ Thuật – ĐH Đà Nẵng', 'TRUONG_DAI_HOC', '01 Võ Văn Ngân, Thủ Đức, TP.HCM');"""
#     exec_sql(orgs_sql)

#     # --- super admin
#     exec_sql(
#         """INSERT INTO \"NGUOIDUNG\" (\"maToChuc\",\"email\",\"matKhauMaHoa\",\"hoTen\",\"vaiTro\",\"soDienThoai\") VALUES
#         (NULL,'superadmin@eduscan.ai','HASHED','Super Admin','ADMIN','0900000000');"""
#     )

#     # --- managers & teachers
#     for org_id in range(1, 4):
#         exec_sql(
#             f"INSERT INTO \"NGUOIDUNG\" (\"maToChuc\",\"email\",\"matKhauMaHoa\",\"hoTen\",\"vaiTro\") VALUES"
#             f"({org_id},'manager{org_id}@example.csom','HASH','Manager {org_id}','MANAGER');"
#         )
#         for t in range(1, 4):
#             exec_sql(
#                 f"INSERT INTO \"NGUOIDUNG\" (\"maToChuc\",\"email\",\"matKhauMaHoa\",\"hoTen\",\"vaiTro\") VALUES"
#                 f"({org_id},'teacher{org_id}_{t}@example.com','HASH','GV {org_id}_{t}','TEACHER');"
#             )

#     # --- lớp & học sinh
#     gv_offset = 1 + 3
#     current_teacher = gv_offset
#     lop_seq = 0

#     for org_id in range(1, 4):
#         for idx in range(1, 3):
#             lop_seq += 1
#             ten_lop = f"{10+idx}{chr(64+idx)}"
#             cap_hoc = "THPT" if org_id == 1 else "THCS"
#             nam_hoc = f"{today_year}-{today_year+1}"
#             gvcn = current_teacher
#             current_teacher += 1
#             exec_sql(
#                 f"INSERT INTO \"LOPHOC\" (\"maToChuc\",\"tenLop\",\"capHoc\",\"namHoc\",\"maGiaoVienChuNhiem\") VALUES"
#                 f"({org_id},'{ten_lop}','{cap_hoc}','{nam_hoc}',{gvcn});"
#             )
#             for stt in range(1, 31):
#                 male = random.choice([True, False])
#                 ho = random.choice(HO_LIST)
#                 ten = random.choice(TEN_NAM if male else TEN_NU)
#                 ns = _dt.date(today_year-16, random.randint(1,12), random.randint(1,28))
#                 gt = "Nam" if male else "Nữ"
#                 code = f"{lop_seq:02d}{stt:03d}"
#                 exec_sql(
#                     f"INSERT INTO \"HOCSINH\" (\"maLopHoc\",\"maHocSinhTruong\",\"hoTen\",\"ngaySinh\",\"gioiTinh\") VALUES"
#                     f"({lop_seq},'{code}','{ho} {ten}','{ns}','{gt}');"
#                 )

#     # --- mẫu phiếu mặc định
#     exec_sql(
#         """INSERT INTO \"MAUPHIEUTRALOI\" (\"maToChuc\",\"maNguoiTao\",\"tenMauPhieu\",\"soCauHoi\") SELECT \"maToChuc\",MIN(\"maNguoiDung\"),'Mẫu 40 câu - 4 lựa chọn',40 FROM \"NGUOIDUNG\" WHERE \"vaiTro\"='MANAGER' GROUP BY \"maToChuc\";"""
#     )

#     # --- bài kiểm tra + đáp án + gán lớp
#     teacher_ids = [r[0] for r in exec_sql("SELECT DISTINCT \"maGiaoVienChuNhiem\" FROM \"LOPHOC\"").fetchall()]

#     for tid in teacher_ids:
#         org = exec_sql(f"SELECT \"maToChuc\" FROM \"NGUOIDUNG\" WHERE \"maNguoiDung\"={tid}").scalar()
#         lop = exec_sql(f"SELECT \"maLopHoc\" FROM \"LOPHOC\" WHERE \"maGiaoVienChuNhiem\"={tid} LIMIT 1").scalar()
#         mau = exec_sql(f"SELECT \"maMauPhieu\" FROM \"MAUPHIEUTRALOI\" WHERE \"maToChuc\"={org} LIMIT 1").scalar()
#         if lop is None or mau is None:
#             continue
#         for lan in range(1,3):
#             mon = random.choice(MON_HOC)
#             tong = 40
#             ngay_thi = _dt.date(today_year, random.randint(3,6), random.randint(1,28))
#             exec_sql(
#                 f"INSERT INTO \"BAIKIEMTRA\" (\"maToChuc\",\"maNguoiTao\",\"maMauPhieu\",\"tieuDe\",\"monHoc\",\"ngayThi\",\"tongSoCau\") VALUES"
#                 f"({org},{tid},{mau},'KT {mon} lần {lan} - GV {tid}','{mon}','{ngay_thi}',{tong});"
#             )
#             bkt = exec_sql("SELECT lastval();").scalar()
#             exec_sql(
#                 f"INSERT INTO \"BAIKIEMTRA_LOPHOC\" (\"maBaiKiemTra\",\"maLopHoc\") VALUES ({bkt},{lop});"
#             )
#             answer = {str(i): random.choice("ABCD") for i in range(1,tong+1)}
#             exec_sql(
#                 f"INSERT INTO \"DAPAN\" (\"maBaiKiemTra\",\"dapAnJson\") VALUES ({bkt},'{json.dumps(answer,ensure_ascii=False)}');"
#             )

# # ============================================================
# #                   D O W N G R A D E
# # ============================================================

# def downgrade() -> None:
#     for tbl in (
#         "TAPTIN",
#         "CAIDAT",
#         "THONGKEKIEMTRA",
#         "KETQUA",
#         "PHIEUTRALOI",
#         "DAPAN",
#         "BAIKIEMTRA_LOPHOC",
#         "BAIKIEMTRA",
#         "MAUPHIEUTRALOI",
#         "HOCSINH",
#         "LOPHOC",
#         "NGUOIDUNG",
#         "TOCHUC",
#     ):
#         op.drop_table(tbl)
"""
create_eduscan_tables – fixed for SQLAlchemy 2.x (upper-case tables, camelCase columns, sample data)

Revision ID: ff60d5c04b9b
Revises    :
Create Date: 2025-05-21 12:34:00
"""
from __future__ import annotations

import datetime as _dt
import json
import random
import uuid

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSONB

# ------------ Alembic identifiers ------------
revision: str = "ff60d5c04b9b"
down_revision: str | None = None
branch_labels = None
depends_on = None
# ---------------------------------------------

# ---------- tiện ích sinh dữ liệu -------------
ORG_TYPES = (
    "TRUONG_THPT",
    "TRUONG_THCS",
    "TIEU_HOC",
    "TRUONG_DAI_HOC",
)
ROLES = ("ADMIN", "MANAGER", "TEACHER")
CAP_HOC = ("THPT", "THCS", "TIEU_HOC", "TRUONG_DAI_HOC")
MON_HOC = [
    "Toán",
    "Vật lý",
    "Hóa",
    "Sinh",
    "Ngữ văn",
    "Tiếng Anh",
    "Lịch sử",
    "Địa lý",
]

HO_LIST = [
    "Nguyễn",
    "Trần",
    "Lê",
    "Phạm",
    "Hoàng",
    "Huỳnh",
    "Phan",
    "Vũ",
    "Đặng",
    "Bùi",
]
TEN_NAM = [
    "Minh",
    "Hùng",
    "Dũng",
    "Tùng",
    "Thắng",
    "Quang",
    "Phong",
    "Hải",
    "Nam",
    "Tuấn",
]
TEN_NU = [
    "Hương",
    "Lan",
    "Phương",
    "Mai",
    "Linh",
    "Thảo",
    "Hà",
    "Trang",
    "Anh",
    "Yến",
]

today_year = _dt.date.today().year
# ----------------------------------------------

# ============================================================
# Helper – always use exec_driver_sql() for raw SQL (SA 2.x)
# ============================================================

def exec_sql(sql: str):
    """Shortcut to run plain SQL under SQLAlchemy 2.x safe API."""
    bind = op.get_bind()
    return bind.exec_driver_sql(sql)

# ============================================================
#                    U P G R A D E
# ============================================================

def upgrade() -> None:  # noqa: C901 – long but clear
    # 1.  TỔ CHỨC
    op.create_table(
        "TOCHUC",
        sa.Column("maToChuc", sa.BigInteger, primary_key=True, autoincrement=True),
        sa.Column("tenToChuc", sa.String(255), nullable=False),
        sa.Column("loaiToChuc", sa.String(50), nullable=False),
        sa.Column("diaChi", sa.Text),
        sa.Column("urlLogo", sa.String(255)),
        sa.Column("thoiGianTao", sa.TIMESTAMP, server_default=sa.text("CURRENT_TIMESTAMP")),
        sa.Column("thoiGianCapNhat", sa.TIMESTAMP, server_default=sa.text("CURRENT_TIMESTAMP")),
        sa.CheckConstraint('"loaiToChuc" IN %s' % str(ORG_TYPES), name="chk_loai_to_chuc"),
    )

    # 2.  NGƯỜI DÙNG
    op.create_table(
        "NGUOIDUNG",
        sa.Column("maNguoiDung", sa.BigInteger, primary_key=True, autoincrement=True),
        sa.Column("maToChuc", sa.BigInteger, sa.ForeignKey("TOCHUC.maToChuc", ondelete="CASCADE")),  # sửa
        sa.Column("email", sa.String(255), nullable=False, unique=True),
        sa.Column("matKhauMaHoa", sa.String(255), nullable=False),
        sa.Column("hoTen", sa.String(255), nullable=False),
        sa.Column("vaiTro", sa.String(50), nullable=False),
        sa.Column("soDienThoai", sa.String(20)),
        sa.Column("urlAnhDaiDien", sa.String(255)),
        sa.Column("thoiGianDangNhapCuoi", sa.TIMESTAMP),
        sa.Column("trangThai", sa.Boolean, server_default=sa.text("TRUE")),
        sa.Column("thoiGianTao", sa.TIMESTAMP, server_default=sa.text("CURRENT_TIMESTAMP")),
        sa.Column("thoiGianCapNhat", sa.TIMESTAMP, server_default=sa.text("CURRENT_TIMESTAMP")),
        sa.CheckConstraint('"vaiTro" IN %s' % str(ROLES), name="chk_vai_tro"),
    )
    op.create_index("idx_nguoidung_tochuc", "NGUOIDUNG", ["maToChuc"])

    # 3.  LỚP HỌC
    op.create_table(
        "LOPHOC",
        sa.Column("maLopHoc", sa.BigInteger, primary_key=True, autoincrement=True),
        sa.Column("maToChuc", sa.BigInteger, sa.ForeignKey("TOCHUC.maToChuc", ondelete="CASCADE"), nullable=False),  # sửa
        sa.Column("tenLop", sa.String(100), nullable=False),
        sa.Column("capHoc", sa.String(20)),
        sa.Column("namHoc", sa.String(20)),
        sa.Column("maGiaoVienChuNhiem", sa.BigInteger, sa.ForeignKey("NGUOIDUNG.maNguoiDung", ondelete="CASCADE"), nullable=False),  # sửa
        sa.Column("moTa", sa.Text),
        sa.Column("trangThai", sa.Boolean, server_default=sa.text("TRUE")),
        sa.Column("thoiGianTao", sa.TIMESTAMP, server_default=sa.text("CURRENT_TIMESTAMP")),
        sa.Column("thoiGianCapNhat", sa.TIMESTAMP, server_default=sa.text("CURRENT_TIMESTAMP")),
        sa.CheckConstraint('"capHoc" IN %s' % str(CAP_HOC), name="chk_cap_hoc"),
    )
    op.create_index("idx_lophoc_to_chuc", "LOPHOC", ["maToChuc"])
    op.create_index("idx_lophoc_gvcn", "LOPHOC", ["maGiaoVienChuNhiem"])

    # 4.  HỌC SINH
    op.create_table(
        "HOCSINH",
        sa.Column("maHocSinh", sa.BigInteger, primary_key=True, autoincrement=True),
        sa.Column("maLopHoc", sa.BigInteger, sa.ForeignKey("LOPHOC.maLopHoc", ondelete="CASCADE"), nullable=False),  # sửa
        sa.Column("maHocSinhTruong", sa.String(50), nullable=False),
        sa.Column("hoTen", sa.String(255), nullable=False),
        sa.Column("ngaySinh", sa.Date),
        sa.Column("gioiTinh", sa.String(10)),
        sa.Column("soDienThoaiPhuHuynh", sa.String(20)),
        sa.Column("emailPhuHuynh", sa.String(255)),
        sa.Column("trangThai", sa.Boolean, server_default=sa.text("TRUE")),
        sa.Column("thoiGianTao", sa.TIMESTAMP, server_default=sa.text("CURRENT_TIMESTAMP")),
        sa.Column("thoiGianCapNhat", sa.TIMESTAMP, server_default=sa.text("CURRENT_TIMESTAMP")),
        sa.UniqueConstraint("maHocSinhTruong", "maLopHoc", name="uq_hocsinh_code_lop"),
    )
    op.create_index("idx_hocsinh_lop", "HOCSINH", ["maLopHoc"])

    # 5.  MẪU PHIẾU
    op.create_table(
        "MAUPHIEUTRALOI",
        sa.Column("maMauPhieu", sa.BigInteger, primary_key=True, autoincrement=True),
        sa.Column("maToChuc", sa.BigInteger, sa.ForeignKey("TOCHUC.maToChuc", ondelete="CASCADE"), nullable=False),  # sửa
        sa.Column("maNguoiTao", sa.BigInteger, sa.ForeignKey("NGUOIDUNG.maNguoiDung", ondelete="CASCADE"), nullable=False),  # sửa
        sa.Column("tenMauPhieu", sa.String(255), nullable=False),
        sa.Column("soCauHoi", sa.Integer, nullable=False),
        sa.Column("soLuaChonMoiCau", sa.Integer, server_default="4", nullable=False),
        sa.Column("khoGiay", sa.String(10), server_default="A4", nullable=False),
        sa.Column("coTuLuan", sa.Boolean, server_default=sa.text("FALSE")),
        sa.Column("coThongTinHocSinh", sa.Boolean, server_default=sa.text("TRUE")),
        sa.Column("coLogo", sa.Boolean, server_default=sa.text("FALSE")),
        sa.Column("cauTrucJson", JSONB),
        sa.Column("cssFormat", sa.Text),
        sa.Column("laMacDinh", sa.Boolean, server_default=sa.text("FALSE")),
        sa.Column("laCongKhai", sa.Boolean, server_default=sa.text("FALSE")),
        sa.Column("thoiGianTao", sa.TIMESTAMP, server_default=sa.text("CURRENT_TIMESTAMP")),
        sa.Column("thoiGianCapNhat", sa.TIMESTAMP, server_default=sa.text("CURRENT_TIMESTAMP")),
        sa.CheckConstraint('"soCauHoi" > 0', name="chk_so_cau_hoi"),
        sa.CheckConstraint('"soLuaChonMoiCau" >= 2', name="chk_so_lc"),
    )
    op.create_index("idx_mauphieu_org", "MAUPHIEUTRALOI", ["maToChuc"])
    op.create_index("idx_mauphieu_author", "MAUPHIEUTRALOI", ["maNguoiTao"])

    # 6.  BÀI KIỂM TRA
    op.create_table(
        "BAIKIEMTRA",
        sa.Column("maBaiKiemTra", sa.BigInteger, primary_key=True, autoincrement=True),
        sa.Column("maToChuc", sa.BigInteger, sa.ForeignKey("TOCHUC.maToChuc", ondelete="CASCADE"), nullable=False),  # sửa
        sa.Column("maNguoiTao", sa.BigInteger, sa.ForeignKey("NGUOIDUNG.maNguoiDung", ondelete="CASCADE"), nullable=False),  # sửa
        sa.Column("maMauPhieu", sa.BigInteger, sa.ForeignKey("MAUPHIEUTRALOI.maMauPhieu", ondelete="CASCADE"), nullable=False),  # sửa
        sa.Column("tieuDe", sa.String(255), nullable=False),
        sa.Column("monHoc", sa.String(100), nullable=False),
        sa.Column("ngayThi", sa.Date),
        sa.Column("thoiGianLamBai", sa.Integer),
        sa.Column("tongSoCau", sa.Integer, nullable=False),
        sa.Column("tongDiem", sa.Numeric(5, 2), server_default="10", nullable=False),
        sa.Column("moTa", sa.Text),
        sa.Column("laDeTongHop", sa.Boolean, server_default=sa.text("FALSE")),
        sa.Column("trangThai", sa.String(20), server_default="nhap"),
        sa.Column("thoiGianTao", sa.TIMESTAMP, server_default=sa.text("CURRENT_TIMESTAMP")),
        sa.Column("thoiGianCapNhat", sa.TIMESTAMP, server_default=sa.text("CURRENT_TIMESTAMP")),
        sa.CheckConstraint('"tongSoCau" > 0', name="chk_tong_so_cau"),
        sa.CheckConstraint('"tongDiem" > 0', name="chk_tong_diem"),
    )
    op.create_index("idx_bkt_org", "BAIKIEMTRA", ["maToChuc"])
    op.create_index("idx_bkt_author", "BAIKIEMTRA", ["maNguoiTao"])

    # 7 – BAIKIEMTRA_LOPHOC ----------------------------------------
    op.create_table(
        "BAIKIEMTRA_LOPHOC",
        sa.Column("id", sa.BigInteger, primary_key=True, autoincrement=True),
        sa.Column("maBaiKiemTra", sa.BigInteger, sa.ForeignKey("BAIKIEMTRA.maBaiKiemTra", ondelete="CASCADE"), nullable=False),
        sa.Column("maLopHoc", sa.BigInteger, sa.ForeignKey("LOPHOC.maLopHoc", ondelete="CASCADE"), nullable=False),
        sa.Column("thoiGianTao", sa.TIMESTAMP, server_default=sa.text("CURRENT_TIMESTAMP")),
        sa.UniqueConstraint("maBaiKiemTra", "maLopHoc", name="uq_bkt_lop"),
    )

    # 8 – DAPAN -----------------------------------------------------
    op.create_table(
        "DAPAN",
        sa.Column("maDapAn", sa.BigInteger, primary_key=True, autoincrement=True),
        sa.Column("maBaiKiemTra", sa.BigInteger, sa.ForeignKey("BAIKIEMTRA.maBaiKiemTra", ondelete="CASCADE"), nullable=False, unique=True),
        sa.Column("dapAnJson", JSONB, nullable=False),
        sa.Column("diemMoiCauJson", JSONB),
        sa.Column("thoiGianTao", sa.TIMESTAMP, server_default=sa.text("CURRENT_TIMESTAMP")),
        sa.Column("thoiGianCapNhat", sa.TIMESTAMP, server_default=sa.text("CURRENT_TIMESTAMP")),
    )

    # 9 – PHIEUTRALOI ----------------------------------------------
    op.create_table(
        "PHIEUTRALOI",
        sa.Column("maPhieuTraLoi", sa.BigInteger, primary_key=True, autoincrement=True),
        sa.Column("maBaiKiemTra", sa.BigInteger, sa.ForeignKey("BAIKIEMTRA.maBaiKiemTra")),
        sa.Column("maHocSinh", sa.BigInteger, sa.ForeignKey("HOCSINH.maHocSinh")),
        sa.Column("maNguoiQuet", sa.BigInteger, sa.ForeignKey("NGUOIDUNG.maNguoiDung")),
        sa.Column("urlHinhAnh", sa.String(255)),
        sa.Column("urlHinhAnhXuLy", sa.String(255)),
        sa.Column("cauTraLoiJson", JSONB),
        sa.Column("daXuLyHoanTat", sa.Boolean, server_default=sa.text("FALSE")),
        sa.Column("doTinCay", sa.Numeric(5, 2)),
        sa.Column("canhBaoJson", JSONB),
        sa.Column("thoiGianQuet", sa.TIMESTAMP, server_default=sa.text("CURRENT_TIMESTAMP")),
        sa.Column("thoiGianTao", sa.TIMESTAMP, server_default=sa.text("CURRENT_TIMESTAMP")),
        sa.Column("thoiGianCapNhat", sa.TIMESTAMP, server_default=sa.text("CURRENT_TIMESTAMP")),
        sa.UniqueConstraint("maBaiKiemTra", "maHocSinh", name="uq_phieu_unique"),
    )

    # 10 – KETQUA ----------------------------------------------------
    op.create_table(
        "KETQUA",
        sa.Column("maKetQua", sa.BigInteger, primary_key=True, autoincrement=True),
        sa.Column("maPhieuTraLoi", sa.BigInteger, sa.ForeignKey("PHIEUTRALOI.maPhieuTraLoi", ondelete="CASCADE"), unique=True),
        sa.Column("maBaiKiemTra", sa.BigInteger, sa.ForeignKey("BAIKIEMTRA.maBaiKiemTra")),
        sa.Column("maHocSinh", sa.BigInteger, sa.ForeignKey("HOCSINH.maHocSinh")),
        sa.Column("diem", sa.Numeric(5, 2), nullable=False),
        sa.Column("soCauDung", sa.Integer, nullable=False),
        sa.Column("soCauSai", sa.Integer, nullable=False),
        sa.Column("soCauChuaTraLoi", sa.Integer, nullable=False),
        sa.Column("chiTietJson", JSONB),
        sa.Column("diemTheoMonJson", JSONB),
        sa.Column("thuHangTrongLop", sa.Integer),
        sa.Column("thoiGianTao", sa.TIMESTAMP, server_default=sa.text("CURRENT_TIMESTAMP")),
        sa.Column("thoiGianCapNhat", sa.TIMESTAMP, server_default=sa.text("CURRENT_TIMESTAMP")),
        sa.CheckConstraint('"diem" >= 0', name="chk_diem_duong"),
    )

    # 11 – THONGKEKIEMTRA ------------------------------------------
    op.create_table(
        "THONGKEKIEMTRA",
        sa.Column("maThongKe", sa.BigInteger, primary_key=True, autoincrement=True),
        sa.Column("maBaiKiemTra", sa.BigInteger, sa.ForeignKey("BAIKIEMTRA.maBaiKiemTra", ondelete="CASCADE")),
        sa.Column("maLopHoc", sa.BigInteger, sa.ForeignKey("LOPHOC.maLopHoc")),
        sa.Column("soLuongThamGia", sa.Integer, server_default="0", nullable=False),
        sa.Column("diemTrungBinh", sa.Numeric(5, 2)),
        sa.Column("diemCaoNhat", sa.Numeric(5, 2)),
        sa.Column("diemThapNhat", sa.Numeric(5, 2)),
        sa.Column("diemTrungVi", sa.Numeric(5, 2)),
        sa.Column("doLechChuan", sa.Numeric(5, 2)),
        sa.Column("thongKeCauHoiJson", JSONB),
        sa.Column("phanLoaiDoKhoJson", JSONB),
        sa.Column("phanBoDiemJson", JSONB),
        sa.Column("thoiGianTao", sa.TIMESTAMP, server_default=sa.text("CURRENT_TIMESTAMP")),
        sa.Column("thoiGianCapNhat", sa.TIMESTAMP, server_default=sa.text("CURRENT_TIMESTAMP")),
        sa.UniqueConstraint("maBaiKiemTra", "maLopHoc", name="uq_thongke_bkt_lop"),
    )

    # 12 – CAIDAT ----------------------------------------------------
    op.create_table(
        "CAIDAT",
        sa.Column("maCaiDat", sa.BigInteger, primary_key=True, autoincrement=True),
        sa.Column("maToChuc", sa.BigInteger, sa.ForeignKey("TOCHUC.maToChuc"), nullable=False),
        sa.Column("tuKhoa", sa.String(100), nullable=False),
        sa.Column("giaTri", sa.Text),
        sa.Column("thoiGianTao", sa.TIMESTAMP, server_default=sa.text("CURRENT_TIMESTAMP")),
        sa.Column("thoiGianCapNhat", sa.TIMESTAMP, server_default=sa.text("CURRENT_TIMESTAMP")),
        sa.UniqueConstraint("maToChuc", "tuKhoa", name="uq_caidat_org_key"),
    )

    # 13 – TAPTIN ----------------------------------------------------
    op.create_table(
        "TAPTIN",
        sa.Column("maTapTin", sa.BigInteger, primary_key=True, autoincrement=True),
        sa.Column("maNguoiDung", sa.BigInteger, sa.ForeignKey("NGUOIDUNG.maNguoiDung"), nullable=False),
        sa.Column("maToChuc", sa.BigInteger, sa.ForeignKey("TOCHUC.maToChuc"), nullable=False),
        sa.Column("tenTapTin", sa.String(255), nullable=False),
        sa.Column("duongDan", sa.String(500), nullable=False),
        sa.Column("loaiTapTin", sa.String(100), nullable=False),
        sa.Column("kichThuoc", sa.Integer, nullable=False),
        sa.Column("thucTheNguon", sa.String(50)),
        sa.Column("maThucTheNguon", sa.BigInteger),
        sa.Column("thoiGianTao", sa.TIMESTAMP, server_default=sa.text("CURRENT_TIMESTAMP")),
        sa.CheckConstraint('"kichThuoc" > 0', name="chk_kich_thuoc_duong"),
    )

    # ==============================================================
    # 14.  SAMPLE DATA
    # ==============================================================

    schools = [
    # (Tên trường, Loại, Địa chỉ, Tên miền)
    ("Trường ĐH Bách khoa Hà Nội", "TRUONG_DAI_HOC", "Số 1 Đại Cồ Việt, Hai Bà Trưng, Hà Nội", "hust.edu.vn"),
    ("Trường ĐH Bách khoa TP.HCM", "TRUONG_DAI_HOC", "268 Lý Thường Kiệt, Q.10, TP.HCM", "hcmut.edu.vn"),
    ("Trường ĐH Sư phạm Kỹ thuật Đà Nẵng", "TRUONG_DAI_HOC", "48 Cao Thắng, Q.Hải Châu, Đà Nẵng", "ute.udn.vn"),
    ("Trường ĐH Khoa học Tự nhiên TP.HCM", "TRUONG_DAI_HOC", "227 Nguyễn Văn Cừ, Q.5, TP.HCM", "hcmus.edu.vn"),
    ("Trường ĐH Sư phạm Hà Nội", "TRUONG_DAI_HOC", "136 Xuân Thuỷ, Cầu Giấy, Hà Nội", "hnue.edu.vn"),
    ("Trường ĐH Cần Thơ", "TRUONG_DAI_HOC", "Khu II, 3/2, Ninh Kiều, Cần Thơ", "ctu.edu.vn"),
    ("Trường ĐH Y Hà Nội", "TRUONG_DAI_HOC", "1 Tôn Thất Tùng, Đống Đa, Hà Nội", "hmu.edu.vn"),
    ("Trường ĐH Dược Hà Nội", "TRUONG_DAI_HOC", "13-15 Lê Thánh Tông, Hoàn Kiếm, Hà Nội", "hup.edu.vn"),
    ("Trường ĐH Xây dựng Hà Nội", "TRUONG_DAI_HOC", "55 Giải Phóng, Hai Bà Trưng, Hà Nội", "nuce.edu.vn"),
    ("Trường ĐH Giao thông Vận tải", "TRUONG_DAI_HOC", "3 Cầu Giấy, Đống Đa, Hà Nội", "utc.edu.vn"),
    ("Trường ĐH Kinh tế Quốc dân", "TRUONG_DAI_HOC", "207 Giải Phóng, Hai Bà Trưng, Hà Nội", "neu.edu.vn"),
    ("Trường THPT Nguyễn Huệ", "TRUONG_THPT", "123 Lê Lợi, Q.1, TP.HCM", "nguyenhue.edu.vn"),
    ("Trường THPT Lê Quý Đôn", "TRUONG_THPT", "110 Nguyễn Thị Minh Khai, Q.3, TP.HCM", "lequydon.edu.vn"),
    ("Trường THPT Trần Đại Nghĩa", "TRUONG_THPT", "20 Lý Tự Trọng, Q.1, TP.HCM", "trandainnghia.edu.vn"),
    ("Trường THCS Lê Quý Đôn", "TRUONG_THCS", "45 CMT8, Q.3, TP.HCM", "lequydon-thcs.edu.vn"),
    ("Trường THCS Nguyễn Du", "TRUONG_THCS", "41 Nam Kỳ Khởi Nghĩa, Q.1, TP.HCM", "nguyendu.edu.vn"),
    ("Trường Tiểu học Lê Văn Tám", "TIEU_HOC", "96 Điện Biên Phủ, Q.1, TP.HCM", "levantam.edu.vn"),
    ("Trường Tiểu học Nguyễn Bỉnh Khiêm", "TIEU_HOC", "33 Trần Nhật Duật, Q.1, TP.HCM", "nguyenbinhkhiem.edu.vn"),
    ("Trường Tiểu học Trần Quốc Toản", "TIEU_HOC", "20 Nguyễn Trãi, Q.1, TP.HCM", "tranquoctoan.edu.vn"),
    ("Trường THPT Chu Văn An", "TRUONG_THPT", "10 Thụy Khuê, Tây Hồ, Hà Nội", "chuvanan.edu.vn"),
    ("Trường ĐH Ngoại thương", "TRUONG_DAI_HOC", "91 Chùa Láng, Đống Đa, Hà Nội", "ftu.edu.vn"),
    ]

    teachers_by_school = [
        # Chỉ ví dụ 3 tên GV mỗi trường (tên thật, không số)
        ["Trần Quốc Toản", "Nguyễn Thị Hương", "Lê Minh Tuấn"],
        ["Phạm Thị Lan", "Hoàng Văn Dũng", "Đặng Thị Linh"],
        ["Nguyễn Văn Phú", "Trần Thị Thu", "Lê Quang Hòa"],
        ["Đoàn Ngọc Minh", "Lý Thị Mai", "Trịnh Văn Nam"],
        ["Võ Thị Hạnh", "Lê Quốc Bảo", "Nguyễn Hữu Tùng"],
        ["Nguyễn Thị Hạnh", "Phạm Đức Kiên", "Bùi Minh Hạnh"],
        ["Trần Thị Mỹ Linh", "Nguyễn Tuấn Kiệt", "Đỗ Hữu Phước"],
        ["Ngô Minh Châu", "Trương Quốc Dũng", "Vũ Hồng Sơn"],
        ["Hoàng Thị Hà", "Đinh Văn Phong", "Phan Thị Thủy"],
        ["Lê Anh Dũng", "Nguyễn Bích Thủy", "Tạ Minh Hoàng"],
        ["Phạm Thị Thu Hà", "Nguyễn Minh Trí", "Trần Hải Yến"],
        ["Bùi Thị Hoa", "Đào Quang Huy", "Nguyễn Thành Long"],
        ["Đoàn Thanh Tùng", "Nguyễn Hoài Nam", "Trịnh Thị Hương"],
        ["Nguyễn Thu Trang", "Vũ Minh Châu", "Hoàng Văn Phúc"],
        ["Lê Minh Châu", "Nguyễn Thị Ngọc", "Trần Hữu Toàn"],
        ["Vũ Quốc Việt", "Phạm Văn Quý", "Đặng Minh Phúc"],
        ["Nguyễn Thị Loan", "Bùi Đức Anh", "Phan Hồng Sơn"],
        ["Trịnh Minh Hiếu", "Nguyễn Đăng Khoa", "Võ Thị Mai"],
        ["Lê Văn Hùng", "Nguyễn Thị Cẩm", "Phạm Quốc Bảo"],
        ["Đinh Thị Mai", "Trần Văn Phát", "Nguyễn Thị Kim Chi"],
        ["Đặng Văn Tùng", "Lý Hoàng Nam", "Nguyễn Thị Ánh"],
    ]

    import unicodedata

    def emailify(name):
        def get_ascii_char(c):
            # Đặc biệt đổi đ/Đ thành d/D
            if c.lower() == 'đ':
                return 'd'
            # Bỏ dấu các ký tự Unicode khác
            return unicodedata.normalize('NFD', c)[0].lower()
        # Lấy ký tự đầu mỗi từ, bỏ dấu
        return ''.join(get_ascii_char(word[0]) for word in name.strip().split() if word)


    for i, (school_name, org_type, addr, domain) in enumerate(schools, 1):
        exec_sql(f"""
            INSERT INTO "TOCHUC" ("tenToChuc", "loaiToChuc", "diaChi")
            VALUES ('{school_name}', '{org_type}', '{addr}');
        """)
        org_id = exec_sql('SELECT MAX("maToChuc") FROM "TOCHUC"').scalar()
        
        # --- Manager (lấy tên GV đầu tiên làm manager, emailify, hậu tố .mg)
        manager_fullname = teachers_by_school[i-1][0]
        manager_local = emailify(manager_fullname)
        manager_email = f"{manager_local}.mg@{domain}"
        manager_phone = f"0900{str(i).zfill(4)}"
        exec_sql(f"""
            INSERT INTO "NGUOIDUNG"
            ("maToChuc","email","matKhauMaHoa","hoTen","vaiTro","soDienThoai")
            VALUES
            ({org_id},'{manager_email}','$2b$12$/olbAOLO/ECDHvoP3ETrd.vPTUI2lJF6Dw9.lMzndIDgorHPIouCa','{manager_fullname}','MANAGER','{manager_phone}');
        """)
        
        # --- Teachers (bỏ manager ra nếu trùng)
        for t_idx, t_name in enumerate(teachers_by_school[i-1]):
            if t_idx == 0:  # Bỏ trùng với manager
                continue
            t_local = emailify(t_name)
            t_email = f"{t_local}.gv@{domain}"
            t_phone = f"09{org_id:02d}0{random.randint(100,999)}"
            exec_sql(f"""
                INSERT INTO "NGUOIDUNG"
                ("maToChuc","email","matKhauMaHoa","hoTen","vaiTro","soDienThoai")
                VALUES
                ({org_id},'{t_email}','$2b$12$/olbAOLO/ECDHvoP3ETrd.vPTUI2lJF6Dw9.lMzndIDgorHPIouCa','{t_name}','TEACHER','{t_phone}');
            """)

    # --- super admin (giữ nguyên)
    exec_sql(
        """INSERT INTO "NGUOIDUNG" ("maToChuc","email","matKhauMaHoa","hoTen","vaiTro","soDienThoai")
        VALUES
        (NULL,'superadmin@eduscan.ai','$2b$12$/olbAOLO/ECDHvoP3ETrd.vPTUI2lJF6Dw9.lMzndIDgorHPIouCa','Super Admin','ADMIN','0900000000');"""
    )

# ============================================================
#                   D O W N G R A D E
# ============================================================

def downgrade() -> None:
    for tbl in (
        "TAPTIN",
        "CAIDAT",
        "THONGKEKIEMTRA",
        "KETQUA",
        "PHIEUTRALOI",
        "DAPAN",
        "BAIKIEMTRA_LOPHOC",
        "BAIKIEMTRA",
        "MAUPHIEUTRALOI",
        "HOCSINH",
        "LOPHOC",
        "NGUOIDUNG",
        "TOCHUC",
    ):
        op.drop_table(tbl)
