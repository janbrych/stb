// Global App State
let currentUser = { isAdmin: false };
let currentPassengers = [];
let selectedDate = new Date().toISOString().split('T')[0];
let selectedMonth = new Date().toISOString().substring(0, 7); // YYYY-MM
let currentRidesByDate = {}; // { passenger_id: 'TO_SCHOOL' | 'FROM_SCHOOL' | 'BOTH' | 'NONE' }

// Initialize Application
document.addEventListener('DOMContentLoaded', async () => {
  document.getElementById('daily-date').value = selectedDate;
  document.getElementById('monthly-month').value = selectedMonth;

  await checkAuthStatus();
  await loadPassengers();
  await loadDailyRides();
  await loadMonthlyData();
});

// AUTHENTICATION FUNCTIONS
async function checkAuthStatus() {
  try {
    const res = await fetch('/api/me');
    const data = await res.json();
    currentUser = data;
    renderAuthStatus();
  } catch (err) {
    console.error('Chyba při zjišťování přihlášení:', err);
  }
}

function renderAuthStatus() {
  const container = document.getElementById('auth-status');
  if (currentUser.isAdmin) {
    container.innerHTML = `
      <span class="text-xs bg-amber-600 px-2.5 py-1 rounded-full font-semibold flex items-center gap-1">
        <i class="fa-solid fa-user-shield"></i> Admin: ${currentUser.email}
      </span>
      <button onclick="handleLogout()" class="text-sm bg-slate-800 hover:bg-slate-900 px-3 py-1.5 rounded-lg font-medium transition">
        Odhlásit se
      </button>
    `;
  } else {
    container.innerHTML = `
      <span class="text-xs bg-slate-700/60 px-2 py-1 rounded text-slate-200">Režim: Prohlížení (View-only)</span>
      <button onclick="openLoginModal()" class="text-sm bg-slate-800 hover:bg-slate-900 px-3 py-1.5 rounded-lg font-medium transition">
        <i class="fa-solid fa-lock text-xs mr-1"></i> Přihlásit se
      </button>
    `;
  }

  // Re-render views according to permission level
  renderAddPassengerForm();
  renderDailySaveContainer();
}

function openLoginModal() {
  document.getElementById('login-modal').classList.remove('hidden');
  document.getElementById('login-error').classList.add('hidden');
}

function closeLoginModal() {
  document.getElementById('login-modal').classList.add('hidden');
}

async function handleLogin(e) {
  e.preventDefault();
  const email = document.getElementById('login-email').value;
  const password = document.getElementById('login-password').value;
  const errDiv = document.getElementById('login-error');

  try {
    const res = await fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    const data = await res.json();
    if (!res.ok) {
      errDiv.innerText = data.error || 'Přihlášení se nezdařilo';
      errDiv.classList.remove('hidden');
      return;
    }

    closeLoginModal();
    await checkAuthStatus();
    await loadDailyRides();
    await loadMonthlyData();
    renderPassengersTable();
  } catch (err) {
    errDiv.innerText = 'Chyba sítě nebo serveru';
    errDiv.classList.remove('hidden');
  }
}

async function handleLogout() {
  await fetch('/api/logout', { method: 'POST' });
  await checkAuthStatus();
  await loadDailyRides();
  await loadMonthlyData();
  renderPassengersTable();
}

// TAB NAVIGATION
function switchTab(tabName) {
  const tabs = ['daily', 'monthly', 'passengers'];
  tabs.forEach(t => {
    const btn = document.getElementById(`tab-${t}`);
    const view = document.getElementById(`view-${t}`);
    if (t === tabName) {
      btn.className = 'py-2 px-4 font-semibold text-amber-600 border-b-2 border-amber-500 focus:outline-none flex items-center space-x-2';
      view.classList.remove('hidden');
    } else {
      btn.className = 'py-2 px-4 font-semibold text-slate-600 hover:text-amber-600 focus:outline-none flex items-center space-x-2';
      view.classList.add('hidden');
    }
  });

  if (tabName === 'monthly') {
    loadMonthlyData();
  }
}

// PASSENGERS MANAGEMENT
async function loadPassengers() {
  try {
    const res = await fetch('/api/passengers');
    currentPassengers = await res.json();
    renderPassengersTable();
  } catch (err) {
    console.error('Chyba načítání cestujících:', err);
  }
}

