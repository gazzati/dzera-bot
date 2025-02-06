import {Chat, User, InlineKeyboardButton } from 'node-telegram-bot-api';

import config from "@root/config"
import { entities } from "@root/database/data-source"
import { tgLog } from "@root/helpers/logger"

import { TelegramCommand } from "@interfaces/telegram"

export const COMMANDS: Array<string> = [
  TelegramCommand.Start,
  TelegramCommand.Model,
  TelegramCommand.Reset,
  TelegramCommand.Help
]

class Commands {
  constructor(
    private sendMessage: (chat: Chat, messages: string, inlineKeyboard?: Array<Array<InlineKeyboardButton>>) => void,
    private clearContext: (chat: Chat) => void,
  ) {}

  public call(from: User, chat: Chat, action: string) {
    tgLog({ from, action })

    switch (action) {
      case TelegramCommand.Start:
        return this.start(chat)
      case TelegramCommand.Model:
        return this.model(chat)
      case TelegramCommand.Reset:
        return this.reset(chat)
      case TelegramCommand.Help:
        return this.help(chat)
    }
  }

  private start(chat: Chat) {
    this.sendMessage(chat, config.phrases.START_MESSAGE)

    entities.Chat.save({
      id: String(chat.id),
      username: chat.username,
      first_name: chat.first_name,
      last_name: chat.last_name
    })
  }

  private model(chat: Chat) {
    this.sendMessage(chat, config.phrases.CHOOSE_MODEL_MESSAGE, config.inlineKeyboard.models)
  }

  private reset(chat: Chat) {
    this.sendMessage(chat, config.phrases.RESET_MESSAGE)

    this.clearContext(chat)
  }

  private help(chat: Chat) {
    this.sendMessage(chat, config.phrases.HELP_MESSAGE)
  }
}

export default Commands
