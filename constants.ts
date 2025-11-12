import { Hairstyle, HairstyleCategory, Beard, Accessory, AspectRatio } from './types';

export const ASPECT_RATIO_OPTIONS: { label: string; value: AspectRatio }[] = [
    { label: 'Auto', value: 'auto' },
    { label: '1:1', value: '1:1' },
    { label: '2:3', value: '2:3' },
    { label: '3:2', value: '3:2' },
    { label: '3:4', value: '3:4' },
    { label: '4:3', value: '4:3' },
    { label: '4:5', value: '4:5' },
    { label: '5:4', value: '5:4' },
    { label: '9:16', value: '9:16' },
    { label: '16:9', value: '16:9' },
    { label: '21:9', value: '21:9' },
];

export const FEMALE_HAIRSTYLES: HairstyleCategory[] = [
  {
    name: "Short & Chic",
    styles: [
      { id: 'f_pixie_blonde', name: 'Platinum Blonde Pixie with Undercut' },
      { id: 'f_bob_black', name: 'Jet Black Micro-Bang Bob' },
      { id: 'f_lob_silver', name: 'Silver Ombre Lob' },
      { id: 'f_shag', name: 'Modern Shag Haircut' },
      { id: 'f_french_bob', name: 'Classic French Bob' },
      { id: 'f_asym_bob', name: 'Asymmetrical Textured Bob' },
      { id: 'f_cropped_curls', name: 'Tight Cropped Natural Curls' },
      { id: 'f_shag_70s', name: '70s-Style Shag Haircut' },
      { id: 'f_afro_auburn', name: 'Curly Auburn Afro' },
      { id: 'f_asym_bob_deep_part', name: 'Asymmetrical Bob with a Deep Side Part' },
    ]
  },
  {
    name: "Long & Luxurious",
    styles: [
      { id: 'f_wavy_halfup', name: 'Wavy Half-Updo' },
      { id: 'f_curtain_bangs', name: 'Long Hair with Curtain Bangs' },
      { id: 'f_fishtail_braid', name: 'Elegant Fishtail Braid' },
      { id: 'f_long_layers', name: 'Beachy Long Layers' },
      { id: 'f_sleek_ponytail', name: 'High Sleek Ponytail' },
      { id: 'f_voluminous_curls', name: 'Voluminous Hollywood Curls' },
      { id: 'f_low_bun', name: 'Sophisticated Low Chignon Bun' },
      { id: 'f_wavy_halfup_tendrils', name: 'Wavy Half-Updo with Soft Tendrils' },
      { id: 'f_top_knot_messy', name: 'Messy Top Knot with Face-Framing Pieces' },
      { id: 'f_cherry_red_straight', name: 'Long, Straight Cherry-Red Hair' },
    ]
  },
  {
    name: "Bold & Colorful",
    styles: [
      { id: 'f_space_buns_pink', name: 'Pastel Pink Space Buns' },
      { id: 'f_vibrant_blue', name: 'Vibrant Blue Mermaid Hair' },
      { id: 'f_split_dye', name: 'Black and White Split Dye' },
      { id: 'f_fire_ombre', name: 'Fire Red to Orange Ombre' },
      { id: 'f_neon_green', name: 'Neon Green Wolf Cut' },
      { id: 'f_rainbow_braids', name: 'Rainbow Gradient Braided Style' },
      { id: 'f_purple_mohawk', name: 'Metallic Purple Faux Mohawk' },
      { id: 'f_space_buns_vibrant_pink', name: 'Vibrant Pink Space Buns' },
      { id: 'f_mermaid_waves_blue', name: 'Vibrant Blue Mermaid Waves' },
      { id: 'f_purple_pastel_balayage', name: 'Purple Pastel Balayage on Wavy Hair' },
    ]
  },
  {
    name: "Afro & Textured Hair",
    styles: [
      { id: 'f_fulani_braids', name: 'Fulani Braids with Wooden Beads' },
      { id: 'f_high_puff', name: 'High Puff Afro Ponytail' },
      { id: 'f_twist_out', name: 'Defined Twist Out on Natural Hair' },
      { id: 'f_bantu_knots', name: 'Sleek Bantu Knots' },
      { id: 'f_tapered_cut', name: 'Short Tapered Natural Cut' },
      { id: 'f_goddess_locs', name: 'Bohemian Goddess Locs' },
      { id: 'f_passion_twists', name: 'Long Passion Twists' },
      { id: 'f_cornrows_intricate', name: 'Intricate Cornrow Updo' },
      { id: 'f_wash_and_go', name: 'Defined Wash-and-Go Curls' },
      { id: 'f_finger_coils', name: 'Tight Finger Coils' }
    ]
  },
  {
    name: "Short & Shaved",
    styles: [
      { id: 'f_shaved_clean', name: 'Clean Shaved Head' },
      { id: 'f_buzz_bold', name: 'Bold Buzz Cut' },
      { id: 'f_undercut_design', name: 'Dramatic Undershave with a design' },
      { id: 'f_buzz_blonde', name: 'Platinum Blonde Buzz Cut' },
    ]
  }
];

