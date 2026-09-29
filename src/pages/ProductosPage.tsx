import { useEffect, useState, useCallback } from 'react';
import {
  Plus,
  Search,
  Pencil,
  Trash2,
  Package,
  Loader2,
  X,
  PackagePlus,
} from 'lucide-react';
import { getSupabase } from '@/lib/supabase';
import { formatCurrency, localDateInputValue, localDateToISO } from '@/lib/format';
import { type Producto, precioVenta } from '@/types';

const CATEGORIAS = ['Perfumes', 'Cremas', 'Sets', 'Splash', 'Accesorios'] as const;
const GENEROS = ['Hombre', 'Mujer', 'Unisex', 'Niños'] as const;
const MARCAS = [
  'Carolina Herrera',
  'Paco Rabanne',
  'Guess',
  'Calvin Klein',
  'Hugo Boss',
  "Victoria's Secret",
  'Bath & Body Works',
  'Otra',
] as const;
const PRESENTACIONES = ['30ml', '50ml', '100ml', '200ml', '236ml', 'Tester', 'Estuche'] as const;

type ProductoInput = {
  nombre: string;
  categoria: string;
  marca: string;
  genero: string;
  presentacion: string;
  precio_compra: number;
  porcentaje_ganancia: number;
  stock: number;
  imagen_url: string;
  observaciones: string;
};

const EMPTY_FORM: ProductoInput = {
  nombre: '',
  categoria: '',
  marca: '',
  genero: '',
  presentacion: '',
  precio_compra: 0,
  porcentaje_ganancia: 0,
  stock: 0,
  imagen_url: '',
  observaciones: '',
};

