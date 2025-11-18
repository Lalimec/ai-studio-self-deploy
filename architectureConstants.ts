import { ArchitectureScope, ArchitectureStyle, ArchitectureTime, ArchitectureTheme, CameraAngleOption } from './types';

// Architectural Scopes
export const ARCHITECTURE_SCOPES: ArchitectureScope[] = [
  { id: 'interior', name: 'Interior Space' },
  { id: 'exterior', name: 'Building Exterior' },
  { id: 'facade', name: 'Outer Facade' },
  { id: 'garden', name: 'Garden / Courtyard' },
  { id: 'landscape', name: 'Landscape / Outside' },
];

// Interior Design Styles
export const INTERIOR_STYLES: ArchitectureStyle[] = [
  // Modern & Contemporary
  { id: 'modern', name: 'Modern', prompt: 'modern design with clean lines, minimal ornamentation, neutral color palette, sleek furniture, and contemporary fixtures' },
  { id: 'contemporary', name: 'Contemporary', prompt: 'contemporary design with current trends, mixed materials, bold accents, and flowing open spaces' },
  { id: 'minimalist', name: 'Minimalist', prompt: 'minimalist design with essential elements only, monochromatic palette, uncluttered spaces, and functional furniture' },
  { id: 'scandinavian', name: 'Scandinavian', prompt: 'Scandinavian design with light wood tones, white walls, cozy textiles, functional furniture, and natural light emphasis' },
  { id: 'japandi', name: 'Japandi', prompt: 'Japandi design blending Japanese and Scandinavian aesthetics, natural materials, neutral tones, and minimalist zen principles' },

  // Classic & Traditional
  { id: 'traditional', name: 'Traditional', prompt: 'traditional design with rich wood tones, ornate details, classic furniture, crown molding, and timeless elegance' },
  { id: 'victorian', name: 'Victorian', prompt: 'Victorian design with elaborate ornamentation, rich colors, heavy fabrics, ornate furniture, and decorative accessories' },
  { id: 'colonial', name: 'Colonial', prompt: 'Colonial design with symmetrical layout, wood paneling, classic furniture, and historical architectural details' },
  { id: 'french_country', name: 'French Country', prompt: 'French country design with rustic elegance, soft pastels, toile fabrics, distressed furniture, and provincial charm' },
  { id: 'english_cottage', name: 'English Cottage', prompt: 'English cottage design with cozy fabrics, floral patterns, vintage furniture, and charming rustic details' },

  // Mid-Century & Retro
  { id: 'midcentury', name: 'Mid-Century Modern', prompt: 'mid-century modern design with organic curves, tapered legs, bold colors, geometric patterns, and iconic 1950s-60s furniture' },
  { id: 'art_deco', name: 'Art Deco', prompt: 'Art Deco design with geometric patterns, luxurious materials, bold colors, metallic accents, and glamorous 1920s-30s style' },
  { id: 'retro_70s', name: 'Retro 70s', prompt: 'retro 1970s design with earth tones, shag carpets, macramé, bold patterns, and vintage furniture' },
  { id: 'retro_80s', name: 'Retro 80s', prompt: 'retro 1980s design with bold colors, geometric shapes, neon accents, chrome fixtures, and Memphis design elements' },

  // Rustic & Natural
  { id: 'rustic', name: 'Rustic', prompt: 'rustic design with natural wood, stone elements, earthy colors, exposed beams, and handcrafted details' },
  { id: 'farmhouse', name: 'Farmhouse', prompt: 'farmhouse design with shiplap walls, barn doors, vintage accessories, neutral palette, and cozy country charm' },
  { id: 'cabin', name: 'Mountain Cabin', prompt: 'mountain cabin design with log walls, stone fireplace, warm wood tones, cozy textiles, and nature-inspired elements' },
  { id: 'cottage', name: 'Cottage Core', prompt: 'cottage core design with vintage charm, floral patterns, natural materials, soft colors, and romantic countryside aesthetics' },

  // Eclectic & Artistic
  { id: 'bohemian', name: 'Bohemian', prompt: 'bohemian design with vibrant colors, mixed patterns, global textiles, layered textures, plants, and eclectic decor' },
  { id: 'eclectic', name: 'Eclectic', prompt: 'eclectic design mixing various styles, bold colors, diverse textures, unique furniture pieces, and curated collections' },
  { id: 'maximalist', name: 'Maximalist', prompt: 'maximalist design with bold patterns, rich colors, layered textures, abundant decor, and expressive personality' },
  { id: 'moroccan', name: 'Moroccan', prompt: 'Moroccan design with intricate tiles, rich jewel tones, carved wood, lanterns, and exotic textiles' },
  { id: 'mediterranean', name: 'Mediterranean', prompt: 'Mediterranean design with terracotta tiles, arched doorways, warm earth tones, wrought iron, and coastal influences' },

  // Industrial & Urban
  { id: 'industrial', name: 'Industrial', prompt: 'industrial design with exposed brick, metal fixtures, concrete surfaces, Edison bulbs, and warehouse-inspired aesthetics' },
  { id: 'urban_loft', name: 'Urban Loft', prompt: 'urban loft design with open floor plan, exposed ductwork, large windows, concrete floors, and modern city living aesthetics' },
  { id: 'brutalist', name: 'Brutalist', prompt: 'brutalist design with raw concrete, geometric forms, monolithic structures, and bold architectural statements' },

  // Luxurious & Elegant
  { id: 'luxury', name: 'Luxury Modern', prompt: 'luxury modern design with high-end materials, marble accents, designer furniture, sophisticated lighting, and opulent details' },
  { id: 'glamorous', name: 'Hollywood Glamour', prompt: 'Hollywood glamour design with velvet upholstery, mirrored surfaces, crystal chandeliers, and sophisticated elegance' },
  { id: 'neoclassical', name: 'Neoclassical', prompt: 'neoclassical design with Greek and Roman influences, columns, symmetry, elegant moldings, and refined details' },

  // Coastal & Tropical
  { id: 'coastal', name: 'Coastal', prompt: 'coastal design with light blue and white palette, natural textures, nautical elements, and breezy beach-house feel' },
  { id: 'tropical', name: 'Tropical', prompt: 'tropical design with lush greens, natural materials, bamboo elements, vibrant colors, and resort-like atmosphere' },
  { id: 'caribbean', name: 'Caribbean', prompt: 'Caribbean design with bright colors, tropical patterns, open-air feeling, and island-inspired decor' },

  // Asian Inspired
  { id: 'zen', name: 'Zen / Japanese', prompt: 'zen Japanese design with tatami mats, shoji screens, natural materials, minimal furniture, and peaceful simplicity' },
  { id: 'chinese', name: 'Chinese Traditional', prompt: 'traditional Chinese design with lacquered furniture, silk fabrics, ornate carvings, and symbolic decorative elements' },
  { id: 'balinese', name: 'Balinese', prompt: 'Balinese design with teak wood, natural stone, tropical elements, and spa-like serenity' },

  // Special Finishes
  { id: 'unfinished', name: 'Unfinished / Before', prompt: 'unfinished, uncompleted, unfurnished version with bare walls, incomplete construction, minimal or no furniture, exposed subflooring or unfinished surfaces, providing a before-renovation appearance' },
];

