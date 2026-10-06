# 🏫 LabLock CM - Sistema de Control de Acceso, Asistencia y Bloqueo

**LabLock CM** es un sistema integral cliente-servidor desarrollado para el centro de cómputo del **Colegio Mexicano**. Permite la administración remota de terminales Windows, control estricto de asistencia de alumnos y docentes por **Nombre Completo**, prevención de sesiones simultáneas y bloqueo de seguridad en modo kiosco.

---

## 📁 Estructura del Monorepo

```
LabLockCM/
├── admin-server/                   # Backend API y Panel Web de Administración (Next.js 14)
│   ├── prisma/
│   │   ├── schema.prisma           # Modelos para PostgreSQL / Neon.tech (Users, Workstations, Sessions)
│   │   └── seed.js                 # Sembrado únicamente con adminCM / admin123456
│   ├── src/
│   │   ├── app/
│   │   │   ├── admin/              # Dashboard en vivo, Historial, Carga Masiva, Directorio
│   │   │   ├── api/                # API REST: auth, sesiones, sync, reportes, importación
│   │   │   └── login/              # Portal de acceso administrativo (adminCM)
│   │   └── lib/                    # Helpers: Prisma Client, JWT Auth
│   ├── package.json
│   └── .env.example                # Plantilla de variables para Neon.tech
│
├── client-lock/                    # Cliente de Escritorio para Windows (Electron)
│   ├── src/
│   │   ├── main/main.js            # Proceso principal: kiosco, bloqueo de atajos, bandeja del sistema
│   │   ├── preload/preload.js      # Puente IPC seguro y detección de hostname/IP
│   │   └── renderer/               # Interfaz visual de bloqueo (HTML5, CSS3, JS)
│   │       ├── index.html          # Pantalla de bienvenida y validación de Nombre Completo
│   │       ├── widget.html         # Barra flotante ("Cerrar Sesión al terminar mi clase")
│   │       └── js/app.js           # Lógica cliente y conexión con la API
│   ├── electron-builder.json       # Configuración para compilar instalador Windows (.exe)
│   └── package.json
│
├── docs/
│   ├── GUIA_DESPLIEGUE_NEON_CLOUDFLARE_WINDOWS.md # Despliegue en Neon, Cloudflare y Windows
│   └── GUIA_INSTALACION_WINDOWS.md                # Configuración de políticas y seguridad local
└── package.json                    # Scripts globales del monorepo
```

---

## 🔑 Credenciales del Sistema

- **Administrador Principal:**
  - **Usuario:** `adminCM`
  - **Contraseña:** `admin123456`
- **Clave Maestra Institucional (Desbloqueo de Emergencia):** `CMADMIN2026`
- **Atajo de Soporte en Pantalla:** `Ctrl + Alt + Shift + M` o botón *"Soporte Técnico"*.

---

## ⚡ Conexión con Neon.tech (PostgreSQL)

1. Crea tu base de datos gratuita en [https://neon.tech](https://neon.tech).
2. Coloca tu cadena en `admin-server/.env`:
   ```env
   DATABASE_URL="postgresql://usuario:password@endpoint.neon.tech/neondb?sslmode=require"
   JWT_SECRET="clave-super-secreta-2026"
   MASTER_EMERGENCY_KEY="CMADMIN2026"
   ```
3. Ejecuta la sincronización:
   ```bash
   cd admin-server
   npx prisma db push
   node prisma/seed.js
   ```

---

## 🖥️ Instalación en Windows

1. Compila el instalador `.exe`:
   ```bash
   cd client-lock
   npm run dist
   ```
2. Ejecuta `LabLock CM Client-1.0.0-Setup.exe` en cada equipo con Windows.
3. En la pantalla de bloqueo, haz clic en **"Ajustes"** y coloca la URL de tu servidor (Cloudflare o IP local).
4. Configura el inicio automático y bloquea el Administrador de Tareas siguiendo la guía en `docs/GUIA_DESPLIEGUE_NEON_CLOUDFLARE_WINDOWS.md`.
