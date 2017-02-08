var express = require("express");
var app = express();
var server = require("http").createServer(app);
var io = require("socket.io").listen(server);
//users is the list of nicknames
var users = [];
//connections is the array of socket connections
var connections = [];
//array of room names
var rooms = ["All"];
//array of socketIds only
var socketIds = [];
//array of each room's message history. "All" is array 0.
var messageHistory = [
    []
];
portENV=process.env.PORT;

var privateMessageGroups = [];
var privateMessageHistory = [];
var roomTypers=[[]];
var privateRoomTypers=[];

function Socket(username, id) {
    this.username = username;
    this.id = id;
}

server.listen(portENV || 3000, function() {
    console.log("port open for business.");
});


app.set('view engine', 'jade');
app.use(express.static(__dirname + '/public'));

app.get("/", function(req, res) {
    res.render(__dirname + '/public/index.jade');
});

//connect
io.sockets.on("connection", function(socket) {
    connections.push(socket);
    updateRooms();
    updateUsernames();
//sign in
socket.on("new user", function(data, callback) {
    callback(true);
    socket.username=data;
    socket.join("All");
    users.push(data);
    socketIds.push(socket.id);
    updateUsernames();
});
function updateUsernames() {
    io.sockets.emit("get users", users);
}
//get message history
socket.on("joined room", function(data) {
    socket.leave(data.prev);
    socket.join(data.target);
    for (var f = 0; f < rooms.length; f++) {
        if (data.target === rooms[f]) {
            io.to(socket.id).emit("room history", messageHistory[f]);
        }
    }
});

//receive event "send message"
socket.on("send message", function(data) {
    if (data.target === "All") {
            io.sockets.in("All").emit("new message", {
                target:"All",
                msg: data.msg,
                time:data.time,
                sender: data.sender
            });
            if (messageHistory[0].length < 16) {
                messageHistory[0].push(data.sender,data.time, data.msg);
            } else if (messageHistory[0].length >= 16) {
                for (var g=0; g<3;g++){
                messageHistory[0].shift();
                }
                messageHistory[0].push(data.sender,data.time,data.msg);
            }
      } else {
        io.sockets.in(data.target).emit('new message', {
            target: data.target,
            msg: data.msg,
            time:data.time,
            sender: data.sender
        });
          if(rooms.indexOf(data.target)!==-1){
            var i=rooms.indexOf(data.target);
              if(messageHistory[i].length<16){
                messageHistory[i].push(data.sender, data.time, data.msg);
              } else {
                    messageHistory[i].shift();
                    messageHistory[i].shift();
                    messageHistory[i].shift();
                    messageHistory[i].push(data.sender,data.time,data.msg);
                }
          }
        }
//i know they are both data.target but its easier to reuse the receiving function with the same values.
        io.sockets.emit("message notification", {target:data.target, sender:data.target});
      });

//set up private message rooms
socket.on("joined PM", function (data){
var group = data.sender + "-" + data.target;
var groupbackwards = data.target + "-" + data.sender;

if (privateMessageGroups.indexOf(group)!==-1){
  console.log("group worked");
  socket.leave(data.prev);
  socket.join(group);
  var gIndex=privateMessageGroups.indexOf(group);
  io.to(socket.id).emit("PM Returned", {target:group, targetUser:data.target, pmGroups:privateMessageGroups});
  io.sockets.in(group).emit('room history', privateMessageHistory[gIndex]);
} else if (privateMessageGroups.indexOf(groupbackwards)!==-1){
  console.log("group backwards worked");
  socket.leave(data.prev);
  socket.join(groupbackwards);
  var gbIndex=privateMessageGroups.indexOf(groupbackwards);
  io.to(socket.id).emit("PM Returned", {target:groupbackwards, targetUser:data.target, pmGroups:privateMessageGroups});
  io.sockets.in(groupbackwards).emit('room history', privateMessageHistory[gbIndex]);
} else {
  socket.leave(data.prev);
  socket.join(group);
  console.log("made the group", group);
  privateMessageGroups.push(group);
  privateMessageHistory.push([]);
  privateRoomTypers.push([]);
  io.sockets.in(group).emit("PM Returned", {target:group, targetUser:data.target, pmGroups:privateMessageGroups});

}
});


//receive personal message
socket.on("personal message", function (data){
  var group=data.target;
  io.sockets.in(group).emit('new message', {
      target: data.target,
      msg: data.msg,
      time:data.time,
      sender: data.sender
  });
    var r= privateMessageGroups.indexOf(group);
    if (privateMessageHistory[r].length<16){
      privateMessageHistory[r].push(data.sender, data.time, data.msg);
    } else {
      for (var b =0; b<3; b++){
        privateMessageHistory[r].shift();
      }
      privateMessageHistory[r].push(data.sender,data.time,data.msg);
    }
    var targetUserSocketIndex = users.indexOf(data.targetUser);
    console.log(group);
    io.to(socketIds[targetUserSocketIndex]).emit("message notification", {sender: data.sender, target: group});
    console.log(socketIds[targetUserSocketIndex]);
    console.log(socketIds);
    console.log(users);

});

socket.on("typing in room", function(data){
  var f = rooms.indexOf(data.room);
  roomTypers[f].push(data.sender);
  io.sockets.in(data.room).emit("typing in room" , roomTypers[f]);
});
socket.on("stopped typing in room", function (data){
  if (roomTypers[rooms.indexOf(data.room)]!==undefined){
  var f = rooms.indexOf(data.room);
  var g = roomTypers[f].indexOf(data.sender);
  roomTypers[f].splice(g, 1);
  io.sockets.in(data.room).emit("stopped typing in room", roomTypers[f]);
} else {
  io.sockets.in(data.room).emit("stopped typing in room", []);
}
});

//if it works in overall rooms then fix the below!!
socket.on("typing in private room", function (data){
  var z = privateMessageGroups.indexOf(data.room);
  privateRoomTypers[z].push(data.sender);
  console.log("started typing");
  console.log("typing in private room");
  console.log(privateRoomTypers);
  io.sockets.in(data.room).emit("typing in private room", privateRoomTypers[z]);
});
socket.on("stopped typing in private room", function (data){
  var d = privateMessageGroups.indexOf(data.room);
  console.log("stopped typing");
  console.log(privateMessageGroups[d]);
  console.log(privateRoomTypers);
  if (privateRoomTypers[d]!==undefined){
  var b = privateRoomTypers[d].indexOf(data.sender);
  privateRoomTypers[d].splice(b, 1);
  io.sockets.in(data.room).emit("stopped typing in private room", privateRoomTypers[b]);
} else {
  io.sockets.in(data.room).emit("stopped typing in private room", []);
}
});

//NON private ROOM STUFF HERE
function updateRooms() {
    io.sockets.emit("get rooms", rooms);
}

function Room(name) {
    this.name = name;
}

socket.on("Create room", function(data) {
    socket.leave(data.prev);

    new Room(data.target);
    socket.join(data.target);
    rooms.push(data.target);
    messageHistory.push([]);
    roomTypers.push([]);
    updateRooms();
});

//disconnect
  socket.on("disconnect", function(data) {
      users.splice(users.indexOf(socket.username), 1);
      updateUsernames();

      connections.splice(connections.indexOf(socket), 1);
      console.log("disconnected: %s sockets connected", connections.length);
      if (connections.length === 0 || users.length === 0) {
          rooms = ["All"];
          messageHistory = [[]];
          privateMessageGroups = [];
          privateMessageHistory = [];
          socketIds = [];
          users = [];
          connections=[];
          roomTypers=[[]];
          privateRoomTypers=[];

      }
  });
});
