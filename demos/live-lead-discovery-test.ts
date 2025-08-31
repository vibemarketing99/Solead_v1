#!/usr/bin/env node

/**
 * Live Lead Discovery Test
 * Real-world validation of enhanced Threads automation system
 */

import 'dotenv/config';
import { EnhancedThreadsAgent, SearchOptions } from '../src/agents/EnhancedThreadsAgent';
import { DataPersistenceService } from '../src/services/DataPersistenceService';
import { ComplianceMonitoringService } from '../src/services/ComplianceMonitoringService';
import { Logger } from '../src/utils/Logger';

const logger = new Logger('LiveLeadDiscoveryTest');

interface LiveTestConfig {
  searchTerms: {
    category: string;
    keywords: string[];
    expectedLeadTypes: string[];
  }[];
  testSettings: {
    maxResults: number;
    searchDepth: 'shallow' | 'standard' | 'deep';
    enableScreenshots: boolean;
    enableCaching: boolean;
    runTime: number; // minutes
  };
}

interface LeadDiscoveryResult {
  category: string;
  keywords: string[];
  totalFound: number;
  qualifiedLeads: number;
  hotLeads: number;
  mediumLeads: number;
  coldLeads: number;
  averageScore: number;
  topLeads: Array<{
    author: string;
    text: string;
    score: number;
    category: string;
    metrics: any;
  }>;
  searchTime: number;
  cached: boolean;
}

class LiveLeadDiscoveryTester {
  private agent: EnhancedThreadsAgent | null = null;
  private dataService: DataPersistenceService | null = null;
  private complianceService: ComplianceMonitoringService | null = null;
  private testResults: LeadDiscoveryResult[] = [];

  constructor() {
    console.log('\n🔍 Solead Live Lead Discovery Test');
    console.log('🎯 Testing real Threads automation with target search terms\n');
  }

  /**
   * Run comprehensive live test
   */
  async runLiveTest(): Promise<void> {
    const testConfig: LiveTestConfig = {
      searchTerms: [
        {
          category: 'SaaS & Automation',
          keywords: ['automation tools', 'workflow software', 'productivity apps'],
          expectedLeadTypes: ['businesses seeking efficiency', 'developers', 'entrepreneurs']
        },
        {
          category: 'Marketing & Growth',
          keywords: ['lead generation', 'marketing automation', 'customer acquisition'],
          expectedLeadTypes: ['marketers', 'agencies', 'startups']
        },
        {
          category: 'AI & Technology',
          keywords: ['artificial intelligence', 'machine learning', 'AI tools'],
          expectedLeadTypes: ['tech companies', 'data scientists', 'innovators']
        },
        {
          category: 'Business Operations',
          keywords: ['business process', 'operational efficiency', 'team productivity'],
          expectedLeadTypes: ['operations managers', 'consultants', 'executives']
        }
      ],
      testSettings: {
        maxResults: 20,
        searchDepth: 'standard',
        enableScreenshots: true,
        enableCaching: true,
        runTime: 15 // 15 minutes total test
      }
    };

    try {
      await this.initializeServices();
      await this.runSearchTests(testConfig);
      await this.generateLiveReport();
    } catch (error) {
      logger.error('Live test failed', error as Error);
      console.error('❌ Live test encountered an error:', error);
    } finally {
      await this.cleanup();
    }
  }

  /**
   * Initialize all services
   */
  private async initializeServices(): Promise<void> {
    console.log('🚀 Initializing Enhanced Solead System...\n');

    // Initialize compliance monitoring first
    console.log('⚖️ Setting up compliance monitoring...');
    this.complianceService = new ComplianceMonitoringService({
      maxConcurrentSessions: 1,
      minDelayBetweenRequests: 3000, // Conservative for live test
      respectRobotsTxt: true,
      ethicalGuidelines: {
        respectPrivacy: true,
        noPersonalDataCollection: true,
        honorOptOuts: true,
        transparentDataUsage: true
      }
    }, {
      requestsPerMinute: 15, // Conservative rate limiting
      requestsPerHour: 200,
      requestsPerDay: 1000
    });

    // Initialize data persistence
    console.log('💾 Setting up data persistence...');
    this.dataService = new DataPersistenceService();

    // Initialize enhanced agent
    console.log('🤖 Initializing Enhanced Threads Agent...');
    this.agent = new EnhancedThreadsAgent({
      headless: false, // Show browser for demonstration
      env: 'BROWSERBASE',
      caching: {
        enabled: true,
        ttl: 300000, // 5 minutes
        maxSize: 500
      },
      antiDetection: {
        enabled: true,
        rotateViewport: true,
        randomDelays: true,
        mouseMovements: true,
        scrollPatterns: true
      },
      monitoring: {
        captureScreenshots: true,
        logMetrics: true,
        detectBlocking: true
      },
      humanization: {
        delays: {
          betweenActions: [3000, 7000], // Conservative delays
          betweenSearches: [10000, 20000],
          typing: [100, 300],
          scrolling: [2000, 5000]
        },
        patterns: {
          scrollBehavior: 'natural',
          clickAccuracy: 0.95,
          typingSpeed: 'variable'
        }
      }
    });

    await this.agent.initialize();
    
    const health = await this.agent.healthCheck();
    if (!health.healthy) {
      throw new Error(`Agent not healthy: ${health.issues.join(', ')}`);
    }

    console.log('✅ All services initialized successfully!\n');
    console.log('🌐 Browser session:', this.agent.isActive() ? 'ACTIVE' : 'INACTIVE');
    console.log('📊 System ready for lead discovery\n');
  }

