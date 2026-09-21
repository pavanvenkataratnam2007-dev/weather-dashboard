/**
 * Weather Dashboard — App Logic
 * OpenWeatherMap API · Geolocation · localStorage · Glassmorphism UI
 */

// ─────────────────────────────────────────────
// Constants & State
// ─────────────────────────────────────────────
const STORAGE_KEYS = {
  apiKey: 'weather_dashboard_api_key',
  lastCity: 'weather_dashboard_last_city',
  theme: 'weather_dashboard_theme',
};

// Pre-filled API key (overridden by localStorage if present)
const DEFAULT_API_KEY = 'a486c3e0332da543302c6d669a55ec22';

let state = {
  apiKey: localStorage.getItem(STORAGE_KEYS.apiKey) || DEFAULT_API_KEY,
  lastCity: localStorage.getItem(STORAGE_KEYS.lastCity) || '',
  theme: localStorage.getItem(STORAGE_KEYS.theme) || 'dark',
  units: 'metric',
};

// ─────────────────────────────────────────────
// DOM References
// ─────────────────────────────────────────────
const $ = (sel) => document.querySelector(sel);

const els = {
  body: document.body,
  html: document.documentElement,
  searchForm: $('#search-form'),
  cityInput: $('#city-input'),
  geoBtn: $('#geo-btn'),
  openSettings: $('#open-settings'),
  closeSettings: $('#close-settings'),
  settingsModal: $('#settings-modal'),
  apiKeyInput: $('#api-key-input'),
  saveSettings: $('#save-settings'),
  themeToggle: $('#theme-toggle'),
  themeKnob: $('#theme-toggle-knob'),
  loading: $('#loading'),
  welcome: $('#welcome'),
  weatherContent: $('#weather-content'),
  welcomeGeo: $('#welcome-geo'),
  welcomeSettings: $('#welcome-settings'),
  locationName: $('#location-name'),
  localTime: $('#local-time'),
  tempMain: $('#temp-main'),
  conditionMain: $('#condition-main'),
  feelsLike: $('#feels-like'),
  weatherIcon: $('#weather-icon'),
  tempHigh: $('#temp-high'),
  tempLow: $('#temp-low'),
  humidity: $('#humidity'),
  wind: $('#wind'),
  pressure: $('#pressure'),
  visibility: $('#visibility'),
  forecastContainer: $('#forecast-container'),
  toastContainer: $('#toast-container'),
};

// ─────────────────────────────────────────────
// Theme
// ─────────────────────────────────────────────
function applyTheme(theme) {
  state.theme = theme;
  if (theme === 'dark') {
    els.html.classList.add('dark');
    els.themeKnob.style.transform = 'translateX(1.5rem)';
  } else {
    els.html.classList.remove('dark');
    els.themeKnob.style.transform = 'translateX(0)';
  }
  localStorage.setItem(STORAGE_KEYS.theme, theme);
}

function toggleTheme() {
  applyTheme(state.theme === 'dark' ? 'light' : 'dark');
}

// ─────────────────────────────────────────────
// Toast Notifications
// ─────────────────────────────────────────────
function showToast(message, type = 'error') {
  const colors = {
    error: 'bg-red-500/90 border-red-400/50',
    success: 'bg-emerald-500/90 border-emerald-400/50',
    info: 'bg-sky-500/90 border-sky-400/50',
  };
  const icons = {
    error: 'alert-circle',
    success: 'check-circle',
    info: 'info',
  };

  const toast = document.createElement('div');
  toast.className = `toast pointer-events-auto glass-strong rounded-xl px-4 py-3 shadow-lg border flex items-start gap-3 ${colors[type] || colors.error}`;
  toast.innerHTML = `
    <i data-lucide="${icons[type] || icons.error}" class="w-5 h-5 shrink-0 mt-0.5"></i>
    <p class="text-sm font-medium flex-1">${message}</p>
    <button class="p-0.5 rounded hover:bg-white/20 transition-colors" aria-label="Dismiss">
      <i data-lucide="x" class="w-4 h-4"></i>
    </button>
  `;
  els.toastContainer.appendChild(toast);
  lucide.createIcons({ nodes: [toast] });

  const dismiss = () => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(-8px)';
    toast.style.transition = 'all 0.25s ease';
    setTimeout(() => toast.remove(), 250);
  };

  toast.querySelector('button').addEventListener('click', dismiss);
  setTimeout(dismiss, 4500);
}

