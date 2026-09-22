// Client API wrapper connecting directly to backend Express server

export const api = {
  async checkAuth() {
    try {
      const res = await fetch('/api/auth/me');
      if (res.ok) {
        return await res.json();
      }
    } catch (e) {
      console.error('Check auth network error:', e);
    }
    return { authenticated: false, user: null };
  },

  async login(email, password) {
    const res = await fetch('/api/auth/login', {
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

  async logout() {
    await fetch('/api/auth/logout', { method: 'POST' });
  },

  async getPassengers() {
    const res = await fetch('/api/passengers');
    if (!res.ok) throw new Error('Nepodařilo se načíst seznam cestujících.');
    return await res.json();
  },

  async addPassenger(data) {
    const res = await fetch('/api/passengers', {
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

  async updatePassenger(id, data) {
    const res = await fetch(`/api/passengers/${id}`, {
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

  async deletePassenger(id) {
    const res = await fetch(`/api/passengers/${id}`, { method: 'DELETE' });
    const responseData = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(responseData.error || 'Nepodařilo se smazat cestujícího.');
    }
    return responseData;
  },

  async getRides(date) {
    const res = await fetch(`/api/rides?date=${date}`);
    if (!res.ok) throw new Error('Nepodařilo se načíst jízdy pro vybraný den.');
    return await res.json();
  },

  async saveDailyRides(date, passengersList) {
    const res = await fetch('/api/rides/daily', {
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

  async saveSingleRide(passenger_id, date, status) {
    const res = await fetch('/api/rides/single', {
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

  async setPassengerPrice(passenger_id, year_month, price) {
    const res = await fetch(`/api/passengers/${passenger_id}/price`, {
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

  async setPassengerPayment(passenger_id, year_month, paid) {
    const res = await fetch(`/api/passengers/${passenger_id}/payment`, {
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

  async getMonthSummary(yearMonth) {
    const res = await fetch(`/api/summary/month?year_month=${yearMonth}`);
    if (!res.ok) throw new Error('Nepodařilo se načíst měsíční souhrn.');
    return await res.json();
  },

  async getPassengerDetail(passengerId, yearMonth) {
    const res = await fetch(`/api/passengers/${passengerId}/detail?year_month=${yearMonth}`);
    if (!res.ok) throw new Error('Nepodařilo se načíst detail cestujícího.');
    return await res.json();
  }
};
