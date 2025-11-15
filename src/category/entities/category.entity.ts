import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('category')
export class Category {
    @PrimaryGeneratedColumn({ type: 'smallint' })
    id: number;

    @Column({ unique: true, length: 50 })
    name: string;
}
