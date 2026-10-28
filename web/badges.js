// Badge in tre categorie (spec §4.8): tua, stima, attenzione. Ogni badge spiega se stesso al tocco.
import { esc } from './format.js';
import { infoButton } from './prov.js';

export const BADGE_LEGEND = [
  ['badge mine', 'tua', 'la corda che monti, le tue preferite e quelle che non ti sono piaciute'],
  ['badge est', 'stima', 'un dato non misurato direttamente su questa corda: viene da un calibro gemello, da Racketpedia o da un modello'],
  ['badge warn', 'attenzione', 'qualcosa da verificare prima di comprare o di fidarsi dei numeri'],
];

export function badges(r, current) {
  const out = [];
  const add = (cls, label, info) => out.push(infoButton(cls, esc(label), info));
  if (current && r.id === current.id) add('badge mine', 'la tua corda', 'È la corda che hai indicato come montata adesso: tutte le differenze si calcolano rispetto a lei.');
  if (r.preference === 'liked') add('badge mine', '★ preferita', 'Una delle tue due corde preferite.');
  if (r.preference === 'disliked') add('badge mine', '✕ non gradita', 'Una corda che non ti è piaciuta: le corde simili vengono penalizzate.');
  if (r.catalog_only) add('badge est', 'solo catalogo', 'Non testata da nessun laboratorio: i numeri, se ci sono, vengono da un calibro gemello o da una stima.');
  if (r.spin && r.spin.kind === 'modello') add('badge est', 'spin da modello', 'Spin stimato da rigidità e forma: dice se sta sopra o sotto la media, non un valore preciso. Non entra nei consigli.');
  else if (r.spin && r.spin.kind !== 'misurato') add('badge est', 'spin stimato', 'Spin preso dalla stessa corda in un altro calibro o colore (±0,5).');
  if (r.stiffness && r.stiffness.kind !== 'misurata') add('badge est', 'rigidità stimata', 'Rigidità da un calibro gemello, da Racketpedia o dal solo calibro: tocca il valore per vedere la fonte e il margine.');
  if (r.crosscheck?.verdict === 'contradicted') add('badge warn', 'dati contestati', r.crosscheck.note || 'Produttori o recensioni contraddicono i numeri di laboratorio.');
  if (r.derived?.disliked_warning) add('badge warn', 'simile a una non gradita', 'Per le misure somiglia più a una corda che non ti è piaciuta che alle tue preferite.');
  if (r.production?.reason && r.preference) add('badge warn', r.production.reason, 'Resta solo come tuo riferimento.');
  else if (r.production && r.production.year == null) add('badge warn', 'anno da verificare', 'Anno di uscita non trovato: verifica che non sia un modello datato.');
  if (r.production?.status === 'unclear') add('badge warn', 'produzione da verificare', 'Non è chiaro se sia ancora in vendita: verifica prima di comprare.');
  return out.join(' ');
}
