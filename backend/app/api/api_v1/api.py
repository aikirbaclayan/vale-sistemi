from fastapi import APIRouter
from app.api.api_v1.endpoints import customer, valet, owner, whatsapp

api_router = APIRouter()

# Endpoint'leri ekle
api_router.include_router(customer.router, prefix="/customer", tags=["customer"])
api_router.include_router(valet.router, prefix="/valet", tags=["valet"])
api_router.include_router(owner.router, prefix="/owner", tags=["owner"])
api_router.include_router(whatsapp.router, prefix="/whatsapp", tags=["whatsapp"])
