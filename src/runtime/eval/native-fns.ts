import { RuntimeVal, StringVal, NumberVal, BooleanVal, NullVal, ObjectVal, FunctionValue, ArrayVal, MK_NULL, MK_BOOL, MK_NUMBER, MK_OBJECT, MK_STRING, MK_ARRAY } from '../values'

export function printValues(args: Array<RuntimeVal>) {
    for (let i = 0; i < args.length; i++) {
        const arg = args[i];

        console.log(runtimeToJS(arg));
    }
}

export function runtimeToJS(arg: RuntimeVal) {
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
            aObj.properties.forEach((value, key) => obj[key] = runtimeToJS(value));
            return obj;
        }
        case "array": {
            const arr: unknown[] = [];
            const aArr = arg as ArrayVal;
            aArr.values.forEach(value => arr.push(runtimeToJS(value)));
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

export function jsToRuntime(val: unknown): RuntimeVal {
    if(val == null) return MK_NULL();

    switch(typeof val) {
        case "boolean":
            return MK_BOOL(val);
        case "bigint":
        case "number":
            return MK_NUMBER(val as number);
        case "string":
            return MK_STRING(val);
        case "object": {
            if(Array.isArray(val)) {
                const arr: RuntimeVal[] = [];
                val.forEach(value => {
                    arr.push(jsToRuntime(value));
                });
                return MK_ARRAY(arr);
            }
            const prop = new Map<string, RuntimeVal>();
            Object.keys(val as Record<string, unknown>).forEach(key => {
                prop.set(key, jsToRuntime((val as Record<string, unknown>)[key]));
            });
            return MK_OBJECT(prop);
        }

        // undefined -- also includes the edge cases of function and symbol which shouldn't appear but oh well
        default:
            return MK_NULL();

        // i implemented 'function' type long before this function; unnecessary for our current implementation tho. Works for importing any node module :))))
        /*case "function":
            if (val.prototype && val.prototype.constructor === val) {
                // If it's a constructor, return a function that creates a new instance
                return MK_NATIVE_FN((args) => {
                    const newArgs: unknown[] = args ? args.map(convertFromRuntimeVal) : [];
                    // Use the 'new' keyword to create a new instance
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    const newObj = new (val as any)(...newArgs);
                    Object.keys(val.prototype).forEach(key => {
                        const descriptor = Object.getOwnPropertyDescriptor(val.prototype, key);
                        if(descriptor.set) {
                            descriptor.set(val.prototype[key]);
                        } else if (descriptor.get) { // case for get() but no set()
                            delete newObj[key];
                            Object.defineProperty(newObj, key, { value: () => descriptor.get(), configurable: false, writable: false, enumerable: true });
                        } else {
                            newObj[key] = val.prototype[key];
                        }
                    });
                    return convertToRuntimeVal(newObj);
                });
            }
            // If it's not a constructor, return a regular function
            return MK_NATIVE_FN((args) => {
                const newArgs: unknown[] = args ? args.map(convertFromRuntimeVal) : [];
                return convertToRuntimeVal(val(...newArgs));
            });*/
    }
}