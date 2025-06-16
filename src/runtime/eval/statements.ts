import { FunctionDeclaration, IfStatement, Program, Stmt, VarDeclaration, ForStatement, TryCatchStatement, ClassDeclarationStmt, EnumDeclarationStmt, WhileStmt } from "../../frontend/ast";
import Environment, { ContinueType } from "../environment";
import { evaluate } from "../interpreter";
import { BooleanVal, ClassFunctionValue, FunctionValue, MK_NULL, RuntimeVal, StaticClassValue, StaticEnumValue } from "../values";
import { eval_assignment } from "./expressions";

export function eval_program(program: Program, env: Environment): RuntimeVal {
    let lastEvaluated: RuntimeVal = MK_NULL();

    for (const statement of program.body) {
        lastEvaluated = evaluate(statement, env);
    }

    return lastEvaluated
}

export function eval_val_declaration(declaration: VarDeclaration, env: Environment): RuntimeVal {
    const value = declaration.value ? evaluate(declaration.value, env) : MK_NULL();

    return env.declareVar(declaration.identifier, value, declaration.constant);
}

export function eval_function_declaration(declaration: FunctionDeclaration, env: Environment): RuntimeVal {
    // Create new function scope
    const fn = {
        type: "fn",
        name: declaration.name,
        parameters: declaration.parameters,
        declarationEnv: env,
        body: declaration.body,
    } as FunctionValue;

    return declaration.name == "<anonymous>" ? fn : env.declareVar(declaration.name, fn, true);
}

export function eval_while_statement(wh: WhileStmt, env: Environment): RuntimeVal {
    const main_env = new Environment(env);
    let last: RuntimeVal = MK_NULL();
    while (true) {
        const this_env = new Environment(env);
        this_env.canContinue = true;
        const val = evaluate(wh.value, this_env);
        if (val.type != "boolean" || !(val as BooleanVal).value) {
            break;
        }
        last = eval_body(wh.body, this_env, false, true);
        if (this_env.exitWith != null) {
            env.exitWith = this_env.exitWith;
            break;
        }
        if (this_env.contin == ContinueType.Break) {
            break;
        }
    }
    return last;
}

export function eval_if_statement(declaration: IfStatement, env: Environment): RuntimeVal {
    const test = evaluate(declaration.test, env);

    if ((test as BooleanVal).value === true) {
        return eval_body(declaration.body, env, true, true);
    } else if (declaration.alternate) {
        return eval_body(declaration.alternate, env, true, true);
    } else {
        return MK_NULL();
    }
}

function eval_body(body: Stmt[], env: Environment, newEnv: boolean = true, leakScope: boolean = false): RuntimeVal {
    let scope: Environment;

    if (newEnv) {
        scope = new Environment(env);
    } else {
        scope = env;
    }
    let result: RuntimeVal = MK_NULL();

    // Evaluate the if body line by line
    for (const stmt of body) {
        // if((stmt as Identifier).symbol === 'continue') return result;
        result = evaluate(stmt, scope);
        if (scope.exitWith != null) {
            result = scope.exitWith;
            break;
        }
        if (scope.contin == ContinueType.Break || scope.contin == ContinueType.Continue) {
            break;
        }
    }

    if (leakScope && scope.exitWith != null) {
        env.exitWith = scope.exitWith;
    }
    return result;
}

export function eval_for_statement(declaration: ForStatement, _env: Environment): RuntimeVal {
    let env = new Environment(_env);

    eval_val_declaration(declaration.init, env);

    const body = declaration.body;
    const update = declaration.update;

    let test = evaluate(declaration.test, env);

    if ((test as BooleanVal).value !== true) return MK_NULL(); // The loop didn't start

    do {
        let sub_env = new Environment(env);
        sub_env.canContinue = true;
        eval_body(body, sub_env, false, true);
        if (sub_env.contin == ContinueType.Continue) {
            continue;
        } else if (sub_env.contin == ContinueType.Break) {
            break;
        }
        if (sub_env.exitWith != null) {
            _env.exitWith = sub_env.exitWith;
            break;
        }
        eval_assignment(update, env);

        test = evaluate(declaration.test, env);
    } while ((test as BooleanVal).value);

    return MK_NULL();
}

export function eval_class_declaration(decl: ClassDeclarationStmt, env: Environment): RuntimeVal {
    const staticFields = new Map<string, RuntimeVal>();
    decl.staticFields.forEach((v,k) => {
        staticFields.set(k, evaluate(v, env)); 
    });

    const funs = new Map();
    const staticFuns = new Map();

    const classVal = {
        type: "static-class",
        name: decl.name,
        staticFields,
        fields: decl.fields,
        funs,
        staticFuns,
    } as StaticClassValue;

    decl.funs.forEach((v,k) => {
        funs.set(k, {
            type: "class-function",
            name: v.name,
            parameters: v.parameters,
            declarationEnv: env,
            body: v.body,
            parent: classVal,
        } as ClassFunctionValue);
    });

    decl.staticFuns.forEach((v,k) => {
        staticFuns.set(k, {
            type: "class-function",
            name: v.name,
            parameters: v.parameters,
            declarationEnv: env,
            body: v.body,
            parent: classVal,
        } as ClassFunctionValue);
    });

    env.declareVar(decl.name, classVal, false);

    return MK_NULL();
}

export function eval_enum_declaration(decl: EnumDeclarationStmt, env: Environment): RuntimeVal {
    env.declareVar(decl.name, {
        type: "static-enum",
        name: decl.name,
        members: decl.members,
    } as StaticEnumValue, false);
    return MK_NULL();
}

export function eval_try_catch_statement(env: Environment, declaration?: TryCatchStatement): RuntimeVal {
    const try_env = new Environment(env);
    const catch_env = new Environment(env);

    try {
        const res = eval_body(declaration.body, try_env, false, true);
        if (try_env.exitWith != null) {
            env.exitWith = try_env.exitWith; //? We allow returning through try/catch
            return MK_NULL();
        }
        return res;
    } catch (e) {
        env.assignVar('error', e)
        const res = eval_body(declaration.alternate, catch_env, false, true);
        if (catch_env.exitWith != null) {
            env.exitWith = catch_env.exitWith;
            return MK_NULL();
        }
        return res;
    }
}