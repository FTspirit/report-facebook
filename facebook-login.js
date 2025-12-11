const puppeteer = require("puppeteer");
const fs = require("fs");

async function loginFacebook() {
  const browser = await puppeteer.launch({
    headless: false,
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-blink-features=AutomationControlled",
    ],
  });

  const page = await browser.newPage();

  await page.setUserAgent(
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
  );

  try {
    console.log("Navigating to Facebook...");
    await page.goto("https://www.facebook.com/", {
      waitUntil: "networkidle2",
    });

    // Enter email
    console.log("Please enter your credentials in the browser...");
    await page.waitForSelector("#email", { timeout: 60000 });

    // You can either hardcode credentials (not recommended) or enter manually
    // Option 1: Manual login - wait for user to login
    console.log("Waiting for you to login manually...");
    await page.waitForNavigation({
      waitUntil: "networkidle2",
      timeout: 300000, // 5 minutes to login
    });

    // Option 2: Automated login (uncomment and add your credentials)
    /*
        const email = 'your-email@example.com';
        const password = 'your-password';
        
        await page.type('#email', email, { delay: 100 });
        await page.type('#pass', password, { delay: 100 });
        await page.click('button[name="login"]');
        
        await page.waitForNavigation({ 
            waitUntil: 'networkidle2',
            timeout: 60000 
        });
        */

    // Wait and check if we need to complete 2FA or checkpoint
    console.log('\nChecking authentication status...');
    let currentUrl = page.url();
    
    // Keep checking if we're on 2FA, checkpoint, or verification page
    while (currentUrl.includes('two_step') || currentUrl.includes('checkpoint') || currentUrl.includes('verification')) {
      console.log('\n⚠️  Detected authentication step!');
      console.log('Please complete the verification (2FA code, checkpoint, etc.)');
      console.log('Waiting for you to complete it...\n');
      
      // Wait for navigation away from the auth page
      try {
        await page.waitForNavigation({
          waitUntil: 'networkidle2',
          timeout: 300000 // 5 minutes
        });
      } catch (e) {
        // Timeout or manual navigation, check URL again
      }
      
      await page.waitForTimeout(2000);
      currentUrl = page.url();
      console.log(`Current URL: ${currentUrl}`);
    }

    console.log('✓ Authentication complete!');

    // Get cookies
    console.log("Getting cookies...");
    const cookies = await page.cookies();

    // Save cookies to file
    fs.writeFileSync("facebook-cookies.json", JSON.stringify(cookies, null, 2));
    console.log("Cookies saved to facebook-cookies.json");

    // Display cookies in console
    console.log("\n=== Facebook Cookies ===");
    cookies.forEach((cookie) => {
      console.log(`${cookie.name}: ${cookie.value}`);
    });

    // Optional: Keep browser open for a while
    console.log("\nBrowser will remain open for 10 seconds...");
    await page.waitForTimeout(10000);
  } catch (error) {
    console.error("Error:", error.message);
  } finally {
    await browser.close();
    console.log("Browser closed.");
  }
}

// Run the script
loginFacebook();
