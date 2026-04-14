import { GameState } from "@/lib/espn/types";
import { EventType } from "./triggers";

interface NotificationPayload {
  title: string;
  body: string;
  tag: string;
  data?: Record<string, string>;
}

export function buildNotification(
  event: EventType,
  game: GameState
): NotificationPayload {
  const matchup = `${game.awayTeamAbbr} @ ${game.homeTeamAbbr}`;
  const score = `${game.awayScore}-${game.homeScore}`;

  switch (event) {
    case "game_starting":
      return {
        title: "Game Starting!",
        body: `${matchup} is tipping off now`,
        tag: `game-${game.gameId}-start`,
      };

    case "halftime_ending":
      return {
        title: "2nd Half Starting",
        body: `${matchup} — Score: ${score}`,
        tag: `game-${game.gameId}-half`,
      };

    case "4th_quarter":
      return {
        title: "4th Quarter Starting!",
        body: `${matchup} — Score: ${score}`,
        tag: `game-${game.gameId}-4q`,
      };

    case "close_game": {
      const diff = Math.abs(game.homeScore - game.awayScore);
      const periodLabel = game.period > 4 ? `OT${game.period - 4}` : "4th";
      return {
        title: `Close Game in the ${periodLabel}!`,
        body: `${matchup} — Score: ${score} (${diff}pt game)`,
        tag: `game-${game.gameId}-close-p${game.period}`,
      };
    }

    case "overtime": {
      const otNumber = game.period - 4;
      const otLabel = otNumber === 1 ? "Overtime" : `${otNumber}OT`;
      return {
        title: `${otLabel}!`,
        body: `${matchup} — Score: ${score}. Heading to ${otLabel.toLowerCase()}!`,
        tag: `game-${game.gameId}-ot-p${game.period}`,
      };
    }

    case "game_ended": {
      const otNote = game.period > 4 ? ` (${game.period - 4}OT)` : "";
      let title: string;
      if (game.awayScore === game.homeScore) {
        title = `Final: ${matchup}${otNote}`;
      } else {
        const winner = game.awayScore > game.homeScore ? game.awayTeamAbbr : game.homeTeamAbbr;
        title = `Final: ${winner} Wins!${otNote}`;
      }
      return {
        title,
        body: `${matchup} — Final Score: ${score}`,
        tag: `game-${game.gameId}-final`,
      };
    }
  }
}
