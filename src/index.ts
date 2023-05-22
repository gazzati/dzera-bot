import "./aliases"

import { Configuration, OpenAIApi } from "openai"

import config from "@root/config"
import "@bots/telegram"

export const openAIApi = new OpenAIApi(new Configuration({ apiKey: config.gptKey }))
