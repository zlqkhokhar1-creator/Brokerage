const logger = require('../utils/logger');
const database = require('./database');
const redis = require('./redis');
const PDFDocument = require('pdfkit');
const ExcelJS = require('exceljs');
const puppeteer = require('puppeteer');

class ExportService {
  async exportReport(req, res) {
    try {
      const { id } = req.params;
      const { format } = req.params;
      const userId = req.user.id;
      
      // Get report data
      const reportQuery = 'SELECT * FROM reports WHERE id = $1 AND user_id = $2';
      const reportResult = await database.query(reportQuery, [id, userId]);
      
      if (reportResult.rows.length === 0) {
        return res.status(404).json({ success: false, error: 'Report not found' });
      }
      
      const report = reportResult.rows[0];
      
      // Generate export based on format
      let exportData;
      let contentType;
      let filename;
      
      switch (format.toLowerCase()) {
        case 'pdf':
          exportData = await this.exportToPdf(report);
          contentType = 'application/pdf';
          filename = `${report.name}.pdf`;
          break;
        case 'excel':
          exportData = await this.exportToExcel(report);
          contentType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
          filename = `${report.name}.xlsx`;
          break;
        case 'csv':
          exportData = await this.exportToCsv(report);
          contentType = 'text/csv';
          filename = `${report.name}.csv`;
          break;
        case 'json':
          exportData = await this.exportToJson(report);
          contentType = 'application/json';
          filename = `${report.name}.json`;
          break;
        default:
          return res.status(400).json({ success: false, error: 'Unsupported export format' });
      }
      
      res.setHeader('Content-Type', contentType);
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.send(exportData);
    } catch (error) {
      logger.error('Error exporting report:', error);
      res.status(500).json({ success: false, error: 'Failed to export report' });
    }
  }

  async getExportFormats(req, res) {
    try {
      const formats = [
        { id: 'pdf', name: 'PDF', description: 'Portable Document Format', mimeType: 'application/pdf' },
        { id: 'excel', name: 'Excel', description: 'Microsoft Excel Spreadsheet', mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' },
        { id: 'csv', name: 'CSV', description: 'Comma Separated Values', mimeType: 'text/csv' },
        { id: 'json', name: 'JSON', description: 'JavaScript Object Notation', mimeType: 'application/json' }
      ];
      
      res.json({
        success: true,
        data: formats
      });
    } catch (error) {
      logger.error('Error getting export formats:', error);
      res.status(500).json({ success: false, error: 'Failed to get export formats' });
    }
  }

  async batchExport(req, res) {
    try {
      const { reportIds, format, userId } = req.body;
      
      if (!reportIds || !Array.isArray(reportIds) || reportIds.length === 0) {
        return res.status(400).json({ success: false, error: 'Report IDs are required' });
      }
      
      const exports = [];
      
      for (const reportId of reportIds) {
        try {
          const reportQuery = 'SELECT * FROM reports WHERE id = $1 AND user_id = $2';
          const reportResult = await database.query(reportQuery, [reportId, userId]);
          
          if (reportResult.rows.length > 0) {
            const report = reportResult.rows[0];
            const exportData = await this.generateExportData(report, format);
            exports.push({
              reportId,
              reportName: report.name,
              data: exportData
            });
          }
        } catch (error) {
          logger.error(`Error exporting report ${reportId}:`, error);
        }
      }
      
      res.json({
        success: true,
        data: exports,
        metadata: {
          format,
          totalExports: exports.length,
          generatedAt: new Date().toISOString()
        }
      });
    } catch (error) {
      logger.error('Error batch exporting:', error);
      res.status(500).json({ success: false, error: 'Failed to batch export' });
    }
  }

  async exportToPdf(report) {
    try {
      const doc = new PDFDocument();
      const chunks = [];
      
      doc.on('data', chunk => chunks.push(chunk));
      doc.on('end', () => {});
      
      // Add report title
      doc.fontSize(20).text(report.name, 50, 50);
      doc.fontSize(12).text(`Generated: ${new Date().toLocaleString()}`, 50, 80);
      
      // Add report description
      if (report.description) {
        doc.fontSize(10).text(report.description, 50, 110);
      }
      
      // Add report content
      doc.fontSize(12).text('Report Content:', 50, 150);
      doc.fontSize(10).text(JSON.stringify(report.parameters, null, 2), 50, 170);
      
      doc.end();
      
      return new Promise((resolve) => {
        doc.on('end', () => {
          resolve(Buffer.concat(chunks));
        });
      });
    } catch (error) {
      logger.error('Error exporting to PDF:', error);
      throw error;
    }
  }

  async exportToExcel(report) {
    try {
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet(report.name);
      
      // Add headers
      worksheet.addRow(['Report Name', 'Description', 'Type', 'Parameters']);
      worksheet.addRow([
        report.name,
        report.description || '',
        report.type,
        JSON.stringify(report.parameters)
      ]);
      
      // Style the header row
      worksheet.getRow(1).font = { bold: true };
      
      // Auto-fit columns
      worksheet.columns.forEach(column => {
        column.width = 20;
      });
      
      const buffer = await workbook.xlsx.writeBuffer();
      return buffer;
    } catch (error) {
      logger.error('Error exporting to Excel:', error);
      throw error;
    }
  }

  async exportToCsv(report) {
    try {
      const csvData = [
        ['Report Name', 'Description', 'Type', 'Parameters'],
        [
          report.name,
          report.description || '',
          report.type,
          JSON.stringify(report.parameters)
        ]
      ];
      
      const csvContent = csvData.map(row => 
        row.map(field => `"${field}"`).join(',')
      ).join('\n');
      
      return csvContent;
    } catch (error) {
      logger.error('Error exporting to CSV:', error);
      throw error;
    }
  }

  async exportToJson(report) {
    try {
      return JSON.stringify({
        reportName: report.name,
        description: report.description,
        type: report.type,
        parameters: report.parameters,
        generatedAt: new Date().toISOString()
      }, null, 2);
    } catch (error) {
      logger.error('Error exporting to JSON:', error);
      throw error;
    }
  }

  async generateExportData(report, format) {
    try {
      switch (format.toLowerCase()) {
        case 'pdf':
          return await this.exportToPdf(report);
        case 'excel':
          return await this.exportToExcel(report);
        case 'csv':
          return await this.exportToCsv(report);
        case 'json':
          return await this.exportToJson(report);
        default:
          throw new Error('Unsupported export format');
      }
    } catch (error) {
      logger.error('Error generating export data:', error);
      throw error;
    }
  }

  async generateHtmlReport(report) {
    try {
      const browser = await puppeteer.launch();
      const page = await browser.newPage();
      
      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>${report.name}</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 40px; }
            .header { border-bottom: 2px solid #333; padding-bottom: 20px; margin-bottom: 30px; }
            .content { line-height: 1.6; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>${report.name}</h1>
            <p>Generated: ${new Date().toLocaleString()}</p>
          </div>
          <div class="content">
            <p>${report.description || ''}</p>
            <h3>Report Parameters:</h3>
            <pre>${JSON.stringify(report.parameters, null, 2)}</pre>
          </div>
        </body>
        </html>
      `;
      
      await page.setContent(htmlContent);
      const pdf = await page.pdf({ format: 'A4' });
      
      await browser.close();
      return pdf;
    } catch (error) {
      logger.error('Error generating HTML report:', error);
      throw error;
    }
  }
}

module.exports = new ExportService();

