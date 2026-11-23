// =======================================================================
// src/ui/planificacion.js — Aviso de clases que chocan con un evento (v2.11) · script clásico
//
//   · Bloque "Docentes del evento" (Info y artistas): se asignan docentes al evento.
//   · Motor: revisa la agenda (Google Calendar) del día completo del evento de cada docente asignado
//     que además es Gestor de Festivales (o Admin). Cuentan los eventos Programado y En Curso con fecha
//     de hoy en adelante (Lápiz no cuenta). Ignora los eventos de todo el día.
//   · Cuándo se revisa: (1) al guardar un evento con cambios de fecha, estado o docentes (solo ese evento);
//     (2) una vez por día, en el primer ingreso de alguien con avisos, con el resultado guardado en
//     festivales_planificacion; (3) con el botón "Volver a revisar".
//   · "Mis avisos" (menú) y popup para el docente: solo sus clases; popup si el evento está a 7 días o menos.
//   · Sección "Planificación" (Admin y Planificador): todos los avisos, sin popup.
//   · Una clase se marca Reprogramada / Cancelada / No aplica (docente, Planificador o Admin); queda quién y cuándo.
//
// Usa variables globales de index.html: infoFestivales, eventoActualId, fechaEventoISO, esc, mostrarToast,
// navegarPanel, abrirDetalleEvento, cerrarModales. Los datos llegan por window.MandalaApp (src/app.js).
// =======================================================================
(function () {
    'use strict';

    var ESTADOS_QUE_CUENTAN = ['Programado', 'En Curso'];
    var DIAS_POPUP = 7;
    var RESOLUCIONES = {
        reprogramada: { texto: 'Reprogramada', clase: 'pc-ok' },
        cancelada: { texto: 'Cancelada', clase: 'pc-neu' },
        no_aplica: { texto: 'No aplica', clase: 'pc-neu' }
    };
    var DIAS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
    var DIAS_CORTOS = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'];

    var estado = {
        datos: {},              // eventoId -> documento de festivales_planificacion
        datosRecibidos: false,
        eventosCargados: false,
        inicioHecho: false,
        popupMostrado: false,
        revisando: {},          // eventoId -> true mientras se consulta el calendario
        revisandoTodo: false,
        docentes: null,         // usuarios activos con rol docente (solo gestión)
        agregandoDocente: false,
        filtros: { ver: 'todos', estado: 'pendientes', evento: '' }
    };

    // ------------------------------------------------------------------ utilidades
    function app() { return window.MandalaApp || {}; }
    function svc() { return app().planificacion || {}; }
    function e(t) { return typeof esc === 'function' ? esc(t) : String(t == null ? '' : t).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
    function js(t) { return String(t == null ? '' : t).replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/"/g, '&quot;'); }
    function toast(m, t) { if (typeof mostrarToast === 'function') mostrarToast(m, t || 'success'); }
    function usuario() { return window.usuarioActual || {}; }
    function miEmail() { return String(usuario().email || '').toLowerCase(); }
    function modoPlanificador() { return !!window.modoPlanificador; }
    function puedeGestionar() { return !modoPlanificador() && !window.modoSonidista && !!usuario().tieneGestion; }
    function vePlanificacion() { return !!(window.vistaRol && window.vistaRol.verPlanificacion); }
    function esModoPrueba() { return typeof svc().modoPrueba === 'function' && svc().modoPrueba(); }

    function hoyISO() { var d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }
    function claveEmail(email) { return String(email || '').toLowerCase().replace(/[^a-z0-9]/g, '_'); }
    function limpiarClave(t) { return String(t || '').replace(/[^A-Za-z0-9_-]/g, '_'); }
    function claveClase(iso, email, idClase) { return limpiarClave(iso) + '__' + claveEmail(email) + '__' + limpiarClave(idClase); }
    function iniciales(n) { return String(n || '?').trim().split(/\s+/).slice(0, 2).map(function (w) { return w[0] || ''; }).join('').toUpperCase() || '?'; }

    function isoDeEvento(info) {
        if (!info) return '';
        // La fecha puede estar como "15/12/2026 20:30" o como "2026-12-17T20:30" (según cómo se cargó el evento)
        var txt = String(info.fechaRaw || info.fecha || '');
        var iso = txt.match(/^(\d{4})-(\d{2})-(\d{2})/);
        if (iso) return iso[1] + '-' + iso[2] + '-' + iso[3];
        var m = txt.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
        return m ? m[3] + '-' + m[2].padStart(2, '0') + '-' + m[1].padStart(2, '0') : '';
    }
    function fechaDeISO(iso) { var p = String(iso).split('-').map(Number); return new Date(p[0], p[1] - 1, p[2]); }
    function diasHasta(iso) {
        var hoy = fechaDeISO(hoyISO());
        return Math.round((fechaDeISO(iso) - hoy) / 86400000);
    }
    function textoDiasHasta(iso) {
        var n = diasHasta(iso);
        if (n === 0) return 'hoy';
        if (n === 1) return 'mañana';
        return 'en ' + n + ' días';
    }
    function fechaLarga(iso) { var d = fechaDeISO(iso); return DIAS[d.getDay()] + ' ' + String(d.getDate()).padStart(2, '0') + '/' + String(d.getMonth() + 1).padStart(2, '0') + '/' + d.getFullYear(); }
    function fechaCorta(iso) { var d = fechaDeISO(iso); return DIAS_CORTOS[d.getDay()] + ' ' + String(d.getDate()).padStart(2, '0') + '/' + String(d.getMonth() + 1).padStart(2, '0'); }
    function hora(isoCompleto) { if (!isoCompleto) return ''; var d = new Date(isoCompleto); return isNaN(d) ? '' : String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0'); }
    function rangoHora(c) { var a = hora(c.inicio), b = hora(c.fin); return b ? a + '–' + b : a; }
    function fechaHoraCorta(isoCompleto) { var d = new Date(isoCompleto); return isNaN(d) ? '' : String(d.getDate()).padStart(2, '0') + '/' + String(d.getMonth() + 1).padStart(2, '0') + ' ' + hora(isoCompleto); }
    function nombreCorto(n) { return String(n || '').trim().split(/\s+/)[0] || n; }

    // ------------------------------------------------------------------ eventos y clases
    function infos() { return (typeof infoFestivales !== 'undefined') ? infoFestivales : {}; }

    /** Evento que cuenta: Programado o En Curso, con fecha de hoy en adelante */
    function eventoCuenta(info) {
        if (!info || ESTADOS_QUE_CUENTAN.indexOf(info.estado) === -1) return false;
        var iso = isoDeEvento(info);
        return !!iso && iso >= hoyISO();
    }
    function eventosQueCuentan() {
        var I = infos();
        return Object.keys(I).map(function (k) { return I[k]; }).filter(eventoCuenta)
            .sort(function (a, b) { return isoDeEvento(a).localeCompare(isoDeEvento(b)); });
    }
    function docentesDe(info) { return (info && Array.isArray(info.docentesAsignados)) ? info.docentesAsignados : []; }

    /** Revisión vigente del evento (si la fecha cambió, la revisión anterior ya no vale) */
    function revisionVigente(fId) {
        var info = infos()[fId];
        var d = estado.datos[fId];
        var iso = isoDeEvento(info);
        if (!d || !d.revision || !iso || d.revision.fechaISO !== iso) return null;
        return d.revision;
    }
    function resolucion(fId, clave) {
        var d = estado.datos[fId];
        return (d && d.resoluciones && d.resoluciones[clave]) || null;
    }

    /**
     * Estado de un docente asignado en un evento:
     * { tipo: 'no_recibe'|'sin_calendario'|'no_cuenta'|'sin_revisar'|'revisando'|'error'|'ok', clases: [...con clave y res], pendientes, resueltas, error }
     */
    function estadoDocente(fId, docente) {
        var info = infos()[fId];
        var out = { tipo: 'ok', clases: [], pendientes: 0, resueltas: 0, error: '' };
        if (docente.recibeAvisos === false) { out.tipo = 'no_recibe'; return out; }
        if (!eventoCuenta(info)) { out.tipo = 'no_cuenta'; return out; }
        if (estado.revisando[fId]) { out.tipo = 'revisando'; }
        var rev = revisionVigente(fId);
        var r = rev && rev.docentes ? rev.docentes[claveEmail(docente.email)] : null;
        if (!r) {
            if (out.tipo !== 'revisando') out.tipo = docente.calendarioId ? 'sin_revisar' : 'sin_calendario';
            return out;
        }
        if (r.estado === 'sin_calendario') { out.tipo = 'sin_calendario'; return out; }
        if (r.estado === 'error') { out.tipo = out.tipo === 'revisando' ? 'revisando' : 'error'; out.error = r.error || ''; return out; }
        var iso = isoDeEvento(info);
        out.clases = (Array.isArray(r.clases) ? r.clases : []).map(function (c) {
            var clave = claveClase(iso, docente.email, c.id);
            return { id: c.id, titulo: c.titulo, inicio: c.inicio, fin: c.fin, clave: clave, res: resolucion(fId, clave) };
        });
        out.clases.forEach(function (c) { if (c.res) out.resueltas++; else out.pendientes++; });
        return out;
    }

    /** Todas las clases en conflicto: [{ fId, info, iso, docente, est }] por evento y docente */
    function filasPorEventoYDocente() {
        var filas = [];
        eventosQueCuentan().forEach(function (info) {
            var iso = isoDeEvento(info);
            filas.push({ info: info, iso: iso, docentes: docentesDe(info).map(function (d) { return { docente: d, est: estadoDocente(info.id, d) }; }) });
        });
        return filas;
    }

    /** Clases pendientes del usuario actual (solo si recibe avisos) */
    function misPendientes() {
        var yo = miEmail();
        var res = [];
        if (!yo || modoPlanificador()) return res;
        eventosQueCuentan().forEach(function (info) {
            docentesDe(info).forEach(function (d) {
                if (String(d.email || '').toLowerCase() !== yo) return;
                var est = estadoDocente(info.id, d);
                est.clases.forEach(function (c) { if (!c.res) res.push({ info: info, iso: isoDeEvento(info), docente: d, clase: c }); });
            });
        });
        return res;
    }
    function soyDocenteAsignado() {
        var yo = miEmail();
        if (!yo) return false;
        return eventosQueCuentan().some(function (info) { return docentesDe(info).some(function (d) { return String(d.email || '').toLowerCase() === yo && d.recibeAvisos !== false; }); });
    }
    function totalPendientes() {
        var n = 0;
        filasPorEventoYDocente().forEach(function (f) { f.docentes.forEach(function (x) { n += x.est.pendientes; }); });
        return n;
    }
    function tieneAvisos() {
        return vePlanificacion() || !!usuario().esAdmin || soyDocenteAsignado();
    }

    // ------------------------------------------------------------------ motor de revisión
    async function calendarioActual(docente) {
        // Quien gestiona puede leer la ficha docente: se toma el calendario fresco. El planificador usa el guardado.
        if (puedeGestionar() && app().calendario && typeof app().calendario.calendarioDocente === 'function') {
            try {
                var lista = await cargarDocentes();
                var u = lista.find(function (x) { return x.email === String(docente.email || '').toLowerCase(); });
                if (u) {
                    var cal = await app().calendario.calendarioDocente(u);
                    if (cal) return cal;
                }
            } catch (err) { /* se usa el guardado */ }
        }
        return docente.calendarioId || '';
    }

    /** Revisa un evento. Devuelve true si se pudo guardar el resultado. */
    async function revisarEvento(fId, opciones) {
        opciones = opciones || {};
        var info = infos()[fId];
        if (!info || !eventoCuenta(info) || estado.revisando[fId]) return false;
        var iso = isoDeEvento(info);
        var docentes = docentesDe(info).filter(function (d) { return d.recibeAvisos !== false && d.email; });
        var cal = app().calendario;
        if (!cal || typeof cal.clasesDelDia !== 'function') return false;
        estado.revisando[fId] = true;
        refrescarTodo();
        var resultado = {};
        try {
            for (var i = 0; i < docentes.length; i++) {
                var d = docentes[i];
                var k = claveEmail(d.email);
                var calId = await calendarioActual(d);
                if (!calId) { resultado[k] = { email: d.email, nombre: d.nombre || '', estado: 'sin_calendario', clases: [] }; continue; }
                try {
                    var clases = await cal.clasesDelDia(calId, iso);
                    resultado[k] = { email: d.email, nombre: d.nombre || '', estado: 'ok', clases: clases };
                } catch (err) {
                    console.warn('[Planificación] No se pudo leer el calendario de ' + d.email + ':', err && err.message);
                    resultado[k] = { email: d.email, nombre: d.nombre || '', estado: 'error', error: String((err && err.message) || 'Error al leer el calendario').slice(0, 200), clases: [] };
                }
            }
            var revision = { fechaISO: iso, revisadoEn: new Date().toISOString(), revisadoPor: miEmail(), docentes: resultado };
            // Se refleja enseguida en pantalla; la escucha en tiempo real lo confirma después
            estado.datos[fId] = Object.assign({}, estado.datos[fId] || { eventoId: fId }, { revision: revision, fechaISO: iso, nombre: info.nombre || '' });
            var ok = await svc().guardarRevision(fId, { nombre: info.nombre || '', fechaISO: iso, revision: revision });
            if (!ok && !opciones.silencioso) toast('Se revisó la agenda, pero no se pudo guardar el resultado (sin permiso o sin conexión).', 'warning');
            return ok;
        } finally {
            delete estado.revisando[fId];
            refrescarTodo();
        }
    }

    /** Revisa todos los eventos que cuentan y tienen docentes que reciben avisos */
    async function revisarTodos(opciones) {
        opciones = opciones || {};
        if (estado.revisandoTodo) return;
        estado.revisandoTodo = true;
        refrescarTodo();
        var n = 0;
        try {
            var lista = eventosQueCuentan().filter(function (info) { return docentesDe(info).some(function (d) { return d.recibeAvisos !== false; }); });
            for (var i = 0; i < lista.length; i++) { await revisarEvento(lista[i].id, { silencioso: true }); n++; }
            if (opciones.marcarDia !== false && typeof svc().marcarRevisionDiaria === 'function') await svc().marcarRevisionDiaria(hoyISO(), miEmail());
        } finally {
            estado.revisandoTodo = false;
            refrescarTodo();
        }
        if (!opciones.silencioso) toast(n ? 'Se revisó la agenda de ' + n + ' evento' + (n === 1 ? '' : 's') + '.' : 'No hay eventos con docentes asignados para revisar.', 'info');
    }

    /** Eventos con docentes que reciben avisos y sin revisión vigente (fecha cambiada o docente nuevo) */
    function eventosSinRevisionVigente() {
        return eventosQueCuentan().filter(function (info) {
            var docs = docentesDe(info).filter(function (d) { return d.recibeAvisos !== false; });
            if (!docs.length) return false;
            var rev = revisionVigente(info.id);
            if (!rev) return true;
            return docs.some(function (d) { return !rev.docentes || !rev.docentes[claveEmail(d.email)]; });
        });
    }

    async function arranqueDelDia() {
        if (estado.inicioHecho || !estado.eventosCargados || !estado.datosRecibidos) return;
        estado.inicioHecho = true;
        if (!tieneAvisos()) { refrescarTodo(); return; }
        var ultima = (typeof svc().leerRevisionDiaria === 'function') ? await svc().leerRevisionDiaria() : null;
        if (ultima !== null && ultima !== hoyISO()) {
            console.log('[Planificación] Primera revisión del día: se revisan todos los eventos.');
            await revisarTodos({ silencioso: true });
        } else if (puedeGestionar()) {
            // Ya se revisó hoy: solo los eventos que quedaron sin revisión vigente
            var pend = eventosSinRevisionVigente();
            for (var i = 0; i < pend.length; i++) await revisarEvento(pend[i].id, { silencioso: true });
        }
        refrescarTodo();
        evaluarPopup();
    }

    // Al guardar un evento con cambios de fecha, estado o docentes: se revisa solo ese evento
    window.addEventListener('mandala:festival-guardado', function (ev) {
        var det = (ev && ev.detail) || {};
        if (!det.id || !det.campos || modoPlanificador()) return;
        var c = det.campos;
        var cambiaAlgo = c.fechaHora !== undefined || c.fecha !== undefined || c.estado !== undefined || Array.isArray(c.docentesAsignados);
        if (!cambiaAlgo) return;
        setTimeout(function () {
            var info = infos()[det.id];
            if (info && eventoCuenta(info) && docentesDe(info).some(function (d) { return d.recibeAvisos !== false; })) revisarEvento(det.id, { silencioso: true });
            else refrescarTodo();
        }, 1200);
    });

    // ------------------------------------------------------------------ resoluciones
    async function resolver(fId, clave, valorEstado) {
        if (!fId || !clave) return;
        var valor = valorEstado ? { estado: valorEstado, por: miEmail(), porNombre: usuario().nombre || miEmail(), fecha: new Date().toISOString() } : null;
        // Se refleja al instante
        var d = estado.datos[fId] = Object.assign({ eventoId: fId }, estado.datos[fId] || {});
        d.resoluciones = Object.assign({}, d.resoluciones || {});
        if (valor) d.resoluciones[clave] = valor; else delete d.resoluciones[clave];
        refrescarTodo();
        var ok = await svc().guardarResolucion(fId, clave, valor);
        if (!ok) toast('No se pudo guardar. Revisá la conexión y reintentá.', 'error');
        if (document.getElementById('modal-avisos-clases') && document.getElementById('modal-avisos-clases').classList.contains('active')) {
            if (!misPendientesPopup().length) cerrarPopup();
            else renderizarPopup();
        }
    }

    // Acción de una clase: pendiente → botón "Resolver ▾" con menú; resuelta → estado, quién y cuándo, y Deshacer
    function htmlAcciones(fId, c) {
        if (c.res) {
            var r = RESOLUCIONES[c.res.estado] || { texto: c.res.estado, clase: 'pc-neu' };
            return '<span class="pc-resuelta"><span class="pc-pill ' + r.clase + '">' + e(r.texto) + '</span> <small class="pc-gris">' + e(nombreCorto(c.res.porNombre || c.res.por)) + ' · ' + e(fechaHoraCorta(c.res.fecha)) + '</small> '
                + '<button type="button" class="btn-deshacer" onclick="Planificacion.resolver(\'' + js(fId) + '\', \'' + js(c.clave) + '\', null)">Deshacer</button></span>';
        }
        var item = function (estadoRes, texto) {
            return '<button type="button" onclick="Planificacion.resolver(\'' + js(fId) + '\', \'' + js(c.clave) + '\', \'' + estadoRes + '\')">' + texto + '</button>';
        };
        return '<span class="pc-resolver"><button type="button" class="pc-btn-resolver" onclick="Planificacion.abrirMenu(event, this)">Resolver ▾</button>'
            + '<span class="pc-menu" role="menu">' + item('reprogramada', 'Reprogramada') + item('cancelada', 'Cancelada') + item('no_aplica', 'No aplica') + '</span></span>';
    }

    // Una fila de clase: hora (gris, monoespaciada) · clase · acción
    function htmlFilaClase(fId, c) {
        return '<div class="pc-fila' + (c.res ? ' pc-fila-resuelta' : '') + '"><span class="pc-hora">' + e(rangoHora(c)) + '</span><span class="pc-clase">' + e(c.titulo) + '</span><span class="pc-accion">' + htmlAcciones(fId, c) + '</span></div>';
    }

    // Cabecera de la tarjeta de un evento
    function htmlCabeceraEvento(info, iso, pendientes, conLink) {
        var nombre = e(String(info.nombre || '').toUpperCase());
        return '<div class="pc-ev-h"><div><span class="pc-ev-t' + (conLink ? ' pc-ev-link" onclick="Planificacion.abrirEvento(\'' + js(info.id) + '\')' : '') + '">' + nombre + '</span>'
            + '<span class="pc-ev-f">' + e(fechaLarga(iso).replace(/\/\d{4}$/, '')) + ' · ' + e(textoDiasHasta(iso)) + (estado.revisando[info.id] ? ' · revisando…' : '') + '</span></div>'
            + (pendientes ? '<span class="pc-pill pc-bad">' + pendientes + ' pendiente' + (pendientes === 1 ? '' : 's') + '</span>' : '') + '</div>';
    }

    // Menú "Resolver ▾": se posiciona fijo junto al botón (así no lo corta el scroll de la tabla o del popup)
    function abrirMenu(ev, boton) {
        if (ev) ev.stopPropagation();
        var cont = boton.parentNode;
        var yaAbierto = cont.classList.contains('abierto');
        cerrarMenus();
        if (yaAbierto) return;
        cont.classList.add('abierto');
        var menu = cont.querySelector('.pc-menu');
        var r = boton.getBoundingClientRect();
        menu.style.top = (r.bottom + 4) + 'px';
        menu.style.left = Math.max(8, r.right - 160) + 'px';
        var alto = menu.offsetHeight || 110;
        if (r.bottom + 4 + alto > window.innerHeight - 8) menu.style.top = Math.max(8, r.top - alto - 4) + 'px';
    }
    function cerrarMenus() {
        document.querySelectorAll('.pc-resolver.abierto').forEach(function (x) { x.classList.remove('abierto'); });
    }
    document.addEventListener('click', cerrarMenus);
    window.addEventListener('scroll', cerrarMenus, true);
    window.addEventListener('resize', cerrarMenus);

    // ------------------------------------------------------------------ Docentes del evento (Info)
    async function cargarDocentes(forzar) {
        if (estado.docentes && !forzar) return estado.docentes;
        var u = app().usuarios;
        if (!u || typeof u.obtenerDocentes !== 'function') return [];
        try { estado.docentes = await u.obtenerDocentes(); } catch (err) { estado.docentes = []; }
        return estado.docentes;
    }

    function htmlEstadoDocentePill(fId, d) {
        var est = estadoDocente(fId, d);
        switch (est.tipo) {
            case 'no_recibe': return '<span class="pc-pill pc-neu">No recibe avisos (no es Gestor)</span>';
            case 'sin_calendario': return '<span class="pc-pill pc-warn">No se puede revisar</span>';
            case 'no_cuenta': return '<span class="pc-pill pc-neu">El evento no se revisa (' + e(estadoEventoTexto(infos()[fId])) + ')</span>';
            case 'revisando': return '<span class="pc-pill pc-neu">Revisando…</span>';
            case 'sin_revisar': return '<span class="pc-pill pc-neu">Sin revisar</span>';
            case 'error': return '<span class="pc-pill pc-bad" title="' + e(est.error) + '">No se pudo leer el calendario</span>';
        }
        if (est.pendientes) return '<span class="pc-pill pc-bad">' + est.pendientes + ' clase' + (est.pendientes === 1 ? '' : 's') + ' en conflicto</span>';
        if (est.resueltas) return '<span class="pc-pill pc-ok">' + est.resueltas + ' resuelta' + (est.resueltas === 1 ? '' : 's') + ' · sin pendientes</span>';
        return '<span class="pc-pill pc-ok">Sin conflictos</span>';
    }
    function estadoEventoTexto(info) {
        if (!info) return '';
        if (info.estado === 'Lapiz') return 'Lápiz';
        if (ESTADOS_QUE_CUENTAN.indexOf(info.estado) !== -1 && !isoDeEvento(info)) return 'sin fecha';
        if (ESTADOS_QUE_CUENTAN.indexOf(info.estado) !== -1) return 'ya pasó';
        return info.estado || '';
    }

    function renderizarDocentesEvento() {
        var card = document.getElementById('card-docentes-evento');
        if (!card) return;
        if (window.modoSonidista) { card.style.display = 'none'; return; }
        card.style.display = '';
        var fId = (typeof eventoActualId !== 'undefined') ? eventoActualId : null;
        var info = infos()[fId];
        if (!info) { card.innerHTML = ''; return; }
        var iso = isoDeEvento(info);
        var docs = docentesDe(info);
        var gestiona = puedeGestionar();
        var sub = iso ? 'Se revisa su agenda del ' + e(fechaLarga(iso)) + ' (día completo). Reciben aviso quienes además son Gestores de Festivales.' : 'El evento no tiene fecha definida: no se puede revisar la agenda.';
        var html = '<div class="card-header-flex"><div><h3 class="card-title">Docentes del evento</h3><span style="font-size:12px; color:var(--text-muted);">' + sub + '</span></div><div class="sec-chips">';
        if (docs.length && eventoCuenta(info)) html += '<button type="button" class="btn-app btn-secondary btn-sm" onclick="Planificacion.revisarEvento(\'' + js(fId) + '\')"' + (estado.revisando[fId] ? ' disabled' : '') + '>' + (estado.revisando[fId] ? 'Revisando…' : '↻ Volver a revisar') + '</button>';
        if (gestiona) html += '<button type="button" class="btn-app btn-primary btn-sm" onclick="Planificacion.mostrarAgregarDocente()">＋ Docente</button>';
        html += '</div></div>';
        if (gestiona && estado.agregandoDocente) html += htmlAgregarDocente(info);
        if (!docs.length) {
            html += '<div class="pc-vacio">No hay docentes asignados a este evento.' + (gestiona ? ' Usá <b>＋ Docente</b> para agregarlos.' : '') + '</div>';
        } else {
            html += '<div class="pc-personas">';
            docs.forEach(function (d) {
                var detalle = ['Docente'];
                if (d.recibeAvisos !== false) detalle.push('Gestor de Festivales');
                detalle.push(d.calendarioId ? 'calendario vinculado' : '<b style="color:var(--warn)">sin calendario vinculado</b>');
                html += '<div class="pc-persona"><span class="pc-avatar">' + e(iniciales(d.nombre || d.email)) + '</span><div class="pc-persona-info"><b>' + e(d.nombre || d.email) + '</b><small>' + detalle.join(' · ') + '</small></div>'
                    + htmlEstadoDocentePill(fId, d)
                    + (gestiona ? '<button type="button" class="btn-row-del" title="Quitar del evento" onclick="Planificacion.quitarDocente(\'' + js(d.email) + '\')">✕</button>' : '')
                    + '</div>';
            });
            html += '</div>';
        }
        card.innerHTML = html;
    }

    function htmlAgregarDocente(info) {
        var lista = estado.docentes;
        if (!lista) return '<div class="pc-agregar">Cargando docentes…</div>';
        var yaEstan = docentesDe(info).map(function (d) { return String(d.email || '').toLowerCase(); });
        var libres = lista.filter(function (u) { return yaEstan.indexOf(u.email) === -1; });
        if (!libres.length) return '<div class="pc-agregar">No hay más docentes activos para agregar. <button type="button" class="btn-deshacer" onclick="Planificacion.cancelarAgregarDocente()">Cerrar</button></div>';
        var opts = libres.map(function (u) { return '<option value="' + e(u.email) + '">' + e(u.nombre) + (u.recibeAvisos ? '' : ' (no es Gestor: no recibe avisos)') + '</option>'; }).join('');
        return '<div class="pc-agregar"><select id="pc-sel-docente" class="pc-select"><option value="">Elegí un docente…</option>' + opts + '</select>'
            + '<button type="button" class="btn-app btn-primary btn-sm" onclick="Planificacion.agregarDocente()">Agregar</button>'
            + '<button type="button" class="btn-app btn-secondary btn-sm" onclick="Planificacion.cancelarAgregarDocente()">Cancelar</button></div>';
    }

    async function mostrarAgregarDocente() {
        estado.agregandoDocente = true;
        renderizarDocentesEvento();
        await cargarDocentes();
        renderizarDocentesEvento();
    }
    function cancelarAgregarDocente() { estado.agregandoDocente = false; renderizarDocentesEvento(); }

    async function guardarDocentesEvento(fId, lista) {
        var info = infos()[fId];
        if (!info) return false;
        info.docentesAsignados = lista;
        renderizarDocentesEvento();
        if (esModoPrueba()) {
            console.info('[Planificación · prueba] Docentes de ' + fId + ' guardados solo en memoria.', lista);
            try { window.dispatchEvent(new CustomEvent('mandala:festival-guardado', { detail: { id: fId, campos: { docentesAsignados: lista } } })); } catch (err) {}
            return true;
        }
        var f = app().festivales;
        if (!f || typeof f.actualizarCampos !== 'function') return false;
        return await f.actualizarCampos(fId, { docentesAsignados: lista });
    }

    async function agregarDocente() {
        var sel = document.getElementById('pc-sel-docente');
        var email = sel ? sel.value : '';
        var fId = eventoActualId;
        if (!email || !infos()[fId]) { toast('Elegí un docente de la lista.', 'warning'); return; }
        var u = (estado.docentes || []).find(function (x) { return x.email === email; });
        if (!u) return;
        var calId = '';
        try { calId = await app().calendario.calendarioDocente(u); } catch (err) { calId = u.correo_calendario || ''; }
        var lista = docentesDe(infos()[fId]).slice();
        lista.push({ email: u.email, nombre: u.nombre, profesorId: u.profesor_id || '', calendarioId: calId || '', recibeAvisos: !!u.recibeAvisos });
        estado.agregandoDocente = false;
        var ok = await guardarDocentesEvento(fId, lista);
        if (ok) toast(u.nombre + ' quedó asignado al evento.' + (u.recibeAvisos ? '' : ' No recibe avisos porque no es Gestor de Festivales.'), 'success');
    }

    async function quitarDocente(email) {
        var fId = eventoActualId;
        var info = infos()[fId];
        if (!info) return;
        var lista = docentesDe(info).filter(function (d) { return String(d.email || '').toLowerCase() !== String(email || '').toLowerCase(); });
        var ok = await guardarDocentesEvento(fId, lista);
        if (ok) toast('Se quitó el docente del evento.', 'info');
    }

    // ------------------------------------------------------------------ Mis avisos
    function renderizarMisAvisos() {
        var panel = document.getElementById('panel-mis-avisos');
        if (!panel || panel.style.display === 'none') return;
        var pend = misPendientes();
        var yo = miEmail();
        var html = '<div class="content-card"><div class="card-header-flex"><div><h3 class="card-title">Mis avisos</h3><span style="font-size:12px; color:var(--text-muted);">Clases de tu agenda que caen el mismo día de un evento al que estás asignado.</span></div><div class="sec-chips">'
            + '<span class="sec-chip">' + pend.length + ' pendiente' + (pend.length === 1 ? '' : 's') + '</span>'
            + '<button type="button" class="btn-app btn-secondary btn-sm" onclick="Planificacion.revisarMisEventos()"' + (estado.revisandoTodo ? ' disabled' : '') + '>' + (estado.revisandoTodo ? 'Revisando…' : '↻ Volver a revisar') + '</button></div></div>';
        var hayAlgo = false;
        eventosQueCuentan().forEach(function (info) {
            var d = docentesDe(info).find(function (x) { return String(x.email || '').toLowerCase() === yo && x.recibeAvisos !== false; });
            if (!d) return;
            hayAlgo = true;
            var iso = isoDeEvento(info);
            var est = estadoDocente(info.id, d);
            html += '<div class="pc-ev">' + htmlCabeceraEvento(info, iso, est.pendientes, false) + '<div class="pc-ev-cuerpo">';
            if (est.tipo !== 'ok') html += '<div class="pc-vacio">' + htmlEstadoDocentePill(info.id, d) + '</div>';
            else if (!est.clases.length) html += '<div class="pc-vacio">Sin clases ese día.</div>';
            else est.clases.forEach(function (c) { html += htmlFilaClase(info.id, c); });
            html += '</div></div>';
        });
        if (!hayAlgo) html += '<div class="pc-vacio">No estás asignado a ningún evento programado o en curso.</div>';
        html += '</div>';
        panel.innerHTML = html;
    }

    async function revisarMisEventos() {
        var yo = miEmail();
        var lista = eventosQueCuentan().filter(function (info) { return docentesDe(info).some(function (d) { return String(d.email || '').toLowerCase() === yo; }); });
        estado.revisandoTodo = true; refrescarTodo();
        try { for (var i = 0; i < lista.length; i++) await revisarEvento(lista[i].id, { silencioso: true }); }
        finally { estado.revisandoTodo = false; refrescarTodo(); }
        toast('Se volvió a revisar tu agenda.', 'info');
    }

    // ------------------------------------------------------------------ Planificación (Admin y Planificador)
    function renderizarPanel() {
        var panel = document.getElementById('panel-planificacion');
        if (!panel || panel.style.display === 'none') return;
        var F = estado.filtros;
        var yo = miEmail();
        var soyDocente = soyDocenteAsignado();
        if (!soyDocente) F.ver = 'todos';
        var filas = filasPorEventoYDocente();
        if (F.evento && !filas.some(function (f) { return f.info.id === F.evento; })) F.evento = '';

        // Resumen
        var evConDocentes = filas.filter(function (f) { return f.docentes.length; }).length;
        var afectados = {}, pendientes = 0;
        filas.forEach(function (f) { f.docentes.forEach(function (x) { if (x.est.pendientes) { afectados[x.docente.email] = 1; pendientes += x.est.pendientes; } }); });

        var html = '<div class="content-card"><div class="card-header-flex pc-cab"><div><h3 class="card-title">Planificación de clases</h3><span style="font-size:12px; color:var(--text-muted);">Clases de docentes que caen el día de un evento Programado o En Curso.</span></div><div class="pc-filtros">';
        if (soyDocente) html += '<select class="pc-select" onchange="Planificacion.filtrar(\'ver\', this.value)"><option value="todos"' + (F.ver === 'todos' ? ' selected' : '') + '>Todos los docentes</option><option value="mias"' + (F.ver === 'mias' ? ' selected' : '') + '>Solo mis clases</option></select>';
        html += '<select class="pc-select" onchange="Planificacion.filtrar(\'estado\', this.value)"><option value="pendientes"' + (F.estado === 'pendientes' ? ' selected' : '') + '>Pendientes</option><option value="todas"' + (F.estado === 'todas' ? ' selected' : '') + '>Todas</option></select>';
        html += '<select class="pc-select" onchange="Planificacion.filtrar(\'evento\', this.value)"><option value="">Todos los eventos</option>' + filas.map(function (f) { return '<option value="' + e(f.info.id) + '"' + (F.evento === f.info.id ? ' selected' : '') + '>' + e(f.info.nombre) + ' · ' + e(fechaCorta(f.iso)) + '</option>'; }).join('') + '</select>';
        html += '<button type="button" class="btn-app btn-secondary btn-sm" onclick="Planificacion.revisarTodos()"' + (estado.revisandoTodo ? ' disabled' : '') + '>' + (estado.revisandoTodo ? 'Revisando…' : '↻ Volver a revisar') + '</button>';
        html += '</div></div>';
        if (esModoPrueba()) html += '<div class="pc-prueba">Modo prueba: los cambios de esta pantalla no se guardan en la base.</div>';

        // Resumen en una línea
        html += '<div class="pc-resumen"><span><strong>' + filas.length + '</strong> evento' + (filas.length === 1 ? '' : 's') + ' próximo' + (filas.length === 1 ? '' : 's') + ' <span class="pc-gris">(' + evConDocentes + ' con docentes)</span></span>'
            + '<span><strong>' + Object.keys(afectados).length + '</strong> docente' + (Object.keys(afectados).length === 1 ? '' : 's') + ' afectado' + (Object.keys(afectados).length === 1 ? '' : 's') + '</span>'
            + '<span' + (pendientes ? ' class="pc-rojo"' : '') + '><strong>' + pendientes + '</strong> clase' + (pendientes === 1 ? '' : 's') + ' pendiente' + (pendientes === 1 ? '' : 's') + '</span></div>';

        // Una tarjeta por evento; dentro, cada docente es un sub-encabezado liviano con sus clases debajo
        var cuerpo = '';
        filas.forEach(function (f) {
            if (F.evento && f.info.id !== F.evento) return;
            var docs = f.docentes.filter(function (x) { return F.ver !== 'mias' || String(x.docente.email || '').toLowerCase() === yo; });
            if (F.estado === 'pendientes') docs = docs.filter(function (x) { return x.est.pendientes || x.est.tipo === 'error' || x.est.tipo === 'sin_calendario' || x.est.tipo === 'sin_revisar' || x.est.tipo === 'revisando'; });
            if (F.estado === 'pendientes' && !docs.length) return;
            var pendEv = docs.reduce(function (n, x) { return n + x.est.pendientes; }, 0);
            cuerpo += '<div class="pc-ev">' + htmlCabeceraEvento(f.info, f.iso, pendEv, true) + '<div class="pc-ev-cuerpo">';
            if (!docs.length) cuerpo += '<div class="pc-vacio">' + (f.docentes.length ? 'Sin clases para mostrar.' : 'Sin docentes asignados.') + '</div>';
            docs.forEach(function (x) {
                var est = x.est;
                var clases = est.clases.filter(function (c) { return F.estado === 'todas' || !c.res; });
                var detalle;
                if (est.tipo !== 'ok') detalle = htmlEstadoDocentePill(f.info.id, x.docente);
                else if (!est.clases.length) detalle = '<span class="pc-gris">· sin clases ese día</span>';
                else if (!est.pendientes) detalle = '<span class="pc-pill pc-ok">sin pendientes</span>';
                else detalle = '<span class="pc-gris">· ' + est.pendientes + ' clase' + (est.pendientes === 1 ? '' : 's') + ' pendiente' + (est.pendientes === 1 ? '' : 's') + '</span>';
                cuerpo += '<div class="pc-doc"><div class="pc-doc-h"><span class="pc-avatar">' + e(iniciales(x.docente.nombre || x.docente.email)) + '</span><span class="pc-doc-n">' + e(x.docente.nombre || x.docente.email) + '</span>' + detalle + '</div>';
                clases.forEach(function (c) { cuerpo += htmlFilaClase(f.info.id, c); });
                cuerpo += '</div>';
            });
            cuerpo += '</div></div>';
        });
        if (!cuerpo) cuerpo = '<div class="pc-vacio pc-vacio-centro">' + (filas.length ? (F.estado === 'pendientes' ? 'No hay clases pendientes. ✔' : 'No hay clases en conflicto.') : 'No hay eventos programados ni en curso.') + '</div>';
        html += cuerpo;

        var ultima = estado.datos[(svc().ID_CONTROL || '_control')];
        if (ultima && ultima.ultimaRevisionDiaria) html += '<div class="pc-pie">Última revisión completa: ' + e(fechaCorta(ultima.ultimaRevisionDiaria)) + (ultima.en ? ' ' + e(hora(ultima.en)) : '') + '. Se vuelve a revisar sola una vez por día y cada vez que se guarda un evento con cambios de fecha, estado o docentes.</div>';
        html += '</div>';
        panel.innerHTML = html;
    }

    function filtrar(campo, valor) { estado.filtros[campo] = valor; renderizarPanel(); }
    function abrirEvento(fId) { if (typeof abrirDetalleEvento === 'function' && infos()[fId]) abrirDetalleEvento(fId); }

    // ------------------------------------------------------------------ popup del docente
    function claveLocalPausa() { return 'mandala_festival_avisos_pausa_' + claveEmail(miEmail()); }
    function pausaHasta() {
        var hasta = 0;
        try { hasta = Number(localStorage.getItem(claveLocalPausa())) || 0; } catch (err) {}
        var p = usuario().avisos_festival_pospuestos;
        if (p && p.hasta) { var t = new Date(p.hasta).getTime(); if (t > hasta) hasta = t; }
        return hasta;
    }
    function misPendientesPopup() {
        return misPendientes().filter(function (x) { var n = diasHasta(x.iso); return n >= 0 && n <= DIAS_POPUP; });
    }
    function evaluarPopup() {
        if (estado.popupMostrado || modoPlanificador() || window.modoSonidista) return;
        if (Date.now() < pausaHasta()) return;
        if (!misPendientesPopup().length) return;
        estado.popupMostrado = true;
        renderizarPopup();
        var m = document.getElementById('modal-avisos-clases');
        if (m) m.classList.add('active');
    }
    function renderizarPopup() {
        var lista = misPendientesPopup();
        var cuerpo = document.getElementById('avisos-clases-cuerpo');
        var tit = document.getElementById('avisos-clases-titulo');
        var sub = document.getElementById('avisos-clases-subtitulo');
        if (!cuerpo) return;
        var porEvento = {};
        lista.forEach(function (x) { (porEvento[x.info.id] = porEvento[x.info.id] || []).push(x); });
        var ids = Object.keys(porEvento);
        if (tit) tit.textContent = 'Tenés ' + lista.length + ' clase' + (lista.length === 1 ? '' : 's') + ' el día de ' + (ids.length === 1 ? 'un evento' : ids.length + ' eventos');
        if (sub) sub.textContent = ids.length === 1 ? String(porEvento[ids[0]][0].info.nombre || '').toUpperCase() + ' · ' + fechaLarga(porEvento[ids[0]][0].iso) + ' (día completo)' : 'Revisá y marcá qué pasa con cada una.';
        var html = '';
        ids.forEach(function (id) {
            var g = porEvento[id];
            if (ids.length > 1) {
                html += '<div class="pc-ev">' + htmlCabeceraEvento(g[0].info, g[0].iso, g.length, false) + '<div class="pc-ev-cuerpo">';
                g.forEach(function (x) { html += htmlFilaClase(id, x.clase); });
                html += '</div></div>';
            } else {
                html += '<div class="pc-popup-lista">';
                g.forEach(function (x) { html += htmlFilaClase(id, x.clase); });
                html += '</div>';
            }
        });
        cuerpo.innerHTML = html;
    }
    function cerrarPopup() {
        var m = document.getElementById('modal-avisos-clases');
        if (m) m.classList.remove('active');
    }
    async function posponer(tipo) {
        var hasta;
        if (tipo === '2h') hasta = new Date(Date.now() + 2 * 3600 * 1000);
        else { var d = new Date(); d.setDate(d.getDate() + 1); d.setHours(0, 0, 0, 0); hasta = d; }
        try { localStorage.setItem(claveLocalPausa(), String(hasta.getTime())); } catch (err) {}
        var valor = { hasta: hasta.toISOString(), tipo: tipo, en: new Date().toISOString() };
        if (window.usuarioActual) window.usuarioActual.avisos_festival_pospuestos = valor;
        cerrarPopup();
        toast(tipo === '2h' ? 'Te lo vuelvo a recordar en 2 horas.' : 'Te lo vuelvo a recordar mañana.', 'info');
        if (typeof svc().guardarPospuestos === 'function' && usuario().id) await svc().guardarPospuestos(usuario().id, valor);
        // Si la app queda abierta, el aviso vuelve a salir al terminar la pausa
        var espera = hasta.getTime() - Date.now();
        if (espera > 0 && espera < 6 * 3600 * 1000) setTimeout(function () { estado.popupMostrado = false; evaluarPopup(); }, espera + 1000);
    }
    function atenderAhora() {
        cerrarPopup();
        if (typeof navegarPanel === 'function') navegarPanel('mis-avisos');
    }

    // ------------------------------------------------------------------ menú y selector de vista
    function actualizarMenu() {
        var navMis = document.querySelector('#sidebar .nav-mis-avisos');
        var badgeMis = document.getElementById('badge-mis-avisos');
        var mostrarMis = !modoPlanificador() && !window.modoSonidista && soyDocenteAsignado();
        if (navMis) navMis.style.display = mostrarMis ? '' : 'none';
        var nMis = mostrarMis ? misPendientes().length : 0;
        if (badgeMis) { badgeMis.textContent = String(nMis); badgeMis.style.display = nMis ? '' : 'none'; }
        var badgePl = document.getElementById('badge-planificacion');
        var nPl = vePlanificacion() ? totalPendientes() : 0;
        if (badgePl) { badgePl.textContent = String(nPl); badgePl.style.display = nPl ? '' : 'none'; }
    }

    function renderizarSelectorVistaRol() {
        var cont = document.getElementById('popover-vista-rol');
        var v = window.vistaRol;
        if (!cont) return;
        if (!v || !v.varios) { cont.style.display = 'none'; cont.innerHTML = ''; return; }
        var etiquetas = {
            multi: '🌐 Vista Global Multi-Rol',
            gestion: v.esAdmin ? '👑 Administrador' : '☆ Gestor de Festivales',
            planificador: '📅 Planificador de clases'
        };
        var n = v.opciones.filter(function (o) { return o !== 'multi'; }).length;
        cont.className = 'role-switch-section';
        cont.style.display = 'flex';
        cont.innerHTML = '<div class="role-switch-header"><span>Ver plataforma como:</span><span style="color:var(--teal); font-weight:800;">' + n + ' ROLES</span></div>'
            + '<div class="role-options-grid">' + v.opciones.map(function (o) {
                return '<div class="role-option-item' + (v.elegida === o ? ' selected' : '') + '" onclick="cambiarVistaRol(\'' + o + '\')"><span>' + etiquetas[o] + '</span></div>';
            }).join('') + '</div>';
    }
    window.renderizarSelectorVistaRol = renderizarSelectorVistaRol;

    function refrescarTodo() {
        try { actualizarMenu(); } catch (err) { console.warn('[Planificación] menú:', err); }
        try { renderizarPanel(); } catch (err) { console.warn('[Planificación] panel:', err); }
        try { renderizarMisAvisos(); } catch (err) { console.warn('[Planificación] mis avisos:', err); }
        try {
            var tabInfo = document.getElementById('tab-ev-info');
            var detalle = document.getElementById('panel-evento-detalle');
            if (detalle && detalle.style.display === 'block' && tabInfo && tabInfo.style.display !== 'none') renderizarDocentesEvento();
        } catch (err) { console.warn('[Planificación] docentes del evento:', err); }
    }

    // ------------------------------------------------------------------ entradas desde app.js
    function alRecibirDatos(mapa) {
        estado.datos = mapa || {};
        estado.datosRecibidos = true;
        refrescarTodo();
        arranqueDelDia();
    }
    function alCargarEventos() {
        estado.eventosCargados = true;
        refrescarTodo();
        arranqueDelDia();
    }

    window.Planificacion = {
        alRecibirDatos: alRecibirDatos,
        alCargarEventos: alCargarEventos,
        renderizarPanel: renderizarPanel,
        renderizarMisAvisos: renderizarMisAvisos,
        renderizarDocentesEvento: renderizarDocentesEvento,
        revisarEvento: function (fId) { return revisarEvento(fId, {}); },
        revisarTodos: function () { return revisarTodos({}); },
        revisarMisEventos: revisarMisEventos,
        resolver: resolver,
        abrirMenu: abrirMenu,
        filtrar: filtrar,
        abrirEvento: abrirEvento,
        mostrarAgregarDocente: mostrarAgregarDocente,
        cancelarAgregarDocente: cancelarAgregarDocente,
        agregarDocente: agregarDocente,
        quitarDocente: quitarDocente,
        cerrarPopup: cerrarPopup,
        posponer: posponer,
        atenderAhora: atenderAhora,
        // Para pruebas desde la consola
        _estado: estado,
        _evaluarPopup: function () { estado.popupMostrado = false; evaluarPopup(); }
    };
})();