// Exterior Architecture Styles
export const EXTERIOR_STYLES: ArchitectureStyle[] = [
  // Modern
  { id: 'modern', name: 'Modern', prompt: 'modern architecture with clean geometric forms, flat or low-pitched roofs, large windows, minimal ornamentation, and contemporary materials' },
  { id: 'contemporary', name: 'Contemporary', prompt: 'contemporary architecture with asymmetrical forms, mixed materials, sustainable features, and current design trends' },
  { id: 'minimalist', name: 'Minimalist', prompt: 'minimalist architecture with pure geometric forms, monochromatic palette, smooth surfaces, and essential elements only' },
  { id: 'bauhaus', name: 'Bauhaus', prompt: 'Bauhaus architecture with functional design, geometric shapes, flat roofs, steel and glass materials, and form-follows-function principles' },

  // Traditional
  { id: 'colonial', name: 'Colonial', prompt: 'Colonial architecture with symmetrical facade, columns, shutters, brick or wood siding, and traditional American proportions' },
  { id: 'victorian', name: 'Victorian', prompt: 'Victorian architecture with ornate details, turrets, wraparound porches, decorative trim, and asymmetrical design' },
  { id: 'craftsman', name: 'Craftsman', prompt: 'Craftsman architecture with low-pitched roofs, exposed beams, stone or wood details, and handcrafted elements' },
  { id: 'tudor', name: 'Tudor', prompt: 'Tudor architecture with half-timbering, steep gabled roofs, tall windows, and medieval English influences' },
  { id: 'georgian', name: 'Georgian', prompt: 'Georgian architecture with symmetrical design, brick facade, classical proportions, and refined details' },

  // European
  { id: 'mediterranean', name: 'Mediterranean', prompt: 'Mediterranean architecture with terracotta roof tiles, stucco walls, arched windows and doorways, and warm earth tones' },
  { id: 'spanish', name: 'Spanish Colonial', prompt: 'Spanish Colonial architecture with white stucco, red tile roofs, wrought iron details, and courtyard design' },
  { id: 'french', name: 'French Provincial', prompt: 'French Provincial architecture with steep hip roofs, arched windows, stone or brick facade, and elegant symmetry' },
  { id: 'italian', name: 'Italian Villa', prompt: 'Italian villa architecture with stucco exterior, tile roof, arched openings, and Renaissance influences' },

  // American Regional
  { id: 'farmhouse', name: 'Farmhouse', prompt: 'farmhouse architecture with gabled roof, board-and-batten or clapboard siding, wrap-around porch, and rural American character' },
  { id: 'ranch', name: 'Ranch', prompt: 'ranch-style architecture with single-story layout, low-pitched roof, attached garage, and horizontal emphasis' },
  { id: 'cape_cod', name: 'Cape Cod', prompt: 'Cape Cod architecture with steep gabled roof, dormer windows, symmetrical design, and New England coastal charm' },
  { id: 'prairie', name: 'Prairie Style', prompt: 'Prairie style architecture with horizontal lines, flat or hipped roofs, overhanging eaves, and Frank Lloyd Wright influences' },

  // Contemporary Styles
  { id: 'midcentury', name: 'Mid-Century Modern', prompt: 'mid-century modern architecture with flat planes, large glass windows, integration with nature, and 1950s-60s design principles' },
  { id: 'art_deco', name: 'Art Deco', prompt: 'Art Deco architecture with geometric patterns, vertical emphasis, decorative details, and 1920s-30s glamour' },
  { id: 'postmodern', name: 'Postmodern', prompt: 'postmodern architecture with playful forms, historical references, bold colors, and eclectic design elements' },

  // Specialized
  { id: 'brutalist', name: 'Brutalist', prompt: 'brutalist architecture with raw concrete, massive geometric forms, repetitive modular elements, and bold structural expression' },
  { id: 'industrial', name: 'Industrial', prompt: 'industrial architecture with exposed steel, brick, large windows, warehouse aesthetic, and utilitarian design' },
  { id: 'eco', name: 'Eco / Sustainable', prompt: 'eco-sustainable architecture with green roofs, solar panels, natural materials, and environmentally conscious design' },
  { id: 'futuristic', name: 'Futuristic', prompt: 'futuristic architecture with innovative forms, cutting-edge materials, curved surfaces, and sci-fi inspired design' },

  // Special
  { id: 'unfinished', name: 'Under Construction', prompt: 'under construction with exposed framing, incomplete exterior, construction materials visible, scaffolding, and unfinished building state' },
];

