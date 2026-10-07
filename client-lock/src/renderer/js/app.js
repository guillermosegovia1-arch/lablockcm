// LabLock CM - Client Application Logic

let systemInfo = {
  hostname: 'EQUIPO-LOCAL',
  ip: '127.0.0.1',
  serverUrl: 'https://lablockcm.vercel.app',
};

let activeSession = null;

// DOM Elements
const labelMachineName = document.getElementById('label-machine-name');
const labelMachineIp = document.getElementById('label-machine-ip');
const clockTime = document.getElementById('clock-time');
const clockDate = document.getElementById('clock-date');

const formUnlock = document.getElementById('form-unlock');
const inputNombre = document.getElementById('input-nombre');
const btnSubmit = document.getElementById('btn-submit');
const feedbackBanner = document.getElementById('feedback-banner');
const feedbackText = document.getElementById('feedback-text');

// Modals
const modalDuplicate = document.getElementById('modal-duplicate');
const modalDuplicatePc = document.getElementById('modal-duplicate-pc');
const modalDuplicateText = document.getElementById('modal-duplicate-text');
const btnCloseDuplicateModal = document.getElementById('btn-close-duplicate-modal');

const modalEmergency = document.getElementById('modal-emergency');
const inputEmergencyKey = document.getElementById('input-emergency-key');
const btnOpenEmergency = document.getElementById('btn-open-emergency');
const btnCloseEmergency = document.getElementById('btn-close-emergency');
const btnConfirmEmergency = document.getElementById('btn-confirm-emergency');
const emergencyError = document.getElementById('emergency-error');

const modalSettings = document.getElementById('modal-settings');
const inputServerUrl = document.getElementById('input-server-url');
const btnOpenSettings = document.getElementById('btn-open-settings');
const btnCloseSettings = document.getElementById('btn-close-settings');
const btnSaveSettings = document.getElementById('btn-save-settings');

const modalSettingsAuth = document.getElementById('modal-settings-auth');
const inputSettingsMasterKey = document.getElementById('input-settings-master-key');
const btnCloseSettingsAuth = document.getElementById('btn-close-settings-auth');
const btnConfirmSettingsAuth = document.getElementById('btn-confirm-settings-auth');
const settingsAuthError = document.getElementById('settings-auth-error');

// 1. Inicialización y Carga de Datos del Sistema
async function initApp() {
  updateClock();
  setInterval(updateClock, 1000);

  if (window.lablockApi) {
    try {
      systemInfo = await window.lablockApi.getSystemInfo();
      labelMachineName.textContent = systemInfo.hostname;
      labelMachineIp.textContent = systemInfo.ip;
      inputServerUrl.value = systemInfo.serverUrl;

      // Suscribirse a eventos de Electron Main
      window.lablockApi.onForceLock((data) => {
        const reason = data.reason || 'Sesión finalizada remotamente.';
        const isSuccess = reason.toLowerCase().includes('correctamente') || reason.toLowerCase().includes('éxito');
        showFeedback(reason, isSuccess ? 'success' : 'error', 10000);
        resetForm(false);
      });

      window.lablockApi.onRequestEndSession(() => {
        handleEndSession();
      });

      window.lablockApi.onTriggerEmergencyModal(() => {
        openEmergencyModal();
      });

      window.lablockApi.onSessionReset(() => {
        resetForm();
      });
    } catch (e) {
      console.warn('API IPC no disponible, corriendo en modo standalone/browser:', e);
    }
  }
}

// 2. Reloj en Vivo
function updateClock() {
  const now = new Date();
  const timeStr = now.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  const dateStr = now.toLocaleDateString('es-MX', { weekday: 'short', day: 'numeric', month: 'short' });

  if (clockTime) clockTime.textContent = timeStr;
  if (clockDate) clockDate.textContent = dateStr.toUpperCase();
}

