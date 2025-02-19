import * as mongoDB from "mongodb";
import * as dotenv from "dotenv";
import type {
  CanvasMap,
  CharacterInfo,
  GameInstance,
  Message,
  Scene,
  SpellInfo,
} from "@trpg/shared";

export async function useMongoDB() {
  dotenv.config();
  if (!process.env.DB_CONN_STRING) {
    throw Error("未配置正确的 mongoDB 连接地址");
  }
  if (!process.env.DB_NAME) {
    throw Error("未配置正确的 mongoDB 数据库名称");
  }

  const connString = process.env.DB_CONN_STRING;
  const client: mongoDB.MongoClient = new mongoDB.MongoClient(connString);

  await client.connect();
  const db = client.db(process.env.DB_NAME);

  const collections = {
    games: db.collection<GameInstance>("games"),
    characters: db.collection<CharacterInfo>("characters"),
    spells: db.collection<SpellInfo>("spells"),
    equipments: db.collection("equipments"),
    scenes: db.collection<Scene>("scenes"),
    messages: db.collection<Message>("messages"),
    CanvasMaps: db.collection<CanvasMap>("CanvasMaps"),
  };

  console.log(`Successfully connected to database: ${db.databaseName} `);

  return { collections, client };
}

export type CollectionList = Awaited<ReturnType<typeof useMongoDB>>["collections"];