export const MALE_HAIRSTYLES: HairstyleCategory[] = [
  {
    name: "Modern Fades",
    styles: [
      { id: 'm_high_fade_quiff', name: 'High-Fade with Textured Quiff' },
      { id: 'm_slick_undercut', name: 'Slicked-Back Undercut' },
      { id: 'm_pompadour', name: 'Modern Pompadour' },
      { id: 'm_taper_fade', name: 'Taper Fade with Curls on Top' },
      { id: 'm_skin_fade', name: 'Skin Fade with Hard Part' },
      { id: 'm_faux_hawk', name: 'Spiky Faux Hawk Fade' },
      { id: 'm_pompadour_tapered', name: 'Modern Pompadour with Tapered Sides' },
      { id: 'm_crop_top_fade', name: 'Textured Crop Top Fade' },
      { id: 'm_mohawk_fade', name: 'Mohawk Fade' },
    ]
  },
  {
    name: "Business Casual",
    styles: [
      { id: 'm_side_part', name: 'Classic Side-Part' },
      { id: 'm_ivy_league', name: 'Ivy League Cut' },
      { id: 'm_brushed_back', name: 'Brushed Back Medium Length' },
      { id: 'm_short_combover', name: 'Short Combover' },
      { id: 'm_gentleman_cut', name: 'Gentleman\'s Cut' },
      { id: 'm_caesar', name: 'Textured Caesar Cut' },
      { id: 'm_medium_slick', name: 'Medium Slick Side-Sweep' },
      { id: 'm_combover_salt_pepper', name: 'Salt and Pepper Comb Over' },
      { id: 'm_side_part_classic', name: 'Classic Side-Part Hairstyle' },
    ]
  },
  {
    name: "Long & Textured",
    styles: [
      { id: 'm_messy_fringe', name: 'Messy Fringe' },
      { id: 'm_bro_flow', name: 'Medium-Length Bro Flow' },
      { id: 'm_man_bun', name: 'Man Bun with Undercut' },
      { id: 'm_long_waves', name: 'Textured Long Waves' },
      { id: 'm_half_ponytail', name: 'Half-Up Ponytail' },
      { id: 'm_shoulder_shag', name: 'Shoulder-Length Shag' },
      { id: 'm_dreadlocks', name: 'Long Natural Dreadlocks' },
      { id: 'm_messy_fringe_short_sides', name: 'Messy Fringe with Short Sides' },
      { id: 'm_short_curls_lineup', name: 'Short Curly Hair with a Line-up' },
      { id: 'm_man_bun_beard', name: 'Man Bun with a Full Beard' },
      { id: 'm_surfer_long', name: 'Long Surfer Hair, Sun-Kissed' },
      { id: 'm_dreadlocks_short', name: 'Short Dreadlocks' },
    ]
  },
  {
    name: "Afro & Textured Hair",
    styles: [
      { id: 'm_high_top_fade', name: 'Classic High Top Fade' },
      { id: 'm_360_waves', name: 'Deep 360 Waves' },
      { id: 'm_short_locs_undercut', name: 'Short Locs with a Fade Undercut' },
      { id: 'm_twists_taper', name: 'Two-Strand Twists with Taper Fade' },
      { id: 'm_sponge_curls', name: 'Sponge Curls with a Sharp Line-up' },
      { id: 'm_afro_parted', name: 'Mid-Length Afro with a Hard Part' },
      { id: 'm_cornrows_straight', name: 'Straight Back Cornrows' },
      { id: 'm_freeform_locs', name: 'Short Freeform Locs' },
      { id: 'm_curly_fade', name: 'High Curly Fade' },
      { id: 'm_flat_top', name: 'Geometric Flat Top' }
    ]
  },
  {
    name: "Short & Shaved",
    styles: [
      { id: 'm_shaved_clean', name: 'Clean Shaved Head' },
      { id: 'm_buzz_cut_zero', name: 'Close-Cropped Buzz Cut (Zero Guard)' },
      { id: 'm_buzz_cut_lineup', name: 'Clean Buzz Cut with Line-up' },
      { id: 'm_high_and_tight', name: 'High and Tight Recon' },
    ]
  }
];

export const AVANT_GARDE_HAIRSTYLES: HairstyleCategory = {
  name: "Avant-Garde & Edgy",
  styles: [
    { id: 'ag_cyberpunk', name: 'Cyberpunk Braids with Neon Highlights' },
    { id: 'ag_sculptural', name: 'Geometric Sculptural Hair' },
    { id: 'ag_victory_rolls', name: 'Futuristic Victory Rolls' },
    { id: 'ag_crystal', name: 'Hair Adorned with Glowing Crystals' },
    { id: 'ag_holographic', name: 'Holographic Shaved Head Design' },
    { id: 'ag_feather', name: 'Avant-Garde Feather-Embedded Style' },
    { id: 'ag_metallic_spikes', name: 'Metallic Chrome Spiked Hair' },
  ]
};

