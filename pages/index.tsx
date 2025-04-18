import axios from 'axios';
import { useEffect, useState } from 'react';

const TELEGRAM_TOKEN = 'YOUR_REAL_TELEGRAM_BOT_TOKEN_HERE';
const TELEGRAM_CHAT_ID = 'YOUR_REAL_CHAT_ID_HERE';

const TRADE_PAIRS = ['SOL/USDT', 'AVAX/USDT', 'MATIC/USDT', 'APT/USDT', 'LTC/USDT', 'LINK/USDT'];
const SPREAD_THRESHOLD = 1.1; // %
const TRADE_SIZE = 2000;
const COOLDOWN_MS = 1500; // 1.5 seconds cooldown per pair

let lastTradeTimestamps: { [pair: string]: number } = {};

function calculateSpread(priceA: number, priceB: number) {
  return ((priceA - priceB) / ((priceA + priceB) / 2)) * 100;
}

async function sendTelegramAlert(pair: string, spread: number, profit: number, type: string) {
  const message = `📡 *ALERT*\nPair: ${pair}\nSpread: ${spread.toFixed(2)}%\nEst. Profit: $${profit.toFixed(2)}\n\n*Action*: ${type === 'geminiBuy' ? 'Buy on Gemini (Market) / Sell on Kraken (Limit)' : 'Buy on Kraken (Limit) / Sell on Gemini (Market)'}`;

  await axios.post(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`, {
    chat_id: TELEGRAM_CHAT_ID,
    text: message,
    parse_mode: 'Markdown',
  });
}

async function getPrices(pair: string) {
  const [base, quote] = pair.split('/');
  const krakenSymbol = `${base}${quote}`;
  const geminiSymbol = `${base}${quote}`;

  const [krakenRes, geminiRes] = await Promise.all([
    axios.get(`https://api.kraken.com/0/public/Ticker?pair=${krakenSymbol}`),
    axios.get(`https://api.gemini.com/v1/pubticker/${geminiSymbol.toLowerCase()}`),
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
  } catch (error: any) {
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

export default function SniperBotPage() {
  const [active, setActive] = useState(false);

  useEffect(() => {
    if (!active) {
      startSniping();
      setActive(true);
    }
  }, [active]);

  return (
    <div style={{ padding: '2rem' }}>
      <h1>Sniper Arbitrage Bot</h1>
      <p>Status: {active ? '✅ Active' : '⏳ Starting...'}</p>
      <p>Monitoring pairs: {TRADE_PAIRS.join(', ')}</p>
    </div>
  );
}
