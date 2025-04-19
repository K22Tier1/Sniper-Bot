import { useEffect, useState } from 'react'
import axios from 'axios'

const TELEGRAM_TOKEN = '7876526288:AAHKFSpcjFt5MSodbDCHF_LiUGShCZBqSXI'
const TELEGRAM_CHAT_ID = '6053545857'

const TRADE_PAIRS = ['SOL/USD', 'AVAX/USD', 'MATIC/USD', 'APT/USD', 'LTC/USD', 'LINK/USD']
const SPREAD_THRESHOLD = 1.1 // %
const TRADE_SIZE = 20 // USD test size
const COOLDOWN_MS = 1500 // 1.5s cooldown per pair

let lastTradeTimestamps: { [pair: string]: number } = {}

type PriceData = {
  krakenAsk: number
  krakenBid: number
  geminiAsk: number
  geminiBid: number
}

async function getPrices(pair: string): Promise<PriceData> {
  const [base, quote] = pair.split('/')
  const krakenSymbol = `${base}${quote}`
  const geminiSymbol = `${base.toLowerCase()}${quote.toLowerCase()}`

  const [krakenRes, geminiRes] = await Promise.all([
    axios.get(`https://api.kraken.com/0/public/Ticker?pair=${krakenSymbol}`),
    axios.get(`https://api.gemini.com/v1/pubticker/${geminiSymbol}`)
  ])

  const krakenData = krakenRes.data as { result: Record<string, { a: string[]; b: string[] }> }
  const geminiData = geminiRes.data as { ask: string; bid: string }

  const krakenAsk = parseFloat(Object.values(krakenData.result)[0].a[0])
  const krakenBid = parseFloat(Object.values(krakenData.result)[0].b[0])
  const geminiAsk = parseFloat(geminiData.ask)
  const geminiBid = parseFloat(geminiData.bid)

  return { krakenAsk, krakenBid, geminiAsk, geminiBid }
}

function calculateSpread(priceA: number, priceB: number): number {
  return ((priceA - priceB) / ((priceA + priceB) / 2)) * 100
}

async function sendTelegramAlert(pair: string, spread: number, profit: number, type: string): Promise<void> {
  const message = `📡 *ALERT*\nPair: ${pair}\nSpread: ${spread.toFixed(2)}%\nEst. Profit: $${profit.toFixed(2)}\n\n*Action*: ${
    type === 'geminiBuy'
      ? 'Buy on Gemini (Market) / Sell on Kraken (Limit)'
      : 'Buy on Kraken (Limit) / Sell on Gemini (Market)'
  }`

  await axios.post(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`, {
    chat_id: TELEGRAM_CHAT_ID,
    text: message,
    parse_mode: 'Markdown',
  })
}

export default function SniperDashboard() {
  const [data, setData] = useState<any[]>([])
  const [totalProfit, setTotalProfit] = useState<number>(0)

  useEffect(() => {
    const updateRow = (row: any) => {
      setData((prev) => {
        const index = prev.findIndex((r) => r.pair === row.pair)
        if (index >= 0) {
          const updated = [...prev]
          updated[index] = row
          return updated
        } else {
          return [...prev, row]
        }
      })
    }

    const checkSpread = async (pair: string) => {
      try {
        const prices = await getPrices(pair)
        const now = Date.now()
        const lastTrade = lastTradeTimestamps[pair] || 0

        const forwardSpread = calculateSpread(prices.geminiBid, prices.krakenAsk)
        const reverseSpread = calculateSpread(prices.krakenBid, prices.geminiAsk)

        if (forwardSpread >= SPREAD_THRESHOLD && now - lastTrade >= COOLDOWN_MS) {
          const profit = (forwardSpread / 100) * TRADE_SIZE
          await sendTelegramAlert(pair, forwardSpread, profit, 'geminiBuy')
          lastTradeTimestamps[pair] = now
          updateRow({ pair, ...prices, spread: forwardSpread, profit, action: 'Buy Gemini / Sell Kraken' })
          setTotalProfit(prev => prev + profit)
        } else if (reverseSpread >= SPREAD_THRESHOLD && now - lastTrade >= COOLDOWN_MS) {
          const profit = (reverseSpread / 100) * TRADE_SIZE
          await sendTelegramAlert(pair, reverseSpread, profit, 'krakenBuy')
          lastTradeTimestamps[pair] = now
          updateRow({ pair, ...prices, spread: reverseSpread, profit, action: 'Buy Kraken / Sell Gemini' })
          setTotalProfit(prev => prev + profit)
        }
      } catch (err: any) {
        console.error(`Error checking spread for ${pair}:`, err.message)
      }
    }

    const interval = setInterval(() => {
      TRADE_PAIRS.forEach((pair) => checkSpread(pair))
    }, 250)

    return () => clearInterval(interval)
  }, [])

  return (
    <div style={{ padding: '2rem' }}>
      <h1>Sniper Arbitrage Dashboard</h1>
      <h2>Total Est. Profit: ${totalProfit.toFixed(2)}</h2>
      <table border={1} cellPadding={8}>
        <thead>
          <tr>
            <th>Pair</th>
            <th>Kraken Ask</th>
            <th>Kraken Bid</th>
            <th>Gemini Ask</th>
            <th>Gemini Bid</th>
            <th>Spread %</th>
            <th>Profit</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          {data.map((row, i) => (
            <tr key={i}>
              <td>{row.pair}</td>
              <td>${row.krakenAsk.toFixed(2)}</td>
              <td>${row.krakenBid.toFixed(2)}</td>
              <td>${row.geminiAsk.toFixed(2)}</td>
              <td>${row.geminiBid.toFixed(2)}</td>
              <td>{row.spread.toFixed(2)}%</td>
              <td>${row.profit.toFixed(2)}</td>
              <td>{row.action}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
