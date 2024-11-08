import getPort from 'get-port';
import { spawn, exec } from 'child_process';

import psList from 'ps-list';
import fs from 'fs';
import crypto from 'crypto';

//Function that reads the file 'server_session' and returns the pid:identifier pair
const serverSessionFilePath = 'server_session';

async function readServerSession() {
    try {
        await fs.promises.access(serverSessionFilePath);
    } catch (error) {
        return null;
    }
    const data = await fs.promises.readFile(serverSessionFilePath, 'utf8');
    const lines = data.split('\n');
    return { pid: lines[0], identifier: lines[1], port: lines[2] };
}

//Finding processes with the same identifier that works for multiple platforms
async function findMatchingProcess(pid, identifier) {
    try {
        const processes = await psList();
        const processInfo = processes.find(p => p.pid === pid);

        if (processInfo) {
            const commandLine = processInfo.cmd;
            if (commandLine.includes(identifier)) {
                return processInfo;
            }
        } else {
            console.log(`No process found with PID: ${pid}`);
        }
    } catch (error) {
        console.error(`Could not retrieve system processes: ${error.message}`);
    }

    return null;
}
async function killProcessesByArgument(id) {
    const powershellCommand = `
        Get-WmiObject Win32_Process | Where-Object { $_.CommandLine -like "*${id}*" } | 
        ForEach-Object { try { Stop-Process -Id $_.ProcessId -Force -ErrorAction Stop } catch { } }`;

    return new Promise((resolve, reject) => {
        exec(`powershell -Command "${powershellCommand}"`, (error, stdout, stderr) => {
            if (error) {
                console.error(`Error executing PowerShell command: ${stderr}`);
                reject(error);
                return;
            }
            resolve(stdout);
        });
    });
}

var serverProcess = null;
export async function cleanupChildrenProcesses(identifier) {
    if (serverProcess && serverProcess.exitCode == null) {
        serverProcess.kill('SIGINT');
    }
    //Kill all remaining processes with the same identifier
    try {
        const isWindows = process.platform === 'win32';

        if (isWindows) {
            await killProcessesByArgument(identifier);
        } else {
            const processes = await psList();

            processes.forEach(p => {
                if (p.cmd.includes(identifier)) {
                    console.log(`Killing process with PID: ${p.pid}`);
                    process.kill(p.pid, 'SIGINT');
                }
            });
        }
    } catch (error) {
        console.error(`Couldn't kill processes with identifier ${identifier}: ${error.message}`);
    }
    await new Promise(r => setTimeout(r, 500));
}
process.on('exit', async () => {
    serverProcess.kill('SIGINT');
});
export async function runServer() {
    var hasStarted = false;
    const sessionId = crypto.randomBytes(16).toString('hex');

    const raySoProjectPath = process.env.RaySoPath;

    if (!fs.existsSync(raySoProjectPath)) {
        console.error("Please set the 'RaySoPath' environment variable before proceeding.\nSetup:\n>Clone the ray.so repository via the command 'git clone https://github.com/raycast/ray-so.git'\n>Use 'npm install' to install the dependencies and 'npm run build' to build the Next.JS app.\n>Lastly, set the environment variable to the directory.");
        process.exit();
    }

    const serverSession = await readServerSession();
    if (serverSession != null) {
        const processInfo = await findMatchingProcess(serverSession.pid, serverSession.identifier);
        if (processInfo) {
            console.log(`Server is already running with PID: ${pid}`);
            return serverSession.port;
        }
    }

    const port = await getPort();
    serverProcess = spawn(`npm start -- "-p ${port} --uid=${sessionId}"`, { cwd: raySoProjectPath, stdio: 'pipe', shell: true });

    serverProcess.stdout.on('data', (data) => {
        const output = data.toString();
        if (output.includes('✓ Ready in ')) {
            console.log('ray.so server: Ready');
            hasStarted = true;
        }
    });

    //Writing the server process PID and identifier to server_session file
    try {
        await fs.promises.writeFile('server_session', `${serverProcess.pid}\n${sessionId}\n${port}`);
    } catch (error) {
        console.error(`Failed to write server session file: ${error.message}`);
    }

    serverProcess.stderr.on('data', (data) => {
        console.error(`ray.so server: Error while starting server: ${data}`);
    });

    serverProcess.on('close', (code) => {
        console.log(`ray.so server: process exited with code ${code}`);
        process.exit(0);
    });

    //Waiting for the server to start
    while (!hasStarted) {
        await new Promise(r => setTimeout(r, 1000));
    }

    return { port: port, sessionId: sessionId };
}


