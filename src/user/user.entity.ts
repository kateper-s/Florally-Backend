import { Entity, Column, PrimaryGeneratedColumn } from "typeorm";

@Entity()
export class User {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ unique: true })
  email: string;

  @Column()
  username: string;

  @Column()
  password: string;

  @Column({ name: "is_enabled", default: true })
  is_enabled: boolean;

  @Column()
  created_at: Date;

  @Column()
  updated_at: Date;
}
