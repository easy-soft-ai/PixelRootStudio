import type Database from "better-sqlite3";
import { ensureBaseSchema } from "./create-schema";

const columnMigrations: { table: string; column: string; type: string }[] = [
  { table: "site_settings", column: "logo", type: "TEXT" },
  { table: "site_settings", column: "favicon", type: "TEXT" },
  { table: "site_settings", column: "gtm_container_id", type: "TEXT" },
  { table: "site_settings", column: "gtm_enabled", type: "INTEGER NOT NULL DEFAULT 0" },
  { table: "site_settings", column: "ga4_measurement_id", type: "TEXT" },
  { table: "site_settings", column: "ga4_enabled", type: "INTEGER NOT NULL DEFAULT 0" },
  { table: "site_settings", column: "google_site_verification", type: "TEXT" },
  { table: "site_settings", column: "search_console_enabled", type: "INTEGER NOT NULL DEFAULT 0" },
  { table: "site_settings", column: "clarity_project_id", type: "TEXT" },
  { table: "site_settings", column: "clarity_enabled", type: "INTEGER NOT NULL DEFAULT 0" },
  { table: "site_settings", column: "facebook_pixel_id", type: "TEXT" },
  { table: "site_settings", column: "facebook_pixel_enabled", type: "INTEGER NOT NULL DEFAULT 0" },
  { table: "site_settings", column: "google_ads_id", type: "TEXT" },
  { table: "site_settings", column: "google_ads_label", type: "TEXT" },
  { table: "site_settings", column: "google_ads_enabled", type: "INTEGER NOT NULL DEFAULT 0" },
  { table: "site_settings", column: "social_title", type: "TEXT" },
  { table: "site_settings", column: "social_subtitle", type: "TEXT" },
  { table: "site_settings", column: "social_tiktok", type: "TEXT" },
  { table: "leads", column: "phone", type: "TEXT" },
  { table: "bookings", column: "lead_id", type: "INTEGER" },
  { table: "bookings", column: "invoice_id", type: "INTEGER" },
  { table: "bookings", column: "invoice_number", type: "TEXT" },
  { table: "invoice_settings", column: "signature_image", type: "TEXT" },
  { table: "invoice_settings", column: "paid_seal_image", type: "TEXT" },
];

export function runMigrations(sqlite: Database.Database) {
  ensureBaseSchema(sqlite);

  for (const { table, column, type } of columnMigrations) {
    try {
      sqlite.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${type}`);
    } catch {
      // Column already exists
    }
  }

  try {
    sqlite.exec(`
      UPDATE bookings
      SET invoice_id = (
        SELECT id FROM invoices WHERE invoices.booking_id = bookings.id LIMIT 1
      ),
      invoice_number = (
        SELECT invoice_number FROM invoices WHERE invoices.booking_id = bookings.id LIMIT 1
      )
      WHERE invoice_id IS NULL
        AND EXISTS (SELECT 1 FROM invoices WHERE invoices.booking_id = bookings.id)
    `);
  } catch {
    // bookings table may not exist on fresh databases
  }
}
