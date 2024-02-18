import WebSocket, { WebSocketServer } from "ws";
const wss = new WebSocketServer({port: 8080});

// 用於存儲客戶端的使用者列表
const clients = {};
const rooms = {};

wss.on("connection", (connection) => {
  console.log("新使用者已經連線");

  connection.on("message", (message) => {
    const parsedMessage = JSON.parse(message);
    console.log(`收到訊息 => ${message}`);
    if (parsedMessage.type === "register") {
      const userId = parsedMessage.userId;
      clients[userId] = connection;
      connection.userId = userId;

      const otherClients = Object.keys(clients);
      let allRooms = [];
      for (const [key, value] of Object.entries(rooms)) {
        let id = key;
        let name = value.name;
        let people = value.userList.length;
        allRooms.push({id, name, people});
      }
      wss.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(JSON.stringify({ type: "registered", otherClients, allRooms }));
        }
      });

      return;
    }
    
    if(parsedMessage.type === "createRoom"){
      let roomID = parsedMessage.roomID;
      rooms[roomID] = {
        id: parsedMessage.roomID,
        name: parsedMessage.roomName
      }
      rooms[roomID].userList = [];
      rooms[roomID].userList.push(parsedMessage.fromID);
      let allRooms = [];
      for (const [key, value] of Object.entries(rooms)) {
        let id = key;
        let name = value.name;
        let people = value.userList.length;
        allRooms.push({id, name, people});
      }
      wss.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(JSON.stringify({ type: "newRoom", allRooms }));
        }
      });
      return;
    }

    if(parsedMessage.type === "joinRoom"){
      let roomID = parsedMessage.roomID;
      let fromID = parsedMessage.fromID;
      if(rooms[roomID].userList.length >= 2){
        const targetClient = clients[fromID];
        let allRooms = [];
        for (const [key, value] of Object.entries(rooms)) {
          let id = key;
          let name = value.name;
          let people = value.userList.length;
          allRooms.push({id, name, people});
        }
        if (targetClient && targetClient.readyState === WebSocket.OPEN) {
          targetClient.send(JSON.stringify({ type: "rejectRoom", message: "人數已滿", allRooms}));
        }
        return false;
      }
      rooms[roomID].userList.push(fromID);
      let clientList = rooms[roomID].userList;
      rooms[roomID].userList.forEach(userID=>{
        const targetClient = clients[userID];
        if (targetClient && targetClient.readyState === WebSocket.OPEN) {
          targetClient.send(JSON.stringify({ type: "joinRoom", fromID, roomID, clientList}));
        }
      });
      return;
    }

    if(parsedMessage.type === "leaveRoom"){
      let roomID = parsedMessage.roomID;
      let fromID = parsedMessage.fromID;
      rooms[roomID].userList = arrayRemove(rooms[roomID].userList , fromID)
      let clientList = rooms[roomID].userList;
      rooms[roomID].userList.forEach(userID=>{
        const targetClient = clients[userID];
        if (targetClient && targetClient.readyState === WebSocket.OPEN) {
          targetClient.send(JSON.stringify({ type: "leaveRoom", fromID, roomID, clientList}));
        }
      });
      if(rooms[roomID].userList.length === 0){
        delete rooms[roomID];
      }
      let allRooms = [];
      for (const [key, value] of Object.entries(rooms)) {
        let id = key;
        let name = value.name;
        let people = value.userList.length;
        allRooms.push({id, name, people});
      }
      wss.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(JSON.stringify({ type: "newRoom", allRooms }));
        }
      });
      return;
    }

    if(parsedMessage.type === "startGame"){
      let roomID = parsedMessage.roomID;
      let fromID = parsedMessage.fromID;
      rooms[roomID].boardAry = [];
      for(let i=0;i<9;i++) {
        rooms[roomID].boardAry.push(-1);
      }
      let clientList = rooms[roomID].userList;
      clientList.forEach(userID=>{
        const targetClient = clients[userID];
        if (targetClient && targetClient.readyState === WebSocket.OPEN) {
          targetClient.send(JSON.stringify({ type: "startedGame", fromID, roomID, clientList}));
        }
      });
    }

    if(parsedMessage.type === "playingGame"){
      let roomID = parsedMessage.roomID;
      let fromID = parsedMessage.fromID;
      let block = parsedMessage.block;
      let gameOrder = parsedMessage.gameOrder;
      rooms[roomID].boardAry[block] = gameOrder;
      let clientList = rooms[roomID].userList;
      clientList.forEach(userID=>{
        const targetClient = clients[userID];
        if (targetClient && targetClient.readyState === WebSocket.OPEN) {
          targetClient.send(JSON.stringify({ type: "setBlock", fromID, roomID,block,gameOrder, clientList}));
        }
      });
      let winner = checkWinner(rooms[roomID].boardAry);
      if(winner !== -1){
        clientList.forEach(userID=>{
          const targetClient = clients[userID];
          console.log(winner);
          if (targetClient && targetClient.readyState === WebSocket.OPEN) {
            targetClient.send(JSON.stringify({ type: "gameOver", fromID, roomID, winner, clientList}));
          }
        });
        return false;
      }
      if(rooms[roomID].boardAry.length >= 9){
        let gameOverCheck = true;
        rooms[roomID].boardAry.forEach((bNum, index) => {
          if(bNum === -1){
            gameOverCheck = false;
          }
        })
        if(gameOverCheck === true){
          winner = checkWinner(rooms[roomID].boardAry);
          clientList.forEach(userID=>{
            const targetClient = clients[userID];
            if (targetClient && targetClient.readyState === WebSocket.OPEN) {
              targetClient.send(JSON.stringify({ type: "gameOver", fromID, roomID,winner, clientList}));
            }
          });
        } 
      }
      return;
    }
    
    if (parsedMessage.type === "message") {
      const targetUserId = parsedMessage.targetUserId;
      const fromID = parsedMessage.fromID;
      const roomID = parsedMessage.roomID;
      if(roomID){
        if(targetUserId){
          wss.clients.forEach((client) => {
            if (client.readyState === WebSocket.OPEN) {
              client.send(JSON.stringify({ type: "message", "message": parsedMessage.message, fromID, roomID, targetUserId, private: true }));
            }
          });
        }else{
          rooms[roomID].userList.forEach(userID=>{
            const targetClient = clients[userID];
            if (targetClient && targetClient.readyState === WebSocket.OPEN) {
              targetClient.send(JSON.stringify({ type: "message", message: parsedMessage.message, fromID, roomID}));
            }
          });
        }
        return false;
      }
      wss.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(JSON.stringify({ type: "message", "message": parsedMessage.message, fromID: fromID }));
        }
      });
    }
  });
  

  connection.on("close", () => {
    console.log("已經用者斷開連線");
    let dsID = connection.userId;
    // 從客戶端列表中移除
    if (connection.userId) {
      delete clients[connection.userId];
    }
    const otherClients = Object.keys(clients);
    wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify({ type: "updateClient", otherClients , disconnectedID: dsID}));
      }
    });
  });
});

function checkWinner(boardAry) {
  const lines = [
    [0, 1, 2],
    [3, 4, 5],
    [6, 7, 8],
    [0, 3, 6],
    [1, 4, 7],
    [2, 5, 8],
    [0, 4, 8],
    [2, 4, 6]
  ];

  let winLine = [];
  let winNum;
  for (let i = 0; i < lines.length; i++) {
    const [a, b, c] = lines[i];
    if (boardAry[a] !== -1 && boardAry[a] === boardAry[b] && boardAry[a] === boardAry[c]) {
      winNum = boardAry[a];
      winLine.push(i)
    }
  }
  if(winLine.length === 0){
    return -1;
  }
  return {winNum, winLine}; 
}

function arrayRemove(arr, value) {

  return arr.filter(function (geeks) {
      return geeks != value;
  });

}