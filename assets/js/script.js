
// ============================================
// IMPORTAR CONFIGURACIÓN
// ============================================
import { firebaseConfig, MAX_STAMPS, MAX_REWARD_HOURS, MIN_PASSWORD_LENGTH, SEED_USERS } from './config.js';
// ============================================
// IMPORTAR UTILIDADES
// ============================================
import {
    validateEmail,
    validatePhone,
    sanitizeText,
    sanitizePhone,
    isValidUser,
    getGamerAvatarSvg
} from './utils.js';

// ============================================
// IMPORTAR UI (Interfaz de Usuario)
// ============================================
import {
    showToast,
    showConfirm,
    toggleAuthTabs,
    quickFillUser
} from './ui.js';
// ============================================
// INICIALIZAR FIREBASE
// ============================================
firebase.initializeApp(firebaseConfig);
const database = firebase.database();
const auth = firebase.auth();

let currentUser = null;



// ============================================
// FUNCIONES DE BASE DE DATOS FIREBASE
// ============================================
function initializeDatabase() {
    const dbRef = database.ref('users');
    dbRef.once('value', (snapshot) => {
        if (!snapshot.exists()) {
            console.log('🆕 Inicializando DB con usuarios semilla');
            const updates = {};
            SEED_USERS.forEach(user => { updates[user.id] = user; });
            dbRef.update(updates);
        } else {
            console.log('✅ Base de datos ya inicializada');
        }
    });
}

function saveUser(user, callback) {
    const userRef = database.ref('users/' + user.id);
    userRef.set(user, (error) => {
        if (error) {
            console.error('❌ Error guardando usuario:', error);
            showToast('Error al guardar datos', 'error');
        } else {
            console.log('💾 Usuario guardado correctamente');
            if (callback) callback();
        }
    });
}

function deleteUser(userId, callback) {
    const userRef = database.ref('users/' + userId);
    userRef.remove((error) => {
        if (error) {
            console.error('❌ Error eliminando usuario:', error);
            showToast('Error al eliminar usuario', 'error');
        } else {
            console.log('🗑️ Usuario eliminado correctamente');
            if (callback) callback();
        }
    });
}

function resetDatabase() {
    if (confirm('⚠️ ¿Seguro que quieres resetear la base de datos? Se perderán todos los datos.')) {
        const dbRef = database.ref('users');
        dbRef.remove(() => {
            initializeDatabase();
            currentUser = null;
            showToast('🔄 Base de datos reiniciada con usuarios semilla', 'info');
            switchView('view-home');
        });
    }
}



// ============================================
// NAVEGACIÓN
// ============================================
function switchView(viewId) {
    console.log("switchView llamada con viewId:", viewId);
    console.log("currentUser:", currentUser);

    // 1. Si el usuario está autenticado y quiere ir a vistas públicas, redirigir al dashboard
    if (currentUser && (viewId === 'view-home' || viewId === 'view-user-login' || viewId === 'view-admin-login')) {
        console.log("Redirigiendo a dashboard porque hay sesión activa");
        if (currentUser.correo === 'admin@xbox.com') {
            switchView('view-admin-dashboard');
        } else {
            switchView('view-user-dashboard');
        }
        return;
    }

    // 2. Ocultar/mostrar las vistas
    const views = ['view-home', 'view-user-login', 'view-admin-login', 'view-user-dashboard', 'view-admin-dashboard'];
    views.forEach(v => document.getElementById(v).classList.add('hidden'));
    document.getElementById(viewId).classList.remove('hidden');

    // 3. Controlar visibilidad de los botones según autenticación
    const btnHome = document.getElementById('btn-home');
    const btnLogout = document.getElementById('btn-logout');
    console.log("btnHome:", btnHome);
    console.log("btnLogout:", btnLogout);

    if (currentUser) {
        console.log("Sesión activa: ocultar Inicio, mostrar Cerrar Sesión");
        if (btnHome) btnHome.classList.add('hidden');
        if (btnLogout) btnLogout.classList.remove('hidden');
    } else {
        console.log("Sin sesión: mostrar Inicio, ocultar Cerrar Sesión");
        if (btnHome) btnHome.classList.remove('hidden');
        if (btnLogout) btnLogout.classList.add('hidden');
    }

    // 4. Renderizar contenido específico de cada dashboard
    if (viewId === 'view-admin-dashboard') renderAdminTable();
    if (viewId === 'view-user-dashboard' && currentUser) renderUserDashboard();
}
async function logout() {
    try {
        await auth.signOut(); // Esto dispara onAuthStateChanged, que hace el resto
        showToast("Sesión cerrada correctamente", "info");
    } catch (error) {
        console.error('❌ Error al cerrar sesión:', error);
        showToast("Error al cerrar sesión", "error");
    }
}