// ─────────────────────────────────────────────
// UI State Helpers
// ─────────────────────────────────────────────
function setLoading(isLoading) {
  els.loading.classList.toggle('hidden', !isLoading);
  if (isLoading) {
    els.welcome.classList.add('hidden');
    els.weatherContent.classList.add('hidden');
  }
}

function showWelcome() {
  els.loading.classList.add('hidden');
  els.weatherContent.classList.add('hidden');
  els.welcome.classList.remove('hidden');
}

function showWeather() {
  els.loading.classList.add('hidden');
  els.welcome.classList.add('hidden');
  els.weatherContent.classList.remove('hidden');
}

// ─────────────────────────────────────────────
// Weather Background
// ─────────────────────────────────────────────
function setWeatherBackground(mainCondition) {
  const map = {
    Clear: 'bg-clear',
    Clouds: 'bg-clouds',
    Rain: 'bg-rain',
    Drizzle: 'bg-drizzle',
    Thunderstorm: 'bg-thunderstorm',
    Snow: 'bg-snow',
    Mist: 'bg-mist',
    Smoke: 'bg-mist',
    Haze: 'bg-haze',
    Dust: 'bg-mist',
    Fog: 'bg-fog',
    Sand: 'bg-mist',
    Ash: 'bg-mist',
    Squall: 'bg-rain',
    Tornado: 'bg-thunderstorm',
  };
  const bgClass = map[mainCondition] || 'bg-default';

  // Remove previous bg-* classes
  els.body.className = els.body.className
    .split(' ')
    .filter((c) => !c.startsWith('bg-'))
    .join(' ');
  els.body.classList.add(bgClass);
}

// ─────────────────────────────────────────────
// API Helpers
// ─────────────────────────────────────────────
function getApiKey() {
  return state.apiKey?.trim() || '';
}

async function fetchWeatherByCity(city) {
  const key = getApiKey();
  if (!key) {
    throw new Error('API key is missing. Please add your OpenWeatherMap API key in Settings.');
  }
  const url = `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(city)}&units=${state.units}&appid=${key}`;
  const res = await fetch(url);
  if (!res.ok) {
    if (res.status === 404) throw new Error(`City "${city}" not found. Check the spelling and try again.`);
    if (res.status === 401) throw new Error('Invalid API key. Please check your key in Settings.');
    throw new Error(`Weather request failed (${res.status}). Please try again.`);
  }
  return res.json();
}

async function fetchWeatherByCoords(lat, lon) {
  const key = getApiKey();
  if (!key) {
    throw new Error('API key is missing. Please add your OpenWeatherMap API key in Settings.');
  }
  const url = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&units=${state.units}&appid=${key}`;
  const res = await fetch(url);
  if (!res.ok) {
    if (res.status === 401) throw new Error('Invalid API key. Please check your key in Settings.');
    throw new Error(`Weather request failed (${res.status}). Please try again.`);
  }
  return res.json();
}

async function fetchForecast(lat, lon) {
  const key = getApiKey();
  const url = `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&units=${state.units}&appid=${key}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('Could not load forecast data.');
  return res.json();
}

