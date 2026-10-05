import { siguienteCodigo } from "../../../src/shared/domain/codigo";

describe("siguienteCodigo", () => {
	it("usa el prefijo indicado y continúa desde el mayor", () => {
		expect(siguienteCodigo("EQ-", [])).toBe("EQ-001");
		expect(siguienteCodigo("EQ-", ["EQ-002", "EQ-010", "CLI-050"])).toBe("EQ-011");
	});
});
