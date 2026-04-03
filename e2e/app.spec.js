// @ts-check

import { test, expect } from "@playwright/test";

test("full app flow", async ({ page }) => {
    await page.goto("http://localhost:5500");

    const fileInput = page.locator('input[type="file"]');

    await fileInput.setInputFiles("e2e/fixtures/test.zip");

    await expect(page.locator("select")).toBeVisible();

    await page.selectOption("select", { index: 7 });

    await expect(page.locator("table")).toBeVisible();

    const rows = page.locator("tbody tr");
    await expect(rows).toHaveCount(2);

    // await page.getByRole("button", { name: "Vérifier" }).click();
    await expect(page.getByRole("cell", { name: "⏳ Statut inconnu" })).toBeVisible();
});

test("mock verification API", async ({ page }) => {
    await page.route("**/api/verify", async (route) => {
        const request = route.request();
        const body = await request.postDataJSON();

        console.log(body);

        await route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify({
                results: body.map(() => true),
            }),
        });
    });

    await page.goto("http://localhost:5500");
});

test("should show error if signature fails", async ({ page }) => {
    await page.route("**/api/verify", async (route) => {
        const request = route.request();
        const body = await request.postDataJSON();

        console.log(body);

        await route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify({
                results: body.map(() => false),
            }),
        });
    });

    await page.goto("http://localhost:5500");

    await expect(page.locator("tbody")).toContainText("❌");
});
