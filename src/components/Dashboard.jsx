import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, CheckSquare, Square, DollarSign, Calendar, Users, Car, CheckCircle2, XCircle } from 'lucide-react';

export default function Dashboard({ user, onSelectPassenger, refreshedSignal }) {
  const [yearMonth, setYearMonth] = useState(new Date().toISOString().slice(0, 7)); // 'YYYY-MM'
  const [summaryData, setSummaryData] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadSummary = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/summary/month?year_month=${yearMonth}`);
      const data = await res.json();
      setSummaryData(data);
    } catch (err) {
      console.error('Error loading month summary:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSummary();
  }, [yearMonth, refreshedSignal]);

  const handleMonthChange = (offset) => {
    const [year, month] = yearMonth.split('-').map(Number);
    const date = new Date(year, month - 1 + offset, 1);
    const newYm = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    setYearMonth(newYm);
  };

  const togglePaymentStatus = async (passengerId, currentStatus) => {
    if (!user) return;
    try {
      const res = await fetch(`/api/passengers/${passengerId}/payment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          year_month: yearMonth,
          paid: !currentStatus
        })
      });
      if (res.ok) {
        loadSummary();
      }
    } catch (err) {
      console.error('Error toggling payment status:', err);
    }
  };

  const formatMonthCzech = (ymStr) => {
    const [year, month] = ymStr.split('-').map(Number);
    const date = new Date(year, month - 1, 1);
    return date.toLocaleDateString('cs-CZ', { month: 'long', year: 'numeric' });
  };

  return (
    <div className="space-y-6">
      {/* Month Selector Bar */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Calendar className="w-6 h-6 text-amber-500" />
            Přehled pro {formatMonthCzech(yearMonth)}
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Souhrn všech jízd, nastavených cen a stavů zaplacení pro vybraný měsíc.
          </p>
        </div>

        {/* Navigation Buttons */}
        <div className="flex items-center space-x-2 bg-slate-50 p-1.5 rounded-xl border border-slate-200 self-start md:self-auto">
          <button
            onClick={() => handleMonthChange(-1)}
            className="p-2 hover:bg-white text-slate-700 rounded-lg transition shadow-sm"
            title="Předchozí měsíc"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <span className="font-bold text-slate-900 text-sm px-4 capitalize">
            {formatMonthCzech(yearMonth)}
          </span>
          <button
            onClick={() => handleMonthChange(1)}
            className="p-2 hover:bg-white text-slate-700 rounded-lg transition shadow-sm"
            title="Následující měsíc"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Summary Stat Cards */}
      {summaryData && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Celkem jízd</span>
              <div className="p-2 bg-amber-50 text-amber-600 rounded-xl">
                <Car className="w-5 h-5" />
              </div>
            </div>
            <p className="text-2xl font-black text-slate-900 mt-2">{summaryData.grand_total_rides}</p>
            <p className="text-xs text-slate-500 mt-1">všechny jízdy za tento měsíc</p>
          </div>

          <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Celková částka</span>
              <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
                <DollarSign className="w-5 h-5" />
              </div>
            </div>
            <p className="text-2xl font-black text-slate-900 mt-2">{summaryData.grand_total_amount} Kč</p>
            <p className="text-xs text-slate-500 mt-1">celkový dluh za tento měsíc</p>
          </div>

          <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Zaplaceno</span>
              <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
                <CheckCircle2 className="w-5 h-5" />
              </div>
            </div>
            <p className="text-2xl font-black text-emerald-600 mt-2">{summaryData.grand_total_paid_amount} Kč</p>
            <p className="text-xs text-slate-500 mt-1">vybrané peníze od cestujících</p>
          </div>

          <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Zbývá zaplatit</span>
              <div className="p-2 bg-rose-50 text-rose-600 rounded-xl">
                <XCircle className="w-5 h-5" />
              </div>
            </div>
            <p className="text-2xl font-black text-rose-600 mt-2">{summaryData.grand_total_unpaid_amount} Kč</p>
            <p className="text-xs text-slate-500 mt-1">zbývající nedoplatky</p>
          </div>
        </div>
      )}

      {/* Passengers Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Seznam cestujících a jejich souhrn
          </span>
          <span className="text-xs text-slate-500">
            Kliknutím na jméno zobrazíte detail cestujícího
          </span>
        </div>

        {loading ? (
          <div className="p-8 text-center text-slate-500">Načítám přehled...</div>
        ) : !summaryData || summaryData.passengers.length === 0 ? (
          <div className="p-8 text-center text-slate-500">Žádní cestující k zobrazení.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-100/70 text-slate-600 text-xs uppercase font-bold tracking-wider">
                <tr>
                  <th className="py-3 px-6">Cestující</th>
                  <th className="py-3 px-4 text-center">TAM</th>
                  <th className="py-3 px-4 text-center">ZPĚT</th>
                  <th className="py-3 px-4 text-center">Jízd celkem</th>
                  <th className="py-3 px-4 text-right">Cena / jízda</th>
                  <th className="py-3 px-4 text-right">Celkem Kč</th>
                  <th className="py-3 px-6 text-center">Stav zaplacení</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {summaryData.passengers.map(p => (
                  <tr key={p.passenger_id} className="hover:bg-amber-50/40 transition">
                    <td className="py-4 px-6">
                      <button
                        onClick={() => onSelectPassenger(p.passenger_id)}
                        className="font-bold text-slate-900 hover:text-amber-600 text-base text-left flex items-center space-x-2 group transition"
                      >
                        <div className="w-7 h-7 rounded-full bg-slate-100 group-hover:bg-amber-100 text-slate-700 group-hover:text-amber-800 flex items-center justify-center text-xs">
                          <Users className="w-3.5 h-3.5" />
                        </div>
                        <span>{p.name}</span>
                      </button>
                    </td>
                    <td className="py-4 px-4 text-center text-slate-600">{p.tam_count}×</td>
                    <td className="py-4 px-4 text-center text-slate-600">{p.zpet_count}×</td>
                    <td className="py-4 px-4 text-center font-bold text-slate-900">
                      <span className="bg-slate-100 px-2.5 py-1 rounded-lg">
                        {p.total_rides}×
                      </span>
                    </td>
                    <td className="py-4 px-4 text-right text-slate-600">{p.price} Kč</td>
                    <td className="py-4 px-4 text-right font-black text-slate-900 text-base">
                      {p.total_amount} Kč
                    </td>
                    <td className="py-4 px-6 text-center">
                      <button
                        disabled={!user}
                        onClick={() => togglePaymentStatus(p.passenger_id, p.paid)}
                        className={`inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl font-bold text-xs transition ${
                          p.paid
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                            : 'bg-rose-100 text-rose-800 border border-rose-300'
                        } ${user ? 'hover:scale-105 cursor-pointer' : 'cursor-default'}`}
                        title={user ? 'Kliknutím změníte stav zaplacení' : 'Stav zaplacení (pouze admin může měnit)'}
                      >
                        {p.paid ? (
                          <>
                            <CheckSquare className="w-4 h-4 text-emerald-600" />
                            <span>Zaplaceno</span>
                          </>
                        ) : (
                          <>
                            <Square className="w-4 h-4 text-rose-600" />
                            <span>Nezaplaceno</span>
                          </>
                        )}
                      </button>
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
