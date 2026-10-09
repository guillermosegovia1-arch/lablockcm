@echo off
:: =========================================================================
:: LabLock CM - Desactivar Blindaje de Kiosco (Restaurar Windows Normal)
:: =========================================================================
chcp 65001 >nul
echo.
echo ========================================================
echo   LabLock CM: Desactivando Blindaje y Restaurando Sistema
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

echo [1/2] Eliminando tarea programada de inicio automático...
schtasks /delete /tn "LabLockCM_Kiosk" /f >nul 2>&1

echo [2/3] Rehabilitando el Administrador de Tareas...
reg add "HKCU\Software\Microsoft\Windows\CurrentVersion\Policies\System" /v DisableTaskMgr /t REG_DWORD /d 0 /f
reg add "HKLM\Software\Microsoft\Windows\CurrentVersion\Policies\System" /v DisableTaskMgr /t REG_DWORD /d 0 /f

echo [3/3] Rehabilitando Panel de Control y Configuración de Pantalla...
reg add "HKCU\Software\Microsoft\Windows\CurrentVersion\Policies\Explorer" /v NoControlPanel /t REG_DWORD /d 0 /f
reg add "HKLM\Software\Microsoft\Windows\CurrentVersion\Policies\Explorer" /v NoControlPanel /t REG_DWORD /d 0 /f
reg add "HKCU\Software\Microsoft\Windows\CurrentVersion\Policies\System" /v NoDispCPL /t REG_DWORD /d 0 /f
reg add "HKLM\Software\Microsoft\Windows\CurrentVersion\Policies\System" /v NoDispCPL /t REG_DWORD /d 0 /f

echo.
echo ========================================================
echo   [EXITO] Sistema restaurado a la normalidad.
echo   - Tarea programada eliminada.
echo   - Administrador de Tareas habilitado.
echo   - Panel de Control y Configuración habilitados.
echo ========================================================
echo.
pause