export default function ProductosPage() {
  const [productos, setProductos] = useState<Producto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [filterCategoria, setFilterCategoria] = useState('');
  const [filterGenero, setFilterGenero] = useState('');
  const [filterMarca, setFilterMarca] = useState('');
  const [filterPresentacion, setFilterPresentacion] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Producto | null>(null);
  const [form, setForm] = useState<ProductoInput>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [reabastoTarget, setReabastoTarget] = useState<Producto | null>(null);
  const [reabasto, setReabasto] = useState({
    cantidad: 1,
    costo_total: 0,
    gasto_agencia: 0,
    fecha: new Date().toISOString().slice(0, 10),
  });
  const [reabastando, setReabastando] = useState(false);

  const loadProductos = useCallback(async () => {
    const supabase = getSupabase();
    if (!supabase) return;
    setLoading(true);
    const { data, error } = await supabase
      .from('productos')
      .select('*')
      .order('nombre', { ascending: true });
    if (error) {
      setError(error.message);
    } else {
      setProductos((data ?? []) as Producto[]);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadProductos();
  }, [loadProductos]);

  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setShowForm(true);
  };

  const openEdit = (p: Producto) => {
    setEditing(p);
    setForm({
      nombre: p.nombre,
      categoria: p.categoria ?? '',
      marca: p.marca ?? '',
      genero: p.genero ?? '',
      presentacion: p.presentacion ?? '',
      precio_compra: p.precio_compra,
      porcentaje_ganancia: p.porcentaje_ganancia,
      stock: p.stock,
      imagen_url: p.imagen_url ?? '',
      observaciones: p.observaciones ?? '',
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
      nombre: form.nombre,
      categoria: form.categoria || null,
      marca: form.marca || null,
      genero: form.genero || null,
      presentacion: form.presentacion || null,
      precio_compra: form.precio_compra,
      porcentaje_ganancia: form.porcentaje_ganancia,
      stock: form.stock,
      imagen_url: form.imagen_url || null,
      observaciones: form.observaciones || null,
    };

    let insertError = null;
    if (editing) {
      const { error } = await supabase
        .from('productos')
        .update(payload)
        .eq('id', editing.id);
      insertError = error;
    } else {
      const { error } = await supabase.from('productos').insert(payload);
      insertError = error;
    }

    setSaving(false);
    if (insertError) {
      setError(insertError.message);
    } else {
      setShowForm(false);
      loadProductos();
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Eliminar este producto?')) return;
    const supabase = getSupabase();
    if (!supabase) return;
    const { error } = await supabase.from('productos').delete().eq('id', id);
    if (error) {
      setError(error.message);
    } else {
      loadProductos();
    }
  };

  const openReabasto = (p: Producto) => {
    setReabastoTarget(p);
    setReabasto({
      cantidad: 1,
      costo_total: 0,
      gasto_agencia: 0,
      fecha: localDateInputValue(),
    });
  };

  const handleReabasto = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reabastoTarget) return;
    const supabase = getSupabase();
    if (!supabase) return;
    setReabastando(true);
    setError('');

    const { error: rpcError } = await supabase.rpc('registrar_compra', {
      p_producto_id: reabastoTarget.id,
      p_cantidad: reabasto.cantidad,
      p_costo_total: reabasto.costo_total,
      p_gasto_agencia: reabasto.gasto_agencia,
      p_fecha: reabasto.fecha ? localDateToISO(reabasto.fecha) : null,
    });

    if (rpcError) {
      setError(rpcError.message);
      setReabastando(false);
      return;
    }

    setReabastando(false);
    setReabastoTarget(null);
    loadProductos();
  };

  const filtered = productos.filter((p) => {
    const q = search.toLowerCase();
    const matchSearch =
      p.nombre.toLowerCase().includes(q) ||
      (p.marca ?? '').toLowerCase().includes(q);
    const matchCategoria = !filterCategoria || p.categoria === filterCategoria;
    const matchGenero = !filterGenero || p.genero === filterGenero;
    const matchMarca = !filterMarca || p.marca === filterMarca;
    const matchPresentacion =
      !filterPresentacion || p.presentacion === filterPresentacion;
    return (
      matchSearch && matchCategoria && matchGenero && matchMarca && matchPresentacion
    );
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white mb-1">Productos</h2>
          <p className="text-slate-400 text-sm">
            Gestiona tu inventario de productos
          </p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-500 text-white font-semibold text-sm hover:bg-emerald-400 transition shadow-lg shadow-emerald-500/20"
        >
          <Plus className="w-4 h-4" />
          Nuevo Producto
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

      {/* Search + filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nombre o marca..."
            className="w-full pl-11 pr-4 py-2.5 rounded-xl bg-slate-800/50 border border-slate-700 text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition text-sm"
          />
        </div>
        <input
          list="dl-categorias"
          value={filterCategoria}
          onChange={(e) => setFilterCategoria(e.target.value)}
          placeholder="Categoría"
          className="px-4 py-2.5 rounded-xl bg-slate-800/50 border border-slate-700 text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition text-sm min-w-[140px]"
        />
        <input
          list="dl-generos"
          value={filterGenero}
          onChange={(e) => setFilterGenero(e.target.value)}
          placeholder="Género"
          className="px-4 py-2.5 rounded-xl bg-slate-800/50 border border-slate-700 text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition text-sm min-w-[120px]"
        />
        <input
          list="dl-marcas"
          value={filterMarca}
          onChange={(e) => setFilterMarca(e.target.value)}
          placeholder="Marca"
          className="px-4 py-2.5 rounded-xl bg-slate-800/50 border border-slate-700 text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition text-sm min-w-[160px]"
        />
        <input
          list="dl-presentaciones"
          value={filterPresentacion}
          onChange={(e) => setFilterPresentacion(e.target.value)}
          placeholder="Presentación"
          className="px-4 py-2.5 rounded-xl bg-slate-800/50 border border-slate-700 text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition text-sm min-w-[140px]"
        />
        <datalist id="dl-categorias">
          {CATEGORIAS.map((c) => (
            <option key={c} value={c} />
          ))}
        </datalist>
        <datalist id="dl-generos">
          {GENEROS.map((g) => (
            <option key={g} value={g} />
          ))}
        </datalist>
        <datalist id="dl-marcas">
          {MARCAS.map((m) => (
            <option key={m} value={m} />
          ))}
        </datalist>
        <datalist id="dl-presentaciones">
          {PRESENTACIONES.map((p) => (
            <option key={p} value={p} />
          ))}
        </datalist>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-emerald-400" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <Package className="w-12 h-12 text-slate-600 mb-3" />
          <p className="text-slate-400 text-sm">
            {search
              ? 'No se encontraron productos'
              : 'No hay productos registrados. Crea el primero.'}
          </p>
        </div>
      ) : (
        <div className="bg-slate-800/50 border border-slate-700 rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-700 text-slate-400">
                  <th className="text-left px-4 py-3 font-medium">Nombre</th>
                  <th className="text-left px-4 py-3 font-medium">Categoría</th>
                  <th className="text-left px-4 py-3 font-medium">Marca</th>
                  <th className="text-left px-4 py-3 font-medium">Género</th>
                  <th className="text-left px-4 py-3 font-medium">Presentación</th>
                  <th className="text-right px-4 py-3 font-medium">P. Compra</th>
                  <th className="text-right px-4 py-3 font-medium">% Gan.</th>
                  <th className="text-right px-4 py-3 font-medium">P. Venta</th>
                  <th className="text-right px-4 py-3 font-medium">Exist.</th>
                  <th className="text-center px-4 py-3 font-medium">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((p) => (
                  <tr
                    key={p.id}
                    className="border-b border-slate-800 hover:bg-slate-800/30 transition"
                  >
                    <td className="px-4 py-3 text-white font-medium whitespace-nowrap">
                      {p.nombre}
                    </td>
                    <td className="px-4 py-3 text-slate-400">
                      {p.categoria ?? '—'}
                    </td>
                    <td className="px-4 py-3 text-slate-400">
                      {p.marca ?? '—'}
                    </td>
                    <td className="px-4 py-3 text-slate-400">
                      {p.genero ?? '—'}
                    </td>
                    <td className="px-4 py-3 text-slate-400">
                      {p.presentacion ?? '—'}
                    </td>
                    <td className="px-4 py-3 text-right text-slate-400 whitespace-nowrap">
                      {formatCurrency(p.precio_compra)}
                    </td>
                    <td className="px-4 py-3 text-right text-slate-400">
                      {p.porcentaje_ganancia}%
                    </td>
                    <td className="px-4 py-3 text-right text-emerald-400 font-semibold whitespace-nowrap">
                      {formatCurrency(precioVenta(p))}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span
                        className={`font-semibold ${
                          p.stock === 0 ? 'text-red-400' : 'text-slate-300'
                        }`}
                      >
                        {p.stock}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => openReabasto(p)}
                          className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-amber-500/15 text-amber-300 text-xs font-medium hover:bg-amber-500/25 transition ring-1 ring-amber-500/30"
                          title="Agregar Existencia"
                        >
                          <PackagePlus className="w-4 h-4" />
                          Agregar Existencia
                        </button>
                        <button
                          onClick={() => openEdit(p)}
                          className="p-2 rounded-lg text-slate-400 hover:text-blue-400 hover:bg-slate-700/50 transition"
                          title="Editar"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(p.id)}
                          className="p-2 rounded-lg text-slate-400 hover:text-red-400 hover:bg-slate-700/50 transition"
                          title="Eliminar"
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

      {/* Modal form */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60">
          <div className="w-full max-w-2xl bg-slate-800 border border-slate-700 rounded-2xl shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700 sticky top-0 bg-slate-800 z-10">
              <h3 className="text-lg font-semibold text-white">
                {editing ? 'Editar Producto' : 'Nuevo Producto'}
              </h3>
              <button
                onClick={() => setShowForm(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSave} className="px-6 py-5 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-slate-300 mb-1.5">
                    Nombre *
                  </label>
                  <input
                    type="text"
                    required
                    value={form.nombre}
                    onChange={(e) =>
                      setForm({ ...form, nombre: e.target.value })
                    }
                    className="w-full px-3 py-2.5 rounded-lg bg-slate-900/60 border border-slate-700 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1.5">
                    Categoría *
                  </label>
                  <input
                    list="dl-categorias"
                    required
                    value={form.categoria}
                    onChange={(e) =>
                      setForm({ ...form, categoria: e.target.value })
                    }
                    placeholder="Seleccionar o escribir..."
                    className="w-full px-3 py-2.5 rounded-lg bg-slate-900/60 border border-slate-700 text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1.5">
                    Marca *
                  </label>
                  <input
                    list="dl-marcas"
                    required
                    value={form.marca}
                    onChange={(e) =>
                      setForm({ ...form, marca: e.target.value })
                    }
                    placeholder="Seleccionar o escribir..."
                    className="w-full px-3 py-2.5 rounded-lg bg-slate-900/60 border border-slate-700 text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1.5">
                    Género *
                  </label>
                  <input
                    list="dl-generos"
                    required
                    value={form.genero}
                    onChange={(e) =>
                      setForm({ ...form, genero: e.target.value })
                    }
                    placeholder="Seleccionar o escribir..."
                    className="w-full px-3 py-2.5 rounded-lg bg-slate-900/60 border border-slate-700 text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1.5">
                    Presentación *
                  </label>
                  <input
                    list="dl-presentaciones"
                    required
                    value={form.presentacion}
                    onChange={(e) =>
                      setForm({ ...form, presentacion: e.target.value })
                    }
                    placeholder="Seleccionar o escribir..."
                    className="w-full px-3 py-2.5 rounded-lg bg-slate-900/60 border border-slate-700 text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1.5">
                    Precio de compra *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    value={form.precio_compra}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        precio_compra: parseFloat(e.target.value) || 0,
                      })
                    }
                    className="w-full px-3 py-2.5 rounded-lg bg-slate-900/60 border border-slate-700 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1.5">
                    Porcentaje de ganancia *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    value={form.porcentaje_ganancia}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        porcentaje_ganancia: parseFloat(e.target.value) || 0,
                      })
                    }
                    className="w-full px-3 py-2.5 rounded-lg bg-slate-900/60 border border-slate-700 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1.5">
                    Existencia *
                  </label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={form.stock}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        stock: parseInt(e.target.value) || 0,
                      })
                    }
                    className="w-full px-3 py-2.5 rounded-lg bg-slate-900/60 border border-slate-700 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50 text-sm"
                  />
                </div>

                {/* URL de la foto */}
                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-slate-300 mb-1.5">
                    URL de la foto
                  </label>
                  <input
                    type="url"
                    value={form.imagen_url}
                    onChange={(e) =>
                      setForm({ ...form, imagen_url: e.target.value })
                    }
                    placeholder="https://ejemplo.com/foto.jpg"
                    className="w-full px-3 py-2.5 rounded-lg bg-slate-900/60 border border-slate-700 text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 text-sm"
                  />
                </div>

                {/* Observaciones */}
                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-slate-300 mb-1.5">
                    Observaciones
                  </label>
                  <textarea
                    value={form.observaciones}
                    onChange={(e) =>
                      setForm({ ...form, observaciones: e.target.value })
                    }
                    placeholder="Notas internas sobre el producto..."
                    rows={3}
                    className="w-full px-3 py-2.5 rounded-lg bg-slate-900/60 border border-slate-700 text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 text-sm resize-none"
                  />
                </div>
              </div>

              {/* Computed selling price preview */}
              <div className="flex items-center justify-between p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30">
                <span className="text-sm text-emerald-300">
                  Precio de venta calculado:
                </span>
                <span className="text-lg font-bold text-emerald-400">
                  {formatCurrency(precioVenta(form))}
                </span>
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

      {/* Reabasto modal */}
      {reabastoTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60">
          <div className="w-full max-w-md bg-slate-800 border border-slate-700 rounded-2xl shadow-2xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700">
              <h3 className="text-lg font-semibold text-white">
                Agregar Existencia
              </h3>
              <button
                onClick={() => setReabastoTarget(null)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleReabasto} className="px-6 py-5 space-y-4">
              <div className="bg-slate-900/40 rounded-xl p-4">
                <p className="text-sm text-slate-400">Producto</p>
                <p className="text-white font-semibold">
                  {reabastoTarget.nombre}
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  Stock actual: {reabastoTarget.stock} unidades
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">
                  Cantidad comprada *
                </label>
                <input
                  type="number"
                  min="1"
                  required
                  value={reabasto.cantidad}
                  onChange={(e) =>
                    setReabasto({
                      ...reabasto,
                      cantidad: parseInt(e.target.value) || 1,
                    })
                  }
                  className="w-full px-3 py-2.5 rounded-lg bg-slate-900/60 border border-slate-700 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50 text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">
                  Costo total de los artículos *
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  required
                  value={reabasto.costo_total}
                  onChange={(e) =>
                    setReabasto({
                      ...reabasto,
                      costo_total: parseFloat(e.target.value) || 0,
                    })
                  }
                  className="w-full px-3 py-2.5 rounded-lg bg-slate-900/60 border border-slate-700 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50 text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">
                  Gasto de agencia *
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  required
                  value={reabasto.gasto_agencia}
                  onChange={(e) =>
                    setReabasto({
                      ...reabasto,
                      gasto_agencia: parseFloat(e.target.value) || 0,
                    })
                  }
                  className="w-full px-3 py-2.5 rounded-lg bg-slate-900/60 border border-slate-700 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50 text-sm"
                />
              </div>

              <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-3 space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="text-amber-300">Costo artículos:</span>
                  <span className="text-amber-300 font-medium">{formatCurrency(reabasto.costo_total)}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-amber-300">Gasto de agencia:</span>
                  <span className="text-amber-300 font-medium">{formatCurrency(reabasto.gasto_agencia)}</span>
                </div>
                <div className="flex justify-between text-xs pt-1 border-t border-amber-500/20">
                  <span className="text-amber-200 font-semibold">Gran total (egreso):</span>
                  <span className="text-amber-200 font-bold">{formatCurrency(reabasto.costo_total + reabasto.gasto_agencia)}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-amber-300">Costo unitario real:</span>
                  <span className="text-amber-300 font-medium">
                    {formatCurrency(reabasto.cantidad > 0 ? (reabasto.costo_total + reabasto.gasto_agencia) / reabasto.cantidad : 0)}
                  </span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-amber-300">Costo actual en ficha:</span>
                  <span className="text-amber-300 font-medium">{formatCurrency(reabastoTarget.precio_compra)}</span>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">
                  Fecha de compra *
                </label>
                <input
                  type="date"
                  required
                  value={reabasto.fecha}
                  onChange={(e) =>
                    setReabasto({ ...reabasto, fecha: e.target.value })
                  }
                  className="w-full px-3 py-2.5 rounded-lg bg-slate-900/60 border border-slate-700 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50 text-sm"
                />
              </div>

              <div className="flex items-center justify-between p-4 rounded-xl bg-amber-500/10 border border-amber-500/30">
                <span className="text-sm text-amber-300">
                  Gran total (egreso en caja):
                </span>
                <span className="text-lg font-bold text-amber-400">
                  {formatCurrency(reabasto.costo_total + reabasto.gasto_agencia)}
                </span>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setReabastoTarget(null)}
                  className="flex-1 px-4 py-2.5 rounded-lg bg-slate-700 text-slate-300 font-medium text-sm hover:bg-slate-600 transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={reabastando}
                  className="flex-1 px-4 py-2.5 rounded-lg bg-amber-500 text-white font-semibold text-sm hover:bg-amber-400 disabled:opacity-60 transition"
                >
                  {reabastando ? 'Procesando...' : 'Confirmar Compra'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
