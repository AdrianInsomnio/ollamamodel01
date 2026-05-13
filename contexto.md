# Contexto del Proyecto Ollmodel

## Resumen

**ollmodel** es un sistema de gestión para veterinaria.

### Tecnologías
- **Backend**: Node.js + Express 5.x
- **ORM**: Prisma con MySQL
- **Auth**: JWT + bcrypt
- **Seguridad**: Helmet, CORS, Rate Limiting
- **Logging**: Pino
- **Testing**: Jest + Supertest

### Arquitectura modular
```
src/
├── config/        # DB, JWT, env
├── core/          # Middlewares, errores, utils
├── lib/           # Prisma client, logger
├── modules/       # Módulos de negocio
│   ├── auth/      # Autenticación
│   ├── users/     # Usuarios
│   ├── clients/   # Clientes
│   ├── pets/      # Mascotas
│   ├── appointments/ # Citas
│   ├── consultations/ # Consultas médicas
│   ├── diagnoses/ # Diagnósticos
│   ├── treatments/ # Tratamientos
│   ├── prescriptions/ # Prescripciones
│   ├── products/  # Productos/Inventario
│   ├── services/  # Servicios veterinarios
│   └── sales/     # Ventas
└── routes/        # Rutas principales
```

### Modelos principales (Prisma)
- **Organization** - Multi-tenant
- **User/RefreshToken** - Autenticación
- **Client/Pet** - Clientes y mascotas
- **Appointment** - Citas
- **Consultation** - Consultas médicas
- **Diagnosis/Treatment/Prescription** - Clínica
- **Product/Service** - Catálogo
- **Sale** - Ventas con items
- **FiscalDocument** - Documentos fiscales (Uruguay)

### Estado actual
- **Tests**: 110+ tests (unitarios + integración)
- **Coverage**: >75% en servicios críticos
- **Branch**: dev
- **Estado**: Completado

### Dependencias principales
```json
{
  "@prisma/client": "^5.22.0",
  "bcryptjs": "^3.0.3",
  "cors": "^2.8.6",
  "dotenv": "^17.3.1",
  "express": "^5.2.1",
  "express-rate-limit": "^8.3.0",
  "helmet": "^8.1.0",
  "joi": "^18.1.2",
  "jsonwebtoken": "^9.0.3",
  "mysql2": "^3.19.0",
  "pino": "^10.3.1"
}
```

### Scripts disponibles
```bash
npm start           # Iniciar servidor
npm run dev         # Modo desarrollo
npm test            # Ejecutar tests
npm run test:watch  # Tests en modo watch
npm run test:coverage # Reporte de coverage
npm run test:unit   # Tests unitarios
npm run test:integration # Tests de integración
```

### Características implementadas
- Autenticación JWT completa con refresh tokens
- Gestión de ventas con control de stock
- Gestión de citas con validación de horarios
- Gestión de consultas médicas
- Control de inventario con movimientos
- Gestión de clientes y mascotas
- Validaciones de negocio robustas
- Manejo de errores consistente
- Rate limiting para seguridad
- Multi-tenant (Organization)

### Próximos pasos sugeridos
1. Conectar con frontend (React/Vue/Angular)
2. Implementar WebSockets para notificaciones en tiempo real
3. Agregar envío de emails para recordatorios de citas
4. Configurar CI/CD para tests automatizados
5. Dockerizar la aplicación