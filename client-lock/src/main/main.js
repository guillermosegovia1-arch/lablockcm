const { app, BrowserWindow, ipcMain, globalShortcut, Tray, Menu, nativeImage, screen, powerMonitor } = require('electron');
const path = require('path');
const os = require('os');
const fs = require('fs');
const { exec } = require('child_process');

// 🔒 Bloqueo de Instancia Única: Impide estrictamente que el programa se abra dos veces
const gotSingleInstanceLock = app.requestSingleInstanceLock();
if (!gotSingleInstanceLock) {
  app.quit();
  process.exit(0);
}

app.on('second-instance', () => {
  if (mainWindow && !mainWindow.isDestroyed()) {
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.show();
    mainWindow.focus();
  }
});

let mainWindow = null;
let floatingWidgetWindow = null;
let idleWarningWindow = null;
let tray = null;
let isLocked = true;
let currentSessionData = null;
let heartbeatInterval = null;
let idleMonitorInterval = null;
let warningDismissedUntil = 0;

// Configuración por defecto o persistida
const configPath = path.join(app.getPath('userData'), 'lablock-config.json');
let appConfig = {
  serverUrl: 'https://lablockcm.vercel.app',
  autoStartOnBoot: true,
};

function loadConfig() {
  try {
    if (fs.existsSync(configPath)) {
      const raw = fs.readFileSync(configPath, 'utf8');
      appConfig = { ...appConfig, ...JSON.parse(raw) };
    }
  } catch (err) {
    console.error('Error cargando configuración:', err);
  }
}

function saveConfig(newConfig) {
  try {
    appConfig = { ...appConfig, ...newConfig };
    fs.writeFileSync(configPath, JSON.stringify(appConfig, null, 2), 'utf8');
  } catch (err) {
    console.error('Error guardando configuración:', err);
  }
}

// Obtener IP local primaria
function getLocalIpAddress() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      // Ignorar internas y no IPv4
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  return '127.0.0.1';
}

function createMainWindow() {
  const primaryDisplay = screen.getPrimaryDisplay();
  const { width, height } = primaryDisplay.workAreaSize;

  mainWindow = new BrowserWindow({
    width: width,
    height: height,
    x: 0,
    y: 0,
    frame: false,
    kiosk: true,
    alwaysOnTop: true,
    skipTaskbar: false,
    fullscreen: true,
    backgroundColor: '#090d16',
    webPreferences: {
      preload: path.join(__dirname, '../preload/preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      enableRemoteModule: false,
    },
  });

  mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));

  // Prevenir que el usuario cierre la ventana si está bloqueada
  mainWindow.on('close', (e) => {
    if (isLocked) {
      e.preventDefault();
    }
  });

  // Asegurar que permanezca en primer plano cuando está bloqueada
  mainWindow.on('blur', () => {
    if (isLocked && mainWindow && !mainWindow.isDestroyed()) {
      setTimeout(() => {
        mainWindow.setAlwaysOnTop(true, 'screen-saver');
        mainWindow.focus();
      }, 50);
    }
  });
}

