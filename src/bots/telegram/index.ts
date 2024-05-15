import fs from "fs"

import speech, { protos, SpeechClient } from "@google-cloud/speech"
import TelegramBot, { User, Chat } from "node-telegram-bot-api"
import { OpenAIApi, ChatCompletionRequestMessage, ChatCompletionRequestMessageRoleEnum } from "openai"

import config from "@root/config"

import {convertToWav} from '../../helpers/ffmpeg';
import { entities } from "@database/data-source"
import { tgLog } from "@helpers/logger"

type IRecognitionConfig = protos.google.cloud.speech.v1.IRecognitionConfig

enum TelegramCommand {
  Start = "/start",
  Reset = "/reset",
  Help = "/help"
}

class Telegram {
  private bot: TelegramBot
  private openAIApi: OpenAIApi
  private speechClient: SpeechClient

  private COMMANDS = [TelegramCommand.Start, TelegramCommand.Reset, TelegramCommand.Help]
  private stories: { [chatId: number]: Array<string> } = {}

  constructor(openAIApi: OpenAIApi) {
    this.openAIApi = openAIApi
    this.bot = new TelegramBot(config.telegramToken, { polling: true })

    this.speechClient = new speech.SpeechClient({ keyFilename: "./google-credentials.json" })
  }

  public process() {
    this.setupFolder()

    this.bot.on("message", msg => {
      const { from, chat, text } = msg
      if (!from || !text) return

      if (this.COMMANDS.includes(text as TelegramCommand)) return this.command(from, chat, text)

      this.message(from, chat, text)
    })

    this.bot.on("voice", async msg => {
      try {
        const { from, chat, voice } = msg
        if (!from || !voice) return
        if(voice.duration > 10) return this.bot.sendMessage(chat.id, config.phrases.LONG_AUDIO_DURATION)

        const filePath = await this.bot.downloadFile(voice.file_id, "files")
        const newFile = await convertToWav(filePath)
        if(!newFile) {
          tgLog({ from, error: "Converting file Error" })
          this.bot.sendMessage(chat.id, config.phrases.ERROR_MESSAGE)
        }

        const transcript = await this.recognizeAudio(from, newFile)
        if(!transcript) {
          tgLog({ from, error: "File transcription Error" })
          return this.bot.sendMessage(chat.id, config.phrases.ERROR_MESSAGE)
        }

         tgLog({ from, transcript })

         this.message(from, chat, transcript)
      } catch (error) {
        console.error("Error:", error)
      }
    })
  }

  private async message(from: User, chat: Chat, message: string) {
    this.bot.sendChatAction(chat.id, "typing")
    const messages = await this.getMessages(chat, message)

    try {
      const response = await this.openAIApi.createChatCompletion({ model: config.gptModel, messages })
      const result = response.data.choices[0].message?.content as string

      tgLog({ from, message, result })

      this.bot.sendMessage(chat.id, result)
      entities.Chat.save({
        // TODO: remove later
        id: chat.id,
        username: chat.username,
        first_name: chat.first_name,
        last_name: chat.last_name
      })
      entities.Story.save({ chat_id: chat.id, content: message })
    } catch (error) {
      tgLog({ from, message, error })
      this.bot.sendMessage(chat.id, config.phrases.ERROR_MESSAGE)
    }
  }

  private async getMessages(chat: Chat, message: string): Promise<Array<ChatCompletionRequestMessage>> {
    if (!this.stories[chat.id]) {
      const storiesDB = await entities.Story.find({
        where: { chat_id: chat.id },
        select: ["content"]
      })

      this.stories[chat.id] = storiesDB.map(story => story.content)
    }

    if (this.stories[chat.id].length > config.contextLengthLimit) {
      this.stories[chat.id].splice(0, this.stories[chat.id].length - config.contextLengthLimit)
    }

    this.stories[chat.id].push(message)

    return [config.phrases.INIT_MESSAGE, ...this.stories[chat.id]].map(message => ({
      role: ChatCompletionRequestMessageRoleEnum.User,
      content: message
    }))
  }

  private command(from: User, chat: Chat, action: string) {
    tgLog({ from, action })

    switch (action) {
      case "/start":
        return this.start(chat)
      case "/reset":
        return this.reset(chat)
      case "/help":
        return this.help(chat)
    }
  }

  private start(chat: Chat) {
    this.bot.sendMessage(chat.id, config.phrases.START_MESSAGE)

    entities.Chat.save({
      id: chat.id,
      username: chat.username,
      first_name: chat.first_name,
      last_name: chat.last_name
    })
  }

  private reset(chat: Chat) {
    this.bot.sendMessage(chat.id, config.phrases.RESET_MESSAGE)

    this.stories[chat.id] = []
    entities.Story.delete({ chat_id: chat.id })
  }

  private help(chat: Chat) {
    this.bot.sendMessage(chat.id, config.phrases.HELP_MESSAGE)
  }

  private setupFolder() {
    return new Promise(resolve => {
      fs.rmdir("files", { recursive: true }, () => {
        fs.mkdirSync("files")
        resolve(1)
      })
    })
  }

  private async recognizeAudio(from: User, audioPath: string): Promise<string | null> {
     // Read the binary audio data from the specified file.
     const file = fs.readFileSync(audioPath)
     const audioBytes = file.toString("base64")

     const audio = {
       content: audioBytes
     }

     const config: IRecognitionConfig = {
       encoding: "LINEAR16",
       sampleRateHertz: 48000,
       languageCode: "ru-RU",
       model: "default",
       audioChannelCount: 1,
       enableWordConfidence: true,
       enableWordTimeOffsets: true
     }

      // Use the SpeechClient to recognize the audio with the specified config.
      const data = await this.speechClient.recognize({ audio, config })

      const { results } = data[0]
      if(!results?.length) return null

      const {alternatives} = results[0]
      if(!alternatives?.length) return null

      const { transcript } = alternatives[0]
      return transcript || null

  }
}

export default Telegram
