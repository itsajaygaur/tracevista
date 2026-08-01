import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test("landing experience is accessible and communicates local processing", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: /understand every millisecond/i })).toBeVisible();
  await expect(page.getByText("Processed locally — nothing uploaded")).toBeVisible();
  await expect(page.getByRole("button", { name: "Choose file" })).toBeVisible();

  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations).toEqual([]);
});

test("sample trace supports the full analysis workflow without uploading data", async ({ page }) => {
  await page.goto("/");
  await page.waitForLoadState("networkidle");

  const postRequests: string[] = [];
  page.on("request", (request) => {
    if (request.method() !== "GET") postRequests.push(`${request.method()} ${request.url()}`);
  });

  await page.getByRole("button", { name: /load sample trace/i }).click();
  await expect(page.getByRole("heading", { name: "Trace analysis" })).toBeVisible();
  await expect(page.getByText("21", { exact: true }).first()).toBeVisible();
  await expect(page.getByText("Synthetic demo data")).toBeVisible();
  expect(postRequests).toEqual([]);

  await page.getByRole("tab", { name: "Service map" }).click();
  await expect(page.getByTestId("service-map")).toBeVisible();
  await page.getByRole("tab", { name: "Critical chain" }).click();
  await expect(page.getByText("Parent-linked path", { exact: false })).toBeVisible();
  await page.getByRole("tab", { name: "Waterfall" }).click();
  await page.getByTestId("waterfall").getByRole("button").first().click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await expect(page.getByRole("heading", { name: "POST /checkout" })).toBeVisible();
  await page.keyboard.press("Escape");

  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations).toEqual([]);
});

test("invalid OTLP displays a recoverable error", async ({ page }) => {
  await page.goto("/");
  await page.getByLabel("Choose an OTLP trace file").setInputFiles({
    name: "invalid.json",
    mimeType: "application/json",
    buffer: Buffer.from('{"resourceSpans":[]}'),
  });
  await expect(page.getByText("No valid spans were found in the OTLP input.")).toBeVisible();
  await expect(page.getByRole("button", { name: /load sample trace/i })).toBeEnabled();
});

test("trace filtering, keyboard tabs, reset, and summary export work", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: /load sample trace/i }).click();
  await expect(page.getByRole("heading", { name: "Trace analysis" })).toBeVisible();

  const search = page.getByLabel("Search traces");
  await search.fill("payment");
  await expect(page.getByText("3 of 3 traces")).toBeVisible();
  await search.fill("not-present");
  await expect(page.getByText("No traces match this filter.")).toBeVisible();
  await search.fill("");

  await page.getByRole("tab", { name: "Waterfall" }).focus();
  await page.keyboard.press("ArrowRight");
  await expect(page.getByRole("tab", { name: "Service map" })).toHaveAttribute("data-state", "active");

  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export summary" }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toContain("tracevista-synthetic-checkout-json-summary.json");

  await page.getByRole("button", { name: "New import" }).click();
  await expect(page.getByRole("button", { name: /load sample trace/i })).toBeVisible();
});
