import fs from "fs"

import TelegramBot, { User, Chat, Voice, PhotoSize } from "node-telegram-bot-api"

import config from "@root/config"

import { entities } from "@database/data-source"
import { tgLog } from "@helpers/logger"
import { visionTemplate } from "@helpers/templates"
import { convertToWav } from "@services/ffmpeg"
import { recognizeAudio } from "@services/recognizer"
import Storage from "@services/storage"

import type OpenAI from "openai"

import Commands, { COMMANDS } from "./Commands"

class Telegram  {
  private storage: Storage
  private bot: TelegramBot
  private commands: Commands

  constructor(private openAI: OpenAI) {
    this.storage = new Storage()
    this.bot = new TelegramBot(config.telegramToken, { polling: true })
    this.commands = new Commands(
      (chat: Chat, message: string) => this.sendMessage(chat, message),
      (chat: Chat) => this.storage.clearContext(chat.id),
      (chat: Chat) => this.storage.setChatWaitingImage(chat.id, true)
    )
  }

  public process() {
    this.bot.on("message", async msg => {
      const { from, chat, text } = msg
      if (!from || !text) return

      if(await this.storage.checkTokensLimit(from.id)) {
        tgLog({ from, message: config.phrases.LIMIT_MESSAGE })
        this.sendMessage(chat, config.phrases.LIMIT_MESSAGE)
        return
      }

      if (COMMANDS.includes(text)) return this.commands.call(from, chat, text)

      if (await this.storage.getChatWaitingImage(chat.id)) return this.generateImage(from, chat, text)

      this.message(from, chat, text)
    })

    this.bot.on("voice", async  msg => {
      const { from, chat, voice } = msg
      if (!from || !voice) return

      if(await this.storage.checkTokensLimit(from.id)) {
        tgLog({ from, message: config.phrases.LIMIT_MESSAGE })
        this.sendMessage(chat, config.phrases.LIMIT_MESSAGE)
        return
      }

      this.voice(from, chat, voice)
    })

    // this.bot.on("photo", async msg => {
    //   const { from, chat, photo } = msg
    //   if (!from || !photo) return

    //   if(await this.storage.checkTokensLimit(from.id)) {
    //     tgLog({ from, message: config.phrases.LIMIT_MESSAGE })
    //     this.sendMessage(chat, config.phrases.LIMIT_MESSAGE)
    //     return
    //   }

    //   this.photo(from, chat, photo)
    // })
  }

  private async message(from: User, chat: Chat, message: string) {
    this.bot.sendChatAction(chat.id, "typing")

    this.createOrUpdateChat(chat)
    await this.storage.saveContextQuery(chat.id, message)
    const messages = await this.storage.getContextMessages(chat.id)

    try {
      const response = await this.openAI.chat.completions.create({
        model: config.gptModel,
        max_tokens: 800, // ~ 4096 chars (TG limit)
        messages
      })

      const tokens = response.usage?.total_tokens || 0
      const result = response.choices[0].message?.content
      if (!result) return this.sendMessage(chat, config.phrases.ERROR_MESSAGE)

      this.sendMessage(chat, result)

      tgLog({ from, message, result, tokens })

      this.storage.saveTokens(from.id, tokens)

      this.storage.saveContextResult(chat.id, result)
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

      this.storage.clearContext(chat.id)

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
    this.storage.setChatWaitingImage(chat.id, false)

    try {
      const response = await this.openAI.images.generate({
        model: config.dalleModel,
        prompt: text,
        n: 1,
        size: config.dalleSize
      })

      const result = response?.data[0]?.url
      if (!result) {
        tgLog({ from, isGenerateImage: true, error: "Result error" })
        this.sendMessage(chat, config.phrases.ERROR_VISION)
        return
      }

      this.bot.sendPhoto(chat.id, result)

      tgLog({ from, message: text, result, isGenerateImage: true })

      this.storage.clearContext(chat.id)
    } catch (error) {
      tgLog({ from, isGenerateImage: true, error })
      this.sendMessage(chat, config.phrases.ERROR_GENERATE_IMAGE)
    }
  }

  private async createOrUpdateChat(chat: Chat) {
    const chatData = await entities.Chat.findOneBy({ id: String(chat.id) })
    if (!chatData) {
      entities.Chat.save({
        id: String(chat.id),
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