function renderPassengersTable() {
  const tbody = document.getElementById('passengers-list-body');
  if (!currentPassengers.length) {
    tbody.innerHTML = `<tr><td colspan="3" class="p-4 text-center text-slate-400">Žádní cestující v databázi.</td></tr>`;
    return;
  }

  tbody.innerHTML = currentPassengers.map(p => `
    <tr class="hover:bg-slate-50">
      <td class="p-3 font-medium text-slate-800">${escapeHtml(p.name)}</td>
      <td class="p-3 text-slate-600">${p.default_price} Kč</td>
      <td class="p-3 text-right">
        ${currentUser.isAdmin ? `
          <button onclick="deletePassenger(${p.id}, '${escapeHtml(p.name)}')" class="text-red-500 hover:text-red-700 font-medium px-2 py-1 rounded">
            <i class="fa-solid fa-trash-can mr-1"></i> Smazat
          </button>
        ` : `<span class="text-slate-400 text-xs">Bez oprávnění</span>`}
      </td>
    </tr>
  `).join('');
}

function renderAddPassengerForm() {
  const container = document.getElementById('add-passenger-form-container');
  if (currentUser.isAdmin) {
    container.innerHTML = `
      <h3 class="font-bold text-slate-800 mb-2 flex items-center space-x-2">
        <i class="fa-solid fa-user-plus text-amber-600"></i>
        <span>Přidat nového cestujícího</span>
      </h3>
      <form onsubmit="handleAddPassenger(event)" class="flex flex-wrap items-center gap-3">
        <input type="text" id="new-passenger-name" placeholder="Jméno a příjmení" required class="border border-slate-300 rounded-lg px-3 py-1.5 focus:ring-2 focus:ring-amber-400 focus:outline-none flex-1 min-w-[200px]">
        <input type="number" step="1" min="0" id="new-passenger-price" placeholder="Cena za jízdu (Kč)" value="50" required class="border border-slate-300 rounded-lg px-3 py-1.5 focus:ring-2 focus:ring-amber-400 focus:outline-none w-44">
        <button type="submit" class="bg-amber-500 hover:bg-amber-600 text-white font-semibold px-4 py-1.5 rounded-lg shadow transition">
          Přidat
        </button>
      </form>
    `;
    container.classList.remove('hidden');
  } else {
    container.innerHTML = `<p class="text-sm text-slate-500 italic">Přihlášený správce může přidávat a spravovat cestující.</p>`;
  }
}

async function handleAddPassenger(e) {
  e.preventDefault();
  const nameInput = document.getElementById('new-passenger-name');
  const priceInput = document.getElementById('new-passenger-price');

  try {
    const res = await fetch('/api/passengers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: nameInput.value,
        default_price: priceInput.value
      })
    });
    const data = await res.json();
    if (!res.ok) {
      alert(data.error || 'Chyba při přidávání cestujícího');
      return;
    }
    nameInput.value = '';
    await loadPassengers();
    await loadDailyRides();
    await loadMonthlyData();
  } catch (err) {
    alert('Chyba serveru');
  }
}

async function deletePassenger(id, name) {
  if (!confirm(`Opravdu chcete smazat cestujícího ${name}? Smažou se i jeho jízdy.`)) return;

  try {
    const res = await fetch(`/api/passengers/${id}`, { method: 'DELETE' });
    if (res.ok) {
      await loadPassengers();
      await loadDailyRides();
      await loadMonthlyData();
    }
  } catch (err) {
    alert('Chyba při mazání.');
  }
}

// DAILY RIDES ENTRY
async function loadDailyRides() {
  selectedDate = document.getElementById('daily-date').value;
  try {
    const res = await fetch(`/api/rides?date=${selectedDate}`);
    const rides = await res.json();

    currentRidesByDate = {};
    rides.forEach(r => {
      currentRidesByDate[r.passenger_id] = r.direction;
    });

    renderDailyPassengersList();
  } catch (err) {
    console.error('Chyba načítání denních jízd:', err);
  }
}

