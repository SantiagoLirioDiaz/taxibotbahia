# 🐳 TaxiBotBahia - Instalación con Docker

## 📋 Requisitos

- Raspberry Pi 4 con Raspbian
- Docker instalado
- Portainer instalado (opcional pero recomendado)
- Dominio configurado (opcional, para SSL)

## 🚀 Instalación Rápida

### Opción 1: Con script automático

```bash
# 1. Descargar el proyecto
cd ~
wget https://bahia-rides-demo.preview.emergentagent.com/taxibotbahia-installer.tar.gz
tar -xzf taxibotbahia-installer.tar.gz
cd taxibotbahia/docker

# 2. Ejecutar instalador
./install_docker.sh
```

El instalador te preguntará:
- Google Maps API Key
- Telegram Bot Token
- Si quieres configurar SSL

### Opción 2: Con Docker Compose manual

```bash
# 1. Crear archivo .env
cat > .env << EOF
GOOGLE_MAPS_API_KEY=tu_key_aqui
TELEGRAM_TOKEN=tu_token_aqui
JWT_SECRET=$(openssl rand -hex 32)
EOF

# 2. Iniciar servicios
docker-compose up -d

# 3. Ver logs
docker-compose logs -f
```

### Opción 3: Con Portainer (Stack)

1. Abre Portainer: `http://TU_IP:9000/`
2. Ve a **Stacks** → **Add Stack**
3. Copia el contenido de `docker-compose.yml`
4. Agrega las variables de entorno en **Environment variables**:
   - `GOOGLE_MAPS_API_KEY`
   - `TELEGRAM_TOKEN`
   - `JWT_SECRET`
5. Click en **Deploy the stack**

## 🔒 Configuración SSL/HTTPS

### Requisitos previos

1. **Tener un dominio** (puede ser gratuito con DuckDNS)
2. **Configurar DNS** para que apunte a tu IP pública
3. **Port forwarding** en tu router (puertos 80 y 443)

### Pasos

```bash
cd ~/taxibotbahia-docker/docker

# Ejecutar script de SSL
./setup_ssl.sh tu-dominio.com tu@email.com
```

El script:
- Solicita certificado de Let's Encrypt
- Configura Nginx con HTTPS
- Configura renovación automática

### Verificación

```bash
# Verificar que el certificado se creó
docker exec taxibot-frontend ls -la /etc/letsencrypt/live/

# Probar HTTPS
curl -I https://tu-dominio.com/
```

## 📊 Gestión con Portainer

### Ver contenedores

1. Abre Portainer
2. Ve a **Containers**
3. Verás:
   - `taxibot-mongodb` - Base de datos
   - `taxibot-backend` - API
   - `taxibot-telegram` - Bot
   - `taxibot-frontend` - Dashboard web
   - `taxibot-certbot` - Renovación SSL

### Ver logs

1. Click en un contenedor
2. Click en **Logs**
3. Selecciona **Auto-refresh**

### Reiniciar servicios

1. Selecciona el contenedor
2. Click en **Restart**

### Actualizar después de cambios

1. Ve a **Stacks**
2. Selecciona `taxibotbahia`
3. Click en **Update**
4. Marca **Re-deploy**
5. Click en **Update the stack**

## 📝 Estructura de Contenedores

```
taxibot-mongodb (mongo:4.4)
  ├─ Puerto: 27017
  ├─ Red: taxibot-network
  └─ Volumen: mongodb_data

taxibot-backend (Python FastAPI)
  ├─ Puerto: 8001
  ├─ Red: taxibot-network
  └─ Depende de: mongodb

taxibot-telegram (Python Bot)
  ├─ Red: taxibot-network
  └─ Depende de: backend

taxibot-frontend (Nginx + React)
  ├─ Puertos: 80, 443
  ├─ Red: taxibot-network
  ├─ Depende de: backend
  └─ Volúmenes: certbot_certs, certbot_www

taxibot-certbot (Certbot)
  ├─ Red: taxibot-network
  └─ Volúmenes: certbot_certs, certbot_www
```

## 🔧 Comandos Útiles

### Docker Compose

```bash
# Ver estado
docker-compose ps

# Ver logs
docker-compose logs -f [servicio]

# Reiniciar todo
docker-compose restart

# Reiniciar un servicio
docker-compose restart backend

# Detener todo
docker-compose down

# Detener y eliminar volúmenes
docker-compose down -v

# Reconstruir imágenes
docker-compose build --no-cache

# Actualizar y reiniciar
docker-compose up -d --build
```

### Docker directo