// ============================================
// LOGIN USUARIO / REGISTRO CON FIREBASE
// ============================================
async function handleUserLogin(e) {
    e.preventDefault();

    const email = document.getElementById('login-user-email').value.trim().toLowerCase();
    const pass = document.getElementById('login-user-pass').value;

    if (!email || !pass) {
        showToast("Por favor completa todos los campos", "error");
        return;
    }

    if (!validateEmail(email)) {
        showToast("Correo electrónico inválido", "error");
        return;
    }

    try {
        // 1. Iniciar sesión con Firebase Auth
        const credential = await auth.signInWithEmailAndPassword(email, pass);
        const uid = credential.user.uid;

        // 2. Leer los datos del usuario desde su UID
        const userSnapshot = await database.ref('users/' + uid).once('value');
        let user = userSnapshot.val();

        // 3. Si no tiene datos en la DB (caso raro), cerrar sesión
        if (!user || !isValidUser(user)) {
            await auth.signOut();
            showToast("No se encontraron los datos de tu cuenta", "error");
            return;
        }

        // 4. Guardar sesión actual
        currentUser = {
            ...user,
            id: uid,
            uid: uid
        };

        // 5. Entrar al dashboard
        updateNavButtons();
        renderUserDashboard();
        switchView('view-user-dashboard');

        showToast(`¡Hola de nuevo, ${user.nombre}!`);
        e.target.reset();

    } catch (error) {
        console.error("Error durante el inicio de sesión:", error);

        let message = "No fue posible iniciar sesión";
        switch (error.code) {
            case 'auth/wrong-password':
            case 'auth/invalid-credential':
            case 'auth/invalid-login-credentials':
                message = "Correo o contraseña incorrectos";
                break;
            case 'auth/user-not-found':
                message = "No existe una cuenta con este correo";
                break;
            case 'auth/user-disabled':
                message = "Esta cuenta está deshabilitada";
                break;
            case 'auth/too-many-requests':
                message = "Demasiados intentos. Intenta nuevamente más tarde";
                break;
            case 'auth/network-request-failed':
                message = "Error de conexión con Firebase";
                break;
            default:
                console.error(error);
        }
        showToast(message, "error");
    }
}

// Variable global para evitar envíos duplicados
let isRegistering = false;

