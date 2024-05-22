import { Chat, User } from "node-telegram-bot-api"

import config from "@root/config"
import { entities } from "@root/database/data-source"
import { tgLog } from "@root/helpers/logger"

import { TelegramCommand } from "@interfaces/telegram"

export const COMMANDS: Array<string> = [
  TelegramCommand.Start,
  TelegramCommand.GenerateImage,
  TelegramCommand.AnalyzePhoto,
  TelegramCommand.Reset,
  TelegramCommand.Help
]

class Commands {
  constructor(
    private sendMessage: (chat: Chat, messages: string) => void,
    private clearContext: (chat: Chat) => void,
    private setChatWaitingImage: (chat: Chat) => void
  ) {}

  public call(from: User, chat: Chat, action: string) {
    tgLog({ from, action })

    switch (action) {
      case TelegramCommand.Start:
        return this.startCommand(chat)
      case TelegramCommand.GenerateImage:
        return this.generateImageCommand(chat)
      case TelegramCommand.AnalyzePhoto:
        return this.analyzePhotoCommand(chat)
      case TelegramCommand.Reset:
        return this.resetCommand(chat)
      case TelegramCommand.Help:
        return this.helpCommand(chat)
    }
  }

  private startCommand(chat: Chat) {
    this.sendMessage(chat, config.phrases.START_MESSAGE)

    entities.Chat.save({
      id: String(chat.id),
      username: chat.username,
      first_name: chat.first_name,
      last_name: chat.last_name
    })
  }

  private generateImageCommand(chat: Chat) {
    this.sendMessage(chat, config.phrases.GENERATE_IMAGE_MESSAGE)
    this.setChatWaitingImage(chat)
  }

  private analyzePhotoCommand(chat: Chat) {
    this.sendMessage(chat, config.phrases.ANALYZE_PHOTO_MESSAGE)
  }

  private resetCommand(chat: Chat) {
    this.sendMessage(chat, config.phrases.RESET_MESSAGE)

    this.clearContext(chat)
  }

  private helpCommand(chat: Chat) {
    this.sendMessage(chat, config.phrases.HELP_MESSAGE)
  }
}

export default Commands
