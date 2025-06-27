from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, BigInteger, Date, Numeric, UniqueConstraint, Text, Index, TIMESTAMP
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship

from app.db.session import Base
from app.models.answer_sheet_template import AnswerSheetTemplate

class Exam(Base):
    """
    Model Bài kiểm tra
    Tương ứng với bảng BAIKIEMTRA trong CSDL
    """
    __tablename__ = "BAIKIEMTRA"
    
    maBaiKiemTra = Column(BigInteger, primary_key=True, index=True, autoincrement=True)
    maToChuc = Column(BigInteger, ForeignKey("TOCHUC.maToChuc"), index=True)
    maNguoiTao = Column(BigInteger, ForeignKey("NGUOIDUNG.maNguoiDung"), index=True)
    maMauPhieu = Column(BigInteger, ForeignKey("MAUPHIEUTRALOI.maMauPhieu"), index=True)
    tieuDe = Column(String(255), nullable=False)
    monHoc = Column(String(100), nullable=False)
    ngayThi = Column(Date, nullable=True)
    thoiGianLamBai = Column(Integer, nullable=True)  # Thời gian làm bài (phút)
    tongSoCau = Column(Integer, nullable=False)
    tongDiem = Column(Numeric(5, 2), nullable=False, default=10.0)
    moTa = Column(Text, nullable=True)
    laDeTongHop = Column(Boolean, nullable=False, default=False)
    trangThai = Column(String(20), nullable=False, default="nhap")  # nhap, xuatBan, dongDaChAm
    thoiGianTao = Column(TIMESTAMP, nullable=False, server_default=func.current_timestamp())
    thoiGianCapNhat = Column(TIMESTAMP, nullable=False, server_default=func.current_timestamp(), onupdate=func.current_timestamp())
    
    # Relationships
    toChuc = relationship("Organization", back_populates="baiKiemTras")
    nguoiTao = relationship("User", back_populates="baiKiemTras")
    mauPhieu = relationship("AnswerSheetTemplate", back_populates="baiKiemTras")
    lopHocs = relationship("ExamClassRoom", back_populates="baiKiemTra", cascade="all, delete-orphan", passive_deletes=True)
    dapAn = relationship("Answer", back_populates="baiKiemTra", uselist=False, cascade="all, delete-orphan", passive_deletes=True)
    phieuTraLois = relationship("AnswerSheet", back_populates="baiKiemTra", cascade="all, delete-orphan", passive_deletes=True)
    ketQuas = relationship("Result", back_populates="baiKiemTra", cascade="all, delete-orphan", passive_deletes=True)
    thongKeKiemTras = relationship("ExamStatistic", back_populates="baiKiemTra", cascade="all, delete-orphan", passive_deletes=True)

class Answer(Base):
    """
    Model Đáp án
    Tương ứng với bảng DAPAN trong CSDL
    """
    __tablename__ = "DAPAN"
    
    maDapAn = Column(BigInteger, primary_key=True, index=True, autoincrement=True)
    maBaiKiemTra = Column(BigInteger, ForeignKey("BAIKIEMTRA.maBaiKiemTra", ondelete="CASCADE"), unique=True, index=True)
    dapAnJson = Column(JSONB, nullable=False)
    diemMoiCauJson = Column(JSONB, nullable=True)
    thoiGianTao = Column(TIMESTAMP, nullable=False, server_default=func.current_timestamp())
    thoiGianCapNhat = Column(TIMESTAMP, nullable=False, server_default=func.current_timestamp(), onupdate=func.current_timestamp())
    
    # Relationships
    baiKiemTra = relationship("Exam", back_populates="dapAn")

class AnswerSheet(Base):
    """
    Model Phiếu trả lời
    Tương ứng với bảng PHIEUTRALOI trong CSDL
    """
    __tablename__ = "PHIEUTRALOI"
    
    maPhieuTraLoi = Column(BigInteger, primary_key=True, index=True, autoincrement=True)
    maBaiKiemTra = Column(BigInteger, ForeignKey("BAIKIEMTRA.maBaiKiemTra"), index=True)
    maHocSinh = Column(BigInteger, ForeignKey("HOCSINH.maHocSinh"), index=True)
    maNguoiQuet = Column(BigInteger, ForeignKey("NGUOIDUNG.maNguoiDung"), index=True)
    urlHinhAnh = Column(String(255), nullable=True)
    urlHinhAnhXuLy = Column(String(255), nullable=True)
    cauTraLoiJson = Column(JSONB, nullable=True)
    daXuLyHoanTat = Column(Boolean, nullable=False, default=False)
    doTinCay = Column(Numeric(5, 2), nullable=True)
    canhBaoJson = Column(JSONB, nullable=True)
    thoiGianQuet = Column(TIMESTAMP, nullable=False, server_default=func.current_timestamp())
    thoiGianTao = Column(TIMESTAMP, nullable=False, server_default=func.current_timestamp())
    thoiGianCapNhat = Column(TIMESTAMP, nullable=False, server_default=func.current_timestamp(), onupdate=func.current_timestamp())
    
    # Relationships
    baiKiemTra = relationship("Exam", back_populates="phieuTraLois")
    hocSinh = relationship("Student", back_populates="phieuTraLois")
    nguoiQuet = relationship("User", back_populates="phieuTraLois")
    ketQua = relationship("Result", back_populates="phieuTraLoi", uselist=False, cascade="all, delete-orphan", passive_deletes=True)

