import { eq } from "drizzle-orm";
import { ImageResponse } from "next/og";
import { db } from "@/db/db";
import { leagues, managers, rankings, teams } from "@/db/schema";

export const runtime = "edge";
export const alt = "Manager Profile - BBSFFL";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const NOT_FOUND_IMAGE_URL = "https://s.yimg.com/ag/images/default_user_profile_pic_64sq.jpg";

// SVG icons as components (Satori doesn't support importing Lucide directly)
const TrophyIcon = () => (
  <svg
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="none"
    stroke="#fbbf24"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
    <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
    <path d="M4 22h16" />
    <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" />
    <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" />
    <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" />
  </svg>
);

const CalendarIcon = () => (
  <svg
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="M8 2v4" />
    <path d="M16 2v4" />
    <rect width="18" height="18" x="3" y="4" rx="2" />
    <path d="M3 10h18" />
  </svg>
);

const TargetIcon = () => (
  <svg
    aria-hidden="true"
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <circle cx="12" cy="12" r="10" />
    <circle cx="12" cy="12" r="6" />
    <circle cx="12" cy="12" r="2" />
  </svg>
);

const AwardIcon = () => (
  <svg
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="m15.477 12.89 1.515 8.526a.5.5 0 0 1-.81.47l-3.58-2.687a1 1 0 0 0-1.197 0l-3.586 2.686a.5.5 0 0 1-.81-.469l1.514-8.526" />
    <circle cx="12" cy="8" r="6" />
  </svg>
);

const UsersIcon = () => (
  <svg
    aria-hidden="true"
    width="48"
    height="48"
    viewBox="0 0 24 24"
    fill="none"
    stroke="#7c3aed"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
  </svg>
);

async function getManagerData(managerId: string) {
  const [manager] = await db.select().from(managers).where(eq(managers.guid, managerId));

  if (!manager) return null;

  const [ranking] = await db.select().from(rankings).where(eq(rankings.managerId, manager.id));

  const teamsWithLeagues = await db
    .select({
      team: teams,
      league: leagues,
    })
    .from(teams)
    .innerJoin(leagues, eq(teams.leagueId, leagues.id))
    .where(eq(teams.managerId, manager.id));

  const playoffAppearances = teamsWithLeagues.filter(
    (t) => t.team?.rank && t.team.rank <= 6,
  ).length;

  return {
    manager,
    stats: {
      seasonsPlayed: ranking?.seasonsPlayed ?? teamsWithLeagues.length,
      winPct: ranking?.winPct ?? 0,
      championships: ranking?.championships ?? 0,
    },
    playoffAppearances,
  };
}

