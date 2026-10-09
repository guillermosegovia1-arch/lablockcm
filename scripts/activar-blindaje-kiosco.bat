@echo off
:: =========================================================================
:: LabLock CM - Activar Blindaje de Kiosco (Administrador de Tareas e Inicio)
:: =========================================================================
chcp 65001 >nul
echo.
echo ========================================================
echo   LabLock CM: Activando Blindaje de Kiosco Escolar
echo ========================================================
echo.

:: Verificar si se ejecuta como Administrador
net session >nul 2>&1
if %errorLevel% neq 0 (
    echo [ERROR] Este script requiere permisos de Administrador.
    echo Por favor haz clic derecho y selecciona "Ejecutar como administrador".
    echo.
    pause
    exit /b 1
)

echo [1/2] Creando tarea programada con prioridad máxima (al iniciar sesión)...
schtasks /create /tn "LabLockCM_Kiosk" /tr "\"C:\Program Files\LabLock CM Client\LabLock CM Client.exe\"" /sc onlogon /rl highest /f

echo [2/2] Deshabilitando el Administrador de Tareas (Ctrl+Alt+Supr / Ctrl+Shift+Esc)...
reg add "HKCU\Software\Microsoft\Windows\CurrentVersion\Policies\System" /v DisableTaskMgr /t REG_DWORD /d 1 /f
reg add "HKLM\Software\Microsoft\Windows\CurrentVersion\Policies\System" /v DisableTaskMgr /t REG_DWORD /d 1 /f

echo.
echo ========================================================
echo   [EXITO] Blindaje activado correctamente.
echo   - La app iniciará automáticamente con Windows.
echo   - El Administrador de Tareas ha sido bloqueado.
echo ========================================================
echo.
pause
