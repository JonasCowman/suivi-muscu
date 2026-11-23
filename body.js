// Corps anatomique face / dos (tracés dans body-data.js). Associe les zones du dessin aux muscles du programme.
const SLUG_TO_MUSCLE = {
  front: { chest: 'pecs', deltoids: 'epaules_lat', biceps: 'biceps', triceps: 'triceps', forearm: 'avantbras', abs: 'abdos', obliques: 'abdos', quadriceps: 'quadriceps', calves: 'mollets' },
  back: { deltoids: 'epaules_post', 'upper-back': 'dos', 'lower-back': 'dos', trapezius: 'dos', triceps: 'triceps', forearm: 'avantbras', gluteal: 'fessiers', hamstring: 'ischios', calves: 'mollets' },
};
const NOT_MUSCLE = new Set(['head', 'hair', 'neck', 'hands', 'feet', 'ankles', 'knees']);

// fills = { muscle: 0..1 } (intensité), sel = muscle sélectionné, w = largeur en px
function bodySvg(view, fills, sel, w, label) {
  const data = BODY_DATA[view], map = SLUG_TO_MUSCLE[view];
  let g = '';
  for (const p of data.parts) {
    const paths = p.d.map(d => `<path d="${d}"/>`).join('');
    const m = map[p.slug];
    if (!m) { g += `<g fill="${NOT_MUSCLE.has(p.slug) ? '#1b1e22' : '#2b2f35'}">${paths}</g>`; continue; }
    const t = fills[m] || 0;
    const fill = t > 0 ? `fill="#22d3ee" fill-opacity="${(0.25 + 0.75 * Math.min(1, t)).toFixed(2)}"` : 'fill="#2b2f35"';
    const stroke = m === sel ? 'stroke="#ffffff" stroke-width="6"' : '';
    g += `<g data-a="muscle" data-m="${m}" ${fill} ${stroke} style="cursor:pointer">${paths}</g>`;
  }
  const outline = `<path d="${data.outline}" fill="none" stroke="#3a3f45" stroke-width="3"/>`;
  return `<svg viewBox="${data.viewBox}" width="${w}" role="img" aria-label="${label || (view === 'front' ? 'Muscles, vue de face' : 'Muscles, vue de dos')}">${outline}${g}</svg>`;
}
