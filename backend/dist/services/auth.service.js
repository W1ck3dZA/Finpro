"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.hashPassword = hashPassword;
exports.verifyLogin = verifyLogin;
exports.issueToken = issueToken;
exports.verifyPassword = verifyPassword;
exports.updatePassword = updatePassword;
const bcrypt_1 = __importDefault(require("bcrypt"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const prisma_1 = require("../config/prisma");
const env_1 = require("../config/env");
const SALT_ROUNDS = 12;
const TOKEN_TTL = "12h";
async function hashPassword(plain) {
    return bcrypt_1.default.hash(plain, SALT_ROUNDS);
}
async function verifyLogin(email, password) {
    const user = await prisma_1.prisma.user.findUnique({ where: { email } });
    if (!user || !user.active)
        return null;
    const valid = await bcrypt_1.default.compare(password, user.passwordHash);
    if (!valid)
        return null;
    return user;
}
function issueToken(user) {
    return jsonwebtoken_1.default.sign({ id: user.id, email: user.email, role: user.role }, env_1.env.JWT_SECRET, {
        expiresIn: TOKEN_TTL,
    });
}
async function verifyPassword(plain, hash) {
    return bcrypt_1.default.compare(plain, hash);
}
async function updatePassword(userId, newPassword) {
    const passwordHash = await hashPassword(newPassword);
    await prisma_1.prisma.user.update({ where: { id: userId }, data: { passwordHash } });
}
//# sourceMappingURL=auth.service.js.map