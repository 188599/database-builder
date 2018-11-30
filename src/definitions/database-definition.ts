
export type DatabaseBase = DatabaseTransaction | DatabaseObject | DatabaseBaseTransaction;

export interface DatabaseBaseTransaction {
    executeSql(
        sql: string,
        values: any
    ): Promise<DatabaseResult>;
    // executeSql: (
    //     sql: string,
    //     values: any,
    //     success: (tx: DatabaseBaseTransaction, result: DatabaseResult) => void,
    //     error: (tx: DatabaseBaseTransaction, error: any) => void,
    // ) => void;
}

// tslint:disable-next-line:no-empty-interface
export interface DatabaseTransaction extends DatabaseBaseTransaction {
    // start: () => void;
    // addStatement: (sql: any, values: any, success: () => void, error: () => void) => void;
    // handleStatementSuccess: (handler: () => void, response: any) => void;
    // handleStatementFailure: (handler: () => void, response: any) => void;
    // run: () => void;
    // abort: (txFailure: any) => void;
    // finish: () => void;
    // abortFromQ: (sqlerror: any) => void;
}

export interface DatabaseObject {
    // addTransaction(transaction: (tx: DatabaseBaseTransaction) => void): void;
    /**
     * @param fn {any}
     * @returns {Promise<any>}
     */
    transaction(fn: (transaction: DatabaseBaseTransaction) => void): Promise<any>;
    // /**
    //  * @param fn {() => void}
    //  * @returns {Promise<any>}
    //  */
    // readTransaction(fn: (transaction: DatabaseBaseTransaction) => void): Promise<any>;
    // startNextTransaction(): void;
    /**
     * Execute SQL on the opened database. Note, you must call `create` first, and
     * ensure it resolved and successfully opened the database.
     */
    executeSql(statement: string, params: any): Promise<DatabaseResult>;
    // /**
    //  * @param sqlStatements {Array<string | string[] | any>}
    //  * @returns {Promise<any>}
    //  */
    // sqlBatch(sqlStatements: Array<string | string[] | any>): Promise<any>;
    // abortallPendingTransactions(): void;
}

export interface DatabaseResult {
    rows: DatabaseRowList;
    rowsAffected: number;
    insertId: any;
}

export interface DatabaseRowList {
    length: number;
    item(index: number): any;
}
