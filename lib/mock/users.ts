import { User } from "@/lib/types";

export const MOCK_USERS: User[] = [
  {
    id: "usr-001",
    name: "Rajvardhan Wadkar",
    email: "rajvardhanwadkar76@gmail.com",
    role: "Admin",
    roleDescription: "Principal Administrator & Master Mariner. Unrestricted global access.",
    status: "Active",
    createdAt: "2024-01-01",
  },
  {
    id: "usr-002",
    name: "Rohit Mengane",
    email: "rohitmengane2975@gmail.com",
    role: "Claim Processor",
    roleDescription: "Senior Demurrage Analyst. Manages primary claim and RAC portfolios.",
    assignedClaimsCount: 5,
    status: "Active",
    createdAt: "2024-01-01",
  },
  {
    id: "usr-003",
    name: "Swayam Ghatage",
    email: "swayamghatage3839@gmail.com",
    role: "Supervisor",
    roleDescription: "Operations Supervisor & Post-Fixture Lead. Full review and authorization authority.",
    status: "Active",
    createdAt: "2024-01-01",
  },
  {
    id: "usr-004",
    name: "Paras Chougale",
    email: "paraschougale558@gmail.com",
    role: "Reviewer",
    roleDescription: "Legal Counsel & External Auditor. Read-only compliance inspection mode.",
    status: "Active",
    createdAt: "2024-01-01",
  },
];
