//
// Calcula caudal de infiltraciones (m3/h) según CTE DB-HE (UNE-EN 15242)
//

// Find root by bisection
function findRoot(fun, low, hi, funabserr, maxiter) {
  const xabserr = 2.22E-15;
  let xlow = low,
      xhi = hi,
      funxlow = fun(xlow),
      funxhi = fun(xhi);

  if (Math.abs(funxlow) < funabserr) return xlow;
  if (Math.abs(funxhi) < funabserr) return xhi;
  if (Math.sign(funxlow) === Math.sign(funxhi)) return null;

  let mid = (xlow + xhi) / 2;
  for (let k = 0; k <= maxiter; k++) {
    if (Math.abs(funxhi - funxlow) < funabserr / 2 && xhi - xlow < xabserr) return mid;

    if (xlow === mid || xhi === mid) break;

    let funmid = fun(mid);
    if (Math.sign(funmid) === Math.sign(funxlow)) {
      xlow = mid;
      funxlow = funmid;
    } else if (Math.sign(funmid) === Math.sign(funxhi)) {
      xhi = mid;
      funxhi = funmid;
    } else {
      return mid;
    }

    mid = (xlow + xhi) / 2;
  }
  return null;
}

// Calcula el caudal de ventilación del componente
//
// C: coeficiente de fugas C m3/h·m2 a 1 Pa
// dP: diferencia de presión entre la cara exterior e interior del componente
// n: exponente de caudal
function qv(C, dP, n) { return C * Math.sign(dP) * Math.pow(Math.abs(dP), n); }


// Calcula el coeficiente de descarga de bocas de admisión con modelo simplificado (viviendas)
//
// Supone que completan el flujo equivalente a disponer de huecos con microventilación
// (ver Doc. condic. técnicas evaluación eficiencia energética de los edificios)
// Cleak_fach: Permeabilidad de elementos de fachada, m3/h a 1 Pa
// Cleak_cub: Permeabilidad de elementos de cubierta, m3/h a 1 Pa
// Ch100: Coeficiente de fugas de huecos, m3/h·m2 a 100 Pa
// Ah: Área de huecos m2
// qv_exh: Caudal de extracción de diseño (HS3 + cocinas), m3/h
function Cven_simplificado(Cleak_fach, Cleak_cub, Ch100, Ah, qv_exh_req) {
  const F100to1 = 1 / Math.pow(100, 0.67); // Cambio de presión de referencia de 100Pa -> 1 Pa
  const Chmicro100 = 50; // Coef. fugas huecos microventilación CTE 50m3/h·m2 a 1 Pa

  const Cven_micro = Ah * (Chmicro100 - Ch100) * F100to1;
  const dP = qv_exh_req / (Cleak_fach + Cleak_cub + Cven_micro); // (Cleak + Cven) * dP - qv_exh_req = 0
  const Cven = Cven_micro * dP;
  const Cven_n05 = (dP !== 0) ? Cven / Math.pow(Math.abs(dP), 0.5) : 0;
  return 0.5 * Cven_n05; // apertura del 50%
}


// Calcula la diferencia de presiones en un componente
//
// cp: coef. de exposición
// v: velocidad del viento, m/s
// p: presión interior, Pa?
// dP_comp = Pext_comp + Pint_comp
// Pext_comp = dens_aire * (0.5 * cp_comp * v^2 - h_comp * g * Tref / Te)
// Pint_comp = irp - dens_aire * h_comp * g * Tref / Ti
// Tref = 283K, dens_aire = 1.22 kg/m3, g = 9.81m/s2, h_comp = dif. altitud entre componente y suelo
function dP_comp(cp, v, p, Te, Ti) {
  const h_comp = 1.5; // diferencia de altura entre el suelo y el componente, suponemos fijo
  const Teval = (typeof Te !== 'undefined') ? Te : 273; // Temp. exterior
  const Tival = (typeof Ti !== 'undefined') ? Ti : 293; // Temp. interior
  const Pext = 1.22 * (0.5 * cp * v * v - h_comp * 9.81 * 283 / Teval);
  const Pint = p - 1.22 * h_comp * 9.81 * 283 / Tival;
  return Pext - Pint;
}

// Caudal a través de los componentes para velocidad del viento v y presión del recinto p
//
// Cleak_fach: Permeabilidad de elementos de fachada, m3/h a 1 Pa
// Cleak_cub: Permeabilidad de elementos de cubierta, m3/h a 1 Pa
// Cven: Permeabilidad de bocas de admisión, m3/h a 1 Pa
// v: velocidad del viento exterior, m/s
// p: presión interior de referencia, Pa?
function qvComp(Cleak_fach, Cleak_cub, Cven, v, p) {
  const dP_fach1 = dP_comp(0.25, v, p); // cp = 0.25 barlovento
  const dP_fach2 = dP_comp(-0.50, v, p); // cp = -0.50 sotavento
  const dP_cub = dP_comp(-0.60, v, p); // cp = -0.60 cubierta

  // 50% de fachadas a barlovento y 50% a sotavento
  const qv_leak_fach1 = qv(0.5 * Cleak_fach, dP_fach1, 0.67);
  const qv_leak_fach2 = qv(0.5 * Cleak_fach, dP_fach2, 0.67);
  const qv_leak_cub = qv(1.0 * Cleak_cub, dP_cub, 0.67);
  const qv_ven_fach1 = qv(0.5 * Cven, dP_fach1, 0.5);
  const qv_ven_fach2 = qv(0.5 * Cven, dP_fach2, 0.5);

  return [qv_leak_fach1, qv_leak_fach2, qv_leak_cub, qv_ven_fach1, qv_ven_fach2];
}