// 3. Envío de Formulario de Desbloqueo
formUnlock.addEventListener('submit', async (e) => {
  e.preventDefault();
  hideFeedback();

  const nombre = inputNombre.value.trim();
  if (!nombre) return;

  btnSubmit.disabled = true;
  btnSubmit.innerHTML = `
    <div style="width: 18px; height: 18px; border: 2px solid rgba(255,255,255,0.3); border-top-color: #fff; border-radius: 50%; animation: spin 0.6s linear infinite;"></div>
    <span>Verificando usuario...</span>
  `;

  try {
    const res = await fetch(`${systemInfo.serverUrl}/api/client/session/start`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        nombre_completo: nombre,
        machine_name: systemInfo.hostname,
        ip_address: systemInfo.ip,
      }),
    });

    const data = await res.json();

    if (res.status === 404) {
      showFeedback(data.error || 'Usuario no encontrado en el sistema escolar.', 'error');
      inputNombre.select();
      return;
    }

    if (res.status === 409) {
      showDuplicateSessionModal(data.active_machine || 'OTRO EQUIPO');
      return;
    }

    if (!res.ok) {
      showFeedback(data.error || 'Error al iniciar sesión en el equipo.', 'error');
      return;
    }

    // Inicio exitoso
    activeSession = data;
    showFeedback(`¡Bienvenido ${data.user.nombre_completo}! Desbloqueando...`, 'success');

    setTimeout(() => {
      if (window.lablockApi) {
        window.lablockApi.notifySessionUnlocked(data);
      }
    }, 700);
  } catch (err) {
    showFeedback('No se pudo conectar con el servidor central LabLock CM.', 'error');
  } finally {
    btnSubmit.disabled = false;
    btnSubmit.innerHTML = `
      <span>Desbloquear Equipo</span>
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <line x1="5" y1="12" x2="19" y2="12"></line>
        <polyline points="12 5 19 12 12 19"></polyline>
      </svg>
    `;
  }
});

function resetForm(clearFeedback = false) {
  if (inputNombre) {
    inputNombre.value = '';
    setTimeout(() => {
      try { inputNombre.focus(); } catch (e) {}
    }, 120);
  }
  if (clearFeedback) {
    hideFeedback();
  }
  if (btnSubmit) {
    btnSubmit.disabled = false;
    btnSubmit.innerHTML = `
      <span>Desbloquear Equipo</span>
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <line x1="5" y1="12" x2="19" y2="12"></line>
        <polyline points="12 5 19 12 12 19"></polyline>
      </svg>
    `;
  }
}

// Ocultar feedback automáticamente en cuanto el usuario empiece a escribir
if (inputNombre) {
  inputNombre.addEventListener('input', () => {
    hideFeedback();
  });
}

// 4. Cierre de Sesión voluntario desde widget o atajo
async function handleEndSession() {
  try {
    await fetch(`${systemInfo.serverUrl}/api/client/session/end`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        machine_name: systemInfo.hostname,
        session_id: activeSession?.session?.id || null,
      }),
    });
  } catch (err) {
    console.error('Error cerrando sesión en API:', err);
  } finally {
    activeSession = null;
    resetForm();
    if (window.lablockApi) {
      window.lablockApi.notifySessionLocked('Sesión finalizada correctamente.');
    }
  }
}

// 5. Manejo del Modal de Sesión Duplicada
function showDuplicateSessionModal(machineName) {
  modalDuplicatePc.textContent = machineName;
  modalDuplicateText.innerHTML = `Esta sesión ya está iniciada en el Equipo: <span class="highlight-pc">${machineName}</span>. Comunícate con el encargado si esto es un error.`;
  modalDuplicate.classList.add('active');
}

btnCloseDuplicateModal.addEventListener('click', () => {
  modalDuplicate.classList.remove('active');
  inputNombre.select();
});

// 6. Manejo de Desbloqueo de Emergencia / Mantenimiento
function openEmergencyModal() {
  modalEmergency.classList.add('active');
  inputEmergencyKey.value = '';
  emergencyError.style.display = 'none';
  setTimeout(() => inputEmergencyKey.focus(), 50);
}

btnOpenEmergency.addEventListener('click', openEmergencyModal);
btnCloseEmergency.addEventListener('click', () => {
  modalEmergency.classList.remove('active');
});

