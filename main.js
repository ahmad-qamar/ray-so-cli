import puppeteer from 'puppeteer';

const RAY_SO_URL = "https://ray.so/";

const testing = true;
console.log("Starting the browser...");
const browser = await puppeteer.launch({headless: !testing});
console.log("Browser has been initialized");
const page = await browser.newPage();
await page.goto(RAY_SO_URL);

await new Promise(r => setTimeout(r, 5000));


