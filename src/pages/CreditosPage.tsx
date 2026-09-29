import { useEffect, useState, useCallback } from 'react';
import {
  CreditCard,
  Plus,
  Loader2,
  X,
  CheckCircle2,
  Wallet,
  Eye,
  Ban,
} from 'lucide-react';
import { getSupabase } from '@/lib/supabase';
import { formatCurrency, formatDate } from '@/lib/format';
import type { Venta, Cliente, Abono, DetalleVenta } from '@/types';

interface CreditoVenta extends Venta {
  cliente: Cliente | null;
  abonos: Abono[];
}

export default function CreditosPage() {
  const [creditos, setCreditos] = useState<CreditoVenta[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showAbonoForm, setShowAbonoForm] = useState<CreditoVenta | null>(null);
  const [abonoMonto, setAbonoMonto] = useState(0);
  const [saving, setSaving] = useState(false);
  const [showDetail, setShowDetail] = useState<CreditoVenta | null>(null);
  const [detalles, setDetalles] = useState<DetalleVenta[]>([]);
  const [loadingDetalles, setLoadingDetalles] = useState(false);

  const loadCreditos = useCallback(async () => {
    const supabase = getSupabase();
    if (!supabase) return;
    setLoading(true);

    const { data: ventasData, error: ventasError } = await supabase
      .from('ventas')
      .select('*, cliente:clientes(*)')
      .eq('tipo_pago', 'credito')
      .eq('estado', 'pendiente')
      .order('creado_en', { ascending: false });

    if (ventasError) {
      setError(ventasError.message);
      setLoading(false);
      return;
    }

    const ventas = ventasData ?? [];
    if (ventas.length === 0) {
      setCreditos([]);
      setLoading(false);
      return;
    }

    const ventaIds = ventas.map((v) => v.id);
    const { data: abonosData } = await supabase
      .from('abonos')
      .select('*')
      .in('venta_id', ventaIds)
      .order('fecha', { ascending: false });

    const abonosByVenta: Record<string, Abono[]> = {};
    (abonosData ?? []).forEach((a: Abono) => {
      if (!abonosByVenta[a.venta_id]) abonosByVenta[a.venta_id] = [];
      abonosByVenta[a.venta_id].push(a);
    });

    const enriched: CreditoVenta[] = ventas.map((v) => ({
      ...(v as Venta),
      cliente: (v as { cliente?: Cliente | null }).cliente ?? null,
      abonos: abonosByVenta[(v as Venta).id] ?? [],
    }));

    setCreditos(enriched);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadCreditos();
  }, [loadCreditos]);

  const saldoPendiente = (v: CreditoVenta) => {
    const totalAbonado = v.abonos.reduce((sum, a) => sum + a.monto, 0);
    return v.total - totalAbonado;
  };

  const openAbonoForm = (v: CreditoVenta) => {
    setShowAbonoForm(v);
    setAbonoMonto(saldoPendiente(v));
  };

  const handleAbono = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!showAbonoForm) return;
    const supabase = getSupabase();
    if (!supabase) return;
    if (abonoMonto <= 0) {
      setError('El monto del abono debe ser mayor a 0');
      return;
    }

    setSaving(true);
    setError('');

    const { error: rpcError } = await supabase.rpc('registrar_abono', {
      p_venta_id: showAbonoForm.id,
      p_monto: abonoMonto,
    });

    if (rpcError) {
      setError(rpcError.message);
      setSaving(false);
      return;
    }

    setSaving(false);
    setShowAbonoForm(null);
    loadCreditos();
  };

  const viewDetail = async (v: CreditoVenta) => {
    setShowDetail(v);
    setLoadingDetalles(true);
    const supabase = getSupabase();
    const { data } = await supabase
      .from('detalles_venta')
      .select('*, producto:productos(*)')
      .eq('venta_id', v.id);
    setDetalles((data ?? []) as DetalleVenta[]);
    setLoadingDetalles(false);
  };

  const handleAnular = async (id: string) => {
    if (!confirm('¿Anular esta venta de crédito? El estado cambiará a cancelada.')) return;
    const supabase = getSupabase();
    if (!supabase) return;
    const { error: rpcError } = await supabase.rpc('anular_venta', {
      p_venta_id: id,
    });
    if (rpcError) {
      setError(rpcError.message);
    } else {
      setShowDetail(null);
      loadCreditos();
    }
  };

  const totalPendiente = creditos.reduce(
    (sum, v) => sum + saldoPendiente(v),
    0
  );

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-white mb-1">Créditos</h2>
        <p className="text-slate-400 text-sm">
          Ventas a crédito pendientes de pago
        </p>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-sm flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => setError('')} className="text-red-400">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-orange-500/10 ring-1 ring-orange-500/30 flex items-center justify-center">
              <CreditCard className="w-5 h-5 text-orange-400" />
            </div>
            <div>
              <p className="text-xs text-slate-400">Créditos pendientes</p>
              <p className="text-xl font-bold text-white">
                {creditos.length}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 ring-1 ring-amber-500/30 flex items-center justify-center">
              <Wallet className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <p className="text-xs text-slate-400">Saldo total por cobrar</p>
              <p className="text-xl font-bold text-white">
                {formatCurrency(totalPendiente)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-emerald-400" />
        </div>
      ) : creditos.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <CheckCircle2 className="w-12 h-12 text-emerald-600 mb-3" />
          <p className="text-slate-400 text-sm">
            No hay créditos pendientes. Todo está al día.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {creditos.map((v) => {
            const abonado = v.total - saldoPendiente(v);
            const porcentaje =
              v.total > 0 ? (abonado / v.total) * 100 : 0;
            return (
              <div
                key={v.id}
                className="bg-slate-800/50 border border-slate-700 rounded-2xl p-5"
              >
                <div className="flex items-start justify-between flex-wrap gap-3 mb-4">
                  <div>
                    <h4 className="text-sm font-semibold text-white">
                      {v.cliente?.nombre ?? 'Venta general'}
                    </h4>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {formatDate(v.fecha)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-slate-400">Saldo pendiente</p>
                    <p className="text-lg font-bold text-amber-400">
                      {formatCurrency(saldoPendiente(v))}
                    </p>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="mb-4">
                  <div className="flex justify-between text-xs text-slate-400 mb-1.5">
                    <span>Abonado: {formatCurrency(abonado)}</span>
                    <span>Total: {formatCurrency(v.total)}</span>
                  </div>
                  <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-emerald-500 rounded-full transition-all"
                      style={{ width: `${porcentaje}%` }}
                    />
                  </div>
                </div>

                {/* Abonos history */}
                {v.abonos.length > 0 && (
                  <div className="mb-4 space-y-1">
                    <p className="text-xs text-slate-500 mb-2">
                      Historial de abonos:
                    </p>
                    {v.abonos.map((a) => (
                      <div
                        key={a.id}
                        className="flex items-center justify-between text-xs py-1.5 px-3 rounded-md bg-slate-900/40"
                      >
                        <span className="text-slate-400">
                          {formatDate(a.fecha)}
                        </span>
                        <span className="text-emerald-400 font-medium">
                          {formatCurrency(a.monto)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    onClick={() => openAbonoForm(v)}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-500/15 text-emerald-300 font-medium text-sm hover:bg-emerald-500/25 transition ring-1 ring-emerald-500/30"
                  >
                    <Plus className="w-4 h-4" />
                    Registrar Abono
                  </button>
                  <button
                    onClick={() => viewDetail(v)}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-700/50 text-slate-300 font-medium text-sm hover:bg-slate-700 transition"
                  >
                    <Eye className="w-4 h-4" />
                    Ver detalles
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Abono modal */}
      {showAbonoForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60">
          <div className="w-full max-w-md bg-slate-800 border border-slate-700 rounded-2xl shadow-2xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700">
              <h3 className="text-lg font-semibold text-white">
                Registrar Abono
              </h3>
              <button
                onClick={() => setShowAbonoForm(null)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleAbono} className="px-6 py-5 space-y-4">
              <div className="bg-slate-900/40 rounded-xl p-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">Cliente</span>
                  <span className="text-white font-medium">
                    {showAbonoForm.cliente?.nombre ?? '—'}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">Total venta</span>
                  <span className="text-white font-medium">
                    {formatCurrency(showAbonoForm.total)}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">Saldo pendiente</span>
                  <span className="text-amber-400 font-bold">
                    {formatCurrency(saldoPendiente(showAbonoForm))}
                  </span>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">
                  Monto del abono
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  max={saldoPendiente(showAbonoForm)}
                  required
                  value={abonoMonto}
                  onChange={(e) =>
                    setAbonoMonto(parseFloat(e.target.value) || 0)
                  }
                  className="w-full px-3 py-2.5 rounded-lg bg-slate-900/60 border border-slate-700 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50 text-sm"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAbonoForm(null)}
                  className="flex-1 px-4 py-2.5 rounded-lg bg-slate-700 text-slate-300 font-medium text-sm hover:bg-slate-600 transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 px-4 py-2.5 rounded-lg bg-emerald-500 text-white font-semibold text-sm hover:bg-emerald-400 disabled:opacity-60 transition"
                >
                  {saving ? 'Guardando...' : 'Registrar Abono'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Detail modal */}
      {showDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60">
          <div className="w-full max-w-lg bg-slate-800 border border-slate-700 rounded-2xl shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700">
              <h3 className="text-lg font-semibold text-white">
                Detalle de Crédito
              </h3>
              <button
                onClick={() => setShowDetail(null)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="px-6 py-5 space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-slate-500 text-xs">Cliente</p>
                  <p className="text-white font-medium">
                    {showDetail.cliente?.nombre ?? 'Venta general'}
                  </p>
                </div>
                <div>
                  <p className="text-slate-500 text-xs">Fecha</p>
                  <p className="text-white font-medium">
                    {formatDate(showDetail.fecha)}
                  </p>
                </div>
                <div>
                  <p className="text-slate-500 text-xs">Total</p>
                  <p className="text-white font-medium">
                    {formatCurrency(showDetail.total)}
                  </p>
                </div>
                <div>
                  <p className="text-slate-500 text-xs">Saldo pendente</p>
                  <p className="text-amber-400 font-bold">
                    {formatCurrency(saldoPendiente(showDetail))}
                  </p>
                </div>
              </div>

              {loadingDetalles ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-emerald-400" />
                </div>
              ) : (
                <div className="border border-slate-700 rounded-xl overflow-hidden">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-700 text-slate-400">
                        <th className="text-left px-3 py-2 font-medium">Producto</th>
                        <th className="text-right px-3 py-2 font-medium">Cant.</th>
                        <th className="text-right px-3 py-2 font-medium">Precio</th>
                        <th className="text-right px-3 py-2 font-medium">Subtotal</th>
                      </tr>
                    </thead>
                    <tbody>
                      {detalles.map((d) => (
                        <tr key={d.id} className="border-b border-slate-800">
                          <td className="px-3 py-2 text-white">
                            {d.producto?.nombre ?? '—'}
                          </td>
                          <td className="px-3 py-2 text-right text-slate-300">
                            {d.cantidad}
                          </td>
                          <td className="px-3 py-2 text-right text-slate-400">
                            {formatCurrency(d.precio_unitario)}
                          </td>
                          <td className="px-3 py-2 text-right text-emerald-400 font-semibold">
                            {formatCurrency(d.subtotal)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              <button
                onClick={() => handleAnular(showDetail.id)}
                className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-red-500/15 text-red-400 font-medium text-sm hover:bg-red-500/25 transition ring-1 ring-red-500/30"
              >
                <Ban className="w-4 h-4" />
                Anular venta
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
