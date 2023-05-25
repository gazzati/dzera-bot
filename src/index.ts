import "./aliases"

import { Configuration, OpenAIApi } from "openai"

import TelegramBot from "@root/bots/telegram"
import DiscordBot from "@root/bots/discord"

import config from "@root/config"

const openAIApi = new OpenAIApi(new Configuration({ apiKey: config.gptKey }))

new TelegramBot(openAIApi).process()
new DiscordBot(openAIApi).process()
