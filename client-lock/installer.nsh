; =========================================================================
; LabLock CM Client - Script NSIS Personalizado de Instalación y Blindaje
; Colegio Mexicano - Centro de Cómputo
; =========================================================================

!macro customInstall
  DetailPrint "Configurando inicio automatico blindado LabLock CM..."
  ; 1. Crear Tarea Programada de Inicio Automatico con Maxima Prioridad (onlogon)
  nsExec::ExecToLog 'schtasks /create /tn "LabLockCM_Kiosk" /tr "\"$INSTDIR\LabLock CM Client.exe\"" /sc onlogon /rl highest /f'

  DetailPrint "Deshabilitando Administrador de Tareas para alumnos..."
  ; 2. Deshabilitar Administrador de Tareas en politicas de usuario y equipo
  WriteRegDWORD HKCU "Software\Microsoft\Windows\CurrentVersion\Policies\System" "DisableTaskMgr" 1
  WriteRegDWORD HKLM "Software\Microsoft\Windows\CurrentVersion\Policies\System" "DisableTaskMgr" 1
!macroend

!macro customUnInstall
  DetailPrint "Eliminando tarea programada de inicio automatico..."
  ; 1. Eliminar tarea programada
  nsExec::ExecToLog 'schtasks /delete /tn "LabLockCM_Kiosk" /f'

  DetailPrint "Restaurando Administrador de Tareas de Windows..."
  ; 2. Restaurar acceso al Administrador de Tareas
  WriteRegDWORD HKCU "Software\Microsoft\Windows\CurrentVersion\Policies\System" "DisableTaskMgr" 0
  WriteRegDWORD HKLM "Software\Microsoft\Windows\CurrentVersion\Policies\System" "DisableTaskMgr" 0
!macroend
