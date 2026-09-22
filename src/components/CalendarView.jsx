import React from 'react';
import { api } from '../api';

export default function CalendarView({ yearMonth, calendarDays, passengerId, user, onRideUpdated }) {
  const [year, month] = yearMonth.split('-').map(Number);

  // Total days in month
  const daysInMonth = new Date(year, month, 0).getDate();
  // First day of month (0 = Sun, 1 = Mon, ..., 6 = Sat)
  const firstDayOfWeek = new Date(year, month - 1, 1).getDay();
  // Shift so Mon = 0, Sun = 6
  const startingOffset = firstDayOfWeek === 0 ? 6 : firstDayOfWeek - 1;

  const monthNameCzech = new Date(year, month - 1, 1).toLocaleDateString('cs-CZ', { month: 'long', year: 'numeric' });

  const weekDays = ['Po', 'Út', 'St', 'Čt', 'Pá', 'So', 'Ne'];

  const daysArray = [];
  for (let i = 0; i < startingOffset; i++) {
    daysArray.push(null);
  }
  for (let day = 1; day <= daysInMonth; day++) {
    const formattedDay = String(day).padStart(2, '0');
    const fullDate = `${yearMonth}-${formattedDay}`;
    daysArray.push({ day, fullDate });
  }

  const handleDayClick = async (dateStr, currentDayData) => {
    if (!user) return;

    // Cycle status: 0 (NIC) -> 1 (TAM) -> 2 (ZPET) -> 3 (OBOJE) -> 0
    let nextStatus = 'NIC';
    if (!currentDayData || currentDayData.count === 0) {
      nextStatus = 'TAM';
    } else if (currentDayData.tam && !currentDayData.zpet) {
      nextStatus = 'ZPET';
    } else if (!currentDayData.tam && currentDayData.zpet) {
      nextStatus = 'OBOJE';
    } else {
      nextStatus = 'NIC';
    }

    try {
      await api.saveSingleRide(passengerId, dateStr, nextStatus);
      onRideUpdated();
    } catch (err) {
      alert('Chyba při uložení jízdy.');
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold text-slate-600 capitalize">{monthNameCzech}</h4>
        <div className="flex items-center gap-4 text-xs font-medium text-slate-500">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-slate-100 border border-slate-200 inline-block"></span>
            <span>0 jízd</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-amber-200 inline-block"></span>
            <span>1 jízda</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-amber-500 inline-block"></span>
            <span>2 jízdy (OBOJE)</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-1.5 text-center">
        {weekDays.map((wd) => (
          <div key={wd} className="text-xs font-bold text-slate-400 py-1">
            {wd}
          </div>
        ))}

        {daysArray.map((item, idx) => {
          if (!item) {
            return <div key={`empty-${idx}`} className="h-14 bg-transparent"></div>;
          }

          const dayData = calendarDays[item.fullDate];
          const count = dayData ? dayData.count : 0;

          let bgClass = 'bg-slate-50 border-slate-200/60 text-slate-700 hover:bg-slate-100';
          let labelText = '';

          if (count === 1) {
            bgClass = 'bg-amber-100 border-amber-300 text-amber-950 font-bold';
            labelText = dayData.tam ? 'TAM' : 'ZPĚT';
          } else if (count === 2) {
            bgClass = 'bg-amber-500 border-amber-600 text-slate-950 font-black shadow-sm';
            labelText = 'TAM + ZPĚT';
          }

          return (
            <div
              key={item.fullDate}
              onClick={() => handleDayClick(item.fullDate, dayData)}
              className={`h-14 p-1.5 rounded-xl border flex flex-col justify-between transition relative group ${bgClass} ${
                user ? 'cursor-pointer' : 'cursor-default'
              }`}
            >
              <div className="text-xs font-bold text-right">{item.day}</div>
              {labelText && (
                <div className="text-[10px] leading-tight font-extrabold truncate text-center">
                  {labelText}
                </div>
              )}

              {/* Tooltip on hover */}
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 hidden group-hover:block bg-slate-900 text-white text-[11px] rounded py-1 px-2 whitespace-nowrap z-20 shadow-lg pointer-events-none">
                {item.day}. {month}. – {count === 0 ? 'Bez jízdy' : `${labelText} (${count} ${count === 1 ? 'jízda' : 'jízdy'})`}
              </div>
            </div>
          );
        })}
      </div>
      {user && (
        <p className="text-xs text-slate-400 text-center italic">
          * Kliknutím na den v kalendáři přepínáte stav jízdy (NIC → TAM → ZPĚT → TAM + ZPĚT → NIC).
        </p>
      )}
    </div>
  );
}
