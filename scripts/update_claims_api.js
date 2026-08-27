const fs = require('fs');
const path = require('path');

const claimsApi = `import { Claim, SoFActivity } from "@/lib/types";
import { MOCK_CLAIMS, SEED_DEMO_CLAIMS } from "@/lib/mock/data";

// In-memory local state acting as the mock database - default empty
let claimsStore: Claim[] = [];

const delay = (ms: number = 100) => new Promise((resolve) => setTimeout(resolve, ms));

export async function getClaims(): Promise<Claim[]> {
  await delay();
  return JSON.parse(JSON.stringify(claimsStore));
}

export async function getClaimById(id: string): Promise<Claim | null> {
  await delay();
  const claim = claimsStore.find((c) => c.id === id);
  return claim ? JSON.parse(JSON.stringify(claim)) : null;
}

export async function createClaim(claimData: Omit<Claim, "id" | "createdAt" | "updatedAt">): Promise<Claim> {
  await delay(200);
  const newId = \`CLM-2024-\${String(claimsStore.length + 1).padStart(3, "0")}\`;
  const now = new Date().toISOString();

  const newClaim: Claim = {
    ...claimData,
    id: newId,
    createdAt: now,
    updatedAt: now,
    ports: claimData.ports || [],
    activities: claimData.activities || [],
  };

  claimsStore.unshift(newClaim);
  return JSON.parse(JSON.stringify(newClaim));
}

export async function updateClaim(id: string, updates: Partial<Claim>): Promise<Claim> {
  await delay();
  const index = claimsStore.findIndex((c) => c.id === id);
  if (index === -1) throw new Error(\`Claim \${id} not found\`);

  claimsStore[index] = {
    ...claimsStore[index],
    ...updates,
    updatedAt: new Date().toISOString(),
  };

  return JSON.parse(JSON.stringify(claimsStore[index]));
}

export async function deleteClaim(id: string): Promise<boolean> {
  await delay(150);
  const initialLength = claimsStore.length;
  claimsStore = claimsStore.filter((c) => c.id !== id);
  return claimsStore.length < initialLength;
}

export async function addActivity(claimId: string, activity: Omit<SoFActivity, "id">): Promise<SoFActivity> {
  await delay();
  const claim = claimsStore.find((c) => c.id === claimId);
  if (!claim) throw new Error(\`Claim \${claimId} not found\`);

  const newActivity: SoFActivity = {
    ...activity,
    id: \`act-\${Date.now()}\`,
    claimId,
  };

  if (!claim.activities) claim.activities = [];
  claim.activities.push(newActivity);
  claim.updatedAt = new Date().toISOString();

  return JSON.parse(JSON.stringify(newActivity));
}

export async function updateActivity(
  claimId: string,
  activityId: string,
  updates: Partial<SoFActivity>
): Promise<SoFActivity> {
  await delay();
  const claim = claimsStore.find((c) => c.id === claimId);
  if (!claim || !claim.activities) throw new Error("Claim or activities not found");

  const actIndex = claim.activities.findIndex((a) => a.id === activityId);
  if (actIndex === -1) throw new Error(\`Activity \${activityId} not found\`);

  claim.activities[actIndex] = {
    ...claim.activities[actIndex],
    ...updates,
    isCorrected: true,
  };
  claim.updatedAt = new Date().toISOString();

  return JSON.parse(JSON.stringify(claim.activities[actIndex]));
}

export async function clearAllClaims(): Promise<void> {
  await delay(100);
  claimsStore = [];
}

export async function loadDemoSeedClaims(): Promise<Claim[]> {
  await delay(150);
  claimsStore = JSON.parse(JSON.stringify(SEED_DEMO_CLAIMS || []));
  return JSON.parse(JSON.stringify(claimsStore));
}

export async function resetMockClaims(): Promise<void> {
  await delay(100);
  claimsStore = [];
}
`;

fs.writeFileSync(path.join(process.cwd(), 'lib/api/claims.ts'), claimsApi, 'utf8');
console.log('Updated lib/api/claims.ts with empty data defaults and helper actions');
