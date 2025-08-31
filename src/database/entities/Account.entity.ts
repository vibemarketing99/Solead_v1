import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  OneToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Session } from './Session.entity';
import { Agent } from './Agent.entity';

@Entity('accounts')
@Index(['handle'], { unique: true })
export class Account {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 255, unique: true })
  handle!: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  displayName?: string;

  @Column({
    type: 'enum',
    enum: ['active', 'expired', 'suspended'],
    default: 'active',
  })
  status!: 'active' | 'expired' | 'suspended';

  @Column({ type: 'uuid', nullable: true })
  sessionId?: string;

  @OneToOne(() => Session, { nullable: true })
  @JoinColumn({ name: 'sessionId' })
  session?: Session;

  @OneToMany(() => Agent, (agent) => agent.account)
  agents!: Agent[];

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}