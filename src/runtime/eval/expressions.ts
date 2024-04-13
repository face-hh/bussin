import { ArrayLiteral, AssignmentExpr, BinaryExpr, CallExpr, Identifier, MemberExpr, ObjectLiteral } from "../../frontend/ast";
import Environment from "../environment";
import { evaluate } from "../interpreter";
import { NumberVal, RuntimeVal, MK_NULL, ObjectVal, NativeFnValue, FunctionValue, BooleanVal, StringVal, NullVal, MK_NUMBER, MK_BOOL, ArrayVal } from "../values";

export function eval_numeric_binary_expr(lhs: RuntimeVal, rhs: RuntimeVal, operator: string): RuntimeVal {

    switch(operator) {
        case "|": {
            if(lhs.type !== "boolean" || rhs.type !== "boolean") return MK_BOOL(false);
            return MK_BOOL((lhs as BooleanVal).value || (rhs as BooleanVal).value);
        }
        case "&&":
            if(lhs.type !== "boolean" || rhs.type !== "boolean") return MK_BOOL(false);
            return MK_BOOL((lhs as BooleanVal).value && (rhs as BooleanVal).value);
        case "!=":
            return equals(lhs, rhs, false);
        case "==":
            return equals(lhs, rhs, true);
        default: {
            if (lhs.type !== 'number' || rhs.type !== 'number') return MK_BOOL(false);

            const llhs = lhs as NumberVal;
            const rrhs = rhs as NumberVal;
    
            switch (operator) {
                case "+":
                    return MK_NUMBER(llhs.value + rrhs.value);
                case "-":
                    return MK_NUMBER(llhs.value - rrhs.value);
                case "*":
                    return MK_NUMBER(llhs.value * rrhs.value);
                case "/":
                    return MK_NUMBER(llhs.value / rrhs.value);
                case "%":
                    return MK_NUMBER(llhs.value % rrhs.value);
                case "<":
                    return MK_BOOL(llhs.value < rrhs.value);
                case ">":
                    return MK_BOOL(llhs.value > rrhs.value);
                default:
                    throw `Unknown operator provided in operation: ${lhs}, ${rhs}.`
            }
        }
    }
}

function equals(lhs: RuntimeVal, rhs: RuntimeVal, strict: boolean): RuntimeVal {
    const compare = strict ? (a: unknown, b: unknown) => a === b : (a: unknown, b: unknown) => a !== b;

    switch (lhs.type) {
        case 'boolean':
            return MK_BOOL(compare((lhs as BooleanVal).value, (rhs as BooleanVal).value));
        case 'number':
            return MK_BOOL(compare((lhs as NumberVal).value, (rhs as NumberVal).value));
        case 'string':
            return MK_BOOL(compare((lhs as StringVal).value, (rhs as StringVal).value));
        case 'fn':
            return MK_BOOL(compare((lhs as FunctionValue).body, (rhs as FunctionValue).body));
        case 'native-fn':
            return MK_BOOL(compare((lhs as NativeFnValue).call, (rhs as NativeFnValue).call));
        case 'null':
            return MK_BOOL(compare((lhs as NullVal).value, (rhs as NullVal).value));
        case 'object':
            return MK_BOOL(compare((lhs as ObjectVal).properties, (rhs as ObjectVal).properties));
        case 'array':
            return MK_BOOL(compare((lhs as ArrayVal).values, (rhs as ArrayVal).values ));
        default:
            throw `RunTime: Unhandled type in equals function: ${lhs.type}, ${rhs.type}`
    }
}

export function eval_binary_expr(binop: BinaryExpr, env: Environment): RuntimeVal {
    const lhs: RuntimeVal = evaluate(binop.left, env);
    const rhs: RuntimeVal = evaluate(binop.right, env);

    return eval_numeric_binary_expr(lhs, rhs, binop.operator);
}

export function eval_identifier(ident: Identifier, env: Environment): RuntimeVal {
    const val = env.lookupVar(ident.symbol);

    return val;
}

export function eval_assignment(node: AssignmentExpr, env: Environment): RuntimeVal {
    if (node.assigne.kind === "MemberExpr") return eval_member_expr(env, node);
    if (node.assigne.kind !== "Identifier") throw `Invalid left-hand-side expression: ${JSON.stringify(node.assigne)}.`;

    const varname = (node.assigne as Identifier).symbol;

    return env.assignVar(varname, evaluate(node.value, env));
}

export function eval_object_expr(obj: ObjectLiteral, env: Environment): RuntimeVal {
    const object = { type: "object", properties: new Map() } as ObjectVal;

    for (const { key, value } of obj.properties) {
        // Handles { key }
        // Finds variable "key" to set as value.
        const runtimeVal = (value == undefined) ? env.lookupVar(key) : evaluate(value, env);

        object.properties.set(key, runtimeVal);
    }
    return object;
}

export function eval_array_expr(obj: ArrayLiteral, env: Environment): RuntimeVal {
    const array = { type: "array", values: [] } as ArrayVal;

    for(const value of obj.values) {
        const runtimeVal = evaluate(value, env);

        array.values.push(runtimeVal);
    }

    return array;
}

export function eval_function(func: FunctionValue, args: RuntimeVal[]): RuntimeVal {
    const scope = new Environment(func.declarationEnv);

    // Create the variables for the parameters list
    for (let i = 0; i < func.parameters.length; i++) {
        // TODO check the bounds here
        // verify arity of function
        const varname = func.parameters[i];
        scope.declareVar(varname, args[i], false);
    }

    let result: RuntimeVal = MK_NULL();

    // Evaluate the function body line by line
    for (const stmt of func.body) {
        result = evaluate(stmt, scope);
    }

    return result;
}

export function eval_call_expr(expr: CallExpr, env: Environment): RuntimeVal {
    const args = expr.args.map(arg => evaluate(arg, env));
    const fn = evaluate(expr.caller, env);

    if(fn != null) {
        if (fn.type == "native-fn") {
            return (fn as NativeFnValue).call(args, env);
        }

        if (fn.type == "fn") {
            const func = fn as FunctionValue;
            return eval_function(func, args);
        }
    }

    throw "Cannot call value that is not a function: " + JSON.stringify(fn);
}

export function eval_member_expr(env: Environment, node?: AssignmentExpr, expr?: MemberExpr): RuntimeVal {
    if (expr) return env.lookupOrMutObject(expr);
    if (node) return env.lookupOrMutObject(node.assigne as MemberExpr, evaluate(node.value, env));
    
    throw `Evaluating a member expression is not possible without a member or assignment expression.`
}