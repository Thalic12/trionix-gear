import { Router } from "express";
import Equipo from "../models/Equipo.js";
import Prestamo from "../models/Prestamo.js";
import { asyncRoute } from "./helpers.js";
const r=Router();
r.get("/top-equipos",asyncRoute(async(req,res)=>{
  const limit=Math.min(Math.max(parseInt(req.query.limit)||5,1),50);
  const data=await Prestamo.aggregate([
    {$group:{_id:"$equipoId",totalPrestamos:{$sum:1}}},
    {$sort:{totalPrestamos:-1}},
    {$limit:limit},
    {$lookup:{from:"equipos",localField:"_id",foreignField:"_id",as:"equipo"}},
    {$unwind:"$equipo"},
    {$project:{_id:0,codigo:"$equipo.codigo",nombre:"$equipo.nombre",totalPrestamos:1}}
  ]);
  res.json(data);
}));
r.get("/resumen",asyncRoute(async(req,res)=>{
  const [equiposPorEstado,prestamosActivos,prestamosVencidos,activosPorTipo]=await Promise.all([
    Equipo.aggregate([{$group:{_id:"$estado",cantidad:{$sum:1}}},{$sort:{_id:1}}]),
    Prestamo.countDocuments({estado:"activo"}),
    Prestamo.countDocuments({estado:"activo",fechaLimite:{$lt:new Date()}}),
    Prestamo.aggregate([{$match:{estado:"activo"}},{$lookup:{from:"usuarios",localField:"usuarioId",foreignField:"_id",as:"usuario"}},{$unwind:"$usuario"},{$group:{_id:"$usuario.tipo",cantidad:{$sum:1}}},{$sort:{_id:1}}])
  ]);
  res.json({equiposPorEstado,prestamosActivos,prestamosVencidos,prestamosActivosPorTipo:activosPorTipo});
}));
export default r;
