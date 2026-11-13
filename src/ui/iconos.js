// =======================================================================
// src/ui/iconos.js — Íconos de línea en lugar de emojis (script clásico, se carga en <head>)
// Reemplaza en pantalla los emojis de la interfaz por SVG de trazo fino (mismo estilo del menú lateral).
// No toca: textareas (mensajes de WhatsApp), inputs/selects, scripts, el rider (emojis de instrumentos)
// ni los textos que se envían. Funciona también con lo que se dibuja después (modales, listas, avisos).
// =======================================================================
(function () {
    'use strict';

    var P = {
        check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
        checkc: '<circle cx="12" cy="12" r="9"/><path d="M8 12.5l3 3 5-6"/>',
        xc: '<circle cx="12" cy="12" r="9"/><path d="M9 9l6 6M15 9l-6 6"/>',
        alerta: '<path d="M12 3.5 2.8 19.5h18.4z"/><path d="M12 10v4.5M12 17.4v.1"/>',
        info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 7.8v.1"/>',
        ayuda: '<circle cx="12" cy="12" r="9"/><path d="M9.6 9.6a2.5 2.5 0 1 1 3.6 2.2c-.8.4-1.2 1-1.2 1.8M12 17v.1"/>',
        papelera: '<path d="M4 7h16M9 7V4.5h6V7M6.5 7l1 13h9l1-13M10 11v6M14 11v6"/>',
        guardar: '<path d="M5 4h11l3 3v13H5z"/><path d="M8 4v5h7V4M8 20v-6h8v6"/>',
        copiar: '<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2"/>',
        lapiz: '<path d="M4 20l1-4L16.5 4.5a2 2 0 0 1 3 3L8 19z"/><path d="M14 7l3 3"/>',
        actualizar: '<path d="M20 11a8 8 0 0 0-14-4L4 9M4 5v4h4M4 13a8 8 0 0 0 14 4l2-2M20 19v-4h-4"/>',
        mas: '<path d="M12 5v14M5 12h14"/>',
        lupa: '<circle cx="11" cy="11" r="6.5"/><path d="M16 16l4.5 4.5"/>',
        impresora: '<path d="M7 9V4h10v5M7 17H4.5V9h15v8H17M7 14h10v6H7z"/>',
        expandir: '<path d="M6 9l6 6 6-6"/>',
        colapsar: '<path d="M6 15l6-6 6 6"/>',
        subir: '<path d="M12 16V4M7 9l5-5 5 5M5 20h14"/>',
        bajar: '<path d="M12 4v12M7 11l5 5 5-5M5 20h14"/>',
        archivo: '<path d="M6 3h8l4 4v14H6z"/><path d="M14 3v4h4M9 13h6M9 17h6"/>',
        carpeta: '<path d="M3.5 6.5h6l2 2.5h9v9.5h-17z"/>',
        grafico: '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>',
        candado: '<rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>',
        llave: '<circle cx="8" cy="15" r="4"/><path d="M11 12l8-8M16 7l3 3"/>',
        salir: '<path d="M10 4H5v16h5M15 8l4 4-4 4M19 12H9"/>',
        ojo: '<path d="M2 12s3.5-6.5 10-6.5S22 12 22 12s-3.5 6.5-10 6.5S2 12 2 12z"/><circle cx="12" cy="12" r="2.8"/>',
        calendario: '<rect x="4" y="5.5" width="16" height="14.5" rx="2"/><path d="M4 10h16M8.5 3.5v4M15.5 3.5v4"/>',
        pin: '<path d="M12 21s6.5-5.7 6.5-11A6.5 6.5 0 0 0 5.5 10c0 5.3 6.5 11 6.5 11z"/><circle cx="12" cy="10" r="2.3"/>',
        camara: '<rect x="3" y="7" width="13" height="10" rx="2"/><path d="M16 11l5-3v8l-5-3z"/>',
        link: '<path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/>',
        entrada: '<path d="M4 9a2 2 0 0 0 0 4v4h16v-4a2 2 0 0 1 0-4V7H4z"/><path d="M14 8v8" stroke-dasharray="1.5 2"/>',
        billete: '<rect x="3" y="6.5" width="18" height="11" rx="2"/><circle cx="12" cy="12" r="2.5"/>',
        recibo: '<path d="M6 3h12v18l-3-2-3 2-3-2-3 2z"/><path d="M9 8h6M9 12h6"/>',
        persona: '<circle cx="12" cy="8" r="3.5"/><path d="M5 20a7 7 0 0 1 14 0"/>',
        grupo: '<circle cx="9" cy="8.5" r="3"/><path d="M3 19a6 6 0 0 1 12 0"/><path d="M16 5.8a3 3 0 0 1 0 5.4M18 14a6 6 0 0 1 3 5"/>',
        carpa: '<path d="M3 20L12 4l9 16z"/><path d="M12 4v16M8 20l4-9 4 9"/>',
        estrella: '<path d="M12 3.5l2.6 5.4 5.9.8-4.3 4.1 1 5.8L12 16.8 6.8 19.6l1-5.8L3.5 9.7l5.9-.8z"/>',
        chat: '<path d="M4 5h16v11H9l-5 4z"/>',
        telefono: '<path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a1 1 0 0 1-1 1A15 15 0 0 1 4 5a1 1 0 0 1 1-1z"/>',
        corona: '<path d="M4 17l-1-9 5 4 4-7 4 7 5-4-1 9z"/><path d="M4 20h16"/>',
        musica: '<path d="M9 18V6l10-2v12"/><circle cx="6.5" cy="18" r="2.5"/><circle cx="16.5" cy="16" r="2.5"/>',
        bloquear: '<circle cx="12" cy="12" r="9"/><path d="M5.6 5.6l12.8 12.8"/>',
        herramienta: '<path d="M14.5 6.5a4 4 0 0 0 4.5 5L9 21l-4-4 10-10z"/>',
        reloj: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
        escuela: '<path d="M2.5 9L12 4l9.5 5L12 14z"/><path d="M6 11.5V16c0 1.5 2.7 3 6 3s6-1.5 6-3v-4.5"/>',
        idea: '<path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-3.5 10.9c.6.5 1 1.2 1 2.1h5c0-.9.4-1.6 1-2.1A6 6 0 0 0 12 3z"/>',
        nota: '<path d="M5 3h10l4 4v14H5z"/><path d="M15 3v4h4M8 12h8M8 16h5"/>',
        engranaje: '<circle cx="12" cy="12" r="3"/><path d="M12 3v2.5M12 18.5V21M3 12h2.5M18.5 12H21M5.6 5.6l1.8 1.8M16.6 16.6l1.8 1.8M18.4 5.6l-1.8 1.8M7.4 16.6l-1.8 1.8"/>',
        cuadro: '<rect x="5" y="5" width="14" height="14" rx="2.5"/>',
        guitarra: '<path d="M10.5 1.8h3v3h-3zM11 4.8v6.2M13 4.8v6.2"/><path d="M12 10c-2.1 0-3.1 1.3-3.1 2.7 0 1 .6 1.6.6 2.3-.9.7-1.9 1.6-1.9 3.1 0 2 2 3.4 4.4 3.4s4.4-1.4 4.4-3.4c0-1.5-1-2.4-1.9-3.1 0-.7.6-1.3.6-2.3C15.1 11.3 14.1 10 12 10z"/><circle cx="12" cy="15.2" r="1.3"/><path d="M10.5 19.6h3"/>',
        bajo: '<path d="M10 1.5h4v3.2h-4zM11 4.7v8M13 4.7v8"/><path d="M8.3 12.6c-.4-1.4.6-2.2 1.7-2.2h4c1.1 0 2.1.8 1.7 2.2-.3 1.1-.9 1.5-.9 2.4 0 .9.9 1.6 1.1 2.7.4 2.2-1.3 4.2-3.9 4.2s-4.3-2-3.9-4.2c.2-1.1 1.1-1.8 1.1-2.7 0-.9-.6-1.3-.9-2.4z"/><path d="M10.2 15h3.6M10.2 17.2h3.6M10.5 20h3"/>',
        bateria: '<ellipse cx="12" cy="13" rx="7" ry="2.5"/><path d="M5 13v4.5c0 1.4 3.1 2.5 7 2.5s7-1.1 7-2.5V13M3.5 4.5l6 6M20.5 4.5l-6 6"/>',
        teclado: '<rect x="3" y="6.5" width="18" height="11.5" rx="2"/><path d="M8 18v-5.5M12 18v-5.5M16 18v-5.5M3 12.5h18"/>',
        voz: '<rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21M8.5 21h7"/>',
        trompeta: '<path d="M3 11h9M3 14h9M3 11v3M12 8.5L20.5 5v14L12 15.5z"/><path d="M7 14v3M10 14v3"/>',
        violin: '<path d="M12 2.5v6.5"/><path d="M9.5 9c-1.8 0-2.8 1.8-1.8 3.2-1.8 1.2-1.8 4.3.2 5.8 1.2.9 2.5 1.5 4.1 1.5s2.9-.6 4.1-1.5c2-1.5 2-4.6.2-5.8 1-1.4 0-3.2-1.8-3.2-.9 0-1.4.5-2.5.5S10.4 9 9.5 9z"/><path d="M12 13v5M10 20.5h4"/>',
        saxo: '<path d="M4.5 3.2l3.8 1.2c1.3.4 2 1.2 2 2.7V16c0 2.3 1.6 4 3.8 4s3.8-1.7 3.8-4v-4.5"/><path d="M15.3 9.5h5.4l-1 3.2h-3.4z"/>',
        percusion: '<ellipse cx="12" cy="6" rx="6.5" ry="2.2"/><path d="M5.5 6l2 12.5c.2 1.2 2.2 2 4.5 2s4.3-.8 4.5-2L18.5 6M7 11.5h10"/>',
        flauta: '<rect x="1.5" y="10" width="21" height="4" rx="2" transform="rotate(-35 12 12)"/><path d="M8.8 14.5h.01M11.8 12.4h.01M14.8 10.3h.01"/>',
        ukelele: '<path d="M14 10.5L20.5 4M18.5 2.5l3 3"/><path d="M11 8.5c-2-.5-3.5.9-3.2 2.6-2.1.3-3.7 2.1-3.5 4.2.3 2.3 2.5 3.9 4.8 3.6 2-.3 3.4-1.7 3.7-3.5 1.6-.4 2.5-1.8 2-3.3"/><circle cx="8.5" cy="14.5" r="1" fill="currentColor"/>',
        linea: '<path d="M9 3v5M15 3v5M7 8h10v3a5 5 0 0 1-10 0zM12 16v5"/>',
        etiqueta: '<path d="M3.5 12V4.5h7.5L20 13.5 13.5 20z"/><circle cx="8" cy="9" r="1.2"/>',
        megafono: '<path d="M4 10v4h3l8 4V6L7 10z"/><path d="M18.5 9.5a4 4 0 0 1 0 5"/>'
    };

    // emoji (sin selector de variación) -> nombre de ícono. "punto:#color" dibuja un círculo de color.
    var MAPA = {
        '✅': 'checkc', '✔': 'check', '☑': 'check', '⬜': 'cuadro', '❌': 'xc', '✖': 'xc', '⚠': 'alerta', '🚨': 'alerta', 'ℹ': 'info', '❓': 'ayuda',
        '🗑': 'papelera', '💾': 'guardar', '📋': 'copiar', '✏': 'lapiz', '🔄': 'actualizar', '♻': 'actualizar', '➕': 'mas',
        '🔍': 'lupa', '🖨': 'impresora', '🔽': 'expandir', '🔼': 'colapsar', '📥': 'bajar', '📤': 'subir', '🚀': 'subir',
        '📄': 'archivo', '📁': 'carpeta', '📦': 'carpeta', '📊': 'grafico', '📈': 'grafico', '🔒': 'candado', '🔑': 'llave',
        '🚪': 'salir', '👁': 'ojo', '📅': 'calendario', '🗓': 'calendario', '📍': 'pin', '🎬': 'camara', '🎥': 'camara',
        '🔗': 'link', '🎟': 'entrada', '🎫': 'entrada', '💵': 'billete', '💰': 'billete', '💸': 'billete', '💳': 'billete', '🏦': 'billete',
        '🧾': 'recibo', '👤': 'persona', '👥': 'grupo', '🎓': 'escuela', '🏫': 'escuela', '🎪': 'carpa', '⭐': 'estrella',
        '💬': 'chat', '📞': 'telefono', '🌟': 'corona', '🎵': 'musica', '🎶': 'musica', '🚫': 'bloquear', '🛠': 'herramienta',
        '⏳': 'reloj', '🏷': 'etiqueta', '📢': 'megafono', '📱': 'telefono', '📹': 'camara', '💡': 'idea', '📝': 'nota', '📜': 'archivo', '⚙': 'engranaje',
        '🟢': 'punto:#1f7a4d', '🟡': 'punto:#a15c00', '🔵': 'punto:#1f5491', '⚪': 'punto:#8a9097', '🔴': 'punto:#b2402b', '🟠': 'punto:#c2570c'
    };
    // Emojis que solo se quitan (decoración sin significado propio)
    var QUITAR = { '🎉': 1, '✨': 1, '🧩': 1, '🤝': 1 };
    // Emojis de instrumentos y de opciones de listas: se quitan solo dentro de <option> (los selects no admiten íconos)
    var EN_OPCIONES = { '🎸': 1, '🎷': 1, '🎤': 1, '🥁': 1, '🎹': 1, '🎺': 1, '🎻': 1, '🪕': 1, '🪘': 1, '🪈': 1, '🔌': 1 };

    var RE = /(?:[℀-⅏☀-➿⬀-⯿←-⇿⌀-⏿]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|\uD83E[\uDC00-\uDFFF])️?/g;
    var SALTAR = { SCRIPT: 1, STYLE: 1, TEXTAREA: 1, TITLE: 1, INPUT: 1, NOSCRIPT: 1, SVG: 1, svg: 1 };

    function svg(nombre) {
        var color = '';
        if (nombre.indexOf('punto:') === 0) {
            color = nombre.slice(6);
            return '<svg class="ico-e" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="6" fill="' + color + '" stroke="none"/></svg>';
        }
        return '<svg class="ico-e" viewBox="0 0 24 24" aria-hidden="true" style="vertical-align:-0.18em">' + P[nombre] + '</svg>';
    }
    function limpio(e) { return e.replace(/️/g, ''); }
    function saltarNodo(el) {
        if (!el) return true;
        if (SALTAR[el.nodeName]) return true;
        if (el.closest && el.closest('textarea,[data-sin-iconos],.print-inst-emoji,.col-inst-emoji,.print-musico-val,.rider-inst-emoji,.sin-iconos')) return true;
        return false;
    }

    function procesarTexto(nodo) {
        var padre = nodo.parentNode;
        var txt = nodo.nodeValue;
        if (!txt || !RE.test(txt)) { RE.lastIndex = 0; return; }
        RE.lastIndex = 0;
        var enOpcion = padre && padre.nodeName === 'OPTION';
        if (!enOpcion && saltarNodo(padre)) return;
        var out = [], ult = 0, m, huboCambio = false;
        while ((m = RE.exec(txt))) {
            var e = limpio(m[0]);
            var nombre = MAPA[e];
            var quitar = QUITAR[e] || (enOpcion && (nombre || EN_OPCIONES[e]));
            if (!nombre && !quitar) continue;
            out.push({ t: txt.slice(ult, m.index) });
            var fin = m.index + m[0].length;
            if (quitar) {
                if (txt.charAt(fin) === ' ') fin++;
            } else {
                out.push({ s: nombre });
            }
            ult = fin;
            RE.lastIndex = fin;
            huboCambio = true;
        }
        RE.lastIndex = 0;
        if (!huboCambio) return;
        out.push({ t: txt.slice(ult) });
        if (enOpcion) { nodo.nodeValue = out.map(function (x) { return x.t || ''; }).join(''); return; }
        var frag = document.createDocumentFragment();
        out.forEach(function (x) {
            if (x.s) { var sp = document.createElement('span'); sp.className = 'ico-e-w'; sp.innerHTML = svg(x.s); frag.appendChild(sp); }
            else if (x.t) frag.appendChild(document.createTextNode(x.t));
        });
        padre.replaceChild(frag, nodo);
    }

    function limpiarAtributos(el) {
        ['title', 'placeholder', 'aria-label'].forEach(function (a) {
            var v = el.getAttribute && el.getAttribute(a);
            if (!v || !RE.test(v)) { RE.lastIndex = 0; return; }
            RE.lastIndex = 0;
            var nv = v.replace(RE, function (x) { var e = limpio(x); return (MAPA[e] || QUITAR[e]) ? '' : x; }).replace(/^\s+/, '').replace(/\s{2,}/g, ' ');
            if (nv !== v) el.setAttribute(a, nv);
        });
    }

    // Controles de solo ícono: siempre con title y aria-label (la definición de controles chicos lo exige)
    var TITULOS = { '.btn-row-del': 'Quitar', '.btn-close-modal': 'Cerrar', '.mandala-toast-close': 'Cerrar', '.btn-icon-dots': 'Opciones', '.btn-del-col': 'Quitar columna' };
    function completarTitulos(raiz) {
        if (!raiz || !raiz.querySelectorAll) return;
        Object.keys(TITULOS).forEach(function (sel) {
            var lista = raiz.querySelectorAll(sel + ':not([title])');
            for (var i = 0; i < lista.length; i++) lista[i].setAttribute('title', TITULOS[sel]);
            if (raiz.matches && raiz.matches(sel) && !raiz.getAttribute('title')) raiz.setAttribute('title', TITULOS[sel]);
            var sinAria = raiz.querySelectorAll(sel + ':not([aria-label])');
            for (var j = 0; j < sinAria.length; j++) sinAria[j].setAttribute('aria-label', sinAria[j].getAttribute('title') || TITULOS[sel]);
        });
    }

    function procesar(raiz) {
        if (!raiz) return;
        if (raiz.nodeType === 1) completarTitulos(raiz);
        if (raiz.nodeType === 3) { procesarTexto(raiz); return; }
        if (raiz.nodeType !== 1 || SALTAR[raiz.nodeName]) return;
        var w = document.createTreeWalker(raiz, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT, {
            acceptNode: function (n) {
                if (n.nodeType === 1) return SALTAR[n.nodeName] ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_SKIP;
                return NodeFilter.FILTER_ACCEPT;
            }
        });
        var nodos = [], n;
        while ((n = w.nextNode())) nodos.push(n);
        nodos.forEach(procesarTexto);
        if (raiz.getAttribute) limpiarAtributos(raiz);
        if (raiz.querySelectorAll) raiz.querySelectorAll('[title],[placeholder]').forEach(limpiarAtributos);
    }

    var pendiente = false, cola = [];
    function programar(n) {
        cola.push(n);
        if (pendiente) return;
        pendiente = true;
        (window.queueMicrotask || function (f) { Promise.resolve().then(f); })(function () {
            pendiente = false;
            var l = cola; cola = [];
            l.forEach(function (x) { if (x.isConnected !== false) procesar(x); });
        });
    }

    var css = document.createElement('style');
    css.textContent = '.ico-e-w{display:inline-flex;vertical-align:-0.18em;line-height:1}.ico-e{width:1.1em;height:1.1em;stroke:currentColor;fill:none;stroke-width:1.9;stroke-linecap:round;stroke-linejoin:round;flex:none}';
    (document.head || document.documentElement).appendChild(css);

    new MutationObserver(function (muts) {
        muts.forEach(function (m) {
            if (m.type === 'characterData') programar(m.target);
            else if (m.type === 'attributes') limpiarAtributos(m.target);
            else m.addedNodes.forEach(function (n) { programar(n); });
        });
    }).observe(document.documentElement, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ['title', 'placeholder'] });

    document.addEventListener('DOMContentLoaded', function () { procesar(document.body); });
    window.IconosMandala = { procesar: procesar, svg: svg, mapa: MAPA };
})();
