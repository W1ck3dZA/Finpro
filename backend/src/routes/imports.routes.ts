import { Router } from "express";
import multer from "multer";
import { authenticate } from "../middleware/auth";
import { requireAdmin } from "../middleware/requireAdmin";
import { uploadImport, listImports, getImport } from "../controllers/imports.controller";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (!file.originalname.toLowerCase().endsWith(".csv")) {
      cb(new Error("Only .csv files are accepted"));
      return;
    }
    cb(null, true);
  },
});

export const importsRouter = Router();

importsRouter.use(authenticate, requireAdmin);
importsRouter.post("/", upload.single("file"), uploadImport);
importsRouter.get("/", listImports);
importsRouter.get("/:id", getImport);
