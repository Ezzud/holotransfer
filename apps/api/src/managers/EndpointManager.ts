import cors from "cors";
import express, { type Express } from "express";
import rateLimit from "express-rate-limit";
import { config } from "../Config.js";
import { createClientController } from "../controllers/ClientController.js";
import { createTransferController } from "../controllers/CreateTransferController.js";
import { joinTransferController } from "../controllers/JoinTransferController.js";
import { ClientManager } from "./ClientManager.js";
import { TransferManager } from "./TransferManager.js";

/**
 * Configures HTTP middleware and API endpoints.
 */
export class EndpointManager {
  private readonly application: Express;
  private readonly transfers: TransferManager;
  private readonly clients: ClientManager;

  /**
   * Creates an endpoint manager.
   * @param application Express application.
   * @param transfers Transfer manager.
   * @param clients Client manager.
   */
  public constructor(
    application: Express,
    transfers: TransferManager,
    clients: ClientManager,
  ) {
    this.application = application;
    this.transfers = transfers;
    this.clients = clients;
  }

  /**
   * Registers middleware and routes.
   * @returns Nothing.
   */
  public Configure(): void {
    this.application.set("trust proxy", 1);
    this.application.use(
      cors({
        origin: (requestOrigin, callback) => {
          if (
            !requestOrigin ||
            config.allowedOrigins.includes("*") ||
            config.allowedOrigins.includes(requestOrigin)
          ) {
            callback(null, true);
            return;
          }
          callback(null, false);
        },
        methods: ["GET", "POST", "OPTIONS"],
        allowedHeaders: ["Content-Type", "x-client-id"],
        optionsSuccessStatus: 204,
      }),
    );
    this.application.use(express.json({ limit: "16kb" }));
    this.application.use(this.CreateRateLimiter(120));
    this.application.get("/health", (_request, response) =>
      response.json({ ok: true }),
    );
    this.application.get(
      `${config.apiPrefix}/clients`,
      this.CreateRateLimiter(5, 1_000),
      createClientController(this.clients),
    );
    this.application.post(
      `${config.apiPrefix}/transfers`,
      this.CreateRateLimiter(
        3,
        30_000,
        undefined,
        "You created too many codes, please wait for 30 seconds",
      ),
      createTransferController(this.transfers, this.clients),
    );
    this.application.post(
      `${config.apiPrefix}/transfers/join`,
      this.CreateRateLimiter(3),
      joinTransferController(this.transfers, this.clients),
    );
  }

  /**
   * Creates a JSON rate limiter.
   * @param limit Maximum requests in the window.
   * @param windowMs Rate-limit window in milliseconds.
   * @param retryWindow Human-readable retry window.
   * @param message Custom error message.
   * @returns Configured rate-limit middleware.
   */
  private CreateRateLimiter(
    limit: number,
    windowMs = 60_000,
    retryWindow = "a minute",
    message?: string,
  ) {
    return rateLimit({
      windowMs,
      limit,
      standardHeaders: true,
      handler: (_request, response) =>
        response
          .status(429)
          .json({
            error: message ?? `Too many requests. Try again in ${retryWindow}.`,
          }),
    });
  }
}
