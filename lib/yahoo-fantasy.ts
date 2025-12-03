const YAHOO_FANTASY_API_BASE = "https://fantasysports.yahooapis.com/fantasy/v2";

// Cache revalidation times (in seconds) for Next.js fetch
const REVALIDATE = {
  LEAGUE: 300, // 5 minutes - league info rarely changes
  STANDINGS: 120, // 2 minutes - standings update after games
  SCOREBOARD: 60, // 1 minute - scores update during games
  ROSTER: 120, // 2 minutes - rosters can change with lineup moves
};

export interface YahooLeague {
  league_key: string;
  league_id: string;
  name: string;
  url: string;
  logo_url?: string;
  draft_status: string;
  num_teams: number;
  scoring_type: string;
  current_week: number;
  start_week: string;
  end_week: string;
  game_code: string;
  season: string;
}

export interface YahooTeam {
  team_key: string;
  team_id: string;
  name: string;
  url: string;
  team_logos?: { url: string }[];
  waiver_priority: number;
  number_of_moves: number;
  number_of_trades: number;
  roster_adds?: {
    coverage_type: string;
    coverage_value: number;
    value: number;
  };
  league_scoring_type: string;
  managers?: YahooManager[];
}

export interface YahooManager {
  manager_id: string;
  nickname: string;
  is_current_login: boolean;
  email?: string;
  image_url?: string;
}

export interface YahooPlayer {
  player_key: string;
  player_id: string;
  name: {
    full: string;
    first: string;
    last: string;
    ascii_first: string;
    ascii_last: string;
  };
  editorial_team_abbr: string;
  display_position: string;
  position_type: string;
  status?: string;
  status_full?: string;
  injury_note?: string;
  image_url?: string;
  headshot?: {
    url: string;
    size: string;
  };
  uniform_number?: string;
  bye_weeks?: { week: string };
}

export interface YahooPlayerStats {
  player: YahooPlayer;
  player_points?: {
    total: number;
    coverage_type: string;
    week?: number;
    season?: number;
  };
  player_stats?: {
    coverage_type: string;
    week?: number;
    stats: { stat_id: string; value: string }[];
  };
}

export interface YahooTeamStandings {
  team: YahooTeam;
  team_standings?: {
    rank: number;
    playoff_seed?: number;
    outcome_totals: {
      wins: number;
      losses: number;
      ties: number;
      percentage: number;
    };
    points_for: number;
    points_against: number;
  };
  team_points?: {
    coverage_type: string;
    total: number;
  };
}

export interface YahooMatchup {
  week: string;
  week_start: string;
  week_end: string;
  status: string;
  is_playoffs: boolean;
  is_consolation: boolean;
  teams: YahooTeamStandings[];
  winner_team_key?: string;
}

export interface YahooRosterPlayer extends YahooPlayer {
  selected_position?: {
    position: string;
    coverage_type: string;
    week?: number;
  };
  player_points?: {
    total: number;
    coverage_type: string;
    week?: number;
  };
}

class YahooFantasyAPI {
  private accessToken: string;

  constructor(accessToken: string) {
    this.accessToken = accessToken;
  }

