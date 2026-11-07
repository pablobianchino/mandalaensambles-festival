// =======================================================================
// src/services/cajaService.js — Servicio de Caja (Gastos e Ingresos) en Firestore
//
// DOS FORMATOS DE ALMACENAMIENTO (coexisten; el interruptor es el documento "_formato"):
//  - Formato 1 (anterior): dos documentos ("gastos" e "ingresos_manuales") con TODOS los años adentro.
//    Cada edición reescribe el documento completo: si dos personas editan a la vez, gana la última y se pierde lo otro.
//  - Formato 2 (nuevo): UN DOCUMENTO POR MOVIMIENTO ("mov-gasto-<id>" / "mov-ingreso-<id>").
//    Cada edición escribe solo el movimiento tocado; dos personas pueden editar movimientos distintos sin pisarse.
//
// La aplicación sigue trabajando con el mismo objeto en memoria { '2026': [...], '2025': [...] }:
// solo cambia cómo se guarda. Mientras no exista "_formato" con version 2 se usa el formato 1.
// El pasaje se hace a pedido con migrarCajaAFormato2() (no toca ni borra los documentos anteriores)
// y se puede deshacer con revertirCajaAFormato1().
// =======================================================================

import { db, doc, getDoc, setDoc, onSnapshot, collection, getDocs, writeBatch } from "../config/firebase.js";
import { COLLECTIONS } from "../config/constants.js";
import { notificarErrorPersistencia } from "../utils/errores.js";

const DOC_GASTOS = "gastos";
const DOC_INGRESOS_MANUALES = "ingresos_manuales";
const DOC_FORMATO = "_formato";
const TIPOS = ["gasto", "ingreso"];
const TAMANO_LOTE = 400; // Firestore admite hasta 500 operaciones por lote

// Colección de trabajo. Solo se cambia en pruebas (usarColeccionCaja) para no tocar datos reales.
let coleccionCaja = COLLECTIONS.CAJA_FESTIVALES;

// Estado conocido del servidor (lo actualiza el listener) para guardar solo lo que cambió
let formatoActual = 1;
const conocidos = { gasto: new Map(), ingreso: new Map() }; // id -> { firma, creadoEn }

export function usarColeccionCaja(nombre) {
    coleccionCaja = nombre || COLLECTIONS.CAJA_FESTIVALES;
    formatoActual = 1;
    conocidos.gasto = new Map();
    conocidos.ingreso = new Map();
}

export function obtenerFormatoCaja() {
    return formatoActual;
}

// ---------- utilidades ----------

function limpiarIdDoc(id) {
    return String(id).replace(/[^A-Za-z0-9_-]/g, "_");
}

function idDocMovimiento(tipo, id) {
    return `mov-${tipo}-${limpiarIdDoc(id)}`;
}

// JSON con claves ordenadas: Firestore devuelve los campos en otro orden que el original
function canonico(valor) {
    if (Array.isArray(valor)) return "[" + valor.map(canonico).join(",") + "]";
    if (valor && typeof valor === "object") {
        return "{" + Object.keys(valor).sort().map(k => JSON.stringify(k) + ":" + canonico(valor[k])).join(",") + "}";
    }
    return JSON.stringify(valor === undefined ? null : valor);
}

function limpiarParaFirestore(obj) {
    return JSON.parse(JSON.stringify(obj)); // quita undefined y funciones
}

function aplanar(porAnio) {
    const mapa = new Map(); // id -> { anio, item }
    Object.keys(porAnio || {}).forEach(anio => {
        (porAnio[anio] || []).forEach(item => {
            if (!item || item.id === undefined || item.id === null || item.id === "") {
                console.warn("[Caja Service] Movimiento sin id: no se puede guardar en el formato nuevo", item);
                return;
            }
            mapa.set(String(item.id), { anio: String(anio), item: limpiarParaFirestore(item) });
        });
    });
    return mapa;
}

// Arma el estado de caja a partir de la colección completa
function construirEstado(snap) {
    const est = {
        formato: 1,
        legacy: { gasto: null, ingreso: null },
        movimientos: { gasto: {}, ingreso: {} }, // por año, ya ordenados
        conocidos: { gasto: new Map(), ingreso: new Map() }
    };
    const crudos = { gasto: {}, ingreso: {} };
    snap.forEach(d => {
        const data = d.data() || {};
        if (d.id === DOC_FORMATO) {
            est.formato = Number(data.version) || 1;
        } else if (d.id === DOC_GASTOS) {
            est.legacy.gasto = data.anios || {};
        } else if (d.id === DOC_INGRESOS_MANUALES) {
            est.legacy.ingreso = data.anios || {};
        } else if (data._tipo === "movimiento" && data.item && TIPOS.includes(data.tipo)) {
            const anio = String(data.anio);
            (crudos[data.tipo][anio] = crudos[data.tipo][anio] || []).push({ item: data.item, creadoEn: Number(data.creadoEn) || 0 });
            est.conocidos[data.tipo].set(String(data.item.id), {
                firma: canonico({ anio, item: data.item }),
                creadoEn: Number(data.creadoEn) || 0
            });
        }
    });
    TIPOS.forEach(tipo => {
        Object.keys(crudos[tipo]).forEach(anio => {
            est.movimientos[tipo][anio] = crudos[tipo][anio]
                .sort((a, b) => (a.creadoEn - b.creadoEn) || String(a.item.id).localeCompare(String(b.item.id)))
                .map(x => x.item);
        });
    });
    return est;
}

