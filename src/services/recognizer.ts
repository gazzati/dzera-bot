import fs from "fs"

import { protos } from "@google-cloud/speech"

import { speechClient } from "../index"

type IRecognitionConfig = protos.google.cloud.speech.v1.IRecognitionConfig

export const recognizeAudio = async (audioPath: string): Promise<string | null> => {
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
  const data = await speechClient.recognize({ audio, config })

  const { results } = data[0]
  if (!results?.length) return null

  const { alternatives } = results[0]
  if (!alternatives?.length) return null

  const { transcript } = alternatives[0]
  return transcript || null
}
