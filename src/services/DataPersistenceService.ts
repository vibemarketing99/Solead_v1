/**
 * Data Persistence Service
 * Intelligent caching, deduplication, and data management for Threads automation
 */

import Redis from 'ioredis';
import { Logger } from '../utils/Logger';
import { AppDataSource } from '../database/config';
import { Lead } from '../database/entities/Lead.entity';
import { Repository } from 'typeorm';

export interface CachedPost {
  id: string;
  url?: string;
  text: string;
  author: {
    handle: string;
    displayName?: string;
    isVerified?: boolean;
    followerCount?: number;
  };
  metrics: {
    likes?: number;
    replies?: number;
    reposts?: number;
    views?: number;
  };
  enhanced: {
    leadScore: number;
    category: 'hot' | 'medium' | 'cold';
    engagement: any;
    analysis: any;
    extractedAt: string;
    searchQuery: string;
  };
  timestamp?: string;
}

export interface SearchCacheEntry {
  query: string;
  keywords: string[];
  results: CachedPost[];
  totalFound: number;
  extractedAt: string;
  ttl: number;
  searchOptions: any;
}

export interface DuplicationCheckResult {
  isDuplicate: boolean;
  existingPostId?: string;
  similarity?: number;
  action: 'skip' | 'update' | 'create';
}

export class DataPersistenceService {
  private redis: Redis;
  private logger: Logger;
  private leadRepo: Repository<Lead>;
  private cacheStats = {
    hits: 0,
    misses: 0,
    sets: 0,
    deletes: 0,
    duplicatesSkipped: 0
  };

  // Cache configuration
  private readonly SEARCH_CACHE_TTL = 15 * 60; // 15 minutes
  private readonly POST_CACHE_TTL = 60 * 60; // 1 hour
  private readonly DEDUP_CACHE_TTL = 7 * 24 * 60 * 60; // 7 days
  private readonly MAX_CACHE_SIZE = 10000;

