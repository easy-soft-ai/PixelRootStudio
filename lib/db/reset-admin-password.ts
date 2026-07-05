/**
 * Reset (or create) an admin user's password.
 *
 * Usage:
 *   npm run admin:reset-password -- <email> <new-password>
 *   npm run admin:reset-password -- <new-password>        (uses the only/first admin)
 *   npm run admin:reset-password                          (interactive prompts)
 *
 * Examples:
 *   npm run admin:reset-password -- admin@pixelroot.studio "MyN3wPass!"
 *   npm run admin:reset-password -- "MyN3wPass!"
 */
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { hash } from "bcryptjs";
import { eq } from "drizzle-orm";
import readline from "readline";
import path from "path";
import fs from "fs";
import * as schema from "./schema";
import { runMigrations } from "./migrate";

const DB_PATH = path.join(process.cwd(), "data", "pixelroot.db");

function ask(question: string, { hidden = false } = {}): Promise<string> {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

  return new Promise((resolve) => {
    if (hidden) {
      const stdout = process.stdout as NodeJS.WriteStream & { _writeToOutput?: (s: string) => void };
      const originalWrite = stdout._writeToOutput?.bind(stdout);
      stdout._writeToOutput = (str: string) => {
        if (str.includes(question)) {
          originalWrite?.(str);
        } else {
          originalWrite?.("*");
        }
      };
    }

    rl.question(question, (answer) => {
      if (hidden) process.stdout.write("\n");
      rl.close();
      resolve(answer.trim());
    });
  });
}

function looksLikeEmail(value: string): boolean {
  return /.+@.+\..+/.test(value);
}

async function main() {
  if (!fs.existsSync(DB_PATH)) {
    console.error(`✗ Database not found at ${DB_PATH}`);
    console.error("  Run `npm run db:seed` first to create it.");
    process.exit(1);
  }

  const sqlite = new Database(DB_PATH);
  sqlite.pragma("journal_mode = WAL");
  runMigrations(sqlite);
  const db = drizzle(sqlite, { schema });

  const admins = db.select().from(schema.adminUsers).all();

  // Parse positional args after the `--` separator.
  const args = process.argv.slice(2);
  let email: string | undefined;
  let password: string | undefined;

  if (args.length >= 2) {
    [email, password] = args;
  } else if (args.length === 1) {
    // A single arg is treated as the password (uses the sole/first admin).
    password = args[0];
  }

  // Resolve the target email.
  if (!email) {
    if (admins.length === 1) {
      email = admins[0].email;
    } else if (admins.length === 0) {
      email = await ask("New admin email: ");
      if (!looksLikeEmail(email)) {
        console.error("✗ Invalid email address.");
        process.exit(1);
      }
    } else {
      console.log("Multiple admin users found:");
      admins.forEach((a, i) => console.log(`  ${i + 1}. ${a.email}`));
      email = await ask("Enter the admin email to reset: ");
    }
  }

  // Prompt for password if not provided.
  if (!password) {
    password = await ask("New password: ", { hidden: true });
    const confirm = await ask("Confirm password: ", { hidden: true });
    if (password !== confirm) {
      console.error("✗ Passwords do not match.");
      process.exit(1);
    }
  }

  if (!password || password.length < 6) {
    console.error("✗ Password must be at least 6 characters.");
    process.exit(1);
  }

  const passwordHash = await hash(password, 12);
  const existing = admins.find((a) => a.email === email);

  if (existing) {
    db.update(schema.adminUsers)
      .set({ passwordHash })
      .where(eq(schema.adminUsers.id, existing.id))
      .run();
    console.log(`\n✓ Password reset for ${email}`);
  } else {
    db.insert(schema.adminUsers)
      .values({
        email: email!,
        passwordHash,
        name: "Admin",
        createdAt: new Date(),
      })
      .run();
    console.log(`\n✓ Created new admin user ${email}`);
  }

  sqlite.close();
  console.log("  You can now log in at /admin/login");
}

main().catch((err) => {
  console.error("✗ Failed to reset password:", err);
  process.exit(1);
});
