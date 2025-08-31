import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
  Index,
} from 'typeorm';
import { Account } from './Account.entity';
import { Lead } from './Lead.entity';

@Entity('agents')
@Index(['isActive', 'nextRunAt'])
@Index(['accountId'])
export class Agent {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  accountId!: string;

  @ManyToOne(() => Account, (account) => account.agents)
  @JoinColumn({ name: 'accountId' })
  account!: Account;

  @Column({ type: 'varchar', length: 255 })
  name!: string;

  @Column({ type: 'text', array: true })
  keywords!: string[];

  @Column({ type: 'jsonb', nullable: true })
  advancedRules?: {
    mustContain?: string[];
    mustNotContain?: string[];
    minEngagement?: number;
    authorMinFollowers?: number;
    language?: string;
    excludeVerified?: boolean;
  };

  @Column({ type: 'varchar', length: 100, nullable: true })
  schedule?: string; // Cron expression

  @Column({ type: 'integer', default: 30 })
  dailyCap!: number;

  @Column({ type: 'jsonb' })
  concurrency!: {
    maxParallelPages: number;
    scrollDelayMs: [number, number];
    actionDelayMs: [number, number];
    humanization: {
      scrollPattern: 'linear' | 'exponential' | 'random';
      mouseMovement: boolean;
      readingDelays: boolean;
      randomBreaks: [number, number];
      dwellTime?: [number, number];
    };
  };

  @Column({ type: 'boolean', default: true })
  isActive!: boolean;

  @Column({ type: 'timestamptz', nullable: true })
  lastRunAt?: Date;

  @Column({ type: 'timestamptz', nullable: true })
  nextRunAt?: Date;

  @OneToMany(() => Lead, (lead) => lead.agent)
  leads!: Lead[];

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}