  /**
   * Run search tests for each category
   */
  private async runSearchTests(config: LiveTestConfig): Promise<void> {
    console.log('🔍 Starting Live Lead Discovery Tests\n');
    console.log('═'.repeat(60));

    for (let i = 0; i < config.searchTerms.length; i++) {
      const searchTest = config.searchTerms[i];
      
      console.log(`\n📋 Test ${i + 1}/${config.searchTerms.length}: ${searchTest.category}`);
      console.log(`🔑 Keywords: ${searchTest.keywords.join(', ')}`);
      console.log(`🎯 Expected: ${searchTest.expectedLeadTypes.join(', ')}`);
      console.log('─'.repeat(50));

      try {
        // Check compliance before search
        if (this.complianceService) {
          const compliance = await this.complianceService.validateCompliance(
            'live-test-agent',
            'search'
          );
          
          if (!compliance.compliant) {
            console.log('⚠️ Compliance issues detected:', compliance.issues.join(', '));
            console.log('📋 Recommendations:', compliance.recommendations.join(', '));
            
            // Apply recommended delay
            const delay = this.complianceService.getRecommendedDelay('live-test-agent');
            console.log(`⏳ Applying compliance delay: ${delay}ms`);
            await new Promise(resolve => setTimeout(resolve, delay));
          }
        }

        // Execute search
        const searchResult = await this.executeSearch(searchTest, config.testSettings);
        this.testResults.push(searchResult);

        // Display immediate results
        this.displaySearchResult(searchResult);

        // Record compliance metrics
        if (this.complianceService) {
          await this.complianceService.recordRequestCompletion(
            'live-test-agent',
            'live-test-session',
            searchResult.totalFound > 0,
            searchResult.searchTime
          );
        }

        // Pause between searches (compliance)
        if (i < config.searchTerms.length - 1) {
          const pauseTime = 8000 + Math.random() * 7000; // 8-15 seconds
          console.log(`\n⏸️ Pausing ${Math.round(pauseTime/1000)}s before next search (compliance)...`);
          await new Promise(resolve => setTimeout(resolve, pauseTime));
        }

      } catch (error) {
        logger.error(`Search test ${i + 1} failed`, error as Error);
        console.log(`❌ Search failed: ${(error as Error).message}`);
        
        // Add failed result
        this.testResults.push({
          category: searchTest.category,
          keywords: searchTest.keywords,
          totalFound: 0,
          qualifiedLeads: 0,
          hotLeads: 0,
          mediumLeads: 0,
          coldLeads: 0,
          averageScore: 0,
          topLeads: [],
          searchTime: 0,
          cached: false
        });
      }
    }
  }

