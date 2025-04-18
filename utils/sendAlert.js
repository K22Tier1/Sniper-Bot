const TOKEN = '7876526288:AAHKFSpcjFt5MSodbDCHF_LiUGShCZBqSXI'
const CHAT_ID = '6053545857'

export const sendTelegramAlert = async (spread, profit, pair, type) => {
  const message = `📡 *ALERT*\nPair: ${pair}\nSpread: ${spread.toFixed(2)}%\nEst. Profit: $${profit.toFixed(2)}\nType: ${type}`
  await fetch(`https://api.telegram.org/bot${TOKEN}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: CHAT_ID,
      text: message,
      parse_mode: 'Markdown'
    })
  })
}
