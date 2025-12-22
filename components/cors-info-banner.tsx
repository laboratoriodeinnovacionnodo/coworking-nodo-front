import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Info } from "lucide-react"

export function CorsInfoBanner() {
  return (
    <Alert className="mb-6">
      <Info className="h-4 w-4" />
      <AlertTitle>Configuración del Backend</AlertTitle>
      <AlertDescription className="space-y-2">
        <p>Para que el frontend se conecte correctamente con tu backend en:</p>
        <code className="block bg-muted p-2 rounded text-sm">
          {process.env.NEXT_PUBLIC_API_URL || "https://coworking-nodo-back.onrender.com"}
        </code>
        <p className="text-sm">
          Asegúrate de habilitar CORS en tu archivo <code>main.ts</code> de NestJS:
        </p>
        <pre className="bg-muted p-3 rounded text-xs overflow-x-auto">
          {`import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  // Habilitar CORS
  app.enableCors({
    origin: '*', // En producción, especifica tus dominios
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true,
  });
  
  await app.listen(3000);
}
bootstrap();`}
        </pre>
      </AlertDescription>
    </Alert>
  )
}
