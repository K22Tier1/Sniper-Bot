import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    const krakenRes = await fetch('https://api.kraken.com/0/public/Ticker?pair=SOLUSDT');
    const coinbaseRes = await fetch('https://api.coinbase.com/v2/prices/SOL-USD/spot');

    const krakenData = await krakenRes.json();
    const coinbaseData = await coinbaseRes.json();

    const kraken = parseFloat(krakenData.result.SOLUSDT.c[0]);
    const coinbase = parseFloat(coinbaseData.data.amount);

    res.status(200).json({ kraken, coinbase });
  } catch (e) {
    console.error('API error:', e);
    res.status(500).json({ error: 'Failed to fetch prices' });
  }
}
