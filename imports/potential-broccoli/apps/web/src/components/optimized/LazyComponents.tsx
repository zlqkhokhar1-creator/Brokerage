// Lazy-loaded components for code splitting and performance
import { lazyWithRetry } from '../utils/performance';

// Admin and Management Components (Heavy)
export const AdminDashboard = lazyWithRetry(() => import('../AdminDashboard'));
export const ComplianceCenter = lazyWithRetry(() => import('../ComplianceCenter'));
export const RiskManagementDashboard = lazyWithRetry(() => import('../RiskManagementDashboard'));

// Trading Components (Heavy)
export const AdvancedOrderEntry = lazyWithRetry(() => import('../AdvancedOrderEntry'));
export const OptionsTrading = lazyWithRetry(() => import('../OptionsTrading'));
export const InternationalMarkets = lazyWithRetry(() => import('../InternationalMarkets'));
export const SocialTrading = lazyWithRetry(() => import('../SocialTrading'));

// AI and Analytics Components (Heavy)
export const AIAnalytics = lazyWithRetry(() => import('../AIAnalytics'));
export const NeuralNetworkPredictor = lazyWithRetry(() => import('../NeuralNetworkPredictor'));
export const QuantumPortfolioOptimizer = lazyWithRetry(() => import('../QuantumPortfolioOptimizer'));
export const BehavioralFinanceAdvisor = lazyWithRetry(() => import('../BehavioralFinanceAdvisor'));
export const AlternativeDataIntelligence = lazyWithRetry(() => import('../AlternativeDataIntelligence'));
export const PredictiveMarketRegimes = lazyWithRetry(() => import('../PredictiveMarketRegimes'));

// Chart and Visualization Components (Heavy)
export const AdvancedCharts = lazyWithRetry(() => import('../AdvancedCharts'));
export const StockChart = lazyWithRetry(() => import('../StockChart'));
export const RealTimeMarketData = lazyWithRetry(() => import('../RealTimeMarketData'));

// Tools and Utilities (Medium)
export const StockScreener = lazyWithRetry(() => import('../StockScreener'));
export const EconomicCalendar = lazyWithRetry(() => import('../EconomicCalendar'));
export const AlertManagementSystem = lazyWithRetry(() => import('../AlertManagementSystem'));

// Biometric and Security (Medium)
export const BiometricVerification = lazyWithRetry(() => import('../BiometricVerification'));
export const IDCardScanner = lazyWithRetry(() => import('../IDCardScanner'));

// Landing Page Components (Light)
export const PricingPage = lazyWithRetry(() => import('../PricingPage'));
export const BlogPage = lazyWithRetry(() => import('../BlogPage'));
export const RetirementCalculatorPage = lazyWithRetry(() => import('../RetirementCalculatorPage'));
export const MutualFundsPage = lazyWithRetry(() => import('../MutualFundsPage'));
export const StocksETFsPage = lazyWithRetry(() => import('../StocksETFsPage'));
export const RoboAdvisorPage = lazyWithRetry(() => import('../RoboAdvisorPage'));
export const PrivateWealthPage = lazyWithRetry(() => import('../PrivateWealthPage'));

// Loading fallback component
export const ComponentLoader = () => (
  <div className="flex items-center justify-center p-8">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
    <span className="ml-2 text-gray-600">Loading...</span>
  </div>
);
