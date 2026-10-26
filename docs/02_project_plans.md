# แผนการสอน TheraTax

บทเรียนนี้พาทำ TheraTax ตามลำดับที่ตรวจได้จริง เริ่มจากแอป Nest ที่ตอบ `Hello World!` ที่พอร์ต 3000, Postgres ใน [`docker-compose.yml`](../docker-compose.yml), และสัญญา API ใน [`api-spec.md`](api-spec.md) หน้าจอของผู้ใช้ห้าขั้นอยู่ใน [`01_user_flow.md`](01_user_flow.md)

คำอธิบายเป็นภาษาไทย โค้ดและคำสั่งเป็นภาษาอังกฤษ เอกสารนี้สอนลำดับการสร้าง มันไม่เปลี่ยนโค้ดแอปให้เอง

## กฎประตู

ทำจบขั้นที่เปิดอยู่ จนคำสั่งตรวจให้ผลตรงกับที่เขียน แล้วค่อยเปิดขั้นถัดไป

คำว่าตรวจได้หมายถึงมีคำสั่งหรือคำขอใน Postman ที่ส่งแล้วเห็นผลนั้นด้วยตา ไม่ใช่แค่ไฟล์ถูกสร้าง ถ้ายังไม่มีคำสั่งหรือคำขอตรวจ ขั้นนั้นยังไม่จบ และยังไม่เปิดไฟล์ของขั้นถัดไป

แต่ละขั้นมีโค้ดเฉพาะไฟล์ของขั้นนั้น ท้ายทุกขั้นมีประโยค **ผ่านแล้วค่อยไปขั้นถัดไป** ถ้าผลไม่ตรง ให้หยุดที่หัวข้อ "ถ้าไม่ผ่าน" ของขั้นนั้น

```mermaid
flowchart TD
  s1[ขั้น1 HelloWorld]
  s2[ขั้น2 Postgres]
  s3[ขั้น3 Prisma]
  s4[ขั้น4 ValidationPipe]
  s5[ขั้น5 ฟังก์ชันภาษีและไมล์]
  s6[ขั้น6 Auth]
  s7[ขั้น7 หมวดค่าใช้จ่าย]
  s8[ขั้น8 รายรับรายจ่าย]
  s9[ขั้น9 สรุปภาษี]
  s10[ขั้น10 ใบเสร็จ]
  s11[ขั้น11 ใบแจ้งหนี้และ PDF]
  s12[ขั้น12 React ทีละหน้า]
  s1 --> s2 --> s3 --> s4 --> s5 --> s6 --> s7 --> s8 --> s9 --> s10 --> s11 --> s12
```

เส้นนี้เป็นลำดับเดียวที่ใช้ได้ ขั้น 6 เป็นขั้นแรกที่มี endpoint จริงของผลิตภัณฑ์ การเรียก `PATCH /users/me/onboarding` ก่อนถึงขั้นนั้นจึงยังไม่ใช่งานของขั้นปัจจุบัน ถ้าเรียกโดยไม่มีหัว `Authorization: Bearer <token>` เซิร์ฟเวอร์ตอบ `401` และข้อความ `Unauthorized` นั่นแปลว่าคำขอยังไม่มีตัวตนของผู้ใช้ ไม่แปลว่า onboarding พัง และไม่ใช่เหตุผลที่จะข้ามไปเขียน endpoint อื่น

## ของที่มีในรีโปขณะเขียนบทเรียน

working tree มีร่างที่ข้ามลำดับมาแล้ว: Prisma, `ValidationPipe`, ฟังก์ชันภาษี, และ auth ไฟล์เหล่านั้นเป็นร่างให้ไปเทียบกับเกณฑ์ของแต่ละขั้น มันไม่ใช่จุดเริ่มของบทเรียน

ระหว่างทำขั้น 1 ถ้า `npm test` ล้มเพราะเทสของไฟล์ที่อยู่ขั้นถัดไป ให้ยังไม่ไปแก้ไฟล์นั้น เกณฑ์ของขั้น 1 คือเบราว์เซอร์กับ Postman เท่านั้น

## สัญญาที่บทเรียนทั้งฉบับยึด

เงินเป็นจำนวนเต็มหน่วยเพนนี £20 คือ `2000` เพนนี £20,000 คือ `2_000_000` เพนนี ตัวเลขทศนิยมทำให้ผลรวมกำกวมเมื่อต้องปัดเป็นเพนนี

วันปฏิทิน (`occurredOn`, `issuedOn`, `paidOn`, ขอบปีภาษี) เป็นสตริง `DD-MM-YYYY` เวลาที่เป็นจุดบนนาฬิกา (`onboardedAt`, `expiresAt`) เป็น ISO 8601 "วันนี้" และปีภาษีเริ่มต้นใช้วันที่ตามปฏิทินโซน `Europe/London` ปีภาษีอังกฤษหมุนวันที่ 6 เมษายน ถ้าใช้วันที่ UTC จะเลือกผิดวันรอบเที่ยงคืน

`taxYear=2026` หมายถึง 6 เมษายน 2026 ถึง 5 เมษายน 2027 สัญญานี้ทำให้เฉพาะปีนั้น ปีอื่นตอบ `400` วันที่อยู่นอกหน้าต่างนี้ตอบ `400` พร้อมข้อความ `Date is outside the 2026-27 tax year`

การตอบกลับเป็น JSON ของ number, string, array, object ห้ามส่ง `Date` หรือ `Decimal` ออกไป

error ที่ผู้ใช้เห็นต้องเป็น `HttpException` ของ Nest (`BadRequestException`, `UnauthorizedException`, `ForbiddenException`, `NotFoundException`, `ConflictException`) มีรูปสองแบบ และฝั่ง client ต้องรับทั้งคู่

- pipe ตรวจ body ไม่ผ่าน: `message` เป็น array ของสตริง
- โค้ดตั้งใจปฏิเสธ: `message` เป็นสตริงก้อนเดียว

ข้อผิดพลาดตอนบูตเครื่อง เช่น ไม่มี `DATABASE_URL` โยน `Error` ได้ เพราะยังไม่มี client ให้ตอบ

## กฎโค้ดที่ใช้ทุกขั้น

- NestJS 12 เป็น ES module (`"type": "module"`) บน TypeScript strict และ Node.js 24
- import ไฟล์ในโปรเจกต์ลงท้าย `.js` เสมอ แม้ไฟล์บนดิสก์จะเป็น `.ts` เพราะ Node แบบ ESM โหลดไฟล์ที่คอมไพล์แล้ว
- body ที่เข้า HTTP ต้องเป็น class ที่มี `class-validator` ห้ามใช้ interface เป็น body
- ใน controller ต้อง import class ของ DTO เป็นค่าจริง ถ้าใช้ `import type` ชนิดจะหายตอนรัน และ `ValidationPipe` จะไม่ตรวจฟิลด์
- ใน service ที่เมธอดไม่มี decorator ให้ใช้ `import type` สำหรับชนิดที่โผล่ในลายเซ็น
- พารามิเตอร์ที่มี decorator ต้องประกาศชนิดเสมอ
- ห้าม `any` ห้ามใช้ `as` เพื่อปิด type error ห้าม `!`
- ชื่อไฟล์เป็น `kebab-case.<บทบาท>.ts` เช่น `create-transaction.dto.ts`
- หนึ่งโดเมนอยู่หนึ่งโฟลเดอร์ใต้ `src/`: `auth`, `transactions`, `tax-engine`, `expense-categories`, `upload`, `invoices` ภายในมี `*.module.ts`, `*.controller.ts`, `*.service.ts` และ `dto/` เส้น `/users/me` อยู่โฟลเดอร์ `auth`
- `src/prisma/` มี `PrismaModule` แบบ global กับ `PrismaService` ที่เดียวที่สร้าง `PrismaClient` ได้
- `src/generated/prisma/` เป็นโค้ดที่ Prisma สร้าง ห้ามแก้ด้วยมือ
- ห้ามสร้าง `index.ts` เพื่อรวม export
- ห้ามเขียนคอมเมนต์ที่แค่เล่าสิ่งที่บรรทัดถัดไปทำอยู่แล้ว
- เครื่องคิดเลขเป็นฟังก์ชันบริสุทธิ์ มี unit test handler โหลดข้อมูลแล้วเรียกฟังก์ชัน ห้ามใส่สูตรไว้ใน controller
- ติดตั้งแพ็กเกจเพิ่มเมื่อขั้นนั้นบอกให้ติดตั้ง และติดตั้งเอง คำสั่ง `docker` กับ `prisma migrate` / `prisma generate` ก็รันเองตามขั้นที่เขียนไว้
- Phase 2 ท้าย [`api-spec.md`](api-spec.md) อยู่นอกบทเรียน: ใบแจ้งหนี้หลายบรรทัด, VAT, ภาษีสกอตแลนด์, ไมล์มอเตอร์ไซค์, เปลี่ยน `expenseMethod` หลัง onboarding, หมวดที่ผู้ใช้สร้างเอง, และปีภาษีอื่นที่ไม่ใช่ 2026–27

เส้นทางไม่มี prefix `/api` ทุก path ตรงกับตารางในสัญญา พอร์ตของ API คือ `3000`

## ตรวจ HTTP ด้วย Postman

ทุกคำขอ HTTP ในบทเรียนนี้ส่งจาก Postman คำสั่งในเทอร์มินัลที่ยังรันเองคือ `npm`, `docker compose`, `prisma` และ `psql`

สร้าง Environment ชื่อ `local` ใส่ตัวแปร `baseUrl` เป็น `http://localhost:3000` แล้วเลือก environment นี้ก่อนกด Send ทุกครั้ง URL ในบทเรียนเขียนเป็น `{{baseUrl}}/...`

คำขอที่เป็น JSON เปิด Body เลือก raw แล้วเลือก JSON ไม่ต้องพิมพ์หัว `Content-Type` เอง

คำขอที่ต้องรู้ว่าเป็นใคร เปิดแท็บ Authorization เลือก Type เป็น Bearer Token แล้วใส่ชื่อตัวแปรของผู้ใช้นั้น เช่น `{{token}}` Postman จะส่งหัว `Authorization: Bearer <ค่า>` ให้ มีช่องว่างหนึ่งช่องหลังคำว่า Bearer

หลังสมัครหรือล็อกอิน เก็บ `accessToken` ลง environment ที่แท็บ Tests ของคำขอนั้น

```js
pm.environment.set('token', pm.response.json().accessToken);
```

ขั้นที่ผู้ใช้ไม่ใช่คนแรกจะบอกให้เปลี่ยนชื่อตัวแปรเป็น `bee` หรือ `cai` คัดลอก `accessToken` จาก Body ไปวางในตัวแปรของ environment ได้เหมือนกัน

ดูสถานะที่ตัวตอบ และดู Body ว่าตรงเกณฑ์ของขั้นนั้น หัวของตัวตอบอยู่ในแท็บ Headers

---

## ขั้น 1 — เข้าใจแอปที่รันอยู่

### ทำไมขั้นนี้มาก่อน

ถ้ายังไม่เห็น `Hello World!` แล้วไปเปิดฐานข้อมูลหรือเขียน route ใหม่ จะไม่มีหลักฐานว่า Nest ฟังพอร์ต 3000 อยู่ ความผิดพลาดทีหลังจะปนกันระหว่าง "แอปไม่ขึ้น" กับ "route ใหม่ผิด"

### ยังไม่ทำในขั้นนี้

ยังไม่รัน Docker ยังไม่สร้างไฟล์ Prisma ยังไม่ใส่ `ValidationPipe` ยังไม่เพิ่ม route อื่นนอกจาก `GET /`

### แนวคิด

Nest แยกสามชิ้นให้คำขอหนึ่งเส้นเดินเป็นแนวตรง

1. `main.ts` สร้างแอปจากโมดูลราก แล้วให้โปรเซสฟังพอร์ต
2. `AppModule` บอกว่ามี controller ตัวไหนและ service ตัวไหนให้ฉีดได้
3. `AppController` รับ `GET /` แล้วเรียก `AppService` ซึ่งคืนสตริง `Hello World!`

`AppModule` เป็นรายชื่อชิ้นส่วน `AppController` เป็นประตู HTTP `AppService` เป็นที่วางงาน ตอนนี้งานมีแค่คืนสตริง จึงดูสั้น แต่รูปนี้คือรูปที่ทุกโดเมนหลังจากนี้ใช้ซ้ำ

import เขียนเป็น `./app.module.js` ทั้งที่ไฟล์จริงชื่อ `app.module.ts` TypeScript คอมไพล์ `.ts` เป็น `.js` แล้ว Node โหลด `.js` ตัวคอมไพเลอร์ไม่ได้เปลี่ยนสตริงใน `import` ให้เอง ถ้าเขียน `./app.module.ts` หรือตัดนามสกุลทิ้ง แอปจะหาไฟล์ไม่เจอตอนรัน

`await bootstrap()` ท้ายไฟล์ใช้ได้เพราะโปรเจกต์เป็น ES module ไม่ต้องห่อด้วย `void bootstrap()`

### ไฟล์ของขั้นนี้

- [`src/main.ts`](../src/main.ts)
- [`src/app.module.ts`](../src/app.module.ts)
- [`src/app.controller.ts`](../src/app.controller.ts)
- [`src/app.service.ts`](../src/app.service.ts)

ถ้าร่างในรีโปใส่ `ValidationPipe`, `PrismaModule`, หรือ `AuthModule` เข้าไปแล้ว ให้ยังไม่ลบในขั้นนี้ แค่อย่าเพิ่ม route ใหม่ และให้เกณฑ์ด้านล่างผ่านก่อน ขั้น 4 จะมาตรวจ pipe อีกครั้ง

รูปของจุดเริ่มที่บทเรียนอธิบายมีเท่านี้

```ts
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  await app.listen(process.env.PORT ?? 3000);
}
await bootstrap();
```

```ts
import { Module } from '@nestjs/common';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';

@Module({
  imports: [],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
```

```ts
import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service.js';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }
}
```

```ts
import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getHello(): string {
    return 'Hello World!';
  }
}
```

`@Controller()` ไม่มี path แปลว่าเส้นนี้อยู่ที่ราก `@Get()` ไม่มี path แปลว่าเป็น `GET /` คืนค่าเป็นสตริง Nest ส่งสตริงนั้นเป็นตัวตอบ

### คำสั่งที่รันเอง

ติดตั้งครั้งแรกจากรูทโปรเจกต์ ถ้า `node_modules` มีอยู่แล้วข้ามบรรทัดนี้ได้

```bash
npm install
npm run start:dev
```

เปิดเบราว์เซอร์ที่ `http://localhost:3000` แล้วส่งคำขอเดียวกันจาก Postman

```text
GET {{baseUrl}}/
```

มีเทสหน่วยของ controller นี้อยู่แล้วที่ `src/app.controller.spec.ts` มันตรวจสตริงโดยไม่เปิดพอร์ต มันไม่แทนการเปิดเบราว์เซอร์

### ผลที่ต้องเห็น

เบราว์เซอร์แสดงตัวหนังสือ `Hello World!`

Postman ได้สถานะ `200` และตัวตอบมี `Hello World!` ล็อกของ `start:dev` มีบรรทัดว่า Nest ฟังพอร์ต 3000

### ถ้าไม่ผ่าน

- พอร์ต 3000 ถูกใช้อยู่: หาโปรเซสเก่าแล้วหยุด หรือตั้ง `PORT` แล้วเปิด URL ตามพอร์ตนั้น เกณฑ์ของบทเรียนคือพอร์ต 3000 เมื่อไม่มี `PORT` ในสภาพแวดล้อม
- หน้าว่างหรือ connection refused: `start:dev` ยังไม่ขึ้น หรือขึ้นแล้วล้ม อ่านบรรทัด error สุดท้ายก่อนไปขั้น 2
- ได้ JSON `Cannot GET /`: มีโปรเซสอื่นฟังพอร์ต 3000 อยู่ ไม่ใช่แอปนี้
- import พังด้วย `ERR_MODULE_NOT_FOUND`: ตรวจว่า import ไฟล์โปรเจกต์ลงท้าย `.js`

**ผ่านแล้วค่อยไปขั้นถัดไป** ปล่อย `start:dev` ไว้ได้ ขั้น 2 ยังไม่ต้องรีสตาร์ตก็ตรวจฐานข้อมูลได้

---

## ขั้น 2 — เปิดฐานข้อมูล

### ทำไมขั้นนี้มาก่อน

Prisma ในขั้น 3 ต้องมี Postgres ที่รับการเชื่อมต่อแล้ว ถ้ายังไม่มีเซิร์ฟเวอร์ ข้อความ error ของ Prisma จะปนกับเรื่อง schema

### ยังไม่ทำในขั้นนี้

ยังไม่รัน `prisma migrate`, `prisma generate`, หรือ `prisma db push` ยังไม่สร้างตาราง ยังไม่เขียน endpoint การที่พอร์ต 5432 รับการเชื่อมต่อได้ยังไม่แปลว่ามีตารางของ TheraTax

### แนวคิด

[`docker-compose.yml`](../docker-compose.yml) เปิด Postgres 16 ให้เครื่องนักพัฒนา ค่าในไฟล์นี้คือค่าของเครื่องตัวเอง

| ค่า | ที่มา |
| --- | --- |
| ผู้ใช้ | `theratax` |
| รหัสผ่าน | `theratax` |
| ชื่อฐาน | `theratax_dev` |
| พอร์ตบนเครื่อง | `5432` ส่งเข้า `5432` ในคอนเทนเนอร์ |
| ข้อมูลถาวร | volume ชื่อ `pgdata` ชี้ไป `/var/lib/postgresql/data` |

volume ทำให้ข้อมูลไม่หายเมื่อหยุดคอนเทนเนอร์ รหัสนี้ใช้กับฐานพัฒนาบนเครื่องเท่านั้น ห้ามเอาไปใช้เป็นรหัสของเซิร์ฟเวอร์จริง และห้าม commit ไฟล์ `.env`

สตริงเชื่อมต่อที่ขั้นถัดไปจะอ่านคือ

```text
postgresql://theratax:theratax@localhost:5432/theratax_dev
```

รูปนี้คือ `postgresql://ผู้ใช้:รหัส@โฮสต์:พอร์ต/ชื่อฐาน` โฮสต์เป็น `localhost` เพราะแอป Nest รันบนเครื่องคุณ ส่วน Postgres ฟังผ่านพอร์ตที่ compose เปิดออกมา

### ไฟล์ของขั้นนี้

แก้เฉพาะ `.env` ที่รูทโปรเจกต์ สร้างใหม่ถ้ายังไม่มี ไฟล์ compose มีอยู่แล้ว ไม่ต้องแก้ในขั้นนี้

```text
DATABASE_URL=postgresql://theratax:theratax@localhost:5432/theratax_dev
```

ตรวจว่า `.gitignore` ไม่ส่ง `.env` ขึ้น git ถ้าไฟล์นี้โผล่ใน `git status` ให้หยุดแล้วกันไว้ก่อน

### คำสั่งที่รันเอง

จากรูทโปรเจกต์

```bash
docker compose up -d
docker compose exec postgres pg_isready -U theratax -d theratax_dev
docker compose exec postgres psql -U theratax -d theratax_dev -c 'SELECT 1'
```

จากนั้นยืนยันว่าแอปขั้น 1 ยังตอบอยู่ ส่งจาก Postman

```text
GET {{baseUrl}}/
```

### ผลที่ต้องเห็น

`pg_isready` บอกว่าฐาน `/var/run/postgresql:5432` รับการเชื่อมต่อแล้ว ข้อความมักมีคำว่า `accepting connections`

`SELECT 1` คืนหนึ่งแถวที่มีค่า `1`

Postman ยังได้ `Hello World!`

ใน `psql` ยังไม่ต้องมีตาราง `User` หรือตารางอื่น การไม่มีตารางในขั้นนี้เป็นผลที่ถูก

### ถ้าไม่ผ่าน

- `Cannot connect to the Docker daemon`: เปิด Docker Desktop ก่อน แล้วรัน `docker compose up -d` ใหม่
- พอร์ต 5432 ชนกับ Postgres ที่ติดตั้งบนเครื่อง: หยุดบริการนั้น หรือจะยังตรวจผ่าน `docker compose exec` ได้เพราะคำสั่งนี้เข้าในคอนเทนเนอร์ ไม่ได้วิ่งจากพอร์ตของเครื่อง แอปในขั้น 3 ต้องใช้พอร์ต 5432 ของเครื่องได้ด้วย ถ้าชน ให้หยุด Postgres ตัวอื่นก่อนไปขั้น 3
- `pg_isready` ตอบว่ายังไม่พร้อม: รอสองสามวินาทีแล้วรันใหม่ compose เพิ่งสร้าง volume ครั้งแรกจะช้ากว่าครั้งถัดไป
- รหัสหรือชื่อฐานไม่ตรง: อ่าน `environment` ใน `docker-compose.yml` แล้วให้ `.env` ตรงกับค่านั้น

