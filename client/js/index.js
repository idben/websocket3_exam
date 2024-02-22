const ws = new WebSocket("ws://localhost:8080");
const leftArea = document.querySelector(".left .list");
const leftTitle = document.querySelector(".left h3");
const rightArea = document.querySelector(".right .list");
const rightTitle = document.querySelector(".right h3");
const btnSend = document.querySelector(".btn-send");
const btnCroom = document.querySelector(".btn-croom");
const gameArea = document.querySelector(".game");
const blocks = document.querySelectorAll(".block");
const lines = document.querySelectorAll(".game .line");
const userId = new Date().getTime().toString();
let clientList, targetUserId, roomID, roomList;
let roomName = "";
let gameStatus = "none";
let gameOrder = 0;
let gameNum = 0;
leftArea.innerHTML += `<div>已進入聊天室，你的ID是：${userId}</div>`;

btnSend.addEventListener("click", ()=>{
  sendMessage()
});
btnCroom.addEventListener("click", ()=>{
  createRoom()
});
document.querySelector("[name=msg]").addEventListener("keydown", (e)=>{
  if(e.key === "Enter"){
    sendMessage()
  }
});

blocks.forEach((block, index)=>{
  block.addEventListener("click", (e)=>{
    // console.log(gameStatus)
    if(gameStatus === "canPlay"){
      let prarms = {
        type: "playingGame",
        block: index,
        fromID: userId,
        roomID,
        gameOrder
      }
      ws.send(JSON.stringify(prarms));
      gameStatus = "waitting"
    }
  })
});


ws.addEventListener("open", () => {
  console.log("Connected to the WebSocket");
  let prarms = {
    type: "register",
    userId: userId
  }
  ws.send(JSON.stringify(prarms));
});

ws.addEventListener("message", async (event) => {
  // console.log(event)
  let resutlt = JSON.parse(event.data);
  if(resutlt.type === "startedGame"){
    leftArea.innerHTML += `<div><span class="badge bg-success me-1">system</span>人數已滿，遊戲開始。</div>`;
    if(clientList[0] === userId){
      leftArea.innerHTML += `<div><span class="badge bg-success me-1">system</span>您為先攻，請選擇第一格</div>`;
      gameStatus = "canPlay";
      gameOrder = 0;
    }else{
      gameStatus = "waitting";
      gameOrder = 1;
    }
  }

  if(resutlt.type === "setBlock"){
    [...blocks][resutlt.block].querySelector(".mark"+resutlt.gameOrder).classList.remove("d-none");
    gameNum++;
    gameStatus = "waitting";
    if(userId !== resutlt.fromID){
      gameStatus = "canPlay";
      leftArea.innerHTML += `<div><span class="badge bg-success me-1">system</span>對方已下好離手，換你!!</div>`;
    }
    return false;
  }

  if(resutlt.type === "gameOver"){
    gameStatus = "gameOver";
    leftArea.innerHTML += `<div><span class="badge bg-success me-1">system</span>遊戲結束!!!</div>`;
    if(resutlt.winner === -1){
      leftArea.innerHTML += `<div><span class="badge bg-success me-1">system</span>這局平手</div>`;
    }else{
      let winNum = resutlt.winner.winNum;
      let winLine = resutlt.winner.winLine;
      if(gameOrder === winNum){
        leftArea.innerHTML += `<div><span class="badge bg-success me-1">system</span>🏆恭喜你獲勝🏆</div>`;
      }else{
        leftArea.innerHTML += `<div><span class="badge bg-success me-1">system</span>很遺憾，這局是你輸了⋯</div>`;
      }
      for(let i=0;i<winLine.length;i++){
        [...lines][winLine[i]].classList.remove("d-none");
        if(winNum === 0){
          [...lines][winLine[i]].classList.add("lineColor0");
        }
      }
    }
    return false;
  }

  if(resutlt.type === "registered"){
    roomList = resutlt.allRooms;
    setRoomList();
    return false;
  }

  if(resutlt.type === "joinRoom"){
    clientList = resutlt.clientList;
    setClientList();
    return false;
  }

  if(resutlt.type === "rejectRoom"){
    alert(resutlt.message);
    roomList = resutlt.allRooms;
    rightTitle.innerHTML = "小房間列表";
    leftTitle.innerHTML = `聊天室`;
    leftArea.innerHTML = "";
    rightArea.innerHTML = "更新中...";
    btnCroom.innerHTML = "建立房間";
    btnCroom.classList.remove("btn-danger");
    roomID = undefined;
    roomName = undefined;
    setRoomList();
    return false;
  }

  if(resutlt.type === "leaveRoom"){
    clientList = resutlt.clientList;
    setClientList();
    return false;
  }

  if(resutlt.type === "newRoom"){
    roomList = resutlt.allRooms;
    setRoomList();
    return false;
  }

  if(resutlt.type === "updateClient"){
    if(!roomID){
      return false;
    }
    if(roomID !== resutlt.roomID){
      return false;
    }
    clientList = resutlt.otherClients;
    setClientList();
  }

  if(resutlt.type === "message"){
    if(roomID && !resutlt.roomID){
      return false;
    }
    let fromID = resutlt.fromID;
    let toFix = `<span class="px-2">說</span>`;
    let icon;
    if(resutlt.private === true){
      toFix = `<span class="px-2">對你悄悄說: </span>`;
    }
    if(fromID === userId){
      icon = `<span class="badge bg-primary d-flex align-itmes-center">我自己</span>`
      if(targetUserId){
        toFix = `對<span class="badge bg-danger px-2">${targetUserId}</span>悄悄說: `;
      }else{
        toFix = `說: `;
      }
      
    }else{
      if(resutlt.private === true){
        icon = `<span class="badge bg-danger d-flex align-itmes-center">${fromID}</span>`
      }else{
        icon = `<span class="badge bg-primary d-flex align-itmes-center">${fromID}</span>`
      }
    }
    let msg = `<span">${resutlt.message}</span>`;
    leftArea.innerHTML += `<div class="d-flex align-itmes-center mb-1">${icon}${toFix}${msg}</div>`;
    scrollToBottom();
    return false;
  }
});

