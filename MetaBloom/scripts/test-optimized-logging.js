#!/usr/bin/env node

/**
 * Test Script for Optimized Logging System
 * Validates log volume reduction and functionality
 */

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

// Simple validation script for immediate testing
function validateOptimizedLogging() {
  console.log('🧪 Testing Optimized Logging Configuration...\n');

  // Test 1: Check if optimized logging files exist
  const requiredFiles = [
    'lib/logging/optimized-logger.ts',
    'lib/logging/config.ts'
  ];

  let allFilesExist = true;
  for (const file of requiredFiles) {
    if (fs.existsSync(file)) {
      console.log(`✅ ${file} exists`);
    } else {
      console.log(`❌ ${file} missing`);
      allFilesExist = false;
    }
  }

  // Test 2: Check environment variables
  const envVars = {
    'LOG_LEVEL': process.env.LOG_LEVEL || 'INFO',
    'ENABLE_OPTIMIZED_LOGGING': process.env.ENABLE_OPTIMIZED_LOGGING || 'true'
  };

  console.log('\n📊 Environment Configuration:');
  for (const [key, value] of Object.entries(envVars)) {
    console.log(`  ${key}=${value}`);
  }

  // Test 3: Validate log level configuration
  const logLevel = process.env.LOG_LEVEL || 'INFO';
  const validLevels = ['DEBUG', 'INFO', 'WARN', 'ERROR'];

  if (validLevels.includes(logLevel.toUpperCase())) {
    console.log(`\n✅ Log level '${logLevel}' is valid`);
  } else {
    console.log(`\n❌ Log level '${logLevel}' is invalid. Use: ${validLevels.join(', ')}`);
    allFilesExist = false;
  }

  // Test 4: Estimate log reduction
  console.log('\n📈 Expected Log Reduction:');
  if (logLevel.toUpperCase() === 'INFO') {
    console.log('  🎯 Target: 80-90% reduction from baseline');
    console.log('  📝 Function schemas: Cached per session');
    console.log('  📝 System prompts: Cached per session');
    console.log('  📝 Conversation history: Summary only');
    console.log('  📝 AST queries: Summary only');
  } else if (logLevel.toUpperCase() === 'DEBUG') {
    console.log('  🔍 Full debugging enabled');
    console.log('  📝 All details logged for troubleshooting');
  } else {
    console.log('  ⚠️ Minimal logging enabled');
  }

  console.log('\n🏁 Validation Summary:');
  if (allFilesExist) {
    console.log('✅ Optimized logging system is properly configured');
    console.log('🚀 Ready for testing with npm run dev');
    return true;
  } else {
    console.log('❌ Configuration issues detected');
    return false;
  }
}

// Configuration
const TEST_CONFIG = {
  testDuration: 30000, // 30 seconds
  logDir: 'test-logs',
  scenarios: [
    {
      name: 'baseline',
      description: 'Original logging (LOG_LEVEL=DEBUG)',
      env: { LOG_LEVEL: 'DEBUG', ENABLE_OPTIMIZED_LOGGING: 'false' }
    },
    {
      name: 'optimized_info',
      description: 'Optimized logging (LOG_LEVEL=INFO)',
      env: { LOG_LEVEL: 'INFO', ENABLE_OPTIMIZED_LOGGING: 'true' }
    },
    {
      name: 'optimized_debug',
      description: 'Optimized logging (LOG_LEVEL=DEBUG)',
      env: { LOG_LEVEL: 'DEBUG', ENABLE_OPTIMIZED_LOGGING: 'true' }
    }
  ]
};

// Test messages to simulate AI conversations
const TEST_MESSAGES = [
  "Hey whats up",
  "Show me some fire spells for Mage",
  "Build me an aggressive Hunter deck",
  "What are the best Legendary cards?",
  "Decode this deck: AAECAZ8F...",
  "Thanks for the help!"
];

/**
 * Create test directory
 */
function setupTestEnvironment() {
  if (!fs.existsSync(TEST_CONFIG.logDir)) {
    fs.mkdirSync(TEST_CONFIG.logDir, { recursive: true });
  }
  
  console.log('🔧 Test environment setup complete');
}

/**
 * Run a single test scenario
 */
