# 🛡️ Guía de Despliegue y Aseguramiento en Windows: LabLock CM

Esta guía detalla los pasos de configuración para convertir las computadoras del centro de cómputo del **Colegio Mexicano** en terminales tipo kiosco aseguradas, impidiendo que los alumnos evadan la pantalla de bloqueo o finalicen el proceso.

---

## 1. Configuración de Inicio Automático con Windows

Para que **LabLock CM Client** se inicie automáticamente antes de que el alumno interactúe con el escritorio, puedes aplicar cualquiera de los siguientes métodos (se recomienda el **Método C** para entornos escolares):

### Método A: Carpeta de Inicio Rápido (`shell:startup`)
1. Presiona `Windows + R`, escribe:
   ```cmd
   shell:startup
   ```
2. Presiona Enter. Se abrirá la carpeta:
   `C:\Users\<Usuario>\AppData\Roaming\Microsoft\Windows\Start Menu\Programs\Startup`
3. Crea un acceso directo al ejecutable de LabLock:
   - Destino: `"C:\Program Files\LabLock CM Client\LabLock CM Client.exe"`
   - Parámetros (opcional): `--kiosk-mode`

> **Nota:** Para que aplique a **todos los alumnos** que inicien sesión en la PC, usa `shell:common startup` (`C:\ProgramData\Microsoft\Windows\Start Menu\Programs\Startup`).

---

### Método B: Registro de Windows (`Run` Key)
Ejecuta la consola de comandos (`cmd.exe`) o PowerShell como **Administrador**:

```cmd
reg add "HKLM\Software\Microsoft\Windows\CurrentVersion\Run" /v "LabLockCM" /t REG_SZ /d "\"C:\Program Files\LabLock CM Client\LabLock CM Client.exe\"" /f
```

Esto garantiza que Windows ejecute la aplicación inmediatamente después de iniciar cualquier sesión de usuario.

---

### Método C: Tarea Programada de Windows con Máximos Privilegios (Recomendado)
Este método ejecuta LabLock con privilegios elevados (`Highest Available`), evitando que un alumno sin permisos de administrador pueda interactuar con el proceso.

1. Abre `cmd.exe` como Administrador y ejecuta:
```cmd
schtasks /create /tn "LabLockCM_Kiosk" /tr "\"C:\Program Files\LabLock CM Client\LabLock CM Client.exe\"" /sc onlogon /rl highest /f
```
2. La tarea se ejecutará cada vez que cualquier usuario inicie sesión.

---

## 2. Bloqueo del Administrador de Tareas (`Task Manager`)

Para evitar que los alumnos presionen `Ctrl + Shift + Esc` o `Ctrl + Alt + Supr` y hagan clic en **"Finalizar tarea"**, debes aplicar las siguientes políticas de seguridad:

### Paso 2.1: Deshabilitar el Administrador de Tareas vía Registro
Ejecuta este comando en la cuenta del alumno o en el script de aprovisionamiento:

```cmd
reg add "HKCU\Software\Microsoft\Windows\CurrentVersion\Policies\System" /v DisableTaskMgr /t REG_DWORD /d 1 /f
```

*(Si el alumno intenta abrir el Administrador de Tareas, Windows mostrará: "El Administrador de tareas ha sido deshabilitado por el administrador").*

Para revertir en caso de mantenimiento de soporte:
```cmd
reg delete "HKCU\Software\Microsoft\Windows\CurrentVersion\Policies\System" /v DisableTaskMgr /f
```

---

### Paso 2.2: Mediante Directivas de Grupo Local (`gpedit.msc`)
Si cuentas con Windows 10/11 Pro o Enterprise:
1. Presiona `Windows + R`, escribe `gpedit.msc` y presiona Enter.
2. Navega a:
   `Configuración de usuario` ➜ `Plantillas administrativas` ➜ `Sistema` ➜ `Opciones de Ctrl+Alt+Supr`
3. Haz doble clic en **Quitar Administrador de tareas** (Remove Task Manager).
4. Selecciona **Habilitada** (Enabled) y pulsa **Aceptar**.
5. También puedes habilitar en esa misma sección:
   - **Quitar Bloquear equipo** (Remove Lock Computer)
   - **Quitar Cambiar contraseña** (Remove Change Password)

---

### Paso 2.3: Configuración de Cuentas de Usuario (Principio de Menor Privilegio)
> ⚠️ **REGLA CRÍTICA DE SEGURIDAD:**
> Las computadoras del laboratorio deben tener dos cuentas:
> 1. **Administrador / Soporte:** Contraseña protegida, para el personal de TI.
> 2. **Alumno / LabCM:** Cuenta de tipo **Usuario Estándar** (Standard User).

Al ser Usuario Estándar:
- Los alumnos **NO tienen permisos NTFS ni privilegios de depuración (SeDebugPrivilege)** para matar procesos ejecutados por el sistema o por el usuario Administrador.
- Incluso si abren la consola de comandos y ejecutan `taskkill /f /im "LabLock CM Client.exe"`, Windows responderá:
  ```
  ERROR: Acceso denegado (Access is denied).
  ```

---

## 3. Servicio Guardián "Watchdog" de Recuperación Automática (Opcional)

Si deseas blindar al 100% el equipo contra cierres inesperados, puedes configurar un script liviano en segundo plano (`watchdog.ps1`) que verifique cada 3 segundos si LabLock está abierto; si no lo está, lo relanza de inmediato:

Guarda en `C:\LabLockCM\watchdog.ps1`:
```powershell
$processName = "LabLock CM Client"
$appPath = "C:\Program Files\LabLock CM Client\LabLock CM Client.exe"

while ($true) {
    $proc = Get-Process -Name $processName -ErrorAction SilentlyContinue
    if (-not $proc) {
        Start-Process $appPath
    }
    Start-Sleep -Seconds 3
}
```

---

## 4. Desbloqueo de Emergencia para el Encargado de TI

Si el encargado del centro de cómputo necesita dar mantenimiento en una máquina:
1. En la pantalla de bloqueo, presiona la combinación:
   ```
   Ctrl + Alt + Shift + M
   ```
   o haz clic en el botón inferior **"Soporte Técnico"**.
2. Ingresa la Clave Maestra Institucional:
   ```
   CMADMIN2026
   ```
3. Pulsa **"Cerrar Kiosco"**. La aplicación se cerrará ordenadamente sin reiniciar la computadora.
