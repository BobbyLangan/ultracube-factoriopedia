#!/usr/bin/env python3
"""
Final robust script to extract Factorio data:extend calls from Lua files.
Uses a specialized approach for Factorio prototype parsing.
"""

import os
import re
import json
from collections import defaultdict

def clean_name(name: str) -> str:
    """
    Correct name cleaning:
    1. Remove only the cube- prefix (not other cube words)
    2. Replace dashes and underscores with spaces
    3. Apply proper title case
    4. Clean up spacing
    """
    if not name:
        return name
    
    # Step 1: Remove only cube- prefix
    if name.startswith('cube-'):
        name = name[5:]  # Remove 'cube-' prefix only
    
    # Step 2: Replace dashes and underscores with spaces
    name = name.replace('-', ' ').replace('_', ' ')
    
    # Step 3: Handle special cases before title case
    # Handle RT technology names by adding spaces
    if name.startswith('RT') and len(name) > 2:
        # Insert spaces before capital letters in RT names
        import re
        name = re.sub(r'RT([A-Z])', r'RT \1', name)
        name = re.sub(r'([a-z])([A-Z])', r'\1 \2', name)
    
    # Step 4: Apply title case
    name = name.title()
    
    # Step 5: Fix common abbreviations that should stay uppercase
    import re
    replacements = {
        'Fx': 'FX',
        'Ai': 'AI', 
        'Ui': 'UI',
        'Api': 'API',
        'Cpu': 'CPU',
        'Gpu': 'GPU',
        'Rt': 'RT',  # For RT tech names
        'Tech': 'Tech'
    }
    
    for old, new in replacements.items():
        name = re.sub(r'\b' + old + r'\b', new, name)
    
    # Step 6: Clean up extra whitespace
    name = ' '.join(name.split())
    
    return name

