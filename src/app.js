// =======================================================================
// src/app.js — Orquestador Modular de Mandala Festivales
// =======================================================================

import { APP_VERSION } from "./config/constants.js";
import { db, auth } from "./config/firebase.js";
import { 
    loginConGoogle, 
    loginConEmail, 
    cerrarSesionFirebase,
    escucharEstadoAutenticacion,
    esSesionConPassword,
    cambiarPasswordUsuario,
    limpiarSesionLocal
} from "./services/authService.js";
import { obtenerAlumnosMandala, buscarAlumnosMandala, obtenerAlumnoPorId } from "./services/alumnosService.js";
import { 
    obtenerFestivalesFirestore, 
    guardarFestivalFirestore, 
    actualizarCamposFestivalFirestore, 
    guardarLoteHistoricoFestivales, 
    restaurarLoteHistoricoOriginal,
    FESTIVALES_HISTORICOS_ORIGINALES,
    eliminarFestivalFirestore, 
    escucharFestivalesEnTiempoReal 
} from "./services/festivalesService.js";
import { obtenerVenuesFirestore, guardarVenueFirestore, guardarLoteVenues, eliminarVenueFirestore } from "./services/venuesService.js";
import { obtenerSesionistasFirestore, guardarSesionistaFirestore, eliminarSesionistaFirestore } from "./services/sesionistasService.js";
import { obtenerUsuariosSistemaFirestore, obtenerUsuarioPorEmail, consultarAccesoUsuario, marcarPasswordModificada } from "./services/usuariosService.js";
import { obtenerGastosCajaFirestore, guardarGastosCajaFirestore, obtenerIngresosManualesCajaFirestore, guardarIngresosManualesCajaFirestore, escucharCajaEnTiempoReal } from "./services/cajaService.js";
import { obtenerTarifasProductoraFirestore, guardarTarifasProductoraFirestore, obtenerPreciosEntradasFirestore, guardarPreciosEntradasFirestore } from "./services/configuracionService.js";
import { obtenerInstrumentosFirestore, escucharInstrumentosEnTiempoReal, getEmojiParaInstrumento, obtenerInstrumentosActualesSync } from "./services/instrumentosService.js";

import { idVenueEstable, idHistoricoEstable } from "./utils/ids.js";

console.log(`[Mandala Festivales] Inicializando arquitectura modular (${APP_VERSION})...`);

// Exponer servicios a window para integración transparente con UI
window.MandalaApp = {
    version: APP_VERSION,
    ids: {
        venue: idVenueEstable,
        historico: idHistoricoEstable
    },
    db,
    auth: {
        instance: auth,
        loginConGoogle,
        loginConEmail,
        cerrarSesion: cerrarSesionFirebase,
        cambiarPassword: cambiarPasswordUsuario,
        esSesionConPassword
    },
    usuarios: {
        obtener: obtenerUsuariosSistemaFirestore,
        obtenerPorEmail: obtenerUsuarioPorEmail,
        marcarPasswordModificada
    },
    alumnos: {
        obtener: obtenerAlumnosMandala,
        buscar: buscarAlumnosMandala,
        obtenerPorId: obtenerAlumnoPorId
    },
    instrumentos: {
        obtener: obtenerInstrumentosFirestore,
        escuchar: escucharInstrumentosEnTiempoReal,
        getEmoji: getEmojiParaInstrumento,
        obtenerSync: obtenerInstrumentosActualesSync
    },
    festivales: {
        obtener: obtenerFestivalesFirestore,
        escuchar: escucharFestivalesEnTiempoReal,
        guardar: guardarFestivalFirestore,
        actualizarCampos: actualizarCamposFestivalFirestore,
        guardarLoteHistorico: guardarLoteHistoricoFestivales,
        restaurarHistoricos: restaurarLoteHistoricoOriginal,
        festivalesOriginales: FESTIVALES_HISTORICOS_ORIGINALES,
        eliminar: eliminarFestivalFirestore
    },
    venues: {
        obtener: obtenerVenuesFirestore,
        guardar: guardarVenueFirestore,
        guardarLote: guardarLoteVenues,
        eliminar: eliminarVenueFirestore
    },
    sesionistas: {
        obtener: obtenerSesionistasFirestore,
        guardar: guardarSesionistaFirestore,
        eliminar: eliminarSesionistaFirestore
    },
    caja: {
        obtenerGastos: obtenerGastosCajaFirestore,
        guardarGastos: guardarGastosCajaFirestore,
        obtenerIngresos: obtenerIngresosManualesCajaFirestore,
        guardarIngresos: guardarIngresosManualesCajaFirestore,
        escuchar: escucharCajaEnTiempoReal
    },
    configuracion: {
        obtenerTarifasProductora: obtenerTarifasProductoraFirestore,
        guardarTarifasProductora: guardarTarifasProductoraFirestore,
        obtenerPreciosEntradas: obtenerPreciosEntradasFirestore,
        guardarPreciosEntradas: guardarPreciosEntradasFirestore
    }
};

