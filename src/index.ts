import "./aliases"

import { Configuration, OpenAIApi } from "openai"

import config from "@root/config"
import "@bots/telegram"
import { startDiscordBot } from "./bots/discord"

export const openAIApi = new OpenAIApi(new Configuration({ apiKey: config.gptKey }))
startDiscordBot(openAIApi)