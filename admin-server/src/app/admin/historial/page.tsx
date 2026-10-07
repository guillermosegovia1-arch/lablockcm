'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  History,
  Download,
  Search,
  Filter,
  Calendar,
  Monitor,
  RefreshCw,
  FileSpreadsheet,
  CheckCircle2,
  Clock,
  AlertOctagon,
  Trash2,
} from 'lucide-react';

interface ReportRow {
  id: number;
  nombre: string;
  rol: string;
  equipo: string;
  fecha: string;
  fecha_raw: string;
  hora_entrada: string;
  hora_salida: string;
  duracion: string;
  duracion_minutos: number;
  estado: string;
}

export default function HistorialPage() {
  const [data, setData] = useState<ReportRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [rol, setRol] = useState('todos');
  const [workstation, setWorkstation] = useState('todos');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const fetchReports = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (rol !== 'todos') params.append('rol', rol);
      if (workstation !== 'todos') params.append('workstation', workstation);
      if (dateFrom) params.append('dateFrom', dateFrom);
      if (dateTo) params.append('dateTo', dateTo);

      const res = await fetch(`/api/admin/reports?${params.toString()}`);
      if (res.ok) {
        const json = await res.json();
        setData(json.sessions || []);
      }
    } catch (err) {
      console.error('Error fetching reports:', err);
    } finally {
      setLoading(false);
    }
  }, [search, rol, workstation, dateFrom, dateTo]);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  const handleExportCSV = () => {
    const params = new URLSearchParams();
    if (search) params.append('search', search);
    if (rol !== 'todos') params.append('rol', rol);
    if (workstation !== 'todos') params.append('workstation', workstation);
    if (dateFrom) params.append('dateFrom', dateFrom);
    if (dateTo) params.append('dateTo', dateTo);
    params.append('format', 'csv');

    window.open(`/api/admin/reports?${params.toString()}`, '_blank');
  };

  const handleDeleteSession = async (id: number, nombre: string) => {
    if (!confirm(`¿Estás seguro de eliminar el registro de sesión de "${nombre}"?`)) {
      return;
    }

    try {
      const res = await fetch(`/api/admin/reports?id=${id}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        setData((prev) => prev.filter((r) => r.id !== id));
      } else {
        const json = await res.json();
        alert(json.error || 'No se pudo eliminar el registro.');
      }
    } catch (err: any) {
      alert(`Error al eliminar: ${err.message}`);
    }
  };

  const totalMinutos = data.reduce((acc, row) => acc + row.duracion_minutos, 0);
  const totalHoras = (totalMinutos / 60).toFixed(1);

  return (
    <div className="p-6 md:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-3">
            <History className="w-6 h-6 text-emerald-400" />
            <span>Historial de Asistencia y Sesiones</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Registro cronológico detallado de ingresos y uso de equipos en el centro de cómputo
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchReports}
            className="flex items-center gap-2 px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium rounded-xl transition-colors border border-slate-700"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Actualizar</span>
          </button>

          <button
            onClick={handleExportCSV}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-xl shadow-md shadow-emerald-600/20 transition-all active:scale-95"
          >
            <Download className="w-4 h-4" />
            <span>Exportar CSV / Excel</span>
          </button>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="glass-panel p-4 rounded-2xl border border-slate-800">
          <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">
            Total Registros
          </p>
          <p className="text-2xl font-black text-white mt-1">{data.length}</p>
        </div>

        <div className="glass-panel p-4 rounded-2xl border border-slate-800">
          <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">
            Horas de Cómputo Acumuladas
          </p>
          <p className="text-2xl font-black text-emerald-400 mt-1">{totalHoras} hrs</p>
        </div>

        <div className="glass-panel p-4 rounded-2xl border border-slate-800">
          <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">
            Sesiones Activas
          </p>
          <p className="text-2xl font-black text-blue-400 mt-1">
            {data.filter((r) => r.estado === 'activa').length}
          </p>
        </div>

        <div className="glass-panel p-4 rounded-2xl border border-slate-800">
          <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">
            Cierres Forzados
          </p>
          <p className="text-2xl font-black text-amber-400 mt-1">
            {data.filter((r) => r.estado === 'forzada_cierre').length}
          </p>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        {/* Search */}
        <div className="lg:col-span-2 relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por Nombre o Matrícula..."
            className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          />
        </div>

        {/* Rol Selector */}
        <div>
          <select
            value={rol}
            onChange={(e) => setRol(e.target.value)}
            className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
          >
            <option value="todos">Todos los Roles</option>
            <option value="alumno">Alumnos</option>
            <option value="maestro">Maestros</option>
            <option value="admin">Administradores</option>
          </select>
        </div>

        {/* Date From */}
        <div className="relative">
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
          />
        </div>

        {/* Date To */}
        <div className="relative">
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
          />
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-2xl border border-slate-800 bg-slate-900/40">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-900/90 text-slate-400 font-semibold uppercase tracking-wider border-b border-slate-800">
            <tr>
              <th className="py-3.5 px-4">Alumno / Docente</th>
              <th className="py-3.5 px-3">Rol</th>
              <th className="py-3.5 px-3">Equipo</th>
              <th className="py-3.5 px-3">Fecha</th>
              <th className="py-3.5 px-3">Entrada</th>
              <th className="py-3.5 px-3">Salida</th>
              <th className="py-3.5 px-3">Duración</th>
              <th className="py-3.5 px-4">Estado</th>
              <th className="py-3.5 px-3 text-right">Acción</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60">
            {data.map((row) => (
              <tr key={row.id} className="hover:bg-slate-800/30 transition-colors">
                <td className="py-3 px-4 font-semibold text-white">
                  {row.nombre}
                </td>
                <td className="py-3 px-3">
                  <span
                    className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase ${
                      row.rol === 'alumno'
                        ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                        : row.rol === 'maestro'
                        ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20'
                        : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                    }`}
                  >
                    {row.rol}
                  </span>
                </td>
                <td className="py-3 px-3 font-mono text-slate-300 font-medium">
                  {row.equipo}
                </td>
                <td className="py-3 px-3 text-slate-300">
                  {row.fecha}
                </td>
                <td className="py-3 px-3 font-mono text-emerald-400">
                  {row.hora_entrada}
                </td>
                <td className="py-3 px-3 font-mono text-slate-400">
                  {row.hora_salida}
                </td>
                <td className="py-3 px-3 font-medium text-white">
                  {row.duracion}
                </td>
                <td className="py-3 px-4">
                  <span
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                      row.estado === 'activa'
                        ? 'bg-blue-500/20 text-blue-300'
                        : row.estado === 'cerrada'
                        ? 'bg-emerald-500/10 text-emerald-400'
                        : 'bg-amber-500/20 text-amber-400'
                    }`}
                  >
                    {row.estado === 'activa' && <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />}
                    {row.estado === 'cerrada' && <CheckCircle2 className="w-3 h-3 text-emerald-400" />}
                    {row.estado === 'forzada_cierre' && <AlertOctagon className="w-3 h-3 text-amber-400" />}
                    {row.estado}
                  </span>
                </td>
                <td className="py-3 px-3 text-right">
                  <button
                    onClick={() => handleDeleteSession(row.id, row.nombre)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                    title={`Eliminar registro de ${row.nombre}`}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {data.length === 0 && !loading && (
          <div className="py-12 text-center text-slate-500">
            No se encontraron registros de asistencia con los filtros seleccionados.
          </div>
        )}
      </div>
    </div>
  );
}
