import config from "@root/config"

import type { Chat } from "node-telegram-bot-api"
import type OpenAI from "openai"

import { Role, IContext } from "./interfaces"

class Context {
  protected stories: { [chatId: number]: Array<IContext> } = {}

  protected getContextMessages(
    chat: Chat
  ): Array<OpenAI.ChatCompletionUserMessageParam | OpenAI.ChatCompletionAssistantMessageParam> {
    if (this.stories[chat.id].length > config.contextLengthLimit) {
      this.stories[chat.id].splice(0, this.stories[chat.id].length - config.contextLengthLimit)
    }

    this.stories[chat.id] = this.stories[chat.id].filter(({ createdAt }) => this.dateDiffMins(createdAt) < 30)

    const messages = [
      {
        role: Role.User,
        content: config.phrases.INIT_MESSAGE
      },
      ...this.stories[chat.id]
    ]

    return messages.map(({ role, content }) => ({ role, content }))
  }

  protected saveQuery(chat: Chat, query: string) {
    if (!this.stories[chat.id]) this.stories[chat.id] = []

    this.stories[chat.id].push({
      role: Role.User,
      content: query,
      createdAt: new Date()
    })
  }

  protected saveResult(chat: Chat, result: string) {
    if (!this.stories[chat.id]) this.stories[chat.id] = []

    this.stories[chat.id].push({
      role: Role.Assistant,
      content: result,
      createdAt: new Date()
    })
  }

  protected clearContext(chat: Chat) {
    this.stories[chat.id] = []
  }

  private dateDiffMins(date: Date): number {
    const now = new Date()
    const timeDiff = date.getTime() - now.getTime()

    return Math.round(timeDiff / (1000 * 60))
  }
}

export default Context
