import { DataSource } from "typeorm"

import config from "@root/config"

import { Chat } from "@database/entities/Chat"
import { log } from "@helpers/logger"

export const AppDataSource = new DataSource({
  type: "postgres",
  host: config.psqlHost,
  port: 5432,
  database: config.psqlDatabase,
  username: config.psqlUsername,
  password: config.psqlPassword,
  entities: [Chat],
  subscribers: [],
  migrations: [],
  synchronize: true
  //logging: true
})

AppDataSource.initialize()
  .then(() => log(`Connected to the database: ${config.psqlDatabase} \n`))
  .catch(error => console.error(error))

export const entities = {
  Chat: AppDataSource.getRepository(Chat)
}
