# Step 10 — Receipt images

Guide: [Project plan](02_project_plans.md). Previous: [Step 9 — Tax summary](11_step09_tax_summary.md). Next: [Step 11 — Invoices and PDF](13_step11_invoices_and_pdf.md).

## Why this step comes first

The feed can already log money, but item 3 of the flow is attaching a photo to that row in one more request, and only when there is a photo. The link you hand out must open the image, and it must expire. This step is checked by uploading and then opening the link, not only by getting a row in the table.

## Not in this step

Do not create invoices, and do not build React pages. Opening the link uses Postman or a browser hitting the URL you received. Do not add a payment-slip route, a second image table, or a migration. A payment slip uses the receipt routes already in this step.

## Concept

Saving a transaction does not require a photograph. `POST /transactions` has no file field. An income row can be created with `hasReceipt: false` and no `Receipt` row. These upload routes stay for expenses and for any transaction that does have a photo. Do not remove the upload module because massage income does not use a picture.

One transaction can have one image. That image is a receipt or a payment slip, not both. `POST /transactions/:id/receipt` is `multipart/form-data`. The field name is `file`. The bytes may come from a camera capture or from a file picker. The server does not take a filesystem path.

- Accepted types: `image/jpeg`, `image/png`, `image/webp`, and `application/pdf`. HEIC is rejected. A camera capture has to be one of the three images. A PDF is accepted when the bytes start with `%PDF-` and contain `%%EOF`.
- Size: 1 byte up to 10 MiB, which is `10 * 1024 * 1024`

Success is `201` with no URL.

```ts
interface Receipt {
  transactionId: number;
  contentType: string;
  byteSize: number;
}
```

A second upload replaces the previous image and gets `201` again. There is still one `Receipt` row, so the response is not `409`. The new storage key is `receipts/<userId>/<transactionId>/<objectId>`. `objectId` is generated. It is never the original filename. After the row points at the new key, delete the previous object. A row that already uses `receipts/<userId>/<transactionId>` still opens. Do not rewrite those rows. There is no new column and no migration.

The object is private, so the `POST` response has no URL. `GET /transactions/:id/receipt` gets `200`.

```ts
interface ReceiptUrl {
  url: string;
  expiresAt: string;
  contentType: string;
}
```

`url` is a short-lived signed link. `expiresAt` is ISO 8601, 15 minutes from the moment the link is issued. The client uses `url` as the `src` of an image. The API does not stream the image bytes, and it does not return a permanent URL.

There is no image yet, but the transaction exists. Respond `404`.

```json
{ "message": "Receipt for transaction <id> not found", "error": "Not Found", "statusCode": 404 }
```

There is no transaction, or the transaction belongs to someone else. Respond `404` with the message `Transaction <id> not found`, on upload, on asking for the link, and on delete. `DELETE` when an image exists gets `204` and no body.

Saving the object or the receipt row failed. Respond `500` with `Receipt could not be stored`. The receipt row is unchanged. Signing the link failed. Respond `500` with `Receipt could not be opened`. Deleting the stored image failed. Respond `500` with `Receipt could not be removed`.

These paths require onboarding. Otherwise they are `403` with the same message, and they require Bearer.

The store that matches the contract is MinIO, which speaks the same protocol as S3. The bucket is private. The app asks for a read link with `@aws-sdk/s3-request-presigner`, lifetime `expiresIn: 900` seconds, then sets `expiresAt` from the same clock as `new Date(Date.now() + 15 * 60 * 1000).toISOString()`. A link signed against `endpoint` `http://localhost:9000` opens from your machine.

Install these two yourself. Do not install [step 11](13_step11_invoices_and_pdf.md)'s package yet.

```bash
npm install @aws-sdk/client-s3 @aws-sdk/s3-request-presigner
npm install -D @types/multer
```

`multer` already comes with `@nestjs/platform-express`. `@types/multer` gives the `@UploadedFile()` parameter the type `Express.Multer.File`.

