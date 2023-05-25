import DiscordBot, { Client } from "discord.js"
import { OpenAIApi, ChatCompletionRequestMessage, ChatCompletionRequestMessageRoleEnum } from "openai"

import config from "@root/config"

import { log } from "@helpers/logger"
import DiscordBase from "./discord.base"
import CommandController from "./command-controller"

class Discord extends DiscordBase{
  private openAIApi: OpenAIApi
  private bot: Client
  private commandController = new CommandController()

  constructor(openAIApi: OpenAIApi) {
    super()
    this.openAIApi = openAIApi
    this.bot = new DiscordBot.Client({ intents: this.INTENTS })
  }

  public process() {
    this.bot.once("ready", () => log("Discord bot is active!"))
    this.bot.login(config.discordToken)

    this.bot.on("messageCreate", async message => {
      if (message.author.bot) return
      const text = message.content
      const command = this.getCommand(text)

      if (command) {
        const response = this.commandController.executeCommand(command)
        if (!response) {
          message.reply(config.phrases.ERROR_MESSAGE)
          return
        }

        message.reply(response)
        return
      }

      const messages = this.getMessages(text)
      const response = await this.openAIApi.createChatCompletion({ model: config.gptModel, messages })
      const result = response.data.choices[0].message?.content as string

      message.reply(result)
    })
  }

  private getCommand(text: string): string | undefined{
    const commandBody = text.slice(config.discordPrefix.length)
    const args = commandBody.split(" ")
    
    return args.shift()?.toLowerCase()
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
