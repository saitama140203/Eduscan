from sqlalchemy import Column, Integer, String, Boolean, ForeignKey, Date, TIMESTAMP, BigInteger, func, UniqueConstraint
from sqlalchemy.orm import relationship

from app.db.session import Base

class Student(Base):
    """
    Model Học sinh
    Tương ứng với bảng HOCSINH trong CSDL
    """
    __tablename__ = "HOCSINH"
    
    maHocSinh = Column(BigInteger, primary_key=True, index=True, autoincrement=True)
    maLopHoc = Column(BigInteger, ForeignKey("LOPHOC.maLopHoc"), index=True)
    maHocSinhTruong = Column(String(50), nullable=False, index=True)
    hoTen = Column(String(255), nullable=False)
    ngaySinh = Column(Date, nullable=True)
    gioiTinh = Column(String(10), nullable=True)
    diaChi = Column(String(500), nullable=True)
    soDienThoai = Column(String(20), nullable=True)
    email = Column(String(255), nullable=True)
    hoTenPhuHuynh = Column(String(255), nullable=True)
    soDienThoaiPhuHuynh = Column(String(20), nullable=True)
    emailPhuHuynh = Column(String(255), nullable=True)
    diaChiPhuHuynh = Column(String(500), nullable=True)
    trangThai = Column(Boolean, nullable=False, default=True)
    thoiGianTao = Column(TIMESTAMP, nullable=False, server_default=func.current_timestamp())
    thoiGianCapNhat = Column(TIMESTAMP, nullable=False, server_default=func.current_timestamp(), onupdate=func.current_timestamp())
    
    # Unique constraint cho maHocSinhTruong + maLopHoc
    __table_args__ = (
        UniqueConstraint('maHocSinhTruong', 'maLopHoc', name='uq_hocsinh_mahocsinhtruong_malophoc'),
    )
    
    # Relationships
    lopHoc = relationship("ClassRoom", back_populates="hocSinhs")
    phieuTraLois = relationship("AnswerSheet", back_populates="hocSinh", cascade="all, delete-orphan", passive_deletes=True)
    ketQuas = relationship("Result", back_populates="hocSinh", cascade="all, delete-orphan", passive_deletes=True)