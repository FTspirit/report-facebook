/**
 * Facebook Group Reporter - Automated Script
 *
 * This script automates the process of reporting a Facebook group for false information.
 *
 * Flow:
 * 1. Load cookies from facebook-cookies.json
 * 2. Navigate to the target Facebook group
 * 3. Click "More" menu
 * 4. Click "Report group"
 * 5. Select "False information"
 * 6. Confirm by clicking "Done"
 *
 * Helper Functions:
 * - clickByText: Click elements by their text content (using XPath for reliability)
 * - clickByAriaLabel: Click elements by aria-label attribute
 * - wait: Pause execution with logging
 * - checkDialogExists: Check if a dialog with specific title exists
 * - debugListButtons: List all available buttons on the page
 */

const puppeteer = require("puppeteer");
const fs = require("fs");

// Helper function: Click element by text content
async function clickByText(page, text, options = {}) {
  const {
    role = null,
    timeout = 5000,
    description = text,
    clickParent = false, // Option to click parent container instead of text element
  } = options;

  console.log(`🔍 Looking for: "${description}"...`);

  try {
    // Wait for element to exist
    await page.waitForFunction(
      (searchText, searchRole) => {
        const elements = searchRole
          ? Array.from(document.querySelectorAll(`[role="${searchRole}"]`))
          : Array.from(document.querySelectorAll("*"));
        return elements.some((el) => el.textContent.trim() === searchText);
      },
      { timeout },
      text,
      role
    );

    // Find the element containing the text
    const xpath = `//*[contains(text(), '${text}')]`;
    const elements = await page.$x(xpath);

    for (const element of elements) {
      const elementText = await page.evaluate(
        (el) => el.textContent.trim(),
        element
      );
      if (elementText === text) {
        if (clickParent) {
          // Find and click the parent container (looks for the one with SVG arrow icon)
          const parentContainer = await page.evaluateHandle((el) => {
            let parent = el;
            // Go up until we find a clickable container with both text and SVG
            for (let i = 0; i < 6; i++) {
              parent = parent.parentElement;
              if (!parent) break;

              // Check if this parent has both text content and an SVG (arrow icon)
              const hasSvg = parent.querySelector("svg") !== null;
              const hasText = parent.textContent.includes(el.textContent);

              if (hasSvg && hasText) {
                return parent;
              }
            }
            // Fallback: return grandparent
            return el.parentElement?.parentElement || el;
          }, element);

          await parentContainer.click();
          console.log(`✅ Clicked parent container of: "${description}"`);
        } else {
          await element.click();
          console.log(`✅ Clicked: "${description}"`);
        }
        return true;
      }
    }

    console.log(`⚠️  Found but couldn't click: "${description}"`);
    return false;
  } catch (error) {
    console.log(`❌ Not found: "${description}" - ${error.message}`);
    return false;
  }
}

// Helper function: Click element by aria-label
async function clickByAriaLabel(page, label, options = {}) {
  const { timeout = 5000 } = options;

  console.log(`🔍 Looking for aria-label: "${label}"...`);

  try {
    await page.waitForFunction(
      (searchLabel) => {
        return document.querySelector(`[aria-label="${searchLabel}"]`) !== null;
      },
      { timeout },
      label
    );

    const xpath = `//*[@aria-label='${label}']`;
    const elements = await page.$x(xpath);

    if (elements.length > 0) {
      await elements[0].click();
      console.log(`✅ Clicked aria-label: "${label}"`);
      return true;
    }

    console.log(`⚠️  Found but couldn't click aria-label: "${label}"`);
    return false;
  } catch (error) {
    console.log(`❌ Not found aria-label: "${label}" - ${error.message}`);
    return false;
  }
}

// Helper function: Wait and log
async function wait(page, ms, message = null) {
  if (message) {
    console.log(`⏳ ${message} (${ms}ms)`);
  }
  await page.waitForTimeout(ms);
}

