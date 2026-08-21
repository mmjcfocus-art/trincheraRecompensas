// ============================================
// FUNCIONES DE VALIDACIÓN Y UTILERÍA
// ============================================

export function validateEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function validatePhone(phone) {
    return /^[0-9]{10,15}$/.test(phone.replace(/[^0-9]/g, ''));
}

export function sanitizeText(text) {
    return text.replace(/[<>]/g, '').trim();
}

export function sanitizePhone(phone) {
    return phone.replace(/[^0-9]/g, '');
}

export function isValidUser(user) {
    return user && typeof user === 'object' && user.id && user.nombre && user.correo && typeof user.sellos === 'number' && typeof user.horas_gratis === 'number';
}

export function getGamerAvatarSvg(type = "helmet") {
    if (type === "cyborg") {
        return `<svg viewBox="0 0 100 100" class="w-12 h-12 sm:w-16 sm:h-16 rounded-2xl bg-slate-950 border border-emerald-500/30 p-1 filter drop-shadow-[0_0_8px_rgba(16,124,16,0.25)]"><rect x="25" y="25" width="50" height="50" rx="15" fill="#1e293b" stroke="#334155" stroke-width="2"/><circle cx="50" cy="50" r="18" fill="#0f172a"/><circle cx="50" cy="50" r="8" fill="#4ade80" filter="drop-shadow(0 0 3px #107C10)"/><path d="M20 50 L10 50" stroke="#4ade80" stroke-width="2"/><path d="M80 50 L90 50" stroke="#4ade80" stroke-width="2"/><path d="M30 25 L40 10" stroke="#4ade80" stroke-width="2" stroke-linecap="round"/></svg>`;
    } else if (type === "ninja") {
        return `<svg viewBox="0 0 100 100" class="w-12 h-12 sm:w-16 sm:h-16 rounded-2xl bg-slate-950 border border-emerald-500/30 p-1 filter drop-shadow-[0_0_8px_rgba(16,124,16,0.25)]"><circle cx="50" cy="50" r="30" fill="#0f172a" stroke="#107C10" stroke-width="2"/><rect x="20" y="40" width="60" height="15" rx="4" fill="#1e293b"/><ellipse cx="40" cy="47" rx="6" ry="2" fill="#4ade80"/><ellipse cx="60" cy="47" rx="6" ry="2" fill="#4ade80"/><path d="M50 5 L53 15 L63 18 L53 21 L50 31 L47 21 L37 18 L47 15 Z" fill="#4ade80" opacity="0.6"/></svg>`;
    } else {
        // Default: helmet
        return `<svg viewBox="0 0 100 100" class="w-12 h-12 sm:w-16 sm:h-16 rounded-2xl bg-slate-950 border border-emerald-500/30 p-1 filter drop-shadow-[0_0_8px_rgba(16,124,16,0.25)]"><path d="M25 35 C25 20, 75 20, 75 35 L70 75 C70 80, 30 80, 30 75 Z" fill="#107C10" stroke="#15803d" stroke-width="2"/><path d="M35 40 C35 35, 65 35, 65 40 L60 55 C60 58, 40 58, 40 55 Z" fill="url(#visor-grad-unique)" stroke="#ca8a04" stroke-width="1.5" filter="drop-shadow(0 0 5px rgba(234,179,8,0.5))"/><line x1="50" y1="20" x2="50" y2="35" stroke="#15803d" stroke-width="3"/><circle cx="35" cy="65" r="3" fill="#334155"/><circle cx="65" cy="65" r="3" fill="#334155"/><defs><linearGradient id="visor-grad-unique" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stop-color="#fef08a"/><stop offset="100%" stop-color="#ca8a04"/></linearGradient></defs></svg>`;
    }
}