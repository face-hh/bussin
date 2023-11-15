import { readFileSync } from "fs";
import axios from 'axios';
const geoip = require('geoip-lite');

// fuck off typescript
declare global {
    interface String {
        replace_fr(target: string, replacement: string): string;
    }
}

interface Currency {
    code: string;
    currency: {
        symbol: string,
    };
    language: {
        code: string,
    };
}

String.prototype.replace_fr = function (target: string, replacement: string): string {
    const pattern = new RegExp('(?<![\'"`])\\b' + target + '\\b(?!["\'`])', 'g');
    
    return this.replace(pattern, replacement);
}

const currencies = JSON.parse(readFileSync('./src/utils/currencies.json', 'utf-8'))

async function get_currency() {
    const { country } = await get_country();
    const currency = currencies.find((el: Currency) => el.code === country)

    return currency.currency.symbol;
}

async function get_country() {
    const response = await axios.get('https://api64.ipify.org?format=json');
    const ip = response.data.ip;
    const geo = await geoip.lookup(ip);

    return geo;
}

export async function transcribe(code: string) {
    const currency = await get_currency();

    return code
        .replace_fr("ass", '!')
        .replace_fr("dick", ';')
        .replace_fr("penis", '=')
        .replace_fr("fuck", 'let')
        .replace_fr("nigger", 'const')
        .replace_fr("nigga", 'println')
        .replace_fr("motherfucker", 'if')
        .replace_fr("sex", 'else')
        .replace_fr("sexy", '!=')
        .replace_fr("shit", '==')
        .replace_fr("bitch", '&&')
        .replace_fr("mafaka", '|')
        .replace_fr("fuckyou", 'fn')
        .replace_fr("dickfuck", 'math')
        .replace_fr("slaybitch", 'for')
        .replace_fr("breast", '<')
        .replace_fr("boob", '>')
        .replace_fr("tits", 'true')
        .replace_fr("titty", 'false')
        .replace_fr("boobs", 'try')
        .replace_fr("meat", 'catch')
        .replace_fr("sack", 'exec')
        .replace_fr("nutsack", 'input')
        .replace(/\: number/g, '')
        .replace(/\: string/g, '')
        .replace(/\: object/g, '')
        .replace(/\: boolean/g, '')
        .replace(new RegExp(`${currency}{}`), '${}')
}
