import { useEffect } from 'react'
import { Outlet } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Navbar } from './Navbar'
import { Sidebar } from './Sidebar'
import { PageTransition } from '@/components/ui/PageTransition'
import { CommandPalette } from '@/components/ui/CommandPalette'
import { GlobalLoading } from '@/components/ui/GlobalLoading'
import { useUIStore } from '@/store/useUIStore'
import { useLivePriceStore } from '@/store/useLivePriceStore'

export function AppLayout() {
  const { sidebarOpen, closeSidebar } = useUIStore()
  const { subscribeToLivePrices } = useLivePriceStore()

  useEffect(() => {
    const unsubscribe = subscribeToLivePrices()
    return unsubscribe
  }, [subscribeToLivePrices])

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col transition-colors duration-200">
      <GlobalLoading />
      <Navbar />

      <div className="flex flex-1 min-h-0">
        <Sidebar />

        <AnimatePresence>
          {sidebarOpen && (
            <motion.button
              key="sidebar-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={closeSidebar}
              className="fixed inset-0 z-30 bg-black/60 backdrop-blur-sm lg:hidden"
              aria-label="Close sidebar"
            />
          )}
        </AnimatePresence>

        <main className="min-w-0 flex-1 px-4 sm:px-6 lg:px-8 py-5 overflow-hidden">
          <PageTransition>
            <Outlet />
          </PageTransition>
        </main>
      </div>

      <CommandPalette />
    </div>
  )
}