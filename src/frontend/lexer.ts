// https://github.com/tlaceby/guide-to-interpreters-series
// -----------------------------------------------------------
// ---------------          LEXER          -------------------
// ---  Responsible for producing tokens from the source   ---
// -----------------------------------------------------------

// Represents tokens that our language understands in parsing.
export enum TokenType {
    // Literal Types
    Number,
    Identifier,
    String,
    // Keywords
    Let,
    Const,
    Fn,
    If,
    Else,
    For,

    // Grouping * Operators
    Backslash, // \
    BinaryOperator,
    Equals, // =
    Comma, // ,
    Colon, // :
    Semicolon, // ;
    Dot, // .
    OpenParen, // (
    CloseParen, // )
    OpenBrace, // {
    CloseBrace, // }
    OpenBracket, // [
    CloseBracket, // ]
    Quotation, // "
    Greater, // >
    Lesser, // <
    EqualsCompare, // ==
    NotEqualsCompare, // !=
    Exclamation, // !
    And, // &&
    Ampersand, // &
    Bar, // |
    EOF, // Signified the end of file.
}

/**
 * Constant lookup for keywords and known identifiers + symbols.
 */
const KEYWORDS: Record<string, TokenType> = {
    let: TokenType.Let,
    const: TokenType.Const,
    fn: TokenType.Fn,
    if: TokenType.If,
    else: TokenType.Else,
    for: TokenType.For,
};

// Reoresents a single token from the source-code.
export interface Token {
    value: string; // contains the raw value as seen inside the source code.
    type: TokenType; // tagged structure.
}

// Returns a token of a given type and value
function token(value = "", type: TokenType): Token {
    return { value, type };
}

/**
 * Returns whether the character passed in alphabetic -> [a-zA-Z] and _
 */
function isalpha(src: string) {
    return /^[A-Za-z_]+$/.test(src);
}

/**
 * Returns true if the character is whitespace like -> [\s, \t, \n]
 */
function isskippable(str: string) {
    return str == " " || str == "\n" || str == "\t" || str == '\r';
}

/**
 Return whether the character is a valid integer -> [0-9]
 */
function isint(str: string) {
    const c = str.charCodeAt(0);
    const bounds = ["0".charCodeAt(0), "9".charCodeAt(0)];
    return c >= bounds[0] && c <= bounds[1];
}

/**
 * Given a string representing source code: Produce tokens and handles
 * possible unidentified characters.
 *
 * - Returns a array of tokens.
 * - Does not modify the incoming string.
 */
export function tokenize(sourceCode: string): Token[] {
    const tokens = new Array<Token>();
    const src = sourceCode.split("");

    // produce tokens until the EOF is reached.
    while (src.length > 0) {
        // BEGIN PARSING ONE CHARACTER TOKENS
        if (src[0] == "(") {
            tokens.push(token(src.shift(), TokenType.OpenParen));
        else if (src[0] == "\\") {
            tokens.push(token(src.shift(), TokenType.Backslash))
        } else if (src[0] == ")") {
            tokens.push(token(src.shift(), TokenType.CloseParen));
        } else if (src[0] == "{") {
            tokens.push(token(src.shift(), TokenType.OpenBrace));
        } else if (src[0] == "}") {
            tokens.push(token(src.shift(), TokenType.CloseBrace));
        } else if (src[0] == "[") {
            tokens.push(token(src.shift(), TokenType.OpenBracket));
        } else if (src[0] == "]") {
            tokens.push(token(src.shift(), TokenType.CloseBracket));
        } // HANDLE BINARY OPERATORS
        else if (src[0] == "+" || src[0] == "-" || src[0] == "*" || src[0] == "%" || src[0] == "/") {
            tokens.push(token(src.shift(), TokenType.BinaryOperator));
        } // Handle Conditional & Assignment Tokens
        else if (src[0] == "<") {
            tokens.push(token(src.shift(), TokenType.Lesser));
        } else if (src[0] == ">") {
            tokens.push(token(src.shift(), TokenType.Greater));
        } else if (src[0] == ".") {
            tokens.push(token(src.shift(), TokenType.Dot));
        } else if (src[0] == ";") {
            tokens.push(token(src.shift(), TokenType.Semicolon));
        } else if (src[0] == ":") {
            tokens.push(token(src.shift(), TokenType.Colon));
        } else if (src[0] == ",") {
            tokens.push(token(src.shift(), TokenType.Comma));
        } else if (src[0] == "|") {
            tokens.push(token(src.shift(), TokenType.Bar));
        } // HANDLE MULTICHARACTER KEYWORDS, TOKENS, IDENTIFIERS ETC...
        else {
            // Handle numeric literals -> Integers
            if (isint(src[0])) {
                let num = "";
                while (src.length > 0 && isint(src[0])) {
                    num += src.shift();
                }

                // append new numeric token.
                tokens.push(token(num, TokenType.Number));
            } else if (src[0] == '=') {
                src.shift()
                if (src[0] == '=') {
                    src.shift()
                    tokens.push(token("==", TokenType.EqualsCompare));
                } else {
                    tokens.push(token("=", TokenType.Equals));
                }
            } else if (src[0] == '&') {
                src.shift()
                if (src[0] == '&') {
                    src.shift()
                    tokens.push(token("&&", TokenType.And));
                } else {
                    tokens.push(token("&", TokenType.Ampersand));
                }
            } else if (src[0] == '!') {
                src.shift();

                if (String(src[0]) == '=') {
                    src.shift()
                    tokens.push(token("!=", TokenType.NotEqualsCompare));
                } else {
                    tokens.push(token("!", TokenType.Exclamation));
                }
            } else if (src[0] == '"') {
                let str = "";
                src.shift();

                while (src.length > 0 && src[0] !== '"') {
                    str += src.shift();
                }

                src.shift();

                // append new string token.
                tokens.push(token(str, TokenType.String));
            } // Handle Identifier & Keyword Tokens.
            else if (isalpha(src[0])) {
                let ident = "";
                while (src.length > 0 && isalpha(src[0])) {
                    ident += src.shift();
                }

                // CHECK FOR RESERVED KEYWORDS
                const reserved = KEYWORDS[ident];
                // If value is not undefined then the identifier is
                // reconized keyword
                if (typeof reserved == "number") {
                    tokens.push(token(ident, reserved));
                } else {
                    // Unreconized name must mean user defined symbol.
                    tokens.push(token(ident, TokenType.Identifier));
                }
            } else if (isskippable(src[0])) {
                // Skip uneeded chars.
                src.shift();
            } // Handle unreconized characters.
            // TODO: Impliment better errors and error recovery.
            else {
                console.error(
                    "Unreconized character found in source: ",
                    src[0].charCodeAt(0),
                    src[0]
                );
                process.exit(1);
            }
        }
    }

    tokens.push({ type: TokenType.EOF, value: 'EndOfFile' })

    return tokens;
}
