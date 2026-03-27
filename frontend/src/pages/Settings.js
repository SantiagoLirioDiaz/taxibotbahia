import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import api from '@/lib/api';
import { toast } from 'sonner';
import { Save } from 'lucide-react';

const Settings = () => {
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const fetchSettings = async () => {
    try {
      const response = await api.get('/settings');
      setSettings(response.data);
    } catch (error) {
      toast.error('Error al cargar configuración');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);

    try {
      await api.patch('/settings', settings);
      toast.success('Configuración guardada correctamente');
    } catch (error) {
      toast.error('Error al guardar configuración');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="text-center py-12" data-testid="settings-loading">Cargando...</div>;
  }

  return (
    <div className="space-y-4" data-testid="settings-page">
      <div className="flex items-center justify-between">
        <h1 className="text-4xl font-bold tracking-tight" data-testid="settings-title">Configuración</h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="border-slate-200 shadow-sm" data-testid="pricing-settings-card">
          <CardHeader className="px-4 py-3 border-b border-slate-200 bg-slate-50/50">
            <CardTitle className="text-xl font-semibold">Tarifas</CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <form onSubmit={handleSave} className="space-y-6">
              <div>
                <Label htmlFor="base_fare">Tarifa Base (ARS)</Label>
                <Input
                  id="base_fare"
                  type="number"
                  step="0.01"
                  value={settings?.base_fare || 0}
                  onChange={(e) =>
                    setSettings({ ...settings, base_fare: parseFloat(e.target.value) })
                  }
                  required
                  data-testid="base-fare-input"
                />
                <p className="text-xs text-slate-500 mt-1">
                  Costo fijo por cada viaje
                </p>
              </div>

              <div>
                <Label htmlFor="price_per_km">Precio por Kilómetro (ARS)</Label>
                <Input
                  id="price_per_km"
                  type="number"
                  step="0.01"
                  value={settings?.price_per_km || 0}
                  onChange={(e) =>
                    setSettings({ ...settings, price_per_km: parseFloat(e.target.value) })
                  }
                  required
                  data-testid="price-per-km-input"
                />
                <p className="text-xs text-slate-500 mt-1">
                  Costo adicional por cada kilómetro recorrido
                </p>
              </div>

              <div className="pt-4">
                <p className="text-sm font-semibold mb-2">Fórmula de cálculo:</p>
                <code className="text-xs bg-slate-100 px-3 py-2 rounded block">
                  Precio = ${settings?.base_fare || 0} + (distancia_km × ${settings?.price_per_km || 0})
                </code>
              </div>

              <Button
                type="submit"
                disabled={saving}
                className="w-full gap-2"
                data-testid="save-pricing-button"
              >
                <Save size={16} />
                {saving ? 'Guardando...' : 'Guardar Tarifas'}
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-sm" data-testid="service-settings-card">
          <CardHeader className="px-4 py-3 border-b border-slate-200 bg-slate-50/50">
            <CardTitle className="text-xl font-semibold">Estado del Servicio</CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="service_enabled" className="text-base">
                  Servicio Activo
                </Label>
                <p className="text-xs text-slate-500 mt-1">
                  Permite solicitudes de viajes desde el bot
                </p>
              </div>
              <Switch
                id="service_enabled"
                checked={settings?.service_enabled || false}
                onCheckedChange={(checked) =>
                  setSettings({ ...settings, service_enabled: checked })
                }
                data-testid="service-enabled-switch"
              />
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="auto_dispatch" className="text-base">
                  Asignación Automática
                </Label>
                <p className="text-xs text-slate-500 mt-1">
                  Asignar chofer más cercano automáticamente
                </p>
              </div>
              <Switch
                id="auto_dispatch"
                checked={settings?.auto_dispatch_enabled || false}
                onCheckedChange={(checked) =>
                  setSettings({ ...settings, auto_dispatch_enabled: checked })
                }
                data-testid="auto-dispatch-switch"
              />
            </div>

            <div className="pt-4">
              <Button
                onClick={handleSave}
                disabled={saving}
                className="w-full gap-2"
                data-testid="save-service-button"
              >
                <Save size={16} />
                {saving ? 'Guardando...' : 'Guardar Configuración'}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Settings;
