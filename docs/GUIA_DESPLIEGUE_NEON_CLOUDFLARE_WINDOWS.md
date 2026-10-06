# 🚀 Guía de Despliegue: Neon.tech, GitHub, Cloudflare e Instalación en Windows

Esta guía te explica paso a paso cómo conectar la base de datos PostgreSQL en **Neon.tech**, subir el código a **GitHub**, desplegar el panel en **Cloudflare**, y compilar e instalar el cliente en las computadoras con Windows del Colegio Mexicano.

---

## 1. Configurar la Base de Datos en Neon.tech

1. Entra a [https://neon.tech](https://neon.tech) e inicia sesión (o crea una cuenta gratuita).
2. Haz clic en **"Create Project"**:
   - **Project Name:** `lablock-db`
   - **Postgres Version:** 16 (o la sugerida por defecto).
   - **Region:** Selecciona la más cercana (ej. `US East (Ohio)` o `US East (N. Virginia)`).
3. En el Dashboard de tu proyecto, copia la cadena de conexión **Connection String** (asegúrate de que incluya `?sslmode=require`). Tendrá un formato como este:
   ```env
   DATABASE_URL="postgresql://neondb_owner:npg_AbCdEf123456@ep-cool-sample-123456.us-east-2.aws.neon.tech/neondb?sslmode=require"
   ```
4. Abre el archivo `admin-server/.env` en tu computadora y pega tu cadena:
   ```env
   DATABASE_URL="TU_CADENA_DE_NEON_AQUI"
   JWT_SECRET="lablock-cm-secret-key-2026-supersecure"
   MASTER_EMERGENCY_KEY="CMADMIN2026"
   ```
5. En tu terminal, entra a la carpeta `admin-server` y ejecuta estos dos comandos:
   ```bash
   cd admin-server
   npx prisma db push
   node prisma/seed.js
   ```
   ✅ **Listo:** Prisma creará las tablas (`users`, `workstations`, `sessions`) directamente en Neon.tech e insertará únicamente al **Administrador Principal**:
   - **Usuario:** `adminCM`
   - **Contraseña:** `admin123456`

---

## 2. Subir el Proyecto a GitHub

1. En la raíz del proyecto (`LabLockCM`), verifica que exista el archivo `.gitignore` (ya configurado para no subir contraseñas ni archivos temporales).
2. Abre la terminal en la raíz y ejecuta:
   ```bash
   git init
   git add .
   git commit -m "feat: LabLock CM con soporte Neon.tech y adminCM"
   ```
3. Ve a [GitHub](https://github.com) y crea un nuevo repositorio (por ejemplo: `lablock-cm`).
4. Vincula tu repositorio local y sube los cambios:
   ```bash
   git remote add origin https://github.com/TU_USUARIO/lablock-cm.git
   git branch -M main
   git push -u origin main
   ```

---

## 3. Desplegar el Backend y Panel Web en Cloudflare

Para alojar el panel administrativo en Cloudflare Pages:

1. Ve a tu consola de [Cloudflare Dashboard](https://dash.cloudflare.com/) ➜ **Compute (Workers & Pages)** ➜ **Create application** ➜ **Pages** ➜ **Connect to Git**.
2. Selecciona tu repositorio `lablock-cm`.
3. Configuración del Build:
   - **Framework preset:** `Next.js`
   - **Root directory:** `admin-server`
   - **Build command:** `npx @cloudflare/next-on-pages` (o `npm run build`)
   - **Build output directory:** `.vercel/output/static` (o `.next`)
4. En la sección **Environment variables (Variables de entorno)**, agrega:
   - `DATABASE_URL`: Tu cadena copiada de Neon.tech.
   - `JWT_SECRET`: Tu clave secreta generada.
   - `MASTER_EMERGENCY_KEY`: `CMADMIN2026`
   - `NODE_VERSION`: `20`
5. Haz clic en **Save and Deploy**. En 2 minutos tendrás tu panel accesible vía URL pública con certificado SSL (ejemplo: `https://lablock-cm.pages.dev`).

*(Nota: Si deseas despliegue en 1 clic con soporte nativo de Next.js Server Components, también puedes importar el repositorio en Vercel y vincular tu dominio de Cloudflare mediante CNAME).*

---

## 4. Instalación del Cliente en las Computadoras Windows de los Alumnos

Para instalar **LabLock CM** en cada computadora del centro de cómputo del colegio:

### Paso 4.1: Compilar el Instalador `.exe`
En tu equipo de desarrollo, entra a la carpeta del cliente:
```bash
cd client-lock
npm run dist
```
Esto generará en la carpeta `client-lock/dist/` el archivo instalador:
📁 **`LabLock CM Client-1.0.0-Setup.exe`** (o ejecutable portable).

---

### Paso 4.2: Instalar en las Computadoras del Laboratorio
1. Copia el archivo `.exe` a una memoria USB o colócalo en una carpeta compartida de la red escolar.
2. Ejecuta el instalador con permisos de Administrador en cada máquina.
3. Se instalará en `C:\Program Files\LabLock CM Client\`.

---

### Paso 4.3: Conectar el Cliente a tu Servidor
1. Al abrir la aplicación por primera vez en la pantalla de bloqueo, haz clic en el botón inferior **"Ajustes"**.
2. Escribe la URL de tu servidor desplegado:
   - Ej: `https://lablock-cm.pages.dev` (o la IP local del servidor si está en la misma red: `http://192.168.1.50:3000`).
3. Haz clic en **"Guardar Servidor"**.
4. ¡Listo! La computadora detectará automáticamente su nombre de red de Windows (ej. `LAB-PC-01`) y se comunicará con tu base de datos de Neon.

---

### Paso 4.4: Blindar el Equipo contra Alumnos (Inicio Automático y Anti-Taskkill)

Abre la consola de comandos (`cmd.exe`) como **Administrador** en la máquina del alumno y ejecuta:

#### 1. Iniciar automáticamente con Windows (Tarea de Máxima Prioridad):
```cmd
schtasks /create /tn "LabLockCM_Kiosk" /tr "\"C:\Program Files\LabLock CM Client\LabLock CM Client.exe\"" /sc onlogon /rl highest /f
```

#### 2. Deshabilitar el Administrador de Tareas (para que no puedan matar la tarea con Ctrl+Alt+Supr):
```cmd
reg add "HKCU\Software\Microsoft\Windows\CurrentVersion\Policies\System" /v DisableTaskMgr /t REG_DWORD /d 1 /f
```

#### 3. Cuenta de Usuario del Alumno:
Asegúrate de que los alumnos inicien sesión en una cuenta de **Usuario Estándar** (no Administrador). De esta forma, Windows impedirá por completo cerrar procesos protegidos.

---

## 5. Credenciales de Acceso

- **Panel de Administración Web:**
  - **Usuario:** `adminCM`
  - **Contraseña:** `admin123456`
- **Desbloqueo de Emergencia en Pantalla:**
  - Atajo: `Ctrl + Alt + Shift + M` o botón *"Soporte Técnico"*
  - **Clave Maestra:** `CMADMIN2026`
