// =======================================================================
// src/services/festivalesService.js — Servicio de Festivales en Firestore
// =======================================================================

import { db, collection, getDocs, getDoc, doc, setDoc, updateDoc, deleteDoc, onSnapshot, writeBatch } from "../config/firebase.js";
import { COLLECTIONS } from "../config/constants.js";
import { notificarErrorPersistencia } from "../utils/errores.js";
import { idHistoricoEstable, ejecutarEnLotes } from "../utils/ids.js";

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

        // Si no tiene nombre real ni fecha real, es un registro incompleto/fantasma: se oculta de la lista
        // pero NUNCA se borra desde una lectura (podría ser un documento recién creado o a medio guardar).
        if (!tieneNombreReal && !tieneFechaReal) {
            console.warn(`[Mandala Festivales] Documento incompleto ignorado (sin nombre ni fecha): ${f.id}`);
            return;
        }

        // Identidad = id del documento (el Map de entrada ya garantiza ids únicos).
        // Solo se fusionan los pares "espejo" del histórico: un documento 'hist-…' y su copia con el mismo
        // nombre y año (o dos 'hist-' repetidos por una reimportación antigua). Dos festivales vigentes distintos con el mismo nombre NO se fusionan (antes se ocultaba uno
        // y se mezclaban sus finanzas); se conservan ambos y se deja un aviso en la consola.
        const nombreNorm = (f.nombre || '').trim().toUpperCase();
        const anioNorm = String(f.anio || '2026');
        const claveNombre = `${nombreNorm}_${anioNorm}`;
        const esHist = String(f.id).startsWith('hist-');

        const previo = mapaDeduplicado.get(claveNombre);
        const previoEsHist = previo ? String(previo.id).startsWith('hist-') : false;
        if (previo && (esHist || previoEsHist)) {
            // Par espejo o reimportación (al menos uno es 'hist-'): se fusionan.
            // Se prioriza el id 'hist-' estable (los ids con marca de tiempo vienen de importaciones antiguas con id aleatorio).
            const esIdAleatorio = (id) => /^hist-[0-9]{4}-[0-9]{10,}-[0-9]+$/.test(String(id));
            let idConsolidado;
            if (esHist && previoEsHist) idConsolidado = esIdAleatorio(previo.id) && !esIdAleatorio(f.id) ? f.id : previo.id;
            else idConsolidado = esHist ? f.id : previo.id;
            // El documento con el id consolidado (estable) tiene prioridad sobre el otro
            const alto = idConsolidado === f.id ? f : previo;
            const bajo = alto === f ? previo : f;
            const pick = (altoV, bajoV, vacio) => (altoV !== undefined && altoV !== null && altoV !== vacio) ? altoV : bajoV;
            mapaDeduplicado.set(claveNombre, {
                ...bajo,
                ...alto,
                id: idConsolidado,
                nombre: (alto.nombre && alto.nombre.trim().toLowerCase() !== 'festival') ? alto.nombre : bajo.nombre,
                fecha: pick(alto.fecha, bajo.fecha, 'A definir'),
                fechaHora: pick(alto.fechaHora, bajo.fechaHora || bajo.fecha, 'A definir'),
                venue: pick(alto.venue, bajo.venue, 'Venue'),
                finanzas: alto.finanzas || bajo.finanzas,
                contratosAlumnos: alto.contratosAlumnos || bajo.contratosAlumnos,
                cobertura: alto.cobertura || bajo.cobertura,
                // ?? en lugar de ||: un valor legítimo de 0 no debe reemplazarse por el del otro documento
                recaudacionBruta: alto.recaudacionBruta ?? bajo.recaudacionBruta ?? 0,
                gastosFestival: alto.gastosFestival ?? bajo.gastosFestival ?? 0,
                netoEscuela: alto.netoEscuela ?? bajo.netoEscuela ?? 0,
                entradasVendidas: alto.entradasVendidas ?? bajo.entradasVendidas ?? 0,
                estado: alto.estado || bajo.estado || 'Finalizado'
            });
        } else if (previo) {
            console.warn(`[Mandala Festivales] Posible duplicado (mismo nombre y año, ids distintos): "${f.nombre}" → ${previo.id} y ${f.id}. Se conservan ambos.`);
            mapaDeduplicado.set(`${claveNombre}__${f.id}`, f);
        } else {
            mapaDeduplicado.set(claveNombre, f);
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
            } catch(e) {
                console.warn(`[Mandala Festivales] No se pudieron recuperar los metadatos de ${festivalId}:`, e);
            }
        }

        await setDoc(docRef, { ...festivalData, actualizadoEn: new Date().toISOString() }, { merge: true });
        if (typeof festivalId === 'string' && festivalId.startsWith('hist-')) {
            try {
                const docRefHist = doc(db, COLLECTIONS.FESTIVALES_HISTORICO, festivalId);
                await setDoc(docRefHist, { ...festivalData, actualizadoEn: new Date().toISOString() }, { merge: true });
            } catch(e) {
                console.warn(`[Mandala Festivales] No se pudo reflejar ${festivalId} en el histórico:`, e);
            }
        }
        console.log(`[Mandala Festivales] Festival ${festivalId} guardado con éxito en Firestore.`);
        return true;
    } catch (err) {
        console.error(`[Mandala Festivales] Error al guardar festival ${festivalId}:`, err);
        notificarErrorPersistencia("el festival", err);
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
        // Cada festival escribe 2 documentos (histórico + principal). Se agrupan en lotes atómicos
        // y el id es estable (mismo nombre/año/fecha = mismo documento), así reimportar no duplica.
        const ahora = new Date().toISOString();
        const ops = [];
        lote.forEach(item => {
            const id = item.id || idHistoricoEstable(item.anio || '2025', item.nombre, item.fecha);
            ops.push((batch) => {
                batch.set(doc(db, COLLECTIONS.FESTIVALES_HISTORICO, id), { ...item, id, importadoEn: ahora });
                batch.set(doc(db, COLLECTIONS.FESTIVALES, id), {
                    ...item,
                    id,
                    fechaHora: item.fecha || 'A definir',
                    direccion: item.venue || '-',
                    capacidad: item.entradasVendidas ? `${item.entradasVendidas} pers.` : '-',
                    importadoEn: ahora
                }, { merge: true });
            });
        });
        // Cada operación escribe 2 docs: se procesan de a 200 para no pasar el límite de 500 por lote
        for (let i = 0; i < ops.length; i += 200) {
            await ejecutarEnLotes(db, writeBatch, ops.slice(i, i + 200).map(op => (b) => op(b)));
        }
        console.log(`[Mandala Festivales] Lote histórico de ${lote.length} festivales guardado en Firestore.`);
        return true;
    } catch (err) {
        console.error("[Mandala Festivales] Error al guardar lote histórico:", err);
        notificarErrorPersistencia("el lote histórico", err);
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
        } catch(e) {
            console.warn(`[Mandala Festivales] No se pudo eliminar ${festivalId} del histórico:`, e);
        }
        console.log(`[Mandala Festivales] Festival ${festivalId} eliminado de Firestore.`);
        return true;
    } catch (err) {
        console.error(`[Mandala Festivales] Error al eliminar festival ${festivalId}:`, err);
        notificarErrorPersistencia("la eliminación del festival", err);
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
            if (window.sincronizacionRecuperada) window.sincronizacionRecuperada();
        };

        const unsubVigentes = onSnapshot(colRef, (snap) => {
            festivalesVigentes = [];
            snap.forEach(docSnap => {
                festivalesVigentes.push({ id: docSnap.id, ...docSnap.data() });
            });
            consolidarYNotificar();
        }, (err) => {
            console.warn("[Firestore Realtime] Error en listener de festivales:", err);
            if (window.notificarSincronizacion) window.notificarSincronizacion('warn', 'No se pudo actualizar. Se muestran los últimos datos.', { persistente: true, reintentar: true });
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
            if (window.notificarSincronizacion) window.notificarSincronizacion('warn', 'No se pudo actualizar. Se muestran los últimos datos.', { persistente: true, reintentar: true });
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

