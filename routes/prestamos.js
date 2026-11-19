import { Router } from "express";
import Joi from "joi";
import Equipo from "../models/Equipo.js";
import Usuario from "../models/Usuario.js";
import Prestamo from "../models/Prestamo.js";
import { asyncRoute, validId, validate, calculateOverdue } from "./helpers.js";
const r=Router();
const createSchema=Joi.object({
  equipoId:Joi.string().hex().length(24).required(),
  usuarioId:Joi.string().hex().length(24).required(),
  fechaLimite:Joi.date().iso().required(),
  observaciones:Joi.string().max(300).allow("")
});
const check=(id,res)=>{if(!validId(id)){res.status(400).json({error:"ObjectId no válido"});return false;}return true;};
r.get("/",asyncRoute(async(req,res)=>{
  const q={};if(req.query.estado){if(!["activo","devuelto"].includes(req.query.estado))return res.status(400).json({error:"estado inválido"});q.estado=req.query.estado;}
  let docs=await Prestamo.find(q).populate("equipoId","codigo nombre categoria").populate("usuarioId","nombre tipo").sort({fechaPrestamo:-1});
  docs=docs.map(p=>{const o=calculateOverdue(p);o.equipo=o.equipoId;o.usuario=o.usuarioId;delete o.equipoId;delete o.usuarioId;return o;});
  if(req.query.vencidos==="true")docs=docs.filter(p=>p.vencido);
  res.json(docs);
}));
r.get("/:id",asyncRoute(async(req,res)=>{if(!check(req.params.id,res))return;const p=await Prestamo.findById(req.params.id).populate("equipoId","codigo nombre categoria").populate("usuarioId","nombre tipo");if(!p)return res.status(404).json({error:"Préstamo no encontrado"});const o=calculateOverdue(p);o.equipo=o.equipoId;o.usuario=o.usuarioId;delete o.equipoId;delete o.usuarioId;res.json(o);}));
r.post("/",asyncRoute(async(req,res)=>{
  const d=validate(createSchema,req.body);
  const usuario=await Usuario.findById(d.usuarioId);if(!usuario)return res.status(404).json({error:"Usuario no encontrado"});
  if(!usuario.activo)return res.status(400).json({error:"El usuario está inactivo"});
  const equipo=await Equipo.findById(d.equipoId);if(!equipo)return res.status(404).json({error:"Equipo no encontrado"});
  const max={estudiante:2,docente:4,administrativo:3}[usuario.tipo];
  const activos=await Prestamo.countDocuments({usuarioId:usuario._id,estado:"activo"});
  if(activos>=max)return res.status(409).json({error:`El usuario alcanzó el máximo de ${max} préstamos activos para su tipo`});
  const ahora=new Date(), limite=new Date(d.fechaLimite), dias=usuario.tipo==="docente"?15:7;
  if(!(limite>ahora) || limite>new Date(ahora.getTime()+dias*86400000))return res.status(400).json({error:`La fecha límite debe estar en el futuro y dentro de ${dias} días`});
  const actualizado=await Equipo.findOneAndUpdate({_id:equipo._id,estado:"disponible"},{$set:{estado:"prestado"}},{new:true,runValidators:true});
  if(!actualizado)return res.status(409).json({error:`El equipo no está disponible. Estado actual: ${equipo.estado}`});
  try {
    const prestamo=await Prestamo.create({equipoId:equipo._id,usuarioId:usuario._id,fechaLimite:limite,observaciones:d.observaciones||""});
    const resuelto=await Prestamo.findById(prestamo._id).populate("equipoId","codigo nombre categoria").populate("usuarioId","nombre tipo");
    const o=resuelto.toObject();o.equipo=o.equipoId;o.usuario=o.usuarioId;delete o.equipoId;delete o.usuarioId;
    return res.status(201).json(o);
  } catch(err) {
    await Equipo.findOneAndUpdate({_id:equipo._id,estado:"prestado"},{$set:{estado:"disponible"}});
    throw err;
  }
}));
r.patch("/:id/devolver",asyncRoute(async(req,res)=>{
  if(!check(req.params.id,res))return;
  const p=await Prestamo.findById(req.params.id);if(!p)return res.status(404).json({error:"Préstamo no encontrado"});
  if(p.estado==="devuelto")return res.status(409).json({error:"Este préstamo ya fue devuelto"});
  p.estado="devuelto";p.fechaDevolucion=new Date();await p.save();
  await Equipo.findByIdAndUpdate(p.equipoId,{estado:"disponible"},{new:true,runValidators:true});
  const out=await Prestamo.findById(p._id).populate("equipoId","codigo nombre categoria").populate("usuarioId","nombre tipo");
  const o=out.toObject();o.equipo=o.equipoId;o.usuario=o.usuarioId;delete o.equipoId;delete o.usuarioId;res.json(o);
}));
export default r;
