import { readFileSync } from "fs";
import axios from 'axios';

// fuck off typescript
declare global {
    interface String {
        replace_fr(target: string, replacement: string): string;
    }
}

String.prototype.replace_fr = function (target: string, replacement: string): string {
    const pattern = new RegExp('(?<![\'"`])\\b' + target + '\\b(?!["\'`])', 'g');
    
    return this.replace(pattern, replacement);
}

export async function transcribe(code: string, bsx: boolean) {
    if (bsx) {
        return code
            .replace_fr("rn", ';')
            .replace_fr(";", '!')
            .replace_fr("be", '=')
            .replace_fr("lit", 'let')
            .replace_fr("mf", 'const')
            .replace_fr("waffle", 'println')
            .replace_fr("sus", 'if')
            .replace_fr("impostor", 'else')
            .replace_fr("nah", '!=')
            .replace_fr("fr", '==')
            .replace_fr("btw", '&&')
            .replace_fr("carenot", '|')
            .replace_fr("bruh", 'fn')
            .replace_fr("nerd", 'math')
            .replace_fr("yall", 'for')
            .replace_fr("smol", '<')
            .replace_fr("thicc", '>')
            .replace_fr("nocap", 'true')
            .replace_fr("cap", 'false')
            .replace_fr("fuck_around", 'try')
            .replace_fr("find_out", 'catch')
            .replace_fr("clapback", 'exec')
            .replace(/\: number/g, '')
            .replace(/\: string/g, '')
            .replace(/\: object/g, '')
            .replace(/\: boolean/g, '')
            .replace(/(€|£|¥|ƒ|лв|៛|₡|kn|Kč|kr|₵|Q|Ft|₹|﷼|₪|с|₭|ден|RM|UM|₨|₮|د.م.|Ks|C\$|₦|₩|ر.ع.|K|₲|S\/\.|₱|zł|ر.ق|lei|₽|T|Db|ر.س|дин\.|Rs|ЅМ|฿|د.إ|₫|ZK)\{\}/g, '${}')
            .replace(/\{\}($|€|£|¥|ƒ|лв|៛|₡|kn|Kč|kr|₵|Q|Ft|₹|﷼|₪|с|₭|ден|RM|UM|₨|₮|د.م.|Ks|C\$|₦|₩|ر.ع.|K|₲|S\/\.|₱|zł|ر.ق|lei|₽|T|Db|ر.س|дин\.|Rs|ЅМ|฿|د.إ|₫|ZK)/g, '${}')
    } else {
        return code
            .replace(/\: number/g, '')
            .replace(/\: string/g, '')
            .replace(/\: object/g, '')
            .replace(/\: boolean/g, '')
            .replace(/(€|£|¥|ƒ|лв|៛|₡|kn|Kč|kr|₵|Q|Ft|₹|﷼|₪|с|₭|ден|RM|UM|₨|₮|د.م.|Ks|C\$|₦|₩|ر.ع.|K|₲|S\/\.|₱|zł|ر.ق|lei|₽|T|Db|ر.س|дин\.|Rs|ЅМ|฿|د.إ|₫|ZK)\{\}/g, '${}')
            .replace(/\{\}($|€|£|¥|ƒ|лв|៛|₡|kn|Kč|kr|₵|Q|Ft|₹|﷼|₪|с|₭|ден|RM|UM|₨|₮|د.م.|Ks|C\$|₦|₩|ر.ع.|K|₲|S\/\.|₱|zł|ر.ق|lei|₽|T|Db|ر.س|дин\.|Rs|ЅМ|฿|د.إ|₫|ZK)/g, '${}')
    }
}