// Facade Styles (focused on facade details)
export const FACADE_STYLES: ArchitectureStyle[] = [
  { id: 'modern_glass', name: 'Modern Glass Curtain Wall', prompt: 'modern glass curtain wall facade with floor-to-ceiling glazing, minimal frames, reflective surfaces, and sleek contemporary appearance' },
  { id: 'brick_traditional', name: 'Traditional Brick', prompt: 'traditional brick facade with classic masonry patterns, mortar joints, and timeless texture' },
  { id: 'stone_veneer', name: 'Natural Stone Veneer', prompt: 'natural stone veneer facade with layered stone panels, varied textures, and earthy colors' },
  { id: 'stucco', name: 'Stucco Finish', prompt: 'stucco facade with smooth or textured plaster finish, painted or natural earth tones' },
  { id: 'wood_siding', name: 'Wood Siding', prompt: 'wood siding facade with horizontal or vertical boards, natural grain, and warm wood tones' },
  { id: 'metal_panels', name: 'Metal Cladding Panels', prompt: 'metal cladding panels facade with corrugated or flat metal sheets, industrial aesthetic, and modern finish' },
  { id: 'terracotta', name: 'Terracotta Panels', prompt: 'terracotta panel facade with warm clay colors, modular design, and Mediterranean influences' },
  { id: 'green_wall', name: 'Living Green Wall', prompt: 'living green wall facade with vertical gardens, lush vegetation, and sustainable bio-architecture' },
  { id: 'parametric', name: 'Parametric Design', prompt: 'parametric facade with complex geometric patterns, algorithmic design, and computational architecture' },
  { id: 'traditional_ornate', name: 'Ornate Classical', prompt: 'ornate classical facade with columns, cornices, decorative moldings, and historical architectural details' },
  { id: 'unfinished', name: 'Exposed Structure', prompt: 'exposed structural facade with visible framing, unfinished exterior walls, construction materials, and incomplete cladding' },
];

