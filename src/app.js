// =======================================================================
// src/app.js — Orquestador Modular de Mandala Festivales
// =======================================================================

import { APP_VERSION } from "./config/constants.js";
import { db, auth } from "./config/firebase.js";
import { 
    loginConGoogle, 
    loginConEmail, 
    cerrarSesionFirebase, 
    escucharEstadoAutenticacion 
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
import { obtenerUsuariosSistemaFirestore, obtenerUsuarioPorEmail } from "./services/usuariosService.js";
import { obtenerGastosCajaFirestore, guardarGastosCajaFirestore, obtenerIngresosManualesCajaFirestore, guardarIngresosManualesCajaFirestore, escucharCajaEnTiempoReal } from "./services/cajaService.js";
import { obtenerTarifasProductoraFirestore, guardarTarifasProductoraFirestore, obtenerPreciosEntradasFirestore, guardarPreciosEntradasFirestore } from "./services/configuracionService.js";
import { obtenerInstrumentosFirestore, escucharInstrumentosEnTiempoReal, getEmojiParaInstrumento, obtenerInstrumentosActualesSync } from "./services/instrumentosService.js";

console.log(`[Mandala Festivales] Inicializando arquitectura modular (${APP_VERSION})...`);

// Exponer servicios a window para integración transparente con UI
window.MandalaApp = {
    version: APP_VERSION,
    db,
    auth: {
        instance: auth,
        loginConGoogle,
        loginConEmail,
        cerrarSesion: cerrarSesionFirebase
    },
    usuarios: {
        obtener: obtenerUsuariosSistemaFirestore,
        obtenerPorEmail: obtenerUsuarioPorEmail
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
 * Manejador del ciclo de sesión reactivo con Firebase
 */
async function manejarCambioSesion(user) {
    const loginContainer = document.getElementById('login-container');
    const appLayout = document.getElementById('app-layout');
    const displayEmail = document.getElementById('user-display-email');
    const avatarCircle = document.querySelector('.user-avatar-circle');

    if (user) {
        console.log(`[Mandala Festivales] Usuario autenticado: ${user.email}`);
        if (typeof window.mostrarIndicadorCarga === 'function' && !document.documentElement.classList.contains('festivales-loaded')) {
            window.mostrarIndicadorCarga('Cargando datos...');
        }

        let nombreUsuario = user.displayName || localStorage.getItem('mandala_current_user_name') || (user.email ? user.email.split('@')[0] : 'Usuario');
        let rolUsuario = localStorage.getItem('mandala_current_user_role') || 'Coordinador';

        try {
            const perfil = await obtenerUsuarioPorEmail(user.email);
            if (perfil) {
                if (perfil.activo === false) {
                    console.warn(`[Mandala Festivales] El usuario ${user.email} está inactivo.`);
                    if (typeof window.ocultarIndicadorCarga === 'function') window.ocultarIndicadorCarga();
                    await cerrarSesionFirebase();
                    if (window.mostrarToast) window.mostrarToast('Tu usuario se encuentra inactivo. Consultá con administración.', 'error');
                    return;
                }
                nombreUsuario = perfil.nombre || nombreUsuario;
                rolUsuario = perfil.rol ? (perfil.rol.charAt(0).toUpperCase() + perfil.rol.slice(1)) : 'Coordinador';
            }
        } catch (e) {
            console.warn('[Mandala Festivales] Error al obtener perfil de usuarios_sistema:', e);
        }

        // Persistir sesión para recargas y nuevas versiones (idéntico a Mandala Admisión)
        try {
            localStorage.setItem('mandala_festival_has_session', 'true');
            localStorage.setItem('mandala_has_session', 'true');
            localStorage.setItem('mandala_current_user_email', user.email);
            localStorage.setItem('mandala_current_user_name', nombreUsuario);
            localStorage.setItem('mandala_current_user_role', rolUsuario);
            document.documentElement.classList.add('user-has-session');
        } catch (e) {}

        if (loginContainer) loginContainer.style.display = 'none';
        if (appLayout) appLayout.classList.add('active');
        
        if (typeof window.actualizarInfoUsuarioUI === 'function') {
            window.actualizarInfoUsuarioUI(nombreUsuario, user.email, rolUsuario);
        } else {
            if (displayEmail) displayEmail.textContent = user.email || 'Usuario Mandala';
            if (avatarCircle) {
                const iniciales = (nombreUsuario || user.email || 'PB')
                    .split(' ')
                    .map(n => n[0])
                    .slice(0, 2)
                    .join('')
                    .toUpperCase();
                avatarCircle.textContent = iniciales || 'MH';
            }
        }

        // Sincronizar datos de Firestore tras verificar autenticación
        sincronizarDatosTrasLogin();
    } else {
        const tieneSesionGuardada = localStorage.getItem('mandala_festival_has_session') === 'true' || 
                                   localStorage.getItem('mandala_has_session') === 'true';
        if (tieneSesionGuardada) {
            console.log("[Mandala Festivales] Sesión activa detectada en almacenamiento local, manteniendo estado logueado.");
            document.documentElement.classList.add('user-has-session');
            if (typeof window.mostrarIndicadorCarga === 'function' && !document.documentElement.classList.contains('festivales-loaded')) {
                window.mostrarIndicadorCarga('Cargando datos...');
            }
            if (loginContainer) loginContainer.style.display = 'none';
            if (appLayout) appLayout.classList.add('active');
            
            const savedEmail = localStorage.getItem('mandala_current_user_email') || 'productora.mandalahouse@gmail.com';
            const savedName = localStorage.getItem('mandala_current_user_name') || 'Pablo Bianchino';
            const savedRole = localStorage.getItem('mandala_current_user_role') || 'Administrador';
            if (typeof window.actualizarInfoUsuarioUI === 'function') {
                window.actualizarInfoUsuarioUI(savedName, savedEmail, savedRole);
            }
            sincronizarDatosTrasLogin();
            return;
        }

        console.log("[Mandala Festivales] No hay sesión activa. Mostrando pantalla de login.");
        document.documentElement.classList.remove('user-has-session');
        if (typeof window.ocultarIndicadorCarga === 'function') window.ocultarIndicadorCarga();
        if (loginContainer) loginContainer.style.display = 'flex';
        if (appLayout) appLayout.classList.remove('active');
    }
}

/**
 * Sincronización proactiva de datos de Firestore
 */
async function sincronizarDatosTrasLogin() {
    try {
        // Sincronización continua en tiempo real de Festivales desde Firestore (Multi-Ventana / Multi-Operador)
        escucharFestivalesEnTiempoReal((festivalesActualizados) => {
            console.log(`[Mandala Festivales] Sincronizados ${festivalesActualizados.length} festivales en tiempo real desde Firestore.`);
            if (typeof window.poblarFestivalesDesdeFirestore === 'function') {
                window.poblarFestivalesDesdeFirestore(festivalesActualizados);
            }
        });

        // Sincronización continua en tiempo real de Caja (Gastos e Ingresos manuales) desde Firestore
        escucharCajaEnTiempoReal((gastosActualizados) => {
            console.log("[Mandala Festivales] Sincronización de gastos recibida en tiempo real desde la base de datos.");
            if (typeof window.aplicarSincronizacionGastos === 'function') {
                window.aplicarSincronizacionGastos(gastosActualizados);
            }
        }, (ingresosActualizados) => {
            console.log("[Mandala Festivales] Sincronización de ingresos manuales recibida en tiempo real desde la base de datos.");
            if (typeof window.aplicarSincronizacionIngresos === 'function') {
                window.aplicarSincronizacionIngresos(ingresosActualizados);
            }
        });

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
        escucharInstrumentosEnTiempoReal((instrumentosActualizados) => {
            console.log(`[Mandala Festivales] Instrumentos actualizados en tiempo real: ${instrumentosActualizados.length}`);
            if (typeof window.poblarInstrumentosDesdeFirestore === 'function') {
                window.poblarInstrumentosDesdeFirestore(instrumentosActualizados);
            }
        });

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
