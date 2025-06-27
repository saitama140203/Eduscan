from sqlalchemy import Column, Integer, String, TIMESTAMP, BigInteger, func, ForeignKey, Index
from sqlalchemy.orm import relationship

from app.db.session import Base

class File(Base):
    """
    Model Tập tin
    Tương ứng với bảng TAPTIN trong CSDL
    """
    __tablename__ = "TAPTIN"
    
    maTapTin = Column(BigInteger, primary_key=True, index=True, autoincrement=True)
    maNguoiDung = Column(BigInteger, ForeignKey("NGUOIDUNG.maNguoiDung"), index=True)
    maToChuc = Column(BigInteger, ForeignKey("TOCHUC.maToChuc"), index=True)
    tenTapTin = Column(String(255), nullable=False)
    duongDan = Column(String(500), nullable=False)
    loaiTapTin = Column(String(100), nullable=False)
    kichThuoc = Column(Integer, nullable=False)
    thucTheNguon = Column(String(50), nullable=True)
    maThucTheNguon = Column(BigInteger, nullable=True)
    thoiGianTao = Column(TIMESTAMP, nullable=False, server_default=func.current_timestamp())
    
    # Indexes
    __table_args__ = (
        Index('idx_taptin_thucthe', 'thucTheNguon', 'maThucTheNguon'),
    )
    
    # Relationships
    nguoiDung = relationship("User", back_populates="tapTins")
    toChuc = relationship("Organization", back_populates="tapTins") 