function datosSegunFormato(est, tipo) {
    return est.formato === 2 ? est.movimientos[tipo] : est.legacy[tipo];
}

// ---------- lectura ----------

export async function obtenerEstadoCaja() {
    const snap = await getDocs(collection(db, coleccionCaja));
    return construirEstado(snap);
}

/** Todos los gastos de Caja: { '2025': [...], '2026': [...] } (o null si todavía no hay nada) */
export async function obtenerGastosCajaFirestore() {
    try {
        const est = await obtenerEstadoCaja();
        return datosSegunFormato(est, "gasto");
    } catch (err) {
        console.warn("[Caja Service] Error al obtener gastos de Firestore:", err);
        return null;
    }
}

/** Ingresos manuales de Caja: { '2025': [...], '2026': [...] } (o null si todavía no hay nada) */
export async function obtenerIngresosManualesCajaFirestore() {
    try {
        const est = await obtenerEstadoCaja();
        return datosSegunFormato(est, "ingreso");
    } catch (err) {
        console.warn("[Caja Service] Error al obtener ingresos manuales:", err);
        return null;
    }
}

// ---------- escritura ----------

async function ejecutarOperaciones(operaciones) {
    for (let i = 0; i < operaciones.length; i += TAMANO_LOTE) {
        const lote = writeBatch(db);
        operaciones.slice(i, i + TAMANO_LOTE).forEach(op => {
            const ref = doc(db, coleccionCaja, op.id);
            if (op.borrar) lote.delete(ref);
            else lote.set(ref, op.datos);
        });
        await lote.commit();
    }
}

/**
 * Guarda en formato 2 solo lo que cambió respecto del último estado conocido del servidor:
 * movimientos nuevos o modificados (set) y movimientos quitados por esta persona (delete).
 */
async function guardarMovimientos(tipo, porAnio) {
    const actual = aplanar(porAnio);
    const previos = conocidos[tipo];
    const operaciones = [];
    const ahora = Date.now();
    let orden = 0;

    actual.forEach(({ anio, item }, id) => {
        const firma = canonico({ anio, item });
        const previo = previos.get(id);
        if (previo && previo.firma === firma) { orden++; return; }
        const creadoEn = previo ? previo.creadoEn : (ahora + orden);
        orden++;
        operaciones.push({
            id: idDocMovimiento(tipo, id),
            datos: { _tipo: "movimiento", tipo, anio, item, creadoEn, actualizadoEn: new Date().toISOString() },
            _id: id, _firma: firma, _creadoEn: creadoEn
        });
    });
    previos.forEach((_, id) => {
        if (!actual.has(id)) operaciones.push({ id: idDocMovimiento(tipo, id), borrar: true, _id: id, _borrar: true });
    });

    if (operaciones.length === 0) return true;
    await ejecutarOperaciones(operaciones);
    operaciones.forEach(op => {
        if (op._borrar) previos.delete(op._id);
        else previos.set(op._id, { firma: op._firma, creadoEn: op._creadoEn });
    });
    return true;
}

async function guardarLegacy(docId, anios) {
    await setDoc(doc(db, coleccionCaja, docId), {
        anios,
        actualizadoEn: new Date().toISOString()
    }, { merge: true });
    return true;
}

/** Guardar los gastos de Caja ({ '2025': [...], '2026': [...] }) */
export async function guardarGastosCajaFirestore(gastosData) {
    try {
        if (formatoActual === 2) await guardarMovimientos("gasto", gastosData);
        else await guardarLegacy(DOC_GASTOS, gastosData);
        return true;
    } catch (err) {
        console.error("[Caja Service] Error al guardar gastos:", err);
        notificarErrorPersistencia("los gastos de caja", err);
        return false;
    }
}

/** Guardar los ingresos manuales de Caja ({ '2025': [...], '2026': [...] }) */
export async function guardarIngresosManualesCajaFirestore(ingresosData) {
    try {
        if (formatoActual === 2) await guardarMovimientos("ingreso", ingresosData);
        else await guardarLegacy(DOC_INGRESOS_MANUALES, ingresosData);
        return true;
    } catch (err) {
        console.error("[Caja Service] Error al guardar ingresos manuales:", err);
        notificarErrorPersistencia("los ingresos de caja", err);
        return false;
    }
}

