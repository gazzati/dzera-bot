import TelegramBot from "node-telegram-bot-api"

import config from "@root/config"

import { entities } from "@database/data-source"
import { getLogDate } from "@helpers/logger"

export const systemTgBot = new TelegramBot(config.systemTelegramToken, { polling: true })

systemTgBot.onText(/\/chats/, async msg => {
  const { chat } = msg
  if (chat.id !== config.systemTelegramChatId) return systemTgBot.sendMessage(chat.id, "Access denied")

  const chatsResponse = await entities.Chat.find({ order: { count: "DESC" }})

  const result = chatsResponse.reduce((acc, item) => {
    const user = `${item.username}(${item.first_name || ""}${item.last_name ? ` ${item.last_name}` : ""})`
    const createdDate = getLogDate(item.created_at)

    const resultItem = `#${item.id} \nUSER: ${user} \nCREATED: ${createdDate} \nMESSAGES COUNT: ${item.count} \n========== \n\n`

    return acc + resultItem
  }, "")

  if (!result) systemTgBot.sendMessage(chat.id, "---")

  systemTgBot.sendMessage(chat.id, result)
})
