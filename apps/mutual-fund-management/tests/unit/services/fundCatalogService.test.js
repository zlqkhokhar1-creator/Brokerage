const FundCatalogService = require('../../../src/services/fundCatalogService');
const { pool } = require('../../../src/utils/database');
const { redisClient } = require('../../../src/utils/redis');

// Mock dependencies
jest.mock('../../../src/utils/database');
jest.mock('../../../src/utils/redis');

describe('FundCatalogService', () => {
  let service;
  let mockPool;
  let mockRedis;

  beforeEach(() => {
    service = new FundCatalogService();
    mockPool = {
      query: jest.fn()
    };
    mockRedis = {
      get: jest.fn(),
      setex: jest.fn(),
      del: jest.fn()
    };
    
    pool.query = mockPool.query;
    redisClient.get = mockRedis.get;
    redisClient.setex = mockRedis.setex;
    redisClient.del = mockRedis.del;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createMutualFund', () => {
    it('should create a new mutual fund successfully', async () => {
      const fundData = {
        symbol: 'TESTFUND',
        name: 'Test Mutual Fund',
        fund_family_id: '123e4567-e89b-12d3-a456-426614174000',
        category_id: '123e4567-e89b-12d3-a456-426614174001',
        expense_ratio: 0.005,
        minimum_investment: 1000
      };

      const expectedResult = {
        id: '123e4567-e89b-12d3-a456-426614174002',
        ...fundData,
        created_at: new Date(),
        updated_at: new Date()
      };

      mockPool.query.mockResolvedValue({ rows: [expectedResult] });
      mockRedis.del.mockResolvedValue(1);

      const result = await service.createMutualFund(fundData);

      expect(result).toEqual(expectedResult);
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO mutual_funds'),
        expect.arrayContaining([
          fundData.symbol,
          fundData.name,
          fundData.fund_family_id,
          fundData.category_id
        ])
      );
      expect(mockRedis.del).toHaveBeenCalledWith('fund_catalog:all');
    });

    it('should throw error when database query fails', async () => {
      const fundData = {
        symbol: 'TESTFUND',
        name: 'Test Mutual Fund'
      };

      mockPool.query.mockRejectedValue(new Error('Database error'));

      await expect(service.createMutualFund(fundData)).rejects.toThrow('Failed to create mutual fund');
    });
  });

  describe('getMutualFunds', () => {
    it('should return funds from cache when available', async () => {
      const filters = { limit: 10, offset: 0 };
      const cachedFunds = [
        { id: '1', symbol: 'FUND1', name: 'Fund 1' },
        { id: '2', symbol: 'FUND2', name: 'Fund 2' }
      ];

      mockRedis.get.mockResolvedValue(JSON.stringify(cachedFunds));

      const result = await service.getMutualFunds(filters);

      expect(result).toEqual(cachedFunds);
      expect(mockRedis.get).toHaveBeenCalledWith(
        expect.stringContaining('fund_catalog:all')
      );
      expect(mockPool.query).not.toHaveBeenCalled();
    });

    it('should fetch from database and cache when not in cache', async () => {
      const filters = { limit: 10, offset: 0 };
      const dbFunds = [
        { id: '1', symbol: 'FUND1', name: 'Fund 1' },
        { id: '2', symbol: 'FUND2', name: 'Fund 2' }
      ];

      mockRedis.get.mockResolvedValue(null);
      mockPool.query.mockResolvedValue({ rows: dbFunds });
      mockRedis.setex.mockResolvedValue('OK');

      const result = await service.getMutualFunds(filters);

      expect(result).toEqual(dbFunds);
      expect(mockPool.query).toHaveBeenCalled();
      expect(mockRedis.setex).toHaveBeenCalled();
    });

    it('should apply filters correctly', async () => {
      const filters = {
        categoryId: '123e4567-e89b-12d3-a456-426614174001',
        fundFamilyId: '123e4567-e89b-12d3-a456-426614174000',
        limit: 5,
        offset: 10
      };

      mockRedis.get.mockResolvedValue(null);
      mockPool.query.mockResolvedValue({ rows: [] });
      mockRedis.setex.mockResolvedValue('OK');

      await service.getMutualFunds(filters);

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('WHERE mf.is_active = $1 AND mf.is_tradeable = $2'),
        expect.arrayContaining([
          true,
          true,
          filters.categoryId,
          filters.fundFamilyId,
          filters.limit,
          filters.offset
        ])
      );
    });
  });

  describe('getMutualFundById', () => {
    it('should return fund from cache when available', async () => {
      const fundId = '123e4567-e89b-12d3-a456-426614174002';
      const cachedFund = {
        id: fundId,
        symbol: 'TESTFUND',
        name: 'Test Mutual Fund'
      };

      mockRedis.get.mockResolvedValue(JSON.stringify(cachedFund));

      const result = await service.getMutualFundById(fundId);

      expect(result).toEqual(cachedFund);
      expect(mockRedis.get).toHaveBeenCalledWith(`fund_catalog:detail:${fundId}`);
    });

    it('should fetch from database and cache when not in cache', async () => {
      const fundId = '123e4567-e89b-12d3-a456-426614174002';
      const dbFund = {
        id: fundId,
        symbol: 'TESTFUND',
        name: 'Test Mutual Fund'
      };

      mockRedis.get.mockResolvedValue(null);
      mockPool.query.mockResolvedValue({ rows: [dbFund] });
      mockRedis.setex.mockResolvedValue('OK');

      const result = await service.getMutualFundById(fundId);

      expect(result).toEqual(dbFund);
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('SELECT mf.*, ff.name as fund_family_name'),
        [fundId]
      );
      expect(mockRedis.setex).toHaveBeenCalled();
    });

    it('should return null when fund not found', async () => {
      const fundId = '123e4567-e89b-12d3-a456-426614174002';

      mockRedis.get.mockResolvedValue(null);
      mockPool.query.mockResolvedValue({ rows: [] });

      const result = await service.getMutualFundById(fundId);

      expect(result).toBeNull();
    });
  });

  describe('updateMutualFund', () => {
    it('should update fund successfully', async () => {
      const fundId = '123e4567-e89b-12d3-a456-426614174002';
      const updates = {
        name: 'Updated Fund Name',
        expense_ratio: 0.004
      };
      const updatedFund = {
        id: fundId,
        symbol: 'TESTFUND',
        name: 'Updated Fund Name',
        expense_ratio: 0.004
      };

      mockPool.query.mockResolvedValue({ rows: [updatedFund] });
      mockRedis.del.mockResolvedValue(1);

      const result = await service.updateMutualFund(fundId, updates);

      expect(result).toEqual(updatedFund);
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE mutual_funds SET'),
        expect.arrayContaining([fundId])
      );
      expect(mockRedis.del).toHaveBeenCalledWith('fund_catalog:all');
      expect(mockRedis.del).toHaveBeenCalledWith(`fund_catalog:detail:${fundId}`);
    });

    it('should throw error when fund not found', async () => {
      const fundId = '123e4567-e89b-12d3-a456-426614174002';
      const updates = { name: 'Updated Fund Name' };

      mockPool.query.mockResolvedValue({ rows: [] });

      await expect(service.updateMutualFund(fundId, updates)).rejects.toThrow('Mutual fund not found');
    });
  });

  describe('deleteMutualFund', () => {
    it('should delete fund successfully', async () => {
      const fundId = '123e4567-e89b-12d3-a456-426614174002';

      mockPool.query.mockResolvedValue({ rowCount: 1 });
      mockRedis.del.mockResolvedValue(1);

      const result = await service.deleteMutualFund(fundId);

      expect(result).toEqual({ message: 'Mutual fund deleted successfully.' });
      expect(mockPool.query).toHaveBeenCalledWith(
        'DELETE FROM mutual_funds WHERE id = $1',
        [fundId]
      );
      expect(mockRedis.del).toHaveBeenCalledWith('fund_catalog:all');
      expect(mockRedis.del).toHaveBeenCalledWith(`fund_catalog:detail:${fundId}`);
    });

    it('should throw error when fund not found', async () => {
      const fundId = '123e4567-e89b-12d3-a456-426614174002';

      mockPool.query.mockResolvedValue({ rowCount: 0 });

      await expect(service.deleteMutualFund(fundId)).rejects.toThrow('Mutual fund not found');
    });
  });

  describe('clearFundCache', () => {
    it('should clear all fund cache when no fundId provided', async () => {
      mockRedis.del.mockResolvedValue(1);

      await service.clearFundCache();

      expect(mockRedis.del).toHaveBeenCalledWith('fund_catalog:all');
    });

    it('should clear specific fund cache when fundId provided', async () => {
      const fundId = '123e4567-e89b-12d3-a456-426614174002';
      mockRedis.del.mockResolvedValue(1);

      await service.clearFundCache(fundId);

      expect(mockRedis.del).toHaveBeenCalledWith('fund_catalog:all');
      expect(mockRedis.del).toHaveBeenCalledWith(`fund_catalog:detail:${fundId}`);
    });
  });
});