**ผ่านแล้วค่อยไปขั้นถัดไป**

---

## ขั้น 3 — ใส่ Prisma

### ทำไมขั้นนี้มาก่อน

ตารางคือที่เก็บผู้ใช้ รายการเงิน และใบแจ้งหนี้ ถ้ายังเชื่อมต่อจากแอปไม่ได้ ทุก endpoint หลังจากนี้ไม่มีที่เขียนข้อมูล การมีโมเดลยังไม่ใช่การมี route ขั้นนี้จบเมื่อแอปบูตแล้ว Prisma ต่อฐานได้ และ `GET /` ยังเป็น `Hello World!`

### ยังไม่ทำในขั้นนี้

ยังไม่สร้าง controller ของ `auth`, `transactions`, `expense-categories`, `upload`, `invoices`, หรือ `tax-engine` ยังไม่ใส่ `ValidationPipe` ถ้ายังไม่มีจากร่างเก่า ยังไม่เขียน seed หมวดค่าใช้จ่าย

โมเดลทั้งชุดถูกวางในขั้นนี้เพราะมันเป็นตาราง ไม่ใช่ endpoint การสร้างทีหลังทีละตารางทำให้ migration ซ้อนกันโดยที่ยังตรวจพฤติกรรมของ API ไม่ได้

### แนวคิด

โปรเจกต์นี้ใช้ Prisma 7 รูปของ Prisma 6 ที่ใส่ `url = env("DATABASE_URL")` ใน `schema.prisma` ใช้กับรีโปนี้ไม่ได้ สามจุดที่ต้องครบพร้อมกันคือ

1. ใน schema บล็อก `datasource` มีแค่ `provider = "postgresql"` URL ไม่อยู่ในไฟล์นี้
2. ไฟล์ `prisma.config.ts` ที่รูทโปรเจกต์บอก URL และที่อยู่ของโฟลเดอร์ migration Prisma CLI โหลดชื่อนี้เอง ไฟล์ชื่อ `prisma7.config.ts` จะไม่ถูกโหลด ให้ย้ายเนื้อหาไป `prisma.config.ts` แล้วเลิกใช้ชื่อเก่า
3. ตอนรันแอป `PrismaClient` ต้องได้ driver adapter `PrismaPg` จาก `@prisma/adapter-pg` generator เป็น `prisma-client` และต้องกำหนด `output` เอง บทเรียนใช้ `../src/generated/prisma` เพื่อให้โค้ดที่สร้างแล้วอยู่ใต้ `src/` และ import จากแอปได้

`PrismaService` สืบทอด `PrismaClient` แล้ว `$connect` ใน `onModuleInit` และ `$disconnect` ใน `onModuleDestroy` `PrismaModule` เป็น `@Global()` เพื่อให้โดเมนหลังจากนี้ฉีด `PrismaService` ได้โดยไม่ต้อง import โมดูลซ้ำทุกที่

มี `new PrismaClient` ได้ที่เดียวคือคอนสตรักเตอร์ของ `PrismaService` ที่เหลือฉีด service นี้ สคริปต์ seed ที่สร้าง client เองจะหลุดกฎนี้ ขั้น 7 จึง seed ผ่าน service ที่ฉีดแล้ว

แพ็กเกจที่งานนี้ใช้มีในโปรเจกต์แล้ว: `prisma`, `@prisma/client`, `@prisma/adapter-pg`, `pg`, `dotenv` ขั้นนี้ยังไม่ติดตั้งแพ็กเกจใหม่

### ไฟล์ของขั้นนี้

- `prisma.config.ts` ที่รูท
- `prisma/schema.prisma`
- `src/prisma/prisma.service.ts`
- `src/prisma/prisma.module.ts`
- `src/app.module.ts` ให้ `imports` มี `PrismaModule`
- `src/main.ts` ให้บรรทัดแรกเป็น `import 'dotenv/config';` เพื่อให้ `DATABASE_URL` ใน `.env` เข้า `process.env` ก่อนสร้าง client
- โฟลเดอร์ `prisma/migrations/` เกิดขึ้นเมื่อคุณรัน migrate
- โฟลเดอร์ `src/generated/prisma/` เกิดขึ้นเมื่อคุณรัน generate ห้ามแก้ไฟล์ในนั้น

`prisma.config.ts`

```ts
import 'dotenv/config';
import { defineConfig } from 'prisma/config';

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
  },
  datasource: {
    url: process.env['DATABASE_URL'],
  },
});
```

`prisma/schema.prisma`

```prisma
generator client {
  provider = "prisma-client"
  output   = "../src/generated/prisma"
}

datasource db {
  provider = "postgresql"
}

enum PracticeType {
  mobile
  fixedLocation
  mixed
}

enum ExpenseMethod {
  flat_rate
  actual_cost
}

enum TransactionType {
  income
  expense
}

enum ExpenseCategoryKind {
  general
  mileage
  vehicle_actual
}

enum InvoiceStatus {
  issued
  paid
}

model User {
  id            Int            @id @default(autoincrement())
  email         String         @unique
  passwordHash  String
  name          String
  practiceType  PracticeType?
  expenseMethod ExpenseMethod?
  onboardedAt   DateTime?
  sessions      Session[]
  transactions  Transaction[]
  invoices      Invoice[]
}

model Session {
  id        Int      @id @default(autoincrement())
  token     String   @unique
  expiresAt DateTime
  userId    Int
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
}

model ExpenseCategory {
  slug         String              @id
  name         String
  keywords     String[]
  kind         ExpenseCategoryKind
  transactions Transaction[]
}

model Transaction {
  id           Int              @id @default(autoincrement())
  type         TransactionType
  occurredOn   DateTime         @db.Date
  amountPence  Int
  note         String?
  miles        Int?
  userId       Int
  user         User             @relation(fields: [userId], references: [id], onDelete: Cascade)
  categorySlug String?
  category     ExpenseCategory? @relation(fields: [categorySlug], references: [slug])
  invoiceId    Int?             @unique
  invoice      Invoice?         @relation(fields: [invoiceId], references: [id])
  receipt      Receipt?

  @@index([userId, occurredOn])
}

model Receipt {
  transactionId Int         @id
  contentType   String
  byteSize      Int
  storageKey    String
  transaction   Transaction @relation(fields: [transactionId], references: [id], onDelete: Cascade)
}

model Invoice {
  id          Int           @id @default(autoincrement())
  number      String
  clientName  String
  service     String
  amountPence Int
  issuedOn    DateTime      @db.Date
  status      InvoiceStatus @default(issued)
  paidOn      DateTime?     @db.Date
  userId      Int
  user        User          @relation(fields: [userId], references: [id], onDelete: Cascade)
  transaction Transaction?

  @@unique([userId, number])
}
```

ความหมายของฟิลด์ที่ผูกกับ flow แม้ route จะยังไม่มี

- `User.passwordHash` เก็บผล bcrypt รหัสผ่านดิบไม่มีคอลัมน์ และไม่มีทางอยู่ใน JSON
- `practiceType` กับ `expenseMethod` เป็น null จนกว่า onboarding จะจบ `practiceType` เก็บว่านักบำบัดเดินทาง อยู่คลินิก หรือทั้งสองอย่าง มันไม่เปลี่ยนรายการหมวดที่เซิร์ฟเวอร์รับ
- `expenseMethod` ใช้กับค่าพาหนะเท่านั้น `flat_rate` คือไมล์แบบง่ายของ HMRC `actual_cost` คือผู้ใช้กรอกเงินที่หักได้เอง น้ำมัน HCPC ประกัน และค่าซัก ยังเป็นจำนวนเงินที่ผู้ใช้กรอกเสมอ
- `onboardedAt` เป็นประตูของฟีด ถ้ายัง null แสดงว่าขั้นตอนที่ 1 ของ user flow ยังไม่จบ ฟิลด์นี้เป็น `DateTime` ในฐาน และจะถูกแปลงเป็น ISO 8601 ตอนตอบ
- `Session` เก็บโทเคนทึบอายุ 7 วัน แถวนี้คือตัวที่ `Authorization: Bearer` จะมาหาในขั้น 6 ลบผู้ใช้แล้วเซสชันหายตาม `onDelete: Cascade`
- `ExpenseCategory.slug` เป็นคีย์ เพราะสัญญาอ้างหมวดด้วย slug ไม่ใช่ตัวเลข `keywords` เป็นอาเรย์ของสตริงไว้ให้หน้าเว็บ hint เอง `kind` แยกหมวดทั่วไป หมวดไมล์ และหมวดค่าพาหนะแบบต้นทุนจริง
- `Transaction.amountPence` เป็นจำนวนเต็มเสมอ แม้แถวไมล์จะให้เซิร์ฟเวอร์คำนวณในขั้น 8 `occurredOn` เป็น `@db.Date` เพราะมันคือวันปฏิทิน ไม่ใช่ชั่วโมง `miles` มีค่าเฉพาะแถวไมล์ `invoiceId` มีค่าเฉพาะรายรับที่เกิดตอนใบแจ้งหนี้ถูกจ่าย และเป็น `@unique` เพราะหนึ่งใบแจ้งหนี้มีรายรับได้แถวเดียว
- ดัชนี `[userId, occurredOn]` รองรับฟีดที่อ่านรายการของผู้ใช้คนนั้นเรียงตามวัน
- `Receipt` หนึ่งแถวต่อหนึ่งธุรกรรม คีย์คือ `transactionId` `storageKey` คือที่อยู่ของไฟล์ในที่เก็บส่วนตัว URL ไม่ได้ถูกเก็บ เพราะลิงก์มีอายุ 15 นาทีและถูกสร้างตอนถูกขอ
- `Invoice.number` ไม่ซ้ำภายในผู้ใช้คนเดียว (`TT-0001`, `TT-0002`) `status` เริ่มที่ `issued` การสร้างใบแจ้งหนี้ยังไม่สร้างแถวรายรับ `paidOn` ว่างจนกว่าจะจ่าย

`src/prisma/prisma.service.ts`

```ts
import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/prisma/client.js';

function databaseUrl(): string {
  const url = process.env.DATABASE_URL;
  if (url === undefined || url.length === 0) {
    throw new Error('DATABASE_URL is not set');
  }
  return url;
}

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  constructor() {
    const adapter = new PrismaPg({ connectionString: databaseUrl() });
    super({ adapter });
  }

  async onModuleInit(): Promise<void> {
    await this.$connect();
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }
}
```

`src/prisma/prisma.module.ts`

```ts
import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service.js';

@Global()
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}
```

ใน `AppModule` ให้ `imports` มี `PrismaModule` คู่กับ controller เดิม

```ts
import { Module } from '@nestjs/common';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { PrismaModule } from './prisma/prisma.module.js';

@Module({
  imports: [PrismaModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
```

`import 'dotenv/config'` ต้องอยู่บรรทัดแรกของ `main.ts` ก่อน `NestFactory.create` เพราะคอนสตรักเตอร์ของ `PrismaService` อ่าน `process.env.DATABASE_URL` ตอนสร้างโมดูล

### คำสั่งที่รันเอง

Postgres จากขั้น 2 ต้องรับการเชื่อมต่ออยู่ก่อน

```bash
npx prisma generate
npx prisma migrate dev --name init
```

ถ้ารีโปมีโฟลเดอร์ `prisma/migrations` และฐานนี้ถูก migrate ไปแล้ว `migrate dev` จะบอกว่าไม่มีอะไรเปลี่ยน หรือให้ตั้งชื่อ migration ว่าง แบบนั้นใช้คำสั่งตรวจสถานะด้านล่างได้เลย ไม่ต้องสร้าง init ซ้ำ

จากนั้นรีสตาร์ต `npm run start:dev` แอปต้องบูตจนฟังพอร์ตได้ ถ้า `DATABASE_URL` ผิด `onModuleInit` จะล้มก่อนคำว่าแอปพร้อม

```bash
npx prisma migrate status
docker compose exec postgres psql -U theratax -d theratax_dev -c '\dt'
```

จาก Postman

```text
GET {{baseUrl}}/
```

### ผลที่ต้องเห็น

`prisma generate` สร้างโฟลเดอร์ `src/generated/prisma/` และในนั้นมี `client.ts` ให้ import ได้

`migrate status` บอกว่า schema ตรงกับฐาน ไม่มี migration ค้าง

Postman ได้ `Hello World!` ล็อกของ Nest ไม่มี error เรื่องต่อฐานไม่ได้

`\dt` เห็นตาราง `User`, `Session`, `ExpenseCategory`, `Transaction`, `Receipt`, `Invoice` ตารางหมวดยังว่างได้ ขั้น 7 ค่อยใส่ 7 แถว

ยังไม่มี path ใหม่ ส่ง `POST {{baseUrl}}/auth/register` ด้วย body ว่าง ต้องยังไม่ใช่พฤติกรรมของผลิตภัณฑ์ ถ้าร่างเก่ามี route นี้อยู่แล้ว ให้ถือว่าเป็นของขั้น 6 และยังไม่ใช้มันเป็นเกณฑ์ผ่านของขั้น 3

### ถ้าไม่ผ่าน

- CLI หา `DATABASE_URL` ไม่เจอ: ตรวจว่าไฟล์ชื่อ `prisma.config.ts` อยู่ที่รูท และมี `import 'dotenv/config'` ชื่อ `prisma7.config.ts` ไม่ถูกอ่าน
- `P1001` หรือ connection refused: กลับไปคำสั่ง `pg_isready` ของขั้น 2 URL ใน `.env` ต้องชี้ `localhost:5432`
- generate แล้ว import `../generated/prisma/client.js` หาไม่เจอ: `output` ใน schema ต้องเป็น `../src/generated/prisma` แล้วรัน generate ใหม่ ห้ามแก้ไฟล์ที่ถูกสร้าง
- แอปบูตไม่ได้เพราะ constructor โยน `DATABASE_URL is not set`: `main.ts` ยังไม่โหลด dotenv ก่อนสร้าง `AppModule`
- migrate บอกว่าฐานลอยหน้า schema (drift): อย่าใช้ `migrate reset` ถ้ายังต้องการข้อมูลที่ใส่ไว้แล้ว อ่านข้อความของ CLI แล้วหยุดถามก่อนลบ volume

**ผ่านแล้วค่อยไปขั้นถัดไป**

---

## ขั้น 4 — เปิด ValidationPipe

### ทำไมขั้นนี้มาก่อน

ทุก body หลังจากนี้พึ่ง pipe ตัวเดียวกัน ถ้ายังไม่เห็นว่าฟิลด์แปลกถูกปฏิเสธ จะไปเข้าใจผิดตอนขั้น 6 ว่า DTO ของการสมัครเขียนผิด ทั้งที่ pipe ยังไม่ทำงาน

### ยังไม่ทำในขั้นนี้

ยังไม่เขียน `POST /auth/register` หรือ endpoint ของผลิตภัณฑ์ โพรบในขั้นนี้มีไว้พิสูจน์ pipe แล้วต้องลบก่อนจบขั้น

### แนวคิด

`ValidationPipe` แบบ global ทำงานกับทุก `@Body()` ที่เป็น class

- `whitelist: true` ตัดฟิลด์ที่ไม่มีใน DTO ออกจากออบเจกต์ที่ส่งต่อให้เมธอด
- `forbidNonWhitelisted: true` ไม่ตัดเงียบ ๆ ถ้ามีฟิลด์แปลกให้ตอบ `400` ทันที ฟิลด์ `type` ที่ผู้ใช้ส่งมาแก้ธุรกรรมในขั้น 8 จึงพังที่ pipe เพราะ DTO ของ `PATCH` ไม่มี `type`
- `transform: true` แปลงค่าตามชนิดที่ประกาศไว้ เช่น query `limit=20` จากสตริงเป็น number เมื่อ DTO ใช้ `@Type(() => Number)`

เมื่อ pipe ปฏิเสธ ตัวตอบมีรูปนี้ `message` เป็น array

```json
{
  "message": ["label must be a string"],
  "error": "Bad Request",
  "statusCode": 400
}
```

เมื่อโค้ดใน service โยน `BadRequestException` ด้วยสตริง `message` จะเป็นสตริงก้อนเดียว ขั้นนี้ยังไม่ต้องโยนเอง แค่ให้เห็นรูป array ก่อน

โพรบใช้ DTO ที่มีฟิลด์บังคับตัวเดียวชื่อ `label` มีสองกรณีที่ต้องเห็น `400`

1. body มีฟิลด์ที่คลาสไม่ประกาศ
2. body ไม่มี `label`

กรณีที่ `label` ถูกต้องต้องได้ `200` ชั่วคราว เพื่อให้รู้ว่า pipe ไม่ได้ปฏิเสธทุกอย่าง จากนั้นลบโพรบ แล้วคำขอเดิมต้องไม่ถึง handler อีก

### ไฟล์ของขั้นนี้

- `src/main.ts` เพิ่ม pipe
- `src/dev/probe.dto.ts` สร้างชั่วคราว
- `src/dev/probe.controller.ts` สร้างชั่วคราว
- `src/app.module.ts` ใส่ `ProbeController` ชั่วคราว

ใน `bootstrap` หลัง `NestFactory.create` และก่อน `listen`

```ts
import 'dotenv/config';
import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  await app.listen(process.env.PORT ?? 3000);
}
await bootstrap();
```

`src/dev/probe.dto.ts`

```ts
import { IsString, MinLength } from 'class-validator';

export class ProbeDto {
  @IsString()
  @MinLength(1)
  label: string;
}
```

`src/dev/probe.controller.ts`

```ts
import { Body, Controller, Post } from '@nestjs/common';
import { ProbeDto } from './probe.dto.js';

@Controller('dev')
export class ProbeController {
  @Post('validate')
  validate(@Body() body: ProbeDto): { label: string } {
    return { label: body.label };
  }
}
```

ใส่ `ProbeController` ใน `controllers` ของ `AppModule` แล้วรีสตาร์ต `start:dev`

### คำสั่งที่รันเอง

ส่งสามคำขอจาก Postman ไปที่เส้นเดียวกัน

```text
POST {{baseUrl}}/dev/validate
```

ฟิลด์แปลก

```json
{"label":"ok","extra":1}
```

ไม่มีฟิลด์บังคับ

```json
{}
```

body ที่ถูกกฎ

```json
{"label":"ok"}
```

เมื่อสามคำขอนี้ตรงตามเกณฑ์แล้ว ลบ `src/dev/probe.dto.ts`, `src/dev/probe.controller.ts`, และเอา `ProbeController` ออกจาก `AppModule` รีสตาร์ต แล้วส่ง `{"label":"ok"}` ซ้ำ

`GET {{baseUrl}}/` ต้องยังเป็น `Hello World!`

### ผลที่ต้องเห็น

คำขอที่มี `extra` ได้ `400` และ `message` เป็น array มีข้อความเรื่อง property `extra` should not exist

คำขอ `{}` ได้ `400` และ `message` เป็น array มีข้อความเรื่อง `label`

คำขอ `{"label":"ok"}` ก่อนลบโพรบได้ `200` และตัวตอบ `{"label":"ok"}` ฟิลด์ `extra` ต้องไม่โผล่ในตัวตอบของเคสแรก เพราะเคสแรกถูกปฏิเสธทั้งก้อน

หลังลบโพรบ คำขอเดิมได้ `404` pipe ใน `main.ts` ยังอยู่

### ถ้าไม่ผ่าน

- ฟิลด์ `extra` แล้วได้ `200` พร้อมเฉพาะ `label`: มี `whitelist` แต่ยังไม่มี `forbidNonWhitelisted` เกณฑ์ของโปรเจกต์ต้องการให้ปฏิเสธ ไม่ใช่ตัดเงียบ
- ได้ `200` ทั้งที่ body เป็น `{}`: พารามิเตอร์ใช้ `import type` สำหรับ `ProbeDto` หรือไม่ได้ใส่ `@Body()` ให้เปลี่ยนเป็น import ค่าของคลาส
- `message` เป็นสตริงไม่ใช่ array: นั่นคือรูปของ exception ที่โยนเอง ยังไม่ใช่รูปของ pipe ตรวจว่าคำขอวิ่งเข้า `ValidationPipe` จริง
- ลบไฟล์แล้วคำขอยังได้ `200`: `start:dev` ยังถือ controller เก่าอยู่ รีสตาร์ต แล้วตรวจว่า `AppModule` ไม่เหลือ `ProbeController`

