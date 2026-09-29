import { useEffect, useState } from 'react';
import { getSupabase } from '@/lib/supabase';
import LoginPage from '@/pages/LoginPage';
import Sidebar, { type PageId } from '@/components/Sidebar';
import DashboardPage from '@/pages/DashboardPage';
import ProductosPage from '@/pages/ProductosPage';
import ClientesPage from '@/pages/ClientesPage';
import VentasPage from '@/pages/VentasPage';
import CreditosPage from '@/pages/CreditosPage';
import CajaPage from '@/pages/CajaPage';
import ComprasPage from '@/pages/ComprasPage';
import CatalogoPage from '@/pages/CatalogoPage';
import MarketingPage from '@/pages/MarketingPage';

export default function App() {
  const [authReady, setAuthReady] = useState(false);
  const [authenticated, setAuthenticated] = useState(false);
  const [page, setPage] = useState<PageId>('dashboard');

  useEffect(() => {
    const supabase = getSupabase();

    supabase.auth.getSession().then(({ data }) => {
      setAuthenticated(!!data.session);
      setAuthReady(true);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setAuthenticated(!!session);
      setAuthReady(true);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (!authReady) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!authenticated) {
    return <LoginPage onSuccess={() => setAuthenticated(true)} />;
  }

  const renderPage = () => {
    switch (page) {
      case 'dashboard':
        return <DashboardPage />;
      case 'productos':
        return <ProductosPage />;
      case 'clientes':
        return <ClientesPage />;
      case 'ventas':
        return <VentasPage />;
      case 'creditos':
        return <CreditosPage />;
      case 'caja':
        return <CajaPage />;
      case 'compras':
        return <ComprasPage />;
      case 'catalogo':
        return <CatalogoPage />;
      case 'marketing':
        return <MarketingPage />;
      default:
        return <DashboardPage />;
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex">
      <Sidebar current={page} onNavigate={setPage} />
      <main className="flex-1 min-w-0 p-4 sm:p-6 lg:p-8 overflow-x-hidden">
        <div className="max-w-7xl mx-auto">{renderPage()}</div>
      </main>
    </div>
  );
}
