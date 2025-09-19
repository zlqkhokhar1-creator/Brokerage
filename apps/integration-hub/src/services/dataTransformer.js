const logger = require('../utils/logger');
const database = require('./database');
const redis = require('./redis');

class DataTransformer {
  async transformData(req, res) {
    try {
      const { sourceData, transformationRules, targetFormat } = req.body;
      
      const transformedData = await this.performTransformation(sourceData, transformationRules, targetFormat);
      
      res.json({
        success: true,
        data: transformedData
      });
    } catch (error) {
      logger.error('Error transforming data:', error);
      res.status(500).json({ success: false, error: 'Failed to transform data' });
    }
  }

  async performTransformation(sourceData, transformationRules, targetFormat) {
    try {
      let transformedData = sourceData;
      
      // Apply field mappings
      if (transformationRules.fieldMappings) {
        transformedData = this.applyFieldMappings(transformedData, transformationRules.fieldMappings);
      }
      
      // Apply data validations
      if (transformationRules.validations) {
        transformedData = this.applyValidations(transformedData, transformationRules.validations);
      }
      
      // Apply data filters
      if (transformationRules.filters) {
        transformedData = this.applyFilters(transformedData, transformationRules.filters);
      }
      
      // Apply data aggregations
      if (transformationRules.aggregations) {
        transformedData = this.applyAggregations(transformedData, transformationRules.aggregations);
      }
      
      // Convert to target format
      const formattedData = this.convertToFormat(transformedData, targetFormat);
      
      return {
        originalCount: Array.isArray(sourceData) ? sourceData.length : 1,
        transformedCount: Array.isArray(transformedData) ? transformedData.length : 1,
        format: targetFormat,
        data: formattedData
      };
    } catch (error) {
      logger.error('Error performing transformation:', error);
      throw error;
    }
  }

  applyFieldMappings(data, fieldMappings) {
    try {
      if (Array.isArray(data)) {
        return data.map(item => this.mapFields(item, fieldMappings));
      } else {
        return this.mapFields(data, fieldMappings);
      }
    } catch (error) {
      logger.error('Error applying field mappings:', error);
      return data;
    }
  }

  mapFields(item, fieldMappings) {
    const mappedItem = {};
    
    for (const [sourceField, targetField] of Object.entries(fieldMappings)) {
      if (sourceField in item) {
        mappedItem[targetField] = item[sourceField];
      }
    }
    
    return mappedItem;
  }

  applyValidations(data, validations) {
    try {
      if (Array.isArray(data)) {
        return data.filter(item => this.validateItem(item, validations));
      } else {
        return this.validateItem(data, validations) ? data : null;
      }
    } catch (error) {
      logger.error('Error applying validations:', error);
      return data;
    }
  }

  validateItem(item, validations) {
    for (const validation of validations) {
      if (!this.validateField(item, validation)) {
        return false;
      }
    }
    return true;
  }

  validateField(item, validation) {
    const { field, type, required, min, max, pattern } = validation;
    
    if (required && (!(field in item) || item[field] === null || item[field] === undefined)) {
      return false;
    }
    
    if (field in item) {
      const value = item[field];
      
      switch (type) {
        case 'string':
          if (typeof value !== 'string') return false;
          if (min && value.length < min) return false;
          if (max && value.length > max) return false;
          if (pattern && !new RegExp(pattern).test(value)) return false;
          break;
        case 'number':
          if (typeof value !== 'number') return false;
          if (min && value < min) return false;
          if (max && value > max) return false;
          break;
        case 'email':
          if (typeof value !== 'string' || !this.isValidEmail(value)) return false;
          break;
        case 'date':
          if (!this.isValidDate(value)) return false;
          break;
        case 'boolean':
          if (typeof value !== 'boolean') return false;
          break;
      }
    }
    
    return true;
  }

  applyFilters(data, filters) {
    try {
      if (Array.isArray(data)) {
        return data.filter(item => this.matchesFilters(item, filters));
      } else {
        return this.matchesFilters(data, filters) ? data : null;
      }
    } catch (error) {
      logger.error('Error applying filters:', error);
      return data;
    }
  }

  matchesFilters(item, filters) {
    for (const filter of filters) {
      if (!this.matchesFilter(item, filter)) {
        return false;
      }
    }
    return true;
  }

