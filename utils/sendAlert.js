export async function sendTelegramAlert(spread, profit, pair) {
  const token = '7876526288:AAHKFSpcjFt5MSodbDCHF_LiUGShCZBqSXI';
  const chatId = '6053545857';
  const message = `🚨 ${pair} Sniper Alert\nSpread: ${spread.toFixed(2)}%\nEst Profit: $${profit.toFixed(2)}\n🔥 MOVE FAST`;

  await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      chat_id: chatId,
      text: message,
    }),
  });
}
