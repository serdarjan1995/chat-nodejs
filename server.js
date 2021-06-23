const express = require('express')
const app = express()

const http = require('http')
const server = http.createServer(app);

const bodyParser = require("body-parser");

app.set('view engine', 'ejs')
app.use(express.static('public'))
app.set('views','./views')

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }))

const hostname = '127.0.0.1'
const port = process.env.PORT || 3000


app.use('', require('./routes/route'))


server.listen(3000, () => {
  console.log(`Server running at http://${hostname}:${port}/`);
});

process.on('SIGTERM', () => {
  server.close(() => {
    console.log('Process terminated')
  })
})
