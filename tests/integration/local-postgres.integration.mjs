import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { cpSync, mkdtempSync, rmSync } from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { spawnSync } from 'node:child_process'
import test from 'node:test'
import { Client } from 'pg'
import { drizzle } from 'drizzle-orm/node-postgres'
import { migrate } from 'drizzle-orm/node-postgres/migrator'
import { eq } from 'drizzle-orm'
import { guestbookMessages } from '../../src/db/schema.ts'
import { closeDatabase } from '../../src/db/client.ts'
import {
  listGuestbookMessages,
  insertGuestbookMessage,
  findGuestbookSubmission,
} from '../../src/features/guestbook/store.ts'
import { decodeGuestbookCursor } from '../../src/features/guestbook/contract.ts'

const baseUrl = new URL(process.env.DATABASE_URL)
assert.ok(
  ['127.0.0.1', 'localhost', '[::1]'].includes(baseUrl.hostname),
  'Postgres integration tests only run against loopback hosts.',
)
const migrationsFolder = path.resolve('drizzle')
const migrationConfig = {
  migrationsFolder,
  migrationsSchema: 'drizzle',
  migrationsTable: '__portfolio_migrations',
}

async function isolatedDatabase(run) {
  const admin = new Client({ connectionString: baseUrl.toString() })
  const name = `guestbook_test_${randomUUID().replaceAll('-', '')}`
  const url = new URL(baseUrl)
  url.pathname = `/${name}`
  let client
  const previousUrl = process.env.DATABASE_URL
  try {
    await admin.connect()
    await admin.query(`create database "${name}"`)
    client = new Client({ connectionString: url.toString() })
    await client.connect()
    process.env.DATABASE_URL = url.toString()
    await run(client, drizzle({ client }), url.toString())
  } finally {
    await closeDatabase()
    process.env.DATABASE_URL = previousUrl
    await client?.end()
    await admin.query(`drop database if exists "${name}"`)
    await admin.end()
  }
}

test('fresh migrations, indexed pagination, retries and owner moderation work in Postgres', async () => {
  await isolatedDatabase(async (client, db, databaseUrl) => {
    await migrate(db, migrationConfig)
    await migrate(db, migrationConfig)
    assert.equal(
      (await client.query("select to_regclass('public.messages') as legacy")).rows[0].legacy,
      null,
    )
    const sameTime = new Date('2020-01-01T10:00:00.123Z')
    const fixture = Array.from({ length: 13 }, (_, i) => ({
      id: `00000000-0000-4000-8000-${String(i + 1).padStart(12, '0')}`,
      name: 'あな',
      message: `Message ${i}`,
      createdAt: sameTime,
      submissionKey: `fixture-${i}`,
    }))
    await db.insert(guestbookMessages).values(fixture)
    await db
      .update(guestbookMessages)
      .set({ hiddenAt: new Date() })
      .where(eq(guestbookMessages.id, fixture[7].id))
    const first = await listGuestbookMessages(null)
    assert.equal(first.messages.length, 5)
    assert.ok(first.nextCursor)
    assert.deepEqual(Object.keys(first.messages[0]).sort(), ['createdAt', 'id', 'message', 'name'])
    assert.equal(first.messages[0].createdAt, sameTime.toISOString())
    // A newer insertion and deletion of the cursor row must not shift older pages.
    const input = {
      name: 'New Visitor',
      message: 'A newer note',
      submissionId: randomUUID(),
    }
    const inserted = await insertGuestbookMessage(input, 'new-key')
    const repeated = await insertGuestbookMessage(input, 'new-key')
    assert.equal(inserted.id, repeated.id)
    assert.equal((await findGuestbookSubmission('new-key')).id, inserted.id)
    await db.delete(guestbookMessages).where(eq(guestbookMessages.id, first.messages.at(-1).id))
    const seen = first.messages.map((row) => row.id)
    let cursor = first.nextCursor
    while (cursor) {
      const page = await listGuestbookMessages(decodeGuestbookCursor(cursor))
      assert.ok(page.messages.length <= 5)
      seen.push(...page.messages.map((row) => row.id))
      cursor = page.nextCursor
    }
    assert.equal(seen.length, 12)
    assert.equal(new Set(seen).size, 12)
    assert.ok(!seen.includes(fixture[7].id))
    assert.ok(!seen.includes(inserted.id))
    const indexes = await client.query(
      "select indexdef from pg_indexes where tablename = 'guestbook_messages'",
    )
    assert.ok(
      indexes.rows.some(({ indexdef }) =>
        /created_at DESC.*id DESC.*WHERE.*hidden_at IS NULL/.test(indexdef),
      ),
    )
    for (const action of ['hide', 'restore']) {
      const result = spawnSync(
        process.execPath,
        ['scripts/moderate-guestbook.mjs', action, inserted.id],
        {
          env: { ...process.env, DATABASE_URL: databaseUrl },
          encoding: 'utf8',
        },
      )
      assert.equal(result.status, 0, result.stderr)
      const row = await findGuestbookSubmission('new-key')
      if (action === 'hide') {
        assert.ok(row.hiddenAt)
        const retry = await insertGuestbookMessage(input, 'new-key')
        assert.equal(retry.id, inserted.id)
        assert.ok(retry.hiddenAt, 'Retries cannot resurrect a hidden entry')
      }
      if (action === 'restore') assert.equal(row.hiddenAt, null)
    }
    const verification = spawnSync(process.execPath, ['scripts/check-database.mjs', 'schema'], {
      env: { ...process.env, DATABASE_URL: databaseUrl },
      encoding: 'utf8',
    })
    assert.equal(verification.status, 0, verification.stderr)
  })
})

