import googlemaps
import os
from typing import Optional, Tuple

class MapsService:
    def __init__(self):
        self.gmaps = None
        self.bahia_bounds = {
            'south': -38.84,
            'north': -38.64,
            'west': -62.36,
            'east': -62.16
        }
    
    def _get_client(self):
        """Lazy load Google Maps client"""
        if self.gmaps is None:
            api_key = os.environ.get('GOOGLE_MAPS_API_KEY')
            if not api_key:
                raise ValueError("GOOGLE_MAPS_API_KEY no está configurada")
            self.gmaps = googlemaps.Client(key=api_key)
        return self.gmaps
    
    def geocode_address(self, address: str) -> Optional[dict]:
        """Geocodificar una dirección y validar que esté en Bahía Blanca"""
        try:
            gmaps = self._get_client()
            
            # Agregar "Bahía Blanca" al query si no está incluido
            if "bahia" not in address.lower() and "bahía" not in address.lower():
                address = f"{address}, Bahía Blanca, Buenos Aires, Argentina"
            
            result = gmaps.geocode(address)
            
            if not result:
                return None
            
            location = result[0]['geometry']['location']
            formatted_address = result[0]['formatted_address']
            
            # Validar que esté en los límites de Bahía Blanca
            if not self._is_in_bahia_blanca(location['lat'], location['lng']):
                return None
            
            return {
                'lat': location['lat'],
                'lng': location['lng'],
                'formatted_address': formatted_address
            }
        except Exception as e:
            print(f"Error geocodificando: {e}")
            return None
    
    def calculate_distance(self, origin_lat: float, origin_lng: float, 
                          dest_lat: float, dest_lng: float) -> Optional[float]:
        """Calcular distancia en km entre dos puntos"""
        try:
            gmaps = self._get_client()
            
            result = gmaps.distance_matrix(
                origins=[(origin_lat, origin_lng)],
                destinations=[(dest_lat, dest_lng)],
                mode="driving"
            )
            
            if result['rows'][0]['elements'][0]['status'] == 'OK':
                distance_meters = result['rows'][0]['elements'][0]['distance']['value']
                return round(distance_meters / 1000, 2)  # Convertir a km
            
            return None
        except Exception as e:
            print(f"Error calculando distancia: {e}")
            return None
    
    def _is_in_bahia_blanca(self, lat: float, lng: float) -> bool:
        """Verificar si las coordenadas están dentro de Bahía Blanca"""
        return (self.bahia_bounds['south'] <= lat <= self.bahia_bounds['north'] and
                self.bahia_bounds['west'] <= lng <= self.bahia_bounds['east'])
