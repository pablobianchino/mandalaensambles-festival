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

import { db, doc, getDoc, setDoc } from "../config/firebase.js";
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
 * Guarda el Rider técnico de un evento (reemplaza sonido.tecnico completo).
 */
export async function guardarRiderTecnicoEvento(eventoId, tecnico, usuarioEmail = '') {
    try {
        await setDoc(doc(db, COLLECTIONS.FESTIVALES_SONIDO, eventoId), {
            eventoId,
            sonido: { tecnico },
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
