import { v4 as uuidv4 } from "uuid"

import config from "@root/config"
import redis from "@root/database/redis"
import { Role } from "@root/interfaces/openai"

import type { ChatContext } from "@interfaces/storage"

class Storage {
  readonly chatContextKey = "chat-context"
  readonly chatContextKeyTtlSec = 60 * 10 // 10 min
  readonly maxResultLengthToSave = 500

  readonly userTokensKey = "user-tokens"
  readonly userTokensTtlSec = 60 * 60 * 24 // 1 day
  readonly maxTokensPerDay: 30_000

  private async appendChatContext(chatId: number, data: ChatContext): Promise<void> {
    await redis.setex(
      `${this.chatContextKey}:${chatId}:${uuidv4().replace("-", "").substring(0, 8)}`,
      this.chatContextKeyTtlSec,
      JSON.stringify(data)
    )
  }

  private async getChatContextKeys(chatId: number): Promise<Array<string>> {
    return await redis.keys(`${this.chatContextKey}:${chatId}:*`)
  }

  public async getContextMessages(chatId: number): Promise<Array<Omit<ChatContext, "time">>> {
    const keys = await this.getChatContextKeys(chatId)

    const data = await redis.mget(keys)
    const result: Array<ChatContext> = data
      .map(item => item && JSON.parse(item))
      .sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime())

    const messages = [
      {
        role: Role.System,
        content: config.phrases.INIT_MESSAGE
      },
      ...result
    ]

    return messages.map(({ role, content }) => ({ role, content }))
  }

  public async clearContext(chatId: number): Promise<number> {
    const keys = await this.getChatContextKeys(chatId)
    if (!keys.length) return 0

    return await redis.del(keys)
  }

  public async saveContextQuery(chatId: number, query: string): Promise<void> {
    await this.appendChatContext(chatId, {
      role: Role.User,
      content: query,
      time: new Date()
    })
  }

  public async saveContextResult(chatId: number, result: string): Promise<void> {
    if (result.length > this.maxResultLengthToSave) return

    await this.appendChatContext(chatId, {
      role: Role.Assistant,
      content: result,
      time: new Date()
    })
  }

  public async saveTokens(userId: number, tokens: number): Promise<void> {
    const key = `${this.userTokensKey}:${userId}`

    const userTokens = await redis.get(key)
    if (!userTokens) {
      redis.setex(key, this.userTokensTtlSec, tokens)
      return
    }

    redis.incrby(key, tokens)
  }

  public async checkTokensLimit(userId: number): Promise<boolean> {
    const key = `${this.userTokensKey}:${userId}`

    const userTokens = await redis.get(key)
    if (!userTokens) return false

    return Number(userTokens) > this.maxTokensPerDay
  }
}

export default Storage
