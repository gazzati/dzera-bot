import fs from "fs"

import ffmpegInstaller from "@ffmpeg-installer/ffmpeg"
import ffmpeg from "fluent-ffmpeg"

import config from "@root/config"

import { log } from "../helpers/logger"

ffmpeg.setFfmpegPath(ffmpegInstaller.path)

export const convertToWav = async (path: string): Promise<string> => {
  const newPath = path.split(".").slice(0, -1).concat(config.audioFormat).join(".")
  const outStream = fs.createWriteStream(newPath)

  return new Promise((resolve, reject) => {
    ffmpeg()
      .input(path)
      .audioQuality(96)
      .toFormat(config.audioFormat)
      .on("error", error => reject(error))
      // .on('exit', () => console.log('Audio recorder exited'))
      // .on('close', () => console.log('Audio recorder closed'))
      .on("end", () => {
        log("Audio Transcoding succeeded !")
        fs.unlinkSync(path)
        resolve(newPath)
      })
      .pipe(outStream, { end: true })
  })
}

export const setupFolder = () => {
  return new Promise(resolve => {
    fs.rmdir(config.filesPath, { recursive: true }, () => {
      fs.mkdirSync(config.filesPath)
      resolve(1)
    })
  })
}
