// =======================================================================
// src/utils/errores.js — Aviso centralizado de errores de persistencia
// Los servicios devuelven `false` en lugar de lanzar excepciones; para que el
// usuario nunca crea que se guardó algo que falló, emiten este evento y la UI
// (index.html) muestra un aviso.
// =======================================================================

export function notificarErrorPersistencia(contexto, err) {
    try {
        window.dispatchEvent(new CustomEvent('mandala:error-persistencia', {
            detail: {
                contexto: contexto || 'los datos',
                codigo: (err && err.code) || '',
                mensaje: (err && err.message) || ''
            }
        }));
    } catch (e) { /* sin window (tests) */ }
}