  /**
   * Execute individual search test
   */
  private async executeSearch(
    searchTest: { category: string; keywords: string[]; expectedLeadTypes: string[] },
    settings: any
  ): Promise<LeadDiscoveryResult> {
    const startTime = Date.now();
    
    if (!this.agent || !this.dataService) {
      throw new Error('Services not initialized');
    }

    // Check cache first
    let posts: any[] = [];
    let cached = false;

    const cacheKey = searchTest.keywords.join(' ');
    const cachedResults = await this.dataService.getCachedSearchResults(
      cacheKey,
      searchTest.keywords
    );

    if (cachedResults && cachedResults.results.length > 0) {
      console.log('💾 Using cached results');
      posts = cachedResults.results;
      cached = true;
    } else {
      console.log('🔍 Performing live search...');
      
      // Build search options
      const searchOptions: SearchOptions = {
        keywords: searchTest.keywords,
        maxResults: settings.maxResults,
        searchDepth: settings.searchDepth,
        timeRange: 'week',
        sortBy: 'relevant',
        includeReplies: false
      };

      // Execute live search
      posts = await this.agent.searchPosts(searchOptions);
      
      // Cache results
      if (settings.enableCaching && posts.length > 0) {
        await this.dataService.cacheSearchResults(
          cacheKey,
          searchTest.keywords,
          posts,
          searchOptions
        );
      }
    }

    const searchTime = Date.now() - startTime;

    // Analyze results
    const qualifiedLeads = posts.filter(p => p.enhanced?.leadScore > 0.4).length;
    const hotLeads = posts.filter(p => p.enhanced?.category === 'hot').length;
    const mediumLeads = posts.filter(p => p.enhanced?.category === 'medium').length;
    const coldLeads = posts.filter(p => p.enhanced?.category === 'cold').length;
    
    const averageScore = posts.length > 0 ? 
      posts.reduce((sum, p) => sum + (p.enhanced?.leadScore || 0), 0) / posts.length : 0;

    // Get top 5 leads
    const topLeads = posts
      .sort((a, b) => (b.enhanced?.leadScore || 0) - (a.enhanced?.leadScore || 0))
      .slice(0, 5)
      .map(post => ({
        author: post.author?.handle || 'unknown',
        text: (post.text || '').substring(0, 100) + '...',
        score: post.enhanced?.leadScore || 0,
        category: post.enhanced?.category || 'unknown',
        metrics: post.metrics || {}
      }));

    return {
      category: searchTest.category,
      keywords: searchTest.keywords,
      totalFound: posts.length,
      qualifiedLeads,
      hotLeads,
      mediumLeads,
      coldLeads,
      averageScore,
      topLeads,
      searchTime,
      cached
    };
  }

  /**
   * Display individual search result
   */
  private displaySearchResult(result: LeadDiscoveryResult): void {
    const cacheIcon = result.cached ? '💾' : '🔍';
    const timeDisplay = result.cached ? '<1s (cached)' : `${Math.round(result.searchTime/1000)}s`;
    
    console.log(`\n${cacheIcon} Results (${timeDisplay}):`);
    console.log(`   📊 Total Found: ${result.totalFound}`);
    console.log(`   ✅ Qualified: ${result.qualifiedLeads} (score > 0.4)`);
    console.log(`   🔥 Hot: ${result.hotLeads} | 🟡 Medium: ${result.mediumLeads} | ❄️ Cold: ${result.coldLeads}`);
    console.log(`   📈 Avg Score: ${(result.averageScore * 100).toFixed(1)}%`);

    if (result.topLeads.length > 0) {
      console.log('\n   🎯 Top Leads:');
      result.topLeads.forEach((lead, i) => {
        const scoreDisplay = (lead.score * 100).toFixed(0);
        const categoryIcon = lead.category === 'hot' ? '🔥' : lead.category === 'medium' ? '🟡' : '❄️';
        console.log(`   ${i+1}. ${categoryIcon} @${lead.author} (${scoreDisplay}%): "${lead.text}"`);
      });
    }
  }

