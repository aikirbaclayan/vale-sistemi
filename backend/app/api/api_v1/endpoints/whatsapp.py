from fastapi import APIRouter, Request, HTTPException, Query
from fastapi.responses import PlainTextResponse
from typing import Dict, Any
import logging

from app.services.whatsapp import whatsapp_service
from app.core.config import settings

router = APIRouter()
logger = logging.getLogger(__name__)

def _verify_webhook_core(hub_mode: str | None, hub_verify_token: str | None, hub_challenge: str | None) -> PlainTextResponse:
    """Core verification logic that returns text/plain response."""
    logger.info(f"Webhook doğrulama talebi: mode={hub_mode}, token={hub_verify_token}")
    if hub_mode == "subscribe":
        verified = (hub_verify_token == settings.WHATSAPP_WEBHOOK_VERIFY_TOKEN)
        if verified and hub_challenge is not None:
            logger.info("Webhook başarıyla doğrulandı")
            return PlainTextResponse(content=hub_challenge, status_code=200)
        logger.warning("Webhook doğrulama başarısız")
        raise HTTPException(status_code=403, detail="Webhook doğrulama başarısız")
    raise HTTPException(status_code=400, detail="Geçersiz webhook talebi")


@router.get(
    "/webhook",
    response_class=PlainTextResponse,
    responses={
        200: {"content": {"text/plain": {"example": "123456"}}},
        400: {"description": "Geçersiz webhook talebi"},
        403: {"description": "Webhook doğrulama başarısız"},
    },
)
async def verify_webhook(
    hub_mode: str | None = Query(default=None, alias="hub.mode"),
    hub_verify_token: str | None = Query(default=None, alias="hub.verify_token"),
    hub_challenge: str | None = Query(default=None, alias="hub.challenge"),
) -> PlainTextResponse:
    """
    WhatsApp webhook doğrulama endpoint'i (text/plain)
    """
    return _verify_webhook_core(hub_mode, hub_verify_token, hub_challenge)


@router.get(
    "/webhook/",
    response_class=PlainTextResponse,
    responses={
        200: {"content": {"text/plain": {"example": "123456"}}},
        400: {"description": "Geçersiz webhook talebi"},
        403: {"description": "Webhook doğrulama başarısız"},
    },
)
async def verify_webhook_trailing_slash(
    hub_mode: str | None = Query(default=None, alias="hub.mode"),
    hub_verify_token: str | None = Query(default=None, alias="hub.verify_token"),
    hub_challenge: str | None = Query(default=None, alias="hub.challenge"),
) -> PlainTextResponse:
    """
    WhatsApp webhook doğrulama endpoint'i (trailing slash, text/plain)
    """
    return _verify_webhook_core(hub_mode, hub_verify_token, hub_challenge)

@router.post("/webhook")
async def handle_webhook(
    request: Request
) -> Dict[str, Any]:
    """
    WhatsApp webhook mesaj alma endpoint'i
    Müşterilerden gelen mesajları işler
    """
    try:
        # Webhook payload'ını al
        payload = await request.json()
        logger.info(f"Webhook mesajı alındı: {payload}")
        
        # Mesaj işleme mantığı (gelecekte genişletilebilir)
        # Şimdilik sadece log'la ve OK döndür
        
        return {"status": "success"}
        
    except Exception as e:
        logger.error(f"Webhook işleme hatası: {e}")
        raise HTTPException(status_code=500, detail="Webhook işleme hatası")

@router.post("/send-test-message")
async def send_test_message() -> Dict[str, Any]:
    """
    Test mesajı gönderme endpoint'i
    WhatsApp entegrasyonunu test etmek için
    """
    try:
        # Test mesajı gönder
        test_phone = "+905519584364"  # Sizin numaranız
        test_message = "🚗 Vale Sistemi test mesajı!\n\nWhatsApp entegrasyonu çalışıyor."
        
        result = await whatsapp_service.send_message(test_phone, test_message)
        
        if result["success"]:
            logger.info("Test mesajı başarıyla gönderildi")
            return {"success": True, "message": "Test mesajı gönderildi"}
        else:
            logger.error(f"Test mesajı gönderilemedi: {result.get('error')}")
            return {"success": False, "error": result.get("error")}
            
    except Exception as e:
        logger.error(f"Test mesajı gönderme hatası: {e}")
        return {"success": False, "error": str(e)}
