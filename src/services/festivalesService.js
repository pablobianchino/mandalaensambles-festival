// =======================================================================
// src/services/festivalesService.js — Servicio de Festivales en Firestore
// =======================================================================

import { db, collection, getDocs, getDoc, doc, setDoc, updateDoc, deleteDoc, onSnapshot } from "../config/firebase.js";
import { COLLECTIONS } from "../config/constants.js";

/**
 * Lote original de festivales históricos (Carga Masiva 2025 - 2026)
 */
export const FESTIVALES_HISTORICOS_ORIGINALES = [
    {
        id: 'hist-2025-01-vol1',
        anio: '2025',
        fecha: '01/08/2025',
        fechaHora: '01/08/2025',
        nombre: "MANDALA FEST '25 - VOL I",
        venue: 'JJ Circuito Cultural',
        direccion: 'JJ Circuito Cultural',
        capacidad: '135 pers.',
        entradasVendidas: 135,
        recaudacionBruta: 1028580,
        gastosFestival: 470459,
        netoEscuela: 558121,
        estado: 'Finalizado',
        esHistorico: true
    },
    {
        id: 'hist-2025-02-vol2',
        anio: '2025',
        fecha: '04/09/2025',
        fechaHora: '04/09/2025',
        nombre: "MANDALA FEST '25 - VOL II",
        venue: 'Imaginario Cultural',
        direccion: 'Imaginario Cultural',
        capacidad: '97 pers.',
        entradasVendidas: 97,
        recaudacionBruta: 1074000,
        gastosFestival: 366000,
        netoEscuela: 708000,
        estado: 'Finalizado',
        esHistorico: true
    },
    {
        id: 'hist-2025-03-vol3',
        anio: '2025',
        fecha: '29/11/2025',
        fechaHora: '29/11/2025',
        nombre: "MANDALA FEST '25 - VOL III",
        venue: 'Libario Cultural',
        direccion: 'Libario Cultural',
        capacidad: '139 pers.',
        entradasVendidas: 139,
        recaudacionBruta: 1158000,
        gastosFestival: 308530,
        netoEscuela: 849470,
        estado: 'Finalizado',
        esHistorico: true
    },
    {
        id: 'hist-2025-04-vol4-d1',
        anio: '2025',
        fecha: '16/12/2025',
        fechaHora: '16/12/2025',
        nombre: "MANDALA FEST '25 - VOL IV - DÍA 1",
        venue: 'Gregón Club',
        direccion: 'Gregón Club',
        capacidad: '123 pers.',
        entradasVendidas: 123,
        recaudacionBruta: 1006600,
        gastosFestival: 367470,
        netoEscuela: 639130,
        estado: 'Finalizado',
        esHistorico: true
    },
    {
        id: 'hist-2025-05-vol4-d2',
        anio: '2025',
        fecha: '18/12/2025',
        fechaHora: '18/12/2025',
        nombre: "MANDALA FEST '25 - VOL IV - DÍA 2",
        venue: 'JJ Circuito Cultural',
        direccion: 'JJ Circuito Cultural',
        capacidad: '92 pers.',
        entradasVendidas: 92,
        recaudacionBruta: 766800,
        gastosFestival: 342846,
        netoEscuela: 423954,
        estado: 'Finalizado',
        esHistorico: true
    },
    {
        id: 'hist-2026-06-vol1',
        anio: '2026',
        fecha: '15/05/2026',
        fechaHora: '15/05/2026',
        nombre: "MANDALA FEST '26 - VOL I",
        venue: 'Gregón Club',
        direccion: 'Gregón Club',
        capacidad: '135 pers.',
        entradasVendidas: 135,
        recaudacionBruta: 1266300,
        gastosFestival: 349000,
        netoEscuela: 917300,
        estado: 'Finalizado',
        esHistorico: true
    },
    {
        id: 'hist-2026-07-vol2',
        anio: '2026',
        fecha: '23/07/2026',
        fechaHora: '23/07/2026',
        nombre: "MANDALA FEST '26 - VOL II",
        venue: 'Imaginario Cultural',
        direccion: 'Imaginario Cultural',
        capacidad: '119 pers.',
        entradasVendidas: 119,
        recaudacionBruta: 1568000,
        gastosFestival: 566635,
        netoEscuela: 1001365,
        estado: 'Finalizado',
        esHistorico: true
    },
    {
        id: 'hist-2026-08-vol3',
        anio: '2026',
        fecha: '21/08/2026',
        fechaHora: '21/08/2026',
        nombre: "MANDALA FEST '26 - VOL III",
        venue: 'Libario Cultural',
        direccion: 'Libario Cultural',
        capacidad: '166 pers.',
        entradasVendidas: 166,
        recaudacionBruta: 1631600,
        gastosFestival: 357525,
        netoEscuela: 1274075,
        estado: 'Finalizado',
        esHistorico: true
    },
    {
        id: 'hist-2026-09-vol4',
        anio: '2026',
        fecha: '24/09/2026',
        fechaHora: '24/09/2026',
        nombre: "MANDALA FEST '26 - VOL IV",
        venue: 'Gregón Club',
        direccion: 'Gregón Club',
        capacidad: '82 pers.',
        entradasVendidas: 82,
        recaudacionBruta: 1131800,
        gastosFestival: 314498,
        netoEscuela: 817302,
        estado: 'Finalizado',
        esHistorico: true
    }
];

