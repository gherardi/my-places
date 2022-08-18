import * as L from 'leaflet';
import 'dotenv/config';
import marker from '/node_modules/leaflet/src/images/marker.svg';

const { MAPBOX_TOKEN } = process.env;
const BASE_URL = 'https://api.mapbox.com/geocoding/v5/mapbox.places/';

const homeEl = document.querySelector('#home');
const gotoForm = document.querySelector('#gotoForm');
const gotoPlaceInputEl = document.querySelector('#gotoPlace');
const addPlaceFormEl = document.querySelector('#addPlaceForm');
const addPlaceInputEl = document.querySelector('#addPlace');
const placesContainer = document.querySelector('#places-container');

class App {
  #home;
  #map;
  #mapZoom = 16;
  #mapEvent;
  #places = [];
  #dateFormat = {
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  };

  constructor() {
    this.#getLocaleStorage();
    this.#getPosition();

    homeEl.addEventListener('click', this.#setView.bind(this, this.#home));
    // homeEl.addEventListener('click', () => this.#setView());
    placesContainer.addEventListener('click', this.#handleClick.bind(this));
    gotoForm.addEventListener('submit', this.#gotoPlace.bind(this));
    addPlaceFormEl.addEventListener('submit', this.#newPlace.bind(this));
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
    const coordsLabel = document.querySelector('#coordsLocation');
    const homeLabel = document.querySelector('#homeLocation');
    try {
      coordsLabel.textContent = `${this.#home.latitude}, ${this.#home.longitude}`;
      const data = await this.#geocoding('reverse', this.#home);
      if (Object.keys(data).length === 0) throw new Error('No data found');
      const locality = data.context.find(item => item.id.includes('place')).text;
      homeLabel.textContent = `📌 near ${locality}`;
      this.#renderPlaceMarker({ name: `current position: ${locality}`, coords: this.#home });
    } catch (err) {
      homeLabel.textContent = `📌 unable to find location`;
      this.#renderPlaceMarker({ name: 'no data found', coords: this.#home });
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
      let url = '';
      if (type === 'forward') {
        url = `${BASE_URL}${encodeURI(query)}.json?access_token=${MAPBOX_TOKEN}&limit=1`;
      } else if (type === 'reverse') {
        const { latitude, longitude } = query;
        url = `${BASE_URL}${longitude},${latitude}.json?access_token=${MAPBOX_TOKEN}&limit=1`;
      }

      const res = await Promise.race([fetch(url), this.#timeout(14)]);
      if (!res.ok) throw new Error('failed to fetch');
      const { features } = await res.json();
      return features[0];
    } catch (err) {
      throw err;
    }
  }

  async #newPlace(e) {
    e.preventDefault();
    try {
      const { lat: latitude, lng: longitude } = this.#mapEvent.latlng;
      const cityData = await this.#geocoding('reverse', { latitude, longitude });
      const locality = cityData.context.find(item => item.id.includes('place')).text;
      const date = new Date().toISOString();
      const place = {
        name: addPlaceInputEl.value,
        id: Date.now(),
        coords: { latitude, longitude },
        locality,
        date,
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
    const date = new Intl.DateTimeFormat(navigator.language, this.#dateFormat).format(new Date(place.date));
    const markup = `
      <div class="place" data-id="${place.id}">
        <div class="col-span-2 pointer-events-none">
          <p class="text-xs">${date}</p>
          <p class="truncate">${place.name}</p>
        </div>
        <div class="col-span-1 grid grid-cols-3">
          <p class="text-xs text-end col-span-3 pointer-events-none">${
            place.locality ? place.locality : 'not found'
          }</p>
          <p class="col-span-2 font-semibold text-end pointer-events-none">${distance} km</p>
          <svg xmlns="http://www.w3.org/2000/svg" class="ml-auto my-auto h-5 w-5 trash fill-red-400" viewBox="0 0 20 20">
            <path class="pointer-events-none" fill-rule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clip-rule="evenodd" />
          </svg>
        </div>
      </div>
    `;
    placesContainer.insertAdjacentHTML('beforeend', markup);
  }

  #calcDistance(home = this.#home, destination) {
    const { PI } = Math;
    const homeLat = (home.latitude * PI) / 180;
    const homeLon = (home.longitude * PI) / 180;
    const destLat = (destination.latitude * PI) / 180;
    const destLon = (destination.longitude * PI) / 180;

    const { cos, sin, acos } = Math;
    const distance = acos(cos(homeLon - destLon) * cos(homeLat) * cos(destLat) + sin(homeLat) * sin(destLat)) * 6378;

    return distance.toFixed(1);
  }

  #renderPlaceMarker(place) {
    const { latitude, longitude } = place.coords;
    const icon = L.icon({
      iconUrl: marker,
      iconSize: 40,
    });
    L.marker([latitude, longitude], { icon })
      .addTo(this.#map)
      .bindPopup(
        L.popup({
          autoClose: false,
          closeOnClick: false,
        })
      )
      .setPopupContent(`${place.name}`);
  }

  #setView(coords = this.#home) {
    const { latitude, longitude } = coords;
    this.#map.setView([latitude, longitude], this.#mapZoom, {
      animate: true,
      pan: {
        duration: 1,
      },
    });
  }

  #handleClick(e) {
    if (e.target.classList.contains('trash')) {
      const placeEl = e.target.closest('.place');
      this.#places = this.#places.filter(place => place.id !== Number(placeEl.dataset.id));
      placeEl.remove();
      this.#setLocaleStorage();
      location.reload();
      return;
    }
    if (!e.target.classList.contains('place')) return;
    const id = +e.target.dataset.id;
    const place = this.#places.find(place => place.id === id);
    this.#setView(place.coords);
  }

  #showForm(e) {
    this.#mapEvent = e;
    addPlaceFormEl.classList.remove('hidden');
  }

  #hideForm() {
    addPlaceInputEl.value = '';
    addPlaceFormEl.classList.add('hidden');
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

  async #gotoPlace(e) {
    e.preventDefault();
    const text = gotoPlaceInputEl.value;
    gotoPlaceInputEl.value = '';
    const data = await this.#geocoding('forward', text);
    console.log(data);
    const [longitude, latitude] = data.center;
    this.#setView({ latitude, longitude });
  }
}
const app = new App();
