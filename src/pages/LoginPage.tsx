import { useState } from 'react';
import { Mail, Lock, Loader2, AlertCircle, LogIn } from 'lucide-react';
import { getSupabase } from '@/lib/supabase';

interface LoginPageProps {
  onSuccess: () => void;
}

export default function LoginPage({ onSuccess }: LoginPageProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const supabase = getSupabase();

    try {
      const { data, error: signInError } =
        await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
      if (signInError) {
        setError('Correo o contraseña incorrectos.');
      } else if (data.user) {
        onSuccess();
      } else {
        setError('No se pudo iniciar sesión.');
      }
    } catch {
      setError('Error de conexión. Intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <div className="flex items-center justify-center mb-5">
            <img
              src="/image_bc8828f9.png"
              alt="MJ & Elegance"
              className="w-40 h-40 object-contain rounded-2xl ring-1 ring-amber-400/30 shadow-lg shadow-amber-500/10"
            />
          </div>
          <h1 className="text-2xl font-bold text-white mb-1 tracking-tight">
            MJ &amp; Elegance
          </h1>
          <p className="text-slate-400 text-sm">
            Inicia sesión para acceder al sistema
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="bg-slate-800/50 border border-slate-700 rounded-2xl p-6 sm:p-8 space-y-5 backdrop-blur"
        >
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-slate-300 mb-2">
              <Mail className="w-4 h-4 text-emerald-400" />
              Correo electrónico
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="correo@ejemplo.com"
              required
              className="w-full px-4 py-3 rounded-xl bg-slate-900/60 border border-slate-700 text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition"
            />
          </div>

          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-slate-300 mb-2">
              <Lock className="w-4 h-4 text-emerald-400" />
              Contraseña
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Mínimo 6 caracteres"
              required
              minLength={6}
              className="w-full px-4 py-3 rounded-xl bg-slate-900/60 border border-slate-700 text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition"
            />
          </div>

          {error && (
            <div className="flex items-start gap-3 p-4 rounded-xl bg-red-500/10 border border-red-500/30">
              <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-300">{error}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-emerald-500 text-white font-semibold hover:bg-emerald-400 disabled:opacity-60 disabled:cursor-not-allowed transition shadow-lg shadow-emerald-500/20"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Procesando...
              </>
            ) : (
              <>
                <LogIn className="w-5 h-5" />
                Iniciar sesión
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
