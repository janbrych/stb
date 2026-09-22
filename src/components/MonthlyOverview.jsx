import React, { useState, useEffect } from 'react';
import { Calendar, ChevronLeft, ChevronRight, CheckSquare, Square, Users, ArrowRight } from 'lucide-react';

export default function MonthlyOverview({ user, onSelectPassenger }) {
  const [yearMonth, setYearMonth] = useState(new Date().toISOString().slice(0, 7));
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadMonthData = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/summary/month?year_month=${yearMonth}`);
      const summary = await res.json();
      setData(summary);
    } catch (err) {
      console.error('Error loading month overview:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMonthData();
  }, [yearMonth]);

  const handleMonthChange = (offset) => {
    const [year, month] = yearMonth.split('-').map(Number);
    const date = new Date(year, month - 1 + offset, 1);
    const newYm = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    setYearMonth(newYm);
  };

  const formatMonthCzech = (ymStr) => {
    const [year, month] = ymStr.split('-').map(Number);
    const date = new Date(year, month - 1, 1);
    return date.toLocaleDateString('cs-CZ', { month: 'long', year: 'numeric' });
  };

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Calendar className="w-6 h-6 text-amber-500" />
            Měsíční přehled jízd a plateb
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Vyberte libovolný měsíc a prohlédněte si souhrny pro všechny cestující.
          </p>
        </div>

        {/* Month Selector */}
        <div className="flex items-center space-x-2 bg-slate-50 p-2 rounded-xl border border-slate-200">
          <button
            onClick={() => handleMonthChange(-1)}
            className="p-2 hover:bg-white text-slate-700 rounded-lg transition shadow-sm"
            title="Předchozí měsíc"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <input
            type="month"
            value={yearMonth}
            onChange={(e) => setYearMonth(e.target.value)}
            className="bg-transparent font-bold text-slate-900 text-sm focus:outline-none cursor-pointer px-2"
          />
          <button
            onClick={() => handleMonthChange(1)}
            className="p-2 hover:bg-white text-slate-700 rounded-lg transition shadow-sm"
            title="Následující měsíc"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Main Content Card */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span className="text-amber-400 font-bold uppercase text-xs tracking-wider">Měsíc:</span>
            <span className="font-extrabold capitalize text-lg">{formatMonthCzech(yearMonth)}</span>
          </div>

          {data && (
            <div className="text-right text-xs text-slate-300">
              Celkový součet: <span className="text-amber-400 font-bold text-sm ml-1">{data.grand_total_amount} Kč</span>
            </div>
          )}
        </div>

        {loading ? (
          <div className="p-8 text-center text-slate-500">Načítám měsíční přehled...</div>
        ) : !data || data.passengers.length === 0 ? (
          <div className="p-8 text-center text-slate-500">Pro tento měsíc nejsou v databázi žádní cestující.</div>
        ) : (
          <div>
            <div className="divide-y divide-slate-100">
              {data.passengers.map(p => (
                <div key={p.passenger_id} className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50 transition">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center font-bold">
                      <Users className="w-5 h-5" />
                    </div>
                    <div>
                      <button
                        onClick={() => onSelectPassenger(p.passenger_id)}
                        className="font-bold text-slate-900 text-base hover:text-amber-600 transition flex items-center space-x-1"
                      >
                        <span>{p.name}</span>
                        <ArrowRight className="w-4 h-4 opacity-0 group-hover:opacity-100 text-amber-500" />
                      </button>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {p.tam_count}× TAM &bull; {p.zpet_count}× ZPĚT &bull; cena: {p.price} Kč/jízda
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end space-x-6">
                    <div className="text-right">
                      <span className="text-xs text-slate-500 block">Jízd celkem</span>
                      <span className="font-extrabold text-slate-900 text-sm">{p.total_rides}×</span>
                    </div>

                    <div className="text-right">
                      <span className="text-xs text-slate-500 block">Celkem částka</span>
                      <span className="font-black text-slate-900 text-base">{p.total_amount} Kč</span>
                    </div>

                    <div className="text-right">
                      <span className="text-xs text-slate-500 block mb-0.5">Stav</span>
                      <span className={`inline-flex items-center space-x-1 px-2.5 py-1 rounded-lg font-bold text-xs ${
                        p.paid ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                      }`}>
                        {p.paid ? <CheckSquare className="w-3.5 h-3.5" /> : <Square className="w-3.5 h-3.5" />}
                        <span>{p.paid ? 'Zaplaceno' : 'Nezaplaceno'}</span>
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Grand Total Footer */}
            <div className="p-6 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <span className="text-sm font-bold text-slate-700">
                Celkový součet za všechny cestující pro {formatMonthCzech(yearMonth)}:
              </span>
              <div className="flex items-center space-x-6">
                <div>
                  <span className="text-xs text-slate-500 block">Jízd celkem</span>
                  <span className="font-extrabold text-slate-900 text-lg">{data.grand_total_rides}×</span>
                </div>
                <div>
                  <span className="text-xs text-slate-500 block">Celková částka</span>
                  <span className="font-black text-amber-600 text-2xl">{data.grand_total_amount} Kč</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
