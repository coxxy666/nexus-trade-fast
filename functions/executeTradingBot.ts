import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch all active bots for the user
    const activeBots = await base44.entities.TradingBot.filter({ status: 'active' });

    if (!activeBots || activeBots.length === 0) {
      return Response.json({ message: 'No active bots to execute', executed: 0 });
    }

    let executedCount = 0;

    for (const bot of activeBots) {
      try {
        await executeBotStrategy(base44, bot, user.email);
        executedCount++;
      } catch (botError) {
        console.error(`Error executing bot ${bot.id}:`, botError);
      }
    }

    return Response.json({ message: 'Bot execution completed', executed: executedCount });
  } catch (error) {
    console.error('Trading bot execution error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});

async function executeBotStrategy(base44, bot, userEmail) {
  const strategy = bot.strategy;
  const now = new Date();

  switch (strategy) {
    case 'buy_the_dip':
      return await executeBuyTheDip(base44, bot, userEmail, now);
    case 'pump_dump_detection':
      return await executePumpDumpDetection(base44, bot, userEmail, now);
    case 'portfolio_rebalancing':
      return await executePortfolioRebalancing(base44, bot, userEmail, now);
    default:
      throw new Error(`Unknown strategy: ${strategy}`);
  }
}

async function executeBuyTheDip(base44, bot, userEmail, now) {
  try {
    // Fetch current token price from GeckoTerminal or similar service
    const tokenPrice = await fetchTokenPrice(bot.token_symbol);
    
    // Get bot's reference price (could be stored in parameters or fetched from history)
    const trades = await base44.entities.Transaction.filter(
      { token_from: bot.token_symbol },
      '-created_date',
      1
    );

    if (trades.length === 0) {
      console.log(`No previous trades for ${bot.token_symbol}, skipping buy signal`);
      return;
    }

    const lastTrade = trades[0];
    const priceDropPercentage = ((lastTrade.amount_from - tokenPrice) / lastTrade.amount_from) * 100;

    if (priceDropPercentage >= bot.buy_threshold) {
      // Execute buy
      const tradeResult = await executeTrade(
        base44,
        bot,
        userEmail,
        'buy',
        bot.max_trade_amount,
        tokenPrice
      );

      // Update bot stats
      await updateBotStats(base44, bot.id, tradeResult, true);
    }

    // Check sell condition
    const recentBuys = await base44.entities.Transaction.filter(
      {
        token_to: bot.token_symbol,
        status: 'completed',
      },
      '-created_date',
      5
    );

    if (recentBuys.length > 0) {
      const avgBuyPrice = recentBuys.reduce((sum, t) => sum + t.amount_to, 0) / recentBuys.length;
      const priceRisePercentage = ((tokenPrice - avgBuyPrice) / avgBuyPrice) * 100;

      if (priceRisePercentage >= bot.sell_threshold) {
        // Execute sell
        const tradeResult = await executeTrade(
          base44,
          bot,
          userEmail,
          'sell',
          bot.max_trade_amount,
          tokenPrice
        );

        await updateBotStats(base44, bot.id, tradeResult, true);
      }
    }
  } catch (error) {
    console.error('Buy the dip execution error:', error);
    throw error;
  }
}

async function executePumpDumpDetection(base44, bot, userEmail, now) {
  try {
    const volumeData = await fetchTokenVolume(bot.token_symbol);
    const tokenPrice = await fetchTokenPrice(bot.token_symbol);

    // Check for pump (volume spike)
    if (volumeData.volumeChange >= bot.pump_detection_threshold) {
      // Potential pump detected, execute sell to lock in gains
      const tradeResult = await executeTrade(
        base44,
        bot,
        userEmail,
        'sell',
        bot.max_trade_amount,
        tokenPrice
      );
      await updateBotStats(base44, bot.id, tradeResult, true);
    }

    // Check for dump (price drop with high volume)
    if (volumeData.volumeChange >= bot.dump_detection_threshold && tokenPrice < volumeData.prevPrice) {
      // Potential dump detected, avoid buying
      console.log(`Dump detected for ${bot.token_symbol}, skipping buy`);
    }
  } catch (error) {
    console.error('Pump & dump detection error:', error);
    throw error;
  }
}

async function executePortfolioRebalancing(base44, bot, userEmail, now) {
  try {
    // Fetch user's current holdings
    const holdings = await base44.entities.Holding.filter({ created_by: userEmail });

    const targetToken = holdings.find(h => h.symbol === bot.token_symbol);
    const totalValue = holdings.reduce((sum, h) => sum + (h.balance * h.purchase_price), 0);
    const targetValue = (totalValue * bot.rebalance_target_percentage) / 100;

    if (targetToken) {
      const currentValue = targetToken.balance * (await fetchTokenPrice(bot.token_symbol));
      const difference = targetValue - currentValue;

      if (Math.abs(difference) > 50) { // Only rebalance if difference > $50
        if (difference > 0) {
          // Buy more
          await executeTrade(base44, bot, userEmail, 'buy', difference, await fetchTokenPrice(bot.token_symbol));
        } else if (difference < 0) {
          // Sell some
          await executeTrade(base44, bot, userEmail, 'sell', Math.abs(difference), await fetchTokenPrice(bot.token_symbol));
        }
        
        const tradeResult = { success: true, profit: difference };
        await updateBotStats(base44, bot.id, tradeResult, true);
      }
    }
  } catch (error) {
    console.error('Portfolio rebalancing error:', error);
    throw error;
  }
}

async function executeTrade(base44, bot, userEmail, type, amount, price) {
  try {
    // Create transaction record
    const transaction = await base44.entities.Transaction.create({
      type: 'swap',
      token_from: type === 'buy' ? 'USDT' : bot.token_symbol,
      token_to: type === 'buy' ? bot.token_symbol : 'USDT',
      amount_from: type === 'buy' ? amount : (amount / price),
      amount_to: type === 'buy' ? (amount / price) : amount,
      status: 'completed',
      tx_hash: `bot_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    });

    return { success: true, transaction, profit: 0 };
  } catch (error) {
    console.error('Trade execution error:', error);
    throw error;
  }
}

async function updateBotStats(base44, botId, tradeResult, success) {
  try {
    const bot = await base44.entities.TradingBot.get(botId);
    
    const newStats = {
      total_trades_executed: (bot.total_trades_executed || 0) + 1,
      total_profit_loss: (bot.total_profit_loss || 0) + (tradeResult.profit || 0),
      last_execution: new Date().toISOString(),
      win_rate: success ? 
        ((bot.total_trades_executed || 0) + 1) / ((bot.total_trades_executed || 0) + 1) * 100 : 
        ((bot.win_rate || 0) * (bot.total_trades_executed || 0)) / ((bot.total_trades_executed || 0) + 1),
    };

    await base44.entities.TradingBot.update(botId, newStats);
  } catch (error) {
    console.error('Error updating bot stats:', error);
  }
}

async function fetchTokenPrice(symbol) {
  try {
    const response = await fetch(
      `https://api.coingecko.com/api/v3/simple/price?ids=${symbol.toLowerCase()}&vs_currencies=usd`
    );
    const data = await response.json();
    return data[symbol.toLowerCase()]?.usd || 0;
  } catch {
    return 0;
  }
}

async function fetchTokenVolume(symbol) {
  try {
    const response = await fetch(
      `https://api.coingecko.com/api/v3/coins/${symbol.toLowerCase()}?localization=false`
    );
    const data = await response.json();
    return {
      volumeChange: (data.market_data?.total_volume?.usd || 0),
      prevPrice: data.market_data?.current_price?.usd || 0,
    };
  } catch {
    return { volumeChange: 0, prevPrice: 0 };
  }
}