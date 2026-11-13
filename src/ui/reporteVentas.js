// =======================================================================
// src/ui/reporteVentas.js — Reporte de ventas de un evento como IMAGEN (PNG), script clásico
// Muestra ventas comunes, ventas especiales y el ingreso neto de la escuela.
// NO incluye gastos ni cobertura. Usa html2canvas (se carga desde cdnjs en index.html).
// Usa el mismo cálculo que Finanzas (calcularTaquillaFestival) para que los números coincidan.
// =======================================================================
(function () {
    'use strict';

    function ars(n) {
        var v = Math.round(Number(n) || 0);
        return (v < 0 ? '- $ ' : '$ ') + Math.abs(v).toLocaleString('es-AR');
    }
    function esc(t) {
        return String(t == null ? '' : t).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; });
    }
    function limpiarNombreArchivo(t) {
        return String(t || 'evento').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-zA-Z0-9]+/g, '_').replace(/^_+|_+$/g, '');
    }

    var CSS = '' +
        '.rv{width:794px;box-sizing:border-box;background:#fff;color:#1c1f22;font-family:Inter,"Segoe UI",system-ui,sans-serif;font-size:13px;padding:40px 44px 34px}' +
        '.rv *{box-sizing:border-box}' +
        '.rv .cab{display:flex;justify-content:space-between;align-items:flex-end;border-bottom:3px solid #007b8f;padding-bottom:12px;margin-bottom:18px}' +
        '.rv .marca{font-size:21px;font-weight:800;color:#006173}.rv .sub{font-size:11.5px;color:#8a9097}.rv .der{text-align:right}.rv .tit{font-size:19px;font-weight:800}' +
        '.rv h2{margin:0 0 8px;font-size:24px}.rv .meta{display:flex;gap:8px;flex-wrap:wrap;margin-bottom:16px}' +
        '.rv .meta span{background:#faf8f3;border:1px solid #ece6dc;border-radius:99px;padding:3px 11px;font-size:12px;color:#4b5159}' +
        '.rv .kpis{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-bottom:6px}' +
        '.rv .kpi{border:1px solid #ece6dc;border-radius:10px;padding:12px 14px;background:#faf8f3}' +
        '.rv .kpi small{display:block;font-size:10.5px;font-weight:800;letter-spacing:.05em;text-transform:uppercase;color:#8a9097}' +
        '.rv .kpi b{display:block;font-size:23px;margin:5px 0 3px;font-family:"Geist Mono",ui-monospace,Consolas,monospace}' +
        '.rv .kpi em{font-style:normal;font-size:11px;color:#8a9097}' +
        '.rv .kpi.neto{background:#e8f4f6;border-color:#007b8f}.rv .kpi.neto b{color:#006173}' +
        '.rv h3{font-size:12.5px;margin:22px 0 8px;text-transform:uppercase;letter-spacing:.05em;color:#4b5159}' +
        '.rv table{width:100%;border-collapse:collapse}' +
        '.rv th{background:#faf8f3;color:#8a9097;font-size:10.5px;letter-spacing:.05em;text-transform:uppercase;text-align:left;padding:8px 10px;border-bottom:1px solid #ddd5c8}' +
        '.rv td{padding:8px 10px;border-bottom:1px solid #ece6dc}' +
        '.rv .r{text-align:right;font-family:"Geist Mono",ui-monospace,Consolas,monospace}.rv .c{text-align:center}' +
        '.rv tfoot td{font-weight:800;background:#faf8f3;border-bottom:0}' +
        '.rv .resta .r{color:#b2402b}' +
        '.rv .total td{font-size:15px;font-weight:800;background:#e8f4f6;color:#006173;border-top:2px solid #007b8f;border-bottom:0}' +
        '.rv .aviso{margin:14px 0 0;font-size:11px;color:#8a9097;font-style:italic;line-height:1.5}' +
        '.rv .pie{display:flex;justify-content:space-between;font-size:10.5px;color:#8a9097;border-top:1px solid #ece6dc;padding-top:8px;margin-top:26px}';

    function armarHtml(fId) {
        var info = (typeof infoFestivales !== 'undefined' && infoFestivales[fId]) ? infoFestivales[fId] : {};
        var fin = (typeof ingresosFestivalesDB !== 'undefined' && ingresosFestivalesDB[fId]) ? ingresosFestivalesDB[fId] : {};
        var ent = (typeof entradasFestivales !== 'undefined' && entradasFestivales[fId]) ? entradasFestivales[fId] : (typeof preciosEntradasPorDefecto !== 'undefined' ? preciosEntradasPorDefecto : {});
        var taq = calcularTaquillaFestival(fId, fin, ent);
        var acuerdo = taq.acuerdo || {};
        var nombrePF = window.NOMBRE_PAGO_FIJO || 'Monto fijo';

        var pPrev = Number(ent.preventa) || 0, pGen = Number(ent.general) || precioGeneralVigente(), pPue = Number(ent.puerta) || 0;
        var comunes = [
            ['Preventa', ars(pPrev), taq.cantPreventa, ars(taq.cantPreventa * pPrev)],
            ['General', ars(pGen), taq.cantGeneral, ars(taq.cantGeneral * pGen)],
            ['Puerta', ars(pPue), taq.cantPuerta, ars(taq.cantPuerta * pPue)]
        ];
        (fin.categoriasExtra || []).forEach(function (c) {
            var cant = Math.max(0, parseInt(c.cantidad || 0, 10) || 0), pr = Math.max(0, parseFloat(c.precio || 0) || 0);
            if (cant > 0) comunes.push([c.nombre || 'Entrada especial', ars(pr), cant, ars(cant * pr)]);
        });
        if (taq.usaBrutoHistorico) comunes = [['Taquilla (total cargado)', '-', '-', ars(taq.brutoTaquilla)]];

        var especiales = (fin.ventasEspeciales || []).map(function (v) {
            var tipo = v.tipoVenta || 'Promo 2x1';
            var cant = v.cantEntradas !== undefined ? v.cantEntradas : (tipo === 'Promo 2x1' ? 2 : 1);
            var monto = Math.max(0, parseFloat(v.monto || 0) || 0);
            return [v.comprador || '-', tipo, cant, v.metodo || '-', v.cobradoPor || '-', monto ? ars(monto) : 'Sin cargo'];
        });

        var neto = taq.recaudacionEntradas;
        var acuerdoTxt = acuerdo.esAlquiler ? nombrePF + ' (' + ars(acuerdo.alquilerMonto) + ')'
            : (acuerdo.porcFinal === 100 ? '100% Escuela' : (acuerdo.porcFinal != null ? acuerdo.porcFinal + '% Escuela / ' + (100 - acuerdo.porcFinal) + '% Venue' : 'A definir'));
        var cantTotal = taq.cantTaquilla + taq.cantVentasEspeciales;

        // Cómo se llega al ingreso neto
        var s = taq.sadaicRes || {};
        var calc = '<tr><td>Taquilla bruta</td><td class="r">' + ars(taq.brutoTaquilla) + '</td></tr>';
        if (!s.omitido) calc += '<tr class="resta"><td>SADAIC (' + esc(s.descripcion || '') + ')</td><td class="r">- ' + ars(taq.montoSadaic) + '</td></tr>';
        if (taq.esAlquiler) calc += '<tr class="resta"><td>' + esc(nombrePF) + ' acordado con el venue</td><td class="r">- ' + ars(taq.alquilerSala) + '</td></tr>';
        else calc += '<tr class="resta"><td>Parte del venue (' + Math.max(0, 100 - taq.porcEscuela) + '% de ' + ars(taq.basePostSadaic) + ')</td><td class="r">- ' + ars(taq.basePostSadaic - taq.netoEscuelaOnline) + '</td></tr>';
        calc += '<tr><td>Ventas especiales (100% de la escuela)</td><td class="r">+ ' + ars(taq.totVentasEspeciales) + '</td></tr>';

        // Pago al venue (monto fijo): seña y entradas cobradas en efectivo por el venue
        var bloquePago = '';
        if (taq.esAlquiler && (taq.senaVenue > 0 || taq.efectivoVenue > 0)) {
            var f = '<tr><td>' + esc(nombrePF) + ' acordado</td><td class="r">' + ars(taq.alquilerSala) + '</td></tr>';
            if (taq.senaVenue > 0) f += '<tr class="resta"><td>Seña ya pagada para reservar</td><td class="r">- ' + ars(taq.senaVenue) + '</td></tr>';
            if (taq.efectivoVenue > 0) f += '<tr class="resta"><td>Entradas cobradas en efectivo por el venue (' + taq.efectivoVenueCant + ' × ' + ars(taq.efectivoVenueValor) + ')</td><td class="r">- ' + ars(taq.efectivoVenue) + '</td></tr>';
            bloquePago = '<h3>Pago al venue (' + esc(nombrePF.toLowerCase()) + ')</h3><table><tbody>' + f + '</tbody><tfoot><tr><td>' +
                (taq.saldoVenue < 0 ? 'A favor de la escuela (el venue retuvo de más)' : 'Saldo pagado al venue el día del festival') +
                '</td><td class="r">' + ars(Math.abs(taq.saldoVenue)) + '</td></tr></tfoot></table>';
        }
        var notaEfectivo = (taq.esAlquiler && taq.efectivoVenue > 0)
            ? '<p class="aviso">Las ' + taq.efectivoVenueCant + ' entradas cobradas por el venue en efectivo están incluidas en las ventas de puerta; se descuentan del pago al venue.</p>' : '';

        return '<style>' + CSS + '</style><div class="rv">' +
            '<div class="cab"><div><div class="marca">Mandala Ensambles</div><div class="sub">Festivales &amp; Eventos</div></div>' +
            '<div class="der"><div class="tit">Reporte de ventas</div><div class="sub">Emitido el ' + new Date().toLocaleDateString('es-AR') + '</div></div></div>' +
            '<h2>' + esc(info.nombre || 'Evento') + '</h2>' +
            '<div class="meta">' + [info.fecha, info.venue ? 'Venue: ' + info.venue : '', 'Acuerdo: ' + acuerdoTxt].filter(Boolean).map(function (t) { return '<span>' + esc(t) + '</span>'; }).join('') + '</div>' +
            '<div class="kpis">' +
            '<div class="kpi"><small>Entradas vendidas</small><b>' + cantTotal + '</b><em>' + taq.cantTaquilla + ' comunes · ' + taq.cantVentasEspeciales + ' especiales</em></div>' +
            '<div class="kpi"><small>Ventas brutas</small><b>' + ars(taq.brutoTotal) + '</b><em>taquilla + especiales</em></div>' +
            '<div class="kpi neto"><small>Ingreso neto del evento</small><b>' + ars(neto) + '</b><em>lo que le queda a la escuela</em></div></div>' +
            '<h3>Ventas comunes</h3><table><thead><tr><th>Tipo de entrada</th><th class="r">Precio</th><th class="c">Cantidad</th><th class="r">Subtotal</th></tr></thead><tbody>' +
            comunes.map(function (c) { return '<tr><td>' + esc(c[0]) + '</td><td class="r">' + c[1] + '</td><td class="c">' + c[2] + '</td><td class="r">' + c[3] + '</td></tr>'; }).join('') +
            '</tbody><tfoot><tr><td colspan="2">Total taquilla</td><td class="c">' + taq.cantTaquilla + '</td><td class="r">' + ars(taq.brutoTaquilla) + '</td></tr></tfoot></table>' +
            '<h3>Ventas especiales</h3><table><thead><tr><th>Comprador</th><th>Tipo de venta</th><th class="c">Entradas</th><th>Método de pago</th><th>Cobró</th><th class="r">Valor</th></tr></thead><tbody>' +
            (especiales.length ? especiales.map(function (e) { return '<tr><td>' + esc(e[0]) + '</td><td>' + esc(e[1]) + '</td><td class="c">' + e[2] + '</td><td>' + esc(e[3]) + '</td><td>' + esc(e[4]) + '</td><td class="r">' + e[5] + '</td></tr>'; }).join('')
                : '<tr><td colspan="6" style="color:#8a9097">No hay ventas especiales registradas</td></tr>') +
            '</tbody><tfoot><tr><td colspan="2">Total ventas especiales</td><td class="c">' + taq.cantVentasEspeciales + '</td><td colspan="2"></td><td class="r">' + ars(taq.totVentasEspeciales) + '</td></tr></tfoot></table>' +
            '<h3>Cómo se llega al ingreso neto</h3><table><tbody>' + calc + '<tr class="total"><td>Ingreso neto del evento</td><td class="r">' + ars(neto) + '</td></tr></tbody></table>' +
            bloquePago + notaEfectivo +
            '<p class="aviso">Este reporte muestra solo ingresos. No incluye gastos del evento ni la cobertura audiovisual.</p>' +
            '<div class="pie"><span>Mandala Festivales</span><span>' + esc(info.nombre || 'Evento') + ' · Reporte de ventas</span></div></div>';
    }

    // formato: 'png' (por defecto) o 'jpg'
    window.generarReporteVentasImagen = async function (festId, formato) {
        var fId = festId || (typeof eventoActualId !== 'undefined' ? eventoActualId : null);
        if (!fId) { mostrarToast('Elegí un evento para generar el reporte.', 'warning'); return; }
        if (typeof window.html2canvas !== 'function') { mostrarToast('No se pudo cargar la herramienta de imagen. Revisá la conexión y reintentá.', 'error'); return; }
        var info = (typeof infoFestivales !== 'undefined' && infoFestivales[fId]) ? infoFestivales[fId] : {};
        var esJpg = String(formato || 'png').toLowerCase() === 'jpg';

        var cont = document.createElement('div');
        cont.style.cssText = 'position:fixed;left:-10000px;top:0;z-index:-1;background:#fff';
        cont.innerHTML = armarHtml(fId);
        document.body.appendChild(cont);
        try {
            if (document.fonts && document.fonts.ready) await document.fonts.ready;
            var nodo = cont.querySelector('.rv');
            var canvas = await window.html2canvas(nodo, { scale: 2, backgroundColor: '#ffffff', useCORS: true, logging: false });
            var blob = await new Promise(function (res) { canvas.toBlob(res, esJpg ? 'image/jpeg' : 'image/png', 0.92); });
            if (!blob) throw new Error('No se pudo generar la imagen');
            var url = URL.createObjectURL(blob);
            var a = document.createElement('a');
            a.href = url;
            a.download = 'Reporte_ventas_' + limpiarNombreArchivo(info.nombre) + (esJpg ? '.jpg' : '.png');
            document.body.appendChild(a); a.click(); a.remove();
            setTimeout(function () { URL.revokeObjectURL(url); }, 4000);
            mostrarToast('Reporte de ventas descargado (' + (esJpg ? 'JPG' : 'PNG') + ')', 'success');
        } catch (e) {
            console.error('[Mandala] Error generando el reporte de ventas', e);
            mostrarToast('No se pudo generar el reporte de ventas.', 'error');
        } finally {
            cont.remove();
        }
    };
    // Compatibilidad con el nombre anterior
    window.generarReporteVentasPDF = window.generarReporteVentasImagen;
})();
