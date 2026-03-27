# TaxiBotBahia 🚕

Sistema completo de gestión de viajes y envíos de paquetes operado mediante bot de Telegram con dashboard administrativo web.

## 🏗️ Arquitectura

- **Backend API**: FastAPI + Python 3.11
- **Frontend Dashboard**: React 19 + Tailwind CSS
- **Base de Datos**: MongoDB
- **Bot**: Telegram Bot API (python-telegram-bot)
- **Mapas**: Google Maps API (Geocoding + Distance Matrix)

## 📋 Características Implementadas

### Dashboard Administrativo
✅ **Login seguro** con JWT (usuario: admin / contraseña: admin)
✅ **Dashboard principal** con estadísticas en tiempo real y mapa de Bahía Blanca
✅ **Gestión de viajes** con asignación manual de choferes
✅ **Gestión de choferes** (CRUD completo)
✅ **Configuración de tarifas** y estado del servicio
✅ Diseño minimalista moderno con Swiss Logistics Precision

### Backend API
✅ Autenticación JWT para administradores
✅ Endpoints REST para viajes, choferes, configuración y estadísticas
✅ Integración con Google Maps para geocodificación y cálculo de distancias
✅ Sistema de pricing configurable
✅ Validación geográfica (solo Bahía Blanca)

### Bot de Telegram
✅ Flujo conversacional completo
✅ Selección de servicio (Taxi / Envío de Paquete)
✅ Validación de direcciones con Google Maps
✅ Cálculo automático de precio
✅ Confirmación y registro de viajes

## 🚀 Configuración Inicial

### 1. Configurar API Keys

Edita el archivo `/app/backend/.env`:

```bash
GOOGLE_MAPS_API_KEY="tu_api_key_de_google_maps"
TELEGRAM_TOKEN="tu_token_del_bot_de_telegram"
```

**Obtener Google Maps API Key:**
1. Ve a https://console.cloud.google.com/
2. Crea un proyecto nuevo
3. Habilita "Geocoding API" y "Distance Matrix API"
4. Crea una API Key en Credenciales
5. Configura restricciones de uso

**Obtener Telegram Bot Token:**
1. Abre Telegram y busca @BotFather
2. Envía `/newbot`
3. Sigue las instrucciones
4. Copia el token que te proporciona

### 2. Reiniciar Servicios

```bash
sudo supervisorctl restart backend
```

### 3. Acceder al Dashboard

URL: https://bahia-rides-demo.preview.emergentagent.com/login

**Credenciales iniciales:**
- Usuario: `admin`
- Contraseña: `admin`

⚠️ **Importante**: Debes cambiar la contraseña después del primer login (el sistema te lo recordará).

## 🤖 Iniciar el Bot de Telegram

### Opción 1: Manualmente (desarrollo)

```bash
cd /app/backend
export API_URL="https://bahia-rides-demo.preview.emergentagent.com/api"
export TELEGRAM_TOKEN="tu_token"
python telegram_bot/bot.py
```

### Opción 2: Webhook (producción)

El bot puede configurarse para recibir updates via webhook:

1. Configura el webhook en el código del bot
2. Usa el endpoint `/api/telegram/webhook` del backend

## 📱 Uso del Bot

1. Abre Telegram y busca tu bot (nombre que configuraste con @BotFather)
2. Envía `/start`
3. Selecciona el servicio: 🚕 Taxi o 📦 Enviar Paquete
4. Ingresa la dirección de origen (ej: "Av Alem 500")
5. Ingresa la dirección de destino (ej: "Aeropuerto Bahía Blanca")
6. Revisa el resumen (distancia y precio)
7. Confirma el viaje

El viaje se registrará automáticamente en el sistema y aparecerá en el dashboard.

## 💻 Dashboard - Guía de Uso

### Panel de Viajes
- Ver lista de todos los viajes con sus estados
- Asignar choferes manualmente a viajes confirmados
- Filtrar por estado (pendiente, confirmado, asignado, etc.)

### Panel de Choferes
- Agregar nuevos choferes con información completa
- Editar datos de choferes existentes
- Cambiar estado (Disponible, Ocupado, Fuera de línea)
- Eliminar choferes

### Panel de Configuración
- **Tarifas**: Ajustar tarifa base y precio por kilómetro
- **Servicio Activo**: Habilitar/deshabilitar solicitudes desde el bot
- **Asignación Automática**: Activar asignación automática de choferes (actualmente manual por defecto)

### Dashboard Principal
- Estadísticas en tiempo real
- Mapa con ubicación de choferes (si tienen ubicación configurada)
- Resumen de ingresos y distancias del día

## 🔧 API Endpoints

### Autenticación
- `POST /api/auth/login` - Login de administrador
- `POST /api/auth/change-password` - Cambiar contraseña

### Viajes
- `GET /api/trips` - Listar viajes
- `GET /api/trips/{id}` - Obtener viaje específico
- `POST /api/trips` - Crear viaje
- `PATCH /api/trips/{id}/status` - Actualizar estado
- `PATCH /api/trips/{id}/assign` - Asignar chofer

### Choferes
- `GET /api/drivers` - Listar choferes
- `GET /api/drivers/{id}` - Obtener chofer específico
- `POST /api/drivers` - Crear chofer
- `PATCH /api/drivers/{id}` - Actualizar chofer
- `DELETE /api/drivers/{id}` - Eliminar chofer

### Configuración
- `GET /api/settings` - Obtener configuración
- `PATCH /api/settings` - Actualizar configuración

### Estadísticas
- `GET /api/stats` - Obtener estadísticas del día

