import { systemTgBot } from "@bots/telegram/system"
import { User } from "node-telegram-bot-api"

import config from "@root/config"

interface LogArgs {
  from: User
  action?: string
  message?: string
  result?: string
  error?: any
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

export const tgLog = ({ from, action, message, result, error }: LogArgs) => {
  const dateLog = getLogDate()
  const userLog = `${from.username}(${from.first_name || ""}${from.last_name ? ` ${from.last_name}` : ""})`

  const actionLog = `ACTION: ${action}`
  const messageLog = `MESSAGE: ${message}`
  const resultLog = `RESULT: ${result && result.length > 30 ? `${result?.slice(0, 30)}...` : result}`

  log(dateLog, Color.Cyan)
  log(`USER: ${userLog}`, Color.White)

  if (action) log(actionLog, Color.Green)
  if (message) log(messageLog, Color.Red)
  if (result) log(resultLog, Color.Yellow)
  if (error) error(error)

  log(" ")

  systemTgBot.sendMessage(
    config.systemTelegramChatId,
    `USER: ${userLog} ${action ? `\n${actionLog}` : ""} ${message ? `\n${messageLog}` : ""} ${
      result ? `\n${resultLog}` : ""
    } ${error ? `\n${String(error)}` : ""}`
  )
}

export const log = (message: string, color = Color.Magenta) => {
  // eslint-disable-next-line no-console
  console.log(`${color}${message}`)
}
