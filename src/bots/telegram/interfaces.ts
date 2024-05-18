// import type OpenAI from "openai"

export enum TelegramCommand {
  Start = "/start",
  Photo = "/photo",
  Reset = "/reset",
  Help = "/help"
}

export enum Role {
  User = "user",
  Assistant = "assistant"
}

export interface IContext {
  role: Role
  content: string // | Array<OpenAI.ChatCompletionContentPart>
  createdAt: Date
}
