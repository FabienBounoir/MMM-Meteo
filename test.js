// node test.js : vérifie les codes météo et le placement des barres de température
const assert = require('assert');
global.Module = { register() {} };
const { MET_info, MET_days } = require('./MMM-Meteo.js');

assert.strictEqual(MET_info(0, true).icon, 'wi-day-sunny');
assert.strictEqual(MET_info(0, false).icon, 'wi-night-clear');
assert.strictEqual(MET_info(63).text, 'Pluie');
assert.strictEqual(MET_info(81).text, 'Averses');
assert.strictEqual(MET_info(99).text, 'Orage');
assert.strictEqual(MET_info(1234).icon, 'wi-na');

const days = MET_days({
  time: ['2026-11-16', '2026-11-17', '2026-11-18', '2026-11-19', '2026-11-20', '2026-11-21'],
  weather_code: [3, 61, 63, 61, 2, 0],
  temperature_2m_min: [9, 11.6, 11.0, 11.5, 9.1, 8],
  temperature_2m_max: [14, 15.6, 17.9, 16.4, 16.6, 15]
}, 4);
assert.deepStrictEqual(days.map((d) => d.name), ['mar', 'mer', 'jeu', 'ven']);   // aujourd'hui ignoré
assert.deepStrictEqual(days.map((d) => [d.min, d.max]), [[12, 16], [11, 18], [12, 16], [9, 17]]);
assert.strictEqual(days[3].left, 0);                       // vendredi a la plus basse minimale
assert.strictEqual(days[1].left, 2 / 9);                  // mercredi : 11 → 18 sur l'échelle 9 → 18
assert.strictEqual(days[1].left + days[1].width, 1);       // il a la plus haute maximale
assert.deepStrictEqual(MET_days(undefined, 4), []);
console.log('ok');
