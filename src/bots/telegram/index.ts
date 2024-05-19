import fs from "fs"

import TelegramBot, { User, Chat, Voice, PhotoSize } from "node-telegram-bot-api"

import config from "@root/config"

import { entities } from "@database/data-source"
import { tgLog } from "@helpers/logger"
import { visionTemplate } from "@helpers/templates"
import { convertToWav } from "@services/ffmpeg"
import { recognizeAudio } from "@services/recognizer"

import type OpenAI from "openai"

import Commands, { COMMANDS } from "./Commands"
import Storage from "./Storage"

class Telegram extends Storage {
  private bot: TelegramBot
  private commands: Commands

  constructor(private openAI: OpenAI) {
    super()
    this.bot = new TelegramBot(config.telegramToken, { polling: true })
    this.commands = new Commands(
      (chat: Chat, message: string) => this.sendMessage(chat, message),
      (chat: Chat) => this.clearContext(chat),
      (chat: Chat) => this.setChatWaitingImage(chat, true)
    )
  }

  public process() {
    this.bot.on("message", msg => {
      const { from, chat, text } = msg
      if (!from || !text) return

      this.initContext(chat)

      if (COMMANDS.includes(text)) return this.commands.call(from, chat, text)

      if (this.getChatWaitingImage(chat)) return this.generateImage(from, chat, text)

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
      if (!result) return this.sendMessage(chat, config.phrases.ERROR_MESSAGE)

      this.sendMessage(chat, result)

      tgLog({ from, message, result, tokens })

      this.saveResult(chat, result)
    } catch (error) {
      tgLog({ from, message, error })
      this.sendMessage(chat, config.phrases.ERROR_MESSAGE)
    }
  }

  private async voice(from: User, chat: Chat, voice: Voice) {
    if (voice.duration > 10) return this.sendMessage(chat, config.phrases.LONG_AUDIO_DURATION)

    this.bot.sendChatAction(chat.id, "typing")

    try {
      const filePath = await this.bot.downloadFile(voice.file_id, config.filesPath)
      const newFile = await convertToWav(filePath)
      if (!newFile) {
        tgLog({ from, error: "Converting file Error" })
        this.sendMessage(chat, config.phrases.ERROR_MESSAGE)
      }

      const transcript = await recognizeAudio(newFile)
      if (!transcript) {
        tgLog({ from, error: "File transcription Error" })
        return this.sendMessage(chat, config.phrases.ERROR_MESSAGE)
      }

      tgLog({ from, transcript })

      this.message(from, chat, transcript)
    } catch (error) {
      tgLog({ from, error })
      this.sendMessage(chat, config.phrases.ERROR_MESSAGE)
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
        this.sendMessage(chat, config.phrases.ERROR_VISION)
        return
      }

      this.clearContext(chat)

      const messages = visionTemplate(image)

      const response = await this.openAI.chat.completions.create({ model: config.gptModel, messages })

      const tokens = response.usage?.total_tokens || 0
      const result = response?.choices[0]?.message?.content
      if (!result) {
        tgLog({ from, isVision: true, error: "Result error" })
        this.sendMessage(chat, config.phrases.ERROR_VISION)
        return
      }

      // TODO: add context for vision

      this.sendMessage(chat, result)

      tgLog({ from, result, tokens, isVision: true })
    } catch (error) {
      tgLog({ from, error, isVision: true })
      this.sendMessage(chat, config.phrases.ERROR_VISION)
    }
  }

  private async generateImage(from: User, chat: Chat, text: string) {
    this.bot.sendChatAction(chat.id, "upload_photo")
    this.setChatWaitingImage(chat, false)

    try {
      const response = await this.openAI.images.generate({
        model: config.dalleModel,
        prompt: text,
        n: 1,
        size: config.dalleSize
      })

      const result = response?.data[0]?.url
      if(!result) {
        tgLog({ from, isGenerateImage: true, error: "Result error" })
        this.sendMessage(chat, config.phrases.ERROR_VISION)
        return
      }

      this.bot.sendPhoto(chat.id, result)

      tgLog({ from, message: text, result, isGenerateImage: true })

      this.clearContext(chat)
    } catch (error) {
      tgLog({ from, isGenerateImage: true, error })
      this.sendMessage(chat, config.phrases.ERROR_GENERATE_IMAGE)
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

  private sendMessage(chat: Chat, message: string) {
    this.bot.sendMessage(chat.id, message, {
      parse_mode: "Markdown"
      // reply_markup: {
      //   keyboard: [
      //     [{text: 'test 1'}],
      //     [{text: 'test 2'}],
      //     [{text: 'test 3'}],

      //   ],
      //   is_persistent: true,
      //   remove_keyboard: false,
      //   one_time_keyboard: false
      // }
    })
  }
}

export default Telegram
