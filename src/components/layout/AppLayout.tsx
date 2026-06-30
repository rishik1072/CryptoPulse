import { Outlet } from 'react-router-dom'
import { Navbar } from './Navbar'
import { Sidebar } from './Sidebar'
import { Breadcrumb } from '@/components/ui/Breadcrumb'
import { PageTransition } from '@/components/ui/PageTransition'
import { CommandPalette } from '@/components/ui/CommandPalette'
import { GlobalLoading } from '@/components/ui/GlobalLoading'

export function AppLayout() {
  return (
    <div className="min-h-screen bg-[#050816] text-white">
      <GlobalLoading />
      <Navbar />

      <div className="flex">
        <Sidebar />

        <main className="min-w-0 flex-1">
          <div className="mx-auto max-w-7xl px-4 pb-10 pt-6 sm:px-6 lg:px-8 xl:px-10">
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