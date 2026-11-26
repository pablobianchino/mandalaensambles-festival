// =======================================================================
// src/app.js — Orquestador Modular de Mandala Festivales
// =======================================================================

import { APP_VERSION, URL_PORTAL_CORE, APP_ID_FESTIVAL } from "./config/constants.js";
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
import { obtenerUsuariosSistemaFirestore, obtenerUsuarioPorEmail, consultarAccesoUsuario, marcarPasswordModificada, obtenerDocentesActivos } from "./services/usuariosService.js";
import { obtenerClasesDelDia, obtenerCalendarioDocente } from "./services/calendarioService.js";
import { escucharPlanificacion, guardarRevisionEvento, guardarResolucionClase, leerUltimaRevisionDiaria, marcarRevisionDiaria, guardarAvisosPospuestos, modoPruebaSinEscritura, ID_CONTROL } from "./services/planificacionService.js";
import { obtenerGastosCajaFirestore, guardarGastosCajaFirestore, obtenerIngresosManualesCajaFirestore, guardarIngresosManualesCajaFirestore, escucharCajaEnTiempoReal, migrarCajaAFormato2, revertirCajaAFormato1, obtenerFormatoCaja, usarColeccionCaja } from "./services/cajaService.js";
import { obtenerTarifasProductoraFirestore, guardarTarifasProductoraFirestore, obtenerProductorasFirestore, guardarProductorasFirestore, obtenerPreciosEntradasFirestore, guardarPreciosEntradasFirestore, obtenerChecklistProduccionPlantillaFirestore, guardarChecklistProduccionPlantillaFirestore, obtenerCategoriasEquipamientoFirestore, guardarCategoriasEquipamientoFirestore } from "./services/configuracionService.js";
import { obtenerInstrumentosFirestore, escucharInstrumentosEnTiempoReal, getEmojiParaInstrumento, obtenerInstrumentosActualesSync } from "./services/instrumentosService.js";

import { obtenerSonidoEvento, guardarRiderTecnicoEvento, borrarRecDeTodosLosEventos, copiarSonidoEvento, espejarSonidoEvento, eliminarSonidoEvento, escucharEventosSonidoEnCurso, escucharEventosSonidoPlanificador } from "./services/sonidoService.js";
import { obtenerSonidistasFirestore, guardarDatosSonidistaFirestore, altaSonidistaFirestore, cambiarActivoSonidistaFirestore, quitarSonidistaFirestore } from "./services/sonidistasService.js";

