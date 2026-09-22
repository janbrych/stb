import React, { useState, useEffect } from 'react';
import { api } from '../api';

export default function MonthlyOverview({ onSelectPassenger }) {
  const [selectedMonth, setSelectedMonth] = useState(
    new Date().toISOString().slice(0, 7)
  );
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  // Generate a list of recent months for selector
  const generateMonthOptions = () => {
    const options = [];
    const now = new Date();
    for (let i = -12; i <= 6; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
      const ym = d.toISOString().slice(0, 7);
      const label = d.toLocaleDateString('cs-CZ', { month: 'long', year: 'numeric' });
      options.push({ ym, label });
    }
    return options.reverse();
  };

  const monthOptions = generateMonthOptions();

  const loadData = async () => {
    setLoading(true);
    try {
      const resData = await api.getMonthSummary(selectedMonth);
      setData(resData);
    } catch (err) {
      console.error('Error loading month overview:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [selectedMonth]);

  const formatMonthCzech = (ym) => {
    const [year, month] = ym.split('-').map(Number);
    const date = new Date(year, month - 1, 1);
    return date.toLocaleDateString('cs-CZ', { month: 'long', year: 'numeric' });
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Přehled měsíců</h1>
          <p className="text-sm text-slate-500 mt-1">
            Vyberte konkrétní měsíc pro zobrazení kompletního vyúčtování
          </p>
        </div>

        <div>
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="px-4 py-2.5 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 text-sm font-semibold capitalize bg-slate-50 text-slate-800"
          >
            {monthOptions.map((opt) => (
              <option key={opt.ym} value={opt.ym}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12 text-slate-400">Načítám měsíční přehled...</div>
      ) : !data || data.passengers.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center text-slate-500 border border-slate-200">
          Pro vybraný měsíc nejsou k dispozici žádná data.
        </div>
      ) : (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
            <div className="p-5 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
              <h2 className="text-lg font-bold text-slate-900 capitalize">
                {formatMonthCzech(selectedMonth)}
              </h2>
              <span className="text-xs font-semibold text-slate-500 bg-slate-200/70 px-3 py-1 rounded-full">
                Celkový součet: {data.grand_total_amount} Kč
              </span>
            </div>

            <div className="divide-y divide-slate-100">
              {data.passengers.map((p) => (
                <div
                  key={p.passenger_id}
                  onClick={() => onSelectPassenger(p.passenger_id)}
                  className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50/60 transition cursor-pointer"
                >
                  <div>
                    <h3 className="font-bold text-slate-900 text-lg hover:text-amber-600 transition">
                      {p.name}
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {p.tam_count}× TAM, {p.zpet_count}× ZPĚT (Celkem {p.total_rides} jízd)
                    </p>
                  </div>

                  <div className="flex items-center gap-6">
                    <div className="text-right">
                      <p className="text-xs text-slate-400">Cena / jízda</p>
                      <p className="text-sm font-semibold text-slate-700">{p.price} Kč</p>
                    </div>

                    <div className="text-right min-w-[80px]">
                      <p className="text-xs text-slate-400">Celková částka</p>
                      <p className="text-lg font-bold text-slate-900">{p.total_amount} Kč</p>
                    </div>

                    <div>
                      <span className={`px-3 py-1.5 rounded-lg text-xs font-bold ${
                        p.paid ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                      }`}>
                        {p.paid ? 'Zaplaceno' : 'Nezaplaceno'}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="bg-slate-900 text-white p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
              <span className="text-sm font-medium text-slate-300">Souhrn za měsíc</span>
              <div className="flex items-center gap-6 text-sm">
                <div>
                  <span className="text-slate-400 mr-2">Celkem jízd:</span>
                  <span className="font-bold">{data.grand_total_rides}</span>
                </div>
                <div>
                  <span className="text-slate-400 mr-2">Celková částka:</span>
                  <span className="font-bold text-amber-400 text-lg">{data.grand_total_amount} Kč</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
