import puppeteer from 'puppeteer';
import fs from 'fs';
import { exec, spawn, fork } from 'child_process';
import { tmpdir } from 'os';
const runLocally = false;

var serverProcess = null;
const cleanup = () => {
    if (serverProcess != null) serverProcess.kill();
    process.exit();
};

process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);

const port = 18432;
if (runLocally) {
    const raySoProjectPath = process.env.RaySoPath;

    if (!fs.existsSync(raySoProjectPath)) {
        console.error("Please set the 'RaySoPath' environment variable before proceeding.");
        process.exit();
    }

    serverProcess = spawn(`npm run dev -- "-p ${port}"`, { cwd: raySoProjectPath, stdio: 'inherit', shell: true });
    await new Promise(r => setTimeout(r, 7000));
}
const RAY_SO_URL = runLocally ? `http://localhost:${port}` : "https://ray.so/";
const BUTTON1_LOCATOR = '#radix-\\:R2r7rqfiba\\:';
const BUTTON2_LOCATOR = 'div ::-p-text( Copy Image)';
const testing = true;

console.log("Starting the browser...");
const browser = await puppeteer.launch({ headless: !testing });
const context = browser.defaultBrowserContext();
await context.overridePermissions(RAY_SO_URL, ['clipboard-read']);
console.log("Browser has been initialized");
const page = await browser.newPage();
await page.goto(RAY_SO_URL);
await new Promise(r => setTimeout(r, 3000));
await page.evaluate(() => {
    navigator.clipboard.write = async function (data) {
        var img  = await data[0].getType("image/png");
        var imgStr = await img.text();

        window.imgData = imgStr;
    };
});

var element = await page.$(BUTTON1_LOCATOR);
await element.click();
element = await page.$(BUTTON2_LOCATOR);
await element.click();
await new Promise(r => setTimeout(r, 1500));

var img = await page.evaluate("window.imgData");

process.exit();