async function handleUserRegister(e) {
    e.preventDefault();

    if (isRegistering) {
        showToast("Ya se está procesando tu registro, espera un momento...", "info");
        return;
    }

    const nombre = document.getElementById('reg-name').value.trim();
    const correo = document.getElementById('reg-email').value.trim();
    const telefono = document.getElementById('reg-phone').value.trim();
    const contrasena = document.getElementById('reg-pass').value;

    // Validaciones
    if (!nombre || nombre.length < 2) {
        showToast("El nombre debe tener al menos 2 caracteres", "error");
        return;
    }
    if (!validateEmail(correo)) {
        showToast("Correo electrónico inválido", "error");
        return;
    }
    if (!validatePhone(telefono)) {
        showToast("Teléfono inválido (debe tener 10 dígitos)", "error");
        return;
    }
    if (!contrasena || contrasena.length < MIN_PASSWORD_LENGTH) {
        showToast(`La contraseña debe tener al menos ${MIN_PASSWORD_LENGTH} caracteres`, "error");
        return;
    }

    const normalizedEmail = correo.toLowerCase();
    const sanitizedPhone = sanitizePhone(telefono);

    isRegistering = true;
    const submitBtn = e.target.querySelector('button[type="submit"]');
    const originalText = submitBtn.innerText;
    submitBtn.innerText = "Registrando...";
    submitBtn.disabled = true;

    let credential = null;

    try {
        // ============================================
        // PASO 1: Crear la cuenta en Firebase Auth PRIMERO
        // (Firebase verifica que el correo no exista en Auth)
        // ============================================
        credential = await auth.createUserWithEmailAndPassword(normalizedEmail, contrasena);
        const uid = credential.user.uid;

        // ============================================
        // PASO 2: Ahora que el usuario está autenticado,
        // podemos leer la DB para verificar el teléfono duplicado
        // ============================================
        const dbRef = database.ref('users');
        const phoneSnapshot = await dbRef.orderByChild('telefono').equalTo(sanitizedPhone).once('value');

        if (phoneSnapshot.exists()) {
            // Si el teléfono ya existe, borramos la cuenta de Auth que acabamos de crear
            await credential.user.delete();
            showToast("Este teléfono ya está registrado con otra cuenta", "error");
            return;
        }

        // ============================================
        // PASO 3: Guardar los datos del usuario en la DB
        // ============================================
        const avatars = ["helmet", "cyborg", "ninja"];
        const randomAvatar = avatars[Math.floor(Math.random() * avatars.length)];
        const newUser = {
            id: uid,
            uid: uid,
            nombre: sanitizeText(nombre),
            correo: normalizedEmail,
            telefono: sanitizedPhone,
            sellos: 0,
            horas_gratis: 0,
            avatar: randomAvatar,
            fecha_registro: new Date().toISOString()
        };

        await database.ref('users/' + uid).set(newUser);

        // ============================================
        // PASO 4: Éxito
        // ============================================
        showToast("✅ Registro exitoso. ¡Inicia sesión para ver tu tarjeta!", "success");
        toggleAuthTabs('login');
        e.target.reset();

    } catch (error) {
        console.error("Error en registro:", error);
        let message = "No fue posible registrar el usuario";

        if (error.code === 'auth/email-already-in-use') {
            message = "Este correo ya está registrado. Intenta iniciar sesión.";
        } else if (error.code === 'auth/weak-password') {
            message = "La contraseña es demasiado débil. Debe tener al menos 6 caracteres.";
        } else if (error.code === 'auth/network-request-failed') {
            message = "Error de conexión. Revisa tu internet.";
        }

        showToast(message, "error");
    } finally {
        isRegistering = false;
        submitBtn.innerText = originalText;
        submitBtn.disabled = false;
    }
}


async function handleAdminLogin(e) {
    e.preventDefault();
    const email = document.getElementById('admin-email').value.trim();
    const pass = document.getElementById('admin-pass').value;

    if (email !== 'admin@xbox.com') {
        showToast("❌ Credenciales de administrador inválidas", "error");
        return;
    }

    try {
        // Intentar iniciar sesión con Firebase Auth
        await auth.signInWithEmailAndPassword(email, pass);

        // --- ASIGNAR currentUser DESPUÉS DEL LOGIN ---
        const user = auth.currentUser;
        currentUser = {
            id: user.uid,
            uid: user.uid,
            correo: email,
            nombre: "Administrador",
        };

        updateNavButtons(); // <-- AGREGADO AQUÍ
        switchView('view-admin-dashboard');
        showToast("🔐 Acceso de Administrador concedido", "success");
        e.target.reset();
        renderAdminTable();

    } catch (error) {
        // Si el usuario no existe en Auth, créalo automáticamente
        if (error.code === 'auth/user-not-found') {
            try {
                await auth.createUserWithEmailAndPassword(email, pass);
                const user = auth.currentUser;
                currentUser = {
                    id: user.uid,
                    uid: user.uid,
                    correo: email,
                    nombre: "Administrador",
                };
                updateNavButtons();
                switchView('view-admin-dashboard');
                showToast("🛡️ Cuenta Admin creada y acceso concedido", "success");
                e.target.reset();
                renderAdminTable();
            } catch (createError) {
                showToast("Error creando admin: " + createError.message, "error");
            }
        } else {
            showToast("Error: " + error.message, "error");
        }
    }
}

