import { ProjectionModel } from './../crud/projection-model';
import { Projection } from "../crud/enums/projection";
import { ExpressionOrColumn, Utils } from "./utils";
export class ProjectionsUtils<T> {

    public static readonly WILDCARD = "*";

    private _pendingProjections: Projection[] = [];

    constructor(
        private _aliasTable: string,
        private _addAliasTableToAlias: boolean = false,
        private _addAliasDefault: boolean = true,
        private _registerProjetionCallback?: (projection: ProjectionModel) => void
    ) {
    }

    public apply<TReturn>(
        expression?: ExpressionOrColumn<TReturn, T>,
        projections: Projection[] = [],
        alias?: string,
        args?: any[]
    ): ProjectionModel {
        return this.checkApply(expression, projections, alias, args);
    }

    public create(
        column: string,
        projections: Projection[] = [],
        alias: string = this.defaultAliasAs(column),
        args: any[] = []
    ): ProjectionModel {
        return this.createProjection(projections,
            this.addAliasTable(column), alias, args);
    }

    private _apply<TReturn>(
        expression: ExpressionOrColumn<TReturn, T>,
        projections: Projection[] = [],
        alias?: string,
        args?: any[]
    ): ProjectionModel {
        return this.register(
            this.create(Utils.getColumn(expression),
                projections, alias, args)
        );
    }

    private checkApply<TReturn>(
        expression?: ExpressionOrColumn<TReturn, T>,
        projections: Projection[] = [],
        alias?: string,
        args?: any[]
    ): ProjectionModel {
        if (Utils.isNull(expression)) {
            projections.forEach(projection => {
                this._pendingProjections.unshift(projection);
            });
            return void 0;
        } else {
            this._pendingProjections.forEach(projection => {
                projections.unshift(projection);
            });
            this._pendingProjections = [];
            return this._apply(expression, projections, alias, args);
        }
    }

    private register(projection: ProjectionModel): ProjectionModel {
        if (this._registerProjetionCallback) {
            this._registerProjetionCallback(projection);
        }
        return projection;
    }

    private createProjection(
        projection: Projection[],
        column: string,
        alias: string = this.defaultAliasAs(column),
        args: any[],
    ): ProjectionModel {
        if (!Utils.isNull(projection)) {
            return this.buildColumn(this.builderProjections(projection, column, args), alias);
        }
        return this.buildColumn(column, alias);
    }

    private defaultAliasAs(column: string): string {
        if (column === ProjectionsUtils.WILDCARD || !this._addAliasDefault) {
            return "";
        }
        return this._addAliasTableToAlias
            ? `${this._aliasTable}_${column}`
            : column;
    }

    private addAliasTable(
        column: string,
    ): string {
        if (Utils.isNameColumn(column)) {
            return `${this._aliasTable}.${column}`;
        }
        return column;
    }

    private builderProjections(
        projections: Projection[],
        column: string,
        args: any[],
    ): string {
        let result = `${column}${this.buildArgs(args)}`;
        // reverse loop array
        for (let index = projections.length - 1; index >= 0; index--) {
            const projection = projections[index];
            result = this.builderProjection(projection, result);
        }
        return result;
    }

    private builderProjection(
        projection: Projection,
        core: string
    ): string {
        return `${projection}(${core})`;
    }

    private buildArgs(
        args: any[] = [],
    ): string {
        return args.length ? ", " + args.join("") : "";
    }

    private buildColumn(
        column: string,
        alias: string = this.defaultAliasAs(column),
    ): ProjectionModel {
        if (alias && alias.length) {
            return new ProjectionModel(`${column} AS ${alias}`, []);
        }
        return new ProjectionModel(column, []);
    }
}
