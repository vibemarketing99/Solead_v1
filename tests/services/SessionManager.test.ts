import { SessionManager } from '../../src/services/SessionManager';
import { Repository } from 'typeorm';
import { Session } from '../../src/database/entities/Session.entity';
import { Account } from '../../src/database/entities/Account.entity';
import { encryptionService } from '../../src/utils/encryption';

// Mock dependencies
jest.mock('../../src/utils/encryption');
jest.mock('../../src/automation/StagehandAutomation');
jest.mock('../../src/utils/Logger');

describe('SessionManager', () => {
  let sessionManager: SessionManager;
  let mockSessionRepo: jest.Mocked<Repository<Session>>;
  let mockAccountRepo: jest.Mocked<Repository<Account>>;

  beforeEach(() => {
    // Create mock repositories
    mockSessionRepo = {
      create: jest.fn(),
      save: jest.fn(),
      findOne: jest.fn(),
      find: jest.fn(),
      createQueryBuilder: jest.fn(),
    } as any;

    mockAccountRepo = {
      findOne: jest.fn(),
    } as any;

    // Create SessionManager instance
    sessionManager = new SessionManager(mockSessionRepo, mockAccountRepo);

    // Reset mocks
    jest.clearAllMocks();
  });

  describe('createSession', () => {
    it('should create a new session successfully', async () => {
      const mockAccount = {
        id: 'account-123',
        handle: 'testuser',
        displayName: 'Test User',
        status: 'active' as const,
        agents: [],
        createdAt: new Date(),
        updatedAt: new Date()
      } as Account;

      const mockSession = {
        id: 'session-123',
        accountId: 'account-123',
        account: mockAccount,
        encryptedCookies: 'encrypted-data',
        encryptionKeyId: 'default-key-v1',
        userAgent: 'Mozilla/5.0',
        viewport: { width: 1920, height: 1080 },
        healthScore: 1.0,
        failureCount: 0,
        lastActivityAt: new Date(),
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        status: 'active' as const,
        createdAt: new Date(),
        updatedAt: new Date()
      } as Session;

      // Mock account lookup
      mockAccountRepo.findOne.mockResolvedValue(mockAccount);

      // Mock encryption
      (encryptionService.encrypt as jest.Mock).mockReturnValue('encrypted-data');
      (encryptionService.decrypt as jest.Mock).mockReturnValue('decrypted-cookies');

      // Mock session creation
      mockSessionRepo.create.mockReturnValue(mockSession);
      mockSessionRepo.save.mockResolvedValue(mockSession);

      // Mock StagehandAutomation validation
      const StagehandAutomation = require('../../src/automation/StagehandAutomation').StagehandAutomation;
      StagehandAutomation.mockImplementation(() => ({
        initialize: jest.fn().mockResolvedValue(undefined),
        validateSession: jest.fn().mockResolvedValue(true),
        cleanup: jest.fn().mockResolvedValue(undefined)
      }));

      const result = await sessionManager.createSession(
        'account-123',
        'test-cookies',
        'Mozilla/5.0'
      );

      expect(result).toEqual(mockSession);
      expect(mockAccountRepo.findOne).toHaveBeenCalledWith({
        where: { id: 'account-123' }
      });
      expect(encryptionService.encrypt).toHaveBeenCalledWith('test-cookies');
      expect(mockSessionRepo.save).toHaveBeenCalled();
    });

    it('should throw error if account not found', async () => {
      mockAccountRepo.findOne.mockResolvedValue(null);

      await expect(
        sessionManager.createSession('invalid-account', 'cookies')
      ).rejects.toThrow('Account invalid-account not found');
    });

    it('should throw error if validation fails', async () => {
      const mockAccount = { id: 'account-123' } as Account;
      mockAccountRepo.findOne.mockResolvedValue(mockAccount);
      
      (encryptionService.encrypt as jest.Mock).mockReturnValue('encrypted');
      (encryptionService.decrypt as jest.Mock).mockReturnValue('cookies');

      const StagehandAutomation = require('../../src/automation/StagehandAutomation').StagehandAutomation;
      StagehandAutomation.mockImplementation(() => ({
        initialize: jest.fn().mockResolvedValue(undefined),
        validateSession: jest.fn().mockResolvedValue(false),
        cleanup: jest.fn().mockResolvedValue(undefined)
      }));

      mockSessionRepo.create.mockReturnValue({} as Session);

      await expect(
        sessionManager.createSession('account-123', 'invalid-cookies')
      ).rejects.toThrow('Session validation failed');
    });
  });

  describe('getHealthySession', () => {
    it('should return a healthy session', async () => {
      const mockSession = {
        id: 'session-123',
        accountId: 'account-123',
        account: {} as Account,
        encryptedCookies: 'encrypted',
        encryptionKeyId: 'default-key-v1',
        userAgent: 'Mozilla/5.0',
        viewport: { width: 1920, height: 1080 },
        healthScore: 0.8,
        failureCount: 0,
        lastActivityAt: new Date(),
        expiresAt: new Date(Date.now() + 12 * 60 * 60 * 1000),
        status: 'active' as const,
        createdAt: new Date(),
        updatedAt: new Date()
      } as Session;

      const mockQueryBuilder = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        addOrderBy: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(mockSession)
      };

      mockSessionRepo.createQueryBuilder.mockReturnValue(mockQueryBuilder as any);
      mockSessionRepo.save.mockResolvedValue(mockSession);

      const result = await sessionManager.getHealthySession();

      expect(result).toEqual(mockSession);
      expect(mockQueryBuilder.where).toHaveBeenCalledWith(
        'session.status = :status',
        { status: 'active' }
      );
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'session.healthScore >= :minScore',
        { minScore: 0.5 }
      );
    });

    it('should filter by account if specified', async () => {
      const mockQueryBuilder = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        addOrderBy: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(null)
      };

      mockSessionRepo.createQueryBuilder.mockReturnValue(mockQueryBuilder as any);

      await sessionManager.getHealthySession('account-123');

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'account.id = :accountId',
        { accountId: 'account-123' }
      );
    });
  });

  describe('calculateHealthScore', () => {
    it('should calculate health score correctly', async () => {
      const mockSession = {
        id: 'session-123',
        accountId: 'account-123',
        account: {} as Account,
        encryptedCookies: 'encrypted',
        encryptionKeyId: 'default-key-v1',
        userAgent: 'Mozilla/5.0',
        viewport: { width: 1920, height: 1080 },
        healthScore: 1.0,
        failureCount: 1,
        lastActivityAt: new Date(),
        expiresAt: new Date(Date.now() + 12 * 60 * 60 * 1000),
        status: 'active' as const,
        createdAt: new Date(),
        updatedAt: new Date()
      } as Session;

      mockSessionRepo.findOne.mockResolvedValue(mockSession);

      const health = await sessionManager.calculateHealthScore('session-123');

      expect(health.isHealthy).toBe(true);
      expect(health.score).toBeGreaterThan(0.5);
      expect(health.metrics.failureCount).toBe(1);
      // successCount is estimated based on failures
      expect(health.metrics.successCount).toBe(9);
    });

    it('should detect expiring sessions', async () => {
      const mockSession = {
        id: 'session-123',
        accountId: 'account-123',
        account: {} as Account,
        encryptedCookies: 'encrypted',
        encryptionKeyId: 'default-key-v1',
        userAgent: 'Mozilla/5.0',
        viewport: { width: 1920, height: 1080 },
        healthScore: 1.0,
        failureCount: 0,
        lastActivityAt: new Date(),
        expiresAt: new Date(Date.now() + 4 * 60 * 60 * 1000), // 4 hours
        status: 'active' as const,
        createdAt: new Date(),
        updatedAt: new Date()
      } as Session;

      mockSessionRepo.findOne.mockResolvedValue(mockSession);

      const health = await sessionManager.calculateHealthScore('session-123');

      expect(health.issues).toContain('Session expiring soon');
      expect(health.score).toBeLessThan(1.0);
    });

    it('should detect high failure rate', async () => {
      const mockSession = {
        id: 'session-123',
        accountId: 'account-123',
        account: {} as Account,
        encryptedCookies: 'encrypted',
        encryptionKeyId: 'default-key-v1',
        userAgent: 'Mozilla/5.0',
        viewport: { width: 1920, height: 1080 },
        healthScore: 1.0,
        failureCount: 5,
        lastActivityAt: new Date(),
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        status: 'active' as const,
        createdAt: new Date(),
        updatedAt: new Date()
      } as Session;

      mockSessionRepo.findOne.mockResolvedValue(mockSession);

      const health = await sessionManager.calculateHealthScore('session-123');

      expect(health.issues).toContainEqual(expect.stringContaining('High failure rate'));
      expect(health.score).toBeLessThan(0.6);
    });
  });

  describe('validateSession', () => {
    it('should validate session successfully', async () => {
      const mockSession = {
        id: 'session-123',
        accountId: 'account-123',
        account: {} as Account,
        encryptedCookies: 'encrypted',
        encryptionKeyId: 'default-key-v1',
        userAgent: 'Mozilla/5.0',
        viewport: { width: 1920, height: 1080 },
        healthScore: 0.5,
        failureCount: 0,
        lastActivityAt: new Date(),
        expiresAt: new Date(Date.now() + 12 * 60 * 60 * 1000),
        status: 'failed' as const,
        createdAt: new Date(),
        updatedAt: new Date()
      } as Session;

      mockSessionRepo.findOne.mockResolvedValue(mockSession);
      mockSessionRepo.save.mockResolvedValue(mockSession);

      (encryptionService.decrypt as jest.Mock).mockReturnValue('cookies');

      const StagehandAutomation = require('../../src/automation/StagehandAutomation').StagehandAutomation;
      StagehandAutomation.mockImplementation(() => ({
        initialize: jest.fn().mockResolvedValue(undefined),
        validateSession: jest.fn().mockResolvedValue(true),
        cleanup: jest.fn().mockResolvedValue(undefined)
      }));

      const isValid = await sessionManager.validateSession('session-123');

      expect(isValid).toBe(true);
      expect(mockSession.status).toBe('active');
      expect(mockSession.healthScore).toBeGreaterThan(0.5);
    });

    it('should handle validation failure', async () => {
      const mockSession = {
        id: 'session-123',
        accountId: 'account-123',
        account: {} as Account,
        encryptedCookies: 'encrypted',
        encryptionKeyId: 'default-key-v1',
        userAgent: 'Mozilla/5.0',
        viewport: { width: 1920, height: 1080 },
        healthScore: 0.8,
        failureCount: 0,
        lastActivityAt: new Date(),
        expiresAt: new Date(Date.now() + 12 * 60 * 60 * 1000),
        status: 'active' as const,
        createdAt: new Date(),
        updatedAt: new Date()
      } as Session;

      mockSessionRepo.findOne.mockResolvedValue(mockSession);
      mockSessionRepo.save.mockResolvedValue(mockSession);

      (encryptionService.decrypt as jest.Mock).mockReturnValue('cookies');

      const StagehandAutomation = require('../../src/automation/StagehandAutomation').StagehandAutomation;
      StagehandAutomation.mockImplementation(() => ({
        initialize: jest.fn().mockResolvedValue(undefined),
        validateSession: jest.fn().mockResolvedValue(false),
        cleanup: jest.fn().mockResolvedValue(undefined)
      }));

      const isValid = await sessionManager.validateSession('session-123');

      expect(isValid).toBe(false);
      expect(mockSession.status).toBe('failed');
      expect(mockSession.healthScore).toBeLessThan(0.8);
    });
  });

  describe('getStatistics', () => {
    it('should return correct statistics', async () => {
      const mockStats = {
        total: '5',
        active: '4',
        healthy: '3',
        expiringSoon: '1',
        averageHealth: '0.75'
      };

      const mockQueryBuilder = {
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        setParameter: jest.fn().mockReturnThis(),
        getRawOne: jest.fn().mockResolvedValue(mockStats)
      };

      mockSessionRepo.createQueryBuilder.mockReturnValue(mockQueryBuilder as any);

      const stats = await sessionManager.getStatistics();

      expect(stats).toEqual({
        total: 5,
        active: 4,
        healthy: 3,
        expiringSoon: 1,
        averageHealth: 0.75
      });
    });
  });
});