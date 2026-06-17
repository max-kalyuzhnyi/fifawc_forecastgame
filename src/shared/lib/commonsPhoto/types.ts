export type CommonsPhotoSource =
  | "wikidata_p18"
  | "wikipedia_pageimage"
  | "commons_category"
  | "commons_search";

export interface CommonsPhotoCandidate {
  fileTitle: string;
  source: CommonsPhotoSource;
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
  rejectionReason: string | null;
}
