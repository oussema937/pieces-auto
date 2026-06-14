from sqlalchemy import Column, Integer, String, Float, DateTime, Text, Boolean
from sqlalchemy.sql import func
from database import Base

class Piece(Base):
    __tablename__ = "pieces"

    id          = Column(Integer, primary_key=True, index=True)
    photo_path  = Column(String, nullable=False)
    nom         = Column(String, nullable=True)
    categorie   = Column(String, nullable=True)
    marque      = Column(String, nullable=True)
    reference   = Column(String, nullable=True)
    description = Column(Text, nullable=True)
    prix_estime = Column(Float, nullable=True)
    etat        = Column(String, nullable=True)
    analyse_ok  = Column(Boolean, default=False)
    created_at  = Column(DateTime(timezone=True), server_default=func.now())
    updated_at  = Column(DateTime(timezone=True), onupdate=func.now())