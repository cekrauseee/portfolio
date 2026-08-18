import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { syncGithubProjects } from "./sync-github-projects.mjs";

const fixedDate = new Date("2026-08-18T12:00:00.000Z");

function project(slug, overrides = {}) {
  return {
    slug,
    name: `cekrauseee/${slug}`,
    description: `${slug} description`,
    repositoryUrl: `https://github.com/cekrauseee/${slug}`,
    metaDescription: `${slug} metadata`,
    summary: `${slug} summary`,
    highlights: ["Next.js"],
    sections: [{ title: "Product", paragraphs: [`${slug} details`] }],
    ...overrides,
  };
}

function encodedContent(value) {
  return Buffer.from(JSON.stringify(value)).toString("base64");
}

function response(status, body, headers = {}) {
  return {
    status,
    ok: status >= 200 && status < 300,
    headers: new Headers(headers),
    async json() {
      return body;
    },
  };
}

async function temporaryOutput() {
  const directory = await mkdtemp(
    path.join(os.tmpdir(), "portfolio-projects-"),
  );
  return {
    directory,
    outputPath: path.join(directory, "github-projects.json"),
  };
}

function repository(name, defaultBranch = "main", overrides = {}) {
  return {
    name,
    default_branch: defaultBranch,
    private: false,
    full_name: `test-owner/${name}`,
    ...overrides,
  };
}

