// =======================================================================
// src/ui/reporteVentas.js — Reporte de ventas de un evento en PDF (script clásico)
// Muestra ventas comunes, ventas especiales y el ingreso neto de la escuela.
// NO incluye gastos ni cobertura. Usa jsPDF + autoTable (se cargan desde cdnjs en index.html).
// Usa el mismo cálculo que Finanzas (calcularTaquillaFestival) para que los números coincidan.
// =======================================================================
(function () {
    'use strict';

    var TEAL = [0, 123, 143], TEAL_OSC = [0, 97, 115], TEAL_CLARO = [232, 244, 246];
    var INK = [28, 31, 34], INK2 = [75, 81, 89], INK3 = [138, 144, 151];
    var CREMA = [250, 248, 243], LINEA = [236, 230, 220], ROJO = [178, 64, 43];

    function ars(n) {
        var v = Math.round(Number(n) || 0);
        var s = Math.abs(v).toLocaleString('es-AR');
        return (v < 0 ? '- $ ' : '$ ') + s;
    }
    function limpiarNombreArchivo(t) {
        return String(t || 'evento').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-zA-Z0-9]+/g, '_').replace(/^_+|_+$/g, '');
    }
    // jsPDF con fuentes estándar: se evitan caracteres fuera de Latin-1
    function txt(t) {
        return String(t == null ? '' : t).replace(/[−–—]/g, '-').replace(/[^\u0000-ÿ]/g, '');
    }

    window.generarReporteVentasPDF = function (festId) {
        var fId = festId || (typeof eventoActualId !== 'undefined' ? eventoActualId : null);
        if (!fId) { mostrarToast('Elegí un evento para generar el reporte.', 'warning'); return; }
        var jsPDFCtor = window.jspdf && window.jspdf.jsPDF;
        if (!jsPDFCtor) { mostrarToast('No se pudo cargar la librería de PDF. Revisá la conexión y reintentá.', 'error'); return; }

        var info = (typeof infoFestivales !== 'undefined' && infoFestivales[fId]) ? infoFestivales[fId] : {};
        var fin = (typeof ingresosFestivalesDB !== 'undefined' && ingresosFestivalesDB[fId]) ? ingresosFestivalesDB[fId] : {};
        var ent = (typeof entradasFestivales !== 'undefined' && entradasFestivales[fId]) ? entradasFestivales[fId] : (typeof preciosEntradasPorDefecto !== 'undefined' ? preciosEntradasPorDefecto : {});
        var taq = calcularTaquillaFestival(fId, fin, ent);
        var acuerdo = taq.acuerdo || {};

        var pPrev = Number(ent.preventa) || 0, pGen = Number(ent.general) || precioGeneralVigente(), pPue = Number(ent.puerta) || 0;
        var filasComunes = [
            ['Preventa', ars(pPrev), String(taq.cantPreventa), ars(taq.cantPreventa * pPrev)],
            ['General', ars(pGen), String(taq.cantGeneral), ars(taq.cantGeneral * pGen)],
            ['Puerta', ars(pPue), String(taq.cantPuerta), ars(taq.cantPuerta * pPue)]
        ];
        (fin.categoriasExtra || []).forEach(function (c) {
            var cant = Math.max(0, parseInt(c.cantidad || 0, 10) || 0), pr = Math.max(0, parseFloat(c.precio || 0) || 0);
            if (cant > 0) filasComunes.push([txt(c.nombre || 'Entrada especial'), ars(pr), String(cant), ars(cant * pr)]);
        });
        if (taq.usaBrutoHistorico) filasComunes = [['Taquilla (total cargado)', '-', '-', ars(taq.brutoTaquilla)]];

        var especiales = (fin.ventasEspeciales || []).map(function (v) {
            var tipo = v.tipoVenta || 'Promo 2x1';
            var cant = v.cantEntradas !== undefined ? v.cantEntradas : (tipo === 'Promo 2x1' ? 2 : 1);
            var monto = Math.max(0, parseFloat(v.monto || 0) || 0);
            return [txt(v.comprador || '-'), txt(tipo), String(cant), txt(v.metodo || '-'), txt(v.cobradoPor || '-'), monto ? ars(monto) : 'Sin cargo'];
        });

        var doc = new jsPDFCtor({ unit: 'mm', format: 'a4' });
        var W = 210, M = 16, y = 16;

        // Cabecera
        doc.setFont('helvetica', 'bold'); doc.setFontSize(17); doc.setTextColor.apply(doc, TEAL_OSC);
        doc.text('Mandala Ensambles', M, y + 4);
        doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.setTextColor.apply(doc, INK3);
        doc.text('Festivales & Eventos', M, y + 9);
        doc.setFont('helvetica', 'bold'); doc.setFontSize(14); doc.setTextColor.apply(doc, INK);
        doc.text('Reporte de ventas', W - M, y + 4, { align: 'right' });
        doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.setTextColor.apply(doc, INK3);
        var hoy = new Date();
        doc.text('Emitido el ' + hoy.toLocaleDateString('es-AR'), W - M, y + 9, { align: 'right' });
        doc.setDrawColor.apply(doc, TEAL); doc.setLineWidth(0.9); doc.line(M, y + 12, W - M, y + 12);
        y += 22;

        // Evento
        doc.setFont('helvetica', 'bold'); doc.setFontSize(17); doc.setTextColor.apply(doc, INK);
        doc.text(txt(info.nombre || 'Evento'), M, y);
        y += 6;
        var nombrePF = window.NOMBRE_PAGO_FIJO || 'Monto fijo';
        var acuerdoTxt = acuerdo.esAlquiler
            ? nombrePF
            : (acuerdo.porcFinal === 100 ? '100% Escuela' : (acuerdo.porcFinal != null ? acuerdo.porcFinal + '% Escuela / ' + (100 - acuerdo.porcFinal) + '% Venue' : 'A definir'));
        doc.setFont('helvetica', 'normal'); doc.setFontSize(9.5); doc.setTextColor.apply(doc, INK2);
        doc.text(txt([info.fecha, info.venue ? 'Venue: ' + info.venue : '', 'Acuerdo: ' + acuerdoTxt].filter(Boolean).join('   |   ')), M, y);
        y += 8;

        // Tarjetas resumen
        var cantTotal = taq.cantTaquilla + taq.cantVentasEspeciales;
        var neto = taq.recaudacionEntradas;
        var cards = [
            { t: 'ENTRADAS VENDIDAS', v: String(cantTotal), s: taq.cantTaquilla + ' comunes - ' + taq.cantVentasEspeciales + ' especiales', fondo: CREMA, borde: LINEA, col: INK },
            { t: 'VENTAS BRUTAS', v: ars(taq.brutoTotal), s: 'taquilla + especiales', fondo: CREMA, borde: LINEA, col: INK },
            { t: 'INGRESO NETO DEL EVENTO', v: ars(neto), s: 'lo que le queda a la escuela', fondo: TEAL_CLARO, borde: TEAL, col: TEAL_OSC }
        ];
        var cw = (W - 2 * M - 2 * 4) / 3;
        cards.forEach(function (c, i) {
            var x = M + i * (cw + 4);
            doc.setFillColor.apply(doc, c.fondo); doc.setDrawColor.apply(doc, c.borde); doc.setLineWidth(0.3);
            doc.roundedRect(x, y, cw, 22, 2, 2, 'FD');
            doc.setFont('helvetica', 'bold'); doc.setFontSize(7); doc.setTextColor.apply(doc, INK3);
            doc.text(c.t, x + 4, y + 6);
            doc.setFontSize(13); doc.setTextColor.apply(doc, c.col);
            doc.text(c.v, x + 4, y + 13.5);
            doc.setFont('helvetica', 'normal'); doc.setFontSize(7); doc.setTextColor.apply(doc, INK3);
            doc.text(c.s, x + 4, y + 18.5);
        });
        y += 30;

        var estiloTabla = {
            theme: 'plain', margin: { left: M, right: M },
            styles: { font: 'helvetica', fontSize: 9, cellPadding: { top: 2, bottom: 2, left: 2.5, right: 2.5 }, textColor: INK, lineColor: LINEA, lineWidth: { bottom: 0.2 } },
            headStyles: { fillColor: CREMA, textColor: INK3, fontStyle: 'bold', fontSize: 7.5, lineColor: LINEA, lineWidth: { bottom: 0.3 } },
            footStyles: { fillColor: CREMA, textColor: INK, fontStyle: 'bold', lineWidth: 0 }
        };
        function titulo(t) {
            doc.setFont('helvetica', 'bold'); doc.setFontSize(9.5); doc.setTextColor.apply(doc, INK2);
            doc.text(t.toUpperCase(), M, y);
            y += 2.5;
        }

        titulo('Ventas comunes');
        doc.autoTable(Object.assign({}, estiloTabla, {
            startY: y,
            head: [['TIPO DE ENTRADA', 'PRECIO', 'CANTIDAD', 'SUBTOTAL']],
            body: filasComunes,
            foot: [['Total taquilla', '', String(taq.cantTaquilla), ars(taq.brutoTaquilla)]],
            columnStyles: { 1: { halign: 'right' }, 2: { halign: 'center' }, 3: { halign: 'right' } },
            didParseCell: function (d) { if (d.section === 'head' && (d.column.index === 1 || d.column.index === 3)) d.cell.styles.halign = 'right'; if (d.section === 'head' && d.column.index === 2) d.cell.styles.halign = 'center'; if (d.section === 'foot') { if (d.column.index === 3) d.cell.styles.halign = 'right'; if (d.column.index === 2) d.cell.styles.halign = 'center'; } }
        }));
        y = doc.lastAutoTable.finalY + 8;

        titulo('Ventas especiales');
        doc.autoTable(Object.assign({}, estiloTabla, {
            startY: y,
            head: [['COMPRADOR', 'TIPO DE VENTA', 'ENTRADAS', 'METODO DE PAGO', 'COBRO', 'VALOR']],
            body: especiales.length ? especiales : [['No hay ventas especiales registradas', '', '', '', '', '']],
            foot: [['Total ventas especiales', '', String(taq.cantVentasEspeciales), '', '', ars(taq.totVentasEspeciales)]],
            columnStyles: { 2: { halign: 'center' }, 5: { halign: 'right' } },
            didParseCell: function (d) { if (d.section !== 'body' && d.column.index === 5) d.cell.styles.halign = 'right'; if (d.section !== 'body' && d.column.index === 2) d.cell.styles.halign = 'center'; }
        }));
        y = doc.lastAutoTable.finalY + 8;

        // Cómo se llega al ingreso neto
        if (y > 215) { doc.addPage(); y = 20; }
        titulo('Como se llega al ingreso neto');
        var calc = [['Taquilla bruta', ars(taq.brutoTaquilla)]];
        var s = taq.sadaicRes || {};
        if (!s.omitido) calc.push(['SADAIC (' + txt(s.descripcion || '') + ')', '- ' + ars(taq.montoSadaic)]);
        if (taq.esAlquiler) calc.push([nombrePF + ' acordado', '- ' + ars(taq.alquilerSala)]);
        else calc.push(['Parte del venue (' + Math.max(0, 100 - taq.porcEscuela) + '% de ' + ars(taq.basePostSadaic) + ')', '- ' + ars(taq.basePostSadaic - taq.netoEscuelaOnline)]);
        var hayAlquilerConSena = taq.esAlquiler && taq.senaVenue > 0;
        calc.push(['Ventas especiales (100% de la escuela)', '+ ' + ars(taq.totVentasEspeciales)]);
        doc.autoTable(Object.assign({}, estiloTabla, {
            startY: y,
            body: calc,
            foot: [['Ingreso neto del evento', ars(neto)]],
            columnStyles: { 1: { halign: 'right' } },
            footStyles: { fillColor: TEAL_CLARO, textColor: TEAL_OSC, fontStyle: 'bold', fontSize: 11, cellPadding: { top: 3, bottom: 3, left: 2.5, right: 2.5 } },
            didParseCell: function (d) { if (d.section === 'foot' && d.column.index === 1) d.cell.styles.halign = 'right'; if (d.section === 'body' && d.column.index === 1 && /^- /.test(String(d.cell.raw))) d.cell.styles.textColor = ROJO; }
        }));
        y = doc.lastAutoTable.finalY + 8;

        // Pago al venue: solo si hay alquiler de sala con seña (informativo; el alquiler ya está descontado arriba)
        if (hayAlquilerConSena) {
            if (y > 235) { doc.addPage(); y = 20; }
            titulo('Pago al venue (' + nombrePF.toLowerCase() + ')');
            doc.autoTable(Object.assign({}, estiloTabla, {
                startY: y,
                body: [
                    [nombrePF + ' acordado', ars(taq.alquilerSala)],
                    ['Seña ya pagada para reservar', '- ' + ars(taq.senaVenue)]
                ],
                foot: [['Saldo pagado al venue el dia del festival', ars(taq.saldoVenue)]],
                columnStyles: { 1: { halign: 'right' } },
                didParseCell: function (d) { if (d.section === 'foot' && d.column.index === 1) d.cell.styles.halign = 'right'; if (d.section === 'body' && d.column.index === 1 && /^- /.test(String(d.cell.raw))) d.cell.styles.textColor = ROJO; }
            }));
            y = doc.lastAutoTable.finalY + 6;
        }
        doc.setFont('helvetica', 'italic'); doc.setFontSize(8); doc.setTextColor.apply(doc, INK3);
        doc.text('Este reporte muestra solo ingresos. No incluye gastos del evento ni la cobertura audiovisual.', M, y);

        // Pie con numeración
        var n = doc.getNumberOfPages();
        for (var p = 1; p <= n; p++) {
            doc.setPage(p);
            doc.setDrawColor.apply(doc, LINEA); doc.setLineWidth(0.3); doc.line(M, 285, W - M, 285);
            doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.setTextColor.apply(doc, INK3);
            doc.text('Mandala Festivales', M, 290);
            doc.text(txt((info.nombre || 'Evento') + ' - Reporte de ventas'), W / 2, 290, { align: 'center' });
            doc.text('Pagina ' + p + ' de ' + n, W - M, 290, { align: 'right' });
        }

        doc.save('Reporte_ventas_' + limpiarNombreArchivo(info.nombre) + '.pdf');
        mostrarToast('Reporte de ventas descargado', 'success');
    };
})();
