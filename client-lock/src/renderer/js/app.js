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
        showFeedback(data.reason || 'Sesión finalizada remotamente.', 'error');
        resetForm();
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

// 7. Configuración de Red
btnOpenSettings.addEventListener('click', () => {
  inputServerUrl.value = systemInfo.serverUrl;
  modalSettings.classList.add('active');
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

// Helpers
function showFeedback(text, type = 'error') {
  feedbackText.textContent = text;
  feedbackBanner.className = `feedback-banner show ${type === 'error' ? 'banner-error' : 'banner-success'}`;
}

function hideFeedback() {
  feedbackBanner.className = 'feedback-banner';
}

function resetForm() {
  inputNombre.value = '';
  inputNombre.focus();
}

// Iniciar al cargar
document.addEventListener('DOMContentLoaded', initApp);
