const express = require('express')
const app = express()
const http = require('http').createServer(app)
const io = require('socket.io')(http)
const mongoose = require('mongoose')

const PORT = process.env.PORT || 3000

// 🔗 CONEXIÓN A MONGO
mongoose.connect(process.env.MONGO_URL)
  .then(() => console.log("✅ Mongo conectado"))
  .catch(err => console.log("❌ Error Mongo:", err))

// 📦 MODELO DE TICKET
const TicketSchema = new mongoose.Schema({
  numero: String,
  nombre: String,
  telefono: String,
  problema: String,
  estado: String,
  precio: String,
  ganancia: String,
  detalle: String,
  entregado: String,
  fecha: String
})

const Ticket = mongoose.model('Ticket', TicketSchema)

// CONFIG
app.use(express.json())
app.use(express.static('public'))

// SOCKET
io.on('connection', () => {
  console.log('Cliente conectado')
})

// 🆕 CREAR TICKET
app.post('/ticket', async (req, res) => {
  const { nombre, telefono, problema } = req.body

  if (!nombre || !telefono || !problema) {
    return res.json({ error: 'Faltan datos' })
  }

  const numero = "T-" + Date.now()

  const nuevo = new Ticket({
    numero,
    nombre,
    telefono,
    problema,
    estado: 'pendiente',
    precio: '',
    ganancia: '',
    detalle: '',
    entregado: 'no',
    fecha: new Date().toISOString()
  })

  await nuevo.save() // 🔥 GUARDA EN MONGO

  io.emit('actualizar')

  res.json({ ok: true, numero })
})

// 📄 LISTAR TICKETS
app.get('/tickets', async (req, res) => {
  const data = await Ticket.find().sort({ fecha: -1 })
  res.json(data)
})

// ✏️ ACTUALIZAR TICKET
app.put('/ticket/:numero', async (req, res) => {
  await Ticket.findOneAndUpdate(
    { numero: req.params.numero },
    req.body
  )

  io.emit('actualizar')
  res.json({ ok: true })
})

// ❌ BORRAR TICKET
app.delete('/ticket/:numero', async (req, res) => {
  await Ticket.findOneAndDelete({ numero: req.params.numero })

  io.emit('actualizar')
  res.json({ ok: true })
})

// 🚀 SERVER
http.listen(PORT, () => {
  console.log('Servidor en puerto ' + PORT)
})