**ผ่านแล้วค่อยไปขั้นถัดไป** โฟลเดอร์ `src/dev/` ต้องไม่อยู่ในโปรเจกต์

---

## ขั้น 5 — เครื่องคำนวณภาษี

### ทำไมขั้นนี้มาก่อน

ตัวเลขภาษีและตัวเลขไมล์คือสัญญาที่ unit test ล็อกไว้ได้โดยไม่ต้องมีผู้ใช้ ไม่ต้องมีโทเคน และไม่ต้องมีแถวในฐาน ถ้าใส่สูตรไว้ใน controller แล้วค่อยเปิด `GET /tax/summary` จะไม่มีทางรู้ว่าเพนนีที่เพี้ยนมาจากสูตรหรือมาจาก query

ขั้น 8 เป็นคนเรียกตัวคิดไมล์ ขั้น 9 เป็นคนเรียกตัวคิดภาษี ทั้งสองขั้นห้ามเขียนสูตรซ้ำ

### ยังไม่ทำในขั้นนี้

ยังไม่สร้าง `GET /tax/summary` ยังไม่สร้าง `POST /transactions` ยังไม่สร้างโมดูล HTTP ของ `tax-engine` โฟลเดอร์นี้ในขั้นนี้มีแต่ฟังก์ชันกับไฟล์เทส

### แนวคิด

ปีภาษี 2026–27 ในสัญญานี้คือ `06-04-2026` ถึง `05-04-2027` อัตราเป็นของอังกฤษ เวลส์ และไอร์แลนด์เหนือ ค่าลดหย่อนส่วนบุคคล £12,570 ถูกใช้เต็มก้อน ไม่ถูกทาเปอร์ที่ £100,000 เพราะผู้ใช้กลุ่มนี้มีรายได้ต่ำกว่า £50,000 และ API ไม่ได้เก็บรายได้อื่น

ขอบเขตในหน่วยเพนนีคือ `1_257_000`, `5_027_000`, และ `12_514_000`

| ช่วงของกำไรที่ต้องเสียภาษี | ภาษีเงินได้ | Class 4 |
| --- | --- | --- |
| £0 ถึง £12,570 | 0% | 0% |
| เกิน £12,570 ถึง £50,270 | 20% | 6% |
| เกิน £50,270 ถึง £125,140 | 40% | 2% |
| เกิน £125,140 | 45% | 2% |

ชิ้นระหว่างขอบ `from` กับ `to` คือ `max(0, min(กำไร, to) - from)` ชิ้นที่ไม่มีเพดานคือ `max(0, กำไร - from)`

ภาษีเงินได้ปัดสามชิ้นแยกกัน: 20% ระหว่าง `1_257_000` กับ `5_027_000`, 40% ระหว่าง `5_027_000` กับ `12_514_000`, และ 45% เหนือ `12_514_000`

Class 4 ปัดสองชิ้น: 6% ระหว่าง `1_257_000` กับ `5_027_000` และ 2% ของทุกอย่างที่เหนือ `5_027_000` แถบ 2% เป็นชิ้นเดียว มันไม่ถูกผ่าที่ £125,140 เพราะตรงนั้นมีแค่ภาษีเงินได้ที่เปลี่ยนอัตรา ถ้าผ่าแถบ 2% เป็นสองชิ้นจะปัดสองครั้ง และผลขยับได้หนึ่งเพนนี

การปัดของแต่ละชิ้นคือคูณอัตราแล้วหาร 100 ปัดครึ่งออกจากศูนย์สำหรับตัวเศษที่ไม่ติดลบ วิธีที่ใช้ในโค้ด: เอาผลหารตัดเศษ ถ้าเศษมากกว่าหรือเท่ากับ 50 ให้บวกหนึ่งเพนนี แล้วนำชิ้นที่ปัดแล้วมาบวกกัน การปัดครั้งเดียวตอนท้ายให้คำตอบคนละเพนนีกับเทส

ตัวอย่างที่เทสต้องล็อกไว้ กำไร £20,000 คือ `2_000_000` เพนนี และไม่มีค่าใช้จ่าย

- ชิ้นอัตราพื้นฐาน `2_000_000 - 1_257_000 = 743_000`
- ภาษีเงินได้ `round(743_000 × 20 / 100) = 148_600`
- Class 4 `round(743_000 × 6 / 100) = 44_580`
- ภาษีโดยประมาณ `193_180` คือ £1,931.80
- Class 2 ถูกถือว่าจ่ายแล้ว เพราะ £20,000 สูงกว่าเกณฑ์ £7,105 (`710_500` เพนนี)

Class 2 ไม่ถูกบวกเข้า `estimatedTaxOwedPence` มันไม่ใช่เงินที่ต้องจ่ายบังคับตั้งแต่เมษายน 2024 อัตราสมัครใจปี 2026–27 คือ £3.65 ต่อสัปดาห์ จึงเป็น `voluntaryWeeklyPence: 365` เสมอ ต่ำกว่า £7,105 ให้ `treatedAsPaid` เป็น `false`

อีกตัวอย่างหนึ่งใช้พิสูจน์ว่าปัดทีละชิ้น กำไร `5_027_025` เพนนี

- ชิ้น 20% ยาว `3_770_000` ได้ภาษี `754_000`
- ชิ้น 40% ยาว `25` ได้ `round(1000 / 100) = 10`
- ภาษีเงินได้รวม `754_010`
- Class 4 ชิ้น 6% คือ `226_200` และชิ้น 2% จากกำไรส่วนที่เกิน `5_027_000` อีก `25` เพนนี คือ `round(50 / 100) = 1` เพราะเศษเท่ากับ 50
- Class 4 รวม `226_201` ภาษีโดยประมาณ `980_211`

ถ้าเอาแถบ 2% ไปปัดรวมกับชิ้นอื่น เศษ 50 เพนนีของตัวคูณอาจไม่กลายเป็นหนึ่งเพนนี

ขาดทุนต้องยังมองเห็น รายรับ `100_000` ค่าใช้จ่าย `250_000` ทำให้ `netProfitPence` เป็น `-150_000`, `taxableProfitPence` เป็น `0`, ภาษีและ Class 4 เป็น `0`, และ Class 2 ไม่ถูกถือว่าจ่าย

`assumptions` มีหกข้อเรียงตามนี้ คัดลอกตัวอักษรจากสัญญา รวมเครื่องหมายขีดยาวใน `2026–27`

1. `Rates are for England, Wales, and Northern Ireland for 2026–27. Scottish Income Tax is not applied.`
2. `Trading profit is treated as the user's only income. The personal allowance of £12,570 is applied in full and is not tapered.`
3. `Cash basis: income counts when it is received, expenses when they are paid. Unpaid invoices are excluded.`
4. `Student loans, pension contributions, Marriage Allowance, and other reliefs are not applied.`
5. `Class 2 National Insurance is not included in estimated tax owed. At or above £7,105 it is treated as paid. Below that, voluntary Class 2 is £3.65 a week and is not added here.`
6. `Flat-rate vehicle costs use simplified mileage for a car or van (55p then 25p). Motorcycle rates are not applied.`

`disclaimer` คือประโยคนี้ทั้งประโยค

`TheraTax produces estimated tax figures for planning purposes only and is not a substitute for formal accounting or tax advice.`

ฟังก์ชันภาษีรับยอดรวมที่คิดมาแล้ว ไม่รับรายการธุรกรรม การเลือกแถวว่าอยู่ในปีไหนเป็นหน้าที่ของ handler ในขั้น 9 ดังนั้นในขั้นนี้ `taxYear`, `periodStart`, และ `periodEnd` เป็นค่าคงที่ของปี 2026–27

### ไมล์ 11,000

อัตราไมล์รถหรือแวนปี 2026–27 คือ 55 เพนนีต่อไมล์สำหรับ 10,000 ไมล์ธุรกิจแรกของปี และ 25 เพนนีหลังจากนั้น อัตรามอเตอร์ไซค์อยู่นอกขอบเขต

หนึ่งแถว 11,000 ไมล์ต้นปีได้ `10_000 × 55 + 1_000 × 25 = 575_000` เพนนี คือ £5,750

ฟังก์ชันไมล์รับทุกแถวไมล์ของปีนั้น แล้วเรียงเองด้วย `occurredOn` จากน้อยไปมาก ถ้าวันเดียวกันให้ `id` น้อยอยู่ก่อน จากนั้นเดินยอดไมล์สะสม

- ไมล์ที่ยังอยู่ใน 10,000 แรกของปีคิด 55
- ไมล์ที่ล้นคิด 25
- `amountPence` ของแถวนั้นคือ `ไมล์ในแถบแรก × 55 + ไมล์ในแถบหลัง × 25`

การใส่แถวย้อนหลังเปลี่ยนเงินของแถวที่อยู่ถัดไป ตัวอย่างที่เทสควรล็อกไว้

- แถววันที่ `01-06-2026` id `2` จำนวน 11,000 ไมล์ ถ้ายืนอยู่แถวเดียวได้ `575_000`
- พอมีแถววันที่ `06-04-2026` id `1` จำนวน 1,000 ไมล์ แถวนี้มาก่อน ได้ `1_000 × 55 = 55_000` และใช้โควตาไป 1,000
- แถว 11,000 ที่เหลือจึงได้โควตา 55 เพนนีอีก `9_000` ไมล์ และ 25 เพนนีอีก `2_000` ไมล์ เป็น `495_000 + 50_000 = 545_000`

ขั้น 8 จะโหลดทุกแถวไมล์ของปี เรียกฟังก์ชันนี้ แล้วเขียน `amountPence` กลับทุกแถว การลบหรือแก้แถวก็เรียกชุดเดียวกัน ฟังก์ชันจึงคืนเงินของทุก id ที่ส่งเข้าไป ไม่คืนเฉพาะแถวที่เพิ่งถูกสร้าง

วันในฟังก์ชันนี้เป็นสตริง `DD-MM-YYYY` การเรียงสตริงรูปแบบนี้ตรง ๆ จะผิดลำดับ เพราะวันขึ้นต้นสตริง ให้ประกอบคีย์ `YYYY-MM-DD` เฉพาะตอนเปรียบเทียบ

### ไฟล์ของขั้นนี้

- `src/tax-engine/calculate-tax.ts`
- `src/tax-engine/calculate-tax.spec.ts`
- `src/tax-engine/allocate-mileage.ts`
- `src/tax-engine/allocate-mileage.spec.ts`

ยังไม่มี `tax-engine.module.ts` ในขั้นนี้

`src/tax-engine/calculate-tax.ts`

```ts
export interface TaxCalculationInput {
  incomePence: number;
  allowableExpensesPence: number;
  expenseMethod: 'flat_rate' | 'actual_cost';
}

export interface TaxSummary {
  taxYear: string;
  periodStart: string;
  periodEnd: string;
  expenseMethod: 'flat_rate' | 'actual_cost';
  incomePence: number;
  allowableExpensesPence: number;
  netProfitPence: number;
  taxableProfitPence: number;
  incomeTaxPence: number;
  class4NationalInsurancePence: number;
  estimatedTaxOwedPence: number;
  class2: {
    treatedAsPaid: boolean;
    voluntaryWeeklyPence: 365;
  };
  assumptions: string[];
  disclaimer: string;
}

const PERSONAL_ALLOWANCE_PENCE = 1_257_000;
const BASIC_RATE_LIMIT_PENCE = 5_027_000;
const ADDITIONAL_RATE_LIMIT_PENCE = 12_514_000;
const CLASS2_THRESHOLD_PENCE = 710_500;

const ASSUMPTIONS = [
  'Rates are for England, Wales, and Northern Ireland for 2026–27. Scottish Income Tax is not applied.',
  'Trading profit is treated as the user\'s only income. The personal allowance of £12,570 is applied in full and is not tapered.',
  'Cash basis: income counts when it is received, expenses when they are paid. Unpaid invoices are excluded.',
  'Student loans, pension contributions, Marriage Allowance, and other reliefs are not applied.',
  'Class 2 National Insurance is not included in estimated tax owed. At or above £7,105 it is treated as paid. Below that, voluntary Class 2 is £3.65 a week and is not added here.',
  'Flat-rate vehicle costs use simplified mileage for a car or van (55p then 25p). Motorcycle rates are not applied.',
];

const DISCLAIMER =
  'TheraTax produces estimated tax figures for planning purposes only and is not a substitute for formal accounting or tax advice.';

function sliceBetween(profitPence: number, fromPence: number, toPence: number): number {
  return Math.max(0, Math.min(profitPence, toPence) - fromPence);
}

function sliceAbove(profitPence: number, fromPence: number): number {
  return Math.max(0, profitPence - fromPence);
}

function roundToPenny(numerator: number): number {
  const quotient = Math.trunc(numerator / 100);
  const remainder = numerator % 100;
  if (remainder >= 50) {
    return quotient + 1;
  }
  return quotient;
}

export function calculateTaxSummary(input: TaxCalculationInput): TaxSummary {
  const netProfitPence = input.incomePence - input.allowableExpensesPence;
  const taxableProfitPence = Math.max(0, netProfitPence);
  const basicSlice = sliceBetween(
    taxableProfitPence,
    PERSONAL_ALLOWANCE_PENCE,
    BASIC_RATE_LIMIT_PENCE,
  );
  const higherSlice = sliceBetween(
    taxableProfitPence,
    BASIC_RATE_LIMIT_PENCE,
    ADDITIONAL_RATE_LIMIT_PENCE,
  );
  const additionalSlice = sliceAbove(taxableProfitPence, ADDITIONAL_RATE_LIMIT_PENCE);
  const incomeTaxPence =
    roundToPenny(basicSlice * 20) +
    roundToPenny(higherSlice * 40) +
    roundToPenny(additionalSlice * 45);
  const class4NationalInsurancePence =
    roundToPenny(basicSlice * 6) +
    roundToPenny(sliceAbove(taxableProfitPence, BASIC_RATE_LIMIT_PENCE) * 2);

  return {
    taxYear: '2026-27',
    periodStart: '06-04-2026',
    periodEnd: '05-04-2027',
    expenseMethod: input.expenseMethod,
    incomePence: input.incomePence,
    allowableExpensesPence: input.allowableExpensesPence,
    netProfitPence,
    taxableProfitPence,
    incomeTaxPence,
    class4NationalInsurancePence,
    estimatedTaxOwedPence: incomeTaxPence + class4NationalInsurancePence,
    class2: {
      treatedAsPaid: taxableProfitPence >= CLASS2_THRESHOLD_PENCE,
      voluntaryWeeklyPence: 365,
    },
    assumptions: ASSUMPTIONS,
    disclaimer: DISCLAIMER,
  };
}
```

`src/tax-engine/allocate-mileage.ts`

```ts
export interface MileageDraft {
  id: number;
  occurredOn: string;
  miles: number;
}

export interface MileageAmount {
  id: number;
  amountPence: number;
}

const BAND_LIMIT_MILES = 10_000;
const RATE_FIRST_PENCE = 55;
const RATE_SECOND_PENCE = 25;

function sortKey(occurredOn: string): string {
  const [day, month, year] = occurredOn.split('-');
  return `${year}-${month}-${day}`;
}

export function allocateMileageAmounts(rows: MileageDraft[]): MileageAmount[] {
  const ordered = [...rows].sort((left, right) => {
    const byDate = sortKey(left.occurredOn).localeCompare(sortKey(right.occurredOn));
    if (byDate !== 0) {
      return byDate;
    }
    return left.id - right.id;
  });

  let used = 0;
  return ordered.map((row) => {
    const room = Math.max(0, BAND_LIMIT_MILES - used);
    const milesAt55 = Math.min(row.miles, room);
    const milesAt25 = row.miles - milesAt55;
    used += row.miles;
    return {
      id: row.id,
      amountPence: milesAt55 * RATE_FIRST_PENCE + milesAt25 * RATE_SECOND_PENCE,
    };
  });
}
```

เทสใช้ Vitest ผ่าน `npm test` โปรเจกต์เปิด `globals` ไว้แล้ว จึงเรียก `describe`, `it`, และ `expect` ได้โดยไม่ต้อง import

`src/tax-engine/calculate-tax.spec.ts` ต้องมีสามเคสนี้

```ts
import { calculateTaxSummary } from './calculate-tax.js';

describe('calculateTaxSummary', () => {
  it('estimates tax on a £20,000 profit', () => {
    const summary = calculateTaxSummary({
      incomePence: 2_000_000,
      allowableExpensesPence: 0,
      expenseMethod: 'flat_rate',
    });

    expect(summary.taxYear).toBe('2026-27');
    expect(summary.periodStart).toBe('06-04-2026');
    expect(summary.periodEnd).toBe('05-04-2027');
    expect(summary.netProfitPence).toBe(2_000_000);
    expect(summary.taxableProfitPence).toBe(2_000_000);
    expect(summary.incomeTaxPence).toBe(148_600);
    expect(summary.class4NationalInsurancePence).toBe(44_580);
    expect(summary.estimatedTaxOwedPence).toBe(193_180);
    expect(summary.class2).toEqual({
      treatedAsPaid: true,
      voluntaryWeeklyPence: 365,
    });
    expect(summary.assumptions).toHaveLength(6);
    expect(summary.disclaimer).toBe(
      'TheraTax produces estimated tax figures for planning purposes only and is not a substitute for formal accounting or tax advice.',
    );
  });

  it('rounds each slice on its own', () => {
    const summary = calculateTaxSummary({
      incomePence: 5_027_025,
      allowableExpensesPence: 0,
      expenseMethod: 'actual_cost',
    });

    expect(summary.expenseMethod).toBe('actual_cost');
    expect(summary.incomeTaxPence).toBe(754_010);
    expect(summary.class4NationalInsurancePence).toBe(226_201);
    expect(summary.estimatedTaxOwedPence).toBe(980_211);
  });

  it('keeps a loss visible and charges no tax', () => {
    const summary = calculateTaxSummary({
      incomePence: 100_000,
      allowableExpensesPence: 250_000,
      expenseMethod: 'flat_rate',
    });

    expect(summary.netProfitPence).toBe(-150_000);
    expect(summary.taxableProfitPence).toBe(0);
    expect(summary.incomeTaxPence).toBe(0);
    expect(summary.class4NationalInsurancePence).toBe(0);
    expect(summary.estimatedTaxOwedPence).toBe(0);
    expect(summary.class2.treatedAsPaid).toBe(false);
    expect(summary.class2.voluntaryWeeklyPence).toBe(365);
  });
});
```

`src/tax-engine/allocate-mileage.spec.ts`

```ts
import { allocateMileageAmounts } from './allocate-mileage.js';

describe('allocateMileageAmounts', () => {
  it('prices 11,000 miles at the start of the year as £5,750', () => {
    const amounts = allocateMileageAmounts([
      { id: 1, occurredOn: '06-04-2026', miles: 11_000 },
    ]);

    expect(amounts).toEqual([{ id: 1, amountPence: 575_000 }]);
  });

  it('reprices the later row when an earlier trip is inserted', () => {
    const amounts = allocateMileageAmounts([
      { id: 2, occurredOn: '01-06-2026', miles: 11_000 },
      { id: 1, occurredOn: '06-04-2026', miles: 1_000 },
    ]);

    expect(amounts).toEqual([
      { id: 1, amountPence: 55_000 },
      { id: 2, amountPence: 545_000 },
    ]);
  });
});
```

เทสที่สองใส่แถวเดือนมิถุนายนก่อนในอาเรย์ เพื่อพิสูจน์ว่าฟังก์ชันเรียงเอง ไม่ได้เชื่อลำดับที่ผู้เรียกส่งมา

### คำสั่งที่รันเอง

```bash
npm test
```

### ผลที่ต้องเห็น

เคสกำไร £20,000 ผ่าน ด้วย `estimatedTaxOwedPence` เท่ากับ `193180` เมื่อดูจาก expectation

เคสไมล์ 11,000 ผ่าน ด้วย `amountPence` เท่ากับ `575000`

เคสปัดเศษและเคสขาดทุนผ่านด้วย แอปที่ `localhost:3000` ยังตอบ `Hello World!` และยังไม่มี `GET /tax/summary`

ส่งจาก Postman

```text
GET {{baseUrl}}/tax/summary
```

คำขอนี้ต้องยังไม่ใช่ตัวตอบของสรุปภาษี ถ้าร่างเก่ามี route นี้แล้ว อย่าใช้มันเป็นเกณฑ์ของขั้น 5 เกณฑ์คือ `npm test`

### ถ้าไม่ผ่าน

