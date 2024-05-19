// import type OpenAI from "openai"
import {Role} from "./openai"

export interface Context {
  role: Role
  content: string // | Array<OpenAI.ChatCompletionContentPart>
  createdAt: Date
}

export interface ChatStorage {
  context: Array<Context>
  waitingImage?: boolean
}