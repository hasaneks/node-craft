# Files and media

Only when the product stores files.

- Model each file: owner (user and tenant), access policy (private, shared with, public), size, content type, purpose,
  retention, status (`pending`, `ready`, `rejected`).
- A container's local disk on Railway is not durable user storage. Use object storage (S3-compatible) or a
  deliberately designed volume whose deploy and scaling behaviour you have checked in current platform docs.

## Upload

1. `POST /uploads` with purpose, size and content type → the server checks authorization and limits, creates a
   `pending` row with a server-generated object key (`tenant/<id>/user/<id>/<uuid>`), and returns a short-lived
   presigned PUT URL with size and type conditions.
2. The client uploads directly to storage.
3. `POST /uploads/{id}/complete` → the server checks the object exists, the size, and the real type from the content
   (magic bytes, not the extension or the declared MIME), runs a scan when the product's risk calls for it, then marks
   it `ready` and attaches it to its owner record.
4. Heavy processing (thumbnails, compression, video) runs in a worker.

Small files through the API (`@fastify/multipart`) are fine with strict limits; stream to storage, never buffer the
whole file in memory.

## Download

- Check authorization on every download; return a short-lived presigned GET URL or stream through the API.
- A private file never becomes a permanent public URL.

## Cleanup

Scheduled cleanup of `pending` uploads that never completed, orphaned objects without a row, and files past their
retention or belonging to deleted accounts.
