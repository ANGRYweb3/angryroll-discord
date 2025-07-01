const discordNotifier = require('./discordNotifier');
const revenueChecker = require('./revenueChecker');
require('dotenv').config();

// Test data
const sampleGameData = {
  coinflip: {
    id: 'test-coinflip-123',
    betAmount: 10,
    creator: '0.0.1234567',
    creatorChoice: 0
  },
  coinflipSettled: {
    gameId: 'test-coinflip-123',
    wagerAmount: 10,
    winnerId: '0.0.1234567',
    winningSide: 'HEADS',
    challengedByBot: false,
    feeCharged: 0.3
  },
  jackpotEntry: {
    participantData: {
      username: 'TestPlayer',
      accountId: '0.0.7654321',
      amountEntered: 5,
      chancePercentage: 25
    },
    currentPot: 100,
    participantCount: 4
  },
  jackpotWinner: {
    winnerUsername: 'LuckyPlayer',
    winnerId: '0.0.9876543',
    prizeAmount: 95,
    winChance: 30,
    roundId: 'round-456',
    participantCount: 6,
    totalPot: 100
  }
};

/**
 * Test individual notification types
 */
async function testNotifications() {
  console.log('🧪 Testing Discord Notifications...\n');
  
  try {
    // Test 1: Coinflip Creation
    console.log('1️⃣ Testing Coinflip Creation...');
    await discordNotifier.notifyNewCoinflipGame(sampleGameData.coinflip);
    console.log('✅ Coinflip creation notification sent\n');
    await delay(2000);
    
    // Test 2: Coinflip Settlement
    console.log('2️⃣ Testing Coinflip Settlement...');
    await discordNotifier.notifyCoinflipGameSettled(sampleGameData.coinflipSettled);
    console.log('✅ Coinflip settlement notification sent\n');
    await delay(2000);
    
    // Test 3: Jackpot Entry
    console.log('3️⃣ Testing Jackpot Entry...');
    const { participantData, currentPot, participantCount } = sampleGameData.jackpotEntry;
    await discordNotifier.notifyJackpotEntry(participantData, currentPot, participantCount);
    console.log('✅ Jackpot entry notification sent\n');
    await delay(2000);
    
    // Test 4: Jackpot Winner
    console.log('4️⃣ Testing Jackpot Winner...');
    await discordNotifier.notifyJackpotWinner(sampleGameData.jackpotWinner);
    console.log('✅ Jackpot winner notification sent\n');
    await delay(2000);
    
    // Test 5: Revenue Check
    console.log('5️⃣ Testing Revenue Check...');
    const revenueResult = await revenueChecker.checkAndNotifyRevenue('Test');
    console.log('✅ Revenue check completed:', revenueResult.message);
    
    console.log('\n🎉 All tests completed successfully!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    process.exit(1);
  }
}

/**
 * Test specific notification type
 */
async function testSpecific(type) {
  console.log(`🧪 Testing ${type} notification...\n`);
  
  try {
    switch (type.toLowerCase()) {
      case 'coinflip':
        await discordNotifier.notifyNewCoinflipGame(sampleGameData.coinflip);
        console.log('✅ Coinflip creation notification sent');
        break;
        
      case 'coinflip-settled':
        await discordNotifier.notifyCoinflipGameSettled(sampleGameData.coinflipSettled);
        console.log('✅ Coinflip settlement notification sent');
        break;
        
      case 'jackpot-entry':
        const { participantData, currentPot, participantCount } = sampleGameData.jackpotEntry;
        await discordNotifier.notifyJackpotEntry(participantData, currentPot, participantCount);
        console.log('✅ Jackpot entry notification sent');
        break;
        
      case 'jackpot-winner':
        await discordNotifier.notifyJackpotWinner(sampleGameData.jackpotWinner);
        console.log('✅ Jackpot winner notification sent');
        break;
        
      case 'revenue':
        const revenueResult = await revenueChecker.checkAndNotifyRevenue('Manual Test');
        console.log('✅ Revenue check completed:', revenueResult.message);
        console.log('📊 Stats:', {
          total: revenueResult.stats.total.toFixed(2),
          increase: revenueResult.increase.toFixed(4),
          notificationSent: revenueResult.notificationSent
        });
        break;
        
      case 'stats':
        const stats = await revenueChecker.getCurrentStats();
        console.log('✅ Current revenue stats:');
        console.log(`   💰 Coinflip: ${stats.coinflip.toFixed(2)} HBAR`);
        console.log(`   🎰 Jackpot: ${stats.jackpot.toFixed(2)} HBAR`);
        console.log(`   💎 Total: ${stats.total.toFixed(2)} HBAR`);
        console.log(`   🕒 Last checked: ${stats.lastChecked}`);
        break;
        
      default:
        console.log('❌ Invalid test type. Available types:');
        showHelp();
        return;
    }
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    process.exit(1);
  }
}

/**
 * Check webhook configuration
 */
function checkConfiguration() {
  console.log('🔧 Checking Discord Service Configuration...\n');
  
  const gamesWebhook = process.env.DISCORD_WEBHOOK_URL_GAMES;
  const revenueWebhook = process.env.DISCORD_WEBHOOK_URL_REVENUE;
  
  console.log('📡 Webhook Configuration:');
  console.log(`   🎮 Games Webhook: ${gamesWebhook ? '✅ Configured' : '❌ Missing'}`);
  console.log(`   💰 Revenue Webhook: ${revenueWebhook ? '✅ Configured' : '⚠️ Not configured (will fallback to games)'}`);
  
  if (!gamesWebhook) {
    console.log('\n❌ Error: DISCORD_WEBHOOK_URL_GAMES is required!');
    console.log('Please set it in your .env file or environment variables.');
    process.exit(1);
  }
  
  console.log('\n✅ Configuration check passed!');
}

/**
 * Show help information
 */
function showHelp() {
  console.log(`
🤖 Angryroll Discord Service Test Tool

Usage: node testDiscord.js [command]

Commands:
  all              Run all tests (default)
  coinflip         Test coinflip creation notification
  coinflip-settled Test coinflip settlement notification
  jackpot-entry    Test jackpot entry notification
  jackpot-winner   Test jackpot winner notification
  revenue          Test revenue checking and notification
  stats            Show current revenue statistics
  config           Check configuration
  help             Show this help message

Examples:
  node testDiscord.js
  node testDiscord.js coinflip
  node testDiscord.js revenue
  node testDiscord.js config

Environment Variables Required:
  DISCORD_WEBHOOK_URL_GAMES    - Discord webhook for game notifications
  DISCORD_WEBHOOK_URL_REVENUE  - Discord webhook for revenue notifications (optional)
  `);
}

/**
 * Delay utility
 */
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Main execution
async function main() {
  const command = process.argv[2] || 'all';
  
  switch (command.toLowerCase()) {
    case 'help':
    case '--help':
    case '-h':
      showHelp();
      break;
      
    case 'config':
      checkConfiguration();
      break;
      
    case 'all':
      checkConfiguration();
      await testNotifications();
      break;
      
    default:
      checkConfiguration();
      await testSpecific(command);
      break;
  }
}

// Run if called directly
if (require.main === module) {
  main().catch(error => {
    console.error('💥 Unexpected error:', error);
    process.exit(1);
  });
}

module.exports = {
  testNotifications,
  testSpecific,
  checkConfiguration
}; 