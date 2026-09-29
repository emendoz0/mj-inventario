import { useEffect, useState, useCallback } from 'react';
import {
  Plus,
  Search,
  ShoppingCart,
  Loader2,
  X,
  Eye,
  Ban,
} from 'lucide-react';
import { getSupabase } from '@/lib/supabase';
import { formatCurrency, formatDate } from '@/lib/format';
import { type Venta, type DetalleVenta, type Cliente, type Producto, precioVenta } from '@/types';

interface VentaWithCliente extends Venta {
  cliente: Cliente | null;
}

export default function VentasPage() {
  const [ventas, setVentas] = useState<VentaWithCliente[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [showDetail, setShowDetail] = useState<VentaWithCliente | null>(null);
  const [detalles, setDetalles] = useState<DetalleVenta[]>([]);
  const [loadingDetalles, setLoadingDetalles] = useState(false);

  // Form state
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [productos, setProductos] = useState<Producto[]>([]);
  const [clienteId, setClienteId] = useState('');
  const [tipoPago, setTipoPago] = useState<'contado' | 'credito'>('contado');
  const [lineItems, setLineItems] = useState<
    { producto_id: string; cantidad: number; precio_unitario: number }[]
  >([]);
  const [selectedProducto, setSelectedProducto] = useState('');
  const [saving, setSaving] = useState(false);

  const loadVentas = useCallback(async () => {
    const supabase = getSupabase();
    if (!supabase) return;
    setLoading(true);
    const { data, error } = await supabase
      .from('ventas')
      .select('*, cliente:clientes(*)')
      .neq('estado', 'cancelada')
      .order('creado_en', { ascending: false });
    if (error) {
      setError(error.message);
    } else {
      setVentas((data ?? []) as VentaWithCliente[]);
    }
    setLoading(false);
  }, []);

  const loadFormData = useCallback(async () => {
    const supabase = getSupabase();
    if (!supabase) return;
    const [clientesRes, productosRes] = await Promise.all([
      supabase.from('clientes').select('*').order('nombre'),
      supabase.from('productos').select('*').order('nombre'),
    ]);
    setClientes((clientesRes.data ?? []) as Cliente[]);
    setProductos((productosRes.data ?? []) as Producto[]);
  }, []);

  useEffect(() => {
    loadVentas();
  }, [loadVentas]);

  const openCreate = async () => {
    await loadFormData();
    setClienteId('');
    setTipoPago('contado');
    setLineItems([]);
    setSelectedProducto('');
    setShowForm(true);
  };

  const addLineItem = () => {
    if (!selectedProducto) {
      alert('Por favor selecciona un producto de la lista primero.');
      return;
    }

    const prod = productos.find((p) => String(p.id) === String(selectedProducto));
    if (!prod) {
      alert('No se encontró el producto en la lista cargada.');
      return;
    }

    const precio = precioVenta(prod);

    setLineItems((prev) => [
      ...prev.filter((li) => String(li.producto_id) !== String(prod.id)),
      {
        producto_id: String(prod.id),
        cantidad: 1,
        precio_unitario: Number(precio.toFixed(2)),
      },
    ]);

    setSelectedProducto('');
  };

  const updateLineItem = (productoId: string, field: 'cantidad' | 'precio_unitario', value: number) => {
    setLineItems((prev) =>
      prev.map((li) =>
        String(li.producto_id) === String(productoId) ? { ...li, [field]: value } : li
      )
    );
  };

  const removeLineItem = (productoId: string) => {
    setLineItems((prev) => prev.filter((li) => String(li.producto_id) !== String(productoId)));
  };

  const totalVenta = lineItems.reduce(
    (sum, li) => sum + li.cantidad * li.precio_unitario,
    0
  );

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const supabase = getSupabase();
    if (!supabase) return;
    if (lineItems.length === 0) {
      setError('Agrega al menos un producto a la venta');
      return;
    }
    setSaving(true);
    setError('');

    const items = lineItems.map((li) => ({
      producto_id: li.producto_id,
      cantidad: li.cantidad,
      precio_unitario: li.precio_unitario,
    }));

    const { data, error: rpcError } = await supabase.rpc('crear_venta', {
      p_cliente_id: clienteId || null,
      p_tipo_pago: tipoPago,
      p_items: items,
    });

    if (rpcError || !data) {
      setError(rpcError?.message ?? 'Error al crear la venta');
      setSaving(false);
      return;
    }

    setSaving(false);
    setShowForm(false);
    loadVentas();
  };

  const viewDetail = async (venta: VentaWithCliente) => {
    setShowDetail(venta);
    setLoadingDetalles(true);
    const supabase = getSupabase();
    if (!supabase) return;
    const { data } = await supabase
      .from('detalles_venta')
      .select('*, producto:productos(*)')
      .eq('venta_id', venta.id);
    setDetalles((data ?? []) as DetalleVenta[]);
    setLoadingDetalles(false);
  };

  const handleAnular = async (id: string) => {
    if (!confirm('¿Anular esta venta? El estado cambiará a cancelada y el stock regresará al inventario.')) return;
    const supabase = getSupabase();
    if (!supabase) return;

    const { error: rpcError } = await supabase.rpc('anular_venta', {
      p_venta_id: id,
    });

    if (rpcError) {
      setError(rpcError.message);
      return;
    }

    loadVentas();
  };

  const filtered = ventas.filter((v) => {
    const q = search.toLowerCase();
    return (
      (v.cliente?.nombre ?? 'venta general').toLowerCase().includes(q) ||
      v.tipo_pago.includes(q) ||
      v.estado.includes(q)
    );
  });

  const estadoColor: Record<string, string> = {
    pagada: 'bg-emerald-500/15 text-emerald-400 ring-emerald-500/30',
    pendiente: 'bg-amber-500/15 text-amber-400 ring-amber-500/30',
    cancelada: 'bg-red-500/15 text-red-400 ring-red-500/30',
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white mb-1">Ventas</h2>
          <p className="text-slate-400 text-sm">
            Registra y consulta las ventas del negocio
          </p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-500 text-white font-semibold text-sm hover:bg-emerald-400 transition shadow-lg shadow-emerald-500/20"
        >
          <Plus className="w-4 h-4" />
          Nueva Venta
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
          placeholder="Buscar por cliente, tipo de pago o estado..."
          className="w-full pl-11 pr-4 py-2.5 rounded-xl bg-slate-800/50 border border-slate-700 text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition text-sm"
        />
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-emerald-400" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <ShoppingCart className="w-12 h-12 text-slate-600 mb-3" />
          <p className="text-slate-400 text-sm">
            {search ? 'No se encontraron ventas' : 'No hay ventas registradas.'}
          </p>
        </div>
      ) : (
        <div className="bg-slate-800/50 border border-slate-700 rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-700 text-slate-400">
                  <th className="text-left px-4 py-3 font-medium">Fecha</th>
                  <th className="text-left px-4 py-3 font-medium">Cliente</th>
                  <th className="text-left px-4 py-3 font-medium">Pago</th>
                  <th className="text-left px-4 py-3 font-medium">Estado</th>
                  <th className="text-right px-4 py-3 font-medium">Total</th>
                  <th className="text-center px-4 py-3 font-medium">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((v) => (
                  <tr
                    key={v.id}
                    className="border-b border-slate-800 hover:bg-slate-800/30 transition"
                  >
                    <td className="px-4 py-3 text-slate-400">
                      {formatDate((v as any).fecha ?? (v as any).creado_en)}
                    </td>
                    <td className="px-4 py-3 text-white font-medium">
                      {v.cliente?.nombre ?? 'Venta general'}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`text-xs font-medium px-2 py-1 rounded-md ${
                          v.tipo_pago === 'credito'
                            ? 'bg-orange-500/15 text-orange-400'
                            : 'bg-blue-500/15 text-blue-400'
                        }`}
                      >
                        {v.tipo_pago === 'credito' ? 'Crédito' : 'Contado'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`text-xs font-medium px-2 py-1 rounded-md ring-1 ${
                          estadoColor[v.estado]
                        }`}
                      >
                        {v.estado}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right text-emerald-400 font-semibold">
                      {formatCurrency(v.total)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => viewDetail(v)}
                          className="p-2 rounded-lg text-slate-400 hover:text-emerald-400 hover:bg-slate-700/50 transition"
                          title="Ver detalles"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        {v.estado !== 'cancelada' && (
                          <button
                            onClick={() => handleAnular(v.id)}
                            className="p-2 rounded-lg text-slate-400 hover:text-red-400 hover:bg-slate-700/50 transition"
                            title="Anular venta"
                          >
                            <Ban className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* New sale modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60">
          <div className="w-full max-w-2xl bg-slate-800 border border-slate-700 rounded-2xl shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700 sticky top-0 bg-slate-800 z-10">
              <h3 className="text-lg font-semibold text-white">Nueva Venta</h3>
              <button
                onClick={() => setShowForm(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSave} className="px-6 py-5 space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1.5">
                    Cliente (opcional)
                  </label>
                  <select
                    value={clienteId}
                    onChange={(e) => setClienteId(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-lg bg-slate-900/60 border border-slate-700 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50 text-sm"
                  >
                    <option value="">Venta general (sin cliente)</option>
                    {clientes.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.nombre}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1.5">
                    Tipo de pago
                  </label>
                  <select
                    value={tipoPago}
                    onChange={(e) =>
                      setTipoPago(e.target.value as 'contado' | 'credito')
                    }
                    className="w-full px-3 py-2.5 rounded-lg bg-slate-900/60 border border-slate-700 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50 text-sm"
                  >
                    <option value="contado">Contado</option>
                    <option value="credito">Crédito</option>
                  </select>
                </div>
              </div>

              {/* Add product */}
              <div className="border border-slate-700 rounded-xl p-4 space-y-3">
                <label className="block text-sm font-medium text-slate-300">
                  Productos
                </label>
                <div className="flex gap-2 w-full min-w-0">
                  <select
                    value={selectedProducto}
                    onChange={(e) => setSelectedProducto(e.target.value)}
                    className="flex-1 min-w-0 px-3 py-2.5 rounded-lg bg-slate-900/60 border border-slate-700 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50 text-sm"
                  >
                    <option value="">Seleccionar producto...</option>
                    {productos
                      .filter(
                        (p) => !lineItems.some((li) => String(li.producto_id) === String(p.id))
                      )
                      .map((p) => (
                        <option key={p.id} value={String(p.id)}>
                          {p.nombre} — {formatCurrency(precioVenta(p))} (stock: {p.stock})
                        </option>
                      ))}
                  </select>
                  <button
                    type="button"
                    onClick={addLineItem}
                    className="flex-shrink-0 px-4 py-2.5 rounded-lg bg-emerald-500 text-white font-medium text-sm hover:bg-emerald-400 transition"
                  >
                   Añadir
                  </button>
                </div>

                {lineItems.length > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 px-3 text-xs text-slate-500 font-medium">
                      <span className="flex-1">Producto</span>
                      <span className="w-20 text-center">Cant.</span>
                      <span className="w-28 text-right">Precio (editable)</span>
                      <span className="w-24 text-right">Subtotal</span>
                      <span className="w-5" />
                    </div>
                    {lineItems.map((li) => {
                      const prod = productos.find(
                        (p) => String(p.id) === String(li.producto_id)
                      );
                      return (
                        <div
                          key={li.producto_id}
                          className="flex items-center gap-2 p-3 rounded-lg bg-slate-900/40"
                        >
                          <span className="flex-1 text-sm text-white">
                            {prod?.nombre ?? 'Producto'}
                          </span>
                          <input
                            type="number"
                            min="1"
                            value={li.cantidad}
                            onChange={(e) =>
                              updateLineItem(
                                li.producto_id,
                                'cantidad',
                                parseInt(e.target.value) || 1
                              )
                            }
                            className="w-20 px-2 py-1.5 rounded-md bg-slate-900/60 border border-slate-700 text-white text-sm text-center focus:outline-none focus:ring-1 focus:ring-emerald-500/50"
                          />
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            value={li.precio_unitario}
                            onChange={(e) =>
                              updateLineItem(
                                li.producto_id,
                                'precio_unitario',
                                parseFloat(e.target.value) || 0
                              )
                            }
                            className="w-28 px-2 py-1.5 rounded-md bg-slate-900/60 border border-slate-700 text-white text-sm text-right focus:outline-none focus:ring-1 focus:ring-emerald-500/50"
                          />
                          <span className="w-24 text-right text-sm font-semibold text-emerald-400">
                            {formatCurrency(li.cantidad * li.precio_unitario)}
                          </span>
                          <button
                            type="button"
                            onClick={() => removeLineItem(li.producto_id)}
                            className="p-1 text-slate-400 hover:text-red-400 transition"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      );
                    })}
                    <div className="flex justify-between pt-2 border-t border-slate-700">
                      <span className="text-sm font-medium text-slate-300">
                        Total
                      </span>
                      <span className="text-lg font-bold text-emerald-400">
                        {formatCurrency(totalVenta)}
                      </span>
                    </div>
                  </div>
                )}
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
                  disabled={saving || lineItems.length === 0}
                  className="flex-1 px-4 py-2.5 rounded-lg bg-emerald-500 text-white font-semibold text-sm hover:bg-emerald-400 disabled:opacity-60 transition"
                >
                  {saving ? 'Guardando...' : 'Registrar Venta'}
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
                Detalle de Venta
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
                    {formatDate((showDetail as any).fecha ?? (showDetail as any).creado_en)}
                  </p>
                </div>
                <div>
                  <p className="text-slate-500 text-xs">Tipo de pago</p>
                  <p className="text-white font-medium capitalize">
                    {showDetail.tipo_pago}
                  </p>
                </div>
                <div>
                  <p className="text-slate-500 text-xs">Estado</p>
                  <p
                    className={`font-medium capitalize ${
                      showDetail.estado === 'pagada'
                        ? 'text-emerald-400'
                        : showDetail.estado === 'pendiente'
                        ? 'text-amber-400'
                        : 'text-red-400'
                    }`}
                  >
                    {showDetail.estado}
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
                        <th className="text-left px-3 py-2 font-medium">
                          Producto
                        </th>
                        <th className="text-right px-3 py-2 font-medium">
                          Cant.
                        </th>
                        <th className="text-right px-3 py-2 font-medium">
                          Precio
                        </th>
                        <th className="text-right px-3 py-2 font-medium">
                          Subtotal
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {detalles.map((d) => (
                        <tr
                          key={d.id}
                          className="border-b border-slate-800"
                        >
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
                    <tfoot>
                      <tr className="border-t border-slate-700">
                        <td
                          colSpan={3}
                          className="px-3 py-3 text-right text-sm font-medium text-slate-300"
                        >
                          Total
                        </td>
                        <td className="px-3 py-3 text-right text-lg font-bold text-emerald-400">
                          {formatCurrency(showDetail.total)}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}

              {showDetail.estado !== 'cancelada' && (
                <button
                  onClick={() => {
                    handleAnular(showDetail.id);
                    setShowDetail(null);
                  }}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-red-500/15 text-red-400 font-medium text-sm hover:bg-red-500/25 transition ring-1 ring-red-500/30"
                >
                  <Ban className="w-4 h-4" />
                  Anular venta
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}