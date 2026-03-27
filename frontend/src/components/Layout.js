import { Outlet, NavLink } from 'react-router-dom';
import { LayoutDashboard, Car, MapPin, Settings, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

const Layout = () => {
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem('token');
    navigate('/login');
  };

  const navItems = [
    { path: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { path: '/trips', icon: MapPin, label: 'Viajes' },
    { path: '/drivers', icon: Car, label: 'Choferes' },
    { path: '/settings', icon: Settings, label: 'Configuración' },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-12 gap-4 p-4 md:p-6 bg-slate-50/50 min-h-screen">
      <aside className="hidden md:block md:col-span-2 lg:col-span-2">
        <div className="sticky top-6 bg-white border border-slate-200 rounded-xl shadow-sm p-4">
          <div className="mb-8">
            <h1 className="text-xl font-bold text-slate-900" data-testid="app-title">TaxiBotBahia</h1>
            <p className="text-xs text-slate-500 mt-1">Admin Dashboard</p>
          </div>

          <nav className="space-y-2">
            {navItems.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                data-testid={`nav-${item.label.toLowerCase()}`}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-slate-900 text-white'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`
                }
              >
                <item.icon size={18} />
                {item.label}
              </NavLink>
            ))}
          </nav>

          <div className="mt-8 pt-8 border-t border-slate-200">
            <Button
              onClick={handleLogout}
              variant="ghost"
              className="w-full justify-start text-red-600 hover:text-red-700 hover:bg-red-50"
              data-testid="logout-button"
            >
              <LogOut size={18} className="mr-3" />
              Cerrar Sesión
            </Button>
          </div>
        </div>
      </aside>

      <main className="col-span-1 md:col-span-10 lg:col-span-10">
        <Outlet />
      </main>
    </div>
  );
};

export default Layout;
