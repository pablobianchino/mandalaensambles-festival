// =======================================================================
// src/services/venuesService.js — Servicio de Venues (Salas) en Firestore
// =======================================================================

import { db, collection, getDocs, doc, setDoc, deleteDoc, writeBatch } from "../config/firebase.js";
import { COLLECTIONS } from "../config/constants.js";
import { notificarErrorPersistencia } from "../utils/errores.js";
import { idVenueEstable, ejecutarEnLotes } from "../utils/ids.js";

/**
 * Obtener todos los venues de Firestore
 */
export async function obtenerVenuesFirestore() {
    try {
        const colRef = collection(db, COLLECTIONS.VENUES);
        const snapshot = await getDocs(colRef);
        const venues = [];
        snapshot.forEach(docSnap => {
            venues.push({ id: docSnap.id, ...docSnap.data() });
        });
        return venues;
    } catch (err) {
        console.warn("[Mandala Festivales] Error al cargar venues de Firestore:", err);
        return [];
    }
}

/**
 * Guardar o actualizar un venue en Firestore
 */
export async function guardarVenueFirestore(venueId, venueData) {
    // Un id vacío arma la ruta "venues" (1 segmento) y Firestore la rechaza: se frena acá y se deja la traza del origen.
    if (venueId === undefined || venueId === null || String(venueId).trim() === "") {
        console.warn("[Mandala Festivales] Se intentó guardar un venue sin id; no se guardó nada.", venueData, new Error("traza").stack);
        return false;
    }
    try {
        const docRef = doc(db, COLLECTIONS.VENUES, venueId);
        await setDoc(docRef, { ...venueData, actualizadoEn: new Date().toISOString() }, { merge: true });
        console.log(`[Mandala Festivales] Venue ${venueId} guardado con éxito.`);
        return true;
    } catch (err) {
        console.error(`[Mandala Festivales] Error al guardar venue ${venueId}:`, err);
        notificarErrorPersistencia("el venue", err);
        return false;
    }
}

/**
 * Guardar lote masivo de venues (Importación XLSX)
 */
export async function guardarLoteVenues(lote) {
    try {
        // Id estable por nombre: reimportar el mismo Excel actualiza en vez de duplicar.
        // Se escribe en lotes atómicos: o entra todo el bloque o no entra nada.
        const ahora = new Date().toISOString();
        const ops = lote.map(item => (batch) => {
            const id = idVenueEstable(item.nombre);
            batch.set(doc(db, COLLECTIONS.VENUES, id), { ...item, id, importadoEn: ahora }, { merge: true });
        });
        await ejecutarEnLotes(db, writeBatch, ops);
        console.log(`[Mandala Festivales] Lote de ${lote.length} venues guardado en Firestore.`);
        return true;
    } catch (err) {
        console.error("[Mandala Festivales] Error al guardar lote de venues:", err);
        notificarErrorPersistencia("el lote de venues", err);
        return false;
    }
}

/**
 * Eliminar un venue en Firestore
 */
export async function eliminarVenueFirestore(venueId) {
    if (venueId === undefined || venueId === null || String(venueId).trim() === "") {
        console.warn("[Mandala Festivales] Se intentó eliminar un venue sin id; no se hizo nada.", new Error("traza").stack);
        return false;
    }
    try {
        const docRef = doc(db, COLLECTIONS.VENUES, venueId);
        await deleteDoc(docRef);
        console.log(`[Mandala Festivales] Venue ${venueId} eliminado con éxito.`);
        return true;
    } catch (err) {
        console.error(`[Mandala Festivales] Error al eliminar venue ${venueId}:`, err);
        notificarErrorPersistencia("la eliminación del venue", err);
        return false;
    }
}
