import { DataTypes, Model, type Sequelize } from 'sequelize';
import type { TransferState } from './transferTypes.js';

export type TransferLogAttributes = {
  id?: number;
  transferCode: string | null;
  receiverId: string | null;
  senderId: string | null;
  filename: string | null;
  fileSize: number | null;
  state: TransferState;
  updatedAt?: Date;
};

/**
 * Sequelize model for operational transfer metadata.
 */
export class TransferLog extends Model<TransferLogAttributes, TransferLogAttributes> implements TransferLogAttributes {
  declare id: number;
  declare transferCode: string | null;
  declare receiverId: string | null;
  declare senderId: string | null;
  declare filename: string | null;
  declare fileSize: number | null;
  declare state: TransferState;
  declare updatedAt: Date;
}

/**
 * Registers the transfer log model on a Sequelize connection.
 * @param database Sequelize connection.
 * @returns Initialized transfer log model.
 */
export function initializeTransferLogModel(database: Sequelize): typeof TransferLog {
  TransferLog.init({
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    transferCode: { type: DataTypes.STRING(10), allowNull: true, field: 'transfer_code' },
    receiverId: { type: DataTypes.STRING(128), allowNull: true, field: 'receiver_id' },
    senderId: { type: DataTypes.STRING(128), allowNull: true, field: 'sender_id' },
    filename: { type: DataTypes.STRING(1024), allowNull: true },
    fileSize: { type: DataTypes.BIGINT, allowNull: true, field: 'file_size' },
    state: { type: DataTypes.ENUM('waiting', 'transferring', 'completed', 'expired'), allowNull: false },
    updatedAt: { type: DataTypes.DATE, allowNull: false, field: 'updated_at' }
  }, {
    sequelize: database,
    tableName: 'transfer_logs',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [{ fields: ['transfer_code'] }, { fields: ['state'] }, { fields: ['created_at'] }, { fields: ['updated_at'] }]
  });
  return TransferLog;
}
