// =======================================================================
// src/services/configuracionService.js — Servicio de Configuración Maestra
// Tarifas vigentes de Productora Audiovisual y Precios por Defecto
// =======================================================================

import { db, doc, getDoc, setDoc } from "../config/firebase.js";
import { COLLECTIONS } from "../config/constants.js";

const DOC_PRODUCTORA = "tarifas_maestras";
const DOC_ENTRADAS = "entradas_defecto";

/**
 * Obtener las tarifas vigentes maestras de la productora audiovisual
 */
export async function obtenerTarifasProductoraFirestore() {
    try {
        const docRef = doc(db, COLLECTIONS.PRODUCTORA_CONFIG, DOC_PRODUCTORA);
        const snap = await getDoc(docRef);
        if (snap.exists()) {
            return snap.data();
        }
        return null;
    } catch (err) {
        console.warn("[Mandala Festivales] Error al obtener tarifas de productora:", err);
        return null;
    }
}

/**
 * Guardar las tarifas maestras de la productora audiovisual
 */
export async function guardarTarifasProductoraFirestore(tarifas) {
    try {
        const docRef = doc(db, COLLECTIONS.PRODUCTORA_CONFIG, DOC_PRODUCTORA);
        await setDoc(docRef, {
            ...tarifas,
            actualizadoEn: new Date().toISOString()
        }, { merge: true });
        console.log("[Mandala Festivales] Tarifas vigentes de productora guardadas con éxito en Firestore.");
        return true;
    } catch (err) {
        console.error("[Mandala Festivales] Error al guardar tarifas de productora:", err);
        return false;
    }
}

/**
 * Obtener precios y porcentajes por defecto de entradas
 */
export async function obtenerPreciosEntradasFirestore() {
    try {
        const docRef = doc(db, COLLECTIONS.PRODUCTORA_CONFIG, DOC_ENTRADAS);
        const snap = await getDoc(docRef);
        if (snap.exists()) {
            return snap.data();
        }
        return null;
    } catch (err) {
        console.warn("[Mandala Festivales] Error al obtener precios por defecto:", err);
        return null;
    }
}

/**
 * Guardar precios y porcentajes por defecto de entradas
 */
export async function guardarPreciosEntradasFirestore(precios) {
    try {
        const docRef = doc(db, COLLECTIONS.PRODUCTORA_CONFIG, DOC_ENTRADAS);
        await setDoc(docRef, {
            ...precios,
            actualizadoEn: new Date().toISOString()
        }, { merge: true });
        console.log("[Mandala Festivales] Precios por defecto guardados con éxito en Firestore.");
        return true;
    } catch (err) {
        console.error("[Mandala Festivales] Error al guardar precios por defecto:", err);
        return false;
    }
}
