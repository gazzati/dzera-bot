import fs from "fs"

import TelegramBot, { User, Chat, Voice, PhotoSize } from "node-telegram-bot-api"

import config from "@root/config"

import { entities } from "@database/data-source"
import { tgLog } from "@helpers/logger"
import { visionTemplate } from "@helpers/templates"
import { convertToWav } from "@services/ffmpeg"
import { recognizeAudio } from "@services/recognizer"

import type OpenAI from "openai"

import Context from "./Context"
import { TelegramCommand } from "./interfaces"

const COMMANDS = [TelegramCommand.Start, TelegramCommand.Photo, TelegramCommand.Reset, TelegramCommand.Help]

class Telegram extends Context {
  private bot: TelegramBot

  constructor(private openAI: OpenAI) {
    super()
    this.bot = new TelegramBot(config.telegramToken, { polling: true })
  }

  public process() {
    this.bot.on("message", msg => {
      const { from, chat, text } = msg
      if (!from || !text) return

      if (COMMANDS.includes(text as TelegramCommand)) return this.commands(from, chat, text)

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

    this.createOrUpdateChat(chat)
    this.saveQuery(chat, message)
    const messages = this.getContextMessages(chat)

    try {
      const response = await this.openAI.chat.completions.create({ model: config.gptModel, messages })

      const tokens = response.usage?.total_tokens || 0
      const result = response.choices[0].message?.content
      if (!result) return this.bot.sendMessage(chat.id, config.phrases.ERROR_MESSAGE)

      this.bot.sendMessage(chat.id, result)

      tgLog({ from, message, result, tokens })

      this.saveResult(chat, result)
    } catch (error) {
      tgLog({ from, message, error })
      this.bot.sendMessage(chat.id, config.phrases.ERROR_MESSAGE)
    }
  }

  private async voice(from: User, chat: Chat, voice: Voice) {
    if (voice.duration > 10) return this.bot.sendMessage(chat.id, config.phrases.LONG_AUDIO_DURATION)

    this.bot.sendChatAction(chat.id, "typing")

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
    this.bot.sendChatAction(chat.id, "typing")

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

      this.clearContext(chat)

      const messages = visionTemplate(image)

      const response = await this.openAI.chat.completions.create({ model: config.gptModel, messages })

      const tokens = response.usage?.total_tokens || 0
      const result = response?.choices[0]?.message?.content
      if (!result) {
        tgLog({ from, isVision: true, error: "Result error" })
        this.bot.sendMessage(chat.id, config.phrases.ERROR_VISION)
        return
      }

      // TODO: add context for vision

      this.bot.sendMessage(chat.id, result)

      tgLog({ from, result, tokens, isVision: true })
    } catch (error) {
      tgLog({ from, error, isVision: true })
      this.bot.sendMessage(chat.id, config.phrases.ERROR_VISION)
    }
  }

  private async createOrUpdateChat(chat: Chat) {
    const chatData = await entities.Chat.findOneBy({ id: chat.id })
    if (!chatData) {
      entities.Chat.save({
        id: chat.id,
        username: chat.username,
        first_name: chat.first_name,
        last_name: chat.last_name
      })

      return
    }

    chatData.count++
    await entities.Chat.save(chatData)
  }

  private commands(from: User, chat: Chat, action: string) {
    tgLog({ from, action })

    switch (action) {
      case TelegramCommand.Start:
        return this.startCommand(chat)
      case TelegramCommand.Photo:
        return this.photoCommand(chat)
      case TelegramCommand.Reset:
        return this.resetCommand(chat)
      case TelegramCommand.Help:
        return this.helpCommand(chat)
    }
  }

  private startCommand(chat: Chat) {
    this.bot.sendMessage(chat.id, config.phrases.START_MESSAGE)

    entities.Chat.save({
      id: chat.id,
      username: chat.username,
      first_name: chat.first_name,
      last_name: chat.last_name
    })
  }

  private photoCommand(chat: Chat) {
    this.bot.sendMessage(chat.id, config.phrases.PHOTO_MESSAGE)
  }

  private resetCommand(chat: Chat) {
    this.bot.sendMessage(chat.id, config.phrases.RESET_MESSAGE)

    this.clearContext(chat)
  }

  private helpCommand(chat: Chat) {
    this.bot.sendMessage(chat.id, config.phrases.HELP_MESSAGE)
  }
}

export default Telegram
