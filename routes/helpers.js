import Joi from "joi";
import mongoose from "mongoose";
export const idSchema = Joi.string().hex().length(24);
export function validId(id) { return mongoose.Types.ObjectId.isValid(id); }
export function validate(schema, data) {
  const { error, value } = schema.validate(data, { abortEarly: false, stripUnknown: true });
  if (error) throw error;
  return value;
}
export function asyncRoute(fn) { return (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next); }
export function calculateOverdue(p) {
  const obj = p.toObject ? p.toObject() : p;
  obj.vencido = obj.estado === "activo" && new Date(obj.fechaLimite) < new Date();
  return obj;
}
