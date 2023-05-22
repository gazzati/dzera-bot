/* eslint-disable no-console */
import TelegramBot, { User } from "node-telegram-bot-api"

import config from "@root/config"

interface LogArgs {
  from: User
  action?: string
  message?: string
  result?: string
}

const systemBot = new TelegramBot(config.systemTelegramToken, { polling: true })

const padZeros = (value: string | number, chars = 2): string => {
  if (value.toString().length < chars) {
    const zeros = chars - value.toString().length
    const str = new Array(zeros).fill(0)
    return `${str.join("")}${value}`
  }

  return value.toString()
}

export const log = ({ from, action, message, result }: LogArgs) => {
  const today = new Date()
  const date = `${padZeros(today.getDate())}.${padZeros(today.getMonth() + 1)}.${padZeros(today.getFullYear())}`
  const time = `${padZeros(today.getHours())}:${padZeros(today.getMinutes())}`

  const userLog = `${from.username}(${from.first_name || ""}${from.last_name ? ` ${from.last_name}` : ""})`

  const actionLog = `ACTION: ${action}`
  const messageLog = `MESSAGE: ${message}`
  const resultLog = `RESULT: ${result && result.length > 30 ? `${result?.slice(0, 30)}...` : result}`

  console.log(`\x1b[36m[${date} ${time}]`)
  console.log(`\x1b[37mUSER: ${userLog}`)

  if (action) console.log(`\x1b[32m${actionLog}`)
  if (message) console.log(`\x1b[31m${messageLog}`)
  if (result) console.log(`\x1b[33m${resultLog}`)

  console.log(" ")

  systemBot.sendMessage(
    505252572,
    `USER: ${userLog} ${action ? `\n${actionLog}` : ""} ${message ? `\n${messageLog}` : ""} ${
      result ? `\n${resultLog}` : ""
    }`
  )
}

export const error = (error: any) => {
  console.error(error)

  systemBot.sendMessage(505252572, String(error))
}
