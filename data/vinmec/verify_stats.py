import json
from collections import Counter

VIDEOS_PATH = 'videos.json'
CATEGORIES_PATH = '../product/database.categories.json'

with open(VIDEOS_PATH, 'r') as f:
    videos = json.load(f)

with open(CATEGORIES_PATH, 'r') as f:
    categories = json.load(f)

total_videos = len(videos)
videos_with_category = sum(1 for v in videos if v.get('classification', {}).get('product_category'))
videos_with_products = sum(1 for v in videos if v.get('product_ids'))
total_product_links = sum(len(v.get('product_ids', [])) for v in videos)

print(f"Total Videos: {total_videos}")
print(f"Videos with Category: {videos_with_category} ({videos_with_category/total_videos*100:.2f}%)")
print(f"Videos with Products: {videos_with_products} ({videos_with_products/total_videos*100:.2f}%)")
print(f"Total Product Links: {total_product_links}")

# Check Categories
cat_names = set(c['name'].lower() for c in categories)
playlist_names = set(v.get('classification', {}).get('playlist', '').lower() for v in videos)

print(f"\nUnique Playlists: {len(playlist_names)}")
print(f"Unique Categories: {len(cat_names)}")

common = playlist_names.intersection(cat_names)
print(f"Playlists that match Category names exactly: {len(common)}")
print(list(common)[:10])

print("\n--- Sample Matches ---")
count = 0
for v in videos:
    if v.get('product_ids'):
        print(f"Video: {v['title']}")
        print(f"  Category: {v['classification']['product_category']}")
        print(f"  Linked Products: {len(v['product_ids'])}")
        count += 1
        if count > 5: break
