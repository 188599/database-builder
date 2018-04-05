import { assert, expect } from "chai";
import { TestClazz } from "./models/test-clazz";
import { Query } from "..";
import { OrderBy } from "../core/enums/order-by";

describe("Order By", () => {

    it("none", () => {
        const query = new Query(TestClazz);
        const result = query.compile();
        expect(result.params.length).to.equal(0);
        expect(result.query).to.equal("SELECT tes.* FROM TestClazz AS tes");
    });

    it("simple", () => {
        const query = new Query(TestClazz);
        query.orderBy(x => x.id);
        const result = query.compile();
        expect(result.params.length).to.equal(0);
        expect(result.query).to.equal("SELECT tes.* FROM TestClazz AS tes ORDER BY tes.id ASC");
    });

    it("multi", () => {
        const query = new Query(TestClazz);
        query.orderBy(x => x.id);
        query.orderBy(x => x.referenceTest.id);
        query.orderBy(x => x.description);
        const result = query.compile();
        expect(result.params.length).to.equal(0);
        expect(result.query).to.equal("SELECT tes.* FROM TestClazz AS tes ORDER BY tes.id ASC, tes.referenceTest_id ASC, tes.description ASC");
    });

    it("asc", () => {
        const query = new Query(TestClazz);
        query.asc(x => x.id);
        const result = query.compile();
        expect(result.params.length).to.equal(0);
        expect(result.query).to.equal("SELECT tes.* FROM TestClazz AS tes ORDER BY tes.id ASC");
    });

    it("desc", () => {
        const query = new Query(TestClazz);
        query.desc(x => x.id);
        const result = query.compile();
        expect(result.params.length).to.equal(0);
        expect(result.query).to.equal("SELECT tes.* FROM TestClazz AS tes ORDER BY tes.id DESC");
    });

    it("multi order", () => {
        const query = new Query(TestClazz);
        query.desc(x => x.id);
        query.asc(x => x.referenceTest.id);
        query.orderBy(x => x.description, OrderBy.DESC);
        const result = query.compile();
        expect(result.params.length).to.equal(0);
        expect(result.query).to.equal("SELECT tes.* FROM TestClazz AS tes ORDER BY tes.id DESC, tes.referenceTest_id ASC, tes.description DESC");
    });

});