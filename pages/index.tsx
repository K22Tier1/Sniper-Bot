import { useEffect, useState } from 'react'
import axios from 'axios'

const TELEGRAM_TOKEN = '7876526288:AAHKFSpcjFt5MSodbDCHF_LiUGShCZBqSXI'
const TELEGRAM_CHAT_ID = '6053545857'

const TRADE_PAIRS = [
  { id: 'SOL', kraken: 'SOLUSD', gemini: 'solusd' },
  { id: 'AVAX', kraken: 'AVAXUSD', gemini: 'avaxusd' },
  { id: 'MATIC', kraken: 'MATICUSD', gemini: 'maticusd' },
  { id: 'APT', kraken: 'APTUSD', gemini: 'aptusd' },
  { id: 'LTC', kraken: 'LTCUSD', gemini: 'ltcusd' },
  { id: 'LINK', kraken: 'LINKUSD', gemini: 'linkusd' }
]

const SPREAD_THRESHOLD = 1.1 // %
const TRADE_SIZE = 20 // USD test size
const COOLDOWN_MS = 1500 // 1.5s cooldown per pair

let lastTradeTimestamps: { [pair: string]: number } = {}

export default function SniperDashboard() {
  const [selectedPair, setSelectedPair] = useState(TRADE_PAIRS[0])
  const [krakenPrice, setKrakenPrice] = useState<number | null>(null)
  const [geminiPrice, setGeminiPrice] = useState<number | null>(null)
  const [spread, setSpread] = useState<number | null>(null)
  const [totalProfit, setTotalProfit] = useState<number>(0)
  const [isAboveThreshold, setIsAboveThreshold] = useState(false)

  const estProfit = (kraken: number, gemini: number) => {
    const gross = (gemini - kraken) * (TRADE_SIZE / kraken)
    const krakenFee = 0.0016 * TRADE_SIZE
    const geminiFee = 0.006 * TRADE_SIZE
    return gross - krakenFee - geminiFee
  }

  const sendTelegramAlert = async (spread: number, profit: number, pair: string, type: string) => {
    const message = `📡 *ALERT*\nPair: ${pair}\nSpread: ${spread.toFixed(2)}%\nEst. Profit: $${profit.toFixed(2)}\n\n*Action*: ${type}`
    await axios.post(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`, {
      chat_id: TELEGRAM_CHAT_ID,
      text: message,
      parse_mode: 'Markdown',
    })
  }

  useEffect(() => {
    const fetchPrices = async () => {
      try {
        const [krakenRes, geminiRes] = await Promise.all([
          axios.get(`https://api.kraken.com/0/public/Ticker?pair=${selectedPair.kraken}`),
          axios.get(`https://api.gemini.com/v1/pubticker/${selectedPair.gemini}`)
        ])

        const krakenData = krakenRes.data as { result: Record<string, { c: [string] }> }
        const geminiData = geminiRes.data as { ask: string; bid: string }

        const kraken = parseFloat(Object.values(krakenData.result)[0].c[0])
        const gemini = (parseFloat(geminiData.bid) + parseFloat(geminiData.ask)) / 2

        setKrakenPrice(kraken)
        setGeminiPrice(gemini)

        const calcSpread = ((gemini - kraken) / ((gemini + kraken) / 2)) * 100
        setSpread(calcSpread)

        const now = Date.now()
        const lastTrade = lastTradeTimestamps[selectedPair.id] || 0

        if (calcSpread >= SPREAD_THRESHOLD && now - lastTrade >= COOLDOWN_MS) {
          const profit = estProfit(kraken, gemini)
          await sendTelegramAlert(calcSpread, profit, selectedPair.id, 'Buy on Kraken / Sell on Gemini')
          lastTradeTimestamps[selectedPair.id] = now
          setTotalProfit(prev => prev + profit)
          setIsAboveThreshold(true)
        } else if (calcSpread < 1.05 && isAboveThreshold) {
          await sendTelegramAlert(calcSpread, estProfit(kraken, gemini), selectedPair.id, 'Spread dropped below 1.05% ❌')
          setIsAboveThreshold(false)
        }
      } catch (error) {
        console.error('Error fetching prices:', error)
      }
    }

    const interval = setInterval(fetchPrices, 1000)
    return () => clearInterval(interval)
  }, [selectedPair, isAboveThreshold])

  return (
    <div className="p-4 flex flex-col gap-4 max-w-md mx-auto">
      <h1 className="text-xl font-bold text-center">Sniper Arbitrage Dashboard</h1>
      <select
        value={selectedPair.id}
        onChange={(e) => setSelectedPair(TRADE_PAIRS.find(p => p.id === e.target.value)!)}
        className="border p-2 rounded"
      >
        {TRADE_PAIRS.map(pair => (
          <option key={pair.id} value={pair.id}>{pair.id}</option>
        ))}
      </select>
      <div className="border p-4 rounded shadow">
        <div>📉 Kraken ({selectedPair.id}): ${krakenPrice?.toFixed(2) || '...'}</div>
        <div>📈 Gemini ({selectedPair.id}): ${geminiPrice?.toFixed(2) || '...'}</div>
        <div className={`text-lg font-bold ${spread && spread >= 1.1 ? 'text-green-600' : spread && spread >= 1.05 ? 'text-yellow-500' : 'text-red-500'}`}>
          Spread: {spread ? spread.toFixed(2) : '...'}%
        </div>
        <div className="text-sm">(Green ≥ 1.1%, Yellow 1.05–1.09%)</div>
      </div>
      <div className="border p-4 rounded shadow text-center">
        <div className="text-md font-semibold">Est. Net Profit (if trade triggered):</div>
        <div className="text-lg mt-1">${krakenPrice && geminiPrice ? estProfit(krakenPrice, geminiPrice).toFixed(2) : '...'}</div>
      </div>
      <div className="border p-4 rounded shadow text-center">
        <div className="text-md font-semibold">Total Profit This Session:</div>
        <div className="text-lg text-blue-600 font-bold">${totalProfit.toFixed(2)}</div>
      </div>
    </div>
  )
}

