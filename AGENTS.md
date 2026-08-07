

## SCHEMA PROTECTION RULE

**No modificar prisma/schema.prisma ni crear/eliminar migraciones bajo prisma/migrations/ sin autorización explícita del Patrón.**

Cualquier cambio de schema debe seguir este protocolo:
1. Anunciar el cambio propuesto y esperar la palabra 'autorizado' del Patrón.
2. Si el Patrón aprueba, generar la migración con 
px prisma migrate dev --name <nombre_descriptivo> (nunca con prisma db pull que sobrescribe sin control).
3. Commitear schema + migración en el mismo commit con mensaje que explique el motivo del cambio.
4. Si la migración se aplica a una DB existente, documentar el prisma migrate resolve --applied o prisma migrate deploy necesario.

Esta regla existe porque el schema es el contrato de datos del sistema: cambios no coordinados pueden romper tests, la DB de desarrollo y los despliegues. Si encontrás un problema que parece requerir un cambio de schema, primero buscá una solución a nivel de código (service, repository, validación) antes de modificar el schema.

**Excepción:** correcciones triviales de tipos (ej. String -> String?) durante una migración activa ya autorizada pueden hacerse sin re-preguntar, pero deben anunciarse en el commit message.