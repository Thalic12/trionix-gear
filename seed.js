import mongoose from "mongoose";
import { connectDB } from "./db.js";
import Equipo from "./models/Equipo.js";
import Usuario from "./models/Usuario.js";
import Prestamo from "./models/Prestamo.js";
await connectDB();
await Promise.all([Equipo.deleteMany({}),Usuario.deleteMany({}),Prestamo.deleteMany({})]);
const equipos=await Equipo.insertMany([
 ["EQ-0001","Portátil Lenovo ThinkPad","portatil"],["EQ-0002","Proyector Epson X","proyector"],
 ["EQ-0003","Cámara Canon EOS","camara"],["EQ-0004","Kit de audio Rode","audio"],
 ["EQ-0005","Router Cisco","redes"],["EQ-0006","Portátil Dell Latitude","portatil"],
 ["EQ-0007","Cámara Sony Alpha","camara"],["EQ-0008","Proyector BenQ","proyector"]
].map(([codigo,nombre,categoria])=>({codigo,nombre,categoria})));
const usuarios=await Usuario.insertMany([
 ["Laura Pérez","10000001","laura@trionix.test","estudiante"],["Carlos Díaz","10000002","carlos@trionix.test","estudiante"],
 ["Ana Gómez","10000003","ana@trionix.test","docente"],["Luis Rojas","10000004","luis@trionix.test","administrativo"],
 ["Marta Ruiz","10000005","marta@trionix.test","docente"]
].map(([nombre,documento,email,tipo])=>({nombre,documento,email,tipo})));
const now=Date.now(), day=86400000;
const prestamos=[
 {equipoId:equipos[0]._id,usuarioId:usuarios[0]._id,fechaLimite:new Date(now+3*day)},
 {equipoId:equipos[1]._id,usuarioId:usuarios[2]._id,fechaLimite:new Date(now-2*day)},
 {equipoId:equipos[2]._id,usuarioId:usuarios[3]._id,fechaLimite:new Date(now+2*day)},
 {equipoId:equipos[3]._id,usuarioId:usuarios[1]._id,fechaLimite:new Date(now-5*day),estado:"devuelto",fechaDevolucion:new Date(now-day)},
 {equipoId:equipos[4]._id,usuarioId:usuarios[4]._id,fechaLimite:new Date(now-day),estado:"devuelto",fechaDevolucion:new Date(now-day)},
 {equipoId:equipos[5]._id,usuarioId:usuarios[0]._id,fechaLimite:new Date(now+4*day)}
];
await Prestamo.insertMany(prestamos);
await Equipo.updateOne({_id:equipos[0]._id},{$set:{estado:"prestado"}});
await Equipo.updateOne({_id:equipos[1]._id},{$set:{estado:"prestado"}});
await Equipo.updateOne({_id:equipos[2]._id},{$set:{estado:"prestado"}});
await Equipo.updateOne({_id:equipos[5]._id},{$set:{estado:"prestado"}});
console.log("Seed completado: 8 equipos, 5 usuarios y 6 préstamos.");
await mongoose.disconnect();
