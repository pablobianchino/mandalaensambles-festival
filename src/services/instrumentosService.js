// =======================================================================
// src/services/instrumentosService.js — Servicio de Instrumentos Maestros
// Conectado con la base de datos de Firestore compartida con Mandala Admisión
// =======================================================================

import { db, collection, getDocs, onSnapshot } from "../config/firebase.js";
import { COLLECTIONS } from "../config/constants.js";

// Lista de respaldo en caso de desconexión momentánea
const INSTRUMENTOS_FALLBACK = [
    "Bajo",
    "Batería",
    "Canto",
    "Coros",
    "Guitarra",
    "Guitarra 1",
    "Guitarra 2",
    "Percusión",
    "Piano",
    "Saxo / Vientos",
    "Sintetizador",
    "Teclados",
    "Ukelele",
    "Violín",
    "Voz"
];

let cacheInstrumentos = null;

/**
 * Retorna un emoji representativo según el instrumento
 */
export function getEmojiParaInstrumento(inst) {
    if (!inst) return "🎵";
    const s = String(inst).toLowerCase();
    if (s.includes("bat")) return "🥁";
    if (s.includes("gui") || s.includes("electr")) return "🎸";
    if (s.includes("cajón") || s.includes("cajon") || s.includes("perc")) return "📦";
    if (s.includes("cant") || s.includes("voz") || s.includes("vocal") || s.includes("coro")) return "🎤";
    if (s.includes("pian") || s.includes("tecl") || s.includes("sint")) return "🎹";
    if (s.includes("baj")) return "🎸";
    if (s.includes("sax") || s.includes("vient")) return "🎷";
    if (s.includes("tromp")) return "🎺";
    if (s.includes("viol")) return "🎻";
    if (s.includes("ukel") || s.includes("ucu")) return "🪕";
    return "🎵";
}

/**
 * Obtiene la lista ordenada de instrumentos desde Firestore
 * @param {boolean} forzarRefresco 
 * @returns {Promise<string[]>} Array de nombres de instrumentos
 */
export async function obtenerInstrumentosFirestore(forzarRefresco = false) {
    if (cacheInstrumentos && !forzarRefresco) {
        return cacheInstrumentos;
    }

    try {
        const colRef = collection(db, COLLECTIONS.INSTRUMENTOS);
        const snapshot = await getDocs(colRef);
        const lista = [];

        snapshot.forEach(docSnap => {
            const data = docSnap.data();
            const nom = data.nombre || data.name || docSnap.id;
            if (nom && typeof nom === "string" && !lista.includes(nom.trim())) {
                lista.push(nom.trim());
            }
        });

        if (lista.length > 0) {
            // Ordenar alfabéticamente
            lista.sort((a, b) => a.localeCompare(b, "es", { sensitivity: "base" }));
            cacheInstrumentos = lista;
            console.log(`[Mandala Festivales] Sincronizados ${lista.length} instrumentos desde la base de datos.`);
            return lista;
        }

        console.warn("[Mandala Festivales] La colección de instrumentos está vacía, usando lista por defecto.");
        cacheInstrumentos = INSTRUMENTOS_FALLBACK;
        return cacheInstrumentos;
    } catch (err) {
        console.warn("[Mandala Festivales] Error al obtener instrumentos de Firestore, usando lista de respaldo:", err);
        return cacheInstrumentos || INSTRUMENTOS_FALLBACK;
    }
}

/**
 * Escucha cambios en tiempo real en la colección de instrumentos
 * @param {Function} callback 
 * @returns {Function} Unsubscribe
 */
export function escucharInstrumentosEnTiempoReal(callback) {
    try {
        const colRef = collection(db, COLLECTIONS.INSTRUMENTOS);
        return onSnapshot(colRef, (snapshot) => {
            const lista = [];
            snapshot.forEach(docSnap => {
                const data = docSnap.data();
                const nom = data.nombre || data.name || docSnap.id;
                if (nom && typeof nom === "string" && !lista.includes(nom.trim())) {
                    lista.push(nom.trim());
                }
            });

            if (lista.length > 0) {
                lista.sort((a, b) => a.localeCompare(b, "es", { sensitivity: "base" }));
                cacheInstrumentos = lista;
                if (typeof callback === "function") callback(lista);
            }
        }, (err) => {
            console.warn("[Mandala Festivales] Error en listener de instrumentos:", err);
        });
    } catch (e) {
        console.warn("[Mandala Festivales] No se pudo inicializar listener de instrumentos:", e);
        return () => {};
    }
}

/**
 * Retorna la caché sincrónica actual de instrumentos
 */
export function obtenerInstrumentosActualesSync() {
    return cacheInstrumentos || INSTRUMENTOS_FALLBACK;
}
