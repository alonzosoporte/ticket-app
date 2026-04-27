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
mongoose.connect('mongodb+srv://alonzosoporte:Foofigh1987!@cluster0.mafkjzo.mongodb.net/ticketsDB')
.then(()=> console.log('Mongo conectado'))
.catch(err => console.log(err))

// ================= SCHEMA =================
const TicketSchema = new mongoose.Schema({
  numero: String,
  nombre: String,
  telefono: String,
  problema: String,
  descripcion: String,
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

// ================= CREAR =================
app.post('/ticket', async (req, res) => {
  try {

    const { nombre, telefono, problema } = req.body

    if (!nombre || !telefono || !problema) {
      return res.json({ error: 'Faltan datos' })
    }

    const now = new Date()
    const year = now.getFullYear()
    const month = (now.getMonth() + 1).toString().padStart(2, '0')

    const prefix = `Ticket-${year}-${month}-`

    // 🔎 buscar último ticket del mes
    const ultimo = await Ticket.findOne({
      numero: { $regex: `^${prefix}` }
    }).sort({ numero: -1 })

    let nuevoNumero = 1

    if (ultimo && ultimo.numero) {
      const partes = ultimo.numero.split('-')
      const num = parseInt(partes[3])
      nuevoNumero = num + 1
    }

    // 🎯 FORMATO FINAL
    const numeroFormateado =
      prefix + nuevoNumero.toString().padStart(2, '0')

    const nuevo = new Ticket({
      ...req.body,
      numero: numeroFormateado,
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

// ================= LISTAR =================
app.get('/tickets', async (req, res) => {
  try {
    const data = await Ticket.find().sort({ _id: -1 })
    res.json(data)
  } catch (err) {
    res.status(500).json({ error: 'Error obteniendo tickets' })
  }
})

// ================= ACTUALIZAR =================
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

// ================= BORRAR =================
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