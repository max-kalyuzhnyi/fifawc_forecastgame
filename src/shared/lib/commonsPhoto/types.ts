export type CommonsPhotoSource =
  | "wikidata_p18"
  | "wikipedia_pageimage"
  | "commons_category"
  | "commons_search";

export type FifaRostersPhotoSource = "fifarosters_face" | "fifarosters_dynamic";

export type CardPhotoSource = CommonsPhotoSource | FifaRostersPhotoSource;

export interface CommonsPhotoCandidate {
  fileTitle: string;
  source: CardPhotoSource;
  sourceUrl: string;
  thumbUrl: string | null;
  width: number;
  height: number;
  licenseUrl: string | null;
  authorCredit: string | null;
  description: string | null;
}

export interface RankedCommonsPhotoCandidate extends CommonsPhotoCandidate {
  score: number;
  reasonTags: string[];
}

export interface PlayerPhotoReviewEntry {
  playerId: string;
  playerName: string;
  teamName: string;
  wikiTitle: string | null;
  currentPhotoUrl: string | null;
  candidates: RankedCommonsPhotoCandidate[];
  autoAccept: boolean;
  selectedFileTitle: string | null;
  /** Top-ranked candidate when manual pick is required. */
  suggestedFileTitle?: string | null;
  rejectionReason: string | null;
}