// Garden / Courtyard Styles
export const GARDEN_STYLES: ArchitectureStyle[] = [
  // Formal Gardens
  { id: 'formal_french', name: 'Formal French Garden', prompt: 'formal French garden with geometric patterns, manicured hedges, symmetrical layout, gravel paths, and classical statuary' },
  { id: 'formal_english', name: 'Formal English Garden', prompt: 'formal English garden with structured borders, topiary, rose beds, lawn areas, and traditional garden architecture' },
  { id: 'italian_renaissance', name: 'Italian Renaissance', prompt: 'Italian Renaissance garden with terraced levels, fountains, cypress trees, stone balustrades, and classical proportions' },

  // Natural & Wild
  { id: 'cottage_garden', name: 'Cottage Garden', prompt: 'cottage garden with informal planting, mixed flowers, curved paths, climbing roses, and romantic wildflower aesthetic' },
  { id: 'wildflower', name: 'Wildflower Meadow', prompt: 'wildflower meadow garden with native plants, natural grasses, pollinator-friendly flowers, and naturalistic landscape' },
  { id: 'woodland', name: 'Woodland Garden', prompt: 'woodland garden with shade-loving plants, natural stone paths, moss, ferns, and forest-like atmosphere' },

  // Asian Inspired
  { id: 'zen_japanese', name: 'Zen Japanese Garden', prompt: 'zen Japanese garden with raked gravel, stepping stones, carefully pruned trees, water features, and minimalist contemplative design' },
  { id: 'chinese_classical', name: 'Chinese Classical Garden', prompt: 'classical Chinese garden with pavilions, moon gates, koi ponds, rockeries, and balanced yin-yang design principles' },
  { id: 'balinese', name: 'Balinese Tropical', prompt: 'Balinese tropical garden with lush palms, stone carvings, water features, tropical flowers, and resort-style landscaping' },

  // Contemporary
  { id: 'modern_minimalist', name: 'Modern Minimalist', prompt: 'modern minimalist garden with clean lines, limited plant palette, geometric forms, concrete or steel elements, and contemporary design' },
  { id: 'contemporary', name: 'Contemporary Landscape', prompt: 'contemporary landscape with mixed materials, architectural plants, outdoor lighting, and current design trends' },
  { id: 'drought_tolerant', name: 'Drought-Tolerant / Xeriscape', prompt: 'drought-tolerant xeriscape garden with succulents, gravel mulch, native plants, and water-wise landscaping' },

  // Themed Gardens
  { id: 'mediterranean', name: 'Mediterranean Courtyard', prompt: 'Mediterranean courtyard garden with terracotta pots, lavender, olive trees, gravel paths, and warm climate plants' },
  { id: 'tropical', name: 'Tropical Paradise', prompt: 'tropical paradise garden with large-leaf plants, palm trees, vibrant flowers, water features, and lush exotic vegetation' },
  { id: 'desert', name: 'Desert Landscape', prompt: 'desert landscape garden with cacti, succulents, rock formations, desert plants, and arid climate design' },
  { id: 'coastal', name: 'Coastal Garden', prompt: 'coastal garden with salt-tolerant plants, driftwood accents, beach grasses, and seaside aesthetic' },

  // Functional Gardens
  { id: 'herb_kitchen', name: 'Herb / Kitchen Garden', prompt: 'herb and kitchen garden with raised beds, culinary plants, organized rows, and functional vegetable garden design' },
  { id: 'permaculture', name: 'Permaculture', prompt: 'permaculture garden with companion planting, edible landscaping, composting areas, and sustainable ecosystem design' },
  { id: 'butterfly', name: 'Butterfly / Pollinator Garden', prompt: 'butterfly and pollinator garden with native flowers, host plants, nectar sources, and wildlife-friendly design' },

  // Special
  { id: 'unfinished', name: 'Unlandscaped / Raw', prompt: 'unlandscaped raw outdoor space with bare soil, no vegetation, unfinished hardscaping, and undeveloped grounds' },
];

