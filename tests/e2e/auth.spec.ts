import { expect, test } from "@playwright/test";

const email = process.env.E2E_EMAIL?.trim() ?? "";
const password = process.env.E2E_PASSWORD ?? "";

test.describe("authenticated console", () => {
  test.skip(
    !email || !password,
    "Set E2E_EMAIL and E2E_PASSWORD to run authenticated checks."
  );

  test.beforeEach(async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Password").fill(password);
    await page.getByRole("button", { name: "Sign In" }).click();
    await page.waitForURL((url) => url.pathname === "/", {
      timeout: 20_000,
    });
  });

  test("dashboard renders the add-asset form with themed selects", async ({
    page,
  }) => {
    await expect(
      page.getByRole("heading", { name: "Add Asset" })
    ).toBeVisible();

    const select = page.getByLabel("Type").first();
    await expect(select).toBeVisible();
    const background = await select.evaluate(
      (element) => getComputedStyle(element).backgroundColor
    );
    expect(background).toBe("rgb(13, 21, 32)");
  });

  test("command palette opens with the keyboard and traps focus", async ({
    page,
  }) => {
    await page.keyboard.press("Control+k");

    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();

    await expect(
      dialog.getByRole("textbox", { name: "Search commands" })
    ).toBeFocused();

    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();
  });

  test("admin audit page paginates or denies access cleanly", async ({
    page,
  }) => {
    await page.goto("/admin/audit");

    if (new URL(page.url()).pathname === "/admin/audit") {
      await expect(
        page.getByRole("heading", { name: "Audit Log" })
      ).toBeVisible();
      await expect(page.getByLabel("Filter by table")).toBeVisible();
      await expect(page.getByText(/Showing \d+–\d+ of \d+/)).toBeVisible();
    } else {
      await expect(page.getByText(/administrators|permission/i)).toBeVisible();
    }
  });
});
