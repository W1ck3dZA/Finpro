"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.importsRouter = void 0;
const express_1 = require("express");
const multer_1 = __importDefault(require("multer"));
const auth_1 = require("../middleware/auth");
const requireAdmin_1 = require("../middleware/requireAdmin");
const imports_controller_1 = require("../controllers/imports.controller");
const upload = (0, multer_1.default)({
    storage: multer_1.default.memoryStorage(),
    limits: { fileSize: 50 * 1024 * 1024 },
    fileFilter: (_req, file, cb) => {
        if (!file.originalname.toLowerCase().endsWith(".csv")) {
            cb(new Error("Only .csv files are accepted"));
            return;
        }
        cb(null, true);
    },
});
exports.importsRouter = (0, express_1.Router)();
exports.importsRouter.use(auth_1.authenticate, requireAdmin_1.requireAdmin);
exports.importsRouter.post("/", upload.single("file"), imports_controller_1.uploadImport);
exports.importsRouter.get("/", imports_controller_1.listImports);
exports.importsRouter.get("/:id", imports_controller_1.getImport);
//# sourceMappingURL=imports.routes.js.map