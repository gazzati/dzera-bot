import { Column, Entity, PrimaryColumn, CreateDateColumn, UpdateDateColumn } from "typeorm"

@Entity({ name: "chats" })
export class Chat {
  @PrimaryColumn()
  id: number

  @Column({ nullable: true })
  username: string

  @Column({ nullable: true })
  first_name: string

  @Column({ nullable: true })
  last_name: string

  @Column({ default: 0 })
  count: number

  @Column()
  @CreateDateColumn()
  created_at: Date

  @Column()
  @UpdateDateColumn()
  updated_at: Date
}
