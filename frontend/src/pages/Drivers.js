import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
import { Plus, Pencil, Trash2, RefreshCw } from 'lucide-react';

const statusConfig = {
  available: { label: 'Disponible', className: 'bg-emerald-100 text-emerald-700' },
  busy: { label: 'Ocupado', className: 'bg-orange-100 text-orange-700' },
  offline: { label: 'Fuera de línea', className: 'bg-slate-100 text-slate-500' },
};

const Drivers = () => {
  const [drivers, setDrivers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingDriver, setEditingDriver] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    vehicle: '',
    license_plate: '',
    status: 'offline',
  });

  const fetchDrivers = async () => {
    try {
      const response = await api.get('/drivers');
      setDrivers(response.data);
    } catch (error) {
      toast.error('Error al cargar choferes');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDrivers();
  }, []);

  const handleOpenDialog = (driver = null) => {
    if (driver) {
      setEditingDriver(driver);
      setFormData({
        name: driver.name,
        phone: driver.phone,
        vehicle: driver.vehicle,
        license_plate: driver.license_plate,
        status: driver.status,
      });
    } else {
      setEditingDriver(null);
      setFormData({
        name: '',
        phone: '',
        vehicle: '',
        license_plate: '',
        status: 'offline',
      });
    }
    setDialogOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      if (editingDriver) {
        await api.patch(`/drivers/${editingDriver.id}`, formData);
        toast.success('Chofer actualizado correctamente');
      } else {
        await api.post('/drivers', formData);
        toast.success('Chofer creado correctamente');
      }
      setDialogOpen(false);
      fetchDrivers();
    } catch (error) {
      toast.error('Error al guardar chofer', {
        description: error.response?.data?.detail,
      });
    }
  };

  const handleDelete = async (driverId) => {
    if (!window.confirm('¿Estás seguro de eliminar este chofer?')) return;

    try {
      await api.delete(`/drivers/${driverId}`);
      toast.success('Chofer eliminado correctamente');
      fetchDrivers();
    } catch (error) {
      toast.error('Error al eliminar chofer');
    }
  };

  if (loading) {
    return <div className="text-center py-12" data-testid="drivers-loading">Cargando...</div>;
  }

  return (
    <div className="space-y-4" data-testid="drivers-page">
      <div className="flex items-center justify-between">
        <h1 className="text-4xl font-bold tracking-tight" data-testid="drivers-title">Choferes</h1>
        <div className="flex gap-2">
          <Button
            onClick={fetchDrivers}
            variant="outline"
            size="sm"
            className="gap-2"
            data-testid="refresh-drivers-button"
          >
            <RefreshCw size={16} />
            Actualizar
          </Button>
          <Button
            onClick={() => handleOpenDialog()}
            size="sm"
            className="gap-2"
            data-testid="add-driver-button"
          >
            <Plus size={16} />
            Agregar Chofer
          </Button>
        </div>
      </div>

      <Card className="border-slate-200 shadow-sm" data-testid="drivers-table-card">
        <CardHeader className="px-4 py-3 border-b border-slate-200 bg-slate-50/50">
          <CardTitle className="text-xl font-semibold">Lista de Choferes</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50">
                  <TableHead className="text-xs uppercase font-semibold">Nombre</TableHead>
                  <TableHead className="text-xs uppercase font-semibold">Teléfono</TableHead>
                  <TableHead className="text-xs uppercase font-semibold">Vehículo</TableHead>
                  <TableHead className="text-xs uppercase font-semibold">Patente</TableHead>
                  <TableHead className="text-xs uppercase font-semibold">Estado</TableHead>
                  <TableHead className="text-xs uppercase font-semibold">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {drivers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-slate-500">
                      No hay choferes registrados
                    </TableCell>
                  </TableRow>
                ) : (
                  drivers.map((driver) => (
                    <TableRow key={driver.id} className="hover:bg-slate-50/50" data-testid={`driver-row-${driver.id}`}>
                      <TableCell className="font-semibold">{driver.name}</TableCell>
                      <TableCell className="text-sm">{driver.phone}</TableCell>
                      <TableCell className="text-sm">{driver.vehicle}</TableCell>
                      <TableCell className="font-mono text-sm">{driver.license_plate}</TableCell>
                      <TableCell>
                        <Badge className={statusConfig[driver.status]?.className} data-testid={`driver-status-${driver.id}`}>
                          {statusConfig[driver.status]?.label}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            onClick={() => handleOpenDialog(driver)}
                            size="sm"
                            variant="ghost"
                            className="h-8 w-8 p-0"
                            data-testid={`edit-driver-button-${driver.id}`}
                          >
                            <Pencil size={14} />
                          </Button>
                          <Button
                            onClick={() => handleDelete(driver.id)}
                            size="sm"
                            variant="ghost"
                            className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                            data-testid={`delete-driver-button-${driver.id}`}
                          >
                            <Trash2 size={14} />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent data-testid="driver-form-dialog">
          <DialogHeader>
            <DialogTitle>{editingDriver ? 'Editar Chofer' : 'Agregar Chofer'}</DialogTitle>
            <DialogDescription>
              {editingDriver
                ? 'Modifica los datos del chofer'
                : 'Completa los datos para agregar un nuevo chofer'}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4 mt-4">
            <div>
              <Label htmlFor="name">Nombre</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
                data-testid="driver-name-input"
              />
            </div>

            <div>
              <Label htmlFor="phone">Teléfono</Label>
              <Input
                id="phone"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                required
                data-testid="driver-phone-input"
              />
            </div>

            <div>
              <Label htmlFor="vehicle">Vehículo</Label>
              <Input
                id="vehicle"
                value={formData.vehicle}
                onChange={(e) => setFormData({ ...formData, vehicle: e.target.value })}
                placeholder="Ej: Toyota Corolla 2020"
                required
                data-testid="driver-vehicle-input"
              />
            </div>

            <div>
              <Label htmlFor="license_plate">Patente</Label>
              <Input
                id="license_plate"
                value={formData.license_plate}
                onChange={(e) => setFormData({ ...formData, license_plate: e.target.value })}
                placeholder="Ej: ABC123"
                required
                data-testid="driver-license-input"
              />
            </div>

            <div>
              <Label htmlFor="status">Estado</Label>
              <Select value={formData.status} onValueChange={(value) => setFormData({ ...formData, status: value })}>
                <SelectTrigger data-testid="driver-status-select">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="available">Disponible</SelectItem>
                  <SelectItem value="busy">Ocupado</SelectItem>
                  <SelectItem value="offline">Fuera de línea</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex gap-2 mt-6">
              <Button type="submit" className="flex-1" data-testid="save-driver-button">
                {editingDriver ? 'Actualizar' : 'Crear'}
              </Button>
              <Button
                type="button"
                onClick={() => setDialogOpen(false)}
                variant="outline"
                className="flex-1"
                data-testid="cancel-driver-button"
              >
                Cancelar
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Drivers;
