const GEOCODING_URL = 'https://nominatim.openstreetmap.org/search';
const WEATHER_URL = 'https://api.open-meteo.com/v1/forecast';


const CITIES_LIST = [
    "Москва", "Санкт-Петербург", "Новосибирск", "Екатеринбург", "Казань",
    "Нижний Новгород", "Челябинск", "Самара", "Омск", "Ростов-на-Дону",
    "Уфа", "Красноярск", "Воронеж", "Пермь", "Волгоград"
];

let currentWeatherData = null;
let currentViewedCity = 'current';
let userCities = JSON.parse(localStorage.getItem('userCities')) || [];
let isViewToggled = JSON.parse(localStorage.getItem('isViewToggled')) || false;


let welcomeScreenEl, appContainerEl, useGeoBtnEl, manualCityFormEl, cityInputEl, suggestionsListEl, errorMessageInputEl, citiesListEl, refreshBtnEl, toggleViewBtnEl, weatherCenterEl, cityNameEl, tempCEl, tempFEl, currentDescEl, timeDateEl, forecastGridEl, addCityBtnEl, changeCityBtnEl, allWeatherContainerEl, errorMessageEl, loadingEl, mouseTrailEl;

document.addEventListener('DOMContentLoaded', () => {
    welcomeScreenEl = document.getElementById('welcome-screen');
    appContainerEl = document.getElementById('app-container');
    useGeoBtnEl = document.getElementById('use-geo-btn');
    manualCityFormEl = document.getElementById('manual-city-form');
    cityInputEl = document.getElementById('city-input');
    suggestionsListEl = document.getElementById('suggestions-list');
    errorMessageInputEl = document.getElementById('error-message-input');
    citiesListEl = document.getElementById('cities-list');
    refreshBtnEl = document.getElementById('refresh-btn');
    toggleViewBtnEl = document.getElementById('toggle-view-btn');
    weatherCenterEl = document.getElementById('weather-center');
    cityNameEl = document.getElementById('city-name');
    tempCEl = document.getElementById('temp-c');
    tempFEl = document.getElementById('temp-f');
    currentDescEl = document.getElementById('current-desc');
    timeDateEl = document.getElementById('time-date');
    forecastGridEl = document.getElementById('forecast-grid');
    addCityBtnEl = document.getElementById('add-city-btn');
    changeCityBtnEl = document.getElementById('change-city-btn');
    allWeatherContainerEl = document.getElementById('all-weather-container');
    errorMessageEl = document.getElementById('error-message');
    loadingEl = document.getElementById('loading');
    mouseTrailEl = document.getElementById('mouse-trail');

    if (!cityInputEl) {
        console.error("❌ Ошибка: элементы DOM не найдены. Проверьте HTML.");
        return;
    }

    initEventListeners();
    loadSavedState();
    applyViewToggle();
});

function initEventListeners() {
    cityInputEl.addEventListener('input', handleAutocomplete);
    manualCityFormEl?.addEventListener('submit', handleManualSubmit);
    useGeoBtnEl?.addEventListener('click', handleGeolocationClick);
    changeCityBtnEl?.addEventListener('click', handleChangeCityClick);
    addCityBtnEl?.addEventListener('click', handleAddCityClick);
    refreshBtnEl?.addEventListener('click', handleRefresh);
    toggleViewBtnEl?.addEventListener('click', handleToggleView);
    document.addEventListener('mousemove', createMouseTrail);
}

function loadSavedState() {
    if (userCities.length > 0) {
        renderCitiesList();
        if (currentViewedCity && currentViewedCity !== 'current') {
            loadWeatherForCity(currentViewedCity);
        }
    }
}

function handleAutocomplete(e) {
    const value = cityInputEl?.value?.trim().toLowerCase();
    
    if (!suggestionsListEl || !value) {
        if (suggestionsListEl) suggestionsListEl.classList.add('hidden');
        return;
    }

    suggestionsListEl.innerHTML = '';

    const matches = CITIES_LIST.filter(city => 
        city.toLowerCase().includes(value)
    );

    if (matches.length > 0) {
        matches.forEach(city => {
            const li = document.createElement('li');
            li.textContent = city;
            li.addEventListener('click', (event) => {
                event.preventDefault();
                cityInputEl.value = city; 
                suggestionsListEl.classList.add('hidden');
            });
            suggestionsListEl.appendChild(li);
        });
        suggestionsListEl.classList.remove('hidden');
    } else {
        suggestionsListEl.classList.add('hidden');
    }
}

