import { readFileSync } from "fs";
import axios from 'axios';
const geoip = require('geoip-lite');

interface Currency {
    code: string;
    currency: {
        symbol: string,
    };
    language: {
        code: string,
    };
}

// @ts-ignore
String.prototype.replace_fr = function (target: string, replacement: string): string {
    const pattern = new RegExp(`\\b${target}\\b(?=(?:(?:[^"]*"){2})*[^"]*$)`, 'g');
    
    return this.replace(pattern, replacement);
}

const rightsideCurrencies = [
    "€", // Euro
    "£", // British Pound
    "CHF", // Swiss Franc
    "kr", // Danish Krone, Norwegian Krone, Swedish Krona
    "zł", // Polish Zloty
    "Ft", // Hungarian Forint
    "Kč", // Czech Koruna
    "kn", // Croatian Kuna
    "RSD", // Serbian Dinar
    "лв", // Bulgarian Lev
    "lei", // Romanian Leu
    "₽", // Russian Ruble
    "₺", // Turkish Lira
    "₴" // Ukrainian Hryvnia
];   

// @ts-ignore
String.prototype.replace_currency = function (currency: string): string {
    const pattern = new RegExp(`${rightsideCurrencies.includes(currency) ? "{}" + currency : currency + "{}"}`, 'g');

    return this.replace(pattern, "${}");
}

const currencies = JSON.parse(readFileSync('./src/utils/currencies.json', 'utf-8'))

export async function get_currency() {
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

export function transcribe(code: string, currency: string) {
    return code
        // @ts-ignore
        .replace_fr(";", '!')
        .replace_fr("rn", ';')
        .replace_fr("be", '=')
        .replace_fr("lit", 'let')
        .replace_fr("mf", 'const')
        .replace_fr("waffle", 'println')
        .replace_fr("sus", 'if')
        .replace_fr("fake", 'null')
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
        .replace_fr("yap", 'input')
        .replace_fr("minus", "-")
        .replace_fr("plus", "+")
        .replace_fr("minusminus", "--")
        .replace_fr("plusplus", "++")
        .replace_fr("times", "*")
        .replace_fr("divided by", "/")
        .replace_fr("bye", "exit")
        .replace_fr("hollup", "setTimeout")
        .replace_fr("yappacino", "setInterval")
        .replace_fr("beplus", "+=")
        .replace_fr("beminus", "-=")
        .replace_fr("betimes", "*=")
        .replace_fr("bedivided", "/=")
        .replace(/\: number/g, '')
        .replace(/\: string/g, '')
        .replace(/\: object/g, '')
        .replace(/\: boolean/g, '')
        .replace_currency(currency);
}