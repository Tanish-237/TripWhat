import { create } from 'zustand';

interface UIStore {
  sidebarOpen: boolean;
  sidebarCollapsed: boolean;
  mapVisible: boolean;
  activeTab: 'plan' | 'saved' | 'bookings';
  cityFilter: string | null;
  profileMenuOpen: boolean;

  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
  toggleSidebarCollapse: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  toggleMap: () => void;
  setMapVisible: (visible: boolean) => void;
  setActiveTab: (tab: 'plan' | 'saved' | 'bookings') => void;
  setCityFilter: (city: string | null) => void;
  toggleProfileMenu: () => void;
  setProfileMenuOpen: (open: boolean) => void;
}

export const useUIStore = create<UIStore>((set) => ({
  sidebarOpen: true,
  sidebarCollapsed: false,
  mapVisible: true,
  activeTab: 'plan',
  cityFilter: null,
  profileMenuOpen: false,

  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  toggleSidebarCollapse: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
  setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),
  toggleMap: () => set((s) => ({ mapVisible: !s.mapVisible })),
  setMapVisible: (visible) => set({ mapVisible: visible }),
  setActiveTab: (tab) => set({ activeTab: tab }),
  setCityFilter: (city) => set({ cityFilter: city }),
  toggleProfileMenu: () => set((s) => ({ profileMenuOpen: !s.profileMenuOpen })),
  setProfileMenuOpen: (open) => set({ profileMenuOpen: open }),
}));
