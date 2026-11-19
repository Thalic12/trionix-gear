import { Router } from "express";
import Joi from "joi";
import Equipo from "../models/Equipo.js";
import Prestamo from "../models/Prestamo.js";
import { asyncRoute, validId, validate } from "./helpers.js";
const r = Router();
const schema = Joi.object({
  codigo: Joi.string().pattern(/^EQ-\d{4}$/).uppercase(),
  nombre: Joi.string().min(3).max(100),
  categoria: Joi.string().valid("portatil","proyector","camara","audio","redes"),
  estado: Joi.string().valid("disponible","mantenimiento"),
  ubicacion: Joi.string().allow("").max(150)
});
const check = (id, res) => { if (!validId(id)) { res.status(400).json({error:"ObjectId no válido"}); return false; } return true; };
r.get("/", asyncRoute(async (req,res) => {
  const q = {};
  if (req.query.categoria) q.categoria = req.query.categoria;
  if (req.query.estado) q.estado = req.query.estado;
  res.json(await Equipo.find(q).sort({codigo:1}));
}));
r.get("/:id", asyncRoute(async (req,res) => {
  if (!check(req.params.id,res)) return;
  const doc = await Equipo.findById(req.params.id);
  if (!doc) return res.status(404).json({error:"Equipo no encontrado"});
  res.json(doc);
}));
r.post("/", asyncRoute(async (req,res) => {
  const data = validate(schema.fork(["codigo","nombre","categoria"], s=>s.required()), req.body);
  if (data.estado === "prestado") return res.status(400).json({error:"El estado prestado solo se asigna mediante un préstamo"});
  res.status(201).json(await Equipo.create(data));
}));
r.put("/:id", asyncRoute(async (req,res) => {
  if (!check(req.params.id,res)) return;
  const data = validate(schema, req.body);
  if (!Object.keys(data).length) return res.status(400).json({error:"Debes enviar al menos un campo"});
  const current = await Equipo.findById(req.params.id);
  if (!current) return res.status(404).json({error:"Equipo no encontrado"});
  if (current.estado === "prestado" || data.estado === "prestado") return res.status(409).json({error:"El estado de un equipo prestado solo cambia mediante devolución"});
  const doc = await Equipo.findByIdAndUpdate(req.params.id,data,{new:true,runValidators:true});
  res.json(doc);
}));
r.delete("/:id", asyncRoute(async (req,res) => {
  if (!check(req.params.id,res)) return;
  const doc = await Equipo.findById(req.params.id);
  if (!doc) return res.status(404).json({error:"Equipo no encontrado"});
  if (doc.estado === "prestado" || await Prestamo.exists({equipoId:doc._id,estado:"activo"})) return res.status(409).json({error:"No se puede eliminar un equipo prestado"});
  await doc.deleteOne(); res.json({message:"Equipo eliminado"});
}));
r.get("/:id/prestamos", asyncRoute(async (req,res) => {
  if (!check(req.params.id,res)) return;
  if (!await Equipo.exists({_id:req.params.id})) return res.status(404).json({error:"Equipo no encontrado"});
  res.json(await Prestamo.find({equipoId:req.params.id}).populate("usuarioId","nombre tipo").sort({fechaPrestamo:-1}));
}));
export default r;