// Crear widget flotante "Cerrar Sesión" cuando el alumno está trabajando
function createFloatingWidget() {
  if (floatingWidgetWindow && !floatingWidgetWindow.isDestroyed()) {
    floatingWidgetWindow.show();
    return;
  }

  const primaryDisplay = screen.getPrimaryDisplay();
  const { width } = primaryDisplay.workAreaSize;

  floatingWidgetWindow = new BrowserWindow({
    width: 250,
    height: 48,
    x: width - 270,
    y: 20,
    frame: false,
    alwaysOnTop: true,
    transparent: true,
    resizable: false,
    closable: false,
    minimizable: false,
    maximizable: false,
    skipTaskbar: true,
    webPreferences: {
      preload: path.join(__dirname, '../preload/preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  floatingWidgetWindow.setAlwaysOnTop(true, 'screen-saver');
  floatingWidgetWindow.loadFile(path.join(__dirname, '../renderer/widget.html'));
}

function closeFloatingWidget() {
  if (floatingWidgetWindow && !floatingWidgetWindow.isDestroyed()) {
    floatingWidgetWindow.close();
    floatingWidgetWindow = null;
  }
}

// Crear ventana de diálogo de aviso de inactividad (4 minutos = advertencia, 5 minutos = cierre)
function createIdleWarningWindow() {
  if (idleWarningWindow && !idleWarningWindow.isDestroyed()) {
    idleWarningWindow.show();
    idleWarningWindow.focus();
    return;
  }

  const primaryDisplay = screen.getPrimaryDisplay();
  const { width, height } = primaryDisplay.workAreaSize;
  const wWidth = 460;
  const wHeight = 260;

  idleWarningWindow = new BrowserWindow({
    width: wWidth,
    height: wHeight,
    x: Math.floor((width - wWidth) / 2),
    y: Math.floor((height - wHeight) / 2),
    frame: false,
    alwaysOnTop: true,
    transparent: true,
    resizable: false,
    closable: false,
    minimizable: false,
    maximizable: false,
    skipTaskbar: false,
    backgroundColor: '#00000000',
    webPreferences: {
      preload: path.join(__dirname, '../preload/preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  idleWarningWindow.setAlwaysOnTop(true, 'screen-saver');
  idleWarningWindow.loadFile(path.join(__dirname, '../renderer/idle-dialog.html'));

  idleWarningWindow.on('closed', () => {
    idleWarningWindow = null;
  });
}

function closeIdleWarningWindow() {
  if (idleWarningWindow && !idleWarningWindow.isDestroyed()) {
    idleWarningWindow.close();
    idleWarningWindow = null;
  }
}

// Iniciar monitoreo del sistema operativo contra inactividad (powerMonitor)
function startIdleMonitor() {
  stopIdleMonitor();
  warningDismissedUntil = 0;

  idleMonitorInterval = setInterval(() => {
    if (isLocked) {
      closeIdleWarningWindow();
      return;
    }

    // Si el usuario presionó 'Cancelar', respetar período de gracia de 4 minutos
    if (Date.now() < warningDismissedUntil) {
      return;
    }

    let idleSeconds = 0;
    try {
      idleSeconds = powerMonitor.getSystemIdleTime();
    } catch (err) {
      return;
    }

    // Al llegar a 4 minutos (240 segundos) de inactividad, abrir diálogo de conteo regresivo
    if (idleSeconds >= 240) {
      if (!idleWarningWindow || idleWarningWindow.isDestroyed()) {
        createIdleWarningWindow();
      }
    }

    // Al llegar a 5 minutos (300 segundos) de inactividad sin respuesta, cerrar sesión automáticamente
    if (idleSeconds >= 300) {
      closeIdleWarningWindow();
      triggerEndSession();
    }
  }, 1000);
}

function stopIdleMonitor() {
  if (idleMonitorInterval) {
    clearInterval(idleMonitorInterval);
    idleMonitorInterval = null;
  }
  closeIdleWarningWindow();
}

// Crear icono en la bandeja del sistema (System Tray)
function createSystemTray() {
  if (tray) return;

  // Icono SVG/PNG transparente de 16x16
  const icon = nativeImage.createFromBuffer(
    Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAZUlEQVR42mNkQAO/fzP8J5cNMzIyoan/j8QnA2LVR9aMy1Ym7FqwuZFkwD884U9k5j9GBtzqGBihBhJtALr9uAxAZhOlAKcBhDkAm0tIBtQ2AJuL8RkAQyvGAEYMh/AZQJQB1DEAAIM8lQ892oQCAAAAAElFTkSuQmCC',
      'base64'
    )
  );

  tray = new Tray(icon);
  tray.setToolTip('LabLock CM - Colegio Mexicano');

  updateTrayMenu();
}

function updateTrayMenu() {
  if (!tray) return;

  const contextMenu = Menu.buildFromTemplate([
    {
      label: isLocked ? 'Estado: Pantalla Bloqueada' : `En Sesión: ${currentSessionData?.user?.nombre_completo || 'Activa'}`,
      enabled: false,
    },
    { type: 'separator' },
    ...(!isLocked
      ? [
          {
            label: '🔴 Cerrar Sesión al terminar mi clase',
            click: () => {
              triggerEndSession();
            },
          },
          {
            label: 'Mostrar barra flotante',
            click: () => {
              createFloatingWidget();
            },
          },
        ]
      : [
          {
            label: '🔒 Pantalla de Inicio',
            click: () => {
              if (mainWindow) {
                mainWindow.show();
                mainWindow.focus();
              }
            },
          },
        ]),
    { type: 'separator' },
    {
      label: 'Soporte Técnico (Emergencia)',
      click: () => {
        if (mainWindow) {
          mainWindow.show();
          mainWindow.webContents.send('trigger-emergency-modal');
        }
      },
    },
  ]);

  tray.setContextMenu(contextMenu);
}

// Bloqueo estricto de atajos de teclado del sistema
function registerSystemLockShortcuts() {
  // Atajos comunes que los alumnos usan para escapar de kioscos
  const shortcutsToBlock = [
    'Alt+F4',
    'Control+W',
    'Control+Q',
    'Alt+Tab',
    'Control+Escape',
    'Super',
    'CommandOrControl+Shift+Escape',
    'F11',
  ];

  shortcutsToBlock.forEach((sc) => {
    try {
      globalShortcut.register(sc, () => {
        // Interceptado silenciosamente: No permitir acción
      });
    } catch (err) {
      // Algunos atajos pueden estar restringidos por el SO
    }
  });

  // Atajo especial para desbloqueo de soporte técnico / mantenimiento
  try {
    globalShortcut.register('CommandOrControl+Alt+Shift+M', () => {
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('trigger-emergency-modal');
      }
    });
  } catch (err) {
    console.error('Error registrando atajo maestro:', err);
  }
}

function unregisterShortcuts() {
  globalShortcut.unregisterAll();
}

// Transición a Modo Desbloqueado (Alumno ingresó con éxito)
function unlockWorkstation(sessionData) {
  isLocked = false;
  currentSessionData = sessionData;

  // Quitar kiosco y ocultar completamente la pantalla de bienvenida mientras dura la clase
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.setKiosk(false);
    mainWindow.setAlwaysOnTop(false);
    mainWindow.hide();
  }

  // Desregistrar bloqueo agresivo de atajos durante su clase
  unregisterShortcuts();

  // Registrar atajo de emergencia aún disponible
  try {
    globalShortcut.register('CommandOrControl+Alt+Shift+M', () => {
      triggerEndSession();
    });
  } catch (e) {}

  // Mostrar widget flotante, iniciar monitor de inactividad y actualizar tray
  createFloatingWidget();
  startIdleMonitor();
  updateTrayMenu();
}

// Transición a Modo Bloqueado (Cierre de clase o forzado por admin)
function lockWorkstation(reasonMessage) {
  isLocked = true;
  currentSessionData = null;

  stopIdleMonitor();
  closeFloatingWidget();

  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.show();
    mainWindow.restore();
    mainWindow.setKiosk(true);
    mainWindow.setAlwaysOnTop(true, 'screen-saver');
    mainWindow.focus();

    if (reasonMessage) {
      mainWindow.webContents.send('force-lock', { reason: reasonMessage });
    } else {
      mainWindow.webContents.send('session-reset');
    }
  }

  registerSystemLockShortcuts();
  updateTrayMenu();
}

// Finalizar sesión activa y notificar a la API
async function triggerEndSession() {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('request-end-session');
  }
}

// Heartbeat continuo para sincronizar estado y detectar cierres forzados
function startHeartbeat() {
  if (heartbeatInterval) clearInterval(heartbeatInterval);

  heartbeatInterval = setInterval(async () => {
    try {
      const hostname = os.hostname();
      const ip = getLocalIpAddress();
      const sessionId = currentSessionData?.session?.id || null;

      const response = await fetch(`${appConfig.serverUrl}/api/client/ping`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          machine_name: hostname,
          ip_address: ip,
          session_id: sessionId,
        }),
      });

      if (response.ok) {
        const pingData = await response.json();

        // Si el administrador forzó el cierre o bloqueó el equipo desde el panel web
        if (pingData.should_lock && !isLocked) {
          lockWorkstation(pingData.lock_reason || 'Sesión finalizada remotamente por el Administrador.');
        }
      }
    } catch (err) {
      // El servidor de Next.js puede no estar accesible momentáneamente
    }
  }, 15000); // Cada 15 segundos
}

