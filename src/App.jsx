import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import LoginModal from './components/LoginModal';
import AddPassengerModal from './components/AddPassengerModal';
import QuickRideEntry from './components/QuickRideEntry';
import Dashboard from './components/Dashboard';
import MonthlyOverview from './components/MonthlyOverview';
import PassengerDetail from './components/PassengerDetail';
import { api } from './api';

export default function App() {
  const [user, setUser] = useState(null);
  const [activeView, setActiveView] = useState('quick_entry'); // 'quick_entry', 'dashboard', 'monthly'
  const [selectedPassengerId, setSelectedPassengerId] = useState(null);

  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [isAddPassengerOpen, setIsAddPassengerOpen] = useState(false);

  const [refreshedSignal, setRefreshedSignal] = useState(0);

  const checkAuth = async () => {
    try {
      const data = await api.checkAuth();
      if (data.authenticated) {
        setUser(data.user);
      } else {
        setUser(null);
      }
    } catch (err) {
      console.error('Auth check error:', err);
    }
  };

  useEffect(() => {
    checkAuth();
  }, []);

  const handleLogout = async () => {
    try {
      await api.logout();
      setUser(null);
    } catch (err) {
      console.error('Logout error:', err);
    }
  };

  const triggerRefresh = () => {
    setRefreshedSignal(prev => prev + 1);
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-800">
      <Navbar
        activeView={activeView}
        setActiveView={setActiveView}
        user={user}
        onOpenLogin={() => setIsLoginOpen(true)}
        onLogout={handleLogout}
        onOpenAddPassenger={() => setIsAddPassengerOpen(true)}
        setSelectedPassengerId={setSelectedPassengerId}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {selectedPassengerId ? (
          <PassengerDetail
            passengerId={selectedPassengerId}
            user={user}
            onBack={() => setSelectedPassengerId(null)}
            onPassengerDeleted={() => {
              setSelectedPassengerId(null);
              triggerRefresh();
            }}
            onDataChanged={triggerRefresh}
          />
        ) : activeView === 'quick_entry' ? (
          <QuickRideEntry
            user={user}
            onDataChanged={triggerRefresh}
            onSelectPassenger={(id) => setSelectedPassengerId(id)}
          />
        ) : activeView === 'dashboard' ? (
          <Dashboard
            user={user}
            onSelectPassenger={(id) => setSelectedPassengerId(id)}
            refreshedSignal={refreshedSignal}
          />
        ) : (
          <MonthlyOverview
            user={user}
            onSelectPassenger={(id) => setSelectedPassengerId(id)}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="bg-slate-900 text-slate-400 py-6 border-t border-slate-800 text-xs text-center">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <p>&copy; {new Date().getFullYear()} Brych Taxi. Všechna práva vyhrazena.</p>
          <p className="text-slate-500">
            {user ? 'Přihlášen jako Administrátor' : 'Veřejný režim pouze pro čtení'}
          </p>
        </div>
      </footer>

      {/* Modals */}
      <LoginModal
        isOpen={isLoginOpen}
        onClose={() => setIsLoginOpen(false)}
        onLoginSuccess={(userData) => {
          setUser(userData);
          triggerRefresh();
        }}
      />

      <AddPassengerModal
        isOpen={isAddPassengerOpen}
        onClose={() => setIsAddPassengerOpen(false)}
        onPassengerAdded={() => {
          triggerRefresh();
        }}
      />
    </div>
  );
}
