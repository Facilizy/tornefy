export type AiSlot = {
  slot: number;
  jogadores: string[];
  /** Optional fields if the external JSON already contains team info */
  team_name?: string;
  team_tag?: string;
};

export type AiExtractResult = {
  total_jogadores?: string | number;
  data_extracao?: string;
  slots: AiSlot[];
};

export type SlotTeamMeta = {
  slot: number;
  team_name: string;
  team_tag: string;
};

export type SlotCreatePayload = {
  slot: number;
  team_name: string;
  team_tag: string;
  jogadores: string[];
};