function renderDailyPassengersList() {
  const container = document.getElementById('daily-passengers-list');
  if (!currentPassengers.length) {
    container.innerHTML = `<div class="p-6 text-center text-slate-500">Nejdříve přidejte cestující v záložce "Cestující".</div>`;
    return;
  }

  container.innerHTML = currentPassengers.map(p => {
    const currentDir = currentRidesByDate[p.id] || 'NONE';
    const disabledAttr = currentUser.isAdmin ? '' : 'disabled';

    return `
      <div class="flex flex-wrap items-center justify-between p-4 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 transition">
        <div class="font-bold text-slate-800 text-lg mb-2 sm:mb-0">
          <i class="fa-solid fa-user text-amber-500 mr-2"></i>
          ${escapeHtml(p.name)}
        </div>
        <div class="flex flex-wrap gap-2">
          <button type="button" ${disabledAttr} onclick="selectRideDirection(${p.id}, 'NONE')"
                  class="px-3 py-1.5 text-sm rounded-lg border transition font-medium ${currentDir === 'NONE' ? 'bg-slate-700 text-white border-slate-700 shadow' : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-200'}">
            Nejel/a
          </button>
          <button type="button" ${disabledAttr} onclick="selectRideDirection(${p.id}, 'TO_SCHOOL')"
                  class="px-3 py-1.5 text-sm rounded-lg border transition font-medium ${currentDir === 'TO_SCHOOL' ? 'bg-amber-500 text-white border-amber-500 shadow' : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-200'}">
            <i class="fa-solid fa-school mr-1"></i> Do školy (Tam)
          </button>
          <button type="button" ${disabledAttr} onclick="selectRideDirection(${p.id}, 'FROM_SCHOOL')"
                  class="px-3 py-1.5 text-sm rounded-lg border transition font-medium ${currentDir === 'FROM_SCHOOL' ? 'bg-sky-500 text-white border-sky-500 shadow' : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-200'}">
            <i class="fa-solid fa-house mr-1"></i> Ze školy (Zpět)
          </button>
          <button type="button" ${disabledAttr} onclick="selectRideDirection(${p.id}, 'BOTH')"
                  class="px-3 py-1.5 text-sm rounded-lg border transition font-medium ${currentDir === 'BOTH' ? 'bg-emerald-600 text-white border-emerald-600 shadow' : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-200'}">
            <i class="fa-solid fa-arrows-left-right mr-1"></i> Obě jízdy (Tam i Zpět)
          </button>
        </div>
      </div>
    `;
  }).join('');
}

function selectRideDirection(passengerId, direction) {
  if (!currentUser.isAdmin) return;
  currentRidesByDate[passengerId] = direction;
  renderDailyPassengersList();
}

function renderDailySaveContainer() {
  const container = document.getElementById('daily-save-container');
  if (currentUser.isAdmin) {
    container.innerHTML = `
      <button onclick="saveDailyRides()" class="bg-amber-500 hover:bg-amber-600 text-white font-bold px-6 py-2.5 rounded-xl shadow-lg transition flex items-center space-x-2">
        <i class="fa-solid fa-floppy-disk"></i>
        <span>Uložit jízdy pro tento den</span>
      </button>
    `;
  } else {
    container.innerHTML = `<p class="text-sm text-slate-500 italic">V režimu prohlížení nelze jízdy upravovat.</p>`;
  }
}

async function saveDailyRides() {
  if (!currentUser.isAdmin) return;

  const payloadRides = currentPassengers.map(p => ({
    passenger_id: p.id,
    direction: currentRidesByDate[p.id] || 'NONE'
  }));

  try {
    const res = await fetch('/api/rides/bulk', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        date: selectedDate,
        rides: payloadRides
      })
    });
    if (res.ok) {
      alert('Jízdy byly úspěšně uloženy!');
      await loadMonthlyData();
    } else {
      const data = await res.json();
      alert(data.error || 'Chyba při ukládání');
    }
  } catch (err) {
    alert('Chyba serveru');
  }
}

// MONTHLY DATA & CALENDAR
function changeMonth(delta) {
  const monthInput = document.getElementById('monthly-month');
  const [year, month] = monthInput.value.split('-').map(Number);
  const date = new Date(year, month - 1 + delta, 1);
  const newY = date.getFullYear();
  const newM = String(date.getMonth() + 1).padStart(2, '0');
  monthInput.value = `${newY}-${newM}`;
  loadMonthlyData();
}

async function loadMonthlyData() {
  selectedMonth = document.getElementById('monthly-month').value;
  if (!selectedMonth) return;

  try {
    const [statusRes, ridesRes] = await Promise.all([
      fetch(`/api/monthly-status?month=${selectedMonth}`),
      fetch(`/api/rides?month=${selectedMonth}`)
    ]);

    const monthlyStatuses = await statusRes.json();
    const monthlyRides = await ridesRes.json();

    renderMonthlySummaryAndCalendars(monthlyStatuses, monthlyRides);
  } catch (err) {
    console.error('Chyba načítání měsíčních dat:', err);
  }
}

