import { useEffect, useState } from 'react'
import { sendTelegramAlert } from '../utils/sendAlert'

export default function SniperDashboard() {
  const [krakenPrice, setKrakenPrice] = useState(null)
  const [coinbasePrice, setCoinbasePrice] = useState(null)
  const [spread, setSpread] = useState(null)
  const [tradeSize, setTradeSize] = useState(2000)
  const [useMarketOrder, setUseMarketOrder] = useState(true)
  const [totalProfit, setTotalProfit] = useState(0)
  const [totalCapital, setTotalCapital] = useState(2000)

  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const krakenRes = await fetch('https://api.kraken.com/0/public/Ticker?pair=SOLUSDT')
        const coinbaseRes = await fetch('https://api.coinbase.com/v2/prices/SOL-USD/spot')

        const krakenData = await krakenRes.json()
        const coinbaseData = await coinbaseRes.json()

        const kraken = parseFloat(krakenData.result.SOLUSDT.c[0])
        const coinbase = parseFloat(coinbaseData.data.amount)

        setKrakenPrice(kraken)
        setCoinbasePrice(coinbase)

        const calcSpread = ((coinbase - kraken) / kraken) * 100
        setSpread(calcSpread)

        if (calcSpread >= 1.1) {
          const profit = estProfit(kraken, coinbase)
          sendTelegramAlert(calcSpread, profit)
        }
      } catch (e) {
        console.error('Error fetching prices:', e)
      }
    }, 1000)

    return () => clearInterval(interval)
  }, [])

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
    if (profit > 0) {
      setTotalProfit(prev => prev + profit)
    }
  }

  const roiPercent = ((totalProfit / totalCapital) * 100).toFixed(2)

  return (
    <div style={{ padding: 20, fontFamily: 'sans-serif' }}>
      <h1>Sniper Dashboard</h1>
      <div>
        📉 Kraken Price: ${krakenPrice?.toFixed(2) || '...'}
        <br />
        📈 Coinbase Price: ${coinbasePrice?.toFixed(2) || '...'}
        <br />
        Spread: {spread ? spread.toFixed(2) : '...'}%
        <br />
        <span>(Sniper Zone ≥ 1.1%)</span>
      </div>

      <div style={{ marginTop: 20 }}>
        <div>💰 Trade Size</div>
        <input
          type="number"
          value={tradeSize}
          onChange={(e) => setTradeSize(parseFloat(e.target.value))}
        />
        <label>
          <input
            type="checkbox"
            checked={useMarketOrder}
            onChange={() => setUseMarketOrder(!useMarketOrder)}
            style={{ marginLeft: 10 }}
          />
          Using Market Order (higher fee + slippage)
        </label>
        <div>Est. Net Profit: ${estProfit().toFixed(2)}</div>
        <button onClick={recordTrade}>Record Trade</button>
      </div>

      <div style={{ marginTop: 20 }}>
        <div>📊 Tonight's ROI</div>
        <div>{roiPercent}%</div>
        <div>(Based on ${totalCapital} capital)</div>
        <div>Total Profit Today: ${totalProfit.toFixed(2)}</div>
      </div>
    </div>
  )
}

