import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import { ThemeProvider } from './context/ThemeContext';
import { LanguageProvider } from './context/LanguageContext';
import { SessionTokenProvider } from './context/SessionTokenContext';
import { QuickAccessUploadProvider } from './context/QuickAccessUploadContext';
import ToastContainer from './components/Toast';
import { TooltipProvider } from './components/ui/tooltip';
import './utils/pdfWorkerSetup';

import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import UploadPage from './pages/UploadPage';
import UploadSuccessPage from './pages/UploadSuccessPage';
import DownloadFilePage from './pages/DownloadFilePage';
import OAuthCallbackPage from './pages/OAuthCallbackPage';
import PrivacyPolicyPage from './pages/PrivacyPolicyPage';
import TermsOfUsePage from './pages/TermsOfUsePage';
import ApiTermsOfUsePage from './pages/ApiTermsOfUsePage';
import UploadHistoryPage from './pages/UploadHistoryPage';
import SettingsPage from './pages/SettingsPage';
import ApiKeyRevealPage from './pages/ApiKeyRevealPage';
import EmailVerifyWaitPage from './pages/EmailVerifyWaitPage';
import EmailMagicLinkCallbackPage from './pages/EmailMagicLinkCallbackPage';
import CliPage from './pages/CliPage';
import CliSigninPage from './pages/CliSigninPage';
import DeviceConfirmResultPage from './pages/DeviceConfirmResultPage';
import NotFoundPage from './pages/NotFoundPage';
import Header from './components/Header';
import Footer from './components/Footer';
import ScrollToTop from './components/ScrollToTop';

const AppContent: React.FC = () => {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />
      <ToastContainer />
      <div className="flex-1 min-h-[calc(100dvh-4rem)]">
        <ScrollToTop />
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/signin" element={<LoginPage />} />
          <Route path="/upload" element={<UploadPage />} />
          <Route path="/upload/success" element={<UploadSuccessPage />} />
          <Route path="/history" element={<UploadHistoryPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/api-keys/reveal/:token" element={<ApiKeyRevealPage />} />
          <Route path="/cli" element={<CliPage />} />
          <Route path="/cli-signin/:sessionId" element={<CliSigninPage />} />
          <Route path="/download/:code" element={<DownloadFilePage />} />
          <Route path="/auth/callback/:provider" element={<OAuthCallbackPage />} />
          <Route path="/auth/email/verify-wait" element={<EmailVerifyWaitPage />} />
          <Route path="/auth/email/magic-link" element={<EmailMagicLinkCallbackPage />} />
          <Route path="/auth/device/result" element={<DeviceConfirmResultPage />} />
          <Route path="/privacy-policy" element={<PrivacyPolicyPage />} />
          <Route path="/terms-of-use" element={<TermsOfUsePage />} />
          <Route path="/api-terms-of-use" element={<ApiTermsOfUsePage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </div>
      <Footer />
    </div>
  );
};

const App: React.FC = () => {
  return (
    <ThemeProvider>
      <LanguageProvider>
        <SessionTokenProvider>
          <AuthProvider>
            <ToastProvider>
              <QuickAccessUploadProvider>
                <TooltipProvider>
                  <Router>
                    <AppContent />
                  </Router>
                </TooltipProvider>
              </QuickAccessUploadProvider>
            </ToastProvider>
          </AuthProvider>
        </SessionTokenProvider>
      </LanguageProvider>
    </ThemeProvider>
  );
};

export default App;
