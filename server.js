const cors = require('cors')
const express = require('express')
const mongoose = require('mongoose')
const http = require('http')
const { Server } = require('socket.io')

const app = express()
const server = http.createServer(app)
const io = new Server(server)

// ================= CONFIG =================
app.use(cors())
app.use(express.json({ limit: '20mb' }))
app.use(express.static('public'))

// ================= AUTH =================
const USER = 'alonzo'
const PASS = 'foofigh1987'
const TOKEN = 'alonzo-123'

// LOGIN
app.post('/login', (req,res)=>{
  const { usuario, clave } = req.body

  if(usuario === USER && clave === PASS){
    return res.json({ ok:true, token: TOKEN })
  }

  res.status(401).json({ error:'Credenciales incorrectas' })
})

// MIDDLEWARE AUTH
function auth(req,res,next){
  const authHeader = req.headers.authorization

  if(!authHeader){
    return res.status(401).json({ error:'No autorizado' })
  }

  const token = authHeader.split(' ')[1]

  if(token !== TOKEN){
    return res.status(403).json({ error:'Token inválido' })
  }

  next()
}

// ================= MONGODB =================
mongoose.connect('mongodb+srv://alonzosoporte:Foofigh1987!@cluster0.mafkjzo.mongodb.net/ticketsDB')
.then(()=> console.log('Mongo conectado'))
.catch(err => console.log(err))

// ================= SCHEMAS =================

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
  fecha: { type: Date, default: Date.now }
})

const Ticket = mongoose.model('Ticket', TicketSchema)

const CotizacionSchema = new mongoose.Schema({
  nombre: String,
  celular: String,
  producto: String,
  proveedor: String,
  costoProveedor: String,
  precioCliente: String,
  ganancia: Number,
  descripcion: String,
  fotos: [String],
  foto: String,
  garantiaHasta: String,
  fotoGarantia: String,
  confirmada: { type: String, default: 'no' },
  fecha: { type: Date, default: Date.now }
})

const Cotizacion = mongoose.models.Cotizacion || mongoose.model('Cotizacion', CotizacionSchema)

const CounterSchema = new mongoose.Schema({
  nombre: String,
  valor: Number
})

const Counter = mongoose.model('Counter', CounterSchema)

// ================= SOCKET =================
io.on('connection', () => {
  console.log('Cliente conectado')
})


// ======================================================
// 🟢 TICKET PUBLICO (CLIENTE) → SIN LOGIN
// ======================================================
app.post('/ticket-publico', async (req, res) => {
  try {

    const { nombre, telefono, problema } = req.body

    if (!nombre || !telefono || !problema) {
      return res.json({ error: 'Faltan datos' })
    }

    const hoy = new Date()
    const anio = hoy.getFullYear()
    const mes = String(hoy.getMonth() + 1).padStart(2, '0')

    const clave = `ticket-${anio}-${mes}`

    let contador = await Counter.findOne({ nombre: clave })

    if (!contador) {
      contador = await Counter.create({ nombre: clave, valor: 1 })
    } else {
      contador.valor += 1
      await contador.save()
    }

const numero = `${anio}-${mes}-${String(contador.valor).padStart(3, '0')}`

    const nuevo = new Ticket({
      numero,
      nombre,
      telefono,
      problema,
      estado: 'pendiente',
      entregado: 'no',
      fecha: hoy
    })

    await nuevo.save()

    io.emit('actualizar')
    res.json(nuevo)

  } catch (err) {
    res.status(500).json({ error: 'Error creando ticket' })
  }
})


// ======================================================
// 🔒 TICKET PRIVADO (ADMIN)
// ======================================================
app.post('/ticket', auth, async (req, res) => {
  try {

    const { nombre, telefono, problema } = req.body

    if (!nombre || !telefono || !problema) {
      return res.json({ error: 'Faltan datos' })
    }

    const hoy = new Date()
    const anio = hoy.getFullYear()
    const mes = String(hoy.getMonth() + 1).padStart(2, '0')

    const clave = `ticket-${anio}-${mes}`

    let contador = await Counter.findOne({ nombre: clave })

    if (!contador) {
      contador = await Counter.create({ nombre: clave, valor: 1 })
    } else {
      contador.valor += 1
      await contador.save()
    }

    const numero = `${anio}-${mes}-${String(contador.valor).padStart(3, '0')}`

    const nuevo = new Ticket({
      ...req.body,
      numero,
      estado: 'pendiente',
      entregado: 'no',
      fecha: hoy
    })

    await nuevo.save()

    io.emit('actualizar')
    res.json(nuevo)

  } catch (err) {
    res.status(500).json({ error: 'Error creando ticket' })
  }
})


// ================= RESTO IGUAL =================
app.get('/tickets', auth, async (req, res) => {
  const data = await Ticket.find().sort({ _id: -1 })
  res.json(data)
})

app.put('/ticket/:numero', auth, async (req, res) => {
  const actualizado = await Ticket.findOneAndUpdate(
    { numero: req.params.numero },
    { $set: req.body },
    { new: true }
  )

  io.emit('actualizar')
  res.json(actualizado)
})

app.delete('/ticket/:numero', auth, async (req, res) => {
  await Ticket.findOneAndDelete({ numero: req.params.numero })
  io.emit('actualizar')
  res.json({ ok: true })
})

// ================= START =================
const PORT = process.env.PORT || 3000

server.listen(PORT, () => {
  console.log('Servidor corriendo en puerto', PORT)
})