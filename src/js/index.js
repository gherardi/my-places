import * as L from 'leaflet';
import 'dotenv/config';

const { API_TOKEN } = process.env;
const BASE_URL = 'http://api.positionstack.com/v1/';

const homeEl = document.querySelector('#home');
const formEl = document.querySelector('form');
const inputEl = document.querySelector('#addPlace');
const placesContainer = document.querySelector('#places-container');

class App {
  #home;
  #map;
  #mapZoom = 16;
  #mapEvent;
  #places = [];

  constructor() {
    this.#getLocaleStorage();
    this.#getPosition();

    homeEl.addEventListener('click', this.#moveToPopup.bind(this));
    placesContainer.addEventListener('click', this.#moveToPopup.bind(this));
    formEl.addEventListener('submit', this.#newPlace.bind(this));
    document.addEventListener('keyup', e => (e.key === 'Escape' ? this.#hideForm() : ''));
  }

  #getPosition() {
    navigator.geolocation?.getCurrentPosition(this.#loadCoordinates.bind(this), this.#renderError);
  }

  #loadCoordinates(position) {
    this.#home = position.coords;
    this.#loadInformation();
    this.#loadMap();
    this.#places?.forEach(place => {
      this.#renderPlace(place);
      this.#renderPlaceMarker(place);
    });
  }

  async #loadInformation() {
    try {
      const homeLabel = document.querySelector('#homeLocation');
      const data = await this.#geocoding('reverse', this.#home);
      homeLabel.textContent = `near ${data.administrative_area}`;
    } catch (err) {
      this.#renderError(err);
    }
  }

  #loadMap() {
    const { latitude, longitude } = this.#home;
    const coords = [latitude, longitude];
    this.#map = L.map('map', {
      center: coords,
      zoom: this.#mapZoom,
    });
    L.tileLayer('https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png').addTo(this.#map);
    this.#map.on('click', this.#showForm.bind(this));
  }

  async #geocoding(type = 'forward', query) {
    try {
      let url = `${BASE_URL}${type}?access_key=${API_TOKEN}&`;
      if (type === 'forward') {
        url += `query=${encodeURI(query)}&limit=1`;
      } else if (type === 'reverse') {
        const { latitude, longitude } = query;
        url += `query=${latitude},${longitude}&limit=1`;
      }
      const res = await Promise.race([fetch(url), this.#timeout(4)]);
      if (!res.ok) throw new Error('failed to fetch: ', res.status);
      const { data } = await res.json();
      return data[0];
    } catch (err) {
      throw err;
    }
  }

  async #newPlace(e) {
    e.preventDefault();
    try {
      const { lat: latitude, lng: longitude } = this.#mapEvent.latlng;
      const cityData = await this.#geocoding('reverse', { latitude, longitude });
      const city = cityData.administrative_area;
      const place = {
        city,
        name: inputEl.value,
        id: Date.now(),
        coords: { latitude, longitude },
      };
      this.#places.push(place);
      this.#renderPlace(place);
      this.#renderPlaceMarker(place);
      this.#setLocaleStorage();
    } catch (err) {
      this.#renderError(err);
    }
    this.#hideForm();
  }

  #renderPlace(place) {
    const distance = this.#calcDistance(this.#home, place.coords);
    const markup = `
      <div class="place" data-id="${place.id}">
        <div class="col-span-2 pointer-events-none">
          <p class="text-sm italic">${place.city}</p>
          <p class="truncate">${place.name}</p>
        </div>
        <div class="col-span-1 flex items-end justify-end pointer-events-none">
          <p class="mr-3 font-semibold">${distance} km</p>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            class="h-7 w-7"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            stroke-width="2"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        </div>
      </div>
    `;
    placesContainer.insertAdjacentHTML('afterbegin', markup);
  }

  #calcDistance(home, destination) {
    const { PI } = Math;
    const homeLat = (home.latitude * PI) / 180;
    const homeLon = (home.longitude * PI) / 180;
    const destLat = (destination.latitude * PI) / 180;
    const destLon = (destination.longitude * PI) / 180;

    const { cos, sin, acos } = Math;

    const distance = acos(cos(homeLon - destLon) * cos(homeLat) * cos(destLat) + sin(homeLat) * sin(destLat)) * 6378;

    return distance.toFixed(1);
  }

  #renderPlaceMarker() {}

  #moveToPopup(e) {
    let destination = null;
    if (e.target.classList.contains('home')) {
      const { latitude, longitude } = this.#home;
      destination = [latitude, longitude];
    } else if (e.target.classList.contains('place')) {
      const id = +e.target.dataset.id;
      const place = this.#places.find(place => place.id === id);
      const { latitude, longitude } = place.coords;
      destination = [latitude, longitude];
    } else return;

    this.#map.setView(destination, this.#mapZoom, {
      animate: true,
      pan: {
        duration: 1,
      },
    });
  }

  #showForm(e) {
    this.#mapEvent = e;
    formEl.classList.remove('hidden');
  }

  #hideForm() {
    inputEl.value = '';
    formEl.classList.add('hidden');
  }

  #renderError(err) {
    // ci sarà un toast in alto a destra con l'errore scritto
    console.error(err.message);
  }

  #timeout(s) {
    return new Promise((_, reject) => {
      setTimeout(() => {
        reject(new Error(`Request took too long! Timeout after ${s} second`));
      }, s * 1000);
    });
  }

  #setLocaleStorage() {
    localStorage.setItem('places', JSON.stringify(this.#places));
  }

  #getLocaleStorage() {
    const places = JSON.parse(localStorage.getItem('places'));
    if (!places) return;
    this.#places = places;
  }
}
const app = new App();

// todo: fare il rendermarker
// todo: fare il goto nella ui per andare in un indirizzo specifico
// todo: cambiare l'svg info con un cestino, che se lo clicco elimina il place
// todo: mettere la data in formato gg/mm/aaaa - hh:mm sopra i kilometri