from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, BigInteger, Text, Index
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship

from app.db.session import Base
from app.models.file import File # Import File model
from app.models.organization import Organization

class User(Base):
    """
    Model Người dùng (Admin, Quản lý, Giáo viên)
    Tương ứng với bảng NGUOIDUNG trong CSDL
    """
    __tablename__ = "NGUOIDUNG"
    
    maNguoiDung = Column(BigInteger, primary_key=True, index=True, autoincrement=True)
    maToChuc = Column(BigInteger, ForeignKey("TOCHUC.maToChuc"), nullable=True)
    email = Column(String(255), nullable=False, unique=True, index=True)
    matKhauMaHoa = Column(String(255), nullable=False)  # Hash bcrypt
    hoTen = Column(String(255), nullable=False)
    vaiTro = Column(String(50), nullable=False)  # Admin, Manager, Teacher
    soDienThoai = Column(String(20), nullable=True) 
    urlAnhDaiDien = Column(String(255), nullable=True)
    thoiGianDangNhapCuoi = Column(DateTime, nullable=True)
    trangThai = Column(Boolean, nullable=False, default=True)
    thoiGianTao = Column(DateTime, nullable=False, server_default=func.now())
    thoiGianCapNhat = Column(DateTime, nullable=False, server_default=func.now(), onupdate=func.now()) # Thêm onupdate
    
    # Relationships
    to_chuc = relationship("Organization", back_populates="nguoi_dung")
    lopHocsQuanLy = relationship("ClassRoom", back_populates="giaoVienChuNhiem", cascade="all, delete-orphan", passive_deletes=True)
    tapTins = relationship("File", back_populates="nguoiDung", cascade="all, delete-orphan", passive_deletes=True)
    mauPhieuTraLois = relationship("AnswerSheetTemplate", back_populates="nguoiTao", cascade="all, delete-orphan", passive_deletes=True)
    baiKiemTras = relationship("Exam", back_populates="nguoiTao", cascade="all, delete-orphan", passive_deletes=True)
    phieuTraLois = relationship("AnswerSheet", back_populates="nguoiQuet", cascade="all, delete-orphan", passive_deletes=True)

# Cần cập nhật các relationship cho Organization và User ở cuối file class_student.py hoặc models khác
# Ví dụ: Organization.lop_hoc = relationship("Class", back_populates="to_chuc")
# User.lop_hoc = relationship("Class", back_populates="giao_vien")
# Organization.tap_tin = relationship("File", back_populates="to_chuc") 
# User.tap_tin = relationship("File", back_populates="nguoi_dung") 