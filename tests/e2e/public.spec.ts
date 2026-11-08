import { expect, test } from "@playwright/test";

const protectedPaths = [
  "/",
  "/topology",
  "/connections",
  "/maintenance",
  "/insights",
  "/admin/users",
  "/admin/audit",
];

test.describe("public shell", () => {
  test("login page uses the dark theme by default and exposes metadata", async ({
    page,
  }) => {
    await page.goto("/login");

    await expect(page.locator("html")).toHaveClass(/dark/);
    await expect(
      page.getByRole("heading", { name: "Welcome back" })
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: "Skip to content" })
    ).toBeAttached();

    await expect(page.locator('meta[property="og:title"]')).toHaveCount(1);
    await expect(page.locator('meta[name="twitter:card"]')).toHaveAttribute(
      "content",
      "summary_large_image"
    );
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
      "content",
      /noindex/
    );
    await expect(page.locator('link[rel="manifest"]')).toHaveAttribute(
      "href",
      "/manifest.webmanifest"
    );
  });

  test("skip link moves focus to the main content", async ({ page }) => {
    await page.goto("/login");

    const skipLink = page.getByRole("link", { name: "Skip to content" });
    await skipLink.focus();
    await expect(skipLink).toBeFocused();

    await skipLink.press("Enter");
    await expect(page.locator("#main-content")).toBeFocused();
  });

  test("protected routes redirect unauthenticated visitors", async ({
    page,
  }) => {
    for (const path of protectedPaths) {
      await page.goto(path);
      await expect(page).toHaveURL(/\/login\?next=/);
      await expect(
        page.getByRole("heading", { name: "Welcome back" })
      ).toBeVisible();
    }
  });

  test("forgot-password and signup pages render", async ({ page }) => {
    await page.goto("/forgot-password");
    await expect(
      page.getByRole("heading", { name: /reset|forgot/i })
    ).toBeVisible();

    await page.goto("/signup");
    await expect(
      page.getByRole("heading", { name: /create|sign up/i })
    ).toBeVisible();
  });
});

test.describe("operational endpoints", () => {
  test("health, robots, manifest, and icons respond", async ({ request }) => {
    const health = await request.get("/api/health");
    expect(health.ok()).toBeTruthy();
    await expect(health.json()).resolves.toMatchObject({ status: "ok" });

    const robots = await request.get("/robots.txt");
    expect(robots.ok()).toBeTruthy();
    expect(await robots.text()).toContain("Disallow: /");

    const manifest = await request.get("/manifest.webmanifest");
    expect(manifest.ok()).toBeTruthy();
    const manifestBody = await manifest.json();
    expect(manifestBody.name).toContain("Butajira");
    expect(
      manifestBody.icons.some(
        (icon: { src: string }) => icon.src === "/icon.png"
      )
    ).toBeTruthy();

    for (const asset of ["/favicon.ico", "/icon.png", "/apple-icon.png"]) {
      const response = await request.get(asset);
      expect(response.ok(), `${asset} should be served`).toBeTruthy();
    }
  });
});