  matchesFilter(item, filter) {
    const { field, operator, value } = filter;
    
    if (!(field in item)) {
      return false;
    }
    
    const itemValue = item[field];
    
    switch (operator) {
      case 'equals':
        return itemValue === value;
      case 'not_equals':
        return itemValue !== value;
      case 'greater_than':
        return itemValue > value;
      case 'less_than':
        return itemValue < value;
      case 'greater_than_or_equal':
        return itemValue >= value;
      case 'less_than_or_equal':
        return itemValue <= value;
      case 'contains':
        return String(itemValue).includes(String(value));
      case 'not_contains':
        return !String(itemValue).includes(String(value));
      case 'starts_with':
        return String(itemValue).startsWith(String(value));
      case 'ends_with':
        return String(itemValue).endsWith(String(value));
      case 'in':
        return Array.isArray(value) && value.includes(itemValue);
      case 'not_in':
        return Array.isArray(value) && !value.includes(itemValue);
      default:
        return true;
    }
  }

  applyAggregations(data, aggregations) {
    try {
      if (!Array.isArray(data)) {
        return data;
      }
      
      const aggregatedData = {};
      
      for (const aggregation of aggregations) {
        const { field, operation, groupBy } = aggregation;
        
        if (groupBy) {
          aggregatedData[field] = this.groupAndAggregate(data, field, operation, groupBy);
        } else {
          aggregatedData[field] = this.aggregate(data, field, operation);
        }
      }
      
      return aggregatedData;
    } catch (error) {
      logger.error('Error applying aggregations:', error);
      return data;
    }
  }

  groupAndAggregate(data, field, operation, groupBy) {
    const groups = {};
    
    for (const item of data) {
      const groupKey = item[groupBy];
      if (!groups[groupKey]) {
        groups[groupKey] = [];
      }
      groups[groupKey].push(item[field]);
    }
    
    const result = {};
    for (const [groupKey, values] of Object.entries(groups)) {
      result[groupKey] = this.aggregateValues(values, operation);
    }
    
    return result;
  }

  aggregate(data, field, operation) {
    const values = data.map(item => item[field]).filter(value => value !== null && value !== undefined);
    return this.aggregateValues(values, operation);
  }

  aggregateValues(values, operation) {
    switch (operation) {
      case 'sum':
        return values.reduce((sum, value) => sum + value, 0);
      case 'avg':
        return values.reduce((sum, value) => sum + value, 0) / values.length;
      case 'min':
        return Math.min(...values);
      case 'max':
        return Math.max(...values);
      case 'count':
        return values.length;
      case 'distinct_count':
        return new Set(values).size;
      default:
        return values;
    }
  }

  convertToFormat(data, targetFormat) {
    try {
      switch (targetFormat.toLowerCase()) {
        case 'json':
          return JSON.stringify(data, null, 2);
        case 'csv':
          return this.convertToCSV(data);
        case 'xml':
          return this.convertToXML(data);
        case 'yaml':
          return this.convertToYAML(data);
        default:
          return data;
      }
    } catch (error) {
      logger.error('Error converting to format:', error);
      return data;
    }
  }

  convertToCSV(data) {
    if (!Array.isArray(data) || data.length === 0) {
      return '';
    }
    
    const headers = Object.keys(data[0]);
    const csvRows = [headers.join(',')];
    
    for (const row of data) {
      const values = headers.map(header => {
        const value = row[header];
        return typeof value === 'string' && value.includes(',') ? `"${value}"` : value;
      });
      csvRows.push(values.join(','));
    }
    
    return csvRows.join('\n');
  }

  convertToXML(data) {
    if (Array.isArray(data)) {
      return `<root>${data.map(item => this.objectToXML(item, 'item')).join('')}</root>`;
    } else {
      return this.objectToXML(data, 'root');
    }
  }

  objectToXML(obj, rootName) {
    let xml = `<${rootName}>`;
    
    for (const [key, value] of Object.entries(obj)) {
      if (typeof value === 'object' && value !== null) {
        xml += this.objectToXML(value, key);
      } else {
        xml += `<${key}>${value}</${key}>`;
      }
    }
    
    xml += `</${rootName}>`;
    return xml;
  }

  convertToYAML(data) {
    // Simple YAML conversion
    return JSON.stringify(data, null, 2).replace(/"/g, '').replace(/,/g, '');
  }

  isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  isValidDate(date) {
    return !isNaN(Date.parse(date));
  }
}

module.exports = new DataTransformer();