export const MALE_BEARDS: Beard[] = [
  { id: 'b_none', name: 'Clean Shaven' },
  { id: 'b_stubble_light', name: 'Light Stubble' },
  { id: 'b_stubble_heavy', name: 'Heavy Stubble (5 o\'clock shadow)' },
  { id: 'b_full_beard_short', name: 'Short Full Beard' },
  { id: 'b_boxed_beard', name: 'Short Boxed Beard' },
  { id: 'b_corporate_beard', name: 'Corporate Beard' },
  { id: 'b_full_beard_medium', name: 'Medium Full Beard' },
  { id: 'b_full_beard_long', name: 'Long Full Beard' },
  { id: 'b_goatee', name: 'Classic Goatee' },
  { id: 'b_goatee_extended', name: 'Extended Goatee' },
  { id: 'b_circle_beard', name: 'Circle Beard' },
  { id: 'b_van_dyke', name: 'Van Dyke' },
  { id: 'b_anchor_beard', name: 'Anchor Beard' },
  { id: 'b_balbo', name: 'Balbo Beard' },
  { id: 'b_mutton_chops', name: 'Mutton Chops' },
  { id: 'b_friendly_mutton_chops', name: 'Friendly Mutton Chops' },
  { id: 'b_verdi', name: 'Verdi Beard' },
  { id: 'b_garibaldi', name: 'Garibaldi Beard' },
  { id: 'b_dutch', name: 'Old Dutch Beard' },
  { id: 'b_moustache_chevron', name: 'Chevron Moustache' },
  { id: 'b_moustache_handlebar', name: 'Handlebar Moustache' },
  { id: 'b_moustache_pencil', name: 'Pencil Moustache' },
  { id: 'b_moustache_walrus', name: 'Walrus Moustache' },
  { id: 'b_soul_patch', name: 'Soul Patch' },
];

export const FEMALE_ACCESSORIES: Accessory[] = [
  { id: 'a_none', name: 'None' },
  { id: 'a_earrings_stud_diamond', name: 'Diamond Stud Earrings' },
  { id: 'a_earrings_hoop_gold', name: 'Large Gold Hoop Earrings' },
  { id: 'a_earrings_pearl_drop', name: 'Pearl Drop Earrings' },
  { id: 'a_earrings_tassel', name: 'Bohemian Tassel Earrings' },
  { id: 'a_necklace_dainty_silver', name: 'Dainty Silver Necklace' },
  { id: 'a_necklace_layered_gold', name: 'Layered Gold Chains' },
  { id: 'a_necklace_pearl_strand', name: 'Classic Pearl Strand Necklace' },
  { id: 'a_choker_velvet', name: 'Black Velvet Choker' },
  { id: 'a_glasses_reading_stylish', name: 'Stylish Reading Glasses' },
  { id: 'a_glasses_cateye', name: 'Tortoiseshell Cat-Eye Glasses' },
  { id: 'a_glasses_rimless', name: 'Modern Rimless Glasses' },
  { id: 'a_sunglasses_aviator', name: 'Classic Aviator Sunglasses' },
  { id: 'a_sunglasses_oversized', name: 'Oversized Glam Sunglasses' },
  { id: 'a_sunglasses_wayfarer', name: 'Retro Wayfarer Sunglasses' },
  { id: 'a_headband_simple', name: 'Simple Alice Band' },
  { id: 'a_headband_knotted', name: 'Knotted Fabric Headband' },
  { id: 'a_headscarf_silk', name: 'Silk Headscarf (Tied)' },
  { id: 'a_hat_sun', name: 'Wide-brimmed Sun Hat' },
  { id: 'a_hat_beret', name: 'Chic Parisian Beret' },
  { id: 'a_hat_beanie', name: 'Slouchy Beanie' },
  { id: 'a_nose_stud', name: 'Subtle Nose Stud' },
  { id: 'a_septum_ring', name: 'Delicate Septum Ring' },
];

