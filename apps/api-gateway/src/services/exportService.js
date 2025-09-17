const { Parser } = require('json2csv');
const { transaction } = require('../config/database');

/**
 * Exports a user's transaction history as a CSV string.
 * @param {string} userId - The user's UUID.
 * @param {Date} startDate - The start date for the export.
 * @param {Date} endDate - The end date for the export.
 * @returns {Promise<string>} The CSV data as a string.
 */
const exportTransactionsToCsv = async (userId, startDate, endDate) => {
  // Fetch transaction data from the database
  const transactions = await fetchTransactionData(userId, startDate, endDate);

  if (transactions.length === 0) {
    return ''; // Return an empty string if there are no transactions
  }

  // Define the fields for the CSV
  const fields = ['date', 'symbol', 'side', 'quantity', 'price', 'total_value'];
  const json2csvParser = new Parser({ fields });
  const csv = json2csvParser.parse(transactions);

  return csv;
};

// --- Data Fetching Logic (dummy implementation) ---
const fetchTransactionData = async (userId, startDate, endDate) => {
  // In a real application, this would query the orders/trades table
  // for all transactions within the specified date range.
  return [
    { date: '2025-08-01', symbol: 'AAPL', side: 'BUY', quantity: 10, price: 150.00, total_value: 1500.00 },
    { date: '2025-08-15', symbol: 'GOOG', side: 'SELL', quantity: 5, price: 190.10, total_value: 950.50 },
    { date: '2025-08-20', symbol: 'MSFT', side: 'BUY', quantity: 8, price: 300.00, total_value: 2400.00 }
  ];
};

module.exports = {
  exportTransactionsToCsv
};
