# Course Detection Rules

## Overview
Course detection uses keyword matching on recipe title, ingredients, and steps to determine the course type. The system scores each course type and returns the highest-scoring match (if score ≥ 2).

## Scoring System

### Points Allocation
- **Title matches**: 3 points per keyword match
- **Full text matches** (ingredients + steps): 1 point per keyword match

### Course Types & Keywords

#### **Appetizer**
- Keywords: `appetizer`, `appetiser`, `starter`, `hors d'oeuvre`, `dip`, `spread`, `crostini`, `bruschetta`, `canapé`, `tapas`, `mezze`, `finger food`, `small plate`, `amuse-bouche`

#### **Soup**
- Keywords: `soup`, `broth`, `chowder`, `bisque`, `gazpacho`, `consommé`, `bouillon`, `stock`, `ramen`, `pho`, `gumbo`
- **Note**: Removed `stew`, `jambalaya`, `cassoulet`, `tagine` - these are main dishes, not soups

#### **Salad**
- Keywords: `salad`, `coleslaw`, `slaw`, `caesar`, `cobb`, `nicoise`, `caprese`, `greek salad`, `waldorf`, `potato salad`, `pasta salad`, `grain salad`, `green salad`, `side salad`

#### **Main** (Main Course)
- Keywords: `main`, `main course`, `entree`, `entrée`, `dinner`, `lunch`, `supper`, `dish`, `meal`, `recipe`, `casserole`, `roast`, `braise`, `grill`, `skillet`, `one pot`, `one-pan`, `sheet pan`
- **Main dish keywords** (added to fix curry/stew confusion): `curry`, `curries`, `stew`, `tagine`, `jambalaya`, `cassoulet`, `ragout`, `goulash`, `chili`, `chilli`, `bolognese`, `ragu`, `stroganoff`, `teriyaki`, `stir-fry`, `stir fry`, `fricassee`, `bourguignon`, `coq au vin`

#### **Side**
- Keywords: `side`, `side dish`, `accompaniment`, `garnish`, `topping`, `condiment`, `sauce`, `dressing`, `relish`, `chutney`, `pickle`, `pickled`

#### **Dessert**
- Keywords: `dessert`, `sweet`, `cake`, `pie`, `tart`, `pudding`, `custard`, `mousse`, `soufflé`, `souffle`, `ice cream`, `sorbet`, `gelato`, `cookie`, `biscuit`, `brownie`, `fudge`, `candy`, `confection`, `pastry`, `treat`, `snack cake`

#### **Snack**
- Keywords: `snack`, `bite`, `nibble`, `finger food`, `quick bite`, `light bite`, `trail mix`, `granola bar`, `energy bar`, `protein bar`

#### **Breakfast**
- Keywords: `breakfast`, `brunch`, `morning`, `pancake`, `waffle`, `french toast`, `eggs benedict`, `omelet`, `omelette`, `scrambled eggs`, `fried eggs`, `cereal`, `oatmeal`, `porridge`, `granola`, `yogurt`, `smoothie`, `breakfast sandwich`, `breakfast burrito`, `hash`, `frittata`

## Disambiguation Rules

### Soup vs Main
**Problem**: Curries and stews were being misclassified as soups because:
- "stew" was in soup keywords
- Recipe steps might mention "simmer until it becomes a thick stew"
- This gave soup points even though it's a main dish

**Solution**:
1. Moved `stew`, `tagine`, `jambalaya`, `cassoulet` from soup to main keywords
2. Added explicit main dish keywords: `curry`, `ragout`, `goulash`, `chili`, `bolognese`, `ragu`, `stroganoff`, etc.
3. Enhanced disambiguation logic:
   - If title explicitly says soup-related words (`soup`, `chowder`, `broth`, `bisque`, `gazpacho`) → prioritize soup
   - If title says main dish words (`curry`, `tagine`, `jambalaya`, `cassoulet`, `ragout`, `goulash`, `chili`, `bolognese`, `ragu`, `stroganoff`, `fricassee`, `bourguignon`, `coq au vin`) → prioritize main
   - If title says "stew":
     - If title also says "soup" → prioritize soup
     - Otherwise → prioritize main (most stews are main dishes)

### Breakfast vs Main
- If breakfast keywords present AND main keywords present:
  - If title says "breakfast" or "brunch" OR text mentions "morning" or "eggs" → prioritize breakfast
  - Otherwise → prioritize main

### Dessert vs Snack
- If dessert keywords present AND snack keywords present:
  - If text mentions sweet ingredients (`sugar`, `chocolate`, `sweet`, `cake`, `cookie`) → prioritize dessert
  - Otherwise → prioritize snack

### Salad vs Side
- If salad keywords present AND side keywords present:
  - If title says "salad" → prioritize salad
  - Otherwise → prioritize side

### Main vs Side/Appetizer
- If main keywords present AND (side OR appetizer keywords present):
  - If title says "main course" or "main dish" → prioritize main
  - If title says "side" or "accompaniment" → prioritize side/appetizer

## Examples

### ✅ Correct Classifications

**"Chicken Curry"**
- Title: "Chicken Curry" → `curry` = 3 points (main)
- Result: **main** ✓

**"Beef Stew"**
- Title: "Beef Stew" → `stew` = 3 points (main), disambiguation prioritizes main
- Result: **main** ✓

**"Tomato Soup"**
- Title: "Tomato Soup" → `soup` = 3 points (soup)
- Result: **soup** ✓

**"Chicken Curry Recipe"**
- Title: "Chicken Curry Recipe" → `curry` = 3 points (main), `recipe` = 3 points (main)
- Steps might say "simmer until thick stew" → `stew` = 1 point (main)
- Result: **main** ✓ (curry keyword overrides)

**"Vegetable Soup Stew"**
- Title: "Vegetable Soup Stew" → `soup` = 3 points (soup), `stew` = 3 points (main)
- Disambiguation: title says "soup" → prioritize soup
- Result: **soup** ✓

### ❌ Previous Issues (Now Fixed)

**"Chicken Curry" (was misclassified as soup)**
- Old behavior: Steps say "simmer until thick stew" → `stew` = 1 point (soup) → soup wins
- New behavior: Title says "curry" → `curry` = 3 points (main) → main wins ✓

**"Tagine" (was misclassified as soup)**
- Old behavior: `tagine` was in soup keywords → soup wins
- New behavior: `tagine` is in main keywords → main wins ✓

## Minimum Score Threshold
- Course is only detected if the highest score ≥ 2 points
- This prevents weak matches from being classified

## Future Improvements
- Consider using AI for ambiguous cases (similar to cuisine detection)
- Add more context-aware rules (e.g., if recipe has rice/bread, it's likely a main)
- Consider ingredient ratios (e.g., if mostly vegetables with broth → soup, if protein-heavy → main)