  private async request<T>(endpoint: string, revalidate?: number): Promise<T> {
    const url = `${YAHOO_FANTASY_API_BASE}${endpoint}`;

    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
        Accept: "application/json",
      },
      next: revalidate ? { revalidate, tags: ["yahoo-api"] } : undefined,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Yahoo API Error: ${response.status} - ${errorText}`);
    }

    return response.json();
  }

  /**
   * Get league details by league key
   */
  async getLeague(leagueKey: string): Promise<YahooLeague | null> {
    const data = await this.request<Record<string, unknown>>(
      `/league/${leagueKey}?format=json`,
      REVALIDATE.LEAGUE,
    );
    const leagues = this.parseLeagueResponse(data);
    return leagues[0] || null;
  }

  /**
   * Get all teams in a league with standings
   */
  async getLeagueStandings(leagueKey: string): Promise<YahooTeamStandings[]> {
    const data = await this.request<Record<string, unknown>>(
      `/league/${leagueKey}/standings?format=json`,
      REVALIDATE.STANDINGS,
    );
    return this.parseStandings(data);
  }

  /**
   * Get all teams in a league
   */
  async getLeagueTeams(leagueKey: string): Promise<YahooTeam[]> {
    const data = await this.request<Record<string, unknown>>(
      `/league/${leagueKey}/teams?format=json`,
      REVALIDATE.LEAGUE,
    );
    return this.parseTeams(data);
  }

  /**
   * Get team roster with stats for a specific week
   */
  async getTeamRoster(teamKey: string, week?: number): Promise<YahooRosterPlayer[]> {
    const weekParam = week ? `;week=${week}` : "";
    const data = await this.request<Record<string, unknown>>(
      `/team/${teamKey}/roster${weekParam}/players/stats?format=json`,
      REVALIDATE.ROSTER,
    );
    return this.parseRoster(data);
  }

  /**
   * Get scoreboard for a league for a specific week
   */
  async getLeagueScoreboard(leagueKey: string, week: number): Promise<YahooMatchup[]> {
    const data = await this.request<Record<string, unknown>>(
      `/league/${leagueKey}/scoreboard;week=${week}?format=json`,
      REVALIDATE.SCOREBOARD,
    );
    return this.parseScoreboard(data);
  }

  /**
   * Get all matchups for the entire season
   */
  async getLeagueMatchups(leagueKey: string): Promise<YahooMatchup[]> {
    const data = await this.request<Record<string, unknown>>(
      `/league/${leagueKey}/scoreboard?format=json`,
      REVALIDATE.SCOREBOARD,
    );
    return this.parseScoreboard(data);
  }

  // Parser helpers for Yahoo's complex JSON structure
  private parseLeagueResponse(data: Record<string, unknown>): YahooLeague[] {
    const leagues: YahooLeague[] = [];
    try {
      const fantasy = data.fantasy_content as Record<string, unknown>;
      const league = fantasy?.league as unknown[];
      if (league?.[0]) {
        leagues.push(this.mapLeague(league[0] as Record<string, unknown>));
      }
    } catch {
      console.error("Error parsing league response");
    }
    return leagues;
  }

  private mapLeague(data: Record<string, unknown>): YahooLeague {
    return {
      league_key: data.league_key as string,
      league_id: data.league_id as string,
      name: data.name as string,
      url: data.url as string,
      logo_url: data.logo_url as string | undefined,
      draft_status: data.draft_status as string,
      num_teams: data.num_teams as number,
      scoring_type: data.scoring_type as string,
      current_week: parseInt(data.current_week as string, 10),
      start_week: data.start_week as string,
      end_week: data.end_week as string,
      game_code: data.game_code as string,
      season: data.season as string,
    };
  }

  private parseTeams(data: Record<string, unknown>): YahooTeam[] {
    const teams: YahooTeam[] = [];
    try {
      const fantasy = data.fantasy_content as Record<string, unknown>;
      const league = fantasy?.league as unknown[];
      if (league?.[1]) {
        const teamsData = league[1] as Record<string, unknown>;
        const teamsCount = teamsData?.count as number;

        for (let i = 0; i < teamsCount; i++) {
          const teamData = (teamsData?.[i.toString()] as Record<string, unknown>)
            ?.team as unknown[];
          if (teamData?.[0]) {
            teams.push(this.mapTeam(teamData[0] as unknown[]));
          }
        }
      }
    } catch {
      console.error("Error parsing teams");
    }
    return teams;
  }

  private mapTeam(data: unknown[]): YahooTeam {
    // Yahoo returns team data as an array of objects that need to be flattened
    const flatData: Record<string, unknown> = {};
    for (const item of data) {
      if (typeof item === "object" && item !== null) {
        Object.assign(flatData, item);
      }
    }

    // Parse team_logos - Yahoo nests it as [{team_logo: {url, size}}]
    let teamLogos: { url: string }[] | undefined;
    const rawLogos = flatData.team_logos as Array<{ team_logo?: { url: string } }> | undefined;
    if (rawLogos && rawLogos.length > 0) {
      teamLogos = rawLogos
        .filter((logo): logo is { team_logo: { url: string } } => Boolean(logo.team_logo?.url))
        .map((logo) => ({ url: logo.team_logo.url }));
    }

    return {
      team_key: flatData.team_key as string,
      team_id: flatData.team_id as string,
      name: flatData.name as string,
      url: flatData.url as string,
      team_logos: teamLogos,
      waiver_priority: flatData.waiver_priority as number,
      number_of_moves: flatData.number_of_moves as number,
      number_of_trades:
        typeof flatData.number_of_trades === "string"
          ? parseInt(flatData.number_of_trades, 10)
          : (flatData.number_of_trades as number),
      roster_adds: flatData.roster_adds as YahooTeam["roster_adds"],
      league_scoring_type: flatData.league_scoring_type as string,
      managers: this.parseManagers(flatData.managers as unknown[]),
    };
  }

  private parseManagers(managers: unknown[]): YahooManager[] {
    if (!managers) return [];
    return managers.map((m) => {
      const manager = (m as Record<string, unknown>).manager as Record<string, unknown>;
      return {
        manager_id: manager.manager_id as string,
        nickname: manager.nickname as string,
        is_current_login: manager.is_current_login === "1",
        email: manager.email as string | undefined,
        image_url: manager.image_url as string | undefined,
      };
    });
  }

  private parseStandings(data: Record<string, unknown>): YahooTeamStandings[] {
    const standings: YahooTeamStandings[] = [];
    try {
      const fantasy = data.fantasy_content as Record<string, unknown>;
      const league = fantasy?.league as unknown[];
      if (league?.[1]) {
        const standingsData = (league[1] as Record<string, unknown>).standings as unknown[];
        if (standingsData?.[0]) {
          const teamsData = (standingsData[0] as Record<string, unknown>).teams as Record<
            string,
            unknown
          >;
          const teamsCount = teamsData?.count as number;

          for (let i = 0; i < teamsCount; i++) {
            const teamData = (teamsData?.[i.toString()] as Record<string, unknown>)
              ?.team as unknown[];
            if (teamData) {
              standings.push(this.mapTeamStandings(teamData));
            }
          }
        }
      }
    } catch {
      console.error("Error parsing standings");
    }
    return standings;
  }

  private mapTeamStandings(data: unknown[]): YahooTeamStandings {
    const team = this.mapTeam(data[0] as unknown[]);

    // Yahoo returns: data[0] = team info, data[1] = team_points, data[2] = team_standings
    const pointsData = data[1] as Record<string, unknown> | undefined;
    const standingsData = data[2] as Record<string, unknown> | undefined;

    // Parse team_standings with proper type conversion
    const rawStandings = standingsData?.team_standings as Record<string, unknown> | undefined;
    const teamStandings = rawStandings
      ? {
          rank: parseInt(rawStandings.rank as string, 10) || 0,
          playoff_seed: rawStandings.playoff_seed
            ? parseInt(rawStandings.playoff_seed as string, 10)
            : undefined,
          outcome_totals: {
            wins:
              parseInt(
                (rawStandings.outcome_totals as Record<string, unknown>)?.wins as string,
                10,
              ) || 0,
            losses:
              parseInt(
                (rawStandings.outcome_totals as Record<string, unknown>)?.losses as string,
                10,
              ) || 0,
            ties:
              parseInt(
                String((rawStandings.outcome_totals as Record<string, unknown>)?.ties || 0),
                10,
              ) || 0,
            percentage:
              parseFloat(
                (rawStandings.outcome_totals as Record<string, unknown>)?.percentage as string,
              ) || 0,
          },
          points_for: parseFloat(rawStandings.points_for as string) || 0,
          points_against:
            typeof rawStandings.points_against === "number"
              ? rawStandings.points_against
              : parseFloat(rawStandings.points_against as string) || 0,
        }
      : undefined;

    // Parse team_points
    const rawPoints = pointsData?.team_points as Record<string, unknown> | undefined;
    const teamPoints = rawPoints
      ? {
          coverage_type: rawPoints.coverage_type as string,
          total: parseFloat(rawPoints.total as string) || 0,
        }
      : undefined;

    return {
      team,
      team_standings: teamStandings,
      team_points: teamPoints,
    };
  }

  private parseRoster(data: Record<string, unknown>): YahooRosterPlayer[] {
    const players: YahooRosterPlayer[] = [];
    try {
      const fantasy = data.fantasy_content as Record<string, unknown>;
      const team = fantasy?.team as unknown[];
      if (team?.[1]) {
        const roster = (team[1] as Record<string, unknown>).roster as Record<string, unknown>;
        const playersData = (roster?.["0"] as Record<string, unknown>)?.players as Record<
          string,
          unknown
        >;
        const playersCount = playersData?.count as number;

        for (let i = 0; i < playersCount; i++) {
          const playerData = (playersData?.[i.toString()] as Record<string, unknown>)
            ?.player as unknown[];
          if (playerData) {
            players.push(this.mapRosterPlayer(playerData));
          }
        }
      }
    } catch {
      console.error("Error parsing roster");
    }
    return players;
  }

  private mapRosterPlayer(data: unknown[]): YahooRosterPlayer {
    const playerInfo = data[0] as unknown[];
    const playerStats = data[1] as Record<string, unknown>;

    // Flatten player info array
    const flatPlayer: Record<string, unknown> = {};
    for (const item of playerInfo) {
      if (typeof item === "object" && item !== null) {
        Object.assign(flatPlayer, item);
      }
    }

    const name = flatPlayer.name as Record<string, string>;

    return {
      player_key: flatPlayer.player_key as string,
      player_id: flatPlayer.player_id as string,
      name: {
        full: name?.full || "",
        first: name?.first || "",
        last: name?.last || "",
        ascii_first: name?.ascii_first || "",
        ascii_last: name?.ascii_last || "",
      },
      editorial_team_abbr: flatPlayer.editorial_team_abbr as string,
      display_position: flatPlayer.display_position as string,
      position_type: flatPlayer.position_type as string,
      status: flatPlayer.status as string | undefined,
      status_full: flatPlayer.status_full as string | undefined,
      injury_note: flatPlayer.injury_note as string | undefined,
      image_url: flatPlayer.image_url as string | undefined,
      headshot: flatPlayer.headshot as YahooPlayer["headshot"],
      uniform_number: flatPlayer.uniform_number as string | undefined,
      bye_weeks: flatPlayer.bye_weeks as YahooPlayer["bye_weeks"],
      selected_position: flatPlayer.selected_position as YahooRosterPlayer["selected_position"],
      player_points: playerStats?.player_points as YahooRosterPlayer["player_points"],
    };
  }

  private parseScoreboard(data: Record<string, unknown>): YahooMatchup[] {
    const matchups: YahooMatchup[] = [];
    try {
      const fantasy = data.fantasy_content as Record<string, unknown>;
      const league = fantasy?.league as unknown[];
      if (league?.[1]) {
        const scoreboard = (league[1] as Record<string, unknown>).scoreboard as Record<
          string,
          unknown
        >;
        const matchupsData = (scoreboard?.["0"] as Record<string, unknown>)?.matchups as Record<
          string,
          unknown
        >;
        const matchupsCount = matchupsData?.count as number;

        for (let i = 0; i < matchupsCount; i++) {
          const matchupData = (matchupsData?.[i.toString()] as Record<string, unknown>)
            ?.matchup as Record<string, unknown>;
          if (matchupData) {
            matchups.push(this.mapMatchup(matchupData));
          }
        }
      }
    } catch {
      console.error("Error parsing scoreboard");
    }
    return matchups;
  }

  private mapMatchup(data: Record<string, unknown>): YahooMatchup {
    const teamsData = (data["0"] as Record<string, unknown>)?.teams as Record<string, unknown>;
    const teams: YahooTeamStandings[] = [];

    if (teamsData) {
      const teamsCount = teamsData.count as number;
      for (let i = 0; i < teamsCount; i++) {
        const teamData = (teamsData[i.toString()] as Record<string, unknown>)?.team as unknown[];
        if (teamData) {
          teams.push(this.mapTeamStandings(teamData));
        }
      }
    }

    return {
      week: data.week as string,
      week_start: data.week_start as string,
      week_end: data.week_end as string,
      status: data.status as string,
      is_playoffs: data.is_playoffs === "1",
      is_consolation: data.is_consolation === "1",
      winner_team_key: data.winner_team_key as string | undefined,
      teams,
    };
  }
}

export function createYahooFantasyAPI(accessToken: string): YahooFantasyAPI {
  return new YahooFantasyAPI(accessToken);
}