export default async function Image({ params }: { params: Promise<{ managerId: string }> }) {
  const { managerId } = await params;

  // Fetch Inter font from Google Fonts
  const interBold = fetch(
    new URL(
      "https://fonts.gstatic.com/s/inter/v18/UcCO3FwrK3iLTeHuS_nVMrMxCp50SjIw2boKoduKmMEVuFuYMZg.ttf",
    ),
  ).then((res) => res.arrayBuffer());

  const interSemiBold = fetch(
    new URL(
      "https://fonts.gstatic.com/s/inter/v18/UcCO3FwrK3iLTeHuS_nVMrMxCp50SjIw2boKoduKmMEVuGKYMZg.ttf",
    ),
  ).then((res) => res.arrayBuffer());

  const interMedium = fetch(
    new URL(
      "https://fonts.gstatic.com/s/inter/v18/UcCO3FwrK3iLTeHuS_nVMrMxCp50SjIw2boKoduKmMEVuI6fMZg.ttf",
    ),
  ).then((res) => res.arrayBuffer());

  const data = await getManagerData(managerId);

  if (!data) {
    return new ImageResponse(
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#09090b",
          color: "#fff",
          fontSize: 48,
          fontFamily: "Inter",
        }}
      >
        Manager Not Found
      </div>,
      {
        ...size,
        fonts: [
          {
            name: "Inter",
            data: await interBold,
            weight: 700,
          },
        ],
      },
    );
  }

  const { manager, stats, playoffAppearances } = data;
  const hasValidImage =
    manager.imageUrl && manager.imageUrl !== "0" && manager.imageUrl !== NOT_FOUND_IMAGE_URL;

  // Fetch manager avatar if available
  let avatarData: ArrayBuffer | null = null;
  if (hasValidImage && manager.imageUrl) {
    try {
      const avatarRes = await fetch(manager.imageUrl);
      if (avatarRes.ok) {
        avatarData = await avatarRes.arrayBuffer();
      }
    } catch {
      // Silently fail, will show placeholder
    }
  }

  const [interBoldData, interSemiBoldData, interMediumData] = await Promise.all([
    interBold,
    interSemiBold,
    interMedium,
  ]);

  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        backgroundColor: "#09090b",
        padding: 60,
        fontFamily: "Inter",
      }}
    >
      {/* Header Card */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          borderRadius: 24,
          border: "1px solid #27272a",
          backgroundImage:
            "linear-gradient(to bottom right, rgba(24, 24, 27, 0.8), rgba(24, 24, 27, 0.4))",
          padding: 48,
          flex: 1,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 32,
          }}
        >
          {/* Avatar */}
          {avatarData ? (
            // biome-ignore lint/performance/noImgElement: test
            <img
              alt="avatar"
              src={manager.imageUrl as string}
              width={120}
              height={120}
              style={{
                borderRadius: 24,
                objectFit: "cover",
                boxShadow: "0 0 0 4px rgba(139, 92, 246, 0.2)",
              }}
            />
          ) : (
            <div
              style={{
                width: 120,
                height: 120,
                borderRadius: 24,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                backgroundImage:
                  "linear-gradient(to bottom right, rgba(139, 92, 246, 0.2), rgba(217, 70, 239, 0.2))",
                boxShadow: "0 0 0 4px rgba(139, 92, 246, 0.2)",
              }}
            >
              <UsersIcon />
            </div>
          )}

          {/* Name and Championship Badge */}
          <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
              <span
                style={{
                  fontSize: 72,
                  fontWeight: 700,
                  color: "#fff",
                  lineHeight: 1.1,
                }}
              >
                {manager.nickname}
              </span>
            </div>
          </div>
        </div>
        {/* Stat Badges */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "flex-start",
            gap: 12,
            marginTop: 20,
          }}
        >
          {/* Championship Badge */}
          {stats.championships > 0 && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                backgroundColor: "rgba(245, 158, 11, 0.2)",
                borderRadius: 9999,
                padding: "8px 16px",
                color: "#fbbf24",
              }}
            >
              <TrophyIcon />
              <span style={{ fontSize: 24, fontWeight: 500 }}>{stats.championships}x Champion</span>
            </div>
          )}

          {/* Seasons Badge */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              backgroundColor: "rgba(139, 92, 246, 0.2)",
              borderRadius: 9999,
              padding: "8px 16px",
              color: "#a78bfa",
            }}
          >
            <CalendarIcon />
            <span style={{ fontSize: 24, fontWeight: 500 }}>
              {stats.seasonsPlayed} Season{stats.seasonsPlayed !== 1 ? "s" : ""}
            </span>
          </div>

          {/* Win Rate Badge */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              backgroundColor: "rgba(16, 185, 129, 0.2)",
              borderRadius: 9999,
              padding: "8px 16px",
              color: "#34d399",
            }}
          >
            <TargetIcon />
            <span style={{ fontSize: 24, fontWeight: 500 }}>
              {(stats.winPct * 100).toFixed(1)}% Win Rate
            </span>
          </div>

          {/* Playoff Appearances Badge */}
          {playoffAppearances > 0 && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                backgroundColor: "rgba(59, 130, 246, 0.2)",
                borderRadius: 9999,
                padding: "8px 16px",
                color: "#60a5fa",
              }}
            >
              <AwardIcon />
              <span style={{ fontSize: 24, fontWeight: 500 }}>
                {playoffAppearances} Playoff Appearances
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Footer Branding */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginTop: 24,
          paddingLeft: 8,
          paddingRight: 8,
        }}
      >
        <span
          style={{
            fontSize: 24,
            fontWeight: 700,
            color: "#a78bfa",
          }}
        >
          BBSFFL
        </span>
        <span
          style={{
            fontSize: 18,
            color: "#71717a",
          }}
        >
          Fantasy Football League Stats
        </span>
      </div>
    </div>,
    {
      ...size,
      fonts: [
        {
          name: "Inter",
          data: interBoldData,
          weight: 700,
        },
        {
          name: "Inter",
          data: interSemiBoldData,
          weight: 600,
        },
        {
          name: "Inter",
          data: interMediumData,
          weight: 500,
        },
      ],
    },
  );
}
