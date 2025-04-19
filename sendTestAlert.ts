import axios from 'axios'

const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID

const testMessage = `📡 *TEST ALERT*\nPair: BTC/USD\nSpread: 3.21%\nEst. Profit: $0.64\n\n*Action*: Buy on Gemini (Market) / Sell on Kraken (Limit)`

axios.post(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`, {
  chat_id: TELEGRAM_CHAT_ID,
  text: testMessage,
  parse_mode: 'Markdown'
})
.then(() => console.log('✅ Test alert sent!'))
.catch(err => console.error('❌ Failed to send alert:', err.message))
