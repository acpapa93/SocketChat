$(function(){
  var socket = io.connect();
  var $messageForm = $("#messageForm");
  var $message = $("#message");
  var $chat = $("#chat");
  var $userForm = $("#userForm");
  var $userFormArea = $("#userFormArea");
  var $users = $("#users");
  var $username = $("#username");
  var $messageArea = $("#messageArea");
  var $createNew =$("#createNew");
  var $roomInput=$("#roomInput");
//timestamp vars
  var today=new Date();
  var milliseconds =today.getMilliseconds();
  var seconds=today.getSeconds();
  var minutes=today.getMinutes();
  var hour=today.getHours();
  var timeStamp=hour+":"+minutes+":"+ seconds+":"+ milliseconds;
  var pmGroups=[];
  var targetUser;
  var timer;
//login
  $userForm.submit(function(e){
    e.preventDefault();
    if ($username.val()!=="" && user.indexOf($username.val())===-1){
    socket.username=$username.val();
    socket.emit("new user", $username.val(), function (data){
      if (data){
        $userFormArea.hide();
        $messageArea.show();
      }
    });
    //join and get history for "All"
    target="All";
    socket.emit("joined room", {sender:socket.username, room:target});
  } else{
    alert("Wow. Username already taken, please choose another.");
  }
    $username.val("");
  });

//get user list
var user;
socket.on("get users", function (data){
    user=data;
    var userHtml="";
    for (i=0; i<data.length;i++){
      if(data[i]===socket.username){
        userHtml+= "<li class='list-group-item' id='mySocketLi'>"+data[i]+"</li>";
      } else {
      userHtml+= "<li class='list-group-item userListli' id='"+data[i]+"'>"+data[i]+"</li>";
    }}
    $users.html(userHtml);
});


//room history
socket.on("room history", function (data){
  console.log(data);
  if ($("#chat").has("div")){
    $("#chat").empty();
  }
  for (var r= 0; r<=data.length-3;r+=3){
    if (data[r]===socket.username){
      $chat.append("<div id='myMessage'><span id='mySocket' class='userIdentify'>"+data[r]+"</span>"+"<span class='time'>"+data[r+1]+"</span>"+"<span class='msg'>"+ data[r+2]+"</span></div>");
    } else if(data[r]!==socket.username) {
      $chat.append("<div id='notMyMessage'><span class='userIdentify'>"+data[r]+"</span>"+"<span class='time'>"+data[r+1]+"</span>"+"<span class='msg'>"+ data[r+2]+"</span></div>");
    }
  }
});

//SENDING THE MESSAGE
var typing=false;
var timeout;
$("#messageForm").keypress(function(event) {
    if (event.which == 13 && $message.val!=="") {
      event.preventDefault();
      $("#messageForm").submit();

//to send notification that user is typing
  } else if (event.which!=13 && event.keyCode!=13){
      //if target is a room
      if ($("#rooms>li").hasClass("target")===true && typing===false){
        typing=true;
        socket.emit("typing in room", {sender:socket.username, room:target});
      } else if ($("#rooms>li").hasClass("target")===true && typing===true){
        console.log("typing is still true!");
        clearTimeout(timeout);
        timeout = setTimeout(timeOutRoom, 3500);
      } else if ($("#users>li").hasClass("target") && typing===false){
        //if target is a user
        typing=true;
        socket.emit("typing in private room", {sender:socket.username, room:target, user:targetUser});
      } else if ($("#users>li").hasClass("target") && typing===true){
        console.log("typing is still true!");
        clearTimeout(timeout);
        timeout = setTimeout(timeOutUser, 3500);
      }
    }
});
//user is typing notification stuff
function timeOutRoom (){
  typing = false;
  socket.emit("stopped typing in room", {sender:socket.username, room:target});
}
function timeOutUser(){
  socket.emit("stopped typing in private room", {sender:socket.username, room:target, user:targetUser});
}

var typingString="";
  socket.on("typing in room", function (data){
    typingString="";
    console.log(data);
    $("#userTyping").remove();
    $("#typignPronoun").remove();
    $("#typingIndicator").remove();

    $(".typingIndicator").css("visibility", "visible");
          if (data.length===1){
            $(".typingIndicator").prepend("<span id='userTyping'>  -  "+data+"</span><span id='typignPronoun'> is </span><span id='typingIndicator'>typing...</span>");
          } else if (data.length===2){
            typingString=data[0]+" and " +data[1];
            $(".typingIndicator").prepend("<span id='userTyping'>  -  "+typingString+"</span><span id='typignPronoun'> are </span><span id='typingIndicator'>typing...</span>");
          } else if (data.length>5){
              for (var x=0; x<data.length-1;x++){
              typingString+=data[x]+", ";
              }
              typingString+= "and others";
              $(".typingIndicator").prepend("<span id='userTyping'>  -  "+typingString+"</span><span id='typignPronoun'> are </span><span id='typingIndicator'>typing...</span>");
          } else {
              for (var j=0; j<data.length-1;j++){
                typingString+=data[j]+", ";
            }
            typingString+= "and "+data[data.length-1];
            $(".typingIndicator").prepend("<span id='userTyping'>  -  "+typingString+"</span><span id='typignPronoun'> are </span><span id='typingIndicator'>typing...</span>");
          }
    });

socket.on("stopped typing in room", function (data){
  typing=false;
  typingString="";
  console.log("STOPPED TYPING IN ROOM");
  console.log(data);
if (data.length===0){
  $(".typingIndicator").css("visibility", "hidden");
  $("#userTyping").remove();
  $("#typignPronoun").remove();
  $("#typingIndicator").remove();
} else if(data.length===1){
  $("#userTyping").replaceWith("<span id='userTyping'>  -  "+data+"</span>");
  $("#typignPronoun").replaceWith("<span id='typignPronoun'> is </span>");
} else if (data.length===2){
  typingString=data[0]+" and " +data[1];
  $("#userTyping").replaceWith("<span id='userTyping'>  -  "+typingString+"</span>");
  $("#typignPronoun").replaceWith("<span id='typignPronoun'> are </span>");
} else if(data.length>5){
    for (var x=0; x<data.length-1;x++){
      typingString+=data[x]+", ";
    }
    typingString+= "and others";
    $(".typingIndicator").prepend("<span id='userTyping'>  -  "+typingString+"</span><span id='typignPronoun'> are </span><span id='typingIndicator'>typing...</span>");
}else {
    for (var j=0; j<data.length-1;j++){
      typingString+=data[j]+", ";
    }
    typingString+="and "+data[data.length-1];
    $("#typingIndicator").replaceWith("<span id='userTyping'>  -  "+typingString+" are </span>");
    $("#typignPronoun").replaceWith("<span id='typignPronoun'> are </span>");
  }
});

var privateTypingString;
socket.on("typing in private room", function (data){
  privateTypingString="";
  console.log(data);
  $("#userTyping").remove();
  $("#typignPronoun").remove();
  $("#typingIndicator").remove();

  $(".typingIndicator").css("visibility", "visible");
        if (data.length===1){
          $(".typingIndicator").prepend("<span id='userTyping'>  -  "+data+"</span><span id='typignPronoun'> is </span><span id='typingIndicator'>typing...</span>");
        } else if (data.length===2){
          privateTypingString=data[0]+" and " +data[1];
          $(".typingIndicator").prepend("<span id='userTyping'>  -  "+privateTypingString+"</span><span id='typignPronoun'> are </span><span id='typingIndicator'>typing...</span>");
        } else if (data.length>5){
            for (var x=0; x<data.length-1;x++){
            privateTypingString+=data[x]+", ";
            }
            privateTypingString+= "and others";
            $(".typingIndicator").prepend("<span id='userTyping'>  -  "+privateTypingString+"</span><span id='typignPronoun'> are </span><span id='typingIndicator'>typing...</span>");
        } else {
            for (var j=0; j<data.length-1;j++){
              privateTypingString+=data[j]+", ";
          }
          privateTypingString+= "and "+data[data.length-1];
          $(".typingIndicator").prepend("<span id='userTyping'>  -  "+privateTypingString+"</span><span id='typignPronoun'> are </span><span id='typingIndicator'>typing...</span>");
        }
});

socket.on("stopped typing in private room", function (data){
  typing=false;
  privateTypingString="";
  console.log("stopped typing in private room");
  console.log(data);
  if (data.length===0){
    $(".typingIndicator").css("visibility", "hidden");
    $("#userTyping").remove();
    $("#typignPronoun").remove();
    $("#typingIndicator").remove();
  } else if(data.length===1){
    $("#userTyping").replaceWith("<span id='userTyping'>  -  "+data+"</span>");
    $("#typignPronoun").replaceWith("<span id='typignPronoun'> is </span>");
  } else if (data.length===2){
    privateTypingString=data[0]+" and " +data[1];
    $("#userTyping").replaceWith("<span id='userTyping'>  -  "+privateTypingString+"</span>");
    $("#typignPronoun").replaceWith("<span id='typignPronoun'> are </span>");
  } else if(data.length>5){
      for (var x=0; x<data.length-1;x++){
        privateTypingString+=data[x]+", ";
      }
      privateTypingString+= "and others";
      $(".typingIndicator").prepend("<span id='userTyping'>  -  "+privateTypingString+"</span><span id='typignPronoun'> are </span><span id='typingIndicator'>typing...</span>");
  }else {
      for (var j=0; j<data.length-1;j++){
        privateTypingString+=data[j]+", ";
      }
      privateTypingString+="and "+data[data.length-1];
      $("#typingIndicator").replaceWith("<span id='userTyping'>  -  "+privateTypingString+" are </span>");
      $("#typignPronoun").replaceWith("<span id='typignPronoun'> are </span>");
    }
});

$messageForm.submit(function(e){
    e.preventDefault();
    if($message.val()!==""){
      if (pmGroups.indexOf(target)!==-1){
        console.log(target);
          socket.emit("personal message", {msg: $message.val(), sender: socket.username, time:timeStamp, targetUser:targetUser, pm:true, target:target});
          timeOutUser();
          $message.val("");
        } else {
          socket.emit("send message", {msg: $message.val(), sender: socket.username, time:timeStamp, pm:false, target:target});
          timeOutRoom();
          $message.val("");
        }}
  });


  //receiving a message
  socket.on("new message", function(data){
    console.log(data);
    if (target===data.target){
      if (data.sender===socket.username){
        $chat.append("<div id='myMessage'><span id='mySocket' class='userIdentify'>"+data.sender+"</span>"+"<span class='time'>"+data.time+"</span>"+"<span class='msg'>"+ data.msg+"</span></div>");
      } else {
        $chat.append("<div id='notMyMessage'><span class='userIdentify'>"+data.sender+"</span>"+"<span class='time'>"+data.time+"</span>"+"<span class='msg'>"+ data.msg+"</span></div>");
      }
      // Should keep it scrolling to bottom
      var chatdiv = document.getElementById('chat');
      chatdiv.scrollTop = chatdiv.scrollHeight;
    }
  });
  //messages in rooms you aren't viewing now/in:
  socket.on("message notification", function (data){
    console.log("got message noty");
    if (target!==data.target){
      console.log("flasshhyyyyyy");
      console.log(data.target);
      console.log(target);
    $("#"+data.sender).addClass("flash");
  }
  });

//create new room
$("#newRoomForm").keypress(function(event) {
    if (event.which == 13 && $message.val!=="") {
      event.preventDefault();
      $("#roomInput").submit();
  }
});
var target, previous;
$("#newRoomForm").submit(function(e){
  if (roomHtml.indexOf($roomInput.val())===-1){
    e.preventDefault();
    typing = false;
    socket.emit("stopped typing in room", {sender:socket.username, room:target});
    previous=target;
    target=$roomInput.val();
    socket.emit("Create room", {target: $roomInput.val(), prev:previous, sender: socket.username});
    $roomInput.val("");
    $("#chat").empty();
    socket.emit("joined room", {sender:socket.username, target:target});
    $("ul#rooms>li").last().addClass("target");
    $("#targetLabel").replaceWith("<div id='targetLabel'>"+target+"</div>");
  } else {
    alert("Room already taken, please choose another room");
    $("#roomInput").val("");
  }
  });
var roomHtml;
  socket.on("get rooms", function (data){
    roomHtml="";
    for (var i=0;i<data.length;i++){
      if (data.length===1){
        target="All";
        roomHtml+="<li class='list-group-item roomListli target' id='"+data[i]+"'>"+data[i]+"</li>";
      } else {
      if (data[i]===target){
        roomHtml+="<li class='list-group-item roomListli target' id='"+data[i]+"'>"+data[i]+"</li>";
        $("#targetLabel").replaceWith("<div id='targetLabel'>"+target+"</div>");
      } else {
      roomHtml+="<li class='list-group-item roomListli' id='"+data[i]+"'>"+data[i]+"</li>";
    }}
  }
    $("#rooms").html(roomHtml);

  });

  $("#rooms").on("click", "li.roomListli", function (){
    if ($(this).hasClass("target")===false){
      typing = false;
      if ($("#users>li").hasClass("target")){
        timeOutUser();
      } else{
        timeOutRoom();
      }
      $("ul#rooms > li").removeClass("target");
      $("ul#users > li").removeClass("target");
      $(this).removeClass("flash");
      previous=target;
      target = $(this).attr('id');

      socket.emit("joined room", {sender:socket.username, target:target, prev:previous});
      $(this).addClass("target");
      $("#targetLabel").replaceWith("<div id='targetLabel'>"+target+"</div>");
      $("#chat").empty();
    }
  });

  $("#users").on("click", "li.userListli", function(){
    if ($(this).hasClass("target")===false){
      typing = false;
      if ($("#users>li").hasClass("target")){
        timeOutUser();
      } else{
        timeOutRoom();
      }
    $("ul#users > li").removeClass("target");
    $("ul#rooms > li").removeClass("target");
    previous=target;
    target = $(this).attr('id');
    $(this).removeClass("flash");
    $("#chat").empty();
    socket.emit("joined PM", {sender:socket.username, target:target, targetUser:targetUser, prev:previous});
    $(this).addClass("target");
    $("#targetLabel").replaceWith("<div id='targetLabel'>"+target+"</div>");
    }
  });

  socket.on("PM Returned", function (data){
    target=data.target;
    targetUser=data.targetUser;
    pmGroups=data.pmGroups;
  });
$("#menu").click(function(e){
  //hide it
  if ($("#sideWrapper").hasClass("visible")){
    $("#sideWrapper").removeClass("visible");
    $("#sideWrapper").css({
      left:"0vw",
    });
    $("#sideWrapper").css("visibility", "hidden");
    $("#menu").css({left: "1.5vw"});
//show it
} else {
  $("#sideWrapper").addClass("visible");
  $("#sideWrapper").css({
    left:"0vw",
  });
  $("#sideWrapper").css("visibility", "visible");
  $("#menu").css({left: "20vw"});
}

});

});