  constructor() {
    this.logger = new Logger('DataPersistenceService');
    
    // Initialize Redis connection
    this.redis = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PASSWORD,
      maxRetriesPerRequest: 3,
      retryDelayOnFailover: 100,
      lazyConnect: true
    });

    this.leadRepo = AppDataSource.getRepository(Lead);
    this.setupRedisEventHandlers();
  }

  /**
   * Setup Redis connection event handlers
   */
  private setupRedisEventHandlers(): void {
    this.redis.on('connect', () => {
      this.logger.info('Redis connected');
    });

    this.redis.on('error', (err) => {
      this.logger.error('Redis connection error', err);
    });

    this.redis.on('ready', () => {
      this.logger.info('Redis ready for operations');
    });
  }

  /**
   * Cache search results with intelligent deduplication
   */
  async cacheSearchResults(
    searchQuery: string,
    keywords: string[],
    results: CachedPost[],
    searchOptions: any = {}
  ): Promise<void> {
    try {
      // Deduplicate results
      const deduplicatedResults = await this.deduplicateResults(results);
      
      const cacheEntry: SearchCacheEntry = {
        query: searchQuery,
        keywords,
        results: deduplicatedResults,
        totalFound: deduplicatedResults.length,
        extractedAt: new Date().toISOString(),
        ttl: this.SEARCH_CACHE_TTL,
        searchOptions
      };

      const cacheKey = this.generateSearchCacheKey(searchQuery, keywords, searchOptions);
      
      await this.redis.setex(
        cacheKey,
        this.SEARCH_CACHE_TTL,
        JSON.stringify(cacheEntry)
      );

      // Cache individual posts for faster lookups
      await this.cacheIndividualPosts(deduplicatedResults);

      this.cacheStats.sets++;
      this.logger.info('Search results cached', {
        query: searchQuery,
        resultsCount: deduplicatedResults.length,
        cacheKey
      });

    } catch (error) {
      this.logger.error('Failed to cache search results', error as Error);
    }
  }

  /**
   * Retrieve cached search results
   */
  async getCachedSearchResults(
    searchQuery: string,
    keywords: string[],
    searchOptions: any = {}
  ): Promise<SearchCacheEntry | null> {
    try {
      const cacheKey = this.generateSearchCacheKey(searchQuery, keywords, searchOptions);
      const cached = await this.redis.get(cacheKey);
      
      if (!cached) {
        this.cacheStats.misses++;
        return null;
      }

      const entry: SearchCacheEntry = JSON.parse(cached);
      
      // Check if cache is still valid (additional freshness check)
      const cacheAge = Date.now() - new Date(entry.extractedAt).getTime();
      if (cacheAge > entry.ttl * 1000) {
        await this.redis.del(cacheKey);
        this.cacheStats.misses++;
        return null;
      }

      this.cacheStats.hits++;
      this.logger.info('Cache hit for search results', { query: searchQuery, cacheKey });
      return entry;

    } catch (error) {
      this.logger.error('Failed to retrieve cached results', error as Error);
      this.cacheStats.misses++;
      return null;
    }
  }

  /**
   * Cache individual posts for deduplication
   */
  private async cacheIndividualPosts(posts: CachedPost[]): Promise<void> {
    const pipeline = this.redis.pipeline();

    for (const post of posts) {
      const postKey = this.generatePostCacheKey(post);
      pipeline.setex(postKey, this.POST_CACHE_TTL, JSON.stringify(post));
      
      // Create deduplication entry
      const dedupKey = this.generateDeduplicationKey(post);
      pipeline.setex(dedupKey, this.DEDUP_CACHE_TTL, postKey);
    }

    await pipeline.exec();
  }

  /**
   * Check for duplicate posts using multiple strategies
   */
  async checkDuplication(post: CachedPost): Promise<DuplicationCheckResult> {
    try {
      // Strategy 1: Check by post ID
      if (post.id) {
        const idKey = `post_id:${post.id}`;
        const existingByIdKey = await this.redis.get(idKey);
        if (existingByIdKey) {
          return {
            isDuplicate: true,
            existingPostId: post.id,
            similarity: 1.0,
            action: 'skip'
          };
        }
      }

      // Strategy 2: Check by URL
      if (post.url) {
        const urlKey = `post_url:${this.hashString(post.url)}`;
        const existingByUrl = await this.redis.get(urlKey);
        if (existingByUrl) {
          return {
            isDuplicate: true,
            existingPostId: post.url,
            similarity: 1.0,
            action: 'skip'
          };
        }
      }

      // Strategy 3: Check by content similarity
      const contentHash = this.generateContentHash(post);
      const contentKey = `post_content:${contentHash}`;
      const existingByContent = await this.redis.get(contentKey);
      
      if (existingByContent) {
        const similarity = await this.calculateContentSimilarity(post, existingByContent);
        
        if (similarity > 0.9) {
          return {
            isDuplicate: true,
            similarity,
            action: 'skip'
          };
        } else if (similarity > 0.7) {
          return {
            isDuplicate: true,
            similarity,
            action: 'update' // Similar but may have updated metrics
          };
        }
      }

      // Strategy 4: Check against database
      const dbDuplicate = await this.checkDatabaseDuplication(post);
      if (dbDuplicate.isDuplicate) {
        return dbDuplicate;
      }

      return {
        isDuplicate: false,
        action: 'create'
      };

    } catch (error) {
      this.logger.error('Duplication check failed', error as Error);
      return {
        isDuplicate: false,
        action: 'create'
      };
    }
  }

  /**
   * Check database for duplicates
   */
  private async checkDatabaseDuplication(post: CachedPost): Promise<DuplicationCheckResult> {
    try {
      let existingLead: Lead | null = null;

      // Check by post URL first
      if (post.url) {
        existingLead = await this.leadRepo.findOne({
          where: { postUrl: post.url }
        });
      }

      // Check by author and content similarity
      if (!existingLead) {
        const contentHash = this.generateContentHash(post);
        const similarLeads = await this.leadRepo
          .createQueryBuilder('lead')
          .where('lead.authorHandle = :handle', { handle: post.author.handle })
          .andWhere('LENGTH(lead.content->\'text\') BETWEEN :minLen AND :maxLen', {
            minLen: Math.max(1, post.text.length - 50),
            maxLen: post.text.length + 50
          })
          .take(5)
          .getMany();

        for (const lead of similarLeads) {
          const similarity = this.calculateTextSimilarity(
            post.text,
            lead.content?.text || ''
          );
          
          if (similarity > 0.9) {
            existingLead = lead;
            break;
          }
        }
      }

      if (existingLead) {
        return {
          isDuplicate: true,
          existingPostId: existingLead.id,
          action: 'update'
        };
      }

      return {
        isDuplicate: false,
        action: 'create'
      };

    } catch (error) {
      this.logger.error('Database duplication check failed', error as Error);
      return {
        isDuplicate: false,
        action: 'create'
      };
    }
  }

  /**
   * Remove duplicates from results array
   */
  async deduplicateResults(posts: CachedPost[]): Promise<CachedPost[]> {
    const deduplicated: CachedPost[] = [];
    const seenHashes = new Set<string>();
    
    for (const post of posts) {
      const duplicationCheck = await this.checkDuplication(post);
      
      if (!duplicationCheck.isDuplicate) {
        const hash = this.generateContentHash(post);
        
        if (!seenHashes.has(hash)) {
          seenHashes.add(hash);
          deduplicated.push(post);
        } else {
          this.cacheStats.duplicatesSkipped++;
        }
      } else {
        this.cacheStats.duplicatesSkipped++;
        this.logger.debug('Skipped duplicate post', {
          author: post.author.handle,
          similarity: duplicationCheck.similarity
        });
      }
    }

    return deduplicated;
  }

  /**
   * Persist leads to database with smart updates
   */
  async persistLeads(posts: CachedPost[], agentId: string, accountId: string): Promise<Lead[]> {
    const savedLeads: Lead[] = [];

    for (const post of posts) {
      try {
        const duplicationCheck = await this.checkDuplication(post);
        
        if (duplicationCheck.action === 'skip') {
          continue;
        }

        if (duplicationCheck.action === 'update' && duplicationCheck.existingPostId) {
          // Update existing lead
          const existingLead = await this.leadRepo.findOne({
            where: { id: duplicationCheck.existingPostId }
          });

          if (existingLead) {
            existingLead.metrics = {
              ...existingLead.metrics,
              ...post.metrics
            };
            existingLead.score = post.enhanced.leadScore;
            existingLead.category = post.enhanced.category;
            existingLead.updatedAt = new Date();

            const updated = await this.leadRepo.save(existingLead);
            savedLeads.push(updated);
          }
        } else {
          // Create new lead
          const lead = this.leadRepo.create({
            accountId,
            agentId,
            postId: post.id || `threads-${Date.now()}-${Math.random()}`,
            postUrl: post.url || '',
            authorHandle: post.author.handle,
            authorDisplayName: post.author.displayName,
            authorIsVerified: post.author.isVerified || false,
            content: {
              text: post.text,
              hashtags: this.extractHashtags(post.text),
              mentions: this.extractMentions(post.text),
              links: this.extractLinks(post.text)
            },
            metrics: {
              likes: post.metrics.likes || 0,
              replies: post.metrics.replies || 0,
              reposts: post.metrics.reposts || 0,
              views: post.metrics.views || 0
            },
            category: post.enhanced.category,
            score: post.enhanced.leadScore,
            status: 'new',
            createdAt: new Date()
          });

          const saved = await this.leadRepo.save(lead);
          savedLeads.push(saved);
        }

      } catch (error) {
        this.logger.error('Failed to persist lead', error as Error, {
          author: post.author.handle
        });
      }
    }

    this.logger.info('Leads persisted to database', {
      total: posts.length,
      saved: savedLeads.length,
      duplicatesSkipped: posts.length - savedLeads.length
    });

    return savedLeads;
  }

  /**
   * Generate cache keys
   */
  private generateSearchCacheKey(query: string, keywords: string[], options: any): string {
    const optionsHash = this.hashString(JSON.stringify(options));
    const keywordsHash = this.hashString(keywords.sort().join('|'));
    return `search:${this.hashString(query)}:${keywordsHash}:${optionsHash}`;
  }

  private generatePostCacheKey(post: CachedPost): string {
    const identifier = post.id || post.url || this.generateContentHash(post);
    return `post:${this.hashString(identifier)}`;
  }

  private generateDeduplicationKey(post: CachedPost): string {
    return `dedup:${this.generateContentHash(post)}`;
  }

  private generateContentHash(post: CachedPost): string {
    const content = `${post.author.handle}:${post.text}:${post.timestamp || ''}`;
    return this.hashString(content);
  }

  /**
   * Calculate content similarity
   */
  private async calculateContentSimilarity(post1: CachedPost, cached: string): Promise<number> {
    try {
      const post2: CachedPost = JSON.parse(cached);
      return this.calculateTextSimilarity(post1.text, post2.text);
    } catch {
      return 0;
    }
  }

  private calculateTextSimilarity(text1: string, text2: string): number {
    // Simple Jaccard similarity on words
    const words1 = new Set(text1.toLowerCase().split(/\s+/));
    const words2 = new Set(text2.toLowerCase().split(/\s+/));
    
    const intersection = new Set([...words1].filter(x => words2.has(x)));
    const union = new Set([...words1, ...words2]);
    
    return intersection.size / union.size;
  }

  /**
   * Extract content elements
   */
  private extractHashtags(text: string): string[] {
    return (text.match(/#\w+/g) || []).map(tag => tag.slice(1));
  }

  private extractMentions(text: string): string[] {
    return (text.match(/@\w+/g) || []).map(mention => mention.slice(1));
  }

  private extractLinks(text: string): string[] {
    const urlRegex = /https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)/g;
    return text.match(urlRegex) || [];
  }

  /**
   * Hash helper
   */
  private hashString(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(36);
  }

  /**
   * Cache cleanup and maintenance
   */
  async cleanupCache(): Promise<void> {
    try {
      // Get cache size
      const keys = await this.redis.keys('search:*');
      
      if (keys.length > this.MAX_CACHE_SIZE) {
        // Remove oldest entries (simple FIFO)
        const toDelete = keys.slice(0, keys.length - this.MAX_CACHE_SIZE);
        await this.redis.del(...toDelete);
        
        this.cacheStats.deletes += toDelete.length;
        this.logger.info('Cache cleanup completed', {
          deletedKeys: toDelete.length,
          remainingKeys: this.MAX_CACHE_SIZE
        });
      }
    } catch (error) {
      this.logger.error('Cache cleanup failed', error as Error);
    }
  }

  /**
   * Get cache statistics
   */
  getCacheStats() {
    return {
      ...this.cacheStats,
      hitRate: this.cacheStats.hits / Math.max(this.cacheStats.hits + this.cacheStats.misses, 1),
      totalOperations: this.cacheStats.hits + this.cacheStats.misses + this.cacheStats.sets
    };
  }

  /**
   * Clear all cache
   */
  async clearCache(): Promise<void> {
    try {
      await this.redis.flushall();
      this.cacheStats = {
        hits: 0,
        misses: 0,
        sets: 0,
        deletes: 0,
        duplicatesSkipped: 0
      };
      this.logger.info('All cache cleared');
    } catch (error) {
      this.logger.error('Failed to clear cache', error as Error);
    }
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<{healthy: boolean, issues: string[]}> {
    const issues: string[] = [];
    
    try {
      // Test Redis connection
      await this.redis.ping();
    } catch (error) {
      issues.push('Redis connection failed');
    }

    try {
      // Test database connection
      await this.leadRepo.count();
    } catch (error) {
      issues.push('Database connection failed');
    }

    // Check hit rate
    const stats = this.getCacheStats();
    if (stats.hitRate < 0.3) {
      issues.push('Low cache hit rate');
    }

    return {
      healthy: issues.length === 0,
      issues
    };
  }

  /**
   * Close connections
   */
  async close(): Promise<void> {
    try {
      await this.redis.quit();
      this.logger.info('Data persistence service closed');
    } catch (error) {
      this.logger.error('Error closing data persistence service', error as Error);
    }
  }
}