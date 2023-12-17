'use strict';


class Workout {
	date = new Date();
	idString = new Date(this.date);
	id = (this.idString.getTime() + '').slice(-7);
	
	constructor(coords, distance, duration){
		this.coords = coords;
		this.distance = distance;
		this.duration = duration;
	}
	
	_setDescription(){
		// prettier-ignore
		const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
		
		// this.description = `${this.type[0].toUppercase()}${this.type.slice(1)} on ${months[this.date.getMonth()]} ${this.date.getDate()}`
		this.description = `${this.type[0].toUpperCase()}${this.type.slice(1)} on ${months[this.date.getMonth()]} ${this.date.getDate()}`;
	}

}

class Running extends Workout {
	type = 'running';
	constructor (coords, distance, duration, cadence){
		super(coords, distance, duration);
		this.cadence = cadence;
		this.calcPace();
		this._setDescription();
	}

	calcPace(){
		this.pace = this.duration / this.distance;
		return this.pace;
	}
}


class Cycling extends Workout {
	type = 'cycling';
	constructor(coords, distance, duration, elevationGain){
		super(coords, distance, duration);
		this.elevationGain = elevationGain;
		this.calcSpeed();
		this._setDescription();
	}

	calcSpeed() {
		//km/hr
		this.speed = this.distance / this.duration;
		return this.speed
	}
}

///////////////////////////////////////////
//APPLICATION ARCHITECTURE
const form = document.querySelector('.form');
const containerWorkouts = document.querySelector('.workouts');
const inputType = document.querySelector('.form__input--type');
const inputDistance = document.querySelector('.form__input--distance');
const inputDuration = document.querySelector('.form__input--duration');
const inputCadence = document.querySelector('.form__input--cadence');
const inputElevation = document.querySelector('.form__input--elevation');


class App {
	//Declaring private instance properties with #:  properties that will be present on all instances of this class
	#map;
	#mapEvent;
	#workouts = [];
	#zoomLevel = 16;

	// the constructor function gets executed immediately when this class is created
	constructor() {
		//Get user's position
		this._getPosition();

		//Get data from local storage
		this._getLocalStorage();
		
		//Attach event listeners
		form.addEventListener('submit', this._newWorkout.bind(this));
		inputType.addEventListener('change', this._toggleElevationField);
		containerWorkouts.addEventListener('click', this._moveToPopup.bind(this));
	}
	
	_getPosition() {
		//232 Using the geolocation API
		if(navigator.geolocation) {
			navigator.geolocation.getCurrentPosition(
				this._loadMap.bind(this),
				function(){
					alert('could not get your location')
				}
				);
			}
		}

