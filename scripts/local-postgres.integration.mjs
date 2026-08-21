import assert from "node:assert/strict";
import test from "node:test";
import { Pool } from "pg";

const { closeDatabase, createMessage, fetchMessages } =
  await import("../src/features/visitor-globe/db/client.ts");

const databaseUrl = process.env.DATABASE_URL;
assert.ok(
  databaseUrl,
  "DATABASE_URL is required for the Postgres integration test.",
);

const pool = new Pool({ connectionString: databaseUrl });

test("visitor messages round-trip through Postgres", async () => {
  const marker = crypto.randomUUID();
  const input = {
    name: `Postgres integration ${marker}`,
    message: "Persisted by the real visitor-globe database client.",
    latitude: -30.0346,
    longitude: -51.2177,
    country: "Brazil",
    city: "Porto Alegre",
  };
  let id;

  try {
    id = await createMessage(input);

    const persisted = await pool.query(
      `SELECT id, name, message, latitude, longitude, country, city
       FROM messages
       WHERE id = $1`,
      [id],
    );
    assert.deepEqual(persisted.rows, [
      {
        id,
        name: input.name,
        message: input.message,
        latitude: String(input.latitude),
        longitude: String(input.longitude),
        country: input.country,
        city: input.city,
      },
    ]);

    const messages = await fetchMessages();
    assert.deepEqual(
      messages.find((message) => message.id === id),
      { id, ...input },
    );
  } finally {
    if (id) {
      await pool.query("DELETE FROM messages WHERE id = $1", [id]);
    } else {
      await pool.query("DELETE FROM messages WHERE name = $1", [input.name]);
    }
    await closeDatabase();
    await pool.end();
  }
});
