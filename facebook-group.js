const puppeteer = require('puppeteer');
const fs = require('fs');

async function navigateToFacebookGroup() {
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

        // Navigate to the Facebook group
        const groupUrl = 'https://www.facebook.com/groups/537148429074564';
        console.log(`Navigating to group: ${groupUrl}`);
        await page.goto(groupUrl, {
            waitUntil: 'networkidle2'
        });

        // Wait a bit to see if login was successful
        await page.waitForTimeout(3000);

        // Check if logged in
        const isLoggedIn = await page.evaluate(() => {
            return !document.querySelector('#email') && !document.querySelector('input[name="email"]');
        });

        if (isLoggedIn) {
            console.log('✓ Successfully navigated to Facebook group!');
            console.log('You can now interact with the group.');
        } else {
            console.log('⚠ Warning: May not be logged in. Cookies might be expired.');
        }

        // Click on the menu icon (three dots) and then "Report group"
        console.log('\nLooking for menu icon...');
        await page.waitForTimeout(2000);

        // Try to find and click the menu button using the CSS selector from the page
        const menuClicked = await page.evaluate(() => {
            // Try multiple selectors to find the menu button
            const selectors = [
                'div[aria-label="More"]',
                'div[role="button"][aria-label="More"]',
                '.x1n2onr6.xh8yej3'
            ];
            
            for (const selector of selectors) {
                const menuButton = document.querySelector(selector);
                if (menuButton) {
                    menuButton.click();
                    return true;
                }
            }
            
            // Fallback: look for any element with aria-label containing "More"
            const allElements = document.querySelectorAll('[aria-label]');
            for (const el of allElements) {
                if (el.getAttribute('aria-label')?.includes('More')) {
                    el.click();
                    return true;
                }
            }
            
            return false;
        });

        if (menuClicked) {
            console.log('✓ Clicked menu button');
            await page.waitForTimeout(1000);

            // Click on "Report group" option
            const reportClicked = await page.evaluate(() => {
                // Find span containing "Report group" text
                const spans = Array.from(document.querySelectorAll('span'));
                const reportSpan = spans.find(span => {
                    const text = span.textContent.trim();
                    return text === 'Report group' || text.toLowerCase().includes('report group');
                });
                
                if (reportSpan) {
                    // Click the span itself or find clickable parent
                    reportSpan.click();
                    
                    // Also try clicking parent divs
                    let parent = reportSpan.parentElement;
                    while (parent && parent !== document.body) {
                        if (parent.getAttribute('role') === 'menuitem' || 
                            parent.getAttribute('role') === 'button' ||
                            parent.onclick || 
                            parent.classList.contains('x1i10hfl')) {
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
                console.log('Waiting for report dialog...');
                await page.waitForTimeout(3000);
                
                // Click on "False information" option
                console.log('Looking for "False information" option...');
                const falseInfoClicked = await page.evaluate(() => {
                    // Find button with class x1i10hfl that contains "False information"
                    const buttons = Array.from(document.querySelectorAll('div.x1i10hfl[role="button"]'));
                    
                    for (const button of buttons) {
                        const span = button.querySelector('span');
                        if (span && span.textContent.trim() === 'False information') {
                            console.log('Found False information button with x1i10hfl class');
                            button.click();
                            return true;
                        }
                    }
                    
                    // Fallback: search all role="button" elements
                    const allButtons = Array.from(document.querySelectorAll('[role="button"]'));
                    for (const btn of allButtons) {
                        if (btn.textContent.includes('False information')) {
                            console.log('Found False information button (fallback)');
                            btn.click();
                            return true;
                        }
                    }
                    
                    return false;
                });
                
                if (falseInfoClicked) {
                    console.log('✓ Clicked "False information" option');
                    await page.waitForTimeout(2000);
                } else {
                    console.log('⚠ Could not find "False information" option');
                }
            } else {
                console.log('⚠ Could not find "Report group" option');
            }
        } else {
            console.log('⚠ Could not find menu button');
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
navigateToFacebookGroup();
