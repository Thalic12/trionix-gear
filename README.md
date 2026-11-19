# Trionix Gear

**Estudiante:** Thalía Carrillo  
**Proyecto:** Sistema web de inventario y préstamo de equipos para Trionix Labs.

Aplicación construida con Node.js 22, Express, Joi, MongoDB 7, Mongoose, HTML/CSS/JavaScript y Docker Compose. Incluye tres colecciones relacionadas (`equipos`, `usuarios`, `prestamos`), validación de escritura, reglas de negocio, reportes de agregación y publicación mediante Cloudflare Tunnel.

## Requisitos

- Docker Desktop con WSL2 en Windows, o Docker Engine + Compose en Linux/macOS.
- Git.
- Conexión a internet para descargar imágenes.
- No se requiere MongoDB Atlas ni abrir puertos del router.

## Configuración y arranque

```bash
git clone <URL_DEL_REPOSITORIO>
cd trionix-gear
cp .env.example .env
npm install --package-lock-only
docker compose up -d --build
docker compose ps
```

La API escucha internamente en `3000`. MongoDB no publica su puerto al host y persiste los datos en el volumen `mongo-data`.

Para cargar los datos de demostración:

```bash
docker compose exec api node seed.js
```

El seed crea 8 equipos, 5 usuarios y 6 préstamos, incluidos préstamos vencidos y devueltos. **El seed borra los registros previos de esas tres colecciones**, por lo que debe ejecutarse solo cuando se desee reiniciar los datos de demostración.

## URL pública de Cloudflare

El servicio `tunnel` utiliza Quick Tunnel. Consulta la URL HTTPS asignada con:

```bash
docker compose logs tunnel
```

Busca una dirección `https://....trycloudflare.com`. La URL es temporal y puede cambiar al recrear el contenedor. Entrega y prueba la URL que esté activa durante la sustentación.

Cloudflare Tunnel no necesita puertos entrantes abiertos: `cloudflared` inicia una conexión saliente hacia la red de Cloudflare y reenvía el tráfico hacia `http://api:3000` por la red privada de Docker.

## Variables de entorno

| Variable | Descripción |
|---|---|
| `PORT` | Puerto interno de Express (3000) |
| `MONGODB_URI` | URI de MongoDB dentro de la red Docker |
| `TUNNEL_TOKEN` | Reservada para configurar un túnel nombrado; no se necesita en Quick Tunnel |

Los valores reales se mantienen en `.env`, que está excluido de Git y de la imagen Docker. Ejecuta `npm install --package-lock-only` antes del primer build para generar y versionar `package-lock.json`; así Docker utilizará `npm ci` en las siguientes compilaciones. No publiques tokens ni credenciales.

## Arquitectura

```text
Internet
   |
   v
Cloudflare Edge (HTTPS)
   |
   v
cloudflared (servicio tunnel)
   |  http://api:3000
   v
Express API + frontend estático
   |
   v
MongoDB 7 (mongo:27017)
   |
   v
Volumen persistente: mongo-data
```

## Modelo de datos

- **Equipo:** `codigo`, `nombre`, `categoria`, `estado`, `ubicacion`.
- **Usuario:** `nombre`, `documento`, `email`, `tipo`, `activo`.
- **Prestamo:** `equipoId` y `usuarioId` como referencias ObjectId, fechas, estado y observaciones.

Los préstamos resuelven las referencias con `populate`. Los vencimientos se calculan en consulta: un préstamo está vencido si sigue activo y `fechaLimite` es anterior al momento actual.

## Reglas de negocio

1. Solo equipos disponibles pueden prestarse.
2. Solo usuarios activos pueden recibir préstamos.
3. Máximo de préstamos activos: estudiante 2, docente 4, administrativo 3.
4. Fecha límite futura, máximo 7 días (15 días para docentes).
5. La creación cambia el equipo a `prestado`; la devolución lo devuelve a `disponible`.
6. El vencimiento es calculado, no persistido como estado.
7. No se elimina un equipo prestado ni un usuario con préstamos activos. Los préstamos se conservan como historial.
8. La toma del equipo se realiza con `findOneAndUpdate` condicionado a `estado: disponible`, evitando que dos solicitudes ganen la misma carrera. Si falla la creación del préstamo, se compensa devolviendo el equipo a disponible.

