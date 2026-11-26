// =======================================================================
// src/services/calendarioService.js — Lectura de Google Calendar (v2.11)
// Usa el mismo Apps Script que Mandala Admisión (acción `getEvents`). Festivales solo LEE la agenda:
// nunca crea, edita ni borra eventos del calendario.
// El calendario de cada docente sale de usuarios_sistema.profesor_id → profesores/{id}.correo_calendario
// (y, si no está, del campo correo_calendario del propio usuario).
// =======================================================================

import { db, auth, doc, getDoc } from "../config/firebase.js";
import { SCRIPT_URL, SCRIPT_API_KEY, COLLECTIONS } from "../config/constants.js";

const ESPERA_MS = 9000;

async function pedirAlScript(payload) {
    const cuerpo = { ...payload, apiKey: SCRIPT_API_KEY };
    try {
        const token = await auth.currentUser?.getIdToken();
        if (token) cuerpo.idToken = token;
    } catch (e) { console.warn('[Calendario] No se pudo obtener el token de sesión:', e && e.message); }

    let ultimoError = null;
    for (let intento = 0; intento < 3; intento++) {
        const ctrl = typeof AbortController !== 'undefined' ? new AbortController() : null;
        const timer = ctrl ? setTimeout(() => ctrl.abort(), ESPERA_MS) : null;
        try {
            const res = await fetch(SCRIPT_URL, {
                method: 'POST',
                body: JSON.stringify(cuerpo),
                headers: { 'Content-Type': 'text/plain;charset=utf-8' },
                redirect: 'follow',
                credentials: 'omit',
                signal: ctrl ? ctrl.signal : undefined
            });
            const texto = await res.text();
            const esHtml = texto.trim().startsWith('<');
            if (!res.ok || esHtml) throw new Error(`Google Calendar respondió con un error (HTTP ${res.status}).`);
            const datos = JSON.parse(texto);
            if (datos && datos.error) {
                const err = new Error(datos.error);
                err.definitivo = true; // error del script (calendario sin permiso, sesión rechazada): no se reintenta
                throw err;
            }
            return datos;
        } catch (e) {
            ultimoError = e;
            if (e && e.definitivo) throw e;
            await new Promise(r => setTimeout(r, 700));
        } finally {
            if (timer) clearTimeout(timer);
        }
    }
    throw ultimoError || new Error('No se pudo consultar Google Calendar.');
}

/** Hora local (AR) → texto ISO con zona, como lo arma Admisión */
function isoLocal(d) {
    const tzo = -d.getTimezoneOffset(), dif = tzo >= 0 ? '+' : '-', p = n => (n < 10 ? '0' : '') + n;
    return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate()) + 'T' + p(d.getHours()) + ':' + p(d.getMinutes()) + ':' + p(d.getSeconds())
        + dif + p(Math.floor(Math.abs(tzo) / 60)) + ':' + p(Math.abs(tzo) % 60);
}

/** Un evento de todo el día (feriados, recordatorios): no cuenta como clase */
function esDeTodoElDia(ev, ini, fin) {
    if (ev && ev.allDay === true) return true;
    if (!ini || !fin) return false;
    const empiezaMedianoche = ini.getHours() === 0 && ini.getMinutes() === 0;
    const terminaMedianoche = fin.getHours() === 0 && fin.getMinutes() === 0;
    return empiezaMedianoche && terminaMedianoche && (fin - ini) >= 23 * 3600 * 1000;
}

/**
 * Clases del calendario de un docente en un día completo (00:00 a 23:59).
 * @param {string} calendarioId correo del calendario
 * @param {string} fechaISO 'AAAA-MM-DD'
 * @returns {Promise<Array<{id, titulo, inicio, fin}>>} ordenadas por hora
 */
export async function obtenerClasesDelDia(calendarioId, fechaISO) {
    if (!calendarioId || !/^\d{4}-\d{2}-\d{2}$/.test(fechaISO || '')) return [];
    const [a, m, d] = fechaISO.split('-').map(Number);
    const desde = new Date(a, m - 1, d, 0, 0, 0);
    const hasta = new Date(a, m - 1, d, 23, 59, 59);
    const datos = await pedirAlScript({ action: 'getEvents', calendarId: calendarioId, timeMin: isoLocal(desde), timeMax: isoLocal(hasta) });
    const items = Array.isArray(datos && datos.items) ? datos.items : [];
    return items.map(ev => {
        const ini = ev.start && (ev.start.dateTime || ev.start.date) ? new Date(ev.start.dateTime || ev.start.date) : null;
        const fin = ev.end && (ev.end.dateTime || ev.end.date) ? new Date(ev.end.dateTime || ev.end.date) : null;
        return { ev, ini, fin };
    }).filter(x => x.ev && x.ev.id && x.ini && !isNaN(x.ini) && !esDeTodoElDia(x.ev, x.ini, x.fin)
        && !String(x.ev.summary || '').trim().startsWith('❌'))   // v2.15: clase anulada por una suplencia (Portal Docentes)
      .map(x => ({ id: String(x.ev.id), titulo: String(x.ev.summary || '(sin título)'), inicio: x.ini.toISOString(), fin: x.fin && !isNaN(x.fin) ? x.fin.toISOString() : '' }))
      .sort((p, q) => p.inicio.localeCompare(q.inicio));
}

/**
 * Calendario de un usuario docente: primero la ficha de profesores (correo_calendario), después su propio usuario.
 * Devuelve '' si no tiene ninguno.
 */
export async function obtenerCalendarioDocente(usuario) {
    if (!usuario) return '';
    if (usuario.profesor_id) {
        try {
            const snap = await getDoc(doc(db, COLLECTIONS.PROFESORES, usuario.profesor_id));
            const cal = snap.exists() ? String(snap.data().correo_calendario || snap.data().email_calendar || '').trim().toLowerCase() : '';
            if (cal) return cal;
        } catch (e) { console.warn('[Calendario] No se pudo leer la ficha docente:', e && (e.code || e.message)); }
    }
    return usuario.correo_calendario || '';
}