// ---------- tiempo real ----------

/**
 * Escuchar cambios de Caja en tiempo real (Multi-Operador / Multi-Ventana).
 * Un solo listener sobre la colección: entrega siempre el estado completo { anio: [...] } de gastos e ingresos,
 * sea cual sea el formato en uso.
 */
export function escucharCajaEnTiempoReal(onGastosUpdate, onIngresosUpdate) {
    try {
        return onSnapshot(collection(db, coleccionCaja), (snap) => {
            const est = construirEstado(snap);
            formatoActual = est.formato;
            conocidos.gasto = est.conocidos.gasto;
            conocidos.ingreso = est.conocidos.ingreso;
            const gastos = datosSegunFormato(est, "gasto");
            const ingresos = datosSegunFormato(est, "ingreso");
            if (gastos && typeof onGastosUpdate === "function") onGastosUpdate(gastos);
            if (ingresos && typeof onIngresosUpdate === "function") onIngresosUpdate(ingresos);
        }, (err) => {
            console.warn("[Caja Realtime] Error en listener de caja:", err);
            if (window.notificarSincronizacion) window.notificarSincronizacion('warn', 'No se pudo actualizar. Se muestran los últimos datos.', { persistente: true, reintentar: true });
        });
    } catch (err) {
        console.warn("[Caja Realtime] Error configurando escucha de Caja:", err);
        return () => {};
    }
}

// ---------- migración (a pedido, con vuelta atrás) ----------

/**
 * Pasa la Caja al formato 2. NO borra ni modifica los documentos anteriores (quedan como respaldo).
 * Es repetible: si se interrumpe, se puede volver a ejecutar. Verifica antes de activar el formato nuevo.
 */
export async function migrarCajaAFormato2() {
    const est = await obtenerEstadoCaja();
    if (est.formato === 2) return { ok: true, yaMigrada: true };

    const base = Date.now();
    const resumen = { gasto: 0, ingreso: 0 };
    const operaciones = [];
    const esperado = { gasto: new Map(), ingreso: new Map() };
    TIPOS.forEach(tipo => {
        const plano = aplanar(est.legacy[tipo] || {});
        let k = 0;
        plano.forEach(({ anio, item }, id) => {
            operaciones.push({
                id: idDocMovimiento(tipo, id),
                datos: { _tipo: "movimiento", tipo, anio, item, creadoEn: base + k, actualizadoEn: new Date().toISOString() }
            });
            esperado[tipo].set(id, canonico({ anio, item }));
            k++;
            resumen[tipo]++;
        });
    });
    await ejecutarOperaciones(operaciones);

    // Verificación: lo escrito tiene que coincidir con lo anterior, movimiento por movimiento
    const verif = await obtenerEstadoCaja();
    const diferencias = [];
    TIPOS.forEach(tipo => {
        esperado[tipo].forEach((firma, id) => {
            const real = verif.conocidos[tipo].get(id);
            if (!real || real.firma !== firma) diferencias.push(`${tipo}:${id}`);
        });
    });
    if (diferencias.length > 0) {
        return { ok: false, motivo: "La verificación encontró diferencias; no se activó el formato nuevo", diferencias };
    }

    await setDoc(doc(db, coleccionCaja, DOC_FORMATO), {
        version: 2,
        migradoEn: new Date().toISOString(),
        gastos: resumen.gasto,
        ingresos: resumen.ingreso
    });
    formatoActual = 2;
    return { ok: true, gastos: resumen.gasto, ingresos: resumen.ingreso };
}

/**
 * Vuelve al formato 1: reconstruye los dos documentos anteriores a partir de los movimientos actuales
 * (así no se pierde lo cargado después de migrar) y desactiva el formato nuevo.
 */
export async function revertirCajaAFormato1() {
    const est = await obtenerEstadoCaja();
    if (est.formato !== 2) return { ok: true, yaEnFormato1: true };
    // Los años que existían en el documento anterior y ya no tienen movimientos se dejan vacíos (reflejan lo borrado)
    const combinar = (tipo) => {
        const resultado = { ...est.movimientos[tipo] };
        Object.keys(est.legacy[tipo] || {}).forEach(anio => { if (!(anio in resultado)) resultado[anio] = []; });
        return resultado;
    };
    await guardarLegacy(DOC_GASTOS, combinar("gasto"));
    await guardarLegacy(DOC_INGRESOS_MANUALES, combinar("ingreso"));
    await setDoc(doc(db, coleccionCaja, DOC_FORMATO), { version: 1, revertidoEn: new Date().toISOString() });
    formatoActual = 1;
    return { ok: true };
}
