// Cutscene scripts. Each beat is one painted Higgsfield panel (art/higgsfield 30-33, 60-63)
// with a slow Ken Burns move and a typed caption. Short captions only (GDD §6 tone guardrails).

export interface StoryBeat {
  /** texture key of the painted panel */
  image: string;
  caption: string;
  /** from/to scale and the point the camera drifts toward (0..1 of the panel) */
  zoom: [number, number];
  focus: { x: number; y: number };
  sfx?: { name: string; at: number }[];
  holdMs: number;
}

export interface Story {
  music: string;
  beats: StoryBeat[];
}

/** The opening's panels (public/assets/story/), loaded at boot as `story:<name>`; every other cutscene loads its own. */
export const STORY_IMAGES = ['den', 'porch', 'truck', 'stump'];

export const STORIES: Record<string, Story> = {
  // The opening: Jimothy loses his gaze (a group of raccoons is a "gaze") while stuck under a
  // porch, and the LUXE MICRO-LOFTS crew trucks them off. The last beat reuses the Ballard map.
  opening: {
    music: 'title',
    beats: [
      {
        image: 'story:den',
        caption: 'Ballard. One mossy cedar, one gaze of raccoons…\nand Jimothy, squished at the end.',
        zoom: [1.0, 1.1],
        focus: { x: 0.68, y: 0.45 },
        holdMs: 5600,
      },
      {
        image: 'story:porch',
        caption: 'One rainy night the gaze went out foraging.\nJimothy got stuck under a porch. Again.',
        zoom: [1.1, 1.0],
        focus: { x: 0.3, y: 0.62 },
        holdMs: 5600,
      },
      {
        image: 'story:truck',
        caption: 'By the time he wriggled free, LUXE MICRO-LOFTS\nhad taken the cedar… and his whole family.',
        zoom: [1.0, 1.1],
        focus: { x: 0.45, y: 0.5 },
        sfx: [
          { name: 'chainsaw', at: 0 },
          { name: 'truck', at: 3000 },
        ],
        holdMs: 6200,
      },
      {
        image: 'story:stump',
        caption: "All that was left: a stump, a sign,\nand a tuft of Mom's tail.",
        zoom: [1.1, 1.0],
        focus: { x: 0.45, y: 0.5 },
        holdMs: 5600,
      },
      {
        image: 'bg:map_ballard',
        caption: 'The smallest, slowest, least likely hero in Seattle.\nAlso the only one left. Follow the tracks. Find the gaze.',
        zoom: [1.0, 1.35],
        focus: { x: 0.28, y: 0.62 },
        holdMs: 6400,
      },
    ],
  },
  // Before 1-2: the tracks end at the Ballard Locks; the crate is on a boat in the lock chamber.
  '1-2': {
    music: 'title',
    beats: [
      {
        image: 'story:locks_truck',
        caption: 'The tire tracks ended at the Ballard Locks.\nThe LUXE truck was there. Empty.',
        zoom: [1.0, 1.12],
        focus: { x: 0.7, y: 0.55 },
        sfx: [{ name: 'truck', at: 200 }],
        holdMs: 5600,
      },
      {
        image: 'story:herschel',
        caption: 'Herschel the sea lion saw everything.\nHerschel did not care. Herschel had a salmon.',
        zoom: [1.12, 1.02],
        focus: { x: 0.22, y: 0.62 },
        holdMs: 5600,
      },
      {
        image: 'story:herschel',
        caption: 'But down in the lock, a crate stamped PEST RELOCATION\nwas rising on a boat. Catch that boat.',
        zoom: [1.05, 1.3],
        focus: { x: 0.52, y: 0.6 },
        holdMs: 6000,
      },
    ],
  },
  // Before 1-3: the boat has crossed to Golden Gardens and is leaving; the geese hold the beach.
  '1-3': {
    music: 'dusk',
    beats: [
      {
        image: 'story:goose_gang',
        caption: 'Golden Gardens at dusk. The boat with the crate\nwas already pulling away from the beach…',
        zoom: [1.05, 1.28],
        focus: { x: 0.84, y: 0.5 },
        holdMs: 5600,
      },
      {
        image: 'story:goose_gang',
        caption: '…and the beach belonged to the geese.\nThe big one would like a word.',
        zoom: [1.28, 1.08],
        focus: { x: 0.42, y: 0.55 },
        sfx: [{ name: 'honk', at: 2400 }],
        holdMs: 5800,
      },
    ],
  },
  // ---- World 2: Pike Place ------------------------------------------------------------------
  // Clue (GDD §6): a fishmonger saw a crate marked LUXE.
  '2-1': {
    music: 'market',
    beats: [
      {
        image: 'story:market',
        caption: "The kayak drifted south all night. By morning:\nPike Place Market, where the fish fly.",
        zoom: [1.0, 1.12],
        focus: { x: 0.78, y: 0.62 },
        holdMs: 5600,
      },
      {
        image: 'story:fishmonger',
        caption: 'A fishmonger had seen a crate stamped LUXE\nwheeled off through the market at dawn.',
        zoom: [1.12, 1.0],
        focus: { x: 0.35, y: 0.45 },
        sfx: [{ name: 'whoosh', at: 600 }],
        holdMs: 5800,
      },
      {
        image: 'story:fishmonger',
        caption: 'That way. Past the stalls, past the pig,\ndown the alley. Mind the crows.',
        zoom: [1.05, 1.28],
        focus: { x: 0.86, y: 0.5 },
        holdMs: 5400,
      },
    ],
  },
  '2-2': {
    music: 'alley',
    beats: [
      {
        image: 'story:gumwall',
        caption: 'Post Alley. The Gum Wall.\nA LUXE flyer, stuck fast in someone else\'s gum.',
        zoom: [1.0, 1.14],
        focus: { x: 0.32, y: 0.4 },
        holdMs: 5800,
      },
      {
        image: 'story:gumwall',
        caption: 'And tiny paw prints in pink gum, leading down.\nJimothy would rather not. Jimothy goes anyway.',
        zoom: [1.14, 1.04],
        focus: { x: 0.72, y: 0.62 },
        holdMs: 5800,
      },
    ],
  },
  '2-3': {
    music: 'chase',
    beats: [
      {
        image: 'story:waterfront',
        caption: 'The waterfront. The crate was going onto\na water taxi at the end of the pier.',
        zoom: [1.0, 1.15],
        focus: { x: 0.72, y: 0.55 },
        holdMs: 5400,
      },
      {
        image: 'story:waterfront',
        caption: 'Jimothy now smelled strongly of fish.\nThe seagulls had noticed.',
        zoom: [1.2, 1.04],
        focus: { x: 0.36, y: 0.58 },
        sfx: [{ name: 'squawk', at: 1800 }],
        holdMs: 5600,
      },
    ],
  },
  'postcard-w2': {
    music: 'market',
    beats: [
      {
        image: 'story:postcard_w2',
        caption: 'Jimothy has acquired: a fish. He does not know why.',
        zoom: [1.0, 1.06],
        focus: { x: 0.5, y: 0.5 },
        holdMs: 6000,
      },
    ],
  },
  // Postcard after World 1 (UI notes: one panel, Start to skip).
  'postcard-w1': {
    music: 'dusk',
    beats: [
      {
        image: 'story:postcard_w1',
        caption: 'Jimothy has acquired: sand. In places.',
        zoom: [1.0, 1.06],
        focus: { x: 0.5, y: 0.5 },
        holdMs: 6000,
      },
    ],
  },
};
