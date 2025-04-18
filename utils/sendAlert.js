// utils/sendAlert.ts
import axios from 'axios'

const TELEGRAM_TOKEN = '6437304516:AAG-rNR1ZbUuVur1pKXltlb3GKxETChFKBU'
const TELEGRAM_CHAT_ID = '5640154733'

export async function sendTelegramAlert(pair: string, spread: number, profit: number, type: string) {
  const message = `📡 *ALERT*\nPair: ${pair}\nSpread: ${spread.toFixed(2)}%\nEst. Profit: $${profit.toFixed(
    2
  )}\n\n*Action*: ${
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
