  import { defineConfig, env } from 'prisma/config';
  import 'dotenv/config';  // ← Esto es clave: carga .env en process.env

  export default defineConfig({
    datasources: {
      db: {
        provider: "mysql",
        url: env("DATABASE_URL")
      }
    }
  });