/**
 * Función central de procesamiento:
 * 1. Filtra y purga documentos fantasma que no tienen nombre ni fecha real.
 * 2. Deduplica festivales con mismo nombre y año, combinando sus finanzas y detalles.
 */
function procesarYConsolidarFestivales(listaDocs) {
    const mapaDeduplicado = new Map();

    listaDocs.forEach(f => {
        if (!f || !f.id) return;

        // Detección estricta de documentos fantasma
        const tieneNombreReal = f.nombre && f.nombre.trim() !== '' && f.nombre.trim().toLowerCase() !== 'festival';
        const tieneFechaReal = (f.fecha && f.fecha.trim() !== '' && f.fecha !== 'A definir') ||
                               (f.fechaHora && f.fechaHora.trim() !== '' && f.fechaHora !== 'A definir');

        // Si no tiene nombre real ni fecha real, es un registro corrupto/fantasma. Purgar y descartar.
        if (!tieneNombreReal && !tieneFechaReal) {
            try {
                const docRef = doc(db, COLLECTIONS.FESTIVALES, f.id);
                deleteDoc(docRef);
            } catch(e) {}
            return;
        }

        // Deduplicar festivales que tengan el mismo nombre normalizado y año
        const nombreNorm = (f.nombre || '').trim().toUpperCase();
        const anioNorm = String(f.anio || '2026');
        const clave = `${nombreNorm}_${anioNorm}`;

        if (mapaDeduplicado.has(clave)) {
            const anterior = mapaDeduplicado.get(clave);
            // Conservar el id original más consistente (prefiriendo hist- si existe)
            const idConsolidado = anterior.id.startsWith('hist-') ? anterior.id : (f.id.startsWith('hist-') ? f.id : anterior.id);
            mapaDeduplicado.set(clave, {
                ...anterior,
                ...f,
                id: idConsolidado,
                nombre: (f.nombre && f.nombre.trim().toLowerCase() !== 'festival') ? f.nombre : anterior.nombre,
                fecha: (f.fecha && f.fecha !== 'A definir') ? f.fecha : anterior.fecha,
                fechaHora: (f.fechaHora && f.fechaHora !== 'A definir') ? f.fechaHora : (anterior.fechaHora || anterior.fecha),
                venue: (f.venue && f.venue !== 'Venue') ? f.venue : anterior.venue,
                finanzas: f.finanzas || anterior.finanzas,
                contratosAlumnos: f.contratosAlumnos || anterior.contratosAlumnos,
                cobertura: f.cobertura || anterior.cobertura,
                recaudacionBruta: f.recaudacionBruta || anterior.recaudacionBruta || 0,
                gastosFestival: f.gastosFestival || anterior.gastosFestival || 0,
                netoEscuela: f.netoEscuela || anterior.netoEscuela || 0,
                entradasVendidas: f.entradasVendidas || anterior.entradasVendidas || 0,
                estado: f.estado || anterior.estado || 'Finalizado'
            });
        } else {
            mapaDeduplicado.set(clave, f);
        }
    });

    return Array.from(mapaDeduplicado.values());
}

/**
 * Obtener todos los festivales de Firestore (vigentes e históricos)
 */
