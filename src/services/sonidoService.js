// =======================================================================
// src/services/sonidoService.js — Datos de sonido del evento (colección aparte)
//
// festivales_sonido/{eventoId}
//   sonido.tecnico : Rider técnico (lista de canales, totales, consola, nota)
//   sonido.rec     : (v2.3) grabación del show
//
// Vive fuera de `festivales` a propósito: el sonidista (v2.5) va a poder leer y
// editar esta colección sin tener acceso a las finanzas del evento.
// =======================================================================

import { db, doc, getDoc, setDoc, deleteDoc, collection, query, where, onSnapshot } from "../config/firebase.js";
import { COLLECTIONS } from "../config/constants.js";
import { notificarErrorPersistencia } from "../utils/errores.js";

/**
 * Lee los datos de sonido de un evento.
 * Devuelve { existe: false, datos: {} } si todavía no hay nada guardado.
 * Lanza el error si la lectura falla (por ejemplo, sin permiso): así la UI no
 * confunde "no hay datos" con "no se pudo leer" y no pisa nada.
 */
export async function obtenerSonidoEvento(eventoId) {
    const snap = await getDoc(doc(db, COLLECTIONS.FESTIVALES_SONIDO, eventoId));
    if (!snap.exists()) return { existe: false, datos: {} };
    return { existe: true, datos: snap.data() || {} };
}

/**
 * Copia de lectura para sonidistas: los datos del evento que ellos pueden ver (sin finanzas).
 * `partes` puede traer: ficha { nombre, venue, direccion, capacidad, fechaHora, fecha, estado }, artistas { participantes },
 * riderGeneral { columnas, asignaciones, cancionesNotas }, checklist { items, categorias }.
 * Se mezcla con lo que ya hay (merge): no toca `sonido` (Rider técnico y REC).
 */
export async function espejarSonidoEvento(eventoId, partes) {
    try {
        await setDoc(doc(db, COLLECTIONS.FESTIVALES_SONIDO, eventoId), {
            eventoId,
            ...partes,
            espejoActualizadoEn: new Date().toISOString()
        }, { merge: true });
        return true;
    } catch (err) {
        console.warn(`[Mandala Festivales] No se pudo actualizar la copia para sonidistas de ${eventoId}:`, err);
        return false;
    }
}

/**
 * Al duplicar un evento: copia su Rider técnico y su REC al evento nuevo, para editarlos después.
 * Devuelve { ok, copiado } (copiado = qué partes había para copiar).
 */
export async function copiarSonidoEvento(origenId, destinoId) {
    try {
        const snap = await getDoc(doc(db, COLLECTIONS.FESTIVALES_SONIDO, origenId));
        const sonido = (snap.exists() && snap.data().sonido) || {};
        const aCopiar = {};
        if (sonido.riderTecnico) aCopiar.riderTecnico = sonido.riderTecnico;
        if (sonido.rec) aCopiar.rec = sonido.rec;
        const copiado = Object.keys(aCopiar);
        if (!copiado.length) return { ok: true, copiado };
        await setDoc(doc(db, COLLECTIONS.FESTIVALES_SONIDO, destinoId), {
            eventoId: destinoId,
            sonido: aCopiar,
            actualizadoEn: new Date().toISOString(),
            actualizadoPor: ''
        }, { merge: true });
        return { ok: true, copiado };
    } catch (err) {
        console.warn(`[Mandala Festivales] No se pudo copiar el sonido de ${origenId} a ${destinoId}:`, err);
        return { ok: false, copiado: [] };
    }
}

/** Borra la copia de un evento eliminado (también su Rider técnico y REC). */
export async function eliminarSonidoEvento(eventoId) {
    try {
        await deleteDoc(doc(db, COLLECTIONS.FESTIVALES_SONIDO, eventoId));
        return true;
    } catch (err) {
        console.warn(`[Mandala Festivales] No se pudo borrar la copia para sonidistas de ${eventoId}:`, err);
        return false;
    }
}

/**
 * Escucha en tiempo real los eventos "En Curso" (lo único que ve un sonidista).
 * La consulta lleva el filtro porque las reglas solo dejan leer esos documentos.
 */
export function escucharEventosSonidoEnCurso(onDatos, onError) {
    const q = query(collection(db, COLLECTIONS.FESTIVALES_SONIDO), where('ficha.estado', '==', 'En Curso'));
    return onSnapshot(q, (snap) => {
        const lista = [];
        snap.forEach(d => lista.push({ id: d.id, ...d.data() }));
        onDatos(lista);
    }, (err) => {
        console.warn('[Mandala Festivales] Error al escuchar los eventos para sonidistas:', err);
        if (typeof onError === 'function') onError(err);
    });
}

/**
 * Guarda el REC (grabación del show) de un evento (reemplaza sonido.rec completo).
 * Con merge no toca sonido.tecnico ni el resto del documento.
 */
export async function guardarRecEvento(eventoId, rec, usuarioEmail = '') {
    try {
        await setDoc(doc(db, COLLECTIONS.FESTIVALES_SONIDO, eventoId), {
            eventoId,
            sonido: { rec },
            actualizadoEn: new Date().toISOString(),
            actualizadoPor: usuarioEmail || ''
        }, { merge: true });
        return true;
    } catch (err) {
        console.error(`[Mandala Festivales] Error al guardar el REC de ${eventoId}:`, err);
        notificarErrorPersistencia("la grabación (REC)", err);
        return false;
    }
}

/**
 * Guarda el Rider técnico de un evento (reemplaza sonido.tecnico completo).
 */
export async function guardarRiderTecnicoEvento(eventoId, tecnico, usuarioEmail = '') {
    try {
        await setDoc(doc(db, COLLECTIONS.FESTIVALES_SONIDO, eventoId), {
            eventoId,
            sonido: { riderTecnico: tecnico },
            actualizadoEn: new Date().toISOString(),
            actualizadoPor: usuarioEmail || ''
        }, { merge: true });
        return true;
    } catch (err) {
        console.error(`[Mandala Festivales] Error al guardar el rider técnico de ${eventoId}:`, err);
        notificarErrorPersistencia("el rider técnico", err);
        return false;
    }
}