Add a service to `docker-compose.yml`. This password is for the development machine, the same way Postgres is.

```yaml
  minio:
    image: pgsty/silo:RELEASE.2026-09-16T00-00-00Z
    command: server /data --console-address ":9001"
    environment:
      MINIO_ROOT_USER: theratax
      MINIO_ROOT_PASSWORD: theratax-secret
    ports:
      - "9000:9000"
      - "9001:9001"
    volumes:
      - miniodata:/data
```

Add a volume `miniodata` next to `pgdata`, then put these values in `.env`.

```text
S3_ENDPOINT=http://localhost:9000
S3_ACCESS_KEY=theratax
S3_SECRET_KEY=theratax-secret
S3_BUCKET=receipts
```

`S3Client` uses `forcePathStyle: true`, because MinIO needs that path style. `region` can be `us-east-1` for the development machine. It does not move the data to that region.

When the module starts, create the bucket if it does not exist. If the error says it already exists, continue. Do not set a policy that makes the bucket public.

`FileInterceptor('file', { limits: { fileSize: MAX_RECEIPT_BYTES } })` stops a large file before the handler. `MAX_RECEIPT_BYTES` is `10 * 1024 * 1024`, in one place, and the service uses that same constant. If multer throws `MulterError`, in particular the code `LIMIT_FILE_SIZE`, the filter responds `400` with the message `Receipt must be an image or PDF up to 10 MiB`. The shape is a string in `message`, from an exception you threw on purpose, not an array from the pipe. The contract locks the status for a wrong type, a malformed image, or an oversized file at 400, and this lesson uses this sentence. The interceptor keeps the file in memory so the bytes can be checked. Do not switch it to disk storage.

Find this user's transaction first. A missing row is the transaction message, including when the file would also be rejected. Then reject a missing file, a size below 1 byte, a size above `MAX_RECEIPT_BYTES`, or bytes that are not a complete JPEG, PNG, WebP, or PDF, with the same `400` sentence. Read the type from the bytes. A camera blob may send `application/octet-stream` or an empty type. Those are accepted when the bytes are one of the three images. A PDF is accepted from its header and `%%EOF`. `ContentType` on `PutObject`, and `contentType` on the row, are the detected type. Ignore the filename.

`PutObject` the new key first. If that write fails, respond `500` with `Receipt could not be stored` and do not write a row. Then `upsert` on `transactionId`. If the upsert fails, `DeleteObject` the new key, leave the previous object in place, and respond `500` with the same sentence. A retry writes a new object id and upserts the same row. After the upsert succeeds, delete the previous object when its key differs. A link is signed only for a key shaped like the two forms above. Delete calls `DeleteObject`, then deletes the row. If there is no receipt, that is the receipt message.

`hasReceipt` on `GET /transactions` must be `true` after upload and `false` again after delete. The mapper from [step 8](10_step08_log_income_and_expenses.md) already does this if the query includes the `receipt` relation.

This domain's folder is `src/upload/`, following the project layout, even though the path sits under `/transactions/:id/receipt`, because an image is a different job from logging money. The controller in this folder can declare that path.

## Files for this step

- `docker-compose.yml` adds the `minio` service and the volume
- `.env` adds the four variables above
- `src/upload/upload.service.ts` wraps `S3Client`
- `src/upload/receipts.controller.ts`
- `src/upload/receipts.service.ts`
- `src/upload/receipt-upload.filter.ts`
- `src/upload/upload.module.ts`
- `src/upload/receipt-limits.ts` holds the size and the client messages
- `src/upload/image-type.ts` reads JPEG, PNG, WebP, and PDF bytes
- `src/upload/receipt-storage-key.ts` builds and checks storage keys
- `src/upload/receipt-link.ts` sets the 15-minute expiry
- `src/upload/store-receipt.ts` uploads, opens, and removes one photo
- `src/app.module.ts` adds `UploadModule`

The module imports `AuthModule`. The whole controller class has `@UseGuards(AuthGuard)` and `@UseFilters(ReceiptUploadFilter)`. Every method calls `assertOnboarded` first.

