import { useEffect, useState } from 'react';
import { MessageCircle, Search, Loader2 } from 'lucide-react';
import { getSupabase } from '@/lib/supabase';

interface ClienteTelefono {
  id: string;
  nombre: string;
  telefono: string | null;
}

const WHATSAPP_NUMBER = import.meta.env.VITE_WHATSAPP_NUMBER ?? '50588888888';

export default function MarketingPage() {
  const [mensaje, setMensaje] = useState('');
  const [clientes, setClientes] = useState<ClienteTelefono[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');

  useEffect(() => {
    loadClientes();
  }, []);

  const loadClientes = async () => {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from('clientes')
      .select('id, nombre, telefono')
      .not('telefono', 'is', null)
      .order('nombre', { ascending: true });
    if (error) {
      setError(error.message);
    } else {
      setClientes((data ?? []) as ClienteTelefono[]);
    }
    setLoading(false);
  };

  const sanitizePhone = (phone: string): string => {
    return phone.replace(/[^0-9]/g, '');
  };

  const buildWhatsAppLink = (phone: string): string => {
    const clean = sanitizePhone(phone);
    const text = encodeURIComponent(mensaje.trim() || 'Hola, tenemos una oferta especial para ti en MJ & Elegance');
    return `https://wa.me/${clean}?text=${text}`;
  };

  const filtered = clientes.filter((c) => {
    const q = search.toLowerCase();
    return (
      c.nombre.toLowerCase().includes(q) ||
      (c.telefono ?? '').includes(q)
    );
  });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-white mb-1">Marketing</h2>
        <p className="text-slate-400 text-sm">
          Envía anuncios por WhatsApp a tus clientes de forma individual
        </p>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-sm">
          {error}
        </div>
      )}

      <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-5">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 ring-1 ring-emerald-500/30 flex items-center justify-center">
            <MessageCircle className="w-5 h-5 text-emerald-400" />
          </div>
          <div>
            <p className="text-sm font-semibold text-white">
              Clientes con teléfono
            </p>
            <p className="text-xs text-slate-400">
              {clientes.length} cliente(s) disponibles para enviar el anuncio
            </p>
          </div>
        </div>
      </div>

      <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-6 space-y-5">
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-1.5">
            Anuncio
          </label>
          <textarea
            value={mensaje}
            onChange={(e) => setMensaje(e.target.value)}
            placeholder="Escribe aquí el mensaje que quieres enviar a tus clientes..."
            rows={5}
            className="w-full px-4 py-3 rounded-xl bg-slate-900/60 border border-slate-700 text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition text-sm resize-y"
          />
          <p className="mt-1.5 text-xs text-slate-500">
            Al presionar "Enviar por WhatsApp" se abrirá WhatsApp Web con el
            mensaje prellenado para cada cliente. Debes enviarlo manualmente.
          </p>
        </div>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar cliente por nombre o teléfono..."
          className="w-full pl-11 pr-4 py-2.5 rounded-xl bg-slate-800/50 border border-slate-700 text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition text-sm"
        />
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-emerald-400" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <MessageCircle className="w-12 h-12 text-slate-600 mb-3" />
          <p className="text-slate-400 text-sm">
            {search
              ? 'No se encontraron clientes'
              : 'No hay clientes con teléfono registrado.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((c) => (
            <div
              key={c.id}
              className="bg-slate-800/50 border border-slate-700 rounded-2xl p-5 hover:border-slate-600 transition flex items-center justify-between gap-3"
            >
              <div className="min-w-0">
                <h4 className="text-sm font-semibold text-white truncate">
                  {c.nombre}
                </h4>
                <p className="text-xs text-slate-500 mt-0.5">
                  {c.telefono}
                </p>
              </div>
              <a
                href={buildWhatsAppLink(c.telefono ?? '')}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-shrink-0 flex items-center gap-2 px-3 py-2 rounded-lg bg-emerald-500/15 text-emerald-300 text-xs font-semibold hover:bg-emerald-500/25 transition ring-1 ring-emerald-500/30"
              >
                <MessageCircle className="w-4 h-4" />
                Enviar
              </a>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
