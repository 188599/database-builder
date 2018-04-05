import { DatabaseHelper } from "./../database-helper";
import { LambdaExpression } from "lambda-expression";
import { ExpressionOrColumn, Utils, ValueType, ValueTypeToParse } from "./../core/utils";
import { QueryCompilable } from "../core/query-compilable";
import { WhereCompiled } from "./where-compiled";
import { Condition } from "./enums/condition";
import { LambdaMetadata } from "../core/lambda-metadata";
import { DatabaseBuilderError } from "../core/errors";
import { ColumnRef } from "../core/column-ref";

export interface WhereBaseBuilderContract<T, TExpression, TWhere extends WhereBaseBuilderContract<T, TExpression, TWhere>> {

    ref(column: string, alias?: string): ColumnRef;

    not(): TWhere;

    and(): TWhere;

    or(): TWhere;

    scope(
        scopeCallback: (scope: TWhere) => void,
    ): TWhere;

    /**
     * @deprecated Use `equal`
     * @param expression
     * @param column
     */
    equalColumn(
        expression: TExpression,
        column: string,
    ): TWhere;

    /**
     * @deprecated use `equal`
     */
    equalValue(
        expression: TExpression,
        value: ValueTypeToParse,
    ): TWhere;

    equal(
        expression1: TExpression,
        expression2: TExpression,
    ): TWhere;

    /**
     * @deprecated use `like`
     */
    likeValue(
        expression: TExpression,
        value: string,
    ): TWhere;

    like(
        expression1: TExpression,
        expression2: TExpression,
    ): TWhere;

    contains(
        expression: TExpression,
        value: string
    ): TWhere;

    startsWith(
        expression: TExpression,
        value: string,
    ): TWhere;

    endsWith(
        expression: TExpression,
        value: string,
    ): TWhere;

    isNull(
        expression1: TExpression,
    ): TWhere;

    /**
     * @deprecated use `great`
     */
    greatValue(
        expression: TExpression,
        value: ValueTypeToParse,
    ): TWhere;

    great(
        expression1: TExpression,
        expression2: TExpression,
    ): TWhere;

    /**
     * @deprecated use `greatAndEqual`
     */
    greatAndEqualValue(
        expression: TExpression,
        value: ValueTypeToParse,
    ): TWhere;

    greatAndEqual(
        expression1: TExpression,
        expression2: TExpression,
    ): TWhere;

    /**
     * @deprecated use `less`
     */
    lessValue(
        expression: TExpression,
        value: ValueTypeToParse,
    ): TWhere;

    less(
        expression1: TExpression,
        expression2: TExpression,
    ): TWhere;

    /**
     * @deprecated use `lessAndEqual`
     */
    lessAndEqualValue(
        expression: TExpression,
        value: ValueTypeToParse,
    ): TWhere;

    lessAndEqual(
        expression1: TExpression,
        expression2: TExpression,
    ): TWhere;

    /**
     * @deprecated use `between`
     */
    betweenValue(
        expression: TExpression,
        value1: ValueTypeToParse,
        value2: ValueTypeToParse,
    ): TWhere;

    between(
        expression: TExpression,
        value1: ValueTypeToParse,
        value2: ValueTypeToParse,
    ): TWhere;

    /**
     * @deprecated use `in`
     */
    inValues(
        expression: TExpression,
        values: ValueTypeToParse[],
    ): TWhere;

    in(
        expression: TExpression,
        valuesOrQuery: ValueTypeToParse[] | QueryCompilable,
    ): TWhere;

    /**
     * @deprecated use `in`
     */
    inSelect(
        expression: TExpression,
        query: QueryCompilable,
    ): TWhere;

    compile(): WhereCompiled;

    expression(expression: LambdaExpression<T>): TWhere;
}