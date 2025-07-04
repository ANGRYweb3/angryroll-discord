const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
require('dotenv').config();

const discordNotifier = require('./discordNotifier');
const revenueChecker = require('./revenueChecker');

const app = express();
const PORT = process.env.PORT || 3000;

// Revenue check debouncing system
const pendingRevenueChecks = new Set();

/**
 * Schedule revenue check with debouncing to prevent multiple checks
 * @param {string} gameType - Type of game
 * @param {number} delay - Delay in milliseconds
 */
function scheduleRevenueCheck(gameType, delay = 15000) {
  const checkKey = `${gameType}-${Math.floor(Date.now() / 30000)}`; // Group by 30-second windows
  
  if (pendingRevenueChecks.has(checkKey)) {
    console.log(`[Revenue] Revenue check already scheduled for ${gameType}, skipping duplicate`);
    return;
  }
  
  pendingRevenueChecks.add(checkKey);
  
  setTimeout(async () => {
    try {
      await revenueChecker.checkAndNotifyRevenue(gameType);
    } catch (error) {
      console.error(`[Revenue] Error in scheduled revenue check for ${gameType}:`, error.message);
    } finally {
      pendingRevenueChecks.delete(checkKey);
    }
  }, delay);
  
  console.log(`[Revenue] Scheduled revenue check for ${gameType} in ${delay}ms`);
}

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    service: 'Angryroll Discord Service',
    timestamp: new Date().toISOString()
  });
});

// Webhook status check
app.get('/status', (req, res) => {
  const gamesWebhook = process.env.DISCORD_WEBHOOK_URL_GAMES ? 'configured' : 'missing';
  const revenueWebhook = process.env.DISCORD_WEBHOOK_URL_REVENUE ? 'configured' : 'missing';
  
  res.json({
    webhooks: {
      games: gamesWebhook,
      revenue: revenueWebhook
    },
    service: 'running'
  });
});

// === GAME NOTIFICATIONS ===

// Coinflip notifications
app.post('/notify/coinflip/created', async (req, res) => {
  try {
    await discordNotifier.notifyNewCoinflipGame(req.body);
    res.json({ success: true, message: 'Coinflip creation notification sent' });
  } catch (error) {
    console.error('Coinflip creation notification error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/notify/coinflip/settled', async (req, res) => {
  try {
    await discordNotifier.notifyCoinflipGameSettled(req.body);
    
    // Schedule revenue check with debouncing
    scheduleRevenueCheck('Coinflip', 15000);
    
    res.json({ success: true, message: 'Coinflip settlement notification sent' });
  } catch (error) {
    console.error('Coinflip settlement notification error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Jackpot notifications
app.post('/notify/jackpot/entry', async (req, res) => {
  try {
    const { participantData, currentPot, participantCount } = req.body;
    await discordNotifier.notifyJackpotEntry(participantData, currentPot, participantCount);
    res.json({ success: true, message: 'Jackpot entry notification sent' });
  } catch (error) {
    console.error('Jackpot entry notification error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/notify/jackpot/winner', async (req, res) => {
  try {
    await discordNotifier.notifyJackpotWinner(req.body);
    
    // Schedule revenue check with debouncing
    scheduleRevenueCheck('Jackpot', 20000);
    
    res.json({ success: true, message: 'Jackpot winner notification sent' });
  } catch (error) {
    console.error('Jackpot winner notification error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// === REVENUE NOTIFICATIONS ===

// Manual revenue check
app.post('/notify/revenue/check', async (req, res) => {
  try {
    const { gameType = 'Manual' } = req.body;
    const result = await revenueChecker.checkAndNotifyRevenue(gameType);
    res.json({ success: true, result });
  } catch (error) {
    console.error('Revenue check error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get current revenue stats
app.get('/revenue/stats', async (req, res) => {
  try {
    const stats = await revenueChecker.getCurrentStats();
    res.json({ success: true, stats });
  } catch (error) {
    console.error('Revenue stats error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// === TEST ENDPOINTS ===

// Test notifications
app.post('/test/:type', async (req, res) => {
  try {
    const { type } = req.params;
    let result;
    
    switch (type) {
      case 'coinflip':
        result = await discordNotifier.notifyNewCoinflipGame({
          id: 'test-123',
          betAmount: 10,
          creator: '0.0.1234567',
          creatorChoice: 0
        });
        break;
      case 'jackpot':
        result = await discordNotifier.notifyJackpotEntry(
          { username: 'TestPlayer', amountEntered: 5, chancePercentage: 25 },
          100,
          4
        );
        break;
      case 'revenue':
        result = await revenueChecker.checkAndNotifyRevenue('Test');
        break;
      default:
        return res.status(400).json({ success: false, error: 'Invalid test type' });
    }
    
    res.json({ success: true, message: `${type} test notification sent`, result });
  } catch (error) {
    console.error(`Test ${req.params.type} error:`, error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ success: false, error: 'Internal server error' });
});

// Start server
app.listen(PORT, () => {
  console.log(`[Discord Service] Server running on port ${PORT}`);
  console.log(`[Discord Service] Health check: http://localhost:${PORT}/health`);
  console.log(`[Discord Service] Status check: http://localhost:${PORT}/status`);
  
  // Verify webhook configuration
  if (!process.env.DISCORD_WEBHOOK_URL_GAMES) {
    console.warn('[Discord Service] WARNING: DISCORD_WEBHOOK_URL_GAMES not configured');
  }
  if (!process.env.DISCORD_WEBHOOK_URL_REVENUE) {
    console.warn('[Discord Service] WARNING: DISCORD_WEBHOOK_URL_REVENUE not configured (will fallback to games)');
  }
});

module.exports = app; 