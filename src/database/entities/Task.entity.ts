import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Lead } from './Lead.entity';

@Entity('tasks')
@Index(['status', 'snoozedUntil'])
@Index(['leadId'])
export class Task {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  leadId!: string;

  @ManyToOne(() => Lead, (lead) => lead.tasks)
  @JoinColumn({ name: 'leadId' })
  lead!: Lead;

  @Column({
    type: 'enum',
    enum: ['pending', 'approved', 'snoozed', 'skipped', 'done'],
    default: 'pending',
  })
  status!: 'pending' | 'approved' | 'snoozed' | 'skipped' | 'done';

  @Column({ type: 'uuid', nullable: true })
  assigneeId?: string;

  @Column({ type: 'timestamptz', nullable: true })
  snoozedUntil?: Date;

  @Column({ type: 'timestamptz', nullable: true })
  approvedAt?: Date;

  @Column({ type: 'timestamptz', nullable: true })
  completedAt?: Date;

  @Column({ type: 'text', nullable: true })
  notes?: string;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}