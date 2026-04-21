from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.exc import IntegrityError
from sqlmodel import Session, select
from typing import List, Dict, Any
from datetime import datetime, timedelta

from app.core.database import get_session
from app.models.vehicle import (
    Vehicle, VehicleLog, VehicleStatus, VehicleCreate, 
    VehicleUpdate, VehicleResponse, VehicleLogResponse
)
from app.core.utils import (
    normalize_plate, validate_plate_format,
    calculate_duration_minutes, save_upload_file
)
from pydantic import BaseModel
from app.services.whatsapp import whatsapp_service

router = APIRouter()

# Request/Response modelleri
class VehicleCreateRequest(BaseModel):
    plate: str
    location_note: str = None

class StatusUpdateRequest(BaseModel):
    status: VehicleStatus
    valet_notes: str = None

class ApiResponse(BaseModel):
    success: bool
    data: Any = None
    error: str = None

@router.get("/vehicles")
async def get_vehicles(
    session: Session = Depends(get_session)
) -> ApiResponse:
    """Tüm aktif araçları getir"""
    try:
        statement = select(Vehicle).order_by(Vehicle.check_in_at)
        vehicles = session.exec(statement).all()

        # Loyalty bilgisi (son 90 gün içinde aynı plakadan >=2 kayıt → 3. gelişte yıldız)
        ninety_days_ago = datetime.now() - timedelta(days=90)
        logs_stmt = select(VehicleLog).where(VehicleLog.check_in_at >= ninety_days_ago)
        recent_logs = session.exec(logs_stmt).all()
        plate_counts: Dict[str, int] = {}
        for log in recent_logs:
            plate_counts[log.plate] = plate_counts.get(log.plate, 0) + 1
        
        # Response formatına çevir
        vehicles_data = []
        for vehicle in vehicles:
            vehicles_data.append({
                "id": vehicle.id,
                "plate": vehicle.plate,
                "status": vehicle.status,
                "vehicle_photo_url": vehicle.vehicle_photo_url,
                "location_note": vehicle.location_note,
                "check_in_at": vehicle.check_in_at.isoformat(),
                "requested_at": vehicle.requested_at.isoformat() if vehicle.requested_at else None,
                "ready_at": vehicle.ready_at.isoformat() if vehicle.ready_at else None,
                "requested_in": vehicle.requested_in,
                "valet_notes": vehicle.valet_notes,
                "is_loyal": plate_counts.get(vehicle.plate, 0) >= 3
            })
        
        return ApiResponse(success=True, data=vehicles_data)
        
    except Exception as e:
        return ApiResponse(success=False, error=str(e))

