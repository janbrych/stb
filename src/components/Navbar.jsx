import React from 'react';
import { Car, Lock, LogOut, UserCheck, Eye, PlusCircle, Calendar, LayoutDashboard, Clock } from 'lucide-react';

export default function Navbar({
  activeView,
  setActiveView,
  user,
  onOpenLogin,
  onLogout,
  onOpenAddPassenger,
  setSelectedPassengerId
}) {
  return (
    <header className="bg-slate-900 text-white shadow-md sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Title */}
          <div
            className="flex items-center space-x-3 cursor-pointer select-none"
            onClick={() => {
              setSelectedPassengerId(null);
              setActiveView('dashboard');
            }}
          >
            <div className="p-2 bg-amber-400 text-slate-900 rounded-xl shadow font-bold">
              <Car className="w-6 h-6" />
            </div>
            <div>
              <span className="text-xl font-bold tracking-tight text-white">Brych <span className="text-amber-400">Taxi</span></span>
              <span className="hidden sm:inline-block text-xs text-slate-400 ml-2">Evidence jízd cestujících</span>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="hidden md:flex items-center space-x-1">
            <button
              onClick={() => { setSelectedPassengerId(null); setActiveView('quick_entry'); }}
              className={`flex items-center space-x-1.5 px-3 py-2 rounded-lg text-sm font-medium transition ${
                activeView === 'quick_entry' ? 'bg-amber-400 text-slate-950 font-semibold' : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <Clock className="w-4 h-4" />
              <span>Rychlé zadání</span>
            </button>

            <button
              onClick={() => { setSelectedPassengerId(null); setActiveView('dashboard'); }}
              className={`flex items-center space-x-1.5 px-3 py-2 rounded-lg text-sm font-medium transition ${
                activeView === 'dashboard' ? 'bg-amber-400 text-slate-950 font-semibold' : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <LayoutDashboard className="w-4 h-4" />
              <span>Hlavní přehled</span>
            </button>

            <button
              onClick={() => { setSelectedPassengerId(null); setActiveView('monthly'); }}
              className={`flex items-center space-x-1.5 px-3 py-2 rounded-lg text-sm font-medium transition ${
                activeView === 'monthly' ? 'bg-amber-400 text-slate-950 font-semibold' : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <Calendar className="w-4 h-4" />
              <span>Přehled měsíců</span>
            </button>
          </nav>

          {/* Admin / View-Only Status & Actions */}
          <div className="flex items-center space-x-3">
            {user ? (
              <div className="flex items-center space-x-2">
                <div className="hidden sm:flex items-center space-x-1.5 px-2.5 py-1 bg-emerald-950 text-emerald-300 border border-emerald-800 text-xs font-medium rounded-full">
                  <UserCheck className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Admin</span>
                </div>
                {user && (
                  <button
                    onClick={onOpenAddPassenger}
                    className="flex items-center space-x-1.5 bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs sm:text-sm font-bold px-3 py-1.5 rounded-lg transition shadow"
                  >
                    <PlusCircle className="w-4 h-4" />
                    <span>Nový cestující</span>
                  </button>
                )}
                <button
                  onClick={onLogout}
                  className="flex items-center space-x-1 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg text-xs sm:text-sm transition"
                  title="Odhlásit se"
                >
                  <LogOut className="w-4 h-4" />
                  <span className="hidden sm:inline">Odhlásit</span>
                </button>
              </div>
            ) : (
              <div className="flex items-center space-x-2">
                <div className="flex items-center space-x-1.5 px-2.5 py-1 bg-slate-800 text-slate-300 text-xs font-medium rounded-full border border-slate-700">
                  <Eye className="w-3.5 h-3.5 text-amber-400" />
                  <span>Režim čtení</span>
                </div>
                <button
                  onClick={onOpenLogin}
                  className="flex items-center space-x-1.5 bg-slate-800 hover:bg-slate-700 text-amber-400 border border-amber-400/40 hover:border-amber-400 text-xs sm:text-sm font-medium px-3 py-1.5 rounded-lg transition"
                >
                  <Lock className="w-3.5 h-3.5" />
                  <span>Admin přihlášení</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Mobile Navigation sub-bar */}
        <div className="md:hidden flex items-center justify-around py-2 border-t border-slate-800">
          <button
            onClick={() => { setSelectedPassengerId(null); setActiveView('quick_entry'); }}
            className={`flex items-center space-x-1 px-3 py-1.5 rounded-lg text-xs font-medium ${
              activeView === 'quick_entry' ? 'bg-amber-400 text-slate-950 font-bold' : 'text-slate-300'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Rychlé zadání</span>
          </button>
          <button
            onClick={() => { setSelectedPassengerId(null); setActiveView('dashboard'); }}
            className={`flex items-center space-x-1 px-3 py-1.5 rounded-lg text-xs font-medium ${
              activeView === 'dashboard' ? 'bg-amber-400 text-slate-950 font-bold' : 'text-slate-300'
            }`}
          >
            <LayoutDashboard className="w-3.5 h-3.5" />
            <span>Přehled</span>
          </button>
          <button
            onClick={() => { setSelectedPassengerId(null); setActiveView('monthly'); }}
            className={`flex items-center space-x-1 px-3 py-1.5 rounded-lg text-xs font-medium ${
              activeView === 'monthly' ? 'bg-amber-400 text-slate-950 font-bold' : 'text-slate-300'
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>Měsíce</span>
          </button>
        </div>
      </div>
    </header>
  );
}
