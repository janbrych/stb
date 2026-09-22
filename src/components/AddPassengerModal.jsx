import React, { useState } from 'react';
import { X, UserPlus, AlertCircle } from 'lucide-react';

export default function AddPassengerModal({ isOpen, onClose, onPassengerAdded }) {
  const [name, setName] = useState('');
  const [defaultPrice, setDefaultPrice] = useState(50);
  const [note, setNote] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch('/api/passengers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          default_price: parseFloat(defaultPrice),
          note
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Nepodařilo se přidat cestujícího');
      }

      onPassengerAdded(data);
      setName('');
      setDefaultPrice(50);
      setNote('');
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <UserPlus className="w-5 h-5 text-amber-400" />
            <h2 className="text-lg font-bold">Přidat nového cestujícího</h2>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white transition p-1 rounded-lg hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="flex items-center space-x-2 bg-red-50 text-red-700 p-3 rounded-lg text-sm border border-red-200">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Jméno a příjmení *
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3.5 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 text-sm"
              placeholder="např. Honza Novák"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Cena za 1 jízdu (Kč) *
            </label>
            <input
              type="number"
              min="0"
              step="1"
              required
              value={defaultPrice}
              onChange={(e) => setDefaultPrice(e.target.value)}
              className="w-full px-3.5 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 text-sm"
            />
            <p className="text-xs text-slate-500 mt-1">Tato cena bude výchozí pro tento i následující měsíce.</p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Poznámka (volitelné)
            </label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows="2"
              className="w-full px-3.5 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 text-sm"
              placeholder="např. ranní odvoz do školy"
            />
          </div>

          <div className="pt-2 flex justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition"
            >
              Zrušit
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-sm rounded-lg shadow transition disabled:opacity-50"
            >
              {loading ? 'Ukládám...' : 'Přidat cestujícího'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
