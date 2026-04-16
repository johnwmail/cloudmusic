# Improvements

- Fix path sanitization so traversal-like inputs collapse cleanly instead of leaving malformed paths.
- Encode audio URLs on the client and decode them on the worker so track names with spaces or special characters still play.
- Return the correct audio `Content-Type` for streamed files instead of forcing `audio/mpeg`.
- Make directory listing and search respect `S3_PREFIX` so prefix-scoped deployments stay inside the intended library root.
- Add a flat ESLint config for the current ESLint 9 setup so linting can run again.