- `193181` หรือ `193179`: สูตรไปปัดครั้งเดียวตอนท้าย หรือใช้จำนวนปอนด์ที่เป็นทศนิยม ให้คูณในหน่วยเพนนีแล้วปัดทีละชิ้น
- Class 4 ของเคส `5_027_025` ได้ `226200`: เศษ 50 ยังไม่ถูกปัดขึ้น เงื่อนไขคือเศษมากกว่าหรือเท่ากับ 50
- `assumptions` ไม่ยาว 6 หรือ disclaimer ไม่ตรง: เทียบตัวอักษรกับ [`api-spec.md`](api-spec.md) รวมเครื่องหมาย `–` ใน `2026–27`
- ไมล์ 11,000 ได้ `605000`: คิด 55 เพนนีทั้ง 11,000 ไมล์ ไมล์ที่ 10,001 เป็นต้นไปต้องเป็น 25
- เทสแทรกแถวย้อนหลังได้เงินเท่าแถวเดี่ยว: ฟังก์ชันเรียง `DD-MM-YYYY` เป็นสตริงตรง ๆ วันที่ `06-04-2026` ต้องมาก่อน `01-06-2026` ผ่านคีย์ `YYYY-MM-DD`
- เทสหาโมดูลไม่เจอ: import ในไฟล์เทสลงท้าย `.js`

**ผ่านแล้วค่อยไปขั้นถัดไป** ขั้น 6 เป็นขั้นแรกที่เขียน endpoint ของผลิตภัณฑ์

---

## ขั้น 6 — สมัคร เข้าสู่ระบบ onboarding

### ทำไมขั้นนี้มาก่อน

ฟีด หมวดค่าใช้จ่าย ใบเสร็จ และสรุปภาษี ต้องรู้ว่าเป็นของผู้ใช้คนไหน โทเคนคือหลักฐานนั้น `onboardedAt` คือประตูว่าเขาเลือกวิธีคิดค่าพาหนะแล้วหรือยัง ถ้ายังไม่มีสองอย่างนี้ จะตรวจ `GET /expense-categories` หรือธุรกรรมไม่ได้ เพราะทั้งคู่ต้องมี `Authorization`

นี่คือ endpoint ชุดแรกของผลิตภัณฑ์ เส้นทางที่มีในขั้นนี้มีสี่เส้นเท่านั้น

| Method | Path | สถานะเมื่อสำเร็จ | Auth |
| --- | --- | --- | --- |
| POST | `/auth/register` | 201 | ไม่ต้อง |
| POST | `/auth/login` | 200 | ไม่ต้อง |
| GET | `/users/me` | 200 | Bearer |
| PATCH | `/users/me/onboarding` | 200 | Bearer |

`GET /` ยังตอบ `Hello World!` อยู่ การ์ดต้องไม่ไปปิดเส้นนี้

### ยังไม่ทำในขั้นนี้

ยังไม่เขียนธุรกรรม หมวดค่าใช้จ่าย ใบแจ้งหนี้ ใบเสร็จ หรือ `GET /tax/summary` ยังไม่ทำหน้า React

### แนวคิด

โทเคนเป็นสตริงสุ่ม 32 ไบต์ เข้ารหัส `base64url` เก็บในตาราง `Session` พร้อม `expiresAt` อีก 7 วัน มันไม่ใช่ JWT ไม่มีการแกะ payload ฝั่ง client ทุกคำขอที่ต้องล็อกอินส่ง

```text
Authorization: Bearer <accessToken>
```

การ์ดแยกคำว่า `Bearer` กับโทเคนด้วยช่องว่างเดียว ถ้าไม่มีหัวนี้ รูปแบบไม่ใช่ `Bearer` โทเคนว่าง โทเคนไม่อยู่ในตาราง หรือหมดอายุแล้ว ตอบ `401` ตัวนี้

```json
{ "message": "Unauthorized", "error": "Unauthorized", "statusCode": 401 }
```

ข้อความนี้คนละเรื่องกับล็อกอินไม่ผ่าน ล็อกอินที่อีเมลหรือรหัสไม่ตรงตอบ `401` เช่นกัน แต่ข้อความถูกล็อกไว้ว่า

```json
{ "message": "Invalid email or password", "error": "Unauthorized", "statusCode": 401 }
```

ห้ามบอกว่าผิดที่อีเมลหรือผิดที่รหัส

รหัสผ่านยาว 8 ถึง 72 ตัว อักษรที่ 73 เป็นต้นไปเป็นเพดานของอินพุต bcrypt ถ้าปล่อยให้ bcrypt ตัดเอง ผู้ใช้จะเข้าใจว่ารหัสยาวทั้งก้อนถูกเก็บ DTO จึงปฏิเสธก่อน hash ใช้รอบต้นทุน 10 `passwordHash` อยู่ในฐานเท่านั้น ตัวตอบไม่มีฟิลด์รหัสผ่าน

อีเมลต้องเป็นอีเมล ชื่อยาว 1 ถึง 200 ตัว อีเมลซ้ำตอบ `409`

```json
{ "message": "Email already registered", "error": "Conflict", "statusCode": 409 }
```

การสมัครและการล็อกอินคืนรูปเดียวกัน

```ts
interface AuthResponse {
  accessToken: string;
  user: User;
}
```

```ts
interface User {
  id: number;
  email: string;
  name: string;
  practiceType: 'mobile' | 'fixedLocation' | 'mixed' | null;
  expenseMethod: 'flat_rate' | 'actual_cost' | null;
  onboardedAt: string | null;
}
```

`onboardedAt` ต้องมีคีย์นี้เสมอ แม้ค่ายังเป็น `null` หน้าเว็บอ่าน `GET /users/me` ตอนเปิดแอป แล้วใช้ฟิลด์นี้ตัดสินว่าจะบังคับ onboarding หรือเข้าฟีด ถ้าละคีย์นี้ ประตูนั้นกำกวม

Nest ให้ `POST` สถานะ 201 เอง จึงไม่ต้องใส่ `@HttpCode` ที่การสมัคร การล็อกอินต้องได้ 200 ตามสัญญา ให้ใส่ `@HttpCode(HttpStatus.OK)`

onboarding ทำได้ครั้งเดียว body คือ

```ts
interface OnboardingRequest {
  practiceType: 'mobile' | 'fixedLocation' | 'mixed';
  expenseMethod: 'flat_rate' | 'actual_cost';
}
```

สำเร็จแล้วได้ `User` ที่สองฟิลด์ถูกตั้ง และ `onboardedAt` เป็น ISO 8601 ผู้ใช้เป็น sole trader ไม่มีฟิลด์รูปแบบนิติบุคคล `practiceType` ไม่ได้เปลี่ยนหมวดที่เซิร์ฟเวอร์รับ นักบำบัดในคลินิกยังจดไมล์ได้

`expenseMethod` ใช้กับค่าพาหนะเท่านั้น เมื่อใช้ไมล์แบบง่ายกับรถคันนั้นแล้ว วิธีนี้คงอยู่ตราบใดที่รถยังอยู่ในกิจการ ตามหน้า simplified expenses ของ GOV.UK การ `PATCH` ครั้งที่สองจึงตอบ `409` ไม่เขียนทับเงียบ ๆ

```json
{ "message": "Onboarding already completed", "error": "Conflict", "statusCode": 409 }
```

วิธีที่กันคำขอสองอันพร้อมกันได้คือ `updateMany` ที่เงื่อนไข `onboardedAt: null` ถ้า `count` เป็น 0 แสดงว่าทำไปแล้ว หรือผู้ใช้หายไป แล้วค่อยอ่านแถวมาตัดสิน 409 หรือ 401 การอ่านแล้วค่อยเขียนแบบสองคำสั่งเปิดช่องให้ทั้งคู่ผ่านได้

การ์ดอยู่บน `UsersController` ทั้งคลาส ไม่ใช้การ์ด global เพราะ `POST /auth/register` และ `POST /auth/login` ต้องเรียกได้โดยไม่มีโทเคน `AuthModule` ต้อง `exports` ทั้ง `AuthService` และ `AuthGuard` ตั้งแต่ขั้นนี้ ขั้น 7 เป็นต้นไปจะ import โมดูลนี้เพื่อใช้การ์ดตัวเดียวกัน

`CurrentUser` อ่าน `request.user` ที่การ์ดเพิ่งใส่ไว้ ถ้าไม่มี ให้โยน `UnauthorizedException` พารามิเตอร์ของ decorator ต้องประกาศชนิด `PublicUser`

ข้อยกเว้นของ unique บนอีเมล (`P2002`) ต้องกลายเป็น `ConflictException('Email already registered')` ไม่ให้หลุดเป็น 500 ชื่อคลาส error ของ Prisma 7 อยู่ในไฟล์ที่ generate ถ้าชื่อไม่ตรงกับตัวอย่าง ให้เปิด `src/generated/prisma/client.ts` แล้วใช้ชื่อที่ไฟล์นั้น export จริง

### ไฟล์ของขั้นนี้

- `src/auth/public-user.ts`
- `src/auth/dto/register.dto.ts`
- `src/auth/dto/login.dto.ts`
- `src/auth/dto/onboarding.dto.ts`
- `src/auth/auth.service.ts`
- `src/auth/auth.guard.ts`
- `src/auth/current-user.decorator.ts`
- `src/auth/auth.controller.ts`
- `src/auth/users.controller.ts`
- `src/auth/auth.module.ts`
- `src/app.module.ts` เพิ่ม `AuthModule` ใน `imports`

`src/auth/public-user.ts`

```ts
export interface PublicUser {
  id: number;
  email: string;
  name: string;
  practiceType: 'mobile' | 'fixedLocation' | 'mixed' | null;
  expenseMethod: 'flat_rate' | 'actual_cost' | null;
  onboardedAt: string | null;
}

export interface AuthResponse {
  accessToken: string;
  user: PublicUser;
}
```

`src/auth/dto/register.dto.ts`

```ts
import { IsEmail, IsString, MaxLength, MinLength } from 'class-validator';

export class RegisterDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(8)
  @MaxLength(72)
  password: string;

  @IsString()
  @MinLength(1)
  @MaxLength(200)
  name: string;
}
```

`src/auth/dto/login.dto.ts` มี `email` กับ `password` ชุดเดียวกัน ไม่มี `name`

`src/auth/dto/onboarding.dto.ts`

```ts
import { IsIn } from 'class-validator';

export class OnboardingDto {
  @IsIn(['mobile', 'fixedLocation', 'mixed'])
  practiceType: 'mobile' | 'fixedLocation' | 'mixed';

  @IsIn(['flat_rate', 'actual_cost'])
  expenseMethod: 'flat_rate' | 'actual_cost';
}
```

`src/auth/auth.service.ts`

```ts
import { ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { randomBytes } from 'node:crypto';
import bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service.js';
import type { LoginDto } from './dto/login.dto.js';
import type { OnboardingDto } from './dto/onboarding.dto.js';
import type { RegisterDto } from './dto/register.dto.js';
import type { AuthResponse, PublicUser } from './public-user.js';

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

interface UserRow {
  id: number;
  email: string;
  name: string;
  passwordHash: string;
  practiceType: PublicUser['practiceType'];
  expenseMethod: PublicUser['expenseMethod'];
  onboardedAt: Date | null;
}

function toPublicUser(user: UserRow): PublicUser {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    practiceType: user.practiceType,
    expenseMethod: user.expenseMethod,
    onboardedAt: user.onboardedAt === null ? null : user.onboardedAt.toISOString(),
  };
}

@Injectable()
export class AuthService {
  constructor(private readonly prisma: PrismaService) {}

  async register(input: RegisterDto): Promise<AuthResponse> {
    const passwordHash = await bcrypt.hash(input.password, 10);
    try {
      const user = await this.prisma.user.create({
        data: {
          email: input.email,
          name: input.name,
          passwordHash,
        },
      });
      const accessToken = await this.createSession(user.id);
      return { accessToken, user: toPublicUser(user) };
    } catch (error: unknown) {
      if (isUniqueViolation(error)) {
        throw new ConflictException('Email already registered');
      }
      throw error;
    }
  }

  async login(input: LoginDto): Promise<AuthResponse> {
    const user = await this.prisma.user.findUnique({
      where: { email: input.email },
    });
    const matches =
      user !== null && (await bcrypt.compare(input.password, user.passwordHash));
    if (user === null || !matches) {
      throw new UnauthorizedException('Invalid email or password');
    }
    const accessToken = await this.createSession(user.id);
    return { accessToken, user: toPublicUser(user) };
  }

  async userForToken(token: string): Promise<PublicUser | null> {
    const session = await this.prisma.session.findUnique({
      where: { token },
      include: { user: true },
    });
    if (session === null || session.expiresAt.getTime() <= Date.now()) {
      return null;
    }
    return toPublicUser(session.user);
  }

  async completeOnboarding(userId: number, input: OnboardingDto): Promise<PublicUser> {
    const updated = await this.prisma.user.updateMany({
      where: { id: userId, onboardedAt: null },
      data: {
        practiceType: input.practiceType,
        expenseMethod: input.expenseMethod,
        onboardedAt: new Date(),
      },
    });
    if (updated.count === 0) {
      const user = await this.prisma.user.findUnique({ where: { id: userId } });
      if (user === null) {
        throw new UnauthorizedException();
      }
      throw new ConflictException('Onboarding already completed');
    }
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (user === null) {
      throw new UnauthorizedException();
    }
    return toPublicUser(user);
  }

  private async createSession(userId: number): Promise<string> {
    const token = randomBytes(32).toString('base64url');
    await this.prisma.session.create({
      data: {
        token,
        userId,
        expiresAt: new Date(Date.now() + SEVEN_DAYS_MS),
      },
    });
    return token;
  }
}

function isUniqueViolation(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    error.code === 'P2002'
  );
}
```

ตัวช่วย `isUniqueViolation` ดูรหัส `P2002` โดยไม่แคสต์ก้อน error ทั้งก้อนเป็นชนิดของ Prisma ถ้าระบบชนิดของรีโปมี `Prisma.PrismaClientKnownRequestError` และใช้ `instanceof` ได้โดยไม่ต้อง `as` ให้ใช้แบบนั้นแทน

การ์ดกับ decorator

```ts
import { Injectable, UnauthorizedException } from '@nestjs/common';
import type { CanActivate, ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';
import { AuthService } from './auth.service.js';
import type { PublicUser } from './public-user.js';

export interface AuthenticatedRequest extends Request {
  user?: PublicUser;
}

function readBearer(header: string | undefined): string | null {
  if (header === undefined) {
    return null;
  }
  const [scheme, token] = header.split(' ');
  if (scheme !== 'Bearer' || token === undefined || token.length === 0) {
    return null;
  }
  return token;
}

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private readonly authService: AuthService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const header = request.headers.authorization;
    const token = readBearer(typeof header === 'string' ? header : undefined);
    if (token === null) {
      throw new UnauthorizedException();
    }
    const user = await this.authService.userForToken(token);
    if (user === null) {
      throw new UnauthorizedException();
    }
    request.user = user;
    return true;
  }
}
```

```ts
import { createParamDecorator, UnauthorizedException } from '@nestjs/common';
import type { ExecutionContext } from '@nestjs/common';
import type { AuthenticatedRequest } from './auth.guard.js';
import type { PublicUser } from './public-user.js';

export const CurrentUser = createParamDecorator(
  (_data: unknown, context: ExecutionContext): PublicUser => {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    if (request.user === undefined) {
      throw new UnauthorizedException();
    }
    return request.user;
  },
);
```

`auth.controller.ts` รับ `RegisterDto` และ `LoginDto` เป็นค่าที่ import จริง ไม่ใช่ `import type` เมธอด `login` มี `@HttpCode(HttpStatus.OK)`

`users.controller.ts`

```ts
import { Body, Controller, Get, Patch, UseGuards } from '@nestjs/common';
import { AuthGuard } from './auth.guard.js';
import { AuthService } from './auth.service.js';
import { CurrentUser } from './current-user.decorator.js';
import { OnboardingDto } from './dto/onboarding.dto.js';
import type { PublicUser } from './public-user.js';

@Controller('users')
@UseGuards(AuthGuard)
export class UsersController {
  constructor(private readonly authService: AuthService) {}

  @Get('me')
  me(@CurrentUser() user: PublicUser): PublicUser {
    return user;
  }

  @Patch('me/onboarding')
  onboard(
    @CurrentUser() user: PublicUser,
    @Body() body: OnboardingDto,
  ): Promise<PublicUser> {
    return this.authService.completeOnboarding(user.id, body);
  }
}
```

`auth.module.ts` ลงทะเบียน controller ทั้งสอง, provider ทั้ง `AuthService` และ `AuthGuard`, แล้ว `exports: [AuthService, AuthGuard]` `AppModule` ใส่ `AuthModule` ใน `imports` คู่กับ `PrismaModule`

### คำสั่งที่รันเอง

รีสตาร์ต `start:dev` ใช้อีเมลที่ยังไม่เคยสมัคร ถ้ารันซ้ำและได้ 409 ให้เปลี่ยนอีเมล หรือใช้คำขอล็อกอินแทนคำขอสมัคร

สมัคร ที่แท็บ Tests เก็บโทเคนลง `token`

```text
POST {{baseUrl}}/auth/register
```

```json
{"email":"ada@example.com","password":"correct-horse","name":"Ada Lovelace"}
```

```js
pm.environment.set('token', pm.response.json().accessToken);
```

ล็อกอิน ใช้สคริปต์ Tests เดียวกัน เพื่อให้ `token` เป็นโทเคนล่าสุด

```text
POST {{baseUrl}}/auth/login
```

```json
{"email":"ada@example.com","password":"correct-horse"}
```

จากนั้นคำขอของ Ada ใส่ Bearer `{{token}}`

```text
GET {{baseUrl}}/users/me
```

```text
PATCH {{baseUrl}}/users/me/onboarding
```

```json
{"practiceType":"mobile","expenseMethod":"flat_rate"}
```

ส่ง PATCH ก้อนเดิมอีกครั้ง ยังใส่ Bearer `{{token}}`

ส่ง PATCH ก้อนเดิมอีกครั้ง แต่ปิด Authorization

ล็อกอินรหัสผิด ปิด Authorization

```text
POST {{baseUrl}}/auth/login
```

```json
{"email":"ada@example.com","password":"wrong-password"}
```

สมัครอีเมลซ้ำ

```text
POST {{baseUrl}}/auth/register
```

```json
{"email":"ada@example.com","password":"correct-horse","name":"Ada Lovelace"}
```

รหัสสั้นและมีฟิลด์แปลก

```text
POST {{baseUrl}}/auth/register
```

```json
{"email":"ada@example.com","password":"short","extra":true}
```

### ผลที่ต้องเห็น

การสมัครได้ `201` มี `accessToken` เป็นสตริง และ `user.onboardedAt` เป็น `null` มีคีย์ `practiceType` กับ `expenseMethod` เป็น `null` ไม่มี `password` หรือ `passwordHash`

ล็อกอินได้ `200` และโทเคนใหม่ `GET /users/me` ด้วย Bearer คืนผู้ใช้คนเดียวกัน

onboarding ครั้งแรกได้ `200` สองฟิลด์ตรงกับที่ส่ง และ `onboardedAt` เป็นสตริงเวลาแบบ ISO 8601 ครั้งที่สองได้ `409` ข้อความ `Onboarding already completed`

คำขอ onboarding ที่ไม่มี Bearer ได้ `401` ข้อความ `Unauthorized` นี่คือผลของคำขอที่ยังไม่ส่งโทเคน

รหัสผิดได้ `401` ข้อความ `Invalid email or password` อีเมลซ้ำได้ `409` ข้อความ `Email already registered`

รหัสสั้นกว่า 8 ตัวพร้อมฟิลด์ `extra` ได้ `400` และ `message` เป็น array เพราะเป็นงานของ pipe จากขั้น 4 ไม่ใช่ข้อความสตริงก้อนเดียว

### ถ้าไม่ผ่าน

- onboarding ได้ `401` ทั้งที่คิดว่าส่งโทเคนแล้ว: ดูว่า Authorization เป็น Bearer Token ค่าเป็น `{{token}}` และใน environment ค่า `token` ไม่ว่าง
- ได้ `201` จากการล็อกอิน: ลืม `@HttpCode(HttpStatus.OK)` POST ของ Nest ค่าเริ่มต้นคือ 201
- `onboardedAt` หายไปตอนยังไม่ onboard: `toPublicUser` ต้องใส่คีย์นี้แม้ค่าจะเป็น `null` การละคีย์กับค่า `null` ไม่เหมือนกันใน JSON
- ตัวตอบมี `passwordHash`: กำลังคืนแถวจาก Prisma ทั้งก้อน ให้ผ่าน `toPublicUser` ก่อนส่ง
- อีเมลซ้ำได้ 500: exception ของ unique ยังไม่ถูกจับเป็น `ConflictException`
- `GET /` กลายเป็น 401: การ์ดถูกใส่แบบ global ให้อยู่ที่ `UsersController` เท่านั้น
- ฟิลด์ `extra` ในการสมัครได้ 201: pipe จากขั้น 4 ไม่ได้ถูกใส่ หรือ DTO ถูก import แบบ `import type` ใน controller

