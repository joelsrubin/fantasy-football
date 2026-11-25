export type H2HManager = {
  guid: string;
  nickname: string;
};

export type H2HRecord = {
  wins: number;
  losses: number;
  ties: number;
};

export type H2HCell = H2HRecord | null;

export type H2HMatrix = {
  managers: H2HManager[];
  cells: H2HCell[][];
};

export type H2HManagerInput = {
  id: number;
  guid: string;
  nickname: string;
};

export type H2HMatchupInput = {
  team1ManagerId: number;
  team2ManagerId: number;
  winnerManagerId: number | null;
  isTie: boolean;
};

function emptyRecord(): H2HRecord {
  return { wins: 0, losses: 0, ties: 0 };
}

export function formatH2HRecord(record: H2HRecord): string {
  if (record.ties > 0) {
    return `${record.wins}–${record.losses}–${record.ties}`;
  }
  return `${record.wins}–${record.losses}`;
}

export function buildH2HMatrix(
  managers: H2HManagerInput[],
  matchups: H2HMatchupInput[],
): H2HMatrix {
  const indexById = new Map<number, number>();
  managers.forEach((manager, index) => {
    indexById.set(manager.id, index);
  });

  const n = managers.length;
  const cells: H2HCell[][] = Array.from({ length: n }, () => Array.from({ length: n }, () => null));

  for (const matchup of matchups) {
    const row = indexById.get(matchup.team1ManagerId);
    const col = indexById.get(matchup.team2ManagerId);
    if (row === undefined || col === undefined || row === col) {
      continue;
    }

    if (matchup.isTie) {
      const a = cells[row][col] ?? emptyRecord();
      const b = cells[col][row] ?? emptyRecord();
      a.ties += 1;
      b.ties += 1;
      cells[row][col] = a;
      cells[col][row] = b;
      continue;
    }

    if (matchup.winnerManagerId == null) {
      continue;
    }

    const winnerIndex = indexById.get(matchup.winnerManagerId);
    if (winnerIndex !== row && winnerIndex !== col) {
      continue;
    }

    const loserIndex = winnerIndex === row ? col : row;
    const winnerCell = cells[winnerIndex][loserIndex] ?? emptyRecord();
    const loserCell = cells[loserIndex][winnerIndex] ?? emptyRecord();
    winnerCell.wins += 1;
    loserCell.losses += 1;
    cells[winnerIndex][loserIndex] = winnerCell;
    cells[loserIndex][winnerIndex] = loserCell;
  }

  return {
    managers: managers.map(({ guid, nickname }) => ({ guid, nickname })),
    cells,
  };
}
