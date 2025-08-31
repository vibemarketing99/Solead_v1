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
import { Account } from './Account.entity';

@Entity('sessions')
@Index(['accountId', 'healthScore'])
@Index(['expiresAt'])
export class Session {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  accountId!: string;

  @ManyToOne(() => Account)
  @JoinColumn({ name: 'accountId' })
  account!: Account;

  @Column({ type: 'text' })
  encryptedCookies!: string;

  @Column({ type: 'varchar', length: 255 })
  encryptionKeyId!: string;

  @Column({ type: 'text' })
  userAgent!: string;

  @Column({ type: 'jsonb' })
  viewport!: {
    width: number;
    height: number;
    deviceScaleFactor?: number;
    isMobile?: boolean;
    hasTouch?: boolean;
  };

  @Column({ type: 'decimal', precision: 3, scale: 2, default: 1.0 })
  healthScore!: number;

  @Column({ type: 'integer', default: 0 })
  failureCount!: number;

  @Column({ type: 'timestamptz', nullable: true })
  lastActivityAt?: Date;

  @Column({ type: 'timestamptz' })
  expiresAt!: Date;

  @Column({
    type: 'enum',
    enum: ['active', 'expired', 'refreshing', 'failed'],
    default: 'active',
  })
  status!: 'active' | 'expired' | 'refreshing' | 'failed';

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}