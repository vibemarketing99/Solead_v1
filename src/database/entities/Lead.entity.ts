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
import { Agent } from './Agent.entity';
import { Task } from './Task.entity';

@Entity('leads')
@Index(['agentId', 'category', 'score'])
@Index(['capturedAt'])
@Index(['postUrl'], { unique: true })
export class Lead {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  agentId!: string;

  @ManyToOne(() => Agent, (agent) => agent.leads)
  @JoinColumn({ name: 'agentId' })
  agent!: Agent;

  @Column({ type: 'text', unique: true })
  postUrl!: string;

  @Column({ type: 'varchar', length: 255 })
  postId!: string;

  @Column({ type: 'varchar', length: 255 })
  authorHandle!: string;

  @Column({ type: 'integer', nullable: true })
  authorFollowers?: number;

  @Column({ type: 'jsonb' })
  content!: {
    text: string;
    hashtags: string[];
    mentions: string[];
    links: string[];
    hasQuestion: boolean;
    sentiment?: 'positive' | 'negative' | 'neutral';
  };

  @Column({ type: 'jsonb' })
  metrics!: {
    replies: number;
    likes: number;
    reposts: number;
    views?: number;
    timestampRaw: string;
    timestampParsed: Date;
    engagementRate?: number;
  };

  @Column({ type: 'decimal', precision: 3, scale: 2 })
  score!: number;

  @Column({
    type: 'enum',
    enum: ['hot', 'medium', 'cold'],
  })
  category!: 'hot' | 'medium' | 'cold';

  @Column({ type: 'text', array: true })
  reasons!: string[];

  @Column({ type: 'jsonb', nullable: true })
  screenshots?: {
    thumbnail: string;
    full: string;
    capturedAt: Date;
  };

  @Column({ type: 'timestamptz' })
  capturedAt!: Date;

  @OneToMany(() => Task, (task) => task.lead)
  tasks!: Task[];

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}