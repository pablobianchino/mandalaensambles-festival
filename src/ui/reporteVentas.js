// =======================================================================
// src/ui/reporteVentas.js — Reportes de un evento (script clásico)
//   · Reporte de ventas:   imagen PNG. Entradas por tipo, ventas especiales y cómo se llega al ingreso neto.
//   · Reporte de gastos:   imagen PNG. Gastos del evento, cobertura audiovisual (Fotos / Video) y servicios adelantados.
//   · Reporte completo:    PDF. Primero el resumen (ingresos, egresos y ganancia), después ventas y gastos.
// Todos comparten el mismo diseño: cabecera, tarjetas de resumen, un gráfico circular y tablas cortas.
// Usa html2canvas (cdnjs) y, para el PDF, jsPDF (se carga desde cdnjs la primera vez que se pide).
// Los números salen de los mismos cálculos que Finanzas (calcularBalanceGeneralFestival, calcularTaquillaFestival,
// calcularResumenPresupuestoProductora, calcularServiciosFestival) para que siempre coincidan.
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
    function num(v) { return Math.max(0, parseFloat(v || 0) || 0); }

    var TITULOS = { ventas: 'Reporte de ventas', gastos: 'Reporte de gastos', completo: 'Reporte completo' };

    // Paleta única de los gráficos (misma en todos los reportes y en Estadísticas)
    var PALETA = ['#007b8f', '#e0a43a', '#6d5bd0', '#2e9e6a', '#d9467a', '#5b8def', '#c2410c', '#8a9097'];
    var COLOR = { escuela: '#2e9e6a', venue: '#5b8def', sadaic: '#e0a43a', gastos: '#c2410c' };

    // Ancho fijo = A4 a 96 dpi; el alto de una hoja A4 es 1123 px
    var ANCHO = 794, ALTO_HOJA = 1123;

    var CSS = '' +
        '.rv{width:' + ANCHO + 'px;box-sizing:border-box;background:#fff;color:#1c1f22;font-family:Inter,"Segoe UI",system-ui,sans-serif;font-size:12.5px;line-height:1.35;padding:36px 40px 28px}' +
        '.rv *{box-sizing:border-box}' +
        '.rv .cab{display:flex;justify-content:space-between;align-items:flex-end;border-bottom:3px solid #007b8f;padding-bottom:10px;margin-bottom:14px}' +
        '.rv .marca{font-size:19px;font-weight:800;color:#006173}.rv .sub{font-size:11px;color:#8a9097}.rv .der{text-align:right}.rv .tit{font-size:17px;font-weight:800}' +
        '.rv h2{margin:0 0 8px;font-size:22px;line-height:1.2}.rv .meta{display:flex;gap:6px;flex-wrap:wrap;margin-bottom:14px}' +
        '.rv .meta span{background:#faf8f3;border:1px solid #ece6dc;border-radius:99px;padding:2px 10px;font-size:11.5px;color:#4b5159;white-space:nowrap}' +
        '.rv .bloque{font-size:14px;font-weight:800;letter-spacing:.05em;text-transform:uppercase;color:#006173;border-bottom:2px solid #007b8f;padding-bottom:5px;margin:4px 0 12px}' +
        '.rv .sec{margin-bottom:18px}' +
        '.rv .kpis{display:grid;grid-template-columns:repeat(3,1fr);gap:10px}' +
        '.rv .kpi{border:1px solid #ece6dc;border-radius:10px;padding:10px 12px;background:#faf8f3;min-width:0}' +
        '.rv .kpi small{display:block;font-size:10px;font-weight:800;letter-spacing:.05em;text-transform:uppercase;color:#8a9097;white-space:nowrap}' +
        '.rv .kpi b{display:block;font-size:20px;margin:4px 0 2px;font-family:"Geist Mono",ui-monospace,Consolas,monospace;white-space:nowrap}' +
        '.rv .kpi em{display:block;font-style:normal;font-size:10.5px;color:#8a9097;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}' +
        '.rv .kpi.neto{background:#e8f4f6;border-color:#007b8f}.rv .kpi.neto b{color:#006173}' +
        '.rv .kpi.neg b{color:#b2402b}' +
        '.rv h3{font-size:11.5px;margin:0 0 7px;text-transform:uppercase;letter-spacing:.06em;color:#4b5159}' +
        '.rv table{width:100%;border-collapse:collapse}' +
        '.rv th{background:#faf8f3;color:#8a9097;font-size:10px;letter-spacing:.05em;text-transform:uppercase;text-align:left;padding:7px 9px;border-bottom:1px solid #ddd5c8;white-space:nowrap}' +
        '.rv td{padding:6px 9px;border-bottom:1px solid #ece6dc;vertical-align:middle}' +
        '.rv .r{text-align:right;white-space:nowrap;font-family:"Geist Mono",ui-monospace,Consolas,monospace}.rv .c{text-align:center;white-space:nowrap}' +
        '.rv .nw{white-space:nowrap}.rv .gris{color:#8a9097}.rv .chico{font-size:10.5px;color:#8a9097}' +
        '.rv tfoot td{font-weight:800;background:#faf8f3;border-bottom:0}' +
        '.rv .resta .r{color:#b2402b}' +
        '.rv .total td{font-size:14px;font-weight:800;background:#e8f4f6;color:#006173;border-top:2px solid #007b8f;border-bottom:0}' +
        '.rv .est-pend{color:#b45309;font-weight:700;white-space:nowrap}.rv .est-ok{color:#1d7a4a;font-weight:700;white-space:nowrap}.rv .est-neu{color:#8a9097;font-weight:700;white-space:nowrap}' +
        '.rv .aviso{margin:8px 0 0;font-size:10.5px;color:#8a9097;font-style:italic}' +
        '.rv .graf{display:flex;align-items:center;gap:22px;border:1px solid #ece6dc;border-radius:10px;padding:12px 16px}' +
        '.rv .graf img{width:150px;height:150px;flex:0 0 150px}' +
        '.rv .graf table td{border-bottom:1px solid #f1ece4;padding:4px 6px}' +
        '.rv .pto{display:inline-block;width:10px;height:10px;border-radius:3px;margin-right:7px;vertical-align:-1px}' +
        '.rv .dos{display:grid;grid-template-columns:1fr 1fr;gap:14px}' +
        '.rv .pie{display:flex;justify-content:space-between;font-size:10px;color:#8a9097;border-top:1px solid #ece6dc;padding-top:7px;margin-top:18px}';

    function infoDe(fId) {
        return (typeof infoFestivales !== 'undefined' && infoFestivales[fId]) ? infoFestivales[fId] : {};
    }
    function finDe(fId) {
        return (typeof ingresosFestivalesDB !== 'undefined' && ingresosFestivalesDB[fId]) ? ingresosFestivalesDB[fId] : {};
    }
    function entDe(fId) {
        return (typeof entradasFestivales !== 'undefined' && entradasFestivales[fId]) ? entradasFestivales[fId] : (typeof preciosEntradasPorDefecto !== 'undefined' ? preciosEntradasPorDefecto : {});
    }
    function kpi(rot, valor, sub, clase) {
        return '<div class="kpi' + (clase ? ' ' + clase : '') + '"><small>' + rot + '</small><b>' + valor + '</b><em>' + (sub || '&nbsp;') + '</em></div>';
    }
    function seccion(contenido) { return '<div class="sec">' + contenido + '</div>'; }

    // ---------------------------------------------------------------
    // Gráfico circular (SVG como imagen, así html2canvas lo dibuja igual en todos lados) + leyenda con monto y %
    // partes: [{ nombre, valor, color }]
    // ---------------------------------------------------------------
    function svgDonut(partes, centro, subCentro) {
        var total = partes.reduce(function (a, p) { return a + p.valor; }, 0);
        var R = 60, C = 2 * Math.PI * R, acum = 0, arcos = '';
        partes.forEach(function (p) {
            var largo = total > 0 ? (p.valor / total) * C : 0;
            if (largo <= 0) return;
            arcos += '<circle cx="80" cy="80" r="' + R + '" fill="none" stroke="' + p.color + '" stroke-width="28" stroke-dasharray="' + largo.toFixed(2) + ' ' + (C - largo).toFixed(2) + '" stroke-dashoffset="' + (-acum).toFixed(2) + '" transform="rotate(-90 80 80)"/>';
            acum += largo;
        });
        if (!arcos) arcos = '<circle cx="80" cy="80" r="' + R + '" fill="none" stroke="#ece6dc" stroke-width="28"/>';
        var svg = '<svg xmlns="http://www.w3.org/2000/svg" width="480" height="480" viewBox="0 0 160 160">' + arcos +
            '<text x="80" y="' + (subCentro ? 78 : 85) + '" text-anchor="middle" font-family="Segoe UI, Arial, sans-serif" font-size="15" font-weight="700" fill="#1c1f22">' + esc(centro || '') + '</text>' +
            (subCentro ? '<text x="80" y="96" text-anchor="middle" font-family="Segoe UI, Arial, sans-serif" font-size="10" fill="#8a9097">' + esc(subCentro) + '</text>' : '') +
            '</svg>';
        return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
    }
    function htmlGrafico(titulo, partes, centro, subCentro) {
        partes = (partes || []).filter(function (p) { return p.valor > 0; });
        if (!partes.length) return '';
        var total = partes.reduce(function (a, p) { return a + p.valor; }, 0);
        var filas = partes.map(function (p) {
            var pc = total > 0 ? Math.round((p.valor / total) * 100) : 0;
            return '<tr><td><span class="pto" style="background:' + p.color + '"></span>' + esc(p.nombre) + '</td><td class="r">' + ars(p.valor) + '</td><td class="r gris" style="width:46px">' + pc + '%</td></tr>';
        }).join('');
        return seccion('<h3>' + titulo + '</h3><div class="graf"><img src="' + svgDonut(partes, centro, subCentro) + '" alt=""><table><tbody>' + filas + '</tbody></table></div>');
    }
    // Agrupa partes chicas en "Otros" para que el gráfico se lea
    function agruparPartes(lista, maximo, nombreOtros) {
        lista = lista.filter(function (p) { return p.valor > 0; }).sort(function (a, b) { return b.valor - a.valor; });
        if (lista.length <= maximo) return lista;
        var principales = lista.slice(0, maximo - 1);
        var resto = lista.slice(maximo - 1).reduce(function (a, p) { return a + p.valor; }, 0);
        principales.push({ nombre: nombreOtros || 'Otros', valor: resto });
        return principales;
    }
    function colorear(lista) { return lista.map(function (p, i) { return { nombre: p.nombre, valor: p.valor, color: p.color || PALETA[i % PALETA.length] }; }); }

    // ---------------------------------------------------------------
    // Datos de los gráficos de un evento (también los usa Estadísticas)
    // ---------------------------------------------------------------
    function datosGraficosEvento(fId) {
        var info = infoDe(fId), fin = finDe(fId), ent = entDe(fId);
        var res = { destino: [], ventas: [], gastos: [] };

        // Ventas por tipo de entrada
        var taq = calcularTaquillaFestival(fId, fin, ent);
        if (taq.usaBrutoHistorico) {
            res.ventas.push({ nombre: 'Taquilla', valor: taq.brutoTaquilla });
        } else {
            var pGen = Number(ent.general) || (typeof precioGeneralVigente === 'function' ? precioGeneralVigente() : 0);
            res.ventas.push({ nombre: 'Preventa', valor: taq.cantPreventa * (Number(ent.preventa) || 0) });
            res.ventas.push({ nombre: 'General', valor: taq.cantGeneral * pGen });
            res.ventas.push({ nombre: 'Puerta', valor: taq.cantPuerta * (Number(ent.puerta) || 0) });
            (fin.categoriasExtra || []).forEach(function (c) {
                res.ventas.push({ nombre: c.nombre || 'Entrada especial', valor: num(c.cantidad) * num(c.precio) });
            });
        }
        res.ventas.push({ nombre: 'Ventas especiales', valor: taq.totVentasEspeciales });
        res.ventas = colorear(agruparPartes(res.ventas, 7, 'Otras entradas'));

        // Gastos por concepto (los gastos con el mismo concepto se suman)
        var porConcepto = {};
        (Array.isArray(fin.gastosOperativos) ? fin.gastosOperativos : []).forEach(function (g) {
            if (!g) return;
            var m = num(g.monto);
            if (m <= 0) return;
            var k = String(g.concepto || 'Sin concepto').trim() || 'Sin concepto';
            porConcepto[k] = (porConcepto[k] || 0) + m;
        });
        // Los conceptos de menos de $ 10.000 van juntos en "Otros gastos"
        var MINIMO_CONCEPTO = 10000, otros = 0, lg = [];
        Object.keys(porConcepto).forEach(function (k) {
            if (porConcepto[k] < MINIMO_CONCEPTO) otros += porConcepto[k];
            else lg.push({ nombre: k, valor: porConcepto[k] });
        });
        if (otros > 0) lg.push({ nombre: 'Otros gastos', valor: otros });
        var cob = calcularResumenPresupuestoProductora(fId);
        var serv = calcularServiciosFestival(fId, info);
        if (cob.saldoEscuela > 0) lg.push({ nombre: 'Cobertura audiovisual', valor: cob.saldoEscuela });
        if (serv.adelantado > 0) lg.push({ nombre: 'Servicios adelantados', valor: serv.adelantado });
        // De mayor a menor, con "Otros gastos" siempre al final
        lg.sort(function (a, b) { return (a.nombre === 'Otros gastos') - (b.nombre === 'Otros gastos') || b.valor - a.valor; });
        res.gastos = colorear(lg);

        // A dónde fue la plata: escuela, venue, SADAIC (solo si hubo) y gastos
        var m = calcularBalanceGeneralFestival(fId, info);
        res.destino = [
            { nombre: 'Ganancia de la escuela', valor: Math.max(0, m.gananciaEscuela || 0), color: COLOR.escuela },
            { nombre: m.venueMontoFijo ? 'Venue (monto fijo)' : 'Venue', valor: Math.max(0, m.montoVenue || 0), color: COLOR.venue },
            { nombre: 'SADAIC', valor: Math.max(0, Number(m.montoSadaic) || 0), color: COLOR.sadaic },
            { nombre: 'Gastos de la escuela', valor: Math.max(0, m.egresosTotales || 0), color: COLOR.gastos }
        ].filter(function (p) { return p.valor > 0; });
        res.metricas = m;
        return res;
    }

    // ---------------------------------------------------------------
    // RESUMEN (primera parte del reporte completo)
    // ---------------------------------------------------------------
    function cuerpoResumen(fId) {
        var d = datosGraficosEvento(fId), m = d.metricas;
        var fila = function (rot, v, clase) { return '<tr' + (clase ? ' class="' + clase + '"' : '') + '><td>' + rot + '</td><td class="r">' + ars(v) + '</td></tr>'; };
        var ing = fila('Ventas netas de entradas', m.ventasEntradasNetas !== undefined ? m.ventasEntradasNetas : (m.recaudacionEntradas || 0))
            + ((m.ventasEspeciales || 0) > 0 ? fila('Ventas especiales', m.ventasEspeciales) : '')
            + ((m.ingresosIncumplimientos || 0) > 0 ? fila('Cobros por incumplimiento', m.ingresosIncumplimientos) : '')
            + ((m.ingresosSalasPropias || 0) > 0 ? fila('Uso de salas de la escuela', m.ingresosSalasPropias) : '')
            + ((m.excedenteCobertura || 0) > 0 ? fila('Excedente de cobertura', m.excedenteCobertura) : '');
        var egr = fila('Gastos operativos', m.gastosOperativos || 0)
            + fila('Cobertura audiovisual', m.gastosCobertura || 0)
            + ((m.tercerosAdelantado || 0) > 0 ? fila('Servicios adelantados', m.tercerosAdelantado) : '');
        var tablaIng = '<h3>Ingresos</h3><table><tbody>' + ing + '</tbody><tfoot><tr><td>Total ingresos</td><td class="r">' + ars(m.ingresosTotales) + '</td></tr></tfoot></table>';
        var tablaEgr = '<h3>Egresos</h3><table><tbody>' + egr + '</tbody><tfoot><tr><td>Total egresos</td><td class="r">' + ars(m.egresosTotales) + '</td></tr></tfoot></table>';
        var pend = '<h3>Pendientes</h3><table><tbody>' + fila('Por cobrar', m.deudasPorCobrar || 0) + fila('Pendiente de pago', m.deudasPorPagar || 0) + '</tbody></table>';
        var terceros = '';
        if ((m.tercerosCobrado || 0) > 0 || (m.tercerosPagado || 0) > 0) {
            var saldo = (m.tercerosCobrado || 0) - (m.tercerosPagado || 0);
            terceros = '<h3>Servicios de terceros</h3><table><tbody>' + fila('Cobrado a los alumnos', m.tercerosCobrado || 0) + fila('Pagado a salas y proveedores', m.tercerosPagado || 0)
                + fila(saldo >= 0 ? 'Saldo a pagar a proveedores' : 'Adelantado por la escuela', Math.abs(saldo)) + '</tbody></table>'
                + '<p class="aviso">No es ingreso ni egreso: es plata de los alumnos que pasa por la escuela.</p>';
        }
        var g = m.gananciaEscuela || 0;
        return seccion('<div class="kpis">' +
                kpi('Ingresos', ars(m.ingresosTotales), 'lo que entró a la escuela') +
                kpi('Egresos', ars(m.egresosTotales), 'lo que pagó la escuela') +
                kpi('Ganancia real', ars(g), 'ingresos − egresos', g < 0 ? 'neto neg' : 'neto') + '</div>') +
            htmlGrafico('A dónde fue la plata del evento', d.destino, ars(d.destino.reduce(function (a, p) { return a + p.valor; }, 0)), 'entró en total') +
            seccion('<div class="dos"><div>' + tablaIng + '</div><div>' + tablaEgr + '</div></div>') +
            seccion('<div class="dos"><div>' + pend + '</div><div>' + terceros + '</div></div>');
    }

    // ---------------------------------------------------------------
    // VENTAS
    // ---------------------------------------------------------------
    function cuerpoVentas(fId) {
        var fin = finDe(fId), ent = entDe(fId);
        var taq = calcularTaquillaFestival(fId, fin, ent);
        var nombrePF = window.NOMBRE_PAGO_FIJO || 'Monto fijo';
        var d = datosGraficosEvento(fId);

        var pPrev = Number(ent.preventa) || 0, pGen = Number(ent.general) || precioGeneralVigente(), pPue = Number(ent.puerta) || 0;
        var comunes = [
            ['Preventa', pPrev, taq.cantPreventa],
            ['General', pGen, taq.cantGeneral],
            ['Puerta', pPue, taq.cantPuerta]
        ];
        (fin.categoriasExtra || []).forEach(function (c) {
            var cant = Math.max(0, parseInt(c.cantidad || 0, 10) || 0);
            if (cant > 0) comunes.push([c.nombre || 'Entrada especial', num(c.precio), cant]);
        });
        var filasComunes = taq.usaBrutoHistorico
            ? '<tr><td>Taquilla (total cargado)</td><td class="r">-</td><td class="c">-</td><td class="r">' + ars(taq.brutoTaquilla) + '</td></tr>'
            : comunes.map(function (c) { return '<tr><td>' + esc(c[0]) + '</td><td class="r">' + ars(c[1]) + '</td><td class="c">' + c[2] + '</td><td class="r">' + ars(c[1] * c[2]) + '</td></tr>'; }).join('');

        var especiales = (fin.ventasEspeciales || []).map(function (v) {
            var tipo = v.tipoVenta || 'Promo 2x1';
            var cant = v.cantEntradas !== undefined ? v.cantEntradas : (tipo === 'Promo 2x1' ? 2 : 1);
            var monto = num(v.monto);
            var pago = [v.cobradoPor, v.metodo === 'Transferencia' ? 'Transf.' : v.metodo].filter(Boolean).join(' · ');
            return '<tr><td>' + esc(v.comprador || '-') + '</td><td class="nw">' + esc(tipo) + '</td><td class="c">' + cant + '</td><td class="nw">' + esc(pago || '-') + '</td><td class="r">' + (monto ? ars(monto) : '<span class="gris">Sin cargo</span>') + '</td></tr>';
        });

        // Del bruto al neto
        var s = taq.sadaicRes || {};
        var calc = '<tr><td>Taquilla bruta</td><td class="r">' + ars(taq.brutoTaquilla) + '</td></tr>';
        if (!s.omitido && taq.montoSadaic > 0) calc += '<tr class="resta"><td>SADAIC</td><td class="r">- ' + ars(taq.montoSadaic) + '</td></tr>';
        if (taq.esAlquiler) calc += '<tr class="resta"><td>Venue (' + esc(nombrePF.toLowerCase()) + ')</td><td class="r">- ' + ars(taq.alquilerSala) + '</td></tr>';
        else calc += '<tr class="resta"><td>Venue (' + Math.max(0, 100 - taq.porcEscuela) + '%)</td><td class="r">- ' + ars(taq.basePostSadaic - taq.netoEscuelaOnline) + '</td></tr>';
        if (taq.totVentasEspeciales > 0) calc += '<tr><td>Ventas especiales</td><td class="r">+ ' + ars(taq.totVentasEspeciales) + '</td></tr>';

        // Pago al venue (monto fijo)
        var bloquePago = '';
        if (taq.esAlquiler && (taq.senaVenue > 0 || taq.efectivoVenue > 0)) {
            var f = '<tr><td>' + esc(nombrePF) + ' acordado</td><td class="r">' + ars(taq.alquilerSala) + '</td></tr>';
            if (taq.senaVenue > 0) f += '<tr class="resta"><td>Seña ya pagada</td><td class="r">- ' + ars(taq.senaVenue) + '</td></tr>';
            if (taq.efectivoVenue > 0) f += '<tr class="resta"><td>Cobrado en efectivo por el venue (' + taq.efectivoVenueCant + ')</td><td class="r">- ' + ars(taq.efectivoVenue) + '</td></tr>';
            bloquePago = '<h3>Pago al venue</h3><table><tbody>' + f + '</tbody><tfoot><tr><td>' +
                (taq.saldoVenue < 0 ? 'A favor de la escuela' : 'Saldo pagado el día') +
                '</td><td class="r">' + ars(Math.abs(taq.saldoVenue)) + '</td></tr></tfoot></table>';
        }
        var tablaNeto = '<h3>Del bruto al neto</h3><table><tbody>' + calc + '<tr class="total"><td>Ingreso neto</td><td class="r">' + ars(taq.recaudacionEntradas) + '</td></tr></tbody></table>';

        return seccion('<div class="kpis">' +
                kpi('Entradas vendidas', String(taq.cantTaquilla + taq.cantVentasEspeciales), taq.cantTaquilla + ' comunes · ' + taq.cantVentasEspeciales + ' especiales') +
                kpi('Ventas brutas', ars(taq.brutoTotal), 'taquilla + especiales') +
                kpi('Ingreso neto', ars(taq.recaudacionEntradas), 'lo que queda para la escuela', 'neto') + '</div>') +
            htmlGrafico('Ventas por tipo de entrada', d.ventas, ars(taq.brutoTotal), 'ventas brutas') +
            seccion('<h3>Entradas comunes</h3><table><thead><tr><th>Tipo</th><th class="r">Precio</th><th class="c">Cantidad</th><th class="r">Subtotal</th></tr></thead><tbody>' + filasComunes +
                '</tbody><tfoot><tr><td colspan="2">Total taquilla</td><td class="c">' + taq.cantTaquilla + '</td><td class="r">' + ars(taq.brutoTaquilla) + '</td></tr></tfoot></table>') +
            (especiales.length
                ? seccion('<h3>Ventas especiales</h3><table><thead><tr><th>Comprador</th><th>Tipo</th><th class="c">Entradas</th><th>Cobró</th><th class="r">Valor</th></tr></thead><tbody>' + especiales.join('') +
                    '</tbody><tfoot><tr><td colspan="2">Total ventas especiales</td><td class="c">' + taq.cantVentasEspeciales + '</td><td></td><td class="r">' + ars(taq.totVentasEspeciales) + '</td></tr></tfoot></table>')
                : '') +
            // El pago al venue va al lado del cálculo del neto, así no queda solo en otra hoja
            seccion(bloquePago ? '<div class="dos"><div>' + tablaNeto + '</div><div>' + bloquePago + '</div></div>' : tablaNeto);
    }

    // ---------------------------------------------------------------
    // GASTOS
    // ---------------------------------------------------------------
    function cuerpoGastos(fId) {
        var info = infoDe(fId), fin = finDe(fId);
        var d = datosGraficosEvento(fId);
        var gastos = (Array.isArray(fin.gastosOperativos) ? fin.gastosOperativos : []).filter(function (g) { return g && !(g.esSonido && !(num(g.monto) > 0)); }); // Sonido en $ 0 = no se usó
        // Primero lo pendiente, después lo pagado; dentro de cada grupo por fecha
        var fechaNum = function (s) {
            var x = String(s || '').match(/(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?/);
            if (!x) return 9e9;
            var a = x[3] ? (x[3].length === 2 ? 2000 + parseInt(x[3], 10) : parseInt(x[3], 10)) : 0;
            return a * 10000 + parseInt(x[2], 10) * 100 + parseInt(x[1], 10);
        };
        gastos = gastos.map(function (g, i) { return { g: g, i: i }; }).sort(function (a, b) {
            return ((a.g.pagado ? 1 : 0) - (b.g.pagado ? 1 : 0)) || (fechaNum(a.g.fecha) - fechaNum(b.g.fecha)) || (a.i - b.i);
        }).map(function (x) { return x.g; });
        var totOp = 0, pendOp = 0;
        gastos.forEach(function (g) { var m = num(g.monto); totOp += m; if (!g.pagado) pendOp += m; });

        var cob = calcularResumenPresupuestoProductora(fId);
        var serv = calcularServiciosFestival(fId, info);
        var totalEgresos = totOp + serv.adelantado + cob.saldoEscuela;
        var fechaCorta = function (f) { var x = String(f || '').match(/(\d{1,2})\/(\d{1,2})/); return x ? x[1].padStart(2, '0') + '/' + x[2].padStart(2, '0') : '-'; };

        var filasGastos = gastos.length ? gastos.map(function (g) {
            var dest = (typeof destinoGasto === 'function') ? destinoGasto(g) : { nombre: g.proveedor || '' };
            var metodo = g.metodo === 'Efectivo' ? 'Efectivo' : 'Transf.';
            return '<tr><td class="nw">' + fechaCorta(g.fecha) + '</td><td>' + esc(g.concepto || '-') + '</td><td class="nw">' + esc(dest.nombre || g.proveedor || '-') + '</td>' +
                '<td class="nw">' + esc(g.responsable || '-') + ' <span class="chico">· ' + metodo + '</span></td>' +
                '<td class="' + (g.pagado ? 'est-ok' : 'est-pend') + '">' + (g.pagado ? 'Pagado' : 'Pendiente') + '</td><td class="r">' + ars(num(g.monto)) + '</td></tr>';
        }).join('') : '<tr><td colspan="6" class="gris">No hay gastos cargados</td></tr>';
        var pie = '<tr><td colspan="5">Total gastos operativos</td><td class="r">' + ars(totOp) + '</td></tr>';
        if (pendOp > 0) pie += '<tr><td colspan="5">Pendiente de pago</td><td class="r">' + ars(pendOp) + '</td></tr>';

        // Cobertura audiovisual: Fotos y Video
        var filasCob = '', totCosto = 0, totAporte = 0, totPagar = 0, totPend = 0;
        (cob.itemsCobertura || []).slice().sort(function (a, b) {
            return ((a.diferencia > 0 && !a.pagada) ? 0 : 1) - ((b.diferencia > 0 && !b.pagada) ? 0 : 1);
        }).forEach(function (it) {
            var detalle = '';
            if (it.clave === 'video') {
                var partes = ['base'];
                if (cob.cantReelsEscuela > 0) partes.push(cob.cantReelsEscuela + ' reels escuela');
                if (cob.cantReelsBandas > 0) partes.push(cob.cantReelsBandas + ' reels bandas');
                detalle = '<div class="chico">' + partes.join(' + ') + '</div>';
            }
            var aporte = Math.min(it.aporte, it.costo);
            var estado = it.diferencia <= 0 ? '<td class="est-ok">Cubierto</td>' : '<td class="' + (it.pagada ? 'est-ok' : 'est-pend') + '">' + (it.pagada ? 'Pagado' : 'Pendiente') + '</td>';
            filasCob += '<tr><td><b>' + it.nombre + '</b>' + detalle + '</td><td class="r">' + ars(it.costo) + '</td><td class="r">' + ars(aporte) + '</td>' + estado + '<td class="r">' + ars(it.diferencia) + '</td></tr>';
            totCosto += it.costo; totAporte += aporte; totPagar += it.diferencia;
            if (!it.pagada) totPend += it.diferencia;
        });
        var bloqueCob = '';
        if (filasCob) {
            var pieCob = '<tr><td>Total</td><td class="r">' + ars(totCosto) + '</td><td class="r">' + ars(totAporte) + '</td><td></td><td class="r">' + ars(totPagar) + '</td></tr>';
            if (totPend > 0) pieCob += '<tr><td colspan="4">Pendiente de pago</td><td class="r">' + ars(totPend) + '</td></tr>';
            bloqueCob = seccion('<h3>Cobertura audiovisual</h3><table><thead><tr><th>Concepto</th><th class="r">Costo</th><th class="r">Cubren bandas</th><th>Estado</th><th class="r">A pagar</th></tr></thead><tbody>' +
                filasCob + '</tbody><tfoot>' + pieCob + '</tfoot></table>' +
                '<p class="aviso">Lo que cubren las bandas se cuenta completo, hayan pagado o no.' + (cob.excedenteCobertura > 0 ? ' Excedente para la escuela: ' + ars(cob.excedenteCobertura) + '.' : '') + '</p>');
        }

        var bloqueServ = '';
        if (serv.adelantado > 0) {
            var recup = Math.max(0, serv.adelantado - serv.absorbido);
            bloqueServ = seccion('<h3>Servicios adelantados</h3><table><tbody>' +
                '<tr><td>Pagado por la escuela a salas y sesionistas</td><td class="r">' + ars(serv.adelantado) + '</td></tr>' +
                '<tr><td>A recuperar de los alumnos</td><td class="r">' + ars(recup) + '</td></tr>' +
                (serv.absorbido > 0 ? '<tr><td>Absorbido por la escuela</td><td class="r">' + ars(serv.absorbido) + '</td></tr>' : '') +
                '</tbody></table>');
        }

        var resumen = '<tr><td>Gastos operativos</td><td class="r">' + ars(totOp) + '</td></tr>' +
            '<tr><td>Cobertura audiovisual</td><td class="r">' + ars(cob.saldoEscuela) + '</td></tr>' +
            (serv.adelantado > 0 ? '<tr><td>Servicios adelantados</td><td class="r">' + ars(serv.adelantado) + '</td></tr>' : '') +
            '<tr class="total"><td>Total de gastos</td><td class="r">' + ars(totalEgresos) + '</td></tr>';
        var pendTotal = pendOp + totPend;

        return seccion('<div class="kpis">' +
                kpi('Gastos operativos', ars(totOp), gastos.length + (gastos.length === 1 ? ' gasto' : ' gastos')) +
                kpi('Cobertura audiovisual', ars(cob.saldoEscuela), 'de ' + ars(cob.presupuestoProductora) + ' en total') +
                kpi('Total de gastos', ars(totalEgresos), pendTotal > 0 ? 'pendiente ' + ars(pendTotal) : 'todo pagado', 'neto') + '</div>') +
            htmlGrafico('Gastos por concepto', d.gastos, ars(totalEgresos), 'total de gastos') +
            seccion('<h3>Gastos del evento</h3><table><thead><tr><th>Fecha</th><th>Concepto</th><th>Destinatario</th><th>Paga</th><th>Estado</th><th class="r">Monto</th></tr></thead><tbody>' +
                filasGastos + '</tbody><tfoot>' + pie + '</tfoot></table>') +
            bloqueCob + bloqueServ +
            seccion('<h3>Total de gastos</h3><table><tbody>' + resumen + '</tbody></table>');
    }

    // ---------------------------------------------------------------
    // Armado del reporte
    // ---------------------------------------------------------------
    function cabecera(fId, tipo) {
        var info = infoDe(fId), fin = finDe(fId);
        var chips = [info.fecha, info.venue];
        if (tipo !== 'gastos') {
            var taq = calcularTaquillaFestival(fId, fin, entDe(fId));
            var ac = taq.acuerdo || {};
            var nombrePF = window.NOMBRE_PAGO_FIJO || 'Monto fijo';
            chips.push(ac.esAlquiler ? nombrePF + ' ' + ars(ac.alquilerMonto)
                : (ac.porcFinal === 100 ? '100% escuela' : (ac.porcFinal != null ? ac.porcFinal + '% escuela · ' + (100 - ac.porcFinal) + '% venue' : '')));
        }
        return '<div class="cab"><div><div class="marca">Mandala Ensambles</div><div class="sub">Festivales &amp; Eventos</div></div>' +
            '<div class="der"><div class="tit">' + TITULOS[tipo] + '</div><div class="sub">Emitido el ' + new Date().toLocaleDateString('es-AR') + '</div></div></div>' +
            '<h2>' + esc(info.nombre || 'Evento') + '</h2>' +
            '<div class="meta">' + chips.filter(Boolean).map(function (t) { return '<span>' + esc(t) + '</span>'; }).join('') + '</div>';
    }
    function piePagina(fId, tipo, extra) {
        return '<div class="pie"><span>Mandala Festivales · ' + esc(infoDe(fId).nombre || 'Evento') + '</span><span>' + TITULOS[tipo] + (extra ? ' · ' + extra : '') + '</span></div>';
    }

    // Devuelve los bloques del cuerpo (cada uno es una unidad que no se corta al paginar)
    function bloquesCuerpo(fId, tipo) {
        var cont = document.createElement('div');
        if (tipo === 'ventas') cont.innerHTML = cuerpoVentas(fId);
        else if (tipo === 'gastos') cont.innerHTML = cuerpoGastos(fId);
        else cont.innerHTML = '<div class="sec"><div class="bloque">Resumen del evento</div></div>' + cuerpoResumen(fId) +
            '<div class="sec" data-hoja-nueva="1"><div class="bloque">Ventas</div></div>' + cuerpoVentas(fId) +
            '<div class="sec" data-hoja-nueva="1"><div class="bloque">Gastos</div></div>' + cuerpoGastos(fId);
        return Array.prototype.map.call(cont.children, function (n) { return n.outerHTML; });
    }

    function armarHtml(fId, tipo) {
        tipo = TITULOS[tipo] ? tipo : 'ventas';
        return '<style>' + CSS + '</style><div class="rv">' + cabecera(fId, tipo) + bloquesCuerpo(fId, tipo).join('') + piePagina(fId, tipo) + '</div>';
    }

    async function renderizarNodo(html) {
        var cont = document.createElement('div');
        cont.style.cssText = 'position:fixed;left:-10000px;top:0;z-index:-1;background:#fff';
        cont.innerHTML = html;
        document.body.appendChild(cont);
        // Esperar a que carguen las imágenes de los gráficos
        await Promise.all(Array.prototype.map.call(cont.querySelectorAll('img'), function (img) {
            return img.complete ? null : new Promise(function (r) { img.onload = img.onerror = r; });
        }));
        if (document.fonts && document.fonts.ready) await document.fonts.ready;
        return cont;
    }

    // ---------------------------------------------------------------
    // IMAGEN (ventas y gastos)
    // ---------------------------------------------------------------
    window.generarReporteImagen = async function (festId, tipo, formato) {
        var fId = festId || (typeof eventoActualId !== 'undefined' ? eventoActualId : null);
        tipo = TITULOS[tipo] ? tipo : 'ventas';
        if (tipo === 'completo' && typeof window.generarReportePDF === 'function') return window.generarReportePDF(fId);
        if (!fId) { mostrarToast('Elegí un evento para generar el reporte.', 'warning'); return; }
        if (typeof window.html2canvas !== 'function') { mostrarToast('No se pudo cargar la herramienta de imagen. Revisá la conexión y reintentá.', 'error'); return; }
        var esJpg = String(formato || 'png').toLowerCase() === 'jpg';
        var cont;
        try {
            cont = await renderizarNodo(armarHtml(fId, tipo));
            var canvas = await window.html2canvas(cont.querySelector('.rv'), { scale: 3, backgroundColor: '#ffffff', useCORS: true, logging: false });
            var blob = await new Promise(function (res) { canvas.toBlob(res, esJpg ? 'image/jpeg' : 'image/png', 0.92); });
            if (!blob) throw new Error('No se pudo generar la imagen');
            descargarBlob(blob, 'Reporte_' + tipo + '_' + limpiarNombreArchivo(infoDe(fId).nombre) + (esJpg ? '.jpg' : '.png'));
            mostrarToast(TITULOS[tipo] + ' descargado (' + (esJpg ? 'JPG' : 'PNG') + ')', 'success');
        } catch (e) {
            console.error('[Mandala] Error generando el ' + TITULOS[tipo].toLowerCase(), e);
            mostrarToast('No se pudo generar el ' + TITULOS[tipo].toLowerCase() + '.', 'error');
        } finally {
            if (cont) cont.remove();
        }
    };

    function descargarBlob(blob, nombre) {
        var url = URL.createObjectURL(blob);
        var a = document.createElement('a');
        a.href = url; a.download = nombre;
        document.body.appendChild(a); a.click(); a.remove();
        setTimeout(function () { URL.revokeObjectURL(url); }, 4000);
    }

    // ---------------------------------------------------------------
    // PDF (reporte completo): hojas A4, sin cortar tablas ni gráficos entre hojas
    // ---------------------------------------------------------------
    var promesaJsPDF = null;
    function cargarJsPDF() {
        if (window.jspdf && window.jspdf.jsPDF) return Promise.resolve(window.jspdf.jsPDF);
        if (!promesaJsPDF) {
            promesaJsPDF = new Promise(function (ok, mal) {
                var s = document.createElement('script');
                s.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
                s.onload = function () { (window.jspdf && window.jspdf.jsPDF) ? ok(window.jspdf.jsPDF) : mal(new Error('jsPDF no disponible')); };
                s.onerror = function () { promesaJsPDF = null; mal(new Error('No se pudo cargar jsPDF')); };
                document.head.appendChild(s);
            });
        }
        return promesaJsPDF;
    }

    // Reparte los bloques en hojas según su alto real
    async function paginar(fId, tipo) {
        var bloques = bloquesCuerpo(fId, tipo);
        var medir = await renderizarNodo('<style>' + CSS + '</style><div class="rv">' + cabecera(fId, tipo) + '<div class="medir">' + bloques.join('') + '</div>' + piePagina(fId, tipo, 'Hoja 1 de 1') + '</div>');
        var rv = medir.querySelector('.rv');
        var altoCab = rv.querySelector('.medir').offsetTop;
        var altoPie = rv.querySelector('.pie').offsetHeight + 18 + 28; // pie + margen + padding inferior
        var nodos = rv.querySelector('.medir').children;
        var altos = Array.prototype.map.call(nodos, function (n) {
            var cs = getComputedStyle(n);
            return n.offsetHeight + parseFloat(cs.marginTop || 0) + parseFloat(cs.marginBottom || 0);
        });
        var nuevas = Array.prototype.map.call(nodos, function (n) { return n.getAttribute('data-hoja-nueva') === '1'; });
        medir.remove();

        var disponible = ALTO_HOJA - altoCab - altoPie;
        var hojas = [[]], usado = 0;
        bloques.forEach(function (b, i) {
            // Un título de sección va con el bloque siguiente; las secciones nuevas empiezan hoja
            var alto = altos[i] + (nuevas[i] && altos[i + 1] ? altos[i + 1] : 0);
            if ((nuevas[i] && hojas[hojas.length - 1].length) || (usado + alto > disponible && hojas[hojas.length - 1].length)) {
                hojas.push([]); usado = 0;
            }
            hojas[hojas.length - 1].push(b);
            usado += altos[i];
        });
        return hojas;
    }

    window.generarReportePDF = async function (festId) {
        var fId = festId || (typeof eventoActualId !== 'undefined' ? eventoActualId : null);
        var tipo = 'completo';
        if (!fId) { mostrarToast('Elegí un evento para generar el reporte.', 'warning'); return; }
        if (typeof window.html2canvas !== 'function') { mostrarToast('No se pudo cargar la herramienta de imagen. Revisá la conexión y reintentá.', 'error'); return; }
        mostrarToast('Generando el reporte completo en PDF…', 'info');
        var conts = [];
        try {
            var JsPDF = await cargarJsPDF();
            var hojas = await paginar(fId, tipo);
            var pdf = new JsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4', compress: true });
            for (var i = 0; i < hojas.length; i++) {
                var html = '<style>' + CSS + '</style><div class="rv" style="height:' + ALTO_HOJA + 'px;display:flex;flex-direction:column">' + cabecera(fId, tipo) +
                    '<div style="flex:1 1 auto">' + hojas[i].join('') + '</div>' + piePagina(fId, tipo, 'Hoja ' + (i + 1) + ' de ' + hojas.length) + '</div>';
                var cont = await renderizarNodo(html);
                conts.push(cont);
                var canvas = await window.html2canvas(cont.querySelector('.rv'), { scale: 3, backgroundColor: '#ffffff', useCORS: true, logging: false, height: ALTO_HOJA, windowHeight: ALTO_HOJA });
                if (i > 0) pdf.addPage();
                var ancho = 210, alto = Math.min(297, canvas.height * ancho / canvas.width);
                pdf.addImage(canvas, 'PNG', 0, 0, ancho, alto, undefined, 'FAST'); // PNG a 3x: texto nítido, sin el desenfoque del JPEG
                cont.remove();
            }
            pdf.save('Reporte_completo_' + limpiarNombreArchivo(infoDe(fId).nombre) + '.pdf');
            mostrarToast('Reporte completo descargado (PDF, ' + hojas.length + (hojas.length === 1 ? ' hoja' : ' hojas') + ')', 'success');
        } catch (e) {
            console.error('[Mandala] Error generando el reporte completo en PDF', e);
            mostrarToast('No se pudo generar el PDF. Revisá la conexión y reintentá.', 'error');
        } finally {
            conts.forEach(function (c) { if (c && c.parentNode) c.remove(); });
        }
    };

    // ---------------------------------------------------------------
    // VISTA PREVIA: se muestra el reporte tal como saldrá y desde ahí se descarga
    // ---------------------------------------------------------------
    function htmlHoja(fId, tipo, hojas, i) {
        return '<style>' + CSS + '</style><div class="rv" style="height:' + ALTO_HOJA + 'px;display:flex;flex-direction:column">' + cabecera(fId, tipo) +
            '<div style="flex:1 1 auto">' + hojas[i].join('') + '</div>' + piePagina(fId, tipo, 'Hoja ' + (i + 1) + ' de ' + hojas.length) + '</div>';
    }

    window.cerrarVistaPreviaReporte = function () {
        var m = document.getElementById('rv-preview-overlay');
        if (m) m.remove();
        document.removeEventListener('keydown', teclaVistaPrevia);
    };
    function teclaVistaPrevia(e) { if (e.key === 'Escape') window.cerrarVistaPreviaReporte(); }

    window.vistaPreviaReporte = async function (festId, tipo) {
        var fId = festId || (typeof eventoActualId !== 'undefined' ? eventoActualId : null);
        tipo = TITULOS[tipo] ? tipo : 'ventas';
        if (!fId) { mostrarToast('Elegí un evento para generar el reporte.', 'warning'); return; }
        window.cerrarVistaPreviaReporte();

        var esPdf = tipo === 'completo';
        var btnBase = 'font:600 13px Inter,system-ui,sans-serif;padding:9px 16px;border-radius:8px;cursor:pointer;';
        var ov = document.createElement('div');
        ov.id = 'rv-preview-overlay';
        ov.style.cssText = 'position:fixed;inset:0;z-index:1000000;background:rgba(28,31,34,.55);display:flex;align-items:center;justify-content:center;padding:20px';
        ov.innerHTML =
            '<div style="background:#f7f5f0;border-radius:14px;box-shadow:0 20px 60px rgba(0,0,0,.35);width:min(920px,100%);max-height:100%;display:flex;flex-direction:column;overflow:hidden">' +
              '<div style="display:flex;align-items:center;justify-content:space-between;gap:12px;padding:14px 20px;background:#fff;border-bottom:1px solid #e4e0d6">' +
                '<h3 style="margin:0;font:700 17px Inter,system-ui,sans-serif;color:#1c1f22">Vista previa · ' + esc(TITULOS[tipo]) + '</h3>' +
                '<button type="button" data-rv="cerrar" style="' + btnBase + 'background:#fff;border:1px solid #d8d3c6;color:#1c1f22">✕ Cerrar</button>' +
              '</div>' +
              '<div id="rv-preview-cuerpo" style="flex:1 1 auto;overflow:auto;padding:20px;display:flex;flex-direction:column;align-items:center;gap:18px">' +
                '<div style="color:#6b6f73;font:500 13px Inter,system-ui,sans-serif;padding:40px 0">Preparando la vista previa…</div>' +
              '</div>' +
              '<div style="display:flex;justify-content:flex-end;gap:10px;padding:12px 20px;background:#fff;border-top:1px solid #e4e0d6">' +
                '<button type="button" data-rv="cerrar" style="' + btnBase + 'background:#fff;border:1px solid #d8d3c6;color:#1c1f22">Cerrar</button>' +
                '<button type="button" data-rv="descargar" style="' + btnBase + 'background:#0b6e7f;border:1px solid #0b6e7f;color:#fff">Descargar ' + (esPdf ? 'PDF' : 'imagen (PNG)') + '</button>' +
              '</div>' +
            '</div>';
        document.body.appendChild(ov);
        document.addEventListener('keydown', teclaVistaPrevia);
        ov.addEventListener('click', function (e) {
            if (e.target === ov) return window.cerrarVistaPreviaReporte();
            var b = e.target.closest && e.target.closest('[data-rv]');
            if (!b) return;
            if (b.getAttribute('data-rv') === 'cerrar') window.cerrarVistaPreviaReporte();
            else {
                window.cerrarVistaPreviaReporte();
                if (esPdf) window.generarReportePDF(fId); else window.generarReporteImagen(fId, tipo);
            }
        });

        try {
            var cuerpo = ov.querySelector('#rv-preview-cuerpo');
            var paginas = [];
            if (esPdf) {
                var hojas = await paginar(fId, tipo);
                for (var i = 0; i < hojas.length; i++) paginas.push(htmlHoja(fId, tipo, hojas, i));
            } else {
                paginas.push(armarHtml(fId, tipo));
            }
            if (!document.getElementById('rv-preview-overlay')) return; // se cerró mientras se preparaba
            // Ajusta el zoom al ancho disponible
            var disponible = cuerpo.clientWidth - 40;
            var zoom = Math.min(1, disponible / ANCHO);
            cuerpo.innerHTML = paginas.map(function (p) {
                return '<div style="zoom:' + zoom + ';background:#fff;box-shadow:0 2px 12px rgba(0,0,0,.18);border:1px solid #e4e0d6;flex:0 0 auto">' + p + '</div>';
            }).join('');
        } catch (e) {
            console.error('[Mandala] Error armando la vista previa', e);
            window.cerrarVistaPreviaReporte();
            mostrarToast('No se pudo armar la vista previa.', 'error');
        }
    };

    // Para pruebas y para Estadísticas
    window.armarHtmlReporte = armarHtml;
    window.datosGraficosEvento = datosGraficosEvento;
    window.paginarReporte = paginar;

    // Compatibilidad con los nombres anteriores
    window.generarReporteVentasImagen = function (festId, formato) { return window.generarReporteImagen(festId, 'ventas', formato); };
    window.generarReporteVentasPDF = window.generarReporteVentasImagen;
})();