btnConfirmEmergency.addEventListener('click', async () => {
  const key = inputEmergencyKey.value.trim();
  if (!key) return;

  try {
    const res = await fetch(`${systemInfo.serverUrl}/api/client/emergency-verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key }),
    });

    const data = await res.json();

    if (data.authorized) {
      modalEmergency.classList.remove('active');
      if (window.lablockApi) {
        window.lablockApi.emergencyExitApp();
      } else {
        alert('Modo mantenimiento: Desbloqueo autorizado.');
      }
    } else {
      emergencyError.textContent = data.error || 'Clave de soporte inválida.';
      emergencyError.style.display = 'block';
    }
  } catch (err) {
    // Si el servidor está caído, permitir clave local institucional de contingencia
    if (key === 'CMADMIN2026') {
      if (window.lablockApi) window.lablockApi.emergencyExitApp();
    } else {
      emergencyError.textContent = 'Clave incorrecta o servidor no accesible.';
      emergencyError.style.display = 'block';
    }
  }
});

// 7. Configuración de Red (Protegida con Clave Maestra)
btnOpenSettings.addEventListener('click', () => {
  inputSettingsMasterKey.value = '';
  settingsAuthError.style.display = 'none';
  modalSettingsAuth.classList.add('active');
  setTimeout(() => inputSettingsMasterKey.focus(), 50);
});

btnCloseSettingsAuth.addEventListener('click', () => {
  modalSettingsAuth.classList.remove('active');
});

const handleVerifySettingsAuth = async () => {
  const key = inputSettingsMasterKey.value.trim();
  if (!key) return;

  try {
    const res = await fetch(`${systemInfo.serverUrl}/api/client/emergency-verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key }),
    });

    const data = await res.json();
    if (data.authorized) {
      modalSettingsAuth.classList.remove('active');
      inputServerUrl.value = systemInfo.serverUrl;
      modalSettings.classList.add('active');
      return;
    }
  } catch (err) {
    if (key === 'CMADMIN2026') {
      modalSettingsAuth.classList.remove('active');
      inputServerUrl.value = systemInfo.serverUrl;
      modalSettings.classList.add('active');
      return;
    }
  }

  if (key === 'CMADMIN2026') {
    modalSettingsAuth.classList.remove('active');
    inputServerUrl.value = systemInfo.serverUrl;
    modalSettings.classList.add('active');
  } else {
    settingsAuthError.textContent = 'Clave maestra incorrecta.';
    settingsAuthError.style.display = 'block';
  }
};

btnConfirmSettingsAuth.addEventListener('click', handleVerifySettingsAuth);
inputSettingsMasterKey.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') handleVerifySettingsAuth();
});

btnCloseSettings.addEventListener('click', () => {
  modalSettings.classList.remove('active');
});

btnSaveSettings.addEventListener('click', () => {
  const newUrl = inputServerUrl.value.trim();
  if (newUrl) {
    systemInfo.serverUrl = newUrl;
    if (window.lablockApi) {
      window.lablockApi.saveServerUrl(newUrl);
    }
    showFeedback('URL de servidor actualizada.', 'success');
  }
  modalSettings.classList.remove('active');
});

// 8. Opciones de Energía (Apagar, Reiniciar, Suspender)
const modalPower = document.getElementById('modal-power');
const modalPowerIcon = document.getElementById('modal-power-icon');
const powerIconSvg = document.getElementById('power-icon-svg');
const modalPowerTitle = document.getElementById('modal-power-title');
const modalPowerBody = document.getElementById('modal-power-body');
const btnCancelPower = document.getElementById('btn-cancel-power');
const btnConfirmPower = document.getElementById('btn-confirm-power');

const btnPowerSleep = document.getElementById('btn-power-sleep');
const btnPowerRestart = document.getElementById('btn-power-restart');
const btnPowerShutdown = document.getElementById('btn-power-shutdown');

let selectedPowerAction = null;

