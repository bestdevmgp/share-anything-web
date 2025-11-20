import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

// Pages
import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import UploadPage from './pages/UploadPage';
import UploadSuccessPage from './pages/UploadSuccessPage';
import DownloadPage from './pages/DownloadPage';
import DownloadFilePage from './pages/DownloadFilePage';
import OAuthCallbackPage from './pages/OAuthCallbackPage';
import Header from './components/Header';

const AppContent: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <ToastContainer
        position="top-right"
        autoClose={3000}
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
      />
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/upload" element={<UploadPage />} />
        <Route path="/upload/success" element={<UploadSuccessPage />} />
        <Route path="/download" element={<DownloadPage />} />
        <Route path="/download/:code" element={<DownloadFilePage />} />
        <Route path="/auth/callback/:provider" element={<OAuthCallbackPage />} />
      </Routes>
    </div>
  );
};

const App: React.FC = () => {
  return (
    <AuthProvider>
      <Router>
        <AppContent />
      </Router>
    </AuthProvider>
  );
};

export default App;
