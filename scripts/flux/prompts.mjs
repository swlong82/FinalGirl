// LAST LIGHT — Flux prompt set for every generated art asset.
// Each entry: { key, cls, prompt, w, h, out: [w, h] }. `key` is also the file path
// under src/art/gen/ (key "still/ev-fog" → src/art/gen/still/ev-fog.webp), and the
// runtime looks images up by the same key (see src/art/gen.ts). Order = render priority.
//
// Notes for editing prompts: Workers AI's output filter flags words like "horror",
// "blood", "corpse" or "kill", so scenes are described as moody suspense, not gore.

export const STYLE =
  '1980s airbrushed paperback cover painting, painterly brushwork, dramatic rim lighting, deep shadows, subtle film grain, cinematic composition, no text, no lettering, no logo, no watermark';

/** Per-location light, so every asset from one place shares a palette. */
export const PALETTE = {
  drivein: 'cold blue moonlight and drifting fog with hot pink-red accents',
  coast: 'teal moonlight, slate-grey sea fog, sea-green shadows',
  hospital: 'sickly mint-green fluorescent light on institutional green tile',
  snow: 'icy blue-white snow light with warm orange firelight accents',
  radio: 'deep violet night with magenta and red transmitter-light glow',
};

export const slug = (s) =>
  s.toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

const A = [];
const add = (key, cls, prompt, w, h, out) => A.push({ key, cls, prompt, w, h, out });

// ── 1. Location backdrops (map background, 1024×640) ───────────────────────
const BACKDROPS = {
  drivein:
    'wide elevated establishing view of a 1950s drive-in movie theater lot at night at the edge of a dark pine forest: a huge blank screen glowing pale blue on the right, rows of parked 1970s cars with speaker poles, a cinder-block concession stand with a projection booth on its roof, a playground under the screen, low fog rolling out of the pines, crescent moon',
  coast:
    'wide elevated establishing view of a remote rocky Maine point at night: a row of small white clapboard beach cabins in dune grass, a long wooden dock out into black water, a red-and-white lighthouse on the point with its beam sweeping the fog, a narrow causeway road with the sea washing over it, black sand beach, tidepools',
  hospital:
    'wide elevated establishing view of an old 1920s brick hospital wing at night: rows of windows lit green, an ambulance bay with a rotating red light and an idling ambulance, a small chapel window glowing with candles, steam venting from a boiler-house chimney, rain-wet empty parking lot',
  snow:
    'wide elevated establishing view of a 1960s timber ski lodge on a snowy mountainside at night: warm glowing windows and a stone chimney with smoke, empty chairlift chairs climbing into darkness, a frozen pond, cars buried in snow at a trailhead lot, a siren horn on a pole up on a corniced ridge, falling snow',
  radio:
    'wide elevated establishing view of a small cinder-block AM radio station on a lonely hilltop at night above dark prairie wheat fields: a tall lattice transmitter tower with a red beacon light, a glowing red studio window, a lone pay phone under a buzzing lamp by a gravel turnout, a generator shed, distant dry lightning',
};
const FINALE = {
  drivein: 'the same drive-in at the climax: the giant screen burning crimson, the projection booth ablaze, red smoke over the rows of cars',
  coast: 'the same point at the climax: the lighthouse beam turned crimson, a storm surge flooding over the cabins and dock, red-lit sea fog',
  hospital: 'the same hospital at the climax: every window flashing emergency red, alarms, smoke pouring from the boiler house',
  snow: 'the same lodge at the climax: an avalanche roaring down the ridge under a crimson sky, the lodge lights failing, red flare smoke on the snow',
  radio: 'the same station at the climax: the tower beacon blazing solid crimson, lightning striking the tower, the studio window pulsing red',
};
for (const [k, p] of Object.entries(BACKDROPS))
  add(`backdrop/${k}`, 'backdrop', `${p}, ${PALETTE[k]}, ominous calm, ${STYLE}`, 1024, 640, [1024, 640]);

