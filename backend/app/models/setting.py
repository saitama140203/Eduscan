from sqlalchemy import Column, Integer, String, Text, TIMESTAMP, BigInteger, func, UniqueConstraint, ForeignKey
from sqlalchemy.orm import relationship

from app.db.session import Base

class Setting(Base):
    """
    Model Cài đặt
    Tương ứng với bảng CAIDAT trong CSDL
    """
    __tablename__ = "CAIDAT"
    
    maCaiDat = Column(BigInteger, primary_key=True, index=True, autoincrement=True)
    maToChuc = Column(BigInteger, ForeignKey("TOCHUC.maToChuc"), index=True)
    tuKhoa = Column(String(100), nullable=False)
    giaTri = Column(Text, nullable=True)
    thoiGianTao = Column(TIMESTAMP, nullable=False, server_default=func.current_timestamp())
    thoiGianCapNhat = Column(TIMESTAMP, nullable=False, server_default=func.current_timestamp(), onupdate=func.current_timestamp())
    
    # Unique constraint
    __table_args__ = (
        UniqueConstraint('maToChuc', 'tuKhoa', name='uq_caidat_matochuc_tukhoa'),
    )
    
    # Relationships
    toChuc = relationship("Organization", back_populates="caiDats") 