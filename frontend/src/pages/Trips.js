import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import api from '@/lib/api';
import { toast } from 'sonner';
import { RefreshCw } from 'lucide-react';

const statusConfig = {
  pending: { label: 'Pendiente', className: 'bg-amber-100 text-amber-700' },
  confirmed: { label: 'Confirmado', className: 'bg-blue-100 text-blue-700' },
  assigned: { label: 'Asignado', className: 'bg-indigo-100 text-indigo-700' },
  in_progress: { label: 'En Progreso', className: 'bg-purple-100 text-purple-700' },
  completed: { label: 'Completado', className: 'bg-emerald-100 text-emerald-700' },
  cancelled: { label: 'Cancelado', className: 'bg-red-100 text-red-700' },
};

const Trips = () => {
  const [trips, setTrips] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedTrip, setSelectedTrip] = useState(null);
  const [selectedDriver, setSelectedDriver] = useState('');
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);

  const fetchData = async () => {
    try {
      const [tripsRes, driversRes] = await Promise.all([
        api.get('/trips'),
        api.get('/drivers'),
      ]);
      setTrips(tripsRes.data);
      setDrivers(driversRes.data.filter(d => d.status === 'available'));
    } catch (error) {
      toast.error('Error al cargar datos');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleAssignDriver = async () => {
    if (!selectedTrip || !selectedDriver) return;

    try {
      await api.patch(`/trips/${selectedTrip.id}/assign?driver_id=${selectedDriver}`);
      toast.success('Chofer asignado correctamente');
      setAssignDialogOpen(false);
      setSelectedTrip(null);
      setSelectedDriver('');
      fetchData();
    } catch (error) {
      toast.error('Error al asignar chofer', {
        description: error.response?.data?.detail,
      });
    }
  };

  const openAssignDialog = (trip) => {
    setSelectedTrip(trip);
    setAssignDialogOpen(true);
  };

  if (loading) {
    return <div className="text-center py-12" data-testid="trips-loading">Cargando...</div>;
  }

  return (
    <div className="space-y-4" data-testid="trips-page">
      <div className="flex items-center justify-between">
        <h1 className="text-4xl font-bold tracking-tight" data-testid="trips-title">Viajes</h1>
        <Button
          onClick={fetchData}
          variant="outline"
          size="sm"
          className="gap-2"
          data-testid="refresh-trips-button"
        >
          <RefreshCw size={16} />
          Actualizar
        </Button>
      </div>

      <Card className="border-slate-200 shadow-sm" data-testid="trips-table-card">
        <CardHeader className="px-4 py-3 border-b border-slate-200 bg-slate-50/50">
          <CardTitle className="text-xl font-semibold">Lista de Viajes</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50">
                  <TableHead className="text-xs uppercase font-semibold">ID</TableHead>
                  <TableHead className="text-xs uppercase font-semibold">Origen</TableHead>
                  <TableHead className="text-xs uppercase font-semibold">Destino</TableHead>
                  <TableHead className="text-xs uppercase font-semibold">Distancia</TableHead>
                  <TableHead className="text-xs uppercase font-semibold">Precio</TableHead>
                  <TableHead className="text-xs uppercase font-semibold">Estado</TableHead>
                  <TableHead className="text-xs uppercase font-semibold">Acción</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {trips.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-slate-500">
                      No hay viajes registrados
                    </TableCell>
                  </TableRow>
                ) : (
                  trips.map((trip) => (
                    <TableRow key={trip.id} className="hover:bg-slate-50/50" data-testid={`trip-row-${trip.id}`}>
                      <TableCell className="font-mono text-xs">{trip.id.slice(0, 8)}</TableCell>
                      <TableCell className="text-sm max-w-xs truncate">{trip.origin_address}</TableCell>
                      <TableCell className="text-sm max-w-xs truncate">{trip.destination_address}</TableCell>
                      <TableCell className="text-sm">{trip.distance_km} km</TableCell>
                      <TableCell className="text-sm font-semibold">
                        ${trip.price.toLocaleString('es-AR')}
                      </TableCell>
                      <TableCell>
                        <Badge className={statusConfig[trip.status]?.className} data-testid={`trip-status-${trip.id}`}>
                          {statusConfig[trip.status]?.label}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {trip.status === 'confirmed' && (
                          <Button
                            onClick={() => openAssignDialog(trip)}
                            size="sm"
                            variant="outline"
                            data-testid={`assign-driver-button-${trip.id}`}
                          >
                            Asignar Chofer
                          </Button>
                        )}
                        {trip.status === 'assigned' && (
                          <span className="text-xs text-slate-500">Asignado</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={assignDialogOpen} onOpenChange={setAssignDialogOpen}>
        <DialogContent data-testid="assign-driver-dialog">
          <DialogHeader>
            <DialogTitle>Asignar Chofer</DialogTitle>
            <DialogDescription>
              Selecciona un chofer disponible para asignar al viaje
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 mt-4">
            <div>
              <p className="text-sm font-semibold mb-2">Viaje:</p>
              <p className="text-xs text-slate-600">
                {selectedTrip?.origin_address} → {selectedTrip?.destination_address}
              </p>
            </div>

            <div>
              <label className="text-sm font-semibold mb-2 block">Chofer:</label>
              <Select value={selectedDriver} onValueChange={setSelectedDriver}>
                <SelectTrigger data-testid="driver-select">
                  <SelectValue placeholder="Seleccionar chofer" />
                </SelectTrigger>
                <SelectContent>
                  {drivers.map((driver) => (
                    <SelectItem key={driver.id} value={driver.id} data-testid={`driver-option-${driver.id}`}>
                      {driver.name} - {driver.vehicle} ({driver.license_plate})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex gap-2 mt-6">
              <Button
                onClick={handleAssignDriver}
                disabled={!selectedDriver}
                className="flex-1"
                data-testid="confirm-assign-button"
              >
                Confirmar Asignación
              </Button>
              <Button
                onClick={() => setAssignDialogOpen(false)}
                variant="outline"
                className="flex-1"
                data-testid="cancel-assign-button"
              >
                Cancelar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Trips;
