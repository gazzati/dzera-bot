import { Column, Entity, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn } from "typeorm"

@Entity({ name: "stories" })
export class Story {
  @PrimaryGeneratedColumn({ type: "bigint" })
  id: number

  @Column()
  content: string

  @Column()
  chat_id: number

  @Column()
  @CreateDateColumn()
  created_at: Date

  @Column()
  @UpdateDateColumn()
  updated_at: Date
}
