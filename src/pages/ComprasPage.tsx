import { useEffect, useState, useCallback } from 'react';
import {
  Plus,
  Truck,
  PackageCheck,
  Trash2,
  Loader2,
  X,
  Package,
} from 'lucide-react';
import { getSupabase } from '@/lib/supabase';
import { formatCurrency, formatDate, localDateInputValue, localDateToISO } from '@/lib/format';
import type { CompraInventario, Producto } from '@/types';

export default function ComprasPage() {
  const [compras, setCompras] = useState<CompraInventario[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [productos, setProductos] = useState<Producto[]>([]);
  const [form, setForm] = useState({
    producto_id: '',
    cantidad: 1,
    costo_total: 0,
    gasto_agencia: 0,
    fecha: localDateInputValue(),
  });

  const loadCompras = useCallback(async () => {
    const supabase = getSupabase();
    if (!supabase) return;
    setLoading(true);
    const { data, error } = await supabase
      .from('compras_inventario')
      .select('*, producto:productos(*)')
      .order('creado_en', { ascending: false });
    if (error) {
      setError(error.message);
    } else {
      setCompras((data ?? []) as CompraInventario[]);
    }
    setLoading(false);
  }, []);

  const loadProductos = useCallback(async () => {
    const supabase = getSupabase();
    if (!supabase) return;
    const { data } = await supabase
      .from('productos')
      .select('*')
      .order('nombre', { ascending: true });
    setProductos((data ?? []) as Producto[]);
  }, []);

  useEffect(() => {
    loadCompras();
  }, [loadCompras]);

  const openForm = async () => {
    await loadProductos();
    setForm({
      producto_id: '',
      cantidad: 1,
      costo_total: 0,
      gasto_agencia: 0,
      fecha: localDateInputValue(),
    });
    setShowForm(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const supabase = getSupabase();
    if (!supabase) return;
    if (!form.producto_id) {
      setError('Selecciona un producto');
      return;
    }
    setSaving(true);
    setError('');

    const { error: rpcError } = await supabase.rpc('registrar_compra', {
      p_producto_id: form.producto_id,
      p_cantidad: form.cantidad,
      p_costo_total: form.costo_total,
      p_gasto_agencia: form.gasto_agencia,
      p_fecha: form.fecha ? localDateToISO(form.fecha) : null,
    });

    if (rpcError) {
      setError(rpcError.message);
      setSaving(false);
      return;
    }

    setSaving(false);
    setShowForm(false);
    loadCompras();
  };

  const handleRecibir = async (compra: CompraInventario) => {
    if (!confirm('¿Confirmar recepción de esta compra? El stock se actualizará.')) return;
    const supabase = getSupabase();
    if (!supabase) return;

    const { error: rpcError } = await supabase.rpc('recibir_compra', {
      p_compra_id: compra.id,
    });

    if (rpcError) {
      setError(rpcError.message);
      return;
    }

    loadCompras();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Eliminar esta compra? Esta acción no se puede deshacer.')) return;
    const supabase = getSupabase();
    if (!supabase) return;
    const { error: rpcError } = await supabase.rpc('eliminar_compra', {
      p_compra_id: id,
    });
    if (rpcError) {
      setError(rpcError.message);
      return;
    }
    loadCompras();
  };

  const estadoColor: Record<string, string> = {
    en_proceso: 'bg-amber-500/15 text-amber-400 ring-amber-500/30',
    recibido: 'bg-emerald-500/15 text-emerald-400 ring-emerald-500/30',
  };

  const estadoLabel: Record<string, string> = {
    en_proceso: 'En proceso',
    recibido: 'Recibido',
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white mb-1">Compras</h2>
          <p className="text-slate-400 text-sm">
            Mercancía en tránsito y recepción de inventario
          </p>
        </div>
        <button
          onClick={openForm}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-500 text-white font-semibold text-sm hover:bg-emerald-400 transition shadow-lg shadow-emerald-500/20"
        >
          <Plus className="w-4 h-4" />
          Registrar Compra
        </button>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-sm flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => setError('')} className="text-red-400">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-emerald-400" />
        </div>
      ) : compras.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <Truck className="w-12 h-12 text-slate-600 mb-3" />
          <p className="text-slate-400 text-sm">
            No hay compras registradas todavía.
          </p>
        </div>
      ) : (
        <div className="bg-slate-800/50 border border-slate-700 rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-700 text-slate-400">
                  <th className="text-left px-4 py-3 font-medium">Fecha</th>
                  <th className="text-left px-4 py-3 font-medium">Producto</th>
                  <th className="text-right px-4 py-3 font-medium">Cantidad</th>
                  <th className="text-right px-4 py-3 font-medium">Costo Total</th>
                  <th className="text-left px-4 py-3 font-medium">Estado</th>
                  <th className="text-center px-4 py-3 font-medium">Acción</th>
                </tr>
              </thead>
              <tbody>
                {compras.map((c) => (
                  <tr
                    key={c.id}
                    className="border-b border-slate-800 hover:bg-slate-800/30 transition"
                  >
                    <td className="px-4 py-3 text-slate-400">
                      {formatDate(c.fecha)}
                    </td>
                    <td className="px-4 py-3 text-white font-medium">
                      {c.producto?.nombre ?? '—'}
                    </td>
                    <td className="px-4 py-3 text-right text-slate-300">
                      {c.cantidad}
                    </td>
                    <td className="px-4 py-3 text-right text-amber-400 font-semibold whitespace-nowrap">
                      {formatCurrency(c.costo_total)}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`text-xs font-medium px-2 py-1 rounded-md ring-1 ${estadoColor[c.estado]}`}
                      >
                        {estadoLabel[c.estado]}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-2">
                        {c.estado === 'en_proceso' && (
                          <button
                            onClick={() => handleRecibir(c)}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/15 text-emerald-300 text-xs font-medium hover:bg-emerald-500/25 transition ring-1 ring-emerald-500/30"
                            title="Recibir mercancía"
                          >
                            <PackageCheck className="w-4 h-4" />
                            Recibir
                          </button>
                        )}
                        <button
                          onClick={() => handleDelete(c.id)}
                          className="p-2 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition"
                          title="Eliminar compra"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal: Registrar Compra */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60">
          <div className="w-full max-w-md bg-slate-800 border border-slate-700 rounded-2xl shadow-2xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700">
              <h3 className="text-lg font-semibold text-white">
                Registrar Compra
              </h3>
              <button
                onClick={() => setShowForm(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSave} className="px-6 py-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">
                  Producto *
                </label>
                <select
                  required
                  value={form.producto_id}
                  onChange={(e) =>
                    setForm({ ...form, producto_id: e.target.value })
                  }
                  className="w-full px-3 py-2.5 rounded-lg bg-slate-900/60 border border-slate-700 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50 text-sm"
                >
                  <option value="">Seleccionar producto...</option>
                  {productos.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.nombre} (stock: {p.stock})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">
                  Cantidad *
                </label>
                <input
                  type="number"
                  min="1"
                  required
                  value={form.cantidad}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      cantidad: parseInt(e.target.value) || 1,
                    })
                  }
                  className="w-full px-3 py-2.5 rounded-lg bg-slate-900/60 border border-slate-700 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50 text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">
                  Costo Total de Artículos *
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  required
                  value={form.costo_total}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      costo_total: parseFloat(e.target.value) || 0,
                    })
                  }
                  className="w-full px-3 py-2.5 rounded-lg bg-slate-900/60 border border-slate-700 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50 text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">
                  Gasto de Agencia *
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  required
                  value={form.gasto_agencia}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      gasto_agencia: parseFloat(e.target.value) || 0,
                    })
                  }
                  className="w-full px-3 py-2.5 rounded-lg bg-slate-900/60 border border-slate-700 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50 text-sm"
                />
              </div>

              <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-3 space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="text-amber-300">Costo artículos:</span>
                  <span className="text-amber-300 font-medium">{formatCurrency(form.costo_total)}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-amber-300">Gasto de agencia:</span>
                  <span className="text-amber-300 font-medium">{formatCurrency(form.gasto_agencia)}</span>
                </div>
                <div className="flex justify-between text-xs pt-1 border-t border-amber-500/20">
                  <span className="text-amber-200 font-semibold">Gran total (egreso):</span>
                  <span className="text-amber-200 font-bold">{formatCurrency(form.costo_total + form.gasto_agencia)}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-amber-300">Costo unitario real:</span>
                  <span className="text-amber-300 font-medium">{formatCurrency(form.cantidad > 0 ? (form.costo_total + form.gasto_agencia) / form.cantidad : 0)}</span>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">
                  Fecha *
                </label>
                <input
                  type="date"
                  required
                  value={form.fecha}
                  onChange={(e) =>
                    setForm({ ...form, fecha: e.target.value })
                  }
                  className="w-full px-3 py-2.5 rounded-lg bg-slate-900/60 border border-slate-700 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50 text-sm"
                />
              </div>

              <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-3">
                <p className="text-xs text-amber-300">
                  Se registrará el gran total como egreso en caja. El costo
                  unitario real se actualizará automáticamente en el producto.
                  El stock se sumará al recibir la mercancía.
                </p>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="flex-1 px-4 py-2.5 rounded-lg bg-slate-700 text-slate-300 font-medium text-sm hover:bg-slate-600 transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 px-4 py-2.5 rounded-lg bg-emerald-500 text-white font-semibold text-sm hover:bg-emerald-400 disabled:opacity-60 transition"
                >
                  {saving ? 'Guardando...' : 'Registrar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
