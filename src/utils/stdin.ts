import * as readline from 'node:readline/promises';

class Manager {
    rl?: readline.Interface
}

Manager.prototype.rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

async function getSTDIN(prompt: string) {
    return await Manager.prototype.rl.question(prompt)
}

getSTDIN.closed = false

getSTDIN.close = function close() {
    Manager.prototype.rl.close()
    getSTDIN.closed = true
    Manager.prototype.rl = null
}

getSTDIN.open = function open() {
    Manager.prototype.rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });
}

export default getSTDIN
