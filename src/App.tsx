import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { useViewMode } from '@/context/ViewModeContext'
import { ROLE_ROUTES } from '@/lib/constants'

// Landing page
import Landing from '@/pages/Landing'

// Auth pages
import Login from '@/pages/auth/Login'
import RequestAccess from '@/pages/auth/RequestAccess'
import ChangePassword from '@/pages/auth/ChangePassword'

// Layouts
import StudentLayout from '@/layouts/StudentLayout'
import CourseRepLayout from '@/layouts/CourseRepLayout'
import GovernorLayout from '@/layouts/GovernorLayout'
import DeveloperLayout from '@/layouts/DeveloperLayout'
import FinancialLayout from '@/layouts/FinancialLayout'

// Student pages
import StudentDashboard from '@/pages/student/Dashboard'
import StudentResources from '@/pages/student/Resources'
import StudentPayments from '@/pages/student/Payments'
import StudentTimetable from '@/pages/student/Timetable'
import StudentExams from '@/pages/student/Exams'
import StudentInbox from '@/pages/student/Inbox'
import StudentResults from '@/pages/student/Results'
import StudentProfile from '@/pages/student/Profile'
import StudentIssues from '@/pages/student/Issues'
import StudentLeaderboard from '@/pages/student/Leaderboard'

// Course Rep pages
import CourseRepDashboard from '@/pages/courserep/Dashboard'
import CourseRepStudents from '@/pages/courserep/Students'
import CourseRepResources from '@/pages/courserep/Resources'
import CourseRepPayments from '@/pages/courserep/Payments'
import CourseRepAnnouncements from '@/pages/courserep/Announcements'
import CourseRepMockTests from '@/pages/courserep/MockTests'
import CourseRepIssues from '@/pages/courserep/Issues'
import CourseRepNotifications from '@/pages/courserep/Notifications'

// Governor pages
import GovernorDashboard from '@/pages/governor/Dashboard'
import GovernorDepartments from '@/pages/governor/Departments'
import GovernorPayments from '@/pages/governor/Payments'
import GovernorAnnouncements from '@/pages/governor/Announcements'
import GovernorAnalytics from '@/pages/governor/Analytics'
import GovernorNotifications from '@/pages/governor/Notifications'

// Developer pages
import DeveloperDashboard from '@/pages/developer/Dashboard'
import DeveloperAccessRequests from '@/pages/developer/AccessRequests'
import DeveloperUserManagement from '@/pages/developer/UserManagement'
import DeveloperOverview from '@/pages/developer/Overview'

// Financial pages
import FinancialDashboard from '@/pages/financial/Dashboard'
import FinancialPayments from '@/pages/financial/Payments'

import { Skeleton } from '@/components/ui/skeleton'

function LoadingScreen() {
  return (
    <div className="min-h-screen bg-brand-background flex items-center justify-center">
      <div className="space-y-4 w-64">
        <Skeleton className="h-8 w-48 mx-auto" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4 mx-auto" />
      </div>
    </div>
  )
}

interface ProtectedRouteProps {
  children: React.ReactNode
}

function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { user, profile, loading } = useAuth()

  if (loading) return <LoadingScreen />
  if (!user) return <Navigate to="/login" replace />
  if (profile && !profile.password_changed) return <Navigate to="/change-password" replace />

  return <>{children}</>
}

interface RoleRouteProps {
  children: React.ReactNode
  allowedRoles: string[]
  allowStudentMode?: boolean
}

function RoleRoute({ children, allowedRoles, allowStudentMode }: RoleRouteProps) {
  const { profile } = useAuth()
  const { isStudentMode } = useViewMode()

  if (!profile) return <Navigate to="/login" replace />
  // Allow non-students through to student routes when they've activated student mode
  if (allowStudentMode && isStudentMode && profile.role !== 'student') return <>{children}</>
  if (!allowedRoles.includes(profile.role)) {
    return <Navigate to={ROLE_ROUTES[profile.role] || '/login'} replace />
  }

  return <>{children}</>
}

function PublicRoute({ children }: ProtectedRouteProps) {
  const { user, profile, loading } = useAuth()

  if (loading) return <LoadingScreen />
  if (user && profile) {
    if (!profile.password_changed) return <Navigate to="/change-password" replace />
    return <Navigate to={ROLE_ROUTES[profile.role] || '/login'} replace />
  }

  return <>{children}</>
}

