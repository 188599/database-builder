import { Expression, ExpressionUtils, ReturnExpression } from "lambda-expression";
import { Utils, ValueTypeToParse } from "./core/utils";
import { MapperTable } from "./mapper-table";
import { DatabaseHelper } from "./database-helper";
import { MapperColumn } from "./mapper-column";
import { FieldType } from "./core/enums/field-type";
import { PrimaryKeyType } from "./core/enums/primary-key-type";
import { GetMapper } from "./mapper/interface-get-mapper";
import { DatabaseBuilderError } from "./core/errors";
import { DEPENDENCY_LIST_SIMPLE_COLUMNS, DependencyListSimpleModel } from "./definitions/dependency-definition";

export class MetadataTable<T> {

    public instance: T;

    public mapperTable: MapperTable;

    private _autoMapperCalled = false;

    private _expressionUtils: ExpressionUtils = new ExpressionUtils();

    constructor(
        public newable: new () => T,
        private _databaseHelper: DatabaseHelper,
        private _getMapper: GetMapper,
        public readOnly: boolean = false
    ) {
        this.instance = new newable();
        this.mapperTable = new MapperTable(newable.name);
    }

    public column<TReturn>(
        expression: ReturnExpression<TReturn, T>,
        type?: new () => TReturn,
        primaryKeyType?: PrimaryKeyType
    ): MetadataTable<T> {
        const column = this.columnName(expression);
        this.mapperTable.addColumn(
            column,
            type
                ? this._databaseHelper.getFieldType(type)
                : this.getTypeByExpression(this.instance, this.validExpressionMapper(this.instance, expression)),
            primaryKeyType
        );
        return this;
    }

    public hasMany<TArray, TReturn extends TArray[]>(
        expression: ReturnExpression<TReturn, T>,
        type: new () => TArray,
        tableName: string,
    ): MetadataTable<T> {
        const column = this.columnName(expression);
        this.addDependency(
            column,
            FieldType.ARRAY | this._databaseHelper.getFieldType(type),
            tableName
        );
        return this;
    }

    public referenceKey<TKey, TReturn>(
        expression: ReturnExpression<TKey, T>,
        expressionKey: ReturnExpression<TReturn, TKey>,
        type?: new () => TReturn
    ): MetadataTable<T> {
        const columnReference = this.columnName(expression);
        const columnKey = this.columnName(expressionKey);
        const column = `${columnReference}_${columnKey}`;
        const instance = this.validInstanceMapper(this.instance, column);
        const referenceInstance = this.validExpressionMapper(instance, expression)(instance);
        this.addReference(
            column,
            type
                ? this._databaseHelper.getFieldType(type)
                : this.getTypeByExpression(referenceInstance, this.validExpressionMapper(referenceInstance, expressionKey)));
        return this;
    }

    public reference<TReturn>(
        expression: ReturnExpression<TReturn, T>,
        type?: new () => TReturn
    ): MetadataTable<T> {
        const column = this.columnName(expression);
        this.mapperReference(this.validInstanceMapper(type ? new type() : expression(this.instance), column), column);
        return this;
    }

    public key<TReturn>(
        expression: ReturnExpression<TReturn, T>,
        primaryKeyType: PrimaryKeyType = PrimaryKeyType.AutoIncrement,
        type?: new () => TReturn
    ): MetadataTable<T> {
        if (this._autoMapperCalled) {
            throw new DatabaseBuilderError(`Mapper '${this.newable.name}', column key must be informed before the call to 'autoMapper()'`);
        }
        return this.column(
            expression, type,
            primaryKeyType
        );
    }

    public ignore<TReturn>(
        expression: ReturnExpression<TReturn, T>
    ): MetadataTable<T> {
        const instanceExpression = this.validExpressionMapper(this.instance, expression)(this.instance);
        const mapperColumn =
            instanceExpression && (!this._databaseHelper.isTypeSimple(instanceExpression as any))
                ? this.getMapperColumnReference(this.instance, this.columnName(expression))
                : new MapperColumn(this.columnName(expression));
        if (mapperColumn) {
            this.mapperTable.removeColumn(mapperColumn.column);
        }
        return this;
    }

    public autoMapper(
        references: boolean = true,
        referencesId: boolean = true,
        referencesIdRecursive: boolean = true
    ): MetadataTable<T> {
        if (this.keyColumns().length === 0) {
            throw new DatabaseBuilderError(`Mapper '${this.newable.name}', no column as key was informed to the Mapper`);
        }
        this.autoMapperColumns(references, referencesId, referencesIdRecursive);
        this._autoMapperCalled = true;
        return this;
    }