class Result(Base):
    """
    Model Kết quả
    Tương ứng với bảng KETQUA trong CSDL
    """
    __tablename__ = "KETQUA"
    
    maKetQua = Column(BigInteger, primary_key=True, index=True, autoincrement=True)
    maPhieuTraLoi = Column(BigInteger, ForeignKey("PHIEUTRALOI.maPhieuTraLoi", ondelete="CASCADE"), unique=True, index=True)
    maBaiKiemTra = Column(BigInteger, ForeignKey("BAIKIEMTRA.maBaiKiemTra"), index=True)
    maHocSinh = Column(BigInteger, ForeignKey("HOCSINH.maHocSinh"), index=True)
    diem = Column(Numeric(5, 2), nullable=False)
    soCauDung = Column(Integer, nullable=False)
    soCauSai = Column(Integer, nullable=False)
    soCauChuaTraLoi = Column(Integer, nullable=False)
    chiTietJson = Column(JSONB, nullable=True)
    diemTheoMonJson = Column(JSONB, nullable=True)
    thuHangTrongLop = Column(Integer, nullable=True)
    thoiGianTao = Column(TIMESTAMP, nullable=False, server_default=func.current_timestamp())
    thoiGianCapNhat = Column(TIMESTAMP, nullable=False, server_default=func.current_timestamp(), onupdate=func.current_timestamp())
    
    # Relationships
    phieuTraLoi = relationship("AnswerSheet", back_populates="ketQua")
    baiKiemTra = relationship("Exam", back_populates="ketQuas")
    hocSinh = relationship("Student", back_populates="ketQuas")

class ExamStatistic(Base):
    """
    Model Thống kê kiểm tra
    Tương ứng với bảng THONGKEKIEMTRA trong CSDL
    """
    __tablename__ = "THONGKEKIEMTRA"
    
    maThongKe = Column(BigInteger, primary_key=True, index=True, autoincrement=True)
    maBaiKiemTra = Column(BigInteger, ForeignKey("BAIKIEMTRA.maBaiKiemTra", ondelete="CASCADE"), index=True)
    maLopHoc = Column(BigInteger, ForeignKey("LOPHOC.maLopHoc"), index=True)
    soLuongThamGia = Column(Integer, nullable=False, default=0)
    diemTrungBinh = Column(Numeric(5, 2), nullable=True)
    diemCaoNhat = Column(Numeric(5, 2), nullable=True)
    diemThapNhat = Column(Numeric(5, 2), nullable=True)
    diemTrungVi = Column(Numeric(5, 2), nullable=True)      
    doLechChuan = Column(Numeric(5, 2), nullable=True)
    thongKeCauHoiJson = Column(JSONB, nullable=True)
    phanLoaiDoKhoJson = Column(JSONB, nullable=True)
    phanBoDiemJson = Column(JSONB, nullable=True)
    thoiGianTao = Column(TIMESTAMP, nullable=False, server_default=func.current_timestamp())
    thoiGianCapNhat = Column(TIMESTAMP, nullable=False, server_default=func.current_timestamp(), onupdate=func.current_timestamp())
    
    # Unique constraint
    __table_args__ = (
        UniqueConstraint('maBaiKiemTra', 'maLopHoc', name='uq_thongkekiemtra_mabkt_malop'),
    )
    
    # Relationships
    baiKiemTra = relationship("Exam", back_populates="thongKeKiemTras")
    lopHoc = relationship("ClassRoom", back_populates="thongKeKiemTras")

class ExamClassRoom(Base):
    """
    Model mối quan hệ giữa Bài kiểm tra và Lớp học
    Tương ứng với bảng BAIKIEMTRA_LOPHOC trong CSDL
    """
    __tablename__ = "BAIKIEMTRA_LOPHOC"
    
    id = Column(BigInteger, primary_key=True, index=True, autoincrement=True)
    maBaiKiemTra = Column(BigInteger, ForeignKey("BAIKIEMTRA.maBaiKiemTra", ondelete="CASCADE"), index=True)
    maLopHoc = Column(BigInteger, ForeignKey("LOPHOC.maLopHoc", ondelete="CASCADE"), index=True)
    thoiGianTao = Column(TIMESTAMP, nullable=False, server_default=func.current_timestamp())
    
    # Unique constraint
    __table_args__ = (
        UniqueConstraint('maBaiKiemTra', 'maLopHoc', name='uq_baikiemtra_lophoc'),
    )
    
    # Relationships
    baiKiemTra = relationship("Exam", back_populates="lopHocs")
    lopHoc = relationship("ClassRoom", back_populates="baiKiemTra_lopHocs") 