```bash
# Ver contenedores
docker ps

# Ver logs de un contenedor
docker logs -f taxibot-backend

# Entrar a un contenedor
docker exec -it taxibot-backend bash

# Ver recursos usados
docker stats

# Ver redes
docker network ls

# Ver volúmenes
docker volume ls
```

### Backup

```bash
# Backup de MongoDB
docker exec taxibot-mongodb mongodump \
  --db taxibotbahia \
  --out /tmp/backup

docker cp taxibot-mongodb:/tmp/backup ./mongodb_backup_$(date +%Y%m%d)

# Restaurar backup
docker cp ./mongodb_backup_20260312 taxibot-mongodb:/tmp/restore
docker exec taxibot-mongodb mongorestore \
  --db taxibotbahia \
  /tmp/restore/taxibotbahia
```

## 🌐 URLs de Acceso

- **Dashboard:** http://TU_IP/ o https://tu-dominio.com/
- **API Docs:** http://TU_IP:8001/docs
- **Portainer:** http://TU_IP:9000/
- **MongoDB:** localhost:27017 (desde contenedores)

## 🔑 Credenciales

**Dashboard:**
- Usuario: `admin`
- Contraseña: `admin`
- ⚠️ Cambiar después del primer login

**MongoDB:**
- Sin autenticación por defecto
- Solo accesible desde la red interna de Docker

## 🐛 Solución de Problemas

### Backend no inicia

```bash
# Ver logs
docker logs taxibot-backend

# Verificar variables de entorno
docker exec taxibot-backend env | grep API_KEY

# Reiniciar
docker-compose restart backend
```

### Frontend no accesible

```bash
# Verificar que Nginx esté corriendo
docker ps | grep frontend

# Ver logs
docker logs taxibot-frontend

# Verificar puertos
sudo lsof -i :80
sudo lsof -i :443
```

### Bot no responde

```bash
# Ver logs del bot
docker logs -f taxibot-telegram

# Verificar que tenga el token
docker exec taxibot-telegram env | grep TELEGRAM

# Reiniciar bot
docker-compose restart telegram-bot
```

### MongoDB no conecta

```bash
# Verificar que esté corriendo
docker ps | grep mongodb

# Ver logs
docker logs taxibot-mongodb

# Probar conexión
docker exec taxibot-backend ping mongodb
```

### SSL no funciona

```bash
# Verificar certificados
docker exec taxibot-frontend ls -la /etc/letsencrypt/live/

# Ver logs de Certbot
docker logs taxibot-certbot

# Renovar manualmente
docker-compose run --rm certbot renew

# Reiniciar frontend
docker-compose restart frontend
```

## 📈 Monitoreo

### Con Portainer

1. Dashboard muestra uso de CPU/RAM
2. Logs en tiempo real por contenedor
3. Alertas configurables

### Logs centralizados

```bash
# Todos los logs en tiempo real
docker-compose logs -f

# Solo backend
docker-compose logs -f backend

# Últimas 100 líneas
docker-compose logs --tail=100
```

## 🔄 Actualizaciones

### Actualizar código

```bash
# 1. Detener servicios
docker-compose down

# 2. Actualizar archivos
cd ~/taxibotbahia
git pull  # Si usas git
# O descargar nueva versión

# 3. Reconstruir
docker-compose build --no-cache

# 4. Iniciar
docker-compose up -d
```

### Actualizar imágenes base

```bash
# Descargar nuevas versiones
docker-compose pull

# Reiniciar con nuevas imágenes
docker-compose up -d
```

## 🚀 Despliegue en Producción

### Configuración recomendada

1. **Usar dominio real** con SSL
2. **Habilitar firewall** (UFW)
3. **Configurar backups automáticos** (cron)
4. **Monitoreo con Portainer**
5. **Logs rotación** (logrotate)

### Port Forwarding en Router

- Puerto 80 → Raspberry Pi (para HTTP/Let's Encrypt)
- Puerto 443 → Raspberry Pi (para HTTPS)
- Puerto 9000 → Raspberry Pi (opcional, para Portainer externo)

### Firewall

```bash
# Instalar UFW
sudo apt-get install ufw

# Configurar
sudo ufw allow 22/tcp    # SSH
sudo ufw allow 80/tcp    # HTTP
sudo ufw allow 443/tcp   # HTTPS
sudo ufw allow 9000/tcp  # Portainer (opcional)

# Activar
sudo ufw enable
```

## 📞 Soporte

Documentación completa:
- `/app/README_TAXIBOTBAHIA.md`
- `/app/docker/README_DOCKER.md`

---

**TaxiBotBahia Docker** - Solución profesional y escalable 🐳🚕
