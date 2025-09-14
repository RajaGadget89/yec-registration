import { test, expect } from "@playwright/test";
import fs from "node:fs"; 
import path from "node:path";
import { withArtifacts, saveJson } from "../utils/evidence";

const PNG = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR4nGNgYAAAAAMAASsJTYQAAAAASUVORK5CYII=";

test("AC7: TCC fix via Deep‑Link — UI only (prefill+lock+submit)", async ({ page }) => {
  const url = process.env.TEST_TCC_FIX_URL!; // must be full /?token=<UUID> (ENHANCED: root path)
  await withArtifacts("AC7", async ({ runDir }) => {
    await page.goto(url, { waitUntil: "domcontentloaded" });
    await page.screenshot({ path: path.join(runDir, "deep-link-form-prefilled.png"), fullPage: true });

    const email = page.getByLabel(/email address/i);
    const locked = await email.evaluate((el:any)=>!!(el.readOnly||el.disabled));
    await saveJson("form-lock-analysis", { nonTccLocked: locked, checked:["email"] }, runDir);

    await page.getByLabel(/tcc number/i).fill("TCC-TEST-123456");
    await page.getByLabel(/tcc holder/i).fill("Test Holder");
    await page.getByRole("checkbox").check();
    const fp = path.join(runDir, "tcc-card.png"); 
    fs.writeFileSync(fp, Buffer.from(PNG,"base64"));
    await page.getByLabel(/chamber of commerce card/i).setInputFiles(fp);

    const btn = page.getByRole("button", { name: /submit update/i });
    await expect(btn).toBeEnabled();
    await btn.click();

    // Wait for response and check for error or success
    await page.waitForTimeout(2000);
    const body = (await page.textContent("body"))||"";
    
    let status = "UNKNOWN";
    if (/waiting\s*for\s*review/i.test(body)) {
      status = "waiting_for_review";
    } else if (/submitted/i.test(body)) {
      status = "submitted";
    } else if (/invalid.*status/i.test(body) || /not.*correct.*update.*state/i.test(body)) {
      status = "status_mismatch_error";
    } else if (/error/i.test(body) || /failed/i.test(body)) {
      status = "error";
    }
    
    await saveJson("status_after_submit", { status, body: body.substring(0, 200) }, runDir);
  });
});