	_loadMap(position) {
		const {latitude} = position.coords;
		const {longitude} = position.coords;
		const coords = [latitude, longitude];
		
		this.#map = L.map('map').setView(coords, this.#zoomLevel);
		
		L.tileLayer('https://tile.openstreetmap.fr/hot/{z}/{x}/{y}.png', {
			attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
		}).addTo(this.#map);
		
		
		this.#map.on('click', this._showForm.bind(this));

		this.#workouts.forEach(w => {
			this._renderWorkoutMarker(w);
		})
	}
		
	_showForm(mapE) {
		this.#mapEvent = mapE;
		form.classList.remove('hidden');
		inputDistance.focus();
	}
	
	_hideForm(){
		//Hide form and clear fields
		inputDistance.value = inputDuration.value = inputCadence.value = inputElevation.value = '';
		
		form.style.display = 'none';
		form.classList.add('hidden');
		
		setTimeout( () => form.style.display = 'grid', 1000)
	}
		
	_toggleElevationField() {
		//.closest() method is a DOM traversal method that selects the closest parent of an element
		inputElevation.closest('.form__row').classList.toggle('form__row--hidden')
		inputCadence.closest('.form__row').classList.toggle('form__row--hidden')
	}
		
	_newWorkout(e) {
		e.preventDefault();

		//Get data from the form
		const type = inputType.value;
		const distance = +inputDistance.value;
		const duration = +inputDuration.value;
		const {lat, lng} = this.#mapEvent.latlng;
		let workout;


		// the rest parameter (...) allows a function to accept an arbitrary number of arguments as an array
		const validInputs = (...inputs) => {
			return inputs.every(input => Number.isFinite(input));
		}

		const positiveNumber = (...inputs) => {
			return inputs.every(inp => inp > 0);
		}
		
		//If workout is running, create running object
		if (type === 'running') {
			const cadence = +inputCadence.value;

			if (
				!validInputs(distance, duration, cadence) ||
				!positiveNumber(distance, duration, cadence)
			) return alert('Inputs have to be positive numbers!')
			
			workout = new Running([lat, lng], distance, duration, cadence);
		}


		if (type === 'cycling') {
			const elevation = +inputElevation.value;

			if (!validInputs(distance, duration, elevation) || !positiveNumber(distance, duration))
				return alert('Inputs have to be positive numbers!')

			workout = new Cycling([lat, lng], distance, duration, elevation);
		}

		this.#workouts.push(workout);

		this._renderWorkoutMarker(workout);
		
		//Render workout on list
		this._renderWorkoutList(workout);

		this._hideForm();

		//set local storage to all workouts
		this._setLocalStorage();
	}

	_renderWorkoutMarker(workout) {
		L.marker(workout.coords).addTo(this.#map)
		.bindPopup(L.popup({
			maxWidth: 250,
			minWidth: 100,
			autoClose: false,
			closeOnClick: false,
			className: `${workout.type}-popup`
		}))
		.setPopupContent(`${workout.type === 'running' ? '🏃‍♂️' : '🚴‍♀️'} ${workout.description}`)
		.openPopup();
	}

	_renderWorkoutList(workout){
		let html = 
			`
				<li class="workout workout--${workout.type}" data-id=${workout.id}>
					<h2 class="workout__title">${workout.description}</h2>
					<div class="workout__details">
						<span class="workout__icon">${workout.type === 'running' ? '🏃‍♂️' : '🚴‍♀️'}</span>
						<span class="workout__value">${workout.distance}</span>
						<span class="workout__unit">km</span>
					</div>
					<div class="workout__details">
						<span class="workout__icon">⏱</span>
						<span class="workout__value">${workout.duration}</span>
						<span class="workout__unit">min</span>
					</div>
			`;

		if (workout.type === 'running')
			html += 
			`
					<div class="workout__details">
						<span class="workout__icon">⚡️</span>
						<span class="workout__value">${workout.pace.toFixed(1)}</span>
						<span class="workout__unit">min/km</span>
					</div>
					<div class="workout__details">
						<span class="workout__icon">🦶🏼</span>
						<span class="workout__value">${workout.cadence}</span>
						<span class="workout__unit">spm</span>
					</div>
				</li>
			`;

		if (workout.type === 'cycling')
			html += 
			`
					<div class="workout__details">
						<span class="workout__icon">⚡️</span>
						<span class="workout__value">${workout.speed}</span>
						<span class="workout__unit">km/h</span>
					</div>
					<div class="workout__details">
						<span class="workout__icon">⛰</span>
						<span class="workout__value">${workout.elevationGain}</span>
						<span class="workout__unit">m</span>
					</div>
				</li>
			`

		form.insertAdjacentHTML('afterend', html);
	}

	//Here the event is attached to the parent element
	//we're passing in an event so that we can match and find the element where the event happened
	_moveToPopup(e){
		const selectedElement = e.target.closest('.workout');
		if (!selectedElement) return;

		const selectedWorkout  = this.#workouts.find((w)=>w.id == selectedElement.dataset.id)

		this.#map.setView(selectedWorkout.coords, this.#zoomLevel, {
			animate: true,
			pan: {
				duration: 1
			}
		})
	}

	_setLocalStorage(){
		localStorage.setItem('workouts', JSON.stringify(this.#workouts));
	}

	_getLocalStorage(){
		const localData = JSON.parse(localStorage.getItem('workouts'));

		if (!localData) return;

		this.#workouts = localData;

		this.#workouts.forEach(w => {
			this._renderWorkoutList(w);
		})
	}
}

const app = new App();