# Seed de Usuario Admin

Script para crear el usuario administrador con privilegios completos en la aplicación.

## Usuario por defecto

| Campo | Valor |
|-------|-------|
| Nombre | Victor Manuel Carrillo Rojas |
| Email | victorcarrillo.dev@gmail.com |
| Contraseña | Onyx250@vento |
| Rol | `admin` (acceso total) |

## Prerrequisitos

- La base de datos PostgreSQL debe estar corriendo y accesible
- Si usas Docker, el contenedor `ordenamiento-db` debe estar levantado
- La variable `DATABASE_URL` debe estar configurada (o usar la por defecto del `.env`)

## Uso

### Desde el servidor (Docker)

```bash
# Entrar al contenedor del backend
docker exec -it ordenamiento-backend sh

# Ejecutar el seed
bun run src/seed-victor.ts

# O con el alias
bun run seed:victor
```

### Fuera de Docker

```bash
cd backend

# Con DATABASE_URL del .env
bun run seed:victor

# O con URL explícita
DATABASE_URL=postgres://usuario:password@localhost:5432/ordenamiento bun run src/seed-victor.ts
```

### Verificar que funcionó

```bash
# Desde el contenedor o con acceso a la DB
docker exec -it ordenamiento-backend bun -e "
const { sql } = require('./src/db/pool.ts');
sql\`SELECT id, email, name, role FROM users\`.then(r => { console.table(r); sql.end(); })
"
```

## Comportamiento

- **Idempotente**: Si el usuario ya existe, el script lo indica y no falla
- **Conexión**: Verifica que la DB esté accesible antes de intentar crear el usuario
- **Rol admin**: Otorga acceso completo a todos los endpoints administrativos:
  - Gestión de participaciones (crear, editar, eliminar, exportar)
  - Gestión de usuarios
  - Gestión de configuración del sistema
  - Estadísticas y reportes
  - Gestión de avisos, reuniones y sesiones POEL
  - Personalización de temas y branding

## Modificar el script

Para cambiar los datos del usuario, edita las constantes al inicio del archivo `backend/src/seed-victor.ts`:

```typescript
const EMAIL = 'nuevo-email@ejemplo.com'
const NAME = 'Nuevo Nombre'
const PASSWORD = 'NuevaContraseña123!'
```

## Crear usuarios adicionales

Para crear otros usuarios admin, edita `backend/src/seed-admins.json` (crea el archivo si no existe):

```json
[
  {
    "email": "otro@email.com",
    "name": "Otro Usuario",
    "password": "ContraseñaSegura123!",
    "role": "admin"
  }
]
```

El seed principal (`seed.ts`) carga este archivo automáticamente al iniciar el servidor.

## Troubleshooting

| Error | Causa | Solución |
|-------|-------|----------|
| `ECONNREFUSED` | La DB no está corriendo | Levanta `ordenamiento-db` con `docker compose up db` |
| `password authentication failed` | Credenciales incorrectas en `DATABASE_URL` | Verifica las credenciales en `.env` |
| `relation "users" does not exist` | Las tablas no están creadas | Ejecuta `backend/schema.sql` contra la DB |
| `EMAIL_TAKEN` | El usuario ya existe | Normal, el script es idempotente |
