import { UserRole } from "@/lib/types";
import { z } from "zod";

/**
 * Strict hierarchical creation matrix.
 * Admin -> [Admin, Supervisor, Reviewer]
 * Supervisor -> [Claim Processor]
 * Claim Processor -> [Client]
 * Client and Reviewer -> []
 */
export const CREATE_MATRIX: Record<string, UserRole[]> = {
  ADMIN: ["ADMIN", "SUPERVISOR", "REVIEWER_CLIENT", "Admin", "Supervisor", "Reviewer"],
  Admin: ["ADMIN", "SUPERVISOR", "REVIEWER_CLIENT", "Admin", "Supervisor", "Reviewer"],
  SUPERVISOR: ["CLAIM_PROCESSOR", "Claim Processor", "Processor"],
  Supervisor: ["CLAIM_PROCESSOR", "Claim Processor", "Processor"],
  CLAIM_PROCESSOR: ["REVIEWER_CLIENT", "Client"],
  "Claim Processor": ["REVIEWER_CLIENT", "Client"],
  Processor: ["REVIEWER_CLIENT", "Client"],
  REVIEWER_CLIENT: [],
  Reviewer: [],
  Client: [],
  Finance: []
};

export const CreateUserSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").max(100),
  email: z.string().email("Invalid email address").max(100),
  username: z.string().min(2).max(50).optional(),
  role: z.enum([
    "ADMIN",
    "SUPERVISOR",
    "CLAIM_PROCESSOR",
    "REVIEWER_CLIENT",
    "Admin",
    "Supervisor",
    "Claim Processor",
    "Processor",
    "Reviewer",
    "Finance",
    "Client"
  ]),
  clientId: z.string().optional(),
  clientName: z.string().optional(),
  roleDescription: z.string().max(255).optional(),
  password: z.string().min(6).optional(),
  temporaryPassword: z.string().min(6).optional()
}).refine(
  (data) => {
    if (data.role === "Client") {
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
  role: z
    .enum([
      "ADMIN",
      "SUPERVISOR",
      "CLAIM_PROCESSOR",
      "REVIEWER_CLIENT",
      "Admin",
      "Supervisor",
      "Claim Processor",
      "Processor",
      "Reviewer",
      "Finance",
      "Client"
    ])
    .optional(),
  clientId: z.string().nullable().optional(),
  clientName: z.string().nullable().optional(),
  roleDescription: z.string().max(255).optional(),
  password: z.string().min(6).optional(),
  status: z.enum(["Active", "Inactive"]).optional()
});
