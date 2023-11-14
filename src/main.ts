import Parser from "./frontend/parser";
import { createGlobalEnv } from "./runtime/environment";
import { evaluate } from "./runtime/interpreter";

import * as readline from 'readline/promises';
import { readFileSync } from "fs";
import { transcribe } from "./utils/transcriber";

fetch("https://8.8.8.8") // node message

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

const file = process.argv[2] && !process.argv[2].startsWith("-") && process.argv[2];

if(file) {
    run(file);
} else if (process.argv[2]) {
    repl(process.argv[2]);
} else {
    repl();
}

async function run(filename: string) {
    const parser = new Parser();
    const env = createGlobalEnv();

    let input = readFileSync(filename, 'utf-8');

    filename.endsWith('.bsx') ? input = await transcribe(input, true) : input = await transcribe(input, false)

    const program = parser.produceAST(input);
    const result = evaluate(program, env);

    return result;
}

async function repl(arg?: string) {
    const parser = new Parser();
    const env = createGlobalEnv();

    console.log("Repl v1.0 (Bussin)");

    while (true) {
        let input = await rl.question("> ");

        // check for no user input or exit keyword.
        if (!input || input.includes("exit")) {
            process.exit(1);
        }

        input = await transcribe(input, arg !== "--bsx" ? false : true)
        
        const program = parser.produceAST(input);

        const result = evaluate(program, env);
        console.log(result);
    }
}
