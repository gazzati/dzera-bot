import DiscordBot, { GatewayIntentBits } from "discord.js"
import { ChatCompletionRequestMessageRoleEnum, OpenAIApi } from "openai";

import config from "../config";

export const startDiscordBot = (openAIApi: OpenAIApi) => {

    const discordBot = new DiscordBot.Client({intents: 
        [
            GatewayIntentBits.Guilds,
            GatewayIntentBits.GuildMessages,
            GatewayIntentBits.MessageContent
        ]
    })
    //change to const and typo
    let context = initContext()

    discordBot.on("messageCreate", async (message) => {
        if (message.author.bot) return
        
        const text = message.content
        const commandBody = text.slice(config.discordPrefix.length);
        const args = commandBody.split(' ');
        const command = args.shift()?.toLowerCase(); 

        if (command === "reset") {
            context = initContext()

            message.reply("Я забыла всё о чем мы сейчас говорили)")
            return
        }

        const payload = {role: ChatCompletionRequestMessageRoleEnum.User, content: text}
        context.push(payload)      

        const response = await openAIApi.createChatCompletion({ model: config.gptModel, messages: context })
        const result = response.data.choices[0].message?.content as string

        message.reply(result)
    });

    discordBot.login(config.discordToken)
}

const initContext = (initMessage = "Теперь тебя зовут, Дзера. Отвечай в женском роде.") => {
    
    return [{role: ChatCompletionRequestMessageRoleEnum.User, content: initMessage}]
} 