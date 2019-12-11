import { Utils } from "../core/utils";
import { DatabaseResult } from "../definitions/database-definition";
import { SqlCompilable } from "../crud/sql-compilable";
import { TransactionStatus } from "./transaction-status";
import { DatabaseBuilderError } from "../core";
import { SqlExecutable } from "../crud/sql-executable";
import { SingleTransactionManager } from "./single-transaction-manager";
import { Observable } from "rxjs";

/**
 * Manages better and homogeneous transaction between providers
 */
export class ManagedTransaction {

    private _idTransaction: string;
    private _status: TransactionStatus = TransactionStatus.OPEN;
    private _stack: Array<{ statement: string, params: any }> = [];

    /**
     * return transaction id
     */
    get id(): string {
        return this._idTransaction;
    }

    /**
     * Set transaction status
     */
    private set status(value: TransactionStatus) {
        this._status = value;
    }

    constructor(
        private _database: {
            sqlBatch(sqlStatements: Array<(string | string[] | any)>): Promise<DatabaseResult[]>,
            executeSql(statement: string, params: any): Promise<DatabaseResult>;
        },
        private _singleTransactionManager: SingleTransactionManager
    ) {
        this._idTransaction = `transaction_${Utils.GUID().replace(/-/g, "_")}`;
    }

    /**
     * Add command statement in transaction
     * @param statement command to apply
     * @param params command params
     */
    public addStatement(statement: string, params: any): void {
        this.checkTransactionActive();
        this._stack.push({ statement, params });
    }

    /**
     * Add command compilable in transaction
     * @param compilable command compilable for add in transaction
     */
    public add(compilable: SqlCompilable & { __allowInTransaction: boolean }): void {
        const compiled = compilable.compile();
        compiled.forEach(c => this.addStatement(c.query, c.params));
    }

    /**
     * @deprecated Será removido, pois não tem utilidade real e não funciona de forma homegenea entre providers
     * @param executable
     */
    public async executeImmediate(executable: SqlExecutable): Promise<DatabaseResult[]> {
        this.checkTransactionActive();
        await this.beginTransaction();
        await this.executeStack();
        return executable.execute().toPromise();
    }

    /**
     * Commit a transaction
     */
    public commit(): Observable<boolean> {
        if (this._singleTransactionManager) {
            return this._singleTransactionManager.commitOnStack(
                this.commitExecuteObservable()
            );
        }
        return this.commitExecuteObservable();
    }

    /**
     * Rollback in current transaction
     */
    public async rollback(): Promise<boolean> {
        this.checkTransactionActive();
        if (this._status === TransactionStatus.STARTED
            || this._status === TransactionStatus.RELEASED) {
            this.addStatement(this.commandRollbackTransaction(), []);
            await this.executeStack();
        }
        return this.finishTransaction(TransactionStatus.ROLLBACKED);
    }

    /**
     * Commit a transaction
     */
    private commitExecuteObservable(): Observable<boolean> {
        return new Observable<boolean>(observer => {
            this.commitExecute()
                .then(result => {
                    observer.next(result);
                    observer.complete();
                }).catch(error => {
                    observer.error(error);
                });
        });
    }
    /**
     * Commit a transaction
     */
    private async commitExecute(): Promise<boolean> {
        this.checkTransactionActive();
        if (this._status === TransactionStatus.STARTED
            || this._status === TransactionStatus.RELEASED) {
            this.addStatement(this.commandCommitTransaction(), []);
            await this.executeStack();
        } else {
            // if (savePointName) {
            //     await this.beginTransaction();
            //     return await this.commitExecute(savePointName);
            // }
            const batch = this.buildSqlBatch(this._stack);
            this.clearStackTransaction();
            this.status = TransactionStatus.STARTED;
            await this._database.sqlBatch(batch);
        }
        return this.finishTransaction(TransactionStatus.COMMITED);
    }
    // /**
    //  * Commit a transaction
    //  * @param savePointName @deprecated Será removido pois não funciona bem em todos os contextos
    //  */
    // public async commit(savePointName?: string): Promise<boolean> {
    //     this.checkTransactionActive();
    //     if (this._status === TransactionStatus.STARTED
    //         || this._status === TransactionStatus.RELEASED) {
    //         this.addStatement(this.commandCommitTransaction(savePointName), []);
    //         await this.executeStack();
    //     } else {
    //         if (savePointName) {
    //             await this.beginTransaction();
    //             return await this.commit(savePointName);
    //         }
    //         const batch = this.buildSqlBatch(this._stack);
    //         this.clearStackTransaction();
    //         this.status = TransactionStatus.STARTED;
    //         await this._database.sqlBatch(batch);
    //     }
    //     return this.finishTransaction(
    //         savePointName
    //             ? TransactionStatus.RELEASED
    //             : TransactionStatus.COMMITED
    //     );
    // }

