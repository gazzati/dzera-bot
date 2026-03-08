import TelegramBot from "node-telegram-bot-api"

const TELEGRAM_MAX_MESSAGE_LENGTH = 4096
const TELEGRAM_SAFE_CHUNK_LENGTH = 3500
const TELEGRAM_MIN_CHUNK_LENGTH = 200

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

const isMessageTooLongError = (error: unknown): boolean => {
  const message = String(error)
  return message.includes("message is too long")
}

export const sendSafeTelegramMessage = async (
  bot: TelegramBot,
  chatId: number | string,
  message: string,
  options?: TelegramBot.SendMessageOptions
) => {
  const normalized = message || "-"
  const initialMaxLength = options?.parse_mode ? TELEGRAM_SAFE_CHUNK_LENGTH : Math.min(TELEGRAM_SAFE_CHUNK_LENGTH, TELEGRAM_MAX_MESSAGE_LENGTH)
  const queue = splitMessage(normalized, initialMaxLength)

  while (queue.length) {
    const chunk = queue.shift()
    if (!chunk) continue

    try {
      await bot.sendMessage(chatId, chunk, options)
    } catch (error) {
      if (!isMessageTooLongError(error) || chunk.length <= TELEGRAM_MIN_CHUNK_LENGTH) {
        throw error
      }

      const nextLength = Math.max(TELEGRAM_MIN_CHUNK_LENGTH, Math.floor(chunk.length / 2))
      const smallerChunks = splitMessage(chunk, nextLength)
      queue.unshift(...smallerChunks)
    }
  }
}
