import { RuntimeVal, StringVal, NumberVal, BooleanVal, NullVal, ObjectVal, FunctionValue, ArrayVal } from '../values'

export function printValues(args: Array<RuntimeVal>) {
    for (let i = 0; i < args.length; i++) {
        const arg = args[i];

        console.log(matchType(arg));
    }
}

export function matchType(arg: RuntimeVal) {
    switch (arg.type) {
        case "string":
            return (arg as StringVal).value;
        case "number":
            return (arg as NumberVal).value;
        case "boolean":
            return (arg as BooleanVal).value;
        case "null":
            return (arg as NullVal).value;
        case "object": {
            const obj: { [key: string]: unknown } = {};
            const aObj = arg as ObjectVal;
            aObj.properties.forEach((value, key) => {
                obj[key] = matchType(value);
            });
            return obj;
        }
        case "array": {
            const arr: unknown[] = [];
            const aArr = arg as ArrayVal;
            aArr.values.forEach(value => {
                arr.push(matchType(value));
            });
            return arr;
        }
        case 'fn': {
            const fn = arg as FunctionValue;
            return fn.name == "<anonymous>" ? `[Function (anonymous)]` : `[Function: ${fn.name}]`; // definitely not stolen from javascript
        }
        case "native-fn": {
            return `[Native Function]`;
        }
        default:
            return arg;
    }
}