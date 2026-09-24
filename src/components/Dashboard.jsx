import React, { useState, useEffect } from 'react';
import { api } from '../api';

export default function Dashboard({ user, onSelectPassenger, refreshedSignal }) {
  const [selectedMonth, setSelectedMonth] = useState(
    new Date().toISOString().slice(0, 7)
  );
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadSummary = async () => {
    setLoading(true);
    try {
      const summary = await api.getMonthSummary(selectedMonth);
      setData(summary);
    } catch (err) {
      console.error('Error loading dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSummary();
  }, [selectedMonth, refreshedSignal]);

  const handleTogglePayment = async (passengerId, currentPaid) => {
    if (!user) return;
    try {
      await api.setPassengerPayment(passengerId, selectedMonth, !currentPaid);
      loadSummary();
    } catch (err) {
      alert('Chyba při změně stavu zaplacení.');
    }
  };

  const handleDeletePassenger = async (passengerId, passengerName) => {
    if (!user) return;
    if (!window.confirm(`Opravdu chcete smazat cestujícího ${passengerName}? Všechny jeho jízdy a historie budou trvale smazány.`)) {
      return;
    }
    try {
      await api.deletePassenger(passengerId);
      loadSummary();
    } catch (err) {
      alert('Chyba při mazání cestujícího.');
    }
  };

  const changeMonth = (delta) => {
    const [year, month] = selectedMonth.split('-').map(Number);
    const date = new Date(year, month - 1 + delta, 1);
    const newYm = date.toISOString().slice(0, 7);
    setSelectedMonth(newYm);
  };

  const formatMonthCzech = (ym) => {
    const [year, month] = ym.split('-').map(Number);
    const date = new Date(year, month - 1, 1);
    return date.toLocaleDateString('cs-CZ', { month: 'long', year: 'numeric' });
  };

  return (
    <div className="space-y-6">
      {/* Month Selector & Banner */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200/80 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Přehled jízd a plateb</h1>
          <p className="text-sm text-slate-500 mt-1">
            Souhrnné statistiky za měsíc {formatMonthCzech(selectedMonth)}
          </p>
        </div>

        {/* Month Switcher Controls */}
        <div className="flex items-center gap-2 bg-slate-100 p-1.5 rounded-xl text-sm font-semibold text-slate-700">
          <button
            onClick={() => changeMonth(-1)}
            className="p-1.5 hover:bg-white rounded-lg transition"
            title="Předchozí měsíc"
          >
            ←
          </button>
          <span className="px-3 capitalize text-slate-900">
            {formatMonthCzech(selectedMonth)}
          </span>
          <button
            onClick={() => changeMonth(1)}
            className="p-1.5 hover:bg-white rounded-lg transition"
            title="Další měsíc"
          >
            →
          </button>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12 text-slate-400">Načítám přehled...</div>
      ) : !data || data.passengers.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center text-slate-500 border border-slate-200">
          Žádná data pro tento měsíc.
        </div>
      ) : (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Celkem jízd</p>
              <p className="text-2xl font-bold text-slate-900 mt-1">{data.grand_total_rides}</p>
            </div>
            <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Celková částka</p>
              <p className="text-2xl font-bold text-slate-900 mt-1">{data.grand_total_amount} Kč</p>
            </div>
            <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Zaplaceno</p>
              <p className="text-2xl font-bold text-emerald-600 mt-1">{data.grand_total_paid_amount} Kč</p>
            </div>
            <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Zbývá zaplatit</p>
              <p className="text-2xl font-bold text-amber-600 mt-1">{data.grand_total_unpaid_amount} Kč</p>
            </div>
          </div>

          {/* Passenger Table */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200/80 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    <th className="py-3.5 px-4 sm:px-6">Cestující</th>
                    <th className="py-3.5 px-4 text-center">TAM</th>
                    <th className="py-3.5 px-4 text-center">ZPĚT</th>
                    <th className="py-3.5 px-4 text-center">Celkem jízd</th>
                    <th className="py-3.5 px-4 text-right">Cena / jízda</th>
                    <th className="py-3.5 px-4 text-right">Celkem Kč</th>
                    <th className="py-3.5 px-4 sm:px-6 text-center">Zaplaceno</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm font-medium text-slate-700">
                  {data.passengers.map((p) => (
                    <tr key={p.passenger_id} className="hover:bg-slate-50/60 transition group">
                      <td className="py-4 px-4 sm:px-6">
                        <div className="flex items-center justify-between gap-2">
                          <button
                            onClick={() => onSelectPassenger(p.passenger_id)}
                            className="font-bold text-slate-900 hover:text-amber-600 transition text-left"
                          >
                            {p.name}
                          </button>
                          {user && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeletePassenger(p.passenger_id, p.name);
                              }}
                              className="text-xs text-red-500 hover:text-red-700 p-1 hover:bg-red-50 rounded transition"
                              title="Smazat cestujícího"
                            >
                              ✕
                            </button>
                          )}
                        </div>
                      </td>
                      <td className="py-4 px-4 text-center text-slate-600">{p.tam_count}</td>
                      <td className="py-4 px-4 text-center text-slate-600">{p.zpet_count}</td>
                      <td className="py-4 px-4 text-center font-bold text-slate-900">{p.total_rides}</td>
                      <td className="py-4 px-4 text-right">{p.price} Kč</td>
                      <td className="py-4 px-4 text-right font-bold text-slate-900">{p.total_amount} Kč</td>
                      <td className="py-4 px-4 sm:px-6 text-center">
                        <button
                          disabled={!user}
                          onClick={() => handleTogglePayment(p.passenger_id, p.paid)}
                          className={`px-3 py-1.5 rounded-lg font-semibold text-xs transition inline-flex items-center gap-1.5 ${
                            p.paid
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                              : 'bg-amber-100 text-amber-800 border border-amber-200'
                          } ${!user ? 'cursor-default opacity-90' : 'hover:opacity-80'}`}
                        >
                          {p.paid ? '☑ Zaplaceno' : '☐ Nezaplaceno'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