    // /**
    //  * @deprecated Será removido pois não funciona bem em todos os contextos
    //  * @param savePointName
    //  */
    // public createSavePoint(savePointName: string): void {
    //     this.addStatement(this.formatSavePoint(savePointName), []);
    // }

    /**
     * Execute stack in Database
     */
    private async executeStack(): Promise<void> {
        if (this._stack.length > 0) {
            const batch = this.buildSqlExecute(this._stack);
            await this._database.executeSql(batch.statement, batch.params);
            this.clearStackTransaction();
        }
    }

    /**
     * check transaction is active (open, stated, released) and throw error if inactive
     */
    private checkTransactionActive(): void {
        if (!this.isTransactionActive()) {
            throw new DatabaseBuilderError(`Transaction (id: ${this._idTransaction}) is no longer active, and can no longer be used`);
        }
    }

    /**
     * return true if transaction is active (open, stated, released)
     */
    private isTransactionActive(): boolean {
        return this._status === TransactionStatus.OPEN
            || this._status === TransactionStatus.STARTED
            || this._status === TransactionStatus.RELEASED;
    }

    /**
     * Finish transaction and set status
     * @param status Status for finished transaction
     */
    private finishTransaction(status: TransactionStatus.ROLLBACKED | TransactionStatus.COMMITED | TransactionStatus.RELEASED): boolean {
        this.status = status;
        this.clearStackTransaction();
        return true;
    }

    /**
     * Clear stack transaction
     */
    private clearStackTransaction() {
        this._stack = [];
    }

    /**
     * Convert Array commands for SqlBatch format
     * @param compiled Array commands
     */
    private buildSqlBatch(compiled: Array<{ statement: string, params: any }>): any[] {
        return compiled.map(x => {
            const r = x.params.length > 0
                ? [x.statement, x.params]
                : x.statement;
            return r;
        });
    }

    /**
     * Convert Array commands for SqlExecute format
     * @param compiled Array commands
     */
    private buildSqlExecute(compiled: Array<{ statement: string, params: any }>): { statement: string, params: any } {
        return compiled.reduce(
            (previous, current) => {
                previous.statement += `${current.statement};`;
                previous.params = [...previous.params, ...current.params];
                return previous;
            },
            { statement: "", params: [] }
        );
    }

    /**
     * Begin transaction
     */
    private async beginTransaction(): Promise<DatabaseResult> {
        if (this._status === TransactionStatus.STARTED) {
            return Promise.resolve(void 0);
        }
        const result = await this._database.executeSql("BEGIN TRANSACTION", []);
        this.status = TransactionStatus.STARTED;
        return result;
    }

    /**
     * Command commit transaction
     */
    private commandCommitTransaction(): string {
        return "COMMIT TRANSACTION";
    }

    /**
     * Command roolback transaction
     */
    private commandRollbackTransaction(): string {
        return "ROLLBACK TRANSACTION";
    }

    // /**
    //  * @deprecated Será removido pois não funciona bem em todos os contextos
    //  */
    // private formatSavePoint(savePointName: string): string {
    //     return `SAVEPOINT "${savePointName}"`;
    // }
}