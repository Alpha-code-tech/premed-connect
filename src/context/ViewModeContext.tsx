import { createContext, useContext, useState } from 'react'
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

  return (
    <ViewModeContext.Provider value={{
      viewMode,
      setViewMode,
      isStudentMode: viewMode === 'student',
    }}>
      {children}
    </ViewModeContext.Provider>
  )
}

export function useViewMode() {
  return useContext(ViewModeContext)
}

// Returns the effective department_id for student-mode pages.
// Department comes exclusively from the user's profile (set at account creation, never changes).
// The profileDeptId parameter comes from useAuth() — it is the DB-sourced, trusted value.
export function useEffectiveDepartmentId(profileDeptId: string | null | undefined): string | null {
  return profileDeptId ?? null
}
