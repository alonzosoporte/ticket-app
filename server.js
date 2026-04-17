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

// =======================
// 📦 MODELO TICKETS
// =======================
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

// =======================
// 📦 MODELO COTIZACIONES
// =======================
const CotizacionSchema = new mongoose.Schema({
  producto: String,
  precio: String,
  descripcion: String,
  foto: String, // base64
  fecha: Date
})

const Cotizacion = mongoose.model('Cotizacion', CotizacionSchema)

// 🔧 MIDDLEWARE
app.use(express.json({ limit: '10mb' })) // 🔥 importante para imágenes
app.use(express.static('public'))

// 🔌 SOCKET
io.on('connection', () => {
  console.log('Cliente conectado')
})

/* =====================================================
   🧾 TICKETS (NO TOCAR - YA FUNCIONA)
===================================================== */

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

// 📥 LISTAR TICKETS
app.get('/tickets', async (req, res) => {
  const data = await Ticket.find()
  res.json(data)
})

// ✏️ ACTUALIZAR TICKET
app.put('/ticket/:numero', async (req, res) => {
  const numero = req.params.numero
  const update = req.body

  await Ticket.findOneAndUpdate({ numero }, update)

  io.emit('actualizar')
  res.json({ ok: true })
})

// ❌ BORRAR TICKET
app.delete('/ticket/:numero', async (req, res) => {
  const numero = req.params.numero

  await Ticket.findOneAndDelete({ numero })

  io.emit('actualizar')
  res.json({ ok: true })
})

/* =====================================================
   📊 COTIZACIONES (NUEVO SISTEMA)
===================================================== */

// 🆕 CREAR
app.post('/cotizacion', async (req, res) => {
  try {
    const { producto, precio, descripcion, foto } = req.body

    const nueva = new Cotizacion({
      producto,
      precio,
      descripcion,
      foto,
      fecha: new Date()
    })

    await nueva.save()

    res.json({ ok: true })

  } catch (err) {
    console.log(err)
    res.status(500).json({ error: 'Error al guardar' })
  }
})

// 📥 LISTAR
app.get('/cotizaciones', async (req, res) => {
  const data = await Cotizacion.find()
  res.json(data)
})

// ✏️ EDITAR
app.put('/cotizacion/:id', async (req, res) => {
  try {
    await Cotizacion.findByIdAndUpdate(req.params.id, req.body)
    res.json({ ok: true })
  } catch (err) {
    console.log(err)
    res.status(500).json({ error: 'Error al actualizar' })
  }
})

// ❌ BORRAR
app.delete('/cotizacion/:id', async (req, res) => {
  await Cotizacion.findByIdAndDelete(req.params.id)
  res.json({ ok: true })
})

// 🚀 SERVIDOR
server.listen(PORT, () => {
  console.log('Servidor en puerto ' + PORT)
})