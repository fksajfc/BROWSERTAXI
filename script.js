const openBooking = document.getElementById('openBooking');
const locateMe = document.getElementById('locateMe');
const paymentModal = document.getElementById('paymentModal');
const confirmationModal = document.getElementById('confirmationModal');
const paymentBackdrop = document.getElementById('paymentBackdrop');
const confirmationBackdrop = document.getElementById('confirmationBackdrop');
const closePayment = document.getElementById('closePayment');
const closeConfirmation = document.getElementById('closeConfirmation');
const orderNow = document.getElementById('orderNow');
const paymentForm = document.getElementById('paymentForm');
const summaryRoute = document.getElementById('summaryRoute');
const summaryClass = document.getElementById('summaryClass');
const summaryPrice = document.getElementById('summaryPrice');
const summaryPaymentMethod = document.getElementById('summaryPaymentMethod');
const paymentResult = document.getElementById('paymentResult');
const fromInput = document.getElementById('fromInput');
const toInput = document.getElementById('toInput');
const rideTime = document.getElementById('rideTime');
const phoneInput = document.getElementById('phoneInput');
const serviceBtns = Array.from(document.querySelectorAll('.service-btn'));
const priceTag = document.getElementById('priceTag');
const etaTag = document.getElementById('etaTag');
const timeTag = document.getElementById('timeTag');
const routePreview = document.getElementById('routePreview');
const distanceTag = document.getElementById('distanceTag');
const travelTimeTag = document.getElementById('travelTimeTag');
const realEta = document.getElementById('realEta');
const availableCars = document.getElementById('availableCars');
const orderCard = document.getElementById('orderCard');
const lastOrderId = document.getElementById('lastOrderId');
const lastOrderStatus = document.getElementById('lastOrderStatus');
const lastOrderRoute = document.getElementById('lastOrderRoute');
const lastOrderClass = document.getElementById('lastOrderClass');
const lastOrderPrice = document.getElementById('lastOrderPrice');
const confirmationOrderId = document.getElementById('confirmationOrderId');
const confirmationRoute = document.getElementById('confirmationRoute');
const confirmationTime = document.getElementById('confirmationTime');
const confirmationClass = document.getElementById('confirmationClass');
const confirmationPaymentMethod = document.getElementById('confirmationPaymentMethod');
const confirmationPrice = document.getElementById('confirmationPrice');
const cardFields = document.getElementById('cardFields');
const paymentSubmit = document.getElementById('paymentSubmit');
const cardNumberInput = document.getElementById('cardNumber');
const cardExpiryInput = document.getElementById('cardExpiry');

let orderHistory = JSON.parse(localStorage.getItem('orderHistory')) || [];
let paymentHistory = JSON.parse(localStorage.getItem('paymentHistory')) || [];
let currentOrder = null;
let selectedClass = 'econom';
let fromCoords = null;
let toCoords = null;
let map = null;
let fromMarker = null;
let toMarker = null;
let routeLine = null;
const CURRENT_LOCATION_LABEL = 'Мое местоположение';
let fromIsCurrentLocation = false;

const services = {
  econom: { title: 'Эконом', base: 120, perKm: 25, eta: 6, note: '3' },
  comfort: { title: 'Комфорт', base: 210, perKm: 35, eta: 5, note: '2' },
  business: { title: 'Бизнес', base: 390, perKm: 55, eta: 4, note: '1' },
};

function toggleModal(modal, show) {
  modal.classList.toggle('hidden', !show);
  modal.setAttribute('aria-hidden', String(!show));
}

function initMap() {
  map = L.map('map', {
    center: [55.751244, 37.618423],
    zoom: 10,
    zoomControl: true,
  });

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap contributors',
  }).addTo(map);
}

function haversine([lat1, lon1], [lat2, lon2]) {
  const R = 6371;
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

async function geocodeAddress(address) {
  const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}`);
  const data = await response.json();
  if (data && data.length) {
    return {
      lat: parseFloat(data[0].lat),
      lon: parseFloat(data[0].lon),
      displayName: data[0].display_name,
    };
  }
  return null;
}

function updateMap() {
  if (!map) return;

  if (fromMarker) {
    map.removeLayer(fromMarker);
    fromMarker = null;
  }
  if (toMarker) {
    map.removeLayer(toMarker);
    toMarker = null;
  }
  if (routeLine) {
    map.removeLayer(routeLine);
    routeLine = null;
  }

  const markers = [];

  if (fromCoords) {
    fromMarker = L.marker([fromCoords.lat, fromCoords.lon], { title: 'Вы' }).addTo(map).bindPopup('Вы здесь');
    markers.push([fromCoords.lat, fromCoords.lon]);
  }

  if (toCoords) {
    toMarker = L.marker([toCoords.lat, toCoords.lon], { title: 'Точка назначения' }).addTo(map).bindPopup('Точка назначения');
    markers.push([toCoords.lat, toCoords.lon]);
  }

  if (fromCoords && toCoords) {
    routeLine = L.polyline([
      [fromCoords.lat, fromCoords.lon],
      [toCoords.lat, toCoords.lon],
    ], { color: '#f7b500', weight: 5, opacity: 0.8 }).addTo(map);
  }

  if (markers.length) {
    const bounds = L.latLngBounds(markers);
    map.fitBounds(bounds.pad(0.3));
  }
}

async function reverseGeocode(coords) {
  try {
    const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${coords.lat}&lon=${coords.lon}`);
    const data = await response.json();
    return data.display_name || null;
  } catch (error) {
    return null;
  }
}

