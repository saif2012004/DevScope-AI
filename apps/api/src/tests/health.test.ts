import request from "supertest";
import { app } from "../index";

describe("GET /api/health", () => {
  it("returns 200 and { status: ok }", async () => {
    const res = await request(app).get("/api/health").expect(200);
    expect(res.body).toMatchObject({ status: "ok" });
  });
});
