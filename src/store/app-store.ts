import { create } from "zustand";

// ============================================
// APP STORE TYPES
// ============================================

interface AppState {
  // Sidebar state
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  toggleSidebar: () => void;

  // Mobile nav state
  mobileNavOpen: boolean;
  setMobileNavOpen: (open: boolean) => void;

  // AI processing state
  isAIProcessing: boolean;
  aiProgress: number;
  setAIProcessing: (processing: boolean) => void;
  setAIProgress: (progress: number) => void;

  // Selected items (for bulk operations)
  selectedTripIds: string[];
  setSelectedTripIds: (ids: string[]) => void;
  toggleTripSelection: (id: string) => void;
  clearSelection: () => void;

  // Dialog states
  dialogs: {
    addDriver: boolean;
    editDriver: string | null; // driver ID or null
    deleteDriver: string | null;
    addTrip: boolean;
    importCSV: boolean;
    assignDriver: string | null; // trip ID or null
  };
  openDialog: (dialog: keyof AppState["dialogs"], value?: string | boolean) => void;
  closeDialog: (dialog: keyof AppState["dialogs"]) => void;
  closeAllDialogs: () => void;
}

// ============================================
// APP STORE
// ============================================

export const useAppStore = create<AppState>((set) => ({
  // Sidebar
  sidebarOpen: true,
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),

  // Mobile nav
  mobileNavOpen: false,
  setMobileNavOpen: (open) => set({ mobileNavOpen: open }),

  // AI processing
  isAIProcessing: false,
  aiProgress: 0,
  setAIProcessing: (processing) =>
    set({ isAIProcessing: processing, aiProgress: processing ? 0 : 100 }),
  setAIProgress: (progress) => set({ aiProgress: progress }),

  // Selection
  selectedTripIds: [],
  setSelectedTripIds: (ids) => set({ selectedTripIds: ids }),
  toggleTripSelection: (id) =>
    set((state) => ({
      selectedTripIds: state.selectedTripIds.includes(id)
        ? state.selectedTripIds.filter((i) => i !== id)
        : [...state.selectedTripIds, id],
    })),
  clearSelection: () => set({ selectedTripIds: [] }),

  // Dialogs
  dialogs: {
    addDriver: false,
    editDriver: null,
    deleteDriver: null,
    addTrip: false,
    importCSV: false,
    assignDriver: null,
  },
  openDialog: (dialog, value = true) =>
    set((state) => ({
      dialogs: { ...state.dialogs, [dialog]: value },
    })),
  closeDialog: (dialog) =>
    set((state) => ({
      dialogs: {
        ...state.dialogs,
        [dialog]: typeof state.dialogs[dialog] === "boolean" ? false : null,
      },
    })),
  closeAllDialogs: () =>
    set({
      dialogs: {
        addDriver: false,
        editDriver: null,
        deleteDriver: null,
        addTrip: false,
        importCSV: false,
        assignDriver: null,
      },
    }),
}));