// ── 2. Portraits (768² → 512²) ─────────────────────────────────────────────
const PORTRAIT = 'tight close-up character portrait, framed from the collarbones up, the face filling most of the frame, three-quarter view, looking just past the viewer, dark background';
const HEROINES = {
  rosa: 'a determined young Latina woman with dark hair in a high ponytail, wearing a red-and-white striped 1984 snack-bar uniform and a red apron, warm popcorn-machine glow behind her, hot pink-red rim light',
  june: 'a sharp-eyed young Black woman with natural curly hair, wearing a drive-in ticket-taker vest with a roll of yellow admission tickets clipped to it, ticket-booth light behind her, golden yellow rim light',
  margo: 'a confident young woman with an auburn bob haircut and freckles, grease-smudged mechanic coveralls, a big wrench resting on her shoulder, generator sparks behind her, green rim light',
  tess: 'a steady young woman with long blonde hair, faded red lifeguard windbreaker, a silver whistle on a lanyard around her neck, dark lake at night behind her, cyan rim light',
  ivy: 'a clever young woman with a dark purple pixie cut, oversized cardigan, holding a Super 8 film camera, projector beam behind her, violet rim light',
  sunny: 'an outdoorsy young woman with long copper hair and rosy cheeks, 1980s ski instructor parka, ski goggles pushed up on her forehead, snowy pines behind her, orange rim light',
  dee: 'a composed adult woman in her early twenties with warm brown skin and long dark hair tied back, large over-ear radio headphones resting around her neck, grey 1985 university sweatshirt, a glowing radio mixing board behind her, magenta rim light',
};
for (const [id, p] of Object.entries(HEROINES))
  add(`portrait/heroine-${id}`, 'portrait', `${PORTRAIT}, ${p}, brave and wary expression, ${STYLE}`, 768, 768, [512, 512]);
const KILLERS = {
  projectionist:
    'an old cinema projectionist whose face is hidden behind a round dented steel film-canister mask with five punched holes, wearing a soot-stained leather work apron over a dark shirt, holding a large film reel against his chest, standing in a hazy projection booth with a bright projector beam behind him, cold blue and amber light',
  tidewife:
    'a faceless widow figure in a long dripping black oilskin fisherman coat, her head and face completely shrouded under a thick opaque grey lace veil that hangs like a shroud, no facial features visible at all, only two faint pale points of light where the eyes would be, a brass storm lantern in one hand and a long wooden boat hook in the other, water streaming from her hem, lighthouse beam in the fog behind her, sea-green moonlight',
  anesthetist:
    'a tall, tidy doctor in a 1950s dark rubber surgical apron, his face fully covered: round opaque black smoked goggles and a white surgical mask over nose and mouth with a thin smile painted on it in orange-brown iodine, holding a small brown glass bottle and a folded white cloth, empty green-tiled hospital corridor behind him, cold flickering fluorescent light, unsettling calm',
  snowblind:
    'a gaunt, frost-bitten man in a torn red 1970s ski patrol parka crusted with ice, pale grey skin, frosted ski goggles with lenses rimed solid opaque white hiding his eyes, icicles hanging from his beard, an ice axe in one hand and a long avalanche probe pole in the other, blizzard on a dark mountain ridge behind him, eerie icy blue light',
  caller:
    'a tall figure in a long glistening black rain slicker, face hidden behind a mask made from the chrome grille of a vintage ribbon microphone pierced with a thousand tiny holes, a coiled beige telephone cord wrapped around both fists, red on-air lamp glow behind him in a dark radio studio',
};
for (const [id, p] of Object.entries(KILLERS))
  add(`portrait/killer-${id}`, 'portrait', `${PORTRAIT}, ${p}, mysterious and still, ${STYLE}`, 768, 768, [512, 512]);

// ── 3. Finale backdrops ─────────────────────────────────────────────────────
for (const [k, p] of Object.entries(FINALE))
  add(`backdrop/${k}-finale`, 'backdrop', `wide elevated establishing view, ${p}, harsh crimson and black, ${STYLE}`, 1024, 640, [1024, 640]);

