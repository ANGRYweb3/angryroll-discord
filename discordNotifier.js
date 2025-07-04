const axios = require('axios');

// Discord webhook URLs from environment variables
const DISCORD_WEBHOOK_URL_GAMES = process.env.DISCORD_WEBHOOK_URL_GAMES;
const DISCORD_WEBHOOK_URL_REVENUE = process.env.DISCORD_WEBHOOK_URL_REVENUE;

// Message deduplication system
const sentMessages = new Map();
const MESSAGE_DEDUP_WINDOW = 30000; // 30 seconds window to prevent duplicates

/**
 * Generate a unique key for message deduplication
 * @param {string} title - Message title
 * @param {string} type - Message type
 * @param {Array} fields - Message fields
 * @returns {string} Unique key
 */
function generateMessageKey(title, type, fields = []) {
  // For revenue notifications, include timestamp to minute level (allow different minute notifications)
  if (type === 'revenue') {
    const minute = Math.floor(Date.now() / 60000); // Round to minute
    return `${type}-${title}-${minute}`;
  }
  
  // For game notifications, include relevant game data
  const gameData = fields.find(f => f.name.includes('Game ID') || f.name.includes('Round ID'));
  const gameId = gameData ? gameData.value : '';
  return `${type}-${title}-${gameId}`;
}

/**
 * Check if message was recently sent to prevent duplicates
 * @param {string} messageKey - Unique message key
 * @returns {boolean} True if message was recently sent
 */
function isDuplicateMessage(messageKey) {
  const now = Date.now();
  
  // Clean old entries
  for (const [key, timestamp] of sentMessages.entries()) {
    if (now - timestamp > MESSAGE_DEDUP_WINDOW) {
      sentMessages.delete(key);
    }
  }
  
  // Check if this message was recently sent
  if (sentMessages.has(messageKey)) {
    return true;
  }
  
  // Mark this message as sent
  sentMessages.set(messageKey, now);
  return false;
}

/**
 * Send notification to Discord
 * @param {string} title - Notification title
 * @param {string} description - Notification description  
 * @param {number} color - Embed color (hex)
 * @param {Array} fields - Additional fields
 * @param {string} type - Notification type ('games' or 'revenue')
 */
async function sendDiscordNotification(title, description, color = 0x00ff00, fields = [], type = 'games') {
  // Check for duplicate messages
  const messageKey = generateMessageKey(title, type, fields);
  if (isDuplicateMessage(messageKey)) {
    console.log(`[Discord] Skipping duplicate message: ${messageKey}`);
    return { success: true, message: 'Duplicate message skipped' };
  }

  let webhookUrl;
  
  if (type === 'revenue') {
    webhookUrl = DISCORD_WEBHOOK_URL_REVENUE || DISCORD_WEBHOOK_URL_GAMES; // Fallback to games if revenue not set
  } else {
    webhookUrl = DISCORD_WEBHOOK_URL_GAMES;
  }
  
  if (!webhookUrl) {
    console.warn(`[Discord] Webhook URL not configured for type: ${type}`);
    return;
  }

  const embed = {
    title: title,
    description: description,
    color: color,
    fields: fields,
    timestamp: new Date().toISOString(),
    footer: {
      text: 'Angryroll Gaming Platform',
      icon_url: 'https://i.ibb.co/jP4k6Bzy/Website-Logo-Text-Valo2-1.png'
    },
    thumbnail: {
      url: 'https://i.ibb.co/4ZrYNdfK/Group-5641.png'
    }
  };

  try {
    await axios.post(webhookUrl, {
      embeds: [embed]
    }, {
      timeout: 10000,
      // Disable any automatic retries
      'axios-retry': {
        retries: 0
      }
    });
    console.log(`[Discord] ${type.toUpperCase()} notification sent: ${title}`);
    return { success: true, message: 'Notification sent successfully' };
  } catch (error) {
    console.error(`[Discord] Failed to send ${type} notification:`, error.message);
    // Remove from dedup cache if sending failed so it can be retried later
    sentMessages.delete(messageKey);
    throw error;
  }
}

/**
 * Notify about new Coinflip game creation
 * @param {Object} gameData - Game data object
 */
async function notifyNewCoinflipGame(gameData) {
  const title = '🎮 New Coinflip Game Created!';
  const description = `🎯 **Game ID ${gameData.id}** is ready to challenge!\n\n🎮 **[🚀 PLAY NOW - JOIN THE GAME!](https://angryroll.fun/coinflip)**`;
  
  const fields = [
    {
      name: '🆔 Game ID',
      value: `\`${gameData.id}\``,
      inline: true
    },
    {
      name: '💰 Bet Amount',
      value: `**${gameData.betAmount} HBAR**`,
      inline: true
    },
    {
      name: '👤 Creator',
      value: gameData.creator || 'Unknown',
      inline: true
    },
    {
      name: '🪙 Creator Choice',
      value: gameData.creatorChoice === 0 ? '**HEADS** 🪙' : '**TAILS** 🪙',
      inline: true
    },
    {
      name: '⏰ Status',
      value: '🟢 **Waiting for challenger**',
      inline: true
    },
    {
      name: '🎯 Challenge This Game',
      value: '**[🎮 JOIN BATTLE →](https://angryroll.fun/coinflip)**',
      inline: true
    }
  ];

  return await sendDiscordNotification(title, description, 0xF84565, fields, 'games');
}