// Calcula caudal de infiltraciones (m3/h) según CTE DB-HE (UNE-EN 15242)
//
// Incluye el caudal debido al extractor de cocina y excluye la extracción para cumplir HS3
//
function infiltraciones(TipoEdificio, numViv, V, Ao, Ah, Ac, Ahc, Apu, Ch100, Chc100, RenHS3) {
  const Co100 = (TipoEdificio === 'Nuevo') ? 16 : 29; // Fugas por opacos (incl. cubiertas) CTE, a 100Pa
  const Cpu100 = 60; // Coef. fugas puertas (CTE), a 100Pa
  const F100to1 = 1 / Math.pow(100, 0.67); // Cambio de presión de referencia de 100Pa -> 1 Pa

  // qv_cocina = numViv * 1h/dia * 50l/s * 3600s/h * 1 m3 / 1000 l * 1 dia / 24 h  = numViv * 7.5 m3/h
  const qv_cocinas = 7.5 * numViv;

  const qv_exh_req = (numViv === 0) ? 0 : RenHS3 * V + qv_cocinas;  // Caudal de diseño = extracción + qv_cocinas

  const Cleak_fach = Ao * Co100 * F100to1 + Ah * Ch100 * F100to1 + Apu * Cpu100 * F100to1;
  const Cleak_cub = Ac * Co100 * F100to1 + Ahc * Chc100 * F100to1;
  const Cven = Cven_simplificado(Cleak_fach, Cleak_cub, Ch100, Ah, qv_exh_req);

  // Método iterativo UNE-EN 15242 (ap. 6.6)
  // Calcula presión del recinto, resolviendo balance de caudales, para v = 4m/s (CTE)
  const p_R = findRoot(p => (qvComp(Cleak_fach, Cleak_cub, Cven, 4, p)
                             .reduce((a, b) => a + b, 0) - qv_exh_req), -100, 100, 1E-8, 1E3);
  if (p_R === null) { return 'Error al calcular las infiltraciones. No se ha podido calcular la presión del recinto'; }

  // Calcula entrada de aire a través de los componentes para dicha presión
  const qv_comp = qvComp(Cleak_fach, Cleak_cub, Cven, 4, p_R);
  const qv_inf = qv_comp.filter(e => e > 0).reduce((a, b) => a + b, 0); // infiltraciones por la envolvente
  // var qv_exh = qv_comp.filter(e => e < 0).reduce( (a, b) => a + b, 0); // exfiltraciones por la envolvente
  // console.log(qv_inf/V, qv_exh/V);
  // Con v = 0m/s qv_comp = qv_inf = qv_exh_req
  // Caudal sobre el de diseño = ((qv_comp + qv_exh_req) / 2) - (qv_exh_req - qv_cocinas) =
  //                             0.5 qv_comp - 0.5 qv_exh_req - qv_cocinas
  const qv_inf_medio = 0.5 * qv_inf - 0.5 * qv_exh_req + qv_cocinas;
  return qv_inf_medio;
}

let TipoEdificio = 'Nuevo',
    numViv = 1, // numero viviendas edificio
    V = 288, // [m3] volumen edificio
    Ao = 120, //  [m2] opacos, con C=Co100 según TipoEdificio
    Ah = 36, //  [m2] huecos
    Ahc = 0, //  [m2] huecos de cubierta (lucernarios)
    Ac = 96, // [m2] cubierta, con C = Co100
    Apu = 2, // [m2] puertas, con C = 60
    Ch100 = 27, // [m3/h·m2] Permeabilidad huecos a 100 Pa
    Chc100 = 27, // [m3/h·m2] Permeabilidad de huecos de cubierta (lucernarios) a 100 Pa
    RenHS3 = 0.63; // [ren/h] Caudal ventilación HS3

let inf = infiltraciones(TipoEdificio, numViv, V, Ao, Ah, Ac, Ahc, Apu, Ch100, Chc100, RenHS3);
let renh_inf = inf / V;
console.log(inf.toFixed(3), 'm3/h, ', renh_inf.toFixed(3), ' ren/h');
console.log('Debería salir 0.186 ren/h de infiltraciones');

//document.write('<p>', inf.toFixed(3), 'm3/h, ', renh_inf.toFixed(3), ' ren/h', '</p>');
//document.write('<p>', 'Debería salir 0.186 ren/h de infiltraciones', '</p>');
