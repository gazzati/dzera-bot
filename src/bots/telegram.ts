import TelegramBot from "node-telegram-bot-api"
import { ChatCompletionRequestMessageRoleEnum } from "openai"

import config from "@root/config"
import { openAIApi } from "@root/index"

import { entities } from "@database/data-source"
import { log, error } from "@helpers/logger"

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

      log({ from, action: text })
      bot.sendMessage(chat.id, `Привет, я Дзера, твой ассистент 🌸 \nПостараюсь ответить на любой вопрос ❤️`)
      return

    case "/reset":
      stories[chat.id] = []
      entities.Story.delete({ chat_id: chat.id })

      log({ from, action: text })
      bot.sendMessage(chat.id, "Контекст очищен. Я забыла все о чем мы сейчас говорили 🧘‍♀️")
      return

    case "/help":
      log({ from, action: text })
      bot.sendMessage(chat.id, "Если что то не работает, я не при чем 🤪 \nПиши @gazzati")
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

    const messages = stories[chat.id].map(message => ({
      role: ChatCompletionRequestMessageRoleEnum.User,
      content: message
    }))

    const response = await openAIApi.createChatCompletion({ model: config.gptModel, messages })
    const result = response.data.choices[0].message?.content as string

    log({ from, message: text, result })

    bot.sendMessage(chat.id, result)
    entities.Story.save({ chat_id: chat.id, content: text })
  } catch (e) {
    error(e)
    bot.sendMessage(chat.id, "Sorry, something wrong 🥹")
  }
})
