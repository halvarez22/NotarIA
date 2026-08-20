"use client";
import { useState } from 'react';
import { motion } from 'framer-motion';
import { designTokens } from '@/design/tokens';
import { Scale, ChevronRight, CheckCircle2 } from 'lucide-react';
import { createBrowserClient } from '@supabase/ssr';
import { useRouter } from 'next/navigation';

import Image from 'next/image';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const router = useRouter();

  // Instanciar cliente de Supabase para el navegador (con fallback para Vercel Build)
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co',
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder_key'
  );

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      console.error(error);
      setErrorMsg(error.message);
      setLoading(false);
    } else {
      router.push('/expedientes');
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className={`w-full max-w-md p-8 rounded-3xl ${designTokens.glass.base}`}
      >
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-32 h-32 rounded-xl mb-2">
            <Image src="/logo.png" alt="NotarIA Logo" width={128} height={128} className="object-contain drop-shadow-xl rounded-xl hover:scale-105 transition-transform" />
          </div>
          <p className="text-[#A8B0B7] text-lg font-medium">Soluciones Legales Inteligentes</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-6">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-[#A8B0B7] mb-2">
              Correo Institucional
            </label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={`w-full px-4 py-3 rounded-xl text-white outline-none transition-all ${designTokens.glass.input}`}
              placeholder="admin@notaria.com"
            />
          </div>
          
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-[#A8B0B7] mb-2">
              Contraseña
            </label>
            <input
              id="password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={`w-full px-4 py-3 rounded-xl text-white outline-none transition-all ${designTokens.glass.input}`}
              placeholder="••••••••"
            />
          </div>
          
          {errorMsg && <p className="text-red-400 text-sm">{errorMsg}</p>}

          <button
            type="submit"
            disabled={loading || !email || !password}
            className="w-full flex items-center justify-center py-3 px-4 rounded-xl bg-gradient-to-r from-[#B9821C] via-[#D4A43A] to-[#FFE7A0] text-[#0B0F12] font-semibold hover:shadow-[0_0_20px_rgba(212,164,58,0.4)] transition-all hover:scale-[1.02] disabled:opacity-70 disabled:hover:scale-100"
          >
            {loading ? (
              <span className="animate-pulse">Autenticando...</span>
            ) : (
              <>
                Acceder al Portal <ChevronRight className="ml-2 w-5 h-5" />
              </>
            )}
          </button>
        </form>

        <div className="mt-8 text-center text-xs text-[#A8B0B7]/60">
          <p>Plataforma exclusiva para personal autorizado.</p>
          <p>Conectado de forma segura vía Edge-to-Cloud.</p>
        </div>
      </motion.div>
    </div>
  );
}
