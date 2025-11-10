/**
 * User Gallery Component
 *
 * Displays user's previous generations from Firestore.
 * Allows filtering by studio type, favoriting, and deletion.
 */

import React, { useState, useEffect } from 'react';
import { Generation, AppMode } from '../types';
import {
  getUserGenerations,
  getUserGenerationsByStudio,
  getUserFavorites,
  toggleFavorite,
  softDeleteGeneration,
  getUserGenerationStats,
} from '../services/generationService';

interface UserGalleryProps {
  userId: string;
  onClose: () => void;
  onImageClick?: (imageUrl: string) => void;
}

export const UserGallery: React.FC<UserGalleryProps> = ({
  userId,
  onClose,
  onImageClick,
}) => {
  const [generations, setGenerations] = useState<Generation[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'favorites' | AppMode>('all');
  const [stats, setStats] = useState<{
    total: number;
    byStudio: Record<string, number>;
    favorites: number;
    recentCount: number;
  } | null>(null);

  useEffect(() => {
    loadGenerations();
    loadStats();
  }, [userId, filter]);

  const loadGenerations = async () => {
    setLoading(true);
    try {
      let result: Generation[];

      if (filter === 'all') {
        result = await getUserGenerations(userId, 100);
      } else if (filter === 'favorites') {
        result = await getUserFavorites(userId, 100);
      } else {
        result = await getUserGenerationsByStudio(userId, filter as AppMode, 100);
      }

      setGenerations(result);
    } catch (error) {
      console.error('Error loading generations:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const statsData = await getUserGenerationStats(userId);
      setStats(statsData);
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  const handleToggleFavorite = async (generation: Generation) => {
    try {
      await toggleFavorite(generation.id, generation.isFavorite || false);
      // Update local state
      setGenerations((prev) =>
        prev.map((g) =>
          g.id === generation.id ? { ...g, isFavorite: !g.isFavorite } : g
        )
      );
    } catch (error) {
      console.error('Error toggling favorite:', error);
    }
  };

  const handleDelete = async (generation: Generation) => {
    if (!confirm('Are you sure you want to delete this generation?')) {
      return;
    }

    try {
      await softDeleteGeneration(generation.id);
      // Remove from local state
      setGenerations((prev) => prev.filter((g) => g.id !== generation.id));
      // Reload stats
      loadStats();
    } catch (error) {
      console.error('Error deleting generation:', error);
    }
  };

  const studioFilters: { value: 'all' | 'favorites' | AppMode; label: string }[] = [
    { value: 'all', label: 'All' },
    { value: 'favorites', label: 'Favorites' },
    { value: 'hairStudio', label: 'Hair' },
    { value: 'babyStudio', label: 'Baby' },
    { value: 'imageStudio', label: 'Image' },
    { value: 'videoStudio', label: 'Video' },
    { value: 'timelineStudio', label: 'Timeline' },
    { value: 'adCloner', label: 'Ad Cloner' },
    { value: 'videoAnalyzer', label: 'Video Analyzer' },
  ];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-6 border-b bg-gradient-to-r from-purple-600 to-pink-600 text-white">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-bold">My Generations</h2>
            <button
              onClick={onClose}
              className="text-white hover:bg-white hover:bg-opacity-20 rounded-full p-2 transition"
            >
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>

          {/* Stats */}
          {stats && (
            <div className="grid grid-cols-3 gap-4 text-center">
              <div className="bg-white bg-opacity-20 rounded-lg p-3">
                <div className="text-2xl font-bold">{stats.total}</div>
                <div className="text-sm opacity-90">Total</div>
              </div>
              <div className="bg-white bg-opacity-20 rounded-lg p-3">
                <div className="text-2xl font-bold">{stats.favorites}</div>
                <div className="text-sm opacity-90">Favorites</div>
              </div>
              <div className="bg-white bg-opacity-20 rounded-lg p-3">
                <div className="text-2xl font-bold">{stats.recentCount}</div>
                <div className="text-sm opacity-90">Last 7 days</div>
              </div>
            </div>
          )}
        </div>

        {/* Filter tabs */}
        <div className="p-4 border-b bg-gray-50 overflow-x-auto">
          <div className="flex gap-2">
            {studioFilters.map((f) => (
              <button
                key={f.value}
                onClick={() => setFilter(f.value)}
                className={`px-4 py-2 rounded-lg font-medium transition whitespace-nowrap ${
                  filter === f.value
                    ? 'bg-purple-600 text-white'
                    : 'bg-white text-gray-700 hover:bg-gray-100'
                }`}
              >
                {f.label}
                {stats && f.value !== 'all' && f.value !== 'favorites' && stats.byStudio[f.value] && (
                  <span className="ml-2 text-xs opacity-75">
                    ({stats.byStudio[f.value]})
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Gallery grid */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
            </div>
          ) : generations.length === 0 ? (
            <div className="text-center text-gray-500 py-12">
              <svg
                className="w-16 h-16 mx-auto mb-4 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
              <p className="text-lg">No generations found</p>
              <p className="text-sm mt-2">
                {filter === 'all'
                  ? 'Start creating to see your generations here'
                  : `No ${filter} generations yet`}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {generations.map((gen) => (
                <div
                  key={gen.id}
                  className="group relative bg-white rounded-lg shadow hover:shadow-xl transition overflow-hidden"
                >
                  {/* Image */}
                  <div
                    className="aspect-square bg-gray-100 cursor-pointer"
                    onClick={() => onImageClick?.(gen.imageUrl)}
                  >
                    <img
                      src={gen.imageUrl}
                      alt={gen.prompt || 'Generation'}
                      className="w-full h-full object-cover"
                    />
                  </div>

                  {/* Overlay actions */}
                  <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 transition-all flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100">
                    <button
                      onClick={() => handleToggleFavorite(gen)}
                      className="bg-white text-gray-800 rounded-full p-2 hover:bg-yellow-400 transition"
                      title={gen.isFavorite ? 'Remove favorite' : 'Add to favorites'}
                    >
                      <svg
                        className="w-5 h-5"
                        fill={gen.isFavorite ? 'currentColor' : 'none'}
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"
                        />
                      </svg>
                    </button>

                    <button
                      onClick={() => handleDelete(gen)}
                      className="bg-white text-red-600 rounded-full p-2 hover:bg-red-600 hover:text-white transition"
                      title="Delete"
                    >
                      <svg
                        className="w-5 h-5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                        />
                      </svg>
                    </button>
                  </div>

                  {/* Info footer */}
                  <div className="p-2 bg-white border-t">
                    <p className="text-xs text-gray-500 truncate" title={gen.prompt}>
                      {gen.prompt || 'No prompt'}
                    </p>
                    <div className="flex justify-between items-center mt-1">
                      <span className="text-xs text-gray-400">
                        {new Date(gen.createdAt).toLocaleDateString()}
                      </span>
                      <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded">
                        {gen.model}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
