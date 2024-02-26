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

// Calcula datos de ventilación HS3 + RITE para residencial
export function compute_values(data) {
  const numtipos_lst = data.map((i) => i.numtipo);

  const suptipos_lst = hadamard(
    numtipos_lst,
    data.map((i) => i.suptipo)
  );
  const supcomun_lst = hadamard(
    numtipos_lst,
    data.map((i) => i.supcomun)
  );

  const voledif = dot(
    sum_vec(suptipos_lst, supcomun_lst),
    data.map((i) => i.altura)
  );
  const suptipos = suptipos_lst.reduce((acc, val) => acc + val, 0);
  const supcomunes = supcomun_lst.reduce((acc, val) => acc + val, 0);
  const totsup = suptipos + supcomunes;
  const vol2009 = ventila2009(data);
  const vol2017 = ventila2017(data);

  return {
    voledif,
    totnumtipo: numtipos_lst.reduce((acc, val) => acc + val, 0),
    totsuptipo: Math.round(suptipos * 100) / 100,
    totaltura: totsup ? Math.round((100 * voledif) / totsup) / 100 : 0,
    totsupcomun: Math.round(supcomunes * 100) / 100,
    totnumdormitorios: dot(
      numtipos_lst,
      data.map((i) => i.numdormitorios)
    ),
    totnumestar: dot(
      numtipos_lst,
      data.map((i) => i.numestar)
    ),
    totnumlochum: dot(
      numtipos_lst,
      data.map((i) => i.numlochum)
    ),
    totnumbanos: dot(
      numtipos_lst,
      data.map((i) => i.numbanos)
    ),
    totsupcocina:
      Math.round(
        dot(
          numtipos_lst,
          data.map((i) => i.supcocina)
        ) * 100
      ) / 10,
    vol2009: Math.round(vol2009),
    renh2009: voledif
      ? Math.round((100 * (3.6 * vol2009)) / voledif) / 100
      : "-",
    vol2017: Math.round(vol2017),
    renh2017: voledif
      ? Math.round((100 * (3.6 * vol2017)) / voledif) / 100
      : "-",
  };
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
  return data.map(procesa_tipo_2009).reduce((acc, val) => acc + val, 0); // l/s
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
  return data.map(procesa_tipo_2017).reduce((acc, val) => acc + val, 0); // l/s
}

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
  return hadamard(vec1, vec2).reduce((acc, val) => acc + val, 0);
}
