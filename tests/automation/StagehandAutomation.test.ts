import { StagehandAutomation } from '../../src/automation/StagehandAutomation';
import { HumanizationProfile } from '../../src/automation/HumanizationProfile';
import { PlaywrightFallback } from '../../src/automation/PlaywrightFallback';
import { StagehandConfig } from '../../src/types/stagehand';

// Mock the dependencies
jest.mock('@browserbasehq/stagehand');
jest.mock('../../src/automation/HumanizationProfile');
jest.mock('../../src/automation/PlaywrightFallback');
jest.mock('../../src/utils/Logger');

describe('StagehandAutomation', () => {
  let automation: StagehandAutomation;
  let mockConfig: StagehandConfig;
  let mockSessionCookies: string;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();

    // Setup test configuration
    mockConfig = {
      env: 'BROWSERBASE',
      headless: false,
      enableCaching: true,
      modelName: 'gpt-4o-mini',
      modelClientOptions: {
        apiKey: 'test-openai-key',
        maxTokens: 4000,
        temperature: 0.7
      },
      debugMode: false,
      timeout: 30000
    };

    // Mock session cookies
    mockSessionCookies = JSON.stringify([
      {
        name: 'session_token',
        value: 'test-token-123',
        domain: '.threads.net',
        path: '/',
        secure: true,
        httpOnly: true
      }
    ]);

    // Set environment variables
    process.env.BROWSERBASE_API_KEY = 'test-api-key';
    process.env.BROWSERBASE_PROJECT_ID = 'test-project-id';

    // Create instance
    automation = new StagehandAutomation(mockConfig, mockSessionCookies);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('initialize', () => {
    it('should initialize Stagehand successfully', async () => {
      // Mock Stagehand initialization
      const mockStagehand = {
        init: jest.fn().mockResolvedValue(undefined),
        page: {
          setViewportSize: jest.fn().mockResolvedValue(undefined),
          goto: jest.fn().mockResolvedValue(undefined),
          context: () => ({
            addCookies: jest.fn().mockResolvedValue(undefined)
          }),
          reload: jest.fn().mockResolvedValue(undefined),
          extract: jest.fn().mockResolvedValue({
            isLoggedIn: true,
            username: 'testuser',
            hasComposeButton: true,
            hasProfileMenu: true
          })
        }
      };

      // Mock the Stagehand constructor
      const Stagehand = require('@browserbasehq/stagehand').Stagehand;
      Stagehand.mockImplementation(() => mockStagehand);

      // Mock HumanizationProfile
      const mockHumanization = {
        getRandomViewport: jest.fn().mockReturnValue({ width: 1920, height: 1080 })
      };
      (HumanizationProfile as jest.Mock).mockImplementation(() => mockHumanization);

      await automation.initialize();

      expect(Stagehand).toHaveBeenCalledWith({
        env: 'BROWSERBASE',
        apiKey: 'test-api-key',
        projectId: 'test-project-id',
        verbose: false,
        debugDom: false,
        headless: false,
        logger: expect.any(Function),
        domSettleTimeoutMs: 3000
      });

      expect(mockStagehand.init).toHaveBeenCalled();
      expect(mockStagehand.page.goto).toHaveBeenCalledWith('https://www.threads.net', {
        waitUntil: 'networkidle'
      });
    });

    it('should fall back to Playwright when Stagehand fails', async () => {
      // Mock Stagehand to fail
      const Stagehand = require('@browserbasehq/stagehand').Stagehand;
      Stagehand.mockImplementation(() => {
        throw new Error('Stagehand initialization failed');
      });

      // Mock PlaywrightFallback
      const mockFallback = {
        initialize: jest.fn().mockResolvedValue(undefined)
      };
      (PlaywrightFallback as jest.Mock).mockImplementation(() => mockFallback);

      await expect(automation.initialize()).rejects.toThrow('Stagehand initialization failed');
      expect(mockFallback.initialize).toHaveBeenCalled();
    });
  });

  describe('searchAndExtract', () => {
    it('should search and extract posts successfully', async () => {
      const mockPosts = [
        {
          postId: '123',
          author: 'John Doe',
          authorHandle: 'johndoe',
          content: 'Test post content',
          metrics: { likes: 10, replies: 5, reposts: 2, quotes: 1 },
          timestamp: '2024-01-15T10:00:00Z',
          hasQuestion: false,
          hashtags: ['#test'],
          mentions: ['@user'],
          threadUrl: 'https://threads.net/post/123'
        }
      ];

      const mockStagehand = {
        page: {
          act: jest.fn().mockResolvedValue(undefined),
          extract: jest.fn().mockResolvedValue({
            posts: mockPosts,
            nextPageAvailable: false,
            totalFound: 1
          })
        }
      };

      // Mock getStagehandInstance to return our mock
      jest.spyOn(automation, 'getStagehandInstance').mockReturnValue(mockStagehand as any);

      // Mock humanization delays
      const mockHumanization = {
        randomDelay: jest.fn().mockResolvedValue(undefined),
        simulateReading: jest.fn().mockResolvedValue(undefined)
      };
      (HumanizationProfile as jest.Mock).mockImplementation(() => mockHumanization);

      const result = await automation.searchAndExtract(['test', 'keyword'], 50);

      expect(mockStagehand.page.act).toHaveBeenCalledWith('Search for "test OR keyword" on Threads');

      expect(result.posts).toEqual(mockPosts);
      expect(result.totalFound).toBe(1);
    });

    it('should use fallback when Stagehand search fails', async () => {
      const mockStagehand = {
        page: {
          act: jest.fn().mockRejectedValue(new Error('Search failed'))
        }
      };

      jest.spyOn(automation, 'getStagehandInstance').mockReturnValue(mockStagehand as any);

      const mockFallback = {
        searchAndExtract: jest.fn().mockResolvedValue({
          posts: [],
          nextPageAvailable: false,
          totalFound: 0
        })
      };
      (PlaywrightFallback as jest.Mock).mockImplementation(() => mockFallback);

      const result = await automation.searchAndExtract(['test'], 10);

      expect(mockFallback.searchAndExtract).toHaveBeenCalledWith(['test'], 10);
      expect(result.posts).toEqual([]);
    });
  });

  describe('validateSession', () => {
    it('should validate session successfully when logged in', async () => {
      const mockStagehand = {
        page: {
          extract: jest.fn().mockResolvedValue({
            isLoggedIn: true,
            username: 'testuser',
            hasComposeButton: true,
            hasProfileMenu: true
          })
        }
      };

      jest.spyOn(automation, 'getStagehandInstance').mockReturnValue(mockStagehand as any);

      const isValid = await automation.validateSession();

      expect(isValid).toBe(true);
      expect(mockStagehand.page.extract).toHaveBeenCalled();
    });

    it('should return false when session is invalid', async () => {
      const mockStagehand = {
        page: {
          extract: jest.fn().mockResolvedValue({
            isLoggedIn: false,
            username: undefined,
            hasComposeButton: false,
            hasProfileMenu: false
          })
        }
      };

      jest.spyOn(automation, 'getStagehandInstance').mockReturnValue(mockStagehand as any);

      const isValid = await automation.validateSession();

      expect(isValid).toBe(false);
    });
  });

  describe('navigateToPost', () => {
    it('should navigate to a specific post', async () => {
      const mockPost = {
        postId: '456',
        author: 'Jane Smith',
        authorHandle: 'janesmith',
        content: 'Specific post content',
        metrics: { likes: 20, replies: 10, reposts: 5, quotes: 2 },
        timestamp: '2024-01-15T12:00:00Z',
        hasQuestion: true,
        hashtags: [],
        mentions: [],
        threadUrl: 'https://threads.net/post/456'
      };

      const mockStagehand = {
        page: {
          act: jest.fn().mockResolvedValue(undefined),
          extract: jest.fn().mockResolvedValue(mockPost)
        }
      };

      jest.spyOn(automation, 'getStagehandInstance').mockReturnValue(mockStagehand as any);

      const mockHumanization = {
        randomDelay: jest.fn().mockResolvedValue(undefined),
        simulateReading: jest.fn().mockResolvedValue(undefined)
      };
      (HumanizationProfile as jest.Mock).mockImplementation(() => mockHumanization);

      const result = await automation.navigateToPost('https://threads.net/post/456');

      expect(mockStagehand.page.act).toHaveBeenCalledWith('Navigate to the Threads post at https://threads.net/post/456');

      expect(result).toEqual(mockPost);
    });
  });

  describe('browseWithHumanPattern', () => {
    it('should browse with human-like patterns', async () => {
      const mockStagehand = {
        page: {
          act: jest.fn().mockResolvedValue(undefined),
          evaluate: jest.fn().mockResolvedValue(undefined)
        }
      };

      jest.spyOn(automation, 'getStagehandInstance').mockReturnValue(mockStagehand as any);

      const mockHumanization = {
        selectRandomAction: jest.fn()
          .mockReturnValueOnce('scroll')
          .mockReturnValueOnce('read')
          .mockReturnValueOnce('hover'),
        randomDelay: jest.fn().mockResolvedValue(undefined),
        naturalScroll: jest.fn().mockResolvedValue(undefined),
        simulateReading: jest.fn().mockResolvedValue(undefined)
      };
      (HumanizationProfile as jest.Mock).mockImplementation(() => mockHumanization);

      // Use a short duration for testing
      await automation.browseWithHumanPattern(100);

      expect(mockHumanization.selectRandomAction).toHaveBeenCalled();
      expect(mockHumanization.randomDelay).toHaveBeenCalled();
    });
  });

  describe('captureScreenshot', () => {
    it('should capture screenshot successfully', async () => {
      const mockScreenshotBuffer = Buffer.from('screenshot-data');
      
      const mockStagehand = {
        page: {
          screenshot: jest.fn().mockResolvedValue(mockScreenshotBuffer)
        }
      };

      jest.spyOn(automation, 'getStagehandInstance').mockReturnValue(mockStagehand as any);

      const screenshot = await automation.captureScreenshot(true);

      expect(mockStagehand.page.screenshot).toHaveBeenCalledWith({
        fullPage: true,
        type: 'png'
      });

      expect(screenshot).toEqual(mockScreenshotBuffer);
    });
  });

  describe('cleanup', () => {
    it('should cleanup resources properly', async () => {
      const mockStagehand = {
        close: jest.fn().mockResolvedValue(undefined)
      };

      jest.spyOn(automation, 'getStagehandInstance').mockReturnValue(mockStagehand as any);

      const mockFallback = {
        cleanup: jest.fn().mockResolvedValue(undefined)
      };
      (PlaywrightFallback as jest.Mock).mockImplementation(() => mockFallback);

      await automation.cleanup();

      expect(mockStagehand.close).toHaveBeenCalled();
      expect(mockFallback.cleanup).toHaveBeenCalled();
    });
  });

  describe('isUsingFallback', () => {
    it('should return fallback status', () => {
      const mockFallback = {
        isActive: jest.fn().mockReturnValue(true)
      };
      (PlaywrightFallback as jest.Mock).mockImplementation(() => mockFallback);

      const automation = new StagehandAutomation(mockConfig, mockSessionCookies);
      const isFallback = automation.isUsingFallback();

      expect(isFallback).toBe(true);
      expect(mockFallback.isActive).toHaveBeenCalled();
    });
  });
});