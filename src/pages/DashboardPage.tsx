import { useEffect, useState } from 'react';
import {
  Package,
  Users,
  ShoppingCart,
  CreditCard,
  Wallet,
  TrendingUp,
  AlertTriangle,
  Loader2,
  TrendingDown,
} from 'lucide-react';
import { getSupabase } from '@/lib/supabase';
import { formatCurrency, formatDateShort } from '@/lib/format';
import type { Producto } from '@/types';

interface VentaReciente {
  id: string;
  total: number;
  fecha: string;
  estado: string;
  tipo_pago: string;
  cliente?: { nombre: string } | null;
  detalles_venta?: Array<{ cantidad: number; costo_unitario?: number; producto?: { nombre: string } | null }>;
}

interface DashboardStats {
  totalProductos: number;
  totalClientes: number;
  ventasHoy: number;
  ventasHoyMonto: number;
  creditosPendientes: number;
  creditosPendientesMonto: number;
  cajaBalance: number;
  gananciaReal: number;
  stockBajo: Producto[];
  ventasRecientes: VentaReciente[];
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    const supabase = getSupabase();
    if (!supabase) {
      setError('No hay conexión a la base de datos');
      setLoading(false);
      return;
    }

    try {
      const today = new Date();
      const startOfDay = new Date(
        today.getFullYear(),
        today.getMonth(),
        today.getDate()
      ).toISOString();
      const endOfDay = new Date(
        today.getFullYear(),
        today.getMonth(),
        today.getDate() + 1
      ).toISOString();

      const [
        productosRes,
        clientesRes,
        ventasHoyRes,
        creditosRes,
        cajaRes,
        productosStockRes,
        ventasRecientesRes,
        ventasPagadasRes,
      ] = await Promise.all([
        supabase.from('productos').select('id', { count: 'exact', head: true }),
        supabase.from('clientes').select('id', { count: 'exact', head: true }),
        supabase
          .from('ventas')
          .select('total')
          .neq('estado', 'cancelada')
          .gte('fecha', startOfDay)
          .lt('fecha', endOfDay),
        supabase
          .from('ventas')
          .select('total')
          .eq('estado', 'pendiente')
          .eq('tipo_pago', 'credito'),
        supabase.from('caja_negocio').select('monto, tipo'),
        supabase
          .from('productos')
          .select('*')
          .lt('stock', 10)
          .order('stock', { ascending: true })
          .limit(5),
        supabase
          .from('ventas')
          .select('id, total, fecha, estado, tipo_pago, cliente:clientes(nombre), detalles_venta:detalles_venta(cantidad, costo_unitario, producto:productos(nombre))')
          .neq('estado', 'cancelada')
          .order('creado_en', { ascending: false })
          .limit(5),
        supabase
          .from('ventas')
          .select('total, estado, detalles_venta:detalles_venta(cantidad, costo_unitario)')
          .neq('estado', 'cancelada'),
      ]);

      const ventasHoyMonto = (ventasHoyRes.data ?? []).reduce(
        (sum, v) => sum + (v.total ?? 0),
        0
      );
      const creditosPendientesMonto = (creditosRes.data ?? []).reduce(
        (sum, v) => sum + (v.total ?? 0),
        0
      );
      const cajaBalance = (cajaRes.data ?? []).reduce((sum, c) => {
        const monto = c.monto ?? 0;
        return sum + (c.tipo === 'ingreso' ? monto : -monto);
      }, 0);

      const ventasPagadasData = (ventasPagadasRes.data ?? []) as Array<{
        total: number;
        estado: string;
        detalles_venta?: Array<{ cantidad: number; costo_unitario: number }>;
      }>;

      const gananciaReal = ventasPagadasData.reduce((sum, v) => {
        const costoVenta = (v.detalles_venta ?? []).reduce(
          (c, d) => c + (d.cantidad ?? 0) * (d.costo_unitario ?? 0),
          0
        );
        return sum + (v.total ?? 0) - costoVenta;
      }, 0);

      setStats({
        totalProductos: productosRes.count ?? 0,
        totalClientes: clientesRes.count ?? 0,
        ventasHoy: ventasHoyRes.data?.length ?? 0,
        ventasHoyMonto,
        creditosPendientes: creditosRes.data?.length ?? 0,
        creditosPendientesMonto,
        cajaBalance,
        gananciaReal,
        stockBajo: (productosStockRes.data ?? []) as Producto[],
        ventasRecientes: (ventasRecientesRes.data ?? []) as unknown as DashboardStats['ventasRecientes'],
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar datos');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-400" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-sm">
        {error}
      </div>
    );
  }

  const cards = [
    {
      label: 'Productos',
      value: stats?.totalProductos.toString() ?? '0',
      icon: Package,
      color: 'blue',
    },
    {
      label: 'Clientes',
      value: stats?.totalClientes.toString() ?? '0',
      icon: Users,
      color: 'emerald',
    },
    {
      label: 'Ventas de Hoy',
      value: formatCurrency(stats?.ventasHoyMonto ?? 0),
      sub: `${stats?.ventasHoy ?? 0} transacciones`,
      icon: ShoppingCart,
      color: 'amber',
    },
    {
      label: 'Créditos Pendientes',
      value: formatCurrency(stats?.creditosPendientesMonto ?? 0),
      sub: `${stats?.creditosPendientes ?? 0} ventas a crédito`,
      icon: CreditCard,
      color: 'orange',
    },
    {
      label: 'Balance de Caja',
      value: formatCurrency(stats?.cajaBalance ?? 0),
      icon: Wallet,
      color: 'teal',
    },
    {
      label: 'Ganancia Real (C$)',
      value: formatCurrency(stats?.gananciaReal ?? 0),
      sub: 'Ingresos - Costo de ventas',
      icon: TrendingDown,
      color: 'emerald',
    },
  ];

  const colorMap: Record<string, string> = {
    blue: 'bg-blue-500/10 text-blue-400 ring-blue-500/30',
    emerald: 'bg-emerald-500/10 text-emerald-400 ring-emerald-500/30',
    amber: 'bg-amber-500/10 text-amber-400 ring-amber-500/30',
    orange: 'bg-orange-500/10 text-orange-400 ring-orange-500/30',
    teal: 'bg-teal-500/10 text-teal-400 ring-teal-500/30',
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-white mb-1">Panel Principal</h2>
        <p className="text-slate-400 text-sm">
          Resumen general del estado del negocio
        </p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <div
              key={card.label}
              className="bg-slate-800/50 border border-slate-700 rounded-2xl p-5 hover:border-slate-600 transition"
            >
              <div
                className={`inline-flex items-center justify-center w-10 h-10 rounded-xl ring-1 mb-3 ${
                  colorMap[card.color]
                }`}
              >
                <Icon className="w-5 h-5" />
              </div>
              <p className="text-xs text-slate-400 mb-1">{card.label}</p>
              <p className="text-xl font-bold text-white">{card.value}</p>
              {card.sub && (
                <p className="text-xs text-slate-500 mt-1">{card.sub}</p>
              )}
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Low stock alert */}
        <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle className="w-5 h-5 text-amber-400" />
            <h3 className="text-sm font-semibold text-white">
              Productos con bajo stock
            </h3>
          </div>
          {stats && stats.stockBajo.length > 0 ? (
            <div className="space-y-2">
              {stats.stockBajo.map((p) => (
                <div
                  key={p.id}
                  className="flex items-center justify-between py-2 px-3 rounded-lg bg-slate-900/40"
                >
                  <span className="text-sm text-slate-300">{p.nombre}</span>
                  <span
                    className={`text-sm font-semibold ${
                      p.stock === 0
                        ? 'text-red-400'
                        : 'text-amber-400'
                    }`}
                  >
                    {p.stock} unidades
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-slate-500 py-4 text-center">
              Todo el inventario tiene stock suficiente
            </p>
          )}
        </div>

        {/* Recent sales */}
        <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="w-5 h-5 text-emerald-400" />
            <h3 className="text-sm font-semibold text-white">
              Ventas recientes
            </h3>
          </div>
          {stats && stats.ventasRecientes.length > 0 ? (
            <div className="space-y-3">
              {stats.ventasRecientes.map((v) => {
                const productosText = (v.detalles_venta ?? [])
                  .map((d) => `${d.cantidad}x ${d.producto?.nombre ?? 'Producto'}`)
                  .join(', ');
                return (
                  <div
                    key={v.id}
                    className="flex items-start justify-between gap-3 py-3 px-4 rounded-lg bg-slate-900/40"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-medium text-white">
                          {v.cliente?.nombre ?? 'Venta general'}
                        </span>
                        <span
                          className={`text-[10px] font-semibold px-2 py-0.5 rounded-full whitespace-nowrap ${
                            v.tipo_pago === 'credito'
                              ? 'bg-orange-500/15 text-orange-400 ring-1 ring-orange-500/30'
                              : 'bg-emerald-500/15 text-emerald-400 ring-1 ring-emerald-500/30'
                          }`}
                        >
                          {v.tipo_pago === 'credito' ? 'Crédito' : 'Contado'}
                        </span>
                      </div>
                      {productosText && (
                        <p className="text-xs text-slate-500 truncate">
                          {productosText}
                        </p>
                      )}
                      <p className="text-xs text-slate-600 mt-0.5">
                        {formatDateShort(v.fecha)}
                      </p>
                    </div>
                    <span className="text-sm font-semibold text-emerald-400 whitespace-nowrap">
                      {formatCurrency(v.total)}
                    </span>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-slate-500 py-4 text-center">
              No hay ventas registradas todavía
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