@router.post("/vehicles")
async def add_vehicle(
    request: VehicleCreateRequest,
    session: Session = Depends(get_session)
) -> ApiResponse:
    """Yeni araç kaydı"""
    try:
        # Plaka formatını kontrol et
        normalized_plate = normalize_plate(request.plate)
        if not validate_plate_format(normalized_plate):
            raise HTTPException(status_code=400, detail="Geçersiz plaka formatı")
        
        # Aynı plaka var mı kontrol et
        existing_statement = select(Vehicle).where(Vehicle.plate == normalized_plate)
        existing_vehicle = session.exec(existing_statement).first()
        
        if existing_vehicle:
            raise HTTPException(status_code=400, detail="Bu plaka zaten sistemde kayıtlı")
        
        # Yeni araç oluştur
        vehicle = Vehicle(
            plate=normalized_plate,
            location_note=request.location_note,
            status=VehicleStatus.PARKED,
            check_in_at=datetime.now()
        )
        
        session.add(vehicle)
        try:
            session.commit()
        except IntegrityError:
            session.rollback()
            raise HTTPException(status_code=400, detail="Bu plaka zaten sistemde kayıtlı (DB)")
        session.refresh(vehicle)
        
        # Response data
        vehicle_data = {
            "id": vehicle.id,
            "plate": vehicle.plate,
            "status": vehicle.status,
            "vehicle_photo_url": vehicle.vehicle_photo_url,
            "location_note": vehicle.location_note,
            "check_in_at": vehicle.check_in_at.isoformat(),
            "requested_at": None,
            "ready_at": None,
            "requested_in": vehicle.requested_in,
            "valet_notes": vehicle.valet_notes
        }
        
        return ApiResponse(success=True, data=vehicle_data)
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/vehicles/{vehicle_id}/status")
async def update_vehicle_status(
    vehicle_id: str,
    request: StatusUpdateRequest,
    session: Session = Depends(get_session)
) -> ApiResponse:
    """Araç durumunu güncelle"""
    try:
        # Aracı bul
        vehicle = session.get(Vehicle, vehicle_id)
        if not vehicle:
            raise HTTPException(status_code=404, detail="Araç bulunamadı")
        
        # Durum geçişi kontrolü
        valid_transitions = {
            VehicleStatus.PARKED: [VehicleStatus.REQUESTED],
            VehicleStatus.REQUESTED: [VehicleStatus.PREPARING],
            VehicleStatus.PREPARING: [VehicleStatus.READY],
            VehicleStatus.READY: []  # Teslim için ayrı endpoint
        }
        
        if request.status not in valid_transitions.get(vehicle.status, []):
            raise HTTPException(
                status_code=400, 
                detail=f"Geçersiz durum geçişi: {vehicle.status} -> {request.status}"
            )
        
        # Durumu güncelle
        vehicle.status = request.status
        
        # Zaman damgalarını güncelle
        if request.status == VehicleStatus.READY:
            vehicle.ready_at = datetime.now()
        elif request.status == VehicleStatus.PREPARING and not vehicle.requested_at:
            # Emniyet için: hazırlama başlamışsa ancak requested_at boşsa şimdiye set et
            vehicle.requested_at = datetime.now()
        
        # Vale notlarını güncelle
        if request.valet_notes is not None:
            vehicle.valet_notes = request.valet_notes
        
        session.add(vehicle)
        session.commit()
        session.refresh(vehicle)
        
        # Response data
        vehicle_data = {
            "id": vehicle.id,
            "plate": vehicle.plate,
            "status": vehicle.status,
            "vehicle_photo_url": vehicle.vehicle_photo_url,
            "location_note": vehicle.location_note,
            "check_in_at": vehicle.check_in_at.isoformat(),
            "requested_at": vehicle.requested_at.isoformat() if vehicle.requested_at else None,
            "ready_at": vehicle.ready_at.isoformat() if vehicle.ready_at else None,
            "requested_in": vehicle.requested_in,
            "valet_notes": vehicle.valet_notes
        }
        
        # İşletme sahibine anlık bildirim + müşteriye opsiyonel bildirim
        try:
            if request.status == VehicleStatus.REQUESTED:
                await whatsapp_service.send_owner_event(f"📩 Çağrı geldi • Plaka: {vehicle.plate}")
            elif request.status == VehicleStatus.PREPARING:
                await whatsapp_service.send_owner_event(f"🔧 Hazırlanıyor • Plaka: {vehicle.plate}")
                # Müşteriye "hazırlanıyor" bildirimi (telefon mevcutsa)
                if getattr(vehicle, "customer_phone", None):
                    try:
                        prep_msg = f"🔧 Aracınız hazırlanıyor.\n\nPlaka: {vehicle.plate}\n\nVale Sistemi"
                        await whatsapp_service.send_message(vehicle.customer_phone, prep_msg, "text")
                    except Exception:
                        pass
            elif request.status == VehicleStatus.READY:
                await whatsapp_service.send_owner_event(f"✅ Hazır • Plaka: {vehicle.plate}")
                # Müşteriye "hazır" bildirimi (telefon mevcutsa)
                if getattr(vehicle, "customer_phone", None):
                    try:
                        await whatsapp_service.send_vehicle_ready_notification(vehicle.customer_phone, vehicle.plate)
                    except Exception:
                        pass
        except Exception:
            pass

        return ApiResponse(success=True, data=vehicle_data)
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/vehicles/{vehicle_id}/deliver")
async def deliver_vehicle(
    vehicle_id: str,
    session: Session = Depends(get_session)
) -> ApiResponse:
    """Aracı teslim et (vehicles'dan sil, logs'a ekle)"""
    try:
        # Aracı bul
        vehicle = session.get(Vehicle, vehicle_id)
        if not vehicle:
            raise HTTPException(status_code=404, detail="Araç bulunamadı")
        
        if vehicle.status != VehicleStatus.READY:
            raise HTTPException(status_code=400, detail="Araç teslim için hazır değil")
        
        # Log kaydı oluştur
        check_out_time = datetime.now()
        total_stay_duration = calculate_duration_minutes(vehicle.check_in_at, check_out_time)
        wait_time = None
        
        if vehicle.requested_at and vehicle.ready_at:
            wait_time = calculate_duration_minutes(vehicle.requested_at, vehicle.ready_at)
        
        vehicle_log = VehicleLog(
            vehicle_id=vehicle.id,
            plate=vehicle.plate,
            check_in_at=vehicle.check_in_at,
            check_out_at=check_out_time,
            total_stay_duration=total_stay_duration,
            wait_time=wait_time,
            valet_id=None  # Şimdilik None, gelecekte auth eklenebilir
        )
        
        # Log'u ekle ve aracı sil
        session.add(vehicle_log)
        session.delete(vehicle)
        session.commit()
        
        # İşletme sahibine anlık bildirim
        try:
            await whatsapp_service.send_owner_event(f"🚗 Teslim edildi • Plaka: {vehicle.plate}")
            # Müşteriye "teslim edildi" bildirimi (telefon mevcutsa)
            if getattr(vehicle, "customer_phone", None):
                try:
                    delivered_msg = f"🎉 Teslim edildi. İyi yolculuklar!\n\nPlaka: {vehicle.plate}\n\nVale Sistemi"
                    await whatsapp_service.send_message(vehicle.customer_phone, delivered_msg, "text")
                except Exception:
                    pass
        except Exception:
            pass

        return ApiResponse(success=True, data=True)
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/vehicles/{vehicle_id}/photo")
async def upload_vehicle_photo(
    vehicle_id: str,
    photo: UploadFile = File(...),
    session: Session = Depends(get_session)
) -> ApiResponse:
    """Araç fotoğrafı yükle"""
    try:
        # Aracı bul
        vehicle = session.get(Vehicle, vehicle_id)
        if not vehicle:
            raise HTTPException(status_code=404, detail="Araç bulunamadı")
        
        # Fotoğrafı kaydet
        photo_url = await save_upload_file(photo, "vehicles")
        
        # Araç kaydını güncelle
        vehicle.vehicle_photo_url = photo_url
        session.add(vehicle)
        session.commit()
        
        return ApiResponse(success=True, data=photo_url)
        
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/vehicles/{vehicle_id}")
async def get_vehicle(
    vehicle_id: str,
    session: Session = Depends(get_session)
) -> ApiResponse:
    """Tek araç detayını getir"""
    try:
        vehicle = session.get(Vehicle, vehicle_id)
        if not vehicle:
            raise HTTPException(status_code=404, detail="Araç bulunamadı")
        
        vehicle_data = {
            "id": vehicle.id,
            "plate": vehicle.plate,
            "status": vehicle.status,
            "vehicle_photo_url": vehicle.vehicle_photo_url,
            "location_note": vehicle.location_note,
            "check_in_at": vehicle.check_in_at.isoformat(),
            "requested_at": vehicle.requested_at.isoformat() if vehicle.requested_at else None,
            "ready_at": vehicle.ready_at.isoformat() if vehicle.ready_at else None,
            "requested_in": vehicle.requested_in,
            "valet_notes": vehicle.valet_notes
        }
        
        return ApiResponse(success=True, data=vehicle_data)
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/vehicles/{vehicle_id}")
async def delete_vehicle(
    vehicle_id: str,
    session: Session = Depends(get_session)
) -> ApiResponse:
    """Aracı sil (acil durumlar için)"""
    try:
        vehicle = session.get(Vehicle, vehicle_id)
        if not vehicle:
            raise HTTPException(status_code=404, detail="Araç bulunamadı")
        
        session.delete(vehicle)
        session.commit()
        
        return ApiResponse(success=True, data=True)
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
