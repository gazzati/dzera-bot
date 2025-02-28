import { Column, Entity, PrimaryColumn, CreateDateColumn, UpdateDateColumn } from "typeorm"

import { Model } from "@root/interfaces/models"

@Entity({ name: "chats" })
export class Chat {
  @PrimaryColumn()
  id: string

  @Column({ nullable: true })
  username: string

  @Column({ nullable: true })
  first_name: string

  @Column({ nullable: true })
  last_name: string

  @Column({ default: 0 })
  count: number

  @Column({ default: Model.Gpt4oMini })
  model: string

  @Column({ default: false })
  is_blocked: boolean

  @Column()
  @CreateDateColumn()
  created_at: Date

  @Column()
  @UpdateDateColumn()
  updated_at: Date
}
