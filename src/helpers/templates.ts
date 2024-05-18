import OpenAI from "openai"

import { Role } from "../bots/telegram/interfaces"

export const visionTemplate = (imageBase64: string): Array<OpenAI.ChatCompletionUserMessageParam> => {
  return [
    {
      role: Role.User,
      content: [
        { type: "text", text: "Что на изображении?" },
        {
          type: "image_url",
          image_url: {
            url: `data:image/jpg;base64,${imageBase64}`
          }
        }
      ]
    }
  ]
}
