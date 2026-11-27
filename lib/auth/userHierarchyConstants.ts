import { UserRole } from "@/lib/types";
import { z } from "zod";
import { normalizeRole } from "./accessMatrix";

/**
 * Strict hierarchical creation matrix (Admin-only user management).
 */
export const CREATE_MATRIX: Record<string, UserRole[]> = {
  ADMIN: [
    "ADMIN",
    "SUPERVISOR",
    "CLAIM_PROCESSOR",
    "REVIEWER",
    "CLIENT",
    "Admin",
    "Supervisor",
    "Claim Processor",
    "Processor",
    "Reviewer",
    "Client"
  ],
  Admin: [
    "ADMIN",
    "SUPERVISOR",
    "CLAIM_PROCESSOR",
    "REVIEWER",
    "CLIENT",
    "Admin",
    "Supervisor",
    "Claim Processor",
    "Processor",
    "Reviewer",
    "Client"
  ],
  SUPERVISOR: [],
  Supervisor: [],
  CLAIM_PROCESSOR: [],
  "Claim Processor": [],
  Processor: [],
  REVIEWER: [],
  Reviewer: [],
  CLIENT: [],
  Client: []
};

const ROLE_ENUM = z.enum([
  "ADMIN",
  "SUPERVISOR",
  "CLAIM_PROCESSOR",
  "REVIEWER",
  "CLIENT",
  "Admin",
  "Supervisor",
  "Claim Processor",
  "Processor",
  "Reviewer",
  "Client"
]);

export const CreateUserSchema = z
  .object({
    name: z.string().min(2, "Name must be at least 2 characters").max(100),
    email: z.string().email("Invalid email address").max(100),
    username: z.string().min(2).max(50).optional(),
    role: ROLE_ENUM,
    clientId: z.string().optional(),
    clientName: z.string().optional(),
    roleDescription: z.string().max(255).optional(),
    password: z.string().min(6).optional(),
    temporaryPassword: z.string().min(6).optional()
  })
  .refine(
    (data) => {
      if (normalizeRole(data.role) === "CLIENT") {
        return !!(data.clientId || data.clientName);
      }
      return true;
    },
    {
      message: "Client ID or Client Name is required when creating a Client user",
      path: ["clientId"]
    }
  );

export const UpdateUserSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  email: z.string().email().max(100).optional(),
  role: ROLE_ENUM.optional(),
  clientId: z.string().nullable().optional(),
  clientName: z.string().nullable().optional(),
  roleDescription: z.string().max(255).optional(),
  password: z.string().min(6).optional(),
  status: z.enum(["Active", "Inactive"]).optional()
});