function renderMonthlySummaryAndCalendars(statuses, rides) {
  const summaryBody = document.getElementById('monthly-summary-body');
  const calendarsContainer = document.getElementById('passenger-calendars-container');
  let totalMonthSum = 0;

  if (!currentPassengers.length) {
    summaryBody.innerHTML = `<tr><td colspan="7" class="p-4 text-center text-slate-400">Žádní cestující v databázi.</td></tr>`;
    calendarsContainer.innerHTML = '';
    document.getElementById('monthly-total-sum').innerText = '0 Kč';
    return;
  }

  // Create a status map for easy lookup
  const statusMap = {};
  statuses.forEach(s => {
    statusMap[s.passenger_id] = s;
  });

  // Calculate rides count per passenger for selectedMonth
  const ridesMap = {}; // passenger_id -> { toCount, fromCount, totalRides, datesObj: { 'YYYY-MM-DD': direction } }
  currentPassengers.forEach(p => {
    ridesMap[p.id] = { toCount: 0, fromCount: 0, totalRides: 0, datesObj: {} };
  });

  rides.forEach(r => {
    if (ridesMap[r.passenger_id]) {
      ridesMap[r.passenger_id].datesObj[r.ride_date] = r.direction;
      if (r.direction === 'TO_SCHOOL') {
        ridesMap[r.passenger_id].toCount += 1;
        ridesMap[r.passenger_id].totalRides += 1;
      } else if (r.direction === 'FROM_SCHOOL') {
        ridesMap[r.passenger_id].fromCount += 1;
        ridesMap[r.passenger_id].totalRides += 1;
      } else if (r.direction === 'BOTH') {
        ridesMap[r.passenger_id].toCount += 1;
        ridesMap[r.passenger_id].fromCount += 1;
        ridesMap[r.passenger_id].totalRides += 2;
      }
    }
  });

  // Render Summary Table Rows
  summaryBody.innerHTML = currentPassengers.map(p => {
    const st = statusMap[p.id] || {};
    const pricePerRide = (st.price_per_ride !== null && st.price_per_ride !== undefined) ? st.price_per_ride : p.default_price;
    const isPaid = st.is_paid === 1;

    const rideInfo = ridesMap[p.id];
    const totalCost = rideInfo.totalRides * pricePerRide;
    totalMonthSum += totalCost;

    const disabledAttr = currentUser.isAdmin ? '' : 'disabled';

    return `
      <tr class="hover:bg-slate-50">
        <td class="p-3 font-semibold text-slate-800">${escapeHtml(p.name)}</td>
        <td class="p-3 text-center text-slate-600">${rideInfo.toCount}×</td>
        <td class="p-3 text-center text-slate-600">${rideInfo.fromCount}×</td>
        <td class="p-3 text-center font-bold text-amber-600">${rideInfo.totalRides}×</td>
        <td class="p-3 text-center">
          <input type="number" min="0" value="${pricePerRide}" ${disabledAttr}
                 onchange="updatePassengerMonthlyPrice(${p.id}, this.value)"
                 class="w-20 text-center border border-slate-300 rounded py-1 focus:ring-2 focus:ring-amber-400 focus:outline-none">
        </td>
        <td class="p-3 text-right font-extrabold text-slate-800">${totalCost} Kč</td>
        <td class="p-3 text-center">
          <label class="inline-flex items-center cursor-pointer">
            <input type="checkbox" ${isPaid ? 'checked' : ''} ${disabledAttr}
                   onchange="updatePassengerPaidStatus(${p.id}, this.checked)"
                   class="w-5 h-5 text-emerald-600 border-slate-300 rounded focus:ring-emerald-500">
            <span class="ml-2 text-xs font-semibold ${isPaid ? 'text-emerald-600' : 'text-slate-400'}">
              ${isPaid ? 'Zaplaceno' : 'Nezaplaceno'}
            </span>
          </label>
        </td>
      </tr>
    `;
  }).join('');

  document.getElementById('monthly-total-sum').innerText = `${totalMonthSum} Kč`;

  // Render Individual Calendars
  const [yearStr, monthStr] = selectedMonth.split('-');
  const year = parseInt(yearStr);
  const month = parseInt(monthStr); // 1-indexed

  calendarsContainer.innerHTML = currentPassengers.map(p => {
    const rideInfo = ridesMap[p.id];
    const calendarHtml = generateCalendarHtml(year, month, rideInfo.datesObj);

    return `
      <div class="border border-slate-200 rounded-xl p-4 bg-white shadow-sm">
        <div class="flex justify-between items-center mb-3 border-b pb-2">
          <h4 class="font-bold text-slate-800 text-base">${escapeHtml(p.name)}</h4>
          <span class="text-xs bg-amber-100 text-amber-800 px-2 py-1 rounded-full font-semibold">
            ${rideInfo.totalRides} jízd za měsíc
          </span>
        </div>
        ${calendarHtml}
      </div>
    `;
  }).join('');
}

