"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.authRouter = void 0;
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const auth_controller_1 = require("../controllers/auth.controller");
exports.authRouter = (0, express_1.Router)();
exports.authRouter.post("/login", auth_controller_1.login);
exports.authRouter.get("/me", auth_1.authenticate, auth_controller_1.me);
exports.authRouter.post("/change-password", auth_1.authenticate, auth_controller_1.changePassword);
//# sourceMappingURL=auth.routes.js.map