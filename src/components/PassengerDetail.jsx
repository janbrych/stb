import React, { useState, useEffect } from 'react';
import CalendarView from './CalendarView';
import { api } from '../api';

export default function PassengerDetail({ passengerId, user, onBack, onPassengerDeleted, onDataChanged }) {
  const [selectedMonth, setSelectedMonth] = useState(
    new Date().toISOString().slice(0, 7)
  );
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  // Price edit mode
  const [isEditingPrice, setIsEditingPrice] = useState(false);
  const [newPriceInput, setNewPriceInput] = useState('');

  // Edit name mode
  const [isEditingName, setIsEditingName] = useState(false);
  const [editNameInput, setEditNameInput] = useState('');
  const [editNoteInput, setEditNoteInput] = useState('');

  const loadDetail = async () => {
    setLoading(true);
    try {
      const resData = await api.getPassengerDetail(passengerId, selectedMonth);
      setData(resData);
      setNewPriceInput(resData.selected_month.price.toString());
      setEditNameInput(resData.passenger.name);
      setEditNoteInput(resData.passenger.note || '');
    } catch (err) {
      console.error('Error loading passenger detail:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDetail();
  }, [passengerId, selectedMonth]);

  const changeMonth = (delta) => {
    const [year, month] = selectedMonth.split('-').map(Number);
    const date = new Date(year, month - 1 + delta, 1);
    const newYm = date.toISOString().slice(0, 7);
    setSelectedMonth(newYm);
  };

  const handlePriceSave = async () => {
    if (!user) return;
    const p = parseFloat(newPriceInput);
    if (isNaN(p) || p < 0) {
      alert('Zadejte platnou nezápornou cenu.');
      return;
    }

    try {
      await api.setPassengerPrice(passengerId, selectedMonth, p);
      setIsEditingPrice(false);
      loadDetail();
      onDataChanged();
    } catch (err) {
      alert('Chyba při ukládání ceny.');
    }
  };

  const handleTogglePayment = async () => {
    if (!user || !data) return;
    const currentPaid = data.selected_month.paid;
    try {
      await api.setPassengerPayment(passengerId, selectedMonth, !currentPaid);
      loadDetail();
      onDataChanged();
    } catch (err) {
      alert('Chyba při změně stavu zaplacení.');
    }
  };

  const handleSavePassengerInfo = async () => {
    if (!user) return;
    if (!editNameInput.trim()) {
      alert('Jméno nesmí být prázdné.');
      return;
    }

    try {
      await api.updatePassenger(passengerId, {
        name: editNameInput.trim(),
        note: editNoteInput.trim() || null
      });
      setIsEditingName(false);
      loadDetail();
      onDataChanged();
    } catch (err) {
      alert('Chyba při aktualizaci údajů.');
    }
  };

  const handleDeletePassenger = async () => {
    if (!user) return;
    if (!window.confirm(`Opravdu chcete smazat cestujícího ${data?.passenger?.name}? Všechny jeho jízdy a historie budou trvale smazány.`)) {
      return;
    }

    try {
      await api.deletePassenger(passengerId);
      onPassengerDeleted();
    } catch (err) {
      alert('Chyba při mazání cestujícího.');
    }
  };

  const formatMonthCzech = (ym) => {
    const [year, month] = ym.split('-').map(Number);
    const date = new Date(year, month - 1, 1);
    return date.toLocaleDateString('cs-CZ', { month: 'long', year: 'numeric' });
  };

  if (loading) {
    return <div className="text-center py-12 text-slate-400">Načítám detail cestujícího...</div>;
  }

  if (!data) {
    return (
      <div className="bg-white rounded-2xl p-8 text-center text-slate-500">
        Cestující nenalezen.
        <button onClick={onBack} className="block mx-auto mt-4 text-amber-600 underline">
          Zpět na přehled
        </button>
      </div>
    );
  }

  const { passenger, selected_month, all_time, history } = data;

  return (
    <div className="space-y-6">
      {/* Back button and Header */}
      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-slate-900 bg-white px-4 py-2 rounded-xl border border-slate-200 shadow-sm transition"
        >
          ← Zpět na přehled
        </button>

        {user && (
          <button
            onClick={handleDeletePassenger}
            className="text-xs font-semibold text-red-600 hover:text-red-800 hover:bg-red-50 px-3 py-2 rounded-lg transition"
          >
            Smazat cestujícího
          </button>
        )}
      </div>

      {/* Passenger Header Info */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200/80">
        {isEditingName ? (
          <div className="space-y-4 max-w-md">
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">Jméno</label>
              <input
                type="text"
                value={editNameInput}
                onChange={(e) => setEditNameInput(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">Poznámka</label>
              <input
                type="text"
                value={editNoteInput}
                onChange={(e) => setEditNoteInput(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg text-sm"
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleSavePassengerInfo}
                className="px-3 py-1.5 bg-amber-500 text-slate-900 font-bold rounded-lg text-xs"
              >
                Uložit
              </button>
              <button
                onClick={() => setIsEditingName(false)}
                className="px-3 py-1.5 bg-slate-200 text-slate-700 font-semibold rounded-lg text-xs"
              >
                Zrušit
              </button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-3xl font-extrabold text-slate-900">{passenger.name}</h1>
                {user && (
                  <button
                    onClick={() => setIsEditingName(true)}
                    className="text-xs text-amber-600 hover:underline font-medium"
                  >
                    [Upravit]
                  </button>
                )}
              </div>
              {passenger.note && <p className="text-sm text-slate-500 mt-1">{passenger.note}</p>}
            </div>

            {/* All-time Stat Badges */}
            <div className="flex items-center gap-4 text-xs font-semibold bg-slate-50 p-3 rounded-xl border border-slate-100">
              <div>
                <span className="text-slate-400 block">Celkem jízd</span>
                <span className="text-slate-800 text-base font-bold">{all_time.total_rides}</span>
              </div>
              <div className="h-8 w-px bg-slate-200"></div>
              <div>
                <span className="text-slate-400 block">Celkem dluží</span>
                <span className="text-amber-600 text-base font-bold">{all_time.total_amount_unpaid} Kč</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Month Switcher Banner */}
      <div className="bg-slate-900 text-white rounded-2xl p-5 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-md">
        <div>
          <span className="text-xs uppercase text-slate-400 font-bold tracking-wider">Vybrané období</span>
          <h2 className="text-2xl font-bold capitalize mt-0.5">{formatMonthCzech(selectedMonth)}</h2>
        </div>

        <div className="flex items-center gap-2 bg-slate-800 p-1.5 rounded-xl text-sm font-semibold">
          <button
            onClick={() => changeMonth(-1)}
            className="px-3 py-1.5 hover:bg-slate-700 rounded-lg transition"
          >
            ← Předchozí
          </button>
          <button
            onClick={() => setSelectedMonth(new Date().toISOString().slice(0, 7))}
            className="px-3 py-1.5 hover:bg-slate-700 rounded-lg transition text-xs font-bold text-amber-400"
          >
            Dnešní měsíc
          </button>
          <button
            onClick={() => changeMonth(1)}
            className="px-3 py-1.5 hover:bg-slate-700 rounded-lg transition"
          >
            Další →
          </button>
        </div>
      </div>

      {/* Calendar Section */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm">
        <h3 className="text-lg font-bold text-slate-900 mb-4">1. Měsíční kalendář</h3>
        <CalendarView
          yearMonth={selectedMonth}
          calendarDays={selected_month.calendar_days}
          passengerId={passengerId}
          user={user}
          onRideUpdated={() => {
            loadDetail();
            onDataChanged();
          }}
        />
      </div>

      {/* Monthly Summary & Price / Payment Controls */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Monthly Summary */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm space-y-4">
          <h3 className="text-lg font-bold text-slate-900">2. Měsíční souhrn</h3>
          <div className="space-y-3 divide-y divide-slate-100 text-sm">
            <div className="pt-2 flex justify-between">
              <span className="text-slate-500">Jízdy TAM:</span>
              <span className="font-bold text-slate-800">{selected_month.tam_count}</span>
            </div>
            <div className="pt-2 flex justify-between">
              <span className="text-slate-500">Jízdy ZPĚT:</span>
              <span className="font-bold text-slate-800">{selected_month.zpet_count}</span>
            </div>
            <div className="pt-2 flex justify-between">
              <span className="text-slate-500">Celkový počet jízd:</span>
              <span className="font-extrabold text-slate-900 text-base">{selected_month.total_rides}</span>
            </div>
            <div className="pt-2 flex justify-between items-center">
              <span className="text-slate-500">Cena za 1 jízdu:</span>
              <span className="font-bold text-slate-800">{selected_month.price} Kč</span>
            </div>
            <div className="pt-3 flex justify-between items-center text-base bg-amber-50/50 p-3 rounded-xl border border-amber-100">
              <span className="font-bold text-slate-900">CELKOVÁ ČÁSTKA:</span>
              <span className="font-black text-amber-600 text-xl">{selected_month.total_amount} Kč</span>
            </div>
          </div>
        </div>

        {/* Price & Payment Management */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm space-y-6">
          {/* Section 3: Cena za jízdu */}
          <div>
            <h3 className="text-lg font-bold text-slate-900 mb-2">3. Cena za jízdu</h3>
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200/60 flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-400">Nastavená cena pro {formatMonthCzech(selectedMonth)}</p>
                <p className="text-xl font-bold text-slate-900 mt-0.5">{selected_month.price} Kč / jízda</p>
              </div>

              {user && (
                <div>
                  {isEditingPrice ? (
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min="0"
                        value={newPriceInput}
                        onChange={(e) => setNewPriceInput(e.target.value)}
                        className="w-20 px-2 py-1 border rounded text-sm"
                      />
                      <button
                        onClick={handlePriceSave}
                        className="px-3 py-1 bg-amber-500 text-slate-900 text-xs font-bold rounded-lg"
                      >
                        Uložit
                      </button>
                      <button
                        onClick={() => setIsEditingPrice(false)}
                        className="text-xs text-slate-500"
                      >
                        ✕
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setIsEditingPrice(true)}
                      className="px-3 py-1.5 bg-amber-100 hover:bg-amber-200 text-amber-900 text-xs font-bold rounded-lg transition"
                    >
                      Změnit cenu
                    </button>
                  )}
                </div>
              )}
            </div>
            <p className="text-xs text-slate-400 mt-2">
              * Změna ceny platí od tohoto měsíce dál. Historické měsíce si zachovávají původní cenu.
            </p>
          </div>

          {/* Section 4: Zaplaceno */}
          <div>
            <h3 className="text-lg font-bold text-slate-900 mb-2">4. Stav zaplacení</h3>
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200/60 flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-400">Stav pro {formatMonthCzech(selectedMonth)}</p>
                <p className={`text-base font-bold mt-0.5 ${
                  selected_month.paid ? 'text-emerald-600' : 'text-amber-600'
                }`}>
                  {selected_month.paid ? 'ZAPLACENO' : 'NEZAPLACENO'}
                </p>
              </div>

              <button
                disabled={!user}
                onClick={handleTogglePayment}
                className={`px-4 py-2 rounded-xl font-bold text-xs transition ${
                  selected_month.paid
                    ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                    : 'bg-amber-500 text-slate-900 hover:bg-amber-600'
                } ${!user ? 'cursor-default opacity-90' : ''}`}
              >
                {selected_month.paid ? '☑ Zaplaceno' : '☐ Označit jako Zaplaceno'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Complete Passenger History Table */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm">
        <h3 className="text-lg font-bold text-slate-900 mb-4">Kompletní historie cestujícího</h3>

        {history.length === 0 ? (
          <p className="text-sm text-slate-400">Zatím neexistují žádné historické záznamy.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-xs text-slate-400 uppercase">
                  <th className="py-2.5 px-3">Měsíc</th>
                  <th className="py-2.5 px-3 text-center">Počet jízd</th>
                  <th className="py-2.5 px-3 text-right">Cena / jízda</th>
                  <th className="py-2.5 px-3 text-right">Celkem Kč</th>
                  <th className="py-2.5 px-3 text-center">Stav</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {history.map((item) => (
                  <tr
                    key={item.year_month}
                    onClick={() => setSelectedMonth(item.year_month)}
                    className={`hover:bg-slate-50 transition cursor-pointer ${
                      item.year_month === selectedMonth ? 'bg-amber-50/40' : ''
                    }`}
                  >
                    <td className="py-3 px-3 font-bold text-slate-900 capitalize">
                      {formatMonthCzech(item.year_month)}
                    </td>
                    <td className="py-3 px-3 text-center text-slate-700">{item.rides_count}</td>
                    <td className="py-3 px-3 text-right text-slate-700">{item.price} Kč</td>
                    <td className="py-3 px-3 text-right font-bold text-slate-900">{item.total_amount} Kč</td>
                    <td className="py-3 px-3 text-center">
                      <span className={`px-2.5 py-1 rounded-md text-xs font-bold ${
                        item.paid ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                      }`}>
                        {item.paid ? 'Zaplaceno' : 'Nezaplaceno'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
