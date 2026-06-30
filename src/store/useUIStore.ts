import { create } from 'zustand'

interface UIState {
  sidebarOpen: boolean
  activeModal: string | null
  theme: 'dark'
  
  toggleSidebar: () => void
  openModal: (modal: string) => void
  closeModal: () => void
}

export const useUIStore = create<UIState>((set) => ({
  sidebarOpen: true,
  activeModal: null,
  theme: 'dark',
  
  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
  openModal: (modal) => set({ activeModal: modal }),
  closeModal: () => set({ activeModal: null }),
}))