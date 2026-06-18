const profileName = document.getElementById('profileName');
const profileEmail = document.getElementById('profileEmail');
const profilePhone = document.getElementById('profilePhone');
const saveProfile = document.getElementById('saveProfile');
const orderHistoryList = document.getElementById('orderHistoryList');
const paymentHistoryList = document.getElementById('paymentHistoryList');
const historyTabs = document.querySelectorAll('.history-tab');
const ordersTab = document.getElementById('ordersTab');
const paymentsTab = document.getElementById('paymentsTab');

let orderHistory = JSON.parse(localStorage.getItem('orderHistory')) || [];
let paymentHistory = JSON.parse(localStorage.getItem('paymentHistory')) || [];

function loadProfile() {
  const profile = JSON.parse(localStorage.getItem('taxiProfile')) || {};
  profileName.value = profile.name || '';
  profileEmail.value = profile.email || '';
  profilePhone.value = profile.phone || '';
}

function saveProfileData() {
  const profile = {
    name: profileName.value.trim(),
    email: profileEmail.value.trim(),
    phone: profilePhone.value.trim()
  };

  if (!profile.name || !profile.email || !profile.phone) {
    alert('Пожалуйста, заполните все поля');
    return;
  }

  localStorage.setItem('taxiProfile', JSON.stringify(profile));
  alert('Профиль сохранён');
}

function formatOrderItem(order) {
  const statusClass = order.status.includes('Подтвержден') ? 'status-success' : 
                      order.status.includes('Ожидает') ? 'status-warning' : 'status-default';
  
  return `
    <div class="history-item">
      <div class="history-item-header">
        <span class="history-item-id">${order.id}</span>
        <span class="status-pill ${statusClass}">${order.status}</span>
      </div>
      <div class="history-item-details">
        <div class="history-item-row">
          <span class="label">Маршрут:</span>
          <span class="value">${order.from} → ${order.to}</span>
        </div>
        <div class="history-item-row">
          <span class="label">Класс:</span>
          <span class="value">${order.classTitle}</span>
        </div>
        <div class="history-item-row">
          <span class="label">Дата:</span>
          <span class="value">${new Date(order.time).toLocaleString('ru-RU', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          })}</span>
        </div>
        <div class="history-item-row">
          <span class="label">Стоимость:</span>
          <span class="value price">${order.price} ₽</span>
        </div>
        <div class="history-item-row">
          <span class="label">Оплата:</span>
          <span class="value">${order.paymentMethod}</span>
        </div>
      </div>
    </div>
  `;
}

function formatPaymentItem(payment) {
  const statusClass = payment.status === 'completed' ? 'status-success' : 
                      payment.status === 'pending' ? 'status-warning' : 'status-default';
  
  return `
    <div class="history-item">
      <div class="history-item-header">
        <span class="history-item-id">${payment.id}</span>
        <span class="status-pill ${statusClass}">${payment.status === 'completed' ? 'Оплачено' : 'В обработке'}</span>
      </div>
      <div class="history-item-details">
        <div class="history-item-row">
          <span class="label">Заказ:</span>
          <span class="value">${payment.orderId}</span>
        </div>
        <div class="history-item-row">
          <span class="label">Сумма:</span>
          <span class="value price">${payment.amount} ₽</span>
        </div>
        <div class="history-item-row">
          <span class="label">Способ:</span>
          <span class="value">${payment.method}</span>
        </div>
        <div class="history-item-row">
          <span class="label">Дата:</span>
          <span class="value">${new Date(payment.date).toLocaleString('ru-RU', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          })}</span>
        </div>
      </div>
    </div>
  `;
}

function renderOrderHistory() {
  if (orderHistory.length === 0) {
    orderHistoryList.innerHTML = '<p class="empty-message">Нет заказов</p>';
    return;
  }

  orderHistoryList.innerHTML = orderHistory
    .slice()
    .reverse()
    .map(formatOrderItem)
    .join('');
}

function renderPaymentHistory() {
  if (paymentHistory.length === 0) {
    paymentHistoryList.innerHTML = '<p class="empty-message">Нет оплат</p>';
    return;
  }

  paymentHistoryList.innerHTML = paymentHistory
    .slice()
    .reverse()
    .map(formatPaymentItem)
    .join('');
}

function switchTab(tabName) {
  historyTabs.forEach(tab => {
    tab.classList.toggle('selected', tab.dataset.tab === tabName);
  });

  ordersTab.classList.toggle('hidden', tabName !== 'orders');
  paymentsTab.classList.toggle('hidden', tabName !== 'payments');
}

historyTabs.forEach(tab => {
  tab.addEventListener('click', () => switchTab(tab.dataset.tab));
});

saveProfile.addEventListener('click', saveProfileData);

loadProfile();
renderOrderHistory();
renderPaymentHistory();
