from sqlalchemy import Column, Integer, String, Text, TIMESTAMP, BigInteger, func
from sqlalchemy.orm import relationship

from app.db.session import Base

class Organization(Base):
    """
    Model Tổ chức (trường học, trung tâm giáo dục, ...)
    Tương ứng với bảng TOCHUC trong CSDL
    """
    __tablename__ = "TOCHUC"
    
    maToChuc = Column(BigInteger, primary_key=True, index=True, autoincrement=True)
    tenToChuc = Column(String(255), nullable=False)
    loaiToChuc = Column(String(50), nullable=False)
    diaChi = Column(Text, nullable=True)
    urlLogo = Column(String(255), nullable=True)
    thoiGianTao = Column(TIMESTAMP, nullable=False, server_default=func.current_timestamp())
    thoiGianCapNhat = Column(TIMESTAMP, nullable=False, server_default=func.current_timestamp(), onupdate=func.current_timestamp())
    
    # Relationship với các bảng khác
    nguoi_dung = relationship(
        "User",
        back_populates="to_chuc",
        cascade="all, delete-orphan",
        passive_deletes=True
    )
    lopHocs = relationship(
        "ClassRoom",
        back_populates="toChuc",
        cascade="all, delete-orphan",
        passive_deletes=True
    )
    mauPhieuTraLois = relationship(
        "AnswerSheetTemplate",
        back_populates="toChuc",
        cascade="all, delete-orphan",
        passive_deletes=True
    )
    baiKiemTras = relationship(
        "Exam",
        back_populates="toChuc",
        cascade="all, delete-orphan",
        passive_deletes=True
    )
    caiDats = relationship(
        "Setting",
        back_populates="toChuc",
        cascade="all, delete-orphan",
        passive_deletes=True
    )
    tapTins = relationship(
        "File",
        back_populates="toChuc",
        cascade="all, delete-orphan",
        passive_deletes=True
    )