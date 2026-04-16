const express = require('express')
const mongoose = require('mongoose')
const http = require('http')
const { Server } = require('socket.io')

const app = express()
const server = http.createServer(app)
const io = new Server(server)

const PORT = process.env.PORT || 3000

// 🔥 CONEXIÓN MONGO
mongoose.connect(process.env.MONGO_URL)
  .then(() => console.log("✅ Mongo conectado"))
  .catch(err => console.log("❌ Error Mongo:", err))

// 📦 MODELO
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
  fecha: Date
})

const Ticket = mongoose.model('Ticket', TicketSchema)

// 🔧 MIDDLEWARE
app.use(express.json())
app.use(express.static('public'))

// 🔌 SOCKET
io.on('connection', () => {
  console.log('Cliente conectado')
})

// 🆕 CREAR TICKET
app.post('/ticket', async (req, res) => {
  const { nombre, telefono, problema } = req.body

  if (!nombre || !telefono || !problema) {
    return res.json({ error: 'Faltan datos' })
  }

  try {
    const año = new Date().getFullYear()

    const contador = await Ticket.countDocuments()

    const numero = "T-" + año + "-" + (contador + 1).toString().padStart(4, '0')

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
      fecha: new Date()
    })

    await nuevo.save()

    io.emit('actualizar')

    res.json({ ok: true, numero })

  } catch (err) {
    console.log(err)
    res.status(500).json({ error: 'Error al crear ticket' })
  }
})

// 📥 LISTAR
app.get('/tickets', async (req, res) => {
  const data = await Ticket.find()
  res.json(data)
})

// ✏️ ACTUALIZAR
app.put('/ticket/:numero', async (req, res) => {
  const numero = req.params.numero
  const update = req.body

  await Ticket.findOneAndUpdate({ numero }, update)

  io.emit('actualizar')
  res.json({ ok: true })
})

// ❌ BORRAR
app.delete('/ticket/:numero', async (req, res) => {
  const numero = req.params.numero

  await Ticket.findOneAndDelete({ numero })

  io.emit('actualizar')
  res.json({ ok: true })
})

// 🚀 SERVIDOR
server.listen(PORT, () => {
  console.log('Servidor en puerto ' + PORT)
})