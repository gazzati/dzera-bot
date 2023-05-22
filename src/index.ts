import "./aliases"

import TelegramBot from "node-telegram-bot-api"
import DiscordBot from "discord.js"
import { Configuration, OpenAIApi, ChatCompletionRequestMessageRoleEnum } from "openai"

import config from "@root/config"
import { startDiscordBot } from "./discord-bot"

/* const commands = ["start", "contacts"]

const openAIApi = new OpenAIApi(new Configuration({ apiKey: config.gptKey }))
const telegramBot = new TelegramBot(config.telegramToken, { polling: true }) */

startDiscordBot()

/* telegramBot.onText(/\/start/, function onPhotoText(msg) {
  const { chat } = msg

  telegramBot.sendMessage(chat.id, `Привет, я Дзера, твой ассистент 🌸 \nПостараюсь ответить на любой вопрос ❤️`)
})

telegramBot.onText(/\/contacts/, function onPhotoText(msg) {
  const { chat } = msg

  telegramBot.sendMessage(chat.id, "Если что то не работает, я не при чем 🤪 \nПиши @gazzati")
})

telegramBot.on("message", async msg => {
  const { from, chat, text } = msg
  if (!from || !text || commands.includes(text.replace("/", ""))) return

  const payload = { role: ChatCompletionRequestMessageRoleEnum.User, content: text }

  telegramBot.sendChatAction(chat.id, "typing")

  try {
    const response = await openAIApi.createChatCompletion({ model: config.gptModel, messages: [payload] })
    const result = response.data.choices[0].message?.content as string

    const userLog = `\x1b[37mUSER: ${from.username}(${from.first_name || ""}${from.last_name ? ` ${from.last_name}` : ""})`
    const textLog = `\x1b[31mTEXT: ${text}`
    const responseLog = `\x1b[33mRESPONSE: ${result}`

    // eslint-disable-next-line no-console
    console.log(`${userLog}\n${textLog}\n${responseLog}\n`)

    telegramBot.sendMessage(chat.id, result)
  } catch (e) {
    console.error(e)
    telegramBot.sendMessage(chat.id, "Sorry, something wrong 🥹")
  }
}) */
