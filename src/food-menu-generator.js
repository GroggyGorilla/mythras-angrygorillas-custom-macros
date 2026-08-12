(async () => {
  // --- MASTER MENU DATABASE ---
  const MENU_DATA = {
food: [
      // === FERRENTINE (Gulf Coast / Capital Farmlands) ===
      { name: "Salt-Cod Porridge with Leeks", regions: ["Ferrentine"], tier: "Cheap", baseCost: 1.0, description: "Oily little sprats and cod scraps from the Gulf of Swansey boiled into a thick oat mash." },
      { name: "Cabbage & Turnip Pottage", regions: ["Ferrentine"], tier: "Cheap", baseCost: 0.8, description: "The standard urban laborer's fuel, thick with over-boiled root vegetables." },
      { name: "Boiled Gulf Mussels", regions: ["Ferrentine"], tier: "Cheap", baseCost: 1.2, description: "Salty local shellfish simmered in watered down small beer with wild garlic scraps." },
      { name: "Peasenhall Gruel with Lard", regions: ["Ferrentine"], tier: "Cheap", baseCost: 0.9, description: "Yellow field peas boiled to a paste and enriched with a single dollop of salted rendering pork fat." },
      { name: "Pickled Sprat Skewers", regions: ["Ferrentine"], tier: "Cheap", baseCost: 1.1, description: "Briney, sharp little estuary fish preserved in sour vinegar, served on a sharpened twig." },

      { name: "Smoked Herring with White Rye", regions: ["Ferrentine"], tier: "Reasonable", baseCost: 3.0, description: "Oak-smoked coastal catch served with a generous slab of salted butter and fresh bread." },
      { name: "Ferrignus Mutton Hand-Pie", regions: ["Ferrentine"], tier: "Reasonable", baseCost: 2.8, description: "Diced hill mutton seasoned with rosemary, baked inside a sturdy, portable lard crust." },
      { name: "Braised Pork Shoulder", regions: ["Ferrentine"], tier: "Reasonable", baseCost: 3.4, description: "Slow-cooked in dark capital ale, served alongside sweet roasted parsnips." },
      { name: "Baked Whiting with Mustard", regions: ["Ferrentine"], tier: "Reasonable", baseCost: 3.1, description: "Freshly caught coastal whiting baked whole and slathered in a coarse, stone-ground seed mustard." },
      { name: "Guildman's Beef & Onion Stew", regions: ["Ferrentine"], tier: "Reasonable", baseCost: 3.2, description: "A thick, comforting tavern bowl brimming with cubed beef flank, sweet onions, and pot herbs." },

      { name: "Oakland Boar Tenderloin", regions: ["Ferrentine"], tier: "Superior", baseCost: 8.0, description: "Prime wild boar from the neighboring woods, roasted with a rich wine reduction." },
      { name: "Spiced Swan Pastry", regions: ["Ferrentine"], tier: "Superior", baseCost: 9.5, description: "A high-noble capital showpiece featuring delicate swan breast flavored with rare, costly nutmeg." },
      { name: "Poached Sturgeon in Fine Wine", regions: ["Ferrentine"], tier: "Superior", baseCost: 8.5, description: "Prized gulf sturgeon simmered slowly in a refined, acidic vintage with bay leaves." },
      { name: "Venison Pasty with Gilded Crust", regions: ["Ferrentine"], tier: "Superior", baseCost: 9.0, description: "Choice deer loin baked with rich calf marrow, enclosed in a fine wheat pastry lightly egg-washed." },
      { name: "Roast Heron with Galingale", regions: ["Ferrentine"], tier: "Superior", baseCost: 8.8, description: "A highly prized marsh bird stuffed with sage and basted with an exotic, aromatic ginger-like glaze." },

      // === VINMARCH (Northern Gulf Vineyards) ===
      { name: "Vinegar-Braised Sprats", regions: ["Vinmarch"], tier: "Cheap", baseCost: 0.9, description: "Small coastal catches preserved in sharp wine-vinegar and cracked barley." },
      { name: "Grape-Leaf Grain Wraps", regions: ["Vinmarch"], tier: "Cheap", baseCost: 1.1, description: "Farmed grape leaves stuffed with spiced barley mash and wild field onion scraps." },
      { name: "Sour-Wine Onion Broth", regions: ["Vinmarch"], tier: "Cheap", baseCost: 0.8, description: "A thin winter soup made from scorched orchard onions simmered in re-pressed grape pressings." },
      { name: "Salted Curd Mash", regions: ["Vinmarch"], tier: "Cheap", baseCost: 1.0, description: "Leftover goat milk whey curds beaten smooth with wild chives and coarse salt grains." },
      { name: "Cracked Spelt Loaf with Lees", regions: ["Vinmarch"], tier: "Cheap", baseCost: 0.7, description: "Heavy dark bread risen using thick wine yeast, offering a distinctively sour, dense crumb." },

      { name: "Honey-Glazed Capon", regions: ["Vinmarch"], tier: "Reasonable", baseCost: 3.2, description: "Plump fattened rooster roasted over open grape-wood fires, dripping with honey." },
      { name: "Vineyard Snail Ragout", regions: ["Vinmarch"], tier: "Reasonable", baseCost: 2.7, description: "Plump snails harvested from the vines, simmered in garlic, butter, and white wine." },
      { name: "Plum-Stuffed Pork Loin", regions: ["Vinmarch"], tier: "Reasonable", baseCost: 3.5, description: "Lean coastal pig roasted with sweet plums from the nearby orchard estates." },
      { name: "Braised Rabbit in Verjuice", regions: ["Vinmarch"], tier: "Reasonable", baseCost: 3.0, description: "Wild hillside rabbit slow-simmered in the sour, unfermented juice of green vineyard grapes." },
      { name: "Savory Fennel Tart", regions: ["Vinmarch"], tier: "Reasonable", baseCost: 2.8, description: "A light open pastry filled with sweet caramelized wild fennel bulbs and goat cheese." },

      { name: "Wine-Reduced Capon Stew", regions: ["Vinmarch"], tier: "Superior", baseCost: 8.0, description: "An aristocratic favorite, slow-simmered for hours in an entire bottle of reserve red." },
      { name: "Almond-Crusted Quail", regions: ["Vinmarch"], tier: "Superior", baseCost: 8.8, description: "Delicate songbirds stuffed with dried currents and roasted over fruitwood coals." },
      { name: "Roasted Pheasant with Fig Glaze", regions: ["Vinmarch"], tier: "Superior", baseCost: 8.4, description: "Plump forest game bird basted in a rich, sticky reduction of imported figs and sweet white wine." },
      { name: "Saffron Estate Blancmange", regions: ["Vinmarch"], tier: "Superior", baseCost: 8.2, description: "A shredded capon breast dish beaten with almond milk, sugar, and heavy strands of real saffron." },
      { name: "Venison Loin with Cherry Mortress", regions: ["Vinmarch"], tier: "Superior", baseCost: 9.0, description: "Thick cuts of prime venison served with a dense, thick puree of dark cherries and red wine." },

      // === GIANT'S TRACK (Central Plains / Iron Highway) ===
      { name: "Spelt & Barley Porridge", regions: ["Giant's Track"], tier: "Cheap", baseCost: 0.7, description: "Thick grain mush served hot, sustained solely by a pinch of coarse highway salt." },
      { name: "Tallow & Field Onion Broth", regions: ["Giant's Track"], tier: "Cheap", baseCost: 1.0, description: "Boiling water enriched with leftover beef fat and chopped plains onions." },
      { name: "Dry-Salted Beef Scraps", regions: ["Giant's Track"], tier: "Cheap", baseCost: 1.1, description: "Tough ribbons of cured cattle meat, heavily salted for caravan travel and reboiled to soften." },
      { name: "Roasted Turnip Wedges", regions: ["Giant's Track"], tier: "Cheap", baseCost: 0.8, description: "Coarse root vegetables pulled from highway ditches, charred over open cattle-dung fire pits." },
      { name: "Hard Traveler's Biscuit", regions: ["Giant's Track"], tier: "Cheap", baseCost: 0.6, description: "A thrice-baked, bone-dry grain biscuit made to endure months on the open trade trails." },

      { name: "Iron Highway Beef Hand-Pie", regions: ["Giant's Track"], tier: "Reasonable", baseCost: 3.0, description: "The quintessential traveler's meal. Minced beef wrapped in a heavy, protective spelt crust." },
      { name: "Slow-Roasted Beef Brisket", regions: ["Giant's Track"], tier: "Reasonable", baseCost: 3.3, description: "Tough cattle cut made tender by a twelve-hour smoke over pit coals along the highway." },
      { name: "Barley & Mutton Stew", regions: ["Giant's Track"], tier: "Reasonable", baseCost: 2.9, description: "A dense, stick-to-your-ribs meal teeming with unhulled grain and fat mutton chunks." },
      { name: "Spiced Ox-Tail Pottage", regions: ["Giant's Track"], tier: "Reasonable", baseCost: 3.1, description: "A rich, gelatinous stew made from long-simmered ox tails, heavy with cracked black pepper." },
      { name: "Grid-Iron Pork Cutlets", regions: ["Giant's Track"], tier: "Reasonable", baseCost: 3.2, description: "Thick steaks beaten flat, seared over blazing hardwood charcoal with dried plains sage." },

      { name: "Slow-Roasted Prime Ox-Slab", regions: ["Giant's Track"], tier: "Superior", baseCost: 8.0, description: "The absolute choice cut of grain-fed draft beasts, dripping with rich tallow gravy." },
      { name: "Plains Venison & Marrow Pie", regions: ["Giant's Track"], tier: "Superior", baseCost: 8.5, description: "A massive pie layered with choice deer loin, wild leeks, and a rich bone-marrow crust lid." },
      { name: "Cinnamon-Crusted Roast Veal", regions: ["Giant's Track"], tier: "Superior", baseCost: 8.7, description: "Tender milk-fed calf loin rubbed with costly cinnamon, cloves, and ginger, roasted rare." },
      { name: "Whole Spit-Roasted Suckling Pig", regions: ["Giant's Track"], tier: "Superior", baseCost: 9.2, description: "A tavern centerpiece featuring crackling, blistered skin, basted in spiced wine and honey." },
      { name: "Jugged Hare in Rich Blood Sauce", regions: ["Giant's Track"], tier: "Superior", baseCost: 8.4, description: "Wild plains hare stewed inside an earthen jug with red wine, dynamic spices, and its own rich sauce." },

      // === THE STONELANDS (West Coast Scrublands / Greymeddon) ===
      { name: "Dense Stonebread & Water", regions: ["Stonelands"], tier: "Cheap", baseCost: 0.8, description: "An incredibly dense, tooth-breaking barley bread that requires soaking in broth or water." },
      { name: "Foraged Wood-Ear Mash", regions: ["Stonelands"], tier: "Cheap", baseCost: 0.7, description: "A bitter, dark pottage made entirely from scrubland tree-fungus and wild weed roots." },
      { name: "Westford River Minnows", regions: ["Stonelands"], tier: "Cheap", baseCost: 1.1, description: "A handful of tiny, bony freshwater fish from the Westford River fried whole in lard." },
      { name: "Boiled Scrub Thistle Roots", regions: ["Stonelands"], tier: "Cheap", baseCost: 0.6, description: "Tough, stringy wild roots dug out of the rocky clay, boiled with salt to a stringy paste." },
      { name: "Dried Mutton Tallow Scrapings", regions: ["Stonelands"], tier: "Cheap", baseCost: 0.9, description: "The hardened fat rendering scraped from mutton curing hooks, boiled into hot water." },

      { name: "Tough Scrub-Mutton Scraps", regions: ["Stonelands"], tier: "Reasonable", baseCost: 2.8, description: "Bony joints of stringy, wild rangeland sheep boiled endlessly to make it chewable." },
      { name: "Salted Westford Perch", regions: ["Stonelands"], tier: "Reasonable", baseCost: 3.0, description: "Bony river fish preserved heavily in coarse salt, rehydrated over a smoky brush fire." },
      { name: "Smoked Heather-Hen", regions: ["Stonelands"], tier: "Reasonable", baseCost: 2.9, description: "A small, lean wild scrub bird dry-smoked over aromatic mountain heather shrubs." },
      { name: "Clay-Baked Moor-Fowl", regions: ["Stonelands"], tier: "Reasonable", baseCost: 3.1, description: "Wild game birds encased in wet river clay and roasted directly in the hearth coals." },
      { name: "Rangeland Onion and Cheese Pie", regions: ["Stonelands"], tier: "Reasonable", baseCost: 2.7, description: "A dense pie containing strong, sharp curd cheese and bitter foraged scrub onions." },

      { name: "Roasted Mountain Hare", regions: ["Stonelands"], tier: "Superior", baseCost: 7.5, description: "A lean, athletic rangeland rabbit roasted whole over scrub-brush with wild mountain sage." },
      { name: "Salt-Cured Ram Flank", regions: ["Stonelands"], tier: "Superior", baseCost: 8.0, description: "The best winter reserve cut from a hardy rangeland ram, heavily seasoned with mountain herbs." },
      { name: "Braised Red Deer with Juniper", regions: ["Stonelands"], tier: "Superior", baseCost: 8.6, description: "Rich crag-dwelling stag venison simmered slow with wild dark juniper berries and small beer." },
      { name: "Spiced Badger Galantine", regions: ["Stonelands"], tier: "Superior", baseCost: 8.2, description: "Fat mountain badger meat boned, pressed, and heavily spiced with black pepper and mountain mint." },
      { name: "Roasted Ram Testicles", regions: ["Stonelands"], tier: "Superior", baseCost: 7.8, description: "A local rugged delicacy, sliced thin, pan-fried with wild leeks, and deglazed with sour cider." },

      // === THUNDERMARK (West Coast Woods & Farmland) ===
      { name: "Millet Mash & Salted Lard", regions: ["Thundermark"], tier: "Cheap", baseCost: 0.9, description: "Coarse ground millet boiled dry and topped with a single smear of preserved pork fat." },
      { name: "Boiled Sea-Kale & Oats", regions: ["Thundermark"], tier: "Cheap", baseCost: 0.8, description: "Salty, bitter greens gathered from the craggy coastal cliffs boiled into an unseasoned oat mash." },
      { name: "Smoked Dogfish Scraps", regions: ["Thundermark"], tier: "Cheap", baseCost: 1.0, description: "Tough, oily ribbons of cheap coastal shark meat dried over a wood-scrap smolder." },
      { name: "Rye Broth with Wild Mustard", regions: ["Thundermark"], tier: "Cheap", baseCost: 0.7, description: "Thin water pottage flavored with ground rye meal and stinging yellow hedgerow seeds." },
      { name: "Salted Herring Tails", regions: ["Thundermark"], tier: "Cheap", baseCost: 1.1, description: "The leftover brined trimmings from the fishing docks, re-boiled with cracked barley grains." },

      { name: "Pan-Seared Coast Mackerel", regions: ["Thundermark"], tier: "Reasonable", baseCost: 3.1, description: "Fresh saltwater catch from the rough Norngale Sea, quick-fried with field herbs." },
      { name: "Thundermark Beef Pillage-Stew", regions: ["Thundermark"], tier: "Reasonable", baseCost: 3.4, description: "A rustic, robust stew of coastal cattle cuts, thick turnips, and old small beer." },
      { name: "Woodland Hen with Leeks", regions: ["Thundermark"], tier: "Reasonable", baseCost: 3.0, description: "A barnyard fowl simmered gently in a clay pot with sweet, fat forest-grown leeks." },
      { name: "Baked Skate Wing in Butter", regions: ["Thundermark"], tier: "Reasonable", baseCost: 3.2, description: "Broad coastal flatfish pan-fried over wood coals, dripping with melted salted butter." },
      { name: "Salt-Pork and Pea Pudding", regions: ["Thundermark"], tier: "Reasonable", baseCost: 2.9, description: "Diced salt-cured belly pork embedded within a dense, heavily steamed yellow pea mash." },

      { name: "Thundermark Venison Steak", regions: ["Thundermark"], tier: "Superior", baseCost: 8.2, description: "Thick, tender cut of prime buck loin, seared with crushed juniper and served with wild leeks." },
      { name: "Roasted Norngale Salmon", regions: ["Thundermark"], tier: "Superior", baseCost: 8.5, description: "A massive sea-run salmon roasted over green birch wood, brushed with wild berry syrup." },
      { name: "Spiced Goose with Crabapples", regions: ["Thundermark"], tier: "Superior", baseCost: 8.8, description: "A rich, fat coastal goose roasted crisp and tartly balanced with wild orchard crabapples." },
      { name: "Baked Turbot in Almond Milk", regions: ["Thundermark"], tier: "Superior", baseCost: 8.6, description: "Prized, firm-fleshed whitefish poached elegantly in a thick sauce of crushed almonds and white wine." },
      { name: "Boar Head with Mustard Glaze", regions: ["Thundermark"], tier: "Superior", baseCost: 9.5, description: "A grand feast piece; a half-head of wild boar roasted until dark and crusted with sweet honey-mustard." },

      // === THE GREYWOLD (Forest Hills & Wild Game) ===
      { name: "Roasted Acorn Broth", regions: ["Greywold"], tier: "Cheap", baseCost: 0.8, description: "Earthy, dark broth made from dried mushrooms and ground, leached acorns." },
      { name: "Wild Wood-Leek Gruel", regions: ["Greywold"], tier: "Cheap", baseCost: 0.7, description: "Oat grains boiled thin, sharp with the green tops of foraged forest floor leeks." },
      { name: "Dried Crow Pottage", regions: ["Greywold"], tier: "Cheap", baseCost: 0.9, description: "Stringy, dark wild bird meat simmered with forest weeds and a handful of cracked spelt." },
      { name: "Charred Beech-Nuts & Barley", regions: ["Greywold"], tier: "Cheap", baseCost: 0.8, description: "Earthy barley mash tossed with dynamic handfuls of roasted forest floor beech-nuts." },
      { name: "Boiled Puffball Mushrooms", regions: ["Greywold"], tier: "Cheap", baseCost: 1.0, description: "Thick slices of spongy wild puffballs boiled down in plain water with a pinch of salt." },

      { name: "Stewed Wood-Rabbit", regions: ["Greywold"], tier: "Reasonable", baseCost: 2.9, description: "Foraged forest rabbit simmered slowly with wild garlic, wild onions, and root vegetables." },
      { name: "Smoked Squirrel Skewers", regions: ["Greywold"], tier: "Reasonable", baseCost: 2.6, description: "Lean, active forest game skewers glazed with a dark molasses and wild herb rub." },
      { name: "Forest Pigeon Pie", regions: ["Greywold"], tier: "Reasonable", baseCost: 3.0, description: "Dark, rich wild pigeon breasts baked inside a shortcrust with wild mushrooms." },
      { name: "Venison Meatballs with Sage", regions: ["Greywold"], tier: "Reasonable", baseCost: 3.2, description: "Minced deer trimmings rolled with breadcrumbs and dried forest sage, fried in deep lard." },
      { name: "Pan-Fried Brook Trout", regions: ["Greywold"], tier: "Reasonable", baseCost: 3.1, description: "Dappled fresh freshwater trout pulled from forest streams, quick-cooked with wild thyme." },

      { name: "Roast Pheasant with Chanterelles", regions: ["Greywold"], tier: "Superior", baseCost: 8.0, description: "Plump wild game bird roasted with a rich stuffing of foraged golden chanterelle mushrooms." },
      { name: "Greywold Stag Loin Roast", regions: ["Greywold"], tier: "Superior", baseCost: 8.9, description: "The definitive forest prize; an exquisite cut of deep red venison roasted rare with a wood-berry jus." },
      { name: "Spiced Woodcock on Toast", regions: ["Greywold"], tier: "Superior", baseCost: 8.4, description: "Highly prized tiny game birds roasted whole with their rich interiors and served over fried rye." },
      { name: "Braised Bear Paw with Honey", regions: ["Greywold"], tier: "Superior", baseCost: 9.8, description: "A legendary frontier feast item, slow-stewed for days until gelatinous, sweet, and incredibly rich." },
      { name: "Roasted Badger Pastry", regions: ["Greywold"], tier: "Superior", baseCost: 8.2, description: "A decorative pie containing spiced forest badger fat and choice chunks of wild boar loin." },

      // === THE WHITE CURTAIN (Cold Southern Coast) ===
      { name: "Boiled Tallow & Oats Porridge", regions: ["The White Curtain"], tier: "Cheap", baseCost: 0.9, description: "High-fat winter oats boiled into a dense sludge with rendered mutton suet to stave off the southern cold." },
      { name: "Salt-Whale Blubber Strips", regions: ["The White Curtain"], tier: "Cheap", baseCost: 1.1, description: "Chewy, incredibly oily strips of cured marine blubber, cold-smoked and intensely salty." },
      { name: "Dried Kelp & Barley Water", regions: ["The White Curtain"], tier: "Cheap", baseCost: 0.7, description: "Dark winter sea-ribbons boiled with hull-less barley, forming a slick, iodine-rich broth." },
      { name: "Frozen Turnip Shavings", regions: ["The White Curtain"], tier: "Cheap", baseCost: 0.8, description: "Rock-hard root vegetables thawed near the hearth, mashed rough with rancid sheep butter." },
      { name: "Boiled Penguin Wings", regions: ["The White Curtain"], tier: "Cheap", baseCost: 1.0, description: "Oily, tough coastal waterfowl wings simmered endlessly in heavily brackish water." },

      { name: "Dried Suthend Cod Skewers", regions: ["The White Curtain"], tier: "Reasonable", baseCost: 3.0, description: "Deep-sea fish caught in the freezing southern sea, wind-dried and salted hard." },
      { name: "Winter Seal Stew", regions: ["The White Curtain"], tier: "Reasonable", baseCost: 3.3, description: "Dark, rich, and oily marine meat cubed and stewed with heavy black parsnips and dried onions." },
      { name: "Mutton Broth with Hardtack", regions: ["The White Curtain"], tier: "Reasonable", baseCost: 2.9, description: "A steaming bowl of fatty sheep neck broth, poured directly over broken hard sea biscuits." },
      { name: "Salt-Beef Carbonnade", regions: ["The White Curtain"], tier: "Reasonable", baseCost: 3.4, description: "Brined caravan beef sliced thin and braised with dark, bitter southern winter ale." },
      { name: "Baked Ice-Bay Haddie", regions: ["The White Curtain"], tier: "Reasonable", baseCost: 3.1, description: "Cold-water haddock thick-salted and baked over charcoal, served with parsnip mash." },

      { name: "Roast Mountain Goat", regions: ["The White Curtain"], tier: "Superior", baseCost: 8.4, description: "Tender flank from a crag goat, roasted long with a sticky glaze of pine-needle reduction." },
      { name: "Prime Salt-Whale Tongue", regions: ["The White Curtain"], tier: "Superior", baseCost: 8.8, description: "The absolute choice delicacy of the southern whaling ships, boiled tender with winter spices." },
      { name: "Glazed Elk Loin with Cranberries", regions: ["The White Curtain"], tier: "Superior", baseCost: 9.1, description: "Massive northern elk steak seared rare, smothered in a tart, preserved wild berry compote." },
      { name: "Puffin Pastry with Sweet Wine", regions: ["The White Curtain"], tier: "Superior", baseCost: 8.5, description: "Delicate arctic seabirds baked whole inside a lard pastry with sweet, imported fortified wine." },
      { name: "Spiced Reindeer Tongue Pie", regions: ["The White Curtain"], tier: "Superior", baseCost: 8.9, description: "A rich winter masterpiece, layering finely sliced cured tongue, cloves, and suet." },

      // === SHADOW HAUNT (The Great Swamplands) ===
      { name: "Muck-Eel Broth", regions: ["Shadow Haunt"], tier: "Cheap", baseCost: 0.8, description: "Muddy, gelatinous soup made from small fen-eels and boiled marsh roots." },
      { name: "Boiled Duck Eggs", regions: ["Shadow Haunt"], tier: "Cheap", baseCost: 1.0, description: "Two strong-tasting, oil-rich waterfowl eggs pulled from the reeds and hard-boiled." },
      { name: "Salted Frog Legs", regions: ["Shadow Haunt"], tier: "Cheap", baseCost: 0.9, description: "Tiny, bony swamp-frog limbs quick-fried in heavy grease and crusted with gray fen-salt." },
      { name: "Marsh-Grass Gruel", regions: ["Shadow Haunt"], tier: "Cheap", baseCost: 0.7, description: "A watery slime made from pounded wild reed seeds and bitter bog-onion tops." },
      { name: "Smoked Mud-Carp Scraps", regions: ["Shadow Haunt"], tier: "Cheap", baseCost: 1.1, description: "Bony, bottom-feeding swamp fish dried over a smoky peat fire to mask the muddy rot taste." },

      { name: "Spiced Swamp Turtle Soup", regions: ["Shadow Haunt"], tier: "Reasonable", baseCost: 2.9, description: "Thick, dark snapping turtle stew spiced heavily with fen-mustard seeds." },
      { name: "Fen-Duck with Bog-Berries", regions: ["Shadow Haunt"], tier: "Reasonable", baseCost: 3.3, description: "Greasy wild waterfowl roasted over peat charcoal, served with a sharp, sour crimson sauce." },
      { name: "Fried Catfish with Wild Rice", regions: ["Shadow Haunt"], tier: "Reasonable", baseCost: 3.1, description: "Thick, muddy catfish fillets dredged in rye meal and fried crisp, alongside dark swamp rice." },
      { name: "Swamp-Hare Ragout", regions: ["Shadow Haunt"], tier: "Reasonable", baseCost: 3.0, description: "A dark, peppery stew containing stringy marsh rabbit and slow-boiled root tubers." },
      { name: "Crawfish and Leek Pottage", regions: ["Shadow Haunt"], tier: "Reasonable", baseCost: 2.8, description: "Dozens of small mud-crabs shelled and thrown into a creamy porridge of wild swamp leeks." },

      { name: "Braised Wild Swamp Boar", regions: ["Shadow Haunt"], tier: "Superior", baseCost: 8.1, description: "Tough, aggressive tusked boar flank tenderized by hours of braising with sweet bog-berries." },
      { name: "Great Fen Heron Pastry", regions: ["Shadow Haunt"], tier: "Superior", baseCost: 8.6, description: "A huge showcase pie containing layered heron breast, wild spices, and rich duck liver paste." },
      { name: "Spiced Alligator Tail Steak", regions: ["Shadow Haunt"], tier: "Superior", baseCost: 9.0, description: "White, firm reptilian muscle cut thick, seared with imported black pepper and wild fen-garlic." },
      { name: "Jugged Bittern with Ginger", regions: ["Shadow Haunt"], tier: "Superior", baseCost: 8.4, description: "A rare marsh-wading bird slow-steamed inside an airtight clay vessel with rare capital spices." },
      { name: "Marrow-Stuffed Swamp Pike", regions: ["Shadow Haunt"], tier: "Superior", baseCost: 8.7, description: "A giant, predatory freshwater fish stuffed with rich ox marrow and baked with white wine." },

      // === OAKLAND (Farmlands & Oaken Woods) ===
      { name: "Pork Scraps & Cabbage Hash", regions: ["Oakland"], tier: "Cheap", baseCost: 1.1, description: "Leftover pig trimmings fried on a flat iron sheet with shredded green cabbage." },
      { name: "Boiled Beans with Bacon Rind", regions: ["Oakland"], tier: "Cheap", baseCost: 0.9, description: "Broad white field beans simmered slow with the tough outer skin of smoked bacon." },
      { name: "Oatmeal Bannock Loaf", regions: ["Oakland"], tier: "Cheap", baseCost: 0.7, description: "A heavy, unleavened griddle cake made from coarse mill-dust and water, baked on the stones." },
      { name: "Scorched Onion Stew", regions: ["Oakland"], tier: "Cheap", baseCost: 0.8, description: "A dark brown, sweet but watery pottage made from caramelized winter onions and stale rye crusts." },
      { name: "Whey Barley Pottage", regions: ["Oakland"], tier: "Cheap", baseCost: 1.0, description: "Unhulled barley boiled directly in the sour liquid byproduct of dairy cheesemaking." },

      { name: "Spiced Pork Hand-Pie", regions: ["Oakland"], tier: "Reasonable", baseCost: 3.0, description: "Ground woodland hog seasoned with crushed sage and baked inside a dense wheat crust." },
      { name: "Roasted Barnyard Capon", regions: ["Oakland"], tier: "Reasonable", baseCost: 3.2, description: "A plump, corn-fed gelded rooster roasted crisp over oak logs with farmstead butter." },
      { name: "Beef & Mushroom Pasty", regions: ["Oakland"], tier: "Reasonable", baseCost: 3.4, description: "Diced beef chuck and earthy brown field mushrooms enclosed in a rich, crimped lard crust." },
      { name: "Oak-Smoked Bacon Slab", regions: ["Oakland"], tier: "Reasonable", baseCost: 3.1, description: "Thick, salty rashers of belly pork carved straight from the chimney rack, served with white cabbage." },
      { name: "Farmhouse Cheese and Ham Tart", regions: ["Oakland"], tier: "Reasonable", baseCost: 2.9, description: "A deep pastry shell holding baked egg curd, sharp gold cheese, and diced cured pig flank." },

      { name: "Honey-Glazed Ham Skewers", regions: ["Oakland"], tier: "Superior", baseCost: 8.3, description: "Prime choice cuts of acorn-fattened swine, heavily basted with wild woodland honey." },
      { name: "Roast Venison with Blackberry Jus", regions: ["Oakland"], tier: "Superior", baseCost: 8.8, description: "A magnificent buck loin roasted over charcoal, served with a sticky sauce of wild briar berries." },
      { name: "Spiced Ox-Cheek Pastry", regions: ["Oakland"], tier: "Superior", baseCost: 8.5, description: "Tough muscle rendered completely tender by twelve hours of braising, baked with costly nutmeg and mace." },
      { name: "Whole Roasted Mallard Duck", regions: ["Oakland"], tier: "Superior", baseCost: 8.7, description: "Rich, dark wild waterfowl roasted until the skin crackles, stuffed with sage and wild apples." },
      { name: "Almond-Cream Chicken Pie", regions: ["Oakland"], tier: "Superior", baseCost: 9.0, description: "An elite recipe featuring tender poultry meat swimming in a sweet sauce of crushed almonds and white wine." }
    ],
    drinks: [
      // === CHEAP QUALITY DRINKS ===
      { name: "Sour Whey & Small Beer", type: "Ale/Beer", tier: "Cheap", baseCost: 1.0, description: "Weak, cloudy dregs with very low alcohol content; safe to drink, if sour." },
      { name: "Grist-Mill Dishwater Ale", type: "Ale/Beer", tier: "Cheap", baseCost: 0.9, description: "Thin, unhopped watery ale brewed from the secondary wash of scorched barley grains." },
      { name: "Fermented Turnip Cider", type: "Ale/Beer", tier: "Cheap", baseCost: 1.0, description: "A pungent, watery press of winter turnips. Bitterly alcoholic and highly unrefined." },
      { name: "Watered Vine-Scrappings", type: "Wine/Spirits", tier: "Cheap", baseCost: 2.0, description: "Thin, sharp vinegar-wine squeezed from leftover rotten grape skins and heavily diluted." },
      { name: "Skimming-House Perry", type: "Wine/Spirits", tier: "Cheap", baseCost: 1.8, description: "A harsh, cloudy pear-waste liquor prone to leaving a heavy ache in the morning." },
      { name: "Ditch-Herb Small Grog", type: "Wine/Spirits", tier: "Cheap", baseCost: 2.1, description: "Watered down grain spirit mask with wild field mint to hide the stinging burn." },

      // === REASONABLE QUALITY DRINKS ===
      { name: "Common Bitter Porter", type: "Ale/Beer", tier: "Reasonable", baseCost: 1.5, description: "A dark, hearty malted ale brewed locally and served cool in wooden tankards." },
      { name: "Oat-Malt Amber Ale", type: "Ale/Beer", tier: "Reasonable", baseCost: 1.4, description: "Smooth, nutty ale with a dense foam head, boasting balanced tones of roasted field oats." },
      { name: "Greywold Crisp Apple Cider", type: "Ale/Beer", tier: "Reasonable", baseCost: 1.5, description: "A tart, golden brew pressed from wild orchard apples gathered along the forest edges." },
      { name: "Rough Red Table Wine", type: "Wine/Spirits", tier: "Reasonable", baseCost: 4.0, description: "A solid, unaged vintage carrying a strong berry bite; standard tavern fare." },
      { name: "Hill-Country Spiced Mead", type: "Wine/Spirits", tier: "Reasonable", baseCost: 4.2, description: "Sweet fermented clover honey balanced with wild thyme and a sharp finish." },
      { name: "Clarified White Currant Cordial", type: "Wine/Spirits", tier: "Reasonable", baseCost: 4.5, description: "A bright, clean fortified fruit wine with an acidic bite that cuts through grease." },

      // === SUPERIOR QUALITY DRINKS ===
      { name: "Imported Heavy Mountain Stout", type: "Ale/Beer", tier: "Superior", baseCost: 3.0, description: "Jet black, creamy ale carried out of the southern peaks; packs a fierce punch." },
      { name: "Double-Brewed Abbey Barleywine", type: "Ale/Beer", tier: "Superior", baseCost: 3.2, description: "A massive, deep mahogany ale aged in toasted casks, rich with sweet syrup tones." },
      { name: "Spiced Winter Braggot", type: "Ale/Beer", tier: "Superior", baseCost: 2.8, description: "A heavy, warm blend of dark tavern ale and fine honey-mead, infused with whole cloves." },
      { name: "Aged Vinmarch Vintage Reserve", type: "Wine/Spirits", tier: "Superior", baseCost: 6.0, description: "Perfectly clarified white or deep crimson vintage hauled out of the northern vineyard estates." },
      { name: "Fortified Honey Sack-Wine", type: "Wine/Spirits", tier: "Superior", baseCost: 6.5, description: "A velvety, heavy dessert wine enriched with clean honey spirits and sweet botanical oils." },
      { name: "Royal Aquavitae infusion", type: "Wine/Spirits", tier: "Superior", baseCost: 7.0, description: "Triple-distilled wine spirit clean enough to catch fire, subtly scented with imported anise." }
    ]
  };

  // --- CONFIGURATION DIALOG WITH MODERN CSS TOGGLE CHIPS ---
  const uniqueRegions = [...new Set(MENU_DATA.food.flatMap(item => item.regions))];
  
  const regionChipsHtml = uniqueRegions.map(r => `
    <label class="region-chip">
      <input type="checkbox" name="region-selection" value="${r}" style="display:none;">
      <span>${r}</span>
    </label>
  `).join("");
  
  const dialogContent = `
    <style>
      .region-chip-container {
        display: grid;
        grid-template-columns: repeat(2, 1fr);
        gap: 6px;
        margin-bottom: 12px;
      }
      .region-chip {
        cursor: pointer;
        margin: 0 !important;
      }
      .region-chip span {
        display: block;
        padding: 6px 8px;
        background: #e2d7c7;
        border: 1px solid #bda88f;
        border-radius: 4px;
        text-align: center;
        font-size: 0.88em;
        font-weight: normal;
        color: #4a3c31;
        transition: all 0.15s ease-in-out;
      }
      .region-chip input:checked + span {
        background: #7a1d1d;
        color: #ffffff;
        border-color: #5c1414;
        box-shadow: inset 0 1px 3px rgba(0,0,0,0.3);
        font-weight: bold;
      }
      .region-chip span:hover {
        background: #d3c4b1;
      }
      .region-chip input:checked + span:hover {
        background: #8c2525;
      }
    </style>

    <form class="tavern-menu-form">
      <div class="form-group">
        <label style="font-weight: bold; display: block; margin-bottom: 6px;">Select Culinary Regions (Toggle multiple):</label>
        <div class="region-chip-container">
          ${regionChipsHtml}
        </div>
      </div>
      <div class="form-group">
        <label style="font-weight: bold;">Tavern Quality Tier:</label>
        <select id="tier" name="tier">
          <option value="Cheap">Cheap (1sf Meals / 1-2sf Drinks)</option>
          <option value="Reasonable">Reasonable (3sf Meals / 1.5-4sf Drinks)</option>
          <option value="Superior">Superior (8sf Meals / 3-6sf Drinks)</option>
        </select>
      </div>
      <div class="form-group">
        <label style="font-weight: bold;">Settlement Level (Scarcity Scaling):</label>
        <select id="settlement" name="settlement">
          <option value="City">City (Abundant Variety / Normal Prices)</option>
          <option value="Town">Town (Moderate Variety / +10% Price Inflation)</option>
          <option value="Village">Village (Scarce Isolation / +25% Price Inflation)</option>
        </select>
      </div>
      <div class="form-group">
        <label style="font-weight: bold;">Flat Economy Multiplier:</label>
        <input type="number" id="multiplier" name="multiplier" value="1.0" step="0.1" min="0.1">
      </div>
      <div class="form-group" style="display: flex; gap: 10px;">
        <div style="flex: 1;">
          <label style="font-weight: bold;">Food Options:</label>
          <input type="number" id="foodCount" name="foodCount" value="3" min="1" max="8">
        </div>
        <div style="flex: 1;">
          <label style="font-weight: bold;">Drink Options:</label>
          <input type="number" id="drinkCount" name="drinkCount" value="2" min="1" max="6">
        </div>
      </div>
    </form>
  `;

  new Dialog({
    title: "Tavern Menu Generator",
    content: dialogContent,
    buttons: {
      generate: {
        icon: '<i class="fas fa-utensils"></i>',
        label: "Generate Menu",
        callback: (html) => {
          const selectedRegions = [];
          html.find('input[name="region-selection"]:checked').each(function() {
            selectedRegions.push($(this).val());
          });

          const chosenTier = html.find('#tier').val();
          const settlement = html.find('#settlement').val();
          const userMultiplier = parseFloat(html.find('#multiplier').val()) || 1.0;
          const foodCount = parseInt(html.find('#foodCount').val(), 10) || 3;
          const drinkCount = parseInt(html.find('#drinkCount').val(), 10) || 2;

          if (selectedRegions.length === 0) {
            ui.notifications.warn("You must select at least one culinary region!");
            return;
          }

          // --- ECONOMIC SCALING CALCULATIONS ---
          let settlementMod = 1.0;
          let availabilityChance = 1.0; 
          
          if (settlement === "Town") {
            settlementMod = 1.10;
            availabilityChance = 0.85;
          } else if (settlement === "Village") {
            settlementMod = 1.25;
            availabilityChance = 0.65;
          }

          const finalMultiplier = userMultiplier * settlementMod;

          const formatPrice = (base) => {
            let final = base * finalMultiplier;
            return `${final.toFixed(1).replace('.0', '')} sf`;
          };

          // --- FILTER POOLS (Fixed to guarantee input counts) ---
          let foodPool = MENU_DATA.food.filter(item => 
            item.tier === chosenTier && 
            item.regions.some(r => selectedRegions.includes(r))
          );
          
          let drinkPool = MENU_DATA.drinks.filter(item => item.tier === chosenTier);
          
          // Pull dynamic counts directly from the full pool
          let selectedFood = foodPool.sort(() => 0.5 - Math.random()).slice(0, Math.min(foodCount, foodPool.length));
          let selectedDrinks = drinkPool.sort(() => 0.5 - Math.random()).slice(0, Math.min(drinkCount, drinkPool.length));

          // --- CHAT CARD HTML GENERATION ---
          let regionsDisplay = selectedRegions.join(", ");
          let cardHtml = `
            <div style="font-family: 'Signika', sans-serif;">
              <h3 style="border-bottom: 2px solid #7a1d1d; color: #7a1d1d; padding-bottom: 4px; margin-bottom: 4px; font-size: 1.15em; font-weight: bold;">
                📋 ${settlement} Tavern Menu
              </h3>
              <div style="font-size: 0.82em; color: #555; margin-bottom: 10px; line-height: 1.2;">
                <strong>Regions:</strong> ${regionsDisplay}<br>
                <strong>Tier:</strong> ${chosenTier} Establishment | <strong>Price Mod:</strong> x${finalMultiplier.toFixed(2)}
              </div>
              
              <div style="background: #f4eae1; padding: 4px 8px; font-weight: bold; font-size: 0.9em; margin-bottom: 6px; border-radius: 3px; color: #5c1d1d;">TODAY'S FARE</div>
              <ul style="list-style: none; padding: 0; margin: 0 0 12px 0;">
          `;

          selectedFood.forEach(item => {
            let isImport = selectedRegions.length > 1 ? `<span style="font-size:0.7em; background:#e2e8f0; color:#4a5568; padding:1px 3px; border-radius:2px; margin-left:4px;">${item.regions[0]}</span>` : '';
            cardHtml += `
              <li style="margin-bottom: 8px; padding-bottom: 6px; border-bottom: 1px dashed #dcd1c4;">
                <div style="display: flex; justify-content: space-between; align-items: baseline;">
                  <strong style="color: #1a202c; font-size: 0.92em;">${item.name}</strong>
                  <span style="color: #b45f06; font-weight: bold; font-family: monospace; font-size: 0.92em;">${formatPrice(item.baseCost)}</span>
                </div>
                <div style="font-size: 0.78em; color: #718096; margin: 1px 0;">
                  <em>Nutrition: ${item.tier === "Cheap" ? "Poor/Standard" : item.tier === "Reasonable" ? "Good" : "Excellent"}</em>${isImport}
                </div>
                <div style="font-size: 0.85em; font-style: italic; color: #4a5568; line-height: 1.25;">
                  "${item.description}"
                </div>
              </li>
            `;
          });

          cardHtml += `
              </ul>
              <div style="background: #e9e1f4; padding: 4px 8px; font-weight: bold; font-size: 0.9em; margin-bottom: 6px; border-radius: 3px; color: #3d1d5c;">THE INTENT/DRINK MENU</div>
              <ul style="list-style: none; padding: 0; margin: 0;">
          `;

          selectedDrinks.forEach(item => {
            cardHtml += `
              <li style="margin-bottom: 6px; padding-bottom: 4px; border-bottom: 1px dashed #d6cbdc; display: flex; justify-content: space-between; align-items: top;">
                <div style="padding-right: 10px;">
                  <strong style="color: #1a202c; font-size: 0.9em; display: block;">${item.name}</strong>
                  <span style="font-size: 0.8em; color: #6b46c1; font-style: italic;">${item.description}</span>
                </div>
                <span style="color: #b45f06; font-weight: bold; font-family: monospace; font-size: 0.92em; white-space: nowrap;">${formatPrice(item.baseCost)}</span>
              </li>
            `;
          });

          cardHtml += `</ul></div>`;

          // --- PRIVATE GM ROLL ---
          ChatMessage.create({
            user: game.user.id,
            speaker: ChatMessage.getSpeaker({ alias: "Food and Drinks" }),
            content: cardHtml,
            whisper: ChatMessage.getWhisperRecipients("GM"),
            blind: true
          });
        }
      },
      cancel: {
        icon: '<i class="fas fa-times"></i>',
        label: "Cancel"
      }
    },
    default: "generate"
  }, { width: 440 }).render(true);
})();