/**
 * Muestra un mensaje de error en la pantalla de login
 */
function mostrarErrorLogin(mensaje) {
    const box = document.getElementById('login-error-msg');
    if (box) {
        box.textContent = mensaje;
        box.style.display = 'block';
    }
}

/**
 * Muestra la pantalla de login y oculta la app
 */
function mostrarPantallaLogin() {
    const loginContainer = document.getElementById('login-container');
    const appLayout = document.getElementById('app-layout');
    document.documentElement.classList.remove('user-has-session');
    if (typeof window.ocultarIndicadorCarga === 'function') window.ocultarIndicadorCarga();
    if (loginContainer) loginContainer.style.display = 'flex';
    if (appLayout) appLayout.classList.remove('active');
    const btnSubmit = document.getElementById('btn-login-email-submit');
    if (btnSubmit) { btnSubmit.disabled = false; btnSubmit.innerHTML = '<span>Iniciar Sesión</span>'; }
    const btnGoogle = document.getElementById('btn-login-google');
    if (btnGoogle) btnGoogle.disabled = false;
}

const MENSAJES_ACCESO_DENEGADO = {
    sin_perfil: 'Tu correo no está dado de alta en el sistema Mandala. Consultá con administración.',
    inactivo: 'Tu usuario se encuentra inactivo. Consultá con administración.',
    sin_rol_festivales: 'Tu usuario no tiene el perfil "Gestor de Festivales". Pedile a administración que te lo asigne.',
    sin_permiso: 'Tu usuario no tiene permiso para acceder. Consultá con administración.',
    error: 'No se pudo verificar tu acceso. Revisá tu conexión y reintentá.'
};

/**
 * Manejador del ciclo de sesión reactivo con Firebase.
 * Solo se ingresa con una sesión confirmada por Firebase Auth y un perfil activo en usuarios_sistema.
 */
async function manejarCambioSesion(user) {
    const loginContainer = document.getElementById('login-container');
    const appLayout = document.getElementById('app-layout');

    if (!user) {
        console.log("[Mandala Festivales] No hay sesión activa. Mostrando pantalla de login.");
        detenerListenersTiempoReal();
        limpiarSesionLocal();
        mostrarPantallaLogin();
        return;
    }

    console.log(`[Mandala Festivales] Usuario autenticado: ${user.email}`);
    if (typeof window.mostrarIndicadorCarga === 'function' && !document.documentElement.classList.contains('festivales-loaded')) {
        window.mostrarIndicadorCarga('Cargando datos...');
    }

    const acceso = await consultarAccesoUsuario(user.email);
    if (acceso.estado !== 'ok') {
        console.warn(`[Mandala Festivales] Acceso denegado a ${user.email}: ${acceso.estado}`);
        await cerrarSesionFirebase();
        mostrarPantallaLogin();
        mostrarErrorLogin(MENSAJES_ACCESO_DENEGADO[acceso.estado] || MENSAJES_ACCESO_DENEGADO.error);
        return;
    }

    const perfil = acceso.perfil;
    const nombreUsuario = perfil.nombre || user.displayName || (user.email ? user.email.split('@')[0] : 'Usuario');
    const rolUsuario = perfil.rol ? (perfil.rol.charAt(0).toUpperCase() + perfil.rol.slice(1)) : 'Coordinador';
    window.usuarioActual = perfil;

    // Datos solo de presentación (no otorgan acceso): evitan parpadeos al recargar
    try {
        localStorage.setItem('mandala_festival_has_session', 'true');
        localStorage.setItem('mandala_has_session', 'true');
        localStorage.setItem('mandala_current_user_email', user.email);
        localStorage.setItem('mandala_current_user_name', nombreUsuario);
        localStorage.setItem('mandala_current_user_role', rolUsuario);
        document.documentElement.classList.add('user-has-session');
    } catch (e) {}

    const errBox = document.getElementById('login-error-msg');
    if (errBox) errBox.style.display = 'none';
    if (loginContainer) loginContainer.style.display = 'none';
    if (appLayout) appLayout.classList.add('active');

    if (typeof window.actualizarInfoUsuarioUI === 'function') {
        window.actualizarInfoUsuarioUI(nombreUsuario, user.email, rolUsuario);
    }

    // Cambio obligatorio de la clave inicial (solo cuando se ingresó con correo y contraseña)
    if (perfil.password_modificada === false && await esSesionConPassword(user)) {
        if (typeof window.exigirCambioClaveInicial === 'function') window.exigirCambioClaveInicial();
    }

    sincronizarDatosTrasLogin();
}

