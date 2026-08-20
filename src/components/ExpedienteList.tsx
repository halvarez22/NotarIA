import React, { useState } from 'react';
import { ExpedienteRecord } from '../types/api';

interface ExpedienteListProps {
  expedientes: ExpedienteRecord[];
  isLoading: boolean;
  error: string | null;
  onSelect: (id: string) => void;
  onCreate: (nombre: string) => Promise<void>;
  onRename: (id: string, nombre: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

export function ExpedienteList({ expedientes, isLoading, error, onSelect, onCreate, onRename, onDelete }: ExpedienteListProps) {
  const [isCreating, setIsCreating] = useState(false);
  const [newNombre, setNewNombre] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editNombre, setEditNombre] = useState('');

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNombre.trim()) return;
    await onCreate(newNombre);
    setNewNombre('');
    setIsCreating(false);
  };

  const handleRename = async (e: React.FormEvent, id: string) => {
    e.preventDefault();
    if (!editNombre.trim()) return;
    await onRename(id, editNombre);
    setEditingId(null);
  };

  if (isLoading) {
    return <div className="text-gray-400 p-8 text-center animate-pulse">Cargando expedientes...</div>;
  }

  if (error) {
    return <div className="text-red-400 p-8 text-center bg-red-900/20 rounded m-4">{error}</div>;
  }

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-brand-gold mb-2">Mis Expedientes</h1>
          <p className="text-gray-400">Gestiona tus agrupaciones de documentos locales.</p>
        </div>
        <button 
          onClick={() => setIsCreating(true)}
          className="bg-brand-gold hover:bg-yellow-500 text-brand-darkest font-bold py-2 px-4 rounded transition-colors shadow flex items-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"/></svg>
          Nuevo Expediente
        </button>
      </div>

      {isCreating && (
        <form onSubmit={handleCreate} className="mb-6 p-4 bg-brand-dark border border-brand-medium rounded flex gap-4">
          <input 
            autoFocus
            type="text" 
            placeholder="Nombre del expediente..."
            value={newNombre}
            onChange={e => setNewNombre(e.target.value)}
            className="flex-1 bg-brand-darkest border border-gray-600 rounded px-3 py-2 text-white focus:outline-none focus:border-brand-gold"
          />
          <button type="submit" className="bg-green-600 hover:bg-green-500 text-white px-4 py-2 rounded">Crear</button>
          <button type="button" onClick={() => setIsCreating(false)} className="bg-gray-600 hover:bg-gray-500 text-white px-4 py-2 rounded">Cancelar</button>
        </form>
      )}

      {expedientes.length === 0 && !isCreating && (
         <div className="text-center p-12 border-2 border-dashed border-gray-700 rounded-xl">
           <p className="text-gray-500 text-lg">No tienes expedientes creados aún.</p>
         </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {expedientes.map(exp => (
          <div key={exp.id} className="bg-brand-dark border border-brand-medium rounded-xl p-5 hover:border-brand-gold transition-colors flex flex-col group">
            {editingId === exp.id ? (
              <form onSubmit={(e) => handleRename(e, exp.id)} className="flex gap-2 mb-3">
                 <input 
                  autoFocus
                  type="text" 
                  value={editNombre}
                  onChange={e => setEditNombre(e.target.value)}
                  className="w-full bg-brand-darkest border border-gray-600 rounded px-2 py-1 text-white focus:outline-none"
                />
                <button type="submit" className="text-green-400 hover:text-green-300">✔</button>
                <button type="button" onClick={() => setEditingId(null)} className="text-gray-400 hover:text-gray-300">✖</button>
              </form>
            ) : (
              <div className="flex justify-between items-start mb-3">
                <h3 className="text-xl font-bold text-gray-100 truncate cursor-pointer" onClick={() => onSelect(exp.id)} title={exp.nombre}>{exp.nombre}</h3>
                <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => { setEditingId(exp.id); setEditNombre(exp.nombre); }} className="text-gray-400 hover:text-blue-400" title="Renombrar">
                    ✏️
                  </button>
                  <button onClick={() => { if(window.confirm('¿Seguro que deseas eliminar este expediente y todos sus documentos?')) onDelete(exp.id); }} className="text-gray-400 hover:text-red-400" title="Eliminar">
                    🗑️
                  </button>
                </div>
              </div>
            )}
            
            <div className="text-sm text-gray-400 mb-4 flex-1 cursor-pointer" onClick={() => onSelect(exp.id)}>
              Creado: {new Date(exp.created_at).toLocaleDateString()}
            </div>
            
            <div className="flex justify-between items-center pt-3 border-t border-gray-700 cursor-pointer" onClick={() => onSelect(exp.id)}>
              <span className="text-sm bg-gray-800 text-gray-300 px-2 py-1 rounded">
                📄 {exp.doc_count} docs
              </span>
              <span className={`text-xs px-2 py-1 rounded flex items-center gap-1 ${exp.sync_status === 'pending' ? 'bg-yellow-900/50 text-yellow-500' : 'bg-green-900/50 text-green-500'}`}>
                {exp.sync_status === 'pending' ? '⚪ Pendiente Sync' : '🟢 Sincronizado'}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
