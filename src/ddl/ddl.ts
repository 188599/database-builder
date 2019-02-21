import { Drop } from "./drop/drop";
import { Create } from "./create/create";
import { Alter } from "./alter/alter";
import { DatabaseBase } from "../definitions/database-definition";
import { DatabaseBuilderError } from "../core/errors";
import { GetMapper } from "../mapper/interface-get-mapper";
import { MapperTable } from "../mapper-table";

export class Ddl {

    constructor(
        private _database: DatabaseBase = void 0,
        private _mappersTable: GetMapper,
        public enableLog: boolean = true) {
    }

    public create<T>(
        typeT: new () => T,
        mapperTable: MapperTable = this._mappersTable.get(typeT).mapperTable,
        database: DatabaseBase = this.getDatabase()
    ): Create<T> {
        return new Create(typeT, mapperTable, database, this.enableLog);
    }

    public alter<T>(
        typeT: new () => T,
        database: DatabaseBase = this.getDatabase()
    ): Alter<T> {
        return new Alter(typeT, database, this.enableLog);
    }

    public drop<T>(
        typeT: new () => T,
        mapperTable: MapperTable = this._mappersTable.get(typeT).mapperTable,
        database: DatabaseBase = this.getDatabase()
    ): Drop<T> {
        return new Drop(typeT, mapperTable, database, this.enableLog);
    }

    private getDatabase() {
        if (!this._database) {
            throw new DatabaseBuilderError("Transaction ou Database not specified in query.");
        }
        return this._database;
    }
}
