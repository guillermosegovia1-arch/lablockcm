'use client';

import React from 'react';
import { LogOut } from 'lucide-react';

export default function LogoutButton() {
  const handleLogout = async () => {
    if (!confirm('¿Deseas cerrar tu sesión como Administrador?')) {
      return;
    }

    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch (err) {
      console.error('Error cerrando sesión:', err);
    } finally {
      window.location.href = '/login';
    }
  };

  return (
    <button
      type="button"
      onClick={handleLogout}
      title="Cerrar Sesión"
      className="p-1.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-slate-800 transition-colors flex items-center justify-center"
    >
      <LogOut className="w-4 h-4" />
    </button>
  );
}
