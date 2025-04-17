import { useEffect, useState } from 'react';

export default function SniperDashboard() {
  const [krakenPrice, setKrakenPrice] = useState<number | null>(null);
  const [coinbasePrice, setCoinbasePrice] = useState<number | null>(null);
  const [spread, setSpread] = useState<number | null>(null);
  const [tradeSize, setTradeSize] = useState(2000);
  const [useMarketOrder, setUseMarketOrder] = useState(true);
  const [totalProfit, setTotalProfit] = useState(0);
  const [totalCapital, setTotalCapital] = useState(2000);

  useEffect(() => {
    const interval = setInterval(() => {
      const fetchPrices = async () => {
        try {
          const krakenRes = await fetch('https://api.kraken.com/0/public/Ticker?pair=SOLUSD');
          const coinbaseRes = await fetch('https://api.coinbase.com/v2/prices/SOL-USD/spot');
          const krakenData = await krakenRes.json();
          const coinbaseData = await coinbaseRes.json();

          const kraken = parseFloat(krakenData.result.SOLUSD.c[0]);
          const coinbase = parseFloat(coinbaseData.data.amount);

          setKrakenPrice(kraken);
          setCoinbasePrice(coinbase);
          const currentSpread = ((coinbase - kraken) / kraken) * 100;
          setSpread(currentSpread);

          // Play sniper sound if spread is in profit zone
          if (currentSpread >= 1.1) {
            new Audio('/ping.mp3').play();
            console.log('Sniper alert: Spread above 1.1%!');
          }

        } catch (e) {
          console.error('Failed to fetch prices:', e);
        }
      };

      fetchPrices();
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const estProfit = () => {
    if (!krakenPrice || !coinbasePrice) return 0;
    const gross = (coinbasePrice - krakenPrice) * (tradeSize / krakenPrice);
    const krakenFee = 0.0016;
    const coinbaseFee = useMarketOrder ? 0.006 : 0.004;
    const slippage = useMarketOrder ? 0.001 : 0;
    const totalFees = tradeSize * (krakenFee + coinbaseFee) + tradeSize * slippage;
    return gross - totalFees;
  };

  const recordTrade = () => {
    const profit = estProfit();
    if (profit > 0) {
      setTotalProfit(prev => prev + profit);
    }
  };

  const roiPercent = ((totalProfit / totalCapital) * 100).toFixed(2);

  return (
    <div className="p-4 flex flex-col gap-4 max-w-md mx-auto">
      <h1 className="text-xl font-bold text-center">Sniper Dashboard</h1>

      <div className="border p-4 rounded shadow">
        <div>📉 Kraken Price: ${krakenPrice?.toFixed(2) || '...'}</div>
        <div>📈 Coinbase Price: ${coinbasePrice?.toFixed(2) || '...'}</div>
        <div className={`text-lg font-bold ${spread && spread >= 1.1 ? 'text-green-600' : 'text-red-500'}`}>
          Spread: {spread ? spread.toFixed(2) : '...'}%
        </div>
        <div className="text-sm">(Sniper Zone ≥ 1.1%)</div>
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
  );
}
