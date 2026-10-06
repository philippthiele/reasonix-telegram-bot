import { logger } from "../utils/logger.js";

export type ReasonixReadyHandler = (reason: string) => Promise<void> | void;

export class ReasonixReadyLifecycle {
  private ready = false;
  private handlers = new Set<ReasonixReadyHandler>();

  onReady(handler: ReasonixReadyHandler): () => void {
    this.handlers.add(handler);
    return () => {
      this.handlers.delete(handler);
    };
  }

  isReady(): boolean {
    return this.ready;
  }

  async notifyReady(reason: string): Promise<boolean> {
    if (this.ready) {
      logger.debug(`[ReasonixReady] Ready notification ignored: reason=${reason}`);
      return false;
    }

    this.ready = true;
    logger.info(`[ReasonixReady] Reasonix server is ready: reason=${reason}`);

    for (const handler of this.handlers) {
      try {
        await handler(reason);
      } catch (error) {
        logger.warn(`[ReasonixReady] Ready handler failed: reason=${reason}`, error);
      }
    }

    return true;
  }

  notifyUnavailable(reason: string): boolean {
    if (!this.ready) {
      logger.debug(`[ReasonixReady] Unavailable notification ignored: reason=${reason}`);
      return false;
    }

    this.ready = false;
    logger.warn(`[ReasonixReady] Reasonix server became unavailable: reason=${reason}`);
    return true;
  }
}