class FactorioLuaParser:
    """
    Specialized parser for Factorio Lua prototype files.
    """
    
    def __init__(self):
        pass
    
    def extract_string_value(self, value_str: str) -> str:
        """Extract string value, removing quotes."""
        value_str = value_str.strip()
        if (value_str.startswith('"') and value_str.endswith('"')) or \
           (value_str.startswith("'") and value_str.endswith("'")):
            return value_str[1:-1]
        return value_str
    
    def extract_number_value(self, value_str: str):
        """Extract numeric value."""
        value_str = value_str.strip()
        try:
            if '.' in value_str:
                return float(value_str)
            else:
                return int(value_str)
        except ValueError:
            return value_str
    
    def parse_lua_array(self, array_str: str) -> list:
        """Parse a Lua array string into Python list."""
        array_str = array_str.strip()
        if array_str.startswith('{') and array_str.endswith('}'):
            array_str = array_str[1:-1]
        
        items = []
        current_item = ""
        brace_count = 0
        in_string = False
        string_char = None
        
        for char in array_str:
            if not in_string and char in ['"', "'"]:
                in_string = True
                string_char = char
            elif in_string and char == string_char:
                in_string = False
                string_char = None
            
            if not in_string:
                if char == '{':
                    brace_count += 1
                elif char == '}':
                    brace_count -= 1
                elif char == ',' and brace_count == 0:
                    item = current_item.strip()
                    if item:
                        items.append(self.parse_lua_value(item))
                    current_item = ""
                    continue
            
            current_item += char
        
        # Don't forget the last item
        if current_item.strip():
            items.append(self.parse_lua_value(current_item))
        
        return items
    
    def parse_lua_value(self, value_str: str):
        """Parse any Lua value."""
        value_str = value_str.strip()
        
        if not value_str:
            return None
        
        # Boolean
        if value_str.lower() == 'true':
            return True
        elif value_str.lower() == 'false':
            return False
        
        # String
        if (value_str.startswith('"') and value_str.endswith('"')) or \
           (value_str.startswith("'") and value_str.endswith("'")):
            return value_str[1:-1]
        
        # Number
        try:
            if '.' in value_str:
                return float(value_str)
            else:
                return int(value_str)
        except ValueError:
            pass
        
        # Array/Table
        if value_str.startswith('{'):
            return self.parse_lua_table(value_str)
        
        # Default to string
        return value_str
    
    def parse_lua_table(self, table_str: str) -> dict:
        """Parse a Lua table string."""
        table_str = table_str.strip()
        if table_str.startswith('{') and table_str.endswith('}'):
            table_str = table_str[1:-1]
        
        result = {}
        array_items = []
        
        # Split by commas at the top level
        items = self.split_lua_table_items(table_str)
        
        for item in items:
            item = item.strip()
            if not item:
                continue
            
            # Check if it's a key-value pair
            if '=' in item and not item.startswith('{'):
                # Find the first = that's not inside quotes or braces
                eq_pos = self.find_assignment_operator(item)
                if eq_pos > 0:
                    key_part = item[:eq_pos].strip()
                    value_part = item[eq_pos + 1:].strip()
                    
                    # Extract key
                    key = key_part
                    if key.startswith('[') and key.endswith(']'):
                        key = key[1:-1]
                    if (key.startswith('"') and key.endswith('"')) or \
                       (key.startswith("'") and key.endswith("'")):
                        key = key[1:-1]
                    
                    # Parse value
                    result[key] = self.parse_lua_value(value_part)
                else:
                    # Might be an array item
                    array_items.append(self.parse_lua_value(item))
            else:
                # Array item
                array_items.append(self.parse_lua_value(item))
        
        if array_items:
            result['_array_items'] = array_items
        
        return result
    
    def find_assignment_operator(self, text: str) -> int:
        """Find the position of the assignment operator (=) that's not inside strings or braces."""
        brace_count = 0
        bracket_count = 0
        in_string = False
        string_char = None
        
        for i, char in enumerate(text):
            if not in_string and char in ['"', "'"]:
                in_string = True
                string_char = char
            elif in_string and char == string_char:
                if i == 0 or text[i-1] != '\\':
                    in_string = False
                    string_char = None
            elif not in_string:
                if char == '{':
                    brace_count += 1
                elif char == '}':
                    brace_count -= 1
                elif char == '[':
                    bracket_count += 1
                elif char == ']':
                    bracket_count -= 1
                elif char == '=' and brace_count == 0 and bracket_count == 0:
                    return i
        
        return -1
    
    def split_lua_table_items(self, table_content: str) -> list:
        """Split table content into individual items, respecting nested structures."""
        items = []
        current_item = ""
        brace_count = 0
        bracket_count = 0
        in_string = False
        string_char = None
        
        for char in table_content:
            if not in_string and char in ['"', "'"]:
                in_string = True
                string_char = char
            elif in_string and char == string_char:
                in_string = False
                string_char = None
            elif not in_string:
                if char == '{':
                    brace_count += 1
                elif char == '}':
                    brace_count -= 1
                elif char == '[':
                    bracket_count += 1
                elif char == ']':
                    bracket_count -= 1
                elif char == ',' and brace_count == 0 and bracket_count == 0:
                    items.append(current_item.strip())
                    current_item = ""
                    continue
            
            current_item += char
        
        if current_item.strip():
            items.append(current_item.strip())
        
        return items
    
    def extract_data_extend_calls(self, content: str) -> list:
        """Extract all data:extend calls from Lua content."""
        results = []
        
        # Remove Lua comments
        lines = content.split('\n')
        clean_lines = []
        for line in lines:
            comment_pos = line.find('--')
            if comment_pos >= 0:
                # Simple comment detection - check if it's in a string
                before_comment = line[:comment_pos]
                single_quotes = before_comment.count("'")
                double_quotes = before_comment.count('"')
                # If we have an even number of quotes before --, it's likely a real comment
                if (single_quotes % 2 == 0) and (double_quotes % 2 == 0):
                    line = line[:comment_pos]
            clean_lines.append(line)
        
        content = '\n'.join(clean_lines)
        
        # Find data:extend patterns
        pattern = r'data:extend\s*\(\s*\{'
        
        for match in re.finditer(pattern, content):
            # Find the opening brace position
            start_pos = content.find('{', match.start())
            if start_pos == -1:
                continue
            
            # Find the matching closing brace
            brace_count = 1
            pos = start_pos + 1
            
            while pos < len(content) and brace_count > 0:
                char = content[pos]
                if char == '{':
                    brace_count += 1
                elif char == '}':
                    brace_count -= 1
                pos += 1
            
            if brace_count == 0:
                # Extract the table content
                table_content = content[start_pos + 1:pos - 1]
                
                # Split into individual prototype tables
                prototype_tables = self.extract_prototype_tables(table_content)
                
                for proto_table in prototype_tables:
                    try:
                        parsed = self.parse_lua_table(proto_table)
                        if parsed and 'type' in parsed:
                            results.append(parsed)
                    except Exception as e:
                        print(f"Error parsing prototype: {e}")
        
        return results
    
    def extract_prototype_tables(self, content: str) -> list:
        """Extract individual prototype table definitions."""
        tables = []
        current_table = ""
        brace_count = 0
        in_string = False
        string_char = None
        
        i = 0
        while i < len(content):
            char = content[i]
            
            if not in_string and char in ['"', "'"]:
                in_string = True
                string_char = char
            elif in_string and char == string_char:
                if i == 0 or content[i-1] != '\\':
                    in_string = False
                    string_char = None
            elif not in_string:
                if char == '{':
                    if brace_count == 0:
                        # Start of new table
                        current_table = "{"
                    else:
                        current_table += char
                    brace_count += 1
                elif char == '}':
                    brace_count -= 1
                    current_table += char
                    if brace_count == 0:
                        # End of table
                        tables.append(current_table)
                        current_table = ""
                        # Skip whitespace and comma
                        i += 1
                        while i < len(content) and content[i] in ' \n\r\t,':
                            i += 1
                        i -= 1  # Will be incremented at end of loop
                else:
                    if brace_count > 0:
                        current_table += char
            else:
                if brace_count > 0:
                    current_table += char
            
            i += 1
        
        return tables

