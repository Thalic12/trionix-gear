export function notFound(req, res) {
  res.status(404).json({ error: "Ruta no encontrada" });
}
export function errorHandler(err, req, res, next) {
  if (err.isJoi) return res.status(400).json({ error: err.details.map(x => x.message).join(", ") });
  if (err.name === "ValidationError") return res.status(400).json({ error: Object.values(err.errors).map(x => x.message).join(", ") });
  if (err.name === "CastError") return res.status(400).json({ error: "Identificador no válido" });
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue || {})[0] || "registro";
    const labels = { codigo: "código", documento: "documento", email: "email" };
    return res.status(409).json({ error: `Ya existe un registro con ese ${labels[field] || field}` });
  }
  console.error(err);
  res.status(500).json({ error: "Error interno del servidor" });
}
