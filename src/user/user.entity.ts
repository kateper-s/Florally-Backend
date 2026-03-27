import { Entity, Column, PrimaryGeneratedColumn, OneToMany } from "typeorm";
import { UserPlant } from '../users_plants/users_plants.entity';
import { UserRoom } from "src/user_rooms/user_rooms.entity";

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

<<<<<<< HEAD
  @OneToMany(() => UserPlant, (userPlant) => userPlant.user)
  userPlants: UserPlant[];

  @OneToMany(() => UserRoom, room => room.user)
  userRooms: UserRoom[];
=======
    @OneToMany(() => UserPlant, (userPlant) => userPlant.user)
    userPlants: UserPlant[];

  @Column({nullable: true, unique:true})
  telegramChatId: string;
>>>>>>> origin/telegram-notifications-bot
}
