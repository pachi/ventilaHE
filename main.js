//
// Ventilación HE
//
// Cálculo de la ventilación global de edificios de vivienda
// para la modelización energética
//
// http://www.codigotecnico.org
//
// Copyright (c) 2015 - 2024 Rafael Villar Burke, Daniel Jiménez González, Marta Sorribes Gil
//
// Licensed under the MIT license:
//   http://www.opensource.org/licenses/mit-license.php
//
//

import './style.css'

// Funciones auxiliares -------------------------------------------------------

// Suma vectorial
function sum_vec(vec1, vec2) {
  return vec1.map((val, idx) => parseFloat(val) + parseFloat(vec2[idx]));
}

// Producto (Hadamard), o elemento a elemento, de dos vectores. hadamard([1, 2], [3, 4]) -> [3, 8]
function hadamard(vec1, vec2) {
  return vec1.map((val, idx) => parseFloat(val) * parseFloat(vec2[idx]));
}

// Producto vectorial
function dot(vec1, vec2) {
  return hadamard(vec1, vec2).reduce((acc, val) => acc + val,  0);
}

// Funciones principales -------------------------------------------------------
const FORM_FIELDS = [
  { id: 'nombretipo', className: '' },
  { id: 'numtipo', className: '' },
  { id: 'suptipo', className: 'm2' },
  { id: 'altura', className: 'm' },
  { id: 'supcomun', className: 'm2' },
  { id: 'numdormitorios', className: '' },
  { id: 'numestar', className: '' },
  { id: 'numlochum', className: '' },
  { id: 'numbanos', className: '' },
  { id: 'supcocina', className: 'm2' },
];

// Limpia entradas del formulario con valores por defecto
export function reset_form_fields() {
  FORM_FIELDS.map((e) => {
    const elem = document.getElementById(e.id);
    const reset_value = elem.getAttribute("type") === "text" ? "-" : 0;
    elem.value = reset_value;
  });
}

// Traslada valores del formulario a fila de la tabla de tipos
export function fields2row() {
  const m = Object.fromEntries(
    FORM_FIELDS.map((e) => [e.id, document.getElementById(e.id).value])
  );

  // Create the table row element
  const tr = document.createElement('tr');

  FORM_FIELDS.forEach(({id, className}) => {
    const td = document.createElement('td');
    if (className) {
      td.className = className;
    }
    td.textContent = m[id];
    tr.appendChild(td);
  })

  return tr;
}

// Convierte fila de datos a objeto
export function row2data(row) {
  return [...row.cells].reduce((acc, cell, index) => {
    const id = FORM_FIELDS[index].id;
    let val = cell.textContent;
    const isTextField = document.getElementById(id).getAttribute("type") === "text";
    val = isTextField ? val : parseFloat(val);
    acc[id] = val;
    return acc;
  }, {});
}

// Actualiza elementos de la interfaz usando sus IDs
function updateElements(id2ValueMap) {
  for (const id in id2ValueMap) {
    if (id2ValueMap.hasOwnProperty(id)) {
      const element = document.getElementById(id);
      if (element) {
        // Check if the element is an input or other elements that use value
        if (element.tagName === 'INPUT' || element.tagName === 'SELECT' || element.tagName === 'TEXTAREA') {
          element.value = id2ValueMap[id];
        } else {
          // For other elements like div, span, etc., use textContent
          element.textContent = id2ValueMap[id];
        }
      }
    }
  }
}

// Actualiza totales en la tabla
export function update() {
  const rows = document.querySelectorAll("#locales tbody tr");
  const data = Array.from(rows).map(row2data)

  const numtipos_lst = data.map((i) => i.numtipo);

  const suptipos_lst = hadamard(numtipos_lst, data.map((i) => i.suptipo));
  const supcomun_lst = hadamard(numtipos_lst, data.map((i) => i.supcomun));
  
  const voledif = dot(sum_vec(suptipos_lst, supcomun_lst), data.map((i) => i.altura));
  const suptipos = suptipos_lst.reduce((acc, val) => acc+val, 0);
  const supcomunes = supcomun_lst.reduce((acc, val) => acc+val, 0);
  const totsup = suptipos + supcomunes
  const vol2009 = ventila2009(data);
  const vol2017 = ventila2017(data);
  
  const values = {
    voledif,
    totnumtipo: numtipos_lst.reduce((acc, val) => acc + val, 0),
    totsuptipo: Math.round(suptipos * 100) / 100,
    totaltura: totsup ? Math.round(100 * voledif / totsup) / 100 : 0,
    totsupcomun: Math.round(supcomunes * 100) / 100,
    totnumdormitorios: dot(numtipos_lst, data.map((i) => i.numdormitorios)),
    totnumestar: dot(numtipos_lst, data.map((i) => i.numestar)),
    totnumlochum: dot(numtipos_lst, data.map((i) => i.numlochum)),
    totnumbanos: dot(numtipos_lst, data.map((i) => i.numbanos)),
    totsupcocina: Math.round(dot(numtipos_lst, data.map((i) => i.supcocina)) * 100) / 10,
    vol2009: Math.round(vol2009),
    renh2009: voledif ? Math.round(100 * (3.6 * vol2009) / voledif) / 100: "-",
    vol2017: Math.round(vol2017),
    renh2017: voledif ? Math.round(100 * (3.6 * vol2017) / voledif) / 100: "-",
  }

  updateElements(values);
}

