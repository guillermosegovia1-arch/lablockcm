'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Monitor,
  RefreshCw,
  PowerOff,
  Lock,
  Unlock,
  Clock,
  User,
  Plus,
  Wifi,
  WifiOff,
  CheckCircle2,
  AlertTriangle,
  Search,
} from 'lucide-react';

interface WorkstationData {
  id: number;
  machine_name: string;
  ip_address: string;
  estado: 'disponible' | 'en_uso' | 'bloqueado';
  ultimo_ping: string;
  is_online: boolean;
  active_session: {
    id: number;
    hora_inicio: string;
    elapsed_minutes: number;
    user: {
      id: number;
      nombre: string;
      nombre_completo?: string;
      rol: string;
      grupo_id?: string | null;
    };
  } | null;
}

export default function DashboardPage() {
  const [workstations, setWorkstations] = useState<WorkstationData[]>([]);
  const [loading, setLoading] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [actionLoading, setActionLoading] = useState<number | null>(null);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [searchFilter, setSearchFilter] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [newPcName, setNewPcName] = useState('');
  const [newPcIp, setNewPcIp] = useState('');

  const fetchWorkstations = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/workstations');
      if (res.ok) {
        const data = await res.json();
        setWorkstations(data.workstations || []);
        setLastUpdated(new Date());
      }
    } catch (err) {
      console.error('Error fetching workstations:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchWorkstations();

    if (!autoRefresh) return;
    const interval = setInterval(fetchWorkstations, 4000);
    return () => clearInterval(interval);
  }, [autoRefresh, fetchWorkstations]);

  const handleForceClose = async (ws: WorkstationData) => {
    if (!confirm(`¿Estás seguro de forzar el cierre de sesión en ${ws.machine_name}?`)) {
      return;
    }

    setActionLoading(ws.id);
    try {
      const res = await fetch(`/api/admin/workstations/${ws.id}/force-close`, {
        method: 'POST',
      });
      const data = await res.json();
      if (res.ok) {
        setMessage({ text: `Sesión finalizada en ${ws.machine_name}`, type: 'success' });
        fetchWorkstations();
      } else {
        setMessage({ text: data.error || 'Error al forzar cierre', type: 'error' });
      }
    } catch (err: any) {
      setMessage({ text: err.message, type: 'error' });
    } finally {
      setActionLoading(null);
      setTimeout(() => setMessage(null), 4000);
    }
  };

  const handleToggleBlock = async (ws: WorkstationData) => {
    const action = ws.estado === 'bloqueado' ? 'desbloquear' : 'bloquear';
    if (!confirm(`¿Deseas ${action} el equipo ${ws.machine_name}?`)) {
      return;
    }

    setActionLoading(ws.id);
    try {
      const res = await fetch(`/api/admin/workstations/${ws.id}/toggle-block`, {
        method: 'POST',
      });
      const data = await res.json();
      if (res.ok) {
        setMessage({ text: data.message, type: 'success' });
        fetchWorkstations();
      } else {
        setMessage({ text: data.error || 'Error al alternar bloqueo', type: 'error' });
      }
    } catch (err: any) {
      setMessage({ text: err.message, type: 'error' });
    } finally {
      setActionLoading(null);
      setTimeout(() => setMessage(null), 4000);
    }
  };

  const handleCreateWorkstation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPcName) return;

    try {
      const res = await fetch('/api/admin/workstations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          machine_name: newPcName,
          ip_address: newPcIp || '192.168.1.100',
        }),
      });

      if (res.ok) {
        setShowAddModal(false);
        setNewPcName('');
        setNewPcIp('');
        setMessage({ text: 'Equipo registrado con éxito.', type: 'success' });
        fetchWorkstations();
      }
    } catch (err: any) {
      alert('Error: ' + err.message);
    }
  };

  // Filtrado de búsqueda
  const filteredWorkstations = workstations.filter((ws) => {
    const query = searchFilter.toLowerCase();
    const pcMatch = ws.machine_name.toLowerCase().includes(query);
    const userName = ws.active_session?.user.nombre || ws.active_session?.user.nombre_completo || '';
    const userMatch = userName.toLowerCase().includes(query);
    const grupoMatch = ws.active_session?.user.grupo_id?.toLowerCase().includes(query) || false;
    return pcMatch || userMatch || grupoMatch;
  });

  const total = workstations.length;
  const enUso = workstations.filter((w) => w.estado === 'en_uso').length;
  const libres = workstations.filter((w) => w.estado === 'disponible').length;
  const bloqueados = workstations.filter((w) => w.estado === 'bloqueado').length;

  return (
    <div className="p-6 md:p-8 space-y-6">
      {/* Top Banner / Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-3">
            <span>Laboratorio de Cómputo</span>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 font-medium">
              En Vivo
            </span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Supervisión y control de terminales de Windows en tiempo real
          </p>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-xl text-xs text-slate-300">
            <span
              className={`w-2 h-2 rounded-full ${
                autoRefresh ? 'bg-emerald-500 animate-pulse' : 'bg-slate-500'
              }`}
            />
            <span>Auto-sync {autoRefresh ? '4s' : 'pausado'}</span>
            <button
              onClick={() => setAutoRefresh(!autoRefresh)}
              className="text-[11px] underline text-blue-400 hover:text-blue-300 ml-1"
            >
              {autoRefresh ? 'Pausar' : 'Activar'}
            </button>
          </div>

          <button
            onClick={fetchWorkstations}
            className="flex items-center gap-2 px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium rounded-xl transition-colors border border-slate-700"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refrescar</span>
          </button>

          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 px-3.5 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium rounded-xl transition-all shadow-md shadow-blue-600/20"
          >
            <Plus className="w-4 h-4" />
            <span>Agregar Equipo</span>
          </button>
        </div>
      </div>

      {/* Alert toast */}
      {message && (
        <div
          className={`p-3 rounded-xl border text-sm flex items-center gap-3 ${
            message.type === 'success'
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
              : 'bg-red-500/10 border-red-500/30 text-red-400'
          }`}
        >
          {message.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 shrink-0" />
          ) : (
            <AlertTriangle className="w-4 h-4 shrink-0" />
          )}
          <span>{message.text}</span>
        </div>
      )}

      {/* Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="glass-panel p-4 rounded-2xl border border-slate-800">
          <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">
            Total Equipos
          </p>
          <div className="flex items-baseline justify-between mt-2">
            <span className="text-2xl font-black text-white">{total}</span>
            <Monitor className="w-5 h-5 text-slate-500" />
          </div>
        </div>

        <div className="glass-panel p-4 rounded-2xl border border-blue-500/20 bg-blue-950/20">
          <p className="text-xs font-medium text-blue-400 uppercase tracking-wider">
            En Uso (Ocupadas)
          </p>
          <div className="flex items-baseline justify-between mt-2">
            <span className="text-2xl font-black text-blue-400">{enUso}</span>
            <span className="flex h-3 w-3 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-blue-500"></span>
            </span>
          </div>
        </div>

        <div className="glass-panel p-4 rounded-2xl border border-emerald-500/20 bg-emerald-950/20">
          <p className="text-xs font-medium text-emerald-400 uppercase tracking-wider">
            Disponibles (Libres)
          </p>
          <div className="flex items-baseline justify-between mt-2">
            <span className="text-2xl font-black text-emerald-400">{libres}</span>
            <CheckCircle2 className="w-5 h-5 text-emerald-500/50" />
          </div>
        </div>

        <div className="glass-panel p-4 rounded-2xl border border-amber-500/20 bg-amber-950/20">
          <p className="text-xs font-medium text-amber-400 uppercase tracking-wider">
            Bloqueados / Offline
          </p>
          <div className="flex items-baseline justify-between mt-2">
            <span className="text-2xl font-black text-amber-400">{bloqueados}</span>
            <Lock className="w-5 h-5 text-amber-500/50" />
          </div>
        </div>
      </div>

      {/* Filter / Search Bar */}
      <div className="relative">
        <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          value={searchFilter}
          onChange={(e) => setSearchFilter(e.target.value)}
          placeholder="Buscar por equipo (LAB-PC-01) o alumno (Nombre o Matrícula)..."
          className="w-full pl-10 pr-4 py-2.5 bg-slate-900/80 border border-slate-800 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
        />
      </div>

      {/* Workstations Grid Map */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {filteredWorkstations.map((ws) => {
          const isEnUso = ws.estado === 'en_uso' && ws.active_session;
          const isBloqueado = ws.estado === 'bloqueado';
          const session = ws.active_session;

          return (
            <div
              key={ws.id}
              className={`rounded-2xl border p-4 transition-all duration-200 flex flex-col justify-between ${
                isEnUso
                  ? 'bg-blue-950/30 border-blue-500/40 shadow-lg shadow-blue-900/10'
                  : isBloqueado
                  ? 'bg-amber-950/20 border-amber-500/30'
                  : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
              }`}
            >
              {/* Card Header */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div
                      className={`p-2 rounded-xl ${
                        isEnUso
                          ? 'bg-blue-500/20 text-blue-400'
                          : isBloqueado
                          ? 'bg-amber-500/20 text-amber-400'
                          : 'bg-emerald-500/20 text-emerald-400'
                      }`}
                    >
                      <Monitor className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="font-bold text-sm text-white">{ws.machine_name}</h3>
                      <p className="text-[10px] text-slate-500 font-mono">{ws.ip_address}</p>
                    </div>
                  </div>

                  {/* Status Indicator */}
                  <div className="flex items-center gap-1.5">
                    {ws.is_online ? (
                      <span title="En línea"><Wifi className="w-3.5 h-3.5 text-emerald-400" /></span>
                    ) : (
                      <span title="Offline / Sin ping"><WifiOff className="w-3.5 h-3.5 text-slate-500" /></span>
                    )}
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                        isEnUso
                          ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                          : isBloqueado
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                          : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                      }`}
                    >
                      {ws.estado.replace('_', ' ')}
                    </span>
                  </div>
                </div>

                {/* Session / User Information */}
                {isEnUso && session ? (
                  <div className="p-3 rounded-xl bg-slate-900/80 border border-blue-500/20 space-y-2 mb-3">
                    <div className="flex items-start gap-2">
                      <User className="w-4 h-4 text-blue-400 mt-0.5 shrink-0" />
                      <div className="overflow-hidden w-full">
                        <p className="text-xs font-semibold text-white truncate">
                          {session.user.nombre || session.user.nombre_completo}
                        </p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-[10px] text-blue-400 font-mono capitalize">
                            {session.user.rol}
                          </span>
                          {session.user.grupo_id && (
                            <span className="text-[10px] bg-slate-800 text-slate-300 px-1.5 py-0.2 rounded border border-slate-700">
                              Grupo: {session.user.grupo_id}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-1 border-t border-slate-800 text-[11px] text-slate-400">
                      <div className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-blue-400" />
                        <span>Transcurrido:</span>
                      </div>
                      <span className="font-mono font-bold text-white bg-blue-900/40 px-1.5 py-0.5 rounded">
                        {session.elapsed_minutes} min
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="py-4 text-center text-xs text-slate-500 italic">
                    {isBloqueado ? 'Terminal Bloqueada por Administración' : 'Equipo libre esperando usuario'}
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="pt-3 border-t border-slate-800/80 flex items-center gap-2">
                {isEnUso ? (
                  <button
                    onClick={() => handleForceClose(ws)}
                    disabled={actionLoading === ws.id}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-xl bg-red-600/10 hover:bg-red-600/20 text-red-400 border border-red-500/20 text-xs font-medium transition-all active:scale-95 disabled:opacity-50"
                  >
                    <PowerOff className="w-3.5 h-3.5" />
                    <span>Forzar Cierre</span>
                  </button>
                ) : null}

                <button
                  onClick={() => handleToggleBlock(ws)}
                  disabled={actionLoading === ws.id}
                  title={isBloqueado ? 'Desbloquear equipo' : 'Bloquear equipo'}
                  className={`py-2 px-3 rounded-xl border text-xs font-medium flex items-center justify-center gap-1 transition-all ${
                    isBloqueado
                      ? 'bg-emerald-600/10 border-emerald-500/20 text-emerald-400 hover:bg-emerald-600/20'
                      : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'
                  } ${!isEnUso ? 'w-full' : ''}`}
                >
                  {isBloqueado ? (
                    <>
                      <Unlock className="w-3.5 h-3.5" />
                      <span>Habilitar</span>
                    </>
                  ) : (
                    <>
                      <Lock className="w-3.5 h-3.5 text-slate-400" />
                      <span>{isEnUso ? '' : 'Bloquear'}</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {filteredWorkstations.length === 0 && !loading && (
        <div className="text-center py-16 bg-slate-900/30 rounded-2xl border border-slate-800">
          <Monitor className="w-10 h-10 text-slate-600 mx-auto mb-2" />
          <p className="text-slate-400 text-sm">No se encontraron equipos registrados o coincidentes.</p>
        </div>
      )}

      {/* Modal Add Workstation */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <h2 className="text-lg font-bold text-white mb-1">Registrar Nueva Computadora</h2>
            <p className="text-xs text-slate-400 mb-4">
              Agrega manualmente el nombre de red Windows de la estación.
            </p>

            <form onSubmit={handleCreateWorkstation} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">
                  Nombre de Equipo (Hostname Windows)
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej: LAB-PC-11 o DESKTOP-X4F"
                  value={newPcName}
                  onChange={(e) => setNewPcName(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 uppercase font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">
                  Dirección IP Local (Opcional)
                </label>
                <input
                  type="text"
                  placeholder="192.168.1.111"
                  value={newPcIp}
                  onChange={(e) => setNewPcIp(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl text-xs text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white transition-colors"
                >
                  Guardar Equipo
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
