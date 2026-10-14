import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { FeedbackProvider } from './context/FeedbackContext';
import { WelcomePage } from './pages/WelcomePage';
import { LanguagePage } from './pages/LanguagePage';
import { VoiceFeedbackPage } from './pages/VoiceFeedbackPage';
import { ProcessingPage } from './pages/ProcessingPage';
import { ReportPage } from './pages/ReportPage';

export function App() {
  return (
    <FeedbackProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<WelcomePage />} />
          <Route path="/language" element={<LanguagePage />} />
          <Route path="/feedback" element={<VoiceFeedbackPage />} />
          <Route path="/processing" element={<ProcessingPage />} />
          <Route path="/report" element={<ReportPage />} />
          {/* Fallback route */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </FeedbackProvider>
  );
}

export default App;
