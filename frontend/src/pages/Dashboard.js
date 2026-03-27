import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import { MapPin, DollarSign, TrendingUp, Users, Car } from 'lucide-react';
import api from '@/lib/api';
import { toast } from 'sonner';
import L from 'leaflet';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

const Dashboard = () => {
  const [stats, setStats] = useState(null);
  const [drivers, setDrivers] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    try {
      const [statsRes, driversRes] = await Promise.all([
        api.get('/stats'),
        api.get('/drivers'),
      ]);
      setStats(statsRes.data);
      setDrivers(driversRes.data.filter(d => d.location));
    } catch (error) {
      toast.error('Error al cargar datos');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return <div className="text-center py-12" data-testid="dashboard-loading">Cargando...</div>;
  }

  const statCards = [
    {
      title: 'Viajes Hoy',
      value: stats?.trips_today || 0,
      icon: MapPin,
      color: 'text-blue-600',
      bg: 'bg-blue-50',
    },
    {
      title: 'En Progreso',
      value: stats?.trips_in_progress || 0,
      icon: TrendingUp,
      color: 'text-purple-600',
      bg: 'bg-purple-50',
    },
    {
      title: 'Ingresos Hoy',
      value: `$${(stats?.total_revenue_today || 0).toLocaleString('es-AR')}`,
      icon: DollarSign,
      color: 'text-emerald-600',
      bg: 'bg-emerald-50',
    },
    {
      title: 'Choferes Disponibles',
      value: stats?.drivers_available || 0,
      icon: Car,
      color: 'text-amber-600',
      bg: 'bg-amber-50',
    },
  ];

  return (
    <div className="space-y-4" data-testid="dashboard-page">
      <div className="flex items-center justify-between">
        <h1 className="text-4xl font-bold tracking-tight" data-testid="dashboard-title">Dashboard</h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {statCards.map((card, idx) => (
          <Card key={idx} className="border-slate-200 shadow-sm" data-testid={`stat-card-${idx}`}>
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs uppercase tracking-wider font-semibold text-slate-500 mb-2">
                    {card.title}
                  </p>
                  <p className="text-2xl font-bold text-slate-900">{card.value}</p>
                </div>
                <div className={`${card.bg} p-2 rounded-lg`}>
                  <card.icon className={`${card.color} h-5 w-5`} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="border-slate-200 shadow-sm" data-testid="map-card">
        <CardHeader className="px-4 py-3 border-b border-slate-200 bg-slate-50/50">
          <CardTitle className="text-xl font-semibold">Mapa en Tiempo Real</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="h-[500px] w-full">
            <MapContainer
              center={[-38.7183, -62.2663]}
              zoom={13}
              style={{ height: '100%', width: '100%' }}
              data-testid="map-container"
            >
              <TileLayer
                url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              />
              {drivers.map((driver) => (
                <Marker
                  key={driver.id}
                  position={[driver.location.lat, driver.location.lng]}
                >
                  <Popup>
                    <div className="text-sm">
                      <p className="font-semibold">{driver.name}</p>
                      <p className="text-xs text-slate-600">{driver.vehicle}</p>
                      <p className="text-xs">
                        <span
                          className={`inline-block w-2 h-2 rounded-full mr-1 ${
                            driver.status === 'available'
                              ? 'bg-emerald-500'
                              : driver.status === 'busy'
                              ? 'bg-orange-500'
                              : 'bg-slate-400'
                          }`}
                        ></span>
                        {driver.status === 'available'
                          ? 'Disponible'
                          : driver.status === 'busy'
                          ? 'Ocupado'
                          : 'Fuera de línea'}
                      </p>
                    </div>
                  </Popup>
                </Marker>
              ))}
            </MapContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Dashboard;
