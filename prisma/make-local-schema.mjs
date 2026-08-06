// 로컬 개발용 SQLite 스키마를 canonical schema.prisma 에서 파생한다.
// (배포는 Postgres, 로컬은 Postgres 미설치 환경이라 SQLite로 검증)
// 모델 정의는 동일하고 datasource provider 만 sqlite 로 바꾼다 → 드리프트 없음.
import { readFileSync, writeFileSync } from 'node:fs';

const src = readFileSync(new URL('./schema.prisma', import.meta.url), 'utf8');
const local = src
  .replace('provider  = "postgresql"', 'provider = "sqlite"')
  .replace(/\n\s*directUrl = env\("DATABASE_URL_UNPOOLED"\)/, '');
writeFileSync(new URL('./schema.local.prisma', import.meta.url), local);
console.log('✅ prisma/schema.local.prisma 파생 완료 (sqlite)');