function createRoom(){
  if(roomID){
    // alert("將離開小房間");
    let prarms = {
      type: "leaveRoom",
      fromID: userId,
      roomID: roomID
    }
    ws.send(JSON.stringify(prarms));
    rightTitle.innerHTML = "小房間列表";
    leftTitle.innerHTML = `聊天室`;
    leftArea.innerHTML = "";
    rightArea.innerHTML = "更新中...";
    btnCroom.innerHTML = "建立房間";
    btnCroom.classList.remove("btn-danger");
    gameArea.classList.add("d-none");
    roomID = undefined;
    roomName = undefined;
    return false;
  }
  roomID = `room${new Date().getTime().toString()}`;
  roomName = document.querySelector("[name=roomName]").value;
  if(roomName === ""){
    return false;
  }
  let prarms = {
    type: "createRoom",
    fromID: userId,
    roomName: roomName,
    roomID: roomID
  }
  ws.send(JSON.stringify(prarms));
  rightTitle.innerHTML = "使用者列表";
  leftTitle.innerHTML = `位於聊天室 ${roomName} 中`;
  leftArea.innerHTML = "";
  rightArea.innerHTML = "等待加入...";
  btnCroom.innerHTML = "離開房間";
  btnCroom.classList.add("btn-danger");
}

function sendMessage() {
  var message = document.querySelector("[name=msg]").value;
  let prarms = {
    type: "message",
    message: message,
    fromID: userId
  }
  if(targetUserId){
    prarms.targetUserId = targetUserId;
  }
  if(roomID){
    prarms.roomID = roomID;
  }
  ws.send(JSON.stringify(prarms));
  // console.log(prarms)
  document.querySelector("[name=msg]").value = "";
  // if(targetUserId){
  //   let icon1 = `<span class="badge bg-primary d-flex align-itmes-center pt-1 me-1">我自己</span>`
  //   let icon2 = `<span class="badge bg-primary d-flex align-itmes-center pt-1 ms-1">${targetUserId}</span>`
  //   let toFix = `<span class="px-2">悄悄說</span>`;
  //   let msg = `<span">${message}</span>`;
  //   leftArea.innerHTML += `<div class="d-flex align-itmes-center mb-1">${icon1}對${icon2}${toFix}：${msg}</div>`;
  // }
}

function setRoomList(){
  if(roomID){
    return false;
  }
  let clientDOM = "";
  roomList.forEach((clientRoom)=>{
    let clientRoomID = clientRoom.id;
    let clientRoomName = clientRoom.name;
    let clientPeople = parseInt(clientRoom.people);
    let people2 = "d-inline-block";
    if(clientPeople == 1){
      people2 = "d-none";
    }
    let dom = `<div roomname="${clientRoomName}" roomid="${clientRoomID}" class="btn btn-secondary w-100 mb-1 text-start"><i class="fa-solid fa-user gameMan man1"></i><i class="fa-solid fa-user gameMan man2 ${people2}"></i>
        ${clientRoomName}
      </div>`
    clientDOM+=dom;
  });
  rightArea.innerHTML = clientDOM;
  let btns = rightArea.querySelectorAll(".btn");
  btns.forEach(btn=>{
    btn.addEventListener("click", (e)=>{
      let roomid = e.currentTarget.getAttribute("roomid");
      let roomname = e.currentTarget.getAttribute("roomname");
      roomID = roomid;
      let prarms = {
        type: "joinRoom",
        fromID: userId,
        roomID: roomID
      }
      ws.send(JSON.stringify(prarms));
      rightTitle.innerHTML = "使用者列表";
      leftTitle.innerHTML = `位於聊天室 ${roomname} 中`;
      leftArea.innerHTML = "";
      rightArea.innerHTML = "更新中...";
      btnCroom.innerHTML = "離開房間";
      btnCroom.classList.add("btn-danger");
    })
  })
}

function setClientList(){
  // console.log(clientList)
  clientDOM = "";
  clientList.forEach((client)=>{
    if(client !== userId){
      let dom = `<div idn="${client}" class="btn btn-secondary w-100 mb-1">${client}</div>`
      clientDOM+=dom;
    }
  });
  rightArea.innerHTML = clientDOM;
  let btns = rightArea.querySelectorAll(".btn");
  btns.forEach(btn=>{
    btn.addEventListener("click", (e)=>{
      let target = e.currentTarget;
      let idn = e.currentTarget.getAttribute("idn");
      if(target.classList.contains("btn-danger")){
        target.classList.remove("btn-danger");
        targetUserId = undefined;
      }else{
        target.classList.add("btn-danger");
        targetUserId = idn;
      }
    })
  })
  if(clientList.length >= 2){
    gameArea.classList.remove("d-none");
    blocks.forEach(block=>{
      block.querySelector(".mark0").classList.add("d-none");
      block.querySelector(".mark1").classList.add("d-none");
    });
    lines.forEach(line=>{
      line.classList.add("d-none");
    });
    if(clientList[0] === userId){
      let prarms = {
        type: "startGame",
        fromID: userId,
        roomID
      }
      ws.send(JSON.stringify(prarms));
    }
  }else{
    gameArea.classList.add("d-none");
  }
  
}

function scrollToBottom() {
  leftArea.scrollTop = leftArea.scrollHeight - leftArea.clientHeight;
}


