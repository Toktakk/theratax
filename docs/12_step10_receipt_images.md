# Step 10 — Receipt images

Guide: [Project plan](02_project_plans.md). Previous: [Step 9 — Tax summary](11_step09_tax_summary.md). Next: [Step 11 — Invoices and PDF](13_step11_invoices_and_pdf.md).

## Why this step comes first

The feed can already log money, but item 3 of the flow is attaching a photo to that row in one more request, and only when there is a photo. The link you hand out must open the image, and it must expire. This step is checked by uploading and then opening the link, not only by getting a row in the table.

## Not in this step

Do not create invoices, and do not build React pages. Opening the link uses Postman or a browser hitting the URL you received.

## Concept

One transaction can have one image. `POST /transactions/:id/receipt` is `multipart/form-data`. The field name is `file`.

- Accepted types: `image/jpeg`, `image/png`, `image/webp`
- Size: 1 byte up to 10 MiB, which is `10 * 1024 * 1024`

Success is `201` with no URL.

```ts
interface Receipt {
  transactionId: number;
  contentType: string;
  byteSize: number;
}
```

A second upload replaces the previous image and gets `201` again. The storage key is `receipts/<userId>/<transactionId>`, so it overwrites the same object.

The object is private, so the `POST` response has no URL. `GET /transactions/:id/receipt` gets `200`.

```ts
interface ReceiptUrl {
  url: string;
  expiresAt: string;
}
```

`url` is a short-lived signed link. `expiresAt` is ISO 8601, 15 minutes from the moment the link is issued. The client uses `url` as the `src` of an image. The API does not stream the image bytes, and it does not return a permanent URL.

There is no image yet, but the transaction exists. Respond `404`.

```json
{ "message": "Receipt for transaction <id> not found", "error": "Not Found", "statusCode": 404 }
```

There is no transaction, or the transaction belongs to someone else. Respond `404` with the message `Transaction <id> not found`, on upload, on asking for the link, and on delete. `DELETE` when an image exists gets `204` and no body.

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
    image: minio/minio:latest
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

`FileInterceptor('file', { limits: { fileSize: 10 * 1024 * 1024 } })` stops a large file before the handler. If multer throws `MulterError`, in particular the code `LIMIT_FILE_SIZE`, the filter responds `400` with the message `Receipt must be an image up to 10 MiB`. The shape is a string in `message`, from an exception you threw on purpose, not an array from the pipe. The contract locks the status for a wrong type or an oversized file at 400, and this lesson uses this sentence.

In the service, if there is no file, or `size` is less than 1, respond `400` with the same sentence. If `mimetype` is not one of the three types above, respond `400` with the same sentence. Then `PutObject` with `Body` as the buffer and `ContentType` as the file's type, then `upsert` the `Receipt` row.

The lookup order is: find this user's transaction first. If it is missing, that is the transaction message. If it exists but there is no receipt, that is the receipt message. Delete calls `DeleteObject`, then deletes the row.

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

Asking for the link gets `200`. It has a `url` that starts with the MinIO endpoint, and `expiresAt` about 15 minutes from the time you asked. A drift of up to one minute is acceptable.

Postman can open that link and get the image bytes, status `200`. Opening the link in a browser shows the picture.

Uploading again gets `201`, and the new link still opens the picture.

`notes.txt` gets `400` and the message `Receipt must be an image up to 10 MiB`.

A transaction that still has no image gets `404` and the message `Receipt for transaction <id> not found`.

In the transaction list, the uploaded row has `hasReceipt: true`.

No Bearer gets `401`. If you are not onboarded, you get `403`.

## If it fails

- `POST` gets 201 but that body contains `url`: the link was put on the wrong path. The link lives only on `GET`.
- The link does not open from your machine: it was signed with a host that is visible only inside the container, such as `minio:9000`. Set `S3_ENDPOINT` to `http://localhost:9000` and `forcePathStyle` to true.
- `expiresAt` is hours or days away: `expiresIn` is not 900 seconds.
- A large file gets 500: `MulterError` is not yet caught as 400.
- Someone else's image opens: you forgot to filter `userId` when finding the transaction.
- The bucket can be read with no signature: a public policy is in place. Remove it. The object must open only through a link that was just signed.

**Pass this step, then continue.**
