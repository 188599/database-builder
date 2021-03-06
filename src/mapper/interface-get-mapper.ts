import { MetadataTable } from "../metadata-table";

export interface GetMapper {

    get<T>(tKey: (new () => T) | string): MetadataTable<T>;

    forEachMapper(
        callbackfn: (
            value: MetadataTable<any>,
            key: string,
            map: Map<string, MetadataTable<any>>
        ) => void,
        thisArg?: any
    ): void;
}