/**
 * Sincronización proactiva de datos de Firestore
 */
// Listeners de tiempo real activos (se cierran al cerrar sesión o antes de re-suscribir, para no duplicar)
let listenersActivos = [];

function detenerListenersTiempoReal() {
    listenersActivos.forEach(unsub => { try { if (typeof unsub === 'function') unsub(); } catch (e) {} });
    listenersActivos = [];
}

async function sincronizarDatosTrasLogin() {
    detenerListenersTiempoReal();
    try {
        // Sincronización continua en tiempo real de Festivales desde Firestore (Multi-Ventana / Multi-Operador)
        listenersActivos.push(escucharFestivalesEnTiempoReal((festivalesActualizados) => {
            console.log(`[Mandala Festivales] Sincronizados ${festivalesActualizados.length} festivales en tiempo real desde Firestore.`);
            if (typeof window.poblarFestivalesDesdeFirestore === 'function') {
                window.poblarFestivalesDesdeFirestore(festivalesActualizados);
            }
        }));

        // Sincronización continua en tiempo real de Caja (Gastos e Ingresos manuales) desde Firestore
        listenersActivos.push(escucharCajaEnTiempoReal((gastosActualizados) => {
            console.log("[Mandala Festivales] Sincronización de gastos recibida en tiempo real desde la base de datos.");
            if (typeof window.aplicarSincronizacionGastos === 'function') {
                window.aplicarSincronizacionGastos(gastosActualizados);
            }
        }, (ingresosActualizados) => {
            console.log("[Mandala Festivales] Sincronización de ingresos manuales recibida en tiempo real desde la base de datos.");
            if (typeof window.aplicarSincronizacionIngresos === 'function') {
                window.aplicarSincronizacionIngresos(ingresosActualizados);
            }
        }));

        const alumnos = await obtenerAlumnosMandala(true);
        console.log(`[Mandala Festivales] Sincronizados ${alumnos.length} alumnos desde Firestore.`);
        if (typeof window.renderizarArtistasFestival === 'function') {
            window.renderizarArtistasFestival();
        }

        // Sincronizar Instrumentos Maestros desde Firestore (compartidos con Admisión)
        const instrumentos = await obtenerInstrumentosFirestore(true);
        console.log(`[Mandala Festivales] Sincronizados ${instrumentos.length} instrumentos maestros desde Firestore.`);
        if (typeof window.poblarInstrumentosDesdeFirestore === 'function') {
            window.poblarInstrumentosDesdeFirestore(instrumentos);
        }

        // Escuchar actualizaciones de instrumentos en tiempo real
        listenersActivos.push(escucharInstrumentosEnTiempoReal((instrumentosActualizados) => {
            console.log(`[Mandala Festivales] Instrumentos actualizados en tiempo real: ${instrumentosActualizados.length}`);
            if (typeof window.poblarInstrumentosDesdeFirestore === 'function') {
                window.poblarInstrumentosDesdeFirestore(instrumentosActualizados);
            }
        }));

        // Sincronizar Venues desde Firestore si existen
        const venues = await obtenerVenuesFirestore();
        console.log(`[Mandala Festivales] Sincronizados ${venues.length} venues desde Firestore.`);
        if (venues.length > 0 && typeof window.poblarVenuesDesdeFirestore === 'function') {
            window.poblarVenuesDesdeFirestore(venues);
        }

        // Sincronizar Sesionistas desde Firestore si existen
        const sesionistas = await obtenerSesionistasFirestore();
        console.log(`[Mandala Festivales] Sincronizados ${sesionistas.length} sesionistas desde Firestore.`);
        if (typeof window.poblarSesionistasDesdeFirestore === 'function') {
            window.poblarSesionistasDesdeFirestore(sesionistas);
        }

        // Sincronizar Tarifas de Productora y Precios por Defecto desde Firestore
        try {
            const tarifasProd = await obtenerTarifasProductoraFirestore();
            const preciosEnt = await obtenerPreciosEntradasFirestore();
            if (typeof window.poblarConfiguracionDesdeFirestore === 'function') {
                window.poblarConfiguracionDesdeFirestore(tarifasProd, preciosEnt);
            }
        } catch (e) {
            console.warn("[Mandala Festivales] Error al cargar configuración general:", e);
        }
    } catch (err) {
        console.warn("[Mandala Festivales] Error durante sincronización tras login:", err);
        if (typeof window.ocultarIndicadorCarga === 'function') {
            window.ocultarIndicadorCarga();
        }
    }
}

// Suscripción al observer de Firebase Auth
escucharEstadoAutenticacion(manejarCambioSesion);
