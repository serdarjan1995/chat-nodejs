const socket = io('/')
let client_id = null
socket.on("connect", () => {
  console.log('connected', socket.id);
  client_id = socket.id
});

socket.on("disconnect", () => {
  console.log('disconnected', socket.connected); // false
});

socket.on('user-connected', userId => {
  console.log('user-connected', userId);
})

socket.on('user-disconnected', userId => {
  console.log('user-disconnected', userId);
})

socket.on('new-message', mess => {
  console.log('new-message', mess);
  addMessage(mess, 'self')
})

socket.emit('join-room', ROOM_ID, client_id)

$("#submitmsg").click(() => {
  let clientmsg = $("#usermsg").val();
  socket.emit('message', clientmsg)
  $("#usermsg").val("");
  addMessage({message: clientmsg, user: 'me'}, 'other')
});



function encode(str) {
  return str.replace(/[\u00A0-\u9999<>\&]/gim, function(i) {
     return '&#'+i.charCodeAt(0)+';';
  });
}

function addMessage(message, className) {
  let newContent = "<li class='" + className + "'><div class='chat-time'>"
  newContent += moment().format('H:m') + '</div>'
  newContent += "<div class='message-text'>" + encode(message.message) + "</div>";
  newContent += "<div class='chat-user'>@" + encode(message.user) + "</div></div>"
  $("#chatbox").append(newContent)
  $("#chatbox").animate({ scrollTop: $("#chatbox").prop('scrollHeight') }, 500);
}