`POST` gets 201 from Nest's default. `GET` returns `{ url, expiresAt }`. `DELETE` uses `@HttpCode(HttpStatus.NO_CONTENT)`.

Declare the file parameter as `Express.Multer.File | undefined`, because the interceptor does not guarantee a file.

## Commands you run

```bash
docker compose up -d
```

Restart `start:dev`. Prepare a small image file named `receipt.jpg` that is a real JPEG, and a file `notes.txt`. Use Ada's transaction. Store its id in the environment variable `tx`. Store the id of a transaction with no image in `empty`.

The first upload uses Bearer `{{token}}`. Open Body, choose form-data, key name `file`, type File, and choose `receipt.jpg`. Do not set `Content-Type` yourself.

```text
POST {{baseUrl}}/transactions/{{tx}}/receipt
```

Ask for the link. Use Bearer `{{token}}`.

```text
GET {{baseUrl}}/transactions/{{tx}}/receipt
```

Take the `url` from that response and open it. That is a new GET. Paste the whole URL. Turn Authorization off.

Then upload `receipt.jpg` again with the same POST, and ask for a new link. Both use Bearer `{{token}}`.

Try the text file with the same POST. Change the form-data file to `notes.txt`.

A transaction with no image, and the transaction list, use Bearer `{{token}}`.

```text
GET {{baseUrl}}/transactions/{{empty}}/receipt
```

```text
GET {{baseUrl}}/transactions?limit=20
```

## What you must see

The first upload gets `201`. It has `transactionId`, `contentType` of `image/jpeg`, `byteSize` greater than 0, and no `url` key.

Asking for the link gets `200`. It has a `url` that starts with the MinIO endpoint, `expiresAt` about 15 minutes from the time you asked, and `contentType` of the stored file. A drift of up to one minute is acceptable. An image opens as a picture. A PDF opens as a PDF.

Postman can open that link and get the image bytes, status `200`. Opening the link in a browser shows the picture.

Uploading again gets `201`, and the new link still opens the picture.

`notes.txt` gets `400` and the message `Receipt must be an image or PDF up to 10 MiB`.

A transaction that still has no image gets `404` and the message `Receipt for transaction <id> not found`.

In the transaction list, the uploaded row has `hasReceipt: true`.

`POST /transactions` with `{"type":"income","amountPence":100}` and no file gets `201`, `hasReceipt` of `false`, and no receipt row for that id. `GET /transactions/{{thatId}}/receipt` gets `404`. An expense with no file does the same.

A JPEG whose multipart type is `application/octet-stream` gets `201` and `contentType` `image/jpeg`. A file that only starts with JPEG bytes, and a PNG whose bytes were altered, get `400` and `Receipt must be an image or PDF up to 10 MiB`. Another user's transaction id gets `404` and `Transaction <id> not found`.

No Bearer gets `401`. If you are not onboarded, you get `403`.

`npm test` covers the same checks without MinIO: a valid image, a rejected type, a file over the limit, malformed bytes, a missing transaction, another user's id, an authorized link, the 900-second expiry, a transaction with no image, a second upload that still leaves one row, a failed save that does not replace the previous photo, and a retry that upserts the same transaction.

## If it fails

- `POST` gets 201 but that body contains `url`: the link was put on the wrong path. The link lives only on `GET`.
- The link does not open from your machine: it was signed with a host that is visible only inside the container, such as `minio:9000`. Set `S3_ENDPOINT` to `http://localhost:9000` and `forcePathStyle` to true.
- `expiresAt` is hours or days away: `expiresIn` is not 900 seconds.
- A large file gets 500: `MulterError` is not yet caught as 400.
- Someone else's image opens: you forgot to filter `userId` when finding the transaction.
- A renamed text file is accepted: the handler trusted `mimetype` or the filename. Read the bytes.
- The bucket can be read with no signature: a public policy is in place. Remove it. The object must open only through a link that was just signed.

**Pass this step, then continue.**
