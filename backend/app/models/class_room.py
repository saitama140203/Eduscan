from sqlalchemy import Column, Integer, String, Boolean, ForeignKey, Text, TIMESTAMP, BigInteger, func
from sqlalchemy.orm import relationship
from app.db.session import Base

class ClassRoom(Base):
    __tablename__ = "LOPHOC"
    
    maLopHoc = Column(BigInteger, primary_key=True, index=True, autoincrement=True)
    maToChuc = Column(BigInteger, ForeignKey("TOCHUC.maToChuc"), index=True)
    tenLop = Column(String(100), nullable=False)
    capHoc = Column(String(20), nullable=True)
    namHoc = Column(String(20), nullable=True)
    maGiaoVienChuNhiem = Column(BigInteger, ForeignKey("NGUOIDUNG.maNguoiDung"), index=True)
    moTa = Column(Text, nullable=True)
    trangThai = Column(Boolean, nullable=False, default=True)
    thoiGianTao = Column(TIMESTAMP, nullable=False, server_default=func.current_timestamp())
    thoiGianCapNhat = Column(TIMESTAMP, nullable=False, server_default=func.current_timestamp(), onupdate=func.current_timestamp())

    # Relationships 
    toChuc = relationship("Organization", back_populates="lopHocs")
    giaoVienChuNhiem = relationship("User", back_populates="lopHocsQuanLy", foreign_keys=[maGiaoVienChuNhiem])
    hocSinhs = relationship("Student", back_populates="lopHoc", cascade="all, delete-orphan", passive_deletes=True)
    baiKiemTra_lopHocs = relationship("ExamClassRoom", back_populates="lopHoc", cascade="all, delete-orphan", passive_deletes=True)
    thongKeKiemTras = relationship("ExamStatistic", back_populates="lopHoc", cascade="all, delete-orphan", passive_deletes=True)

