import { FunctionDeclaration, IfStatement, Program, Stmt, VarDeclaration, ForStatement, Identifier, TryCatchStatement } from "../../frontend/ast";
import Environment from "../environment";
import { evaluate } from "../interpreter";
import { BooleanVal, FunctionValue, MK_NULL, RuntimeVal } from "../values";
import { eval_assignment, eval_binary_expr } from "./expressions";

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

    return env.declareVar(declaration.name, fn, true);
}

export function eval_if_statement(declaration: IfStatement, env: Environment): RuntimeVal {
    const test = evaluate(declaration.test, env);

    if ((test as BooleanVal).value === true) {
        return eval_body(declaration.body, env);
    } else if (declaration.alternate) {
        return eval_body(declaration.alternate, env);
    } else {
        return MK_NULL();
    }
}

function eval_body(body: Stmt[], env: Environment, newEnv: boolean = true): RuntimeVal {
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
    }

    return result;
}

export function eval_for_statement(declaration: ForStatement, env: Environment): RuntimeVal {
    env = new Environment(env);

    eval_val_declaration(declaration.init, env);

    const body = declaration.body;
    const update = declaration.update;

    let test = evaluate(declaration.test, env);

    if ((test as BooleanVal).value !== true) return MK_NULL(); // The loop didn't start

    do {
        eval_assignment(update, env);
        eval_body(body, new Environment(env), false);

        test = evaluate(declaration.test, env);
    } while ((test as BooleanVal).value);

    return MK_NULL();
}


export function eval_try_catch_statement(env: Environment, declaration?: TryCatchStatement): RuntimeVal {
    const try_env = new Environment(env);
    const catch_env = new Environment(env);

    try {
        return eval_body(declaration.body, try_env, false);
    } catch (e) {
        env.assignVar('error', e)
        return eval_body(declaration.alternate, catch_env, false);
    }
}