test("paginates all public repositories, skips 404 files, and sorts projects", async () => {
  const { directory, outputPath } = await temporaryOutput();
  const first = [repository("zeta"), repository("missing")];
  const second = [repository("alpha")];
  const calls = [];
  const fetchImpl = async (url) => {
    calls.push(url);
    const parsed = new URL(url);
    if (
      parsed.pathname === "/users/test-owner/repos" &&
      parsed.searchParams.get("page") === "1"
    ) {
      return response(200, first);
    }
    if (
      parsed.pathname === "/users/test-owner/repos" &&
      parsed.searchParams.get("page") === "2"
    ) {
      return response(200, second);
    }
    if (parsed.pathname.endsWith("/zeta/contents/.portfolio/project.json")) {
      return response(200, {
        encoding: "base64",
        content: encodedContent(project("zeta")),
      });
    }
    if (parsed.pathname.endsWith("/missing/contents/.portfolio/project.json")) {
      return response(404, { message: "Not Found" });
    }
    if (parsed.pathname.endsWith("/alpha/contents/.portfolio/project.json")) {
      return response(200, {
        encoding: "base64",
        content: encodedContent(project("alpha")),
      });
    }
    throw new Error(`Unexpected URL: ${url}`);
  };

  try {
    const snapshot = await syncGithubProjects({
      fetchImpl,
      owner: "test-owner",
      apiBase: "https://github.test",
      outputPath,
      perPage: 2,
      now: fixedDate,
    });

    assert.deepEqual(
      snapshot.projects.map(({ slug }) => slug),
      ["alpha", "zeta"],
    );
    assert.equal(snapshot.generatedAt, fixedDate.toISOString());
    assert.equal(calls.filter((url) => url.includes("/repos/")).length, 3);
    assert.deepEqual(JSON.parse(await readFile(outputPath, "utf8")), snapshot);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test("rejects pagination links outside the configured API origin", async () => {
  const { directory, outputPath } = await temporaryOutput();
  const calls = [];
  const fetchImpl = async (url) => {
    calls.push(url);
    const parsed = new URL(url);
    if (parsed.origin !== "https://github.test") {
      throw new Error(`Unexpected cross-origin request: ${url}`);
    }
    return response(200, [repository("one")], {
      link: '<https://evil.test/users/test-owner/repos?page=2>; rel="next"',
    });
  };

  try {
    await assert.rejects(
      syncGithubProjects({
        fetchImpl,
        owner: "test-owner",
        apiBase: "https://github.test",
        outputPath,
      }),
      /outside configured API origin/,
    );
    assert.equal(calls.length, 1);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test("rejects malformed convention content", async () => {
  const { directory, outputPath } = await temporaryOutput();
  const fetchImpl = async (url) => {
    const parsed = new URL(url);
    if (parsed.pathname === "/users/test-owner/repos") {
      return response(200, [repository("broken")]);
    }
    return response(200, {
      encoding: "base64",
      content: encodedContent({ ...project("broken"), unexpected: true }),
    });
  };

  try {
    await assert.rejects(
      syncGithubProjects({
        fetchImpl,
        owner: "test-owner",
        apiBase: "https://github.test",
        outputPath,
      }),
      /exactly the Project fields/,
    );
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test("rejects malformed repository metadata and keeps private repositories out", async (t) => {
  await t.test("malformed metadata", async () => {
    const { directory, outputPath } = await temporaryOutput();
    const fetchImpl = async (url) => {
      const parsed = new URL(url);
      if (parsed.pathname === "/users/test-owner/repos") {
        return response(200, [
          {
            name: "missing-branch",
            private: false,
            full_name: "test-owner/missing-branch",
          },
        ]);
      }
      throw new Error(`Unexpected URL: ${url}`);
    };

    try {
      await assert.rejects(
        syncGithubProjects({
          fetchImpl,
          owner: "test-owner",
          apiBase: "https://github.test",
          outputPath,
        }),
        /name or default branch/,
      );
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });

  await t.test("private repositories are excluded", async () => {
    const { directory, outputPath } = await temporaryOutput();
    const fetchImpl = async (url) => {
      const parsed = new URL(url);
      if (parsed.pathname === "/users/test-owner/repos") {
        return response(200, [
          repository("private", "main", { private: true, id: 1 }),
        ]);
      }
      throw new Error(
        `Private repositories must not fetch convention files: ${url}`,
      );
    };

    try {
      const snapshot = await syncGithubProjects({
        fetchImpl,
        owner: "test-owner",
        apiBase: "https://github.test",
        outputPath,
      });
      assert.deepEqual(snapshot.projects, []);
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });
});

test("deduplicates repository overlap across pages by immutable identity", async () => {
  const { directory, outputPath } = await temporaryOutput();
  const fetches = [];
  const fetchImpl = async (url) => {
    const parsed = new URL(url);
    if (parsed.pathname === "/users/test-owner/repos") {
      const page = parsed.searchParams.get("page");
      if (page === "1") {
        return response(200, [
          repository("one", "main", { id: 1 }),
          repository("two", "main", { id: 2 }),
        ]);
      }
      if (page === "2") {
        return response(200, [
          repository("one", "main", { id: 1 }),
          repository("three", "main", { id: 3 }),
        ]);
      }
      return response(200, []);
    }
    fetches.push(parsed.pathname);
    const name = parsed.pathname.split("/")[3];
    return response(200, {
      encoding: "base64",
      content: encodedContent(project(name)),
    });
  };

  try {
    const snapshot = await syncGithubProjects({
      fetchImpl,
      owner: "test-owner",
      apiBase: "https://github.test",
      outputPath,
      perPage: 2,
    });
    assert.deepEqual(
      snapshot.projects.map(({ slug }) => slug),
      ["one", "three", "two"],
    );
    assert.equal(
      fetches.filter((pathname) => pathname.includes("/one/contents/")).length,
      1,
    );
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test("allows an empty snapshot after all convention files are removed", async () => {
  const { directory, outputPath } = await temporaryOutput();
  try {
    const snapshot = await syncGithubProjects({
      fetchImpl: async (url) => {
        const parsed = new URL(url);
        if (parsed.pathname === "/users/test-owner/repos") {
          return response(200, []);
        }
        throw new Error(`Unexpected URL: ${url}`);
      },
      owner: "test-owner",
      apiBase: "https://github.test",
      outputPath,
    });
    assert.deepEqual(snapshot.projects, []);
    assert.deepEqual(
      JSON.parse(await readFile(outputPath, "utf8")).projects,
      [],
    );
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test("times out an upstream request without retrying", async () => {
  const { directory, outputPath } = await temporaryOutput();
  try {
    await assert.rejects(
      syncGithubProjects({
        fetchImpl: async (_url, { signal }) =>
          new Promise((resolve, reject) => {
            signal.addEventListener(
              "abort",
              () => reject(new Error("aborted")),
              { once: true },
            );
          }),
        owner: "test-owner",
        apiBase: "https://github.test",
        outputPath,
        timeoutMs: 5,
      }),
      /timed out after 5ms/,
    );
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test("rejects unsafe and duplicate slugs", async (t) => {
  await t.test("unsafe slug", async () => {
    const { directory, outputPath } = await temporaryOutput();
    const fetchImpl = async (url) => {
      const parsed = new URL(url);
      if (parsed.pathname === "/users/test-owner/repos") {
        return response(200, [repository("unsafe")]);
      }
      return response(200, {
        encoding: "base64",
        content: encodedContent(project("../unsafe")),
      });
    };
    try {
      await assert.rejects(
        syncGithubProjects({
          fetchImpl,
          owner: "test-owner",
          apiBase: "https://github.test",
          outputPath,
        }),
        /invalid Project fields/,
      );
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });

  await t.test("duplicate slug", async () => {
    const { directory, outputPath } = await temporaryOutput();
    const fetchImpl = async (url) => {
      const parsed = new URL(url);
      if (parsed.pathname === "/users/test-owner/repos") {
        return response(
          200,
          parsed.searchParams.get("page") === "1"
            ? [repository("one"), repository("two")]
            : [],
        );
      }
      return response(200, {
        encoding: "base64",
        content: encodedContent(project("same")),
      });
    };
    try {
      await assert.rejects(
        syncGithubProjects({
          fetchImpl,
          owner: "test-owner",
          apiBase: "https://github.test",
          outputPath,
          perPage: 2,
        }),
        /Duplicate project slug/,
      );
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });
});

test("preserves the previous snapshot when reconciliation fails", async () => {
  const { directory, outputPath } = await temporaryOutput();
  const original = await syncGithubProjects({
    fetchImpl: async (url) => {
      const parsed = new URL(url);
      if (parsed.pathname === "/users/test-owner/repos") {
        return response(200, [repository("stable")]);
      }
      return response(200, {
        encoding: "base64",
        content: encodedContent(project("stable")),
      });
    },
    owner: "test-owner",
    apiBase: "https://github.test",
    outputPath,
    now: fixedDate,
  });
  const previousContents = await readFile(outputPath, "utf8");

  try {
    await assert.rejects(
      syncGithubProjects({
        fetchImpl: async (url) => {
          const parsed = new URL(url);
          if (parsed.pathname === "/users/test-owner/repos") {
            return response(200, [repository("stable")]);
          }
          return response(503, { message: "Service unavailable" });
        },
        owner: "test-owner",
        apiBase: "https://github.test",
        outputPath,
      }),
      /503/,
    );
    assert.equal(await readFile(outputPath, "utf8"), previousContents);
    assert.deepEqual(JSON.parse(previousContents), original);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test("replaces the snapshot completely so deleted files disappear", async () => {
  const { directory, outputPath } = await temporaryOutput();
  let includeRemoved = true;
  const fetchImpl = async (url) => {
    const parsed = new URL(url);
    if (parsed.pathname === "/users/test-owner/repos") {
      return response(
        200,
        includeRemoved
          ? [repository("keep"), repository("remove")]
          : [repository("keep")],
      );
    }
    const name = parsed.pathname.split("/")[3];
    return response(200, {
      encoding: "base64",
      content: encodedContent(project(name)),
    });
  };

  try {
    await syncGithubProjects({
      fetchImpl,
      owner: "test-owner",
      apiBase: "https://github.test",
      outputPath,
      now: fixedDate,
    });
    includeRemoved = false;
    const snapshot = await syncGithubProjects({
      fetchImpl,
      owner: "test-owner",
      apiBase: "https://github.test",
      outputPath,
      now: fixedDate,
    });
    assert.deepEqual(
      snapshot.projects.map(({ slug }) => slug),
      ["keep"],
    );
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
