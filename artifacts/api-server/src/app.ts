import express, { type Express, type ErrorRequestHandler } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import router from "./routes";
import { logger } from "./lib/logger";

const app: Express = express();

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);
app.use(cors());
app.use(express.json({
  verify: (req, _res, buf) => {
    (req as unknown as { rawBody?: string }).rawBody = buf.toString("utf8");
  },
}));
app.use(express.urlencoded({ extended: true }));

app.use("/api", router);

app.use("/api", (_req, res) => {
  res.status(404).json({ ok: false, code: "API_ROUTE_NOT_FOUND", message: "API route was not found." });
});
const apiErrorHandler: ErrorRequestHandler = (error: unknown, _req, res, _next) => {
  const status = (error as { status?: number })?.status;
  const clientError = status === 400 || status === 413;
  res.status(clientError ? status : 503).json({ ok: false, code: clientError ? "INVALID_REQUEST_BODY" : "API_UNAVAILABLE", message: clientError ? "Request body is invalid or exceeds the size limit." : "The API could not complete this request." });
};
app.use(apiErrorHandler);

export default app;
