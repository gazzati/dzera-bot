import DiscordBot, { Client, GatewayIntentBits } from "discord.js"
import { OpenAIApi, ChatCompletionRequestMessage, ChatCompletionRequestMessageRoleEnum } from "openai"

import config from "@root/config"

import { log } from "@helpers/logger"

class Discord {
  private openAIApi: OpenAIApi
  private bot: Client

  private INTENTS = [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent]
  private context: Array<string> = []

  constructor(openAIApi: OpenAIApi) {
    this.openAIApi = openAIApi
    this.bot = new DiscordBot.Client({ intents: this.INTENTS })
  }

  public process() {
    this.bot.once("ready", () => log("Discord bot is active!"))
    this.bot.login(config.discordToken)

    this.bot.on("messageCreate", async message => {
      if (message.author.bot) return

      const text = message.content
      const commandBody = text.slice(config.discordPrefix.length)
      const args = commandBody.split(" ")
      const command = args.shift()?.toLowerCase()

      if (command === "reset") {
        this.context = []

        message.reply(config.phrases.RESET_MESSAGE)
        return
      }

      const messages = this.getMessages(text)
      const response = await this.openAIApi.createChatCompletion({ model: config.gptModel, messages })
      const result = response.data.choices[0].message?.content as string

      message.reply(result)
    })
  }

  private getMessages(text: string): Array<ChatCompletionRequestMessage> {
    if (this.context.length > config.contextLengthLimit) {
      this.context.splice(0, this.context.length - config.contextLengthLimit)
    }

    this.context.push(text)

    return [config.phrases.INIT_MESSAGE, ...this.context].map(message => ({
      role: ChatCompletionRequestMessageRoleEnum.User,
      content: message
    }))
  }
}
export default Discord
