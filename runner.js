import getPort from 'get-port';
import { spawn } from 'child_process';

import path from 'path';
import psList from 'ps-list';
import fs from 'fs';

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

var serverProcess = null;
process.on('exit', () => {
    if (serverProcess && serverProcess.exitCode == null) {
        serverProcess.kill();
    }
});
export async function runServer() {
    var hasStarted = false;
    const identifier = Math.random().toString(36).substring(7);

    const raySoProjectPath = process.env.RaySoPath;

    if (!fs.existsSync(raySoProjectPath)) {
        console.error("Please set the 'RaySoPath' environment variable before proceeding.");
        process.exit();
    }

    const serverSession = readServerSession();
    if (serverSession != null) {
        const { pid, identifier } = serverSession;
        const processInfo = await findMatchingProcess(pid, identifier);
        if (processInfo) {
            console.log(`Server is already running with PID: ${pid}`);
            return serverSession.port;
        }
    }
 
    const port = await getPort();
    serverProcess = spawn(`npm start -- "-p ${port} --uid=${identifier}"`, { cwd: raySoProjectPath, stdio: 'pipe', shell: true });

    serverProcess.stdout.on('data', (data) => {
        const output = data.toString();
        if (output.includes('✓ Ready in ')) {
            console.log('ray.so server: Ready');
            hasStarted = true;
        }
    });

    //Writing the server process PID and identifier to server_session file
    try {
        await fs.promises.writeFile('server_session', `${serverProcess.pid}\n${identifier}`);
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

    return port;
}