/**
 * Notify about Coinflip game settlement
 * @param {Object} gameData - Game settlement data
 */
async function notifyCoinflipGameSettled(gameData) {
  const title = '🏆 Coinflip Game Completed!';
  const description = `A coinflip game has been settled with a winner.`;
  
  const fields = [
    {
      name: '🆔 Game ID',
      value: `\`${gameData.gameId}\``,
      inline: true
    },
    {
      name: '💰 Wager Amount',
      value: `**${gameData.wagerAmount} HBAR**`,
      inline: true
    },
    {
      name: '🏆 Winner',
      value: gameData.winnerId || 'Unknown',
      inline: true
    },
    {
      name: '🪙 Winning Side',
      value: gameData.winningSide === 'HEADS' ? '**HEADS** 🪙' : '**TAILS** 🪙',
      inline: true
    },
    {
      name: '🤖 Bot Game',
      value: gameData.challengedByBot ? 'Yes' : 'No',
      inline: true
    },
    {
      name: '💸 Platform Fee',
      value: `${gameData.feeCharged} HBAR`,
      inline: true
    }
  ];

  return await sendDiscordNotification(title, description, 0x00ff00, fields, 'games');
}

/**
 * Notify about Jackpot entry
 * @param {Object} participantData - Participant data
 * @param {number} currentPot - Current pot amount
 * @param {number} participantCount - Number of participants
 */
async function notifyJackpotEntry(participantData, currentPot, participantCount) {
  const title = '🎰 New Jackpot Entry!';
  const description = `Someone joined the current jackpot round.`;
  
  const fields = [
    {
      name: '👤 Player',
      value: participantData.username || participantData.accountId || 'Anonymous',
      inline: true
    },
    {
      name: '💰 Entry Amount',
      value: `**${participantData.amountEntered} HBAR**`,
      inline: true
    },
    {
      name: '🎯 Win Chance',
      value: `${participantData.chancePercentage}%`,
      inline: true
    },
    {
      name: '🏆 Current Pot',
      value: `**${currentPot} HBAR**`,
      inline: true
    },
    {
      name: '👥 Total Players',
      value: `${participantCount} players`,
      inline: true
    },
    {
      name: '🔗 Join Jackpot',
      value: '[Play Now](https://angryroll.fun/jackpot)',
      inline: true
    }
  ];

  return await sendDiscordNotification(title, description, 0xFFD700, fields, 'games');
}

/**
 * Notify about Jackpot winner
 * @param {Object} winnerData - Winner data
 */
async function notifyJackpotWinner(winnerData) {
  const title = '🎉 Jackpot Winner Announced!';
  const description = `We have a jackpot winner! Congratulations! 🎊`;
  
  const fields = [
    {
      name: '🏆 Winner',
      value: winnerData.winnerUsername || winnerData.winnerId || 'Anonymous',
      inline: true
    },
    {
      name: '💰 Prize Amount',
      value: `**${winnerData.prizeAmount} HBAR**`,
      inline: true
    },
    {
      name: '🎯 Win Chance',
      value: `${winnerData.winChance || 'N/A'}%`,
      inline: true
    },
    {
      name: '🎰 Round ID',
      value: `\`${winnerData.roundId}\``,
      inline: true
    },
    {
      name: '👥 Total Players',
      value: `${winnerData.participantCount} players`,
      inline: true
    },
    {
      name: '🏆 Total Pot',
      value: `${winnerData.totalPot} HBAR`,
      inline: true
    }
  ];

  return await sendDiscordNotification(title, description, 0xFF6B35, fields, 'games');
}

/**
 * Notify about revenue increase
 * @param {string} gameType - Type of game (Coinflip, Jackpot)
 * @param {Object} revenueData - Revenue data
 */
async function notifyRevenueUpdate(gameType, revenueData) {
  const { coinflip, jackpot, total, previousTotal } = revenueData;
  const increase = total - (previousTotal || 0);
  
  if (increase <= 0) {
    console.log('[Discord] No revenue increase detected, skipping notification');
    return { success: true, message: 'No revenue increase' };
  }
  
  const title = '💰 Platform Revenue Updated!';
  const description = `Revenue has been updated after ${gameType} game settlement.`;
  
  const fields = [
    {
      name: '🎮 Game Type',
      value: `**${gameType}**`,
      inline: true
    },
    {
      name: '➕ Revenue Increase',
      value: `**+${increase.toFixed(4)} HBAR**`,
      inline: true
    },
    {
      name: '💎 Total Revenue',
      value: `**${total.toFixed(2)} HBAR**`,
      inline: true
    },
    {
      name: '🎯 Coinflip Revenue',
      value: `${coinflip.toFixed(2)} HBAR`,
      inline: true
    },
    {
      name: '🎰 Jackpot Revenue',
      value: `${jackpot.toFixed(2)} HBAR`,
      inline: true
    },
    {
      name: '📈 Status',
      value: '🚀 Growing steadily!',
      inline: true
    }
  ];

  return await sendDiscordNotification(title, description, 0x00ff00, fields, 'revenue');
}

module.exports = {
  sendDiscordNotification,
  notifyNewCoinflipGame,
  notifyCoinflipGameSettled,
  notifyJackpotEntry,
  notifyJackpotWinner,
  notifyRevenueUpdate
}; 