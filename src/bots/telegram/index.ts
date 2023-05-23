import TelegramBot, { User, Chat } from "node-telegram-bot-api"
import { OpenAIApi, ChatCompletionRequestMessage, ChatCompletionRequestMessageRoleEnum } from "openai"

import config from "@root/config"

import { entities } from "@database/data-source"
import { tgLog } from "@helpers/logger"

enum TelegramCommand {
  Start = "/start",
  Reset = "/reset",
  Help = "/help"
}

class Telegram {
  private bot: TelegramBot
  private openAIApi: OpenAIApi

  private COMMANDS = [TelegramCommand.Start, TelegramCommand.Reset, TelegramCommand.Help]
  private stories: { [chatId: number]: Array<string> } = {}

  constructor(openAIApi: OpenAIApi) {
    this.openAIApi = openAIApi
    this.bot = new TelegramBot(config.telegramToken, { polling: true })
  }

  public start() {
   this.bot.on("message", msg => {
    const { from, chat, text } = msg
    if (!from || !text) return

    try {
      if(this.COMMANDS.includes(text as TelegramCommand)) return this.command(from, chat, text)

      this.message(from, chat, text)

    } catch (error) {
      tgLog({ from, message: text, error })
      this.bot.sendMessage(chat.id, config.phrases.ERROR_MESSAGE)
    }
    })
  }

  private command (from: User, chat: Chat, action: string) {
    tgLog({ from, action })

    switch (action) {
      case "/start":
        this.bot.sendMessage(chat.id, config.phrases.START_MESSAGE)

        entities.Chat.save({
          id: chat.id,
          username: chat.username,
          first_name: chat.first_name,
          last_name: chat.last_name
        })

        return

      case "/reset":
        this.bot.sendMessage(chat.id, config.phrases.RESET_MESSAGE)

        this.stories[chat.id] = []
        entities.Story.delete({ chat_id: chat.id })

        return

      case "/help":
        this.bot.sendMessage(chat.id, config.phrases.HELP_MESSAGE)
        return
    }
  }

  private async message(from: User, chat: Chat, message: string) {
    this.bot.sendChatAction(chat.id, "typing")
      const messages = await this.getMessages(chat, message)

      const response = await this.openAIApi.createChatCompletion({ model: config.gptModel, messages })
      const result = response.data.choices[0].message?.content as string

      tgLog({ from, message, result })

      this.bot.sendMessage(chat.id, result)
      entities.Chat.save({ // TODO: remove later
        id: chat.id,
        username: chat.username,
        first_name: chat.first_name,
        last_name: chat.last_name
      })
      entities.Story.save({ chat_id: chat.id, content: message })
  }

  private async getMessages (chat: Chat, message: string): Promise<Array<ChatCompletionRequestMessage>> {
    if (!this.stories[chat.id]) {
      const storiesDB = await entities.Story.find({
        where: { chat_id: chat.id },
        select: ["content"]
      })

      this.stories[chat.id] = storiesDB.map(story => story.content)
    }

    this.stories[chat.id].push(message)

    return [config.phrases.INIT_MESSAGE, ...this.stories[chat.id]].map(message => ({
      role: ChatCompletionRequestMessageRoleEnum.User,
      content: message
    }))
  }
}

export default Telegram