import React from 'react';
import Link from 'next/link';
import { getCurrentAdmin } from '@/lib/auth';
import { redirect } from 'next/navigation';
import {
  Monitor,
  LayoutDashboard,
  History,
  FileSpreadsheet,
  Users,
  LogOut,
  ShieldCheck,
  Server,
} from 'lucide-react';

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const admin = await getCurrentAdmin();

  if (!admin) {
    redirect('/login');
  }

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col md:flex-row text-slate-100">
      {/* Sidebar Navigation */}
      <aside className="w-full md:w-64 bg-slate-900/90 border-r border-slate-800 flex flex-col justify-between shrink-0">
        <div>
          {/* Logo Header */}
          <div className="p-5 border-b border-slate-800">
            <Link href="/admin" className="flex items-center gap-3 group">
              <div className="p-2.5 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-500/20 group-hover:scale-105 transition-transform">
                <Monitor className="w-6 h-6" />
              </div>
              <div>
                <span className="font-extrabold text-lg tracking-tight text-white block">
                  LabLock <span className="text-blue-500">CM</span>
                </span>
                <span className="text-[11px] text-slate-400 block -mt-1 font-medium">
                  Colegio Mexicano
                </span>
              </div>
            </Link>
          </div>

          {/* Navigation Links */}
          <nav className="p-4 space-y-1.5">
            <div className="px-3 pb-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Módulos Principales
            </div>

            <Link
              href="/admin"
              className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium text-slate-200 hover:bg-slate-800 hover:text-white transition-all"
            >
              <LayoutDashboard className="w-4 h-4 text-blue-400" />
              <span>Dashboard en Vivo</span>
            </Link>

            <Link
              href="/admin/historial"
              className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium text-slate-200 hover:bg-slate-800 hover:text-white transition-all"
            >
              <History className="w-4 h-4 text-emerald-400" />
              <span>Historial y Reportes</span>
            </Link>

            <Link
              href="/admin/importar"
              className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium text-slate-200 hover:bg-slate-800 hover:text-white transition-all"
            >
              <FileSpreadsheet className="w-4 h-4 text-amber-400" />
              <span>Carga Masiva Excel</span>
            </Link>

            <Link
              href="/admin/usuarios"
              className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium text-slate-200 hover:bg-slate-800 hover:text-white transition-all"
            >
              <Users className="w-4 h-4 text-purple-400" />
              <span>Directorio Alumnos/Maestros</span>
            </Link>
          </nav>
        </div>

        {/* User Card & Logout */}
        <div className="p-4 border-t border-slate-800 bg-slate-900/40">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5 overflow-hidden">
              <div className="w-8 h-8 rounded-lg bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400 shrink-0">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <div className="truncate">
                <p className="text-xs font-semibold text-white truncate">
                  {admin.nombre}
                </p>
                <p className="text-[10px] text-blue-400 font-medium uppercase">
                  {admin.rol}
                </p>
              </div>
            </div>

            <form action="/api/auth/logout" method="POST">
              <button
                type="submit"
                title="Cerrar Sesión"
                className="p-1.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-slate-800 transition-colors"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </form>
          </div>
        </div>
      </aside>

      {/* Main Content Viewport */}
      <main className="flex-1 overflow-y-auto max-h-screen">
        {children}
      </main>
    </div>
  );
}
