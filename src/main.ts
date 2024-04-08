// Begin prior to imports
const begin = Date.now();

import Parser from "./frontend/parser";

import { createGlobalEnv } from "./runtime/environment";
import { evaluate } from "./runtime/interpreter";
import { readFileSync } from "fs";
import { get_currency, transcribe } from "./utils/transcriber";
import { MK_STRING } from "./runtime/values";
import { runtimeToJS } from "./runtime/eval/native-fns";

const args = process.argv;
args.shift();
args.shift();
const file = args.shift();

if(file) {
    run(file);
} else {
    repl();
}

async function run(filename: string) {

    let input = readFileSync(filename, 'utf-8') + "\nfinishExit()";
    
    let currency = "-";
    if (filename.endsWith('.bsx')) {
        const currencies = JSON.parse(readFileSync(__dirname + "/../src/utils/currencies.json", "utf-8")); // should work for /src/ and /dist/
        currency = await get_currency(currencies);
        input = transcribe(input, currency);
    }

    const parser = new Parser();
    const env = createGlobalEnv(args.includes("--time") ? begin : -1, filename.substring(0, filename.lastIndexOf("/") + 1), args.map(value => MK_STRING(value)), currency);

    const program = parser.produceAST(input);
    
    evaluate(program, env);
}

async function repl() {
    const readline = await import('readline/promises');

    const parser = new Parser();
    const env = createGlobalEnv();

    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });

    console.log("Repl v1.0 (Bussin)");

    // eslint-disable-next-line no-constant-condition
    while(true) {
        const input = await rl.question("> ");

        const program = parser.produceAST(input);

        try {
            const result = runtimeToJS(evaluate(program, env));
            console.log(result);
        } catch(err) {
            console.log(err);
        }
    }
}