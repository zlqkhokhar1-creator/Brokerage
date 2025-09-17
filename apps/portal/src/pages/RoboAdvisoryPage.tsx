import { useState } from 'react';
import { motion } from 'framer-motion';
import PortfolioPieChart from '../components/charts/PortfolioPieChart';

const steps = [
  { id: 1, title: 'Risk Tolerance' },
  { id: 2, title: 'Financial Goals' },
  { id: 3, title: 'Portfolio Allocation' },
  { id: 4, title: 'Confirmation' },
];

const portfolioData = [
    { name: 'Stocks', value: 60 },
    { name: 'Bonds', value: 30 },
    { name: 'Real Estate', value: 5 },
    { name: 'Cash', value: 5 },
  ];

const RoboAdvisoryPage = () => {
  const [currentStep, setCurrentStep] = useState(1);

  const nextStep = () => setCurrentStep(prev => Math.min(prev + 1, steps.length));
  const prevStep = () => setCurrentStep(prev => Math.max(prev - 1, 1));

  return (
    <div className="p-4">
      <h1 className="text-3xl font-bold mb-4">Robo-Advisory Setup</h1>
      
      {/* Stepper */}
      <div className="mb-8">
        <div className="flex items-center">
          {steps.map((step, index) => (
            <>
              <div className={`flex items-center ${currentStep >= step.id ? 'text-blue-500' : 'text-gray-400'}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${currentStep >= step.id ? 'bg-blue-500 text-white' : 'bg-gray-300'}`}>
                  {step.id}
                </div>
                <div className="ml-2">{step.title}</div>
              </div>
              {index < steps.length - 1 && <div className="flex-auto border-t-2 transition duration-500 ease-in-out mx-4 border-gray-300"></div>}
            </>
          ))}
        </div>
      </div>

      {/* Step Content */}
      <div>
        {currentStep === 1 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <h2 className="text-2xl font-semibold mb-4">What is your risk tolerance?</h2>
            {/* Risk tolerance questions */}
          </motion.div>
        )}
        {currentStep === 2 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <h2 className="text-2xl font-semibold mb-4">What are your financial goals?</h2>
            {/* Financial goals questions */}
          </motion.div>
        )}
        {currentStep === 3 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <h2 className="text-2xl font-semibold mb-4">Your recommended portfolio allocation:</h2>
            <PortfolioPieChart data={portfolioData} />
          </motion.div>
        )}
        {currentStep === 4 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <h2 className="text-2xl font-semibold mb-4">Confirm your investment plan:</h2>
            {/* Confirmation details */}
          </motion.div>
        )}
      </div>

      {/* Navigation */}
      <div className="mt-8 flex justify-between">
        <button onClick={prevStep} disabled={currentStep === 1} className="px-4 py-2 bg-gray-300 rounded disabled:opacity-50">Back</button>
        <button onClick={nextStep} disabled={currentStep === steps.length} className="px-4 py-2 bg-blue-500 text-white rounded disabled:opacity-50">Next</button>
      </div>
    </div>
  );
};

export default RoboAdvisoryPage;