## Endpoints

| Método | Ruta | Respuestas principales |
|---|---|---|
| GET | `/api/health` | 200, 503 |
| GET | `/api/equipos` | 200 |
| GET | `/api/equipos/:id` | 200, 400, 404 |
| POST | `/api/equipos` | 201, 400, 409 |
| PUT | `/api/equipos/:id` | 200, 400, 404, 409 |
| DELETE | `/api/equipos/:id` | 200, 400, 404, 409 |
| GET | `/api/equipos/:id/prestamos` | 200, 400, 404 |
| GET | `/api/usuarios` | 200 |
| GET | `/api/usuarios/:id` | 200, 400, 404 |
| POST | `/api/usuarios` | 201, 400, 409 |
| PUT | `/api/usuarios/:id` | 200, 400, 404, 409 |
| DELETE | `/api/usuarios/:id` | 200, 400, 404, 409 |
| GET | `/api/usuarios/:id/prestamos` | 200, 400, 404 |
| GET | `/api/prestamos` | 200, 400 |
| GET | `/api/prestamos/:id` | 200, 400, 404 |
| POST | `/api/prestamos` | 201, 400, 404, 409 |
| PATCH | `/api/prestamos/:id/devolver` | 200, 400, 404, 409 |
| GET | `/api/reportes/top-equipos?limit=5` | 200 |
| GET | `/api/reportes/resumen` | 200 |

Los filtros disponibles son `GET /api/equipos?categoria=&estado=`, `GET /api/usuarios?tipo=&activo=` y `GET /api/prestamos?estado=activo|devuelto&vencidos=true`.

## Comandos útiles para sustentación

```bash
docker compose ps
docker compose logs -f tunnel
docker compose down
docker compose up -d
docker compose exec api ls -la
docker compose exec mongo mongosh trionixgear
```

Dentro de `mongosh`:

```javascript
show collections
db.equipos.find()
db.usuarios.find()
db.prestamos.find()
db.equipos.getIndexes()
db.usuarios.getIndexes()
```

Para revisar la respuesta HTTP:

```bash
curl http://localhost:3000/api/health
curl http://localhost:3000/api/prestamos
```

## Estructura

```text
trionix-gear/
├── public/                 # Frontend estático
├── models/                 # Equipo, Usuario, Prestamo
├── routes/                 # CRUD, préstamos y reportes
├── middlewares/            # Manejo uniforme de errores
├── db.js
├── seed.js
├── app.js
├── Dockerfile
├── .dockerignore
├── docker-compose.yml
├── .env.example
├── .gitignore
├── package.json
└── README.md
```

## Antes de entregar

- Ejecuta `docker compose up -d --build` y comprueba los tres servicios.
- Ejecuta `seed.js` y prueba CRUD, préstamo, devolución, vencimiento y conflicto 409.
- Abre la URL Quick Tunnel desde datos móviles.
- Toma las cinco evidencias exigidas por el enunciado y guárdalas en `evidencias/` (esa carpeta está excluida de Git por defecto; adjunta las capturas directamente en Aula Extendida).
- Verifica que `.env` no esté versionado: `git status --ignored`.
- Practica explicar el cambio atómico y la conexión saliente de Cloudflare Tunnel.

## Alcance y notas

Este proyecto es una base funcional para ejecutar y probar localmente. La devolución actualiza el préstamo y el equipo en dos escrituras compensables, pero no usa transacciones MongoDB; las transacciones con replica set son un bonus del enunciado. Antes de la sustentación, prueba también los escenarios de error y revisa el comportamiento con tu versión instalada de Docker.
