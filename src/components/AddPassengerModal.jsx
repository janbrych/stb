import React, { useState } from 'react';
import { api } from '../api';

export default function AddPassengerModal({ isOpen, onClose, onPassengerAdded }) {
  const [name, setName] = useState('');
  const [defaultPrice, setDefaultPrice] = useState('50');
  const [note, setNote] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Zadejte jméno cestujícího.');
      return;
    }

    setError('');
    setLoading(true);

    try {
      await api.addPassenger({
        name: name.trim(),
        default_price: parseFloat(defaultPrice) || 50,
        note: note.trim() || null
      });

      setName('');
      setDefaultPrice('50');
      setNote('');
      onPassengerAdded();
      onClose();
    } catch (err) {
      setError(err.message || 'Chyba při přidávání cestujícího.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 border border-slate-100">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-slate-800">Přidat nového cestujícího</h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 rounded-lg p-1 transition"
          >
            ✕
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 text-red-700 text-sm rounded-lg border border-red-200">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">
              Jméno a příjmení *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Např. Jan Novák"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent text-sm"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">
              Výchozí cena za 1 jízdu (Kč)
            </label>
            <input
              type="number"
              min="0"
              step="1"
              value={defaultPrice}
              onChange={(e) => setDefaultPrice(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent text-sm"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">
              Poznámka (nepovinné)
            </label>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Např. Trasa ze školy"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent text-sm"
            />
          </div>

          <div className="flex justify-end gap-3 mt-6">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm text-slate-600 hover:text-slate-800 font-medium"
            >
              Zrušit
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-slate-900 font-semibold rounded-lg shadow-sm transition disabled:opacity-50 text-sm"
            >
              {loading ? 'Ukládám...' : 'Přidat cestujícího'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
