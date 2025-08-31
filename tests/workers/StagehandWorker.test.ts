import { StagehandWorker, WorkerInstance, WorkerStatus } from '../../src/workers/StagehandWorker';
import { MockAutomation, createMockAutomationFactory } from '../../src/mocks/MockAutomation';
import { Repository } from 'typeorm';
import { Task } from '../../src/database/entities/Task.entity';
import { Agent } from '../../src/database/entities/Agent.entity';
import { Lead } from '../../src/database/entities/Lead.entity';
import { SessionManager } from '../../src/services/SessionManager';

// Mock dependencies
jest.mock('../../src/utils/Logger');

describe('StagehandWorker', () => {
  let stagehandWorker: StagehandWorker;
  let mockTaskRepo: jest.Mocked<Repository<Task>>;
  let mockAgentRepo: jest.Mocked<Repository<Agent>>;
  let mockLeadRepo: jest.Mocked<Repository<Lead>>;
  let mockSessionManager: jest.Mocked<SessionManager>;

  beforeEach(() => {
    // Create mock repositories
    mockTaskRepo = {
      create: jest.fn(),
      save: jest.fn(),
      findOne: jest.fn(),
    } as any;

    mockAgentRepo = {
      findOne: jest.fn(),
    } as any;

    mockLeadRepo = {
      create: jest.fn(),
      save: jest.fn(),
      findOne: jest.fn(),
    } as any;

    mockSessionManager = {} as any;

    // Create worker with mock automation factory
    const automationFactory = createMockAutomationFactory({
      searchDelay: 100,
      failureRate: 0,
      postsPerSearch: 3
    });

    stagehandWorker = new StagehandWorker(
      mockTaskRepo,
      mockAgentRepo,
      mockLeadRepo,
      mockSessionManager,
      automationFactory,
      3 // Pool size of 3 for testing
    );
  });

  describe('WorkerInstance', () => {
    it('should initialize and execute tasks', async () => {
      const worker = new WorkerInstance('test-worker');
      const mockAutomation = new MockAutomation('test');
      
      await worker.initialize(mockAutomation);
      expect(worker.status).toBe(WorkerStatus.IDLE);

      const mockTask = { id: 'task-1' } as Task;
      const keywords = ['automation', 'testing'];

      const posts = await worker.execute(mockTask, keywords);
      
      expect(posts).toBeDefined();
      expect(posts.length).toBeGreaterThan(0);
      expect(worker.completedTasks).toBe(1);
      expect(worker.status).toBe(WorkerStatus.IDLE);
    });

    it('should handle task failures', async () => {
      const worker = new WorkerInstance('test-worker');
      const mockAutomation = new MockAutomation('test');
      mockAutomation.setConfig({ failureRate: 1.0 }); // Always fail
      
      await worker.initialize(mockAutomation);

      const mockTask = { id: 'task-1' } as Task;
      const keywords = ['test'];

      await expect(worker.execute(mockTask, keywords)).rejects.toThrow();
      expect(worker.failedTasks).toBe(1);
      expect(worker.status).toBe(WorkerStatus.ERROR);
    });

    it('should calculate statistics correctly', async () => {
      const worker = new WorkerInstance('test-worker');
      const mockAutomation = new MockAutomation('test');
      
      await worker.initialize(mockAutomation);

      const stats = worker.getStats();
      
      expect(stats.id).toBe('test-worker');
      expect(stats.status).toBe(WorkerStatus.IDLE);
      expect(stats.completedTasks).toBe(0);
      expect(stats.failedTasks).toBe(0);
      expect(stats.successRate).toBe(0);
    });
  });

  describe('StagehandWorker Pool Management', () => {
    it('should initialize worker pool', async () => {
      await stagehandWorker.initialize();
      
      const stats = stagehandWorker.getPoolStats();
      expect(stats.poolSize).toBe(3);
      expect(stats.availableWorkers).toBe(3);
      expect(stats.busyWorkers).toBe(0);
    });

    it('should process lead discovery task', async () => {
      await stagehandWorker.initialize();

      const mockAgent = {
        id: 'agent-1',
        keywords: ['automation', 'workflow']
      } as Agent;

      const mockTask = {
        id: 'task-1',
        agentId: 'agent-1',
        type: 'lead_discovery',
        status: 'pending',
        attempts: 0,
        maxAttempts: 3
      } as Task;

      mockAgentRepo.findOne.mockResolvedValue(mockAgent);
      mockTaskRepo.create.mockReturnValue(mockTask);
      mockTaskRepo.save.mockResolvedValue(mockTask);
      mockLeadRepo.findOne.mockResolvedValue(null); // No existing leads
      mockLeadRepo.create.mockImplementation((data) => ({ ...data, id: 'lead-' + Date.now() } as Lead));
      mockLeadRepo.save.mockImplementation((lead) => Promise.resolve(lead));

      await stagehandWorker.processLeadDiscovery('agent-1', ['automation', 'workflow']);

      expect(mockTaskRepo.create).toHaveBeenCalled();
      expect(mockTaskRepo.save).toHaveBeenCalled();
      
      const stats = stagehandWorker.getPoolStats();
      expect(stats.metrics.tasksProcessed).toBe(1);
      expect(stats.metrics.tasksSucceeded).toBe(1);
      expect(stats.metrics.leadsDiscovered).toBeGreaterThan(0);
    });

    it('should handle task retries', async () => {
      await stagehandWorker.initialize();

      const mockTask = {
        id: 'task-1',
        agentId: 'agent-1',
        type: 'lead_discovery',
        status: 'pending',
        attempts: 0,
        maxAttempts: 3,
        data: { keywords: ['test'] }
      } as Task;

      const mockAgent = {
        id: 'agent-1',
        keywords: ['test']
      } as Agent;

      mockAgentRepo.findOne
        .mockRejectedValueOnce(new Error('First attempt failed'))
        .mockRejectedValueOnce(new Error('Second attempt failed'))
        .mockResolvedValueOnce(mockAgent);

      mockTaskRepo.create.mockReturnValue(mockTask);
      mockTaskRepo.save.mockResolvedValue(mockTask);
      mockLeadRepo.findOne.mockResolvedValue(null);
      mockLeadRepo.create.mockImplementation((data) => ({ ...data, id: 'lead-' + Date.now() } as Lead));
      mockLeadRepo.save.mockImplementation((lead) => Promise.resolve(lead));

      await stagehandWorker.executeWithRetry(mockTask);

      expect(mockAgentRepo.findOne).toHaveBeenCalledTimes(3);
    });

    it('should scale pool up and down', async () => {
      await stagehandWorker.initialize();
      
      let stats = stagehandWorker.getPoolStats();
      expect(stats.poolSize).toBe(3);

      // Scale up
      await stagehandWorker.scalePool(5);
      stats = stagehandWorker.getPoolStats();
      expect(stats.poolSize).toBe(5);
      expect(stats.availableWorkers).toBe(5);

      // Scale down
      await stagehandWorker.scalePool(2);
      stats = stagehandWorker.getPoolStats();
      expect(stats.poolSize).toBe(2);
      expect(stats.availableWorkers).toBe(2);
    });

    it('should categorize posts correctly', async () => {
      await stagehandWorker.initialize();

      const mockAgent = {
        id: 'agent-1',
        keywords: ['automation']
      } as Agent;

      mockAgentRepo.findOne.mockResolvedValue(mockAgent);
      mockTaskRepo.create.mockReturnValue({} as Task);
      mockTaskRepo.save.mockResolvedValue({ 
        id: 'task-1',
        status: 'pending'
      } as Task);
      
      mockLeadRepo.findOne.mockResolvedValue(null);
      
      const savedLeads: Lead[] = [];
      mockLeadRepo.create.mockImplementation((data) => ({ ...data, id: 'lead-' + Date.now() } as Lead));
      mockLeadRepo.save.mockImplementation((lead) => {
        savedLeads.push(lead);
        return Promise.resolve(lead);
      });

      // Configure mock to return specific post types
      const automationFactory = () => {
        const automation = new MockAutomation();
        automation.setConfig({ 
          failureRate: 0,
          postsPerSearch: 4 
        });
        return automation;
      };

      const worker = new StagehandWorker(
        mockTaskRepo,
        mockAgentRepo,
        mockLeadRepo,
        mockSessionManager,
        automationFactory,
        1
      );

      await worker.initialize();
      await worker.processLeadDiscovery('agent-1', ['problem', 'help', 'how to', 'competitor']);

      // Check that leads were categorized
      expect(savedLeads.length).toBeGreaterThan(0);
      
      const categories = savedLeads.map(l => l.category);
      expect(categories).toContain('problem');
      expect(categories).toContain('question');
    });

    it('should calculate match scores', async () => {
      await stagehandWorker.initialize();

      const mockAgent = {
        id: 'agent-1',
        keywords: ['automation', 'workflow']
      } as Agent;

      mockAgentRepo.findOne.mockResolvedValue(mockAgent);
      mockTaskRepo.create.mockReturnValue({} as Task);
      mockTaskRepo.save.mockResolvedValue({ 
        id: 'task-1',
        status: 'pending'
      } as Task);
      
      mockLeadRepo.findOne.mockResolvedValue(null);
      
      const savedLeads: Lead[] = [];
      mockLeadRepo.create.mockImplementation((data) => ({ ...data, id: 'lead-' + Date.now() } as Lead));
      mockLeadRepo.save.mockImplementation((lead) => {
        savedLeads.push(lead);
        return Promise.resolve(lead);
      });

      await stagehandWorker.processLeadDiscovery('agent-1', ['automation', 'workflow']);

      // Check that match scores were calculated
      expect(savedLeads.length).toBeGreaterThan(0);
      savedLeads.forEach(lead => {
        expect(lead.matchScore).toBeGreaterThanOrEqual(0);
        expect(lead.matchScore).toBeLessThanOrEqual(1);
      });
    });

    it('should gracefully shutdown', async () => {
      await stagehandWorker.initialize();
      
      let stats = stagehandWorker.getPoolStats();
      expect(stats.poolSize).toBe(3);

      await stagehandWorker.shutdown();
      
      stats = stagehandWorker.getPoolStats();
      expect(stats.poolSize).toBe(0);
    });
  });

  describe('Pool Utilization and Metrics', () => {
    it('should track pool utilization', async () => {
      await stagehandWorker.initialize();

      const initialStats = stagehandWorker.getPoolStats();
      expect(initialStats.metrics.poolUtilization).toBe(0);

      // Start multiple tasks to increase utilization
      const promises = [];
      for (let i = 0; i < 3; i++) {
        const mockAgent = {
          id: `agent-${i}`,
          keywords: ['test']
        } as Agent;

        mockAgentRepo.findOne.mockResolvedValue(mockAgent);
        mockTaskRepo.create.mockReturnValue({} as Task);
        mockTaskRepo.save.mockResolvedValue({ 
          id: `task-${i}`,
          status: 'pending'
        } as Task);
        mockLeadRepo.findOne.mockResolvedValue(null);
        mockLeadRepo.create.mockImplementation((data) => ({ ...data } as Lead));
        mockLeadRepo.save.mockImplementation((lead) => Promise.resolve(lead));

        promises.push(
          stagehandWorker.processLeadDiscovery(`agent-${i}`, ['test'])
        );
      }

      // Wait for all tasks to complete
      await Promise.all(promises);

      const finalStats = stagehandWorker.getPoolStats();
      expect(finalStats.metrics.tasksProcessed).toBe(3);
      expect(finalStats.metrics.averageTaskTime).toBeGreaterThan(0);
    });

    it('should handle concurrent task processing', async () => {
      // Create worker with longer delays to test concurrency
      const automationFactory = createMockAutomationFactory({
        searchDelay: 200,
        failureRate: 0,
        postsPerSearch: 2
      });

      const worker = new StagehandWorker(
        mockTaskRepo,
        mockAgentRepo,
        mockLeadRepo,
        mockSessionManager,
        automationFactory,
        2 // Pool size of 2
      );

      await worker.initialize();

      // Setup mocks
      mockAgentRepo.findOne.mockResolvedValue({
        id: 'agent-1',
        keywords: ['test']
      } as Agent);
      mockTaskRepo.create.mockImplementation(() => ({} as Task));
      mockTaskRepo.save.mockImplementation((task) => Promise.resolve(task));
      mockLeadRepo.findOne.mockResolvedValue(null);
      mockLeadRepo.create.mockImplementation((data) => ({ ...data } as Lead));
      mockLeadRepo.save.mockImplementation((lead) => Promise.resolve(lead));

      // Start 3 tasks with pool size of 2
      const startTime = Date.now();
      const promises = [];
      
      for (let i = 0; i < 3; i++) {
        promises.push(
          worker.processLeadDiscovery('agent-1', ['test'])
        );
      }

      await Promise.all(promises);
      const elapsed = Date.now() - startTime;

      // With pool of 2, 3 tasks should take ~2x the time of a single task
      // (2 run in parallel, then 1 more)
      expect(elapsed).toBeGreaterThan(400); // At least 2 rounds
      expect(elapsed).toBeLessThan(1000); // But not 3x sequential

      const stats = worker.getPoolStats();
      expect(stats.metrics.tasksProcessed).toBe(3);

      await worker.shutdown();
    });
  });
});