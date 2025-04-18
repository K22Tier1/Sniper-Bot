import { useEffect, useState } from 'react'
import { sendTelegramAlert } from '../utils/sendAlert'

const PAIRS = [
  { id: 'BTC', kraken: 'XBTUSDT', coinbase: 'BTC-USD' },
  { id: 'SOL', kraken: 'SOLUSDT', coinbase: 'SOL-USD' },
  { id: 'ETH', kraken: 'ETHUSDT', coinbase: 'ETH-USD' },
  { id: 'APE', kraken: 'APEUSDT', coinbase: 'APE-USD' },
  { id: 'DOGE', kraken: 'DOGEUSDT', coinbase: 'DOGE-USD' },
  { id: 'LTC', kraken: 'LTCUSDT', coinbase: 'LTC-USD' },
  { id: 'AVAX', kraken: 'AVAXUSDT', coinbase: 'AVAX-USD' },
  { id: 'MATIC', kraken: 'MATICUSDT', coinbase: 'MATIC-USD' },
]

export default function SniperDashboard() {
  const [selectedPair, setSelectedPair] = useState(PAIRS[0])
  const [krakenPrice, setKrakenPrice] = useState(null)
  const [coinbasePrice, setCoinbasePrice] = useState(null)
  const [spread, setSpread] = useState(null)
  const [tradeSize, setTradeSize] = useState(2000)
  const [useMarketOrder, setUseMarketOrder] = useState(true)
  const [totalProfit, setTotalProfit] = useState(0)
  const [totalCapital, setTotalCapital] = useState(2000)
  const [lastAlertSpread, setLastAlertSpread] = useState(0)
  const [isAboveThreshold, setIsAboveThreshold] = useState(false)

  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const krakenRes = await fetch(`https://api.kraken.com/0/public/Ticker?pair=${selectedPair.kraken}`)
        const coinbaseRes = await fetch(`https://api.coinbase.com/v2/prices/${selectedPair.coinbase}/spot`)

        const krakenData = await krakenRes.json()
        const coinbaseData = await coinbaseRes.json()

        const kraken = parseFloat(krakenData.result[selectedPair.kraken].c[0])
        const coinbase = parseFloat(coinbaseData.data.amount)

        setKrakenPrice(kraken)
        setCoinbasePrice(coinbase)

        const calcSpread = ((coinbase - kraken) / kraken) * 100
        setSpread(calcSpread)

        if (calcSpread >= 1.1 && !isAboveThreshold) {
          const profit = estProfit(kraken, coinbase)
          sendTelegramAlert(calcSpread, profit, selectedPair.id, 'Positive (Buy Kraken → Sell Coinbase)')
          setLastAlertSpread(calcSpread)
          setIsAboveThreshold(true)
        }

        if (calcSpread < 1.05 && isAboveThreshold) {
          sendTelegramAlert(calcSpread, estProfit(kraken, coinbase), selectedPair.id, 'Spread dropped below 1.05 — window closed ❌')
          setIsAboveThreshold(false)
        }
      } catch (e) {
        console.error('Error fetching prices:', e)
      }
    }, 1000)

    return () => clearInterval(interval)
  }, [selectedPair, isAboveThreshold])

  const estProfit = (kraken = krakenPrice, coinbase = coinbasePrice) => {
    if (!kraken || !coinbase) return 0
    const gross = (coinbase - kraken) * (tradeSize / kraken)
    const krakenFee = 0.0016
    const coinbaseFee = useMarketOrder ? 0.006 : 0.004
    const slippage = useMarketOrder ? 0.001 : 0
    const totalFees = tradeSize * (krakenFee + coinbaseFee) + (tradeSize * slippage)
    return gross - totalFees
  }

  const recordTrade = () => {
    const profit = estProfit()
    if (profit > 0) setTotalProfit(prev => prev + profit)
  }

  const roiPercent = ((totalProfit / totalCapital) * 100).toFixed(2)

  return (
    <div className="p-4 flex flex-col gap-4 max-w-md mx-auto">
      <h1 className="text-xl font-bold text-center">Sniper Dashboard</h1>

      <select
        value={selectedPair.id}
        onChange={(e) => setSelectedPair(PAIRS.find(p => p.id === e.target.value))}
        className="border p-2 rounded"
      >
        {PAIRS.map(pair => (
          <option key={pair.id} value={pair.id}>{pair.id}</option>
        ))}
      </select>

      <div className="border p-4 rounded shadow">
        <div>📉 Kraken ({selectedPair.id}): ${krakenPrice?.toFixed(2) || '...'}</div>
        <div>📈 Coinbase ({selectedPair.id}): ${coinbasePrice?.toFixed(2) || '...'}</div>
        <div className={`text-lg font-bold ${spread >= 1.1 ? 'text-green-600' : spread >= 1.05 ? 'text-yellow-500' : 'text-red-500'}`}>
          Spread: {spread ? spread.toFixed(2) : '...'}%
        </div>
        <div className="text-sm">(Green ≥ 1.1%, Yellow 1.05–1.09%)</div>
      </div>

      <div className="border p-4 rounded shadow text-center">
        <div className="text-md font-semibold">💰 Trade Size</div>
        <input
          type="number"
          value={tradeSize}
          onChange={(e) => setTradeSize(parseFloat(e.target.value))}
          className="border p-2 rounded text-center w-full mt-2"
        />
        <label className="text-sm mt-2 block">
          <input
            type="checkbox"
            checked={useMarketOrder}
            onChange={() => setUseMarketOrder(!useMarketOrder)}
            className="mr-2"
          />
          Using Market Order (higher fee + slippage)
        </label>
        <div className="text-md mt-2">Est. Net Profit: ${estProfit().toFixed(2)}</div>
        <button
          onClick={recordTrade}
          className="bg-green-600 text-white px-4 py-2 rounded mt-2"
        >
          Record Trade
        </button>
      </div>

      <div className="border p-4 rounded shadow text-center">
        <div className="text-md font-semibold">📊 Tonight's ROI</div>
        <div className="text-lg text-blue-600 font-bold">{roiPercent}%</div>
        <div className="text-sm">(Based on ${totalCapital} capital)</div>
        <div className="text-sm">Total Profit Today: ${totalProfit.toFixed(2)}</div>
      </div>
    </div>
  )
}