// ============================================
// DASHBOARD USUARIO (TIEMPO REAL)
// ============================================
function renderUserDashboard() {
    if (!currentUser || !currentUser.id) {
        showToast("Error: Sesión no válida", "error");
        switchView('view-home');
        return;
    }
    const userRef = database.ref('users/' + currentUser.id);
    userRef.off();
    userRef.on('value', (snapshot) => {
        const user = snapshot.val();
        if (!user || !isValidUser(user)) {
            showToast("Error: Usuario no encontrado en la base de datos", "error");
            currentUser = null;
            switchView('view-home');
            return;
        }
        currentUser = { ...user };
        document.getElementById('user-avatar-container').innerHTML = getGamerAvatarSvg(user.avatar || "helmet");
        const badgeEl = document.getElementById('user-tier-badge');
        if (user.horas_gratis > 1) {
            badgeEl.innerText = "RANK: ELITE SPARTAN";
            badgeEl.className = "text-[9px] font-black text-white bg-amber-600/30 border border-amber-500/30 px-2.5 py-0.5 rounded-full uppercase tracking-wider tech-font";
        } else if (user.sellos > 2) {
            badgeEl.innerText = "RANK: CYBER-SOLDIER";
            badgeEl.className = "text-[9px] font-black text-white bg-blue-600/30 border border-blue-500/30 px-2.5 py-0.5 rounded-full uppercase tracking-wider tech-font";
        } else {
            badgeEl.innerText = "RANK: ROOKIE GAMER";
            badgeEl.className = "text-[9px] font-black text-white bg-emerald-600/30 border border-emerald-500/30 px-2.5 py-0.5 rounded-full uppercase tracking-wider tech-font";
        }
        document.getElementById('user-dash-name').innerText = user.nombre;
        document.getElementById('user-dash-info').innerHTML = `
                    <div class="flex flex-col sm:flex-row sm:items-center justify-center sm:justify-start gap-1.5 sm:gap-3 text-slate-400 mt-1">
                        <span class="flex items-center justify-center sm:justify-start gap-1.5 break-all text-xs sm:text-sm">
                            <svg class="w-3.5 h-3.5 text-emerald-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/></svg>
                            ${user.correo}
                        </span>
                        <span class="hidden sm:inline text-slate-700">|</span>
                        <span class="flex items-center justify-center sm:justify-start gap-1.5 font-mono text-xs sm:text-sm">
                            <svg class="w-3.5 h-3.5 text-emerald-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.94.725l.548 2.2a1 1 0 01-.321.988l-1.305.98a10.582 10.582 0 004.872 4.872l.98-1.305a1 1 0 01.988-.321l2.2.548a1 1 0 01.725.94V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"/></svg>
                            ${user.telefono}
                        </span>
                    </div>
                `;
        document.getElementById('user-dash-rewards').innerText = user.horas_gratis;
        const container = document.getElementById('stamps-container');
        container.innerHTML = '';
        for (let i = 1; i <= MAX_STAMPS; i++) {
            const isFilled = i <= user.sellos;
            const slot = document.createElement('div');
            slot.className = `aspect-square rounded-2xl flex flex-col items-center justify-center border transition-all duration-500 transform p-1 sm:p-2 ${isFilled ? 'bg-gradient-to-br from-emerald-500 via-green-600 to-emerald-800 border-emerald-400 text-white font-black shadow-[0_4px_15px_rgba(16,124,16,0.35)] scale-102 glowing-pulse' : 'bg-slate-950 border-slate-800 text-slate-600 shadow-inner'}`;
            slot.innerHTML = `
                        <svg class="w-6 h-6 sm:w-10 sm:h-10 mb-0.5 sm:mb-1 transition-transform duration-300 ${isFilled ? 'scale-105' : ''}" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                            <path stroke-linecap="round" stroke-linejoin="round" d="M11.5 12.5H12.5M9.5 12.5H8.5M10.5 11.5V13.5M15.5 11.5H15.51M17.5 13H17.51M19.5 10.5C21.1569 11.83 21.1569 14.17 19.5 15.5L16.5 18.5C14.5 19.5 9.5 19.5 7.5 18.5L4.5 15.5C2.84315 14.17 2.84315 11.83 4.5 10.5L7.5 7.5C9.5 6.5 14.5 6.5 16.5 7.5L19.5 10.5Z" />
                        </svg>
                        <span class="text-[7px] sm:text-[9px] tracking-widest uppercase font-black ${isFilled ? 'text-white' : 'text-slate-500'}">SELLO ${i}</span>
                    `;
            container.appendChild(slot);
        }
        const alertContainer = document.getElementById('user-alert-container');
        if (user.horas_gratis > 0) {
            alertContainer.innerHTML = `
                        <div class="bg-gradient-to-r from-emerald-500 to-green-600 text-white p-4 rounded-2xl font-black text-sm max-w-md mx-auto shadow-xl shadow-emerald-500/25 animate-bounce">
                            🎉 ¡TIENES HORAS GRATIS DE Xbox LISTAS! <br>
                            <span class="font-medium text-xs text-emerald-100">Preséntate con el personal de caja para jugar de inmediato.</span>
                        </div>
                    `;
        } else {
            alertContainer.innerHTML = '';
        }
    });
}

