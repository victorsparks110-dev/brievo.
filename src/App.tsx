import { useEffect, useState } from 'react'
import {
  createBrowserRouter,
  createRoutesFromElements,
  Navigate,
  Outlet,
  Route,
  RouterProvider,
} from 'react-router-dom'
import { AuthProvider } from '@/context/AuthContext'
import { ThemeProvider } from '@/context/ThemeContext'
import { NotificationProvider } from '@/context/NotificationContext'
import { ToastProvider } from '@/context/ToastContext'
import { Toaster } from '@/components/ui/toaster'
import { PageLoader } from '@/components/ui/page-loader'
import { ProtectedRoute } from '@/components/auth/ProtectedRoute'
import { RoleProtectedRoute } from '@/components/auth/RoleProtectedRoute'
import { bootApplication } from '@/boot'

import { LandingPage } from '@/pages/LandingPage'
import { LoginPage } from '@/pages/LoginPage'
import { SignupPage } from '@/pages/SignupPage'
import { ForgotPasswordPage } from '@/pages/ForgotPasswordPage'
import { ResetPasswordPage } from '@/pages/ResetPasswordPage'
import { NotFoundPage } from '@/pages/NotFoundPage'
import { PublicContactPage } from '@/pages/PublicContactPage'
import { AccountVerificationStatusPage } from '@/pages/support/AccountVerificationStatusPage'
import { PasswordResetStatusPage } from '@/pages/support/PasswordResetStatusPage'
import { NewPasswordForm } from '@/pages/support/NewPasswordForm'

import { BriefLandingPage } from '@/pages/brief/BriefLandingPage'
import { BriefFormPage } from '@/pages/brief/BriefFormPage'
import { BriefReviewPage } from '@/pages/brief/BriefReviewPage'
import { BriefSuccessPage } from '@/pages/brief/BriefSuccessPage'

import { DesignerLayout } from '@/components/layouts/DesignerLayout'
import { DesignerDashboardPage } from '@/pages/designer/DesignerDashboardPage'
import { DesignerFormsPage } from '@/pages/designer/DesignerFormsPage'
import { DesignerFormBuilderPage } from '@/pages/designer/DesignerFormBuilderPage'
import { DesignerFormResponsePage } from '@/pages/designer/DesignerFormResponsePage'
import { DesignerResponsesPage } from '@/pages/designer/DesignerResponsesPage'
import { DesignerSettingsPage } from '@/pages/designer/DesignerSettingsPage'
import { DesignerContactPage } from '@/pages/designer/DesignerContactPage'

import { SupportLayout } from '@/components/layouts/SupportLayout'
import { SupportDashboardPage } from '@/pages/support/SupportDashboardPage'
import { SupportTicketListPage } from '@/pages/support/SupportTicketListPage'
import { SupportTicketDetailPage } from '@/pages/support/SupportTicketDetailPage'
import { PendingDesignersPage } from '@/pages/support/PendingDesignersPage'
import { SupportPasswordResetListPage } from '@/pages/support/SupportPasswordResetListPage'
import { SupportPasswordResetDetailPage } from '@/pages/support/SupportPasswordResetDetailPage'
import { SupportSettingsPage } from '@/pages/support/SupportSettingsPage'
import { MySupportPage } from '@/pages/support/MySupportPage'
import { DesignerTicketDetailPage } from '@/pages/support/DesignerTicketDetailPage'

import { ClientFormPage } from '@/pages/ClientFormPage'

bootApplication()

const router = createBrowserRouter(
  createRoutesFromElements(
    <Route element={<AppShell />}>
      <Route element={<Outlet />}>
        {/* Public */}
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password/:token" element={<ResetPasswordPage />} />

        {/* Public Contact Us (no auth required) — same system as logged-in /designer/contact */}
        <Route path="/contact" element={<PublicContactPage />} />

        {/* Account verification status (public, no auth required) */}
        <Route path="/account-verification-status/:trackingToken"
          element={<AccountVerificationStatusPage />} />

        {/* Password reset status (public, no auth required) */}
        <Route path="/password-reset-status/:trackingToken"
          element={<PasswordResetStatusPage />} />

        {/* New password form (shown after password reset approval) */}
        <Route path="/new-password"
          element={<NewPasswordForm />} />

        {/* Public brief link (no auth required) */}
        <Route path="/brief">
          <Route index element={<Navigate to="/" replace />} />
          <Route path=":token" element={<BriefLandingPage />} />
          <Route path=":token/form" element={<BriefFormPage />} />
          <Route path=":token/review" element={<BriefReviewPage />} />
          <Route path=":token/success" element={<BriefSuccessPage />} />
        </Route>

        {/* Public client intake form link (no client account required) */}
        <Route path="/form/:token" element={<ClientFormPage />} />

        {/* Designer (role-protected) */}
        <Route element={<ProtectedRoute />}>
          <Route path="/designer" element={<DesignerLayout />}>
            <Route index element={<DesignerDashboardPage />} />
            <Route path="forms" element={<DesignerFormsPage />} />
            <Route path="forms/:id" element={<DesignerFormBuilderPage />} />
            <Route
              path="forms/:formId/responses/:responseId"
              element={<DesignerFormResponsePage />}
            />
            <Route path="responses" element={<DesignerResponsesPage />} />
            <Route path="settings" element={<DesignerSettingsPage />} />
            <Route path="contact" element={<DesignerContactPage />} />
            <Route path="support" element={<MySupportPage />} />
            <Route path="support/:id" element={<DesignerTicketDetailPage />} />
          </Route>
        </Route>

        {/* Support admin (support role required) */}
        <Route element={<RoleProtectedRoute allowedRoles={['support']} />}>
          <Route path="/support" element={<SupportLayout />}>
            <Route index element={<SupportDashboardPage />} />
            <Route path="tickets" element={<SupportTicketListPage />} />
            <Route path="tickets/:id" element={<SupportTicketDetailPage />} />
            <Route path="pending-designers" element={<PendingDesignersPage />} />
            <Route path="password-reset" element={<SupportPasswordResetListPage />} />
            <Route path="password-reset/:id" element={<SupportPasswordResetDetailPage />} />
            <Route path="settings" element={<SupportSettingsPage />} />
          </Route>
        </Route>

        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Route>
  )
)

/** Root shell that provides app-wide toast + notification context. */
function AppShell() {
  return (
    <ToastProvider>
      <NotificationProvider>
        <Outlet />
        <Toaster />
      </NotificationProvider>
    </ToastProvider>
  )
}

export default function App() {
  const [ready, setReady] = useState(false)


  useEffect(() => {
    // Give first render a beat so boot/seed finishes; then show the router.
    setReady(true)
  }, [])

  if (!ready) {
    return <PageLoader label="Starting BRIEVO..." />
  }

  return (
    <ThemeProvider>
      <AuthProvider>
        <RouterProvider router={router} />
      </AuthProvider>
    </ThemeProvider>
  )
}