export async function obtenerFestivalesFirestore() {
    try {
        const mapa = new Map();

        // 1. Colección histórica importada (base sólida para festivales finalizados)
        const colHistRef = collection(db, COLLECTIONS.FESTIVALES_HISTORICO);
        const snapHist = await getDocs(colHistRef);
        
        if (snapHist.empty) {
            console.log("[Mandala Festivales] Colección histórica vacía. Restaurando automáticamente lote histórico...");
            await guardarLoteHistoricoFestivales(FESTIVALES_HISTORICOS_ORIGINALES);
            FESTIVALES_HISTORICOS_ORIGINALES.forEach(f => mapa.set(f.id, f));
        } else {
            snapHist.forEach(docSnap => {
                const data = docSnap.data();
                mapa.set(docSnap.id, {
                    id: docSnap.id,
                    ...data,
                    nombre: data.nombre || 'Festival',
                    anio: String(data.anio || '2025'),
                    fecha: data.fecha || 'A definir',
                    fechaHora: data.fechaHora || data.fecha || 'A definir',
                    venue: data.venue || 'Venue',
                    direccion: data.direccion || data.venue || '-',
                    capacidad: data.capacidad || (data.entradasVendidas ? `${data.entradasVendidas} pers.` : '-'),
                    estado: data.estado || 'Finalizado',
                    recaudacionBruta: data.recaudacionBruta || 0,
                    gastosFestival: data.gastosFestival || 0,
                    netoEscuela: data.netoEscuela || 0,
                    entradasVendidas: data.entradasVendidas || 0,
                    esHistorico: true
                });
            });
        }

        // 2. Colección principal de festivales vigentes
        const colRef = collection(db, COLLECTIONS.FESTIVALES);
        const snapshot = await getDocs(colRef);
        snapshot.forEach(docSnap => {
            const v = { id: docSnap.id, ...docSnap.data() };
            if (mapa.has(docSnap.id)) {
                const h = mapa.get(docSnap.id);
                mapa.set(docSnap.id, {
                    ...h,
                    ...v,
                    nombre: (v.nombre && v.nombre !== 'Festival') ? v.nombre : (h.nombre || 'Festival'),
                    anio: v.anio || h.anio || '2025',
                    fecha: (v.fecha && v.fecha !== 'A definir') ? v.fecha : (h.fecha || 'A definir'),
                    fechaHora: (v.fechaHora && v.fechaHora !== 'A definir') ? v.fechaHora : (h.fechaHora || h.fecha || 'A definir'),
                    venue: (v.venue && v.venue !== 'Venue') ? v.venue : (h.venue || 'Venue'),
                    direccion: (v.direccion && v.direccion !== '-') ? v.direccion : (h.direccion || h.venue || '-'),
                    capacidad: (v.capacidad && v.capacidad !== '-') ? v.capacidad : (h.capacidad || '-'),
                    estado: v.estado || h.estado || 'Finalizado',
                    recaudacionBruta: (v.recaudacionBruta !== undefined && v.recaudacionBruta !== null) ? v.recaudacionBruta : (h.recaudacionBruta || 0),
                    gastosFestival: (v.gastosFestival !== undefined && v.gastosFestival !== null) ? v.gastosFestival : (h.gastosFestival || 0),
                    netoEscuela: (v.netoEscuela !== undefined && v.netoEscuela !== null) ? v.netoEscuela : (h.netoEscuela || 0),
                    entradasVendidas: (v.entradasVendidas !== undefined && v.entradasVendidas !== null) ? v.entradasVendidas : (h.entradasVendidas || 0),
                    esHistorico: true
                });
            } else {
                mapa.set(docSnap.id, v);
            }
        });

        const festivales = procesarYConsolidarFestivales(Array.from(mapa.values()));

        console.log(`[Mandala Festivales] Cargados ${festivales.length} festivales en total (vigentes + históricos consolidados).`);
        return festivales;
    } catch (err) {
        console.warn("[Mandala Festivales] Error al cargar festivales de Firestore:", err);
        return [];
    }
}

/**
 * Guardar o actualizar un festival completo en Firestore
 */