// ── 4. Card stills (768×480 → 640×400) ─────────────────────────────────────
// Killer terror cards use their home location's palette.
const STILLS = {
  drivein: {
    'kv-frontrow': 'a scorched, smoking silhouette seated alone in the front row of a burned-out projection booth, slowly turning its head, embers glowing in the dark',
    'kv-reelchange': 'a small round cue mark flickering in the corner of a giant drive-in screen, the masked silhouette of a projectionist threading a film reel in a lit booth window',
    'kv-countdown': 'a giant drive-in screen showing a white film countdown leader circle with a big number eight, car speaker poles in the fog below',
    'kv-splice': 'close-up of long steel splicing shears beside cut strips of film on a scarred workbench, a scorched leather apron hanging behind, harsh projector light',
    'kv-onscreen': 'a huge drive-in screen showing grainy live footage of a frightened young woman looking over her shoulder, looming over a foggy parking lot',
    'kv-burn': 'thick grey smoke curling from smouldering film reels, melting film strips, orange glow, choking haze in a projection booth',
    'kv-logbook': 'an old leather logbook open under a desk lamp, a pencil tally of hundreds of marks, a gloved hand holding the pencil',
    'kv-silence': 'a silent dark film projector with stopped reels, dust hanging in the last thin beam of light, quiet empty booth, peaceful',
    'ev-headlights': 'a late-1970s car with its headlights on nosing through fog into the back rows of a drive-in, the driver stretching beside it',
    'ev-backseat': 'the steamed-up windows of a parked 1970s sedan at a drive-in at night, movie light flickering on the glass',
    'ev-swings': 'children playing on a playground swing set beneath a glowing drive-in movie screen at night',
    'ev-usher': 'a drive-in usher in a uniform with a flashlight walking toward a small restroom block with one flickering bulb, fog',
    'ev-second': 'a crowd of teenagers heading toward a glowing drive-in snack bar at intermission, neon light spilling onto the gravel',
    'ev-campers': 'two hikers with backpacks stepping out of a pine tree line into a drive-in lot lit by the screen glow',
    'ev-intermission': 'a drive-in screen showing a cheerful retro cartoon snack-bar intermission reel, speaker poles and parked cars, warm nostalgic glow',
    'ev-caralarm': 'a 1970s car with flashing headlights and blaring alarm in a row of dark parked cars at a drive-in',
    'ev-popcorn': 'an overflowing popcorn machine spilling popcorn across an empty snack-bar counter, warm light, nobody there',
    'ev-sprinklers': 'lawn sprinklers bursting on across a dark drive-in lot, spray glittering in headlights and fog',
    'ev-trucker': 'a big semi truck idling beside a drive-in ticket booth gate at night, its driver walking in, headlights glaring',
    'ev-speaker': 'close-up of a metal drive-in car speaker hanging on a car window at night, its grille glowing faintly',
    'ev-fog': 'thick fog swallowing rows of parked cars at a drive-in, the screen only a dim glow, quiet',
    'ev-moon': 'a huge harvest moon breaking through clouds over a drive-in lot, silver light across the rows of cars, peaceful',
    'ev-power': 'every bulb on a drive-in lot dimming to orange, the giant screen gone grey, a sputtering generator',
  },
  coast: {
    'tw-shallows': 'pale drowned figures wading out of black shallow surf at night toward small beach cabins, sea fog',
    'tw-undertow': 'a wet footprint leading into a puddle on a lighthouse floor, the puddle reflecting a completely different place',
    'tw-lamp': 'a great lighthouse beam sweeping across a rocky point and stopping, spotlighting a lone figure on the dunes',
    'tw-wet': 'a trail of wet puddle footprints across wooden cabin floorboards leading toward the viewer, lantern light',
    'tw-hymn': 'pale light and seawater seeping up between old wooden floorboards, an open hymnal on the floor, candlelight',
    'tw-hook': 'long scratch marks gouged along white clapboard cabin walls at night, the shadow of a long boat hook',
    'tw-return': 'a guttering storm lantern in a lighthouse lamp room, a veiled silhouette climbing the spiral stairs below',
    'tw-weeping': 'a veiled woman in an oilskin coat weeping at a fogged cabin window, seen from inside, melancholy and still',
    'tc-bonfire': 'college kids around a bonfire on a black sand beach with a guitar and a cooler, sparks rising into the night',
    'tc-latecheckin': 'car headlights racing along a narrow causeway road at night with sea water washing over both sides',
    'tc-fishermen': 'an old fisherman and his young nephew with rods and a thermos at the end of a long wooden dock, a lone lit lantern beyond them',
    'tc-honeymoon': 'a small seaside cabin at night with a little sign hanging on the doorknob and a fogged, warmly glowing window',
    'tc-kids': 'kids with flashlights crouching among rocky tidepools at night, starfish and anemones',
    'tc-dunes': 'a man with a flashlight and an empty dog leash calling into tall dune grass at night',
    'tc-hightide': 'high tide water climbing the wooden pilings under a dock, cold dark waves, moonlight',
    'tc-ebb': 'a perfectly still dark sea reflecting the stars at slack water, peaceful',
    'tc-coastguard': 'a marine radio glowing on a cabin desk, the lights of a coast guard cutter far out at sea through the window, hopeful',
    'tc-bell': 'a brass service bell on a seaside motel front desk, a puddle of seawater spreading across the counter beside an open guestbook',
    'tc-sheets': 'white bedsheets on a clothesline flapping at night, one sheet shaped like a standing figure',
    'tc-foghorn': 'a lighthouse foghorn blasting into dense fog at night, cabin windows rattling',
    'tc-fogbank': 'a dense fog bank rolling over a row of small beach cabins, porch lights dim halos, quiet',
    'tc-moonpath': 'a bright path of moonlight across the ocean toward a rocky shore with small cabins, peaceful',
  },
  hospital: {
    'an-sleepwalk': 'a patient in a paper hospital gown walking down a green-tiled corridor with her eyes closed, other patients following in a line behind her',
    'an-rounds': 'a long hospital corridor of closed doors, a silhouette holding a clipboard at the far end, fluorescent light',
    'an-countdown': 'a wall-mounted hospital intercom speaker seen through heavy drowsy eyes, the ceiling light blurring',
    'an-ether': 'a faint pale green vapor rolling out of a ceiling air vent into a dark hospital ward',
    'an-paged': 'a hospital room door with a number plate, an overhead paging speaker and a red call light glowing',
    'an-tray': 'a stainless steel surgical instrument tray with polished tools laid out in a careful row under an operating lamp',
    'an-chart': 'a hospital clipboard chart hanging at the foot of an empty, neatly made bed, moonlight through blinds',
    'an-scrub': 'water running in a steel scrub sink, a pair of rubber gloves, a steamy green-tiled scrub room, quiet',
    'sa-transfer': 'an orderly wheeling two patients on gurneys toward elevator doors in a green-tiled hospital corridor',
    'sa-kids': 'a children\'s hospital ward at night with painted clouds on the ceiling, two kids sitting up in bed, a small night light',
    'sa-intern': 'a young doctor in an oversized white coat lost in an empty hospital stairwell',
    'sa-chaplain': 'a priest lighting rows of votive candles in a small hospital chapel, warm candlelight',
    'sa-walkin': 'a man with a bandaged hand pressing against the glass emergency room doors at night in the rain',
    'sa-janitor': 'a janitor with a mop bucket and a small transistor radio in a hissing boiler room full of pipes and steam',
    'sa-codeblue': 'an empty operating theater with the surgical lamp switched on, an overhead paging speaker, a shadow in the doorway',
    'sa-flicker': 'a hospital corridor with flickering fluorescent tubes, a dim figure standing closer in the dark stretch',
    'sa-elevator': 'hospital elevator doors open on an empty car with a gurney inside, a wet floor, fluorescent light',
    'sa-coffee': 'a coffee maker gurgling in a small hospital break room, a warm mug, quiet comfort',
    'sa-sirens': 'flashing police lights far away on a dark turnpike seen from a hospital window, hopeful',
    'sa-crashcart': 'an abandoned red hospital crash cart with its drawers half open in an empty corridor',
    'sa-musicbox': 'an open music box with a tiny dancer on a windowsill in a dark children\'s ward',
    'sa-generator': 'harsh white emergency lights snapping on one after another down a long hospital corridor',
    'sa-steam': 'a burst pipe filling a hospital corridor with thick white vapor',
  },
  snow: {
    'sb-dugout': 'a gloved hand pushing up through a deep snowdrift at night, frosted 1970s ski goggles emerging beside it, blizzard',
    'sb-siren': 'a large avalanche siren horn on a pole on a snowy ridge at night, the ski lodge lights far below',
    'sb-whiteout': 'a total white blizzard, a dim tall silhouette barely visible through swirling snow',
    'sb-listen': 'a dark lodge hallway in absolute stillness, a figure in frosted goggles tilting its head to listen, frozen breath',
    'sb-probe': 'a long straight line of probe holes punched in fresh snow, leading across a moonlit slope to a tall figure with a probe pole',
    'sb-axe': 'close-up of an ice axe being sharpened against ice, frost and sparks, cold blue light',
    'sb-patrol': 'an old 1970s two-way radio crackling on a shelf in a dark ski patrol hut, a 1974 wall calendar beside it',
    'sb-thaw': 'a frost-covered figure standing still in falling snow, shaking snow out of its hood, quiet moonlight',
    'wl-team': 'four teenagers in matching ski team jackets sneaking out of a lodge door with a sled into the snow at night',
    'wl-hottub': 'a steamy cedar sauna cabin glowing warm at night beside a snowy lodge, two silhouettes in the steam',
    'wl-nightski': 'night skiers with headlamps gliding down a snowy slope toward a small lift hut',
    'wl-bus': 'a tour bus slid off a snowy mountain switchback, passengers trudging uphill through deep snow',
    'wl-skater': 'a figure in a long scarf ice skating alone on a frozen pond under the lodge lights',
    'wl-bartender': 'a bartender counting the till in a cozy lodge bar with mounted antlers and a glowing jukebox, back to the door',
    'wl-lines': 'ice-covered power lines snapping and sparking in a snowstorm, the lodge windows going dark',
    'wl-headlights': 'a snowcat\'s headlights sweeping across a snowy parking lot at night, the garage doors still closed',
    'wl-fire': 'sparks swirling up a huge stone fireplace with a roaring log fire, warm and safe',
    'wl-cocoa': 'hands holding a steaming mug of hot cocoa beside a fire, cozy',
    'wl-plow': 'a snowplow\'s lights far down a mountain valley road seen from above, a two-way radio in the foreground, hopeful',
    'wl-howl': 'a dark mountain ridge silhouetted against the moon, snow blowing off the cornice',
    'wl-drift': 'snow pouring sideways off a lodge roof, drifts filling in every footprint, quiet',
    'wl-stars': 'clouds parting over snowy mountains, bright stars and moonlight on the snow, peaceful',
  },
  radio: {
    'cl-fans': 'car headlights pulling into a gravel turnout below a hilltop radio station at night, two silhouettes stepping out',
    'cl-ring': 'a beige rotary wall telephone ringing in a long wood-paneled hallway, its receiver trembling, red light',
    'cl-deadair': 'a silent radio studio, turntables stopped, a red on-air bulb going dark over an empty chair',
    'cl-line': 'close-up of a vintage studio microphone with breath fogging its chrome grille, VU meters glowing',
    'cl-dedication': 'tally marks drawn in grease pencil on a studio window, a dark silhouette on the other side of the glass',
    'cl-cord': 'close-up of two fists wrapped in a coiled beige telephone cord, glistening black rain slicker sleeves',
    'cl-signal': 'a radio transmitter tower at night swallowed by crackling static, a small figure climbing the lattice',
    'cl-hold': 'a telephone handset resting off the hook on a desk, a lit hold button, a cup of coffee, warm lamp light',
    'da-winners': 'two excited listeners in Halloween costumes at the glass door of a small radio station lobby at midnight',
    'da-engineer': 'an old radio engineer in a cardigan shuffling past soldering benches and glowing vacuum tubes',
    'da-dare': 'teenagers with flashlights in a record library lined with thousands of vinyl records',
    'da-newsman': 'a newsreader in a tie walking into a wood-paneled office before dawn with a coffee',
    'da-motorist': 'a woman in a witch costume walking up a dark hill road toward a lit radio station',
    'da-board': 'a young board operator in headphones walking into a control room full of glowing VU meters',
    'da-lightning': 'dry lightning striking a tall radio transmitter tower on a hill at night, wheat fields below',
    'da-yourname': 'a studio microphone under a glowing on-air lamp, radio waves spreading out over a dark prairie toward distant town lights',
    'da-jingle': 'a radio cart machine playing a tape cartridge, warm studio lights, cheerful',
    'da-bulletin': 'a police two-way radio crackling on a desk, headlights winding up a hill road outside the window, hopeful',
    'da-coffee': 'a coffee percolator steaming on a hot plate in a small wood-paneled break room, a paper plate with a slice of frosted cake beside it, warm lamplight, cozy',
    'da-feedback': 'studio speaker monitors howling with feedback, visible distortion waves rippling through a shaking studio',
    'da-storm': 'heavy prairie rain hammering a hilltop radio station, lightning in the distance',
    'da-moon': 'an enormous orange hunter\'s moon rising over wheat fields beside a radio tower, peaceful',
  },
};
for (const [loc, cards] of Object.entries(STILLS))
  for (const [id, p] of Object.entries(cards))
    add(`still/${id}`, 'still', `cinematic film still, 1980s, ${p}, ${PALETTE[loc]}, ${STYLE}`, 768, 480, [640, 400]);