// Landscape / Outside Styles
export const LANDSCAPE_STYLES: ArchitectureStyle[] = [
  { id: 'naturalistic', name: 'Naturalistic Landscape', prompt: 'naturalistic landscape design with flowing forms, native plantings, natural materials, and organic integration with surroundings' },
  { id: 'formal_estate', name: 'Formal Estate Grounds', prompt: 'formal estate grounds with manicured lawns, tree-lined drives, geometric garden beds, and grand landscape architecture' },
  { id: 'park_like', name: 'Park-Like Setting', prompt: 'park-like landscape with open lawns, specimen trees, curving paths, and public park aesthetic' },
  { id: 'meadow', name: 'Meadow Landscape', prompt: 'meadow landscape with native grasses, wildflowers, gently rolling terrain, and prairie-like environment' },
  { id: 'mountain', name: 'Mountain / Alpine', prompt: 'mountain alpine landscape with rocky terrain, coniferous trees, elevation changes, and high-altitude environment' },
  { id: 'lake_waterfront', name: 'Lakefront / Waterfront', prompt: 'lakefront or waterfront landscape with water views, dock or pier, aquatic plants, and shoreline design' },
  { id: 'forest_edge', name: 'Forest Edge', prompt: 'forest edge landscape with transitional woodland, mature trees, understory plants, and natural forest setting' },
  { id: 'suburban', name: 'Suburban Neighborhood', prompt: 'suburban neighborhood landscape with lawn, foundation plantings, street trees, and residential setting' },
  { id: 'urban', name: 'Urban Landscape', prompt: 'urban landscape with street trees, planters, hardscape, and city environment integration' },
  { id: 'unfinished', name: 'Undeveloped / Raw Land', prompt: 'undeveloped raw land with natural or cleared terrain, no landscaping, construction site, or pre-development state' },
];

// Time of Day Options
export const ARCHITECTURE_TIMES: ArchitectureTime[] = [
  { id: 'current', name: 'Keep Current Lighting', prompt: '' },
  { id: 'early_morning', name: 'Early Morning', prompt: 'during early morning with soft dawn light, long shadows, cool color temperature, and peaceful atmosphere' },
  { id: 'morning', name: 'Morning', prompt: 'during morning with bright natural light, clear visibility, fresh daylight, and energetic atmosphere' },
  { id: 'midday', name: 'Midday', prompt: 'during midday with overhead sun, bright even lighting, minimal shadows, and high contrast' },
  { id: 'afternoon', name: 'Afternoon', prompt: 'during afternoon with warm natural light, moderate shadows, comfortable brightness, and pleasant ambiance' },
  { id: 'golden_hour', name: 'Golden Hour', prompt: 'during golden hour with warm amber sunlight, long dramatic shadows, glowing atmosphere, and rich colors' },
  { id: 'sunset', name: 'Sunset', prompt: 'during sunset with vibrant sky colors, warm golden-orange light, romantic atmosphere, and beautiful cloud formations' },
  { id: 'dusk', name: 'Dusk / Blue Hour', prompt: 'during dusk blue hour with deep blue sky, interior lights glowing, transitional lighting, and magical atmosphere' },
  { id: 'evening', name: 'Evening', prompt: 'during evening with artificial lighting, darkening sky, cozy illuminated interiors, and nighttime approaching' },
  { id: 'night', name: 'Night', prompt: 'during night with dark sky, artificial lighting, illuminated windows, dramatic shadows, and nocturnal atmosphere' },
  { id: 'overcast', name: 'Overcast Day', prompt: 'during overcast day with diffused cloud light, soft shadows, even illumination, and muted atmosphere' },
  { id: 'stormy', name: 'Stormy Weather', prompt: 'during stormy weather with dramatic dark clouds, moody lighting, rain or threatening sky, and atmospheric tension' },
];

