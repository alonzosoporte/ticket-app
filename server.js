const cors = require('cors')
const express = require('express')
const mongoose = require('mongoose')
const http = require('http')
const { Server } = require('socket.io')

const app = express()
app.get('/ping',(req,res)=>{
  res.send('ok')
})
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

    return res.json({
      ok:true,
      token:TOKEN
    })
  }

  res.status(401).json({
    error:'Credenciales incorrectas'
  })
})

// ================= AUTH MIDDLEWARE =================
function auth(req,res,next){

  const authHeader = req.headers.authorization

  if(!authHeader){

    return res.status(401).json({
      error:'No autorizado'
    })
  }

  const token = authHeader.split(' ')[1]

  if(token !== TOKEN){

    return res.status(403).json({
      error:'Token inválido'
    })
  }

  next()
}

// ================= MONGODB =================
mongoose.connect(
'mongodb+srv://alonzosoporte:Foofigh1987!@cluster0.mafkjzo.mongodb.net/ticketsDB'
)
.then(()=>console.log('Mongo conectado'))
.catch(err=>console.log(err))

// ================= SCHEMAS =================

// TICKETS
const TicketSchema = new mongoose.Schema({

  numero:String,
  nombre:String,
  telefono:String,
  problema:String,
  descripcion:String,
  detalle:String,
  precio:String,
  ganancia:String,
  estado:String,
  entregado:String,

  fecha:{
    type:Date,
    default:Date.now
  }
})

const Ticket = mongoose.model('Ticket', TicketSchema)

// COTIZACIONES
const CotizacionSchema = new mongoose.Schema({

  nombre:String,
  celular:String,
  producto:String,
  proveedor:String,

  costoProveedor:String,
  precioCliente:String,

  ganancia:Number,

  descripcion:String,

  // MULTI FOTO
  fotos:[String],

  // COMPATIBILIDAD VIEJA
  foto:String,

  garantiaHasta:String,
  fotoGarantia:String,

  confirmada:{
    type:String,
    default:'no'
  },

  fecha:{
    type:Date,
    default:Date.now
  }
})

const Cotizacion =
mongoose.models.Cotizacion ||
mongoose.model('Cotizacion', CotizacionSchema)

// PROVEEDORES
const ProveedorSchema = new mongoose.Schema({

  nombre:{
    type:String,
    unique:true
  }
})

const Proveedor =
mongoose.models.Proveedor ||
mongoose.model('Proveedor', ProveedorSchema)

// ================= SOCKET =================
io.on('connection',()=>{

  console.log('Cliente conectado')
})

// ======================================================
// GENERAR NUMERO TICKET
// ======================================================
async function generarNumeroTicket(){

  const hoy = new Date()

  const anio = hoy.getFullYear()

  const mes =
  String(hoy.getMonth()+1).padStart(2,'0')

  const inicioMes =
  new Date(anio, hoy.getMonth(), 1)

  const finMes =
  new Date(anio, hoy.getMonth()+1, 1)

  const cantidad =
  await Ticket.countDocuments({

    fecha:{
      $gte:inicioMes,
      $lt:finMes
    }
  })

  const siguiente = cantidad + 1

  return `${anio}-${mes}-${String(siguiente).padStart(3,'0')}`
}

// ======================================================
// 🟢 TICKET PUBLICO
// ======================================================
app.post('/ticket-publico', async (req,res)=>{

  try{

    const {
      nombre,
      telefono,
      problema
    } = req.body

    if(!nombre || !telefono || !problema){

      return res.json({
        error:'Faltan datos'
      })
    }

    const numero =
    await generarNumeroTicket()

    const nuevo = new Ticket({

      numero,
      nombre,
      telefono,
      problema,

      estado:'pendiente',
      entregado:'no',

      fecha:new Date()
    })

    await nuevo.save()

    io.emit('actualizar')

    res.json(nuevo)

  }catch(err){

    console.log(err)

    res.status(500).json({
      error:'Error creando ticket'
    })
  }
})

// ======================================================
// 🔒 TICKET PRIVADO ADMIN
// ======================================================
app.post('/ticket', auth, async (req,res)=>{

  try{

    const {
      nombre,
      telefono,
      problema
    } = req.body

    if(!nombre || !telefono || !problema){

      return res.json({
        error:'Faltan datos'
      })
    }

    const numero =
    await generarNumeroTicket()

    const nuevo = new Ticket({

      ...req.body,

      numero,

      estado:'pendiente',
      entregado:'no',

      fecha:new Date()
    })

    await nuevo.save()

    io.emit('actualizar')

    res.json(nuevo)

  }catch(err){

    console.log(err)

    res.status(500).json({
      error:'Error creando ticket'
    })
  }
})

// ======================================================
// LISTAR TICKETS
// ======================================================
app.get('/tickets', auth, async (req,res)=>{

  const data =
  await Ticket.find().sort({ _id:-1 })

  res.json(data)
})