// ── 5. Map node icons (512² → 160²) ────────────────────────────────────────
const ICON = 'painted game icon of one fully rendered, detailed object with real colour, texture and highlights (not a silhouette or cut-out), centered and filling most of a plain dark circular vignette background, lit from the front with a strong rim light';
const NODE_ICONS = {
  ambulance: 'a vintage 1980s ambulance with a red rotating light',
  bear: 'a worn old teddy bear',
  boat: 'a small wooden rowboat resting on sawhorses',
  bolt: 'a rumbling diesel generator with a crackle of electricity',
  cabin: 'a small white clapboard cabin with one lit window',
  candle: 'a church rack of small lit votive candles in red glass cups',
  car: 'a 1970s sedan in side view with its headlights on',
  chair: 'an empty ski chairlift chair hanging from a cable',
  cross: 'a red medical cross on a white hospital curtain',
  desk: 'an old wooden desk with a rotary telephone and a desk lamp',
  dial: 'a glowing analog VU meter dial with a twitching needle',
  dock: 'a long wooden dock with a lantern at the end',
  door: 'a closed wooden door with light leaking underneath',
  drawer: 'a steel cold-storage drawer cabinet with one drawer slightly open',
  elevator: 'vintage elevator doors with a brass floor indicator dial above',
  files: 'an open filing cabinet drawer full of manila folders',
  gate: 'an old wooden road gate arm stuck half raised',
  glass: 'a glass of whiskey on a bar, antlers behind it',
  grass: 'tall dune grass bending in the wind',
  hearth: 'a big stone fireplace with logs crackling in the grate, warm orange glow',
  hook: 'a large fishing hook with a tackle box',
  ice: 'a frozen pond with skate marks circling a dark patch',
  lamp: 'a round surgical operating lamp glowing',
  lighthouse: 'a red and white lighthouse with a sweeping beam',
  mic: 'a vintage chrome broadcast microphone',
  mug: 'a steaming coffee mug',
  payphone: 'a pay phone under a buzzing lamp with its receiver dangling',
  peak: 'a snowy mountain peak with an overhanging cornice',
  pill: 'an amber pharmacy pill bottle with pills spilled beside it',
  pine: 'a dark pine tree in fog',
  pipe: 'hissing industrial pipes with a red valve wheel',
  popcorn: 'a red-and-white striped box overflowing with popcorn',
  pot: 'a simmering steel stock pot on a stove',
  projector: 'a vintage film projector with two reels',
  record: 'a vinyl record sliding out of its sleeve',
  screen: 'a large blank outdoor cinema screen on wooden posts, lit pale blue under the night sky',
  shed: 'a small wooden tool shed with a padlock',
  ski: 'a rack of wooden skis and poles',
  snowcat: 'a red tracked snowcat vehicle',
  steam: 'a cedar sauna bucket and ladle with rising steam',
  swing: 'a playground swing set with one swing moving',
  ticket: 'a small drive-in ticket booth with a roll of tickets',
  tower: 'a radio transmitter tower with a red beacon light',
  wave: 'a dark ocean wave cresting',
  wreck: 'a rusted junked car with broken windows',
};
for (const [k, p] of Object.entries(NODE_ICONS)) add(`icon/${k}`, 'icon', `${ICON}, ${p}, night, ${STYLE}`, 512, 512, [160, 160]);

