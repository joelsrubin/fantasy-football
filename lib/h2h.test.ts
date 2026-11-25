import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildH2HMatrix, formatH2HRecord } from "./h2h";

const managers = [
  { id: 1, guid: "joel", nickname: "Joel" },
  { id: 2, guid: "noah", nickname: "Noah" },
  { id: 3, guid: "ben", nickname: "Ben" },
];

describe("buildH2HMatrix", () => {
  it("returns null cells when nobody has played", () => {
    const matrix = buildH2HMatrix(managers, []);
    assert.deepEqual(
      matrix.managers.map((m) => m.guid),
      ["joel", "noah", "ben"],
    );
    assert.equal(matrix.cells[0][0], null);
    assert.equal(matrix.cells[0][1], null);
    assert.equal(matrix.cells[1][0], null);
  });

  it("records a win from the row manager's perspective", () => {
    const matrix = buildH2HMatrix(managers, [
      { team1ManagerId: 1, team2ManagerId: 2, winnerManagerId: 1, isTie: false },
    ]);
    assert.deepEqual(matrix.cells[0][1], { wins: 1, losses: 0, ties: 0 });
    assert.deepEqual(matrix.cells[1][0], { wins: 0, losses: 1, ties: 0 });
    assert.equal(matrix.cells[0][0], null);
  });

  it("counts ties both ways", () => {
    const matrix = buildH2HMatrix(managers, [
      { team1ManagerId: 1, team2ManagerId: 2, winnerManagerId: null, isTie: true },
    ]);
    assert.deepEqual(matrix.cells[0][1], { wins: 0, losses: 0, ties: 1 });
    assert.deepEqual(matrix.cells[1][0], { wins: 0, losses: 0, ties: 1 });
  });

  it("skips unfinished matchups", () => {
    const matrix = buildH2HMatrix(managers, [
      { team1ManagerId: 1, team2ManagerId: 2, winnerManagerId: null, isTie: false },
    ]);
    assert.equal(matrix.cells[0][1], null);
  });

  it("skips managers not on the axis", () => {
    const matrix = buildH2HMatrix(managers, [
      { team1ManagerId: 1, team2ManagerId: 99, winnerManagerId: 1, isTie: false },
    ]);
    assert.equal(matrix.cells[0][1], null);
    assert.equal(matrix.cells[0][2], null);
  });

  it("accumulates multiple games", () => {
    const matrix = buildH2HMatrix(managers, [
      { team1ManagerId: 1, team2ManagerId: 2, winnerManagerId: 1, isTie: false },
      { team1ManagerId: 2, team2ManagerId: 1, winnerManagerId: 2, isTie: false },
      { team1ManagerId: 1, team2ManagerId: 2, winnerManagerId: 1, isTie: false },
    ]);
    assert.deepEqual(matrix.cells[0][1], { wins: 2, losses: 1, ties: 0 });
    assert.deepEqual(matrix.cells[1][0], { wins: 1, losses: 2, ties: 0 });
  });
});

describe("formatH2HRecord", () => {
  it("omits ties when there are none", () => {
    assert.equal(formatH2HRecord({ wins: 8, losses: 3, ties: 0 }), "8–3");
  });

  it("includes ties when present", () => {
    assert.equal(formatH2HRecord({ wins: 8, losses: 3, ties: 1 }), "8–3–1");
  });
});
