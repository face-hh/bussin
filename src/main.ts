// Begin prior to imports
const begin = Date.now();

import Parser from "./frontend/parser";

import { createGlobalEnv, rl } from "./runtime/environment";
import { evaluate } from "./runtime/interpreter";
import { readFileSync, writeFileSync } from "fs";
import { get_currency, transcribe } from "./utils/transcriber";
import { MK_STRING } from "./runtime/values";
import { runtimeToJS } from "./runtime/eval/native-fns";
import * as path from 'path';
import * as readline from 'readline/promises';
import { exit } from "process";

const args = process.argv;
args.shift();
args.shift();
const file = args.shift();

async function takeInput(file: string): Promise<string> {
    let input = readFileSync(file, 'utf-8') + "\nfinishExit()";
    
    let currency = "-";
    if (file.endsWith('.bsx')) {
        const currencies = JSON.parse(readFileSync(__dirname + "/../src/utils/currencies.json", "utf-8")); // should work for /src/ and /dist/
        currency = await get_currency(currencies);
        input = transcribe(input, currency);
    }

    return input;
}

if (file=='view-ast' && args.length >= 1) { // Prints out the AST of the program
    (async () => {
        const file = await takeInput(args[0]);
        const p = new Parser();
        console.log(p.produceAST(file));
    })();
} else if (file=='unbeautify' && args.length >= 1) { // Transforms a .bsx file to a .bs file
    (async () => {
        const file = await takeInput(args[0]);
        const parsedPath = path.parse(args[0]);
        writeFileSync(path.format({
            dir: parsedPath.dir,
            name: parsedPath.name,
            ext: ".bs",
        }), file);
    })();
} else if (file) { // Execute file
    run(file);
} else { // Open REPL
    repl();
}

async function run(filename: string) {
    const input = await takeInput(filename);
    let currency = await get_currency(JSON.parse(readFileSync(__dirname + "/../src/utils/currencies.json", "utf-8")));

    const parser = new Parser();
    const env = createGlobalEnv(args.includes("--time") ? begin : -1, filename.substring(0, filename.lastIndexOf("/") + 1), args.map(value => MK_STRING(value)), currency);

    const program = parser.produceAST(input);
    
    evaluate(program, env);
}

async function repl() {
    const env = createGlobalEnv();

    console.log("Repl v1.1 (Bussin)\nType 'rizz' into the console to change into Bussin X.");
    let shittyLanguage = true;

    // eslint-disable-next-line no-constant-condition
    while(true) {
        try {
            let input = await rl.question("> ");

            if (input == 'rizz') {
                console.clear();
                console.log("Repl v69.420 (Bussin X)\nicl ts pmo sm n sb rn ngl, r u srsly srs n fr rn vro? lol atp js go b fr vro, idek nm, brb gng gtg atm Imao, bt ts pyo 2 js Imk lol onb fr nty b fr rn lk\n");
                shittyLanguage = false;
                continue;
            }

            if (!shittyLanguage) {
                const currencies = JSON.parse(readFileSync(__dirname + "/../src/utils/currencies.json", "utf-8")); // should work for /src/ and /dist/
                let currency = await get_currency(currencies);
                input = transcribe(input, currency);
            }

            const program = (new Parser()).produceAST(input);

            try {
                const result = runtimeToJS(evaluate(program, env));
                console.log(result);
            } catch(err) {
                console.log(err);
            }
        } catch (err) {
            console.log(shittyLanguage ? '\nFarewell!' : '\nicl ts pmo 💔 lk atp js go');
            exit(0);
        }
    }
}