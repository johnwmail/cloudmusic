#!/bin/bash
# upload-to-r2.sh - Recursively upload MP3 files to Cloudflare R2
# Handles UTF-8/Chinese filenames and spaces safely

BUCKET="music-bucket"
SOURCE_DIR="./mp3"

if [ ! -d "$SOURCE_DIR" ]; then
    echo "Error: Directory '$SOURCE_DIR' not found"
    exit 1
fi

echo "Uploading MP3 files from '$SOURCE_DIR' to R2 bucket '$BUCKET'..."
echo ""

find "$SOURCE_DIR" -type f -name '*.mp3' -print0 | while IFS= read -r -d '' file; do
    key="${file#$SOURCE_DIR/}"
    echo "  Uploading: $key"
    npx wrangler r2 object put "$BUCKET/$key" --file "$file" --remote
done

echo ""
echo "Done! Upload complete."