### Mapas
- `POST /api/maps/geocode?address=...` - Geocodificar dirección
- `POST /api/maps/distance` - Calcular distancia entre dos puntos

## 📊 Estados del Sistema

### Estados de Viaje
- `pending` - Pendiente
- `confirmed` - Confirmado (desde el bot)
- `assigned` - Asignado a un chofer
- `in_progress` - En progreso
- `completed` - Completado
- `cancelled` - Cancelado

### Estados de Chofer
- `available` - Disponible para viajes
- `busy` - Ocupado (tiene viaje asignado)
- `offline` - Fuera de línea

## 🗄️ Estructura de la Base de Datos

### Colección: admins
```javascript
{
  id: string,
  username: string,
  password_hash: string,
  role: string,
  must_change_password: boolean
}
```

### Colección: drivers
```javascript
{
  id: string,
  name: string,
  phone: string,
  vehicle: string,
  license_plate: string,
  status: "available" | "busy" | "offline",
  location: { lat: number, lng: number },
  created_at: string
}
```

### Colección: trips
```javascript
{
  id: string,
  user_id: string,
  driver_id: string,
  service_type: "taxi" | "paquete",
  origin_address: string,
  destination_address: string,
  origin_lat: number,
  origin_lng: number,
  destination_lat: number,
  destination_lng: number,
  distance_km: number,
  price: number,
  status: string,
  created_at: string,
  updated_at: string
}
```

### Colección: settings
```javascript
{
  id: string,
  base_fare: number,
  price_per_km: number,
  service_enabled: boolean,
  auto_dispatch_enabled: boolean
}
```

## 💰 Cálculo de Precios

Fórmula: `Precio = Tarifa Base + (Distancia en KM × Precio por KM)`

Valores por defecto:
- Tarifa Base: $2,000 ARS
- Precio por KM: $1,000 ARS

Ejemplo: Para un viaje de 9.3 km
- Precio = $2,000 + (9.3 × $1,000) = $11,300 ARS

## 🌍 Restricción Geográfica

El sistema **solo acepta direcciones dentro de Bahía Blanca**, Argentina.

Coordenadas de los límites:
- Norte: -38.64°
- Sur: -38.84°
- Este: -62.16°
- Oeste: -62.36°

## 🔐 Seguridad

- Autenticación JWT con tokens de 24 horas
- Passwords hasheados con bcrypt
- CORS configurado
- Validación de entrada en todos los endpoints
- Protección de rutas en el frontend

## 📦 Despliegue en Raspberry Pi

Para desplegar en producción en una Raspberry Pi:

1. Configurar Nginx como reverse proxy
2. Usar systemd para los servicios (backend y bot)
3. Configurar certificados SSL con Let's Encrypt
4. Usar MongoDB local o remoto
5. Configurar DuckDNS o similar para dominio dinámico

## 🛠️ Desarrollo

### Estructura del Proyecto
```
/app
├── backend/
│   ├── server.py              # API FastAPI
│   ├── models.py              # Modelos Pydantic
│   ├── services/
│   │   ├── maps_service.py    # Integración Google Maps
│   │   ├── pricing_service.py # Cálculo de precios
│   │   └── auth_service.py    # Autenticación JWT
│   ├── telegram_bot/
│   │   └── bot.py            # Bot de Telegram
│   └── .env                  # Variables de entorno
├── frontend/
│   ├── src/
│   │   ├── pages/           # Páginas del dashboard
│   │   ├── components/      # Componentes React
│   │   └── lib/
│   │       └── api.js       # Cliente API
│   └── .env                 # Variables de entorno
└── README_TAXIBOTBAHIA.md
```

### Agregar Nuevas Funcionalidades

**Backend:**
1. Agrega endpoints en `/app/backend/server.py`
2. Crea servicios en `/app/backend/services/`
3. Define modelos en `/app/backend/models.py`

**Frontend:**
1. Crea páginas en `/app/frontend/src/pages/`
2. Crea componentes en `/app/frontend/src/components/`
3. Agrega rutas en `/app/frontend/src/App.js`

**Bot:**
1. Edita `/app/backend/telegram_bot/bot.py`
2. Agrega nuevos estados o handlers

## 📝 Próximas Mejoras Sugeridas

- 🔄 Asignación automática de chofer más cercano
- 📍 Tracking en tiempo real de viajes activos
- 📱 Notificaciones push a choferes
- 💳 Integración con pasarelas de pago
- 📊 Reportes y analytics avanzados
- 🌐 Integración con WhatsApp Cloud API
- 🔔 Sistema de notificaciones al usuario
- 📅 Programación de viajes futuros
- ⭐ Sistema de calificaciones

## 🆘 Solución de Problemas

### El bot no responde
- Verifica que `TELEGRAM_TOKEN` esté configurado
- Revisa que el proceso del bot esté corriendo
- Verifica la conexión a internet

### Google Maps no funciona
- Verifica que `GOOGLE_MAPS_API_KEY` esté configurada
- Confirma que las APIs estén habilitadas en Google Cloud
- Revisa que haya crédito disponible en la cuenta

### No puedo hacer login
- Usuario por defecto: `admin` / `admin`
- Verifica que el backend esté corriendo
- Revisa los logs: `tail -f /var/log/supervisor/backend.err.log`

### El mapa no se muestra
- Verifica que Leaflet esté instalado: `yarn list leaflet`
- Revisa la consola del navegador para errores
- Confirma que react-leaflet esté importado correctamente

## 📞 Contacto y Soporte

Para soporte o consultas sobre el sistema TaxiBotBahia, contacta al equipo de desarrollo.

---

**TaxiBotBahia** - Sistema de gestión de taxi y mensajería para Bahía Blanca 🚕📦
