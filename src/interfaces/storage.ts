// import type OpenAI from "openai"
import { Role } from "./openai"

export interface ChatContext {
  role: Role
  content: string // | Array<OpenAI.ChatCompletionContentPart>
  time: Date
}
