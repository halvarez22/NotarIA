"use client";
import { motion } from 'framer-motion';
import { FolderOpen, Search, LogOut } from 'lucide-react';
import { designTokens } from '@/design/tokens';
import { useRouter } from 'next/navigation';
import Image from 'next/image';

import { useEffect, useState } from 'react';
import { createClient } from '@/utils/supabase/client';

export default function ExpedientesGrid() {
  const router = useRouter();
  const [expedientes, setExpedientes] = useState<any[]>([]);

  useEffect(() => {
    async function fetchExpedientes() {
      const supabase = createClient();
      const { data, error } = await supabase.from('expedientes').select('*').order('created_at', { ascending: false });
      if (data) {
        setExpedientes(data);
      }
    }
    fetchExpedientes();
  }, []);

  const handleCardClick = (id: string) => {
    router.push(`/expedientes/${id}/chat`);
  };

  return (
    <div className="min-h-screen p-6 md:p-12 max-w-7xl mx-auto">
      {/* Header */}
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-12 gap-6">
        <div className="flex items-center gap-6">
          <Image src="/logo.png" alt="NotarIA Logo" width={96} height={96} className="rounded-2xl object-contain drop-shadow-xl hover:scale-105 transition-transform" />
          <div>
            <h1 className="text-4xl font-bold tracking-tight mb-2">Expedientes en <span className="text-[#D4A43A]">Nube</span></h1>
            <p className="text-[#A8B0B7] text-lg">Consultas sincronizadas en tiempo real desde el Edge Local.</p>
          </div>
        </div>
        <div className="flex items-center gap-4 w-full md:w-auto">
          <div className="relative w-full md:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#A8B0B7]" />
            <input 
              type="text" 
              placeholder="Buscar en expedientes..."
              className={`w-full pl-10 pr-4 py-2 rounded-xl text-white outline-none transition-all ${designTokens.glass.input}`}
            />
          </div>
          <button 
            onClick={() => router.push('/')}
            className={`p-2 rounded-xl text-[#A8B0B7] hover:text-[#F5F7F8] hover:bg-white/5 transition-all`}
            title="Cerrar sesión"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* Grid con perspectiva 3D al contenedor (Framer Motion) */}
      <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 ${designTokens.depth3D.container}`}>
        {expedientes.map((exp, i) => (
          <motion.div
            key={exp.id}
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1, duration: 0.5 }}
            whileHover={{ 
              rotateX: 2, 
              rotateY: -2, 
              scale: 1.02,
              translateY: -5
            }}
            onClick={() => handleCardClick(exp.id)}
            className={`cursor-pointer p-6 rounded-2xl flex flex-col justify-between min-h-[160px] ${designTokens.glass.base} hover:${designTokens.glass.glow} transition-shadow duration-300`}
          >
            <div className="flex justify-between items-start mb-4">
              <div className="p-3 rounded-lg bg-[#D4A43A]/10 border border-[#D4A43A]/20">
                <FolderOpen className="w-6 h-6 text-[#D4A43A]" />
              </div>
            </div>
            <div>
              <h3 className="font-semibold text-lg leading-tight mb-1">{exp.nombre}</h3>
              <p className="text-sm text-[#A8B0B7]">Sincronizado: {new Date(exp.created_at).toLocaleDateString()}</p>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
