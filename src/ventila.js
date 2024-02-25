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
function sum_vec(vec1, vec2) {
  return _.map(_.zip(vec1, vec2), function (p) {
    return parseFloat(p[0]) + parseFloat(p[1]);
  });
}

// Producto (Hadamard), o elemento a elemento, de dos vectores. hadamard([1, 2], [3, 4]) -> [3, 8]
function hadamard(vec1, vec2) {
  return _.map(_.zip(vec1, vec2), function (p) {
    return parseFloat(p[0]) * parseFloat(p[1]);
  });
}

// Producto vectorial
function dot(vec1, vec2) {
  return _.sum(hadamard(vec1, vec2));
}

// Funciones principales -------------------------------------------------------

const form_fields = [
  "nombretipo",
  "numtipo",
  "suptipo",
  "altura",
  "supcomun",
  "numdormitorios",
  "numestar",
  "numlochum",
  "numbanos",
  "supcocina",
];

// Limpia entradas del formulario con valores por defecto
export function resetform_fields() {
  form_fields.map((e) => {
    const elem = document.getElementById(e);
    const reset_value = elem.getAttribute("type") === "text" ? "-" : 0;
    elem.value = reset_value;
  });
}

// Traslada valores del formulario a fila de la tabla de tipos
export function fields2row() {
  const m = Object.fromEntries(
    form_fields.map((e) => [e, document.getElementById(e).value])
  );

  // Prueba para sustituir template
  const res = `<tr>
  <td>${m.nombretipo}</td>
  <td>${m.numtipo}</td>
  <td class="m2">${m.suptipo}</td>
  <td class="m">${m.altura}</td>
  <td class="m2">${m.supcomun}</td>
  <td>${m.numdormitorios}</td>
  <td>${m.numestar}</td>
  <td>${m.numlochum}</td>
  <td>${m.numbanos}</td>
  <td class="m2">${m.supcocina}</td>
</tr>`;
  return res;
}

// Convierte fila de datos a objeto
export function row2data(row) {
  console.log("row", row);

  // const res = {};
  // for (const [i, cell] of row.cells.entries()) {
  //     console.log(form_fields[i], cell)
  // }

  //TODO: A ver si conseguimos eliminar esto
  return _.reduce(
    $(row).find("td"),
    function (accum, value, index) {
      var field = form_fields[index];
      var val = $(value).text();
      var istextfield = $("#" + field).attr("type") === "text" ? true : false;
      val = istextfield ? val : parseFloat(val);
      accum[field] = val;
      return accum;
    },
    {}
  );
}

// Actualiza totales en la tabla
export function update() {
  // const data_tbody = document.querySelector("#locales tbody");
  // const data_rows = data_tbody.querySelectorAll("tr");
  // const data_new = [...data_rows].map((row) => {
  //   console.log("data_row", row);
  //   row2data(row);
  // });

  const rows = document.querySelectorAll("#locales tbody tr");
  const data = Array.from(rows).map(row2data)

  const anumtipos = data.map((i) => i.numtipo);

  const asuptipos = hadamard(
    anumtipos,
    data.map((i) => i.suptipo)
  );
  const asupcomun = hadamard(
    anumtipos,
    data.map((i) => supcomun)
  );

  const numdormitorios = dot(
    anumtipos,
    data.map((i) => numdormitorios)
  );
  const numestar = dot(
    anumtipos,
    data.map((i) => numestar)
  );
  const numlochum = dot(
    anumtipos,
    data.map((i) => numlochum)
  );
  const numbanos = dot(
    anumtipos,
    data.map((i) => numbanos)
  );
  const supcocina = dot(
    anumtipos,
    data.map((i) => supcocina)
  );

  const suptipos = asuptipos.reduce((acc, val) => acc+val, 0);
  const supcomunes = asupcomun.reduce((acc, val) => acc+val, 0);
  let altmedia =
    dot(
      sum_vec(asuptipos, asupcomun),
      data.map((i) => altura)
    ) /
    (suptipos + supcomunes);
  altmedia = isNaN(altmedia) ? 0 : altmedia;
  const voledif = altmedia * (suptipos + supcomunes);

  document.querySelector("#voledif").value = voledif;
  document.querySelector("#totnumtipo").textContent = anumtipos.reduce(
    (acc, val) => acc + val,
    0
  );
  document.querySelector("#totsuptipo").textContent =
    Math.round(suptipos * 100) / 100;
  document.querySelector("#totaltura").textContent =
    Math.round(altmedia * 100) / 100;
  document.querySelector("#totsupcomun").textContent =
    Math.round(supcomunes * 100) / 100;
  document.querySelector("#totnumdormitorios").textContent = numdormitorios;
  document.querySelector("#totnumestar").textContent = numestar;
  document.querySelector("#totnumlochum").textContent = numlochum;
  document.querySelector("#totnumbanos").textContent = numbanos;
  document.querySelector("#totsupcocina").textContent =
    Math.round(supcocina * 100) / 100;

  let vol2009 = ventila2009(data);
  let renh2009 = (3.6 * vol2009) / voledif;
  renh2009 = isNaN(renh2009) ? "-" : Math.round(renh2009 * 100) / 100;
  $("#vol2009").text(Math.round(vol2009));
  $("#renh2009").text(renh2009);

  let vol2015 = ventila2015(data);
  let renh2015 = (3.6 * vol2015) / voledif;
  renh2015 = isNaN(renh2015) ? "-" : Math.round(renh2015 * 100) / 100;
  $("#vol2015").text(Math.round(vol2015));
  $("#renh2015").text(renh2015);
}

