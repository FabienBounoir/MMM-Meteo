'use strict';

Module.register('MMM-Meteo', {
  defaults: {
    lat: null,
    lon: null,
    days: 4,                  // jours de prévision, à partir de demain
    updateInterval: 10 * 60,  // en secondes
    label: 'Maintenant'
  },

  getStyles() {
    return ['weather-icons.css', this.file('MMM-Meteo.css')];
  },

  start() {
    this.weather = null;
    this.load();
    setInterval(() => this.load(), this.config.updateInterval * 1000);
  },

  // Open-Meteo : gratuit, sans clé ; un seul appel pour la météo actuelle et les prévisions
  async load() {
    const params = new URLSearchParams({
      latitude: this.config.lat,
      longitude: this.config.lon,
      current: 'temperature_2m,apparent_temperature,weather_code,wind_speed_10m,is_day',
      daily: 'weather_code,temperature_2m_max,temperature_2m_min',
      timezone: 'auto',
      forecast_days: this.config.days + 1
    });
    try {
      const response = await fetch('https://api.open-meteo.com/v1/forecast?' + params);
      if (!response.ok) throw new Error('Open-Meteo ' + response.status);
      const weather = await response.json();
      const changed = JSON.stringify(weather.daily) !== JSON.stringify(this.weather && this.weather.daily);
      this.weather = weather;
      this.updateDom(changed ? 800 : 0);
    } catch (error) {
      // On garde l'affichage précédent ; nouvel essai au prochain intervalle
      Log.error('[MMM-Meteo] ' + error.message);
    }
  },

  getDom() {
    const wrapper = MET_el('div', 'MET');
    if (!this.weather) {
      wrapper.appendChild(MET_el('div', 'dimmed small', 'Météo…'));
      return wrapper;
    }

    const now = this.weather.current;
    const info = MET_info(now.weather_code, now.is_day === 1);

    const current = MET_el('div', 'MET_current');
    current.style.setProperty('--MET-color', info.color);
    current.appendChild(MET_el('div', 'MET_label', this.config.label));
    const line = MET_el('div', 'MET_now');
    line.appendChild(MET_el('span', 'MET_icon wi ' + info.icon));
    line.appendChild(MET_el('span', 'MET_temp', Math.round(now.temperature_2m) + '°'));
    current.appendChild(line);
    current.appendChild(MET_el('div', 'MET_cond',
      info.text + ' · ressenti ' + Math.round(now.apparent_temperature) + '° · vent ' + Math.round(now.wind_speed_10m) + ' km/h'));
    wrapper.appendChild(current);

    const days = MET_days(this.weather.daily, this.config.days);
    if (days.length) {
      const list = MET_el('div', 'MET_days');
      list.appendChild(MET_el('div', 'MET_label', days.length + ' prochains jours'));
      for (const day of days) {
        const row = MET_el('div', 'MET_day');
        row.style.setProperty('--MET-color', day.info.color);
        row.appendChild(MET_el('span', 'MET_dayName', day.name));
        row.appendChild(MET_el('span', 'MET_dayIcon wi ' + day.info.icon));
        row.appendChild(MET_el('span', 'MET_min', day.min + '°'));
        const track = MET_el('span', 'MET_track');
        const bar = MET_el('i', '');
        // La barre va de la minimale à la maximale du jour, sur l'échelle commune à tous les jours ;
        // le dégradé couvre toute l'échelle, chaque barre n'en montre que sa portion
        bar.style.left = day.left * 100 + '%';
        bar.style.width = day.width * 100 + '%';
        bar.style.backgroundSize = 100 / day.width + '% 100%';
        bar.style.backgroundPosition = (day.width < 1 ? day.left / (1 - day.width) * 100 : 0) + '% 0';
        track.appendChild(bar);
        row.appendChild(track);
        row.appendChild(MET_el('span', 'MET_max', day.max + '°'));
        list.appendChild(row);
      }
      wrapper.appendChild(list);
    }
    return wrapper;
  }
});


function MET_el(tag, className, text) {
  const el = document.createElement(tag);
  if (className) el.className = className;
  if (text !== undefined) el.textContent = text;
  return el;
}

// Codes météo WMO d'Open-Meteo → texte, icône (Weather Icons, fournie avec MagicMirror) et couleur
const MET_SUN = '#ffd60a', MET_NIGHT = '#b9a8ff', MET_CLOUD = '#b9c4d6', MET_RAIN = '#5ac8fa';
function MET_info(code, isDay = true) {
  const pick = (day, night) => (isDay ? day : night);
  if (code === 0) return { text: 'Ciel dégagé', icon: pick('wi-day-sunny', 'wi-night-clear'), color: pick(MET_SUN, MET_NIGHT) };
  if (code === 1) return { text: 'Plutôt dégagé', icon: pick('wi-day-sunny-overcast', 'wi-night-alt-partly-cloudy'), color: pick(MET_SUN, MET_NIGHT) };
  if (code === 2) return { text: 'Nuageux', icon: pick('wi-day-cloudy', 'wi-night-alt-cloudy'), color: pick(MET_CLOUD, MET_NIGHT) };
  if (code === 3) return { text: 'Couvert', icon: 'wi-cloudy', color: MET_CLOUD };
  if (code === 45 || code === 48) return { text: 'Brouillard', icon: 'wi-fog', color: '#9aa4b2' };
  if (code >= 51 && code <= 57) return { text: 'Bruine', icon: 'wi-sprinkle', color: MET_RAIN };
  if (code >= 61 && code <= 67) return { text: code === 65 ? 'Forte pluie' : 'Pluie', icon: 'wi-rain', color: MET_RAIN };
  if ((code >= 71 && code <= 77) || code === 85 || code === 86) return { text: 'Neige', icon: 'wi-snow', color: '#e6f2ff' };
  if (code >= 80 && code <= 82) return { text: 'Averses', icon: 'wi-showers', color: MET_RAIN };
  if (code >= 95 && code <= 99) return { text: 'Orage', icon: code === 95 ? 'wi-thunderstorm' : 'wi-storm-showers', color: '#bf5af2' };
  return { text: '', icon: 'wi-na', color: MET_CLOUD };
}

// Prévisions à partir de demain, avec la position de chaque barre sur l'échelle commune des températures
function MET_days(daily, count) {
  if (!daily || !daily.time) return [];
  const days = daily.time.slice(1, count + 1).map((date, i) => ({
    name: new Date(date + 'T12:00').toLocaleDateString('fr-FR', { weekday: 'short' }).replace('.', ''),
    info: MET_info(daily.weather_code[i + 1]),
    min: Math.round(daily.temperature_2m_min[i + 1]),
    max: Math.round(daily.temperature_2m_max[i + 1])
  }));
  const lo = Math.min(...days.map((d) => d.min)), hi = Math.max(...days.map((d) => d.max));
  const span = Math.max(1, hi - lo);
  for (const d of days) {
    d.left = (d.min - lo) / span;
    d.width = Math.max(0.04, (d.max - d.min) / span);
  }
  return days;
}

if (typeof module !== 'undefined') module.exports = { MET_info, MET_days };
