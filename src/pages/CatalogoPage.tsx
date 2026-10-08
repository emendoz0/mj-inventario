import { useEffect, useState } from 'react';
import { Loader2, Package, MessageCircle, Eye, EyeOff } from 'lucide-react';
import { getSupabase } from '@/lib/supabase';
import { type Producto, precioVenta } from '@/types';
import { formatCurrency } from '@/lib/format';

const WHATSAPP_NUMBER = import.meta.env.VITE_WHATSAPP_NUMBER ?? '50588888888';

function buildWhatsAppLink(productName: string): string {
  const text = encodeURIComponent(
    `Hola, me gustaría consultar el precio y disponibilidad de: ${productName}`
  );
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${text}`;
}

export default function CatalogoPage() {
  const [productos, setProductos] = useState<Producto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [mostrarPrecios, setMostrarPrecios] = useState(false);

  useEffect(() => {
    loadProductos();
  }, []);

  const loadProductos = async () => {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from('productos')
      .select('*')
      .gt('stock', 0)
      .order('nombre', { ascending: true });
    if (error) {
      setError(error.message);
    } else {
      setProductos((data ?? []) as Producto[]);
    }
    setLoading(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white mb-1">Catálogo Digital</h2>
          <p className="text-slate-400 text-sm">
            Productos disponibles para mostrar a tus clientes
          </p>
        </div>
        <button
          onClick={() => setMostrarPrecios((v) => !v)}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium text-sm transition ${
            mostrarPrecios
              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
              : 'bg-slate-800/50 text-slate-400 border border-slate-700 hover:text-white'
          }`}
        >
          {mostrarPrecios ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
          {mostrarPrecios ? 'Ocultar Precios' : 'Mostrar Precios'}
        </button>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-sm">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-emerald-400" />
        </div>
      ) : productos.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <Package className="w-12 h-12 text-slate-600 mb-3" />
          <p className="text-slate-400 text-sm">
            No hay productos con stock disponible para el catálogo.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 p-4 bg-slate-950 rounded-2xl">
          <div className="col-span-full mb-2 text-center">
            <h1 className="text-2xl font-bold text-white">MJ &amp; Elegance</h1>
            <p className="text-slate-400 text-sm">Catálogo de Productos</p>
          </div>
          {productos.map((p) => (
            <div
              key={p.id}
              className="bg-slate-800/60 border border-slate-700 rounded-xl overflow-hidden hover:border-emerald-500/30 transition flex flex-col"
            >
              <div className="aspect-square bg-slate-900 flex items-center justify-center overflow-hidden relative">
                {p.imagen_url ? (
                  <img
                    src={p.imagen_url}
                    alt={p.nombre}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      const img = e.currentTarget;
                      img.style.display = 'none';
                      const parent = img.parentElement;
                      if (parent && !parent.querySelector('.img-placeholder')) {
                        const placeholder = document.createElement('div');
                        placeholder.className = 'img-placeholder w-full h-full flex flex-col items-center justify-center bg-slate-800 gap-2 p-3';
                        placeholder.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" fill="none" stroke="rgb(71,85,105)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15V6M18.5 18a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5ZM12 12H3M16 8H3M12 16H3"/></svg><span class="text-xs text-slate-500 text-center leading-tight line-clamp-2">${p.nombre}</span>`;
                        parent.appendChild(placeholder);
                      }
                    }}
                  />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center bg-slate-800 gap-2 p-3">
                    <Package className="w-7 h-7 text-slate-600" />
                    <span className="text-xs text-slate-500 text-center leading-tight line-clamp-2">
                      {p.nombre}
                    </span>
                  </div>
                )}
              </div>
              <div className="p-3 space-y-2 flex-1 flex flex-col">
                <h3 className="text-sm font-semibold text-white leading-tight line-clamp-2">
                  {p.nombre}
                </h3>
                {p.marca && (
                  <p className="text-xs text-slate-400">{p.marca}</p>
                )}
                {p.presentacion && (
                  <p className="text-xs text-slate-500">{p.presentacion}</p>
                )}
                {mostrarPrecios && (
                  <p className="text-lg font-bold text-emerald-400">
                    {formatCurrency(p.precio_venta ?? precioVenta(p))}
                  </p>
                )}
                <a
                  href={buildWhatsAppLink(p.nombre)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-auto flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-emerald-500/15 text-emerald-300 text-xs font-semibold hover:bg-emerald-500/25 transition ring-1 ring-emerald-500/30"
                >
                  <MessageCircle className="w-4 h-4" />
                  Consultar
                </a>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
