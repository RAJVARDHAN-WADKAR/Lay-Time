const fs = require('fs');
const path = require('path');

const users = [
  { id: "usr-admin", name: "Alex Vance (Admin)", email: "alex.admin@maritime-ops.com", role: "Admin", status: "Active", createdAt: "2024-01-10" },
  { id: "usr-proc-1", name: "Sarah Jenkins", email: "sarah.jenkins@maritime-ops.com", role: "Claim Processor", assignedClaimsCount: 5, status: "Active", createdAt: "2024-02-15" },
  { id: "usr-proc-2", name: "Marcus Aurelius", email: "marcus.a@maritime-ops.com", role: "Claim Processor", assignedClaimsCount: 4, status: "Active", createdAt: "2024-03-01" },
  { id: "usr-super", name: "Elena Rostova", email: "elena.super@maritime-ops.com", role: "Supervisor", status: "Active", createdAt: "2024-01-05" },
  { id: "usr-rev", name: "David Chen", email: "david.reviewer@maritime-ops.com", role: "Reviewer", status: "Active", createdAt: "2024-04-12" }
];

fs.writeFileSync(path.join(process.cwd(), 'lib/mock/users.ts'), `import { User } from "@/lib/types";\nexport const MOCK_USERS: User[] = ${JSON.stringify(users, null, 2)};\n`, 'utf8');
console.log('Wrote users.ts');
