"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.clientsRouter = void 0;
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const clients_controller_1 = require("../controllers/clients.controller");
exports.clientsRouter = (0, express_1.Router)();
exports.clientsRouter.use(auth_1.authenticate);
exports.clientsRouter.get("/", clients_controller_1.listClients);
exports.clientsRouter.get("/:id", clients_controller_1.getClient);
//# sourceMappingURL=clients.routes.js.map