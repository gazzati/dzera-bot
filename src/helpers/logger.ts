import { systemTgBot } from "@bots/telegram/system"
import { User } from "node-telegram-bot-api"

import config from "@root/config"

interface LogArgs {
  from: User
  action?: string
  message?: string
  transcript?: string
  result?: string
  tokens?: number
  error?: any
  isVision?: boolean
}

enum Color {
  Reset = "\x1b[0m",
  Red = "\x1b[31m",
  Green = "\x1b[32m",
  Yellow = "\x1b[33m",
  Blue = "\x1b[34m",
  Magenta = "\x1b[35m",
  Cyan = "\x1b[36m",
  White = "\x1b[37m",
  DarkBlue = "\x1b[94m"
}

const padZeros = (value: string | number, chars = 2): string => {
  if (value.toString().length < chars) {
    const zeros = chars - value.toString().length
    const str = new Array(zeros).fill(0)
    return `${str.join("")}${value}`
  }

  return value.toString()
}

export const getLogDate = (today = new Date()): string => {
  const date = `${padZeros(today.getDate())}.${padZeros(today.getMonth() + 1)}.${padZeros(today.getFullYear())}`
  const time = `${padZeros(today.getHours())}:${padZeros(today.getMinutes())}`

  return `[${date} ${time}]`
}

const getUserLog = (from: User): string => {
  const userDetails =
    from.first_name || from.last_name ? ` (${from.first_name || ""}${from.last_name ? ` ${from.last_name}` : ""})` : ""

  return `👨‍💻 @${from.username}${userDetails}`
}

export const tgLog = ({ from, action, message, transcript, result, tokens, error, isVision }: LogArgs) => {
  const dateLog = getLogDate()

  const userLog = getUserLog(from)

  const actionLog = `🔢 ${action}`
  const messageLog = `💬 ${message}`
  const transcriptLog = `🔉 ${transcript}`
  const tokensLog = `💰 ${tokens} tokens`
  const visionLog = `🏞️ Vision`
  const resultLog = `✅ ${result && result.length > 50 ? `${result?.slice(0, 50)}...` : result}`

  log(dateLog, Color.Cyan)
  log(userLog, Color.White)

  if (action) log(actionLog, Color.Green)
  if (message) log(messageLog, Color.Red)
  if (transcript) log(transcriptLog, Color.Cyan)
  if (result) log(resultLog, Color.Yellow)
  if (tokens) log(tokensLog, Color.Green)
  if (isVision) log(visionLog, Color.White)
  if (error) console.error(error)

  log(" ")

  systemTgBot.sendMessage(
    config.systemTelegramChatId,
    `${userLog} ${action ? `\n${actionLog}` : ""} ${message ? `\n${messageLog}` : ""} ${
      transcript ? `\n${transcriptLog}` : ""
    } ${isVision ? `\n${visionLog}` : ""} ${result ? `\n${resultLog}` : ""} ${tokens ? `\n${tokensLog}` : ""} ${
      error ? `\n❗️ ${String(error)}` : ""
    }`
  )
}

export const log = (message: string, color = Color.Magenta) => {
  // eslint-disable-next-line no-console
  console.log(`${color}${message}`)
}
