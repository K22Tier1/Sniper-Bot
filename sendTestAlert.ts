import axios from 'axios'

const TELEGRAM_TOKEN = '7876526288:AAHKFSpcjFt5MSodbDCHF_LiUGShCZBqSXI'
const TELEGRAM_CHAT_ID = '6053545857'

const testMessage = `📡 *TEST ALERT*\nPair: BTC/USD\nSpread: 3.21%\nEst. Profit: $0.64\n\n*Action*: Buy on Gemini (Market) / Sell on Kraken (Limit)`

axios.post(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`, {
  chat_id: TELEGRAM_CHAT_ID,
  text: testMessage,
  parse_mode: 'Markdown',
})
  .then(() => console.log('✅ Test alert sent!'))
  .catch(err => console.error('❌ Failed to send alert:', err.message))
