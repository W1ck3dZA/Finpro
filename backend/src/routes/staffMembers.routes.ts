import { Router } from "express";
import { authenticate } from "../middleware/auth";
import { requireAdmin } from "../middleware/requireAdmin";
import { getStaffMembers, updateStaffMember } from "../controllers/staffMembers.controller";

export const staffMembersRouter = Router();

staffMembersRouter.use(authenticate);
staffMembersRouter.get("/", getStaffMembers);
staffMembersRouter.patch("/:id", requireAdmin, updateStaffMember);
