#!/usr/bin/env node
// Injects the Chatwoot widget + bubble-label hint into every .html file in dist/.
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
<style>
  #chatwoot-hint {
    position: fixed;
    bottom: 34px;
    right: 92px;
    background: #201868;
    color: #ffffff;
    padding: 8px 14px;
    border-radius: 999px;
    font-family: Poppins, system-ui, -apple-system, sans-serif;
    font-size: 13px;
    font-weight: 500;
    box-shadow: 0 4px 12px rgba(32, 24, 104, 0.25);
    z-index: 999998;
    opacity: 0;
    transform: translateX(8px);
    transition: opacity 0.4s ease-out, transform 0.4s ease-out;
    pointer-events: none;
    white-space: nowrap;
  }
  #chatwoot-hint.show {
    opacity: 1;
    transform: translateX(0);
  }
  #chatwoot-hint::after {
    content: "";
    position: absolute;
    right: -6px;
    top: 50%;
    transform: translateY(-50%);
    border: 6px solid transparent;
    border-left-color: #201868;
    border-right: 0;
  }
</style>
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

  // Bubble label hint — shows once per session
  (function () {
    var SESSION_KEY = "chatwoot_hint_shown";
    if (sessionStorage.getItem(SESSION_KEY)) return;

    function showHint() {
      var hint = document.createElement("div");
      hint.id = "chatwoot-hint";
      hint.textContent = "Ask Stephen";
      document.body.appendChild(hint);
      // Wait a beat for DOM insertion, then transition in
      setTimeout(function () { hint.classList.add("show"); }, 50);
      // Fade out after 8 seconds
      setTimeout(function () {
        hint.classList.remove("show");
        setTimeout(function () { hint.remove(); }, 400);
      }, 8000);
      sessionStorage.setItem(SESSION_KEY, "1");
    }

    // Wait for the widget bubble to actually render before positioning the hint
    var attempts = 0;
    var poll = setInterval(function () {
      attempts++;
      if (document.querySelector("#cw-bubble-holder .woot-widget-bubble")) {
        clearInterval(poll);
        setTimeout(showHint, 800); // small pause after launcher appears
      } else if (attempts > 40) {
        clearInterval(poll); // give up after 20 seconds
      }
    }, 500);
  })();
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
console.log(`[chatwoot-inject] Injected widget + hint into ${count} file(s). Skipped ${skipped} already-injected.`);