import httpx
import logging
from typing import Dict, Any, Optional, List
from app.core.config import settings

logger = logging.getLogger(__name__)

class WhatsAppService:
    """WhatsApp Business API servisi"""
    
    def __init__(self):
        self.base_url = "https://graph.facebook.com/v22.0"
        self.phone_number_id = settings.WHATSAPP_PHONE_NUMBER_ID
        self.access_token = settings.WHATSAPP_TOKEN
        
    async def send_message(
        self,
        to_phone: str,
        message: str,
        message_type: str = "text",
        template_name: Optional[str] = None,
        template_language: str = "tr",
        template_body_params: Optional[List[str]] = None,
    ) -> Dict[str, Any]:
        """
        WhatsApp mesajı gönder
        
        Args:
            to_phone: Alıcı telefon numarası (90xxxxxxxxxx formatında)
            message: Gönderilecek mesaj
            message_type: Mesaj tipi (text, template)
            
        Returns:
            API response dict
        """
        if not self.access_token or not self.phone_number_id:
            logger.warning("WhatsApp API yapılandırması eksik")
            return {"success": False, "error": "WhatsApp API yapılandırması eksik"}
        
        url = f"{self.base_url}/{self.phone_number_id}/messages"
        
        headers = {
            "Authorization": f"Bearer {self.access_token}",
            "Content-Type": "application/json"
        }
        
        payload = {
            "messaging_product": "whatsapp",
            "to": to_phone,
            "type": message_type,
        }
        
        if message_type == "text":
            payload["text"] = {"body": message}
        elif message_type == "template":
            # Template mesajları için esnek yapılandırma
            body_parameters = template_body_params or [message] if message else []
            payload["template"] = {
                "name": template_name or "hello_world",
                "language": {"code": template_language},
                "components": [
                    {
                        "type": "body",
                        "parameters": [{"type": "text", "text": p} for p in body_parameters],
                    }
                ],
            }
        
        try:
            async with httpx.AsyncClient(timeout=20.0) as client:
                response = await client.post(url, headers=headers, json=payload)
                response.raise_for_status()
                
                result = response.json()
                logger.info(
                    "WhatsApp mesajı gönderildi",
                    extra={
                        "to": to_phone,
                        "type": message_type,
                        "msg_id": (result.get("messages") or [{}])[0].get("id") if isinstance(result.get("messages"), list) else None,
                    },
                )
                return {"success": True, "data": result}
                
        except httpx.HTTPStatusError as e:
            try:
                error_json = e.response.json()
            except Exception:
                error_json = {"raw": e.response.text}
            error_msg = f"WhatsApp API hatası: {e.response.status_code}"
            logger.error(
                error_msg,
                extra={
                    "to": to_phone,
                    "payload": payload,
                    "error": error_json,
                },
            )
            return {"success": False, "error": error_msg, "details": error_json}
        except Exception as e:
            error_msg = f"WhatsApp mesaj gönderme hatası: {str(e)}"
            logger.error(error_msg, extra={"to": to_phone, "payload": payload})
            return {"success": False, "error": error_msg}
    
    async def send_daily_summary(
        self, 
        owner_phone: str, 
        summary_text: str
    ) -> Dict[str, Any]:
        """
        İşletme sahibine günlük özet gönder
        
        Args:
            owner_phone: İşletme sahibinin telefon numarası
            summary_text: Özet metni
            
        Returns:
            Gönderim sonucu
        """
        return await self.send_message(owner_phone, summary_text, "text")

    async def send_owner_event(self, text: str) -> Dict[str, Any]:
        """İşletme sahibine tek satır olay bildirimi gönder."""
        if not settings.OWNER_PHONE:
            return {"success": False, "error": "OWNER_PHONE not set"}
        return await self.send_message(settings.OWNER_PHONE, text, "text")

    async def send_template_message(
        self,
        to_phone: str,
        template_name: str,
        language_code: str = "tr",
        body_params: Optional[List[str]] = None,
    ) -> Dict[str, Any]:
        """
        Onaylı bir WhatsApp template mesajı gönder.

        Args:
            to_phone: Alıcı telefon (90xxxxxxxxxx)
            template_name: Template ismi (örn: hello_world)
            language_code: Dil kodu (örn: tr, en_US)
            body_params: Body parametreleri sırayla
        """
        return await self.send_message(
            to_phone=to_phone,
            message="",
            message_type="template",
            template_name=template_name,
            template_language=language_code,
            template_body_params=body_params or [],
        )
    
    async def send_vehicle_ready_notification(
        self, 
        customer_phone: str, 
        plate: str
    ) -> Dict[str, Any]:
        """
        Müşteriye araç hazır bildirimi gönder
        
        Args:
            customer_phone: Müşteri telefon numarası
            plate: Araç plakası
            
        Returns:
            Gönderim sonucu
        """
        message = f"🚗 Aracınız hazır!\n\nPlaka: {plate}\nTeslim noktasına geliniz.\n\nVale Sistemi"
        return await self.send_message(customer_phone, message, "text")
    
    async def verify_webhook(self, verify_token: str, challenge: str) -> Optional[str]:
        """
        Webhook doğrulama
        
        Args:
            verify_token: Gelen doğrulama token'ı
            challenge: Facebook challenge değeri
            
        Returns:
            Challenge değeri (doğrulama başarılıysa)
        """
        if verify_token == settings.WHATSAPP_WEBHOOK_VERIFY_TOKEN:
            return challenge
        return None
    
    def format_daily_summary(
        self,
        date: str,
        total_cars: int,
        parked_now: int,
        avg_wait: int,
        avg_stay: int,
        peak_hour: int,
        peak_count: int
    ) -> str:
        """
        Günlük özet formatla
        
        Args:
            date: Tarih
            total_cars: Toplam araç sayısı
            parked_now: Şu an parkta olan araç sayısı
            avg_wait: Ortalama bekleme süresi
            avg_stay: Ortalama kalış süresi
            peak_hour: En yoğun saat
            peak_count: En yoğun saatteki araç sayısı
            
        Returns:
            Formatlanmış özet metni
        """
        return f"""📊 *Günlük Vale Raporu* - {date}

🚗 *Toplam Araç:* {total_cars}
🅿️ *Şu An Parkta:* {parked_now}
⏱️ *Ortalama Bekleme:* {avg_wait} dk
🕒 *Ortalama Kalış:* {avg_stay} dk
📈 *En Yoğun Saat:* {peak_hour:02d}:00 ({peak_count} araç)

Vale Yönetim Sistemi 🚀"""

# Global instance
whatsapp_service = WhatsAppService()
