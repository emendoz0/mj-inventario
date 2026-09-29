import { useEffect, useState, useCallback } from 'react';
import {
  Plus,
  Wallet,
  TrendingUp,
  TrendingDown,
  Loader2,
  X,
  Trash2,
} from 'lucide-react';
import { getSupabase } from '@/lib/supabase';
import { formatCurrency, formatDate } from '@/lib/format';
import type { CajaNegocio } from '@/types';

export default function CajaPage() {
  const [movimientos, setMovimientos] = useState<CajaNegocio[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    concepto: '',
    monto: 0,
    tipo: 'ingreso' as 'ingreso' | 'egreso',
  });

  const [balance, setBalance] = useState(0);
  const [totalIngresos, setTotalIngresos] = useState(0);
  const [totalEgresos, setTotalEgresos] = useState(0);

  const loadMovimientos = useCallback(async () => {
    const supabase = getSupabase();
    if (!supabase) return;
    setLoading(true);
    const { data, error } = await supabase
      .from('caja_negocio')
      .select('*')
      .order('fecha', { ascending: false });
    if (error) {
      setError(error.message);
    } else {
      const items = (data ?? []) as CajaNegocio[];
      setMovimientos(items);
      const ingresos = items
        .filter((i) => i.tipo === 'ingreso')
        .reduce((sum, i) => sum + i.monto, 0);
      const egresos = items
        .filter((i) => i.tipo === 'egreso')
        .reduce((sum, i) => sum + i.monto, 0);
      setTotalIngresos(ingresos);
      setTotalEgresos(egresos);
      setBalance(ingresos - egresos);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadMovimientos();
  }, [loadMovimientos]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const supabase = getSupabase();
    if (!supabase) return;
    setSaving(true);
    setError('');

    const { error } = await supabase.from('caja_negocio').insert({
      concepto: form.concepto,
      monto: form.monto,
      tipo: form.tipo,
    });

    if (error) {
      setError(error.message);
    } else {
      setShowForm(false);
      setForm({ concepto: '', monto: 0, tipo: 'ingreso' });
      loadMovimientos();
    }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Eliminar este movimiento de caja?')) return;
    const supabase = getSupabase();
    if (!supabase) return;
    const { error } = await supabase
      .from('caja_negocio')
      .delete()
      .eq('id', id);
    if (error) {
      setError(error.message);
    } else {
      loadMovimientos();
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white mb-1">Caja</h2>
          <p className="text-slate-400 text-sm">
            Movimientos de ingresos y egresos del negocio
          </p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-500 text-white font-semibold text-sm hover:bg-emerald-400 transition shadow-lg shadow-emerald-500/20"
        >
          <Plus className="w-4 h-4" />
          Nuevo Movimiento
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

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 ring-1 ring-emerald-500/30 flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <p className="text-xs text-slate-400">Ingresos</p>
              <p className="text-xl font-bold text-emerald-400">
                {formatCurrency(totalIngresos)}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-500/10 ring-1 ring-red-500/30 flex items-center justify-center">
              <TrendingDown className="w-5 h-5 text-red-400" />
            </div>
            <div>
              <p className="text-xs text-slate-400">Egresos</p>
              <p className="text-xl font-bold text-red-400">
                {formatCurrency(totalEgresos)}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-5">
          <div className="flex items-center gap-3">
            <div
              className={`w-10 h-10 rounded-xl ring-1 flex items-center justify-center ${
                balance >= 0
                  ? 'bg-teal-500/10 ring-teal-500/30'
                  : 'bg-orange-500/10 ring-orange-500/30'
              }`}
            >
              <Wallet
                className={`w-5 h-5 ${
                  balance >= 0 ? 'text-teal-400' : 'text-orange-400'
                }`}
              />
            </div>
            <div>
              <p className="text-xs text-slate-400">Balance</p>
              <p
                className={`text-xl font-bold ${
                  balance >= 0 ? 'text-teal-400' : 'text-orange-400'
                }`}
              >
                {formatCurrency(balance)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-emerald-400" />
        </div>
      ) : movimientos.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <Wallet className="w-12 h-12 text-slate-600 mb-3" />
          <p className="text-slate-400 text-sm">
            No hay movimientos de caja registrados.
          </p>
        </div>
      ) : (
        <div className="bg-slate-800/50 border border-slate-700 rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-700 text-slate-400">
                  <th className="text-left px-4 py-3 font-medium">Fecha</th>
                  <th className="text-left px-4 py-3 font-medium">Concepto</th>
                  <th className="text-left px-4 py-3 font-medium">Tipo</th>
                  <th className="text-right px-4 py-3 font-medium">Monto</th>
                  <th className="text-center px-4 py-3 font-medium">Acción</th>
                </tr>
              </thead>
              <tbody>
                {movimientos.map((m) => (
                  <tr
                    key={m.id}
                    className="border-b border-slate-800 hover:bg-slate-800/30 transition"
                  >
                    <td className="px-4 py-3 text-slate-400">
                      {formatDate(m.fecha)}
                    </td>
                    <td className="px-4 py-3 text-white font-medium">
                      <div className="flex items-center gap-2">
                        <span>{m.concepto}</span>
                        {m.concepto.startsWith('Compra de inventario:') && (
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-400 ring-1 ring-amber-500/30 whitespace-nowrap">
                            Inventario
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`text-xs font-medium px-2 py-1 rounded-md ${
                          m.tipo === 'ingreso'
                            ? 'bg-emerald-500/15 text-emerald-400'
                            : 'bg-red-500/15 text-red-400'
                        }`}
                      >
                        {m.tipo === 'ingreso' ? 'Ingreso' : 'Egreso'}
                      </span>
                    </td>
                    <td
                      className={`px-4 py-3 text-right font-semibold ${
                        m.tipo === 'ingreso'
                          ? 'text-emerald-400'
                          : 'text-red-400'
                      }`}
                    >
                      {m.tipo === 'ingreso' ? '+' : '-'}
                      {formatCurrency(m.monto)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-center">
                        <button
                          onClick={() => handleDelete(m.id)}
                          className="p-2 rounded-lg text-slate-400 hover:text-red-400 hover:bg-slate-700/50 transition"
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

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60">
          <div className="w-full max-w-md bg-slate-800 border border-slate-700 rounded-2xl shadow-2xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700">
              <h3 className="text-lg font-semibold text-white">
                Nuevo Movimiento
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
                  Concepto *
                </label>
                <input
                  type="text"
                  required
                  value={form.concepto}
                  onChange={(e) =>
                    setForm({ ...form, concepto: e.target.value })
                  }
                  placeholder="Descripción del movimiento"
                  className="w-full px-3 py-2.5 rounded-lg bg-slate-900/60 border border-slate-700 text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 text-sm"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1.5">
                    Tipo
                  </label>
                  <select
                    value={form.tipo}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        tipo: e.target.value as 'ingreso' | 'egreso',
                      })
                    }
                    className="w-full px-3 py-2.5 rounded-lg bg-slate-900/60 border border-slate-700 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50 text-sm"
                  >
                    <option value="ingreso">Ingreso</option>
                    <option value="egreso">Egreso</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1.5">
                    Monto *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    value={form.monto}
                    onChange={(e) =>
                      setForm({ ...form, monto: parseFloat(e.target.value) || 0 })
                    }
                    className="w-full px-3 py-2.5 rounded-lg bg-slate-900/60 border border-slate-700 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50 text-sm"
                  />
                </div>
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
                  {saving ? 'Guardando...' : 'Guardar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