function openPowerModal(action) {
  selectedPowerAction = action;
  if (!modalPower) return;

  if (action === 'shutdown') {
    modalPowerTitle.textContent = '¿Apagar el Equipo?';
    modalPowerBody.textContent = 'La computadora se apagará por completo y se cerrará el sistema.';
    modalPowerIcon.className = 'modal-icon power';
    powerIconSvg.innerHTML = `
      <path d="M18.36 6.64a9 9 0 1 1-12.73 0"></path>
      <line x1="12" y1="2" x2="12" y2="12"></line>
    `;
    btnConfirmPower.className = 'btn-danger-modal';
    btnConfirmPower.textContent = 'Apagar Equipo';
  } else if (action === 'restart') {
    modalPowerTitle.textContent = '¿Reiniciar el Equipo?';
    modalPowerBody.textContent = 'La computadora se reiniciará y volverá a cargar la pantalla de acceso.';
    modalPowerIcon.className = 'modal-icon restart';
    powerIconSvg.innerHTML = `
      <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"/>
    `;
    btnConfirmPower.className = 'btn-primary-modal';
    btnConfirmPower.textContent = 'Reiniciar Equipo';
  } else if (action === 'sleep') {
    modalPowerTitle.textContent = '¿Suspender el Equipo?';
    modalPowerBody.textContent = 'El equipo entrará en modo reposo de bajo consumo.';
    modalPowerIcon.className = 'modal-icon sleep';
    powerIconSvg.innerHTML = `
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
    `;
    btnConfirmPower.className = 'btn-primary-modal';
    btnConfirmPower.textContent = 'Suspender';
  }

  modalPower.classList.add('active');
}

if (btnPowerSleep) {
  btnPowerSleep.addEventListener('click', () => openPowerModal('sleep'));
}

if (btnPowerRestart) {
  btnPowerRestart.addEventListener('click', () => openPowerModal('restart'));
}

if (btnPowerShutdown) {
  btnPowerShutdown.addEventListener('click', () => openPowerModal('shutdown'));
}

if (btnCancelPower) {
  btnCancelPower.addEventListener('click', () => {
    if (modalPower) modalPower.classList.remove('active');
    selectedPowerAction = null;
  });
}

if (btnConfirmPower) {
  btnConfirmPower.addEventListener('click', () => {
    if (modalPower) modalPower.classList.remove('active');

    if (!window.lablockApi) {
      alert(`Acción ${selectedPowerAction} no disponible en modo web.`);
      return;
    }

    if (selectedPowerAction === 'shutdown') {
      showFeedback('Apagando equipo...', 'error', 8000);
      window.lablockApi.shutdownMachine();
    } else if (selectedPowerAction === 'restart') {
      showFeedback('Reiniciando equipo...', 'success', 8000);
      window.lablockApi.restartMachine();
    } else if (selectedPowerAction === 'sleep') {
      showFeedback('Suspendiendo equipo...', 'success', 3000);
      window.lablockApi.sleepMachine();
    }
    selectedPowerAction = null;
  });
}

// Helpers
let feedbackTimer = null;

function showFeedback(text, type = 'error', durationMs = 10000) {
  if (feedbackTimer) {
    clearTimeout(feedbackTimer);
    feedbackTimer = null;
  }
  if (!feedbackBanner || !feedbackText) return;

  feedbackText.textContent = text;
  feedbackBanner.className = `feedback-banner show ${type === 'error' ? 'banner-error' : 'banner-success'}`;

  // Se oculta automáticamente tras durationMs (por defecto 10 segundos)
  if (durationMs > 0) {
    feedbackTimer = setTimeout(() => {
      hideFeedback();
    }, durationMs);
  }
}

function hideFeedback() {
  if (feedbackTimer) {
    clearTimeout(feedbackTimer);
    feedbackTimer = null;
  }
  if (feedbackBanner) {
    feedbackBanner.className = 'feedback-banner';
  }
  if (feedbackText) {
    feedbackText.textContent = '';
  }
}

// Iniciar al cargar
document.addEventListener('DOMContentLoaded', initApp);
