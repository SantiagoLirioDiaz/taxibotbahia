from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, List
from datetime import datetime
from enum import Enum

class TripStatus(str, Enum):
    pending = "pending"
    confirmed = "confirmed"
    assigned = "assigned"
    in_progress = "in_progress"
    completed = "completed"
    cancelled = "cancelled"

class DriverStatus(str, Enum):
    available = "available"
    busy = "busy"
    offline = "offline"

class ServiceType(str, Enum):
    taxi = "taxi"
    paquete = "paquete"

class Location(BaseModel):
    lat: float
    lng: float

class User(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    telegram_id: int
    name: str
    phone: Optional[str] = None
    created_at: str

class UserCreate(BaseModel):
    telegram_id: int
    name: str
    phone: Optional[str] = None

class Driver(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    name: str
    phone: str
    vehicle: str
    license_plate: str
    status: DriverStatus
    location: Optional[Location] = None
    created_at: str

class DriverCreate(BaseModel):
    name: str
    phone: str
    vehicle: str
    license_plate: str
    status: DriverStatus = DriverStatus.offline
    location: Optional[Location] = None

class DriverUpdate(BaseModel):
    name: Optional[str] = None
    phone: Optional[str] = None
    vehicle: Optional[str] = None
    license_plate: Optional[str] = None
    status: Optional[DriverStatus] = None
    location: Optional[Location] = None

class Trip(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    user_id: str
    driver_id: Optional[str] = None
    service_type: ServiceType
    origin_address: str
    destination_address: str
    origin_lat: float
    origin_lng: float
    destination_lat: float
    destination_lng: float
    distance_km: float
    price: float
    status: TripStatus
    created_at: str
    updated_at: str

class TripCreate(BaseModel):
    user_id: str
    service_type: ServiceType
    origin_address: str
    destination_address: str
    origin_lat: float
    origin_lng: float
    destination_lat: float
    destination_lng: float
    distance_km: float
    price: float

class Settings(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    base_fare: float
    price_per_km: float
    service_enabled: bool
    auto_dispatch_enabled: bool

class SettingsUpdate(BaseModel):
    base_fare: Optional[float] = None
    price_per_km: Optional[float] = None
    service_enabled: Optional[bool] = None
    auto_dispatch_enabled: Optional[bool] = None

class Admin(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    username: str
    role: str
    must_change_password: bool

class AdminLogin(BaseModel):
    username: str
    password: str

class AdminChangePassword(BaseModel):
    old_password: str
    new_password: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str
    must_change_password: bool

class Stats(BaseModel):
    trips_today: int
    trips_pending: int
    trips_in_progress: int
    trips_completed: int
    drivers_available: int
    drivers_busy: int
    total_revenue_today: float
    total_distance_today: float
