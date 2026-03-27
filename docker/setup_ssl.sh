#!/bin/bash

# ═══════════════════════════════════════════════════════════
# TaxiBotBahia - Configuración SSL con Let's Encrypt
# ═══════════════════════════════════════════════════════════

set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

if [ -z "$1" ]; then
    echo -e "${RED}❌ Error: Debes proporcionar un dominio${NC}"
    echo "Uso: ./setup_ssl.sh tu-dominio.com"
    exit 1
fi

DOMAIN=$1
EMAIL=${2:-admin@$DOMAIN}

echo -e "${GREEN}"
echo "╔════════════════════════════════════════════╗"
echo "║  TaxiBotBahia - Configuración SSL         ║"
echo "╚════════════════════════════════════════════╝"
echo -e "${NC}"
echo ""

echo -e "${BLUE}📋 Configuración:${NC}"
echo "   Dominio: $DOMAIN"
echo "   Email: $EMAIL"
echo ""

# Verificar que el dominio apunte a esta IP
echo -e "${YELLOW}🔍 Verificando DNS...${NC}"
CURRENT_IP=$(hostname -I | awk '{print $1}')
DOMAIN_IP=$(dig +short $DOMAIN | tail -n1)

if [ -z "$DOMAIN_IP" ]; then
    echo -e "${RED}❌ El dominio $DOMAIN no resuelve a ninguna IP${NC}"
    echo "Configura tu DNS para que apunte a: $CURRENT_IP"
    exit 1
fi

echo "   IP del servidor: $CURRENT_IP"
echo "   IP del dominio: $DOMAIN_IP"
echo ""

if [ "$CURRENT_IP" != "$DOMAIN_IP" ]; then
    echo -e "${YELLOW}⚠️  Advertencia: Las IPs no coinciden${NC}"
    echo "El certificado se generará, pero puede fallar si el dominio no apunta aquí"
    echo ""
    read -p "¿Continuar de todos modos? (s/N): " CONTINUE
    if [[ ! "$CONTINUE" =~ ^[Ss]$ ]]; then
        exit 1
    fi
fi

# Detener frontend para liberar puerto 80
echo -e "${BLUE}🔄 Deteniendo frontend temporalmente...${NC}"
docker-compose stop frontend

# Obtener certificado
echo -e "${GREEN}🔒 Solicitando certificado SSL...${NC}"
docker-compose run --rm certbot certonly \
    --webroot \
    --webroot-path=/var/www/certbot \
    --email $EMAIL \
    --agree-tos \
    --no-eff-email \
    -d $DOMAIN

# Actualizar configuración de Nginx
echo -e "${BLUE}📝 Actualizando configuración de Nginx...${NC}"

cat > nginx-ssl.conf << EOF
server {
    listen 80;
    listen [::]:80;
    server_name $DOMAIN;

    # Para renovación de certificados
    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }

    # Redirigir todo a HTTPS
    location / {
        return 301 https://\$host\$request_uri;
    }
}

server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name $DOMAIN;

    # Certificados SSL
    ssl_certificate /etc/letsencrypt/live/$DOMAIN/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/$DOMAIN/privkey.pem;
    
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_prefer_server_ciphers on;
    ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384;
    
    # Headers de seguridad
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;

    # Frontend
    location / {
        root /usr/share/nginx/html;
        try_files \$uri \$uri/ /index.html;
        add_header Cache-Control "no-cache, no-store, must-revalidate";
    }

    # Backend API
    location /api {
        proxy_pass http://backend:8001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
        proxy_read_timeout 300;
        proxy_connect_timeout 300;
    }
}
EOF

# Copiar nueva configuración al contenedor
docker cp nginx-ssl.conf taxibot-frontend:/etc/nginx/conf.d/default.conf

# Reiniciar frontend
echo -e "${BLUE}🔄 Reiniciando frontend con SSL...${NC}"
docker-compose restart frontend

# Verificar que funcione
sleep 5
if docker-compose ps frontend | grep -q "Up"; then
    echo ""
    echo -e "${GREEN}╔════════════════════════════════════════════════════╗${NC}"
    echo -e "${GREEN}║  ✅ SSL Configurado Exitosamente                  ║${NC}"
    echo -e "${GREEN}╚════════════════════════════════════════════════════╝${NC}"
    echo ""
    echo -e "${GREEN}🌐 Dashboard (HTTPS):${NC} https://$DOMAIN/"
    echo -e "${GREEN}🔒 Certificado:${NC} Válido por 90 días"
    echo ""
    echo -e "${BLUE}💡 El certificado se renovará automáticamente${NC}"
    echo ""
else
    echo -e "${RED}❌ Error al reiniciar Nginx${NC}"
    echo "Revisa los logs: docker-compose logs frontend"
    exit 1
fi

# Configurar renovación automática
echo -e "${BLUE}⚙️  Configurando renovación automática...${NC}"

# Crear script de renovación
cat > renew_cert.sh << 'EOF'
#!/bin/bash
cd $(dirname $0)
docker-compose run --rm certbot renew
docker-compose restart frontend
EOF

chmod +x renew_cert.sh

# Agregar a crontab (ejecutar cada semana)
(crontab -l 2>/dev/null; echo "0 3 * * 1 $PWD/renew_cert.sh >> $PWD/certbot_renew.log 2>&1") | crontab -

echo -e "${GREEN}✓ Renovación automática configurada (cada lunes a las 3 AM)${NC}"
echo ""

echo -e "${GREEN}🎉 ¡Configuración SSL completa! 🔒${NC}"
echo ""
