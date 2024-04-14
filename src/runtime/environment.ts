
import { execSync } from 'child_process';
// eslint-disable-next-line @typescript-eslint/no-var-requires
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { WebSocket } from 'ws';
import UserAgent = require('user-agents');
import * as readline from 'readline/promises';

import { Identifier, MemberExpr } from '../frontend/ast';
import { runtimeToJS, printValues, jsToRuntime } from './eval/native-fns';
import { ArrayVal, FunctionValue, MK_BOOL, MK_NATIVE_FN, MK_NULL, MK_NUMBER, MK_OBJECT, MK_STRING, MK_ARRAY, NumberVal, ObjectVal, RuntimeVal, StringVal } from "./values";
import { eval_function } from './eval/expressions';
import Parser from '../frontend/parser';
import { evaluate } from './interpreter';
import { transcribe } from '../utils/transcriber';
import axios from 'axios';

export function createGlobalEnv(beginTime: number = -1, filePath: string = __dirname, args: RuntimeVal[] = [], currency: string = "-"): Environment {
    const env = new Environment();

    env.declareVar("true", MK_BOOL(true), true);
    env.declareVar("false", MK_BOOL(false), true);
    env.declareVar("null", MK_NULL(), true);

    env.declareVar("error", MK_NULL(), false);
    env.declareVar("args", MK_ARRAY(args), true)

    // Define a native builtin method
    env.declareVar("println", MK_NATIVE_FN((args) => {
        printValues(args);
        return MK_NULL();
    }), true);

    env.declareVar("exec", MK_NATIVE_FN((args) => {
        const cmd = (args.shift() as StringVal).value

        const result = execSync(cmd, { encoding: 'utf-8' });
        return MK_STRING(result.trim());
    }), true);

    env.declareVar("charat", MK_NATIVE_FN((args) => {
        const str = (args.shift() as StringVal).value;
        const pos = (args.shift() as NumberVal).value;

        return MK_STRING(str.charAt(pos));
    }), true);

    env.declareVar("startsWith", MK_NATIVE_FN((args) => {
        const str = (args.shift() as StringVal).value;
        const str2 = (args.shift() as StringVal).value;

        return MK_BOOL(str.startsWith(str2));
    }), true);

    env.declareVar("trim", MK_NATIVE_FN((args) => {
        const str = (args.shift() as StringVal).value;

        return MK_STRING(str.trim());
    }), true);

    env.declareVar("splitstr", MK_NATIVE_FN((args) => {
        const str = (args.shift() as StringVal).value;
        const splitat = (args.shift() as StringVal).value;

        return MK_ARRAY(str.split(splitat).map(val => MK_STRING(val)));
    }), true);

    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });
    env.declareVar("input", MK_NATIVE_FN((args) => {
        const cmd = (args.shift() as StringVal).value;

        return MK_NATIVE_FN((args) => {
            waitDepth++;
            const fn = args.shift() as FunctionValue;
            const now = Date.now();
            (async () => {
                const result = await rl.question(cmd);
                eval_function(fn, [MK_STRING(result)]);
                slept += Date.now() - now;
                lowerWaitDepth();
            })();
            return MK_NULL();
        });
    }), true);

    env.declareVar("math", MK_OBJECT(
        new Map()
            .set("pi", MK_NUMBER(Math.PI))
            .set("e", MK_NUMBER(Math.E))
            .set("sqrt", MK_NATIVE_FN((args) => {
                const arg = (args[0] as NumberVal).value;
                return MK_NUMBER(Math.sqrt(arg));
            }))
            .set("random", MK_NATIVE_FN((args) => {
                const arg1 = (args[0] as NumberVal).value;
                const arg2 = (args[1] as NumberVal).value;

                const min = Math.ceil(arg1);
                const max = Math.floor(arg2);
                return MK_NUMBER(Math.floor(Math.random() * (max - min + 1)) + min);
            }))
            .set("round", MK_NATIVE_FN((args) => {
                const arg = (args[0] as NumberVal).value;
                return MK_NUMBER(Math.round(arg));
            }))
            .set("ceil", MK_NATIVE_FN((args) => {
                const arg = (args[0] as NumberVal).value;
                return MK_NUMBER(Math.ceil(arg));
            }))
            .set("abs", MK_NATIVE_FN((args) => {
                const arg = (args[0] as NumberVal).value;
                return MK_NUMBER(Math.abs(arg));
            }))
    ), true)

    env.declareVar("parseNumber", MK_NATIVE_FN((args) => {
        const arg = (args[0] as StringVal).value;
        const number = parseFloat(arg);
        return MK_NUMBER(number);
    }), true);

    env.declareVar("strcon", MK_NATIVE_FN((args,) => {
        let res = '';

        for (let i = 0; i < args.length; i++) {
            const arg = args[i] as StringVal;

            res += arg.value;
        }

        return MK_STRING(res);
    }), true)

    env.declareVar("format", MK_NATIVE_FN((args) => {
        const str = args.shift() as StringVal;

        let res = '';

        for (let i = 0; i < args.length; i++) {
            const arg = args[i] as StringVal;

            res = str.value.replace(/\${}/, arg.value);
        }

        if (!args[0]) throw "Second parameter in \"format\" missing."

        return MK_STRING(res);
    }), true)

    env.declareVar("time", MK_NATIVE_FN(() => MK_NUMBER(Date.now())), true);

    let waitDepth = 0;
    let slept = 0;
    let net = 0;
    let shouldExit = false;

    function lowerWaitDepth() {
        waitDepth--;
        if(waitDepth <= 0 && shouldExit) {
            closeBussin();
        }
    }

    const timeoutIds: {[key: number]: NodeJS.Timeout} = {};

    function generateTimeoutId(tm: NodeJS.Timeout): number {
        let id: number;
        do {
            id = Math.floor(Math.random() * 999999);
        } while (timeoutIds[id] != null)
        timeoutIds[id] = tm;
        return id;
    }
    
    env.declareVar("setTimeout", MK_NATIVE_FN((args) => {
        const func = args.shift() as FunctionValue;
        const time = args.shift() as NumberVal;
        waitDepth++;
        const bt = Date.now();
        const tm = setTimeout(() => {
            eval_function(func, []); // No args can be present here, as none are able to be given.
            lowerWaitDepth();
            slept += Date.now() - bt;
        }, time.value);
        return MK_NUMBER(generateTimeoutId(tm));
    }), true);

    env.declareVar("setInterval", MK_NATIVE_FN((args) => {
        const func = args.shift() as FunctionValue;
        const time = args.shift() as NumberVal;
        waitDepth++;
        let bt = Date.now();
        const iv = setInterval(() => {
            eval_function(func, []);
            slept += Date.now() - bt;
            bt = Date.now();
        }, time.value); // No args can be present here, as none are able to be given.
        return MK_NUMBER(generateTimeoutId(iv));
    }), true);

    env.declareVar("clearTimeout", MK_NATIVE_FN((args) => {
        const id = args.shift() as NumberVal;
        if(timeoutIds[id.value]) {
            clearTimeout(timeoutIds[id.value]);
            lowerWaitDepth();
            return MK_BOOL();
        }
        return MK_BOOL(false);
    }), true);
    env.declareVar("clearInterval", MK_NATIVE_FN((args) => {
        const id = args.shift() as NumberVal;
        if(timeoutIds[id.value]) {
            clearInterval(timeoutIds[id.value]);
            lowerWaitDepth();
            return MK_BOOL();
        }
        return MK_BOOL(false);
    }), true);

    env.declareVar("websocket", MK_NATIVE_FN((args) => {
        const url = args.shift() as StringVal;

        const ua = (new UserAgent()).toString();
        const ws = new WebSocket(url.value, { headers: { "user-agent": ua } });

        const now = Date.now();

        waitDepth++;
        ws.addEventListener("close", () => {
            net += Date.now() - now;
            lowerWaitDepth();
        });

        return MK_OBJECT(
            new Map()
                .set("onmessage", MK_NATIVE_FN((args) => {
                    const fn = args.shift() as FunctionValue;
                    ws.onmessage = (event) => eval_function(fn, [MK_STRING(event.data.toString())]);
                    return MK_NULL();
                }))
                .set("onopen", MK_NATIVE_FN((args) => {
                    const fn = args.shift() as FunctionValue;
                    ws.onopen = () => eval_function(fn, []);
                    return MK_NULL();
                }))
                .set("onclose", MK_NATIVE_FN((args) => {
                    const fn = args.shift() as FunctionValue;
                    ws.onclose = () => eval_function(fn, []);
                    return MK_NULL();
                }))
                .set("onerror", MK_NATIVE_FN((args) => {
                    const fn = args.shift() as FunctionValue;
                    ws.onerror = (error) => eval_function(fn, [MK_STRING(error.message)]);
                    return MK_NULL();
                }))
                .set("send", MK_NATIVE_FN((args) => {
                    const data = args.shift() as StringVal;
                    ws.send(data.value);
                    return MK_NULL();
                }))
        )
    }), true);

    env.declareVar("fetch", MK_NATIVE_FN((args) => {
        const url = (args.shift() as StringVal).value;
        const options = args.shift() as ObjectVal;
    
        const method = options == undefined ? "GET" : (options.properties.get("method") as StringVal)?.value ?? "GET";
        const body = options == undefined ? null : (options.properties.get("body") as StringVal)?.value ?? null;
        const content_type = options == undefined ? "text/plain" : (options.properties.get("content_type") as StringVal)?.value ?? "text/plain";
        
        return MK_NATIVE_FN((args) => {
            const fn = args.shift() as FunctionValue;
            waitDepth++;
            const now = Date.now();
            (async () => {
                const req = await axios.request({url, method, headers: { "content-type": content_type }, data: body });
                if (req.status !== 200) {
                    throw new Error("Failed to fetch data: " + req.data.toString('utf8'));
                }
                eval_function(fn, [MK_STRING(req.data.toString("utf-8"))]);
                net += Date.now() - now;
                lowerWaitDepth();
            })();
            return MK_NULL();
        });
    }), true);

    function localPath(path: string) {
        if(path.startsWith(".") || !path.includes(":")) {
            path = filePath + path;
        }
        return path;
    }

    env.declareVar("fs", MK_OBJECT(
        new Map()
            .set("tmpdir", MK_STRING(os.tmpdir()))
            .set("appdata", MK_STRING(process.env.APPDATA || (process.platform === 'darwin' ? path.join(os.homedir(), 'Library', 'Application Support') : path.join(os.homedir(), '.local', 'share'))))
            .set("home", MK_STRING(os.homedir()))
            .set("desktop", MK_STRING(path.join(os.homedir(), "Desktop")))
            .set("read", MK_NATIVE_FN((args) => {
                const path = localPath((args.shift() as StringVal).value);
                const encoding = (args.shift() as StringVal)?.value ?? "utf8";
                const read = fs.readFileSync(path, encoding as fs.EncodingOption);
                return MK_STRING(read.toString());
            }))
            .set("write", MK_NATIVE_FN((args) => {
                const path = localPath((args.shift() as StringVal).value);
                const data = (args.shift() as StringVal).value;
                fs.writeFileSync(path, data);
                return MK_NULL();
            }))
            .set("mkdir", MK_NATIVE_FN((args) => {
                const path = localPath((args.shift() as StringVal).value);
                fs.mkdirSync(path);
                return MK_NULL();
            }))
            .set("rm", MK_NATIVE_FN((args) => {
                const path = localPath((args.shift() as StringVal).value);
                fs.rmSync(path);
                return MK_NULL();
            }))
            .set("rmdir", MK_NATIVE_FN((args) => {
                const path = localPath((args.shift() as StringVal).value);
                fs.rmdirSync(path, { recursive: true });
                return MK_NULL();
            }))
            .set("exists", MK_NATIVE_FN((args) => {
                const path = localPath((args.shift() as StringVal).value);
                return MK_BOOL(fs.existsSync(path));
            }))
    ), true);

    env.declareVar("objects", MK_OBJECT(
        new Map()
            .set("hasKey", MK_NATIVE_FN((args) => {
                const obj = (args.shift() as ObjectVal).properties;
                const value = (args.shift() as StringVal).value;
                const within = obj.has(value);
                return MK_BOOL(within);
            }))
            .set("get", MK_NATIVE_FN((args) => {
                const obj = (args.shift() as ObjectVal).properties;
                const key = (args.shift() as StringVal).value;
                return obj.get(key);
            }))
            .set("set", MK_NATIVE_FN((args) => {
                const obj = (args.shift() as ObjectVal).properties;
                const key = (args.shift() as StringVal).value;
                const value = (args.shift() as RuntimeVal);
                obj.set(key, value);
                return MK_NULL();
            }))
            .set("keys", MK_NATIVE_FN((args) => {
                const obj = (args.shift() as ObjectVal).properties;
                return MK_ARRAY(Array.from(obj.keys()).map(MK_STRING));
            }))
    ), true);

    env.declareVar("len", MK_NATIVE_FN((args) => {
        const arg = args.shift();
        switch(arg.type) {
            case "string":
                return MK_NUMBER((arg as StringVal).value.length);
            case "object":
                return MK_NUMBER((arg as ObjectVal).properties.size);
            case "array":
                return MK_NUMBER((arg as ArrayVal).values.length);
            default:
                throw "Cannot get length of type: " + arg.type;
        }
    }), true);

    env.declareVar("base64", MK_OBJECT(
        new Map()
            .set("encode", MK_NATIVE_FN((args) => {
                const str = args.shift() as StringVal;
                return MK_STRING(btoa(str.value));
            }))
            .set("decode", MK_NATIVE_FN((args) => {
                const str = args.shift() as StringVal;
                return MK_STRING(atob(str.value));
            }))
    ), true);

    env.declareVar("import", MK_NATIVE_FN((args) => {
        const path = localPath((args.shift() as StringVal).value);

        let input;
        if(path.endsWith(".bs")) {
            input = fs.readFileSync(path, "utf-8");
        } else if (path.endsWith(".bsx")) {
            if(currency == "-") throw "Cannot run Bussin X from Bussin: " + path;
            input = transcribe(fs.readFileSync(path, "utf-8"), currency);
        } else throw "Not a Bussin [X] file: " + path
        
        const parser = new Parser();
        const program = parser.produceAST(input);

        return evaluate(program, env); // this will evaluate and return the last value emitted. neat
    }), true);

    // Bussin Object Notation!!!
    env.declareVar("bson", MK_OBJECT(
        new Map()
            .set("stringify", MK_NATIVE_FN((args) => {
                if(args[0].type == "object") {
                    const obj = args.shift() as ObjectVal;
                    return MK_STRING(JSON.stringify(runtimeToJS(obj)));
                } else if (args[0].type == "array") {
                    const arr = args.shift() as ArrayVal;
                    return MK_STRING(JSON.stringify(runtimeToJS(arr)));
                }
                throw "Not json stringifiable type: " + args[0].type;
            }))
            .set("parse", MK_NATIVE_FN((args) => {
                const string = (args.shift() as StringVal).value;
                const jsonObj: {[key: string]: unknown} = JSON.parse(string);
                if(Array.isArray(jsonObj)) {
                    const rtArr: RuntimeVal[] = [];
                    jsonObj.forEach(val => rtArr.push(jsToRuntime(val)))
                    return MK_ARRAY(rtArr);
                }
                const rtObj = new Map();
                Object.keys(jsonObj).forEach((key) => rtObj.set(key, jsToRuntime(jsonObj[key])));
                return MK_OBJECT(rtObj);
            }))
    ), true);

    function parseRegex(regex: string): RegExp {
        const split = regex.split("/");
        if(split.length < 3) throw "Invalid regex: " + regex;

        split.shift(); // remove empty

        const flags = split[split.length - 1];

        const full = split.join("/");
        const pattern = full.substring(0, full.length - (flags.length + 1));

        return new RegExp(pattern, flags);
    }

    env.declareVar("regex", MK_OBJECT(
        new Map()
            .set("match", MK_NATIVE_FN((args) => {
                const string = (args.shift() as StringVal).value;

                const regex = parseRegex((args.shift() as StringVal).value);
                const matches = string.match(regex);

                return matches == null ? MK_NULL() : MK_ARRAY(matches.map(val => MK_STRING(val)));
            }))
            .set("replace", MK_NATIVE_FN((args) => {
                const string = (args.shift() as StringVal).value;
                const regex = parseRegex((args.shift() as StringVal).value);

                const replaceValue = (args.shift() as StringVal).value;
                const replaced = string.replace(regex, replaceValue);
                
                return MK_STRING(replaced);
            }))
    ), true);

    function closeBussin(): null {
        if(beginTime != -1) {
            console.log(`\nBussin executed in ${(Date.now() - beginTime).toLocaleString()}ms${slept > 0 ? ` (${slept.toLocaleString()}ms slept)` : ""}${net > 0 ? ` (${net.toLocaleString()}ms networking)` : ""}.`);
        }
        process.exit();
    }

    env.declareVar("exit", MK_NATIVE_FN(() => closeBussin()), true);

    env.declareVar("finishExit", MK_NATIVE_FN(() => {
        if(waitDepth == 0) {
            closeBussin();
        } else {
            shouldExit = true;
        }
        return MK_NULL();
    }), true);

    return env;
}

