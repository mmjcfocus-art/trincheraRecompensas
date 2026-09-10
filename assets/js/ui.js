// ============================================
// SISTEMA DE TOASTS (Notificaciones)
// ============================================
export function showToast(message, type = 'success') {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    const bgClass = type === 'success' ? 'bg-emerald-500 text-white shadow-emerald-500/10' : type === 'error' ? 'bg-rose-600 text-white shadow-rose-600/10' : 'bg-slate-900 text-slate-100 border border-slate-800';
    const icon = type === 'success' ? '✅' : type === 'error' ? '❌' : 'ℹ️';
    
    toast.className = `${bgClass} p-4 rounded-2xl shadow-2xl flex items-center gap-3 text-sm font-semibold transform translate-y-2 opacity-0 transition-all duration-300 pointer-events-auto w-full`;
    toast.innerHTML = `<span>${icon}</span> <span>${message}</span>`;
    
    container.appendChild(toast);
    setTimeout(() => toast.classList.remove('translate-y-2', 'opacity-0'), 10);
    setTimeout(() => { 
        toast.classList.add('translate-y-2', 'opacity-0'); 
        setTimeout(() => toast.remove(), 300); 
    }, 4000);
}

// ============================================
// SISTEMA DE CONFIRMACIÓN (Modal)
// ============================================
let currentConfirmAction = null;

export function showConfirm(title, message, onConfirm) {
    const modal = document.getElementById('confirm-modal');
    if (!modal) return;
    
    document.getElementById('confirm-title').innerText = title;
    document.getElementById('confirm-message').innerText = message;
    currentConfirmAction = onConfirm;
    modal.classList.remove('hidden');
}

// Inicializar eventos del modal (se ejecuta solo una vez al cargar la página)
document.addEventListener('DOMContentLoaded', () => {
    const cancelBtn = document.getElementById('btn-confirm-cancel');
    const okBtn = document.getElementById('btn-confirm-ok');
    
    if (cancelBtn) {
        cancelBtn.onclick = () => {
            document.getElementById('confirm-modal').classList.add('hidden');
            currentConfirmAction = null;
        };
    }
    if (okBtn) {
        okBtn.onclick = () => {
            if (currentConfirmAction) currentConfirmAction();
            document.getElementById('confirm-modal').classList.add('hidden');
            currentConfirmAction = null;
        };
    }
});

// ============================================
// PESTAÑAS DE LOGIN / REGISTRO
// ============================================
export function toggleAuthTabs(mode) {
    const tLogin = document.getElementById('tab-login');
    const tReg = document.getElementById('tab-register');
    const cLogin = document.getElementById('card-login');
    const cReg = document.getElementById('card-register');
    
    if (!tLogin || !tReg || !cLogin || !cReg) return;

    if (mode === 'login') {
        tLogin.className = "flex-1 text-center py-2.5 rounded-xl text-xs font-extrabold cursor-pointer transition-all bg-emerald-600 text-white shadow-sm";
        tReg.className = "flex-1 text-center py-2.5 rounded-xl text-xs font-extrabold cursor-pointer transition-all text-slate-400 hover:text-white";
        cLogin.classList.remove('hidden');
        cReg.classList.add('hidden');
    } else {
        tReg.className = "flex-1 text-center py-2.5 rounded-xl text-xs font-extrabold cursor-pointer transition-all bg-emerald-600 text-white shadow-sm";
        tLogin.className = "flex-1 text-center py-2.5 rounded-xl text-xs font-extrabold cursor-pointer transition-all text-slate-400 hover:text-white";
        cReg.classList.remove('hidden');
        cLogin.classList.add('hidden');
    }
}

export function quickFillUser(email, pass) {
    const emailInput = document.getElementById('login-user-email');
    const passInput = document.getElementById('login-user-pass');
    
    if (emailInput) emailInput.value = email;
    if (passInput) passInput.value = pass;
    
    showToast("Formulario cargado con usuario demo", "info");
}