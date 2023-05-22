import TelegramBot from "node-telegram-bot-api"

import config from "@root/config"

import { entities } from "@database/data-source"
import { getLogDate } from "@helpers/logger"

export const systemTgBot = new TelegramBot(config.systemTelegramToken, { polling: true })

systemTgBot.onText(/\/chats/, async msg => {
  const { chat } = msg
  if (chat.id !== config.systemTelegramChatId) return systemTgBot.sendMessage(chat.id, "Access denied")

  const chatsResponse = await entities.Chat.find()

  let result = ""

  for (const item of chatsResponse) {
    //TODO: remake to JOIN
    const count = await entities.Story.count({ where: { chat_id: item.id } })

    const user = `${item.username}(${item.first_name || ""}${item.last_name ? ` ${item.last_name}` : ""})`
    const createdDate = getLogDate(item.created_at)
    const updatedDate = getLogDate(item.updated_at)

    const resultItem = `#${item.id} \nUSER: ${user} \nCREATED: ${createdDate} \nUPDATED: ${updatedDate} \nMESSAGES COUNT: ${count} \n========== \n\n`

    result += resultItem
  }

  systemTgBot.sendMessage(chat.id, result)
})