// Helper function: Check if dialog exists
async function checkDialogExists(page, dialogTitle) {
  console.log(`🔍 Checking for dialog: "${dialogTitle}"...`);

  const exists = await page.evaluate((title) => {
    const dialog = document.querySelector('div[role="dialog"]');
    if (dialog) {
      const titleElement = dialog.querySelector(
        `#dialog_title, [id*="dialog"]`
      );
      if (titleElement && titleElement.textContent.includes(title)) {
        return true;
      }
    }
    return false;
  }, dialogTitle);

  if (exists) {
    console.log(`✅ Dialog found: "${dialogTitle}"`);
  } else {
    console.log(`❌ Dialog not found: "${dialogTitle}"`);
  }

  return exists;
}

// Helper function: Debug - list available buttons
async function debugListButtons(page) {
  const buttons = await page.evaluate(() => {
    const buttonElements = Array.from(
      document.querySelectorAll('div[role="button"]')
    );
    return buttonElements
      .map((btn) => btn.textContent.trim())
      .filter((text) => text.length > 0 && text.length < 100);
  });

  console.log("📋 Available buttons:", buttons);
  return buttons;
}

async function navigateToFacebookGroup() {
  // Check if cookies file exists
  if (!fs.existsSync("facebook-cookies.json")) {
    console.error("Error: facebook-cookies.json not found!");
    console.log("Please run the login script first to generate cookies.");
    return;
  }

  // Load cookies from file
  const cookies = JSON.parse(fs.readFileSync("facebook-cookies.json", "utf8"));
  console.log(`Loaded ${cookies.length} cookies from file`);

  const browser = await puppeteer.launch({
    headless: false,
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-blink-features=AutomationControlled",
      "--start-maximized", // Start browser maximized
    ],
  });

  const page = await browser.newPage();

  // Set viewport to full screen size
  await page.setViewport({
    width: 1920,
    height: 1080,
  });

  // Set user agent
  await page.setUserAgent(
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
  );

  try {
    // First, navigate to the domain to establish context
    console.log("Establishing domain context...");
    await page.goto("https://www.facebook.com/", {
      waitUntil: "domcontentloaded",
    });

    // Set cookies
    console.log("Setting cookies...");
    for (const cookie of cookies) {
      try {
        await page.setCookie(cookie);
      } catch (error) {
        console.log(`Failed to set cookie ${cookie.name}: ${error.message}`);
      }
    }
    console.log("Cookies set successfully!");

    // Navigate to the Facebook group
    const groupUrl = "https://www.facebook.com/groups/537148429074564";
    console.log(`Navigating to group: ${groupUrl}`);
    await page.goto(groupUrl, {
      waitUntil: "networkidle2",
    });

    // Wait a bit to see if login was successful
    await page.waitForTimeout(3000);

    // Check if logged in
    const isLoggedIn = await page.evaluate(() => {
      return (
        !document.querySelector("#email") &&
        !document.querySelector('input[name="email"]')
      );
    });

    if (isLoggedIn) {
      console.log("✓ Successfully navigated to Facebook group!");
      console.log("You can now interact with the group.");
    } else {
      console.log("⚠ Warning: May not be logged in. Cookies might be expired.");
    }

    // Step 1: Click on the menu icon (More button)
    console.log("\n" + "=".repeat(50));
    console.log("STEP 1: Opening menu");
    console.log("=".repeat(50));
    await wait(page, 2000, "Waiting for page to stabilize");

    const menuClicked = await clickByAriaLabel(page, "More");

    if (menuClicked) {
      await wait(page, 2000, "Waiting for menu to fully render");

      // Step 2: Click on "Report group" option
      console.log("\n" + "=".repeat(50));
      console.log("STEP 2: Clicking 'Report group'");
      console.log("=".repeat(50));

      // Debug: Look for the actual popup menu that appears after clicking More
      const menuInfo = await page.evaluate(() => {
        // Look for various menu/popup patterns Facebook uses
        const selectors = [
          'div[role="menu"]',
          'div[data-visualcompletion="ignore-dynamic"]',
          'ul[role="menu"]',
          "div.x1n2onr6.xh8yej3", // Common FB menu class pattern
        ];

        const allMenuTexts = [];

        // Try each selector
        selectors.forEach((selector) => {
          const menus = document.querySelectorAll(selector);
          menus.forEach((menu) => {
            // Get all spans within the menu
            const spans = menu.querySelectorAll("span");
            spans.forEach((span) => {
              const text = span.textContent.trim();
              if (text && text.length > 2 && text.length < 100) {
                allMenuTexts.push(text);
              }
            });
          });
        });

        // Remove duplicates and return
        return {
          allTexts: [...new Set(allMenuTexts)].slice(0, 30),
        };
      });

      console.log("📋 All menu texts found:", menuInfo.allTexts);

      const reportClicked = await clickByText(page, "Report group", {
        description: "Report group option",
        clickParent: true, // Click the parent container instead of text
      });

      if (reportClicked) {
        await wait(page, 3000, "Waiting for report dialog");

        // Step 3: Debug and click "False information"
        console.log("\n" + "=".repeat(50));
        console.log("STEP 3: Selecting 'False information'");
        console.log("=".repeat(50));

        await debugListButtons(page);

        const falseInfoClicked = await clickByText(page, "False information", {
          description: "False information option",
          clickParent: true, // Click the parent container with arrow icon
        });

        if (falseInfoClicked) {
          await wait(page, 2000, "Waiting for confirmation dialog");

          // Step 4: Check for confirmation dialog and click Done
          console.log("\n" + "=".repeat(50));
          console.log("STEP 4: Confirming report");
          console.log("=".repeat(50));

          const dialogExists = await checkDialogExists(page, "You selected");

          if (dialogExists) {
            // Get detailed dialog information for confirmation
            const dialogInfo = await page.evaluate(() => {
              const dialog = document.querySelector(
                'div[role="dialog"][aria-labelledby="dialog_title"]'
              );
              if (!dialog) return null;

              const title = dialog.querySelector("#dialog_title");
              const feedback = Array.from(dialog.querySelectorAll("div")).find(
                (div) => div.textContent.includes("Facebook uses your feedback")
              );
              const doneButton = dialog.querySelector('[aria-label="Done"]');

              return {
                title: title?.textContent.trim() || "N/A",
                hasFeedbackText: !!feedback,
                hasDoneButton: !!doneButton,
                feedbackText: feedback?.textContent.trim() || "N/A",
              };
            });

            console.log("📋 Dialog Information:");
            console.log(`   Title: "${dialogInfo.title}"`);
            console.log(
              `   Feedback text present: ${
                dialogInfo.hasFeedbackText ? "✅" : "❌"
              }`
            );
            console.log(
              `   Done button present: ${
                dialogInfo.hasDoneButton ? "✅" : "❌"
              }`
            );

            if (dialogInfo.hasDoneButton) {
              await wait(
                page,
                1000,
                "All confirmations passed, clicking Done button"
              );

              const doneClicked = await clickByAriaLabel(page, "Done", {
                timeout: 5000,
              });

              if (doneClicked) {
                console.log("\n" + "=".repeat(50));
                console.log("🎉 SUCCESS: Report submitted successfully!");
                console.log("=".repeat(50));
                await wait(page, 2000, "Finalizing");
              } else {
                console.log("❌ Could not click Done button");
              }
            } else {
              console.log("❌ Done button not found in dialog");
            }
          } else {
            console.log("❌ Confirmation dialog not found");
          }
        } else {
          console.log("❌ Could not click False information option");
        }
      } else {
        console.log("❌ Could not click Report group option");
      }
    } else {
      console.log("❌ Could not click More menu");
    }

    // Keep browser open for interaction
    console.log("\nBrowser will remain open. Close it manually when done.");
    // Wait indefinitely (or until manually closed)
    await new Promise(() => {});
  } catch (error) {
    console.error("Error:", error.message);
  }
}

// Run the script
navigateToFacebookGroup();
