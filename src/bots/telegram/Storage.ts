import config from "@root/config"

import { Role } from "@interfaces/openai"
import type { ChatStorage } from "@interfaces/storage"

import type { Chat } from "node-telegram-bot-api"
import type OpenAI from "openai"

class Storage {
  private storage: { [chatId: number]: ChatStorage } = {}

  protected getContextMessages(
    chat: Chat
  ): Array<OpenAI.ChatCompletionUserMessageParam | OpenAI.ChatCompletionAssistantMessageParam> {
    if (this.storage[chat.id]?.context.length > config.contextLengthLimit) {
      this.storage[chat.id].context.splice(0, this.storage[chat.id].context.length - config.contextLengthLimit)
    }

    this.storage[chat.id].context = this.storage[chat.id].context.filter(
      ({ createdAt }) => this.dateDiffMins(createdAt) < config.contextTTLMin
    )

    const messages = [
      {
        role: Role.User,
        content: config.phrases.INIT_MESSAGE
      },
      ...this.storage[chat.id].context
    ]

    return messages.map(({ role, content }) => ({ role, content }))
  }

  protected saveQuery(chat: Chat, query: string) {
    if (!this.storage[chat.id]?.context) this.storage[chat.id] = { context: [] }

    this.storage[chat.id].context.push({
      role: Role.User,
      content: query,
      createdAt: new Date()
    })
  }

  protected saveResult(chat: Chat, result: string) {
    if (!this.storage[chat.id]?.context) this.storage[chat.id] = { context: [] }

    if (result.length > config.maxResultLengthToSave) return

    this.storage[chat.id].context.push({
      role: Role.Assistant,
      content: result,
      createdAt: new Date()
    })
  }

  protected clearContext(chat: Chat) {
    if (this.storage[chat.id]) this.storage[chat.id].context = []
  }

  protected initContext(chat: Chat) {
    if (!this.storage[chat.id]) this.storage[chat.id] = { context: [] }
  }

  protected setChatWaitingImage(chat: Chat, state: boolean) {
    this.storage[chat.id].waitingImage = state
  }

  protected getChatWaitingImage(chat: Chat): boolean {
    return !!this.storage[chat.id]?.waitingImage
  }

  private dateDiffMins(date: Date): number {
    const now = new Date()
    const timeDiff = date.getTime() - now.getTime()

    return Math.round(timeDiff / (1000 * 60))
  }
}

export default Storage