**ผ่านแล้วค่อยไปขั้นถัดไป** เก็บตัวแปร `token` ของ Ada ไว้ใช้ในขั้น 8 เธอ onboard แบบ `flat_rate` แล้ว

---

## ขั้น 7 — หมวดค่าใช้จ่าย

### ทำไมขั้นนี้มาก่อน

หน้าจดรายการต้องมีรายการหมวดก่อน จึงจะเลือกหมวดและ hint จากโน้ตได้ สัญญาให้ดึงรายการนี้ได้แม้ยังไม่ onboard เพื่อให้ client เตรียมรายการไว้ล่วงหน้า ขั้นนี้จึงมี endpoint เดียว และยังไม่รับการจดเงิน

### ยังไม่ทำในขั้นนี้

ยังไม่เขียน `POST /transactions` ยังไม่ทำ endpoint hint การ hint เป็นงานของเบราว์เซอร์ในขั้น 12

### แนวคิด

หมวดถูก seed ไว้ตายตัว ผู้ใช้สร้างหมวดเองไม่ได้ เพราะจุดของผลิตภัณฑ์คือไม่ต้องตั้งผังบัญชี `GET /expense-categories` คืน array เปล่า ไม่ห่อ `{ items }` และไม่แบ่งหน้า มี 7 แถวเรียงตามนี้เสมอ

| slug | name | kind | keywords |
| --- | --- | --- | --- |
| `oils-consumables` | Oils and consumables | `general` | oil, oils, cream, wax, tape, consumable, balm |
| `hcpc-fees` | HCPC registration | `general` | hcpc, registration, membership |
| `professional-insurance` | Professional insurance | `general` | indemnity, insurance |
| `laundry` | Laundry | `general` | laundry, towel, linen, washing |
| `mileage` | Mileage | `mileage` | mileage, miles, petrol, fuel, travel |
| `vehicle-costs` | Vehicle costs | `vehicle_actual` | fuel, petrol, mot, service, repair, servicing |
| `other` | Other | `general` | ไม่มี keyword |

ห้าหมวดแรกของอาชีพตามข้อเสนอคือน้ำมันและของใช้, ค่า HCPC, ไมล์, ประกัน, และค่าซัก `vehicle-costs` มีไว้ให้คนที่เลือกต้นทุนจริงมีที่ลงน้ำมันกับค่าซ่อม `other` มีไว้ให้การจด 30 วินาทีจบได้เมื่อไม่มีหมวดชื่อตรง

ลำดับตัวอักษรของ slug ไม่ตรงกับลำดับนี้ ฐานข้อมูลจึงเรียงให้ไม่ได้ อาเรย์คงที่ในโค้ดเป็นลำดับที่ตอบออกไป service อ่านแถวทั้งหมดแล้วจัดกลับเข้าลำดับนั้น ถ้า slug ใดหาย แสดงว่า seed ไม่ครบ ให้ตอบ `InternalServerErrorException` เพราะเป็นความพังภายใน ไม่ใช่ความผิดของ client

seed ทำใน `onModuleInit` ของ service นี้ผ่าน `PrismaService` ที่ฉีดอยู่แล้ว ใช้ `upsert` เพื่อให้รีสตาร์ตซ้ำได้โดยไม่สร้างแถวซ้ำ ห้ามสร้าง `PrismaClient` อีกตัวในสคริปต์ seed

`mileage` ใช้ได้เมื่อ `expenseMethod` เป็น `flat_rate` เท่านั้น `vehicle-costs` ใช้ได้เมื่อเป็น `actual_cost` เท่านั้น ห้าหมวด `general` ใช้ได้เสมอ กติกานี้ยังไม่ถูกบังคับในขั้นนี้ เพราะยังไม่มีการเขียนธุรกรรม ขั้น 8 เป็นคนบังคับ ขั้นนี้แค่คืนรายการครบ เพื่อให้ client รู้ว่ามีอะไรบ้าง

คำว่า `fuel` กับ `petrol` อยู่ทั้งหมวดไมล์และหมวดค่าพาหนะ ในเวลาหนึ่งผู้ใช้เหลือได้หมวดเดียว จึง hint ได้หมวดเดียว ภายใต้ flat rate โน้ต "petrol" ควรเป็น `mileage` เพราะอัตรา 55 แล้ว 25 เพนนีครอบน้ำมันแล้ว และผู้ใช้กรอกไมล์ ภายใต้ actual cost โน้ตเดียวกันควรเป็น `vehicle-costs` และผู้ใช้กรอกจำนวนเงินที่หักได้

ที่จอดรถ ค่าทางด่วน และค่ารถไฟเบิกเพิ่มบนไมล์ได้ตามหน้า GOV.UK เดียวกัน มันไม่ใช่ไมล์ ให้จดเป็น `other` พร้อม `amountPence` คำเหล่านี้ไม่อยู่ใน keywords ของ `mileage` โดยตั้งใจ และ `other` ไม่มี keyword จึงไม่ถูก hint

เส้นนี้ต้องมี Bearer เรียกก่อน onboarding ได้ ยังไม่ onboard แล้วเรียกธุรกรรมหรือสรุปภาษีไม่ได้ นั่นเป็นคนละประตู และยังไม่ถูกสร้างในขั้นนี้

### ไฟล์ของขั้นนี้

- `src/expense-categories/expense-categories.ts` อาเรย์คงที่
- `src/expense-categories/expense-categories.service.ts`
- `src/expense-categories/expense-categories.controller.ts`
- `src/expense-categories/expense-categories.module.ts`
- `src/app.module.ts` เพิ่มโมดูลนี้

รูปของแถวที่ตอบ

```ts
export interface ExpenseCategory {
  slug: string;
  name: string;
  keywords: string[];
  kind: 'general' | 'mileage' | 'vehicle_actual';
}

export const EXPENSE_CATEGORIES: ExpenseCategory[] = [
  {
    slug: 'oils-consumables',
    name: 'Oils and consumables',
    kind: 'general',
    keywords: ['oil', 'oils', 'cream', 'wax', 'tape', 'consumable', 'balm'],
  },
  {
    slug: 'hcpc-fees',
    name: 'HCPC registration',
    kind: 'general',
    keywords: ['hcpc', 'registration', 'membership'],
  },
  {
    slug: 'professional-insurance',
    name: 'Professional insurance',
    kind: 'general',
    keywords: ['indemnity', 'insurance'],
  },
  {
    slug: 'laundry',
    name: 'Laundry',
    kind: 'general',
    keywords: ['laundry', 'towel', 'linen', 'washing'],
  },
  {
    slug: 'mileage',
    name: 'Mileage',
    kind: 'mileage',
    keywords: ['mileage', 'miles', 'petrol', 'fuel', 'travel'],
  },
  {
    slug: 'vehicle-costs',
    name: 'Vehicle costs',
    kind: 'vehicle_actual',
    keywords: ['fuel', 'petrol', 'mot', 'service', 'repair', 'servicing'],
  },
  {
    slug: 'other',
    name: 'Other',
    kind: 'general',
    keywords: [],
  },
];
```

service ฉีด `PrismaService` ใน `onModuleInit` ให้ `upsert` ทุกแถวโดย `where: { slug }` อัปเดต `name`, `keywords`, `kind` และ create ด้วยก้อนเดียวกัน

เมธอด `list` อ่านทุกแถว ทำ `Map` จาก slug แล้ว `map` ตาม `EXPENSE_CATEGORIES` เมธอด `findBySlug` คืนแถวหรือ `null` ขั้น 8 จะเรียกตัวนี้ ไม่ต้องเขียน route เพิ่ม

controller

```ts
@Controller('expense-categories')
@UseGuards(AuthGuard)
export class ExpenseCategoriesController {
  constructor(private readonly categories: ExpenseCategoriesService) {}

  @Get()
  list(): Promise<ExpenseCategory[]> {
    return this.categories.list();
  }
}
```

โมดูล `imports: [AuthModule]` และลงทะเบียน controller กับ service `AppModule` import โมดูลนี้

### คำสั่งที่รันเอง

รีสตาร์ตแอป เพื่อให้ `onModuleInit` ใส่แถว สมัครผู้ใช้คนที่สองที่ยังไม่ onboard ที่แท็บ Tests เก็บโทเคนลง `bee`

```text
POST {{baseUrl}}/auth/register
```

```json
{"email":"bee@example.com","password":"correct-horse","name":"Bea"}
```

```js
pm.environment.set('bee', pm.response.json().accessToken);
```

จากนั้น

```text
GET {{baseUrl}}/expense-categories
```

คำขอแรกใส่ Bearer `{{bee}}` คำขอที่สองส่งเส้นเดิมแต่ปิด Authorization

```bash
docker compose exec postgres psql -U theratax -d theratax_dev -c 'SELECT slug FROM "ExpenseCategory"'
```

### ผลที่ต้องเห็น

คำขอของ Bea ได้ `200` และเป็น array ความยาว 7 ไม่มีคีย์ `items` ลำดับ slug คือ `oils-consumables`, `hcpc-fees`, `professional-insurance`, `laundry`, `mileage`, `vehicle-costs`, `other`

keywords ของ `mileage` มี `petrol` และ `fuel` ของ `vehicle-costs` ก็มีสองคำนี้ `other` ได้ `keywords` เป็น `[]`

`onboardedAt` ของ Bea ยังเป็น `null` ได้จาก `GET /users/me` คำขอหมวดของเธอยังสำเร็จ

คำขอที่ไม่มี Bearer ได้ `401` ข้อความ `Unauthorized`

`SELECT` เห็น 7 slug รีสตาร์ตแอปอีกรอบแล้วจำนวนยังเป็น 7

### ถ้าไม่ผ่าน

- ได้ object มี `items`: ไปใช้รูปแบ่งหน้าของขั้น 8 เส้นนี้คืน array ตรง ๆ
- ลำดับเป็นตัวอักษร: ตอบจากผล `findMany` โดยไม่จัดตามอาเรย์คงที่
- Bea ได้ 403: เผลอเรียกตัวตรวจ onboarding เส้นหมวดต้องไม่เรียก
- ได้ 401 ทั้งที่ส่ง Bearer: โมดูลนี้ไม่ได้ `imports: [AuthModule]` หรือ `AuthModule` ยังไม่ export การ์ด แอปจะสร้างการ์ดไม่ออกหรือสร้างแล้วหา `AuthService` ไม่เจอ
- ตารางว่าง: แอปที่กำลังรันเป็นโปรเซสเก่าที่ยังไม่มี `onModuleInit` นี้

**ผ่านแล้วค่อยไปขั้นถัดไป**

---

## ขั้น 8 — จดรายรับรายจ่าย

### ทำไมขั้นนี้มาก่อน

ฟีดคือสิ่งที่นักบำบัดใช้ระหว่างลูกค้า 30 ถึง 60 วินาทีต่อรายการ หนึ่งคำขอ `POST /transactions` จบหนึ่งรายการ รูปใบเสร็จเป็นคำขอที่สองและทำเมื่อมีรูปเท่านั้น จึงยังไม่ทำในขั้นนี้ สรุปภาษีในขั้น 9 แค่บวกแถวที่ขั้นนี้เก็บ จึงยังไม่เปิด `GET /tax/summary`

ก่อนมี route ให้มีตัวช่วยวันที่ที่เป็นฟังก์ชันบริสุทธิ์และมีเทสของมันก่อน แล้วค่อยเปิด endpoint เมื่อเทสวันที่ผ่าน

### ยังไม่ทำในขั้นนี้

ยังไม่เขียน `GET /tax/summary` ยังไม่อัปโหลดรูป ยังไม่สร้างใบแจ้งหนี้ แถวที่ผูก `invoiceId` ถูกกันไม่ให้แก้จากเส้นนี้ แต่ยังไม่มีใครสร้างแถวแบบนั้นจนกว่าขั้น 11

### แนวคิด

หนึ่งแถวคือรายรับหรือรายจ่ายหนึ่งครั้ง เงินเป็นเพนนี วันเป็น `DD-MM-YYYY`

```ts
interface Transaction {
  id: number;
  type: 'income' | 'expense';
  occurredOn: string;
  amountPence: number;
  hasReceipt: boolean;
  note?: string;
  categorySlug?: string;
  miles?: number;
  invoiceId?: number;
}
```

`hasReceipt` มีเสมอ เพื่อให้ฟีดวาดสถานะกล้องจากก้อนนี้โดยไม่ต้องยิงขอรูปทีละแถว ตอนนี้ทุกแถวจึงเป็น `false` คีย์อื่นละไว้เมื่อไม่ใช้ รายรับเงินสดจึงก้อนเล็ก ไม่มี `categorySlug` ไม่มี `miles` และไม่มี `invoiceId` จนกว่าขั้น 11 จะเป็นคนตั้ง

body ที่สร้างได้

```ts
interface CreateTransaction {
  type: 'income' | 'expense';
  occurredOn?: string;
  note?: string;
  amountPence?: number;
  categorySlug?: string;
  miles?: number;
}
```

`occurredOn` ที่ไม่ส่งคือวันนี้ตามปฏิทิน `Europe/London` `note` เมื่อส่งต้องยาว 1 ถึง 500 `amountPence` เป็นจำนวนเต็ม 1 ถึง `100_000_000` คือไม่เกิน £1,000,000 `miles` เป็นจำนวนเต็ม 1 ถึง `100_000`

DTO ปล่อยฟิลด์ที่เป็นไปได้ให้เป็น optional ยกเว้น `type` เพราะฟิลด์ที่บังคับเปลี่ยนตามชนิดและหมวด pipe ตรวจชนิดและความยาว ส่วนกติกาธุรกิจโยน `BadRequestException` ด้วยสตริง สองรูปนี้ต้องยังแยกกันเหมือนขั้น 4

กติกาหลังรวม body แล้ว

- รายรับต้องมี `amountPence` ห้ามมี `categorySlug` และห้ามมี `miles` `invoiceId` มีได้เมื่อเซิร์ฟเวอร์สร้างตอนใบแจ้งหนี้ถูกจ่ายเท่านั้น ข้อความเมื่อฝ่าฝืน: `Income does not take a category or miles` และเมื่อไม่มีจำนวนเงิน: `Amount is required` สองข้อความนี้เป็นข้อความที่บทเรียนกำหนดให้ใช้ตรงกันทั้ง handler เพราะสัญญาไม่ได้ล็อกประโยคของสองกรณีนี้
- รายจ่ายหมวด `general` ต้องมี `categorySlug` และ `amountPence` ห้ามมี `miles` ข้อความเมื่อส่งไมล์: `Miles are only valid for mileage` เมื่อไม่มีหมวด: `Category is required` เมื่อไม่มีเงิน: `Amount is required`
- รายจ่ายไมล์แบบ flat rate ต้องมี `miles` ห้ามส่ง `amountPence` เพราะเซิร์ฟเวอร์คำนวณเอง ข้อความที่สัญญาล็อกไว้คือ `Amount is computed from miles` เมื่อไม่มีไมล์ใช้ `Miles are required`
- รายจ่าย `vehicle-costs` ต้องมี `amountPence` ห้ามมี `miles` จำนวนนี้คือเงินที่ผู้ใช้หักได้เอง เซิร์ฟเวอร์ไม่คิดเปอร์เซ็นต์การใช้ส่วนตัว เพราะนั่นจะกลายเป็นฟอร์ม และการปัดในฟีดไม่ใช่ฟอร์ม
- ใช้ `mileage` ขณะอยู่ actual cost หรือใช้ `vehicle-costs` ขณะอยู่ flat rate ตอบ `400` ข้อความ `Category <slug> is not valid for <expenseMethod>` เช่น `Category mileage is not valid for actual_cost`
- slug ที่ไม่มีอยู่ตอบ `400` ข้อความ `Unknown category <slug>`
- วันที่รูปแบบผิดหรือไม่มีอยู่จริง เช่น `31-02-2026` ตอบ `400` ผ่าน pipe หรือผ่านตัวตรวจวันที่ วันที่อยู่นอก `06-04-2026` ถึง `05-04-2027` ตอบ `400` ข้อความที่ล็อกไว้คือ `Date is outside the 2026-27 tax year`

`PATCH /transactions/:id` รับสับเซตของ `occurredOn`, `note`, `amountPence`, `categorySlug`, `miles` ห้ามมี `type` ใน DTO การส่ง `type` จึงเป็น 400 จาก pipe เพราะ `forbidNonWhitelisted` แถวหลังรวมค่าเดิมกับค่าใหม่ถูกตรวจด้วยกติกาชุดเดียว `invoiceId` แก้จาก client ไม่ได้

แถวที่มี `invoiceId` แก้หรือลบจากเส้นนี้ไม่ได้ ตอบ `409`

```json
{ "message": "Invoice income is changed by updating the invoice", "error": "Conflict", "statusCode": 409 }
```

`DELETE` ได้ `204` และไม่มี body

`:id` ที่ไม่ใช่ตัวเลขผ่าน `ParseIntPipe` ได้ `400` ข้อความ `Validation failed (numeric string is expected)` แถวที่ไม่มี หรือเป็นของผู้อื่น ตอบ `404` ข้อความ `Transaction <id> not found` ใช้ข้อความเดียวกันทั้งสองกรณี เพื่อไม่ให้เลข id ของคนอื่นกลายเป็นข้อมูล

ทุกเส้นในโมดูลนี้ ถ้า `onboardedAt` ยังเป็น `null` ตอบ `403`

```json
{ "message": "Complete onboarding before using this resource", "error": "Forbidden", "statusCode": 403 }
```

รายการใช้ซองนี้

```ts
interface ListResponse<T> {
  items: T[];
  total: number;
  skip: number;
  limit: number;
}
```

เรียง `occurredOn` จากใหม่ไปเก่า แล้ว `id` จากมากไปน้อย รายการล่าสุดจึงอยู่บนฟีด `limit` เป็นจำนวนเต็ม 1 ถึง 100 ค่าเริ่ม 20 `skip` เป็นจำนวนเต็มตั้งแต่ 0 ค่าเริ่ม 0 นอกช่วงนี้เป็น `400` จาก pipe หน้าว่างเป็น `200` พร้อม `items: []` และ `total: 0` query `type` รับได้แค่ `income` หรือ `expense`

`total` นับก่อนตัด `skip` กับ `limit`

### วันที่

ตัวช่วยอยู่ที่ `src/tax-engine/civil-date.ts` เพราะหน้าต่างปีภาษีเป็นกติกาของเครื่องคิดเลข ทั้งธุรกรรม ใบแจ้งหนี้ และสรุปภาษีใช้ตัวเดียวกัน มันยังไม่มี route

- `todayInLondon` อ่านวันเดือนปีจาก `Intl.DateTimeFormat` โซน `Europe/London` รูปแบบ `en-GB` แล้วประกอบเป็น `DD-MM-YYYY` ถ้าส่วนวัน เดือน หรือปีหาย ให้โยน `Error` เพราะเป็นความพังของรันไทม์ ไม่ใช่ body ของผู้ใช้
- `isValidCivilDate` รับเฉพาะ `\d{2}-\d{2}-\d{4}` แล้วสร้าง `Date.UTC` เพื่อปฏิเสธวันที่ไม่มีอยู่จริง
- `isInTaxYear` เปรียบเทียบคีย์ `YYYY-MM-DD` ระหว่าง `2026-04-06` กับ `2027-04-05`
- `civilDateToUtcDate` คืน `Date` เที่ยงคืน UTC ของวันนั้น เพื่อเก็บลง `@db.Date` โดยไม่เลื่อนวัน
- `utcDateToCivilDate` อ่านปี เดือน วันด้วย `getUTC*` กลับเป็น `DD-MM-YYYY`

เทสหน่วยต้องผ่านอย่างน้อยสามข้อก่อนเปิด route: `06-04-2026` อยู่ในปี, `05-04-2026` ไม่อยู่, `31-02-2026` ไม่ใช่วันจริง และ `civilDateToUtcDate('06-04-2026').toISOString()` เป็น `2026-04-06T00:00:00.000Z` แล้วแปลงกลับได้สตริงเดิม