export default function App() {
  const { profile } = useAuth()

  return (
    <Routes>
      {/* Landing page */}
      <Route path="/" element={<Landing />} />

      {/* Public routes */}
      <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
      <Route path="/request-access" element={<PublicRoute><RequestAccess /></PublicRoute>} />

      {/* Change password - special case: authenticated but password not changed */}
      <Route path="/change-password" element={<ChangePassword />} />

      {/* Student routes — also accessible to other roles in student mode */}
      <Route path="/dashboard" element={
        <ProtectedRoute>
          <RoleRoute allowedRoles={['student']} allowStudentMode>
            <StudentLayout />
          </RoleRoute>
        </ProtectedRoute>
      }>
        <Route index element={<StudentDashboard />} />
        <Route path="resources" element={<StudentResources />} />
        <Route path="payments" element={<StudentPayments />} />
        <Route path="timetable" element={<StudentTimetable />} />
        <Route path="exams" element={<StudentExams />} />
        <Route path="leaderboard" element={<StudentLeaderboard />} />
        <Route path="inbox" element={<StudentInbox />} />
        <Route path="results" element={<StudentResults />} />
        <Route path="issues" element={<StudentIssues />} />
        <Route path="profile" element={<StudentProfile />} />
      </Route>

      {/* Course Rep routes */}
      <Route path="/course-rep" element={
        <ProtectedRoute>
          <RoleRoute allowedRoles={['course_rep']}>
            <CourseRepLayout />
          </RoleRoute>
        </ProtectedRoute>
      }>
        <Route index element={<CourseRepDashboard />} />
        <Route path="students" element={<CourseRepStudents />} />
        <Route path="resources" element={<CourseRepResources />} />
        <Route path="payments" element={<CourseRepPayments />} />
        <Route path="announcements" element={<CourseRepAnnouncements />} />
        <Route path="mock-tests" element={<CourseRepMockTests />} />
        <Route path="issues" element={<CourseRepIssues />} />
        <Route path="notifications" element={<CourseRepNotifications />} />
      </Route>

      {/* Assistant Rep routes - same as course rep but limited */}
      <Route path="/assistant-rep" element={
        <ProtectedRoute>
          <RoleRoute allowedRoles={['assistant_course_rep']}>
            <CourseRepLayout />
          </RoleRoute>
        </ProtectedRoute>
      }>
        <Route index element={<CourseRepDashboard />} />
        <Route path="students" element={<CourseRepStudents />} />
        <Route path="resources" element={<CourseRepResources />} />
        <Route path="payments" element={<CourseRepPayments />} />
        <Route path="announcements" element={<CourseRepAnnouncements />} />
        <Route path="mock-tests" element={<CourseRepMockTests />} />
        <Route path="issues" element={<CourseRepIssues />} />
        <Route path="notifications" element={<CourseRepNotifications />} />
      </Route>

      {/* Governor routes */}
      <Route path="/governor" element={
        <ProtectedRoute>
          <RoleRoute allowedRoles={['governor']}>
            <GovernorLayout />
          </RoleRoute>
        </ProtectedRoute>
      }>
        <Route index element={<GovernorDashboard />} />
        <Route path="departments" element={<GovernorDepartments />} />
        <Route path="payments" element={<GovernorPayments />} />
        <Route path="announcements" element={<GovernorAnnouncements />} />
        <Route path="analytics" element={<GovernorAnalytics />} />
        <Route path="notifications" element={<GovernorNotifications />} />
      </Route>

      {/* Developer routes */}
      <Route path="/developer" element={
        <ProtectedRoute>
          <RoleRoute allowedRoles={['developer']}>
            <DeveloperLayout />
          </RoleRoute>
        </ProtectedRoute>
      }>
        <Route index element={<DeveloperDashboard />} />
        <Route path="access-requests" element={<DeveloperAccessRequests />} />
        <Route path="user-management" element={<DeveloperUserManagement />} />
        <Route path="overview" element={<DeveloperOverview />} />
      </Route>

      {/* Financial routes */}
      <Route path="/financial" element={
        <ProtectedRoute>
          <RoleRoute allowedRoles={['financial_secretary']}>
            <FinancialLayout />
          </RoleRoute>
        </ProtectedRoute>
      }>
        <Route index element={<FinancialDashboard />} />
        <Route path="payments" element={<FinancialPayments />} />
      </Route>

      {/* Default redirect */}
      <Route path="/" element={
        profile
          ? <Navigate to={ROLE_ROUTES[profile.role] || '/login'} replace />
          : <Navigate to="/login" replace />
      } />
      <Route path="*" element={
        profile
          ? <Navigate to={ROLE_ROUTES[profile.role] || '/login'} replace />
          : <Navigate to="/login" replace />
      } />
    </Routes>
  )
}