export const POSE_PROMPTS: string[] = [
  'Render a new portrait expression of them mid-laugh, head slightly back, eyes crinkled, three-quarter view right.',
  'Render a new portrait expression of them with a confident smirk, chin tucked, eyes up to the lens, head tilted right.',
  'Render a new portrait expression of them thoughtful, three-quarter profile left, hand at chin, eyes off-camera.',
  'Render a new portrait expression of them winking playfully, head tilted left, one hand brushing hair away.',
  'Render a new portrait expression of them serene with closed eyes, head gently bowed.',
  'Render a new portrait expression of them surprised and delighted, brows raised, mouth open, hands near cheeks.',
  'Render a new portrait expression of them fierce and determined, chin lifted, jaw set, direct eye contact.',
  'Render a new portrait expression of them in deep concentration, brows furrowed, slight squint, gaze down-left.',
  'Render a new portrait expression of them looking upward with hopeful eyes, gaze top-right, subtle smile, neck elongated.',
  'Render a new portrait expression of them serious and intense, neutral lips, straight-on to camera.',
  'Render a new portrait expression of them with a powerful, heroic gaze, camera low angle, shoulders squared, hair gently wind-swept.',
  'Render a new portrait expression of them shy and blushing, eyes down-left, half-smile, one shoulder raised toward the ear.',
  'Render a new portrait expression of them glancing over the left shoulder, half-smile, collarbone and jawline emphasized.',
  'Render a new portrait expression of them puzzled, one eyebrow raised, lips slightly pursed, head tilted forward.',
  'Render a new portrait expression of them calm and confident, micro-smile, eyes locked on lens,',
  'Render a new portrait expression of them shushing gently, index finger to lips, eyes wide to camera.',
];


export const HAIR_COLORS: string[] = [
  // Black
  'natural jet black',
  'natural soft black',
  'natural blue-black',

  // Brown (by depth + undertone)
  'natural dark brown',
  'natural medium brown',
  'natural light brown',
  'natural dark ash brown',
  'natural medium ash brown',
  'natural light ash brown',
  'natural dark neutral brown',
  'natural medium neutral brown',
  'natural light neutral brown',
  'natural dark golden brown',
  'natural medium golden brown',
  'natural light golden brown',

  // Red / Auburn
  'natural dark auburn',
  'natural medium auburn',
  'natural light auburn',
  'natural copper red',
  'natural light copper red',
  'natural ginger red',

  // Blonde (by depth + undertone)
  'natural very light platinum blonde',
  'natural light ash blonde',
  'natural light neutral blonde',
  'natural light golden blonde',
  'natural medium ash blonde',
  'natural medium neutral blonde',
  'natural medium golden blonde',
  'natural dark ash blonde',
  'natural dark neutral blonde',
  'natural dark golden blonde',
  'natural strawberry blonde',

  // Bronde (brown–blonde mix)
  'natural dark bronde',
  'natural medium bronde',
  'natural light bronde',

  // Gray / White
  'natural dark gray',
  'natural medium gray',
  'natural light gray',
  'natural salt and pepper',
  'natural white'
];


export const BOLD_HAIR_COLORS: string[] = [
  'electric blue',
  'cobalt blue',
  'royal blue',
  'pastel blue',
  'turquoise',
  'teal',
  'aquamarine',
  'indigo',
  'hot pink',
  'bubblegum pink',
  'pastel pink',
  'magenta',
  'lavender',
  'lilac',
  'violet',
  'amethyst',
  'neon green',
  'mint green',
  'lime green',
  'emerald green',
  'seafoam green',
  'chartreuse',
  'sunset orange',
  'tangerine',
  'coral',
  'peach',
  'fiery red',
  'ruby red',
  'crimson',
  'wine red',
  'lemon yellow',
  'marigold yellow',
  'neon yellow',
  'periwinkle',
  'rose gold',
  'holographic opal',
  'iridescent pearl',
  'oil slick'
];

