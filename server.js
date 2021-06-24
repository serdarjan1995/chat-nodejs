require('dotenv').config()
const express = require('express')
const app = express()

const http = require('http')
const server = http.createServer(app);
const io = require("socket.io")(server, {});

const htmlEntities =  require('html-entities');

const bodyParser = require("body-parser");

const amqp = require('amqplib/callback_api');

app.set('view engine', 'ejs')
app.use(express.static('public'))
app.set('views','./views')

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }))

const hostname = '127.0.0.1'
const port = process.env.PORT || 3000
const direct_messaging = (process.env.MESSAGE_DIRECT || 'true').toLowerCase() === 'true'
const amqp_url = `amqps://${process.env.AMQP_USER}:${process.env.AMQP_PASS}@${process.env.AMQP_HOST}/${process.env.AMQP_USER}`

// register routes
app.use('', require('./routes/route'))

// Queue conneciton
let amqpConn = null;
function startQueue() {
  amqp.connect(amqp_url + "?heartbeat=60", function(err, conn) {
    if (err) {
      console.error("[AMQP]", err.message);
      return setTimeout(start, 1000);
    }
    conn.on("error", function(err) {
      if (err.message !== "Connection closing") {
        console.error("[AMQP] conn error", err.message);
      }
    });
    conn.on("close", function() {
      console.error("[AMQP] reconnecting");
      return setTimeout(startQueue, 1000);
    });
    amqpConn = conn;

    console.log("[AMQP] connected");

    // when whenconnected
    createPublisherChannel();
  });
}

// queue publish channel
let pubChannel = null;
function createPublisherChannel() {
  amqpConn.createConfirmChannel(function(err, ch) {
    if (closeOnErr(err)) return;
    ch.on("error", function(err) {
      console.error("[AMQP] channel error", err.message);
    });
    ch.on("close", function() {
      console.log("[AMQP] channel closed");
    });

    pubChannel = ch;
    console.log('[AMQP] channel created')
  });
}

// publish message to queue
function publish(exchange, routingKey, content) {
  try {
    pubChannel.publish(exchange, routingKey, content, { persistent: true },
                       function(err, ok) {
                         if (err) {
                           console.error("[AMQP] publish", err);
                           pubChannel.connection.close();
                         }
                       });
  } catch (e) {
    console.error("[AMQP] publish", e.message);
  }
}


function startConsuming(queue) {
  if (!pubChannel) {
    console.error("[AMQP] channel closed. cannot consume");
  }

  pubChannel.assertQueue(queue, { durable: true }, function(err, _ok) {
    if (closeOnErr(err)) return;

    pollMessages()

    function pollMessages() {
      pubChannel.get(queue, { noAck: false }, ( err, msg) => {
        if (err) {
          console.error("[AMQP] processMsg err", err);
        }
        if (!msg) {
          return;
        }
        try {
          messageStr = msg.content.toString()
          messageObj = JSON.parse(messageStr)
          console.log("Got msg", messageObj.message, messageObj.user);
          io.sockets.sockets.get(messageObj.user).to(queue).emit('new-message', messageObj)
          pubChannel.ack(msg);
        } catch (e) {
          pubChannel.reject(msg, true);
          closeOnErr(e);
        }
      })
      setTimeout(pollMessages, 1000)
    }

  });

}

function closeOnErr(err) {
  if (!err) return false;
  console.error("[AMQP] error", err);
  amqpConn.close();
  return true;
}

if (!direct_messaging) {
  startQueue()
}

let subscribedRooms = []

io.on("connection", (socket) => {

  socket.on('join-room', (roomId) => {

    if (!direct_messaging && !subscribedRooms.includes(roomId)) {
      startConsuming(roomId)
      subscribedRooms.push(roomId)
    }

    socket.join(roomId)
    socket.to(roomId).emit('user-connected', socket.id)

    socket.on('disconnect', () => {
      socket.to(roomId).emit('user-disconnected', socket.id)
    })

    socket.on('message', (message) => {
      let messageObj = {
        message: htmlEntities.encode(message),
        user: socket.id,
      }
      if (direct_messaging) {
        socket.to(roomId).emit('new-message', messageObj)
      }
      else{
        publish("", roomId, Buffer.from(JSON.stringify(messageObj)));
      }

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