async function runTestScenario(scenario) {
  console.log(`\n🧪 Running scenario: ${scenario.name}`);
  console.log(`📝 Description: ${scenario.description}`);
  
  const logFile = path.join(TEST_CONFIG.logDir, `${scenario.name}.log`);
  const startTime = Date.now();
  
  // Set environment variables
  const env = { ...process.env, ...scenario.env };
  
  // Start development server
  const devServer = spawn('npm', ['run', 'dev'], {
    cwd: process.cwd(),
    env,
    stdio: ['pipe', 'pipe', 'pipe']
  });
  
  // Capture all output
  const logStream = fs.createWriteStream(logFile);
  devServer.stdout.pipe(logStream);
  devServer.stderr.pipe(logStream);
  
  // Wait for server to start
  await new Promise(resolve => setTimeout(resolve, 5000));
  
  // Simulate AI conversations
  console.log('💬 Simulating AI conversations...');
  for (let i = 0; i < TEST_MESSAGES.length; i++) {
    const message = TEST_MESSAGES[i];
    console.log(`  📤 Sending: "${message}"`);
    
    try {
      // Simulate API call to chat endpoint
      const response = await fetch('http://localhost:3000/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message,
          chatHistory: [],
          userPreferences: {}
        })
      });
      
      if (response.ok) {
        console.log(`  ✅ Response received`);
      } else {
        console.log(`  ⚠️ Response error: ${response.status}`);
      }
    } catch (error) {
      console.log(`  ❌ Request failed: ${error.message}`);
    }
    
    // Wait between messages
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
  
  // Stop server
  devServer.kill('SIGTERM');
  logStream.end();
  
  const duration = Date.now() - startTime;
  console.log(`⏱️ Scenario completed in ${duration}ms`);
  
  return { scenario: scenario.name, logFile, duration };
}

/**
 * Analyze log files and calculate metrics
 */
function analyzeLogFiles(results) {
  console.log('\n📊 Analyzing log files...');
  
  const analysis = {};
  
  for (const result of results) {
    const logContent = fs.readFileSync(result.logFile, 'utf8');
    const lines = logContent.split('\n').filter(line => line.trim().length > 0);
    
    // Count different types of log entries
    const metrics = {
      totalLines: lines.length,
      grokPayloadLines: lines.filter(line => line.includes('Grok API payload')).length,
      grokResponseLines: lines.filter(line => line.includes('Grok API response')).length,
      functionSchemaLines: lines.filter(line => line.includes('function') && line.includes('schema')).length,
      systemPromptLines: lines.filter(line => line.includes('system') && line.includes('prompt')).length,
      tokenOptimizationLines: lines.filter(line => line.includes('TOKEN SAVINGS')).length,
      subscriptionLines: lines.filter(line => line.includes('subscription') && line.includes('status')).length,
      astQueryLines: lines.filter(line => line.includes('AST') && line.includes('query')).length,
      errorLines: lines.filter(line => line.includes('ERROR') || line.includes('❌')).length,
      fileSize: fs.statSync(result.logFile).size
    };
    
    analysis[result.scenario] = metrics;
    
    console.log(`\n📈 ${result.scenario.toUpperCase()} METRICS:`);
    console.log(`  📄 Total lines: ${metrics.totalLines}`);
    console.log(`  📦 File size: ${(metrics.fileSize / 1024).toFixed(1)} KB`);
    console.log(`  🔍 Grok payloads: ${metrics.grokPayloadLines}`);
    console.log(`  📤 Grok responses: ${metrics.grokResponseLines}`);
    console.log(`  🔧 Function schemas: ${metrics.functionSchemaLines}`);
    console.log(`  🎛️ System prompts: ${metrics.systemPromptLines}`);
    console.log(`  💰 Token optimization: ${metrics.tokenOptimizationLines}`);
    console.log(`  👤 Subscription logs: ${metrics.subscriptionLines}`);
    console.log(`  🌳 AST queries: ${metrics.astQueryLines}`);
    console.log(`  ❌ Errors: ${metrics.errorLines}`);
  }
  
  return analysis;
}

/**
 * Calculate reduction percentages
 */