async function setFromLocation(coords) {
  fromCoords = coords;
  fromIsCurrentLocation = true;
  const address = await reverseGeocode(coords);
  fromInput.value = address || CURRENT_LOCATION_LABEL;
  updateRouteInfo();
}

function parseDistance() {
  const fromValue = fromInput.value.trim();
  const toValue = toInput.value.trim();
  if (!fromValue || !toValue) return 0;
  return Math.max(3, Math.min(18, Math.floor((fromValue.length + toValue.length) / 5)));
}

function updateRouteInfo(distance = null) {
  const service = services[selectedClass];
  let routeDistance = distance;

  if (!routeDistance && fromCoords && toCoords) {
    routeDistance = haversine([fromCoords.lat, fromCoords.lon], [toCoords.lat, toCoords.lon]);
  }

  if (!routeDistance) {
    routeDistance = parseDistance();
  }

  const price = Math.max(0, Math.round(service.base + routeDistance * service.perKm));
  const travelMinutes = Math.max(8, Math.round(routeDistance * 4));
  const etaMinutes = service.eta + Math.floor(Math.random() * 3);

  priceTag.textContent = `${price} ₽`;
  timeTag.textContent = `${travelMinutes} мин`;
  travelTimeTag.textContent = `${travelMinutes} мин`;
  distanceTag.textContent = routeDistance ? `${Math.round(routeDistance)} км` : '0 км';
  realEta.textContent = `${etaMinutes} мин`;
  availableCars.textContent = service.note;
  routePreview.textContent = fromInput.value && toInput.value ? `${fromInput.value.trim()} → ${toInput.value.trim()}` : 'Укажите адреса';

  return { price, travelMinutes, etaMinutes, distance: routeDistance };
}

function selectService(key) {
  selectedClass = key;
  serviceBtns.forEach((button) => {
    button.classList.toggle('selected', button.dataset.class === key);
  });
  updateRouteInfo();
}

async function geolocateUser() {
  if (!navigator.geolocation) {
    alert('Геолокация не поддерживается в вашем браузере.');
    return;
  }

  locateMe.disabled = true;
  locateMe.textContent = 'Определяю...';

  navigator.geolocation.getCurrentPosition(async (position) => {
    const coords = {
      lat: position.coords.latitude,
      lon: position.coords.longitude,
    };
    await setFromLocation(coords);

    const toText = toInput.value.trim();
    if (toText && !toCoords) {
      const toInfo = await geocodeAddress(toText);
      if (toInfo) {
        toCoords = { lat: toInfo.lat, lon: toInfo.lon };
      }
    }

    updateMap();
    updateRouteInfo();
    locateMe.disabled = false;
    locateMe.textContent = 'Найти меня';
  }, (error) => {
    alert('Не удалось получить местоположение: ' + error.message);
    locateMe.disabled = false;
    locateMe.textContent = 'Найти меня';
  });
}

async function orderNowHandler() {
  if (!fromInput.value.trim() || !toInput.value.trim()) {
    alert('Укажите адрес отправления и пункт назначения.');
    return;
  }
  if (!rideTime.value) {
    alert('Выберите время подачи.');
    return;
  }
  if (!phoneInput.value.trim()) {
    alert('Укажите телефон для связи.');
    return;
  }
  const rideDate = new Date(rideTime.value);
  if (rideDate <= new Date()) {
    alert('Время подачи должно быть в будущем.');
    return;
  }

  const fromText = fromInput.value.trim();
  const toText = toInput.value.trim();

  if (!fromCoords || !fromIsCurrentLocation) {
    const fromInfo = await geocodeAddress(fromText);
    if (!fromInfo) {
      alert('Не удалось найти адрес отправления.');
      return;
    }
    fromCoords = { lat: fromInfo.lat, lon: fromInfo.lon };
    fromIsCurrentLocation = false;
  }

  const toInfo = await geocodeAddress(toText);
  if (!toInfo) {
    alert('Не удалось найти адрес назначения.');
    return;
  }
  toCoords = { lat: toInfo.lat, lon: toInfo.lon };

  updateMap();
  const { price } = updateRouteInfo();
  const paymentMethod = document.querySelector('input[name="globalPaymentMethod"]:checked').value;
  const service = services[selectedClass];

  currentOrder = {
    id: `YT-${Math.floor(Math.random() * 900000 + 100000)}`,
    from: fromText,
    to: toText,
    time: rideTime.value,
    phone: phoneInput.value.trim(),
    price,
    classTitle: service.title,
    paymentMethod: paymentMethod === 'cash' ? 'Наличными' : 'Картой',
    status: paymentMethod === 'cash' ? 'Ожидает наличную оплату' : 'Ожидает оплаты',
  };

  summaryRoute.textContent = `${currentOrder.from} → ${currentOrder.to}`;
  summaryClass.textContent = currentOrder.classTitle;
  summaryPrice.textContent = `${currentOrder.price} ₽`;
  summaryPaymentMethod.textContent = currentOrder.paymentMethod;

  cardFields.classList.toggle('hidden', paymentMethod === 'cash');
  paymentSubmit.textContent = paymentMethod === 'cash' ? 'Подтвердить заказ' : 'Оплатить';
  toggleModal(paymentModal, true);
}

