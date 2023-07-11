import { PrismaClient } from "@prisma/client";
import { Iconv } from "iconv";
import fs from "fs";


const prisma = new PrismaClient()

async function main() {
  // ... you will write your Prisma Client queries here

  // read rnaddrkor_sejong.txt async and insert to db
  // readfile with euc-kr encoding
  const iconv = new Iconv('euc-kr', 'UTF-8');

  const data = fs.readFileSync('./rnaddrkor_sejong.txt');
  const lines = iconv.convert(data).toString().split(/\r?\n/);

  await createTable();

  for (let i = 0; i < lines.length; i++) {
    const row = lines[i].split('|');

    const addr = {
      road_address_id: row[0],
      legal_dong_code: row[1],
      city_name: row[2],
      district_name: row[3],
      town_name: row[4],
      ri_name: row[5],
      mountain_yn: row[6] === "1",
      house_number: parseInt(row[7]),
      detail_address_number: parseInt(row[8]),
      road_code: row[9],
      road_name: row[10],
      underground_yn: row[11][0],
      building_main_number: BigInt(row[12]),
      building_sub_number: BigInt(row[13]),
      administrative_dong_code: row[14],
      administrative_dong_name: row[15],
      postal_code: row[16],
      old_road_address: row[17],
      effective_date: convertDateTime(row[18]),
      apartment_type: row[19][0],
      move_reason_code: row[20],
      building_name: row[21],
      district_building_name: row[22],
      remarks: row[23],
    };

    console.log(addr);
    await prisma.rnaddrkor.create({
      data: addr,
    });
  }
}

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (e) => {
    console.error(e)
    await prisma.$disconnect()
    process.exit(1)
  })


function convertDateTime(value: string): Date {
  const year = parseInt(value.substring(0, 4));
  const month = parseInt(value.substring(4, 6));
  const day = parseInt(value.substring(6, 8));
  return new Date(year, month - 1, day);
}

async function createTable() {
  await prisma.$executeRaw`
          CREATE TABLE IF NOT EXISTS rnaddrkor
          (
            road_address_id varchar(26) not null, -- 도로명주소관리번호
            legal_dong_code varchar(20) not null, -- 법정동코드
            city_name varchar(40) not null, -- 시도명
            district_name varchar(40) not null, -- 시군구명
            town_name varchar(40) not null, -- 읍면동명
            ri_name varchar(40) not null, -- 리명
            mountain_yn boolean not null, -- 산여부
            house_number int not null, -- 건물본번
            detail_address_number int not null, -- 건물부번
            road_code varchar(12) not null, -- 도로명코드
            road_name varchar(80) not null, -- 도로명
            underground_yn char(1) not null, -- 지하여부
            building_main_number bigint not null, -- 건물관리번호본번
            building_sub_number bigint not null, -- 건물관리번호부번
            administrative_dong_code varchar(60) not null, -- 행정동코드
            administrative_dong_name varchar(60) not null, -- 행정동명
            postal_code char(5) not null, -- 우편번호
            old_road_address varchar(400) not null, -- 지번주소
            effective_date timestamp not null, -- 작성일자
            apartment_type char(1) not null, -- 아파트구분
            move_reason_code char(2) not null, -- 이동사유코드
            building_name varchar(400) not null, -- 건물명
            district_building_name varchar(400) not null, -- 시군구건물명
            remarks varchar(200) not null, -- 비고
            PRIMARY KEY (road_address_id, road_code, underground_yn, building_main_number, building_sub_number)
          );`;
  await prisma.$executeRaw`
    DO $$ BEGIN
            IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE tablename = 'rnaddrkor' AND indexname = 'idx_rnaddrkor_city_district_town') THEN
              CREATE INDEX idx_rnaddrkor_city_district_town ON rnaddrkor USING GIN (to_tsvector('simple', rnaddrkor.city_name || ' ' || rnaddrkor.district_name || ' ' || rnaddrkor.town_name));
            END IF;
            IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE tablename = 'rnaddrkor' AND indexname = 'idx_rnaddrkor_city_district_road') THEN
              CREATE INDEX idx_rnaddrkor_city_district_road ON rnaddrkor USING GIN (to_tsvector('simple', rnaddrkor.city_name || ' ' || rnaddrkor.district_name || ' ' || rnaddrkor.road_name));
            END IF;
            IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE tablename = 'rnaddrkor' AND indexname = 'idx_rnaddrkor_postal_code') THEN
              CREATE INDEX idx_rnaddrkor_postal_code ON rnaddrkor (postal_code);
            END IF;
          END $$;
    `;
}
