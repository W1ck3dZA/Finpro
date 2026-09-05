"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireAdmin = requireAdmin;
/** Must run after `authenticate`. Backend-enforced role check — the real security boundary. */
function requireAdmin(req, res, next) {
    if (req.user?.role !== "ADMIN") {
        res.status(403).json({ error: "Admin access required" });
        return;
    }
    next();
}
//# sourceMappingURL=requireAdmin.js.map