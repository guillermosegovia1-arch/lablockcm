'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Users,
  UserPlus,
  Search,
  CheckCircle2,
  XCircle,
  Shield,
  GraduationCap,
  Briefcase,
  RefreshCw,
} from 'lucide-react';

interface UserItem {
  id: number;
  nombre: string;
  nombre_completo?: string;
  rol: 'alumno' | 'maestro' | 'admin';
  grupo_id?: string | null;
  activo: boolean;
  createdAt: string;
  _count: {
    sessions: number;
  };
}

export default function UsuariosPage() {
  const [users, setUsers] = useState<UserItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [rolFilter, setRolFilter] = useState('todos');
  const [showAddModal, setShowAddModal] = useState(false);

  // New user form state
  const [newNombre, setNewNombre] = useState('');
  const [newRol, setNewRol] = useState('alumno');
  const [newGrupo, setNewGrupo] = useState('');
  const [newPin, setNewPin] = useState('');
  const [formError, setFormError] = useState('');

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (rolFilter !== 'todos') params.append('rol', rolFilter);

      const res = await fetch(`/api/admin/users?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setUsers(data.users || []);
      }
    } catch (err) {
      console.error('Error fetching users:', err);
    } finally {
      setLoading(false);
    }
  }, [search, rolFilter]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleToggleActive = async (u: UserItem) => {
    try {
      const res = await fetch('/api/admin/users', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: u.id, activo: !u.activo }),
      });

      if (res.ok) {
        fetchUsers();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nombre: newNombre,
          rol: newRol,
          grupo_id: newGrupo ? newGrupo.trim() : null,
          pin: newPin || undefined,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setShowAddModal(false);
        setNewNombre('');
        setNewGrupo('');
        setNewPin('');
        fetchUsers();
      } else {
        setFormError(data.error || 'Error al crear usuario.');
      }
    } catch (err: any) {
      setFormError(err.message);
    }
  };

  return (
    <div className="p-6 md:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-3">
            <Users className="w-6 h-6 text-purple-400" />
            <span>Directorio de Usuarios y Alumnos</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Gestión de alumnos, profesores y personal de soporte técnico
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchUsers}
            className="flex items-center gap-2 px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium rounded-xl border border-slate-700 transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Actualizar</span>
          </button>

          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold rounded-xl shadow-md shadow-purple-600/20 transition-all active:scale-95"
          >
            <UserPlus className="w-4 h-4" />
            <span>Nuevo Usuario</span>
          </button>
        </div>
      </div>

      {/* Filter Row */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1 relative">
          <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por Nombre Completo..."
            className="w-full pl-10 pr-4 py-2.5 bg-slate-900/80 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
          />
        </div>

        <select
          value={rolFilter}
          onChange={(e) => setRolFilter(e.target.value)}
          className="px-4 py-2.5 bg-slate-900/80 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:ring-1 focus:ring-purple-500"
        >
          <option value="todos">Todos los Roles</option>
          <option value="alumno">Alumnos</option>
          <option value="maestro">Maestros</option>
          <option value="admin">Administradores</option>
        </select>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-2xl border border-slate-800 bg-slate-900/40">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-900/90 text-slate-400 font-semibold uppercase tracking-wider border-b border-slate-800">
            <tr>
              <th className="py-3 px-4">Nombre</th>
              <th className="py-3 px-3">Rol</th>
              <th className="py-3 px-3">Grupo</th>
              <th className="py-3 px-3">Sesiones Registradas</th>
              <th className="py-3 px-3">Estado</th>
              <th className="py-3 px-4 text-right">Acción</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60">
            {users.map((u) => (
              <tr key={u.id} className="hover:bg-slate-800/30 transition-colors">
                <td className="py-3 px-4 font-semibold text-white">
                  <div className="flex items-center gap-2">
                    {u.rol === 'admin' ? (
                      <Shield className="w-3.5 h-3.5 text-amber-400" />
                    ) : u.rol === 'maestro' ? (
                      <Briefcase className="w-3.5 h-3.5 text-purple-400" />
                    ) : (
                      <GraduationCap className="w-3.5 h-3.5 text-blue-400" />
                    )}
                    <span>{u.nombre || u.nombre_completo}</span>
                  </div>
                </td>
                <td className="py-3 px-3">
                  <span
                    className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase ${
                      u.rol === 'alumno'
                        ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                        : u.rol === 'maestro'
                        ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20'
                        : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                    }`}
                  >
                    {u.rol}
                  </span>
                </td>
                <td className="py-3 px-3">
                  {u.grupo_id ? (
                    <span className="inline-block px-2.5 py-0.5 rounded-md text-[11px] font-semibold bg-slate-800 text-slate-200 border border-slate-700">
                      {u.grupo_id}
                    </span>
                  ) : (
                    <span className="text-slate-500 text-xs">---</span>
                  )}
                </td>
                <td className="py-3 px-3 font-mono text-slate-400">
                  {u._count.sessions} sesiones
                </td>
                <td className="py-3 px-3">
                  <span
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                      u.activo
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                        : 'bg-red-500/10 text-red-400 border border-red-500/20'
                    }`}
                  >
                    {u.activo ? (
                      <>
                        <CheckCircle2 className="w-3 h-3" />
                        <span>Activo</span>
                      </>
                    ) : (
                      <>
                        <XCircle className="w-3 h-3" />
                        <span>Inactivo</span>
                      </>
                    )}
                  </span>
                </td>
                <td className="py-3 px-4 text-right">
                  <button
                    onClick={() => handleToggleActive(u)}
                    className="text-[11px] underline text-slate-400 hover:text-white"
                  >
                    {u.activo ? 'Desactivar' : 'Activar'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {users.length === 0 && !loading && (
          <div className="py-12 text-center text-slate-500">
            No se encontraron usuarios coincidentes.
          </div>
        )}
      </div>

      {/* Modal Add User */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <h2 className="text-lg font-bold text-white mb-1">Registrar Nuevo Usuario</h2>
            <p className="text-xs text-slate-400 mb-4">
              Agrega un alumno o maestro de forma individual al sistema.
            </p>

            {formError && (
              <div className="mb-3 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs">
                {formError}
              </div>
            )}

            <form onSubmit={handleCreateUser} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">
                  Nombre Completo
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Juan Antonio Garza Morales"
                  value={newNombre}
                  onChange={(e) => setNewNombre(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white text-xs focus:outline-none focus:ring-1 focus:ring-purple-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">
                  Rol en el Colegio
                </label>
                <select
                  value={newRol}
                  onChange={(e) => setNewRol(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white text-xs focus:outline-none focus:ring-1 focus:ring-purple-500"
                >
                  <option value="alumno">Alumno</option>
                  <option value="maestro">Maestro / Docente</option>
                  <option value="admin">Administrador / Soporte</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">
                  Grupo Escolar (grupo_id)
                </label>
                <input
                  type="text"
                  placeholder="Ej: 1A, 2B, 3-Secundaria, Sistemas"
                  value={newGrupo}
                  onChange={(e) => setNewGrupo(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white text-xs focus:outline-none focus:ring-1 focus:ring-purple-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">
                  PIN o Contraseña (Solo para Docentes / Admin)
                </label>
                <input
                  type="password"
                  placeholder="Ej: 1234"
                  value={newPin}
                  onChange={(e) => setNewPin(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white text-xs focus:outline-none focus:ring-1 focus:ring-purple-500"
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
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-purple-600 hover:bg-purple-500 text-white transition-colors"
                >
                  Guardar Usuario
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
