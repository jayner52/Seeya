'use client';

import { useState, useEffect, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Input, Button } from '@/components/ui';
import { X, Search, MapPin, Plus } from 'lucide-react';

interface AddToWanderlistModalProps {
  userId: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

interface CityResult {
  id: string;
  name: string;
  country: string;
  continent: string | null;
}

export function AddToWanderlistModal({
  userId,
  isOpen,
  onClose,
  onSuccess,
}: AddToWanderlistModalProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<CityResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const searchTimeoutRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }

    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    searchTimeoutRef.current = setTimeout(async () => {
      setIsSearching(true);
      const supabase = createClient();

      const { data, error } = await supabase
        .from('cities')
        .select('id, name, country, continent')
        .ilike('name', `${query}%`)
        .limit(10);

      if (!error && data) {
        setResults(data);
      }
      setIsSearching(false);
    }, 300);

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [query]);

  const handleAddCity = async (city: CityResult) => {
    setIsAdding(true);
    setError(null);

    try {
      const supabase = createClient();

      const { error: insertError } = await supabase
        .from('wanderlist_items')
        .insert({
          user_id: userId,
          city_id: city.id,
          place_name: city.name,
        });

      if (insertError) throw insertError;

      onSuccess();
    } catch (err) {
      console.error('Error adding to wanderlist:', err);
      setError('Failed to add destination. Please try again.');
    } finally {
      setIsAdding(false);
    }
  };

  const handleAddCustomPlace = async () => {
    if (!query.trim()) return;

    setIsAdding(true);
    setError(null);

    try {
      const supabase = createClient();

      const { error: insertError } = await supabase
        .from('wanderlist_items')
        .insert({
          user_id: userId,
          place_name: query.trim(),
        });

      if (insertError) throw insertError;

      onSuccess();
    } catch (err) {
      console.error('Error adding to wanderlist:', err);
      setError('Failed to add destination. Please try again.');
    } finally {
      setIsAdding(false);
    }
  };

  const handleClose = () => {
    setQuery('');
    setResults([]);
    setError(null);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={handleClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-md mx-4 bg-white rounded-2xl shadow-xl max-h-[80vh] overflow-auto animate-fadeIn">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-seeya-text">Add to Wanderlist</h2>
          <button
            onClick={handleClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X size={20} className="text-seeya-text-secondary" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-seeya-error text-sm mb-4">
              {error}
            </div>
          )}

          {/* Search */}
          <div className="relative">
            <Search
              size={18}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search for a destination..."
              autoFocus
              className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 focus:border-seeya-purple focus:ring-2 focus:ring-seeya-purple/20 outline-none transition-all"
            />
          </div>

          {/* Results */}
          {(results.length > 0 || (query && !isSearching)) && (
            <div className="mt-4 space-y-2">
              {results.map((city) => (
                <button
                  key={city.id}
                  onClick={() => handleAddCity(city)}
                  disabled={isAdding}
                  className="w-full flex items-center gap-3 p-3 rounded-xl border border-gray-200 hover:border-gray-300 bg-white transition-colors text-left"
                >
                  <MapPin size={18} className="text-seeya-purple flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-seeya-text">{city.name}</p>
                    <p className="text-sm text-seeya-text-secondary">
                      {city.country}
                      {city.continent && ` · ${city.continent}`}
                    </p>
                  </div>
                  <Plus size={18} className="text-seeya-purple flex-shrink-0" />
                </button>
              ))}

              {query && !isSearching && (
                <button
                  onClick={handleAddCustomPlace}
                  disabled={isAdding}
                  className="w-full flex items-center gap-3 p-3 rounded-xl border-2 border-dashed border-gray-200 hover:border-seeya-purple text-seeya-purple transition-colors"
                >
                  <Plus size={18} />
                  <span>Add &quot;{query}&quot; as custom place</span>
                </button>
              )}
            </div>
          )}

          {isSearching && (
            <div className="mt-4 text-center text-seeya-text-secondary py-4">
              Searching...
            </div>
          )}

          {!query && (
            <p className="mt-4 text-center text-seeya-text-secondary py-4">
              Search for cities or add custom destinations
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