function handleManualSubmit(e) {
    e.preventDefault();
    const cityName = cityInputEl?.value?.trim();

    if (!cityName) {
        showErrorInput("Заполните поле");
        return;
    }

    
    const foundCity = CITIES_LIST.find(city => 
        city.toLowerCase() === cityName.toLowerCase()
    );

    if (!foundCity) {
        showErrorInput("Введите корректный город");
        return;
    }

    hideErrorInput();

   
    const normalizedCityName = foundCity;

    if (!userCities.some(c => c.name === normalizedCityName)) {
        userCities.push({ name: normalizedCityName });
        if (userCities.length > 3) userCities.shift();
        localStorage.setItem('userCities', JSON.stringify(userCities));
        renderCitiesList();
    }

    loadWeatherForCity(normalizedCityName);
    switchToApp();
}

function handleChangeCityClick() {
    document.body.style.color = '#333'; // ← Сбрасываем цвет текста
    welcomeScreenEl.classList.remove('hidden');
    appContainerEl.classList.add('hidden');
    cityInputEl.value = '';
    suggestionsListEl.classList.add('hidden');
}

function handleAddCityClick() {
    document.body.style.color = '#333'; // ← Сбрасываем цвет текста
    welcomeScreenEl.classList.remove('hidden');
    appContainerEl.classList.add('hidden');
    cityInputEl.value = '';
    suggestionsListEl.classList.add('hidden');
} 
function handleGeolocationClick() {
    try {
        showLoading();
        hideError();
        getCurrentPosition()
            .then(async pos => {
                const locationData = await getLocationName(pos.lat, pos.lon);
                if (!locationData.name) {
                    showError("Не удалось получить местоположение");
                    hideLoading();
                    return;
                }
                localStorage.setItem('currentLocation', JSON.stringify({ lat: pos.lat, lon: pos.lon }));
                loadWeatherForCity('current');
                switchToApp();
            })
            .catch(err => {
                showError(err.message);
            });
    } catch (err) {
        showError(err.message);
    } finally {
        hideLoading();
    }
}

