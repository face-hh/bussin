import { RuntimeVal, StringVal, NumberVal, BooleanVal, NullVal, ObjectVal, FunctionValue, NativeFnValue } from '../values'

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
        case "object":
            let obj: { [key: string]: any } = {};
            const aObj = arg as ObjectVal;
            aObj.properties.forEach((value, key) => {
                obj[key] = matchType(value);
            })

            return obj;
        case 'fn':
            const fn = arg as FunctionValue;

            return {
                name: fn.name,
                body: fn.body,
                internal: false,
            }
        default:
            return arg;
    }
}