// ─────────────────────────────────────────────
// Render Current Weather
// ─────────────────────────────────────────────
function renderCurrent(data) {
  const { name, sys, main, weather, wind, visibility, timezone, dt } = data;
  const condition = weather[0];

  els.locationName.textContent = `${name}${sys?.country ? ', ' + sys.country : ''}`;
  els.tempMain.textContent = `${Math.round(main.temp)}°`;
  els.conditionMain.textContent = condition.description;
  els.feelsLike.textContent = `${Math.round(main.feels_like)}°`;
  els.tempHigh.textContent = `${Math.round(main.temp_max)}°`;
  els.tempLow.textContent = `${Math.round(main.temp_min)}°`;
  els.humidity.textContent = `${main.humidity}%`;
  els.wind.textContent = `${wind.speed.toFixed(1)} m/s`;
  els.pressure.textContent = `${main.pressure} hPa`;
  els.visibility.textContent = visibility != null ? `${(visibility / 1000).toFixed(1)} km` : '—';

  // Icon from OpenWeatherMap
  els.weatherIcon.src = `https://openweathermap.org/img/wn/${condition.icon}@4x.png`;
  els.weatherIcon.alt = condition.description;

  // Local time based on timezone offset
  const localDate = new Date((dt + timezone) * 1000);
  const timeStr = localDate.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'UTC',
  });
  const dateStr = localDate.toLocaleDateString([], {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  });
  els.localTime.textContent = `${dateStr} · ${timeStr}`;

  setWeatherBackground(condition.main);
  showWeather();
  lucide.createIcons();
}

// ─────────────────────────────────────────────
// Render 5-Day Forecast
// ─────────────────────────────────────────────
function renderForecast(forecastData) {
  // Group by day, prefer entry closest to 12:00
  const daily = {};
  forecastData.list.forEach((item) => {
    const date = new Date(item.dt * 1000);
    const dayKey = date.toISOString().slice(0, 10);
    if (!daily[dayKey]) {
      daily[dayKey] = [];
    }
    daily[dayKey].push(item);
  });

  const days = Object.keys(daily).slice(0, 5);
  els.forecastContainer.innerHTML = '';

  days.forEach((dayKey, idx) => {
    const entries = daily[dayKey];
    let best = entries[0];
    let bestDiff = Infinity;
    entries.forEach((e) => {
      const h = new Date(e.dt * 1000).getUTCHours();
      const diff = Math.abs(h - 12);
      if (diff < bestDiff) {
        bestDiff = diff;
        best = e;
      }
    });

    const temps = entries.map((e) => e.main.temp);
    const high = Math.round(Math.max(...temps));
    const low = Math.round(Math.min(...temps));
    const condition = best.weather[0];
    const date = new Date(best.dt * 1000);
    const label =
      idx === 0
        ? 'Today'
        : date.toLocaleDateString([], { weekday: 'short', timeZone: 'UTC' });

    const card = document.createElement('div');
    card.className =
      'glass rounded-2xl p-4 min-w-[120px] sm:min-w-[140px] flex flex-col items-center gap-2 shrink-0 hover:bg-white/15 transition-colors';
    card.innerHTML = `
      <p class="text-xs font-medium text-slate-300">${label}</p>
      <img src="https://openweathermap.org/img/wn/${condition.icon}@2x.png" alt="${condition.description}" class="w-12 h-12 -my-1" />
      <p class="text-xs capitalize text-slate-400 truncate max-w-full">${condition.main}</p>
      <div class="flex gap-2 text-sm font-semibold">
        <span>${high}°</span>
        <span class="text-slate-400 font-normal">${low}°</span>
      </div>
    `;
    els.forecastContainer.appendChild(card);
  });
}

// ─────────────────────────────────────────────
// Main Load Flow
// ─────────────────────────────────────────────
async function loadWeatherByCity(city) {
  if (!city?.trim()) {
    showToast('Please enter a city name.', 'info');
    return;
  }
  setLoading(true);
  try {
    const current = await fetchWeatherByCity(city.trim());
    renderCurrent(current);
    const forecast = await fetchForecast(current.coord.lat, current.coord.lon);
    renderForecast(forecast);
    state.lastCity = city.trim();
    localStorage.setItem(STORAGE_KEYS.lastCity, state.lastCity);
    els.cityInput.value = state.lastCity;
  } catch (err) {
    console.error(err);
    showToast(err.message || 'Something went wrong. Please try again.');
    if (els.weatherContent.classList.contains('hidden')) {
      showWelcome();
    }
  } finally {
    setLoading(false);
  }
}

