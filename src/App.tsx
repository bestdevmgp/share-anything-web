import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import { ThemeProvider } from './context/ThemeContext';
import { LanguageProvider } from './context/LanguageContext';
import ToastContainer from './components/Toast';
import './utils/pdfWorkerSetup';

import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import UploadPage from './pages/UploadPage';
import UploadSuccessPage from './pages/UploadSuccessPage';
import DownloadFilePage from './pages/DownloadFilePage';
import OAuthCallbackPage from './pages/OAuthCallbackPage';
import PrivacyPolicyPage from './pages/PrivacyPolicyPage';
import TermsOfUsePage from './pages/TermsOfUsePage';
import UploadHistoryPage from './pages/UploadHistoryPage';
import Header from './components/Header';
import Footer from './components/Footer';
import ScrollToTop from './components/ScrollToTop';

const AppContent: React.FC = () => {
  return (
    <div className="min-h-screen bg-[#F9FAFB] dark:bg-[#010001] flex flex-col">
      <Header />
      <ToastContainer />
      <div className="flex-1">
        <ScrollToTop />
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/upload" element={<UploadPage />} />
          <Route path="/upload/success" element={<UploadSuccessPage />} />
          <Route path="/history" element={<UploadHistoryPage />} />
          <Route path="/download/:code" element={<DownloadFilePage />} />
          <Route path="/auth/callback/:provider" element={<OAuthCallbackPage />} />
          <Route path="/privacy-policy" element={<PrivacyPolicyPage />} />
          <Route path="/terms-of-use" element={<TermsOfUsePage />} />
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
        <AuthProvider>
          <ToastProvider>
            <Router>
              <AppContent />
            </Router>
          </ToastProvider>
        </AuthProvider>
      </LanguageProvider>
    </ThemeProvider>
  );
};

export default App;