ถ้าตอนอ่านจากฐานแล้ววันเลื่อนไปหนึ่งวัน แปลว่า driver คืน `Date` คนละแบบกับเที่ยงคืน UTC ที่เขียนไว้ ให้ปรับตัวแปลงตรงจุดอ่านเขียนนี้จุดเดียว ห้ามไปบวกชั่วโมงกระจายใน controller

ตัวตรวจ onboarding อยู่ `src/auth/assert-onboarded.ts` และใช้ครั้งแรกในขั้นนี้

```ts
import { ForbiddenException } from '@nestjs/common';
import type { PublicUser } from './public-user.js';

type OnboardedUser = PublicUser & {
  practiceType: 'mobile' | 'fixedLocation' | 'mixed';
  expenseMethod: 'flat_rate' | 'actual_cost';
  onboardedAt: string;
};

export function assertOnboarded(user: PublicUser): asserts user is OnboardedUser {
  if (
    user.onboardedAt === null ||
    user.practiceType === null ||
    user.expenseMethod === null
  ) {
    throw new ForbiddenException('Complete onboarding before using this resource');
  }
}
```

หลังฟังก์ชันนี้ `user.expenseMethod` เป็น `'flat_rate' | 'actual_cost'` โดยไม่ต้องใช้ `!`

### ไมล์ทั้งปี

คอลัมน์ `amountPence` ห้ามว่าง การสร้างแถวไมล์จึงใส่ `0` ไว้ในคำสั่ง insert แล้วทันทีในธุรกรรมฐานข้อมูลเดียวกัน โหลดทุกแถวที่ `categorySlug` เป็น `mileage` ของผู้ใช้นี้และวันอยู่ในปีภาษี เรียก `allocateMileageAmounts` จากขั้น 5 แล้ว `update` ทุกแถวด้วยยอดใหม่ อ่านแถวที่เพิ่งสร้างกลับมาอีกครั้งก่อนส่งให้ client ผู้ใช้จึงไม่เห็นเลข 0

ต้องทำหลัง insert เพราะสองแถวในวันเดียวกันเรียงด้วย `id` และ id มีหลัง insert แล้วเท่านั้น

การแก้หรือลบแถวไมล์ และการย้ายแถวออกจากหมวดไมล์ ก็เรียกชุดคำนวณนี้กับแถวที่เหลือ แถวย้อนหลังเปลี่ยนเงินของแถวที่วันที่ทีหลัง ตามเทสขั้น 5

แถวไมล์ที่ `miles` เป็น `null` คือข้อมูลพัง ให้โยน `InternalServerErrorException` แทนการข้ามแถวนั้น

### ไฟล์ของขั้นนี้

- `src/tax-engine/civil-date.ts` กับ `src/tax-engine/civil-date.spec.ts`
- `src/auth/assert-onboarded.ts`
- `src/transactions/dto/create-transaction.dto.ts`
- `src/transactions/dto/update-transaction.dto.ts`
- `src/transactions/dto/list-transactions-query.dto.ts`
- `src/transactions/transactions.service.ts`
- `src/transactions/transactions.controller.ts`
- `src/transactions/transactions.module.ts`
- `src/app.module.ts` เพิ่มโมดูล

DTO สร้างใช้ `IsIn` สำหรับ `type`, `IsOptional`, `Matches` สำหรับวัน, `IsString`, `MinLength(1)`, `MaxLength(500)` สำหรับโน้ต, `IsInt`, `Min(1)`, `Max(100_000_000)` สำหรับเงิน, `IsString` สำหรับ slug, `IsInt`, `Min(1)`, `Max(100_000)` สำหรับไมล์

DTO แก้มีฟิลด์เดียวกันยกเว้นไม่มี `type` ทุกฟิลด์เป็น optional

DTO ของ query

```ts
import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, Max, Min } from 'class-validator';

export class ListTransactionsQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  skip?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;

  @IsOptional()
  @IsIn(['income', 'expense'])
  type?: 'income' | 'expense';
}
```

`@Type(() => Number)` จำเป็นเพราะ query เข้ามาเป็นสตริง `transform: true` จากขั้น 4 จะได้เรียกตัวแปลงนี้ ถ้าไม่ใส่ `@IsInt()` จะเห็นสตริงแล้วตอบ 400 ทั้งที่ผู้ใช้ส่ง `limit=20` ถูกแล้ว

ใน service ถ้า `skip` เป็น `undefined` ให้ใช้ 0 ถ้า `limit` เป็น `undefined` ให้ใช้ 20 แล้วส่งสองค่านี้กลับในซองด้วย เพื่อสะท้อนค่าที่ใช้จริง

controller ใช้ `@UseGuards(AuthGuard)` ทั้งคลาส `POST` ไม่ใส่ `@HttpCode` จึงได้ 201 `DELETE` ใส่ `@HttpCode(HttpStatus.NO_CONTENT)` พารามิเตอร์ id เป็น `@Param('id', ParseIntPipe) id: number` โมดูล `imports: [AuthModule]` และใช้ `ExpenseCategoriesService` ได้โดยให้โมดูลหมวด export service นั้น แล้ว import `ExpenseCategoriesModule`

ตัว map แถวเป็น JSON ใส่ `hasReceipt` จากว่ามีแถว `receipt` หรือไม่ ใส่ `note` เมื่อไม่ว่าง ใส่ `categorySlug` เมื่อไม่ใช่ `null` ใส่ `miles` เมื่อไม่ใช่ `null` ใส่ `invoiceId` เมื่อไม่ใช่ `null` วันผ่าน `utcDateToCivilDate` ห้ามส่ง `Date` ออกไป

### คำสั่งที่รันเอง

รันเทสวันที่ก่อนยิงจาก Postman

```bash
npm test
```

จากนั้นใช้โทเคนของ Ada ที่เป็น `flat_rate` แล้ว คือ Bearer `{{token}}` และโทเคนของ Bea ที่ยังไม่ onboard คือ Bearer `{{bee}}` ถ้าเซสชันเก่าหมด ให้ล็อกอินใหม่แล้วอัปเดต `token` กับ `bee`

Bea ยังจดไม่ได้

```text
POST {{baseUrl}}/transactions
```

```json
{"type":"income","amountPence":100}
```

Ada จดไมล์ 11,000 วันที่ 1 มิถุนายน 2026

```text
POST {{baseUrl}}/transactions
```

```json
{"type":"expense","categorySlug":"mileage","miles":11000,"occurredOn":"01-06-2026"}
```

จากนั้นแทรกทริป 1,000 ไมล์วันที่ 6 เมษายน 2026 ซึ่งมาก่อน แล้วยิงรายการ

```text
POST {{baseUrl}}/transactions
```

```json
{"type":"expense","categorySlug":"mileage","miles":1000,"occurredOn":"06-04-2026"}
```

```text
GET {{baseUrl}}/transactions?limit=20
```

รายรับเงินสด £20,000 และวันที่นอกปี คำขอเหล่านี้เป็นของ Ada ใส่ Bearer `{{token}}`

```text
POST {{baseUrl}}/transactions
```

```json
{"type":"income","amountPence":2000000,"occurredOn":"01-05-2026","note":"cash session"}
```

```text
POST {{baseUrl}}/transactions
```

```json
{"type":"expense","categorySlug":"mileage","miles":11000,"occurredOn":"01-06-2026","amountPence":1}
```

```text
POST {{baseUrl}}/transactions
```

```json
{"type":"expense","categorySlug":"mileage","miles":10,"occurredOn":"01-04-2026"}
```

```text
POST {{baseUrl}}/transactions
```

```json
{"type":"expense","categorySlug":"vehicle-costs","amountPence":5000,"occurredOn":"02-05-2026"}
```

```text
GET {{baseUrl}}/transactions?type=cash
```

ให้ Bea ทำ onboarding เป็น `actual_cost` แล้วลองหมวดไมล์ต้องถูกปฏิเสธ จากนั้นจึงใช้หมวด `vehicle-costs` ได้ นั่นคือ `PATCH /users/me/onboarding` ของ Bea ด้วย `expenseMethod` เป็น `actual_cost` ใส่ Bearer `{{bee}}`

```text
PATCH {{baseUrl}}/users/me/onboarding
```

```json
{"practiceType":"fixedLocation","expenseMethod":"actual_cost"}
```

```text
POST {{baseUrl}}/transactions
```

```json
{"type":"expense","categorySlug":"mileage","miles":10,"occurredOn":"02-05-2026"}
```

### ผลที่ต้องเห็น

`npm test` ยังผ่าน รวมเทสวันที่ที่เพิ่มในขั้นนี้

Bea ก่อน onboard ได้ `403` ข้อความ `Complete onboarding before using this resource`

แถว 11,000 ไมล์ได้ `201`, `amountPence` เป็น `575000`, `miles` เป็น `11000`, `hasReceipt` เป็น `false` ไม่มีคีย์ที่ client ส่งมาเป็นจำนวนเงิน

หลังแทรก 1,000 ไมล์วันที่ 6 เมษายน รายการต้องเห็นแถวนั้นเป็น `55000` เพนนี และแถว 11,000 ไมล์วันที่ 1 มิถุนายนกลายเป็น `545000` เพนนี ตรงกับเทสฟังก์ชันในขั้น 5

รายรับ £20,000 ได้ `201`, `amountPence` เป็น `2000000`, ไม่มี `categorySlug`, ไม่มี `miles`, ไม่มี `invoiceId`, `note` เป็น `cash session`

การส่งทั้งไมล์และเงินได้ `400` ข้อความ `Amount is computed from miles`

วันที่ `01-04-2026` ได้ `400` ข้อความ `Date is outside the 2026-27 tax year`

Ada ส่ง `vehicle-costs` ได้ `400` ข้อความ `Category vehicle-costs is not valid for flat_rate`

`type=cash` ได้ `400` และ `message` เป็น array

Bea หลังเลือก `actual_cost` แล้วส่ง `mileage` ได้ `400` ข้อความ `Category mileage is not valid for actual_cost`

`GET /tax/summary` ยังไม่ใช่เกณฑ์ของขั้นนี้

### ถ้าไม่ผ่าน

- แถว 11,000 ได้ `605000`: handler คูณ 55 เองทั้งก้อน ไม่ได้เรียก `allocateMileageAmounts`
- แทรกทริปแล้วยอดเดือนมิถุนายนไม่เปลี่ยน: คำนวณเฉพาะแถวใหม่ ต้องเขียนกลับทุกแถวไมล์ของปีในธุรกรรมเดียวกัน
- วัน `06-04-2026` กลายเป็น `05-04-2026` ใน JSON: อ่าน `Date` คนละเขตเวลากับตอนเขียน กลับไปที่ตัวแปลง UTC
- ส่ง `amountPence` คู่กับไมล์แล้วยังได้ 201: กติกาธุรกิจอยู่ผิดที่ หรือถูกตรวจก่อนรวม body
- รายรับมี `categorySlug: null` ใน JSON: ตัว map ต้องละคีย์ ไม่ใช่ใส่ null สัญญาใช้การละคีย์กับฟิลด์ที่ไม่มีเสมอ ยกเว้น `hasReceipt` กับฟิลด์ของผู้ใช้ที่กำหนดว่ามีเสมอ
- รายการเรียงวันเก่าอยู่บน: `orderBy` ต้องเป็น `occurredOn` ลง แล้ว `id` ลง
- query `limit=20` ได้ 400 เรื่องตัวเลข: ยังไม่มี `@Type(() => Number)`

**ผ่านแล้วค่อยไปขั้นถัดไป** เหลือรายรับ `2_000_000` เพนนีของ Ada ไว้ใช้ในขั้น 9 ถ้ามีแต่แถวไมล์ ให้จดรายรับก้อนนั้นก่อนไปต่อ

---

## ขั้น 9 — สรุปภาษี

### ทำไมขั้นนี้มาก่อน

ตอนนี้มีฟังก์ชันจากขั้น 5 และมีแถวเงินจากขั้น 8 ขั้นนี้เป็นแค่การโหลดผลรวมแล้วเรียกฟังก์ชัน ถ้าเขียนอัตรา 20% หรือ 6% ซ้ำใน controller เทสหน่วยจะผ่านแต่หน้าสรุปจะเดินคนละสูตร

### ยังไม่ทำในขั้นนี้

ยังไม่อัปโหลดรูป ยังไม่สร้างใบแจ้งหนี้ ใบแจ้งหนี้ที่ยังไม่จ่ายไม่มีแถวรายรับ จึงไม่เข้าผลรวมอยู่แล้วโดยที่ขั้นนี้ไม่ต้องรู้จักตารางใบแจ้งหนี้

### แนวคิด

`GET /tax/summary` รับ query `taxYear` เป็นจำนวนเต็ม ไม่ส่งก็ได้

ค่าเริ่มคือปีภาษีที่มีวันนี้ตาม `Europe/London` สัญญาทำให้เฉพาะปี 2026–27 ถ้าวันนี้ตกในช่วง `06-04-2026` ถึง `05-04-2027` การไม่ส่ง query หมายถึง `2026` ถ้าวันนี้หลุดช่วงนั้นและไม่ส่ง query ตอบ `400` ถ้าส่ง `taxYear` ที่ไม่ใช่ `2026` ตอบ `400` ข้อความ `Only the 2026-27 tax year is supported` สัญญาล็อกสถานะไว้ที่ 400 และบทเรียนล็อกประโยคนี้ให้ใช้ที่เดียว

`taxYear=abc` เป็น 400 จาก pipe และ `message` เป็น array เพราะ query DTO ใช้ `@Type(() => Number)` กับ `@IsInt()` คนละรูปกับข้อความสตริงด้านบน

handler ทำสี่อย่างแล้วหยุด

1. `assertOnboarded` ถ้ายังไม่จบได้ 403 ข้อความเดิม
2. ตัดสินปี 2026 หรือ 400
3. `aggregate` ผลรวม `amountPence` ของรายรับ และของรายจ่าย ที่ `occurredOn` อยู่ใน `06-04-2026` ถึง `05-04-2027` ของผู้ใช้นี้ ผลรวมที่เป็น `null` เพราะไม่มีแถวให้ถือเป็น 0
4. เรียก `calculateTaxSummary` ด้วยสองผลรวมนั้นและ `user.expenseMethod` แล้วคืนค่าที่ฟังก์ชันคืนมาทั้งก้อน

controller ต้องไม่มีเลข `20`, `6`, `55`, `1257000`, หรือข้อความ disclaimer เปิดไฟล์ controller แล้วค้นคำเหล่านี้ต้องไม่เจอ

รายรับที่นับรวมทั้งรายรับจากฟีดและรายรับที่ขั้น 11 จะสร้างตอนจ่ายใบแจ้งหนี้ ขั้นนี้ยังไม่มีใบแจ้งหนี้ จึงยังเห็นแค่รายการที่ปัดเอง ค่าใช้จ่ายที่หักได้คือผลรวมแถว `expense` ในช่วงเดียวกัน ขาดทุนยังอยู่ที่ `netProfitPence` ภาษีใช้ `taxableProfitPence` ซึ่งไม่ติดลบ

### ไฟล์ของขั้นนี้

- `src/tax-engine/dto/tax-summary-query.dto.ts`
- `src/tax-engine/tax-engine.service.ts`
- `src/tax-engine/tax-engine.controller.ts`
- `src/tax-engine/tax-engine.module.ts`
- `src/app.module.ts` เพิ่มโมดูล

service ฉีด `PrismaService` เท่านั้น ไม่ฉีดเครื่องคิดเลขเป็นคลาส เพราะฟังก์ชันนำเข้าตรง ๆ ได้

```ts
return calculateTaxSummary({
  incomePence: income._sum.amountPence ?? 0,
  allowableExpensesPence: expenses._sum.amountPence ?? 0,
  expenseMethod: user.expenseMethod,
});
```

controller เป็น `@Controller('tax')`, `@UseGuards(AuthGuard)`, เมธอด `@Get('summary')` รับ `@CurrentUser() user: PublicUser` กับ `@Query() query: TaxSummaryQueryDto` โมดูล `imports: [AuthModule]`

### คำสั่งที่รันเอง

สมัครผู้ใช้คนที่สามชื่อ Cai อย่า onboard แล้วเรียกสรุป ใช้ Ada ซึ่งมีรายรับ `2000000` จากขั้น 8 สำหรับเคสตัวเลข ถ้า Ada มีค่าใช้จ่ายไมล์อยู่ด้วย ผลจะไม่ใช่ £20,000 พอดี ให้ใช้ผู้ใช้ใหม่ที่ onboard แบบ `flat_rate` แล้วจดรายรับก้อนเดียว `2000000` วันที่ `01-05-2026` โดยไม่มีรายจ่าย แล้วค่อยเรียกสรุปด้วยโทเคนของคนนั้น เก็บ `accessToken` ลงตัวแปร `cai`

ก่อน onboard ของ Cai คำขอแรกของเธอต้องเป็น 403 ลำดับจึงเป็น สมัคร, เรียกสรุปเพื่อเห็น 403, onboard, จดรายรับก้อนเดียว, เรียกสรุปอีกครั้ง

สี่คำขอแรกใส่ Bearer `{{cai}}` คำขอสุดท้ายปิด Authorization

```text
GET {{baseUrl}}/tax/summary
```

```text
GET {{baseUrl}}/tax/summary?taxYear=2026
```

```text
GET {{baseUrl}}/tax/summary?taxYear=2025
```

```text
GET {{baseUrl}}/tax/summary?taxYear=abc
```

```text
GET {{baseUrl}}/tax/summary
```

### ผลที่ต้องเห็น

ก่อน onboard ได้ `403` ข้อความ `Complete onboarding before using this resource`

หลังมีรายรับ `2_000_000` เพนนีและไม่มีรายจ่าย ตัวตอบ `200` มี

- `taxYear` เป็น `2026-27`
- `periodStart` เป็น `06-04-2026`
- `periodEnd` เป็น `05-04-2027`
- `incomePence` เป็น `2000000`
- `allowableExpensesPence` เป็น `0`
- `netProfitPence` เป็น `2000000`
- `taxableProfitPence` เป็น `2000000`
- `incomeTaxPence` เป็น `148600`
- `class4NationalInsurancePence` เป็น `44580`
- `estimatedTaxOwedPence` เป็น `193180`
- `class2.treatedAsPaid` เป็น `true`
- `class2.voluntaryWeeklyPence` เป็น `365`
- `assumptions` ยาว 6 และข้อความตรงกับขั้น 5
- `disclaimer` ตรงประโยคในสัญญา
- `expenseMethod` ตรงกับที่ onboard

`taxYear=2025` ได้ `400` ข้อความ `Only the 2026-27 tax year is supported`

`taxYear=abc` ได้ `400` และ `message` เป็น array

ไม่มี Bearer ได้ `401` ข้อความ `Unauthorized`

`npm test` ยังผ่าน ตัวเลขชุดนี้ต้องตรงกับเทส £20,000 ไม่ต้องคำนวณใหม่ในหัว

### ถ้าไม่ผ่าน

- ยอดถูกแต่เพนนีภาษีไม่ตรงเทส: service ไปปัดหรือคูณอัตราเอง ให้ลบเลขนั้นแล้วเรียก `calculateTaxSummary`
- รายรับเป็น 0 ทั้งที่มีแถว: ช่วงวันที่ของ `aggregate` ไม่ตรงกับวันที่ยัดลง `@db.Date` หรือลืมกรอง `type`
- รวมไมล์ของ Ada เข้าไปแล้วตัวเลขไม่ใช่ `193180`: นั่นถูกแล้ว เพราะมีค่าใช้จ่าย เกณฑ์ตัวเลขเป๊ะใช้ผู้ใช้ที่ไม่มีแถวรายจ่าย
- ใบแจ้งหนี้ยังไม่มี แต่ไปเขียน query ตาราง `Invoice`: ยังไม่ถึงขั้น 11 ผลรวมมาจากตารางธุรกรรมเท่านั้น

**ผ่านแล้วค่อยไปขั้นถัดไป**

---

## ขั้น 10 — รูปใบเสร็จ

### ทำไมขั้นนี้มาก่อน

ฟีดจดเงินได้แล้ว แต่ flow ข้อ 3 คือแนบรูปเข้ากับรายการนั้นในอีกหนึ่งคำขอ ทำเมื่อมีรูปเท่านั้น ลิงก์ที่แจกต้องเปิดดูรูปได้ และต้องหมดอายุ ดังนั้นขั้นนี้ตรวจด้วยการอัปโหลดแล้วเปิดลิงก์ ไม่ใช่แค่ได้แถวในตาราง

### ยังไม่ทำในขั้นนี้