import { idVenueEstable, idHistoricoEstable } from "./utils/ids.js";
import { usarPaseDeCore } from "./services/pase.js";

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
        obtenerDocentes: obtenerDocentesActivos,
        marcarPasswordModificada
    },
    // v2.11: aviso de clases que chocan con un evento
    calendario: {
        clasesDelDia: obtenerClasesDelDia,
        calendarioDocente: obtenerCalendarioDocente
    },
    planificacion: {
        escuchar: escucharPlanificacion,
        guardarRevision: guardarRevisionEvento,
        guardarResolucion: guardarResolucionClase,
        leerRevisionDiaria: leerUltimaRevisionDiaria,
        marcarRevisionDiaria,
        guardarPospuestos: guardarAvisosPospuestos,
        modoPrueba: modoPruebaSinEscritura,
        ID_CONTROL
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
    sonido: {
        obtener: obtenerSonidoEvento,
        guardarTecnico: guardarRiderTecnicoEvento,
        borrarRecTodos: borrarRecDeTodosLosEventos,
        copiar: copiarSonidoEvento,
        espejar: espejarSonidoEvento,
        eliminar: eliminarSonidoEvento,
        escucharEnCurso: escucharEventosSonidoEnCurso
    },
    sonidistas: {
        obtener: obtenerSonidistasFirestore,
        guardarDatos: guardarDatosSonidistaFirestore,
        alta: altaSonidistaFirestore,
        cambiarActivo: cambiarActivoSonidistaFirestore,
        quitar: quitarSonidistaFirestore
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
        escuchar: escucharCajaEnTiempoReal,
        // Formato de almacenamiento (ver cajaService.js): se migra a pedido y se puede revertir
        formato: obtenerFormatoCaja,
        migrarAFormato2: migrarCajaAFormato2,
        revertirAFormato1: revertirCajaAFormato1,
        usarColeccion: usarColeccionCaja
    },
    configuracion: {
        obtenerTarifasProductora: obtenerTarifasProductoraFirestore,
        guardarTarifasProductora: guardarTarifasProductoraFirestore,
        obtenerProductoras: obtenerProductorasFirestore,
        guardarProductoras: guardarProductorasFirestore,
        obtenerPreciosEntradas: obtenerPreciosEntradasFirestore,
        guardarPreciosEntradas: guardarPreciosEntradasFirestore,
        obtenerChecklistProduccion: obtenerChecklistProduccionPlantillaFirestore,
        guardarChecklistProduccion: guardarChecklistProduccionPlantillaFirestore,
        obtenerCategoriasEquipamiento: obtenerCategoriasEquipamientoFirestore,
        guardarCategoriasEquipamiento: guardarCategoriasEquipamientoFirestore
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
    // Si se cierra una sesión de sonidista, la siguiente persona no hereda el modo reducido
    document.documentElement.classList.remove('modo-sonidista', 'modo-planificador', 'ver-planificacion');
    window.modoSonidista = false;
    window.modoPlanificador = false;
    if (typeof window.ocultarIndicadorCarga === 'function') window.ocultarIndicadorCarga();
    if (loginContainer) loginContainer.style.display = 'flex';
    if (appLayout) appLayout.classList.remove('active');
    const btnSubmit = document.getElementById('btn-login-email-submit');
    if (btnSubmit) { btnSubmit.disabled = false; btnSubmit.innerHTML = '<span>Iniciar Sesión</span>'; }
    const btnGoogle = document.getElementById('btn-login-google');
    if (btnGoogle) btnGoogle.disabled = false;
}

// =======================================================================
// v2.14: PANTALLA "SIN ACCESO" (dentro de la tarjeta del login). Los accesos se dan en el Portal Central (Core).
// =======================================================================
const TITULOS_SIN_ACCESO = {
    sin_acceso_app: 'No tenés acceso a Festivales',
    inactivo: 'Tu usuario está inactivo',
    sin_perfil: 'Tu correo no está dado de alta'
};
const NOMBRES_APPS = {
    admision: { nombre: 'Admisión', clase: '' },
    festival: { nombre: 'Festivales', clase: 'fest' },
    core: { nombre: 'Portal Central', clase: 'gen' }
};

function escHtml(t) {
    return String(t == null ? '' : t).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function mostrarSinAcceso(estado, email, apps) {
    const caja = document.getElementById('login-sin-acceso');
    const form = document.getElementById('login-formulario');
    if (!caja || !form) { mostrarErrorLogin(MENSAJES_ACCESO_DENEGADO[estado] || MENSAJES_ACCESO_DENEGADO.error); return; }
    const correo = escHtml(email || '');
    document.getElementById('sin-acceso-titulo').textContent = TITULOS_SIN_ACCESO[estado] || TITULOS_SIN_ACCESO.sin_acceso_app;
    const textos = {
        sin_acceso_app: `Tu usuario (${correo}) no tiene habilitada esta aplicación. Si la necesitás, pedile acceso al administrador.`,
        inactivo: `Tu usuario (${correo}) está dado de baja. Si necesitás volver a entrar, pedile acceso al administrador.`,
        sin_perfil: `Tu correo (${correo}) no está registrado en el sistema Mandala. Pedile acceso al administrador.`
    };
    document.getElementById('sin-acceso-texto').innerHTML = textos[estado] || textos.sin_acceso_app;
    const otras = (Array.isArray(apps) ? apps : []).filter(a => a && a !== APP_ID_FESTIVAL);
    const elApps = document.getElementById('sin-acceso-apps');
    if (otras.length) {
        elApps.innerHTML = '<span class="apps-tit">Tenés acceso a:</span>' + otras.map(a => {
            const info = NOMBRES_APPS[a] || { nombre: a.charAt(0).toUpperCase() + a.slice(1), clase: 'gen' };
            return `<span class="app-pill ${info.clase}">${escHtml(info.nombre)}</span>`;
        }).join('');
        elApps.style.display = 'flex';
    } else {
        elApps.innerHTML = '';
        elApps.style.display = 'none';
    }
    const portal = document.getElementById('sin-acceso-portal');
    if (portal) portal.href = URL_PORTAL_CORE;
    const errBox = document.getElementById('login-error-msg');
    if (errBox) errBox.style.display = 'none';
    form.style.display = 'none';
    caja.style.display = 'block';
}

window.mostrarSinAccesoLogin = mostrarSinAcceso; // solo pantalla (para revisar el diseño desde la consola)

// "Cerrar sesión" de la pantalla sin acceso: la sesión ya se cerró; se vuelve al formulario de ingreso
window.volverAlFormularioLogin = function () {
    const caja = document.getElementById('login-sin-acceso');
    const form = document.getElementById('login-formulario');
    if (caja) caja.style.display = 'none';
    if (form) form.style.display = '';
    cerrarSesionFirebase().catch(() => {});
};

const MENSAJES_ACCESO_DENEGADO = {
    sin_perfil: 'Tu correo no está dado de alta en el sistema Mandala. Consultá con administración.',
    inactivo: 'Tu usuario se encuentra inactivo. Consultá con administración.',
    sin_rol_festivales: 'Tu usuario no tiene el perfil "Gestor de Festivales", "Planificador de clases" ni el de sonidista. Pedile a administración que te lo asigne.',
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
        // Si en esta página había una sesión abierta, se recarga entera: así quien entre después arranca en Eventos,
        // sin la pantalla, el historial ni los datos en memoria de la persona anterior (por ejemplo, las finanzas
        // de un admin quedando cargadas para un sonidista o un planificador).
        if (window.usuarioActual) {
            window.usuarioActual = null;
            window.location.reload();
            return;
        }
        mostrarPantallaLogin();
        return;
    }

    console.log(`[Mandala Festivales] Usuario autenticado: ${user.email}`);
    // (el aviso "Cargando..." del arranque lo reemplaza la pantalla de carga inicial #splash-inicial)

    const acceso = await consultarAccesoUsuario(user.email);
    if (acceso.estado !== 'ok') {
        console.warn(`[Mandala Festivales] Acceso denegado a ${user.email}: ${acceso.estado}`);
        window.usuarioActual = null; // no se recarga: tiene que quedar visible el motivo en la pantalla de login
        await cerrarSesionFirebase();
        mostrarPantallaLogin();
        // v2.14: sin acceso a la app, inactivo o sin alta → pantalla con el diseño de Admisión y el botón al Portal Central
        if (['sin_acceso_app', 'inactivo', 'sin_perfil'].includes(acceso.estado)) {
            mostrarSinAcceso(acceso.estado, user.email, acceso.apps || []);
        } else {
            mostrarErrorLogin(MENSAJES_ACCESO_DENEGADO[acceso.estado] || MENSAJES_ACCESO_DENEGADO.error);
        }
        return;
    }

    const perfil = acceso.perfil;
    const esSoloSonidista = !!perfil.esSoloSonidista;
    const vista = resolverVistaRol(perfil);
    const nombreUsuario = perfil.nombre || user.displayName || (user.email ? user.email.split('@')[0] : 'Usuario');
    const rolUsuario = esSoloSonidista ? 'Sonidista' : (vista.modoPlanificador ? 'Planificador de clases' : (perfil.rol ? (perfil.rol.charAt(0).toUpperCase() + perfil.rol.slice(1)) : 'Coordinador'));
    window.usuarioActual = perfil;
    window.vistaRol = vista;
    // Modo sonidista: acceso reducido (solo eventos en curso; lee casi todo y edita Rider técnico y REC)
    window.modoSonidista = esSoloSonidista;
    document.documentElement.classList.toggle('modo-sonidista', esSoloSonidista);
    // Modo planificador (v2.11): eventos en solo lectura (Info y Cronograma) + Planificación
    window.modoPlanificador = vista.modoPlanificador;
    document.documentElement.classList.toggle('modo-planificador', vista.modoPlanificador);
    document.documentElement.classList.toggle('ver-planificacion', vista.verPlanificacion);

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

    if (typeof window.renderizarSelectorVistaRol === 'function') window.renderizarSelectorVistaRol();

    if (esSoloSonidista) sincronizarDatosSonidista();
    else if (vista.modoPlanificador) sincronizarDatosPlanificador();
    else sincronizarDatosTrasLogin();
}

// =======================================================================
// VISTA POR ROL (v2.11) — igual que "Ver plataforma como" de Admisión
//   'multi'        Vista Global Multi-Rol: los permisos sumados (gestión + Planificación)
//   'gestion'      Administrador o Gestor de Festivales
//   'planificador' Planificador de clases (vista reducida)
// Con un solo rol no hay elección. Se recuerda la última en este navegador.
// =======================================================================
const CLAVE_VISTA_ROL = 'mandala_festival_vista_rol';

function resolverVistaRol(perfil) {
    const opciones = [];
    if (perfil.tieneGestion) opciones.push('gestion');
    if (perfil.esPlanificador) opciones.push('planificador');
    const varios = opciones.length > 1;
    if (varios) opciones.unshift('multi');
    let elegida = opciones[0] || 'gestion';
    if (varios) {
        try { const g = localStorage.getItem(CLAVE_VISTA_ROL); if (opciones.includes(g)) elegida = g; } catch (e) {}
    }
    const modoPlanificador = !perfil.esSoloSonidista && (perfil.esSoloPlanificador || elegida === 'planificador');
    const verPlanificacion = modoPlanificador || (elegida === 'multi') || (!!perfil.esAdmin && elegida !== 'planificador') || (perfil.esPlanificador && elegida !== 'gestion');
    return { opciones, elegida, varios, modoPlanificador, verPlanificacion, esAdmin: !!perfil.esAdmin };
}

window.cambiarVistaRol = function (vista) {
    const v = window.vistaRol;
    if (!v || !v.varios || !v.opciones.includes(vista) || v.elegida === vista) return;
    try { localStorage.setItem(CLAVE_VISTA_ROL, vista); } catch (e) {}
    // Cada vista lee datos distintos (el planificador solo la copia sin finanzas): se vuelve a cargar la app
    window.location.reload();
};

/**
 * Datos de un planificador de clases: los eventos Programado y En Curso de la copia sin finanzas
 * (festivales_sonido) y la planificación de clases. No lee festivales, caja ni alumnos.
 */
function sincronizarDatosPlanificador() {
    detenerListenersTiempoReal();
    listenersActivos.push(escucharEventosSonidoPlanificador((lista) => {
        console.log(`[Mandala Festivales] Modo planificador: ${lista.length} evento(s) programados o en curso.`);
        if (typeof window.poblarEventosPlanificador === 'function') window.poblarEventosPlanificador(lista);
    }, () => {
        if (typeof window.ocultarIndicadorCarga === 'function') window.ocultarIndicadorCarga();
        if (typeof window.mostrarToast === 'function') window.mostrarToast('No se pudieron cargar los eventos. Revisá la conexión o pedí que te habiliten.', 'error');
    }));
    escucharPlanificacionClases();
}

function escucharPlanificacionClases() {
    listenersActivos.push(escucharPlanificacion((mapa) => {
        if (window.Planificacion && typeof window.Planificacion.alRecibirDatos === 'function') window.Planificacion.alRecibirDatos(mapa);
    }));
}

/**
 * Datos de un sonidista: solo los eventos "En Curso" de `festivales_sonido` (copia sin finanzas), en tiempo real.
 * No lee festivales, caja, alumnos ni nada más: las reglas de Firestore no se lo permiten.
 */
function sincronizarDatosSonidista() {
    detenerListenersTiempoReal();
    listenersActivos.push(escucharEventosSonidoEnCurso((lista) => {
        console.log(`[Mandala Festivales] Modo sonidista: ${lista.length} evento(s) en curso.`);
        if (typeof window.poblarEventosSonidista === 'function') window.poblarEventosSonidista(lista);
    }, () => {
        if (typeof window.ocultarIndicadorCarga === 'function') window.ocultarIndicadorCarga();
        if (typeof window.mostrarToast === 'function') window.mostrarToast('No se pudieron cargar los eventos. Revisá la conexión.', 'error');
    }));
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

/**
 * Carga la configuración general (productoras, tarifas, precios, plantilla del checklist de producción y categorías del checklist
 * de equipamiento). Se piden en paralelo y se aplican antes que el resto de los datos, que tardan más en llegar.
 */
async function cargarConfiguracionInicial() {
    const seguro = (promesa, que) => promesa.catch(e => { console.warn(`[Mandala Festivales] Error al cargar ${que}:`, e); return undefined; });
    const [tarifasProd, preciosEnt, listadoProductoras, plantillaChk, resCat] = await Promise.all([
        seguro(obtenerTarifasProductoraFirestore(), 'las tarifas de la productora'),
        seguro(obtenerPreciosEntradasFirestore(), 'los precios de entradas'),
        seguro(obtenerProductorasFirestore(), 'las productoras'),
        seguro(obtenerChecklistProduccionPlantillaFirestore(), 'la plantilla del checklist de producción'),
        seguro(obtenerCategoriasEquipamientoFirestore(), 'las categorías del checklist de equipamiento')
    ]);

    try {
        if (typeof window.poblarConfiguracionDesdeFirestore === 'function') {
            window.poblarConfiguracionDesdeFirestore(tarifasProd, preciosEnt, listadoProductoras);
        }
    } catch (e) {
        console.warn("[Mandala Festivales] Error al aplicar la configuración general:", e);
    }
    // Si no llegó nada de productoras, la pantalla avisa en vez de quedar en blanco
    if (typeof window.marcarProductorasNoCargadas === 'function') window.marcarProductorasNoCargadas();

    try {
        if (typeof window.poblarChecklistProduccionPlantilla === 'function') window.poblarChecklistProduccionPlantilla(plantillaChk);
    } catch (e) {
        console.warn("[Mandala Festivales] Error al aplicar la plantilla del checklist de producción:", e);
    }
    try {
        if (typeof window.poblarCategoriasEquipamiento === 'function') window.poblarCategoriasEquipamiento(resCat);
    } catch (e) {
        console.warn("[Mandala Festivales] Error al aplicar las categorías del checklist de equipamiento:", e);
    }
}

async function sincronizarDatosTrasLogin() {
    detenerListenersTiempoReal();
    try {
        // Configuración primero: es chica y la usan todas las pantallas (productoras, tarifas, precios, plantilla y categorías)
        await cargarConfiguracionInicial();

        // Sincronización continua en tiempo real de Festivales desde Firestore (Multi-Ventana / Multi-Operador)
        listenersActivos.push(escucharFestivalesEnTiempoReal((festivalesActualizados) => {
            console.log(`[Mandala Festivales] Sincronizados ${festivalesActualizados.length} festivales en tiempo real desde Firestore.`);
            if (typeof window.poblarFestivalesDesdeFirestore === 'function') {
                window.poblarFestivalesDesdeFirestore(festivalesActualizados);
            }
            // La lista de Productoras cuenta en cuántos festivales se usa cada una
            if (typeof window.renderizarListaProductoras === 'function') window.renderizarListaProductoras();
            // Una vez por sesión se asegura la copia de lectura de los eventos en curso para los sonidistas
            if (typeof window.espejarEnCursoParaSonidistas === 'function') window.espejarEnCursoParaSonidistas(festivalesActualizados);
            // Aviso de clases (v2.11): con los eventos ya cargados se hace la revisión del día, si corresponde
            if (window.Planificacion && typeof window.Planificacion.alCargarEventos === 'function') window.Planificacion.alCargarEventos();
        }));

        // Planificación de clases (v2.11): resultado de la revisión y resoluciones, en tiempo real
        escucharPlanificacionClases();

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

    } catch (err) {
        console.warn("[Mandala Festivales] Error durante sincronización tras login:", err);
        if (typeof window.ocultarIndicadorCarga === 'function') {
            window.ocultarIndicadorCarga();
        }
    }
}

// Botón "Reintentar" de la pastilla de sincronización: vuelve a suscribirse a los datos
window.reintentarSincronizacion = function () {
    if (window.notificarSincronizacion) window.notificarSincronizacion('loading', 'Cargando datos...');
    sincronizarDatosTrasLogin().then(() => {
        if (window.notificarSincronizacion) window.notificarSincronizacion('hide');
    });
};

// v2.16 (etapa 4): si se abrió desde Core con un pase (#pase=…), se entra con ese usuario antes de escuchar la sesión.
// Reemplaza cualquier sesión anterior de este navegador. Sin pase, o si el canje falla, el arranque sigue igual que antes.
const resultadoPase = await usarPaseDeCore(auth, APP_ID_FESTIVAL);
if (resultadoPase.error) console.warn('[Mandala Festivales] Pase de Core:', resultadoPase.error);

// Suscripción al observer de Firebase Auth
escucharEstadoAutenticacion(manejarCambioSesion);