// ============================================
// PANEL ADMIN (CRUD + TIEMPO REAL)
// ============================================
function liberarConsumo(id) {
    if (!id) { showToast("Error: ID de usuario no válido", "error"); return; }
    const userRef = database.ref('users/' + id);
    userRef.once('value', (snapshot) => {
        const user = snapshot.val();
        if (!user) { showToast("Error: Usuario no encontrado", "error"); return; }
        let sellos = user.sellos || 0;
        let horas_gratis = user.horas_gratis || 0;
        if (sellos >= MAX_STAMPS) { showToast(`⚠️ ${user.nombre} ya tiene ${MAX_STAMPS} sellos`, "error"); return; }
        sellos += 1;
        if (sellos >= MAX_STAMPS) {
            sellos = 0;
            horas_gratis += 1;
            if (horas_gratis > MAX_REWARD_HOURS) {
                horas_gratis = MAX_REWARD_HOURS;
                showToast(`⚠️ ${user.nombre} alcanzó el límite máximo de ${MAX_REWARD_HOURS} horas`, "warning");
            } else {
                showToast(`🏆 ¡${user.nombre} completó su tarjeta y ganó 1 Hora Gratis!`, 'success');
            }
        } else {
            showToast(`Sello agregado a ${user.nombre} (${sellos}/${MAX_STAMPS})`, 'success');
        }
        userRef.update({ sellos: sellos, horas_gratis: horas_gratis }, () => {
            renderAdminTable();
            if (currentUser && currentUser.id === id) renderUserDashboard();
        });
    });
}

function cobrarPremio(id) {
    if (!id) { showToast("Error: ID de usuario no válido", "error"); return; }
    const userRef = database.ref('users/' + id);
    userRef.once('value', (snapshot) => {
        const user = snapshot.val();
        if (!user) { showToast("Error: Usuario no encontrado", "error"); return; }
        if (!user.horas_gratis || user.horas_gratis <= 0) { showToast("Este usuario no tiene horas disponibles", "error"); return; }
        showConfirm("Confirmar Canje", `¿Deseas canjear 1 hora gratis para ${user.nombre}? (${user.horas_gratis} disponibles)`, () => {
            userRef.update({ horas_gratis: user.horas_gratis - 1 }, () => {
                renderAdminTable();
                if (currentUser && currentUser.id === id) renderUserDashboard();
                showToast("🎮 Hora aplicada con éxito", "success");
            });
        });
    });
}

function eliminarUsuario(id) {
    if (!id) { showToast("Error: ID de usuario no válido", "error"); return; }
    const userRef = database.ref('users/' + id);
    userRef.once('value', (snapshot) => {
        const user = snapshot.val();
        if (!user) { showToast("Error: Usuario no encontrado", "error"); return; }
        if (currentUser && currentUser.id === id) { showToast("⚠️ No puedes eliminar tu propia cuenta", "error"); return; }
        showConfirm("Eliminar Cliente", `¿Eliminar permanentemente a ${user.nombre}?`, () => {
            deleteUser(id, () => {
                renderAdminTable();
                if (currentUser && currentUser.id === id) { currentUser = null; switchView('view-home'); showToast("Tu cuenta ha sido eliminada", "info"); } else { showToast(`🗑️ ${user.nombre} removido`, "success"); }
            });
        });
    });
}

function openUserModal(id = null) {
    const modal = document.getElementById('user-modal');
    modal.querySelector('form').reset();
    if (id) {
        document.getElementById('modal-title').innerText = "Modificar Datos de Cliente";
        document.getElementById('modal-pass-container').classList.add('hidden');
        const userRef = database.ref('users/' + id);
        userRef.once('value', (snapshot) => {
            const user = snapshot.val();
            if (user) {
                document.getElementById('modal-user-id').value = user.id;
                document.getElementById('modal-name').value = user.nombre;
                document.getElementById('modal-email').value = user.correo;
                document.getElementById('modal-phone').value = user.telefono;
                modal.classList.remove('hidden');
            } else { showToast("Error: Usuario no encontrado", "error"); }
        });
    } else {
        document.getElementById('modal-title').innerText = "Nuevo Registro de Cliente";
        document.getElementById('modal-pass-container').classList.remove('hidden');
        document.getElementById('modal-user-id').value = '';
        modal.classList.remove('hidden');
    }
}

