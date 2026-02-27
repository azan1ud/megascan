import { create } from 'zustand';

export type TimeRange = '5m' | '1h' | '6h' | '24h';
export type SortField = 'volume24h' | 'liquidityUsd' | 'priceChange1h' | 'priceChange24h' | 'txns24h' | 'createdAt';
export type SortDirection = 'asc' | 'desc';

interface Filters {
  timeRange: TimeRange;
  dex: string;
  minLiquidity: number;
  maxLiquidity: number;
  minVolume: number;
  maxVolume: number;
  minAge: number;
  maxAge: number;
  showGainers: boolean;
  showLosers: boolean;
}

interface AppState {
  // Filters
  filters: Filters;
  setFilters: (filters: Partial<Filters>) => void;
  resetFilters: () => void;

  // Sorting
  sortField: SortField;
  sortDirection: SortDirection;
  setSort: (field: SortField) => void;

  // Favorites
  favorites: Set<string>;
  toggleFavorite: (address: string) => void;

  // UI State
  sidebarOpen: boolean;
  toggleSidebar: () => void;
}

const defaultFilters: Filters = {
  timeRange: '24h',
  dex: 'all',
  minLiquidity: 0,
  maxLiquidity: Infinity,
  minVolume: 0,
  maxVolume: Infinity,
  minAge: 0,
  maxAge: Infinity,
  showGainers: true,
  showLosers: true,
};

export const useStore = create<AppState>((set) => ({
  // Filters
  filters: defaultFilters,
  setFilters: (newFilters) =>
    set((state) => ({
      filters: { ...state.filters, ...newFilters },
    })),
  resetFilters: () => set({ filters: defaultFilters }),

  // Sorting
  sortField: 'volume24h',
  sortDirection: 'desc',
  setSort: (field) =>
    set((state) => ({
      sortField: field,
      sortDirection:
        state.sortField === field
          ? state.sortDirection === 'desc'
            ? 'asc'
            : 'desc'
          : 'desc',
    })),

  // Favorites
  favorites: new Set<string>(),
  toggleFavorite: (address) =>
    set((state) => {
      const newFavorites = new Set(state.favorites);
      if (newFavorites.has(address)) {
        newFavorites.delete(address);
      } else {
        newFavorites.add(address);
      }
      return { favorites: newFavorites };
    }),

  // UI State
  sidebarOpen: false,
  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
}));
