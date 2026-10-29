import { Sequelize } from "sequelize";
import { config } from "../config.js";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";

/**
 * Creates the application Sequelize connection.
 * @returns Configured Sequelize instance.
 */
export function createDatabase(): Sequelize {
  const storage = config.databaseStorage;
  mkdirSync(dirname(storage), { recursive: true });
  return new Sequelize({
    dialect: "sqlite",
    storage: config.databaseStorage,
    dialectOptions: {
      timeout: 10_000,
    },
    pool: {
      max: 1,
      min: 0,
      idle: 10_000,
    },
    logging: false,
  });
}

/**
 * Applies small additive schema updates required by existing local databases.
 * @param database Sequelize connection.
 * @returns Promise resolving after required columns exist.
 */
export async function migrateDatabase(database: Sequelize): Promise<void> {
  const queryInterface = database.getQueryInterface();
  const tables = await queryInterface.showAllTables();
  if (!tables.some((table) => String(table) === "transfer_logs")) return;

  const columns = await queryInterface.describeTable("transfer_logs");
  if (!columns.transfer_code) {
    await queryInterface.addColumn("transfer_logs", "transfer_code", {
      type: "VARCHAR(10)",
      allowNull: true,
    });
  }
  if (!columns.updated_at) {
    await queryInterface.addColumn("transfer_logs", "updated_at", {
      type: "DATETIME",
      allowNull: true,
    });
  }
}
