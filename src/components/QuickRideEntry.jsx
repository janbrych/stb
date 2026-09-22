import React, { useState, useEffect } from 'react';
import { Calendar as CalendarIcon, CheckCircle2, Lock, Save, ArrowRightLeft, User } from 'lucide-react';

export default function QuickRideEntry({ user, onDataChanged, onSelectPassenger }) {
  const todayStr = new Date().toISOString().slice(0, 10);
  const [selectedDate, setSelectedDate] = useState(todayStr);
  const [passengers, setPassengers] = useState([]);
  const [rideSelections, setRideSelections] = useState({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);

  // Load passengers and rides for the selected date
  const loadData = async () => {
    setLoading(true);
    setMessage(null);
    try {
      const [passRes, ridesRes] = await Promise.all([
        fetch('/api/passengers'),
        fetch(`/api/rides?date=${selectedDate}`)
      ]);

      const passData = await passRes.json();
      const ridesData = await ridesRes.json();

      setPassengers(passData);

      // Build initial selection map for each passenger
      const initialMap = {};
      passData.forEach(p => {
        const pRides = ridesData.filter(r => r.passenger_id === p.id);
        const hasTam = pRides.some(r => r.direction === 'TAM');
        const hasZpet = pRides.some(r => r.direction === 'ZPET');

        if (hasTam && hasZpet) {
          initialMap[p.id] = 'OBOJE';
        } else if (hasTam) {
          initialMap[p.id] = 'TAM';
        } else if (hasZpet) {
          initialMap[p.id] = 'ZPET';
        } else {
          initialMap[p.id] = 'NIC';
        }
      });

      setRideSelections(initialMap);
    } catch (err) {
      console.error('Error loading quick entry data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [selectedDate]);

  const handleSelectionChange = (passengerId, status) => {
    if (!user) return;
    setRideSelections(prev => ({
      ...prev,
      [passengerId]: status
    }));
  };

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    setMessage(null);

    try {
      const payload = {
        date: selectedDate,
        passengers: Object.keys(rideSelections).map(id => ({
          passenger_id: parseInt(id, 10),
          status: rideSelections[id]
        }))
      };

      const res = await fetch('/api/rides/daily', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        throw new Error('Nepodařilo se uložit jízdy');
      }

      setMessage({ type: 'success', text: `Jízdy pro ${formatCzechDate(selectedDate)} byly úspěšně uloženy.` });
      if (onDataChanged) onDataChanged();
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setSaving(false);
    }
  };

  const formatCzechDate = (dateString) => {
    if (!dateString) return '';
    const [y, m, d] = dateString.split('-');
    return `${parseInt(d, 10)}. ${parseInt(m, 10)}. ${y}`;
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <ArrowRightLeft className="w-6 h-6 text-amber-500" />
            Rychlé zadání jízd
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Vyberte datum a jedním kliknutím zaklikněte, kdo daný den jel (TAM / ZPĚT / OBOJE).
          </p>
        </div>

        {/* Date Selector */}
        <div className="flex items-center space-x-3 bg-slate-50 p-2.5 rounded-xl border border-slate-200">
          <CalendarIcon className="w-5 h-5 text-amber-500 flex-shrink-0" />
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="bg-transparent font-semibold text-slate-800 text-sm focus:outline-none cursor-pointer"
          />
          {selectedDate === todayStr && (
            <span className="bg-amber-100 text-amber-800 text-xs px-2 py-0.5 rounded-full font-bold">
              Dnes
            </span>
          )}
        </div>
      </div>

      {/* Admin Notice / View-Only Warning */}
      {!user && (
        <div className="bg-amber-50 border border-amber-200 text-amber-900 px-4 py-3 rounded-xl flex items-center justify-between text-sm">
          <div className="flex items-center space-x-2">
            <Lock className="w-4 h-4 text-amber-600 flex-shrink-0" />
            <span>Jste v režimu pouze pro čtení. Pro upravování a zadávání jízd se přihlaste jako admin.</span>
          </div>
        </div>
      )}

      {/* Success/Error Message */}
      {message && (
        <div className={`p-4 rounded-xl text-sm font-medium flex items-center space-x-2 ${
          message.type === 'success' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-red-50 text-red-800 border border-red-200'
        }`}>
          <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
          <span>{message.text}</span>
        </div>
      )}

      {/* Passengers Ride Matrix */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Seznam cestujících – {formatCzechDate(selectedDate)}
          </span>
          <span className="text-xs text-slate-500">
            {passengers.length} cestující
          </span>
        </div>

        {loading ? (
          <div className="p-8 text-center text-slate-500">Načítám data...</div>
        ) : passengers.length === 0 ? (
          <div className="p-8 text-center text-slate-500">
            Zatím nebyly vytvořeni žádní cestující. Přidejte prvního cestujícího tlačítkem v horní liště.
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {passengers.map(passenger => {
              const currentStatus = rideSelections[passenger.id] || 'NIC';
              return (
                <div
                  key={passenger.id}
                  className="p-4 sm:px-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50/60 transition"
                >
                  <div className="flex items-center space-x-3">
                    <button
                      onClick={() => onSelectPassenger(passenger.id)}
                      className="text-left group"
                    >
                      <div className="flex items-center space-x-2">
                        <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-700 font-bold text-xs group-hover:bg-amber-100 group-hover:text-amber-800 transition">
                          <User className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="font-semibold text-slate-900 group-hover:text-amber-600 transition">
                            {passenger.name}
                          </p>
                          <p className="text-xs text-slate-500">
                            Výchozí cena: {passenger.default_price} Kč / jízda
                          </p>
                        </div>
                      </div>
                    </button>
                  </div>

                  {/* Status Options */}
                  <div className="grid grid-cols-4 gap-1.5 sm:gap-2 max-w-md w-full">
                    {[
                      { key: 'NIC', label: 'NIC', color: 'slate' },
                      { key: 'TAM', label: 'TAM', sub: 'Do školy', color: 'blue' },
                      { key: 'ZPET', label: 'ZPĚT', sub: 'Ze školy', color: 'indigo' },
                      { key: 'OBOJE', label: 'OBOJE', sub: 'Tam + Zpět', color: 'amber' },
                    ].map((opt) => {
                      const isSelected = currentStatus === opt.key;
                      let btnClasses = "px-2 py-2 text-xs font-bold rounded-xl border transition text-center flex flex-col items-center justify-center ";

                      if (isSelected) {
                        if (opt.key === 'NIC') btnClasses += "bg-slate-800 text-white border-slate-800 shadow-sm";
                        if (opt.key === 'TAM') btnClasses += "bg-blue-600 text-white border-blue-600 shadow-sm";
                        if (opt.key === 'ZPET') btnClasses += "bg-indigo-600 text-white border-indigo-600 shadow-sm";
                        if (opt.key === 'OBOJE') btnClasses += "bg-amber-500 text-slate-950 border-amber-500 shadow-sm font-extrabold";
                      } else {
                        btnClasses += "bg-white text-slate-600 border-slate-200 hover:bg-slate-100";
                      }

                      if (!user) {
                        btnClasses += " opacity-75 cursor-not-allowed";
                      }

                      return (
                        <button
                          key={opt.key}
                          disabled={!user}
                          onClick={() => handleSelectionChange(passenger.id, opt.key)}
                          className={btnClasses}
                        >
                          <span>{opt.label}</span>
                          {opt.sub && (
                            <span className={`text-[10px] font-normal leading-tight opacity-80`}>
                              {opt.sub}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Save Bar */}
        {user && passengers.length > 0 && (
          <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
            <span className="text-xs text-slate-500">
              Nezapomeňte uložit provedené změny pro {formatCzechDate(selectedDate)}.
            </span>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center space-x-2 bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold px-6 py-2.5 rounded-xl shadow transition disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              <span>{saving ? 'Ukládám...' : 'Uložit jízdy'}</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
