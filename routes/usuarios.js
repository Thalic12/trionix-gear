import { Router } from "express";
import Joi from "joi";
import Usuario from "../models/Usuario.js";
import Prestamo from "../models/Prestamo.js";
import { asyncRoute, validId, validate } from "./helpers.js";
const r = Router();
const schema = Joi.object({
  nombre:Joi.string().min(3).max(100), documento:Joi.string().pattern(/^\d{6,12}$/),
  email:Joi.string().email(), tipo:Joi.string().valid("estudiante","docente","administrativo"),
  activo:Joi.boolean()
});
const check=(id,res)=>{if(!validId(id)){res.status(400).json({error:"ObjectId no válido"});return false;}return true;};
r.get("/",asyncRoute(async(req,res)=>{
  const q={}; if(req.query.tipo)q.tipo=req.query.tipo;
  if(req.query.activo!==undefined){if(!["true","false"].includes(req.query.activo))return res.status(400).json({error:"activo debe ser true o false"});q.activo=req.query.activo==="true";}
  res.json(await Usuario.find(q).sort({nombre:1}));
}));
r.get("/:id",asyncRoute(async(req,res)=>{if(!check(req.params.id,res))return;const u=await Usuario.findById(req.params.id);if(!u)return res.status(404).json({error:"Usuario no encontrado"});res.json(u);}));
r.post("/",asyncRoute(async(req,res)=>{const d=validate(schema.fork(["nombre","documento","email","tipo"],s=>s.required()),req.body);res.status(201).json(await Usuario.create(d));}));
r.put("/:id",asyncRoute(async(req,res)=>{if(!check(req.params.id,res))return;const d=validate(schema,req.body);if(!Object.keys(d).length)return res.status(400).json({error:"Debes enviar al menos un campo"});const u=await Usuario.findByIdAndUpdate(req.params.id,d,{new:true,runValidators:true});if(!u)return res.status(404).json({error:"Usuario no encontrado"});res.json(u);}));
r.delete("/:id",asyncRoute(async(req,res)=>{if(!check(req.params.id,res))return;const u=await Usuario.findById(req.params.id);if(!u)return res.status(404).json({error:"Usuario no encontrado"});if(await Prestamo.exists({usuarioId:u._id,estado:"activo"}))return res.status(409).json({error:"El usuario tiene préstamos activos"});await u.deleteOne();res.json({message:"Usuario eliminado"});}));
r.get("/:id/prestamos",asyncRoute(async(req,res)=>{if(!check(req.params.id,res))return;if(!await Usuario.exists({_id:req.params.id}))return res.status(404).json({error:"Usuario no encontrado"});res.json(await Prestamo.find({usuarioId:req.params.id}).populate("equipoId","codigo nombre categoria").sort({fechaPrestamo:-1}));}));
export default r;