// Complex techniques using natural shades (no vivid colors)
export const COMPLEX_NATURAL_HAIR_COLORS: string[] = [
  // Ombre / Sombre / Reverse
  'ombre: dark brown roots → medium golden brown mids → light golden blonde ends',
  'ombre: espresso roots → medium ash brown mids → light ash blonde ends',
  'sombre: medium neutral brown roots → light neutral brown ends',
  'sombre: dark blonde roots → light golden blonde ends, soft transition',
  'reverse ombre: light neutral blonde roots → medium brown mids → dark brown ends',
  'bronde ombre: medium brown roots → bronde mids → dark neutral blonde ends',

  // Balayage / Foilayage / AirTouch
  'balayage: caramel highlights on medium neutral brown base',
  'balayage: cool ash-blonde ribbons on dark brown base',
  'foilayage: light neutral blonde panels for high contrast on brown base',
  'AirTouch balayage: airy light blonde ends on dark blonde base',
  'lived-in balayage: sun-lifted mids/ends on medium brown base',

  // Highlights / Lowlights families
  'babylights: fine light neutral blonde weaves on dark blonde base',
  'teasy-lights: softly backcombed highlights for diffused blonde ends',
  'ribbon highlights: wide caramel ribbons through chestnut brown',
  'veil highlights: ultra-fine halo of light blonde over dark blonde',
  'shadow-lowlights: dark chocolate lowlights to add depth to light brown',
  'reverse balayage: adding neutral brown lowlights to over-lightened blonde',

  // Face framing / Placement
  'money-piece highlights: face-framing light golden blonde on brunette',
  'money-piece highlights: soft platinum accent on dark ash blonde',
  'contour highlights: cheekbone-level caramel to frame the face',
  'Scandinavian hairline: bright micro-highlights around the hairline',

  // Root techniques / Tonal blending
  'root shadow: level 8 light blonde lengths with level 6 neutral roots',
  'root tap: minimal 1–2 cm natural root blur on highlighted blonde',
  'root smudge: medium ash brown blended into light ash blonde',
  'zone toning: warm beige mids with cooler ash ends on blonde',
  'color melt: dark auburn roots → copper mids → strawberry blonde ends',
  'color melt: medium brown roots → bronde mids → dark blonde ends',

  // Dip-dye (natural tips) / Tip-outs
  'dip-dye ends: medium brown base + soft caramel tips',
  'dip-dye ends: dark blonde base + subtle strawberry-blonde tips',
  'tip-outs: bright neutral-blonde ends on bronde mids',

  // Underlayers (subtle / natural)
  'underlayer: medium brown top with warm caramel underlayer',
  'underlayer: dark blonde top with cool ash-blonde underlayer',
  'peekaboo underlights: honey blonde hidden under medium brown',

  // Gray blending / Silver work
  'gray blending: salt-and-pepper lows/highs to soften demarcation',
  'smoky root on silver: charcoal root melt into light silver lengths',
  'silver glaze refresh: neutralizing warmth on light gray hair',

  // Partial / Sectional placements
  'partial T-section highlights: bright around part and hairline only',
  'crown halo: micro-highlights focused at crown for lift',
  'nape lights: subtle light blonde at nape for updo brightness',

  // Tone-specific blonding/bronding
  'lived-in bronde: medium brown base with neutral-beige blonde ends',
  'buttery-beige blonde: balanced warm-neutral highlight mix on dark blonde',

  // Correction / Refinement
  'banding correction: lowlight + glaze to even uneven blonde',
  'brass neutralization glaze: cool ash toner over warm blonde',
  'depth return: strategic neutral-brown lowlights to reduce over-lightening'
];


export const MULTICOLOR_BOLD_HAIR_COLORS: string[] = [
  // Split-dye / Two-tone
  'split-dye (left/right): jet black + platinum blonde',
  'split-dye (left/right): dark brown + vibrant purple',
  'split-dye (top/bottom): natural brown + teal underlayer',
  'split-dye (diagonal): slate gray + neon green',
  'split-dye (front/back): cobalt crown + charcoal nape',
  'split-dye bangs: platinum fringe with jet black lengths',
  'four-panel block color: violet + teal + magenta + cobalt',

  // Panels / Streaks
  'face-frame vivid streaks: alternating magenta and indigo',
  'chunky color panels: emerald and cobalt through espresso base',
  'high-contrast paneling: cyan blocks against black lob',
  'checkerboard undercut dye: black + platinum grid',

  // Underlayers / Peekaboo
  'underlayer: natural top with electric blue underlayer',
  'peekaboo underlights: vivid magenta hidden under jet black',
  'dual underlayer: teal on left underlayer, purple on right',
  'gradient underlayer: sea green → aqua under neutral brown',
  'rainbow underlayer: concealed spectrum under neutral top',

  // Multicolor melts / gradients
  'neon melt: magenta → violet → cobalt',
  'oil-slick iridescent on black base (blue/green/purple shift)',
  'sunrise melt: coral → tangerine → golden yellow',
  'aurora melt: teal → sea green → violet',
  'galaxy blend: indigo → violet → fuchsia with silver micro-specks',
  'tropical surf: turquoise roots → aqua mids → deep blue ends',
  'CMY cyber melt: cyan roots → magenta mids → yellow ends',
  'peacock blend: emerald → teal → sapphire',
  'cotton-candy fade: pastel pink → lavender → baby blue',

  // Dip-dye / Tips
  'dip-dye ends: charcoal base + neon lime tips',
  'dip-dye ends: dark brown base + cobalt blue tips',
  'dip-dye ends: platinum base + hot pink tips',
  'reverse melt: platinum roots → jet-blue ends',

  // Special effects / Finishes
  'holographic opal glaze over charcoal base',
  'iridescent pearl overlay on platinum (cyan/magenta shift)',
  'UV-reactive neon panels on midnight base',
  'oil-slick micro-lights on deep navy base'
];

export const BABY_AGES = [
  { id: 'newborn', name: 'Newborn (0-6 mo)', prompt: 'a newborn baby, approximately 0-6 months old' },
  { id: 'infant', name: 'Infant (6-12 mo)', prompt: 'an infant, approximately 6-12 months old' },
  { id: 'toddler', name: 'Toddler (1-3 yrs)', prompt: 'a toddler, approximately 1-3 years old' },
  { id: 'child', name: 'Child (4-6 yrs)', prompt: 'a young child, approximately 4-6 years old' },
];