ยังไม่สร้างใบแจ้งหนี้ และยังไม่ทำหน้า React การเปิดลิงก์ใช้ Postman หรือเบราว์เซอร์ยิงที่ URL ที่ได้มา

### แนวคิด

หนึ่งธุรกรรมมีได้หนึ่งรูป `POST /transactions/:id/receipt` เป็น `multipart/form-data` ฟิลด์ชื่อ `file`

- ชนิดที่รับ: `image/jpeg`, `image/png`, `image/webp`
- ขนาด: 1 ไบต์ ถึง 10 MiB คือ `10 * 1024 * 1024`

สำเร็จได้ `201` โดยไม่มี URL

```ts
interface Receipt {
  transactionId: number;
  contentType: string;
  byteSize: number;
}
```

อัปโหลดครั้งที่สองทับรูปเดิม ได้ `201` อีกครั้ง คีย์ในที่เก็บใช้ `receipts/<userId>/<transactionId>` จึงเขียนทับวัตถุเดิม

วัตถุเป็นของส่วนตัว ตัวตอบของ `POST` จึงไม่มี URL `GET /transactions/:id/receipt` ได้ `200`

```ts
interface ReceiptUrl {
  url: string;
  expiresAt: string;
}
```

`url` เป็นลิงก์เซ็นชื่ออายุสั้น `expiresAt` เป็น ISO 8601 อีก 15 นาทีนับจากตอนออกลิงก์ client ใช้ `url` เป็น `src` ของรูป API ไม่สตรีมไบต์ของรูป และไม่คืน URL ถาวร

ยังไม่มีรูป แต่มีธุรกรรม ตอบ `404`

```json
{ "message": "Receipt for transaction <id> not found", "error": "Not Found", "statusCode": 404 }
```

ไม่มีธุรกรรม หรือธุรกรรมเป็นของคนอื่น ตอบ `404` ข้อความ `Transaction <id> not found` ทั้งตอนอัปโหลด ตอนขอลิงก์ และตอนลบ `DELETE` เมื่อมีรูปอยู่ได้ `204` และไม่มี body

เส้นเหล่านี้ต้อง onboard แล้ว ไม่งั้น `403` ข้อความเดิม และต้องมี Bearer

ที่เก็บที่ใช้ให้ตรงสัญญาคือ MinIO ซึ่งพูดโปรโตคอลเดียวกับ S3 บัคเก็ตเป็นส่วนตัว แอปขอลิงก์อ่านด้วย `@aws-sdk/s3-request-presigner` อายุ `expiresIn: 900` วินาที แล้วตั้ง `expiresAt` จากนาฬิกาเดียวกันเป็น `new Date(Date.now() + 15 * 60 * 1000).toISOString()` ลิงก์ที่เซ็นกับ `endpoint` เป็น `http://localhost:9000` เปิดจากเครื่องคุณได้

ติดตั้งเองสองคำสั่งนี้ ยังไม่ติดตั้งของขั้น 11

```bash
npm install @aws-sdk/client-s3 @aws-sdk/s3-request-presigner
npm install -D @types/multer
```

`multer` มากับ `@nestjs/platform-express` อยู่แล้ว `@types/multer` ทำให้พารามิเตอร์ `@UploadedFile()` มีชนิด `Express.Multer.File`

เพิ่ม service ใน `docker-compose.yml` รหัสนี้เป็นของเครื่องพัฒนาเหมือน Postgres

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

เพิ่ม volume `miniodata` คู่กับ `pgdata` แล้วใส่ค่าใน `.env`

```text
S3_ENDPOINT=http://localhost:9000
S3_ACCESS_KEY=theratax
S3_SECRET_KEY=theratax-secret
S3_BUCKET=receipts
```

`S3Client` ใช้ `forcePathStyle: true` เพราะ MinIO ต้องการ path แบบนั้น `region` ใส่ `us-east-1` ได้สำหรับเครื่องพัฒนา มันไม่ได้ย้ายข้อมูลไปภูมิภาคนั้น

ตอนโมดูลเริ่ม ให้สร้างบัคเก็ตถ้ายังไม่มี ถ้าได้ข้อผิดพลาดว่ามีอยู่แล้วให้ผ่านต่อ ห้ามตั้ง policy ให้บัคเก็ตเป็นสาธารณะ

`FileInterceptor('file', { limits: { fileSize: 10 * 1024 * 1024 } })` กันไฟล์ใหญ่ก่อนเข้า handler ถ้า multer โยน `MulterError` โดยเฉพาะรหัส `LIMIT_FILE_SIZE` ให้ฟิลเตอร์ตอบ `400` ข้อความ `Receipt must be an image up to 10 MiB` รูปเป็นสตริงใน `message` ตาม exception ที่ตั้งใจ ไม่ใช่ array ของ pipe สัญญาล็อกสถานะของไฟล์ผิดชนิดหรือใหญ่เกินไว้ที่ 400 และบทเรียนใช้ประโยคนี้

ใน service ถ้าไม่มีไฟล์ หรือ `size` น้อยกว่า 1 ตอบ `400` ด้วยประโยคเดียวกัน ถ้า `mimetype` ไม่ใช่สามชนิดด้านบน ตอบ `400` ประโยคเดียวกัน จากนั้น `PutObject` ด้วย `Body` เป็นบัฟเฟอร์ และ `ContentType` เป็นชนิดของไฟล์ แล้ว `upsert` แถว `Receipt`

ลำดับการหาแถวคือ หาธุรกรรมของผู้ใช้นี้ก่อน ถ้าไม่มีจึงเป็นข้อความธุรกรรม ถ้ามีแต่ไม่มี receipt จึงเป็นข้อความใบเสร็จ การลบเรียก `DeleteObject` แล้วลบแถว

`hasReceipt` ของ `GET /transactions` ต้องเป็น `true` หลังอัปโหลด และกลับเป็น `false` หลังลบ ตัว map ในขั้น 8 ทำอยู่แล้วถ้า query รวมความสัมพันธ์ `receipt`

โฟลเดอร์ของโดเมนนี้คือ `src/upload/` ตามโครงสร้างโปรเจกต์ แม้ path จะอยู่ใต้ `/transactions/:id/receipt` เพราะรูปเป็นคนละงานกับการจดเงิน controller ในโฟลเดอร์นี้ประกาศ path นั้นได้

### ไฟล์ของขั้นนี้

- `docker-compose.yml` เพิ่ม service `minio` กับ volume
- `.env` เพิ่มสี่ตัวแปรด้านบน
- `src/upload/upload.service.ts` ห่อ `S3Client`
- `src/upload/receipts.controller.ts`
- `src/upload/receipts.service.ts`
- `src/upload/receipt-upload.filter.ts`
- `src/upload/upload.module.ts`
- `src/app.module.ts` เพิ่ม `UploadModule`

โมดูล import `AuthModule` controller ทั้งคลาสมี `@UseGuards(AuthGuard)` และ `@UseFilters(ReceiptUploadFilter)` ทุกเมธอดเรียก `assertOnboarded` ก่อน

`POST` ได้ 201 ตามค่าเริ่มต้นของ Nest `GET` คืน `{ url, expiresAt }` `DELETE` ใช้ `@HttpCode(HttpStatus.NO_CONTENT)`

พารามิเตอร์ไฟล์ประกาศเป็น `Express.Multer.File | undefined` เพราะ interceptor ไม่ได้รับประกันว่ามีไฟล์

### คำสั่งที่รันเอง

```bash
docker compose up -d
```

รีสตาร์ต `start:dev` เตรียมไฟล์รูปเล็ก ๆ ชื่อ `receipt.jpg` ที่เป็น JPEG จริง และไฟล์ `notes.txt` ใช้ธุรกรรมของ Ada เก็บ id ไว้ในตัวแปร `tx` ของ environment ธุรกรรมที่ไม่มีรูปเก็บ id ไว้ใน `empty`

อัปโหลดครั้งแรก ใส่ Bearer `{{token}}` เปิด Body เลือก form-data คีย์ชื่อ `file` ชนิดเป็น File แล้วเลือก `receipt.jpg` อย่าตั้ง `Content-Type` เอง

```text
POST {{baseUrl}}/transactions/{{tx}}/receipt
```

ขอลิงก์ ใส่ Bearer `{{token}}`

```text
GET {{baseUrl}}/transactions/{{tx}}/receipt
```

เอาค่า `url` จากคำตอบนั้นไปเปิด เป็นคำขอ GET ใหม่ วาง URL ทั้งเส้น ปิด Authorization

จากนั้นอัปโหลด `receipt.jpg` ซ้ำด้วย POST เดิม แล้วขอลิงก์ใหม่ ทั้งคู่ใส่ Bearer `{{token}}`

ลองไฟล์ข้อความด้วย POST เดิม เปลี่ยนไฟล์ใน form-data เป็น `notes.txt`

ธุรกรรมที่ไม่มีรูป และรายการธุรกรรม ใส่ Bearer `{{token}}`

```text
GET {{baseUrl}}/transactions/{{empty}}/receipt
```

```text
GET {{baseUrl}}/transactions?limit=20
```

### ผลที่ต้องเห็น

อัปโหลดครั้งแรกได้ `201` มี `transactionId`, `contentType` เป็น `image/jpeg`, `byteSize` มากกว่า 0 และไม่มีคีย์ `url`

การขอลิงก์ได้ `200` มี `url` ที่ขึ้นต้นด้วย endpoint ของ MinIO และ `expiresAt` ห่างจากเวลาที่ขอประมาณ 15 นาที ยอมให้คลาดเคลื่อนได้ภายในหนึ่งนาที

Postman เปิดลิงก์นั้นได้ไบต์ของรูป สถานะ `200` การเปิดลิงก์ในเบราว์เซอร์เห็นภาพ

อัปโหลดซ้ำได้ `201` และลิงก์ใหม่ยังเปิดรูปได้

`notes.txt` ได้ `400` ข้อความ `Receipt must be an image up to 10 MiB`

ธุรกรรมที่ยังไม่มีรูปได้ `404` ข้อความ `Receipt for transaction <id> not found`

ในรายการธุรกรรม แถวที่อัปโหลดแล้วมี `hasReceipt: true`

ไม่มี Bearer ได้ `401` ถ้ายังไม่ onboard ได้ `403`

### ถ้าไม่ผ่าน

- `POST` ได้ 201 แต่มี `url` ในก้อนนั้น: ไปใส่ลิงก์ผิดเส้น ลิงก์อยู่ที่ `GET` เท่านั้น
- ลิงก์เปิดไม่ได้จากเครื่องคุณ: เซ็นด้วยโฮสต์ที่เห็นได้จากในคอนเทนเนอร์อย่าง `minio:9000` ให้ `S3_ENDPOINT` เป็น `http://localhost:9000` และ `forcePathStyle` เป็น true
- `expiresAt` ห่างเป็นชั่วโมงหรือเป็นวัน: `expiresIn` ไม่ได้เป็น 900 วินาที
- ไฟล์ใหญ่ได้ 500: `MulterError` ยังไม่ถูกจับเป็น 400
- รูปของผู้อื่นเปิดได้: ลืมกรอง `userId` ตอนหาธุรกรรม
- บัคเก็ตอ่านได้โดยไม่มีลายเซ็น: มี policy สาธารณะอยู่ ให้เอาออก วัตถุต้องเปิดผ่านลิงก์ที่เพิ่งเซ็นเท่านั้น

**ผ่านแล้วค่อยไปขั้นถัดไป**

---

## ขั้น 11 — ใบแจ้งหนี้และ PDF

### ทำไมขั้นนี้มาก่อน

flow ข้อ 4 คือออกใบแจ้งหนี้หนึ่งบรรทัด แล้วได้ PDF เงินของใบนี้ยังไม่ใช่รายได้จนกว่าลูกค้าจะจ่าย เพราะนักบำบัดที่เป็น sole trader ใช้เกณฑ์เงินสด รายได้เกิดเมื่อได้รับเงิน ไม่ใช่เมื่อส่งใบแจ้งหนี้ ตามหน้า cash basis ของ GOV.UK ขั้น 9 พร้อมรับแถวรายรับอยู่แล้ว ขั้นนี้เป็นการสร้างแถวนั้นตอนจ่ายเท่านั้น

ตัวสร้าง PDF ต้องเป็นฟังก์ชันบริสุทธิ์ของใบแจ้งหนี้กับชื่อผู้ใช้ และมีเทสโดยไม่เปิด HTTP ก่อนเขียน route

### ยังไม่ทำในขั้นนี้

ยังไม่ทำหน้า React ยังไม่ส่งใบแจ้งหนี้ทางอีเมล ยังไม่ทำหลายบรรทัด และยังไม่ทำ VAT สิ่งเหล่านี้อยู่ใน Phase 2

### แนวคิด

สร้างด้วย

```ts
interface CreateInvoice {
  clientName: string;
  service: string;
  amountPence: number;
  issuedOn?: string;
}
```

`clientName` กับ `service` ยาว 1 ถึง 200 `amountPence` เป็นจำนวนเต็ม 1 ถึง `100_000_000` `issuedOn` ไม่ส่งคือวันนี้ตาม `Europe/London` วันต้องอยู่ในปี 2026–27 ไม่งั้นข้อความ `Date is outside the 2026-27 tax year`

`POST /invoices` ได้ `201`

```ts
interface Invoice {
  id: number;
  number: string;
  clientName: string;
  service: string;
  amountPence: number;
  issuedOn: string;
  status: 'issued' | 'paid';
  paidOn?: string;
  transactionId?: number;
}
```

เลขที่ใบเป็น `TT-0001` ต่อผู้ใช้ เริ่มที่ 1 และอย่างน้อยสี่หลัก ใบที่สองเป็น `TT-0002` คำนวณใน `$transaction` จากจำนวนใบของผู้ใช้นั้นบวกหนึ่ง แล้ว `padStart(4, '0')` ข้อจำกัด `@@unique([userId, number])` ทำให้เลขซ้ำเขียนไม่สำเร็จ ถ้าเจอ `P2002` ให้ลองนับใหม่หนึ่งครั้ง ถ้ายังชนให้ตอบ `409` ข้อความ `Invoice number collided, retry` สัญญาไม่ได้ล็อกประโยคนี้ บทเรียนใช้ประโยคนี้สำหรับกรณีที่เกิดพร้อมกันจริง ๆ

สถานะเริ่มที่ `issued` การสร้างใบไม่สร้างแถวใน `Transaction` จึงไม่มี `paidOn` และไม่มี `transactionId` ใน JSON

`PATCH /invoices/:id` รับได้แค่

```ts
{ status: 'paid'; paidOn?: string }
```

`status` ต้องเป็น `paid` เท่านั้น ฟิลด์อื่นโดน pipe ปฏิเสธ เพราะไม่อยู่ใน DTO นี่คือการเปลี่ยนสถานะเดียวที่มี `paidOn` ไม่ส่งคือวันนี้ ต้องไม่ก่อน `issuedOn` และต้องอยู่ในปีภาษี ถ้าก่อนวันออกใบ ตอบ `400` ข้อความ `paidOn is before issuedOn`

ในธุรกรรมฐานข้อมูลเดียวกัน สร้างรายรับแล้วอัปเดตใบ

- `type` เป็น `income`
- `amountPence` คัดลอกจากใบ
- `occurredOn` คือ `paidOn`
- `note` คือเลขที่ใบ เพื่อให้แถวในฟีดชี้กลับไปที่ใบได้
- `invoiceId` ชี้มาที่ใบนี้
- ไม่มีหมวด ไม่มีไมล์

ตัวตอบ `200` เป็นใบเดิม พร้อม `paidOn` และ `transactionId` สรุปภาษีเห็นเงินนี้เพราะมันบวกรายรับ ไม่ได้บวกตารางใบแจ้งหนี้ ใบที่ยังไม่จ่ายไม่มีธุรกรรม จึงไม่อยู่ในประมาณการ

การปัดเงินสดในฟีดยังเป็นทางของเงินที่ไม่มีใบแจ้งหนี้ เซิร์ฟเวอร์ไม่จับคู่ให้ว่ารายการไหนซ้ำกับใบไหน หน้าเว็บในขั้น 12 ต้องไม่ยิง `POST /transactions` ซ้ำสำหรับเซสชันที่จะกดจ่ายบนใบ

จ่ายซ้ำได้ `409` ข้อความ `Invoice is already paid` แก้ชื่อลูกค้า บริการ หรือจำนวนเงินไม่ได้

`GET /invoices` ใช้ซอง `items`, `total`, `skip`, `limit` แบบขั้น 8 เรียง `issuedOn` จากใหม่ไปเก่า แล้ว `id` จากมากไปน้อย `GET /invoices/:id` ที่ไม่มี หรือเป็นของคนอื่น ได้ `404` ข้อความ `Invoice <id> not found`

`GET /invoices/:id/pdf` ได้ `200` หัวเป็น

```text
Content-Type: application/pdf
Content-Disposition: attachment; filename="<number>.pdf"
```

ในไฟล์มีชื่อนักบำบัด เลขที่ใบ `issuedOn` ชื่อลูกค้า บริการ จำนวนเงินเป็นปอนด์และเพนนี สถานะ และ `paidOn` เมื่อจ่ายแล้ว การสร้างเกิดในคำขอเดียวกันได้ หน้านี้ของ flow ยอมให้โหลดนานกว่าฟีด

จำนวนเงินใน PDF มาจากตัวแปลงที่ไม่มีทศนิยมลอย ปอนด์คือผลหารตัดเศษ เพนนีคือเศษสองหลัก เช่น `6500` เป็น `£65.00`

ฟังก์ชัน `invoicePdfLines` คืนบรรทัดเหล่านี้ตามลำดับ เทสล็อกข้อความตรงนี้ `buildInvoicePdf` วาดบรรทัดเหล่านั้นด้วย `pdf-lib` และฟอนต์มาตรฐาน แล้วคืน `Uint8Array` เทสของไบต์ตรวจสี่ไบต์แรกว่าเป็น `%PDF` เทสนี้ไม่ยิง HTTP

ทุกเส้นต้อง onboard แล้ว และกรองด้วย `userId`

### ไฟล์ของขั้นนี้

- `src/invoices/invoice-pdf.ts`
- `src/invoices/invoice-pdf.spec.ts`
- `src/invoices/dto/create-invoice.dto.ts`
- `src/invoices/dto/pay-invoice.dto.ts`
- `src/invoices/dto/list-invoices-query.dto.ts`
- `src/invoices/invoices.service.ts`
- `src/invoices/invoices.controller.ts`
- `src/invoices/invoices.module.ts`
- `src/app.module.ts` เพิ่ม `InvoicesModule`

ติดตั้งเอง

```bash
npm install pdf-lib
```

query DTO มี `skip` กับ `limit` กติกาเดียวกับรายการธุรกรรม ไม่มี `type`

controller ใช้ `StreamableFile` สำหรับ PDF

```ts
return new StreamableFile(Buffer.from(bytes), {
  type: 'application/pdf',
  disposition: `attachment; filename="${invoice.number}.pdf"`,
});
```

`filename` มาจากเลขที่ที่เซิร์ฟเวอร์ออกเอง จึงมีแต่รูปแบบ `TT-` ตามด้วยตัวเลข

โมดูล `imports: [AuthModule]`

### คำสั่งที่รันเอง

รันเทสก่อนเปิด route

```bash
npm test
```

ใช้ผู้ใช้ที่ onboard แล้ว ใส่ Bearer `{{token}}` จำ `incomePence` จาก `GET /tax/summary` ไว้ แล้วสร้างใบ £65.00 วันที่ 1 พฤษภาคม 2026 ที่แท็บ Tests ของคำขอสร้างใบ เก็บ id

```js
pm.environment.set('invoiceId', String(pm.response.json().id));
```

```text
POST {{baseUrl}}/invoices
```

```json
{"clientName":"North Clinic","service":"Sports massage","amountPence":6500,"issuedOn":"01-05-2026"}
```

```text
GET {{baseUrl}}/tax/summary
```

```text
GET {{baseUrl}}/transactions?type=income
```

จากนั้นจ่ายวันที่ 2 พฤษภาคม

```text
PATCH {{baseUrl}}/invoices/{{invoiceId}}
```

```json
{"status":"paid","paidOn":"02-05-2026"}
```

```text
GET {{baseUrl}}/tax/summary
```

```text
GET {{baseUrl}}/transactions?type=income
```

ดาวน์โหลด PDF กดลูกศรข้าง Send แล้วเลือก Send and Download บันทึกเป็น `TT-check.pdf` ดูหัวในแท็บ Headers

```text
GET {{baseUrl}}/invoices/{{invoiceId}}/pdf
```

จ่ายซ้ำ