function closeUserModal() {
    document.getElementById('user-modal').classList.add('hidden');
}

function handleModalSubmit(e) {
    e.preventDefault();
    const id = document.getElementById('modal-user-id').value;
    const nombre = document.getElementById('modal-name').value.trim();
    const correo = document.getElementById('modal-email').value.trim();
    const telefono = document.getElementById('modal-phone').value.trim();
    if (!nombre || nombre.length < 2) { showToast("El nombre debe tener al menos 2 caracteres", "error"); return; }
    if (!validateEmail(correo)) { showToast("Correo electrónico inválido", "error"); return; }
    if (!validatePhone(telefono)) { showToast("Teléfono inválido (10 dígitos)", "error"); return; }
    const normalizedEmail = correo.toLowerCase();
    const sanitizedPhone = sanitizePhone(telefono);
    if (id) {
        const userRef = database.ref('users/' + id);
        userRef.update({
            nombre: sanitizeText(nombre),
            correo: normalizedEmail,
            telefono: sanitizedPhone
        }, () => {
            if (currentUser && currentUser.id === id) {
                currentUser = { ...currentUser, nombre: sanitizeText(nombre), correo: normalizedEmail, telefono: sanitizedPhone };
                renderUserDashboard();
            }
            renderAdminTable();
            showToast("✅ Cambios guardados", "success");
            closeUserModal();
        });
    } else {
        const contrasena = document.getElementById('modal-pass').value || "123";
        if (contrasena.length < MIN_PASSWORD_LENGTH) { showToast(`La contraseña debe tener al menos ${MIN_PASSWORD_LENGTH} caracteres`, "error"); return; }
        const dbRef = database.ref('users');
        dbRef.orderByChild('correo').equalTo(normalizedEmail).once('value', (snapshot) => {
            if (snapshot.exists()) { showToast("El correo ya está registrado", "error"); return; }
            dbRef.orderByChild('telefono').equalTo(sanitizedPhone).once('value', (phoneSnapshot) => {
                if (phoneSnapshot.exists()) { showToast("El teléfono ya está registrado", "error"); return; }
                const avatars = ["helmet", "cyborg", "ninja"];
                const randomAvatar = avatars[Math.floor(Math.random() * avatars.length)];
                const newUser = {
                    id: Date.now().toString(),
                    nombre: sanitizeText(nombre),
                    correo: normalizedEmail,
                    telefono: sanitizedPhone,
                    contrasena: contrasena,
                    sellos: 0,
                    horas_gratis: 0,
                    avatar: randomAvatar,
                    fecha_registro: new Date().toISOString()
                };
                saveUser(newUser, () => {
                    renderAdminTable();
                    showToast("✅ Nuevo usuario registrado", "success");
                    closeUserModal();
                });
            });
        });
    }
}