export const BABY_COMPOSITIONS = [
  // Single item category renamed to its actual name
  {
    name: "Solo Portrait",
    options: [
      { id: 'solo', name: 'Solo Portrait', prompt: 'a solo close-up portrait of the child' }
    ]
  },
  {
    name: "Classic Portraits",
    options: [
      { id: 'solo_full', name: 'Solo Full Body', prompt: 'a full body portrait of the child' },
      { id: 'overhead_swaddle', name: 'Overhead Swaddled', prompt: 'shot from above while the child is gently swaddled, centered in frame' },
      { id: 'tummy_time', name: 'Tummy Time', prompt: 'on a soft blanket during tummy time, chin propped, eyes toward camera' },
      { id: 'crib_topdown', name: 'Crib Top-Down', prompt: 'top-down shot with the child lying in a crib, rails subtly framing the scene' },
      { id: 'blanket_sit', name: 'Sitting on Blanket', prompt: 'sitting on a textured knit blanket, simple centered composition' },
      { id: 'wrapped_blanket', name: 'Wrapped in Blanket', prompt: 'wrapped snugly in a neutral knit blanket, shoulders up composition' },
    ]
  },
  {
    name: "Family & Pets",
    options: [
      { id: 'held', name: 'Held by Parent', prompt: 'the child being held lovingly by one of the parents (whose face is out of frame)' },
      { id: 'both_parents', name: 'With Both Parents', prompt: 'a family portrait with the child and both parents, all smiling happily' },
      { id: 'pet_puppy', name: 'With a Puppy', prompt: 'the child playing gently with a friendly golden retriever puppy' },
      { id: 'pet_kitten', name: 'With a Kitten', prompt: 'the child curiously looking at a small, fluffy kitten' },
      { id: 'sibling_hug', name: 'With Sibling', prompt: 'a gentle side-by-side pose with an older sibling giving a soft hug' },
      { id: 'grandparent_hands', name: 'Grandparent Hands', prompt: 'the child held safely in the hands/arms of a grandparent (grandparent faces out of frame)' },
      { id: 'plush_friend', name: 'With Plush Toy', prompt: 'the child holding a small neutral-colored stuffed animal' },
    ]
  }
];

export const BABY_BACKGROUNDS = [
  // Single item category renamed to its actual name
  {
    name: "Beige Studio",
    options: [
      { id: 'studio_beige', name: 'Beige Studio', prompt: 'against a warm, plain beige studio backdrop' }
    ]
  },
  {
    name: "Indoor",
    options: [
      { id: 'nursery_sunlit', name: 'Sunlit Nursery', prompt: 'in a beautifully decorated, sunlit nursery in the morning' },
      { id: 'nursery_cozy', name: 'Cozy Nursery', prompt: 'in a cozy, warmly lit nursery at night' },
      { id: 'living_room', name: 'Living Room', prompt: 'on a soft rug in a modern, clean living room' },
      { id: 'playroom', name: 'Playroom', prompt: 'surrounded by toys in a colorful playroom' },
      { id: 'window_light_bedroom', name: 'Bedroom Window Light', prompt: 'near a bedroom window with soft natural daylight and airy curtains' },
      { id: 'highchair_kitchen', name: 'Kitchen Highchair', prompt: 'seated in a clean highchair by a tidy kitchen table' },
    ]
  },
  {
    name: "Outdoor",
    options: [
      { id: 'park_sunny', name: 'Sunny Park', prompt: 'outdoors in a lush green park on a sunny day' },
      { id: 'park_autumn', name: 'Autumn Park', prompt: 'outdoors in a park with colorful autumn leaves on the ground' },
      { id: 'beach_day', name: 'Beach Day', prompt: 'at the beach, with soft sand and gentle waves in the background' },
      { id: 'garden', name: 'Flower Garden', prompt: 'in a beautiful flower garden with soft, diffused light' },
      { id: 'spring_blossoms', name: 'Spring Blossoms', prompt: 'under light pink blossoms with gentle dappled shade' },
      { id: 'meadow_evening', name: 'Meadow at Dusk', prompt: 'in a meadow at golden hour with long, soft shadows' },
    ]
  },
  {
    name: "Studio & Plain",
    options: [
      { id: 'studio_minimalist', name: 'Minimalist Studio', prompt: 'against a minimalist, professional studio backdrop' },
      { id: 'studio_grey', name: 'Grey Studio', prompt: 'against a soft, neutral grey studio backdrop' },
      { id: 'white_seamless', name: 'Plain White', prompt: 'against a clean, seamless white background' },
      { id: 'offwhite_seamless', name: 'Off-White Seamless', prompt: 'against a soft off-white seamless background' },
      { id: 'pastel_blue', name: 'Pastel Blue', prompt: 'against a pale pastel blue studio backdrop' },
      { id: 'textured_muslin', name: 'Textured Muslin', prompt: 'against a lightly textured neutral muslin backdrop' },
    ]
  }
];

