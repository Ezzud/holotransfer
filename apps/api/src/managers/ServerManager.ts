import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import type { Sequelize } from "sequelize";
import { config } from "../Config.js";
import { logger } from "../Logger.js";
import { migrateDatabase } from "../models/Database.js";
import { TransferLogManager } from "./TransferLogManager.js";
import { TransferManager } from "./TransferManager.js";

/**
 * Coordinates database initialization, cleanup, and HTTP server startup.
 */
export class ServerManager {
  /**
   * Creates a server manager.
   * @param server HTTP server.
   * @param database Sequelize database.
   * @param transfers Transfer manager.
   * @param logs Transfer log manager.
   */
  public constructor(
    private readonly server: Server,
    private readonly database: Sequelize,
    private readonly transfers: TransferManager,
    private readonly logs: TransferLogManager,
  ) {}

  /**
   * Initializes persistence and starts listening.
   * @returns Promise resolving after startup is scheduled.
   */
  public async Start(): Promise<void> {
    try {
      await migrateDatabase(this.database);
      await this.database.sync();
      await this.logs.expireActiveTransfers();
      logger.info("Database ready");
    } catch (error) {
      logger.error("Unable to initialize database", error);
      process.exitCode = 1;
      return;
    }
    this.ScheduleRoomCleanup();
    this.server.listen(config.port, config.host, () => {
      const address = this.server.address() as AddressInfo;
      logger.info("HoloTransfer API listening", {
        host: address.address,
        port: address.port,
        apiPrefix: config.apiPrefix,
        websocketPath: config.websocketPath,
      });
    });
  }

  /**
   * Starts periodic room cleanup.
   * @returns Nothing.
   */
  private ScheduleRoomCleanup(): void {
    setInterval(
      () =>
        this.transfers.expireRooms((room) => {
          logger.warn("Transfer code expired", { code: room.code });
          return this.logs.record(room, "expired");
        }),
      60_000,
    ).unref();
  }
}
