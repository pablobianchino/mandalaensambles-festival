// =======================================================================
// src/services/planificacionService.js — Clases que chocan con un evento (v2.11)
//
// festivales_planificacion/{eventoId}
//   eventoId, nombre, fechaISO
//   revision: { fechaISO, revisadoEn, revisadoPor, docentes: { <clave email>: { email, nombre, estado, error, clases: [{ id, titulo, inicio, fin }] } } }
//       estado: 'ok' (revisado) | 'sin_calendario' | 'error'
//   resoluciones: { <fechaISO__email__idClase>: { estado: 'reprogramada'|'cancelada'|'no_aplica', por, porNombre, fecha } }
// festivales_planificacion/_control
//   ultimaRevisionDiaria: 'AAAA-MM-DD', por, en   → la revisión de todos los eventos se hace una vez por día
//
// MODO PRUEBA (solo para probar en local sin tocar la base real):
//   localStorage.setItem('mandala_pruebas_sin_escritura', '1') → las escrituras quedan solo en memoria de esta pestaña.
// =======================================================================

import { db, doc, getDoc, setDoc, updateDoc, deleteField, collection, onSnapshot } from "../config/firebase.js";
import { COLLECTIONS } from "../config/constants.js";

export const ID_CONTROL = '_control';

export function modoPruebaSinEscritura() {
    try { return localStorage.getItem('mandala_pruebas_sin_escritura') === '1'; } catch (e) { return false; }
}

// ---- Memoria del modo prueba: se mezcla con lo leído de la base ----
const _memoria = {};       // id -> { revision?, resoluciones? , ... }
let _ultimaLectura = {};   // id -> datos leídos de Firestore
let _oyente = null;

function mezclarConMemoria(base) {
    const out = {};
    Object.keys(base).forEach(id => { out[id] = { ...base[id] }; });
    Object.keys(_memoria).forEach(id => {
        const m = _memoria[id];
        const b = out[id] || { eventoId: id };
        const res = { ...(b.resoluciones || {}) };
        Object.keys(m.resoluciones || {}).forEach(k => { if (m.resoluciones[k] === null) delete res[k]; else res[k] = m.resoluciones[k]; });
        out[id] = { ...b, ...m, resoluciones: res };
    });
    return out;
}
function avisarOyente() {
    if (typeof _oyente === 'function') _oyente(mezclarConMemoria(_ultimaLectura));
}

/** Escucha toda la colección. onDatos recibe { [eventoId]: datos } (incluye _control). */
export function escucharPlanificacion(onDatos, onError) {
    _oyente = onDatos;
    return onSnapshot(collection(db, COLLECTIONS.FESTIVALES_PLANIFICACION), (snap) => {
        const mapa = {};
        snap.forEach(d => { mapa[d.id] = d.data() || {}; });
        _ultimaLectura = mapa;
        avisarOyente();
    }, (err) => {
        console.warn('[Mandala Festivales] No se pudo leer la planificación de clases:', err && (err.code || err));
        if (typeof onError === 'function') onError(err);
        // Igual se muestra lo que haya en memoria (modo prueba)
        avisarOyente();
    });
}

/** Reemplaza el resultado de la revisión de un evento (no toca las resoluciones). */
export async function guardarRevisionEvento(eventoId, { nombre, fechaISO, revision }) {
    if (!eventoId || !revision) return false;
    const datos = { eventoId, nombre: nombre || '', fechaISO: fechaISO || '', revision };
    if (modoPruebaSinEscritura()) {
        _memoria[eventoId] = { ...(_memoria[eventoId] || {}), ...datos };
        console.info(`[Planificación · prueba] Revisión de ${eventoId} guardada solo en memoria.`);
        avisarOyente();
        return true;
    }
    try {
        await setDoc(doc(db, COLLECTIONS.FESTIVALES_PLANIFICACION, eventoId), datos, { mergeFields: ['eventoId', 'nombre', 'fechaISO', 'revision'] });
        return true;
    } catch (err) {
        console.warn(`[Mandala Festivales] No se pudo guardar la revisión de clases de ${eventoId}:`, err && (err.code || err));
        return false;
    }
}

/** Marca (o deshace, con valor null) la resolución de una clase. */
export async function guardarResolucionClase(eventoId, clave, valor) {
    if (!eventoId || !clave) return false;
    if (modoPruebaSinEscritura()) {
        const m = _memoria[eventoId] = (_memoria[eventoId] || {});
        m.resoluciones = { ...(m.resoluciones || {}), [clave]: valor || null };
        console.info(`[Planificación · prueba] Resolución ${clave} guardada solo en memoria.`);
        avisarOyente();
        return true;
    }
    try {
        await setDoc(doc(db, COLLECTIONS.FESTIVALES_PLANIFICACION, eventoId), {
            eventoId,
            resoluciones: { [clave]: valor ? valor : deleteField() }
        }, { merge: true });
        return true;
    } catch (err) {
        console.warn(`[Mandala Festivales] No se pudo guardar la resolución de la clase (${eventoId}):`, err && (err.code || err));
        return false;
    }
}

/** Día de la última revisión completa ('AAAA-MM-DD' o ''). */
export async function leerUltimaRevisionDiaria() {
    if (modoPruebaSinEscritura() && _memoria[ID_CONTROL]) return _memoria[ID_CONTROL].ultimaRevisionDiaria || '';
    try {
        const snap = await getDoc(doc(db, COLLECTIONS.FESTIVALES_PLANIFICACION, ID_CONTROL));
        return snap.exists() ? (snap.data().ultimaRevisionDiaria || '') : '';
    } catch (err) {
        console.warn('[Mandala Festivales] No se pudo leer el control de la revisión diaria:', err && (err.code || err));
        return null; // null = no se sabe (sin permiso o sin conexión)
    }
}

export async function marcarRevisionDiaria(diaISO, email) {
    const datos = { ultimaRevisionDiaria: diaISO, por: email || '', en: new Date().toISOString() };
    if (modoPruebaSinEscritura()) { _memoria[ID_CONTROL] = datos; return true; }
    try {
        await setDoc(doc(db, COLLECTIONS.FESTIVALES_PLANIFICACION, ID_CONTROL), datos);
        return true;
    } catch (err) {
        console.warn('[Mandala Festivales] No se pudo marcar la revisión diaria:', err && (err.code || err));
        return false;
    }
}

/**
 * "Recordar mañana" / "Pausar 2 h" del popup: se guarda en el documento del propio usuario, como en Admisión.
 * Si las reglas todavía no lo permiten, queda solo en este navegador (lo maneja quien llama).
 */
export async function guardarAvisosPospuestos(usuarioId, valor) {
    if (!usuarioId) return false;
    if (modoPruebaSinEscritura()) return true;
    try {
        await updateDoc(doc(db, COLLECTIONS.USUARIOS_SISTEMA, usuarioId), { avisos_festival_pospuestos: valor || deleteField() });
        return true;
    } catch (err) {
        console.warn('[Mandala Festivales] No se pudo guardar la pausa de avisos en el usuario:', err && (err.code || err));
        return false;
    }
}