export const BABY_CLOTHING_STYLES_UNISEX = [
  {
    name: "White Onesie",
    options: [
      { id: 'onesie_white', name: 'White Onesie', prompt: 'wearing a simple, clean white onesie' }
    ]
  },
  {
    name: "Cozy & Casual",
    options: [
      { id: 'pajamas_soft', name: 'Soft Pajamas', prompt: 'wearing cozy, soft pajamas' },
      { id: 'knitted_sweater', name: 'Knitted Sweater', prompt: 'wearing a chunky, hand-knitted sweater' },
      { id: 'footed_sleeper', name: 'Footed Sleeper', prompt: 'wearing a zip-up footed sleeper in a neutral tone' },
      { id: 'knit_romper', name: 'Knit Romper', prompt: 'wearing a soft knit romper with minimal pattern' },
      { id: 'overalls', name: 'Overalls', prompt: 'wearing classic denim overalls over a simple tee' },
      { id: 'swaddle_wrap', name: 'Swaddle Wrap', prompt: 'gently swaddled in a neutral cotton wrap' },
    ]
  },
  {
    name: "Fun Costumes",
    options: [
      { id: 'onesie_animal_bear', name: 'Bear Onesie', prompt: 'wearing a cute and fluffy bear onesie' },
      { id: 'onesie_animal_dino', name: 'Dinosaur Onesie', prompt: 'wearing a funny dinosaur onesie' },
      { id: 'superhero', name: 'Superhero Cape', prompt: 'wearing a tiny superhero cape over their clothes' },
      { id: 'onesie_bunny', name: 'Bunny Onesie', prompt: 'wearing a soft bunny onesie with long ears' },
      { id: 'pumpkin_romper', name: 'Pumpkin Romper', prompt: 'wearing a pumpkin-themed romper in warm orange tones' },
      { id: 'astronaut', name: 'Astronaut Suit', prompt: 'wearing a simple astronaut-themed onesie' },
    ]
  }
];

export const BABY_CLOTHING_STYLES_BOY = [
  {
    name: "Dressed Up (Boy)",
    options: [
      { id: 'formal_smart_boy', name: 'Smart Formal Wear', prompt: 'wearing a smart, formal outfit for a special occasion, like a little suit' },
      { id: 'suspenders', name: 'Suspenders & Bowtie', prompt: 'wearing a tiny shirt with suspenders and a bow tie' },
      { id: 'vest_set', name: 'Vest Set', prompt: 'wearing a neat vest set with tailored trousers' },
      { id: 'polo_shirt', name: 'Polo Shirt & Shorts', prompt: 'wearing a classic polo shirt with khaki shorts'},
      { id: 'newsboy_cap', name: 'Newsboy Cap Outfit', prompt: 'wearing a vintage-style outfit with a newsboy cap'}
    ]
  }
];

export const BABY_CLOTHING_STYLES_GIRL = [
  {
    name: "Dressed Up (Girl)",
    options: [
      { id: 'formal_smart_girl', name: 'Smart Formal Wear', prompt: 'wearing a smart, formal outfit for a special occasion, like a lovely dress' },
      { id: 'dress_frilly', name: 'Frilly Dress', prompt: 'wearing a beautiful, frilly party dress' },
      { id: 'tutu_set', name: 'Tulle Skirt Set', prompt: 'wearing a soft tulle skirt with a simple top' },
      { id: 'floral_dress', name: 'Floral Sundress', prompt: 'wearing a light and airy floral sundress'},
      { id: 'headband_bow', name: 'Outfit with Headband', prompt: 'wearing a cute outfit complemented by a matching headband with a bow'}
    ]
  }
];

export const BABY_ACTIONS = [
  // Single item category renamed to its actual name
  {
    name: "Smiling at Camera",
    options: [
      { id: 'smiling_camera', name: 'Smiling at Camera', prompt: 'looking directly at the camera with a gentle, happy smile' }
    ]
  },
  {
    name: "Happy & Calm",
    options: [
      { id: 'giggling', name: 'Giggling', prompt: 'giggling with a joyful, open-mouthed smile' },
      { id: 'sleeping', name: 'Sleeping Peacefully', prompt: 'sleeping peacefully' },
      { id: 'calm_observing', name: 'Calmly Observing', prompt: 'calmly observing something just out of frame' },
      { id: 'cooing', name: 'Cooing', prompt: 'cooing softly with relaxed eyes' },
      { id: 'soft_clap', name: 'Gentle Clapping', prompt: 'gently clapping hands together' },
    ]
  },
  {
    name: "Playful & Curious",
    options: [
      { id: 'playing_blocks', name: 'Playing with Blocks', prompt: 'happily playing with colorful wooden blocks' },
      { id: 'crawling', name: 'Crawling Towards Camera', prompt: 'crawling towards the camera with a determined look' },
      { id: 'curious_camera', name: 'Curious Expression', prompt: 'with a curious expression, looking directly at the camera with wide eyes' },
      { id: 'peekaboo', name: 'Playing Peekaboo', prompt: 'playing peekaboo from behind a small blanket' },
      { id: 'reaching_toy', name: 'Reaching for Toy', prompt: 'reaching out one hand toward a small toy in the foreground' },
      { id: 'stacking_cups', name: 'Stacking Cups', prompt: 'stacking nesting cups with focused attention' },
      { id: 'first_steps_supported', name: 'First Steps (Supported)', prompt: 'taking first steps while holding onto a stable object' },
    ]
  },
  {
    name: "Expressive",
    options: [
      { id: 'yawning', name: 'Big Yawn', prompt: 'in the middle of a big, adorable yawn' },
      { id: 'puzzled', name: 'Puzzled Look', prompt: 'with a slightly puzzled or confused expression' },
      { id: 'surprised', name: 'Surprised Face', prompt: 'with a surprised "O" face, eyes wide' },
      { id: 'pouting', name: 'Pouting', prompt: 'with a small pout and furrowed brow' },
      { id: 'raspberry', name: 'Blowing Raspberries', prompt: 'sticking out the tongue slightly while blowing a raspberry' },
      { id: 'sneeze_moment', name: 'Mid-Sneeze Blink', prompt: 'caught mid-sneeze with eyes gently closed' },
    ]
  }
];

