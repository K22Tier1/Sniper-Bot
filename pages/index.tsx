import axios from 'axios';

// Replace with your actual Telegram bot token and chat ID
const TELEGRAM_TOKEN = '123456789:ABCDefGhIJKlmNoPQrStuvWxYZ12345678';
const TELEGRAM_CHAT_ID = '987654321';

// Supported USD trading pairs on both Gemini and Kraken
const TRADE_PAIRS = ['BTC/USD', 'ETH/USD', 'LTC/USD', 'LINK/USD', 'SOL/USD'];

const SPREAD_THRESHOLD = 1.1; // %
const TRADE_SIZE = 2000; // USD
const COOLDOWN_MS = 1500; // 1.5 seconds cooldown per pair

let lastTradeTimestamps: { [pair: string]: number } = {};

async function getPrices(pair: string) {
  const [base, quote] = pair.split('/');
  const krakenSymbol = `${base}${quote}`;
  const geminiSymbol = `${base}${quote}`;

  const [krakenRes, geminiRes] = await Promise.all([
    axios.get(`https://api.kraken.com/0/public/Ticker?pair=${krakenSymbol}`),
    axios.get(`https://api.gemini.com/v1/pubticker/${geminiSymbol}`),
  ]);

  const krakenAsk = parseFloat(Object.values(krakenRes.data.result)[0]['a'][0]);
  const krakenBid = parseFloat(Object.values(krakenRes.data.result)[0]['b'][0]);
  const geminiAsk = parseFloat(geminiRes.data.ask);
  const geminiBid = parseFloat(geminiRes.data.bid);

  return {
    krakenAsk,
    krakenBid,
    geminiAsk,
    geminiBid,
  };
}

function calculateSpread(priceA: number, priceB: number) {
  return ((priceA - priceB) / ((priceA + priceB) / 2)) * 100;
}

async function sendTelegramAlert(pair: string, spread: number, profit: number, type: string) {
  const message = `📡 *ALERT*\nPair: ${pair}\nSpread: ${spread.toFixed(2)}%\nEst. Profit: $${profit.toFixed(
    2
  )}\n\n*Action*: ${type === 'geminiBuy' ? 'Buy on Gemini (Market) / Sell on Kraken (Limit)' : 'Buy on Kraken (Limit) / Sell on Gemini (Market)'}`;

  await axios.post(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`, {
    chat_id: TELEGRAM_CHAT_ID,
    text: message,
    parse_mode: 'Markdown',
  });
}

async function checkSpread(pair: string) {
  try {
    const prices = await getPrices(pair);

    const now = Date.now();
    const lastTrade = lastTradeTimestamps[pair] || 0;

    const forwardSpread = calculateSpread(prices.geminiBid, prices.krakenAsk);
    const reverseSpread = calculateSpread(prices.krakenBid, prices.geminiAsk);

    if (forwardSpread >= SPREAD_THRESHOLD && now - lastTrade >= COOLDOWN_MS) {
      const profit = (forwardSpread / 100) * TRADE_SIZE;
      await sendTelegramAlert(pair, forwardSpread, profit, 'geminiBuy');
      lastTradeTimestamps[pair] = now;
    } else if (reverseSpread >= SPREAD_THRESHOLD && now - lastTrade >= COOLDOWN_MS) {
      const profit = (reverseSpread / 100) * TRADE_SIZE;
      await sendTelegramAlert(pair, reverseSpread, profit, 'krakenBuy');
      lastTradeTimestamps[pair] = now;
    }
  } catch (error) {
    console.error(`Error checking spread for ${pair}:`, error.message);
  }
}

function startSniping() {
  console.log('Sniper bot running with 250ms spread checks...');

  setInterval(() => {
    TRADE_PAIRS.forEach((pair) => {
      checkSpread(pair);
    });
  }, 250);
}

startSniping();
