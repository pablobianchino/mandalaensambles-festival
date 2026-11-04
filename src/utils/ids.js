// =======================================================================
// src/utils/ids.js — Identificadores estables para importaciones masivas
// El mismo nombre (y año) produce siempre el mismo id: reimportar un Excel
// actualiza los documentos existentes en lugar de duplicarlos.
// =======================================================================

export function slugificar(texto) {
    return String(texto || '')
        .normalize('NFD').replace(/\p{M}/gu, '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 60) || 'sin-nombre';
}

export function idVenueEstable(nombre) {
    return 'venue-' + slugificar(nombre);
}

export function idHistoricoEstable(anio, nombre, fecha) {
    return 'hist-' + slugificar(anio) + '-' + slugificar(nombre) + (fecha ? '-' + slugificar(fecha) : '');
}

/** Ejecuta las escrituras en lotes atómicos de hasta 400 operaciones (el máximo de Firestore es 500). */
export async function ejecutarEnLotes(db, writeBatch, operaciones) {
    const TAM = 400;
    for (let i = 0; i < operaciones.length; i += TAM) {
        const batch = writeBatch(db);
        operaciones.slice(i, i + TAM).forEach(op => op(batch));
        await batch.commit();
    }
}