// --- IMAGE STUDIO CONSTANTS ---

export const CROP_RATIOS = [
  { label: '21:9', value: 21 / 9 },
  { label: '16:9', value: 16 / 9 },
  { label: '5:4', value: 5 / 4 },
  { label: '4:3', value: 4 / 3 },
  { label: '3:2', value: 3 / 2 },
  { label: '1:1', value: 1 },
  { label: '2:3', value: 2 / 3 },
  { label: '3:4', value: 3 / 4 },
  { label: '4:5', value: 4 / 5 },
  { label: '9:16', value: 9 / 16 },
  { label: '9:21', value: 9 / 21 },
];

export const NANO_BANANA_RATIOS = [
  '1:1', '4:5', '3:4', '2:3', '9:16', '5:4', '4:3', '3:2', '16:9', '21:9'
];

export const FLUX_KONTEXT_PRO_RATIOS = [
  '21:9', '16:9', '4:3', '3:2', '1:1', '2:3', '3:4', '9:16', '9:21'
];

// 2K Resolution Presets (around 2048px on long edge)
export const ASPECT_RATIO_PRESETS_2K = [
    { label: '1:1', width: 2048, height: 2048 },
    { label: '4:5', width: 1638, height: 2048 },
    { label: '3:4', width: 1536, height: 2048 },
    { label: '2:3', width: 1365, height: 2048 },
    { label: '9:16', width: 1152, height: 2048 },
    { label: '5:4', width: 2048, height: 1638 },
    { label: '4:3', width: 2048, height: 1536 },
    { label: '3:2', width: 2048, height: 1365 },
    { label: '16:9', width: 2048, height: 1152 },
];

// 4K Resolution Presets (around 4576px on long edge, matching SEEDREAM's actual capabilities like 3648x4576)
export const ASPECT_RATIO_PRESETS_4K = [
    { label: '1:1', width: 4576, height: 4576 },
    { label: '4:5', width: 3661, height: 4576 },
    { label: '3:4', width: 3432, height: 4576 },
    { label: '2:3', width: 3051, height: 4576 },
    { label: '9:16', width: 2574, height: 4576 },
    { label: '5:4', width: 4576, height: 3661 },
    { label: '4:3', width: 4576, height: 3432 },
    { label: '3:2', width: 4576, height: 3051 },
    { label: '16:9', width: 4576, height: 2574 },
];

// Legacy export for backward compatibility
export const ASPECT_RATIO_PRESETS = ASPECT_RATIO_PRESETS_2K;

// --- VIDEO ANALYZER CONSTANTS ---

import { AnalysisModel, ImageModel } from './types';

export const imageModels: { id: ImageModel; name: string; requiresImage: boolean }[] = [
    { id: 'imagen-4.0-ultra-generate-001', name: 'Imagen 4 Ultra', requiresImage: false },
    { id: 'imagen-4.0-generate-001', name: 'Imagen 4', requiresImage: false },
    { id: 'imagen-4.0-fast-generate-001', name: 'Imagen 4 Fast', requiresImage: false },
    { id: 'gemini-2.5-flash-image', name: 'Nano Banana (Gemini Edit)', requiresImage: true },
    { id: 'nano-banana', name: 'Nano Banana (Webhook)', requiresImage: true },
    { id: 'seedream', name: 'Seedream 4.0', requiresImage: true },
    { id: 'flux-kontext-pro', name: 'Flux Kontext Pro', requiresImage: true },
];

export const analysisModels: { id: AnalysisModel; name: string }[] = [
    { id: 'gemini-2.5-pro', name: 'Gemini 2.5 Pro' },
    { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash' },
];
