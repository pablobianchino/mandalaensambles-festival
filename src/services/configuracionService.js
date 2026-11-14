// =======================================================================
// src/services/configuracionService.js — Servicio de Configuración Maestra
// Tarifas vigentes de Productora Audiovisual y Precios por Defecto
// =======================================================================

import { db, doc, getDoc, setDoc } from "../config/firebase.js";
import { COLLECTIONS } from "../config/constants.js";
import { notificarErrorPersistencia } from "../utils/errores.js";

const DOC_PRODUCTORA = "tarifas_maestras";
const DOC_ENTRADAS = "entradas_defecto";
const DOC_LISTADO = "productoras_listado";
const DOC_CHECKLIST_PRODUCCION = "checklist_produccion_plantilla";
const DOC_CATEGORIAS_EQUIPAMIENTO = "checklist_equipamiento_categorias";

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
        notificarErrorPersistencia("las tarifas de productora", err);
        return false;
    }
}

/**
 * Listado de productoras audiovisuales (cada una con su propia lista de tarifas).
 * Vive en un único documento de productora_config para no depender de reglas nuevas.
 */
export async function obtenerProductorasFirestore() {
    try {
        const snap = await getDoc(doc(db, COLLECTIONS.PRODUCTORA_CONFIG, DOC_LISTADO));
        return snap.exists() ? snap.data() : null;
    } catch (err) {
        console.warn("[Mandala Festivales] Error al obtener el listado de productoras:", err);
        return null;
    }
}

export async function guardarProductorasFirestore(items) {
    try {
        await setDoc(doc(db, COLLECTIONS.PRODUCTORA_CONFIG, DOC_LISTADO), {
            items,
            actualizadoEn: new Date().toISOString()
        });
        console.log("[Mandala Festivales] Listado de productoras guardado con éxito en Firestore.");
        return true;
    } catch (err) {
        console.error("[Mandala Festivales] Error al guardar el listado de productoras:", err);
        notificarErrorPersistencia("el listado de productoras", err);
        return false;
    }
}

/**
 * Plantilla del checklist de producción: lista de tareas que se copia a cada festival nuevo.
 * Vive en un documento de productora_config (misma colección que el resto de la configuración).
 */
export async function obtenerChecklistProduccionPlantillaFirestore() {
    try {
        const snap = await getDoc(doc(db, COLLECTIONS.PRODUCTORA_CONFIG, DOC_CHECKLIST_PRODUCCION));
        return snap.exists() ? snap.data() : null;
    } catch (err) {
        console.warn("[Mandala Festivales] Error al obtener la plantilla del checklist de producción:", err);
        return null;
    }
}

export async function guardarChecklistProduccionPlantillaFirestore(items) {
    try {
        await setDoc(doc(db, COLLECTIONS.PRODUCTORA_CONFIG, DOC_CHECKLIST_PRODUCCION), {
            items,
            actualizadoEn: new Date().toISOString()
        });
        console.log("[Mandala Festivales] Plantilla del checklist de producción guardada con éxito en Firestore.");
        return true;
    } catch (err) {
        console.error("[Mandala Festivales] Error al guardar la plantilla del checklist de producción:", err);
        notificarErrorPersistencia("la plantilla del checklist de producción", err);
        return false;
    }
}

/**
 * Categorías del checklist de equipamiento (Instrumentos, Equipos, Caños…).
 * Devuelve { ok: true, existe, categorias } o { ok: false } si la lectura falló: así la UI no
 * confunde "no hay categorías guardadas" con "no se pudieron leer" y no pisa las reales con las iniciales.
 */
export async function obtenerCategoriasEquipamientoFirestore() {
    try {
        const snap = await getDoc(doc(db, COLLECTIONS.PRODUCTORA_CONFIG, DOC_CATEGORIAS_EQUIPAMIENTO));
        if (!snap.exists()) return { ok: true, existe: false, categorias: [] };
        const data = snap.data() || {};
        return { ok: true, existe: true, categorias: Array.isArray(data.categorias) ? data.categorias : [] };
    } catch (err) {
        console.warn("[Mandala Festivales] Error al obtener las categorías del checklist de equipamiento:", err);
        return { ok: false };
    }
}

export async function guardarCategoriasEquipamientoFirestore(categorias) {
    try {
        await setDoc(doc(db, COLLECTIONS.PRODUCTORA_CONFIG, DOC_CATEGORIAS_EQUIPAMIENTO), {
            categorias,
            actualizadoEn: new Date().toISOString()
        });
        return true;
    } catch (err) {
        console.error("[Mandala Festivales] Error al guardar las categorías del checklist de equipamiento:", err);
        notificarErrorPersistencia("las categorías del checklist de equipamiento", err);
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
        notificarErrorPersistencia("los precios por defecto", err);
        return false;
    }
}
