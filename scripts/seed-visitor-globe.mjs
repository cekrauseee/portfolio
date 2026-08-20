#!/usr/bin/env node

import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { messages } from "../src/features/visitor-globe/db/schema.ts";

const databaseUrl =
  process.env.DATABASE_URL ??
  "postgres://portfolio:portfolio@127.0.0.1:5433/portfolio";

if (process.argv.includes("--help")) {
  console.log(`Seed the visitor globe with demo messages.

Usage:
  npm run db:seed

Connects to DATABASE_URL (or the local Docker Postgres default) and inserts
a curated set of visitor messages spread across the globe. Safe to re-run:
existing messages are not removed, but the seed set is idempotent by name
+ message to avoid duplicates.`);
  process.exit(0);
}

const seedMessages = [
  {
    name: "Sofia",
    message: "Incredible work! The globe idea is brilliant.",
    latitude: 40.4168,
    longitude: -3.7038,
    country: "Spain",
    city: "Madrid",
  },
  {
    name: "Liam",
    message: "Visiting from Canada. Love the minimal aesthetic.",
    latitude: 45.4215,
    longitude: -75.6992,
    country: "Canada",
    city: "Ottawa",
  },
  {
    name: "Yuki",
    message: "とても美しいポートフォリオですね。",
    latitude: 35.6762,
    longitude: 139.6503,
    country: "Japan",
    city: "Tokyo",
  },
  {
    name: "Amara",
    message: "This is such a creative way to show visitor messages.",
    latitude: -1.2921,
    longitude: 36.8219,
    country: "Kenya",
    city: "Nairobi",
  },
  {
    name: "Diego",
    message: "Saludos desde Argentina! Great portfolio.",
    latitude: -34.6118,
    longitude: -58.396,
    country: "Argentina",
    city: "Buenos Aires",
  },
  {
    name: "Freya",
    message: "Love the clean design. Very inspiring.",
    latitude: 55.6761,
    longitude: 12.5683,
    country: "Denmark",
    city: "Copenhagen",
  },
  {
    name: "Arjun",
    message: "Amazing attention to detail here.",
    latitude: 12.9716,
    longitude: 77.5946,
    country: "India",
    city: "Bangalore",
  },
  {
    name: "Mia",
    message: "The 3D globe is such a nice touch.",
    latitude: -33.8688,
    longitude: 151.2093,
    country: "Australia",
    city: "Sydney",
  },
  {
    name: "Lucas",
    message: "Visiting from Brazil. Parabéns pelo trabalho!",
    latitude: -23.5505,
    longitude: -46.6333,
    country: "Brazil",
    city: "São Paulo",
  },
  {
    name: "Nadia",
    message: "Gorgeous work. The globe is mesmerizing.",
    latitude: 30.0444,
    longitude: 31.2357,
    country: "Egypt",
    city: "Cairo",
  },
  {
    name: "Henrik",
    message: "Hej från Sverige! Really impressive portfolio.",
    latitude: 59.3293,
    longitude: 18.0686,
    country: "Sweden",
    city: "Stockholm",
  },
  {
    name: "Chloe",
    message: "This is delightful. Bookmarked!",
    latitude: 1.3521,
    longitude: 103.8198,
    country: "Singapore",
    city: "Singapore",
  },
  {
    name: "Mateo",
    message: "Fantastic way to connect with visitors.",
    latitude: 19.4326,
    longitude: -99.1332,
    country: "Mexico",
    city: "Mexico City",
  },
  {
    name: "Anika",
    message: "The design language is so consistent. Beautiful.",
    latitude: 25.2769,
    longitude: 55.2962,
    country: "United Arab Emirates",
    city: "Dubai",
  },
  {
    name: "Oliver",
    message: "Came for the projects, stayed for the globe.",
    latitude: 51.5074,
    longitude: -0.1278,
    country: "United Kingdom",
    city: "London",
  },
  {
    name: "Hana",
    message: "정말 멋진 포트폴리오네요!",
    latitude: 37.5665,
    longitude: 126.978,
    country: "South Korea",
    city: "Seoul",
  },
  {
    name: "Leo",
    message: "The wireframe globe fits the aesthetic perfectly.",
    latitude: 48.8566,
    longitude: 2.3522,
    country: "France",
    city: "Paris",
  },
  {
    name: "Zoe",
    message: "Stumbled here from GitHub. Love it.",
    latitude: 37.7749,
    longitude: -122.4194,
    country: "United States",
    city: "San Francisco",
  },
  {
    name: "Kofi",
    message: "Greetings from Ghana! Great work.",
    latitude: 5.6037,
    longitude: -0.187,
    country: "Ghana",
    city: "Accra",
  },
  {
    name: "Isla",
    message: "The moderation guardrail is a smart touch.",
    latitude: 53.3498,
    longitude: -6.2603,
    country: "Ireland",
    city: "Dublin",
  },
];

const pool = new Pool({ connectionString: databaseUrl });
const db = drizzle(pool, { schema: { messages } });

let inserted = 0;

for (const msg of seedMessages) {
  // Check idempotency by name + message to avoid duplicates on re-run.
  const dupCheck = await pool.query(
    "SELECT id FROM messages WHERE name = $1 AND message = $2 LIMIT 1",
    [msg.name, msg.message],
  );

  if (dupCheck.rows.length > 0) {
    continue;
  }

  await db.insert(messages).values({
    name: msg.name,
    message: msg.message,
    latitude: String(msg.latitude),
    longitude: String(msg.longitude),
    country: msg.country,
    city: msg.city,
  });
  inserted++;
}

await pool.end();

console.log(
  `\nSeed complete: ${inserted} message(s) inserted, ${seedMessages.length - inserted} already present.`,
);
console.log("Run npm run dev and open http://localhost:3000/guestbook.");
