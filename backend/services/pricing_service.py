class PricingService:
    @staticmethod
    def calculate_price(distance_km: float, base_fare: float, price_per_km: float) -> float:
        """Calcular precio del viaje"""
        price = base_fare + (distance_km * price_per_km)
        return round(price, 2)