// ============================================
// RENDERIZADO DE TABLA ADMIN (TIEMPO REAL)
// ============================================
function renderAdminTable() {
    const dbRef = database.ref('users');
    dbRef.off();
    dbRef.on('value', (snapshot) => {
        const data = snapshot.val();
        const db = data ? Object.values(data) : [];
        const searchInput = document.getElementById('admin-search');
        if (!searchInput) return;
        const search = searchInput.value.toLowerCase();
        const tbody = document.getElementById('admin-table-body');
        const cardsContainer = document.getElementById('admin-cards-container');
        if (!tbody || !cardsContainer) return;
        tbody.innerHTML = '';
        cardsContainer.innerHTML = '';
        const filtered = db.filter(u => u.correo.toLowerCase().includes(search) || u.telefono.includes(search) || u.nombre.toLowerCase().includes(search));
        if (filtered.length === 0) {
            tbody.innerHTML = `<tr><td colspan="5" class="p-8 text-center text-slate-400 font-medium bg-slate-900/10">No se encontraron clientes.</td></tr>`;
            cardsContainer.innerHTML = `<div class="p-8 text-center text-slate-400 font-medium">No se encontraron clientes.</div>`;
            return;
        }
        filtered.forEach(user => {
            const progressPct = (user.sellos / MAX_STAMPS) * 100;
            const tr = document.createElement('tr');
            tr.className = "hover:bg-slate-850/40 transition-all border-b border-slate-850";
            tr.innerHTML = `
                        <td class="p-4 pl-6 font-bold text-white text-sm"><div class="flex items-center gap-3">${getGamerAvatarSvg(user.avatar || "helmet")}<span>${user.nombre}</span></div></td>
                        <td class="p-4 text-slate-400 text-xs"><div class="font-medium text-slate-200">${user.correo}</div><div class="font-mono text-slate-400">${user.telefono}</div></td>
                        <td class="p-4 text-center"><div class="flex items-center gap-2 justify-center"><span class="bg-slate-950 px-2.5 py-1 rounded-lg font-mono text-emerald-400 font-extrabold text-xs">${user.sellos}/${MAX_STAMPS}</span><div class="w-16 h-2 bg-slate-950 rounded-full overflow-hidden hidden sm:block"><div class="h-full bg-emerald-500 transition-all duration-300" style="width: ${Math.min(progressPct, 100)}%"></div></div></div></td>
                        <td class="p-4 text-center"><span class="px-2.5 py-1.5 rounded-lg font-extrabold text-xs ${user.horas_gratis > 0 ? 'bg-emerald-950/40 text-emerald-400 border border-emerald-800/40' : 'bg-slate-950 text-slate-600 border border-slate-850'}">🎁 ${user.horas_gratis} Horas</span></td>
                        <td class="p-4 pr-6 text-right space-x-1 whitespace-nowrap">
                            <button onclick="liberarConsumo('${user.id}')" class="bg-[#107C10] hover:brightness-110 text-white text-xs font-bold px-3 py-2 rounded-xl transition-all cursor-pointer shadow-md active:scale-95">+1 Sello</button>
                            ${user.horas_gratis > 0 ? `<button onclick="cobrarPremio('${user.id}')" class="bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs font-bold px-3 py-2 rounded-xl transition-all cursor-pointer active:scale-95">Canjear</button>` : ''}
                            <button onclick="openUserModal('${user.id}')" class="bg-slate-800 hover:bg-slate-750 text-slate-300 text-xs font-semibold px-2.5 py-2 rounded-xl transition-all cursor-pointer">Editar</button>
                            <button onclick="eliminarUsuario('${user.id}')" class="text-rose-400 hover:text-white bg-rose-500/10 hover:bg-rose-600 text-xs px-2.5 py-2 rounded-xl transition-all cursor-pointer border border-rose-500/20">Eliminar</button>
                        </td>
                    `;
            tbody.appendChild(tr);

            const card = document.createElement('div');
            card.className = "pt-4 first:pt-0 pb-2 space-y-3";
            card.innerHTML = `
                        <div class="flex items-center justify-between gap-3">
                            <div class="flex items-center gap-3">${getGamerAvatarSvg(user.avatar || "helmet")}<div><h4 class="font-bold text-white text-sm leading-tight">${user.nombre}</h4><span class="text-[9px] font-black text-emerald-400 tracking-wider font-mono uppercase bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20 inline-block mt-1">${user.sellos}/${MAX_STAMPS} SELLOS</span></div></div>
                            <div class="text-right"><span class="block text-[8px] text-slate-500 font-bold uppercase tracking-wider">Premio Listo</span><span class="inline-flex items-center gap-1 text-[11px] font-extrabold px-2 py-0.5 rounded bg-emerald-950/40 text-emerald-400 border border-emerald-800/40 mt-0.5">🎁 ${user.horas_gratis} Hrs</span></div>
                        </div>
                        <div class="text-[11px] text-slate-400 space-y-1 bg-slate-950/40 p-2.5 rounded-xl border border-slate-850">
                            <div class="flex items-center gap-1.5 break-all"><svg class="w-3 h-3 text-emerald-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/></svg>${user.correo}</div>
                            <div class="flex items-center gap-1.5 font-mono"><svg class="w-3 h-3 text-emerald-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.94.725l.548 2.2a1 1 0 01-.321.988l-1.305.98a10.582 10.582 0 004.872 4.872l.98-1.305a1 1 0 01.988-.321l2.2.548a1 1 0 01.725.94V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"/></svg>${user.telefono}</div>
                        </div>
                        <div class="w-full h-1.5 bg-slate-950 rounded-full overflow-hidden"><div class="h-full bg-emerald-500 transition-all duration-300" style="width: ${Math.min(progressPct, 100)}%"></div></div>
                        <div class="flex flex-wrap gap-1.5 pt-1">
                            <button onclick="liberarConsumo('${user.id}')" class="flex-1 bg-[#107C10] hover:brightness-110 text-white text-[10px] font-black uppercase tracking-wider py-2 px-3 rounded-lg transition-all active:scale-95 shadow-md">+1 Sello</button>
                            ${user.horas_gratis > 0 ? `<button onclick="cobrarPremio('${user.id}')" class="flex-1 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px] font-black uppercase tracking-wider py-2 px-3 rounded-lg transition-all active:scale-95">Canjear</button>` : ''}
                            <button onclick="openUserModal('${user.id}')" class="bg-slate-800 hover:bg-slate-750 text-slate-300 text-[10px] font-bold py-2 px-3 rounded-lg transition-all">Editar</button>
                            <button onclick="eliminarUsuario('${user.id}')" class="text-rose-400 hover:text-white bg-rose-500/10 hover:bg-rose-600 border border-rose-500/20 text-[10px] font-bold py-2 px-2.5 rounded-lg transition-all"><svg xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg></button>
                        </div>
                    `;
            cardsContainer.appendChild(card);
        });
    });
}


