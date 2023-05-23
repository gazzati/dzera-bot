import DiscordBot, { Client, GatewayIntentBits } from "discord.js"
import {OpenAIApi, ChatCompletionRequestMessage, ChatCompletionRequestMessageRoleEnum} from "openai"

import config from "@root/config"

import { log } from "@helpers/logger"

class Discord {
  private openAIApi: OpenAIApi
  private bot: Client

  private INTENTS = [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent]
  private context = this.initContext()

  constructor(openAIApi: OpenAIApi) {
    this.openAIApi = openAIApi
    this.bot = new DiscordBot.Client({intents: this.INTENTS})
  }

  public start() {
    this.bot.once("ready", () => log("Discord bot is active!"))
    this.bot.login(config.discordToken)

    this.bot.on("messageCreate", async message => {
      if (message.author.bot) return

      const text = message.content
      const commandBody = text.slice(config.discordPrefix.length)
      const args = commandBody.split(" ")
      const command = args.shift()?.toLowerCase()

      if (command === "reset") {
        this.context = this.initContext()

        message.reply(config.phrases.RESET_MESSAGE)
        return
      }

      const payload = { role: ChatCompletionRequestMessageRoleEnum.User, content: text }
      this.context.push(payload)

      const response = await this.openAIApi.createChatCompletion({ model: config.gptModel, messages: this.context })
      const result = response.data.choices[0].message?.content as string

      message.reply(result)
    })
  }

  private initContext (): Array<ChatCompletionRequestMessage> {
    return [{ role: ChatCompletionRequestMessageRoleEnum.User, content: config.phrases.INIT_MESSAGE }]
  }
}
export default Discord

