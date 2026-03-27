#!/bin/bash

# ═══════════════════════════════════════════════════════════
# TaxiBotBahia - Instalador Docker
# Para Raspberry Pi con Docker + Portainer
# ═══════════════════════════════════════════════════════════

set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${GREEN}"
echo "╔════════════════════════════════════════════╗"
echo "║  TaxiBotBahia - Instalación Docker        ║"
echo "║  Compatible con Portainer                 ║"
echo "╚════════════════════════════════════════════╝"
echo -e "${NC}"

# Verificar que Docker esté instalado
if ! command -v docker &> /dev/null; then
    echo -e "${RED}❌ Docker no está instalado${NC}"
    echo "Instala Docker primero: curl -fsSL https://get.docker.com | sh"
    exit 1
fi

# Verificar que Docker Compose esté instalado
if ! command -v docker-compose &> /dev/null; then
    echo -e "${YELLOW}📦 Instalando Docker Compose...${NC}"
    sudo apt-get update
    sudo apt-get install -y docker-compose
fi

echo -e "${GREEN}✓ Docker y Docker Compose están instalados${NC}"
echo ""

# Directorio del proyecto
PROJECT_DIR="$HOME/taxibotbahia-docker"

echo -e "${BLUE}📂 Directorio del proyecto: $PROJECT_DIR${NC}"
echo ""

# Preguntar por las API keys
echo -e "${YELLOW}🔑 Configuración de API Keys${NC}"
echo ""

read -p "Google Maps API Key: " GOOGLE_MAPS_KEY
read -p "Telegram Bot Token: " TELEGRAM_TOKEN

# Generar JWT secret
JWT_SECRET=$(openssl rand -hex 32)

# Crear archivo .env
cat > $PROJECT_DIR/docker/.env << EOF
GOOGLE_MAPS_API_KEY=$GOOGLE_MAPS_KEY
TELEGRAM_TOKEN=$TELEGRAM_TOKEN
JWT_SECRET=$JWT_SECRET
EOF

echo -e "${GREEN}✓ Archivo .env creado${NC}"
echo ""

# Preguntar si quiere configurar SSL
echo -e "${YELLOW}🔒 ¿Quieres configurar SSL/HTTPS? (s/N)${NC}"
read -p "Respuesta: " SETUP_SSL

if [[ "$SETUP_SSL" =~ ^[Ss]$ ]]; then
    read -p "Tu dominio (ej: taxibot.tudominio.com): " DOMAIN
    
    # Guardar el dominio
    echo "DOMAIN=$DOMAIN" >> $PROJECT_DIR/docker/.env
    
    echo -e "${BLUE}SSL se configurará después de iniciar los contenedores${NC}"
    CONFIGURE_SSL_LATER=true
else
    CONFIGURE_SSL_LATER=false
fi

echo ""
echo -e "${GREEN}[1/4] 🐳 Construyendo imágenes Docker...${NC}"
cd $PROJECT_DIR/docker
docker-compose build

echo ""
echo -e "${GREEN}[2/4] 🚀 Iniciando contenedores...${NC}"
docker-compose up -d

echo ""
echo -e "${GREEN}[3/4] ⏳ Esperando a que los servicios inicien...${NC}"
sleep 15

echo ""
echo -e "${GREEN}[4/4] ✅ Verificando estado...${NC}"
docker-compose ps

echo ""
echo -e "${GREEN}╔════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║  ✅ Instalación Completada                        ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════════════════╝${NC}"
echo ""

# Obtener IP local
LOCAL_IP=$(hostname -I | awk '{print $1}')

echo -e "${GREEN}🌐 Dashboard:${NC} http://${LOCAL_IP}/"
echo -e "${GREEN}🔧 Portainer:${NC} http://${LOCAL_IP}:9000/"
echo -e "${GREEN}📊 API Docs:${NC} http://${LOCAL_IP}:8001/docs"
echo ""
echo -e "${YELLOW}📋 Credenciales del Dashboard:${NC}"
echo "   Usuario: admin"
echo "   Contraseña: admin"
echo ""

if [ "$CONFIGURE_SSL_LATER" = true ]; then
    echo -e "${YELLOW}🔒 Para configurar SSL/HTTPS:${NC}"
    echo "   cd $PROJECT_DIR/docker"
    echo "   ./setup_ssl.sh $DOMAIN"
    echo ""
fi

echo -e "${BLUE}💡 Comandos útiles:${NC}"
echo ""
echo "  Ver logs:"
echo "    docker-compose -f $PROJECT_DIR/docker/docker-compose.yml logs -f"
echo ""
echo "  Reiniciar servicios:"
echo "    docker-compose -f $PROJECT_DIR/docker/docker-compose.yml restart"
echo ""
echo "  Detener todo:"
echo "    docker-compose -f $PROJECT_DIR/docker/docker-compose.yml down"
echo ""
echo "  Actualizar después de cambios:"
echo "    docker-compose -f $PROJECT_DIR/docker/docker-compose.yml up -d --build"
echo ""

echo -e "${GREEN}🎉 ¡TaxiBotBahia está corriendo! 🚕📦${NC}"
echo ""
