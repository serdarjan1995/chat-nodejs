const express = require('express')
const app = express()

const http = require('http')
const server = http.createServer(app);
const io = require("socket.io")(server, {});

const htmlEntities =  require('html-entities');

const bodyParser = require("body-parser");

app.set('view engine', 'ejs')
app.use(express.static('public'))
app.set('views','./views')

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }))

const hostname = '127.0.0.1'
const port = process.env.PORT || 3000


app.use('', require('./routes/route'))

io.on("connection", (socket) => {
  console.log('New User', socket.conn.id);

  socket.on('join-room', (roomId, userId) => {
    socket.join(roomId)
    socket.to(roomId).emit('user-connected', socket.conn.id)

    socket.on('disconnect', () => {
      socket.to(roomId).emit('user-disconnected', socket.conn.id)
    })

    socket.on('message', (message) => {
      console.log('rec',message, socket.conn.id)
      let messageObj = {
        message: htmlEntities.encode(message),
        user: socket.conn.id,
      }
      socket.to(roomId).emit('new-message', messageObj)
    })
  })



});


server.listen(3000, () => {
  console.log(`Server running at http://${hostname}:${port}/`);
});

process.on('SIGTERM', () => {
  server.close(() => {
    console.log('Process terminated')
  })
})
