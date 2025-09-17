import { motion } from 'framer-motion';
import { BarChart, Bot, ShieldCheck } from 'lucide-react';
import { NavLink } from 'react-router-dom';

const HomePage = () => {
  return (
    <div className="dark:text-white">
      {/* Hero Section */}
      <section className="text-center py-20 px-4">
        <motion.h1 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-5xl font-bold mb-4"
        >
          The Future of Investing is Here
        </motion.h1>
        <motion.p 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="text-lg text-gray-600 dark:text-gray-400 mb-8 max-w-2xl mx-auto"
        >
          InvestPro combines cutting-edge AI with a user-friendly platform to help you make smarter investment decisions.
        </motion.p>
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
        >
          <NavLink to="/signup" className="px-8 py-3 text-white bg-blue-500 rounded-md hover:bg-blue-600 text-lg">
            Get Started
          </NavLink>
        </motion.div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-4 bg-white dark:bg-gray-800">
        <h2 className="text-3xl font-bold text-center mb-12">Why Choose InvestPro?</h2>
        <div className="max-w-5xl mx-auto grid md:grid-cols-3 gap-8">
          <motion.div whileHover={{ scale: 1.05 }} className="text-center p-8 border rounded-lg">
            <BarChart size={48} className="mx-auto mb-4 text-blue-500" />
            <h3 className="text-xl font-semibold mb-2">AI-Powered Analytics</h3>
            <p className="text-gray-600 dark:text-gray-400">Leverage advanced AI to analyze market trends and identify investment opportunities.</p>
          </motion.div>
          <motion.div whileHover={{ scale: 1.05 }} className="text-center p-8 border rounded-lg">
            <Bot size={48} className="mx-auto mb-4 text-blue-500" />
            <h3 className="text-xl font-semibold mb-2">Robo-Advisory</h3>
            <p className="text-gray-600 dark:text-gray-400">Get a personalized, automated investment portfolio tailored to your financial goals.</p>
          </motion.div>
          <motion.div whileHover={{ scale: 1.05 }} className="text-center p-8 border rounded-lg">
            <ShieldCheck size={48} className="mx-auto mb-4 text-blue-500" />
            <h3 className="text-xl font-semibold mb-2">Secure & Reliable</h3>
            <p className="text-gray-600 dark:text-gray-400">Your investments are protected with bank-level security and industry-leading compliance.</p>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="text-center py-8">
        <p className="text-gray-600 dark:text-gray-400">&copy; 2024 InvestPro. All rights reserved.</p>
      </footer>
    </div>
  );
};

export default HomePage;
