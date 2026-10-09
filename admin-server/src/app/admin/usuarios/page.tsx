'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
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
  Pencil,
  Trash2,
  Monitor,
  Laptop,
  Layers,
} from 'lucide-react';

interface UserItem {
  id: number;
  nombre: string;
  nombre_completo?: string;
  rol: 'alumno' | 'maestro' | 'admin';
  grupo_id?: string | null;
  assigned_pc?: string | null;
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
  const [selectedGroupTab, setSelectedGroupTab] = useState('todos');
  const [showAddModal, setShowAddModal] = useState(false);

  // New user form state
  const [newNombre, setNewNombre] = useState('');
  const [newRol, setNewRol] = useState<'alumno' | 'maestro' | 'admin'>('alumno');
  const [newGrupo, setNewGrupo] = useState('');
  const [newPcMode, setNewPcMode] = useState<'any' | 'specific'>('any');
  const [newAssignedPc, setNewAssignedPc] = useState('');
  const [newPin, setNewPin] = useState('');
  const [formError, setFormError] = useState('');

  // Edit user state
  const [editingUser, setEditingUser] = useState<UserItem | null>(null);
  const [editNombre, setEditNombre] = useState('');
  const [editRol, setEditRol] = useState<'alumno' | 'maestro' | 'admin'>('alumno');
  const [editGrupo, setEditGrupo] = useState('');
  const [editPcMode, setEditPcMode] = useState<'any' | 'specific'>('any');
  const [editAssignedPc, setEditAssignedPc] = useState('');
  const [editActivo, setEditActivo] = useState(true);
  const [editPin, setEditPin] = useState('');
  const [editError, setEditError] = useState('');
  const [editLoading, setEditLoading] = useState(false);

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

  // Cálculo de grupos de alumnos y ordenamiento por 10, luego 11, luego 12
  const groupStats = useMemo(() => {
    const counts: Record<string, number> = {};
    let totalAlumnos = 0;

    users.forEach((u) => {
      if (u.rol === 'alumno') {
        totalAlumnos++;
        const g = u.grupo_id ? u.grupo_id.trim().toUpperCase() : 'SIN GRUPO';
        counts[g] = (counts[g] || 0) + 1;
      }
    });

    const sortedGroups = Object.keys(counts).sort((a, b) => {
      // Prioridad: 10 -> 11 -> 12 -> otros -> SIN GRUPO
      const getPriority = (grp: string) => {
        const clean = grp.trim();
        if (clean.startsWith('10')) return 1;
        if (clean.startsWith('11')) return 2;
        if (clean.startsWith('12')) return 3;
        if (clean === 'SIN GRUPO') return 99;
        return 10;
      };

      const pA = getPriority(a);
      const pB = getPriority(b);
      if (pA !== pB) return pA - pB;
      return a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' });
    });

    return { counts, totalAlumnos, sortedGroups };
  }, [users]);

