// Client API wrapper with automatic LocalStorage fallback for GitHub Pages / static hosting

const API_BASE = import.meta.env.VITE_API_URL || '';

const STORAGE_KEYS = {
  USERS: 'brych_taxi_users',
  SESSION: 'brych_taxi_session',
  PASSENGERS: 'brych_taxi_passengers',
  PRICES: 'brych_taxi_monthly_prices',
  RIDES: 'brych_taxi_rides',
  PAYMENTS: 'brych_taxi_monthly_payments',
  INITIALIZED: 'brych_taxi_initialized'
};

function initLocalStorage() {
  if (typeof window === 'undefined' || !window.localStorage) return;
  if (localStorage.getItem(STORAGE_KEYS.INITIALIZED)) return;

  const defaultUsers = [
    { id: 1, email: 'janbrych21@gmail.com', password: 'Jasiek04', role: 'admin' }
  ];

  const defaultPassengers = [
    { id: 1, name: 'Honza', default_price: 50, note: null, created_at: new Date().toISOString() },
    { id: 2, name: 'Kuba', default_price: 40, note: null, created_at: new Date().toISOString() },
    { id: 3, name: 'Petr', default_price: 60, note: null, created_at: new Date().toISOString() }
  ];

  const currentYearMonth = new Date().toISOString().slice(0, 7);
  const defaultPrices = [
    { passenger_id: 1, year_month: currentYearMonth, price: 50 },
    { passenger_id: 2, year_month: currentYearMonth, price: 40 },
    { passenger_id: 3, year_month: currentYearMonth, price: 60 }
  ];

  const today = new Date().toISOString().slice(0, 10);
  const defaultRides = [
    { id: 1, passenger_id: 1, date: today, direction: 'TAM', created_at: new Date().toISOString() },
    { id: 2, passenger_id: 1, date: today, direction: 'ZPET', created_at: new Date().toISOString() },
    { id: 3, passenger_id: 2, date: today, direction: 'TAM', created_at: new Date().toISOString() }
  ];

  const defaultPayments = [];

  localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(defaultUsers));
  localStorage.setItem(STORAGE_KEYS.PASSENGERS, JSON.stringify(defaultPassengers));
  localStorage.setItem(STORAGE_KEYS.PRICES, JSON.stringify(defaultPrices));
  localStorage.setItem(STORAGE_KEYS.RIDES, JSON.stringify(defaultRides));
  localStorage.setItem(STORAGE_KEYS.PAYMENTS, JSON.stringify(defaultPayments));
  localStorage.setItem(STORAGE_KEYS.INITIALIZED, 'true');
}

function getItem(key, defaultValue = []) {
  try {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : defaultValue;
  } catch (e) {
    return defaultValue;
  }
}

function setItem(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.error('LocalStorage setItem error:', e);
  }
}

function getPassengerPriceForMonth(passengerId, yearMonth) {
  const prices = getItem(STORAGE_KEYS.PRICES, []);
  const matchingPrices = prices
    .filter(p => p.passenger_id === Number(passengerId) && p.year_month <= yearMonth)
    .sort((a, b) => b.year_month.localeCompare(a.year_month));

  if (matchingPrices.length > 0) {
    return matchingPrices[0].price;
  }

  const passengers = getItem(STORAGE_KEYS.PASSENGERS, []);
  const passenger = passengers.find(p => p.id === Number(passengerId));
  return passenger ? passenger.default_price : 50;
}

let forceFallback = false;

async function tryApiCall(apiCall, fallbackCall) {
  if (forceFallback) {
    return await fallbackCall();
  }

  try {
    return await apiCall();
  } catch (err) {
    if (
      err.isNetworkOr404 ||
      err.name === 'TypeError' ||
      err.message?.includes('Failed to fetch') ||
      err.message?.includes('NetworkError') ||
      err.message?.includes('404')
    ) {
      forceFallback = true;
      return await fallbackCall();
    }
    throw err;
  }
}

async function handleFetch(url, options = {}) {
  let res;
  try {
    res = await fetch(url, options);
  } catch (e) {
    const err = new Error('Network error');
    err.isNetworkOr404 = true;
    throw err;
  }

  const contentType = res.headers.get('content-type') || '';
  if (res.status === 404 || contentType.includes('text/html')) {
    const err = new Error(`404 or HTML response from ${url}`);
    err.isNetworkOr404 = true;
    throw err;
  }

  return res;
}

