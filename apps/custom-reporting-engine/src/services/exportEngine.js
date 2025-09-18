const { EventEmitter } = require('events');
const { nanoid } = require('nanoid');
const { logger } = require('../utils/logger');
const { pool } = require('./database');
const Redis = require('ioredis');
const ExcelJS = require('exceljs');
const PDFDocument = require('pdfkit');
const csv = require('csv-writer');

class ExportEngine extends EventEmitter {
  constructor() {
    super();
    this.redis = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: process.env.REDIS_PORT || 6379,
      password: process.env.REDIS_PASSWORD,
      retryDelayOnFailover: 100,
      maxRetriesPerRequest: 3
    });
    
    this.exportFormats = new Map();
    this.exportCache = new Map();
    this._initialized = false;
  }

  async initialize() {
    try {
      // Test Redis connection
      await this.redis.ping();
      
      // Load export formats
      await this.loadExportFormats();
      
      this._initialized = true;
      logger.info('ExportEngine initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize ExportEngine:', error);
      throw error;
    }
  }

  async close() {
    try {
      await this.redis.quit();
      this._initialized = false;
      logger.info('ExportEngine closed');
    } catch (error) {
      logger.error('Error closing ExportEngine:', error);
    }
  }

  async loadExportFormats() {
    try {
      this.exportFormats = new Map([
        ['excel', {
          name: 'Excel Spreadsheet',
          extension: 'xlsx',
          mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          description: 'Microsoft Excel format with multiple sheets',
          supported: true
        }],
        ['csv', {
          name: 'CSV File',
          extension: 'csv',
          mimeType: 'text/csv',
          description: 'Comma-separated values format',
          supported: true
        }],
        ['pdf', {
          name: 'PDF Document',
          extension: 'pdf',
          mimeType: 'application/pdf',
          description: 'Portable Document Format',
          supported: true
        }],
        ['json', {
          name: 'JSON File',
          extension: 'json',
          mimeType: 'application/json',
          description: 'JavaScript Object Notation format',
          supported: true
        }],
        ['xml', {
          name: 'XML File',
          extension: 'xml',
          mimeType: 'application/xml',
          description: 'Extensible Markup Language format',
          supported: true
        }],
        ['html', {
          name: 'HTML File',
          extension: 'html',
          mimeType: 'text/html',
          description: 'HyperText Markup Language format',
          supported: true
        }],
        ['txt', {
          name: 'Text File',
          extension: 'txt',
          mimeType: 'text/plain',
          description: 'Plain text format',
          supported: true
        }],
        ['zip', {
          name: 'ZIP Archive',
          extension: 'zip',
          mimeType: 'application/zip',
          description: 'Compressed archive format',
          supported: true
        }]
      ]);
      
      logger.info('Export formats loaded successfully');
    } catch (error) {
      logger.error('Error loading export formats:', error);
      throw error;
    }
  }

  async exportData(data, format, parameters, userId) {
    try {
      const exportId = nanoid();
      const startTime = Date.now();
      
      logger.info(`Starting data export: ${format}`, {
        exportId,
        format,
        userId
      });

      // Validate format
      if (!this.exportFormats.has(format)) {
        throw new Error(`Unsupported export format: ${format}`);
      }

      // Process data
      const processedData = await this.processExportData(data, format, parameters);
      
      // Generate export
      const exportResult = await this.generateExport(processedData, format, parameters);
      
      // Store export
      const exportData = {
        id: exportId,
        data: processedData,
        format,
        parameters,
        result: exportResult,
        userId,
        createdAt: new Date().toISOString(),
        processingTime: Date.now() - startTime
      };
      
      await this.storeExport(exportData);
      
      // Cache export
      await this.cacheExport(exportData);
      
      this.emit('exportCompleted', exportData);
      
      logger.info(`Data export completed: ${exportId}`, {
        exportId,
        processingTime: exportData.processingTime
      });
      
      return exportData;
    } catch (error) {
      logger.error('Error exporting data:', error);
      throw error;
    }
  }

  async processExportData(data, format, parameters) {
    try {
      // Apply filters
      if (parameters.filters) {
        data = this.applyFilters(data, parameters.filters);
      }
      
      // Apply sorting
      if (parameters.sort) {
        data = this.applySorting(data, parameters.sort);
      }
      
      // Apply pagination
      if (parameters.pagination) {
        data = this.applyPagination(data, parameters.pagination);
      }
      
      // Apply transformations
      if (parameters.transformations) {
        data = this.applyTransformations(data, parameters.transformations);
      }
      
      return data;
    } catch (error) {
      logger.error('Error processing export data:', error);
      throw error;
    }
  }

  applyFilters(data, filters) {
    try {
      if (!Array.isArray(data)) {
        return data;
      }
      
      return data.filter(item => {
        for (const [field, filter] of Object.entries(filters)) {
          if (filter.operator === 'equals' && item[field] !== filter.value) {
            return false;
          }
          if (filter.operator === 'not_equals' && item[field] === filter.value) {
            return false;
          }
          if (filter.operator === 'greater_than' && item[field] <= filter.value) {
            return false;
          }
          if (filter.operator === 'less_than' && item[field] >= filter.value) {
            return false;
          }
          if (filter.operator === 'contains' && !item[field].toString().includes(filter.value)) {
            return false;
          }
          if (filter.operator === 'not_contains' && item[field].toString().includes(filter.value)) {
            return false;
          }
        }
        return true;
      });
    } catch (error) {
      logger.error('Error applying filters:', error);
      throw error;
    }
  }

  applySorting(data, sort) {
    try {
      if (!Array.isArray(data)) {
        return data;
      }
      
      return data.sort((a, b) => {
        for (const sortItem of sort) {
          const aVal = a[sortItem.field];
          const bVal = b[sortItem.field];
          
          if (aVal < bVal) {
            return sortItem.direction === 'asc' ? -1 : 1;
          }
          if (aVal > bVal) {
            return sortItem.direction === 'asc' ? 1 : -1;
          }
        }
        return 0;
      });
    } catch (error) {
      logger.error('Error applying sorting:', error);
      throw error;
    }
  }

  applyPagination(data, pagination) {
    try {
      if (!Array.isArray(data)) {
        return data;
      }
      
      const { page = 1, limit = 100 } = pagination;
      const start = (page - 1) * limit;
      const end = start + limit;
      
      return data.slice(start, end);
    } catch (error) {
      logger.error('Error applying pagination:', error);
      throw error;
    }
  }

  applyTransformations(data, transformations) {
    try {
      if (!Array.isArray(data)) {
        return data;
      }
      
      return data.map(item => {
        const transformedItem = { ...item };
        
        for (const transformation of transformations) {
          switch (transformation.type) {
            case 'rename':
              if (transformedItem[transformation.from]) {
                transformedItem[transformation.to] = transformedItem[transformation.from];
                delete transformedItem[transformation.from];
              }
              break;
            case 'format':
              if (transformedItem[transformation.field]) {
                transformedItem[transformation.field] = this.formatValue(
                  transformedItem[transformation.field], 
                  transformation.format
                );
              }
              break;
            case 'calculate':
              if (transformation.expression) {
                transformedItem[transformation.field] = this.evaluateExpression(
                  transformation.expression, 
                  transformedItem
                );
              }
              break;
          }
        }
        
        return transformedItem;
      });
    } catch (error) {
      logger.error('Error applying transformations:', error);
      throw error;
    }
  }

  formatValue(value, format) {
    try {
      switch (format.type) {
        case 'number':
          return Number(value).toFixed(format.decimals || 2);
        case 'currency':
          return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: format.currency || 'USD'
          }).format(value);
        case 'percentage':
          return (Number(value) * 100).toFixed(format.decimals || 2) + '%';
        case 'date':
          return new Date(value).toLocaleDateString(format.locale || 'en-US');
        case 'datetime':
          return new Date(value).toLocaleString(format.locale || 'en-US');
        default:
          return value;
      }
    } catch (error) {
      logger.error('Error formatting value:', error);
      return value;
    }
  }

  evaluateExpression(expression, data) {
    try {
      // Simple expression evaluator
      // In production, use a proper expression evaluator like expr-eval
      let result = expression;
      
      // Replace variables with data values
      for (const [key, value] of Object.entries(data)) {
        result = result.replace(new RegExp(`\\{${key}\\}`, 'g'), value);
      }
      
      // Evaluate mathematical expressions
      if (result.match(/^[0-9+\-*/().\s]+$/)) {
        return eval(result);
      }
      
      return result;
    } catch (error) {
      logger.error('Error evaluating expression:', error);
      return expression;
    }
  }

  async generateExport(data, format, parameters) {
    try {
      switch (format) {
        case 'excel':
          return await this.generateExcelExport(data, parameters);
        case 'csv':
          return await this.generateCSVExport(data, parameters);
        case 'pdf':
          return await this.generatePDFExport(data, parameters);
        case 'json':
          return await this.generateJSONExport(data, parameters);
        case 'xml':
          return await this.generateXMLExport(data, parameters);
        case 'html':
          return await this.generateHTMLExport(data, parameters);
        case 'txt':
          return await this.generateTextExport(data, parameters);
        case 'zip':
          return await this.generateZIPExport(data, parameters);
        default:
          throw new Error(`Unsupported export format: ${format}`);
      }
    } catch (error) {
      logger.error('Error generating export:', error);
      throw error;
    }
  }

  async generateExcelExport(data, parameters) {
    try {
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Data');
      
      // Add title
      if (parameters.title) {
        worksheet.addRow([parameters.title]);
        worksheet.getRow(1).font = { size: 16, bold: true };
        worksheet.addRow([]);
      }
      
      // Add headers
      if (Array.isArray(data) && data.length > 0) {
        const headers = Object.keys(data[0]);
        worksheet.addRow(headers);
        worksheet.getRow(worksheet.rowCount).font = { bold: true };
        
        // Add data rows
        data.forEach(row => {
          const values = headers.map(header => row[header] || '');
          worksheet.addRow(values);
        });
        
        // Auto-fit columns
        worksheet.columns.forEach(column => {
          column.width = 15;
        });
      }
      
      const buffer = await workbook.xlsx.writeBuffer();
      return {
        filename: `export_${Date.now()}.xlsx`,
        data: buffer,
        mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      };
    } catch (error) {
      logger.error('Error generating Excel export:', error);
      throw error;
    }
  }

  async generateCSVExport(data, parameters) {
    try {
      if (!Array.isArray(data) || data.length === 0) {
        return {
          filename: `export_${Date.now()}.csv`,
          data: '',
          mimeType: 'text/csv'
        };
      }
      
      const headers = Object.keys(data[0]);
      const csvData = [];
      
      // Add headers
      csvData.push(headers.join(','));
      
      // Add data rows
      data.forEach(row => {
        const values = headers.map(header => {
          const value = row[header] || '';
          // Escape commas and quotes
          return `"${value.toString().replace(/"/g, '""')}"`;
        });
        csvData.push(values.join(','));
      });
      
      return {
        filename: `export_${Date.now()}.csv`,
        data: csvData.join('\n'),
        mimeType: 'text/csv'
      };
    } catch (error) {
      logger.error('Error generating CSV export:', error);
      throw error;
    }
  }

  async generatePDFExport(data, parameters) {
    try {
      const doc = new PDFDocument();
      const chunks = [];
      
      doc.on('data', chunk => chunks.push(chunk));
      
      return new Promise((resolve, reject) => {
        doc.on('end', () => resolve({
          filename: `export_${Date.now()}.pdf`,
          data: Buffer.concat(chunks),
          mimeType: 'application/pdf'
        }));
        doc.on('error', reject);
        
        // Add title
        if (parameters.title) {
          doc.fontSize(20).text(parameters.title, 50, 50);
        }
        
        // Add content
        if (Array.isArray(data) && data.length > 0) {
          let y = 100;
          const headers = Object.keys(data[0]);
          
          // Add headers
          doc.fontSize(12).text(headers.join(' | '), 50, y);
          y += 20;
          
          // Add data rows
          data.forEach(row => {
            const values = headers.map(header => row[header] || '').join(' | ');
            doc.fontSize(10).text(values, 50, y);
            y += 15;
          });
        }
        
        doc.end();
      });
    } catch (error) {
      logger.error('Error generating PDF export:', error);
      throw error;
    }
  }

  async generateJSONExport(data, parameters) {
    try {
      const jsonData = {
        metadata: {
          exportedAt: new Date().toISOString(),
          format: 'json',
          count: Array.isArray(data) ? data.length : 1
        },
        data: data
      };
      
      return {
        filename: `export_${Date.now()}.json`,
        data: JSON.stringify(jsonData, null, 2),
        mimeType: 'application/json'
      };
    } catch (error) {
      logger.error('Error generating JSON export:', error);
      throw error;
    }
  }

  async generateXMLExport(data, parameters) {
    try {
      let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
      xml += '<export>\n';
      xml += `  <metadata>\n`;
      xml += `    <exportedAt>${new Date().toISOString()}</exportedAt>\n`;
      xml += `    <format>xml</format>\n`;
      xml += `    <count>${Array.isArray(data) ? data.length : 1}</count>\n`;
      xml += `  </metadata>\n`;
      xml += `  <data>\n`;
      
      if (Array.isArray(data)) {
        data.forEach((item, index) => {
          xml += `    <item id="${index}">\n`;
          for (const [key, value] of Object.entries(item)) {
            xml += `      <${key}>${value}</${key}>\n`;
          }
          xml += `    </item>\n`;
        });
      } else {
        xml += `    <item>\n`;
        for (const [key, value] of Object.entries(data)) {
          xml += `      <${key}>${value}</${key}>\n`;
        }
        xml += `    </item>\n`;
      }
      
      xml += `  </data>\n`;
      xml += `</export>\n`;
      
      return {
        filename: `export_${Date.now()}.xml`,
        data: xml,
        mimeType: 'application/xml'
      };
    } catch (error) {
      logger.error('Error generating XML export:', error);
      throw error;
    }
  }

  async generateHTMLExport(data, parameters) {
    try {
      let html = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>${parameters.title || 'Data Export'}</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 40px; }
            table { border-collapse: collapse; width: 100%; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            th { background-color: #f2f2f2; }
          </style>
        </head>
        <body>
          <h1>${parameters.title || 'Data Export'}</h1>
          <p>Exported on: ${new Date().toLocaleString()}</p>
      `;
      
      if (Array.isArray(data) && data.length > 0) {
        html += '<table>\n';
        const headers = Object.keys(data[0]);
        
        // Add headers
        html += '<tr>';
        headers.forEach(header => {
          html += `<th>${header}</th>`;
        });
        html += '</tr>\n';
        
        // Add data rows
        data.forEach(row => {
          html += '<tr>';
          headers.forEach(header => {
            html += `<td>${row[header] || ''}</td>`;
          });
          html += '</tr>\n';
        });
        
        html += '</table>\n';
      }
      
      html += '</body></html>';
      
      return {
        filename: `export_${Date.now()}.html`,
        data: html,
        mimeType: 'text/html'
      };
    } catch (error) {
      logger.error('Error generating HTML export:', error);
      throw error;
    }
  }

  async generateTextExport(data, parameters) {
    try {
      let text = '';
      
      if (parameters.title) {
        text += `${parameters.title}\n`;
        text += '='.repeat(parameters.title.length) + '\n\n';
      }
      
      text += `Exported on: ${new Date().toLocaleString()}\n\n`;
      
      if (Array.isArray(data) && data.length > 0) {
        const headers = Object.keys(data[0]);
        
        // Add headers
        text += headers.join('\t') + '\n';
        text += '-'.repeat(headers.join('\t').length) + '\n';
        
        // Add data rows
        data.forEach(row => {
          const values = headers.map(header => row[header] || '');
          text += values.join('\t') + '\n';
        });
      }
      
      return {
        filename: `export_${Date.now()}.txt`,
        data: text,
        mimeType: 'text/plain'
      };
    } catch (error) {
      logger.error('Error generating text export:', error);
      throw error;
    }
  }

  async generateZIPExport(data, parameters) {
    try {
      // This would typically use a ZIP library like archiver
      // For now, we'll create a simple ZIP structure
      const zipData = {
        'data.json': JSON.stringify(data, null, 2),
        'metadata.txt': `Export created on: ${new Date().toISOString()}\nFormat: ZIP\nCount: ${Array.isArray(data) ? data.length : 1}`
      };
      
      return {
        filename: `export_${Date.now()}.zip`,
        data: Buffer.from(JSON.stringify(zipData)),
        mimeType: 'application/zip'
      };
    } catch (error) {
      logger.error('Error generating ZIP export:', error);
      throw error;
    }
  }

  async getAvailableFormats() {
    try {
      return Array.from(this.exportFormats.entries()).map(([key, config]) => ({
        key,
        ...config
      }));
    } catch (error) {
      logger.error('Error getting available formats:', error);
      throw error;
    }
  }

  async storeExport(exportData) {
    try {
      const query = `
        INSERT INTO exports (
          id, data, format, parameters, result, user_id, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      `;
      
      await pool.query(query, [
        exportData.id,
        JSON.stringify(exportData.data),
        exportData.format,
        JSON.stringify(exportData.parameters),
        JSON.stringify(exportData.result),
        exportData.userId,
        exportData.createdAt
      ]);
      
      logger.info(`Export stored: ${exportData.id}`);
    } catch (error) {
      logger.error('Error storing export:', error);
      throw error;
    }
  }

  async cacheExport(exportData) {
    try {
      const cacheKey = `export:${exportData.id}`;
      await this.redis.setex(cacheKey, 3600, JSON.stringify(exportData));
    } catch (error) {
      logger.error('Error caching export:', error);
      throw error;
    }
  }
}

module.exports = ExportEngine;
