import bodyParser from "body-parser";
import cors from "cors";
import { Config } from "./common/Config";
import { Metrics } from "./metrics/Metrics";
import { DefaultRouter } from "./routers/DefaultRouter";
import { Scheduler } from "./scheduler/Scheduler";
import { WebService } from "./service/WebService";
import { ValidatorStorage } from "./storage/ValidatorStorage";

import { register } from "prom-client";

export class DefaultServer extends WebService {
    /**
     * The configuration of the database
     * @private
     */
    private readonly config: Config;
    private readonly metrics: Metrics;
    protected schedules: Scheduler[] = [];

    public readonly defaultRouter: DefaultRouter;
    public readonly storage: ValidatorStorage;

    /**
     * Constructor
     * @param config Configuration
     * @param storage
     * @param schedules
     */
    constructor(config: Config, storage: ValidatorStorage, schedules?: Scheduler[]) {
        super(config.server.port, config.server.address);
        register.clear();
        this.metrics = new Metrics();
        this.metrics.create("gauge", "status", "serve status");

        this.config = config;
        this.storage = storage;
        this.defaultRouter = new DefaultRouter(this, this.metrics);

        if (!schedules) schedules = [];
        schedules.forEach((m) => this.schedules.push(m));
        this.schedules.forEach((m) =>
            m.setOption({
                config: this.config,
                storage: this.storage,
            })
        );
    }

    /**
     * Setup and start the server
     */
    public async start(): Promise<void> {
        // parse application/x-www-form-urlencoded
        this.app.use(bodyParser.urlencoded({ extended: false, limit: "1mb" }));
        // parse application/json
        this.app.use(bodyParser.json({ limit: "1mb" }));
        this.app.use(
            cors({
                allowedHeaders: "*",
                credentials: true,
                methods: "GET, POST",
                origin: "*",
                preflightContinue: false,
            })
        );

        this.defaultRouter.registerRoutes();

        for (const m of this.schedules) await m.start();

        return super.start();
    }

    public stop(): Promise<void> {
        return new Promise<void>(async (resolve, reject) => {
            for (const m of this.schedules) await m.stop();
            for (const m of this.schedules) await m.waitForStop();
            if (this.server != null) {
                this.server.close((err?) => {
                    if (err) reject(err);
                    else resolve();
                });
            } else resolve();
        });
    }
}
