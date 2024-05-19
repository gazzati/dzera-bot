// import type OpenAI from "openai"

export enum TelegramCommand {
  Start = "/start",
  GenerateImage = "/generate_image",
  AnalyzePhoto = "/analyze_photo",
  Reset = "/reset",
  Help = "/help"
}

export enum Role {
  User = "user",
  Assistant = "assistant"
}

export interface Context {
  role: Role
  content: string // | Array<OpenAI.ChatCompletionContentPart>
  createdAt: Date
}

export interface CharStorage {
  context: Array<Context>
  waitingImage?: boolean
}