import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Header } from './components/layout/Header';
import { Footer } from './components/layout/Footer';
import { HomePage } from './pages/HomePage';
import { StocksETFsPage } from './pages/trade/StocksETFsPage';
import { MutualFundsPage } from './pages/trade/MutualFundsPage';
import { RoboAdvisorPage } from './pages/invest/RoboAdvisorPage';
import { PrivateWealthPage } from './pages/invest/PrivateWealthPage';
import { PricingPage } from './pages/PricingPage';
import { BlogPage } from './pages/discover/BlogPage';
import { RetirementCalculatorPage } from './pages/discover/RetirementCalculatorPage';
import { ErrorBoundary } from './components/ErrorBoundary';
import './App.css';

function App() {
  return (
    <ErrorBoundary>
      <Router>
        <div className="min-h-screen bg-background flex flex-col">
          <Header />
          <main className="flex-grow">
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/trade/stocks-etfs" element={<StocksETFsPage />} />
              <Route path="/trade/mutual-funds" element={<MutualFundsPage />} />
              <Route path="/invest/robo-advisor" element={<RoboAdvisorPage />} />
              <Route path="/invest/private-wealth" element={<PrivateWealthPage />} />
              <Route path="/pricing" element={<PricingPage />} />
              <Route path="/discover/blog" element={<BlogPage />} />
              <Route path="/discover/retirement-calculator" element={<RetirementCalculatorPage />} />
            </Routes>
          </main>
          <Footer />
        </div>
      </Router>
    </ErrorBoundary>
  );
}

export default App;