async function loadWeatherByCoords(lat, lon) {
  setLoading(true);
  try {
    const current = await fetchWeatherByCoords(lat, lon);
    renderCurrent(current);
    const forecast = await fetchForecast(lat, lon);
    renderForecast(forecast);
    state.lastCity = current.name;
    localStorage.setItem(STORAGE_KEYS.lastCity, state.lastCity);
    els.cityInput.value = state.lastCity;
  } catch (err) {
    console.error(err);
    showToast(err.message || 'Could not fetch weather for your location.');
    showWelcome();
  } finally {
    setLoading(false);
  }
}

function requestGeolocation() {
  if (!navigator.geolocation) {
    showToast('Geolocation is not supported by your browser.', 'error');
    return;
  }
  if (!getApiKey()) {
    showToast('Please set your API key in Settings first.', 'info');
    openSettingsModal();
    return;
  }
  setLoading(true);
  navigator.geolocation.getCurrentPosition(
    (pos) => {
      loadWeatherByCoords(pos.coords.latitude, pos.coords.longitude);
    },
    (err) => {
      setLoading(false);
      const messages = {
        1: 'Location permission denied. Please allow access or search for a city.',
        2: 'Unable to determine your location. Try searching for a city.',
        3: 'Location request timed out. Please try again.',
      };
      showToast(messages[err.code] || 'Could not get your location.');
      showWelcome();
    },
    { enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 }
  );
}

// ─────────────────────────────────────────────
// Settings Modal
// ─────────────────────────────────────────────
function openSettingsModal() {
  els.apiKeyInput.value = state.apiKey || '';
  els.settingsModal.classList.remove('hidden');
  els.settingsModal.classList.add('flex');
  lucide.createIcons();
}

function closeSettingsModal() {
  els.settingsModal.classList.add('hidden');
  els.settingsModal.classList.remove('flex');
}

function saveSettings() {
  const key = els.apiKeyInput.value.trim();
  state.apiKey = key;
  localStorage.setItem(STORAGE_KEYS.apiKey, key);
  showToast('Settings saved.', 'success');
  closeSettingsModal();
  if (state.lastCity) {
    loadWeatherByCity(state.lastCity);
  }
}

// ─────────────────────────────────────────────
// Event Listeners
// ─────────────────────────────────────────────
els.searchForm.addEventListener('submit', (e) => {
  e.preventDefault();
  loadWeatherByCity(els.cityInput.value);
});

els.geoBtn.addEventListener('click', requestGeolocation);
els.welcomeGeo.addEventListener('click', requestGeolocation);
els.welcomeSettings.addEventListener('click', openSettingsModal);
els.openSettings.addEventListener('click', openSettingsModal);
els.closeSettings.addEventListener('click', closeSettingsModal);
els.saveSettings.addEventListener('click', saveSettings);
els.themeToggle.addEventListener('click', toggleTheme);

// Close modal on backdrop click
els.settingsModal.addEventListener('click', (e) => {
  if (e.target === els.settingsModal) closeSettingsModal();
});

// Escape to close modal
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && !els.settingsModal.classList.contains('hidden')) {
    closeSettingsModal();
  }
});

// ─────────────────────────────────────────────
// Init
// ─────────────────────────────────────────────
function init() {
  applyTheme(state.theme);
  lucide.createIcons();

  // Persist the provided default key if nothing was stored yet
  if (!localStorage.getItem(STORAGE_KEYS.apiKey) && DEFAULT_API_KEY) {
    localStorage.setItem(STORAGE_KEYS.apiKey, DEFAULT_API_KEY);
    state.apiKey = DEFAULT_API_KEY;
  }

  if (state.lastCity && getApiKey()) {
    loadWeatherByCity(state.lastCity);
  } else {
    showWelcome();
  }
}

init();