function ventila2009(data) {
  function procesatipo2009(row) {
    return (
      row.numtipo *
      (Math.max(
        3 * row.numestar + 5 * Math.min(1 + row.numdormitorios, 4), // admisión
        15 * row.numbanos + 2 * row.supcocina
      ) + // extracción
        0.35 * row.supcomun)
    );
  }
  return data.map(procesatipo2009).reduce((acc, val)=> acc + val, 0); // l/s
}

function ventila2015(data) {
  function procesatipo2015(row) {
    const vol1 =
      8 +
      4 * Math.max(row.numdormitorios - 1, 0) +
      row.numestar * Math.min(4 + 2 * row.numdormitorios, 10);
    const vol2 = Math.min(12 * row.numdormitorios, 33);
    const vol3 = row.numlochum * Math.min(5 + row.numdormitorios, 8);
    const volminextr = Math.max(vol2, vol3);
    const volminextrloc = Math.max(vol1, volminextr);
    return row.numtipo * (volminextrloc + 0.35 * row.supcomun);
  }
  return data.map(procesatipo2015).reduce((acc, val)=> acc + val, 0); // l/s
}

// Eventos de la interfaz -------------------------------------------------------

// Seleccionar fila al pulsar
// "on" actúa sobre elementos actuales o futuros (click, no)
document.querySelector("#locales > tbody > tr").addEventListener(
  "click",
  // Establece fila activa y traslada valores al formulario
  (e) => {
    document
      .querySelector("#locales > tbody > tr.active")
      .classList.remove("active");
    e.target.classList.add("active");
    // Traslada valores de la fila seleccionada al formulario
    _.map(row2data($(e.target.data)), function (value, key) {
      $("#" + key).val(value);
    });
    update();
  }
);

// Añadir fila y seleccionarla
document.querySelector("button#add").addEventListener("click", (e) => {
  const last_row = document.querySelector("#locales > tbody tr:last-child");
  last_row.after(fields2row()).next().dispatchEvent(new Event("click"));
});

// Eliminar fila y seleccionar otra
$("button#remove").click(function (e) {
  const activerow = document.querySelector("#locales > tbody > tr.active");
  const nextrow = activerow.next();
  const targetrow = nextrow.length ? nextrow : activerow.prev();
  activerow.remove();
  targetrow.dispatchEvent(new Event("click"));
});

// Modificar fila
document.querySelector("button#modify").addEventListener("click", (e) => {
  const newrow = $(fields2row()).addClass("active");
  document.querySelector("#locales > tbody tr.active").replaceWith(newrow);
  newrow.dispatchEvent(new Event("click"));
});

// Eliminar todas las filas y dejar una en blanco
document.querySelector("button#clean").addEventListener("click", (e) => {
  document.querySelector("#locales > tbody tr").remove();
  resetform_fields();
  const newrow = $(fields2row());
  document.querySelector("#locales > tbody").append(newrow);
  newrow.dispatchEvent(new Event("click"));
});

// Seleccionar fila activa
document
  .querySelector("#locales > tbody > tr.active")
  .dispatchEvent(new Event("click"));