// Seasonal / Theme Options
export const ARCHITECTURE_THEMES: ArchitectureTheme[] = [
  { id: 'none', name: 'No Theme', prompt: '' },

  // Seasonal
  { id: 'spring', name: 'Spring', prompt: 'with spring seasonal theme featuring blooming flowers, fresh green foliage, cherry blossoms, and renewal atmosphere' },
  { id: 'summer', name: 'Summer', prompt: 'with summer seasonal theme featuring lush vegetation, vibrant colors, bright sunshine, and warm weather ambiance' },
  { id: 'autumn', name: 'Autumn / Fall', prompt: 'with autumn fall seasonal theme featuring warm orange-red foliage, fallen leaves, harvest colors, and cozy atmosphere' },
  { id: 'winter', name: 'Winter', prompt: 'with winter seasonal theme featuring snow-covered surfaces, frost, evergreen decorations, and cold weather ambiance' },

  // Holiday Themes
  { id: 'halloween', name: 'Halloween', prompt: 'with Halloween theme featuring jack-o-lanterns, orange and black colors, spooky decorations, autumn leaves, and festive seasonal decor' },
  { id: 'thanksgiving', name: 'Thanksgiving', prompt: 'with Thanksgiving theme featuring autumn harvest colors, pumpkins, fall foliage, warm amber lighting, and seasonal harvest decorations' },
  { id: 'christmas', name: 'Christmas', prompt: 'with Christmas theme featuring evergreen wreaths, red and green colors, twinkling lights, garlands, festive decorations, and holiday spirit' },
  { id: 'hanukkah', name: 'Hanukkah', prompt: 'with Hanukkah theme featuring blue and white colors, menorahs, candle lighting, and Festival of Lights decorations' },
  { id: 'new_year', name: 'New Year', prompt: 'with New Year theme featuring elegant decorations, gold and silver accents, celebratory lighting, and festive party atmosphere' },
  { id: 'valentines', name: 'Valentine\'s Day', prompt: 'with Valentine\'s Day theme featuring red and pink colors, heart decorations, roses, romantic lighting, and love-themed accents' },
  { id: 'easter', name: 'Easter', prompt: 'with Easter theme featuring pastel colors, spring flowers, Easter eggs, bunny decorations, and renewal spring atmosphere' },
  { id: 'fourth_july', name: 'Fourth of July', prompt: 'with Fourth of July theme featuring red, white, and blue colors, American flags, patriotic bunting, and Independence Day decorations' },

  // Special Occasions
  { id: 'wedding', name: 'Wedding', prompt: 'with wedding theme featuring elegant white and floral decorations, romantic lighting, ceremonial setup, and celebration atmosphere' },
  { id: 'birthday', name: 'Birthday Party', prompt: 'with birthday party theme featuring colorful balloons, streamers, festive decorations, and celebratory atmosphere' },
  { id: 'garden_party', name: 'Garden Party', prompt: 'with garden party theme featuring outdoor furniture, string lights, floral arrangements, and elegant outdoor entertaining setup' },
];

// Camera Angle Options
export const CAMERA_ANGLE_OPTIONS: CameraAngleOption[] = [
  { id: 'preserve', name: 'Preserve Original Angle', prompt: '' },
  { id: 'slight_variation', name: 'Slight Variation', prompt: 'with subtle camera angle variation, maintaining overall composition but with minor perspective shift' },
  { id: 'randomize', name: 'Randomize Angle', prompt: 'from a different camera angle and perspective, providing fresh viewpoint while maintaining the essence of the space' },
];