    protected getTypeByValue(value: ValueTypeToParse): FieldType {
        return this._databaseHelper.getType(value);
    }

    private validInstanceMapper<TType>(instance: TType, propertyMapperForMessage: string): TType {
        if (instance === void 0) {
            throw new DatabaseBuilderError(`Mapper: ${this.newable.name}, can not get instance of mapped property ('${propertyMapperForMessage}')`);
        }
        return instance;
    }

    private validExpressionMapper<TReturn, TType>(
        instance: TType, expression: ReturnExpression<TReturn, TType>
    ): ReturnExpression<TReturn, TType> {
        if (expression === void 0 || expression(instance) === void 0) {
            throw new DatabaseBuilderError(`Mapper: ${this.newable.name}, can not get instance of mapped property ('${this.columnName(expression)}')`);
        }
        return expression;
    }

    private columnName<TReturn, TType>(expression: ReturnExpression<TReturn, TType>): string {
        return this._expressionUtils.getColumnByExpression(expression, "_");
    }

    private getTypeByExpression<TType>(instance: any, expression: Expression<TType>): FieldType {
        return this._databaseHelper.getType(
            this._databaseHelper.getValue(
                instance, this._expressionUtils.getColumnByExpression(expression, ".")
            )
        );
    }

    private getMapper(keyMapper: string) {
        return this._getMapper.get(keyMapper);
    }

    private keyColumns(): MapperColumn[] {
        return this.mapperTable.columns.filter(x => !!x.primaryKeyType);
    }

    private isKeyColumn(key: string) {
        return (this.keyColumns().filter(x => x.column === key).length > 0);
    }

    private autoMapperColumns(
        references: boolean = true,
        referencesId: boolean = true,
        referencesIdRecursive: boolean = true
    ): void {
        for (const key in this.instance) {
            if (key !== "constructor" && typeof this.instance[key] !== "function") {
                if (
                    this._databaseHelper.isTypeSimple(this.instance[key] as any)
                    || references
                ) {
                    if (!this.isKeyColumn(key)) {
                        this.mapperTable.addColumn(key, this.getTypeByValue(this.instance[key] as any));
                    }
                }
            }
        }
        if (referencesId) {
            this.autoColumnsModelReferencesRecursive(this.instance, "", referencesIdRecursive);
        }
    }

    private addReference(
        name: string,
        fieldType: FieldType
    ) {
        this.mapperTable.addColumn(
            name,
            fieldType
        );
    }

    private mapperReference<TRef>(
        instanceMapper: TRef,
        propertyName: string,
        ascendingRefName: string = "",
    ) {
        const mapperColumn = this.getMapperColumnReference(instanceMapper, propertyName);
        if (mapperColumn) {
            this.addReference(
                `${ascendingRefName}${mapperColumn.column}`,
                mapperColumn.fieldType
            );
        }
    }

    private getMapperColumnReference<TRef>(
        instanceMapper: TRef,
        propertyName: string
    ): MapperColumn {
        if (this._databaseHelper.isTypeSimple(instanceMapper as any)) {
            throw new DatabaseBuilderError(`Mapper '${this.newable.name}', it is not allowed to map property '${propertyName}' of type '${instanceMapper.constructor.name}' as a reference. For it is not of a composite type (Ex: object)`);
        }
        const mapperKey = this.getMapper(instanceMapper.constructor.name);
        if (mapperKey !== void 0) {
            if (mapperKey.keyColumns() === void 0 || mapperKey.keyColumns().length < 1) {
                throw new DatabaseBuilderError(`Mapper '${this.newable.name}', not key column for property '${propertyName}' of type '${instanceMapper.constructor.name}'`);
            }
            if (mapperKey.keyColumns().length > 1) {
                throw new DatabaseBuilderError(`Mapper '${this.newable.name}', composite Id not supported (property '${propertyName}' of type '${instanceMapper.constructor.name}')`);
            }
            const keyMapped = mapperKey.keyColumns()[0];
            return new MapperColumn(
                `${propertyName}_${keyMapped.column}`,
                keyMapped.fieldType
            );
        } else {
            if (!this._databaseHelper.isTypeIgnoredInMapper(instanceMapper as any)) {
                throw new DatabaseBuilderError(`Mapper '${this.newable.name}', key '${propertyName}' of type '${instanceMapper.constructor.name}' not before mapped`);
            }
        }
        return void 0;
    }

