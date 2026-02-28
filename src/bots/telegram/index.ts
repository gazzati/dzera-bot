import TelegramBot, { User, Chat, Voice, InlineKeyboardButton, CallbackQuery } from "node-telegram-bot-api"

import config from "@root/config"

import { entities } from "@database/data-source"
import { tgLog } from "@helpers/logger"
import { convertToWav } from "@services/ffmpeg"
import { recognizeAudio } from "@services/recognizer"
import Storage from "@services/storage"

import { Model } from "@interfaces/models"
import { TelegramCommand } from "@interfaces/telegram"

import type OpenAI from "openai"

import Commands, { COMMANDS } from "./Commands"

const availableModels = [Model.Gpt4oMini, Model.Gpt5Mini, Model.DeepSeek]

class Telegram {
  private storage: Storage
  private bot: TelegramBot
  private commands: Commands

  constructor(private openAI: OpenAI, private deepSeek: OpenAI) {
    this.storage = new Storage()
    this.bot = new TelegramBot(config.telegramToken, { polling: true })
    this.commands = new Commands(
      (chat: Chat, message: string, inlineKeyboard?: Array<Array<InlineKeyboardButton>>) =>
        this.sendMessage(chat, message, inlineKeyboard),
      (chat: Chat) => this.storage.clearContext(chat.id)
    )
  }

  public process() {
    this.bot.on("polling_error", error => {
      console.error("Telegram polling error", error)
    })

    this.bot.on("error", error => {
      console.error("Telegram bot error", error)
    })

    this.bot.on("message", async msg => {
      const { from, chat, text } = msg
      if (!from || !text) return

      if (await this.storage.checkTokensLimit(from.id)) {
        tgLog({ from, message: config.phrases.LIMIT_MESSAGE })
        this.sendMessage(chat, config.phrases.LIMIT_MESSAGE)
        return
      }

      if (COMMANDS.includes(text)) return this.commands.call(from, chat, text)

      this.message(from, chat, text)
    })

    this.bot.on("callback_query", query => this.callbackQuery(query))

    this.bot.on("voice", async msg => {
      const { from, chat, voice } = msg
      if (!from || !voice) return

      if (await this.storage.checkTokensLimit(from.id)) {
        tgLog({ from, message: config.phrases.LIMIT_MESSAGE })
        this.sendMessage(chat, config.phrases.LIMIT_MESSAGE)
        return
      }

      this.voice(from, chat, voice)
    })
  }

  private async message(from: User, chat: Chat, message: string) {
    this.bot.sendChatAction(chat.id, "typing")

    const dbChat = await this.createOrUpdateChat(chat)
    const model = dbChat.model as Model

    if(dbChat.is_blocked) {
      this.sendMessage(chat, config.phrases.USER_BLOCKED)
      return tgLog({ from, message, error: "User blocked!" })
    }

    await this.storage.saveContextQuery(chat.id, message)
    const messages = await this.storage.getContextMessages(chat.id)

    try {
      const response = model === Model.DeepSeek
      ? await this.deepSeek.chat.completions.create({
        model,
        max_tokens: 800, // ~ 4096 chars (TG limit)
        messages
      })
      : await this.openAI.chat.completions.create({
        model: model || config.defaultModel,
        max_completion_tokens: 800, // ~ 4096 chars (TG limit)
        messages
      })

      const tokens = response.usage?.total_tokens || 0
      const result = response.choices[0].message?.content
      if (!result) {
        return this.sendMessage(chat, config.phrases.ERROR_MESSAGE)
      }


      this.sendMessage(chat, result)

      tgLog({ from, message, result, model, tokens })

      this.storage.saveTokens(from.id, tokens)

      this.storage.saveContextResult(chat.id, result)
    } catch (error) {
      console.error(error)
      tgLog({ from, message, error })
      this.sendMessage(chat, config.phrases.ERROR_MESSAGE)
    }
  }

  private async callbackQuery(query: CallbackQuery) {
    const { message, data, from } = query
    if (!message || !data || !from) return

    tgLog({ from, action: data })

    const { chat } = message

    if (data.includes(TelegramCommand.Model)) {
      const [, model] = data.split(":") as [any, Model]

      if (!availableModels.includes(model)) {
        this.sendMessage(chat, config.phrases.UNAVAILABLE_MODEL)
        return tgLog({ from, error: `Unavailable model ${model}` })
      }

      await this.createOrUpdateChat(chat, model)

      this.sendMessage(chat, config.phrases.CHANGED_MODEL)
      this.bot.deleteMessage(chat.id, message.message_id)

      this.storage.clearContext(chat.id)
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

  private async createOrUpdateChat(chat: Chat, model?: Model) {
    const chatData = await entities.Chat.findOneBy({ id: String(chat.id) })
    if (!chatData) {
      const createdChat = await entities.Chat.save({
        id: String(chat.id),
        username: chat.username,
        first_name: chat.first_name,
        last_name: chat.last_name,
        model: model || Model.Gpt5Mini
      })

      return createdChat
    }

    chatData.count++
    if (model) chatData.model = model

    await entities.Chat.save(chatData)

    return chatData
  }

  private sendMessage(chat: Chat, message: string, inlineKeyboard?: Array<Array<InlineKeyboardButton>>) {
    this.bot.sendMessage(chat.id, message, {
      parse_mode: "Markdown",
      ...(inlineKeyboard && {
        reply_markup: {
          inline_keyboard: inlineKeyboard
        }
      })
    })
  }
}

export default Telegram
