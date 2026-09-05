"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.env = void 0;
require("dotenv/config");
const zod_1 = require("zod");
const envSchema = zod_1.z.object({
    DATABASE_URL: zod_1.z.string().min(1),
    JWT_SECRET: zod_1.z.string().min(16),
    PORT: zod_1.z.coerce.number().default(4000),
    SEED_ADMIN_NAME: zod_1.z.string().default("Admin"),
    SEED_ADMIN_EMAIL: zod_1.z.string().email(),
    SEED_ADMIN_PASSWORD: zod_1.z.string().min(8),
});
const parsed = envSchema.safeParse(process.env);
if (!parsed.success) {
    console.error("Invalid environment configuration:", parsed.error.flatten().fieldErrors);
    process.exit(1);
}
exports.env = parsed.data;
//# sourceMappingURL=env.js.map