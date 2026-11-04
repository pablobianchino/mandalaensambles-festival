// =======================================================================
// src/services/authService.js — Servicio de Autenticación de Firebase Auth
// Solo Firebase Auth es fuente de verdad: no hay claves locales de contingencia
// ni sesiones simuladas desde localStorage.
// =======================================================================

import {
    auth,
    provider,
    signInWithPopup,
    signInWithEmailAndPassword,
    signOut,
    onAuthStateChanged,
    EmailAuthProvider,
    reauthenticateWithCredential,
    updatePassword
} from "../config/firebase.js";

const CLAVES_SESION_LOCAL = [
    'mandala_festival_has_session',
    'mandala_has_session',
    'mandala_current_user_email',
    'mandala_current_user_name',
    'mandala_current_user_role',
    'mandala_festival_pass' // clave local de versiones anteriores: ya no se usa y se elimina
];

/**
 * Traduce códigos de error de Firebase Auth a mensajes claros para el usuario
 */
function mensajeErrorAuth(error) {
    switch (error && error.code) {
        case 'auth/wrong-password':
        case 'auth/invalid-credential':
            return 'Contraseña o correo incorrectos. Si tu cuenta usa Google, ingresá con el botón de Google. Si olvidaste tu contraseña, pedile al administrador que te restablezca el acceso.';
        case 'auth/user-not-found':
            return 'No se encontró un usuario registrado con este correo.';
        case 'auth/too-many-requests':
            return 'Demasiados intentos fallidos. Esperá unos minutos antes de reintentar.';
        case 'auth/invalid-email':
            return 'El formato del correo electrónico no es válido.';
        case 'auth/network-request-failed':
            return 'No hay conexión con el servidor. Revisá tu internet y reintentá.';
        case 'auth/operation-not-allowed':
            return 'El acceso con correo y contraseña no está habilitado en Firebase.';
        case 'auth/popup-closed-by-user':
        case 'auth/cancelled-popup-request':
            return 'Se cerró la ventana de Google antes de completar el ingreso.';
        default:
            return 'No se pudo iniciar sesión. Reintentá en unos instantes.';
    }
}

/**
 * Iniciar sesión con Google Popup
 */
export async function loginConGoogle() {
    try {
        const result = await signInWithPopup(auth, provider);
        console.log("[Mandala Auth] Sesión iniciada con Google:", result.user.email);
        return { ok: true, user: result.user };
    } catch (error) {
        console.error("[Mandala Auth] Error al autenticar con Google:", error.code);
        return { ok: false, error: mensajeErrorAuth(error), code: error.code };
    }
}

/**
 * Iniciar sesión con Correo y Contraseña (únicamente contra Firebase Auth)
 */
export async function loginConEmail(email, password) {
    try {
        const cred = await signInWithEmailAndPassword(auth, (email || '').trim().toLowerCase(), password);
        console.log("[Mandala Auth] Sesión iniciada con correo:", cred.user.email);
        return { ok: true, user: cred.user };
    } catch (error) {
        console.warn("[Mandala Auth] Error de credenciales:", error.code);
        return { ok: false, error: mensajeErrorAuth(error), code: error.code };
    }
}

/**
 * Indica si la sesión actual se inició con correo y contraseña (no con Google)
 */
export async function esSesionConPassword(user) {
    try {
        const tok = await (user || auth.currentUser).getIdTokenResult();
        return tok?.signInProvider === 'password';
    } catch (e) {
        return false;
    }
}

/**
 * Cambiar la contraseña del usuario logueado (reautentica con la actual)
 */
export async function cambiarPasswordUsuario(passActual, passNueva) {
    const user = auth.currentUser;
    if (!user || !user.email) {
        return { ok: false, error: 'No hay una sesión activa para cambiar la contraseña.' };
    }
    try {
        const cred = EmailAuthProvider.credential(user.email, passActual);
        await reauthenticateWithCredential(user, cred);
        await updatePassword(user, passNueva);
        return { ok: true };
    } catch (error) {
        console.warn("[Mandala Auth] Error al cambiar contraseña:", error.code);
        let msg = mensajeErrorAuth(error);
        if (error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
            msg = 'La contraseña actual es incorrecta. Si no la recordás, pedile al administrador que te restablezca el acceso.';
        } else if (error.code === 'auth/weak-password') {
            msg = 'La nueva contraseña es demasiado débil. Usá al menos 6 caracteres.';
        } else if (error.code === 'auth/requires-recent-login') {
            msg = 'Por seguridad, cerrá sesión, volvé a ingresar y reintentá el cambio.';
        }
        return { ok: false, error: msg };
    }
}

/**
 * Borra los datos de sesión guardados en el navegador
 */
export function limpiarSesionLocal() {
    try {
        CLAVES_SESION_LOCAL.forEach(k => localStorage.removeItem(k));
        document.documentElement.classList.remove('user-has-session');
    } catch (e) { /* sin acceso a localStorage */ }
}

/**
 * Cerrar sesión
 */
export async function cerrarSesionFirebase() {
    try {
        limpiarSesionLocal();
        await signOut(auth);
        console.log("[Mandala Auth] Sesión cerrada.");
        return { ok: true };
    } catch (error) {
        console.error("[Mandala Auth] Error al cerrar sesión:", error);
        return { ok: false, error };
    }
}

/**
 * Suscribirse a cambios en el estado de autenticación.
 * Solo se informa un usuario cuando Firebase Auth lo confirma.
 */
export function escucharEstadoAutenticacion(callback) {
    return onAuthStateChanged(auth, (user) => callback(user || null));
}
