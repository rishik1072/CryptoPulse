import { Outlet } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Navbar } from './Navbar'
import { Sidebar } from './Sidebar'
import { Breadcrumb } from '@/components/ui/Breadcrumb'
import { PageTransition } from '@/components/ui/PageTransition'
import { CommandPalette } from '@/components/ui/CommandPalette'
import { GlobalLoading } from '@/components/ui/GlobalLoading'
import { useUIStore } from '@/store/useUIStore'

export function AppLayout() {
  const { sidebarOpen, closeSidebar } = useUIStore()

  return (
    <div className="min-h-screen bg-transparent text-slate-900">
      <GlobalLoading />
      <Navbar />

      <div className="flex">
        <Sidebar />

        <AnimatePresence>
          {sidebarOpen && (
            <motion.button
              key="sidebar-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={closeSidebar}
              className="fixed inset-0 z-30 bg-slate-950/30 backdrop-blur-sm lg:hidden"
              aria-label="Close sidebar"
            />
          )}
        </AnimatePresence>

        <main className="min-w-0 flex-1">
          <div className="mx-auto max-w-7xl px-4 pb-12 pt-6 sm:px-6 lg:px-8 xl:px-10">
            <div className="mb-6 sm:mb-8">
              <Breadcrumb />
            </div>

            <PageTransition>
              <Outlet />
            </PageTransition>
          </div>
        </main>
      </div>

      <CommandPalette />
    </div>
  )
}