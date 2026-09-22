import React, { useState, useEffect } from 'react';
import { ArrowLeft, Edit3, Trash2, CheckSquare, Square, DollarSign, Calendar as CalendarIcon, User, History, Save, AlertTriangle } from 'lucide-react';
import CalendarView from './CalendarView';

export default function PassengerDetail({
  passengerId,
  user,
  onBack,
  onPassengerDeleted,
  onDataChanged
}) {
  const [yearMonth, setYearMonth] = useState(new Date().toISOString().slice(0, 7));
  const [detailData, setDetailData] = useState(null);
  const [loading, setLoading] = useState(true);

  // Price edit state
  const [editingPrice, setEditingPrice] = useState(false);
  const [newPrice, setNewPrice] = useState('');

  // Passenger edit state
  const [editingPassenger, setEditingPassenger] = useState(false);
  const [editName, setEditName] = useState('');
  const [editNote, setEditNote] = useState('');

  const loadDetail = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/passengers/${passengerId}/detail?year_month=${yearMonth}`);
      const data = await res.json();
      setDetailData(data);
      setNewPrice(data.selected_month.price);
      setEditName(data.passenger.name);
      setEditNote(data.passenger.note || '');
    } catch (err) {
      console.error('Error loading passenger detail:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDetail();
  }, [passengerId, yearMonth]);

  const handleMonthOffset = (offset) => {
    const [year, month] = yearMonth.split('-').map(Number);
    const date = new Date(year, month - 1 + offset, 1);
    const newYm = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    setYearMonth(newYm);
  };

  const handleSavePrice = async () => {
    if (!user) return;
    try {
      const res = await fetch(`/api/passengers/${passengerId}/price`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          year_month: yearMonth,
          price: parseFloat(newPrice)
        })
      });

      if (res.ok) {
        setEditingPrice(false);
        loadDetail();
        if (onDataChanged) onDataChanged();
      }
    } catch (err) {
      console.error('Error saving price:', err);
    }
  };

  const handleTogglePayment = async () => {
    if (!user || !detailData) return;
    try {
      const currentPaid = detailData.selected_month.paid;
      const res = await fetch(`/api/passengers/${passengerId}/payment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          year_month: yearMonth,
          paid: !currentPaid
        })
      });

      if (res.ok) {
        loadDetail();
        if (onDataChanged) onDataChanged();
      }
    } catch (err) {
      console.error('Error toggling payment:', err);
    }
  };

  const handleUpdatePassenger = async (e) => {
    e.preventDefault();
    if (!user) return;

    try {
      const res = await fetch(`/api/passengers/${passengerId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editName,
          note: editNote
        })
      });

      if (res.ok) {
        setEditingPassenger(false);
        loadDetail();
        if (onDataChanged) onDataChanged();
      }
    } catch (err) {
      console.error('Error updating passenger:', err);
    }
  };

  const handleDeletePassenger = async () => {
    if (!user) return;
    if (window.confirm(`Opravdu chcete smazat cestujícího "${detailData?.passenger.name}" a veškerou jeho historii?`)) {
      try {
        const res = await fetch(`/api/passengers/${passengerId}`, { method: 'DELETE' });
        if (res.ok) {
          if (onPassengerDeleted) onPassengerDeleted();
          onBack();
        }
      } catch (err) {
        console.error('Error deleting passenger:', err);
      }
    }
  };

  const formatMonthCzech = (ymStr) => {
    const [year, month] = ymStr.split('-').map(Number);
    const date = new Date(year, month - 1, 1);
    return date.toLocaleDateString('cs-CZ', { month: 'long', year: 'numeric' });
  };

  if (loading && !detailData) {
    return <div className="p-8 text-center text-slate-500">Načítám detail cestujícího...</div>;
  }

  if (!detailData) {
    return <div className="p-8 text-center text-red-500">Cestující nebyl nalezen.</div>;
  }

  const { passenger, selected_month, all_time, history } = detailData;

  return (
    <div className="space-y-6">
      {/* Top Header & Actions */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center space-x-4">
          <button
            onClick={onBack}
            className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition"
            title="Zpět na přehled"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>

          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 rounded-2xl bg-amber-400 text-slate-950 flex items-center justify-center font-black text-xl shadow-sm">
              <User className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-slate-900">{passenger.name}</h1>
              {passenger.note && (
                <p className="text-xs text-slate-500">{passenger.note}</p>
              )}
            </div>
          </div>
        </div>

        {/* Admin Actions for Passenger */}
        {user && (
          <div className="flex items-center space-x-2 self-start md:self-auto">
            <button
              onClick={() => setEditingPassenger(!editingPassenger)}
              className="flex items-center space-x-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-xs transition"
            >
              <Edit3 className="w-4 h-4" />
              <span>Upravit jméno</span>
            </button>
            <button
              onClick={handleDeletePassenger}
              className="flex items-center space-x-1.5 px-3 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-xl font-bold text-xs transition border border-rose-200"
            >
              <Trash2 className="w-4 h-4" />
              <span>Smazat</span>
            </button>
          </div>
        )}
      </div>

      {/* Passenger Name Edit Form (if open) */}
      {editingPassenger && (
        <form onSubmit={handleUpdatePassenger} className="bg-amber-50 border border-amber-200 p-4 rounded-2xl space-y-3">
          <h3 className="text-xs font-bold uppercase text-amber-900 tracking-wider">Upravit informace o cestujícím</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <input
              type="text"
              required
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              className="px-3 py-2 border rounded-xl text-sm"
              placeholder="Jméno a příjmení"
            />
            <input
              type="text"
              value={editNote}
              onChange={(e) => setEditNote(e.target.value)}
              className="px-3 py-2 border rounded-xl text-sm"
              placeholder="Poznámka"
            />
          </div>
          <div className="flex justify-end space-x-2">
            <button
              type="button"
              onClick={() => setEditingPassenger(false)}
              className="px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-amber-100 rounded-lg"
            >
              Zrušit
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs rounded-lg shadow"
            >
              Uložit změny
            </button>
          </div>
        </form>
      )}

      {/* Main Grid: Calendar on Left, Monthly Summary & Price on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Interactive Calendar (2 cols wide) */}
        <div className="lg:col-span-2">
          <CalendarView
            yearMonth={yearMonth}
            onChangeMonth={handleMonthOffset}
            calendarDays={selected_month.calendar_days}
            user={user}
            passengerId={passengerId}
            onRideToggled={() => {
              loadDetail();
              if (onDataChanged) onDataChanged();
            }}
          />
        </div>

        {/* Right Column: Month Summary & Pricing Box */}
        <div className="space-y-6">
          {/* Monthly Summary Box */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 space-y-5">
            <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
              <span className="text-xs font-extrabold uppercase text-amber-600 tracking-wider">
                Měsíční souhrn
              </span>
              <span className="text-sm font-bold capitalize text-slate-900">
                {formatMonthCzech(yearMonth)}
              </span>
            </div>

            <div className="space-y-3">
              <div className="flex justify-between items-center text-sm">
                <span className="text-slate-500">Jízdy TAM:</span>
                <span className="font-bold text-slate-800">{selected_month.tam_count}×</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-slate-500">Jízdy ZPĚT:</span>
                <span className="font-bold text-slate-800">{selected_month.zpet_count}×</span>
              </div>
              <div className="flex justify-between items-center text-sm pt-2 border-t border-slate-100">
                <span className="font-bold text-slate-700">Celkem jízd:</span>
                <span className="font-extrabold text-amber-600 text-base">{selected_month.total_rides}×</span>
              </div>

              {/* Price per ride with Admin edit capability */}
              <div className="pt-3 border-t border-slate-100 space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-semibold uppercase text-slate-400">Cena za 1 jízdu:</span>
                  <div className="flex items-center space-x-1">
                    <span className="font-extrabold text-slate-900">{selected_month.price} Kč</span>
                    {user && !editingPrice && (
                      <button
                        onClick={() => setEditingPrice(true)}
                        className="p-1 text-slate-400 hover:text-amber-600 rounded transition"
                        title="Změnit cenu od tohoto měsíce"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                {editingPrice && user && (
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl space-y-2">
                    <label className="text-xs font-bold text-amber-900 block">
                      Nová cena platná od {formatMonthCzech(yearMonth)}:
                    </label>
                    <div className="flex items-center space-x-2">
                      <input
                        type="number"
                        value={newPrice}
                        onChange={(e) => setNewPrice(e.target.value)}
                        className="w-full px-2.5 py-1.5 border rounded-lg text-sm bg-white"
                      />
                      <button
                        onClick={handleSavePrice}
                        className="p-2 bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold rounded-lg transition"
                      >
                        <Save className="w-4 h-4" />
                      </button>
                    </div>
                    <p className="text-[10px] text-amber-800">
                      Historické měsíce zůstanou nedotčeny. Nová cena bude platit od tohoto měsíce dál.
                    </p>
                  </div>
                )}
              </div>

              {/* Total calculation */}
              <div className="bg-slate-900 text-white p-4 rounded-xl space-y-1">
                <span className="text-xs text-slate-400 block uppercase font-bold tracking-wider">
                  Celková částka k úhradě
                </span>
                <div className="flex items-baseline justify-between">
                  <span className="text-2xl font-black text-amber-400">
                    {selected_month.total_amount} Kč
                  </span>
                  <span className="text-xs text-slate-400">
                    ({selected_month.total_rides} × {selected_month.price} Kč)
                  </span>
                </div>
              </div>

              {/* Payment status toggle */}
              <div className="pt-2">
                <button
                  disabled={!user}
                  onClick={handleTogglePayment}
                  className={`w-full flex items-center justify-center space-x-2 py-2.5 px-4 rounded-xl font-bold text-sm transition ${
                    selected_month.paid
                      ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                      : 'bg-rose-100 text-rose-800 border border-rose-300'
                  } ${user ? 'hover:scale-[1.02] cursor-pointer' : 'cursor-default'}`}
                >
                  {selected_month.paid ? (
                    <>
                      <CheckSquare className="w-5 h-5 text-emerald-600" />
                      <span>Zaplaceno ({formatMonthCzech(yearMonth)})</span>
                    </>
                  ) : (
                    <>
                      <Square className="w-5 h-5 text-rose-600" />
                      <span>Nezaplaceno ({formatMonthCzech(yearMonth)})</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* All-time Statistics Card */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 space-y-3">
            <div className="flex items-center space-x-2 border-b border-slate-100 pb-2">
              <History className="w-4 h-4 text-amber-500" />
              <h3 className="font-bold text-slate-900 text-sm">Celková historie (všechny měsíce)</h3>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex justify-between py-1 border-b border-slate-50">
                <span className="text-slate-500">Celkový počet jízd:</span>
                <span className="font-bold text-slate-900">{all_time.total_rides}×</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-50">
                <span className="text-slate-500">Celkový dluh historicky:</span>
                <span className="font-bold text-slate-900">{all_time.total_amount_due} Kč</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-50">
                <span className="text-slate-500">Už zaplaceno celkem:</span>
                <span className="font-bold text-emerald-600">{all_time.total_amount_paid} Kč</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-slate-500">Aktuálně nedoplatky:</span>
                <span className="font-bold text-rose-600">{all_time.total_amount_unpaid} Kč</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Monthly History Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Přehled jednotlivých měsíců
          </span>
          <span className="text-xs text-slate-500">
            Historie cen, jízd a zaplacení
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-100/70 text-slate-600 text-xs uppercase font-bold tracking-wider">
              <tr>
                <th className="py-3 px-6">Měsíc</th>
                <th className="py-3 px-4 text-center">Jízdy</th>
                <th className="py-3 px-4 text-right">Cena / jízda</th>
                <th className="py-3 px-4 text-right">Celkem Kč</th>
                <th className="py-3 px-6 text-center">Stav</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {history.map(item => (
                <tr
                  key={item.year_month}
                  className={`hover:bg-amber-50/40 transition cursor-pointer ${
                    item.year_month === yearMonth ? 'bg-amber-50/80 font-bold' : ''
                  }`}
                  onClick={() => setYearMonth(item.year_month)}
                >
                  <td className="py-3.5 px-6 capitalize">
                    {formatMonthCzech(item.year_month)}
                  </td>
                  <td className="py-3.5 px-4 text-center">{item.rides_count}×</td>
                  <td className="py-3.5 px-4 text-right text-slate-600">{item.price} Kč</td>
                  <td className="py-3.5 px-4 text-right font-bold text-slate-900">{item.total_amount} Kč</td>
                  <td className="py-3.5 px-6 text-center">
                    <span className={`inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-xs font-bold ${
                      item.paid ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                    }`}>
                      {item.paid ? 'Zaplaceno' : 'Nezaplaceno'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
