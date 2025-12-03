export class CreateEventsDto {
  name: string;
  completed?: boolean;
  date: Date;
  user_plant_id: string;
  color?: string;
  description?: string;
}

export class UpdateEventsDto {
  name?: string;
  completed?: boolean;
  date?: Date;
  user_plant_id?: string;
  color?: string;
  description?: string;
}