// Configurar inicio automático con Windows
function setupAutoLaunch() {
  if (process.platform === 'win32') {
    app.setLoginItemSettings({
      openAtLogin: appConfig.autoStartOnBoot,
      path: process.execPath,
      args: ['--kiosk-mode'],
    });
  }
}

app.whenReady().then(() => {
  loadConfig();
  createMainWindow();
  createSystemTray();
  registerSystemLockShortcuts();
  setupAutoLaunch();
  startHeartbeat();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow();
    }
  });
});

app.on('will-quit', () => {
  unregisterShortcuts();
  if (heartbeatInterval) clearInterval(heartbeatInterval);
});

// IPC Event Handlers
ipcMain.handle('get-system-info', () => {
  return {
    hostname: os.hostname(),
    ip: getLocalIpAddress(),
    serverUrl: appConfig.serverUrl,
    platform: process.platform,
  };
});

ipcMain.handle('get-current-session', () => {
  return currentSessionData;
});

ipcMain.on('save-server-url', (event, newUrl) => {
  saveConfig({ serverUrl: newUrl });
});

ipcMain.on('session-unlocked', (event, sessionData) => {
  unlockWorkstation(sessionData);
});

ipcMain.on('session-locked', (event, reason) => {
  lockWorkstation(reason);
});

ipcMain.on('emergency-exit-app', () => {
  isLocked = false;
  unregisterShortcuts();
  app.exit(0);
});

ipcMain.on('minimize-widget', () => {
  closeFloatingWidget();
});

ipcMain.on('trigger-end-session', () => {
  triggerEndSession();
});

// Control de Diálogo de Inactividad (Ok / Cancelar)
ipcMain.on('cancel-idle-warning', () => {
  closeIdleWarningWindow();
  // Concede 4 minutos adicionales de uso activo antes de volver a verificar inactividad
  warningDismissedUntil = Date.now() + (4 * 60 * 1000);
});

ipcMain.on('confirm-idle-end-session', () => {
  closeIdleWarningWindow();
  triggerEndSession();
});

// Control de Energía del Sistema (Apagar, Reiniciar, Suspender)
ipcMain.on('system-shutdown', () => {
  if (process.platform === 'win32') {
    exec('shutdown /s /t 0');
  } else {
    exec('shutdown -h now');
  }
});

ipcMain.on('system-restart', () => {
  if (process.platform === 'win32') {
    exec('shutdown /r /t 0');
  } else {
    exec('shutdown -r now');
  }
});

ipcMain.on('system-sleep', () => {
  if (process.platform === 'win32') {
    exec('rundll32.exe powrprof.dll,SetSuspendState 0,1,0');
  } else {
    exec('systemctl suspend');
  }
});

