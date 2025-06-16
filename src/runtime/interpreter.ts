import { MK_NULL, NumberVal, RuntimeVal, StringVal } from "./values";
import { ArrayLiteral, AssignmentExpr, BinaryExpr, CallExpr, ClassDeclarationStmt, EnumDeclarationStmt, ForStatement, FunctionDeclaration, Identifier, IfStatement, MatchExpr, MemberExpr, NewExpr, NumericLiteral, ObjectLiteral, Program, ReturnStmt, Stmt, StringLiteral, ThrowStmt, TryCatchStatement, VarDeclaration, WhileStmt } from "../frontend/ast";
import Environment, { ContinueType } from "./environment"
import { eval_function_declaration, eval_program, eval_val_declaration, eval_if_statement, eval_for_statement, eval_try_catch_statement, eval_class_declaration, eval_enum_declaration, eval_while_statement } from "./eval/statements";
import { eval_identifier, eval_binary_expr, eval_assignment, eval_object_expr, eval_call_expr, eval_member_expr, eval_array_expr, eval_new_expr, eval_match_expr } from "./eval/expressions"
import { ClassDeclaration, ReturnStatement, ThrowStatement, WhileStatement } from "typescript";


export function evaluate(astNode: Stmt, env: Environment): RuntimeVal {
    switch (astNode.kind) {

        case "Program":
            return eval_program(astNode as Program, env);
        case "NumericLiteral":
            return { value: ((astNode as NumericLiteral).value), type: "number" } as NumberVal;
        case "StringLiteral":
            return { value: ((astNode as StringLiteral).value), type: "string" } as StringVal;
        case "Identifier":
            return eval_identifier(astNode as Identifier, env);
        case "ObjectLiteral":
            return eval_object_expr(astNode as ObjectLiteral, env);
        case "ArrayLiteral":
            return eval_array_expr(astNode as ArrayLiteral, env);
        case "CallExpr":
            return eval_call_expr(astNode as CallExpr, env);
        case "AssignmentExpr":
            return eval_assignment(astNode as AssignmentExpr, env);
        case "BinaryExpr":
            return eval_binary_expr(astNode as BinaryExpr, env);
        case "IfStatement":
            return eval_if_statement(astNode as IfStatement, env);
        case "ForStatement":
            return eval_for_statement(astNode as ForStatement, env);
        case "MemberExpr":
            return eval_member_expr(env, undefined, astNode as MemberExpr);
        case "TryCatchStatement":
            return eval_try_catch_statement(env, astNode as TryCatchStatement);
        case "NewExpr":
            return eval_new_expr(astNode as NewExpr, env);
        case "MatchExpr":
            return eval_match_expr(astNode as MatchExpr, env);

        // Handle statements
        case "VarDeclaration":
            return eval_val_declaration(astNode as VarDeclaration, env);
        case "FunctionDeclaration":
            return eval_function_declaration(astNode as FunctionDeclaration, env);
        case "ThrowStatement": {
            throw evaluate((astNode as ThrowStmt).value, env);
        }
        case "ReturnStatement": {
            const value = evaluate((astNode as ReturnStmt).value, env);
            env.exitWith = value;
            return value;
        }
        case "ClassDeclaration":
            return eval_class_declaration(astNode as ClassDeclarationStmt, env);
        case "EnumDeclaration":
            return eval_enum_declaration(astNode as EnumDeclarationStmt, env)
        case "WhileStatement":
            return eval_while_statement(astNode as WhileStmt, env);
        case "BreakStatement": {
            if (!env.canContinue) {
                throw "Can only break in while and for loops.";
            }
            env.contin = ContinueType.Break;
            return MK_NULL();
        }
        case "ContinueStatement": {
            if (!env.canContinue) {
                throw "Can only continue in while and for loops.";
            }
            env.contin = ContinueType.Continue;
            return MK_NULL();
        }
        default:
            console.error("This AST node has not yet been setup for interpretation", astNode);
            process.exit(0)
    }
}