function calculateReductions(analysis) {
  console.log('\n🎯 OPTIMIZATION RESULTS:');
  
  const baseline = analysis.baseline;
  const optimizedInfo = analysis.optimized_info;
  const optimizedDebug = analysis.optimized_debug;
  
  if (!baseline || !optimizedInfo) {
    console.log('❌ Missing baseline or optimized data for comparison');
    return;
  }
  
  // Calculate reductions for INFO level
  const infoReduction = {
    totalLines: ((baseline.totalLines - optimizedInfo.totalLines) / baseline.totalLines * 100).toFixed(1),
    fileSize: ((baseline.fileSize - optimizedInfo.fileSize) / baseline.fileSize * 100).toFixed(1),
    grokPayloads: ((baseline.grokPayloadLines - optimizedInfo.grokPayloadLines) / baseline.grokPayloadLines * 100).toFixed(1),
    functionSchemas: ((baseline.functionSchemaLines - optimizedInfo.functionSchemaLines) / baseline.functionSchemaLines * 100).toFixed(1)
  };
  
  console.log('\n✅ OPTIMIZED INFO vs BASELINE:');
  console.log(`  📄 Total lines reduced: ${infoReduction.totalLines}%`);
  console.log(`  📦 File size reduced: ${infoReduction.fileSize}%`);
  console.log(`  🔍 Grok payload logs reduced: ${infoReduction.grokPayloads}%`);
  console.log(`  🔧 Function schema logs reduced: ${infoReduction.functionSchemas}%`);
  
  // Calculate reductions for DEBUG level
  if (optimizedDebug) {
    const debugReduction = {
      totalLines: ((baseline.totalLines - optimizedDebug.totalLines) / baseline.totalLines * 100).toFixed(1),
      fileSize: ((baseline.fileSize - optimizedDebug.fileSize) / baseline.fileSize * 100).toFixed(1)
    };
    
    console.log('\n🔍 OPTIMIZED DEBUG vs BASELINE:');
    console.log(`  📄 Total lines reduced: ${debugReduction.totalLines}%`);
    console.log(`  📦 File size reduced: ${debugReduction.fileSize}%`);
  }
  
  // Success criteria check
  const targetReduction = 80; // 80% reduction target
  const actualReduction = parseFloat(infoReduction.totalLines);
  
  console.log('\n🎯 SUCCESS CRITERIA:');
  console.log(`  🎯 Target reduction: ${targetReduction}%`);
  console.log(`  📊 Actual reduction: ${actualReduction}%`);
  
  if (actualReduction >= targetReduction) {
    console.log('  ✅ SUCCESS: Target reduction achieved!');
  } else {
    console.log('  ⚠️ PARTIAL: Target reduction not fully achieved');
  }
  
  return {
    success: actualReduction >= targetReduction,
    actualReduction,
    targetReduction,
    analysis
  };
}

/**
 * Main test execution
 */
async function runOptimizedLoggingTest() {
  console.log('🚀 Starting Optimized Logging Test');
  console.log('=' .repeat(50));
  
  setupTestEnvironment();
  
  const results = [];
  
  // Run each test scenario
  for (const scenario of TEST_CONFIG.scenarios) {
    try {
      const result = await runTestScenario(scenario);
      results.push(result);
    } catch (error) {
      console.error(`❌ Scenario ${scenario.name} failed:`, error.message);
    }
  }
  
  // Analyze results
  const analysis = analyzeLogFiles(results);
  const reductionResults = calculateReductions(analysis);
  
  // Generate summary report
  const reportFile = path.join(TEST_CONFIG.logDir, 'optimization-report.json');
  fs.writeFileSync(reportFile, JSON.stringify({
    timestamp: new Date().toISOString(),
    testConfig: TEST_CONFIG,
    results: reductionResults
  }, null, 2));
  
  console.log(`\n📋 Full report saved to: ${reportFile}`);
  console.log('\n🏁 Test completed!');
  
  return reductionResults;
}

// Run validation if called directly
if (require.main === module) {
  // Check if we should run full test or just validation
  const args = process.argv.slice(2);

  if (args.includes('--validate') || args.includes('-v')) {
    // Quick validation
    const success = validateOptimizedLogging();
    process.exit(success ? 0 : 1);
  } else if (args.includes('--full-test')) {
    // Full test suite
    runOptimizedLoggingTest()
      .then(results => {
        process.exit(results.success ? 0 : 1);
      })
      .catch(error => {
        console.error('❌ Test failed:', error);
        process.exit(1);
      });
  } else {
    // Default: run validation
    console.log('🔧 MetaBloom Optimized Logging Test\n');
    console.log('Usage:');
    console.log('  node scripts/test-optimized-logging.js --validate    # Quick validation');
    console.log('  node scripts/test-optimized-logging.js --full-test   # Full test suite');
    console.log('');

    const success = validateOptimizedLogging();
    process.exit(success ? 0 : 1);
  }
}

module.exports = { runOptimizedLoggingTest, validateOptimizedLogging };
