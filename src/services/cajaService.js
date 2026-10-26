// =======================================================================
// src/services/cajaService.js — Servicio de Caja (Gastos e Ingresos) en Firestore
// =======================================================================

import { db, doc, getDoc, setDoc, onSnapshot } from "../config/firebase.js";
import { COLLECTIONS } from "../config/constants.js";

const DOC_GASTOS = "gastos";
const DOC_INGRESOS_MANUALES = "ingresos_manuales";

/**
 * Obtener todos los gastos de Caja desde Firestore
 * @returns {Promise<Object>} Mapa de gastos por año { '2025': [...], '2026': [...] }
 */
export async function obtenerGastosCajaFirestore() {
    try {
        const docRef = doc(db, COLLECTIONS.CAJA_FESTIVALES, DOC_GASTOS);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
            const data = docSnap.data();
            return data.anios || {};
        }
        return null;
    } catch (err) {
        console.warn("[Caja Service] Error al obtener gastos de Firestore:", err);
        return null;
    }
}

/**
 * Guardar o actualizar todos los gastos de Caja en Firestore
 * @param {Object} gastosData - Objeto con arrays por año { '2025': [...], '2026': [...] }
 * @returns {Promise<boolean>}
 */
export async function guardarGastosCajaFirestore(gastosData) {
    try {
        const docRef = doc(db, COLLECTIONS.CAJA_FESTIVALES, DOC_GASTOS);
        await setDoc(docRef, {
            anios: gastosData,
            actualizadoEn: new Date().toISOString()
        }, { merge: true });
        console.log("[Caja Service] Gastos sincronizados con la base de datos.");
        return true;
    } catch (err) {
        console.error("[Caja Service] Error al guardar gastos:", err);
        return false;
    }
}

/**
 * Obtener los ingresos manuales de Caja desde Firestore
 * @returns {Promise<Object>} Mapa de ingresos por año { '2025': [...], '2026': [...] }
 */
export async function obtenerIngresosManualesCajaFirestore() {
    try {
        const docRef = doc(db, COLLECTIONS.CAJA_FESTIVALES, DOC_INGRESOS_MANUALES);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
            const data = docSnap.data();
            return data.anios || {};
        }
        return null;
    } catch (err) {
        console.warn("[Caja Service] Error al obtener ingresos manuales:", err);
        return null;
    }
}

/**
 * Guardar o actualizar los ingresos manuales de Caja en Firestore
 * @param {Object} ingresosData - Objeto con arrays por año { '2025': [...], '2026': [...] }
 * @returns {Promise<boolean>}
 */
export async function guardarIngresosManualesCajaFirestore(ingresosData) {
    try {
        const docRef = doc(db, COLLECTIONS.CAJA_FESTIVALES, DOC_INGRESOS_MANUALES);
        await setDoc(docRef, {
            anios: ingresosData,
            actualizadoEn: new Date().toISOString()
        }, { merge: true });
        console.log("[Caja Service] Ingresos manuales sincronizados con la base de datos.");
        return true;
    } catch (err) {
        console.error("[Caja Service] Error al guardar ingresos manuales:", err);
        return false;
    }
}

/**
 * Escuchar cambios de Caja en tiempo real (Multi-Operador / Multi-Ventana)
 * @param {Function} onGastosUpdate - Callback invocado con los gastos actualizados { anio: [...] }
 * @param {Function} onIngresosUpdate - Callback invocado con los ingresos manuales actualizados { anio: [...] }
 * @returns {Function} unsubscribe - Función para desuscribirse
 */
export function escucharCajaEnTiempoReal(onGastosUpdate, onIngresosUpdate) {
    try {
        const docGastosRef = doc(db, COLLECTIONS.CAJA_FESTIVALES, DOC_GASTOS);
        const docIngresosRef = doc(db, COLLECTIONS.CAJA_FESTIVALES, DOC_INGRESOS_MANUALES);

        const unsubGastos = onSnapshot(docGastosRef, (docSnap) => {
            if (docSnap.exists()) {
                const data = docSnap.data();
                if (data && data.anios && typeof onGastosUpdate === 'function') {
                    onGastosUpdate(data.anios);
                }
            }
        }, (err) => {
            console.warn("[Caja Realtime] Error en listener de gastos:", err);
        });

        const unsubIngresos = onSnapshot(docIngresosRef, (docSnap) => {
            if (docSnap.exists()) {
                const data = docSnap.data();
                if (data && data.anios && typeof onIngresosUpdate === 'function') {
                    onIngresosUpdate(data.anios);
                }
            }
        }, (err) => {
            console.warn("[Caja Realtime] Error en listener de ingresos:", err);
        });

        return () => {
            unsubGastos();
            unsubIngresos();
        };
    } catch (err) {
        console.warn("[Caja Realtime] Error configurando escucha de Caja:", err);
        return () => {};
    }
}
