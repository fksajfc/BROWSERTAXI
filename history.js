const historyTimeline = document.getElementById('historyTimeline');
const historyEmpty = document.getElementById('historyEmpty');
const filterTabs = document.querySelectorAll('.history-filter-tab');
const totalOrdersEl = document.getElementById('totalOrders');
const totalPaymentsEl = document.getElementById('totalPayments');
const totalAmountEl = document.getElementById('totalAmount');
const orderDetailsModal = document.getElementById('orderDetailsModal');
const detailsBackdrop = document.getElementById('detailsBackdrop');
const closeDetails = document.getElementById('closeDetails');
const detailsTitle = document.getElementById('detailsTitle');
const detailsContent = document.getElementById('detailsContent');

let orderHistory = JSON.parse(localStorage.getItem('orderHistory')) || [];
let paymentHistory = JSON.parse(localStorage.getItem('paymentHistory')) || [];
let currentFilter = 'all';

function formatDate(dateString) {
  const date = new Date(dateString);
  return date.toLocaleString('ru-RU', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

function formatShortDate(dateString) {
  const date = new Date(dateString);
  return date.toLocaleDateString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
}

function getStatusClass(status) {
  if (status === 'completed' || status.includes('Подтвержден')) return 'status-success';
  if (status === 'pending' || status.includes('Ожидает')) return 'status-warning';
  return 'status-default';
}

function getStatusText(status) {
  if (status === 'completed') return 'Оплачено';
  if (status === 'pending') return 'В обработке';
  return status;
}

function createOrderItem(order, index) {
  const item = document.createElement('div');
  item.className = 'history-timeline-item';
  item.innerHTML = `
    <div class="timeline-marker">
      <span class="marker-icon">🚗</span>
    </div>
    <div class="timeline-content">
      <div class="timeline-header">
        <div class="timeline-title">
          <span class="timeline-order-id">${order.id}</span>
          <span class="status-pill ${getStatusClass(order.status)}">${order.status}</span>
        </div>
        <span class="timeline-date">${formatDate(order.time)}</span>
      </div>
      <div class="timeline-body">
        <div class="timeline-route">
          <span class="route-from">📍 ${order.from}</span>
          <span class="route-arrow">→</span>
          <span class="route-to">🏁 ${order.to}</span>
        </div>
        <div class="timeline-details">
          <span class="detail-item">🚙 ${order.classTitle}</span>
          <span class="detail-item">💳 ${order.paymentMethod}</span>
          <span class="detail-item price">${order.price} ₽</span>
        </div>
      </div>
      <button class="btn btn-secondary btn-small" onclick="showOrderDetails(${index}, 'order')">
        Подробнее
      </button>
    </div>
  `;
  return item;
}

function createPaymentItem(payment, index) {
  const item = document.createElement('div');
  item.className = 'history-timeline-item';
  item.innerHTML = `
    <div class="timeline-marker">
      <span class="marker-icon">💳</span>
    </div>
    <div class="timeline-content">
      <div class="timeline-header">
        <div class="timeline-title">
          <span class="timeline-order-id">${payment.id}</span>
          <span class="status-pill ${getStatusClass(payment.status)}">${getStatusText(payment.status)}</span>
        </div>
        <span class="timeline-date">${formatDate(payment.date)}</span>
      </div>
      <div class="timeline-body">
        <div class="timeline-route">
          <span class="route-from">Заказ: ${payment.orderId}</span>
        </div>
        <div class="timeline-details">
          <span class="detail-item">💳 ${payment.method}</span>
          <span class="detail-item price">${payment.amount} ₽</span>
        </div>
      </div>
      <button class="btn btn-secondary btn-small" onclick="showOrderDetails(${index}, 'payment')">
        Подробнее
      </button>
    </div>
  `;
  return item;
}

function renderHistory(filter = 'all') {
  historyTimeline.innerHTML = '';
  
  let items = [];
  
  if (filter === 'all' || filter === 'orders') {
    orderHistory.forEach((order, index) => {
      items.push({ type: 'order', data: order, index, date: new Date(order.time) });
    });
  }
  
  if (filter === 'all' || filter === 'payments') {
    paymentHistory.forEach((payment, index) => {
      items.push({ type: 'payment', data: payment, index, date: new Date(payment.date) });
    });
  }
  
  if (filter === 'completed') {
    items = items.filter(item => 
      item.data.status === 'completed' || item.data.status.includes('Подтвержден')
    );
  }
  
  if (filter === 'pending') {
    items = items.filter(item => 
      item.data.status === 'pending' || item.data.status.includes('Ожидает')
    );
  }
  
  items.sort((a, b) => b.date - a.date);
  
  if (items.length === 0) {
    historyEmpty.classList.remove('hidden');
    historyTimeline.classList.add('hidden');
  } else {
    historyEmpty.classList.add('hidden');
    historyTimeline.classList.remove('hidden');
    
    items.forEach(item => {
      if (item.type === 'order') {
        historyTimeline.appendChild(createOrderItem(item.data, item.index));
      } else {
        historyTimeline.appendChild(createPaymentItem(item.data, item.index));
      }
    });
  }
  
  updateSummary();
}

function updateSummary() {
  const totalOrders = orderHistory.length;
  const totalPayments = paymentHistory.length;
  const totalAmount = paymentHistory.reduce((sum, payment) => sum + payment.amount, 0);
  
  totalOrdersEl.textContent = totalOrders;
  totalPaymentsEl.textContent = totalPayments;
  totalAmountEl.textContent = `${totalAmount} ₽`;
}

function showOrderDetails(index, type) {
  if (type === 'order') {
    const order = orderHistory[index];
    if (!order) return;
    
    detailsTitle.textContent = `Заказ ${order.id}`;
    detailsContent.innerHTML = `
      <div class="details-grid">
        <div class="detail-row">
          <span class="detail-label">Статус:</span>
          <span class="detail-value status-pill ${getStatusClass(order.status)}">${order.status}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Дата:</span>
          <span class="detail-value">${formatDate(order.time)}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Откуда:</span>
          <span class="detail-value">📍 ${order.from}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Куда:</span>
          <span class="detail-value">🏁 ${order.to}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Класс:</span>
          <span class="detail-value">🚙 ${order.classTitle}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Оплата:</span>
          <span class="detail-value">💳 ${order.paymentMethod}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Телефон:</span>
          <span class="detail-value">📞 ${order.phone}</span>
        </div>
        <div class="detail-row total">
          <span class="detail-label">Стоимость:</span>
          <span class="detail-value price">${order.price} ₽</span>
        </div>
      </div>
    `;
  } else {
    const payment = paymentHistory[index];
    if (!payment) return;
    
    detailsTitle.textContent = `Оплата ${payment.id}`;
    detailsContent.innerHTML = `
      <div class="details-grid">
        <div class="detail-row">
          <span class="detail-label">Статус:</span>
          <span class="detail-value status-pill ${getStatusClass(payment.status)}">${getStatusText(payment.status)}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Дата:</span>
          <span class="detail-value">${formatDate(payment.date)}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Заказ:</span>
          <span class="detail-value">${payment.orderId}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Способ:</span>
          <span class="detail-value">💳 ${payment.method}</span>
        </div>
        <div class="detail-row total">
          <span class="detail-label">Сумма:</span>
          <span class="detail-value price">${payment.amount} ₽</span>
        </div>
      </div>
    `;
  }
  
  toggleModal(orderDetailsModal, true);
}

function toggleModal(modal, show) {
  modal.classList.toggle('hidden', !show);
  modal.setAttribute('aria-hidden', String(!show));
}

filterTabs.forEach(tab => {
  tab.addEventListener('click', () => {
    filterTabs.forEach(t => t.classList.remove('selected'));
    tab.classList.add('selected');
    currentFilter = tab.dataset.filter;
    renderHistory(currentFilter);
  });
});

closeDetails.addEventListener('click', () => toggleModal(orderDetailsModal, false));
detailsBackdrop.addEventListener('click', () => toggleModal(orderDetailsModal, false));

renderHistory();
