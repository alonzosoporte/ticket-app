const mongoose = require('mongoose')
const express = require('express')
const app = express()
const http = require('http').createServer(app)
const io = require('socket.io')(http)

app.use(express.json())
app.use(express.static(__dirname))
app.use((req, res, next) => {
  res.setHeader(
    "Content-Security-Policy",
    "default-src 'self' data: blob:; img-src 'self' data: blob:; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'"
  )
  next()
})

// 🔁 MODO (true = Mongo / false = local)
const usarMongo = true

// 🌍 CONEXIÓN MONGO
const MONGO_URL = process.env.MONGO_URL || 'mongodb://127.0.0.1:27017/tickets'

if (usarMongo) {
  mongoose.connect(MONGO_URL)
    .then(() => console.log("✅ Mongo conectado"))
    .catch(err => console.log("❌ Error Mongo:", err))
}

// 🟢 STORAGE LOCAL
let ticketsLocal = []

// 📦 MODELO
const Ticket = usarMongo ? mongoose.model('Ticket', {
  numero: String,
  nombre: String,
  telefono: String,
  problema: String,
  estado: String,
  precio: String,
  ganancia: String,
  detalle: String,
  fecha: String,
  entregado: String,
}) : null

// 🔌 SOCKET
io.on('connection', () => {
  console.log('🟢 Cliente conectado')
})

// 📥 CREAR TICKET
app.post('/ticket', async (req, res) => {
  try {
    const { nombre, telefono, problema } = req.body

    const ahora = new Date()
    const año = ahora.getFullYear()
    const mes = (ahora.getMonth() + 1).toString().padStart(2, '0')

    let lista = usarMongo ? await Ticket.find() : ticketsLocal

    let ultimo = lista.reduce((max, t) => {
      if (!t.numero) return max

      if (t.numero.startsWith(`Ticket-${año}-${mes}`)) {
        const partes = t.numero.split("-")
        const n = parseInt(partes[3]) || 0
        return n > max ? n : max
      }

      return max
    }, 0)

    const numero = `Ticket-${año}-${mes}-${(ultimo + 1).toString().padStart(3, '0')}`

    const nuevo = {
      numero,
      nombre,
      telefono,
      problema,
      estado: "pendiente",
      precio: "",
      ganancia: "",
      detalle: "",
      fecha: ahora.toISOString(),
      entregado: "no"
    }

    if (usarMongo) {
      await new Ticket(nuevo).save()
    } else {
      ticketsLocal.push(nuevo)
    }

    io.emit('actualizar')

    res.json({ ok: true, numero })

  } catch (err) {
    console.log("❌ Error crear:", err)
    res.status(500).json({ error: "Error al crear" })
  }
})

// 📤 OBTENER TICKETS

app.get('/tickets', async (req, res) => {
  try {

    if (usarMongo) {
      const datos = await Ticket.find().sort({ fecha: -1 })
      res.json(datos)
    } else {
      res.json(ticketsLocal.slice().reverse())
    }

  } catch (err) {
    console.log("❌ Error obtener:", err)
    res.status(500).json([])
  }
})

// ✏️ ACTUALIZAR
app.put('/ticket/:numero', async (req, res) => {
  try {

    const numero = req.params.numero
    const update = req.body

    if (usarMongo) {
      await Ticket.updateOne({ numero }, update)
    } else {
      ticketsLocal = ticketsLocal.map(t =>
        t.numero === numero ? { ...t, ...update } : t
      )
    }

    io.emit('actualizar')

    res.json({ ok: true })

  } catch (err) {
    console.log("❌ Error actualizar:", err)
    res.status(500).json({ error: "Error al actualizar" })
  }
})

// 🗑 BORRAR
app.delete('/ticket/:numero', async (req, res) => {

  try {

    const { numero } = req.params

    if (usarMongo) {
      await Ticket.deleteOne({ numero })
    } else {
      ticketsLocal = ticketsLocal.filter(t => t.numero !== numero)
    }

    io.emit('actualizar')

    res.json({ ok: true })

  } catch (err) {
    console.log("❌ Error borrar:", err)
    res.status(500).json({ error: "Error al borrar" })
  }
})
// 📡 MODO ACTUAL
app.get('/modo', (req, res) => {
  res.json({
    modo: usarMongo ? "MONGO 🌍" : "LOCAL 🟢"
  })
})dirname

// 🚀 SERVER
const PORT = process.env.PORT || 3000

http.listen(PORT, () => {
  console.log('🚀 Servidor corriendo en puerto ' + PORT)
})