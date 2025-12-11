# Facebook Login with Puppeteer

This script uses Puppeteer to automate Facebook login and extract cookies.

## Installation

```bash
npm install
```

## Usage

### Login and Get Cookies

```bash
npm start
```

or

```bash
node facebook-login.js
```

### Set Cookies from File

```bash
npm run set-cookies
```

or

```bash
node facebook-set-cookies.js
```

## Features

- Launches a browser instance
- Navigates to Facebook
- Allows manual login (or automated with credentials)
- Extracts and saves all cookies to `facebook-cookies.json`
- Displays cookies in the console

## Configuration

By default, the script waits for you to **manually login**. If you want to automate the login process, uncomment the automated login section in `facebook-login.js` and add your credentials.

⚠️ **Warning**: Storing credentials in code is not recommended for security reasons.

## Output

- `facebook-cookies.json` - Contains all cookies from the Facebook session

## Notes

- The browser runs in non-headless mode by default so you can see the login process
- You have 5 minutes to complete the manual login
- The script includes anti-detection measures
