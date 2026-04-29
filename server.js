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

// ================= SCHEMAS =================

// 🎫 TICKETS
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

// 📊 COTIZACIONES
const CotizacionSchema = new mongoose.Schema({
  nombre: String,
  celular: String,
  producto: String,
  proveedor: String,
  costoProveedor: String,
  precioCliente: String,
  ganancia: Number,
  descripcion: String,
  foto: String,
  garantiaFecha: String,
  garantiaFoto: String,
  confirmada: { type: String, default: 'no' },
  fecha: { type: Date, default: Date.now }
})

const Cotizacion = mongoose.models.Cotizacion || mongoose.model('Cotizacion', CotizacionSchema)

// 🏢 PROVEEDORES
const ProveedorSchema = new mongoose.Schema({
  nombre: { type: String, unique: true }
})

const Proveedor = mongoose.models.Proveedor || mongoose.model('Proveedor', ProveedorSchema)

// 🔢 CONTADOR
const CounterSchema = new mongoose.Schema({
  nombre: String,
  valor: Number
})

const Counter = mongoose.model('Counter', CounterSchema)

// ================= SOCKET =================
io.on('connection', () => {
  console.log('Cliente conectado')
})

// ================= TICKETS =================

// CREAR
app.post('/ticket', async (req, res) => {
  try {

    const { nombre, telefono, problema } = req.body

    if (!nombre || !telefono || !problema) {
      return res.json({ error: 'Faltan datos' })
    }

    const cantidad = await Ticket.countDocuments()

    let numero = 1

    if (cantidad === 0) {
      await Counter.findOneAndUpdate(
        { nombre: 'ticket' },
        { valor: 1 },
        { upsert: true }
      )
    } else {
      let contador = await Counter.findOneAndUpdate(
        { nombre: 'ticket' },
        { $inc: { valor: 1 } },
        { new: true, upsert: true }
      )

      numero = contador.valor
    }

    const numeroFormateado = 'Ticket-' + numero.toString().padStart(3, '0')

    const nuevo = new Ticket({
      ...req.body,
      numero: numeroFormateado,
      estado: 'pendiente',
      entregado: 'no',
      fecha: new Date()
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

// ================= COTIZACIONES =================

// CREAR
app.post('/cotizacion', async (req, res) => {
  try {

    const costo = parseFloat(req.body.costoProveedor) || 0
    const precio = parseFloat(req.body.precioCliente) || 0

    const nueva = new Cotizacion({
      ...req.body,
      ganancia: precio - costo,
      fecha: new Date() // 🔥 clave para filtros por mes
    })

    await nueva.save()

    io.emit('actualizar')
    res.json({ ok: true })

  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Error creando cotizacion' })
  }
})

// LISTAR
app.get('/cotizaciones', async (req, res) => {
  try {
    const data = await Cotizacion.find().sort({ _id: -1 })
    res.json(data)
  } catch (err) {
    res.status(500).json({ error: 'Error obteniendo cotizaciones' })
  }
})

// ACTUALIZAR
app.put('/cotizacion/:id', async (req, res) => {
  try {

    const data = req.body

    if (data.confirmada === 'si') {
      const costo = parseFloat(data.costoProveedor) || 0
      const precio = parseFloat(data.precioCliente) || 0
      data.ganancia = precio - costo
    }

    await Cotizacion.findByIdAndUpdate(req.params.id, { $set: data })

    io.emit('actualizar')
    res.json({ ok: true })

  } catch (err) {
    res.status(500).json({ error: 'Error actualizando cotización' })
  }
})

// BORRAR
app.delete('/cotizacion/:id', async (req, res) => {
  try {
    await Cotizacion.findByIdAndDelete(req.params.id)
    io.emit('actualizar')
    res.json({ ok: true })
  } catch (err) {
    res.status(500).json({ error: 'Error borrando cotizacion' })
  }
})

// ================= PROVEEDORES =================

// LISTAR
app.get('/proveedores', async (req, res) => {
  try {
    const data = await Proveedor.find().sort({ nombre: 1 })
    res.json(data)
  } catch (err) {
    res.status(500).json({ error: 'Error obteniendo proveedores' })
  }
})

// CREAR
app.post('/proveedores', async (req, res) => {
  try {

    const nombre = req.body.nombre?.trim()

    if (!nombre) {
      return res.status(400).json({ error: 'Nombre requerido' })
    }

    const existe = await Proveedor.findOne({ nombre })

    if (existe) return res.json({ ok: true })

    const nuevo = new Proveedor({ nombre })
    await nuevo.save()

    res.json({ ok: true })

  } catch (err) {
    res.status(500).json({ error: 'Error creando proveedor' })
  }
})

// ================= START =================
const PORT = process.env.PORT || 3000

server.listen(PORT, () => {
  console.log('Servidor corriendo en puerto', PORT)
})