def load_base_items():
    """Load base game items."""
    base_items = {}
    parser = FactorioLuaParser()
    prototypes_dir = "../factorio-data/base/prototypes"
    
    if os.path.exists(prototypes_dir):
        for root, dirs, files in os.walk(prototypes_dir):
            for file in files:
                if file.endswith('.lua'):
                    file_path = os.path.join(root, file)
                    try:
                        with open(file_path, 'r', encoding='utf-8') as f:
                            content = f.read()
                        
                        entities = parser.extract_data_extend_calls(content)
                        for entity in entities:
                            if 'type' in entity and 'name' in entity:
                                base_items[entity['name']] = entity
                    except Exception as e:
                        print(f"Error loading entities from {file_path}: {e}")
        print(f"Loaded {len(base_items)} base entities")
    
    return base_items

def main():
    """Main function."""
    ultracube_path = "../factorio-ultracube"
    
    if not os.path.exists(ultracube_path):
        print(f"Error: {ultracube_path} does not exist")
        return
    
    print("Loading base game items...")
    base_items = load_base_items()
    
    print("Finding Lua files...")
    lua_files = []
    for root, dirs, files in os.walk(ultracube_path):
        for file in files:
            if file.endswith('.lua'):
                lua_files.append(os.path.join(root, file))
    
    print(f"Found {len(lua_files)} Lua files")
    
    parser = FactorioLuaParser()
    all_data = []
    file_stats = {}
    
    for file_path in lua_files:
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                content = f.read()
            
            data_entries = parser.extract_data_extend_calls(content)
            all_data.extend(data_entries)
            
            file_name = os.path.basename(file_path)
            file_stats[file_name] = len(data_entries)
            
            if data_entries:
                print(f"{file_name}: {len(data_entries)} entries")
                
        except Exception as e:
            print(f"Error processing {file_path}: {e}")
    
    print(f"\nExtracted {len(all_data)} total entries")
    
    # Organize by type
    organized_data = defaultdict(list)
    item_names = set()
    
    for item in all_data:
        item_type = item.get('type', 'unknown')
        
        # Clean name
        if 'name' in item:
            item['cleaned_name'] = clean_name(item['name'])
            if item_type == 'item':
                item_names.add(item['name'])
        
        organized_data[item_type].append(item)
    
    # Convert defaultdict to regular dict
    organized_data = dict(organized_data)
    
    # Check recipe dependencies for missing items
    if 'recipe' in organized_data:
        missing_items = {}
        
        for recipe in organized_data['recipe']:
            # Check ingredients
            ingredients = recipe.get('ingredients', {})
            if isinstance(ingredients, dict) and '_array_items' in ingredients:
                for ingredient in ingredients['_array_items']:
                    if isinstance(ingredient, dict) and 'name' in ingredient:
                        name = ingredient['name']
                        if name not in item_names and name in base_items:
                            missing_items[name] = base_items[name]
            elif isinstance(ingredients, list):
                for ingredient in ingredients:
                    if isinstance(ingredient, dict) and 'name' in ingredient:
                        name = ingredient['name']
                        if name not in item_names and name in base_items:
                            missing_items[name] = base_items[name]
            
            # Check results
            results = recipe.get('results', {})
            if isinstance(results, dict) and '_array_items' in results:
                for result in results['_array_items']:
                    if isinstance(result, dict) and 'name' in result:
                        name = result['name']
                        if name not in item_names and name in base_items:
                            missing_items[name] = base_items[name]
            elif isinstance(results, list):
                for result in results:
                    if isinstance(result, dict) and 'name' in result:
                        name = result['name']
                        if name not in item_names and name in base_items:
                            missing_items[name] = base_items[name]
        
        # Add missing base items
        if missing_items:
            if 'item' not in organized_data:
                organized_data['item'] = []
            
            for name, item_data in missing_items.items():
                item_copy = item_data.copy()
                item_copy['cleaned_name'] = clean_name(name)
                item_copy['_source'] = 'base_game'
                organized_data['item'].append(item_copy)
            
            print(f"Added {len(missing_items)} missing base items")
    
    # Print summary
    print("\n=== SUMMARY ===")
    total_count = 0
    for data_type, items in sorted(organized_data.items()):
        count = len(items)
        total_count += count
        print(f"{data_type}: {count}")
    
    print(f"\nTotal: {total_count} entries")
    
    # Save results
    output_file = "ultracube_organized_data.json"
    print(f"\nSaving to {output_file}...")
    
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(organized_data, f, indent=2, ensure_ascii=False)
    
    print("Complete!")

if __name__ == "__main__":
    main()