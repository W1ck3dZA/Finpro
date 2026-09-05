"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.usersRouter = void 0;
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const requireAdmin_1 = require("../middleware/requireAdmin");
const users_controller_1 = require("../controllers/users.controller");
exports.usersRouter = (0, express_1.Router)();
exports.usersRouter.use(auth_1.authenticate, requireAdmin_1.requireAdmin);
exports.usersRouter.get("/", users_controller_1.listUsers);
exports.usersRouter.post("/", users_controller_1.createUser);
exports.usersRouter.patch("/:id", users_controller_1.updateUser);
exports.usersRouter.post("/:id/reset-password", users_controller_1.resetPassword);
//# sourceMappingURL=users.routes.js.map