    private autoColumnsModelReferencesRecursive(
        instanceMapper: any,
        ascendingRefName: string,
        recursive: boolean
    ) {
        for (const key in instanceMapper) {
            if (instanceMapper.hasOwnProperty(key)) {
                const keyInstanceMapper = instanceMapper[key];

                if (key !== "constructor" && typeof keyInstanceMapper !== "function") {
                    if (!this._databaseHelper.isTypeSimple(keyInstanceMapper)) {
                        this.mapperReference(keyInstanceMapper, key, ascendingRefName);
                    }
                    if (recursive && !this._databaseHelper.isTypeSimple(keyInstanceMapper as any)) {
                        this.autoColumnsModelReferencesRecursive(
                            keyInstanceMapper,
                            `${ascendingRefName}${key}_`,
                            recursive);
                    }
                }
            }
        }
    }

    // private hasColumn(columnName: string): boolean {
    //     return this.getColumn(columnName) !== void 0;
    // }

    // private getColumn(columnName: string): MapperColumn {
    //     return this.mapperTable.columns.find(x => x.column === columnName);
    // }

    // private removeColumn(columnName: string) {
    //     if (this.hasColumn(columnName)) {
    //         const index = this.mapperTable.columns.findIndex(x => x.column === columnName);
    //         if (index > -1) {
    //             this.mapperTable.columns.splice(index, 1);
    //         }
    //     }
    // }

    // private isDependencyTable(type: FieldType) {
    //     if (
    //         Utils.isFlag(type, FieldType.ARRAY) &&
    //         type !== FieldType.ARRAY
    //     ) {
    //         return true;
    //     }
    //     return false;
    // }

    // private add(
    //     mapperColumn: MapperColumn
    // ) {
    //     if (Utils.isFlag(mapperColumn.fieldType, FieldType.NULL)) {
    //         throw new DatabaseBuilderError(`Mapper: ${this.newable.name}, can not get instance of mapped column ('${mapperColumn.column}')`);
    //     }
    //     if (this.hasColumn(mapperColumn.column)) {
    //         throw new DatabaseBuilderError(`Mapper: ${this.newable.name}, duplicate column: '${mapperColumn.column}'`);
    //     }
    //     this.mapperTable.columns.push(mapperColumn);
    // }

    // private addColumn(
    //     name: string,
    //     fieldType: FieldType,
    //     primaryKeyType?: PrimaryKeyType
    // ) {
    //     this.add(
    //         new MapperColumn(
    //             name, fieldType, void 0,
    //             primaryKeyType
    //         )
    //     );
    // }

    private addDependency(
        name: string,
        fieldType: FieldType,
        tablename: string
    ) {
        this.mapperTable.addColumn(name, fieldType, void 0, void 0, tablename);
        const dependency = new MapperTable(tablename);
        fieldType &= ~FieldType.ARRAY;
        dependency.addColumn(DEPENDENCY_LIST_SIMPLE_COLUMNS.INDEX, FieldType.NUMBER, PrimaryKeyType.Assigned,
            Utils.getFieldExpression<DependencyListSimpleModel>(x => x.index));
        dependency.addColumn(DEPENDENCY_LIST_SIMPLE_COLUMNS.VALUE, fieldType, void 0,
            Utils.getFieldExpression<DependencyListSimpleModel>(x => x.value));
        const keyColumns = this.keyColumns();
        if (keyColumns.length < 1) {
            throw new DatabaseBuilderError(`It is not possible to create a dependency mapper ("${name}") if the primary key of the parent entity ("${this.mapperTable.tableName}") is not yet mapped.`);
        }
        if (keyColumns.length > 1) {
            throw new DatabaseBuilderError(`Dependency mapper ("${name}") not support relation with entity ("${this.mapperTable.tableName}") with composite key [${keyColumns.join(", ")}]!`);
        }
        dependency.addColumn(
            DEPENDENCY_LIST_SIMPLE_COLUMNS.REFERENCE(this.mapperTable.tableName, keyColumns[0].column),
            keyColumns[0].fieldType, PrimaryKeyType.Assigned,
            Utils.getFieldExpression<DependencyListSimpleModel>(x => x.reference));
        // dependency.addColumn(`${this.mapperTable.tableName}_${keyColumns[0].column}`, keyColumns[0].fieldType, PrimaryKeyType.Assigned);
        this.mapperTable.dependencies.push(dependency);
    }
}