export async function guardarFestivalFirestore(festivalId, festivalData) {
    try {
        const docRef = doc(db, COLLECTIONS.FESTIVALES, festivalId);
        
        // Blindaje contra documentos huérfanos sin nombre ni fecha:
        if (!festivalData.nombre && !festivalData.fecha) {
            try {
                const snap = await getDoc(docRef);
                if (!snap.exists()) {
                    // Buscar metadatos en colección histórica o en catálogo original
                    const docRefHist = doc(db, COLLECTIONS.FESTIVALES_HISTORICO, festivalId);
                    const snapHist = await getDoc(docRefHist);
                    if (snapHist.exists()) {
                        festivalData = { ...snapHist.data(), ...festivalData };
                    } else {
                        const hBack = FESTIVALES_HISTORICOS_ORIGINALES.find(h => h.id === festivalId);
                        if (hBack) {
                            festivalData = { ...hBack, ...festivalData };
                        }
                    }
                }
            } catch(e) {}
        }

        await setDoc(docRef, { ...festivalData, actualizadoEn: new Date().toISOString() }, { merge: true });
        if (typeof festivalId === 'string' && festivalId.startsWith('hist-')) {
            try {
                const docRefHist = doc(db, COLLECTIONS.FESTIVALES_HISTORICO, festivalId);
                await setDoc(docRefHist, { ...festivalData, actualizadoEn: new Date().toISOString() }, { merge: true });
            } catch(e) {}
        }
        console.log(`[Mandala Festivales] Festival ${festivalId} guardado con éxito en Firestore.`);
        return true;
    } catch (err) {
        console.error(`[Mandala Festivales] Error al guardar festival ${festivalId}:`, err);
        return false;
    }
}

/**
 * Actualizar parcialmente secciones de un festival (cronograma, artistas, rider, finanzas)
 */
export async function actualizarCamposFestivalFirestore(festivalId, patchData) {
    return guardarFestivalFirestore(festivalId, patchData);
}

/**
 * Guardar lote de festivales históricos (Carga Masiva 2025-2026)
 */
export async function guardarLoteHistoricoFestivales(lote) {
    try {
        for (const item of lote) {
            const id = item.id || ('hist-' + (item.anio || '2025') + '-' + Date.now() + '-' + Math.floor(Math.random() * 1000));
            // Guardar en colección histórica
            const docRefHist = doc(db, COLLECTIONS.FESTIVALES_HISTORICO, id);
            await setDoc(docRefHist, { ...item, id, importadoEn: new Date().toISOString() });
            
            // También reflejar en colección principal para interoperabilidad
            const docRefFest = doc(db, COLLECTIONS.FESTIVALES, id);
            await setDoc(docRefFest, {
                ...item,
                id,
                fechaHora: item.fecha || 'A definir',
                direccion: item.venue || '-',
                capacidad: item.entradasVendidas ? `${item.entradasVendidas} pers.` : '-',
                importadoEn: new Date().toISOString()
            }, { merge: true });
        }
        console.log(`[Mandala Festivales] Lote histórico de ${lote.length} festivales guardado en Firestore.`);
        return true;
    } catch (err) {
        console.error("[Mandala Festivales] Error al guardar lote histórico:", err);
        return false;
    }
}

/**
 * Restaurar los 9 festivales históricos originales de 2025 y 2026
 */
export async function restaurarLoteHistoricoOriginal() {
    return guardarLoteHistoricoFestivales(FESTIVALES_HISTORICOS_ORIGINALES);
}

/**
 * Eliminar un festival de Firestore
 */
export async function eliminarFestivalFirestore(festivalId) {
    try {
        const docRef = doc(db, COLLECTIONS.FESTIVALES, festivalId);
        await deleteDoc(docRef);
        try {
            const docRefHist = doc(db, COLLECTIONS.FESTIVALES_HISTORICO, festivalId);
            await deleteDoc(docRefHist);
        } catch(e) {}
        console.log(`[Mandala Festivales] Festival ${festivalId} eliminado de Firestore.`);
        return true;
    } catch (err) {
        console.error(`[Mandala Festivales] Error al eliminar festival ${festivalId}:`, err);
        return false;
    }
}

/**
 * Escuchar cambios de festivales en tiempo real (Multi-Ventana / Multi-Operador)
 * @param {Function} callback - Función que recibe la lista actualizada de festivales
 * @returns {Function} unsubscribe - Función para desuscribirse
 */
