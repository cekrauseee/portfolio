import { randomUUID } from 'node:crypto'
import { mkdir, readFile, rename, unlink, writeFile } from 'node:fs/promises'
import path from 'node:path'

export function githubRequestError(response, body, message) {
  const error = new Error(message)
  if (
    response.status === 429 ||
    (response.status === 403 &&
      (response.headers?.get?.('x-ratelimit-remaining') === '0' ||
        response.headers?.get?.('retry-after') ||
        /rate limit/i.test(body?.message ?? '')))
  ) {
    error.code = 'GITHUB_RATE_LIMIT'
  }
  return error
}

export async function writeSnapshotAtomic(outputPath, snapshot) {
  const temporaryPath = `${outputPath}.tmp-${process.pid}-${randomUUID()}`
  try {
    await mkdir(path.dirname(outputPath), { recursive: true })
    await writeFile(temporaryPath, `${JSON.stringify(snapshot, null, 2)}\n`, 'utf8')
    await rename(temporaryPath, outputPath)
  } catch (error) {
    await unlink(temporaryPath).catch(() => {})
    throw error
  }
}

export async function recoverGithubRateLimit(error, { outputPath, emptySnapshot, validate }) {
  if (error.code !== 'GITHUB_RATE_LIMIT') throw error
  let snapshot
  try {
    snapshot = JSON.parse(await readFile(outputPath, 'utf8'))
    validate(snapshot)
  } catch (cacheError) {
    if (cacheError.code !== 'ENOENT') throw cacheError
    snapshot = emptySnapshot
    await writeSnapshotAtomic(outputPath, snapshot)
  }
  console.warn(
    `GitHub rate limit reached; ${snapshot === emptySnapshot ? 'created an empty snapshot' : 'using the existing snapshot'} at ${outputPath}. ${error.message}`,
  )
  return snapshot
}
