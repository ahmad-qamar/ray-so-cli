#!/usr/bin/env node

import puppeteer from 'puppeteer';
import fs from 'fs';
import yargs from 'yargs';
import { runServer, cleanupChildrenProcesses } from './runner.js';

const args = yargs(process.argv.slice(2))
    .option('input',
        {
            alias: 'i',
            describe: 'Provide the location of the input file that contains the code',
            type: 'string',
            demandOption: true
        })
    .option('output',
        {
            alias: 'o',
            describe: 'Provide the path and filename to save the image',
            type: 'string',
            demandOption: true
        })
    .option('padding',
        {
            alias: 'pd',
            describe: 'Provide the padding for the image',
            type: 'number',
            default: 16
        }
    )
    .option('background',
        {
            alias: 'bg',
            describe: 'Enable or disable the background color',
            type: 'boolean',
            default: true
        })
    .option('language',
        {
            alias: 'lang',
            describe: 'Provide the language of the code',
            type: 'string',
            default: 'auto'
        })
    .option('theme',
        {
            alias: 't',
            describe: 'Provide the theme of the code',
            type: 'string',
            default: 'tailwind'
        })
    .option('title',
        {
            alias: 'title',
            describe: 'Provide the title of the code',
            type: 'string',
            default: 'Untitled'
        }
    )
    .option('local', {
        alias: 'l',
        describe: 'Run the server locally',
        type: 'boolean',
        default: false
    })
    .option('testing', {
        alias: 'test',
        describe: 'Enable testing mode',
        type: 'boolean',
        default: false
    })
    .help().argv;

if (!fs.existsSync(args.input)) {
    console.error("The input file does not exist.");
    process.exit();
}

const outputDir = args.output.substring(0, args.output.lastIndexOf('/'));
if (outputDir.length > 0 && !fs.existsSync(outputDir)) {
    console.error("The output directory does not exist,");
    process.exit();
}

var serverData = null;
var port = 0;

//Reading the code from the input file
const code = fs.readFileSync(args.input, 'utf8');
//Encode the code in `base64`
const codeBase64 = Buffer.from(code).toString('base64');

//Building the parameters
const parameters = `code=${encodeURIComponent(codeBase64)}&padding=${args.padding}&background=${args.background}&language=${args.language}&theme=${args.theme}&title=${args.title}`;


if (args.local) {
    serverData = await runServer();
    port = serverData.port;
}

const RAY_SO_URL = args.local ? `http://localhost:${port}` : "https://ray.so/";
//Building the URL with parameter code encoded
const url = `${RAY_SO_URL}#${parameters}`;


const BUTTON1_LOCATOR = '[id^=radix-\\:]';
const BUTTON2_LOCATOR = 'div ::-p-text( Copy Image)';

console.log("Starting the browser...");

const browser = await puppeteer.launch({ headless: !args.testing, args: ['--no-sandbox']});
const context = browser.defaultBrowserContext();
await context.overridePermissions(RAY_SO_URL, ['clipboard-read']);
console.log("Browser has been initialized");
const page = await browser.newPage();
await page.goto(url, { waitUntil: 'load' });
await page.evaluate(() => {
    navigator.clipboard.write = async function (data) {
        var img = await data[0].getType("image/png");

        let reader = new FileReader();
        reader.readAsDataURL(img);
        reader.onloadend = function () {
            window.imgData = reader.result;
            console.log('Base64 String - ', window.imgData);
        };
    };
});
for (let tries = 0; tries < 3; tries++) {
    var elements = await page.$$(BUTTON1_LOCATOR);
    var element = elements[1];
    if (element != null) {
        await element.click();
        break;
    }
    await new Promise(r => setTimeout(r, 2000));
}
await new Promise(r => setTimeout(r, 200));
element = await page.$(BUTTON2_LOCATOR);
await element.click();
await new Promise(r => setTimeout(r, 2250));

var img = await page.evaluate("window.imgData");
var buff = Buffer.from(img
    .replace(/^data:image\/(png|gif|jpeg);base64,/, ''), 'base64');
await fs.promises.writeFile(args.output, buff);
console.log("Image has been saved to the output file.");

await browser.close();

if(args.local) await cleanupChildrenProcesses(serverData.sessionId);
process.exit();





