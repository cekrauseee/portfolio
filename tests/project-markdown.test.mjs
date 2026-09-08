import assert from "node:assert/strict";
import test from "node:test";
import { resolveProjectImageSource } from "../src/components/project-markdown.tsx";

const assetBaseUrl =
  "https://raw.githubusercontent.com/fixture-owner/project/main/.portfolio/";

test("project images resolve only relative paths against their repository", () => {
  assert.equal(
    resolveProjectImageSource("images/dashboard.webp", assetBaseUrl),
    "https://raw.githubusercontent.com/fixture-owner/project/main/.portfolio/images/dashboard.webp",
  );
  assert.equal(
    resolveProjectImageSource("../public/dashboard.webp", assetBaseUrl),
    "https://raw.githubusercontent.com/fixture-owner/project/main/public/dashboard.webp",
  );
  assert.equal(
    resolveProjectImageSource(
      "https://example.com/dashboard.webp",
      assetBaseUrl,
    ),
    "",
  );
  assert.equal(
    resolveProjectImageSource("//example.com/dashboard.webp", assetBaseUrl),
    "",
  );
});
