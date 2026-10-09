import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'LabLock CM | Centro de Cómputo Colegio Mexicano',
  description: 'Sistema Integral de Control de Acceso, Asistencia y Bloqueo de Computadoras',
  icons: {
    icon: [
      { url: '/icon.svg', type: 'image/svg+xml' },
      { url: '/favicon.ico', sizes: 'any' },
    ],
    shortcut: '/favicon.ico',
    apple: '/apple-touch-icon.png',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" className="dark">
      <body className="bg-slate-950 text-slate-100 antialiased selection:bg-blue-600 selection:text-white">
        {children}
      </body>
    </html>
  );
}
