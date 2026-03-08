import TelegramBot from "node-telegram-bot-api"

const TELEGRAM_MAX_MESSAGE_LENGTH = 4096
const TELEGRAM_SAFE_CHUNK_LENGTH = 4000

const splitMessage = (message: string, maxLength = TELEGRAM_SAFE_CHUNK_LENGTH): string[] => {
  if (message.length <= maxLength) return [message]

  const chunks: string[] = []
  let remaining = message

  while (remaining.length > maxLength) {
    const slice = remaining.slice(0, maxLength)
    const breakIndex = Math.max(slice.lastIndexOf("\n"), slice.lastIndexOf(" "))
    const splitIndex = breakIndex > 0 ? breakIndex : maxLength

    chunks.push(remaining.slice(0, splitIndex).trim())
    remaining = remaining.slice(splitIndex).trim()
  }

  if (remaining.length) chunks.push(remaining)

  return chunks
}

export const sendSafeTelegramMessage = async (
  bot: TelegramBot,
  chatId: number | string,
  message: string,
  options?: TelegramBot.SendMessageOptions
) => {
  const normalized = message || "-"
  const maxLength = options?.parse_mode ? TELEGRAM_SAFE_CHUNK_LENGTH : TELEGRAM_MAX_MESSAGE_LENGTH
  const messageChunks = splitMessage(normalized, maxLength)

  for (const chunk of messageChunks) {
    await bot.sendMessage(chatId, chunk, options)
  }
}
