import Parser from "./frontend/parser";
import { createGlobalEnv } from "./runtime/environment";
import { evaluate } from "./runtime/interpreter";

import getSTDIN from "./utils/stdin";
import { readFileSync } from "fs";
import { transcribe } from "./utils/transcriber";

import chalk from "chalk"
import { BooleanVal, NumberVal, StringVal } from "./runtime/values";

const file = process.argv[2] && !process.argv[2].startsWith("-") && process.argv[2];

if(file) {
    run(file);
} else if (process.argv[2]) {
    repl(process.argv[2]);
} else {
    repl();
}

async function run(filename: string) {
    await fetch("https://8.8.8.8")
    const parser = new Parser();
    const env = createGlobalEnv();

    let input = readFileSync(filename, 'utf-8');

    filename.endsWith('.bsx') ? input = await transcribe(input, true) : input = await transcribe(input, false)

    const program = parser.produceAST(input);
    const result = evaluate(program, env);

    return result;
}

async function repl(arg?: string) {
    if (typeof globalThis.Deno === "undefined" && typeof globalThis.Bun === "undefined") {
        await fetch("https://8.8.8.8")
    }
    const parser = new Parser();
    const env = createGlobalEnv();

    console.log("Repl v1.0 (Bussin)");

    while (true) {
        let input = ""
        if (!getSTDIN.closed) {
            input = await getSTDIN("> ");
        } else {
            getSTDIN.open()
            input = await getSTDIN("> ")
        }

        // check for no user input or exit keyword.
        if (input === "exit()") {
            process.exit(1);
        }

        input = await transcribe(input, arg !== "--bsx" ? false : true)
        
        const program = parser.produceAST(input);

        const result = evaluate(program, env);
        if (result.constructor === Object) {
            if (typeof (result as StringVal).value === "string") {
                console.log(chalk.green(`'${(result as StringVal).value}'`))
            } else if (typeof (result as NumberVal).value === "number") {
                if (isNaN((result as NumberVal).value)) {
                    console.log()
                } else {
                    console.log(chalk.yellow(`${(result as NumberVal).value}`))
                }
            } else if (typeof (result as BooleanVal).value === "boolean") {
                console.log(chalk.yellow(`${(result as BooleanVal).value}`))
            } else {
                console.log()
            }
        } else {
            console.log();
        }
    }
}