// ── 6. Item icons (512² → 128²), keyed by item name ────────────────────────
const ITEM = 'painted inventory item icon of one fully rendered, detailed object with real colour, texture and highlights (not a silhouette or cut-out), centered and filling most of a plain dark background, lit from the front with a strong rim light';
const ITEMS = {
  // lore (killer packs)
  "Orrin's Logbook": 'a worn leather projectionist logbook full of tally marks',
  'The Unfinished Reel': 'a metal film reel canister with a handwritten paper label',
  "The Keeper's Last Letter": 'a folded, water-stained handwritten letter',
  'Wedding Ring in the Weed': 'a gold wedding ring tangled in green seaweed',
  'Ward C Patient Log': 'an old hospital ward ledger with a cloth cover',
  "Dr. Lull's Dictaphone": 'a vintage 1950s dictaphone recorder',
  "Patrol Report, Jan '74": 'a typed ski patrol report on a clipboard with red pen marks',
  "Corder's Avalanche Beacon": 'a scratched 1970s avalanche beacon transceiver with a blinking light',
  'Overnight Call Log': 'a spiral-bound radio station call log notebook',
  'Unaired Reel-to-Reel': 'a reel-to-reel audio tape with a hand-written label',
  // drive-in
  'Tire Iron': 'a steel tire iron',
  'Hedge Shears': 'a pair of long garden hedge shears',
  "Groundskeeper's Shotgun": 'an old double-barrel shotgun',
  'Road Flare': 'a lit red road flare',
  'Fire Extinguisher': 'a red fire extinguisher',
  'Usher Flashlight': 'a chrome usher flashlight casting a beam',
  'First-Aid Tin': 'a vintage metal first-aid tin with a red cross',
  'Aspirin & Cola': 'a small white medicine tin beside a glass soda bottle',
  'Box of Sugar Candy': 'a bright cardboard box of fruit gum drops',
  'Padlock & Chain': 'a heavy padlock and steel chain',
  'Walkie-Talkie': 'a 1980s walkie-talkie with antenna',
  'Station Wagon Keys': 'a set of car keys on a wood-grain keychain',
  'Thermos of Black Coffee': 'a plaid thermos with a cup of black coffee',
  'Pulled Speaker Box': 'a metal drive-in car speaker box with torn wires',
  Firecrackers: 'a bundle of red firecrackers with a lit fuse',
  // coast
  'Boat Hook': 'a long wooden boat hook pole',
  'Fillet Knife': 'a thin fisherman fillet knife in a leather sheath',
  'Spear Gun': 'a diving spear gun',
  'Marine Flare Gun': 'an orange marine flare gun',
  'Rock Salt': 'a burlap sack of coarse rock salt',
  'Storm Lantern': 'a brass storm lantern glowing',
  'Marine First-Aid Kit': 'a waterproof orange marine first-aid kit',
  'Flask of Brandy': 'a silver hip flask',
  'Saltwater Taffy': 'a paper bag of colorful saltwater taffy',
  'Mooring Rope': 'a coil of thick mooring rope',
  'Outboard Key': 'a boat outboard motor key on a floating cork keychain',
  'Jeep Keys': 'a set of jeep keys on a ring',
  'Transistor Radio': 'a small 1960s transistor radio',
  'Buoy Bell': 'a brass buoy bell',
  // hospital
  Scalpel: 'a surgical scalpel on a steel tray',
  'Fire Axe': 'a red fire axe',
  'Bone Saw': 'a stainless steel surgical saw',
  'Defibrillator Paddles': 'a pair of defibrillator paddles with coiled cables',
  'CO₂ Extinguisher': 'a black CO2 fire extinguisher with a horn nozzle',
  Penlight: 'a doctor penlight torch',
  'Gauze & Tape': 'a roll of gauze bandage and medical tape',
  'Mild Sedative': 'a small medicine bottle and a paper pill cup',
  'Smelling Salts': 'a small vial of smelling salts',
  'Heavy Gurney': 'a heavy steel hospital gurney',
  "Doctor's Pager": 'a 1980s pager beeper',
  'Intercom Handset': 'a beige wall intercom handset',
  'Service Elevator Key': 'a brass elevator key on a hospital tag',
  'Epinephrine Pen': 'an epinephrine auto-injector pen',
  // lodge
  'Broken Ski Pole': 'a snapped aluminum ski pole',
  'Climbing Ice Axe': 'a mountaineering ice axe',
  'Lodge Hunting Rifle': 'an old wooden hunting rifle on a lodge wall rack',
  'Avalanche Flare Pistol': 'an orange flare pistol',
  Headlamp: 'a 1980s headlamp casting a beam',
  'Wool Blanket': 'a folded red plaid wool blanket',
  'Hand Warmers': 'a pair of hand warmer packets glowing warm',
  'Peppermint Schnapps': 'a small bottle of peppermint schnapps',
  'Energy Bar': 'a foil-wrapped energy bar',
  'Ski Rack': 'a wooden ski rack',
  'Spare Transceiver': 'a yellow avalanche transceiver with a blinking light',
  'Air Horn': 'a red air horn canister',
  'Snowmobile Keys': 'a snowmobile key on a coiled lanyard',
  // radio
  'Mic Stand': 'a heavy chrome microphone stand',
  'Tower Wrench': 'a huge steel tower wrench',
  'Pneumatic Nail Gun': 'a yellow pneumatic nail gun with an air hose',
  'Halon Extinguisher': 'a silver halon fire extinguisher',
  'Heavy Flashlight': 'a long black metal flashlight',
  'Station First-Aid Box': 'a white wall-mounted first-aid box',
  'Headache Pills': 'a bottle of headache pills',
  'Birthday Cake': 'a slice of birthday cake with a single candle',
  'Filing Cabinet': 'a grey steel filing cabinet',
  'Test-Tone Generator': 'a vintage audio test-tone generator box with dials',
  'Loaded Cart Tape': 'a radio broadcast cart tape cartridge',
  'Station Van Keys': 'a set of van keys with a radio station keychain',
  'Two-Way Radio': 'a CB two-way radio with handset',
};
for (const [name, p] of Object.entries(ITEMS)) add(`item/${slug(name)}`, 'item', `${ITEM}, ${p}, ${STYLE}`, 512, 512, [128, 128]);

// ── 7. Stat symbols (512² → 96²): horror, dice, nerve, health ─────────────
// Used beside the big numbers (status box, heroine vitals, shop meter); tiny inline
// uses stay vector (src/ui/symbols.ts). Shown in a circle, so keep the object centred.
// (Avoid "horror", "blood": the output filter flags them.)
const SYMBOL = 'painted game UI symbol, one bold simple object centered on a plain very dark circular vignette background, chunky readable silhouette that works when shrunk to a tiny size, strong rim light, high contrast';
const SYMBOLS = {
  horror: 'a single wide-open frightened human eye with a tiny pupil and violet iris, red-rimmed lids, cold violet glow',
  dice: 'a single bone-white six-sided die showing three black pips, slightly tilted, warm candle light',
  nerve: 'a round antique gold coin embossed with a jagged lightning bolt, warm golden glow',
  health: 'a glossy crimson heart shape, like a red candy heart, soft red glow',
};
for (const [k, p] of Object.entries(SYMBOLS)) add(`symbol/${k}`, 'symbol', `${SYMBOL}, ${p}, ${STYLE}`, 512, 512, [96, 96]);

export const ASSETS = A;
