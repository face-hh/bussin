import { ArrayLiteral, AssignmentExpr, BinaryExpr, CallExpr, Identifier, MatchExpr, MemberExpr, NewExpr, ObjectLiteral } from "../../frontend/ast";
import Environment from "../environment";
import { evaluate } from "../interpreter";
import { NumberVal, RuntimeVal, MK_NULL, ObjectVal, NativeFnValue, FunctionValue, BooleanVal, StringVal, NullVal, MK_NUMBER, MK_BOOL, ArrayVal, ClassFunctionValue, ClassValue, StaticClassValue, EnumValue } from "../values";

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
    if (func.type == 'class-function') {
        scope.declareVar('this', (func as ClassFunctionValue).parent, false);
    }

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
        if (scope.exitWith != null) {
            result = scope.exitWith;
            break;
        }
    }

    scope.exitWith = null;
    return result;
}

export function eval_new_expr(expr: NewExpr, env: Environment): RuntimeVal {
    const _target = evaluate(expr.target, env);
    if (_target.type != 'static-class') {
        throw `Can only instantiate static classes (got ${_target.type})`;
    }
    const target = _target as StaticClassValue;
    const fields = new Map();
    target.fields.forEach((v, k) => {
        fields.set(k, MK_NULL());
    });

    const base = {
        type: "class",
        parent: target,
        fields,
        funs: new Map(),
    } as ClassValue;

    target.funs.forEach((v,k) => {
        v.parent = base;
        base.funs.set(k, v);
    });

    if (base.funs.has('constructor')) {
        eval_function(base.funs.get('constructor') as ClassFunctionValue, expr.args.map(arg => evaluate(arg, env)));
    }

    return base;
}

export function eval_match_expr(expr: MatchExpr, env: Environment): RuntimeVal {
    const scope = new Environment(env);
    let matchee = evaluate(expr.value, scope);
    let matchee_str = JSON.stringify(matchee);
    let result: RuntimeVal = MK_NULL();
    let matched = false;

    expr.cases.forEach((v,k) => {
        if (matched) {
            return;
        }

        let dst_var = undefined;

        for (const key of k) {
            if (key.kind == 'CallExpr' && (key as CallExpr).args.length == 1 && (key as CallExpr).args[0].kind == 'Identifier') { // Potential Enum.Tagged(var) syntax
                const left = evaluate((key as CallExpr).caller, scope);
                if (left.type == 'enum' && matchee.type == 'enum' && (matchee as EnumValue).tagged != undefined) {
                    dst_var = ((key as CallExpr).args[0] as Identifier).symbol;
                    matched = true;
                    break;
                }
                continue;
            }
            // Normal enum matching will match on the matchee string :)
            const val = evaluate(key, scope);
            if (JSON.stringify(val) == matchee_str) {
                matched = true;
                break;
            }
        }
        
        if (matched) {
            if (dst_var != undefined) {
                scope.declareVar(dst_var, (matchee as EnumValue).tagged, false);
            }
            for (const stmt of v) {
                result = evaluate(stmt, scope);
                if (scope.exitWith != null) {
                    result = scope.exitWith;
                    break;
                }
            }
        }
    });

    if ((!matched) && expr.defaultCase != undefined) {
        for (const stmt of expr.defaultCase) {
            result = evaluate(stmt, scope);
            if (scope.exitWith != null) {
                result = scope.exitWith;
                break;
            }
        }
    }

    return result;
}

export function eval_call_expr(expr: CallExpr, env: Environment): RuntimeVal {
    const args = expr.args.map(arg => evaluate(arg, env));
    const fn = evaluate(expr.caller, env);

    if(fn != null) {
        switch (fn.type) {
            case 'native-fn':
                return (fn as NativeFnValue).call(args, env);
            case 'fn':
            case 'class-function': {
                const func = fn as FunctionValue;
                return eval_function(func, args);
            }
            case 'enum': {
                if (args.length != 1) {
                    throw `Tagging an enum requires one argument in the call expression, but got ${args.length} arguments.`;
                }
                const clone: EnumValue = {...(fn as EnumValue)};
                clone.tagged = args[0];
                return clone;
            }
        }
    }

    throw "Cannot call value that is not a function or enum: " + JSON.stringify(fn);
}

export function eval_member_expr(env: Environment, node?: AssignmentExpr, expr?: MemberExpr): RuntimeVal {
    if (expr) return env.lookupOrMutObject(expr);
    if (node) return env.lookupOrMutObject(node.assigne as MemberExpr, evaluate(node.value, env));
    
    throw `Evaluating a member expression is not possible without a member or assignment expression.`
}