export const api = {
  async checkAuth() {
    return tryApiCall(
      async () => {
        const res = await handleFetch(`${API_BASE}/api/auth/me`);
        if (res.ok) return await res.json();
        const err = new Error('Auth check failed');
        err.isNetworkOr404 = true;
        throw err;
      },
      async () => {
        initLocalStorage();
        const session = getItem(STORAGE_KEYS.SESSION, null);
        if (session) {
          return { authenticated: true, user: session };
        }
        return { authenticated: false, user: null };
      }
    );
  },

  async login(email, password) {
    return tryApiCall(
      async () => {
        const res = await handleFetch(`${API_BASE}/api/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password })
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          throw new Error(data.error || 'Přihlášení se nezdařilo.');
        }
        return data;
      },
      async () => {
        initLocalStorage();
        const users = getItem(STORAGE_KEYS.USERS, []);
        const user = users.find(u => u.email === email && u.password === password);
        if (!user) {
          throw new Error('Nespravny e-mail nebo heslo.');
        }
        const userData = { id: user.id, email: user.email, role: user.role };
        setItem(STORAGE_KEYS.SESSION, userData);
        return {
          message: 'Přihlášení úspěšné.',
          user: userData,
          token: 'local-token'
        };
      }
    );
  },

  async logout() {
    return tryApiCall(
      async () => {
        await handleFetch(`${API_BASE}/api/auth/logout`, { method: 'POST' });
      },
      async () => {
        initLocalStorage();
        localStorage.removeItem(STORAGE_KEYS.SESSION);
      }
    );
  },

  async getPassengers() {
    return tryApiCall(
      async () => {
        const res = await handleFetch(`${API_BASE}/api/passengers`);
        if (!res.ok) throw new Error('Nepodařilo se načíst seznam cestujících.');
        return await res.json();
      },
      async () => {
        initLocalStorage();
        const passengers = getItem(STORAGE_KEYS.PASSENGERS, []);
        return [...passengers].sort((a, b) => a.name.localeCompare(b.name, 'cs'));
      }
    );
  },

  async addPassenger(data) {
    return tryApiCall(
      async () => {
        const res = await handleFetch(`${API_BASE}/api/passengers`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data)
        });
        const responseData = await res.json().catch(() => ({}));
        if (!res.ok) {
          throw new Error(responseData.error || 'Nepodařilo se přidat cestujícího.');
        }
        return responseData;
      },
      async () => {
        initLocalStorage();
        if (!data.name || data.name.trim() === '') {
          throw new Error('Jméno cestujícího je povinné.');
        }
        const passengers = getItem(STORAGE_KEYS.PASSENGERS, []);
        const newId = passengers.length > 0 ? Math.max(...passengers.map(p => p.id)) + 1 : 1;
        const priceVal = parseFloat(data.default_price) >= 0 ? parseFloat(data.default_price) : 50;

        const newPassenger = {
          id: newId,
          name: data.name.trim(),
          default_price: priceVal,
          note: data.note || null,
          created_at: new Date().toISOString()
        };

        passengers.push(newPassenger);
        setItem(STORAGE_KEYS.PASSENGERS, passengers);

        const currentYearMonth = new Date().toISOString().slice(0, 7);
        const prices = getItem(STORAGE_KEYS.PRICES, []);
        prices.push({ passenger_id: newId, year_month: currentYearMonth, price: priceVal });
        setItem(STORAGE_KEYS.PRICES, prices);

        return newPassenger;
      }
    );
  },

  async updatePassenger(id, data) {
    return tryApiCall(
      async () => {
        const res = await handleFetch(`${API_BASE}/api/passengers/${id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data)
        });
        const responseData = await res.json().catch(() => ({}));
        if (!res.ok) {
          throw new Error(responseData.error || 'Nepodařilo se upravit cestujícího.');
        }
        return responseData;
      },
      async () => {
        initLocalStorage();
        if (!data.name || data.name.trim() === '') {
          throw new Error('Jméno cestujícího je povinné.');
        }
        const passengers = getItem(STORAGE_KEYS.PASSENGERS, []);
        const passenger = passengers.find(p => p.id === Number(id));
        if (!passenger) {
          throw new Error('Cestující nenalezen.');
        }
        passenger.name = data.name.trim();
        passenger.note = data.note || null;
        setItem(STORAGE_KEYS.PASSENGERS, passengers);
        return passenger;
      }
    );
  },

  async deletePassenger(id) {
    return tryApiCall(
      async () => {
        const res = await handleFetch(`${API_BASE}/api/passengers/${id}`, { method: 'DELETE' });
        const responseData = await res.json().catch(() => ({}));
        if (!res.ok) {
          throw new Error(responseData.error || 'Nepodařilo se smazat cestujícího.');
        }
        return responseData;
      },
      async () => {
        initLocalStorage();
        const numId = Number(id);
        let passengers = getItem(STORAGE_KEYS.PASSENGERS, []);
        const exists = passengers.some(p => p.id === numId);
        if (!exists) {
          throw new Error('Cestující nenalezen.');
        }
        passengers = passengers.filter(p => p.id !== numId);
        setItem(STORAGE_KEYS.PASSENGERS, passengers);

        let prices = getItem(STORAGE_KEYS.PRICES, []);
        prices = prices.filter(p => p.passenger_id !== numId);
        setItem(STORAGE_KEYS.PRICES, prices);

        let rides = getItem(STORAGE_KEYS.RIDES, []);
        rides = rides.filter(r => r.passenger_id !== numId);
        setItem(STORAGE_KEYS.RIDES, rides);

        let payments = getItem(STORAGE_KEYS.PAYMENTS, []);
        payments = payments.filter(p => p.passenger_id !== numId);
        setItem(STORAGE_KEYS.PAYMENTS, payments);

        return { message: 'Cestující byl smazán.' };
      }
    );
  },

  async getRides(date) {
    return tryApiCall(
      async () => {
        const res = await handleFetch(`${API_BASE}/api/rides?date=${date}`);
        if (!res.ok) throw new Error('Nepodařilo se načíst jízdy pro vybraný den.');
        return await res.json();
      },
      async () => {
        initLocalStorage();
        const rides = getItem(STORAGE_KEYS.RIDES, []);
        return rides.filter(r => r.date === date);
      }
    );
  },

  async saveDailyRides(date, passengersList) {
    return tryApiCall(
      async () => {
        const res = await handleFetch(`${API_BASE}/api/rides/daily`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ date, passengers: passengersList })
        });
        const responseData = await res.json().catch(() => ({}));
        if (!res.ok) {
          throw new Error(responseData.error || 'Nepodařilo se uložit jízdy.');
        }
        return responseData;
      },
      async () => {
        initLocalStorage();
        let rides = getItem(STORAGE_KEYS.RIDES, []);
        let maxId = rides.length > 0 ? Math.max(...rides.map(r => r.id)) : 0;

        for (const item of passengersList) {
          const pId = Number(item.passenger_id);
          const status = item.status;

          rides = rides.filter(r => !(r.passenger_id === pId && r.date === date));

          if (status === 'TAM' || status === 'OBOJE') {
            maxId++;
            rides.push({ id: maxId, passenger_id: pId, date, direction: 'TAM', created_at: new Date().toISOString() });
          }
          if (status === 'ZPET' || status === 'OBOJE') {
            maxId++;
            rides.push({ id: maxId, passenger_id: pId, date, direction: 'ZPET', created_at: new Date().toISOString() });
          }
        }

        setItem(STORAGE_KEYS.RIDES, rides);
        return { message: 'Jízdy pro daný den byly uloženy.' };
      }
    );
  },

  async saveSingleRide(passenger_id, date, status) {
    return tryApiCall(
      async () => {
        const res = await handleFetch(`${API_BASE}/api/rides/single`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ passenger_id, date, status })
        });
        const responseData = await res.json().catch(() => ({}));
        if (!res.ok) {
          throw new Error(responseData.error || 'Nepodařilo se upravit jízdu.');
        }
        return responseData;
      },
      async () => {
        initLocalStorage();
        const pId = Number(passenger_id);
        let rides = getItem(STORAGE_KEYS.RIDES, []);
        let maxId = rides.length > 0 ? Math.max(...rides.map(r => r.id)) : 0;

        rides = rides.filter(r => !(r.passenger_id === pId && r.date === date));

        if (status === 'TAM' || status === 'OBOJE') {
          maxId++;
          rides.push({ id: maxId, passenger_id: pId, date, direction: 'TAM', created_at: new Date().toISOString() });
        }
        if (status === 'ZPET' || status === 'OBOJE') {
          maxId++;
          rides.push({ id: maxId, passenger_id: pId, date, direction: 'ZPET', created_at: new Date().toISOString() });
        }

        setItem(STORAGE_KEYS.RIDES, rides);
        return { message: 'Jízda byla aktualizována.' };
      }
    );
  },

  async setPassengerPrice(passenger_id, year_month, price) {
    return tryApiCall(
      async () => {
        const res = await handleFetch(`${API_BASE}/api/passengers/${passenger_id}/price`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ year_month, price })
        });
        const responseData = await res.json().catch(() => ({}));
        if (!res.ok) {
          throw new Error(responseData.error || 'Nepodařilo se nastavit cenu.');
        }
        return responseData;
      },
      async () => {
        initLocalStorage();
        const pId = Number(passenger_id);
        const numPrice = parseFloat(price);
        let prices = getItem(STORAGE_KEYS.PRICES, []);

        const existingIndex = prices.findIndex(p => p.passenger_id === pId && p.year_month === year_month);
        if (existingIndex >= 0) {
          prices[existingIndex].price = numPrice;
        } else {
          prices.push({ passenger_id: pId, year_month, price: numPrice });
        }

        setItem(STORAGE_KEYS.PRICES, prices);
        return { message: 'Cena byla úspěšně aktualizována.', year_month, price: numPrice };
      }
    );
  },

  async setPassengerPayment(passenger_id, year_month, paid) {
    return tryApiCall(
      async () => {
        const res = await handleFetch(`${API_BASE}/api/passengers/${passenger_id}/payment`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ year_month, paid })
        });
        const responseData = await res.json().catch(() => ({}));
        if (!res.ok) {
          throw new Error(responseData.error || 'Nepodařilo se změnit stav zaplacení.');
        }
        return responseData;
      },
      async () => {
        initLocalStorage();
        const pId = Number(passenger_id);
        const paidVal = paid ? 1 : 0;
        let payments = getItem(STORAGE_KEYS.PAYMENTS, []);

        const existingIndex = payments.findIndex(p => p.passenger_id === pId && p.year_month === year_month);
        if (existingIndex >= 0) {
          payments[existingIndex].paid = paidVal;
        } else {
          payments.push({ passenger_id: pId, year_month, paid: paidVal });
        }

        setItem(STORAGE_KEYS.PAYMENTS, payments);
        return { message: 'Stav zaplacení byl změněn.', year_month, paid: paidVal };
      }
    );
  },

  async getMonthSummary(yearMonth) {
    const ym = yearMonth || new Date().toISOString().slice(0, 7);
    return tryApiCall(
      async () => {
        const res = await handleFetch(`${API_BASE}/api/summary/month?year_month=${ym}`);
        if (!res.ok) throw new Error('Nepodařilo se načíst měsíční souhrn.');
        return await res.json();
      },
      async () => {
        initLocalStorage();
        const passengers = [...getItem(STORAGE_KEYS.PASSENGERS, [])].sort((a, b) => a.name.localeCompare(b.name, 'cs'));
        const rides = getItem(STORAGE_KEYS.RIDES, []);
        const payments = getItem(STORAGE_KEYS.PAYMENTS, []);

        const passengersSummary = passengers.map(p => {
          const pRides = rides.filter(r => r.passenger_id === p.id && r.date.startsWith(ym));
          let tam_count = 0;
          let zpet_count = 0;
          pRides.forEach(r => {
            if (r.direction === 'TAM') tam_count++;
            if (r.direction === 'ZPET') zpet_count++;
          });

          const total_rides = tam_count + zpet_count;
          const price = getPassengerPriceForMonth(p.id, ym);
          const total_amount = total_rides * price;

          const pPayment = payments.find(pay => pay.passenger_id === p.id && pay.year_month === ym);
          const paid = pPayment ? Boolean(pPayment.paid) : false;

          return {
            passenger_id: p.id,
            name: p.name,
            note: p.note,
            tam_count,
            zpet_count,
            total_rides,
            price,
            total_amount,
            paid
          };
        });

        const grand_total_rides = passengersSummary.reduce((sum, item) => sum + item.total_rides, 0);
        const grand_total_amount = passengersSummary.reduce((sum, item) => sum + item.total_amount, 0);
        const grand_total_paid_amount = passengersSummary.reduce((sum, item) => sum + (item.paid ? item.total_amount : 0), 0);
        const grand_total_unpaid_amount = grand_total_amount - grand_total_paid_amount;

        return {
          year_month: ym,
          passengers: passengersSummary,
          grand_total_rides,
          grand_total_amount,
          grand_total_paid_amount,
          grand_total_unpaid_amount
        };
      }
    );
  },

  async getPassengerDetail(passengerId, yearMonth) {
    const ym = yearMonth || new Date().toISOString().slice(0, 7);
    const pId = Number(passengerId);

    return tryApiCall(
      async () => {
        const res = await handleFetch(`${API_BASE}/api/passengers/${pId}/detail?year_month=${ym}`);
        if (!res.ok) throw new Error('Nepodařilo se načíst detail cestujícího.');
        return await res.json();
      },
      async () => {
        initLocalStorage();
        const passengers = getItem(STORAGE_KEYS.PASSENGERS, []);
        const passenger = passengers.find(p => p.id === pId);
        if (!passenger) {
          throw new Error('Cestující nenalezen.');
        }

        const rides = getItem(STORAGE_KEYS.RIDES, []);
        const prices = getItem(STORAGE_KEYS.PRICES, []);
        const payments = getItem(STORAGE_KEYS.PAYMENTS, []);

        const monthRides = rides.filter(r => r.passenger_id === pId && r.date.startsWith(ym));
        const calendar_days = {};
        let tam_count = 0;
        let zpet_count = 0;

        monthRides.forEach(r => {
          if (!calendar_days[r.date]) {
            calendar_days[r.date] = { tam: false, zpet: false, count: 0 };
          }
          if (r.direction === 'TAM') {
            calendar_days[r.date].tam = true;
            tam_count++;
          }
          if (r.direction === 'ZPET') {
            calendar_days[r.date].zpet = true;
            zpet_count++;
          }
          calendar_days[r.date].count = (calendar_days[r.date].tam ? 1 : 0) + (calendar_days[r.date].zpet ? 1 : 0);
        });

        const total_rides = tam_count + zpet_count;
        const price = getPassengerPriceForMonth(pId, ym);
        const total_amount = total_rides * price;

        const pPaymentRow = payments.find(pay => pay.passenger_id === pId && pay.year_month === ym);
        const paid = pPaymentRow ? Boolean(pPaymentRow.paid) : false;

        const allRides = rides.filter(r => r.passenger_id === pId);
        const allTimeTam = allRides.filter(r => r.direction === 'TAM').length;
        const allTimeZpet = allRides.filter(r => r.direction === 'ZPET').length;
        const allTimeRides = allRides.length;

        const monthsSet = new Set();
        allRides.forEach(r => monthsSet.add(r.date.slice(0, 7)));
        prices.filter(p => p.passenger_id === pId).forEach(p => monthsSet.add(p.year_month));
        payments.filter(p => p.passenger_id === pId).forEach(p => monthsSet.add(p.year_month));

        let allTimeAmountDue = 0;
        let allTimeAmountPaid = 0;
        const history = [];

        const sortedMonths = Array.from(monthsSet).sort().reverse();
        for (const m of sortedMonths) {
          const ymRidesCount = rides.filter(r => r.passenger_id === pId && r.date.startsWith(m)).length;
          const ymPrice = getPassengerPriceForMonth(pId, m);
          const ymTotal = ymRidesCount * ymPrice;
          const ymPaidRow = payments.find(pay => pay.passenger_id === pId && pay.year_month === m);
          const ymPaid = ymPaidRow ? Boolean(ymPaidRow.paid) : false;

          allTimeAmountDue += ymTotal;
          if (ymPaid) {
            allTimeAmountPaid += ymTotal;
          }

          history.push({
            year_month: m,
            rides_count: ymRidesCount,
            price: ymPrice,
            total_amount: ymTotal,
            paid: ymPaid
          });
        }

        return {
          passenger,
          selected_month: {
            year_month: ym,
            tam_count,
            zpet_count,
            total_rides,
            price,
            total_amount,
            paid,
            calendar_days
          },
          all_time: {
            total_rides: allTimeRides,
            tam_count: allTimeTam,
            zpet_count: allTimeZpet,
            total_amount_due: allTimeAmountDue,
            total_amount_paid: allTimeAmountPaid,
            total_amount_unpaid: allTimeAmountDue - allTimeAmountPaid
          },
          history
        };
      }
    );
  }
};
