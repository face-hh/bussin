import { Stmt } from "../frontend/ast";
import Environment from "./environment";

export type ValueType = "null" | "number" | "boolean" | "object" | "native-fn" | "fn" | "string" | "array";

export interface RuntimeVal {
    type: ValueType;
}

export interface NullVal extends RuntimeVal {
    type: "null";
    value: null;
}

export interface BooleanVal extends RuntimeVal {
    type: "boolean";
    value: boolean;
}

export interface NumberVal extends RuntimeVal {
    type: "number";
    value: number;
}

export interface StringVal extends RuntimeVal {
    type: "string";
    value: string;
}

export interface ObjectVal extends RuntimeVal {
    type: "object";
    properties: Map<string, RuntimeVal>;
}

export interface ArrayVal extends RuntimeVal {
    type: "array";
    values: RuntimeVal[];
}


export interface FunctionValue extends RuntimeVal {
    type: "fn";
    name: string;
    parameters: string[];
    declarationEnv: Environment;
    body: Stmt[];
}

export type FunctionCall = (args: RuntimeVal[], env: Environment) => RuntimeVal;

export interface NativeFnValue extends RuntimeVal {
    type: "native-fn";
    call: FunctionCall;
}
export function MK_NATIVE_FN(call: FunctionCall): NativeFnValue {
    return { type: "native-fn", call } as NativeFnValue;
}

export function MK_NUMBER(n = 0): NumberVal {
    return { type: "number", value: n } as NumberVal;
}

export function MK_NULL(): NullVal {
    return { type: "null", value: null } as NullVal;
}

export function MK_BOOL(b = true): BooleanVal {
    return { type: "boolean", value: b } as BooleanVal;
}

export function MK_STRING(val: string): StringVal {
    return { type: "string", value: val } as StringVal;
}

export function MK_OBJECT(obj: Map<string, RuntimeVal>): ObjectVal {
    return { type: "object", properties: obj } as ObjectVal;
}

export function MK_ARRAY(arr: RuntimeVal[]): ArrayVal {
    return { type: "array", values: arr } as ArrayVal;
}