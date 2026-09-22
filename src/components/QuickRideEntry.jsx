import React, { useState, useEffect } from 'react';
import { api } from '../api';

export default function QuickRideEntry({ user, onDataChanged, onSelectPassenger }) {
  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().split('T')[0]
  );
  const [passengers, setPassengers] = useState([]);
  const [rideSelections, setRideSelections] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const passData = await api.getPassengers();
      const ridesData = await api.getRides(selectedDate);

      setPassengers(passData);

      const selections = {};
      passData.forEach(p => {
        const pRides = ridesData.filter(r => r.passenger_id === p.id);
        const hasTam = pRides.some(r => r.direction === 'TAM');
        const hasZpet = pRides.some(r => r.direction === 'ZPET');

        if (hasTam && hasZpet) {
          selections[p.id] = 'OBOJE';
        } else if (hasTam) {
          selections[p.id] = 'TAM';
        } else if (hasZpet) {
          selections[p.id] = 'ZPET';
        } else {
          selections[p.id] = 'NIC';
        }
      });

      setRideSelections(selections);
    } catch (err) {
      console.error('Error loading quick entry data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [selectedDate]);

  const handleSelectionChange = (passengerId, value) => {
    setRideSelections(prev => ({
      ...prev,
      [passengerId]: value
    }));
  };

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    setMessage(null);

    try {
      const payloadPassengers = Object.entries(rideSelections).map(([id, status]) => ({
        passenger_id: parseInt(id, 10),
        status
      }));

      await api.saveDailyRides(selectedDate, payloadPassengers);

      setMessage({ type: 'success', text: 'Jízdy pro vybraný den byly úspěšně uloženy.' });
      onDataChanged();
      setTimeout(() => setMessage(null), 3000);
    } catch (err) {
      setMessage({ type: 'error', text: err.message || 'Nepodařilo se uložit jízdy.' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header section */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200/80 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Rychlé zadávání jízd</h1>
          <p className="text-sm text-slate-500 mt-1">
            Vyberte datum a zaznamenejte jízdy pro jednotlivé cestující
          </p>
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          <label className="text-xs font-semibold text-slate-600 whitespace-nowrap">Datum:</label>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 text-sm font-medium text-slate-800 bg-slate-50"
          />
        </div>
      </div>

      {!user && (
        <div className="bg-amber-50 border border-amber-200 text-amber-800 rounded-xl p-4 text-sm flex items-center justify-between">
          <span>Pro zadávání a úpravu jízd se musíte přihlásit jako administrátor.</span>
        </div>
      )}

      {message && (
        <div className={`p-4 rounded-xl text-sm font-medium border ${
          message.type === 'success' ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 'bg-red-50 text-red-800 border-red-200'
        }`}>
          {message.text}
        </div>
      )}

      {/* Passengers List */}
      {loading ? (
        <div className="text-center py-12 text-slate-400">Načítám seznam cestujících...</div>
      ) : passengers.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center text-slate-500 border border-slate-200">
          Zatím nejsou v databázi žádní cestující.
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200/80 overflow-hidden">
          <div className="divide-y divide-slate-100">
            {passengers.map((passenger) => {
              const currentStatus = rideSelections[passenger.id] || 'NIC';

              return (
                <div key={passenger.id} className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50/50 transition">
                  <div>
                    <button
                      onClick={() => onSelectPassenger(passenger.id)}
                      className="text-lg font-semibold text-slate-900 hover:text-amber-600 transition text-left"
                    >
                      {passenger.name}
                    </button>
                    {passenger.note && (
                      <p className="text-xs text-slate-400 mt-0.5">{passenger.note}</p>
                    )}
                  </div>

                  {/* Radio options / Buttons */}
                  <div className="grid grid-cols-4 gap-1.5 sm:gap-2 bg-slate-100 p-1 rounded-xl text-xs sm:text-sm font-medium">
                    {[
                      { id: 'NIC', label: 'NIC' },
                      { id: 'TAM', label: 'TAM' },
                      { id: 'ZPET', label: 'ZPĚT' },
                      { id: 'OBOJE', label: 'OBOJE' }
                    ].map((option) => {
                      const isSelected = currentStatus === option.id;
                      return (
                        <button
                          key={option.id}
                          disabled={!user}
                          onClick={() => handleSelectionChange(passenger.id, option.id)}
                          className={`py-2 px-3 rounded-lg text-center transition font-semibold ${
                            isSelected
                              ? option.id === 'NIC'
                                ? 'bg-white text-slate-600 shadow-sm'
                                : option.id === 'OBOJE'
                                ? 'bg-amber-500 text-slate-950 shadow-sm'
                                : 'bg-amber-100 text-amber-900 shadow-sm'
                              : 'text-slate-500 hover:text-slate-800 hover:bg-slate-200/50'
                          } ${!user ? 'cursor-not-allowed opacity-80' : ''}`}
                        >
                          {option.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>

          {user && (
            <div className="bg-slate-50 p-4 sm:p-5 border-t border-slate-100 flex justify-end">
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-6 py-2.5 bg-amber-500 hover:bg-amber-600 text-slate-900 font-bold rounded-xl shadow-md transition disabled:opacity-50 text-sm"
              >
                {saving ? 'Ukládám...' : 'Uložit jízdy pro tento den'}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
