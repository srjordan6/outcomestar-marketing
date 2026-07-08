#!/usr/bin/env node
// Injects the Chatwoot widget into every .html file in dist/ after Astro build.
// Reads token + baseUrl from env vars (PUBLIC_* — safe for browser).
// Idempotent: skips files that already contain the widget marker.

import { readFileSync, writeFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const TOKEN = process.env.PUBLIC_CHATWOOT_WEBSITE_TOKEN;
const BASE_URL = process.env.PUBLIC_CHATWOOT_BASE_URL;

if (!TOKEN || !BASE_URL) {
  console.warn("[chatwoot-inject] PUBLIC_CHATWOOT_WEBSITE_TOKEN or PUBLIC_CHATWOOT_BASE_URL not set. Skipping injection.");
  process.exit(0);
}

const MARKER = "<!-- chatwoot-widget -->";
const SNIPPET = `${MARKER}
<script>
  window.chatwootSettings = {
    position: "right",
    type: "standard",
    launcherTitle: "Ask Stephen",
    darkMode: "light"
  };
  (function (d, t) {
    var g = d.createElement(t), s = d.getElementsByTagName(t)[0];
    g.src = "${BASE_URL}/packs/js/sdk.js";
    g.async = true;
    g.defer = true;
    s.parentNode.insertBefore(g, s);
    g.onload = function () {
      window.chatwootSDK.run({
        websiteToken: "${TOKEN}",
        baseUrl: "${BASE_URL}"
      });
    };
  })(document, "script");
</script>
`;

function walk(dir) {
  const results = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      results.push(...walk(full));
    } else if (entry.endsWith(".html")) {
      results.push(full);
    }
  }
  return results;
}

const distDir = "dist";
let count = 0;
let skipped = 0;
for (const file of walk(distDir)) {
  const html = readFileSync(file, "utf8");
  if (html.includes(MARKER)) {
    skipped++;
    continue;
  }
  if (!html.includes("</body>")) {
    console.warn(`[chatwoot-inject] Skipping ${file} — no </body> tag.`);
    continue;
  }
  const updated = html.replace("</body>", `${SNIPPET}</body>`);
  writeFileSync(file, updated, "utf8");
  count++;
}
console.log(`[chatwoot-inject] Injected widget into ${count} file(s). Skipped ${skipped} already-injected.`);
