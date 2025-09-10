# Ultracube Factoriopedia

An interactive website that provides a comprehensive guide to all items, recipes, and crafting in the Factorio Ultracube mod.

## Features

### Homepage
- **Searchable Item List**: Search through all 409 items by name
- **Type Filtering**: Filter items by type (item, fluid, technology, tool, armor, module)
- **Sorting Options**: Sort by name or type
- **Clean Display**: Items show human-readable names (e.g., "cube-basic-matter-unit" becomes "Basic Matter Unit")

### Item Detail Pages
- **Recipe Information**: Shows all recipes that create the item and all recipes that use the item
- **Crafting Entity Info**: Displays which machines/buildings are used to craft each recipe
- **Building Capabilities**: For crafting entities, shows all recipes they can craft
- **Cross-linking**: Click on any ingredient/result to navigate to that item's page

### Data Coverage
- **409 Total Items**: Items (186) + Fluids (19) + Technology (185) + Tools (6) + Armor (4) + Modules (9)
- **272 Recipes**: Complete recipe information with ingredients, results, and crafting requirements
- **31 Crafting Entities**: Assembling machines, furnaces, mining drills, and labs
- **Base Game Integration**: Missing ingredients/results are automatically included from base Factorio

## File Structure

```
├── README.md                           # This documentation
├── parse_ultracube_final.py            # Main data extraction script
├── test_server.py                      # Local development server
└── website/                            # Complete interactive website
    ├── index.html                      # Homepage with item grid
    ├── item.html                       # Item detail page template  
    ├── styles.css                      # Modern, responsive styling (navy blue theme)
    ├── app.js                          # Homepage functionality
    ├── item-details.js                 # Item detail page logic
    ├── data-processor.js               # Data loading and processing utilities
    └── ultracube_organized_data.json   # Complete Ultracube data (409 items)
```

## Running the Website

### Option 1: Simple Python Server
```bash
python test_server.py
```
Then open http://localhost:8000 in your browser.

### Option 2: Any Web Server
Serve the `website/` directory with any web server (nginx, Apache, etc.)

### Option 3: File Protocol (Limited)
Open `website/index.html` directly in browser (some features may not work due to CORS restrictions)

## Data Processing

The website uses data extracted from the Ultracube mod's Lua files:

1. **parse_ultracube_final.py**: Mines all `.lua` files in `../factorio-ultracube` to extract `data:extend` calls
2. **Data Processing**: Organizes 890+ entries by type with cleaned names
3. **Cross-referencing**: Links recipes to crafting entities and includes missing base game items
4. **Name Cleaning**: Removes "cube-" prefixes, converts dashes to spaces, applies title case

## Name Cleaning Examples

| Original ID | Cleaned Name |
|-------------|--------------|
| `cube-cube-fx-frequency` | "Cube FX Frequency" |
| `cube-ultradense-utility-cube` | "Ultradense Utility Cube" |
| `cube-basic-matter-unit` | "Basic Matter Unit" |
| `RTThrowerTime` | "RT Thrower Time" |
| `cube-gelatinous-tar` | "Gelatinous Tar" |

## Technical Details

- **Pure JavaScript**: No frameworks, compatible with all modern browsers
- **Responsive Design**: Works on desktop and mobile devices
- **Fast Search**: Client-side filtering and search
- **Data Structure**: Optimized lookup tables for fast navigation
- **Cross-references**: Automatic linking between items, recipes, and crafting entities
- **Navy Blue Theme**: Modern, dark theme perfect for gaming content

## Browser Compatibility

- Chrome/Chromium 60+
- Firefox 55+
- Safari 12+
- Edge 79+

## Development

To modify or extend the website:

1. **Update Data**: Re-run `parse_ultracube_final.py` to refresh the JSON data
2. **Styling**: Modify `styles.css` for appearance changes
3. **Functionality**: Edit `app.js` and `item-details.js` for behavior changes
4. **Data Processing**: Modify `data-processor.js` to change how data is loaded and processed

## Data Sources

- **Ultracube Mod**: `grandseiken/factorio-ultracube` repo (139 Lua files processed)
- **Base Factorio**: `wube/factorio-data` repo (for missing items)
- **Processing**: 890 total entries extracted and organized

While it does load items for mods such as Nixie Tubes and RT Items - I didn't load those entities into the data so on the website there are some holes.

The website provides a complete, interactive reference for the Ultracube mod's complex crafting system!