// ============================================
// INICIALIZACIÓN CON RESTAURACIÓN DE SESIÓN
// ============================================
(async function init() {
    console.log('🎮 Xbox Lounge - Firebase');

    // 1. Inicializar la base de datos (crear usuarios semilla si no existen)
    initializeDatabase();

    // 2. Listener de autenticación para restaurar sesión al recargar
    auth.onAuthStateChanged(async (user) => {
        if (user) {
            const uid = user.uid;
            const email = user.email;
            console.log('🔄 Restaurando sesión para:', email);

            // Admin
            if (email === 'admin@xbox.com') {
                currentUser = {
                    id: uid,
                    uid: uid,
                    correo: email,
                    nombre: "Administrador",
                };
                updateNavButtons();
                switchView('view-admin-dashboard');
                return;
            }

            // Usuario normal
            try {
                const userSnapshot = await database.ref('users/' + uid).once('value');
                const userData = userSnapshot.val();

                if (userData && isValidUser(userData)) {
                    currentUser = {
                        ...userData,
                        id: uid,
                        uid: uid
                    };
                    updateNavButtons();
                    switchView('view-user-dashboard');
                } else {
                    currentUser = null;
                    await auth.signOut();
                    switchView('view-home');
                }
            } catch (error) {
                console.error('❌ Error al restaurar sesión:', error);
                currentUser = null;
                switchView('view-home');
            }
        } else {
            currentUser = null;
            updateNavButtons();
            switchView('view-home');
        }
    });
})();


// ============================================
// ACTUALIZAR BOTONES DE NAVEGACIÓN
// ============================================
function updateNavButtons() {
    const btnHome = document.getElementById('btn-home');
    const btnLogout = document.getElementById('btn-logout');
    if (!btnHome || !btnLogout) return;
    if (currentUser) {
        btnHome.classList.add('hidden');
        btnLogout.classList.remove('hidden');
    } else {
        btnHome.classList.remove('hidden');
        btnLogout.classList.add('hidden');
    }
}


// ============================================
// EXPONER FUNCIONES AL ÁMBITO GLOBAL (WINDOW)
// ============================================
window.updateNavButtons = updateNavButtons;
window.switchView = switchView;
window.logout = logout;
window.toggleAuthTabs = toggleAuthTabs;
window.quickFillUser = quickFillUser;
window.handleUserLogin = handleUserLogin;
window.handleUserRegister = handleUserRegister;
window.handleAdminLogin = handleAdminLogin;
window.liberarConsumo = liberarConsumo;
window.cobrarPremio = cobrarPremio;
window.eliminarUsuario = eliminarUsuario;
window.openUserModal = openUserModal;
window.closeUserModal = closeUserModal;
window.handleModalSubmit = handleModalSubmit;
window.resetDatabase = resetDatabase;
window.renderAdminTable = renderAdminTable;

window.showToast = showToast;
window.showConfirm = showConfirm;
window.toggleAuthTabs = toggleAuthTabs;
window.quickFillUser = quickFillUser;
window.getGamerAvatarSvg = getGamerAvatarSvg;


window.debug = {
    database: database,
    resetDatabase: resetDatabase,
    SEED_USERS: SEED_USERS
};