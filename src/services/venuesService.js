// =======================================================================
// src/services/venuesService.js — Servicio de Venues (Salas) en Firestore
// =======================================================================

import { db, collection, getDocs, doc, setDoc, deleteDoc } from "../config/firebase.js";
import { COLLECTIONS } from "../config/constants.js";

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
    try {
        const docRef = doc(db, COLLECTIONS.VENUES, venueId);
        await setDoc(docRef, { ...venueData, actualizadoEn: new Date().toISOString() }, { merge: true });
        console.log(`[Mandala Festivales] Venue ${venueId} guardado con éxito.`);
        return true;
    } catch (err) {
        console.error(`[Mandala Festivales] Error al guardar venue ${venueId}:`, err);
        return false;
    }
}

/**
 * Guardar lote masivo de venues (Importación XLSX)
 */
export async function guardarLoteVenues(lote) {
    try {
        for (const item of lote) {
            const id = 'venue-' + Date.now() + '-' + Math.floor(Math.random() * 1000);
            const docRef = doc(db, COLLECTIONS.VENUES, id);
            await setDoc(docRef, { ...item, importadoEn: new Date().toISOString() });
        }
        console.log(`[Mandala Festivales] Lote de ${lote.length} venues guardado en Firestore.`);
        return true;
    } catch (err) {
        console.error("[Mandala Festivales] Error al guardar lote de venues:", err);
        return false;
    }
}

/**
 * Eliminar un venue en Firestore
 */
export async function eliminarVenueFirestore(venueId) {
    try {
        const docRef = doc(db, COLLECTIONS.VENUES, venueId);
        await deleteDoc(docRef);
        console.log(`[Mandala Festivales] Venue ${venueId} eliminado con éxito.`);
        return true;
    } catch (err) {
        console.error(`[Mandala Festivales] Error al eliminar venue ${venueId}:`, err);
        return false;
    }
}
