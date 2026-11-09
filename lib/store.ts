import { promises as fs } from "node:fs";
import path from "node:path";
import { randomBytes, randomUUID } from "node:crypto";
import { hashPassword } from "./password";
import { TRIAL_DAYS, DAY_MS, type SubscriptionStatus } from "./trial";

export type PlanId = "monthly" | "yearly";

export type StoredSubscription = {
  plan: PlanId;
  status: SubscriptionStatus;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
  currentPeriodEnd: string | null;
  updatedAt: string;
};

export type StoredAnalysis = {
  id: string;
  createdAt: string;
  symbol: string;
  lastPrice: number;
  bias: "long" | "short";
  entry: number;
  stopLoss: number;
  takeProfit: number;
  rsi14: number | null;
  atrPercent: number | null;
  bars: number;
  chartType: "candles" | "line";
};

export type StoredUser = {
  id: string;
  email: string;
  passwordHash: string;
  passwordSalt: string;
  createdAt: string;
  trialEndsAt: string;
  stripeCustomerId: string | null;
  subscription: StoredSubscription | null;
  analyses: StoredAnalysis[];
};

type Database = {
  version: number;
  sessionSecret: string;
  users: StoredUser[];
};

export class StoreError extends Error {
  readonly code: "email_taken" | "invalid_email" | "weak_password" | "not_found";
  constructor(code: StoreError["code"], message: string) {
    super(message);
    this.name = "StoreError";
    this.code = code;
  }
}

const EMPTY_DB: Database = { version: 1, sessionSecret: "", users: [] };
const MAX_ANALYSES_PER_USER = 50;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function dataDirectory(): string {
  return process.env.DATA_DIR ? path.resolve(process.env.DATA_DIR) : path.join(process.cwd(), "data");
}

function databasePath(): string {
  return path.join(dataDirectory(), "limo-edge.json");
}

let lock: Promise<unknown> = Promise.resolve();

function withLock<T>(task: () => Promise<T>): Promise<T> {
  const run = lock.then(task, task);
  lock = run.then(
    () => undefined,
    () => undefined,
  );
  return run;
}

async function readDatabase(): Promise<Database> {
  try {
    const raw = await fs.readFile(databasePath(), "utf8");
    const parsed = JSON.parse(raw) as Database;
    if (!parsed || !Array.isArray(parsed.users)) return { ...EMPTY_DB, sessionSecret: randomSecret() };
    return {
      version: 1,
      sessionSecret: parsed.sessionSecret || randomSecret(),
      users: parsed.users,
    };
  } catch {
    return { ...EMPTY_DB, sessionSecret: randomSecret() };
  }
}

async function writeDatabase(db: Database): Promise<void> {
  const dir = dataDirectory();
  await fs.mkdir(dir, { recursive: true });
  const target = databasePath();
  const tmp = `${target}.${process.pid}.${Date.now()}.tmp`;
  await fs.writeFile(tmp, JSON.stringify(db, null, 2), "utf8");
  await fs.rename(tmp, target);
}

function randomSecret(): string {
  return randomBytes(32).toString("hex");
}

function normaliseEmail(email: string): string {
  return String(email ?? "").trim().toLowerCase();
}

export async function getSessionSecret(): Promise<string> {
  return withLock(async () => {
    const db = await readDatabase();
    if (!db.sessionSecret) {
      db.sessionSecret = randomSecret();
      await writeDatabase(db);
    }
    return db.sessionSecret;
  });
}

export async function createUser(email: string, password: string): Promise<StoredUser> {
  const normalised = normaliseEmail(email);
  if (!EMAIL_PATTERN.test(normalised)) {
    throw new StoreError("invalid_email", "Enter a valid email address.");
  }
  if (typeof password !== "string" || password.length < 8) {
    throw new StoreError("weak_password", "Passwords need at least 8 characters.");
  }

  return withLock(async () => {
    const db = await readDatabase();
    if (db.users.some((user) => user.email === normalised)) {
      throw new StoreError("email_taken", "An account with that email already exists.");
    }
    const now = new Date();
    const { hash, salt } = hashPassword(password);
    const user: StoredUser = {
      id: randomUUID(),
      email: normalised,
      passwordHash: hash,
      passwordSalt: salt,
      createdAt: now.toISOString(),
      trialEndsAt: new Date(now.getTime() + TRIAL_DAYS * DAY_MS).toISOString(),
      stripeCustomerId: null,
      subscription: null,
      analyses: [],
    };
    db.users.push(user);
    await writeDatabase(db);
    return user;
  });
}

export async function findUserByEmail(email: string): Promise<StoredUser | null> {
  const normalised = normaliseEmail(email);
  const db = await readDatabase();
  return db.users.find((user) => user.email === normalised) ?? null;
}

export async function getUserById(id: string): Promise<StoredUser | null> {
  if (!id) return null;
  const db = await readDatabase();
  return db.users.find((user) => user.id === id) ?? null;
}

export async function findUserByStripeCustomer(customerId: string): Promise<StoredUser | null> {
  if (!customerId) return null;
  const db = await readDatabase();
  return db.users.find((user) => user.stripeCustomerId === customerId) ?? null;
}

export async function updateUser(
  id: string,
  mutate: (user: StoredUser) => void,
): Promise<StoredUser> {
  return withLock(async () => {
    const db = await readDatabase();
    const user = db.users.find((entry) => entry.id === id);
    if (!user) throw new StoreError("not_found", "Account not found.");
    mutate(user);
    await writeDatabase(db);
    return user;
  });
}

export async function setSubscription(
  id: string,
  subscription: StoredSubscription | null,
  stripeCustomerId?: string | null,
): Promise<StoredUser> {
  return updateUser(id, (user) => {
    user.subscription = subscription;
    if (stripeCustomerId !== undefined) user.stripeCustomerId = stripeCustomerId;
  });
}

export async function addAnalysis(id: string, analysis: StoredAnalysis): Promise<void> {
  await updateUser(id, (user) => {
    user.analyses.unshift(analysis);
    if (user.analyses.length > MAX_ANALYSES_PER_USER) {
      user.analyses.length = MAX_ANALYSES_PER_USER;
    }
  });
}

export async function listAnalyses(id: string, limit = 8): Promise<StoredAnalysis[]> {
  const user = await getUserById(id);
  if (!user) return [];
  return user.analyses.slice(0, limit);
}

/** Test helper: wipes the JSON store so suites start from a clean slate. */
export async function resetStore(): Promise<void> {
  await withLock(async () => {
    try {
      await fs.rm(databasePath(), { force: true });
    } catch {
      // ignore
    }
  });
}
