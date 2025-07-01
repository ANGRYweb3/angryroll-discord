const axios = require('axios');
const discordNotifier = require('./discordNotifier');

// Wallet addresses for monitoring
const WALLETS = {
  coinflip: '0.0.9276566',
  jackpot: '0.0.9314288'
};

// Store last known balances to detect changes (in memory)
let lastBalances = {
  coinflip: 0,
  jackpot: 0,
  total: 0,
  lastChecked: null
};

/**
 * Fetch balance from Hedera Mirror Node
 * @param {string} accountId - Hedera account ID (e.g., "0.0.9276566")
 * @returns {Promise<number>} Balance in HBAR
 */
async function fetchWalletBalance(accountId) {
  try {
    const response = await axios.get(
      `https://mainnet-public.mirrornode.hedera.com/api/v1/accounts/${accountId}`,
      { timeout: 10000 }
    );
    
    if (response.data && response.data.balance) {
      // Convert from tinybars to HBAR (1 HBAR = 100,000,000 tinybars)
      return response.data.balance.balance / 100000000;
    }
    
    return 0;
  } catch (error) {
    console.error(`[Revenue Checker] Error fetching balance for ${accountId}:`, error.message);
    return 0;
  }
}

/**
 * Get current revenue statistics
 * @returns {Promise<Object>} Current revenue data
 */
async function getCurrentStats() {
  try {
    console.log('[Revenue Checker] Fetching current revenue stats...');
    
    const [coinflipBalance, jackpotBalance] = await Promise.all([
      fetchWalletBalance(WALLETS.coinflip),
      fetchWalletBalance(WALLETS.jackpot)
    ]);
    
    const totalBalance = coinflipBalance + jackpotBalance;
    
    const stats = {
      coinflip: coinflipBalance,
      jackpot: jackpotBalance,
      total: totalBalance,
      lastChecked: new Date().toISOString(),
      wallets: WALLETS
    };
    
    console.log('[Revenue Checker] Current stats:', {
      coinflip: stats.coinflip.toFixed(2),
      jackpot: stats.jackpot.toFixed(2),
      total: stats.total.toFixed(2)
    });
    
    return stats;
  } catch (error) {
    console.error('[Revenue Checker] Error getting current stats:', error.message);
    throw error;
  }
}

/**
 * Check for revenue changes and notify if there are increases
 * @param {string} gameType - Type of game that triggered the check
 * @returns {Promise<Object>} Result of the check
 */
async function checkAndNotifyRevenue(gameType = 'Unknown') {
  try {
    console.log(`[Revenue Checker] Checking revenue after ${gameType} event...`);
    
    // Get current balances
    const currentStats = await getCurrentStats();
    const { coinflip: currentCoinflip, jackpot: currentJackpot, total: currentTotal } = currentStats;
    
    // Check if this is the first check (no previous data)
    if (lastBalances.lastChecked === null) {
      console.log('[Revenue Checker] First time checking, storing baseline...');
      lastBalances = {
        coinflip: currentCoinflip,
        jackpot: currentJackpot,
        total: currentTotal,
        lastChecked: new Date().toISOString()
      };
      
      return {
        message: 'Baseline established',
        stats: currentStats,
        increase: 0,
        notificationSent: false
      };
    }
    
    // Calculate increases
    const totalIncrease = currentTotal - lastBalances.total;
    const coinflipIncrease = currentCoinflip - lastBalances.coinflip;
    const jackpotIncrease = currentJackpot - lastBalances.jackpot;
    
    console.log('[Revenue Checker] Balance comparison:', {
      coinflip: { 
        previous: lastBalances.coinflip.toFixed(2), 
        current: currentCoinflip.toFixed(2), 
        increase: coinflipIncrease.toFixed(4) 
      },
      jackpot: { 
        previous: lastBalances.jackpot.toFixed(2), 
        current: currentJackpot.toFixed(2), 
        increase: jackpotIncrease.toFixed(4) 
      },
      total: { 
        previous: lastBalances.total.toFixed(2), 
        current: currentTotal.toFixed(2), 
        increase: totalIncrease.toFixed(4) 
      }
    });
    
    let notificationSent = false;
    
    // Send notification if there's a significant increase (>= 0.001 HBAR)
    if (totalIncrease >= 0.001) {
      console.log(`[Revenue Checker] Revenue increased by ${totalIncrease.toFixed(4)} HBAR, sending notification...`);
      
      const revenueData = {
        coinflip: currentCoinflip,
        jackpot: currentJackpot,
        total: currentTotal,
        previousTotal: lastBalances.total,
        increase: totalIncrease,
        gameType: gameType
      };
      
      try {
        await discordNotifier.notifyRevenueUpdate(gameType, revenueData);
        notificationSent = true;
        console.log('[Revenue Checker] Revenue notification sent successfully');
      } catch (notifyError) {
        console.error('[Revenue Checker] Failed to send revenue notification:', notifyError.message);
      }
    } else {
      console.log(`[Revenue Checker] No significant revenue increase detected (${totalIncrease.toFixed(4)} HBAR)`);
    }
    
    // Update stored balances
    lastBalances = {
      coinflip: currentCoinflip,
      jackpot: currentJackpot,
      total: currentTotal,
      lastChecked: new Date().toISOString()
    };
    
    return {
      message: notificationSent ? 'Revenue increase detected and notification sent' : 'No significant revenue change',
      stats: currentStats,
      increase: totalIncrease,
      notificationSent: notificationSent,
      breakdown: {
        coinflipIncrease: coinflipIncrease,
        jackpotIncrease: jackpotIncrease,
        totalIncrease: totalIncrease
      }
    };
    
  } catch (error) {
    console.error('[Revenue Checker] Error checking revenue:', error.message);
    throw error;
  }
}

/**
 * Reset stored balances (useful for testing or maintenance)
 */
function resetBalances() {
  console.log('[Revenue Checker] Resetting stored balances...');
  lastBalances = {
    coinflip: 0,
    jackpot: 0,
    total: 0,
    lastChecked: null
  };
}

/**
 * Get last known balances
 * @returns {Object} Last stored balance data
 */
function getLastBalances() {
  return { ...lastBalances };
}

module.exports = {
  checkAndNotifyRevenue,
  getCurrentStats,
  resetBalances,
  getLastBalances,
  fetchWalletBalance
}; 