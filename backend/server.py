from fastapi import FastAPI, APIRouter, HTTPException, Depends, Header
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from typing import List, Optional
import uuid
from datetime import datetime, timezone, timedelta

from models import (
    User, UserCreate, Driver, DriverCreate, DriverUpdate, Trip, TripCreate,
    Settings, SettingsUpdate, Admin, AdminLogin, AdminChangePassword, TokenResponse,
    Stats, TripStatus, DriverStatus, ServiceType
)
from services.maps_service import MapsService
from services.pricing_service import PricingService
from services.auth_service import AuthService

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

app = FastAPI()
api_router = APIRouter(prefix="/api")

security = HTTPBearer()
maps_service = MapsService()
pricing_service = PricingService()
auth_service = AuthService()

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

async def get_current_admin(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Dependency para verificar JWT token"""
    token = credentials.credentials
    payload = auth_service.decode_token(token)
    if not payload:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    admin = await db.admins.find_one({"id": payload.get("sub")}, {"_id": 0})
    if not admin:
        raise HTTPException(status_code=401, detail="Admin not found")
    
    return admin

@api_router.get("/")
async def root():
    return {"message": "TaxiBotBahia API v1.0"}

@api_router.post("/auth/login", response_model=TokenResponse)
async def login(credentials: AdminLogin):
    admin = await db.admins.find_one({"username": credentials.username}, {"_id": 0})
    
    if not admin or not auth_service.verify_password(credentials.password, admin['password_hash']):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    token = auth_service.create_access_token({"sub": admin['id'], "username": admin['username']})
    
    return TokenResponse(
        access_token=token,
        token_type="bearer",
        must_change_password=admin.get('must_change_password', False)
    )

@api_router.post("/auth/change-password")
async def change_password(data: AdminChangePassword, current_admin: dict = Depends(get_current_admin)):
    if not auth_service.verify_password(data.old_password, current_admin['password_hash']):
        raise HTTPException(status_code=400, detail="Invalid old password")
    
    new_hash = auth_service.hash_password(data.new_password)
    await db.admins.update_one(
        {"id": current_admin['id']},
        {"$set": {"password_hash": new_hash, "must_change_password": False}}
    )
    
    return {"message": "Password changed successfully"}

@api_router.get("/stats", response_model=Stats)
async def get_stats(current_admin: dict = Depends(get_current_admin)):
    today_start = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0).isoformat()
    
    trips_today = await db.trips.count_documents({"created_at": {"$gte": today_start}})
    trips_pending = await db.trips.count_documents({"status": TripStatus.pending.value})
    trips_in_progress = await db.trips.count_documents({"status": TripStatus.in_progress.value})
    trips_completed = await db.trips.count_documents({"status": TripStatus.completed.value})
    
    drivers_available = await db.drivers.count_documents({"status": DriverStatus.available.value})
    drivers_busy = await db.drivers.count_documents({"status": DriverStatus.busy.value})
    
    completed_trips = await db.trips.find({"created_at": {"$gte": today_start}, "status": TripStatus.completed.value}, {"_id": 0}).to_list(1000)
    total_revenue = sum([trip['price'] for trip in completed_trips])
    total_distance = sum([trip['distance_km'] for trip in completed_trips])
    
    return Stats(
        trips_today=trips_today,
        trips_pending=trips_pending,
        trips_in_progress=trips_in_progress,
        trips_completed=trips_completed,
        drivers_available=drivers_available,
        drivers_busy=drivers_busy,
        total_revenue_today=total_revenue,
        total_distance_today=total_distance
    )

@api_router.post("/maps/geocode")
async def geocode(address: str):
    result = maps_service.geocode_address(address)
    if not result:
        raise HTTPException(status_code=400, detail="Dirección no encontrada o fuera de Bahía Blanca")
    return result

@api_router.post("/maps/distance")
async def calculate_distance(origin_lat: float, origin_lng: float, dest_lat: float, dest_lng: float):
    distance = maps_service.calculate_distance(origin_lat, origin_lng, dest_lat, dest_lng)
    if distance is None:
        raise HTTPException(status_code=400, detail="No se pudo calcular la distancia")
    return {"distance_km": distance}

@api_router.post("/trips", response_model=Trip)
async def create_trip(trip_data: TripCreate):
    settings = await db.settings.find_one({}, {"_id": 0})
    
    if not settings or not settings.get('service_enabled', True):
        raise HTTPException(status_code=503, detail="Servicio no disponible en este momento")
    
    trip_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    
    trip_doc = {
        "id": trip_id,
        "user_id": trip_data.user_id,
        "driver_id": None,
        "service_type": trip_data.service_type,
        "origin_address": trip_data.origin_address,
        "destination_address": trip_data.destination_address,
        "origin_lat": trip_data.origin_lat,
        "origin_lng": trip_data.origin_lng,
        "destination_lat": trip_data.destination_lat,
        "destination_lng": trip_data.destination_lng,
        "distance_km": trip_data.distance_km,
        "price": trip_data.price,
        "status": TripStatus.confirmed.value,
        "created_at": now,
        "updated_at": now
    }
    
    await db.trips.insert_one(trip_doc)
    return Trip(**trip_doc)

@api_router.get("/trips", response_model=List[Trip])
async def get_trips(status: Optional[str] = None, current_admin: dict = Depends(get_current_admin)):
    query = {}
    if status:
        query["status"] = status
    
    trips = await db.trips.find(query, {"_id": 0}).sort("created_at", -1).to_list(1000)
    return [Trip(**trip) for trip in trips]

@api_router.get("/trips/{trip_id}", response_model=Trip)
async def get_trip(trip_id: str, current_admin: dict = Depends(get_current_admin)):
    trip = await db.trips.find_one({"id": trip_id}, {"_id": 0})
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found")
    return Trip(**trip)

@api_router.patch("/trips/{trip_id}/status")
async def update_trip_status(trip_id: str, status: TripStatus, current_admin: dict = Depends(get_current_admin)):
    result = await db.trips.update_one(
        {"id": trip_id},
        {"$set": {"status": status.value, "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Trip not found")
    
    return {"message": "Status updated"}

@api_router.patch("/trips/{trip_id}/assign")
async def assign_driver(trip_id: str, driver_id: str, current_admin: dict = Depends(get_current_admin)):
    driver = await db.drivers.find_one({"id": driver_id}, {"_id": 0})
    if not driver:
        raise HTTPException(status_code=404, detail="Driver not found")
    
    if driver['status'] != DriverStatus.available.value:
        raise HTTPException(status_code=400, detail="Driver is not available")
    
    result = await db.trips.update_one(
        {"id": trip_id},
        {"$set": {
            "driver_id": driver_id,
            "status": TripStatus.assigned.value,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Trip not found")
    
    await db.drivers.update_one({"id": driver_id}, {"$set": {"status": DriverStatus.busy.value}})
    
    return {"message": "Driver assigned"}

@api_router.post("/drivers", response_model=Driver)
async def create_driver(driver_data: DriverCreate, current_admin: dict = Depends(get_current_admin)):
    driver_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    
    driver_doc = {
        "id": driver_id,
        "name": driver_data.name,
        "phone": driver_data.phone,
        "vehicle": driver_data.vehicle,
        "license_plate": driver_data.license_plate,
        "status": driver_data.status.value,
        "location": driver_data.location.dict() if driver_data.location else None,
        "created_at": now
    }
    
    await db.drivers.insert_one(driver_doc)
    return Driver(**driver_doc)

@api_router.get("/drivers", response_model=List[Driver])
async def get_drivers(status: Optional[str] = None):
    query = {}
    if status:
        query["status"] = status
    
    drivers = await db.drivers.find(query, {"_id": 0}).to_list(1000)
    return [Driver(**driver) for driver in drivers]

@api_router.get("/drivers/{driver_id}", response_model=Driver)
async def get_driver(driver_id: str, current_admin: dict = Depends(get_current_admin)):
    driver = await db.drivers.find_one({"id": driver_id}, {"_id": 0})
    if not driver:
        raise HTTPException(status_code=404, detail="Driver not found")
    return Driver(**driver)

@api_router.patch("/drivers/{driver_id}")
async def update_driver(driver_id: str, driver_data: DriverUpdate, current_admin: dict = Depends(get_current_admin)):
    update_data = {k: v for k, v in driver_data.dict(exclude_unset=True).items() if v is not None}
    
    if 'status' in update_data:
        update_data['status'] = update_data['status'].value
    
    if 'location' in update_data and update_data['location']:
        update_data['location'] = update_data['location'].dict()
    
    result = await db.drivers.update_one({"id": driver_id}, {"$set": update_data})
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Driver not found")
    
    return {"message": "Driver updated"}

@api_router.delete("/drivers/{driver_id}")
async def delete_driver(driver_id: str, current_admin: dict = Depends(get_current_admin)):
    result = await db.drivers.delete_one({"id": driver_id})
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Driver not found")
    
    return {"message": "Driver deleted"}

@api_router.get("/settings", response_model=Settings)
async def get_settings(current_admin: dict = Depends(get_current_admin)):
    settings = await db.settings.find_one({}, {"_id": 0})
    if not settings:
        raise HTTPException(status_code=404, detail="Settings not found")
    return Settings(**settings)

@api_router.patch("/settings")
async def update_settings(settings_data: SettingsUpdate, current_admin: dict = Depends(get_current_admin)):
    update_data = {k: v for k, v in settings_data.dict(exclude_unset=True).items() if v is not None}
    
    result = await db.settings.update_one({}, {"$set": update_data})
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Settings not found")
    
    return {"message": "Settings updated"}

app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
async def startup_event():
    admin_exists = await db.admins.find_one({"username": "admin"})
    if not admin_exists:
        admin_doc = {
            "id": str(uuid.uuid4()),
            "username": "admin",
            "password_hash": auth_service.hash_password("admin"),
            "role": "admin",
            "must_change_password": True
        }
        await db.admins.insert_one(admin_doc)
        logger.info("Admin user created: admin/admin")
    
    settings_exists = await db.settings.find_one({})
    if not settings_exists:
        settings_doc = {
            "id": str(uuid.uuid4()),
            "base_fare": 2000.0,
            "price_per_km": 1000.0,
            "service_enabled": True,
            "auto_dispatch_enabled": False
        }
        await db.settings.insert_one(settings_doc)
        logger.info("Default settings created")

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