async function getLocationName(lat, lon) {
    const url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json&accept-language=ru`;
    const response = await fetch(url);
    if (!response.ok) throw new Error("Не удалось получить название места");
    const data = await response.json();
    return { name: data.display_name || `Широта: ${lat.toFixed(4)}, Долгота: ${lon.toFixed(4)}` };
}

function handleChangeCityClick() {
    welcomeScreenEl.classList.remove('hidden');
    appContainerEl.classList.add('hidden');
    cityInputEl.value = '';
    suggestionsListEl.classList.add('hidden');
}

function handleAddCityClick() {
    welcomeScreenEl.classList.remove('hidden');
    appContainerEl.classList.add('hidden');
    cityInputEl.value = '';
    suggestionsListEl.classList.add('hidden');
}

function handleRefresh() {
    if (currentViewedCity) {
        loadWeatherForCity(currentViewedCity);
    }
}

function handleToggleView() {
    isViewToggled = !isViewToggled;
    localStorage.setItem('isViewToggled', JSON.stringify(isViewToggled));
    toggleViewBtnEl.textContent = isViewToggled ? '🎨 Вернуть вид' : '🎨 Сменить вид';
    applyViewToggle();
}

function applyViewToggle() {
    if (isViewToggled) {
        document.body.style.background = 'linear-gradient(135deg, #f8bbd0, #fce4ec)';
        document.body.style.animation = 'pulse 3s infinite alternate';
        document.body.style.color = '#333';
        weatherCenterEl.classList.add('hidden');
        allWeatherContainerEl.classList.remove('hidden');
        renderAllCitiesWeather();
    } else {
       
        if (currentWeatherData) {
            const current = currentWeatherData.current_weather;
            setWeatherBackground(current.weathercode);
        }
        weatherCenterEl.classList.remove('hidden');
        allWeatherContainerEl.classList.add('hidden');
    }
}

function renderCitiesList() {
    citiesListEl.innerHTML = '';
    const currentBtn = document.createElement('button');
    currentBtn.className = `city-btn ${currentViewedCity === 'current' ? 'active' : ''}`;
    currentBtn.textContent = 'Текущее местоположение';
    currentBtn.dataset.city = 'current';
    currentBtn.addEventListener('click', () => loadWeatherForCity('current'));
    citiesListEl.appendChild(currentBtn);

    userCities.forEach(city => {
        const btn = document.createElement('button');
        btn.className = `city-btn ${currentViewedCity === city.name ? 'active' : ''}`;
        btn.textContent = city.name;
        btn.dataset.city = city.name;
        btn.addEventListener('click', () => loadWeatherForCity(city.name));

        const removeBtn = document.createElement('span');
        removeBtn.textContent = ' ×';
        removeBtn.style.cursor = 'pointer';
        removeBtn.style.marginLeft = '5px';
        removeBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            userCities = userCities.filter(c => c.name !== city.name);
            localStorage.setItem('userCities', JSON.stringify(userCities));
            renderCitiesList();
            if (currentViewedCity === city.name) {
                if (userCities.length > 0) {
                    loadWeatherForCity(userCities[0].name);
                } else {
                    loadWeatherForCity('current');
                }
            }
        });

        btn.appendChild(removeBtn);
        citiesListEl.appendChild(btn);
    });
}

async function loadWeatherForCity(cityName) {
    try {
        showLoading();
        hideError();
        let weatherData;

        if (cityName === 'current') {
            const loc = JSON.parse(localStorage.getItem('currentLocation'));
            if (!loc) throw new Error("Геолокация не сохранена");
            weatherData = await getWeatherByCoords(loc.lat, loc.lon);
            renderForecast(weatherData, "Текущее местоположение");
        } else {
            weatherData = await getWeatherByCity(cityName);
            renderForecast(weatherData, weatherData.cityName);
        }

        currentViewedCity = cityName;
        renderCitiesList();
    } catch (err) {
        showError(err.message);
    } finally {
        hideLoading();
    }
}

async function getWeatherByCoords(lat, lon) {
    const url = `${WEATHER_URL}?latitude=${lat}&longitude=${lon}&current_weather=true&daily=temperature_2m_max,temperature_2m_min,weathercode,sunrise,sunset&timezone=auto`;
    const response = await fetch(url);
    if (!response.ok) throw new Error("Ошибка получения погоды");
    return await response.json();
}

async function getWeatherByCity(cityName) {
    const coords = await getCoordsByCity(cityName);
    const data = await getWeatherByCoords(coords.lat, coords.lon);
    data.cityName = coords.name;
    return data;
}

async function getCoordsByCity(cityName) {
    const url = `${GEOCODING_URL}?q=${encodeURIComponent(cityName)}&format=json&addressdetails=1&limit=1`;
    const response = await fetch(url);
    if (!response.ok) throw new Error("Город не найден");
    const data = await response.json();
    if (data.length === 0) throw new Error("Город не найден");
    return {
        lat: parseFloat(data[0].lat),
        lon: parseFloat(data[0].lon),
        name: cityName 
    };
}


const weatherCodes = {
    0: { desc: "Ясно", bg: "#fdf6b3ff" },
    1: { desc: "Малооблачно", bg: "#f3edb9ff" },
    2: { desc: "Облачно с прояснениями", bg: "#bbdefb" },
    3: { desc: "Пасмурно", bg: "#4f8ec2ff" },
    45: { desc: "Туман", bg: "#e0e0e0" },
    48: { desc: "Изморозь", bg: "#e0e0e0" },
    51: { desc: "Морось", bg: "#64b5f6" },
    53: { desc: "Морось, средняя", bg: "#64b5f6" },
    55: { desc: "Морось, сильная", bg: "#42a5f5" },
    61: { desc: "Дождь", bg: "#5969fdff" },
    63: { desc: "Дождь, средний", bg: "#6876faff" },
    65: { desc: "Дождь, сильный", bg: "#3140c9ff" },
    71: { desc: "Снег", bg: "#ffffff" },
    73: { desc: "Снег, средний", bg: "#f5f5f5" },
    75: { desc: "Снег, сильный", bg: "#eeeeee" },
    77: { desc: "Снежная крупа", bg: "#e0e0e0" },
    80: { desc: "Небольшой дождь", bg: "#51b0fdff" },
    81: { desc: "Дождь", bg: "#4e66f1ff" },
    82: { desc: "Ливень", bg: "#096fc9ff" },
    85: { desc: "Небольшой снег", bg: "#ffffff" },
    86: { desc: "Снег", bg: "#f5f5f5" },
    95: { desc: "Гроза", bg: "#424242" },
    96: { desc: "Гроза с небольшим градом", bg: "#424242" },
    99: { desc: "Гроза с сильным градом", bg: "#212121" }
};

function setWeatherBackground(weatherCode) {
    if (isViewToggled) return; 

    const codeInfo = weatherCodes[weatherCode] || { bg: "#ffffff" };
    let gradient = `linear-gradient(135deg, ${codeInfo.bg}, ${adjustColor(codeInfo.bg, 15)})`;
    document.body.style.background = gradient;
    document.body.style.backgroundSize = '400% 400%';
    document.body.style.animation = 'gradientShift 8s ease infinite';
    document.body.style.color = isDarkColor(codeInfo.bg) ? '#fff' : '#333';

    if (changeCityBtnEl) {
        const rgb = hexToRgb(codeInfo.bg);
        changeCityBtnEl.style.backgroundColor = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.7)`;
        changeCityBtnEl.style.borderColor = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.85)`;
    }
}

function adjustColor(color, percent) {
    const { h, s, l } = hexToHSL(color);
    const newL = Math.min(100, Math.max(0, l + percent));
    return hslToHex(h, s, newL);
}

function hexToHSL(hex) {
    const r = parseInt(hex.substring(1, 3), 16) / 255;
    const g = parseInt(hex.substring(3, 5), 16) / 255;
    const b = parseInt(hex.substring(5, 7), 16) / 255;

    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    let h, s, l = (max + min) / 2;

    if (max === min) {
        h = s = 0;
    } else {
        const d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        switch (max) {
            case r: h = (g - b) / d + (g < b ? 6 : 0); break;
            case g: h = (b - r) / d + 2; break;
            case b: h = (r - g) / d + 4; break;
        }
        h = Math.round(h * 60);
        if (h < 0) h += 360;
    }

    return { h: h, s: Math.round(s * 100), l: Math.round(l * 100) };
}

function hslToHex(h, s, l) {
    h = h / 360;
    s = s / 100;
    l = l / 100;

    let r, g, b;

    if (s === 0) {
        r = g = b = l;
    } else {
        const hue2rgb = (p, q, t) => {
            if (t < 0) t += 1;
            if (t > 1) t -= 1;
            if (t < 1/6) return p + (q - p) * 6 * t;
            if (t < 1/2) return q;
            if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
            return p;
        };

        const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
        const p = 2 * l - q;

        r = hue2rgb(p, q, h + 1/3);
        g = hue2rgb(p, q, h);
        b = hue2rgb(p, q, h - 1/3);
    }

    const toHex = (x) => {
        const hex = Math.round(x * 255).toString(16);
        return hex.length === 1 ? '0' + hex : hex;
    };

    return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

function isDarkColor(hex) {
    const r = parseInt(hex.substring(1, 3), 16);
    const g = parseInt(hex.substring(3, 5), 16);
    const b = parseInt(hex.substring(5, 7), 16);
    return (r * 0.299 + g * 0.587 + b * 0.114) <= 186;
}

function hexToRgb(hex) {
    const r = parseInt(hex.substring(1, 3), 16);
    const g = parseInt(hex.substring(3, 5), 16);
    const b = parseInt(hex.substring(5, 7), 16);
    return { r, g, b };
}

function renderForecast(data, cityName) {
    const current = data.current_weather;
    const daily = data.daily;

    if (cityNameEl) cityNameEl.textContent = cityName;
    if (tempCEl) tempCEl.textContent = `${Math.round(current.temperature)}°C`;
    if (tempFEl) tempFEl.textContent = `${Math.round(current.temperature * 9/5 + 32)}°F`;

    const weatherCode = current.weathercode;
    const codeInfo = weatherCodes[weatherCode] || { desc: "Неизвестно" };
    if (currentDescEl) currentDescEl.textContent = codeInfo.desc;

    if (timeDateEl && current.time) {
        const currentTime = new Date(current.time);
        const dateStr = currentTime.toLocaleDateString('ru-RU');
        const timeStr = currentTime.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
        timeDateEl.textContent = `${dateStr} ${timeStr}`;
    } else {
        if (timeDateEl) timeDateEl.textContent = 'Неизвестно';
    }

    if (forecastGridEl) {
        forecastGridEl.innerHTML = daily.time.slice(0, 6).map((dateStr, i) => {
            const date = new Date(dateStr);
            const weatherCode = daily.weathercode[i];
            const codeInfo = weatherCodes[weatherCode] || { desc: "Неизвестно" };
            const maxTemp = Math.round(daily.temperature_2m_max[i]);
            const minTemp = Math.round(daily.temperature_2m_min[i]);

            return `
                <div class="day-card">
                    <div class="day-short">${date.toLocaleDateString('ru-RU', { weekday: 'short' }).slice(0, 2)}</div>
                    <div class="desc">${codeInfo.desc}</div>
                    <div class="temp-range">↑${maxTemp}° ↓${minTemp}°</div>
                </div>
            `;
        }).join('');
    }

    if (!isViewToggled) setWeatherBackground(weatherCode);

    currentWeatherData = data;
}

async function renderAllCitiesWeather() {
    allWeatherContainerEl.innerHTML = '';
    const citiesToRender = [{ name: 'current' }].concat(userCities);

    for (const city of citiesToRender) {
        try {
            let weatherData;
            let cityName;

            if (city.name === 'current') {
                const loc = JSON.parse(localStorage.getItem('currentLocation'));
                if (!loc) continue;
                weatherData = await getWeatherByCoords(loc.lat, loc.lon);
                cityName = "Текущее местоположение";
            } else {
                weatherData = await getWeatherByCity(city.name);
                cityName = weatherData.cityName;
            }

            const current = weatherData.current_weather;
            const daily = weatherData.daily;

            const card = document.createElement('div');
            card.className = 'all-weather-card';

            card.innerHTML = `
                <h3>${cityName}</h3>
                <div class="temp">${Math.round(current.temperature)}°C</div>
                <div class="desc">${weatherCodes[current.weathercode]?.desc || "Неизвестно"}</div>
                <div class="time">${new Date(current.time).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}</div>
                <div class="forecast-list">
                    ${daily.time.slice(0, 6).map((dateStr, i) => {
                        const date = new Date(dateStr);
                        const codeInfo = weatherCodes[daily.weathercode[i]] || { desc: "Неизвестно" };
                        const maxTemp = Math.round(daily.temperature_2m_max[i]);
                        const minTemp = Math.round(daily.temperature_2m_min[i]);
                        return `<div class="forecast-day">${date.toLocaleDateString('ru-RU', { weekday: 'short' }).slice(0, 2)} ↑${maxTemp}° ↓${minTemp}° ${codeInfo.desc}</div>`;
                    }).join('')}
                </div>
            `;

            allWeatherContainerEl.appendChild(card);
        } catch (err) {
            console.error("Ошибка при загрузке погоды для города", city.name, err);
        }
    }
}

function getCurrentPosition() {
    return new Promise((resolve, reject) => {
        if (!navigator.geolocation) {
            reject(new Error("Геолокация не поддерживается"));
            return;
        }

        navigator.geolocation.getCurrentPosition(
            pos => resolve({ lat: pos.coords.latitude, lon: pos.coords.longitude }),
            err => {
                console.log("Ошибка геолокации:", err.message);
                reject(new Error("Не удалось получить местоположение. Проверьте разрешения."));
            },
            { timeout: 10000 }
        );
    });
}

function showError(message) {
    if (errorMessageEl) {
        errorMessageEl.querySelector('p').textContent = message;
        errorMessageEl.classList.remove('hidden');
    }
}

function hideError() {
    if (errorMessageEl) errorMessageEl.classList.add('hidden');
}

function showErrorInput(message) {
    if (errorMessageInputEl) {
        errorMessageInputEl.textContent = message;
        errorMessageInputEl.classList.remove('hidden');
    }
}

function hideErrorInput() {
    if (errorMessageInputEl) errorMessageInputEl.classList.add('hidden');
}

function showLoading() {
    if (loadingEl) loadingEl.classList.remove('hidden');
}

function hideLoading() {
    if (loadingEl) loadingEl.classList.add('hidden');
}

function switchToApp() {
    welcomeScreenEl.classList.add('hidden');
    appContainerEl.classList.remove('hidden');
}

function createMouseTrail(e) {
    if (!mouseTrailEl) return;

    const centerRect = weatherCenterEl?.getBoundingClientRect();
    if (!centerRect) return;

    const isOverCenter = (
        e.clientX >= centerRect.left &&
        e.clientX <= centerRect.right &&
        e.clientY >= centerRect.top &&
        e.clientY <= centerRect.bottom
    );

    if (isOverCenter) return;

    const trail = document.createElement('div');
    trail.style.position = 'absolute';
    trail.style.left = `${e.clientX}px`;
    trail.style.top = `${e.clientY}px`;
    trail.style.width = '8px';
    trail.style.height = '8px';
    trail.style.borderRadius = '50%';
    trail.style.background = 'radial-gradient(circle, rgba(255,255,255,0.8) 0%, rgba(255,255,255,0) 70%)';
    trail.style.pointerEvents = 'none';
    trail.style.transition = 'all 0.5s ease-out';
    trail.style.transform = 'scale(0)';
    trail.style.zIndex = '9999';
    mouseTrailEl.appendChild(trail);

    setTimeout(() => {
        trail.style.transform = 'scale(1)';
        setTimeout(() => {
            trail.style.opacity = '0';
            setTimeout(() => {
                trail.remove();
            }, 500);
        }, 1000);
    }, 10);
}