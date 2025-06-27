from sqlalchemy import Column, Integer, String, Boolean, ForeignKey, Text, TIMESTAMP, BigInteger, func
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import relationship

from app.db.session import Base

class AnswerSheetTemplate(Base):
    """
    Model Mẫu phiếu trả lời
    Tương ứng với bảng MAUPHIEUTRALOI trong CSDL
    """
    __tablename__ = "MAUPHIEUTRALOI"
    
    maMauPhieu = Column(BigInteger, primary_key=True, index=True, autoincrement=True)
    maToChuc = Column(BigInteger, ForeignKey("TOCHUC.maToChuc", ondelete="CASCADE"), index=True, nullable=True)  
    maNguoiTao = Column(BigInteger, ForeignKey("NGUOIDUNG.maNguoiDung", ondelete="CASCADE"), index=True, nullable=False)  
    soCauHoi = Column(Integer, nullable=False)
    soLuaChonMoiCau = Column(Integer, nullable=False, default=4)
    khoGiay = Column(String(10), nullable=False, default="A4")
    coTuLuan = Column(Boolean, nullable=False, default=False)
    coThongTinHocSinh = Column(Boolean, nullable=False, default=True)
    coLogo = Column(Boolean, nullable=False, default=False)
    
    # Sử dụng cauTrucJson để lưu thông tin file upload và AI config
    # Format: {
    #   "fileInfo": {
    #     "urlFileMau": "...",
    #     "urlFilePreview": "...", 
    #     "tenFileGoc": "...",
    #     "kichThuocFile": 123456,
    #     "loaiFile": "pdf",
    #     "cloudProvider": "local",
    #     "cloudFileId": "..."
    #   },
    #   "aiConfig": {
    #     "aiTemplateId": "...",
    #     "recognitionAreas": [...],
    #     "processingRules": {...}
    #   },
    #   "layout": {...} // Existing layout config
    # }
    cauTrucJson = Column(JSONB, nullable=True)
    cssFormat = Column(Text, nullable=True)
    laMacDinh = Column(Boolean, nullable=False, default=False)
    laCongKhai = Column(Boolean, nullable=False, default=False)
    thoiGianTao = Column(TIMESTAMP, nullable=False, server_default=func.current_timestamp())
    thoiGianCapNhat = Column(TIMESTAMP, nullable=False, server_default=func.current_timestamp(), onupdate=func.current_timestamp())
    
    # Relationships
    toChuc = relationship("Organization", back_populates="mauPhieuTraLois")
    nguoiTao = relationship("User", back_populates="mauPhieuTraLois")
    baiKiemTras = relationship("Exam", back_populates="mauPhieu", cascade="all, delete-orphan", passive_deletes=True)