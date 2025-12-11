const puppeteer = require('puppeteer');
const fs = require('fs');

async function setFacebookCookies() {
    // Check if cookies file exists
    if (!fs.existsSync('facebook-cookies.json')) {
        console.error('Error: facebook-cookies.json not found!');
        console.log('Please run the login script first to generate cookies.');
        return;
    }

    // Load cookies from file
    const cookies = JSON.parse(fs.readFileSync('facebook-cookies.json', 'utf8'));
    console.log(`Loaded ${cookies.length} cookies from file`);

    const browser = await puppeteer.launch({
        headless: false,
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-blink-features=AutomationControlled'
        ]
    });

    const page = await browser.newPage();

    // Set user agent
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

    try {
        // First, navigate to the domain to establish context
        console.log('Establishing domain context...');
        await page.goto('https://www.facebook.com/', {
            waitUntil: 'domcontentloaded'
        });

        // Set cookies
        console.log('Setting cookies...');
        for (const cookie of cookies) {
            try {
                await page.setCookie(cookie);
            } catch (error) {
                console.log(`Failed to set cookie ${cookie.name}: ${error.message}`);
            }
        }
        console.log('Cookies set successfully!');

        // Now navigate to Facebook with cookies applied
        console.log('Loading Facebook with cookies...');
        await page.goto('https://www.facebook.com/', {
            waitUntil: 'networkidle2'
        });

        // Wait a bit to see if login was successful
        await page.waitForTimeout(3000);

        // Check if logged in by looking for specific elements
        const isLoggedIn = await page.evaluate(() => {
            // Check if we're redirected to login page or see login form
            return !document.querySelector('#email') && !document.querySelector('input[name="email"]');
        });

        if (isLoggedIn) {
            console.log('✓ Successfully logged in with cookies!');
            console.log('You can now interact with Facebook as an authenticated user.');
        } else {
            console.log('⚠ Warning: May not be logged in. Cookies might be expired.');
        }

        // Keep browser open for interaction
        console.log('\nBrowser will remain open. Close it manually when done.');
        // Wait indefinitely (or until manually closed)
        await new Promise(() => {});

    } catch (error) {
        console.error('Error:', error.message);
    }
}

// Run the script
setFacebookCookies();
