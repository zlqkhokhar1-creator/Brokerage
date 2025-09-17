const PDFDocument = require('pdfkit');
const { transaction } = require('../config/database');

/**
 * Generates a PDF account statement for a given user.
 * @param {string} userId - The user's UUID.
 * @param {Date} startDate - The start date for the statement period.
 * @param {Date} endDate - The end date for the statement period.
 * @returns {Promise<Buffer>} A buffer containing the generated PDF data.
 */
const generateStatement = async (userId, startDate, endDate) => {
  // Fetch user info and account data from the database
  const userData = await fetchUserDataForStatement(userId, startDate, endDate);

  return new Promise((resolve) => {
    const doc = new PDFDocument({ margin: 50 });
    const buffers = [];
    doc.on('data', buffers.push.bind(buffers));
    doc.on('end', () => {
      resolve(Buffer.concat(buffers));
    });

    // --- PDF Content Generation ---
    generateHeader(doc);
    generateCustomerInformation(doc, userData.user);
    generateAccountSummary(doc, userData.summary);
    generateTransactionHistory(doc, userData.transactions);
    generateFooter(doc);
    // --- End of Content ---

    doc.end();
  });
};

// Helper functions to generate different sections of the PDF
const generateHeader = (doc) => {
  doc
    .fontSize(20)
    .text('Brokerage Platform Account Statement', { align: 'center' })
    .moveDown();
};

const generateCustomerInformation = (doc, user) => {
  doc.fontSize(12).text('Account Holder:', { underline: true }).moveDown(0.5);
  doc.text(`${user.first_name} ${user.last_name}`);
  doc.text(`Email: ${user.email}`);
  doc.moveDown();
};

const generateAccountSummary = (doc, summary) => {
  doc.fontSize(12).text('Account Summary', { underline: true }).moveDown(0.5);
  doc.text(`Statement Period: ${summary.startDate} - ${summary.endDate}`);
  doc.text(`Beginning Balance: $${summary.beginningBalance.toFixed(2)}`);
  doc.text(`Ending Balance: $${summary.endingBalance.toFixed(2)}`);
  doc.moveDown();
};

const generateTransactionHistory = (doc, transactions) => {
  doc.fontSize(12).text('Transaction History', { underline: true }).moveDown(0.5);
  
  // Table Header
  const tableTop = doc.y;
  doc.fontSize(10);
  doc.text('Date', 50, tableTop);
  doc.text('Description', 150, tableTop);
  doc.text('Amount', 450, tableTop, { width: 100, align: 'right' });
  doc.moveTo(50, tableTop + 15).lineTo(550, tableTop + 15).stroke();

  // Table Rows
  let y = tableTop + 25;
  transactions.forEach(tx => {
    doc.text(new Date(tx.date).toLocaleDateString(), 50, y);
    doc.text(tx.description, 150, y, { width: 300 });
    doc.text(`$${tx.amount.toFixed(2)}`, 450, y, { width: 100, align: 'right' });
    y += 20;
  });
};

const generateFooter = (doc) => {
  doc
    .fontSize(8)
    .text('Thank you for choosing our platform.', 50, 750, { align: 'center', width: 500 });
};

// --- Data Fetching Logic (dummy implementation) ---
const fetchUserDataForStatement = async (userId, startDate, endDate) => {
  // In a real application, this would query the database for transactions,
  // account balances, etc., within the specified date range.
  return {
    user: {
      first_name: 'John',
      last_name: 'Doe',
      email: 'john.doe@example.com'
    },
    summary: {
      startDate: startDate.toLocaleDateString(),
      endDate: endDate.toLocaleDateString(),
      beginningBalance: 10000.00,
      endingBalance: 12500.50
    },
    transactions: [
      { date: '2025-08-01', description: 'BUY AAPL 10 shares', amount: -1500.00 },
      { date: '2025-08-15', description: 'DEPOSIT', amount: 5000.00 },
      { date: '2025-08-20', description: 'SELL GOOG 5 shares', amount: -950.50 }
    ]
  };
};

module.exports = {
  generateStatement
};
