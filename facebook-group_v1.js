const puppeteer = require("puppeteer");
const fs = require("fs");

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
    ],
  });

  const page = await browser.newPage();

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

    // Click on the menu icon (three dots) and then "Report group"
    console.log("\nLooking for menu icon...");
    await page.waitForTimeout(2000);

    // Try to find and click the menu button using the CSS selector from the page
    const menuClicked = await page.evaluate(() => {
      // Try multiple selectors to find the menu button
      const selectors = [
        'div[aria-label="More"]',
        'div[role="button"][aria-label="More"]',
        ".x1n2onr6.xh8yej3",
      ];

      for (const selector of selectors) {
        const menuButton = document.querySelector(selector);
        if (menuButton) {
          menuButton.click();
          return true;
        }
      }

      // Fallback: look for any element with aria-label containing "More"
      const allElements = document.querySelectorAll("[aria-label]");
      for (const el of allElements) {
        if (el.getAttribute("aria-label")?.includes("More")) {
          el.click();
          return true;
        }
      }

      return false;
    });

    if (menuClicked) {
      console.log("✓ Clicked menu button");
      await page.waitForTimeout(1000);

      // Click on "Report group" option
      const reportClicked = await page.evaluate(() => {
        // Find span containing "Report group" text
        const spans = Array.from(document.querySelectorAll("span"));
        const reportSpan = spans.find((span) => {
          const text = span.textContent.trim();
          return (
            text === "Report group" ||
            text.toLowerCase().includes("report group")
          );
        });

        if (reportSpan) {
          // Click the span itself or find clickable parent
          reportSpan.click();

          // Also try clicking parent divs
          let parent = reportSpan.parentElement;
          while (parent && parent !== document.body) {
            if (
              parent.getAttribute("role") === "menuitem" ||
              parent.getAttribute("role") === "button" ||
              parent.onclick ||
              parent.classList.contains("x1i10hfl")
            ) {
              parent.click();
              break;
            }
            parent = parent.parentElement;
          }
          return true;
        }
        return false;
      });

      if (reportClicked) {
        console.log('✓ Clicked "Report group" option');

        // Wait for the report dialog to appear
        console.log("Waiting for report dialog...");
        await page.waitForTimeout(3000);

        // Debug: Log what options are available
        const availableOptions = await page.evaluate(() => {
          const buttons = Array.from(
            document.querySelectorAll('div[role="button"]')
          );
          return buttons
            .map((btn) => btn.textContent.trim())
            .filter((text) => text.length > 0 && text.length < 100);
        });
        console.log("Available report options:", availableOptions);

        // Click on "False information" option
        console.log('Looking for "False information" option...');

        // First, try to use Puppeteer's click with XPath
        let falseInfoClicked = false;
        try {
          // Wait for element containing "False information" text
          await page.waitForFunction(
            () => {
              const spans = Array.from(document.querySelectorAll("span"));
              return spans.some(
                (span) => span.textContent.trim() === "False information"
              );
            },
            { timeout: 5000 }
          );

          // Try clicking using XPath
          const elements = await page.$x(
            "//span[contains(text(), 'False information')]"
          );
          if (elements.length > 0) {
            // Find the clickable parent container
            const clickableParent = await page.evaluateHandle((el) => {
              let parent = el;
              while (parent && parent !== document.body) {
                parent = parent.parentElement;
                if (
                  parent &&
                  (parent.getAttribute("role") === "button" ||
                    parent.classList.contains("x1i10hfl") ||
                    parent.classList.contains("x1ja2u2z"))
                ) {
                  return parent;
                }
              }
              return el.parentElement;
            }, elements[0]);

            await clickableParent.click();
            falseInfoClicked = true;
            console.log('✓ Clicked "False information" option using XPath');
          }
        } catch (error) {
          console.log("XPath method failed, trying JavaScript click...");
        }

        // Fallback to JavaScript evaluation click
        if (!falseInfoClicked) {
          falseInfoClicked = await page.evaluate(() => {
            // Method 1: Find all clickable divs with role="button"
            const buttons = Array.from(
              document.querySelectorAll('div[role="button"]')
            );

            for (const button of buttons) {
              const text = button.textContent.trim();
              if (text === "False information") {
                console.log("Found False information button (exact match)");
                button.click();
                return true;
              }
            }

            // Method 2: Find spans with "False information" text and click parent
            const allSpans = Array.from(document.querySelectorAll("span"));
            for (const span of allSpans) {
              if (span.textContent.trim() === "False information") {
                console.log(
                  "Found False information span, clicking parent container"
                );
                // Find the clickable parent - go up several levels
                let parent = span.parentElement;
                let levelsUp = 0;
                while (parent && parent !== document.body && levelsUp < 10) {
                  if (
                    parent.getAttribute("role") === "button" ||
                    parent.classList.contains("x1i10hfl") ||
                    parent.classList.contains("x1ja2u2z")
                  ) {
                    parent.click();
                    return true;
                  }
                  parent = parent.parentElement;
                  levelsUp++;
                }
                // If no specific clickable parent found, click the closest parent
                if (
                  span.parentElement?.parentElement?.parentElement
                    ?.parentElement
                ) {
                  span.parentElement.parentElement.parentElement.parentElement.click();
                  return true;
                }
              }
            }

            // Method 3: Search for any div containing the exact text
            const allDivs = Array.from(document.querySelectorAll("div"));
            for (const div of allDivs) {
              if (
                div.textContent.includes("False information") &&
                div.textContent.length < 50
              ) {
                console.log("Found False information div (fallback)");
                div.click();
                return true;
              }
            }

            return false;
          });
        }

        if (falseInfoClicked) {
          console.log('✓ Clicked "False information" option');
          await page.waitForTimeout(2000);

          // Check if confirmation dialog appears with "You selected" and click Done
          console.log("Looking for confirmation dialog...");
          const dialogExists = await page.evaluate(() => {
            // Check for dialog with "You selected" title
            const dialog = document.querySelector(
              'div[role="dialog"][aria-labelledby="dialog_title"]'
            );
            if (dialog) {
              const title = dialog.querySelector("#dialog_title");
              if (title && title.textContent.includes("You selected")) {
                return true;
              }
            }
            return false;
          });

          if (dialogExists) {
            console.log("✓ Confirmation dialog found");
            await page.waitForTimeout(1000);

            // Click the Done button
            let doneClicked = false;

            // Try using Puppeteer's click with XPath first
            try {
              await page.waitForFunction(
                () => {
                  const buttons = Array.from(
                    document.querySelectorAll(
                      '[role="button"][aria-label="Done"]'
                    )
                  );
                  return buttons.length > 0;
                },
                { timeout: 5000 }
              );

              const doneElements = await page.$x(
                "//div[@role='button' and @aria-label='Done']"
              );
              if (doneElements.length > 0) {
                await doneElements[0].click();
                doneClicked = true;
                console.log('✓ Clicked "Done" button using XPath');
              }
            } catch (error) {
              console.log(
                "XPath method for Done button failed, trying JavaScript click..."
              );
            }

            // Fallback to JavaScript evaluation click
            if (!doneClicked) {
              doneClicked = await page.evaluate(() => {
                // Look for Done button with specific attributes
                const doneButtons = Array.from(
                  document.querySelectorAll(
                    'div.x1i10hfl[role="button"][aria-label="Done"]'
                  )
                );

                for (const button of doneButtons) {
                  const span = button.querySelector("span.x1lliihq");
                  if (span && span.textContent.trim() === "Done") {
                    button.click();
                    return true;
                  }
                }

                // Fallback: search for any button with "Done" aria-label
                const allButtons = Array.from(
                  document.querySelectorAll(
                    '[role="button"][aria-label="Done"]'
                  )
                );
                if (allButtons.length > 0) {
                  allButtons[0].click();
                  return true;
                }

                return false;
              });
            }

            if (doneClicked) {
              console.log(
                '✓ Clicked "Done" button - Report submitted successfully!'
              );
              await page.waitForTimeout(2000);
            } else {
              console.log('⚠ Could not find "Done" button');
            }
          } else {
            console.log("⚠ Confirmation dialog not found");
          }
        } else {
          console.log('⚠ Could not find "False information" option');
        }
      } else {
        console.log('⚠ Could not find "Report group" option');
      }
    } else {
      console.log("⚠ Could not find menu button");
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
