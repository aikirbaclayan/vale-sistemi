from sqlmodel import SQLModel, Field, Relationship
from typing import Optional, List
from datetime import datetime
from enum import Enum
import uuid

class VehicleStatus(str, Enum):
    """Araç durumları"""
    PARKED = "parked"
    REQUESTED = "requested" 
    PREPARING = "preparing"
    READY = "ready"

class VehicleBase(SQLModel):
    """Araç base modeli"""
    plate: str = Field(index=True, unique=True, description="Normalize edilmiş plaka")
    status: VehicleStatus = Field(default=VehicleStatus.PARKED, description="Araç durumu")
    vehicle_photo_url: Optional[str] = Field(default=None, description="Araç fotoğrafı URL'i")
    location_note: Optional[str] = Field(default=None, description="Anahtarın konumu, park yeri")
    requested_in: Optional[int] = Field(default=None, description="Müşterinin istediği süre (dk)")
    valet_notes: Optional[str] = Field(default=None, description="Valenin gizli notları")
    customer_phone: Optional[str] = Field(default=None, description="Müşteri WhatsApp telefonu (valeye görünmez)")

class Vehicle(VehicleBase, table=True):
    """Aktif araçlar tablosu"""
    __tablename__ = "vehicles"
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)
    check_in_at: datetime = Field(default_factory=datetime.now, description="Giriş saati")
    requested_at: Optional[datetime] = Field(default=None, description="Çağrı saati")
    ready_at: Optional[datetime] = Field(default=None, description="Hazır olma saati")
    
    # İlişkiler
    logs: List["VehicleLog"] = Relationship(back_populates="vehicle")

class VehicleCreate(VehicleBase):
    """Araç oluşturma modeli"""
    pass

class VehicleUpdate(SQLModel):
    """Araç güncelleme modeli"""
    status: Optional[VehicleStatus] = None
    vehicle_photo_url: Optional[str] = None
    location_note: Optional[str] = None
    requested_in: Optional[int] = None
    valet_notes: Optional[str] = None
    requested_at: Optional[datetime] = None
    ready_at: Optional[datetime] = None

class VehicleResponse(VehicleBase):
    """Araç response modeli"""
    id: str
    check_in_at: datetime
    requested_at: Optional[datetime] = None
    ready_at: Optional[datetime] = None

# Vehicle Log modeli
class VehicleLogBase(SQLModel):
    """Araç log base modeli"""
    plate: str = Field(index=True, description="Plaka")
    total_stay_duration: int = Field(description="Toplam kalış süresi (dakika)")
    wait_time: Optional[int] = Field(default=None, description="Çağrıdan hazırlığa geçen süre (dakika)")
    valet_id: Optional[str] = Field(default=None, description="Teslim eden valenin ID'si")

class VehicleLog(VehicleLogBase, table=True):
    """Teslim edilmiş araçların geçmişi"""
    __tablename__ = "vehicle_logs"
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)
    vehicle_id: Optional[str] = Field(default=None, foreign_key="vehicles.id")
    check_in_at: datetime = Field(description="Giriş saati")
    check_out_at: datetime = Field(default_factory=datetime.now, description="Teslim saati")
    
    # İlişkiler
    vehicle: Optional[Vehicle] = Relationship(back_populates="logs")

class VehicleLogResponse(VehicleLogBase):
    """Araç log response modeli"""
    id: str
    vehicle_id: Optional[str] = None
    check_in_at: datetime
    check_out_at: datetime