test('development seed is idempotent and fills three pages', async () => {
  await isolatedDatabase(async (_client, db, databaseUrl) => {
    await migrate(db, migrationConfig)
    const runSeed = () =>
      spawnSync(process.execPath, ['scripts/seed-guestbook.mjs'], {
        env: { ...process.env, DATABASE_URL: databaseUrl },
        encoding: 'utf8',
      })
    const first = runSeed()
    const repeated = runSeed()
    assert.equal(first.status, 0, first.stderr)
    assert.match(first.stdout, /13 inserted, 0 already present/)
    assert.equal(repeated.status, 0, repeated.stderr)
    assert.match(repeated.stdout, /0 inserted, 13 already present/)

    let cursor = null
    const seen = []
    do {
      const page = await listGuestbookMessages(cursor ? decodeGuestbookCursor(cursor) : null)
      seen.push(...page.messages)
      cursor = page.nextCursor
    } while (cursor)
    assert.equal(seen.length, 13)
    assert.deepEqual(
      seen.map(({ name }) => name),
      [
        'Marta',
        'Noah',
        'ゆき',
        'Amara',
        'Caio',
        'Sofia',
        '민준',
        'Léa',
        'Omar',
        'Ana',
        'Theo',
        'Bia',
        'Ren',
      ],
    )
  })
})

test('upgrade preserves the old migration ledger and unrelated tables', async () => {
  const temporary = mkdtempSync(path.join(os.tmpdir(), 'guestbook-legacy-migrations-'))
  try {
    cpSync(
      path.join(migrationsFolder, '20260822152514_init'),
      path.join(temporary, '20260822152514_init'),
      { recursive: true },
    )
    await isolatedDatabase(async (client, db) => {
      await migrate(db, { ...migrationConfig, migrationsFolder: temporary })
      await client.query(
        "insert into public.messages(name,message,latitude,longitude) values('Legacy','Old note','0','0')",
      )
      await client.query('create table public.unrelated_test (value text)')
      await client.query("insert into public.unrelated_test values ('keep')")
      // Also verify Drizzle's upgrade from its older ledger layout.
      await client.query(
        'alter table drizzle.__portfolio_migrations drop column name, drop column applied_at',
      )
      await migrate(db, migrationConfig)
      assert.equal(
        (await client.query("select to_regclass('public.messages') as legacy")).rows[0].legacy,
        null,
      )
      assert.equal(
        (await client.query('select count(*)::int as count from public.guestbook_messages')).rows[0]
          .count,
        0,
      )
      assert.equal(
        (await client.query('select value from public.unrelated_test')).rows[0].value,
        'keep',
      )
      assert.equal(
        (await client.query('select count(*)::int as count from drizzle.__portfolio_migrations'))
          .rows[0].count,
        2,
      )
    })
  } finally {
    rmSync(temporary, { recursive: true, force: true })
  }
})
