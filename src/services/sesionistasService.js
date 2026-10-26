// =======================================================================
// src/services/sesionistasService.js — Servicio de Sesionistas en Firestore
// =======================================================================

import { db, collection, getDocs, doc, setDoc, deleteDoc } from "../config/firebase.js";
import { COLLECTIONS } from "../config/constants.js";

export async function obtenerSesionistasFirestore() {
    try {
        const colRef = collection(db, COLLECTIONS.SESIONISTAS);
        const snapshot = await getDocs(colRef);
        const lista = [];
        snapshot.forEach(docSnap => {
            lista.push({ id: docSnap.id, ...docSnap.data() });
        });
        return lista;
    } catch (err) {
        console.warn("[Mandala Festivales] Error al cargar sesionistas:", err);
        return [];
    }
}

export async function guardarSesionistaFirestore(sesId, data) {
    try {
        const docRef = doc(db, COLLECTIONS.SESIONISTAS, sesId);
        await setDoc(docRef, { ...data, actualizadoEn: new Date().toISOString() }, { merge: true });
        return true;
    } catch (err) {
        console.error(`[Mandala Festivales] Error al guardar sesionista ${sesId}:`, err);
        return false;
    }
}

export async function eliminarSesionistaFirestore(sesId) {
    try {
        const docRef = doc(db, COLLECTIONS.SESIONISTAS, sesId);
        await deleteDoc(docRef);
        return true;
    } catch (err) {
        console.error(`[Mandala Festivales] Error al eliminar sesionista ${sesId}:`, err);
        return false;
    }
}
