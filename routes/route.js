const express = require('express')
const router = express.Router()
const { v4: uuidV4 } = require('uuid')


// home
router.get('/', (req, res) => {
  res.render('home')
})

// create chat room
router.post('/room', (req, res) => {
  res.redirect(`/room/${uuidV4()}`)
})

// join to chat room
router.get('/room/:room', (req, res) => {
  res.render('room', { roomId: req.params.room })
})


module.exports=router