export default class Environment {
    private parent?: Environment;
    private variables: Map<string, RuntimeVal>
    private constants: Set<string>;

    constructor(parentENV?: Environment) {
        //const global = parentENV ? true : false;

        this.parent = parentENV;
        this.variables = new Map();
        this.constants = new Set();
    }

    public declareVar(varname: string, value: RuntimeVal, constant: boolean): RuntimeVal {
        if (this.variables.has(varname)) {
            throw `Cannot declare variable ${varname}. As it already is defined.`
        }

        this.variables.set(varname, value);

        if (constant) this.constants.add(varname);

        return value;
    }

    public assignVar(varname: string, value: RuntimeVal): RuntimeVal {
        const env = this.resolve(varname);

        // Cannot assign to constant
        if (env.constants.has(varname)) {
            throw `Cannot reassign to variable "${varname}" as it's constant.`
        }

        env.variables.set(varname, value);

        return value;
    }

    public lookupOrMutObject(expr: MemberExpr, value?: RuntimeVal, property?: Identifier): RuntimeVal {
        let pastVal;
        if (expr.object.kind === 'MemberExpr') {
            // We will get the expr.object property of the expr.object -- since we are using this just to get the value, we will null the value as it will not be changed
            // This will then, in cases like a.b.c, will return a.b -- now this a.b will be put into pastVal recursively and then it will get c of a.b
            // (Funny how I spent like 20 minutes debugging this just to realize that it was passing value in and then causing it to return the value which isn't an array/object)
            pastVal = this.lookupOrMutObject(expr.object as MemberExpr, null, (expr.object as MemberExpr).property as Identifier);
        } else {
            const varname = (expr.object as Identifier).symbol;
            const env = this.resolve(varname);

            pastVal = env.variables.get(varname);
        }

        switch(pastVal.type) {
            case "object": {
                const currentProp = (expr.property as Identifier).symbol;
                const prop = property ? property.symbol : currentProp;

                if (value) (pastVal as ObjectVal).properties.set(prop, value);

                if (currentProp) pastVal = ((pastVal as ObjectVal).properties.get(currentProp) as ObjectVal);

                return pastVal;
            }
            case "array": {

                // Will evaluate the expression. Numbers will stay, but a variable will work. This allows for array[0] and array[ident].
                const numRT: RuntimeVal = evaluate(expr.property, this);

                if(numRT.type != "number") throw "Arrays do not have keys: " + expr.property;

                const num = (numRT as NumberVal).value;

                if(value) (pastVal as ArrayVal).values[num] = value;

                return (pastVal as ArrayVal).values[num];
            }
            default:
                throw "Cannot lookup or mutate type: " + pastVal.type;
        }
    }

    public lookupVar(varname: string): RuntimeVal {
        const env = this.resolve(varname);

        return env.variables.get(varname) as RuntimeVal;
    }

    public resolve(varname: string): Environment {
        if (this.variables.has(varname)) return this;

        if (this.parent == undefined) throw `Cannot resolve '${varname}' as it does not exist.`;

        return this.parent.resolve(varname);
    }
}