// Calcula suma de caudales para HS3-2009, l/s
function ventila2009(data) {
  function procesa_tipo_2009(row) {
    return (
      row.numtipo *
      (Math.max(
        3 * row.numestar + 5 * Math.min(1 + row.numdormitorios, 4), // admisión
        15 * row.numbanos + 2 * row.supcocina // extracción
      ) +
        0.35 * row.supcomun)
    );
  }
  return data.map(procesa_tipo_2009).reduce((acc, val)=> acc + val, 0); // l/s
}

// Calcula suma de caudales para HS3 revisado, l/s
function ventila2017(data) {
  function procesa_tipo_2017(row) {
    const vol1 =
      8 +
      4 * Math.max(row.numdormitorios - 1, 0) +
      row.numestar * Math.min(4 + 2 * row.numdormitorios, 10);
    const vol2 = Math.min(12 * row.numdormitorios, 33);
    const vol3 = row.numlochum * Math.min(5 + row.numdormitorios, 8);
    const vol_min_extr = Math.max(vol2, vol3);
    const vol_min_extr_loc = Math.max(vol1, vol_min_extr);
    return row.numtipo * (vol_min_extr_loc + 0.35 * row.supcomun);
  }
  return data.map(procesa_tipo_2017).reduce((acc, val)=> acc + val, 0); // l/s
}

// Eventos de la interfaz -------------------------------------------------------


// Establece fila activa y traslada valores al formulario
function select_and_update(e) {
  // Ensure the clicked element is a row
  if (e.target.tagName.toLowerCase() === 'td') {
    const rowElement = e.target.parentElement;
    // Elimina atributo active de la fila activa actual
    document.querySelector("#locales > tbody > tr.active")?.classList.remove("active");
    // Marca como activa la fila seleccionada
    rowElement?.classList.add("active");
    // Traslada valores de la fila seleccionada al formulario
    const tr_data = row2data(rowElement);
    Object.entries(tr_data).forEach(([key, value]) => {
      const inputElement = document.getElementById(key);
      if (inputElement) {
        inputElement.value = value;
      }
    });
    update();
  }
}

// Añade una fila y actualiza interfaz
function add_and_update(e) {
  const last_row = document.querySelector("#locales > tbody tr:last-child");
  last_row.parentNode.insertBefore(fields2row(), last_row.nextSibling);
  last_row.nextSibling.dispatchEvent(new Event("click"));
  update();
}

// Elimina una fila y actualiza interfaz
function remove_and_update(e) {
  const active_row = document.querySelector("#locales > tbody > tr.active");
  const next_row = active_row.nextElementSibling;
  const target_row = next_row || active_row.previousElementSibling;
  active_row.remove();
  if (target_row) {
    target_row.dispatchEvent(new Event("click"));
  }
  update();
}

// Modifica datos de fila y actualiza interfaz
function modify_and_update(e) {
  const new_row = fields2row();
  new_row.classList.add("active");
  document.querySelector("#locales > tbody tr.active").replaceWith(new_row);
  new_row.dispatchEvent(new Event("click"));
  update();
}

// Limpia filas y deja una en blanco y actualiza interfaz
function clear_and_update(e) {
  document.querySelectorAll("#locales > tbody tr").forEach(row => row.remove());
  reset_form_fields();
  const new_row = fields2row();
  new_row.classList.add("active");
  document.querySelector("#locales > tbody").append(new_row);
  new_row.dispatchEvent(new Event("click"));
  update();
}

// Conecta retrollamadas a eventos -----------------------------

// Seleccionar fila al pulsar
document.querySelector("#locales > tbody").addEventListener("click", select_and_update);

// Añadir fila y seleccionarla
document.querySelector("button#add").addEventListener("click", add_and_update);

// Eliminar fila y seleccionar otra
document.querySelector("button#remove").addEventListener("click", remove_and_update);

// Modificar fila
document.querySelector("button#modify").addEventListener("click", modify_and_update);

// Eliminar todas las filas y dejar una en blanco
document.querySelector("button#clean").addEventListener("click", clear_and_update);

// Seleccionar fila activa y actualizar interfaz
document.querySelector("#locales > tbody > tr.active").dispatchEvent(new Event("click"));
update();