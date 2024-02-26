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

import "./style.css";
import { compute_values } from "./src/ventila";

// Funciones principales -------------------------------------------------------
const FORM_FIELDS = [
  { id: "nombretipo", className: "" },
  { id: "numtipo", className: "" },
  { id: "suptipo", className: "m2" },
  { id: "altura", className: "m" },
  { id: "supcomun", className: "m2" },
  { id: "numdormitorios", className: "" },
  { id: "numestar", className: "" },
  { id: "numlochum", className: "" },
  { id: "numbanos", className: "" },
  { id: "supcocina", className: "m2" },
];

// Limpia entradas del formulario con valores por defecto
function reset_form_fields() {
  FORM_FIELDS.map((e) => {
    const elem = document.getElementById(e.id);
    const reset_value = elem.getAttribute("type") === "text" ? "-" : 0;
    elem.value = reset_value;
  });
}

// Traslada valores del formulario a fila de la tabla de tipos
function fields2row() {
  const m = Object.fromEntries(
    FORM_FIELDS.map((e) => [e.id, document.getElementById(e.id).value])
  );

  // Create the table row element
  const tr = document.createElement("tr");

  FORM_FIELDS.forEach(({ id, className }) => {
    const td = document.createElement("td");
    if (className) {
      td.className = className;
    }
    td.textContent = m[id];
    tr.appendChild(td);
  });

  return tr;
}

// Convierte fila de datos a objeto
function row2data(row) {
  return [...row.cells].reduce((acc, cell, index) => {
    const id = FORM_FIELDS[index].id;
    let val = cell.textContent;
    const isTextField =
      document.getElementById(id).getAttribute("type") === "text";
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
        if (
          element.tagName === "INPUT" ||
          element.tagName === "SELECT" ||
          element.tagName === "TEXTAREA"
        ) {
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
function update() {
  const rows = document.querySelectorAll("#locales tbody tr");
  const data = Array.from(rows).map(row2data);
  const values = compute_values(data);
  updateElements(values);
}

// Eventos de la interfaz -------------------------------------------------------

// Establece fila activa y traslada valores al formulario
function select_and_update(e) {
  // Ensure the clicked element is a row
  if (e.target.tagName.toLowerCase() === "td") {
    const rowElement = e.target.parentElement;
    // Elimina atributo active de la fila activa actual
    document
      .querySelector("#locales > tbody > tr.active")
      ?.classList.remove("active");
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
  if (active_row) {
    const next_row = active_row.nextElementSibling;
    const target_row = next_row || active_row.previousElementSibling;
    active_row.remove();
    if (target_row) {
      target_row.dispatchEvent(new Event("click"));
    }
    update();
  }
}

// Modifica datos de fila y actualiza interfaz
function modify_and_update(e) {
  const active_row = document.querySelector("#locales > tbody > tr.active");
  if (active_row) {
    const new_row = fields2row();
    new_row.classList.add("active");
    active_row.replaceWith(new_row);
    new_row.dispatchEvent(new Event("click"));
    update();
  }
}

// Limpia filas y deja una en blanco y actualiza interfaz
function clear_and_update(e) {
  document
    .querySelectorAll("#locales > tbody tr")
    .forEach((row) => row.remove());
  reset_form_fields();
  const new_row = fields2row();
  new_row.classList.add("active");
  document.querySelector("#locales > tbody").append(new_row);
  new_row.dispatchEvent(new Event("click"));
  update();
}

// Conecta retrollamadas a eventos -----------------------------

// Seleccionar fila al pulsar
document
  .querySelector("#locales > tbody")
  .addEventListener("click", select_and_update);

// Añadir fila y seleccionarla
document.querySelector("button#add").addEventListener("click", add_and_update);

// Eliminar fila y seleccionar otra
document
  .querySelector("button#remove")
  .addEventListener("click", remove_and_update);

// Modificar fila
document
  .querySelector("button#modify")
  .addEventListener("click", modify_and_update);

// Eliminar todas las filas y dejar una en blanco
document
  .querySelector("button#clean")
  .addEventListener("click", clear_and_update);

// Seleccionar fila activa y actualizar interfaz
document
  .querySelector("#locales > tbody > tr.active")
  .dispatchEvent(new Event("click"));
update();
