import { Server, Socket } from "socket.io";
import { type CollectionList } from "./connect";
import type { CharacterInfo, ClientEvents, Scene, ServerEvents } from "@trpg/shared";
import { ObjectId } from "mongodb";

const port = 3333;

const io = new Server<ClientEvents, ServerEvents>({
  cors: {
    origin: "*",
  },
});

const socketToPlayer = new Map<
  Socket<ClientEvents, ServerEvents>,
  { characterId: string; characterName: string }
>();
const socketToDM = new Map<Socket<ClientEvents, ServerEvents>, string>();

export function initSocket(collections: CollectionList) {
  io.listen(port);
  console.log(`websocket开始监听${port}端口`);

  io.on("connection", async (socket) => {
    socketToPlayer.forEach((e) => {
      console.log(e);
    });

    socket.on("signIn: signInAsDM", (gameInstanceId) => {
      registerDMSocket(socket, gameInstanceId, collections, { broadcastUpdateToPlayers });
    });

    socket.on("signIn: signInAsPlayer", async (characterId) => {
      const character = await collections.characters.findOne({ _id: characterId });
      if (!character) {
        console.log(`客户端上传了不存在的 characterId: ${characterId} `);
        return;
      }

      sendInitDataToSinglePlayerSocket(socket, character);
      socketToPlayer.set(socket, { characterId, characterName: character.name });
    });
  });

  async function sendInitDataToSinglePlayerSocket(
    socket: Socket<ClientEvents, ServerEvents>,
    characterInfo: CharacterInfo
  ) {
    socket.emit("data: playerCharacter", characterInfo);
  }

  function broadcastUpdateToPlayers() {
    socketToPlayer.forEach((e, socket) => {
      collections.characters.findOne({ _id: e.characterId }).then((playerCharacterInfo) => {
        if (playerCharacterInfo) socket.emit("data: playerCharacter", playerCharacterInfo);
      });
    });
  }

  function broadcastSceneMapUpdateToPlayers() {}
}

async function registerDMSocket(
  socket: Socket<ClientEvents, ServerEvents>,
  gameInstanceId: string,
  collections: CollectionList,
  tasks: {
    broadcastUpdateToPlayers: () => void;
  }
) {
  const gameInstance = await collections.games.findOne({ _id: gameInstanceId });
  if (!gameInstance) {
    console.log(`客户端上传了不存在的 gameId: ${gameInstanceId} `);
    return;
  }

  socketToDM.set(socket, gameInstanceId);
  sendInitDataToDMSocket(socket, gameInstanceId);
  attachSharedEventToSocket(socket, gameInstanceId, collections);
  attachEventToSocket(socket, gameInstanceId);

  // function declaration
  async function sendInitDataToDMSocket(
    socket: Socket<ClientEvents, ServerEvents>,
    gameInstanceId: string
  ) {
    collections.characters
      .find({ gameInstanceId })
      .toArray()
      .then((characterList) => {
        socket.emit("data: allCharactersInfo", characterList);
      });

    collections.scenes
      .find({ gameInstanceId })
      .toArray()
      .then((scenes) => {
        socket.emit("data: allScenes", scenes);
      });

    collections.messages
      .find({ gameInstanceId })
      .toArray()
      .then((messages) => {
        socket.emit("data: allMessage", messages);
      });
    collections.spells
      .find()
      .toArray()
      .then((spells) => {
        socket.emit("data: allSpellInfo", spells);
      });
  }

  function attachEventToSocket(socket: Socket<ClientEvents, ServerEvents>, gameInstanceId: string) {
    socket.on("operator: createCharacterInfo", async (data) => {
      data.gameInstanceId = gameInstanceId;
      data._id = new ObjectId().toString();
      await collections.characters.insertOne(data);
      const allCharactersInfo = await collections.characters.find({ gameInstanceId }).toArray();
      socket.emit("data: allCharactersInfo", allCharactersInfo);
    });
    socket.on("operator: updateCharacterInfo", async (characterId, characterInfo) => {
      delete characterInfo._id;
      await collections.characters.updateOne({ _id: characterId }, { $set: characterInfo });

      const allCharactersInfo = await collections.characters.find({ gameInstanceId }).toArray();
      tasks.broadcastUpdateToPlayers();
      socket.emit("data: allCharactersInfo", allCharactersInfo);
    });

    socket.on("operator: createSceneInfo", async (data: Scene) => {
      data.gameInstanceId = gameInstanceId;
      data._id = new ObjectId().toString();
      await collections.scenes.insertOne(data);
      sendAllScenesInfo(gameInstanceId, socket);
    });

    socket.on("operator: updateSceneInfo", async (id, data) => {
      delete data._id;
      await collections.scenes.updateOne({ _id: id }, { $set: data });
      sendAllScenesInfo(gameInstanceId, socket);
    });

    socket.on("operator: updateSpellInfo", async (id, data) => {
      delete data._id;
      await collections.spells.updateOne({ _id: id }, { $set: data });

      const allSpellInfo = await collections.spells.find().toArray();
      socket.emit("data: allSpellInfo", allSpellInfo);
    });

    socket.on("operator: deleteCharacterInfo", async (characterId) => {
      await collections.characters.deleteOne({ _id: characterId });

      const allCharactersInfo = await collections.characters.find({ gameInstanceId }).toArray();
      socket.emit("data: allCharactersInfo", allCharactersInfo);
    });
  }

  function sendAllScenesInfo(gameInstanceId: string, socket: Socket<ClientEvents, ServerEvents>) {
    collections.scenes
      .find({ gameInstanceId })
      .toArray()
      .then((docs) => {
        socket.emit("data: allScenes", docs);
      });
  }
}

function attachSharedEventToSocket(
  socket: Socket<ClientEvents, ServerEvents>,
  gameInstanceId: string,
  collections: CollectionList
) {
  socket.on("operator: rollDice", async (characterId, diceType) => {
    let characterName = "DM";
    if (characterId !== "DM") {
      const characterInfo = await collections.characters.findOne({ _id: characterId });
      if (!characterInfo) return;
      characterName = characterInfo.name;
    }

    function rollDice(diceType: number) {
      return Math.ceil(Math.random() * diceType);
    }
    const result = rollDice(diceType);
    await writeMessage(
      collections.messages,
      gameInstanceId,
      `${characterName} 投出了(d${diceType}) ${result} `
    );
    broadcastMessages(gameInstanceId);
  });

  socket.on("message: sendMessage", (message) => {
    writeMessage(collections.messages, gameInstanceId, message);
    broadcastMessages(gameInstanceId);
  });

  function broadcastMessages(gameInstanceId: string) {
    collections.messages
      .find({ gameInstanceId })
      .toArray()
      .then((docs) => {
        io.emit("data: allMessage", docs);
      });
  }
}

function writeMessage(
  messageCollection: CollectionList["messages"],
  gameInstanceId: string,
  messageContent: string
) {
  messageCollection.insertOne({
    content: messageContent,
    gameInstanceId,
    _id: new ObjectId().toString(),
  });
}
