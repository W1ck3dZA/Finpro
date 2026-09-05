"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.staffMembersRouter = void 0;
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const requireAdmin_1 = require("../middleware/requireAdmin");
const staffMembers_controller_1 = require("../controllers/staffMembers.controller");
exports.staffMembersRouter = (0, express_1.Router)();
exports.staffMembersRouter.use(auth_1.authenticate);
exports.staffMembersRouter.get("/", staffMembers_controller_1.getStaffMembers);
exports.staffMembersRouter.patch("/:id", requireAdmin_1.requireAdmin, staffMembers_controller_1.updateStaffMember);
//# sourceMappingURL=staffMembers.routes.js.map