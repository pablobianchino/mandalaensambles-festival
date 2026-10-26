// =======================================================================
// src/services/alumnosService.js — Servicio de Alumnos (Padrón Mandala)
// Filtro estricto: Únicamente alumnos en instancia de Alta Finalizada
// =======================================================================

import { db, auth, collection, getDocs } from "../config/firebase.js";
import { COLLECTIONS } from "../config/constants.js";

let cacheAlumnos = [];

/**
 * Validador oficial de Alta Finalizada en Mandala
 */
export function esAlumnoAltaFinalizada(d) {
    if (!d) return false;
    const st = (d.estado_agenda || '').normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
    if (st === 'alta finalizada') return true;
    if (st !== 'alta efectiva' && st !== 'alta ilegal' && st !== 'alta confirmada') return false;
    const checks = d.checklist_alta;
    if (!Array.isArray(checks) || checks.length === 0) return false;
    const completados = checks.filter(Boolean).length;
    return (checks.length === 5 && completados === 5) || (checks.length === 4 && completados === 4) || (completados >= 4);
}

/**
 * Extrae y unifica todos los instrumentos asignados a un alumno en la BD
 */
export function extraerInstrumentosAlumno(data) {
    const setInst = new Set();
    const agregar = (val) => {
        if (!val) return;
        if (Array.isArray(val)) {
            val.forEach(v => agregar(v));
        } else if (typeof val === 'string') {
            val.split(',').forEach(s => {
                const limpio = s.trim();
                if (limpio) setInst.add(limpio);
            });
        }
    };

    agregar(data.instrumento);
    agregar(data.instrumento_principal);
    agregar(data.instrumentos_secundarios);
    agregar(data.instrumentos);

    if (setInst.size === 0) {
        setInst.add('Voz / Instrumento');
    }
    return Array.from(setInst);
}

/**
 * Carga o refresca el listado de alumnos de Firestore (solo Altas Finalizadas)
 */
export async function obtenerAlumnosMandala(forzarRefresco = false) {
    if (cacheAlumnos.length > 0 && !forzarRefresco) {
        return cacheAlumnos;
    }

    if (!auth.currentUser) {
        console.log("[Mandala Festivales] Sesión de Firebase pendiente. Esperando login para sincronizar padrón de alumnos.");
        return cacheAlumnos;
    }

    try {
        const colRef = collection(db, COLLECTIONS.ALUMNOS);
        const snapshot = await getDocs(colRef);
        cacheAlumnos = [];
        
        snapshot.forEach(docSnap => {
            const data = docSnap.data();
            // Filtrar solo los que se encuentran en instancia de Alta Finalizada
            if (esAlumnoAltaFinalizada(data)) {
                const instrumentos = extraerInstrumentosAlumno(data);
                cacheAlumnos.push({
                    id: docSnap.id,
                    nombre: data.nombre || data.nombre_alumno || 'Sin nombre',
                    instrumentos: instrumentos,
                    instrumento: instrumentos.join(', '),
                    telefono: data.celular || data.telefono || data.numero_contacto_alumno || '',
                    suscripcion: data.tipo_suscripcion || data.suscripcion || '',
                    grupo: data.grupo_asignado || data.grupo || '',
                    rawData: data
                });
            }
        });
        
        // Ordenar alfabéticamente por nombre
        cacheAlumnos.sort((a, b) => a.nombre.localeCompare(b.nombre));
        console.log(`[Mandala Festivales] Sincronizados ${cacheAlumnos.length} alumnos con Alta Finalizada desde Firestore.`);
        return cacheAlumnos;
    } catch (err) {
        console.warn("[Mandala Festivales] Error al leer alumnos de Firestore (o modo offline):", err);
        return cacheAlumnos;
    }
}

/**
 * Busca alumnos por nombre o instrumento
 */
export function buscarAlumnosMandala(termino) {
    if (!termino) return cacheAlumnos;
    const term = termino.toLowerCase().trim();
    return cacheAlumnos.filter(a => 
        a.nombre.toLowerCase().includes(term) || 
        (a.instrumentos && a.instrumentos.some(i => i.toLowerCase().includes(term)))
    );
}

/**
 * Retorna un alumno por su ID
 */
export function obtenerAlumnoPorId(id) {
    return cacheAlumnos.find(a => a.id === id) || null;
}
