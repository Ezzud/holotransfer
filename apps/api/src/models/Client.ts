import { DataTypes, Model, type Sequelize } from "sequelize";
import type { ClientAttributes } from "../Types.js";

/**
 * Sequelize model for anonymous browser clients.
 */
export class Client
  extends Model<ClientAttributes, ClientAttributes>
  implements ClientAttributes
{
  declare clientId: string;
  declare createdAt: Date;
  declare lastConnectedAt: Date;
}

/**
 * Registers the client model on a Sequelize connection.
 * @param database Sequelize connection.
 * @returns Initialized client model.
 */
export function initializeClientModel(database: Sequelize): typeof Client {
  Client.init(
    {
      clientId: {
        type: DataTypes.STRING(128),
        primaryKey: true,
        allowNull: false,
        field: "client_id",
      },
      createdAt: {
        type: DataTypes.DATE,
        allowNull: false,
        field: "created_at",
      },
      lastConnectedAt: {
        type: DataTypes.DATE,
        allowNull: false,
        field: "last_connected_at",
      },
    },
    {
      sequelize: database,
      tableName: "clients",
      timestamps: false,
      indexes: [{ fields: ["last_connected_at"] }],
    },
  );
  return Client;
}
