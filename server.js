const express = require('express')
const mongoose = require('mongoose')
const http = require('http')
const { Server } = require('socket.io')

const app = express()
const server = http.createServer(app)
const io = new Server(server)

// ================= CONFIG =================
app.use(express.json({ limit: '10mb' }))
app.use(express.static('public'))

// ================= MONGODB =================
// 🔴 NO CAMBIES TU URL, dejá la que ya usabas
mongoose.connect('mongodb+srv://alonzosoporte:Foofigh1987!@cluster0.mafkjzo.mongodb.net/ticketsDB')
.then(()=> console.log('Mongo conectado'))
.catch(err => console.log(err))

// ================= SCHEMA =================
const TicketSchema = new mongoose.Schema({
  numero: String,
  nombre: String,
  telefono: String,
  problema: String,
  descripcion: String, // 🔥 ESTO ARREGLA TU PROBLEMA
  detalle: String,
  precio: String,
  ganancia: String,
  estado: String,
  entregado: String,
  fecha: { type: Date, default: Date.now },
  garantiaFecha: String
})

const Ticket = mongoose.model('Ticket', TicketSchema)

// ================= SOCKET =================
io.on('connection', () => {
  console.log('Cliente conectado')
})

// ================= RUTAS =================

// CREAR
app.post('/ticket', async (req, res) => {
  try {

    const numero = Math.floor(10000 + Math.random() * 90000).toString()

    const nuevo = new Ticket({
      ...req.body,
      numero,
      estado: 'pendiente',
      entregado: 'no'
    })

    await nuevo.save()

    io.emit('actualizar')

    res.json(nuevo)

  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Error creando ticket' })
  }
})

// LISTAR
app.get('/tickets', async (req, res) => {
  try {
    const data = await Ticket.find().sort({ _id: -1 })
    res.json(data)
  } catch (err) {
    res.status(500).json({ error: 'Error obteniendo tickets' })
  }
})

// ACTUALIZAR
app.put('/ticket/:numero', async (req, res) => {
  try {

    await Ticket.findOneAndUpdate(
      { numero: req.params.numero },
      { $set: req.body }
    )

    io.emit('actualizar')

    res.json({ ok: true })

  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Error actualizando' })
  }
})

// BORRAR
app.delete('/ticket/:numero', async (req, res) => {
  try {
    await Ticket.findOneAndDelete({ numero: req.params.numero })
    io.emit('actualizar')
    res.json({ ok: true })
  } catch (err) {
    res.status(500).json({ error: 'Error borrando' })
  }
})

// ================= START =================
server.listen(3000, () => {
  console.log('Servidor corriendo en http://localhost:3000')
})