```text
PATCH {{baseUrl}}/invoices/{{invoiceId}}
```

```json
{"status":"paid"}
```

เปิด `TT-check.pdf` ด้วยตัวอ่าน PDF

### ผลที่ต้องเห็น

เทสของบรรทัด PDF ผ่าน ไบต์ขึ้นต้นด้วย `%PDF` เทส £20,000 และไมล์ 11,000 ยังผ่าน

สร้างใบได้ `201` เลขที่เป็น `TT-` ตามด้วยอย่างน้อยสี่หลัก `status` เป็น `issued` ไม่มี `paidOn` และไม่มี `transactionId`

หลังสร้างและก่อนจ่าย `incomePence` เท่ากับค่าที่จำไว้ก่อนสร้างใบ รายการรายรับไม่มีแถวที่ `note` เป็นเลขที่ใบนี้

หลังจ่ายได้ `200` มี `paidOn` เป็น `02-05-2026` และมี `transactionId` ฟีดมีรายรับยอด `6500` วัน `02-05-2026` โน้ตเป็นเลขที่ใบ ไม่มี `categorySlug` และไม่มี `miles`

`incomePence` เพิ่มอีก `6500` จากค่าก่อนจ่าย

หัวของ PDF เป็น `application/pdf` และ `Content-Disposition` มี `attachment; filename="TT-0001.pdf"` หรือเลขที่จริงของใบนั้น ไฟล์ขึ้นต้นด้วย `%PDF` เมื่อเปิดแล้วเห็นชื่อผู้ใช้ เลขที่ วันที่ออก ชื่อคลินิก บริการ `£65.00` สถานะจ่ายแล้ว และวันที่จ่าย

จ่ายซ้ำได้ `409` ข้อความ `Invoice is already paid`

การส่ง `paidOn` ก่อน `issuedOn` ได้ `400` ข้อความ `paidOn is before issuedOn`

`PATCH` ที่ส่ง `clientName` ติดมาด้วยได้ `400` และ `message` เป็น array

แถวรายรับที่ผูกใบนี้ แก้หรือลบผ่าน `/transactions/:id` ได้ `409` ข้อความ `Invoice income is changed by updating the invoice`

### ถ้าไม่ผ่าน

- สร้างใบแล้วยอดภาษีขยับทันที: มีคนสร้างแถวรายรับใน `POST /invoices` ให้สร้างเฉพาะตอนสถานะเป็น `paid`
- จ่ายแล้วสรุปภาษีไม่ขยับ: แถวรายรับไม่ถูกสร้างในธุรกรรมเดียวกัน หรือ `occurredOn` นอกปีที่สรุปบวก
- PDF เป็น JSON: handler คืนออบเจกต์ใบแจ้งหนี้แทน `StreamableFile`
- ฟอนต์พิเศษทำให้เทสต้องเปิดเบราว์เซอร์: ใช้ฟอนต์มาตรฐานของ `pdf-lib` และล็อกข้อความที่ฟังก์ชันบรรทัด ไม่ต้องถอดข้อความจากไบต์ PDF
- เลขที่ใบเป็น `TT-1`: ยังไม่ได้ `padStart(4, '0')`

**ผ่านแล้วค่อยไปขั้นถัดไป** ฝั่ง API ที่ user flow ใช้ครบแล้ว ขั้น 12 คือหน้าตา ไม่เพิ่มกติกาเงินกติกาใหม่

---

## ขั้น 12 — หน้า React

### ทำไมขั้นนี้มาท้ายสุด

หน้าเว็บเป็นลูกค้าของสัญญา ถ้าขีดหน้าก่อนที่คำขอ Postman ของขั้นนั้นจะผ่าน ปุ่มจะพังโดยไม่รู้ว่าพังที่ฟอร์มหรือที่ API ทำทีละหน้าตาม [`01_user_flow.md`](01_user_flow.md) ตรวจในเบราว์เซอร์ให้จบหน้าปัจจุบันก่อนสร้างไฟล์ของหน้าถัดไป

มีหน้าเข้าสู่ระบบนำหน้า flow ทั้งห้าข้อ เพราะไม่มีโทเคนก็เรียก onboarding ไม่ได้ มันไม่ใช่ข้อใน user flow แต่เป็นประตูของ API

flow ข้อ 2 กับ 3 ใช้ระหว่างลูกค้าทุกคน ต้องจบในคำขอเดียวต่อการจด และอีกคำขอเดียวเมื่อมีรูป ห้ามให้สองหน้านี้รอสรุปภาษีหรือรอการสร้าง PDF ข้อ 4 กับ 5 เกิดไม่บ่อย โหลดนานกว่าได้

### ยังไม่ทำในขั้นนี้

ยังไม่เพิ่ม endpoint ฝั่ง Nest นอกจากเปิด CORS ให้ต้นทาง `http://localhost:5173` การเปิด CORS ไม่ใช่โดเมนธุรกิจ มันทำให้เบราว์เซอร์ที่คนละพอร์ตส่ง `Authorization` ได้ เพราะหัวนั้นทำให้เบราว์เซอร์ยิง preflight

ใน `bootstrap` ก่อน `listen`

```ts
app.enableCors({ origin: 'http://localhost:5173' });
```

ยังไม่ทำ Phase 2 ไม่ทำหน้าตั้งผังบัญชี และไม่ทำหน้าเปลี่ยน `expenseMethod` หลัง onboard

### แนวคิด

แอปใหม่อยู่โฟลเดอร์ `client/` สร้างด้วย Vite, React และ TypeScript ติดตั้งเมื่อถึงขั้นนี้เท่านั้น จากรูทของรีโป

```bash
npm create vite@latest client -- --template react-ts
npm install --prefix client react-router-dom
```

รัน API ที่พอร์ต 3000 กับหน้าเว็บที่พอร์ต 5173 พร้อมกัน

```bash
npm run start:dev
npm run dev --prefix client
```

ที่อยู่ของ API เป็นค่าคงที่ `http://localhost:3000` ไม่มี prefix `/api`

ตัวช่วย `client/src/api.ts` อ่าน `accessToken` จาก `localStorage` แล้วใส่หัว `Authorization: Bearer` ให้ทุกคำขอ ยกเว้นตอนสมัครและล็อกอินซึ่งยังไม่มีโทเคน ถ้าตัวตอบไม่สำเร็จ ให้อ่าน `message` สองรูป: array ให้ต่อเป็นข้อความที่คนอ่านได้ สตริงให้แสดงตรง ๆ ถ้าได้ `401` ระหว่างมีโทเคนเก่า ให้ลบโทเคนแล้วกลับหน้าเข้าสู่ระบบ

อย่าตั้ง `Content-Type` เองตอนส่ง `FormData` เบราว์เซอร์ต้องใส่ boundary ของ multipart ให้

เงินบนหน้าจอเป็นปอนด์ สองช่องแยกกันคือปอนด์จำนวนเต็มกับเพนนี 0 ถึง 99 แปลงเป็นเพนนีด้วยการคูณจำนวนเต็ม ไม่ใช้ `Number("65.10") * 100` เพราะทศนิยมลอยตัวขยับเพนนีได้

ตอนเปิดแอป ถ้าไม่มีโทเคนให้ขึ้นหน้าเข้าสู่ระบบ ถ้ามี ให้เรียก `GET /users/me` ถ้า `onboardedAt` เป็น `null` ให้ขึ้นหน้า onboarding เท่านั้น ถ้ามีค่าแล้วให้เข้าฟีด หน้าใบแจ้งหนี้และหน้าสรุปภาษีอยู่ในเมนูหลังประตูนี้

### หน้าเข้าสู่ระบบ

ไฟล์ช่วงนี้มีได้แค่ `client/src/api.ts`, `client/src/pages/SignInPage.tsx` และจุดต่อใน `client/src/App.tsx` ยังไม่สร้างหน้า onboarding

ฟอร์มสมัครมีอีเมล รหัสผ่าน ชื่อ ฟอร์มล็อกอินมีอีเมลกับรหัสผ่าน รหัสสั้นกว่า 8 ตัวให้แสดง array ที่ pipe ส่งมา อีเมลซ้ำให้แสดง `Email already registered` รหัสผิดให้แสดง `Invalid email or password` โดยไม่เดาเองว่าส่วนไหนผิด

เมื่อได้ `accessToken` ให้เก็บ แล้วเรียก `GET /users/me`

ตรวจในเบราว์เซอร์: สมัครผู้ใช้ใหม่ เห็นว่าคำขอเป็น `201` ในแท็บ Network รีเฟรชหน้าแล้วยังล็อกอินอยู่ เพราะโทเคนถูกอ่านกลับมาและ `GET /users/me` ได้ `200` กดล็อกเอาต์แล้วยิง `GET /users/me` โดยไม่มีโทเคนไม่ได้จากหน้านี้ หน้าต้องกลับไปฟอร์ม

**ผ่านหน้านี้แล้วค่อยทำหน้าถัดไป**

### หน้า onboarding

นี่คือ flow ข้อ 1 ทำครั้งเดียว

สองตัวเลือกที่ผู้ใช้เห็นต้องแมปเข้าสัญญาให้ตรง

| บนหน้าจอ | ค่าที่ส่ง |
| --- | --- |
| เดินทางไปหาลูกค้า | `practiceType: mobile` |
| คลินิก | `practiceType: fixedLocation` |
| ทั้งสองอย่าง | `practiceType: mixed` |
| ไมล์แบบอัตราเดียว | `expenseMethod: flat_rate` |
| ค่าพาหนะตามที่จ่ายจริง | `expenseMethod: actual_cost` |

ข้างตัวเลือกวิธีคิดค่าพาหนะ ให้เขียนว่าวิธีนี้ใช้กับรถเท่านั้น น้ำมันของนวด ค่า HCPC ประกัน และค่าซัก ยังกรอกเป็นจำนวนเงิน หลังเลือก flat rate แล้วเปลี่ยนกลับไม่ได้ เพราะ API ตอบ `409`

ส่ง `PATCH /users/me/onboarding` ครั้งเดียว เมื่อสำเร็จ `onboardedAt` ไม่เป็น `null` แล้วเข้าฟีด ผู้ใช้ที่ onboard แล้วเปิดแอปมาต้องไม่เห็นฟอร์มนี้อีก

ตรวจ: สมัครบัญชีใหม่ ต้องติดหน้านี้ก่อนเห็นฟีด เลือกเดินทางไปหาลูกค้าและไมล์แบบอัตราเดียว แล้วฟีดว่างขึ้นมาได้ รีเฟรชแล้วยังอยู่ฟีด ถ้าเรียก onboarding ซ้ำจากเครื่องมือนักพัฒนา หน้าต้องแสดง `Onboarding already completed` เมื่อได้รับ 409

**ผ่านหน้านี้แล้วค่อยทำหน้าถัดไป**

### ฟีด

นี่คือ flow ข้อ 2 ไฟล์ใหม่คือหน้าฟีด ตัวกรองหมวด และ `client/src/hint.ts` ยังไม่ใส่ปุ่มแนบรูป และยังไม่ทำหน้าใบแจ้งหนี้

ตอนเข้าฟีดให้เรียก `GET /expense-categories` หนึ่งครั้ง แล้วเก็บไว้ กรองหมวดตาม `expenseMethod` ของผู้ใช้

- `flat_rate` เหลือ kind `general` กับ `mileage`
- `actual_cost` เหลือ kind `general` กับ `vehicle_actual`

hint ไม่มี endpoint ให้เดินตามนี้ในเบราว์เซอร์ทุกครั้งที่โน้ตเปลี่ยน

1. ใช้เฉพาะหมวดที่วิธีคิดค่าพาหนะอนุญาต ตามลำดับใน array ที่ API ส่งมา
2. ทำโน้ตเป็นตัวพิมพ์เล็ก หมวดแรกที่ keyword คำใดคำหนึ่งเป็นสตริงย่อยของโน้ต คือคำแนะนำ
3. โน้ตว่าง หรือไม่มีคำตรง ให้ผู้ใช้เลือกเอง `other` ไม่มี keyword จึงไม่ถูกแนะนำ

คำว่า `petrol` ใต้ flat rate ต้องแนะนำ `mileage` และฟอร์มให้กรอกไมล์ ไม่ให้กรอกจำนวนเงิน เพราะเซิร์ฟเวอร์คำนวณ ใต้ actual cost คำเดียวกันต้องแนะนำ `vehicle-costs` และให้กรอกเงิน โน้ต `train to clinic` ไม่แนะนำหมวดไหน ที่จอดรถและค่าทางด่วนผู้ใช้เลือก `other` เองแล้วกรอกเงิน

การบันทึกคือ `POST /transactions` คำขอเดียว วันไม่กรอกได้ เซิร์ฟเวอร์ใส่วันนี้ของลอนดอนให้ รายการเรียก `GET /transactions` เรียงรายการล่าสุดไว้บน แสดงเงินเป็นปอนด์จาก `amountPence` แถวไมล์โชว์จำนวนไมล์คู่กับเงินที่เซิร์ฟเวอร์คิด แถวที่ `hasReceipt` เป็น `false` ยังไม่มีปุ่มรูปในหน้านี้

ตรวจในแท็บ Network ขณะจดหนึ่งรายการ: มี `POST /transactions` หนึ่งครั้ง ไม่มีคำขอไปเส้น hint และไม่มี `GET /tax/summary` รายรับเงินสดขึ้นบนฟีดโดยไม่มีหมวด พิมพ์ `oils` แล้วคำแนะนำเป็น Oils and consumables ก่อนกดบันทึก

**ผ่านหน้านี้แล้วค่อยทำหน้าถัดไป**

### แนบรูป

นี่คือ flow ข้อ 3 ยังอยู่บนแถวของฟีด ไม่เปิดหน้าใหม่ให้คลิกหลายชั้น เพราะขั้นนี้ต้องเร็ว

แถวที่ `hasReceipt` เป็น `false` มีช่องเลือกไฟล์ เมื่อเลือกแล้วให้ `POST /transactions/:id/receipt` ด้วยฟิลด์ `file` ทันที จากนั้น `GET /transactions/:id/receipt` แล้วนำ `url` ไปใส่ `src` ของ `<img>` ไม่ต้องเก็บ URL ลง `localStorage` เพราะมันหมดใน 15 นาที เปิดแถวเดิมอีกครั้งให้ขอลิงก์ใหม่

ไฟล์ที่ไม่ใช่รูปให้แสดงข้อความ `400` และแถวยังเป็นสถานะไม่มีใบเสร็จ

ตรวจ: เลือก JPEG แล้วเห็นรูปในแถว รีเฟรชแล้วขอลิงก์ใหม่ยังเห็นรูป เลือกไฟล์ `.txt` แล้วเห็นข้อความปฏิเสธ ระหว่างทำสองอย่างนี้แท็บ Network ยังไม่มีคำขอสรุปภาษีหรือ PDF

**ผ่านหน้านี้แล้วค่อยทำหน้าถัดไป**

### ใบแจ้งหนี้

นี่คือ flow ข้อ 4 ฟอร์มมีชื่อลูกค้า บริการ ปอนด์ เพนนี และวันออกใบถ้าว่างได้

กดสร้างแล้วเรียก `POST /invoices` เท่านั้น ห้ามตามด้วย `POST /transactions` รายการใบแสดงเลขที่ สถานะ `issued` และยังไม่มีวันจ่าย ฟีดไม่เพิ่มรายรับ

ปุ่ม PDF เรียก `GET /invoices/:id/pdf` แล้วให้เบราว์เซอร์ดาวน์โหลดตามชื่อไฟล์ใน `Content-Disposition` ปุ่มจ่ายเรียก `PATCH` ด้วย `{ "status": "paid" }` หลังสำเร็จแถวใบมี `transactionId` และฟีดมีรายรับโน้ตเป็นเลขที่ใบ

ตรวจสามสถานะเรียงกัน: ก่อนจ่าย ฟีดกับเลข `incomePence` ที่เคยรู้ไม่ขยับเพราะใบอย่างเดียว, ดาวน์โหลด PDF แล้วเปิดเห็นชื่อ เลขที่ ลูกค้า บริการ และจำนวนเงิน, หลังจ่ายฟีดมีรายรับยอดเดียวกัน กดจ่ายซ้ำแล้วเห็น `Invoice is already paid`

**ผ่านหน้านี้แล้วค่อยทำหน้าถัดไป**

### สรุปภาษี

นี่คือ flow ข้อ 5 เรียก `GET /tax/summary` เมื่อเปิดหน้านี้เท่านั้น ไม่เรียกซ้ำทุกครั้งที่พิมพ์ในฟีด

แสดงช่วง `periodStart` ถึง `periodEnd`, วิธีคิดค่าพาหนะ, รายรับ, ค่าใช้จ่ายที่หักได้, `netProfitPence` แม้ติดลบ, ภาษีโดยประมาณจาก `estimatedTaxOwedPence`, และบรรทัด Class 2 ถ้า `treatedAsPaid` เป็นจริงให้บอกว่าถูกถือว่าจ่ายแล้ว ถ้าไม่จริงให้บอกอัตราสมัครใจจาก `voluntaryWeeklyPence` โดยไม่บวกเข้าก้อนภาษีโดยประมาณ

แสดง `assumptions` ทั้งหกข้อตามลำดับ และ `disclaimer` ทั้งประโยคตรงกับที่ API ส่ง

ตรวจ: ตัวเลขบนหน้าตรงกับคำขอ Postman ของผู้ใช้คนเดียวกัน ใบที่ยังไม่จ่ายไม่ทำให้ยอดขยับ หลังกลับไปจ่ายบนหน้าใบแจ้งหนี้แล้วเปิดหน้านี้ใหม่ ยอดรายรับเพิ่มเท่าจำนวนบนใบนั้น หน้าฟีดยังจดรายการได้โดยไม่รอให้หน้านี้โหลด

**ผ่านหน้านี้แล้ว บทเรียนจบ**

### ถ้าไม่ผ่าน

- เบราว์เซอร์ขึ้น CORS: ยังไม่ได้ `enableCors` สำหรับ `http://localhost:5173` หรือ API ไม่ได้รีสตาร์ต
- ทุกคำขอหลังล็อกอินได้ 401: เก็บโทเคนแล้ว แต่ตัวช่วยลืมใส่ `Bearer ` พร้อมช่องว่าง
- อัปโหลดรูปแล้วเซิร์ฟเวอร์ไม่เห็นไฟล์: ไปตั้ง `Content-Type: application/json` ทับ `FormData`
- hint ยิง request: มีคนสร้างเส้น hint ฝั่ง API ให้ลบการเรียกนั้น คำแนะนำมาจาก keywords ในหน่วยความจำ
- จดไมล์แล้วยอดเป็น 0: ฟอร์มยังส่ง `amountPence` คู่กับ `miles` ฝั่ง flat rate ให้ส่งเฉพาะ `miles`
- สร้างใบแจ้งหนี้แล้วฟีดมีรายรับทันที: หน้าใบแจ้งหนี้ไปยิง `POST /transactions` เพิ่ม ให้เหลือแค่ `POST /invoices` จนกว่าจะกดจ่าย
- ตัวเลขภาษีบนหน้าไม่ตรงคำขอ Postman: หน้าไปคำนวณอัตราเอง ให้แสดงตัวเลขจาก `GET /tax/summary` ตรง ๆ

## เมื่อเดินครบสิบสองขั้น

โครงที่เกิดขึ้นตามลำดับ เป็นรูปนี้

```text
prisma/schema.prisma
prisma.config.ts
src/main.ts
src/app.module.ts
src/prisma/
src/tax-engine/          ฟังก์ชันภาษี ไมล์ วันที่ และ GET /tax/summary
src/auth/                สมัคร ล็อกอิน ผู้ใช้ปัจจุบัน onboarding
src/expense-categories/  เจ็ดหมวด
src/transactions/        ฟีดรายรับรายจ่าย
src/upload/              รูปใบเสร็จและลิงก์ 15 นาที
src/invoices/            ใบแจ้งหนี้และ PDF
client/                  หน้า React ตาม user flow
```

สิ่งที่อยู่นอกบทเรียนคือ Phase 2 ใน [`api-spec.md`](api-spec.md) ไม่มีใบแจ้งหนี้หลายบรรทัด ไม่มี VAT ไม่มีภาษีสกอตแลนด์ ไม่มีไมล์มอเตอร์ไซค์ ไม่มีการเปลี่ยน `expenseMethod` หลัง onboarding และไม่มีปีภาษีอื่นนอกจาก 2026–27

จบแต่ละขั้นเมื่อคำสั่งตรวจของขั้นนั้นให้ผลตรงที่เขียนไว้แล้วเท่านั้น