export function escucharFestivalesEnTiempoReal(callback) {
    try {
        const colRef = collection(db, COLLECTIONS.FESTIVALES);
        const colHistRef = collection(db, COLLECTIONS.FESTIVALES_HISTORICO);

        let festivalesVigentes = [];
        let festivalesHistoricos = [];

        const consolidarYNotificar = () => {
            const mapa = new Map();
            // 1. Cargar históricos como base
            festivalesHistoricos.forEach(h => mapa.set(h.id, { ...h }));

            // 2. Aplicar vigentes/parches combinando metadatos sin perder información
            festivalesVigentes.forEach(v => {
                if (mapa.has(v.id)) {
                    const h = mapa.get(v.id);
                    mapa.set(v.id, {
                        ...h,
                        ...v,
                        nombre: (v.nombre && v.nombre !== 'Festival') ? v.nombre : (h.nombre || 'Festival'),
                        anio: v.anio || h.anio || '2025',
                        fecha: (v.fecha && v.fecha !== 'A definir') ? v.fecha : (h.fecha || 'A definir'),
                        fechaHora: (v.fechaHora && v.fechaHora !== 'A definir') ? v.fechaHora : (h.fechaHora || h.fecha || 'A definir'),
                        venue: (v.venue && v.venue !== 'Venue') ? v.venue : (h.venue || 'Venue'),
                        direccion: (v.direccion && v.direccion !== '-') ? v.direccion : (h.direccion || h.venue || '-'),
                        capacidad: (v.capacidad && v.capacidad !== '-') ? v.capacidad : (h.capacidad || '-'),
                        estado: v.estado || h.estado || 'Finalizado',
                        recaudacionBruta: (v.recaudacionBruta !== undefined && v.recaudacionBruta !== null) ? v.recaudacionBruta : (h.recaudacionBruta || 0),
                        gastosFestival: (v.gastosFestival !== undefined && v.gastosFestival !== null) ? v.gastosFestival : (h.gastosFestival || 0),
                        netoEscuela: (v.netoEscuela !== undefined && v.netoEscuela !== null) ? v.netoEscuela : (h.netoEscuela || 0),
                        entradasVendidas: (v.entradasVendidas !== undefined && v.entradasVendidas !== null) ? v.entradasVendidas : (h.entradasVendidas || 0),
                        esHistorico: true
                    });
                } else {
                    mapa.set(v.id, v);
                }
            });

            // Filtrar registros corruptos/fantasmas y deduplicar por nombre y año
            const listaConsolidada = procesarYConsolidarFestivales(Array.from(mapa.values()));

            console.log(`[Firestore Realtime] Actualización en vivo recibida: ${listaConsolidada.length} festivales consolidados.`);
            if (typeof callback === 'function') {
                callback(listaConsolidada);
            }
        };

        const unsubVigentes = onSnapshot(colRef, (snap) => {
            festivalesVigentes = [];
            snap.forEach(docSnap => {
                festivalesVigentes.push({ id: docSnap.id, ...docSnap.data() });
            });
            consolidarYNotificar();
        }, (err) => {
            console.warn("[Firestore Realtime] Error en listener de festivales:", err);
        });

        const unsubHistoricos = onSnapshot(colHistRef, (snap) => {
            festivalesHistoricos = [];
            snap.forEach(docSnap => {
                const data = docSnap.data();
                festivalesHistoricos.push({
                    id: docSnap.id,
                    ...data,
                    nombre: data.nombre || 'Festival',
                    anio: String(data.anio || '2025'),
                    fecha: data.fecha || 'A definir',
                    fechaHora: data.fechaHora || data.fecha || 'A definir',
                    venue: data.venue || 'Venue',
                    direccion: data.direccion || data.venue || '-',
                    capacidad: data.capacidad || (data.entradasVendidas ? `${data.entradasVendidas} pers.` : '-'),
                    estado: data.estado || 'Finalizado',
                    recaudacionBruta: data.recaudacionBruta || 0,
                    gastosFestival: data.gastosFestival || 0,
                    netoEscuela: data.netoEscuela || 0,
                    entradasVendidas: data.entradasVendidas || 0,
                    esHistorico: true
                });
            });
            consolidarYNotificar();
        }, (err) => {
            console.warn("[Firestore Realtime] Error en listener de festivales históricos:", err);
        });

        return () => {
            unsubVigentes();
            unsubHistoricos();
        };
    } catch (err) {
        console.warn("[Firestore Realtime] Error al configurar escucha en tiempo real:", err);
        return () => {};
    }
}

