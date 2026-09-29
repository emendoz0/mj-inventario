import { useEffect, useState, useCallback } from 'react';
import {
  Plus,
  Search,
  Pencil,
  Trash2,
  Users,
  Loader2,
  X,
  Phone,
  Mail,
  MapPin,
} from 'lucide-react';
import { getSupabase } from '@/lib/supabase';
import { formatCurrency } from '@/lib/format';
import type { Cliente } from '@/types';

type ClienteInput = {
  nombre: string;
  telefono: string;
  email: string;
  direccion: string;
  credito_autorizado: number;
};

const EMPTY_FORM: ClienteInput = {
  nombre: '',
  telefono: '',
  email: '',
  direccion: '',
  credito_autorizado: 0,
};

export default function ClientesPage() {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Cliente | null>(null);
  const [form, setForm] = useState<ClienteInput>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const loadClientes = useCallback(async () => {
    const supabase = getSupabase();
    if (!supabase) return;
    setLoading(true);
    const { data, error } = await supabase
      .from('clientes')
      .select('*')
      .order('nombre', { ascending: true });
    if (error) {
      setError(error.message);
    } else {
      setClientes((data ?? []) as Cliente[]);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadClientes();
  }, [loadClientes]);

  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setShowForm(true);
  };

  const openEdit = (c: Cliente) => {
    setEditing(c);
    setForm({
      nombre: c.nombre,
      telefono: c.telefono ?? '',
      email: c.email ?? '',
      direccion: c.direccion ?? '',
      credito_autorizado: c.credito_autorizado,
    });
    setShowForm(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const supabase = getSupabase();
    if (!supabase) return;
    setSaving(true);
    setError('');

    const payload = {
      ...form,
      telefono: form.telefono || null,
      email: form.email || null,
      direccion: form.direccion || null,
    };

    if (editing) {
      const { error } = await supabase
        .from('clientes')
        .update(payload)
        .eq('id', editing.id);
      if (error) setError(error.message);
    } else {
      const { error } = await supabase.from('clientes').insert(payload);
      if (error) setError(error.message);
    }

    setSaving(false);
    if (!error) {
      setShowForm(false);
      loadClientes();
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Eliminar este cliente?')) return;
    const supabase = getSupabase();
    if (!supabase) return;
    const { error } = await supabase.from('clientes').delete().eq('id', id);
    if (error) {
      setError(error.message);
    } else {
      loadClientes();
    }
  };

  const filtered = clientes.filter(
    (c) =>
      c.nombre.toLowerCase().includes(search.toLowerCase()) ||
      (c.telefono ?? '').includes(search) ||
      (c.email ?? '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white mb-1">Clientes</h2>
          <p className="text-slate-400 text-sm">
            Administra tu base de clientes
          </p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-500 text-white font-semibold text-sm hover:bg-emerald-400 transition shadow-lg shadow-emerald-500/20"
        >
          <Plus className="w-4 h-4" />
          Nuevo Cliente
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

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por nombre, teléfono o email..."
          className="w-full pl-11 pr-4 py-2.5 rounded-xl bg-slate-800/50 border border-slate-700 text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition text-sm"
        />
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-emerald-400" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <Users className="w-12 h-12 text-slate-600 mb-3" />
          <p className="text-slate-400 text-sm">
            {search
              ? 'No se encontraron clientes'
              : 'No hay clientes registrados. Crea el primero.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((c) => (
            <div
              key={c.id}
              className="bg-slate-800/50 border border-slate-700 rounded-2xl p-5 hover:border-slate-600 transition"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-emerald-500/15 ring-1 ring-emerald-500/30 flex items-center justify-center text-emerald-400 font-semibold text-sm">
                    {c.nombre.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-white">
                      {c.nombre}
                    </h4>
                    <p className="text-xs text-slate-500">
                      Crédito: {formatCurrency(c.credito_autorizado)}
                    </p>
                  </div>
                </div>
                <div className="flex gap-1">
                  <button
                    onClick={() => openEdit(c)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-blue-400 hover:bg-slate-700/50 transition"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(c.id)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-slate-700/50 transition"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <div className="space-y-1.5 text-xs text-slate-400">
                {c.telefono && (
                  <div className="flex items-center gap-2">
                    <Phone className="w-3.5 h-3.5 text-slate-500" />
                    {c.telefono}
                  </div>
                )}
                {c.email && (
                  <div className="flex items-center gap-2">
                    <Mail className="w-3.5 h-3.5 text-slate-500" />
                    {c.email}
                  </div>
                )}
                {c.direccion && (
                  <div className="flex items-center gap-2">
                    <MapPin className="w-3.5 h-3.5 text-slate-500" />
                    {c.direccion}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60">
          <div className="w-full max-w-lg bg-slate-800 border border-slate-700 rounded-2xl shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700">
              <h3 className="text-lg font-semibold text-white">
                {editing ? 'Editar Cliente' : 'Nuevo Cliente'}
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
                  Nombre *
                </label>
                <input
                  type="text"
                  required
                  value={form.nombre}
                  onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                  className="w-full px-3 py-2.5 rounded-lg bg-slate-900/60 border border-slate-700 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50 text-sm"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1.5">
                    Teléfono
                  </label>
                  <input
                    type="text"
                    value={form.telefono}
                    onChange={(e) =>
                      setForm({ ...form, telefono: e.target.value })
                    }
                    className="w-full px-3 py-2.5 rounded-lg bg-slate-900/60 border border-slate-700 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1.5">
                    Email
                  </label>
                  <input
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    className="w-full px-3 py-2.5 rounded-lg bg-slate-900/60 border border-slate-700 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50 text-sm"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">
                  Dirección
                </label>
                <input
                  type="text"
                  value={form.direccion}
                  onChange={(e) =>
                    setForm({ ...form, direccion: e.target.value })
                  }
                  className="w-full px-3 py-2.5 rounded-lg bg-slate-900/60 border border-slate-700 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50 text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">
                  Crédito autorizado
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={form.credito_autorizado}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      credito_autorizado: parseFloat(e.target.value) || 0,
                    })
                  }
                  className="w-full px-3 py-2.5 rounded-lg bg-slate-900/60 border border-slate-700 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50 text-sm"
                />
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
