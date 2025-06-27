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

    # --- Chèn tổ chức
    orgs_sql = """INSERT INTO "TOCHUC" ("tenToChuc", "loaiToChuc", "diaChi") VALUES
        ('Trường THPT Nguyễn Huệ', 'TRUONG_THPT', '123 Lê Lợi, Q1, TP.HCM'),
        ('Trường THCS Lê Quý Đôn', 'TRUONG_THCS', '45 CMT8, Q3, TP.HCM'),
        ('Trường Đại học Sư Phạm Kỹ Thuật – ĐH Đà Nẵng', 'TRUONG_DAI_HOC', '01 Võ Văn Ngân, Thủ Đức, TP.HCM');"""
    exec_sql(orgs_sql)

    # --- super admin
    exec_sql(
        """INSERT INTO \"NGUOIDUNG\" (\"maToChuc\",\"email\",\"matKhauMaHoa\",\"hoTen\",\"vaiTro\",\"soDienThoai\") VALUES
        (NULL,'superadmin@eduscan.ai','HASHED','Super Admin','ADMIN','0900000000');"""
    )

    # --- managers & teachers
    for org_id in range(1, 4):
        exec_sql(
            f"INSERT INTO \"NGUOIDUNG\" (\"maToChuc\",\"email\",\"matKhauMaHoa\",\"hoTen\",\"vaiTro\") VALUES"
            f"({org_id},'manager{org_id}@example.csom','HASH','Manager {org_id}','MANAGER');"
        )
        for t in range(1, 4):
            exec_sql(
                f"INSERT INTO \"NGUOIDUNG\" (\"maToChuc\",\"email\",\"matKhauMaHoa\",\"hoTen\",\"vaiTro\") VALUES"
                f"({org_id},'teacher{org_id}_{t}@example.com','HASH','GV {org_id}_{t}','TEACHER');"
            )

    # --- lớp & học sinh
    gv_offset = 1 + 3
    current_teacher = gv_offset
    lop_seq = 0

    for org_id in range(1, 4):
        for idx in range(1, 3):
            lop_seq += 1
            ten_lop = f"{10+idx}{chr(64+idx)}"
            cap_hoc = "THPT" if org_id == 1 else "THCS"
            nam_hoc = f"{today_year}-{today_year+1}"
            gvcn = current_teacher
            current_teacher += 1
            exec_sql(
                f"INSERT INTO \"LOPHOC\" (\"maToChuc\",\"tenLop\",\"capHoc\",\"namHoc\",\"maGiaoVienChuNhiem\") VALUES"
                f"({org_id},'{ten_lop}','{cap_hoc}','{nam_hoc}',{gvcn});"
            )
            for stt in range(1, 31):
                male = random.choice([True, False])
                ho = random.choice(HO_LIST)
                ten = random.choice(TEN_NAM if male else TEN_NU)
                ns = _dt.date(today_year-16, random.randint(1,12), random.randint(1,28))
                gt = "Nam" if male else "Nữ"
                code = f"{lop_seq:02d}{stt:03d}"
                exec_sql(
                    f"INSERT INTO \"HOCSINH\" (\"maLopHoc\",\"maHocSinhTruong\",\"hoTen\",\"ngaySinh\",\"gioiTinh\") VALUES"
                    f"({lop_seq},'{code}','{ho} {ten}','{ns}','{gt}');"
                )
            # Thêm 1 học sinh nổi bật
            ho = "Đoàn" if cap_hoc == "THPT" else "Phạm"
            ten = "Nguyên Thiện Mỹ" if cap_hoc == "THPT" else "Ngọc Anh"
            ns = _dt.date(today_year-17, 4, 14)
            gt = "Nữ"
            code = f"{lop_seq:02d}999"
            exec_sql(
                f"INSERT INTO \"HOCSINH\" (\"maLopHoc\",\"maHocSinhTruong\",\"hoTen\",\"ngaySinh\",\"gioiTinh\") VALUES"
                f"({lop_seq},'{code}','{ho} {ten}','{ns}','{gt}');"
            )

    # --- mẫu phiếu mặc định
    exec_sql(
        """INSERT INTO \"MAUPHIEUTRALOI\" (\"maToChuc\",\"maNguoiTao\",\"tenMauPhieu\",\"soCauHoi\") SELECT \"maToChuc\",MIN(\"maNguoiDung\"),'Mẫu 40 câu - 4 lựa chọn',40 FROM \"NGUOIDUNG\" WHERE \"vaiTro\"='MANAGER' GROUP BY \"maToChuc\";"""
    )

    # --- bài kiểm tra + đáp án + gán lớp
    teacher_ids = [r[0] for r in exec_sql("SELECT DISTINCT \"maGiaoVienChuNhiem\" FROM \"LOPHOC\"").fetchall()]

    for tid in teacher_ids:
        org = exec_sql(f"SELECT \"maToChuc\" FROM \"NGUOIDUNG\" WHERE \"maNguoiDung\"={tid}").scalar()
        lop = exec_sql(f"SELECT \"maLopHoc\" FROM \"LOPHOC\" WHERE \"maGiaoVienChuNhiem\"={tid} LIMIT 1").scalar()
        mau = exec_sql(f"SELECT \"maMauPhieu\" FROM \"MAUPHIEUTRALOI\" WHERE \"maToChuc\"={org} LIMIT 1").scalar()
        if lop is None or mau is None:
            continue
        for lan in range(1,3):
            mon = random.choice(MON_HOC)
            tong = 40
            ngay_thi = _dt.date(today_year, random.randint(3,6), random.randint(1,28))
            exec_sql(
                f"INSERT INTO \"BAIKIEMTRA\" (\"maToChuc\",\"maNguoiTao\",\"maMauPhieu\",\"tieuDe\",\"monHoc\",\"ngayThi\",\"tongSoCau\") VALUES"
                f"({org},{tid},{mau},'KT {mon} lần {lan} - GV {tid}','{mon}','{ngay_thi}',{tong});"
            )
            bkt = exec_sql("SELECT lastval();").scalar()
            exec_sql(
                f"INSERT INTO \"BAIKIEMTRA_LOPHOC\" (\"maBaiKiemTra\",\"maLopHoc\") VALUES ({bkt},{lop});"
            )
            answer = {str(i): random.choice("ABCD") for i in range(1,tong+1)}
            exec_sql(
                f"INSERT INTO \"DAPAN\" (\"maBaiKiemTra\",\"dapAnJson\") VALUES ({bkt},'{json.dumps(answer,ensure_ascii=False)}');"
            )

    # --- PHIEUTRALOI (sinh 5 phiếu trả lời mẫu cho mỗi lớp/bài kiểm tra)
    bkt_rows = exec_sql('SELECT "maBaiKiemTra", "maLopHoc" FROM "BAIKIEMTRA_LOPHOC"').fetchall()
    for bkt_id, lop_id in bkt_rows:
        hoc_sinh_ids = [r[0] for r in exec_sql(f'SELECT "maHocSinh" FROM "HOCSINH" WHERE "maLopHoc"={lop_id} LIMIT 5').fetchall()]
        for hs_id in hoc_sinh_ids:
            # Random đáp án, 80% đúng, 20% random
            dap_an_row = exec_sql(f'SELECT "dapAnJson" FROM "DAPAN" WHERE "maBaiKiemTra"={bkt_id}').fetchone()
            if not dap_an_row:
                continue
            dapan = dap_an_row[0]
            answers = {}
            for q, da in dapan.items():
                if random.random() < 0.8:
                    answers[q] = da
                else:
                    answers[q] = random.choice([x for x in "ABCD" if x != da])
            exec_sql(
                f"""INSERT INTO "PHIEUTRALOI"
                ("maBaiKiemTra","maHocSinh","urlHinhAnh","urlHinhAnhXuLy","cauTraLoiJson","daXuLyHoanTat","doTinCay")
                VALUES
                ({bkt_id},{hs_id},
                '/media/{uuid.uuid4()}.jpg','/media/{uuid.uuid4()}_xl.jpg',
                '{json.dumps(answers, ensure_ascii=False)}',TRUE,{round(random.uniform(0.95,1),2)})"""
            )

    # --- KETQUA (auto mark)
    for row in exec_sql('SELECT "maPhieuTraLoi", "maBaiKiemTra", "maHocSinh", "cauTraLoiJson" FROM "PHIEUTRALOI"').fetchall():
        maPhieu, maBKT, maHS, cauTraLoiJson = row
        dap_an_row = exec_sql(f'SELECT "dapAnJson" FROM "DAPAN" WHERE "maBaiKiemTra"={maBKT}').fetchone()
        if not dap_an_row: continue
        dapan = dap_an_row[0]
        answers = cauTraLoiJson
        dung = sum(1 for k in dapan if answers.get(k) == dapan[k])
        sai = sum(1 for k in dapan if k in answers and answers[k] != dapan[k])
        chuatra = sum(1 for k in dapan if k not in answers)
        diem = round((dung / len(dapan)) * 10, 2)
        exec_sql(
            f"""INSERT INTO "KETQUA"
            ("maPhieuTraLoi","maBaiKiemTra","maHocSinh","diem","soCauDung","soCauSai","soCauChuaTraLoi","chiTietJson")
            VALUES
            ({maPhieu},{maBKT},{maHS},{diem},{dung},{sai},{chuatra},'{json.dumps({"detail":"fake"},ensure_ascii=False)}')"""
        )

    # --- THONGKEKIEMTRA
    for row in exec_sql('SELECT "maBaiKiemTra", "maLopHoc" FROM "BAIKIEMTRA_LOPHOC"').fetchall():
        maBKT, maLop = row
        scores = [float(r[0]) for r in exec_sql(
            f'SELECT "diem" FROM "KETQUA" WHERE "maBaiKiemTra"={maBKT}').fetchall()]
        if not scores: continue
        diem_tb = round(sum(scores)/len(scores),2)
        diem_max = max(scores)
        diem_min = min(scores)
        diem_median = sorted(scores)[len(scores)//2]
        exec_sql(
            f"""INSERT INTO "THONGKEKIEMTRA"
            ("maBaiKiemTra","maLopHoc","soLuongThamGia","diemTrungBinh","diemCaoNhat","diemThapNhat","diemTrungVi")
            VALUES
            ({maBKT},{maLop},{len(scores)},{diem_tb},{diem_max},{diem_min},{diem_median})"""
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