function generateCalendarHtml(year, month, datesObj) {
  // Days of week header
  const daysOfWeek = ['Po', 'Út', 'St', 'Čt', 'Pá', 'So', 'Ne'];

  const firstDayOfMonth = new Date(year, month - 1, 1);
  const lastDayOfMonth = new Date(year, month, 0);

  let startingDayOfWeek = firstDayOfMonth.getDay() - 1; // 0 = Monday, 6 = Sunday
  if (startingDayOfWeek === -1) startingDayOfWeek = 6;

  const totalDays = lastDayOfMonth.getDate();

  let html = `<div class="grid grid-cols-7 gap-1 text-center text-xs">`;

  // Header days
  daysOfWeek.forEach(d => {
    html += `<div class="font-bold text-slate-400 py-1">${d}</div>`;
  });

  // Empty cells before start
  for (let i = 0; i < startingDayOfWeek; i++) {
    html += `<div class="py-2"></div>`;
  }

  // Days of month
  for (let day = 1; day <= totalDays; day++) {
    const dayFormatted = String(day).padStart(2, '0');
    const monthFormatted = String(month).padStart(2, '0');
    const fullDate = `${year}-${monthFormatted}-${dayFormatted}`;

    const direction = datesObj[fullDate];
    let bgClass = 'bg-slate-100 text-slate-700 hover:bg-slate-200';
    let titleText = 'Bez jízdy';
    let badgeText = '';

    if (direction === 'TO_SCHOOL') {
      bgClass = 'bg-blue-500 text-white font-bold shadow-sm';
      titleText = 'Do školy (Tam)';
      badgeText = '<div class="text-[9px] leading-tight">Tam</div>';
    } else if (direction === 'FROM_SCHOOL') {
      bgClass = 'bg-sky-500 text-white font-bold shadow-sm';
      titleText = 'Ze školy (Zpět)';
      badgeText = '<div class="text-[9px] leading-tight">Zpět</div>';
    } else if (direction === 'BOTH') {
      bgClass = 'bg-emerald-600 text-white font-bold shadow-sm';
      titleText = 'Obě jízdy (Tam i Zpět)';
      badgeText = '<div class="text-[9px] leading-tight">2×</div>';
    }

    html += `
      <div title="${day}. ${month}. - ${titleText}" class="rounded-md py-1.5 flex flex-col items-center justify-center min-h-[38px] ${bgClass} transition">
        <span>${day}</span>
        ${badgeText}
      </div>
    `;
  }

  html += `</div>`;
  return html;
}

// MONTHLY SETTINGS UPDATE HANDLERS
async function updatePassengerMonthlyPrice(passengerId, newPrice) {
  if (!currentUser.isAdmin) return;
  try {
    await fetch('/api/monthly-status', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        passenger_id: passengerId,
        year_month: selectedMonth,
        price_per_ride: parseFloat(newPrice) || 0
      })
    });
    await loadMonthlyData();
  } catch (err) {
    console.error('Chyba aktualizace ceny:', err);
  }
}

async function updatePassengerPaidStatus(passengerId, isPaid) {
  if (!currentUser.isAdmin) return;
  try {
    await fetch('/api/monthly-status', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        passenger_id: passengerId,
        year_month: selectedMonth,
        is_paid: isPaid ? 1 : 0
      })
    });
    await loadMonthlyData();
  } catch (err) {
    console.error('Chyba aktualizace stavu zaplacení:', err);
  }
}

// UTILS
function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/[&<>"']/g, function(m) {
    return {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;'
    }[m];
  });
}
