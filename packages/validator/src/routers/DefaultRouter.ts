import { WebService } from "../service/WebService";

import express from "express";
import { Metrics } from "../metrics/Metrics";

export class DefaultRouter {
    /**
     *
     * @private
     */
    private _web_service: WebService;
    private readonly _metrics: Metrics;

    /**
     *
     * @param service  WebService
     * @param metrics Metrics
     */
    constructor(service: WebService, metrics: Metrics) {
        this._web_service = service;
        this._metrics = metrics;
    }

    private get app(): express.Application {
        return this._web_service.app;
    }

    public registerRoutes() {
        // Get Health Status
        this.app.get("/", [], this.getHealthStatus.bind(this));
        this.app.get("/metrics", [], this.getMetrics.bind(this));
    }

    private async getHealthStatus(req: express.Request, res: express.Response) {
        return res.status(200).json("OK");
    }
    private makeResponseData(code: number, data: any, error?: any): any {
        return {
            code,
            data,
            error,
        };
    }

    /**
     * GET /metrics
     * @private
     */
    private async getMetrics(req: express.Request, res: express.Response) {
        res.set("Content-Type", this._metrics.contentType());
        this._metrics.add("status", 1);
        res.end(await this._metrics.metrics());
    }
}
