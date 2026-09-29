import { useState } from 'react';
import {
  LayoutDashboard,
  Package,
  Users,
  ShoppingCart,
  CreditCard,
  Wallet,
  Menu,
  X,
  Store,
  LogOut,
  BookOpen,
  Megaphone,
  Truck,
} from 'lucide-react';
import { getSupabase } from '@/lib/supabase';

export type PageId =
  | 'dashboard'
  | 'productos'
  | 'catalogo'
  | 'clientes'
  | 'ventas'
  | 'creditos'
  | 'caja'
  | 'compras'
  | 'marketing';

interface NavItem {
  id: PageId;
  label: string;
  icon: typeof LayoutDashboard;
}

const NAV_ITEMS: NavItem[] = [
  { id: 'dashboard', label: 'Panel Principal', icon: LayoutDashboard },
  { id: 'productos', label: 'Productos', icon: Package },
  { id: 'catalogo', label: 'Catálogo', icon: BookOpen },
  { id: 'clientes', label: 'Clientes', icon: Users },
  { id: 'ventas', label: 'Ventas', icon: ShoppingCart },
  { id: 'creditos', label: 'Créditos', icon: CreditCard },
  { id: 'caja', label: 'Caja', icon: Wallet },
  { id: 'compras', label: 'Compras', icon: Truck },
  { id: 'marketing', label: 'Marketing', icon: Megaphone },
];

interface SidebarProps {
  current: PageId;
  onNavigate: (page: PageId) => void;
}

export default function Sidebar({ current, onNavigate }: SidebarProps) {
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleNavigate = (page: PageId) => {
    onNavigate(page);
    setMobileOpen(false);
  };

  return (
    <>
      {/* Mobile toggle button */}
      <button
        onClick={() => setMobileOpen(true)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 rounded-lg bg-slate-800 text-white shadow-lg"
        aria-label="Abrir menú"
      >
        <Menu className="w-6 h-6" />
      </button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/50 z-40"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed lg:sticky top-0 left-0 z-50 lg:z-10
          h-screen w-64 flex-shrink-0
          bg-slate-900 border-r border-slate-800
          flex flex-col
          transform transition-transform duration-300
          ${mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}
      >
        {/* Logo header */}
        <div className="flex items-center justify-between px-5 py-5 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/15 ring-1 ring-emerald-500/30 flex items-center justify-center">
              <Store className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <h1 className="text-sm font-bold text-white leading-tight">
                MJ &amp; Elegance
              </h1>
              <p className="text-xs text-slate-500">Inventario y Ventas</p>
            </div>
          </div>
          <button
            onClick={() => setMobileOpen(false)}
            className="lg:hidden text-slate-400 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const active = current === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleNavigate(item.id)}
                className={`
                  w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition
                  ${
                    active
                      ? 'bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-500/30'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                  }
                `}
              >
                <Icon className="w-5 h-5 flex-shrink-0" />
                {item.label}
              </button>
            );
          })}
        </nav>

        {/* Footer with logout */}
        <div className="px-3 py-4 border-t border-slate-800 space-y-2">
          <button
            onClick={async () => {
              const supabase = getSupabase();
              await supabase.auth.signOut();
            }}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition"
          >
            <LogOut className="w-5 h-5 flex-shrink-0" />
            Cerrar sesión
          </button>
          <p className="text-xs text-slate-600 px-4">
            Sistema de gestión empresarial
          </p>
        </div>
      </aside>
    </>
  );
}
