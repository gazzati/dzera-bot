import "./aliases"

import DiscordBot from "@bots/discord"
import { Configuration, OpenAIApi } from "openai"

import TelegramBot from "@root/bots/telegram"
import config from "@root/config"

const openAIApi = new OpenAIApi(new Configuration({ apiKey: config.gptKey }))

new TelegramBot(openAIApi).process()
new DiscordBot(openAIApi).process()