  // Filtrado final de usuarios según búsqueda, rol y pestaña de grupo seleccionada
  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      if (selectedGroupTab !== 'todos') {
        if (u.rol !== 'alumno') return false;
        const currentGroup = u.grupo_id ? u.grupo_id.trim().toUpperCase() : 'SIN GRUPO';
        if (currentGroup !== selectedGroupTab) return false;
      }
      return true;
    });
  }, [users, selectedGroupTab]);

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

  const handleOpenEdit = (u: UserItem) => {
    setEditingUser(u);
    setEditNombre(u.nombre);
    setEditRol(u.rol);
    setEditGrupo(u.grupo_id || '');
    setEditActivo(u.activo);
    setEditPin('');
    setEditError('');

    if (u.assigned_pc && u.assigned_pc.trim() !== '') {
      setEditPcMode('specific');
      setEditAssignedPc(u.assigned_pc.trim().toUpperCase());
    } else {
      setEditPcMode('any');
      setEditAssignedPc('');
    }
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    setEditError('');
    setEditLoading(true);

    try {
      const assignedPcVal = editPcMode === 'specific' && editAssignedPc.trim()
        ? editAssignedPc.trim().toUpperCase()
        : null;

      const res = await fetch('/api/admin/users', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingUser.id,
          nombre: editNombre.trim(),
          rol: editRol,
          grupo_id: editGrupo.trim() ? editGrupo.trim().toUpperCase() : null,
          assigned_pc: assignedPcVal,
          activo: editActivo,
          pin: editPin.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setEditingUser(null);
        fetchUsers();
      } else {
        setEditError(data.error || 'Error al actualizar usuario.');
      }
    } catch (err: any) {
      setEditError(err.message || 'Error de conexión.');
    } finally {
      setEditLoading(false);
    }
  };

  const handleDeleteUser = async (u: UserItem) => {
    if (u.nombre === 'adminCM') {
      alert('No es posible eliminar al Administrador Principal (adminCM).');
      return;
    }

    if (!confirm(`¿Estás seguro de eliminar al usuario "${u.nombre}"?\nEsta acción eliminará también sus sesiones y no se puede deshacer.`)) {
      return;
    }

    try {
      const res = await fetch(`/api/admin/users?id=${u.id}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        fetchUsers();
      } else {
        const data = await res.json();
        alert(data.error || 'Error al eliminar usuario.');
      }
    } catch (err: any) {
      alert(`Error de conexión: ${err.message}`);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    try {
      const assignedPcVal = newPcMode === 'specific' && newAssignedPc.trim()
        ? newAssignedPc.trim().toUpperCase()
        : null;

      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nombre: newNombre,
          rol: newRol,
          grupo_id: newGrupo ? newGrupo.trim().toUpperCase() : null,
          assigned_pc: assignedPcVal,
          pin: newPin || undefined,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setShowAddModal(false);
        setNewNombre('');
        setNewGrupo('');
        setNewPin('');
        setNewPcMode('any');
        setNewAssignedPc('');
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
            Gestión de alumnos, profesores, grupos escolares y asignación de equipos de cómputo
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

      {/* Pestañas de Grupos Escolares (Ordenados 10, luego 11, luego 12 con badge circular) */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs text-slate-400 font-medium px-1">
          <span className="flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 text-purple-400" />
            <span>Filtrar por Grupo Escolar:</span>
          </span>
          <span className="text-[11px] text-slate-500">
            {groupStats.sortedGroups.length} grupos registrados
          </span>
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-slate-800">
          {/* Pestaña: Todos */}
          <button
            onClick={() => setSelectedGroupTab('todos')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all border ${
              selectedGroupTab === 'todos'
                ? 'bg-purple-600 text-white border-purple-500 shadow-md shadow-purple-600/20'
                : 'bg-slate-900/80 hover:bg-slate-800 text-slate-300 border-slate-800 hover:border-slate-700'
            }`}
          >
            <span>Todos los Alumnos</span>
            <span
              className={`inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full text-[11px] font-bold ${
                selectedGroupTab === 'todos'
                  ? 'bg-white/20 text-white'
                  : 'bg-slate-800 text-purple-400 border border-slate-700'
              }`}
            >
              {groupStats.totalAlumnos}
            </span>
          </button>

          {/* Pestañas de cada Grupo Escolar (10A, 10B... -> 11A... -> 12A...) */}
          {groupStats.sortedGroups.map((grp) => {
            const count = groupStats.counts[grp] || 0;
            const isSelected = selectedGroupTab === grp;

            return (
              <button
                key={grp}
                onClick={() => setSelectedGroupTab(grp)}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all border ${
                  isSelected
                    ? 'bg-purple-600 text-white border-purple-500 shadow-md shadow-purple-600/20'
                    : 'bg-slate-900/80 hover:bg-slate-800 text-slate-300 border-slate-800 hover:border-slate-700'
                }`}
              >
                <span>Grupo {grp}</span>
                <span
                  className={`inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full text-[11px] font-bold ${
                    isSelected
                      ? 'bg-white/20 text-white'
                      : 'bg-slate-800 text-purple-300 border border-slate-700'
                  }`}
                  title={`${count} alumnos en el grupo ${grp}`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Filter & Search Row */}
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
              <th className="py-3 px-3">Equipo Asignado</th>
              <th className="py-3 px-3">Sesiones</th>
              <th className="py-3 px-3">Estado</th>
              <th className="py-3 px-4 text-right">Acción</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60">
            {filteredUsers.map((u) => (
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
                <td className="py-3 px-3">
                  {u.assigned_pc && u.assigned_pc.trim() !== '' ? (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-mono font-bold bg-cyan-500/10 text-cyan-300 border border-cyan-500/30">
                      <Monitor className="w-3.5 h-3.5 text-cyan-400" />
                      <span>{u.assigned_pc}</span>
                      <span className="text-[9px] uppercase px-1 py-0.2 bg-cyan-500/20 rounded text-cyan-300 font-sans font-medium">Exclusiva</span>
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] text-slate-400 bg-slate-800/50 border border-slate-800">
                      <Laptop className="w-3 h-3 text-slate-500" />
                      <span>Cualquier PC</span>
                    </span>
                  )}
                </td>
                <td className="py-3 px-3 font-mono text-slate-400">
                  {u._count.sessions}
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
                  <div className="flex items-center justify-end gap-1.5">
                    <button
                      onClick={() => handleOpenEdit(u)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-blue-400 hover:bg-blue-500/10 transition-colors"
                      title="Editar usuario, PC asignada o grupo"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>

                    <button
                      onClick={() => handleToggleActive(u)}
                      className={`px-2 py-1 rounded-lg text-[10px] font-semibold transition-colors ${
                        u.activo
                          ? 'text-slate-400 hover:text-amber-400 hover:bg-amber-500/10'
                          : 'text-emerald-400 hover:bg-emerald-500/10'
                      }`}
                      title={u.activo ? 'Desactivar acceso temporalmente' : 'Activar acceso'}
                    >
                      {u.activo ? 'Pausar' : 'Activar'}
                    </button>

                    {u.nombre !== 'adminCM' && (
                      <button
                        onClick={() => handleDeleteUser(u)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                        title="Eliminar usuario definitivamente"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {filteredUsers.length === 0 && !loading && (
          <div className="py-12 text-center text-slate-500">
            No se encontraron usuarios coincidentes para el grupo o filtro actual.
          </div>
        )}
      </div>

      {/* Modal Edit User */}
      {editingUser && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <h2 className="text-lg font-bold text-white mb-1">Editar Usuario</h2>
            <p className="text-xs text-slate-400 mb-4">
              Modifica los datos, equipo asignado, rol o grupo escolar de <span className="text-blue-400 font-semibold">{editingUser.nombre}</span>.
            </p>

            {editError && (
              <div className="mb-3 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs">
                {editError}
              </div>
            )}

            <form onSubmit={handleSaveEdit} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">
                  Nombre Completo
                </label>
                <input
                  type="text"
                  required
                  value={editNombre}
                  onChange={(e) => setEditNombre(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">
                  Rol en el Colegio
                </label>
                <select
                  value={editRol}
                  onChange={(e) => setEditRol(e.target.value as any)}
                  className="w-full px-3.5 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
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
                  placeholder="Ej: 10A, 10C, 11A, 12D"
                  value={editGrupo}
                  onChange={(e) => setEditGrupo(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              {/* Opción de Asignación de Computadora */}
              <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-800 space-y-2">
                <label className="block text-xs font-semibold text-cyan-300 uppercase">
                  Acceso a Computadora (Restricción de Equipo)
                </label>
                
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <label className={`flex items-center gap-2 p-2 rounded-lg border cursor-pointer transition-colors ${
                    editPcMode === 'any' ? 'bg-cyan-500/10 border-cyan-500/40 text-cyan-300' : 'bg-slate-900 border-slate-800 text-slate-400'
                  }`}>
                    <input
                      type="radio"
                      name="editPcMode"
                      checked={editPcMode === 'any'}
                      onChange={() => setEditPcMode('any')}
                      className="accent-cyan-500"
                    />
                    <span>Cualquier PC</span>
                  </label>

                  <label className={`flex items-center gap-2 p-2 rounded-lg border cursor-pointer transition-colors ${
                    editPcMode === 'specific' ? 'bg-cyan-500/10 border-cyan-500/40 text-cyan-300' : 'bg-slate-900 border-slate-800 text-slate-400'
                  }`}>
                    <input
                      type="radio"
                      name="editPcMode"
                      checked={editPcMode === 'specific'}
                      onChange={() => setEditPcMode('specific')}
                      className="accent-cyan-500"
                    />
                    <span>PC Exclusiva</span>
                  </label>
                </div>

                {editPcMode === 'specific' && (
                  <div className="pt-1">
                    <input
                      type="text"
                      required={editPcMode === 'specific'}
                      placeholder="Nombre exacto del equipo (Ej: PLAB_1)"
                      value={editAssignedPc}
                      onChange={(e) => setEditAssignedPc(e.target.value.toUpperCase())}
                      className="w-full px-3 py-2 bg-slate-900 border border-cyan-500/50 rounded-lg text-white font-mono text-xs focus:outline-none focus:ring-1 focus:ring-cyan-500 placeholder-slate-600 uppercase"
                    />
                    <p className="text-[10px] text-cyan-400/80 mt-1">
                      El alumno solo podrá iniciar sesión en la computadora con este nombre de red.
                    </p>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">
                  Nuevo PIN / Contraseña (Opcional)
                </label>
                <input
                  type="password"
                  placeholder="Dejar en blanco para mantener la actual"
                  value={editPin}
                  onChange={(e) => setEditPin(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="chk-activo"
                  checked={editActivo}
                  onChange={(e) => setEditActivo(e.target.checked)}
                  className="w-4 h-4 rounded border-slate-700 text-blue-600 focus:ring-blue-500 bg-slate-950"
                />
                <label htmlFor="chk-activo" className="text-xs text-slate-300 select-none">
                  Usuario con acceso activo
                </label>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  disabled={editLoading}
                  onClick={() => setEditingUser(null)}
                  className="px-4 py-2 rounded-xl text-xs text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={editLoading}
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white transition-colors"
                >
                  {editLoading ? 'Guardando...' : 'Guardar Cambios'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Add User */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <h2 className="text-lg font-bold text-white mb-1">Registrar Nuevo Usuario</h2>
            <p className="text-xs text-slate-400 mb-4">
              Agrega un alumno o maestro de forma individual al sistema con opción de equipo asignado.
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
                  onChange={(e) => setNewRol(e.target.value as any)}
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
                  placeholder="Ej: 10A, 10B, 11A, 12C"
                  value={newGrupo}
                  onChange={(e) => setNewGrupo(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white text-xs focus:outline-none focus:ring-1 focus:ring-purple-500"
                />
              </div>

              {/* Opción de Asignación de Computadora */}
              <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-800 space-y-2">
                <label className="block text-xs font-semibold text-cyan-300 uppercase">
                  Acceso a Computadora (Restricción de Equipo)
                </label>
                
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <label className={`flex items-center gap-2 p-2 rounded-lg border cursor-pointer transition-colors ${
                    newPcMode === 'any' ? 'bg-cyan-500/10 border-cyan-500/40 text-cyan-300' : 'bg-slate-900 border-slate-800 text-slate-400'
                  }`}>
                    <input
                      type="radio"
                      name="newPcMode"
                      checked={newPcMode === 'any'}
                      onChange={() => setNewPcMode('any')}
                      className="accent-cyan-500"
                    />
                    <span>Cualquier PC</span>
                  </label>

                  <label className={`flex items-center gap-2 p-2 rounded-lg border cursor-pointer transition-colors ${
                    newPcMode === 'specific' ? 'bg-cyan-500/10 border-cyan-500/40 text-cyan-300' : 'bg-slate-900 border-slate-800 text-slate-400'
                  }`}>
                    <input
                      type="radio"
                      name="newPcMode"
                      checked={newPcMode === 'specific'}
                      onChange={() => setNewPcMode('specific')}
                      className="accent-cyan-500"
                    />
                    <span>PC Exclusiva</span>
                  </label>
                </div>

                {newPcMode === 'specific' && (
                  <div className="pt-1">
                    <input
                      type="text"
                      required={newPcMode === 'specific'}
                      placeholder="Nombre exacto del equipo (Ej: PLAB_1)"
                      value={newAssignedPc}
                      onChange={(e) => setNewAssignedPc(e.target.value.toUpperCase())}
                      className="w-full px-3 py-2 bg-slate-900 border border-cyan-500/50 rounded-lg text-white font-mono text-xs focus:outline-none focus:ring-1 focus:ring-cyan-500 placeholder-slate-600 uppercase"
                    />
                    <p className="text-[10px] text-cyan-400/80 mt-1">
                      El alumno solo podrá acceder en esta computadora asignada.
                    </p>
                  </div>
                )}
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
