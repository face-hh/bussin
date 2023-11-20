import { exec, execSync } from 'child_process';
const rl = require('readline-sync')

import { Identifier, MemberExpr } from '../frontend/ast';
import { printValues } from './eval/native-fns';
import { MK_BOOL, MK_NATIVE_FN, MK_NULL, MK_NUMBER, MK_OBJECT, MK_STRING, NumberVal, ObjectVal, RuntimeVal, StringVal } from "./values";

export function createGlobalEnv(): Environment {
    const env = new Environment();

    env.declareVar("true", MK_BOOL(true), true)
    env.declareVar("false", MK_BOOL(false), true)
    env.declareVar("null", MK_NULL(), true)

    env.declareVar("error", MK_NULL(), false)

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

    env.declareVar("strcon", MK_NATIVE_FN((args, env) => {
        let res = '';

        for (let i = 0; i < args.length; i++) {
            const arg = args[i] as StringVal;

            res += arg.value;
        }

        return MK_STRING(res);
    }), true)

    env.declareVar("format", MK_NATIVE_FN((args, env) => {
        const str = args.shift() as StringVal;

        let res = '';

        for (let i = 0; i < args.length; i++) {
            const arg = args[i] as StringVal;

            res = str.value.replace(/\${}/, arg.value);
        }

        if (!args[0]) throw "2nd parameter in format! missing."

        return MK_STRING(res);
    }), true)

    function timeFunction(args: RuntimeVal[], env: Environment) {
        return MK_NUMBER(Date.now());
    }

    env.declareVar("time", MK_NATIVE_FN(timeFunction), true)
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