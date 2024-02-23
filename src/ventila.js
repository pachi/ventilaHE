/*
* Ventilación HE
*
* Cálculo de la ventilación global de edificios de vivienda
* para la modelización energética
*
* http://www.codigotecnico.org
*
* Copyright (c) 2015 - Rafael Villar Burke, Daniel Jiménez González
*
* Licensed under the MIT license:
*   http://www.opensource.org/licenses/mit-license.php
*
*/

// Funciones auxiliares -------------------------------------------------------

// Suma vectorial
function sumvec (vec1, vec2) {return _.map(_.zip(vec1, vec2), function (p) {return parseFloat(p[0]) + parseFloat(p[1])});}

// Producto (Hadamard), o elemento a elemento, de dos vectores. hadamard([1, 2], [3, 4]) -> [3, 8]
function hadamard (vec1, vec2) {return _.map(_.zip(vec1, vec2), function (p) {return parseFloat(p[0])*parseFloat(p[1])});}

// Producto vectorial
function dot (vec1, vec2) {return _.sum(hadamard(vec1, vec2));}

// Funciones principales -------------------------------------------------------

var formfields = ["nombretipo", "numtipo", "suptipo", "altura", "supcomun", "numdormitorios", "numestar", "numlochum", "numbanos", "supcocina"];
var _rowtempl = _.template('<tr><td><%= nombretipo %></td><td><%= numtipo %></td><td class="m2"><%= suptipo %></td><td class="m"><%= altura %></td><td class="m2"><%= supcomun %></td><td><%= numdormitorios %></td><td><%= numestar %></td><td><%= numlochum %></td><td><%= numbanos %></td><td class="m2"><%= supcocina %></td></tr>');

// Limpia entradas del formulario con valores por defecto
function resetformfields() {
    _.map(formfields,
          function (field) {
              var input = $('#'+ field);
              input.val((input.attr('type') === 'text') ? "-": 0);
          });
}

// Traslada valores del formulario a fila de la tabla de tipos
function fields2row() {
    obj = _.reduce(formfields,
                   function (accum, value) {accum[value] = $('#'+ value).val(); return accum},
                   {});
    return _rowtempl(obj);
}

// Convierte fila de datos a objeto
function row2data (row) {
    return _.reduce($(row).find("td"),
                    function (accum, value, index) {
                        var field = formfields[index];
                        var val = $(value).text();
                        var istextfield = ($('#'+ field).attr('type') === 'text') ? true: false;
                        val = istextfield ? val: parseFloat(val);
                        accum[field] = val;
                        return accum;},
                    {});
}

// Actualiza totales en la tabla
function update () {
    data = _.map($("#locales tbody").find("tr"), row2data);

    var anumtipos = _.pluck(data, 'numtipo');

    var asuptipos = hadamard(anumtipos, _.pluck(data, 'suptipo')),
        asupcomun = hadamard(anumtipos, _.pluck(data, 'supcomun'));

    var numdormitorios = dot(anumtipos, _.pluck(data, 'numdormitorios')),
        numestar = dot(anumtipos, _.pluck(data, 'numestar')),
        numlochum = dot(anumtipos, _.pluck(data, 'numlochum')),
        numbanos = dot(anumtipos, _.pluck(data, 'numbanos')),
        supcocina = dot(anumtipos, _.pluck(data, 'supcocina'));

    var suptipos = _.sum(asuptipos);
    var supcomunes = _.sum(asupcomun);
    var altmedia = dot(sumvec(asuptipos, asupcomun),
                       _.pluck(data, 'altura')) / (suptipos + supcomunes);
    altmedia = isNaN(altmedia)? 0: altmedia;
    var voledif = altmedia * (suptipos + supcomunes)

    $("#voledif").val(voledif);
    $("#totnumtipo").text(_.sum(anumtipos));
    $("#totsuptipo").text(Math.round(suptipos *100) / 100);
    $("#totaltura").text(Math.round(altmedia * 100) / 100);
    $("#totsupcomun").text(Math.round(supcomunes * 100) / 100);
    $("#totnumdormitorios").text(numdormitorios);
    $("#totnumestar").text(numestar);
    $("#totnumlochum").text(numlochum);
    $("#totnumbanos").text(numbanos);
    $("#totsupcocina").text(Math.round(supcocina * 100) / 100);

    var vol2009 = ventila2009();
    var renh2009 = 3.6 * vol2009 / voledif;
    renh2009 = isNaN(renh2009)? "-": Math.round(renh2009 * 100) / 100;
    $("#vol2009").text(Math.round(vol2009));
    $("#renh2009").text(renh2009);

    var vol2015 = ventila2015();
    var renh2015 = 3.6 * vol2015 / voledif;
    renh2015 = isNaN(renh2015)? "-": Math.round(renh2015 * 100) / 100;
    $("#vol2015").text(Math.round(vol2015));
    $("#renh2015").text(renh2015);
}

function ventila2009 () {
    function procesatipo2009 (row) {
        return row.numtipo * (Math.max ((3 * row.numestar +
                                         5 * Math.min(1 + row.numdormitorios, 4)), // admisión
                                        (15 * row.numbanos +
                                         2 * row.supcocina)) // extracción
                              + 0.35 * row.supcomun);
    }
    return _.sum(_.map(data, procesatipo2009)); // l/s
}


function ventila2015 () {
    function procesatipo2015 (row) {
        var vol1 = 8 + 4 * Math.max(row.numdormitorios - 1, 0) + row.numestar * Math.min(4 + 2 * row.numdormitorios, 10);
        var vol2 = Math.min(12 * row.numdormitorios, 33);
        var vol3 = row.numlochum * Math.min(5 + row.numdormitorios, 8);
        var volminextr = Math.max(vol2, vol3);
        var volminextrloc = Math.max(vol1, volminextr);
        return row.numtipo * (volminextrloc + 0.35 * row.supcomun);
    }
    return _.sum(_.map(data, procesatipo2015)); // l/s
}

// Eventos de la interfaz -------------------------------------------------------

// Seleccionar fila al pulsar
// "on" actúa sobre elementos actuales o futuros (click, no)
$("#locales > tbody").on("click", "tr",
                       // Establece fila activa y traslada valores al formulario
                       function (e) {
                           $("#locales > tbody > tr.active").removeClass("active");
                           $(this).addClass("active");
                           // Traslada valores de la fila seleccionada al formulario
                           _.map(row2data ($(this)),
                                 function (value, key) {$('#' + key).val(value);});
                           update();
                       });

// Añadir fila y seleccionarla
$("button#add").click(function (e) {
    $("#locales > tbody tr:last").after(fields2row()).next().click();
});

// Eliminar fila y seleccionar otra
$("button#remove").click(function (e) {
    var activerow = $("#locales > tbody > tr.active");
    var nextrow = activerow.next();
    var targetrow = nextrow.length ? nextrow: activerow.prev();
    activerow.remove();
    targetrow.click();
});

// Modificar fila
$("button#modify").click(function (e) {
    var newrow = $(fields2row()).addClass('active');
    $("#locales > tbody tr.active").replaceWith(newrow);
    newrow.click();
});

// Eliminar todas las filas y dejar una en blanco
$("button#clean").click(function (e) {
    $("#locales").find("tbody tr").remove();
    resetformfields();
    newrow = $(fields2row());
    $("#locales").find("tbody").append(newrow);
    newrow.click();
});

// Seleccionar fila activa
$("#locales > tbody > tr.active").click();
