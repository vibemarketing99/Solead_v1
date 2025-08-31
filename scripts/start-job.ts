#!/usr/bin/env node

/**
 * Quick Job Starter - Run lead discovery jobs from command line
 * Usage: npx tsx scripts/start-job.ts "automation tools" "workflow software"
 */

import 'dotenv/config';
import { Stagehand } from "@browserbasehq/stagehand";
import { z } from "zod";
import * as fs from 'fs';
import * as path from 'path';

// Lead schema
const LeadSchema = z.object({
  text: z.string(),
  author: z.object({
    handle: z.string(),
    displayName: z.string().optional(),
  }),
  timestamp: z.string().optional(),
  metrics: z.object({
    likes: z.number().optional(),
    replies: z.number().optional(),
    reposts: z.number().optional(),
  }).optional(),
});

const LeadsArraySchema = z.object({
  leads: z.array(LeadSchema)
});

// Enhanced lead scoring
function scoreLead(lead: any, keywords: string[]): number {
  let score = 0;
  const text = lead.text.toLowerCase();
  
  // Topic match (35%)
  const matchCount = keywords.filter(k => text.includes(k.toLowerCase())).length;
  score += (matchCount / keywords.length) * 0.35;
  
  // Question/urgency indicators (30%)
  if (text.includes('?') || text.includes('help') || text.includes('looking for') || 
      text.includes('need') || text.includes('recommend')) {
    score += 0.30;
  }
  
  // Business context (20%)
  if (text.includes('business') || text.includes('company') || text.includes('team') ||
      text.includes('workflow') || text.includes('productivity')) {
    score += 0.20;
  }
  
  // Engagement (15%)
  const engagement = (lead.metrics?.likes || 0) + (lead.metrics?.replies || 0) * 2;
  if (engagement > 20) score += 0.15;
  else if (engagement > 10) score += 0.10;
  else if (engagement > 5) score += 0.05;
  
  return Math.min(1, score);
}

async function startLeadDiscoveryJob(searchTerms: string[]) {
  console.log('\n🚀 SOLEAD JOB RUNNER');
  console.log('═'.repeat(50));
  console.log(`📋 Job ID: job_${Date.now()}`);
  console.log(`🔍 Search Terms: ${searchTerms.join(', ')}`);
  console.log(`⏰ Started: ${new Date().toLocaleString()}`);
  console.log('═'.repeat(50));

  // Check environment
  if (!process.env.BROWSERBASE_API_KEY || !process.env.OPENAI_API_KEY) {
    console.error('❌ Missing required API keys in .env file');
    process.exit(1);
  }

  const stagehand = new Stagehand({
    env: "BROWSERBASE",
    headless: false, // Show browser for demo
    enableCaching: true,
    modelName: "gpt-4o-mini",
    modelClientOptions: {
      apiKey: process.env.OPENAI_API_KEY
    }
  });

  const results = {
    jobId: `job_${Date.now()}`,
    searchTerms,
    startTime: new Date().toISOString(),
    leads: [] as any[],
    stats: {
      total: 0,
      hot: 0,
      medium: 0,
      cold: 0
    }
  };

  try {
    console.log('\n🌐 Initializing browser session...');
    await stagehand.init();
    
    const page = stagehand.page;
    console.log(`✅ Session ID: ${stagehand.browserbaseSessionID}`);
    console.log(`📺 Watch live: https://browserbase.com/sessions/${stagehand.browserbaseSessionID}`);

    // Navigate to Threads
    console.log('\n🔗 Navigating to Threads...');
    await page.goto("https://www.threads.net", { 
      waitUntil: "networkidle", 
      timeout: 30000 
    });

    // Try to search (note: may require login for full results)
    console.log(`\n🔍 Searching for: "${searchTerms.join(' ')}"...`);
    
    // First observe the page
    await page.observe({
      instruction: `Look for a search box, search icon, or way to search for "${searchTerms.join(' ')}"`
    });

    // Try to perform search
    try {
      await page.act({
        action: `Search for "${searchTerms.join(' ')}" on this page`
      });
      
      // Wait for results
      await page.waitForTimeout(3000);
    } catch (error) {
      console.log('⚠️  Search requires authentication, extracting visible content...');
    }

    // Extract posts
    console.log('\n📊 Extracting leads...');
    const extractionResult = await page.extract({
      instruction: `Extract all visible posts, threads, or content related to: ${searchTerms.join(', ')}. 
                    Focus on posts that mention business needs, problems, or requests for solutions.`,
      schema: LeadsArraySchema,
      returnErrorsToUser: false
    });

    // Process and score leads
    if (extractionResult.leads && extractionResult.leads.length > 0) {
      console.log(`\n✅ Found ${extractionResult.leads.length} potential leads\n`);
      
      extractionResult.leads.forEach((lead, index) => {
        const score = scoreLead(lead, searchTerms);
        const category = score > 0.7 ? '🔥 HOT' : score > 0.4 ? '🟡 MEDIUM' : '❄️ COLD';
        
        const leadData = {
          ...lead,
          score: (score * 100).toFixed(0) + '%',
          category,
          discoveredAt: new Date().toISOString()
        };
        
        results.leads.push(leadData);
        
        // Update stats
        results.stats.total++;
        if (score > 0.7) results.stats.hot++;
        else if (score > 0.4) results.stats.medium++;
        else results.stats.cold++;
        
        // Display lead
        console.log(`${index + 1}. ${category} (${leadData.score}) @${lead.author.handle}`);
        console.log(`   "${lead.text.substring(0, 100)}${lead.text.length > 100 ? '...' : ''}"`);
        console.log('');
      });
    } else {
      console.log('⚠️  No leads found (may require authentication for full access)');
    }

    // Save results
    const outputDir = path.join(process.cwd(), 'jobs');
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    
    const outputFile = path.join(outputDir, `${results.jobId}.json`);
    fs.writeFileSync(outputFile, JSON.stringify(results, null, 2));
    
    // Summary
    console.log('═'.repeat(50));
    console.log('📈 JOB SUMMARY');
    console.log('═'.repeat(50));
    console.log(`Total Leads: ${results.stats.total}`);
    console.log(`🔥 Hot Leads: ${results.stats.hot}`);
    console.log(`🟡 Medium Leads: ${results.stats.medium}`);
    console.log(`❄️ Cold Leads: ${results.stats.cold}`);
    console.log(`\n📁 Results saved to: ${outputFile}`);
    
    // Display hot leads for immediate action
    if (results.stats.hot > 0) {
      console.log('\n🎯 HOT LEADS FOR IMMEDIATE ACTION:');
      results.leads
        .filter(l => l.category === '🔥 HOT')
        .slice(0, 5)
        .forEach((lead, i) => {
          console.log(`${i + 1}. @${lead.author.handle}: "${lead.text.substring(0, 80)}..."`);
        });
    }

  } catch (error) {
    console.error('❌ Job failed:', error);
    results.error = error.message;
  } finally {
    await stagehand.close();
    console.log('\n✅ Job completed');
  }

  return results;
}

// Main execution
async function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.log('Usage: npx tsx scripts/start-job.ts "search term 1" "search term 2"');
    console.log('Example: npx tsx scripts/start-job.ts "automation tools" "workflow software"');
    process.exit(1);
  }

  await startLeadDiscoveryJob(args);
}

main().catch(console.error);