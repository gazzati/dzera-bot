import TelegramBot from "node-telegram-bot-api"
import { ChatCompletionRequestMessageRoleEnum } from "openai"

import config from "@root/config"
import { openAIApi } from "@root/index"

import { entities } from "@database/data-source"
import { tgLog } from "@helpers/logger"

import phrases from "./phrases"

const bot = new TelegramBot(config.telegramToken, { polling: true })

const stories: { [chatId: number]: Array<string> } = {}

bot.on("message", async msg => {
  const { from, chat, text } = msg
  if (!from || !text) return

  switch (text) {
    case "/start":
      entities.Chat.save({
        id: chat.id,
        username: chat.username,
        first_name: chat.first_name,
        last_name: chat.last_name
      })

      tgLog({ from, action: text })
      bot.sendMessage(chat.id, phrases.START_MESSAGE)
      return

    case "/reset":
      stories[chat.id] = []
      entities.Story.delete({ chat_id: chat.id })

      tgLog({ from, action: text })
      bot.sendMessage(chat.id, phrases.RESET_MESSAGE)
      return

    case "/help":
      tgLog({ from, action: text })
      bot.sendMessage(chat.id, phrases.HELP_MESSAGE)
      return
  }

  try {
    bot.sendChatAction(chat.id, "typing")

    if (!stories[chat.id]) {
      const storiesDB = await entities.Story.find({
        where: { chat_id: chat.id },
        select: ["content"]
      })

      stories[chat.id] = storiesDB.map(story => story.content)
    }

    stories[chat.id].push(text)

    const messages = [phrases.INIT_MESSAGE, ...stories[chat.id]].map(message => ({
      role: ChatCompletionRequestMessageRoleEnum.User,
      content: message
    }))

    const response = await openAIApi.createChatCompletion({ model: config.gptModel, messages })
    const result = response.data.choices[0].message?.content as string

    tgLog({ from, message: text, result })

    bot.sendMessage(chat.id, result)
    entities.Chat.save({ // TODO: remove later
      id: chat.id,
      username: chat.username,
      first_name: chat.first_name,
      last_name: chat.last_name
    })
    entities.Story.save({ chat_id: chat.id, content: text })
  } catch (error) {
    tgLog({ from, message: text, error })
    bot.sendMessage(chat.id, phrases.ERROR_MESSAGE)
  }
})
