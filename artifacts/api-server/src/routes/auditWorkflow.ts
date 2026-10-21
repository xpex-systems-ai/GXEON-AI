import { Router, type ErrorRequestHandler } from "express";
import {
  auditWorkflowActionSchema,
  auditWorkflowDetailSchema,
  auditWorkflowReportSchema,
} from "@workspace/api-zod";
import { auditAccess } from "../middlewares/auditAccess";
import { AuditWorkflowError } from "../services/auditWorkflowChecks";
import {
  createAuditWorkflowService,
  type AuditWorkflowService,
} from "../services/auditWorkflowService";

export function auditWorkflowRouter(
  service: AuditWorkflowService = createAuditWorkflowService(),
) {
  const router = Router();
  router.use(auditAccess("read"));
  router.param("caseId", (_req, res, next, id: string) => {
    if (
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        id,
      )
    ) {
      res.status(400).json({ ok: false, code: "INVALID_CASE_ID" });
      return;
    }
    next();
  });
  router.post("/cases", auditAccess("operator"), async (req, res) => {
    res
      .status(201)
      .json(auditWorkflowActionSchema.parse(await service.create(req.body)));
  });
  router.get("/cases/:caseId", async (req, res) => {
    res.json(
      auditWorkflowDetailSchema.parse(
        await service.detail(String(req.params.caseId)),
      ),
    );
  });
  router.post(
    "/cases/:caseId/run",
    auditAccess("operator"),
    async (req, res) => {
      res.json(
        auditWorkflowActionSchema.parse(
          await service.run(String(req.params.caseId)),
        ),
      );
    },
  );
  router.post(
    "/cases/:caseId/review",
    auditAccess("reviewer"),
    async (req, res) => {
      res.json(
        auditWorkflowActionSchema.parse(
          await service.review(String(req.params.caseId), req.body),
        ),
      );
    },
  );
  router.post(
    "/cases/:caseId/finalize",
    auditAccess("operator"),
    async (req, res) => {
      res.json(
        auditWorkflowActionSchema.parse(
          await service.finalize(String(req.params.caseId)),
        ),
      );
    },
  );
  router.get("/cases/:caseId/report", async (req, res) => {
    const result = auditWorkflowReportSchema.parse(
      await service.exportReport(String(req.params.caseId)),
    );
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="audit-${result.caseId}.json"`,
    );
    res.json(result);
  });
  const errorHandler: ErrorRequestHandler = (
    error: unknown,
    _req,
    res,
    _next,
  ) => {
    const known = error instanceof AuditWorkflowError;
    res.status(known ? error.status : 503).json({
      ok: false,
      code: known ? error.code : "AUDIT_STORAGE_UNAVAILABLE",
      message: known
        ? error.message
        : "Audit storage or contract is unavailable. No completion is claimed.",
    });
  };
  router.use(errorHandler);
  return router;
}
