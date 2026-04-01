import { createContext, useContext, useState, useEffect } from 'react'
import type { ReactNode } from 'react'

type ViewMode = 'management' | 'student'

interface ViewModeContextValue {
  viewMode: ViewMode
  setViewMode: (mode: ViewMode) => void
  isStudentMode: boolean
}

const ViewModeContext = createContext<ViewModeContextValue>({
  viewMode: 'management',
  setViewMode: () => {},
  isStudentMode: false,
})

export function ViewModeProvider({ children }: { children: ReactNode }) {
  const [viewMode, setViewModeState] = useState<ViewMode>(() => {
    return (localStorage.getItem('viewMode') as ViewMode) || 'management'
  })

  const setViewMode = (mode: ViewMode) => {
    setViewModeState(mode)
    localStorage.setItem('viewMode', mode)
  }

  // Reset to management mode when the page is unloaded (optional — remove if you want persistence across sessions)
  useEffect(() => {
    return () => {}
  }, [])

  return (
    <ViewModeContext.Provider value={{ viewMode, setViewMode, isStudentMode: viewMode === 'student' }}>
      {children}
    </ViewModeContext.Provider>
  )
}

export function useViewMode() {
  return useContext(ViewModeContext)
}
