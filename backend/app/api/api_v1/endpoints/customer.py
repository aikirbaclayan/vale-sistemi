from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select
from typing import Dict, Any
from datetime import datetime

from app.core.database import get_session
from app.models.vehicle import Vehicle, VehicleStatus
from app.core.utils import normalize_plate, calculate_duration_minutes, normalize_phone_for_whatsapp
from pydantic import BaseModel
from app.services.whatsapp import whatsapp_service

router = APIRouter()

# Request/Response modelleri
class PlateValidationResponse(BaseModel):
    success: bool
    data: bool
    error: str = None

class VehicleRequestModel(BaseModel):
    plate: str
    requested_in: int  # 5, 10, 15 dakika
    customer_phone: str | None = None

class CustomerFeedback(BaseModel):
    success: bool
    message: str
    queuePosition: int = None
    estimatedTime: int = None

class VehicleStatusResponse(BaseModel):
    success: bool
    data: Dict[str, Any] = None
    error: str = None

@router.get("/validate-plate/{plate}")
async def validate_plate(
    plate: str,
    session: Session = Depends(get_session)
) -> PlateValidationResponse:
    """
    Müşterinin girdiği plakayı doğrula
    Sadece o gün sistemde kayıtlı ve 'parked' durumundaki plakaları kabul et
    """
    try:
        # Plakayı normalize et
        normalized_plate = normalize_plate(plate)
        
        # Veritabanında plakayı ara
        statement = select(Vehicle).where(
            Vehicle.plate == normalized_plate,
            Vehicle.status == VehicleStatus.PARKED
        )
        vehicle = session.exec(statement).first()
        
        if vehicle:
            return PlateValidationResponse(success=True, data=True)
        else:
            return PlateValidationResponse(success=True, data=False)
            
    except Exception as e:
        return PlateValidationResponse(
            success=False, 
            data=False, 
            error=str(e)
        )

@router.post("/request-vehicle")
async def request_vehicle(
    request: VehicleRequestModel,
    session: Session = Depends(get_session)
) -> Dict[str, Any]:
    """
    Müşterinin araç çağrı talebi
    """
    try:
        # Plakayı normalize et
        normalized_plate = normalize_plate(request.plate)
        
        # Aracı bul
        statement = select(Vehicle).where(Vehicle.plate == normalized_plate)
        vehicle = session.exec(statement).first()
        
        if not vehicle:
            raise HTTPException(status_code=404, detail="Araç bulunamadı")
        
        # Yalnızca PARKED durumunda talep kabul et
        if vehicle.status != VehicleStatus.PARKED:
            raise HTTPException(status_code=400, detail="Araç şu anda müsait değil")

        # Aracı 'requested' durumuna getir
        vehicle.status = VehicleStatus.REQUESTED
        vehicle.requested_at = datetime.now()
        vehicle.requested_in = request.requested_in
        # Müşteri telefonu opsiyonel; valeye gösterilmeyecek, sadece mesaj için saklanır
        if request.customer_phone:
            vehicle.customer_phone = normalize_phone_for_whatsapp(request.customer_phone)
        
        session.add(vehicle)
        session.commit()
        session.refresh(vehicle)
        
        # Sıra pozisyonunu hesapla
        queue_statement = select(Vehicle).where(
            Vehicle.status == VehicleStatus.REQUESTED,
            Vehicle.requested_at <= vehicle.requested_at
        )
        queue_position = len(session.exec(queue_statement).all())
        
        # Tahmini süreyi hesapla (basit: sıra * 3 dakika + istenen süre)
        estimated_time = max(request.requested_in, queue_position * 3)
        
        # İşletme sahibine anlık bildirim
        try:
            await whatsapp_service.send_owner_event(
                f"🆕 Yeni çağrı • Plaka: {vehicle.plate} • {request.requested_in} dk"
            )
        except Exception:
            pass

        # Müşteriye bilgilendirme (opsiyonel telefon varsa)
        try:
            if getattr(vehicle, "customer_phone", None):
                customer_msg = (
                    f"✅ Talebiniz alındı.\n\n"
                    f"Plaka: {vehicle.plate}\n"
                    f"Sıranız: #{queue_position} — tahmini {estimated_time} dk.\n\n"
                    f"Vale Sistemi"
                )
                await whatsapp_service.send_message(vehicle.customer_phone, customer_msg, "text")
        except Exception:
            pass

        return {
            "success": True,
            "data": {
                "success": True,
                "message": "Talebiniz alındı",
                "queuePosition": queue_position,
                "estimatedTime": estimated_time
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/vehicle-status/{plate}")
async def get_vehicle_status(
    plate: str,
    session: Session = Depends(get_session)
) -> VehicleStatusResponse:
    """
    Araç durumunu sorgula
    """
    try:
        normalized_plate = normalize_plate(plate)
        
        statement = select(Vehicle).where(Vehicle.plate == normalized_plate)
        vehicle = session.exec(statement).first()
        
        if not vehicle:
            return VehicleStatusResponse(
                success=False, 
                error="Araç bulunamadı"
            )
        
        # Araç bilgilerini döndür
        vehicle_data = {
            "id": vehicle.id,
            "plate": vehicle.plate,
            "status": vehicle.status,
            "check_in_at": vehicle.check_in_at.isoformat(),
            "requested_at": vehicle.requested_at.isoformat() if vehicle.requested_at else None,
            "ready_at": vehicle.ready_at.isoformat() if vehicle.ready_at else None,
            "requested_in": vehicle.requested_in,
            "location_note": vehicle.location_note
        }
        
        return VehicleStatusResponse(success=True, data=vehicle_data)
        
    except Exception as e:
        return VehicleStatusResponse(
            success=False, 
            error=str(e)
        )
