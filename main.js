import puppeteer from 'puppeteer';
import fs from 'fs';
import { exec, spawn, fork } from 'child_process';

const runLocally = true;

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
}
const RAY_SO_URL = runLocally ? `http://localhost:${port}` : "https://ray.so/";

const testing = true;
console.log("Starting the browser...");
const browser = await puppeteer.launch({ headless: !testing });
console.log("Browser has been initialized");
const page = await browser.newPage();
await page.goto(RAY_SO_URL);

await new Promise(r => setTimeout(r, 5000));


