import { Database } from "./../../definitions/database-definition";
import { MetadataTable } from "./../../metadata-table";
import { InsertColumnsBuilder } from "./../columns-builder";
import { CrudBase } from "./../crud-base";
import { InsertBuilder } from "./insert-builder";

export class Insert<T> extends CrudBase<T, InsertBuilder<T>, InsertColumnsBuilder<T>> {

    constructor(
        typeT: new () => T,
        modelToSave: T,
        metadata: MetadataTable<T>,
        alias: string = void 0,
        database: Database = void 0,
        enableLog: boolean = true,
    ) {
        super(new InsertBuilder(typeT, metadata, alias, modelToSave), database, enableLog);
    }

    public columns(columnsCallback: (columns: InsertColumnsBuilder<T>) => void): Insert<T> {
        this._builder.columns(columnsCallback);
        return this;
    }
}