  /**
   * Generate comprehensive live test report
   */
  private async generateLiveReport(): Promise<void> {
    console.log('\n\n📊 LIVE LEAD DISCOVERY TEST RESULTS');
    console.log('═'.repeat(60));

    const totalLeads = this.testResults.reduce((sum, r) => sum + r.totalFound, 0);
    const totalQualified = this.testResults.reduce((sum, r) => sum + r.qualifiedLeads, 0);
    const totalHot = this.testResults.reduce((sum, r) => sum + r.hotLeads, 0);
    const totalMedium = this.testResults.reduce((sum, r) => sum + r.mediumLeads, 0);
    const totalSearchTime = this.testResults.reduce((sum, r) => sum + r.searchTime, 0);
    const cacheHits = this.testResults.filter(r => r.cached).length;

    console.log(`\n🎯 OVERALL PERFORMANCE:`);
    console.log(`   📋 Search Categories: ${this.testResults.length}`);
    console.log(`   📊 Total Leads Found: ${totalLeads}`);
    console.log(`   ✅ Qualified Leads: ${totalQualified} (${((totalQualified/Math.max(totalLeads,1)) * 100).toFixed(1)}%)`);
    console.log(`   🔥 Hot Leads: ${totalHot}`);
    console.log(`   🟡 Medium Leads: ${totalMedium}`);
    console.log(`   ⏱️ Total Search Time: ${Math.round(totalSearchTime/1000)}s`);
    console.log(`   💾 Cache Hit Rate: ${cacheHits}/${this.testResults.length} (${((cacheHits/this.testResults.length) * 100).toFixed(0)}%)`);

    console.log(`\n📈 CATEGORY BREAKDOWN:`);
    this.testResults.forEach((result, i) => {
      const qualificationRate = (result.qualifiedLeads / Math.max(result.totalFound, 1)) * 100;
      console.log(`   ${i+1}. ${result.category}: ${result.totalFound} leads, ${result.qualifiedLeads} qualified (${qualificationRate.toFixed(0)}%)`);
    });

    // System performance
    if (this.agent && this.complianceService) {
      console.log(`\n🔧 SYSTEM PERFORMANCE:`);
      const agentMetrics = this.agent.getMetrics();
      const complianceMetrics = this.complianceService.getMetrics();
      const cacheStats = this.agent.getCacheStats();

      console.log(`   🤖 Agent Success Rate: ${(agentMetrics.successRate * 100).toFixed(1)}%`);
      console.log(`   ⚖️ Compliance Status: ${complianceMetrics.complianceViolations} violations`);
      console.log(`   💾 Cache Efficiency: ${cacheStats.size}/${cacheStats.maxSize} entries`);
      console.log(`   🛡️ Anti-Detection: Active (viewport rotation, delays, human patterns)`);
    }

    // Business insights
    console.log(`\n💡 BUSINESS INSIGHTS:`);
    const bestCategory = this.testResults.reduce((best, current) => 
      current.hotLeads > best.hotLeads ? current : best, this.testResults[0]);
    
    if (bestCategory) {
      console.log(`   🎯 Best Category: ${bestCategory.category} (${bestCategory.hotLeads} hot leads)`);
      console.log(`   🔑 Best Keywords: ${bestCategory.keywords.join(', ')}`);
    }

    const avgScore = this.testResults.reduce((sum, r) => sum + r.averageScore, 0) / this.testResults.length;
    console.log(`   📊 Overall Lead Quality: ${(avgScore * 100).toFixed(1)}% average score`);

    // Recommendations
    console.log(`\n📋 RECOMMENDATIONS:`);
    if (totalHot > 0) {
      console.log(`   ✅ System is discovering high-quality leads successfully`);
      console.log(`   🎯 Focus on categories with highest hot lead conversion`);
    }
    if (cacheHits > 0) {
      console.log(`   💾 Caching is working - repeat searches are instant`);
    }
    if (totalQualified / Math.max(totalLeads, 1) > 0.3) {
      console.log(`   🎉 Lead qualification rate is excellent (>30%)`);
    }
    
    console.log(`\n🚀 PRODUCTION READINESS: ${this.assessProductionReadiness()}`);
  }

  /**
   * Assess if system is ready for production
   */
  private assessProductionReadiness(): string {
    const totalLeads = this.testResults.reduce((sum, r) => sum + r.totalFound, 0);
    const totalQualified = this.testResults.reduce((sum, r) => sum + r.qualifiedLeads, 0);
    const qualificationRate = totalQualified / Math.max(totalLeads, 1);

    if (totalLeads === 0) return "❌ NOT READY - No leads discovered";
    if (qualificationRate < 0.1) return "⚠️ NEEDS WORK - Low qualification rate";
    if (qualificationRate < 0.3) return "🟡 ALMOST READY - Good performance, minor optimizations needed";
    return "✅ PRODUCTION READY - Excellent performance!";
  }

  /**
   * Cleanup resources
   */
  private async cleanup(): Promise<void> {
    console.log('\n🧹 Cleaning up resources...');
    
    if (this.agent) {
      await this.agent.cleanup();
      console.log('✅ Enhanced agent cleaned up');
    }
    
    if (this.dataService) {
      await this.dataService.close();
      console.log('✅ Data service closed');
    }

    console.log('✅ Live test cleanup completed');
  }
}

// Main execution
async function main() {
  const tester = new LiveLeadDiscoveryTester();
  
  console.log('🔑 Environment Check:');
  console.log(`   BROWSERBASE_API_KEY: ${process.env.BROWSERBASE_API_KEY ? 'SET' : 'MISSING'}`);
  console.log(`   OPENAI_API_KEY: ${process.env.OPENAI_API_KEY ? 'SET' : 'MISSING'}`);
  console.log(`   REDIS_URL: ${process.env.REDIS_URL || 'Using default'}`);
  
  if (!process.env.BROWSERBASE_API_KEY || !process.env.OPENAI_API_KEY) {
    console.error('\n❌ Missing required environment variables');
    console.log('Please ensure BROWSERBASE_API_KEY and OPENAI_API_KEY are set');
    process.exit(1);
  }

  await tester.runLiveTest();
}

// Error handling
main().catch((error) => {
  console.error('\n💥 Live test failed:', error);
  process.exit(1);
});