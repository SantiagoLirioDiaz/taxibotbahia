from telegram import Update, ReplyKeyboardMarkup, ReplyKeyboardRemove
from telegram.ext import Application, CommandHandler, MessageHandler, filters, ContextTypes, ConversationHandler
import os
import httpx
import logging
from enum import IntEnum

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

API_URL = os.environ.get('API_URL', 'http://localhost:8001/api')
TELEGRAM_TOKEN = os.environ.get('TELEGRAM_TOKEN')

class States(IntEnum):
    CHOOSE_SERVICE = 1
    INPUT_ORIGIN = 2
    INPUT_DESTINATION = 3
    CONFIRM = 4

async def start(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Handler para /start"""
    user = update.effective_user
    
    keyboard = [["🚕 Taxi", "📦 Enviar Paquete"]]
    reply_markup = ReplyKeyboardMarkup(keyboard, one_time_keyboard=True, resize_keyboard=True)
    
    await update.message.reply_text(
        f"¡Hola {user.first_name}! 👋\n\n"
        f"Bienvenido a TaxiBotBahia.\n\n"
        f"¿Qué servicio necesitas?",
        reply_markup=reply_markup
    )
    
    return States.CHOOSE_SERVICE

async def choose_service(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Handler para elegir servicio"""
    text = update.message.text
    
    if "Taxi" in text:
        context.user_data['service_type'] = 'taxi'
        service_emoji = "🚕"
    else:
        context.user_data['service_type'] = 'paquete'
        service_emoji = "📦"
    
    await update.message.reply_text(
        f"{service_emoji} Perfecto.\n\n"
        f"Por favor, ingresa la dirección de **origen**:\n"
        f"Ejemplo: Av Alem 500",
        reply_markup=ReplyKeyboardRemove()
    )
    
    return States.INPUT_ORIGIN

async def input_origin(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Handler para origen"""
    origin_address = update.message.text
    
    await update.message.reply_text("🔍 Validando dirección...")
    
    async with httpx.AsyncClient() as client:
        try:
            response = await client.post(
                f"{API_URL}/maps/geocode",
                params={"address": origin_address},
                timeout=10.0
            )
            
            if response.status_code != 200:
                await update.message.reply_text(
                    "❌ Dirección no encontrada o fuera de Bahía Blanca.\n\n"
                    "El servicio solo está disponible en Bahía Blanca.\n\n"
                    "Por favor, ingresa otra dirección:"
                )
                return States.INPUT_ORIGIN
            
            result = response.json()
            context.user_data['origin'] = result
            
            await update.message.reply_text(
                f"✅ Origen confirmado:\n{result['formatted_address']}\n\n"
                f"Ahora ingresa la dirección de **destino**:"
            )
            
            return States.INPUT_DESTINATION
            
        except Exception as e:
            logger.error(f"Error geocoding origin: {e}")
            await update.message.reply_text(
                "❌ Error al validar la dirección. Por favor, intenta nuevamente."
            )
            return States.INPUT_ORIGIN

async def input_destination(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Handler para destino"""
    dest_address = update.message.text
    
    await update.message.reply_text("🔍 Validando dirección y calculando...")
    
    async with httpx.AsyncClient() as client:
        try:
            response = await client.post(
                f"{API_URL}/maps/geocode",
                params={"address": dest_address},
                timeout=10.0
            )
            
            if response.status_code != 200:
                await update.message.reply_text(
                    "❌ Dirección no encontrada o fuera de Bahía Blanca.\n\n"
                    "El servicio solo está disponible en Bahía Blanca.\n\n"
                    "Por favor, ingresa otra dirección:"
                )
                return States.INPUT_DESTINATION
            
            dest_result = response.json()
            context.user_data['destination'] = dest_result
            
            origin = context.user_data['origin']
            
            dist_response = await client.post(
                f"{API_URL}/maps/distance",
                params={
                    "origin_lat": origin['lat'],
                    "origin_lng": origin['lng'],
                    "dest_lat": dest_result['lat'],
                    "dest_lng": dest_result['lng']
                },
                timeout=10.0
            )
            
            if dist_response.status_code != 200:
                await update.message.reply_text(
                    "❌ Error al calcular la distancia. Por favor, intenta nuevamente."
                )
                return States.INPUT_DESTINATION
            
            distance_data = dist_response.json()
            distance_km = distance_data['distance_km']
            
            settings_response = await client.get(f"{API_URL}/settings")
            if settings_response.status_code == 200:
                settings = settings_response.json()
                base_fare = settings['base_fare']
                price_per_km = settings['price_per_km']
            else:
                base_fare = 2000
                price_per_km = 1000
            
            price = base_fare + (distance_km * price_per_km)
            
            context.user_data['distance_km'] = distance_km
            context.user_data['price'] = price
            
            service_emoji = "🚕" if context.user_data['service_type'] == 'taxi' else "📦"
            
            keyboard = [["✅ Confirmar", "❌ Cancelar"]]
            reply_markup = ReplyKeyboardMarkup(keyboard, one_time_keyboard=True, resize_keyboard=True)
            
            await update.message.reply_text(
                f"{service_emoji} **Resumen del viaje**\n\n"
                f"📍 **Origen:** {origin['formatted_address']}\n"
                f"📍 **Destino:** {dest_result['formatted_address']}\n\n"
                f"📏 **Distancia:** {distance_km} km\n"
                f"💰 **Precio estimado:** ${price:,.0f} ARS\n\n"
                f"¿Confirmar viaje?",
                reply_markup=reply_markup
            )
            
            return States.CONFIRM
            
        except Exception as e:
            logger.error(f"Error processing destination: {e}")
            await update.message.reply_text(
                "❌ Error al procesar. Por favor, intenta nuevamente."
            )
            return States.INPUT_DESTINATION

async def confirm(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Handler para confirmar"""
    text = update.message.text
    
    if "Cancelar" in text:
        await update.message.reply_text(
            "❌ Viaje cancelado.\n\n"
            "Usa /start para solicitar otro viaje.",
            reply_markup=ReplyKeyboardRemove()
        )
        return ConversationHandler.END
    
    user = update.effective_user
    
    async with httpx.AsyncClient() as client:
        try:
            user_data = {
                "telegram_id": user.id,
                "name": user.first_name + (f" {user.last_name}" if user.last_name else "")
            }
            
            trip_data = {
                "user_id": str(user.id),
                "service_type": context.user_data['service_type'],
                "origin_address": context.user_data['origin']['formatted_address'],
                "destination_address": context.user_data['destination']['formatted_address'],
                "origin_lat": context.user_data['origin']['lat'],
                "origin_lng": context.user_data['origin']['lng'],
                "destination_lat": context.user_data['destination']['lat'],
                "destination_lng": context.user_data['destination']['lng'],
                "distance_km": context.user_data['distance_km'],
                "price": context.user_data['price']
            }
            
            response = await client.post(f"{API_URL}/trips", json=trip_data, timeout=10.0)
            
            if response.status_code == 201 or response.status_code == 200:
                trip = response.json()
                
                await update.message.reply_text(
                    f"✅ **¡Viaje confirmado!**\n\n"
                    f"Tu solicitud ha sido registrada.\n"
                    f"En breve un chofer será asignado.\n\n"
                    f"ID del viaje: {trip['id'][:8]}\n\n"
                    f"Gracias por usar TaxiBotBahia 🚕",
                    reply_markup=ReplyKeyboardRemove()
                )
            else:
                await update.message.reply_text(
                    f"❌ Error al registrar el viaje.\n"
                    f"Por favor, intenta nuevamente con /start",
                    reply_markup=ReplyKeyboardRemove()
                )
            
        except Exception as e:
            logger.error(f"Error creating trip: {e}")
            await update.message.reply_text(
                "❌ Error al confirmar el viaje. Por favor, intenta nuevamente.",
                reply_markup=ReplyKeyboardRemove()
            )
    
    return ConversationHandler.END

async def cancel(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Handler para /cancel"""
    await update.message.reply_text(
        "Operación cancelada. Usa /start para comenzar de nuevo.",
        reply_markup=ReplyKeyboardRemove()
    )
    return ConversationHandler.END

def main():
    """Iniciar el bot"""
    if not TELEGRAM_TOKEN:
        logger.error("TELEGRAM_TOKEN no configurado")
        return
    
    application = Application.builder().token(TELEGRAM_TOKEN).build()
    
    conv_handler = ConversationHandler(
        entry_points=[CommandHandler('start', start)],
        states={
            States.CHOOSE_SERVICE: [MessageHandler(filters.TEXT & ~filters.COMMAND, choose_service)],
            States.INPUT_ORIGIN: [MessageHandler(filters.TEXT & ~filters.COMMAND, input_origin)],
            States.INPUT_DESTINATION: [MessageHandler(filters.TEXT & ~filters.COMMAND, input_destination)],
            States.CONFIRM: [MessageHandler(filters.TEXT & ~filters.COMMAND, confirm)],
        },
        fallbacks=[CommandHandler('cancel', cancel)]
    )
    
    application.add_handler(conv_handler)
    
    logger.info("Bot iniciado...")
    application.run_polling(allowed_updates=Update.ALL_TYPES)

if __name__ == '__main__':
    main()
