import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, Info } from 'lucide-react';

export default function CalendarView({
  yearMonth,
  onChangeMonth,
  calendarDays,
  user,
  passengerId,
  onRideToggled
}) {
  const [selectedDayInfo, setSelectedDayInfo] = useState(null);

  const [year, month] = yearMonth.split('-').map(Number);

  // Get total days in month and starting day of week
  const firstDayOfMonth = new Date(year, month - 1, 1);
  const daysInMonth = new Date(year, month, 0).getDate();

  // Czech calendar starts on Monday (1 = Mon, ..., 0 = Sun -> map Sun to 7)
  let startDayOfWeek = firstDayOfMonth.getDay();
  if (startDayOfWeek === 0) startDayOfWeek = 7;

  const daysArray = [];
  for (let i = 1; i <= daysInMonth; i++) {
    const dayStr = String(i).padStart(2, '0');
    const fullDate = `${yearMonth}-${dayStr}`;
    daysArray.push({
      dayNumber: i,
      fullDate,
      info: calendarDays[fullDate] || { tam: false, zpet: false, count: 0 }
    });
  }

  // Handle click on day
  const handleDayClick = async (dayItem) => {
    const { fullDate, info } = dayItem;

    // Set info popup
    let desc = 'Bez jízd (0 jízd)';
    if (info.count === 1) {
      desc = info.tam ? 'TAM (1 jízda)' : 'ZPĚT (1 jízda)';
    } else if (info.count === 2) {
      desc = 'TAM + ZPĚT (2 jízdy)';
    }

    const [y, m, d] = fullDate.split('-');
    const formattedCzech = `${parseInt(d, 10)}. ${parseInt(m, 10)}. ${y}`;

    setSelectedDayInfo({
      fullDate,
      formattedCzech,
      desc,
      count: info.count,
      tam: info.tam,
      zpet: info.zpet
    });
  };

  // Admin action: change ride status for a day directly in calendar
  const handleUpdateRideStatus = async (status) => {
    if (!user || !selectedDayInfo) return;

    try {
      const res = await fetch('/api/rides/single', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          passenger_id: passengerId,
          date: selectedDayInfo.fullDate,
          status
        })
      });

      if (res.ok) {
        if (onRideToggled) onRideToggled();
        // Update popup state
        let count = 0;
        let tam = false;
        let zpet = false;
        let desc = 'Bez jízd (0 jízd)';

        if (status === 'TAM') { count = 1; tam = true; desc = 'TAM (1 jízda)'; }
        if (status === 'ZPET') { count = 1; zpet = true; desc = 'ZPĚT (1 jízda)'; }
        if (status === 'OBOJE') { count = 2; tam = true; zpet = true; desc = 'TAM + ZPĚT (2 jízdy)'; }

        setSelectedDayInfo(prev => ({
          ...prev,
          desc,
          count,
          tam,
          zpet
        }));
      }
    } catch (err) {
      console.error('Error updating ride in calendar:', err);
    }
  };

  const dayNames = ['Po', 'Út', 'St', 'Čt', 'Pá', 'So', 'Ne'];

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 space-y-4">
      {/* Calendar Header */}
      <div className="flex items-center justify-between">
        <h3 className="font-bold text-slate-900 text-lg flex items-center space-x-2">
          <span>Měsíční kalendář</span>
        </h3>

        <div className="flex items-center space-x-1.5 bg-slate-100 p-1 rounded-xl">
          <button
            onClick={() => onChangeMonth(-1)}
            className="p-1.5 hover:bg-white text-slate-700 rounded-lg transition"
            title="Předchozí měsíc"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-xs font-bold text-slate-800 px-2 capitalize">
            {new Date(year, month - 1, 1).toLocaleDateString('cs-CZ', { month: 'long', year: 'numeric' })}
          </span>
          <button
            onClick={() => onChangeMonth(1)}
            className="p-1.5 hover:bg-white text-slate-700 rounded-lg transition"
            title="Následující měsíc"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-4 text-xs text-slate-600 bg-slate-50 p-2.5 rounded-xl">
        <div className="flex items-center space-x-1.5">
          <div className="w-3.5 h-3.5 bg-white border border-slate-300 rounded"></div>
          <span>0 jízd</span>
        </div>
        <div className="flex items-center space-x-1.5">
          <div className="w-3.5 h-3.5 bg-amber-100 border border-amber-300 rounded"></div>
          <span>1 jízda (TAM nebo ZPĚT)</span>
        </div>
        <div className="flex items-center space-x-1.5">
          <div className="w-3.5 h-3.5 bg-amber-400 border border-amber-500 rounded"></div>
          <span>2 jízdy (TAM + ZPĚT)</span>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-7 gap-1.5 text-center">
        {dayNames.map(d => (
          <div key={d} className="text-xs font-bold text-slate-400 py-1 uppercase">
            {d}
          </div>
        ))}

        {/* Empty cells before month starts */}
        {Array.from({ length: startDayOfWeek - 1 }).map((_, idx) => (
          <div key={`empty-${idx}`} className="h-12 bg-slate-50/40 rounded-xl" />
        ))}

        {/* Days */}
        {daysArray.map((d) => {
          const count = d.info.count;
          let cellStyle = "h-12 rounded-xl border flex flex-col items-center justify-between p-1 cursor-pointer transition relative hover:scale-105 ";

          if (count === 0) {
            cellStyle += "bg-white border-slate-200 text-slate-700 hover:border-amber-300";
          } else if (count === 1) {
            cellStyle += "bg-amber-100 border-amber-300 text-amber-950 font-bold shadow-sm";
          } else if (count === 2) {
            cellStyle += "bg-amber-400 border-amber-500 text-slate-950 font-extrabold shadow";
          }

          const isSelected = selectedDayInfo?.fullDate === d.fullDate;
          if (isSelected) {
            cellStyle += " ring-2 ring-slate-900 ring-offset-1";
          }

          return (
            <div
              key={d.fullDate}
              onClick={() => handleDayClick(d)}
              className={cellStyle}
            >
              <span className="text-xs">{d.dayNumber}</span>

              {count > 0 && (
                <div className="text-[10px] leading-tight font-black uppercase">
                  {count === 2 ? 'OBOJE' : d.info.tam ? 'TAM' : 'ZPĚT'}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Selected Day Details & Quick Edit */}
      {selectedDayInfo && (
        <div className="mt-4 p-4 bg-slate-900 text-white rounded-xl shadow space-y-3 animate-in fade-in duration-150">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Info className="w-4 h-4 text-amber-400" />
              <span className="font-bold text-sm">
                Detail dne {selectedDayInfo.formattedCzech}
              </span>
            </div>
            <span className="text-xs bg-amber-400 text-slate-950 font-bold px-2 py-0.5 rounded-full">
              {selectedDayInfo.desc}
            </span>
          </div>

          {/* Quick Edit Buttons for Admin */}
          {user ? (
            <div className="pt-2 border-t border-slate-800">
              <span className="text-xs text-slate-400 block mb-2">Změnit jízdu pro tento den:</span>
              <div className="grid grid-cols-4 gap-2">
                {[
                  { key: 'NIC', label: 'NIC' },
                  { key: 'TAM', label: 'TAM' },
                  { key: 'ZPET', label: 'ZPĚT' },
                  { key: 'OBOJE', label: 'OBOJE' }
                ].map(opt => (
                  <button
                    key={opt.key}
                    onClick={() => handleUpdateRideStatus(opt.key)}
                    className="px-2 py-1.5 bg-slate-800 hover:bg-amber-400 hover:text-slate-950 text-xs font-bold rounded-lg transition"
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <p className="text-xs text-slate-400 italic">
              Pro změnu jízd v kalendáři se přihlaste jako administrátor.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