// ======================================================
// ACTUALIZAR TICKET
// ======================================================
app.put('/ticket/:numero', auth, async (req,res)=>{

  const actualizado =
  await Ticket.findOneAndUpdate(

    { numero:req.params.numero },

    { $set:req.body },

    { new:true }
  )

  io.emit('actualizar')

  res.json(actualizado)
})

// ======================================================
// BORRAR TICKET
// ======================================================
app.delete('/ticket/:numero', auth, async (req,res)=>{

  await Ticket.findOneAndDelete({
    numero:req.params.numero
  })

  io.emit('actualizar')

  res.json({
    ok:true
  })
})

// ======================================================
// CREAR COTIZACION
// ======================================================
app.post('/cotizacion', auth, async (req, res) => {

  try {

    console.log('BODY COTIZACION:', req.body)

    const costo =
    parseFloat(req.body.costoProveedor) || 0

    const precio =
    parseFloat(req.body.precioCliente) || 0

    const ganancia =
    precio - costo

    console.log('GANANCIA CALCULADA:', ganancia)

    const nueva = new Cotizacion({

      ...req.body,

      ganancia: ganancia
    })

    await nueva.save()

    io.emit('actualizar')

    res.json({
      ok:true
    })

  } catch (err) {

    console.error(err)

    res.status(500).json({
      error:'Error creando cotización'
    })
  }
})

// ======================================================
// LISTAR COTIZACIONES
// ======================================================
app.get('/cotizaciones', auth, async (req, res) => {

  try{

    const data =
    await Cotizacion
    .find()
    .sort({ _id:-1 })

    res.json(data)

  }catch(err){

    console.error(err)

    res.status(500).json({
      error:'Error obteniendo cotizaciones'
    })
  }
})

// ======================================================
// ACTUALIZAR COTIZACION
// ======================================================
app.put('/cotizacion/:id', auth, async (req, res) => {

  try{

    console.log('ACTUALIZANDO:', req.params.id)
    console.log('BODY:', req.body)

    const actualizada =
    await Cotizacion.findByIdAndUpdate(

      req.params.id,

      { $set:req.body },

      { new:true }
    )

    console.log('RESULTADO:', actualizada)

    io.emit('actualizar')

    res.json({
      ok:true,
      data:actualizada
    })

  }catch(err){

    console.error(err)

    res.status(500).json({
      error:'Error actualizando cotización'
    })
  }
})

// ======================================================
// BORRAR COTIZACION
// ======================================================
app.delete('/cotizacion/:id', auth, async (req, res) => {

  await Cotizacion.findByIdAndDelete(
    req.params.id
  )

  io.emit('actualizar')

  res.json({
    ok:true
  })
})

// ======================================================
// PROVEEDORES
// ======================================================

// LISTAR
app.get('/proveedores', auth, async (req, res) => {

  try{

    const data =
    await Proveedor
    .find()
    .sort({ nombre:1 })

    res.json(data)

  }catch(err){

    res.status(500).json({
      error:'Error proveedores'
    })
  }
})

// CREAR
app.post('/proveedores', auth, async (req, res) => {

  try{

    const nombre =
    req.body.nombre?.trim()

    if(!nombre){

      return res.status(400).json({
        error:'Nombre requerido'
      })
    }

    const existe =
    await Proveedor.findOne({ nombre })

    if(existe){
      return res.json({ ok:true })
    }

    const nuevo =
    new Proveedor({ nombre })

    await nuevo.save()

    res.json({
      ok:true
    })

  }catch(err){

    res.status(500).json({
      error:'Error creando proveedor'
    })
  }
})

// BORRAR
app.delete('/proveedores/:nombre', auth, async (req, res) => {

  try{

    await Proveedor.deleteOne({
      nombre:req.params.nombre
    })

    res.json({
      ok:true
    })

  }catch(err){

    res.status(500).json({
      error:'Error borrando proveedor'
    })
  }
})

// ======================================================
// GARANTIAS
// ======================================================

// LISTAR GARANTIAS
app.get('/garantias', auth, async (req, res) => {

  try{

    const data =
    await Cotizacion.find({

      confirmada:'si'

    }).sort({ _id:-1 })

    res.json(data)

  }catch(err){

    console.error(err)

    res.status(500).json({
      error:'Error obteniendo garantías'
    })
  }
})

// ACTUALIZAR GARANTIA
app.put('/garantia/:id', auth, async (req, res) => {

  try{

    const {
      garantiaHasta,
      fotoGarantia
    } = req.body

    const update = {}

    if(garantiaHasta !== undefined){
      update.garantiaHasta =
      garantiaHasta
    }

    if(fotoGarantia !== undefined){
      update.fotoGarantia =
      fotoGarantia
    }

    await Cotizacion.findByIdAndUpdate(

      req.params.id,

      { $set:update }
    )

    io.emit('actualizar')

    res.json({
      ok:true
    })

  }catch(err){

    console.error(err)

    res.status(500).json({
      error:'Error actualizando garantía'
    })
  }
})

// ================= START =================
const PORT = process.env.PORT || 3000

server.listen(PORT,()=>{

  console.log(
    'Servidor corriendo en puerto',
    PORT
  )
})