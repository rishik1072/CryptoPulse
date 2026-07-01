import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface UIState {
  sidebarOpen: boolean
  activeModal: string | null
  theme: 'dark' | 'light'

  toggleSidebar: () => void
  openSidebar: () => void
  closeSidebar: () => void
  setTheme: (theme: 'dark' | 'light') => void
  openModal: (modal: string) => void
  closeModal: () => void
}

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      sidebarOpen: true,
      activeModal: null,
      theme: 'dark',

      toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
      openSidebar: () => set({ sidebarOpen: true }),
      closeSidebar: () => set({ sidebarOpen: false }),
      setTheme: (theme) => set({ theme }),
      openModal: (modal) => set({ activeModal: modal }),
      closeModal: () => set({ activeModal: null }),
    }),
    {
      name: 'cryptopulse-ui',
    }
  )
)