function cleanCardNumber(value) {
  return value.replace(/\D/g, '').slice(0, 16);
}

function formatCardNumber(event) {
  const input = event.target;
  const cleaned = cleanCardNumber(input.value);
  input.value = cleaned.replace(/(.{4})/g, '$1 ').trim();
}

function formatExpiry(event) {
  const input = event.target;
  let value = input.value.replace(/\D/g, '').slice(0, 4);
  if (value.length > 2) {
    value = `${value.slice(0, 2)}/${value.slice(2)}`;
  }
  input.value = value;
}

orderNow.addEventListener('click', orderNowHandler);
locateMe.addEventListener('click', geolocateUser);
serviceBtns.forEach((button) => {
  button.addEventListener('click', () => selectService(button.dataset.class));
});

fromInput.addEventListener('input', () => {
  if (fromInput.value.trim() !== CURRENT_LOCATION_LABEL) {
    fromCoords = null;
    fromIsCurrentLocation = false;
  }
  updateRouteInfo();
});

[toInput, rideTime, phoneInput].forEach((input) => {
  input.addEventListener('input', updateRouteInfo);
});

closePayment.addEventListener('click', () => toggleModal(paymentModal, false));
closeConfirmation.addEventListener('click', () => toggleModal(confirmationModal, false));
paymentBackdrop.addEventListener('click', () => toggleModal(paymentModal, false));
confirmationBackdrop.addEventListener('click', () => toggleModal(confirmationModal, false));
cardNumberInput.addEventListener('input', formatCardNumber);
cardExpiryInput.addEventListener('input', formatExpiry);

paymentForm.addEventListener('submit', (event) => {
  event.preventDefault();
  const paymentMethod = document.querySelector('input[name="globalPaymentMethod"]:checked').value;

  if (paymentMethod === 'card') {
    const cardName = document.getElementById('cardName').value.trim();
    const cardNumber = cardNumberInput.value.trim();
    const cardExpiry = cardExpiryInput.value.trim();
    const cardCvv = document.getElementById('cardCvv').value.trim();

    if (cardName.length < 2 || cardNumber.length < 19 || cardExpiry.length !== 5 || cardCvv.length < 3) {
      paymentResult.textContent = 'Пожалуйста, проверьте данные карты.';
      paymentResult.classList.remove('hidden');
      return;
    }
  }

  paymentResult.classList.add('hidden');
  currentOrder.status = paymentMethod === 'cash' ? 'Ожидает наличную оплату' : 'Подтвержден';
  
  // Сохраняем заказ и оплату в историю
  saveOrderToHistory(currentOrder);
  savePaymentToHistory(currentOrder);
  
  showOrderCard();
  toggleModal(paymentModal, false);
  toggleModal(confirmationModal, true);

  confirmationOrderId.textContent = currentOrder.id;
  confirmationRoute.textContent = `${currentOrder.from} → ${currentOrder.to}`;
  confirmationTime.textContent = new Date(currentOrder.time).toLocaleString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
  confirmationClass.textContent = currentOrder.classTitle;
  confirmationPaymentMethod.textContent = currentOrder.paymentMethod;
  confirmationPrice.textContent = `${currentOrder.price} ₽`;
});

function showOrderCard() {
  orderCard.classList.remove('hidden');
  lastOrderId.textContent = currentOrder.id;
  lastOrderStatus.textContent = currentOrder.status;
  lastOrderRoute.textContent = `${currentOrder.from} → ${currentOrder.to}`;
  lastOrderClass.textContent = currentOrder.classTitle;
  lastOrderPrice.textContent = `${currentOrder.price} ₽`;
}

function saveOrderToHistory(order) {
  orderHistory = JSON.parse(localStorage.getItem('orderHistory')) || [];
  orderHistory.push(order);
  localStorage.setItem('orderHistory', JSON.stringify(orderHistory));
}

function savePaymentToHistory(order) {
  paymentHistory = JSON.parse(localStorage.getItem('paymentHistory')) || [];
  
  const payment = {
    id: `PAY-${Math.floor(Math.random() * 900000 + 100000)}`,
    orderId: order.id,
    amount: order.price,
    method: order.paymentMethod,
    status: order.paymentMethod === 'cash' ? 'pending' : 'completed',
    date: new Date().toISOString()
  };

  paymentHistory.push(payment);
  localStorage.setItem('paymentHistory', JSON.stringify(paymentHistory));
}

initMap();
updateRouteInfo();
