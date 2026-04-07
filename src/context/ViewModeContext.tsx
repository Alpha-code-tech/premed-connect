import { createContext, useContext, useState } from 'react'
import type { ReactNode } from 'react'
import { isValidUUID } from '@/lib/validation'

type ViewMode = 'management' | 'student'

interface ViewModeContextValue {
  viewMode: ViewMode
  setViewMode: (mode: ViewMode) => void
  isStudentMode: boolean
  // Department used when a special role is browsing in student mode
  studentDepartmentId: string | null
  setStudentDepartmentId: (id: string | null) => void
}

const ViewModeContext = createContext<ViewModeContextValue>({
  viewMode: 'management',
  setViewMode: () => {},
  isStudentMode: false,
  studentDepartmentId: null,
  setStudentDepartmentId: () => {},
})

export function ViewModeProvider({ children }: { children: ReactNode }) {
  const [viewMode, setViewModeState] = useState<ViewMode>(() => {
    return (localStorage.getItem('viewMode') as ViewMode) || 'management'
  })

  const [studentDepartmentId, setStudentDepartmentIdState] = useState<string | null>(() => {
    const stored = localStorage.getItem('studentDepartmentId')
    // Validate before trusting — localStorage is user-writable
    return stored && isValidUUID(stored) ? stored : null
  })

  const setViewMode = (mode: ViewMode) => {
    setViewModeState(mode)
    localStorage.setItem('viewMode', mode)
  }

  const setStudentDepartmentId = (id: string | null) => {
    setStudentDepartmentIdState(id)
    if (id) localStorage.setItem('studentDepartmentId', id)
    else localStorage.removeItem('studentDepartmentId')
  }

  return (
    <ViewModeContext.Provider value={{
      viewMode,
      setViewMode,
      isStudentMode: viewMode === 'student',
      studentDepartmentId,
      setStudentDepartmentId,
    }}>
      {children}
    </ViewModeContext.Provider>
  )
}

export function useViewMode() {
  return useContext(ViewModeContext)
}

// Hook that returns the effective department_id for student-mode pages.
// Uses profile's department_id first; falls back to studentDepartmentId for special roles.
export function useEffectiveDepartmentId(profileDeptId: string | null | undefined): string | null {
  const { studentDepartmentId } = useViewMode()
  // profileDeptId comes from the auth context (DB value) — trusted
  if (profileDeptId) return profileDeptId
  // studentDepartmentId comes from localStorage — re-validate before use in query strings
  return studentDepartmentId && isValidUUID(studentDepartmentId) ? studentDepartmentId : null
}
