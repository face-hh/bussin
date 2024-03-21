import { execSync } from 'child_process';
import request, { HttpVerb } from 'sync-request';
const rl = require('readline-sync')
import * as fs from 'fs';

import { Identifier, MemberExpr } from '../frontend/ast';
import { printValues } from './eval/native-fns';
import { FunctionValue, MK_BOOL, MK_NATIVE_FN, MK_NULL, MK_NUMBER, MK_OBJECT, MK_STRING, NumberVal, ObjectVal, RuntimeVal, StringVal } from "./values";
import { eval_function } from './eval/expressions';
import Parser from '../frontend/parser';
import { evaluate } from './interpreter';
import { transcribe } from '../utils/transcriber';

export function createGlobalEnv(beginTime: number = -1, filePath: string = __dirname, args: Map<string, RuntimeVal> = new Map(), currency: string = "-"): Environment {
    const env = new Environment();

    env.declareVar("true", MK_BOOL(true), true);
    env.declareVar("false", MK_BOOL(false), true);
    env.declareVar("null", MK_NULL(), true);

    env.declareVar("error", MK_NULL(), false);
    env.declareVar("args", MK_OBJECT(args), true)

    // Define a native builtin method
    env.declareVar("println", MK_NATIVE_FN((args) => {
        printValues(args);
        return MK_NULL();
    }), true)

    env.declareVar("exec", MK_NATIVE_FN((args) => {
        const cmd = (args[0] as StringVal).value

        try {
            const result = execSync(cmd, { encoding: 'utf-8' });
            return MK_STRING(result.trim());
        } catch (error) {
            throw error;
        }
    }), true)

    env.declareVar("charat", MK_NATIVE_FN((args) => {
        const str = (args[0] as StringVal).value;
        const pos = (args[1] as NumberVal).value;

        try {
            return MK_STRING(str.charAt(pos));
        } catch (error) {
            throw error;
        }
    }), true);

    env.declareVar("input", MK_NATIVE_FN((args) => {
        const cmd = (args[0] as StringVal).value;

        try {
            const result = rl.question(cmd);
            if (result !== null) {
                return MK_STRING(result);
            } else {
                return MK_NULL();
            }
        } catch (error) {
            throw error;
        }
    }), true);

    env.declareVar("math", MK_OBJECT(
        new Map()
            .set("pi", Math.PI)
            .set("sqrt", MK_NATIVE_FN((args) => {
                const arg = (args[0] as NumberVal).value;
                return MK_NUMBER(Math.sqrt(arg))
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
                return MK_NUMBER(Math.round(arg))
            }))
            .set("ceil", MK_NATIVE_FN((args) => {
                const arg = (args[0] as NumberVal).value;
                return MK_NUMBER(Math.ceil(arg))
            }))
            .set("abs", MK_NATIVE_FN((args) => {
                const arg = (args[0] as NumberVal).value;
                return MK_NUMBER(Math.abs(arg))
            }))
    ), true)

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

    let timeoutDepth = 0;
    let shouldExit = false;

    env.declareVar("setTimeout", MK_NATIVE_FN((args) => {
        const func = args.shift() as FunctionValue;
        const time = args.shift() as NumberVal;
        timeoutDepth++;
        setTimeout(() => {
            eval_function(func, []); // No args can be present here, as none are able to be given.
            timeoutDepth--;
            if(timeoutDepth == 0 && shouldExit) {
                process.exit();
            }
        }, time.value);
        return MK_NULL();
    }), true);

    env.declareVar("setInterval", MK_NATIVE_FN((args) => {
        const func = args.shift() as FunctionValue;
        const time = args.shift() as NumberVal;
        timeoutDepth = Infinity; // Intervals won't end so...
        setInterval(() => eval_function(func, []), time.value); // No args can be present here, as none are able to be given.
        return MK_NULL();
    }), true);

    env.declareVar("fetch", MK_NATIVE_FN((args) => {
        const url = args.shift() as StringVal;
        const options = args.shift() as ObjectVal;
    
        const method = options == undefined ? "GET" : (options.properties.get("method") as StringVal)?.value ?? "GET";
        const body = options == undefined ? null : (options.properties.get("body") as StringVal)?.value ?? null;
    
        const res = request(method as HttpVerb, url.value, { body });
        if (res.statusCode !== 200) {
            throw new Error("Failed to fetch data: " + res.body.toString('utf8'));
        }
    
        return MK_STRING(res.body.toString('utf8'));
    }), true);

    function localPath(path: string) {
        if(path.startsWith(".") || !path.includes(":")) {
            path = filePath + path;
        }
        return path;
    }

    env.declareVar("fs", MK_OBJECT(
        new Map()
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
            .set("exists", MK_NATIVE_FN((args) => {
                const path = localPath((args.shift() as StringVal).value);
                return MK_BOOL(fs.existsSync(path));
            }))
            .set("rm", MK_NATIVE_FN((args) => {
                const path = localPath((args.shift() as StringVal).value);
                fs.rmSync(path);
                return MK_NULL();
            }))
            .set("rmdir", MK_NATIVE_FN((args) => {
                const path = localPath((args.shift() as StringVal).value);
                fs.rmdirSync(path);
                return MK_NULL();
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
    ), true)

    env.declareVar("len", MK_NATIVE_FN((args) => {
        const string = (args.shift() as StringVal).value;
        return MK_NUMBER(string.length);
    }), true);

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

    function closeBussin(): null {
        if(beginTime != -1) {
            console.log(`\nBussin executed in ${(Date.now() - beginTime).toLocaleString()}ms.`);
        }
        process.exit();
    }

    env.declareVar("exit", MK_NATIVE_FN(() => closeBussin()), true);

    env.declareVar("finishExit", MK_NATIVE_FN(() => {
        if(timeoutDepth == 0) {
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
        const global = parentENV ? true : false;

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
        if (expr.object.kind === 'MemberExpr') return this.lookupOrMutObject(expr.object as MemberExpr, value, expr.property as Identifier);

        const varname = (expr.object as Identifier).symbol;
        const env = this.resolve(varname);

        let pastVal = env.variables.get(varname) as ObjectVal;

        const prop = property
            ? property.symbol
            : (expr.property as Identifier).symbol;
        const currentProp = (expr.property as Identifier).symbol;

        if (value) pastVal.properties.set(prop, value);

        if (currentProp) pastVal = (pastVal.properties.get(currentProp) as ObjectVal);

        return pastVal;
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