import fs from "fs"

import TelegramBot, { User, Chat, Voice, PhotoSize } from "node-telegram-bot-api"

import config from "@root/config"

import { entities } from "@database/data-source"
import { tgLog } from "@helpers/logger"
import { convertToWav } from "@services/ffmpeg"
import { recognizeAudio } from "@services/recognizer"

import type OpenAI from "openai"

enum TelegramCommand {
  Start = "/start",
  Reset = "/reset",
  Help = "/help"
}

class Telegram {
  private bot: TelegramBot

  private COMMANDS = [TelegramCommand.Start, TelegramCommand.Reset, TelegramCommand.Help]
  private stories: { [chatId: number]: Array<string> } = {}

  constructor(private openAI: OpenAI) {
    this.bot = new TelegramBot(config.telegramToken, { polling: true })
  }

  public process() {
    this.bot.on("message", msg => {
      const { from, chat, text } = msg
      if (!from || !text) return

      if (this.COMMANDS.includes(text as TelegramCommand)) return this.commands(from, chat, text)

      this.message(from, chat, text)
    })

    this.bot.on("voice", msg => {
      const { from, chat, voice } = msg
      if (!from || !voice) return

      this.voice(from, chat, voice)
    })

    this.bot.on("photo", msg => {
      const { from, chat, photo } = msg
      if (!from || !photo) return

      this.photo(from, chat, photo)
    })
  }

  private async message(from: User, chat: Chat, message: string) {
    this.bot.sendChatAction(chat.id, "typing")
    const messages = await this.getMessages(chat, message)

    try {
      const response = await this.openAI.chat.completions.create({ model: config.gptModel, messages })
      const result = response.choices[0].message?.content
      if (!result) return this.bot.sendMessage(chat.id, config.phrases.ERROR_MESSAGE)

      this.bot.sendMessage(chat.id, result)

      tgLog({ from, message, result })

      entities.Chat.save({
        // TODO: remove later
        id: chat.id,
        username: chat.username,
        first_name: chat.first_name,
        last_name: chat.last_name
      })

      entities.Story.save({ chat_id: chat.id, content: message })
    } catch (error) {
      tgLog({ from, message, error })
      this.bot.sendMessage(chat.id, config.phrases.ERROR_MESSAGE)
    }
  }

  private async getMessages(chat: Chat, message: string): Promise<Array<OpenAI.ChatCompletionUserMessageParam>> {
    if (!this.stories[chat.id]) {
      const storiesDB = await entities.Story.find({
        // TODO: filter old messages
        where: { chat_id: chat.id },
        select: ["content"]
      })

      this.stories[chat.id] = storiesDB.map(story => story.content)
    }

    if (this.stories[chat.id].length > config.contextLengthLimit) {
      this.stories[chat.id].splice(0, this.stories[chat.id].length - config.contextLengthLimit)
    }

    this.stories[chat.id].push(message)

    return [config.phrases.INIT_MESSAGE, ...this.stories[chat.id]].map(message => ({
      role: "user",
      content: message
    }))
  }

  private async voice(from: User, chat: Chat, voice: Voice) {
    if (voice.duration > 10) return this.bot.sendMessage(chat.id, config.phrases.LONG_AUDIO_DURATION)

    try {
      const filePath = await this.bot.downloadFile(voice.file_id, config.filesPath)
      const newFile = await convertToWav(filePath)
      if (!newFile) {
        tgLog({ from, error: "Converting file Error" })
        this.bot.sendMessage(chat.id, config.phrases.ERROR_MESSAGE)
      }

      const transcript = await recognizeAudio(newFile)
      if (!transcript) {
        tgLog({ from, error: "File transcription Error" })
        return this.bot.sendMessage(chat.id, config.phrases.ERROR_MESSAGE)
      }

      tgLog({ from, transcript })

      this.message(from, chat, transcript)
    } catch (error) {
      tgLog({ from, error })
      this.bot.sendMessage(chat.id, config.phrases.ERROR_MESSAGE)
    }
  }

  private async photo(from: User, chat: Chat, photo: Array<PhotoSize>) {
    const photoFile = photo.shift() // shift for low quality, pop for high
    if (!photoFile) return

    try {
      const filePath = await this.bot.downloadFile(photoFile.file_id, config.filesPath)

      const file = fs.readFileSync(filePath)
      const image = Buffer.from(file).toString("base64")
      if (!image) {
        tgLog({ from, isVision: true, error: "Image error" })
        this.bot.sendMessage(chat.id, config.phrases.ERROR_VISION)
        return
      }

      const messages: Array<OpenAI.ChatCompletionUserMessageParam> = [
        {
          role: "user",
          content: [
            { type: "text", text: "Что на изображении?" },
            {
              type: "image_url",
              image_url: {
                url: `data:image/jpg;base64,${image}`
              }
            }
          ]
        }
      ]
      const response = await this.openAI.chat.completions.create({ model: config.gptModel, messages })

      const result = response?.choices[0]?.message?.content
      if (!result) {
        tgLog({ from, isVision: true, error: "Result error" })
        this.bot.sendMessage(chat.id, config.phrases.ERROR_VISION)
        return
      }

      this.bot.sendMessage(chat.id, result)

      tgLog({ from, result, isVision: true })
    } catch (error) {
      tgLog({ from, error, isVision: true })
      this.bot.sendMessage(chat.id, config.phrases.ERROR_VISION)
    }
  }

  private commands(from: User, chat: Chat, action: string) {
    tgLog({ from, action })

    switch (action) {
      case "/start":
        return this.start(chat)
      case "/reset":
        return this.reset(chat)
      case "/help":
        return this.help(chat)
    }
  }

  private start(chat: Chat) {
    this.bot.sendMessage(chat.id, config.phrases.START_MESSAGE)

    entities.Chat.save({
      id: chat.id,
      username: chat.username,
      first_name: chat.first_name,
      last_name: chat.last_name
    })
  }

  private reset(chat: Chat) {
    this.bot.sendMessage(chat.id, config.phrases.RESET_MESSAGE)

    this.stories[chat.id] = []
    entities.Story.delete({ chat_id: chat.id })
  }

  private help(chat: Chat) {
    this.bot.sendMessage(chat.id, config.phrases.HELP_MESSAGE)
  }
}

export default Telegram
